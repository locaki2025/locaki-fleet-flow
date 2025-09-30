import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // 1) Authenticate on Rastrosystem using fixed company credentials
    const loginRes = await fetch('https://locaki.rastrosystem.com.br/api_v2/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: '54858795000100',
        senha: '123456',
        app: 9,
      })
    });

    if (!loginRes.ok) {
      const txt = await loginRes.text();
      throw new Error(`Rastrosystem login failed: ${loginRes.status} ${txt}`);
    }

    const authData = await loginRes.json();
    const token: string = authData.token;

    // 2) Fetch people (customers)
    const customersRes = await fetch('https://locaki.rastrosystem.com.br/api_v2/list-pessoas', {
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!customersRes.ok) {
      const txt = await customersRes.text();
      throw new Error(`Fetch customers failed: ${customersRes.status} ${txt}`);
    }

    const customers: any[] = await customersRes.json();

    let inserted = 0;
    for (const customer of customers) {
      const cpfCnpj = customer.cpf || customer.cnpj || '';
      if (!cpfCnpj) continue;

      // Check if already exists
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user_id)
        .eq('cpf_cnpj', cpfCnpj)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('customers').insert({
          user_id,
          name: customer.nome || customer.razao_social || 'Não informado',
          type: customer.cpf ? 'PF' : 'PJ',
          cpf_cnpj: cpfCnpj,
          email: customer.email || 'nao-informado@email.com',
          phone: customer.telefone || customer.celular || '(00) 00000-0000',
          street: customer.endereco || 'Não informado',
          number: customer.numero || 'S/N',
          city: customer.cidade || 'Não informado',
          state: customer.estado || 'XX',
          zip_code: customer.cep || '00000-000',
          status: 'ativo',
          observations: `Importado do Rastrosystem - ID: ${customer.id}`,
        });
        if (!error) inserted++;
      }
    }

    return new Response(JSON.stringify({ success: true, inserted, total: customers.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('rastrosystem-customers-sync error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});