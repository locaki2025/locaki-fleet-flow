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

    const customersData = await customersRes.json();
    
    // A API pode retornar um objeto com a propriedade 'data' ou diretamente um array
    const customers: any[] = Array.isArray(customersData) ? customersData : (customersData.data || customersData.results || []);
    
    console.log(`Fetched ${customers.length} customers from Rastrosystem`);
    console.log('Sample customer data:', JSON.stringify(customers[0], null, 2));

    let inserted = 0;
    let skipped_no_id = 0;
    let duplicates = 0;

    const normalizeDoc = (doc: any) => (typeof doc === 'string' ? doc.replace(/\D/g, '') : String(doc ?? '').replace(/\D/g, ''));

    for (const customer of customers) {
      // Usar o ID do Rastrosystem como chave única
      const rastrosystemId = customer.id ? String(customer.id) : null;
      if (!rastrosystemId) { 
        skipped_no_id++; 
        console.log('Cliente sem ID do Rastrosystem:', customer);
        continue; 
      }

      // Verificar se já existe pelo rastrosystem_id
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user_id)
        .eq('rastrosystem_id', rastrosystemId)
        .maybeSingle();

      if (existing) {
        duplicates++;
        continue;
      }

      // Preparar CPF/CNPJ normalizado
      const rawCpf = customer.cpf ?? customer.CPF ?? customer.cpf_cnpj ?? customer.documento ?? null;
      const rawCnpj = customer.cnpj ?? customer.CNPJ ?? null;
      const cpfCnpjRaw = rawCpf || rawCnpj;
      const cpfCnpj = cpfCnpjRaw ? normalizeDoc(cpfCnpjRaw) : '';

      const payload = {
        user_id,
        rastrosystem_id: rastrosystemId,
        name: customer.nome_razao_social || customer.nome || customer.razao_social || customer.nome_fantasia || 'Não informado',
        type: rawCpf ? 'PF' : 'PJ',
        cpf_cnpj: cpfCnpj || 'nao-informado',
        email: customer.email || customer.email_principal || 'nao-informado@email.com',
        phone: customer.telefone || customer.celular || customer.fone || '(00) 00000-0000',
        street: customer.endereco || customer.logradouro || 'Não informado',
        number: String(customer.numero || customer.num || 'S/N'),
        city: customer.cidade || 'Não informado',
        state: customer.estado || customer.uf || 'XX',
        zip_code: (customer.cep || '').toString(),
        status: 'ativo',
        observations: `Importado do Rastrosystem - ID: ${rastrosystemId}`,
      } as const;

      const { error } = await supabase.from('customers').insert(payload as any);
      if (!error) {
        inserted++;
      } else {
        console.error('Erro ao inserir cliente', rastrosystemId, error);
      }
    }

    console.log(`Inserted: ${inserted}, Duplicates: ${duplicates}, Skipped (no cpf/cnpj): ${skipped_no_id}`);

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