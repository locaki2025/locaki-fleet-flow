import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

const generateContractHTML = (contract: any, customer: any, vehicle: any) => {
  const today = new Date().toLocaleDateString('pt-BR');
  const contractStartDate = new Date(contract.data_inicio).toLocaleDateString('pt-BR');
  const contractLocation = contract.local_entrega || 'a definir';
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contrato de Locação ${contract.id}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.5;
                max-width: 210mm;
                margin: 0 auto;
                padding: 20px;
                color: #000;
                font-size: 12px;
            }
            .header {
                text-align: center;
                margin-bottom: 20px;
                font-weight: bold;
                font-size: 14px;
            }
            .parties {
                margin: 20px 0;
                text-align: justify;
            }
            .clause {
                margin: 15px 0;
                text-align: justify;
            }
            .clause-title {
                font-weight: bold;
                margin: 20px 0 10px 0;
                text-decoration: underline;
            }
            .signatures {
                margin-top: 60px;
                display: flex;
                justify-content: space-between;
            }
            .signature-block {
                text-align: center;
                width: 45%;
            }
            .signature-line {
                border-top: 1px solid #000;
                margin-top: 50px;
                padding-top: 5px;
            }
            .vehicle-info {
                background: #f5f5f5;
                padding: 10px;
                margin: 10px 0;
                border: 1px solid #ddd;
            }
            @media print {
                body { margin: 0; padding: 15px; font-size: 11px; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            CONTRATO PARTICULAR DE LOCAÇÃO DE VEÍCULO PJ-PF
        </div>

        <div class="parties">
            Pelo presente instrumento particular, de um lado:<br><br>
            <strong>[NOME DA EMPRESA]</strong>, pessoa jurídica de direito privado, CNPJ [CNPJ DA EMPRESA], email: [EMAIL DA EMPRESA], 
            telefone [TELEFONE DA EMPRESA], estabelecida na [ENDEREÇO DA EMPRESA], doravante denominada <strong>LOCADORA</strong>;<br><br>
            e de outro lado,<br><br>
            <strong>${contract.cliente_nome}</strong>, brasileiro, inscrito no CPF nº ${contract.cliente_cpf || '[CPF]'}, 
            CNH [CNH], email ${contract.cliente_email}, telefone ${customer?.phone || '[TELEFONE]'}, 
            residente e domiciliado na ${customer?.street || '[ENDEREÇO]'}, nº ${customer?.number || '[NÚMERO]'}, 
            bairro ${customer?.city || '[BAIRRO]'}, cidade ${customer?.city || '[CIDADE]'}, 
            CEP ${customer?.zip_code || '[CEP]'}, doravante denominado <strong>LOCATÁRIO</strong>, têm entre si como justo e contratado o que segue:
        </div>

        <div class="clause-title">CLÁUSULA 1ª – DO OBJETO DO CONTRATO</div>
        <div class="clause">
            1.1. Por meio deste contrato regula-se a locação do veículo:
            <div class="vehicle-info">
                Veículo de Marca: ${vehicle?.brand || '[MARCA]'}<br>
                Modelo: ${contract.moto_modelo}<br>
                Placa: ${vehicle?.plate || '[PLACA]'}<br>
                Ano: ${vehicle?.year || '[ANO]'}<br>
                Quilometragem atual: ${vehicle?.odometer || 0} Km<br>
                Valor mensal da locação: ${formatCurrency(contract.valor_mensal)}<br>
            </div>
            1.2. O veículo descrito acima é de propriedade da LOCADORA e será utilizado exclusivamente pelo LOCATÁRIO.
        </div>

        <div class="clause-title">CLÁUSULA 2ª – DO PERÍODO DE LOCAÇÃO</div>
        <div class="clause">
            2.1. O período de locação inicia em ${formatDate(contract.data_inicio)} e termina em ${formatDate(contract.data_fim || contract.data_inicio)}.<br>
            2.2. A próxima cobrança está agendada para ${formatDate(contract.proxima_cobranca)}.<br>
            2.3. ${contract.descricao || 'Sem observações adicionais.'}
        </div>

        <div class="clause-title">CLÁUSULA 3ª – DAS OBRIGAÇÕES</div>
        <div class="clause">
            3.1. O LOCATÁRIO se compromete a utilizar o veículo de forma adequada e responsável.<br>
            3.2. O LOCATÁRIO é responsável pelo pagamento pontual das parcelas.<br>
            3.3. A LOCADORA se compromete a fornecer o veículo em perfeitas condições de uso.
        </div>

        <div class="signatures">
            <div class="signature-block">
                <div class="signature-line">
                    LOCADORA<br>
                    [NOME DA EMPRESA]
                </div>
            </div>
            <div class="signature-block">
                <div class="signature-line">
                    LOCATÁRIO<br>
                    ${contract.cliente_nome}
                </div>
            </div>
        </div>

        <div style="margin-top: 30px; text-align: center; font-size: 10px;">
            Contrato gerado em ${today}
        </div>
    </body>
    </html>
  `;
};

// Simple HTML to PDF generation using built-in Deno capabilities
const generatePDF = async (html: string): Promise<string> => {
  // For now, return a simple base64 PDF placeholder
  // In production, you would use a proper PDF generation library
  const mockPDFContent = btoa(`PDF Contract Content: ${html.slice(0, 200)}`);
  return mockPDFContent;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contract_id, user_id, contract_data, selectedFields, format } = await req.json();
    
    console.log('Generating contract PDF with:', { contract_id, user_id, has_contract_data: !!contract_data, selectedFields, format });

    // Allow passing contract data directly for new contracts
    if (!contract_id && !contract_data) {
      throw new Error('contract_id or contract_data is required');
    }
    
    if (!user_id) {
      throw new Error('user_id is required');
    }

    let contractData;
    
    if (contract_data) {
      // Use provided contract data for new contracts
      contractData = contract_data;
    } else {
      // Fetch contract data from database
      const { data: dbContractData, error: contractError } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', contract_id)
        .eq('user_id', user_id)
        .single();

      if (contractError || !dbContractData) {
        throw new Error('Contract not found');
      }
      
      contractData = dbContractData;
    }

    // Fetch customer data (optional)
    let customerData = null;
    if (contractData.cliente_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', contractData.cliente_id)
        .single();
      customerData = customer;
    }

    // Fetch vehicle data (optional)
    let vehicleData = null;
    if (contractData.moto_id) {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', contractData.moto_id)
        .single();
      vehicleData = vehicle;
    }

    const html = generateContractHTML(contractData, customerData, vehicleData);
    const pdf_base64 = await generatePDF(html);
    
    return new Response(JSON.stringify({ pdf_base64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating contract PDF:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);