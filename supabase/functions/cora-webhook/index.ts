import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CoraTransaction {
  id: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  status: 'settled' | 'pending' | 'failed';
  description: string;
  created_at: string;
}

interface CoraConfig {
  client_id: string;
  certificate: string;
  private_key: string;
  base_url: string;
  environment: 'production' | 'stage';
}

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

// Get Cora access token using mTLS proxy
const getCoraAccessToken = async (config: CoraConfig) => {
  const PROXY_URL = 'https://cora-mtls-proxy.onrender.com';
  
  try {
    const response = await fetch(`${PROXY_URL}/cora/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.client_id,
        certificate: config.certificate,
        private_key: config.private_key,
        base_url: config.base_url
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao obter token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Cora access token:', error);
    throw error;
  }
};

// Sync transactions from Cora API
const syncCoraTransactions = async (userId: string, config: CoraConfig, startDate: string, endDate: string) => {
  const startTime = Date.now();
  let importedCount = 0;
  let conciliatedCount = 0;
  let errorMessage = '';

  try {
    console.log(`Starting Cora sync for user ${userId} from ${startDate} to ${endDate}`);
    
    const PROXY_URL = 'https://cora-mtls-proxy.onrender.com';
    const accessToken = await getCoraAccessToken(config);
    
    // Fetch transactions through proxy
    console.log(`Fetching transactions from ${startDate} to ${endDate}`);
    
    const transactionsResponse = await fetch(`${PROXY_URL}/cora/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        certificate: config.certificate,
        private_key: config.private_key,
        base_url: config.base_url,
        start_date: startDate,
        end_date: endDate
      })
    });

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text();
      throw new Error(`Erro ao buscar transações: ${transactionsResponse.status} - ${errorText}`);
    }

    const statementData = await transactionsResponse.json();
    const entries = statementData.entries || [];
    console.log(`Found ${entries.length} entries from Cora statement`);

    // Process each entry (transaction)
    for (const entry of entries) {
      try {
        // Convert amount from cents to reais
        const amountInReais = entry.amount / 100;
        
        // Determine transaction type (credit or debit)
        const transactionType = entry.type === 'CREDIT' ? 'credit' : 'debit';
        
        // Get description from transaction object
        const description = entry.transaction?.description || 'Transação Cora';
        const counterPartyName = entry.transaction?.counterParty?.name || '';
        const fullDescription = counterPartyName ? `${description} - ${counterPartyName}` : description;
        
        // Insert or update transaction
        const { error: insertError } = await supabase
          .from('cora_transactions')
          .upsert({
            user_id: userId,
            cora_transaction_id: entry.id,
            amount: Math.abs(amountInReais),
            currency: 'BRL',
            type: transactionType,
            status: 'settled', // Cora statement entries are already settled
            description: fullDescription,
            transaction_date: entry.createdAt,
            raw_data: entry,
          }, {
            onConflict: 'user_id,cora_transaction_id',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error('Error inserting transaction:', insertError);
          continue;
        }

        importedCount++;

        // Try to auto-conciliate with boletos (only for credit transactions)
        if (transactionType === 'credit') {
          const conciliated = await autoReconcileTransaction(userId, {
            id: entry.id,
            amount: entry.amount,
            created_at: entry.createdAt,
            type: transactionType,
            status: 'settled',
            description: fullDescription,
            currency: 'BRL'
          }, Math.abs(amountInReais));
          if (conciliated) {
            conciliatedCount++;
          }
        }

      } catch (entryError) {
        console.error(`Error processing entry ${entry.id}:`, entryError);
      }
    }

    // Log sync result
    await supabase.from('cora_sync_logs').insert({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      status: 'success',
      transactions_imported: importedCount,
      transactions_conciliated: conciliatedCount,
      execution_time_ms: Date.now() - startTime,
    });

    return {
      success: true,
      imported: importedCount,
      conciliated: conciliatedCount,
      message: `Sincronizados ${importedCount} lançamentos, ${conciliatedCount} conciliados automaticamente`
    };

  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Cora sync error:', error);

    // Log error
    await supabase.from('cora_sync_logs').insert({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      status: 'error',
      transactions_imported: importedCount,
      transactions_conciliated: conciliatedCount,
      error_message: errorMessage,
      execution_time_ms: Date.now() - startTime,
    });

    throw error;
  }
};

// Auto reconcile transaction with boletos
const autoReconcileTransaction = async (userId: string, transaction: CoraTransaction, amount: number) => {
  try {
    // Look for matching boleto by amount and approximate date
    const transactionDate = new Date(transaction.created_at);
    const dateRange = 7; // Search within 7 days
    const dateStart = new Date(transactionDate);
    dateStart.setDate(dateStart.getDate() - dateRange);
    const dateEnd = new Date(transactionDate);
    dateEnd.setDate(dateEnd.getDate() + dateRange);

    const { data: matchingBoletos, error } = await supabase
      .from('boletos')
      .select('*')
      .eq('user_id', userId)
      .eq('valor', amount)
      .eq('status', 'pendente')
      .gte('vencimento', dateStart.toISOString().split('T')[0])
      .lte('vencimento', dateEnd.toISOString().split('T')[0])
      .order('vencimento', { ascending: true });

    if (error || !matchingBoletos || matchingBoletos.length === 0) {
      return false;
    }

    // Take the first match (closest date)
    const boleto = matchingBoletos[0];

    // Update both records
    await Promise.all([
      // Mark boleto as paid
      supabase
        .from('boletos')
        .update({
          status: 'pago',
          data_pagamento: transaction.created_at,
          valor_pago: amount,
          metodo_pagamento: 'cora_automatico'
        })
        .eq('id', boleto.id),
      
      // Mark transaction as conciliated
      supabase
        .from('cora_transactions')
        .update({
          conciliated: true,
          conciliated_boleto_id: boleto.id
        })
        .eq('user_id', userId)
        .eq('cora_transaction_id', transaction.id)
    ]);

    console.log(`Auto-conciliated transaction ${transaction.id} with boleto ${boleto.id}`);
    return true;

  } catch (error) {
    console.error('Auto reconciliation error:', error);
    return false;
  }
};

// Test Cora API connection through proxy
const testCoraConnection = async (config: any) => {
  try {
    const { client_id, certificate, private_key, base_url } = config;
    
    if (!client_id || !certificate || !private_key) {
      throw new Error('Configuração incompleta: client_id, certificado e chave privada são obrigatórios');
    }

    const PROXY_URL = 'https://cora-mtls-proxy.onrender.com';
    
    const testResponse = await fetch(`${PROXY_URL}/cora/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id,
        certificate,
        private_key,
        base_url
      })
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      throw new Error(`Erro ao testar conexão: ${testResponse.status} - ${errorText}`);
    }

    const result = await testResponse.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro desconhecido ao testar conexão');
    }

    return { success: true, message: 'Conexão com Cora estabelecida com sucesso através do proxy mTLS' };

  } catch (error) {
    console.error('Cora connection test failed:', error);
    throw new Error(`Erro na conexão: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Received Cora request:', JSON.stringify(payload, null, 2));

    // Handle different actions
    if (payload.action === 'test_connection') {
      const result = await testCoraConnection(payload.config);
      return new Response(JSON.stringify(result), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      });
    }

    if (payload.action === 'sync_transactions') {
      const { user_id, config, start_date, end_date } = payload;
      
      if (!user_id || !config || !start_date || !end_date) {
        return new Response(JSON.stringify({
          error: 'Missing required parameters: user_id, config, start_date, end_date'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      const result = await syncCoraTransactions(user_id, config, start_date, end_date);
      return new Response(JSON.stringify(result), {
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      });
    }

    if (payload.action === 'auto_sync') {
      // Auto sync for all users (used by cron)
      const { data: configs, error: configError } = await supabase
        .from('tenant_config')
        .select('user_id, config_value')
        .eq('config_key', 'cora_settings');

      if (configError || !configs) {
        throw new Error('Error fetching Cora configurations');
      }

      const results = [];
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      for (const configRow of configs) {
        try {
          const result = await syncCoraTransactions(
            configRow.user_id,
            configRow.config_value,
            thirtyDaysAgo.toISOString().split('T')[0],
            today.toISOString().split('T')[0]
          );
          results.push({ user_id: configRow.user_id, ...result });
        } catch (error) {
          console.error(`Auto sync failed for user ${configRow.user_id}:`, error);
          results.push({ 
            user_id: configRow.user_id, 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Auto sync completed for ${configs.length} users`,
        results
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
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
        message: error instanceof Error ? error.message : String(error) 
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