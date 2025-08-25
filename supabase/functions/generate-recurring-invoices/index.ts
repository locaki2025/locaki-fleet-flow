import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const coraApiKey = Deno.env.get('CORA_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TenantConfig {
  payment_types: string[];
  billing_start_day: number;
  cora_account_id: string;
}

const logIntegration = async (
  userId: string,
  service: string,
  operation: string,
  requestData: any,
  responseData: any,
  status: string,
  errorMessage?: string
) => {
  await supabase.from('integration_logs').insert({
    user_id: userId,
    service,
    operation,
    request_data: requestData,
    response_data: responseData,
    status,
    error_message: errorMessage,
  });
};

const createCoraInvoice = async (invoiceData: any, config: TenantConfig) => {
  const coraPayload = {
    amount: Math.round(invoiceData.valor * 100), // Cora expects amount in cents
    description: invoiceData.descricao,
    due_date: invoiceData.vencimento,
    payer: {
      name: invoiceData.cliente_nome,
      email: invoiceData.cliente_email,
      document: invoiceData.cliente_cpf?.replace(/\D/g, ''),
    },
    payment_methods: config.payment_types.includes('pix') ? ['pix'] : ['boleto'],
    account_id: config.cora_account_id,
  };

  const response = await fetch('https://api.cora.com.br/v1/charges', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${coraApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(coraPayload),
  });

  const responseData = await response.json();
  
  if (!response.ok) {
    throw new Error(`Cora API error: ${responseData.message || 'Unknown error'}`);
  }

  return responseData;
};

const generateInvoicesForUser = async (userId: string) => {
  console.log(`Generating invoices for user: ${userId}`);

  // Get user config
  const { data: configData } = await supabase
    .from('tenant_config')
    .select('*')
    .eq('user_id', userId)
    .eq('config_key', 'cora_settings')
    .single();

  const config: TenantConfig = configData?.config_value || {
    payment_types: ['pix'],
    billing_start_day: 1,
    cora_account_id: '',
  };

  if (!config.cora_account_id) {
    console.log(`No Cora account configured for user ${userId}`);
    return;
  }

  // Get active contracts that need billing (proxima_cobranca <= today + 5 days)
  const today = new Date();
  const checkDate = new Date(today);
  checkDate.setDate(today.getDate() + 5);

  const { data: contracts, error: contractsError } = await supabase
    .from('contratos')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ativo')
    .eq('recorrente', true)
    .lte('proxima_cobranca', checkDate.toISOString().split('T')[0]);

  if (contractsError) {
    console.error('Error fetching contracts:', contractsError);
    return;
  }

  console.log(`Found ${contracts?.length || 0} contracts to process for user ${userId}`);

  for (const contract of contracts || []) {
    try {
      // Calculate due date (7 days from proxima_cobranca)
      const dueDate = new Date(contract.proxima_cobranca);
      dueDate.setDate(dueDate.getDate() + 7);

      const invoiceData = {
        user_id: userId,
        contrato_id: contract.id,
        contrato_origem_id: contract.id,
        cliente_id: contract.cliente_id,
        cliente_nome: contract.cliente_nome,
        cliente_email: contract.cliente_email,
        cliente_cpf: contract.cliente_cpf,
        fatura_id: `FAT-${Date.now()}-${contract.id.slice(0, 8)}`,
        descricao: `Cobrança recorrente - ${contract.descricao || contract.moto_modelo}`,
        valor: contract.valor_mensal,
        vencimento: dueDate.toISOString().split('T')[0],
        status: 'pendente',
        tipo_cobranca: 'recorrente',
        tentativas_cobranca: 0,
      };

      console.log(`Creating invoice for contract ${contract.id}`);

      // Create invoice with Cora
      let coraResponse;
      try {
        coraResponse = await createCoraInvoice(invoiceData, config);
        
        await logIntegration(
          userId,
          'cora',
          'create_invoice',
          invoiceData,
          coraResponse,
          'success'
        );

        // Update invoice data with Cora response
        invoiceData.codigo_barras = coraResponse.barcode;
        invoiceData.qr_code_pix = coraResponse.pix_qr_code;
        invoiceData.url_boleto = coraResponse.pdf_url;
        invoiceData.metodo_pagamento = coraResponse.payment_method;

      } catch (coraError) {
        console.error(`Cora API error for contract ${contract.id}:`, coraError);
        
        await logIntegration(
          userId,
          'cora',
          'create_invoice',
          invoiceData,
          null,
          'error',
          coraError.message
        );

        // Continue with local invoice creation even if Cora fails
      }

      // Insert invoice into database
      const { error: insertError } = await supabase
        .from('boletos')
        .insert(invoiceData);

      if (insertError) {
        console.error(`Error inserting invoice for contract ${contract.id}:`, insertError);
        continue;
      }

      // Update contract's proxima_cobranca (next billing date)
      const nextBilling = new Date(contract.proxima_cobranca);
      nextBilling.setDate(nextBilling.getDate() + 30); // Next month

      const { error: updateError } = await supabase
        .from('contratos')
        .update({
          proxima_cobranca: nextBilling.toISOString().split('T')[0],
          ultima_fatura: new Date().toISOString(),
        })
        .eq('id', contract.id);

      if (updateError) {
        console.error(`Error updating contract ${contract.id}:`, updateError);
      }

      console.log(`Successfully processed contract ${contract.id}`);

    } catch (error) {
      console.error(`Error processing contract ${contract.id}:`, error);
      
      await logIntegration(
        userId,
        'system',
        'generate_recurring_invoice',
        { contract_id: contract.id },
        null,
        'error',
        error.message
      );
    }
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting recurring invoice generation...');

    // Get all users with active contracts
    const { data: users, error: usersError } = await supabase
      .from('contratos')
      .select('user_id')
      .eq('status', 'ativo')
      .eq('recorrente', true);

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    // Get unique user IDs
    const uniqueUsers = [...new Set(users?.map(u => u.user_id) || [])];
    console.log(`Processing ${uniqueUsers.length} users`);

    // Process each user
    for (const userId of uniqueUsers) {
      await generateInvoicesForUser(userId);
    }

    const response = {
      success: true,
      message: `Processed ${uniqueUsers.length} users`,
      timestamp: new Date().toISOString(),
    };

    console.log('Recurring invoice generation completed successfully');

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error in generate-recurring-invoices:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
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