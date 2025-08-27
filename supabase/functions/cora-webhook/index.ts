import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logWebhook = async (
  invoiceId: string,
  eventType: string,
  payload: any,
  status: string,
  amount?: number
) => {
  await supabase.from('webhook_logs').insert({
    invoice_id: invoiceId,
    event_type: eventType,
    payload,
    status,
    amount,
  });
};

const updateInvoiceStatus = async (coraChargeId: string, status: string, paidAmount?: number) => {
  // Find invoice by Cora charge ID (we'll need to store this in the boletos table)
  const { data: invoice, error: findError } = await supabase
    .from('boletos')
    .select('*')
    .eq('fatura_id', coraChargeId)
    .single();

  if (findError || !invoice) {
    console.error('Invoice not found for Cora charge ID:', coraChargeId);
    return null;
  }

  // Update invoice status
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'pago' && paidAmount) {
    updateData.data_pagamento = new Date().toISOString();
    updateData.valor_pago = paidAmount / 100; // Convert from cents
  }

  const { error: updateError } = await supabase
    .from('boletos')
    .update(updateData)
    .eq('id', invoice.id);

  if (updateError) {
    console.error('Error updating invoice:', updateError);
    return null;
  }

  return invoice;
};

// Test Cora API connection
const testCoraConnection = async (config: any) => {
  try {
    const { base_url, client_id, client_secret } = config;
    
    if (!base_url || !client_id || !client_secret) {
      throw new Error('Configuração incompleta');
    }

    // Try to authenticate with Cora API
    const authResponse = await fetch(`${base_url}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id,
        client_secret,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Falha na autenticação: ${authResponse.status} ${authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    
    if (!authData.access_token) {
      throw new Error('Token de acesso não recebido');
    }

    // Test API access with the token
    const testResponse = await fetch(`${base_url}/accounts`, {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!testResponse.ok) {
      throw new Error(`Erro ao acessar API: ${testResponse.status}`);
    }

    return { success: true, message: 'Conexão com Cora estabelecida com sucesso' };

  } catch (error) {
    console.error('Cora connection test failed:', error);
    throw new Error(`Erro na conexão: ${error.message}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Received Cora request:', JSON.stringify(payload, null, 2));

    // Handle test connection action
    if (payload.action === 'test_connection') {
      const result = await testCoraConnection(payload.config);
      return new Response(JSON.stringify(result), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      });
    }

    // Handle webhook events
    const { event_type, data } = payload;
    const chargeId = data?.id || data?.charge_id;
    const amount = data?.amount;

    if (!chargeId) {
      console.error('Missing charge ID in webhook payload');
      return new Response('Missing charge ID', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Log the webhook
    await logWebhook(chargeId, event_type, payload, 'received', amount);

    let invoiceStatus: string;
    let updatedInvoice = null;

    switch (event_type) {
      case 'charge.paid':
        invoiceStatus = 'pago';
        updatedInvoice = await updateInvoiceStatus(chargeId, invoiceStatus, amount);
        console.log(`Invoice ${chargeId} marked as paid`);
        break;
        
      case 'charge.failed':
      case 'charge.refused':
        invoiceStatus = 'recusado';
        updatedInvoice = await updateInvoiceStatus(chargeId, invoiceStatus);
        console.log(`Invoice ${chargeId} marked as refused`);
        break;
        
      case 'charge.expired':
        invoiceStatus = 'vencido';
        updatedInvoice = await updateInvoiceStatus(chargeId, invoiceStatus);
        console.log(`Invoice ${chargeId} marked as expired`);
        break;
        
      case 'charge.cancelled':
        invoiceStatus = 'cancelado';
        updatedInvoice = await updateInvoiceStatus(chargeId, invoiceStatus);
        console.log(`Invoice ${chargeId} marked as cancelled`);
        break;
        
      case 'charge.chargeback':
        invoiceStatus = 'estornado';
        updatedInvoice = await updateInvoiceStatus(chargeId, invoiceStatus);
        console.log(`Invoice ${chargeId} marked as chargeback`);
        break;
        
      default:
        console.log(`Unhandled event type: ${event_type}`);
        await logWebhook(chargeId, event_type, payload, 'unhandled');
        return new Response('Event acknowledged', { 
          status: 200, 
          headers: corsHeaders 
        });
    }

    // Log the processing result
    if (updatedInvoice) {
      await logWebhook(chargeId, event_type, payload, 'processed', amount);
      
      // If it's a recurring invoice that was paid, we could trigger additional logic here
      if (invoiceStatus === 'pago' && updatedInvoice.tipo_cobranca === 'recorrente') {
        console.log(`Recurring invoice paid for contract: ${updatedInvoice.contrato_origem_id}`);
        // Could trigger notifications, update customer status, etc.
      }
    } else {
      await logWebhook(chargeId, event_type, payload, 'error');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook processed successfully',
      invoice_updated: !!updatedInvoice
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error processing Cora webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);