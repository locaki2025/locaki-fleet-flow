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
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                color: #333;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
            }
            .company-name {
                font-size: 24px;
                font-weight: bold;
                color: #2c5aa0;
                margin-bottom: 10px;
            }
            .contract-number {
                font-size: 14px;
                color: #666;
            }
            .section {
                margin: 20px 0;
            }
            .section-title {
                font-weight: bold;
                font-size: 16px;
                color: #2c5aa0;
                margin-bottom: 10px;
                border-left: 4px solid #2c5aa0;
                padding-left: 10px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 15px 0;
            }
            .info-item {
                margin: 5px 0;
            }
            .label {
                font-weight: bold;
                display: inline-block;
                min-width: 120px;
            }
            .value {
                color: #555;
            }
            .terms {
                background: #f8f9fa;
                padding: 15px;
                border-left: 4px solid #2c5aa0;
                margin: 20px 0;
            }
            .signature-section {
                margin-top: 50px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 50px;
            }
            .signature-line {
                border-top: 1px solid #333;
                padding-top: 5px;
                text-align: center;
                margin-top: 50px;
            }
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 20px;
            }
            @media print {
                body { margin: 0; padding: 15px; }
                .signature-line { margin-top: 30px; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">SISTEMA DE LOCADORA DE MOTOS</div>
            <div class="contract-number">Contrato de Locação Nº ${contract.id}</div>
            <div>Data de Emissão: ${today}</div>
        </div>

        <div class="section">
            <div class="section-title">1. DADOS DO LOCADOR</div>
            <div class="info-item">
                <span class="label">Razão Social:</span>
                <span class="value">[NOME DA EMPRESA]</span>
            </div>
            <div class="info-item">
                <span class="label">CNPJ:</span>
                <span class="value">[CNPJ DA EMPRESA]</span>
            </div>
            <div class="info-item">
                <span class="label">Endereço:</span>
                <span class="value">[ENDEREÇO DA EMPRESA]</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">2. DADOS DO LOCATÁRIO</div>
            <div class="info-grid">
                <div>
                    <div class="info-item">
                        <span class="label">Nome:</span>
                        <span class="value">${contract.cliente_nome}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">CPF:</span>
                        <span class="value">${contract.cliente_cpf || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Email:</span>
                        <span class="value">${contract.cliente_email}</span>
                    </div>
                </div>
                <div>
                    ${customer ? `
                    <div class="info-item">
                        <span class="label">Telefone:</span>
                        <span class="value">${customer.phone || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Endereço:</span>
                        <span class="value">${customer.street || ''} ${customer.number || ''}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Cidade:</span>
                        <span class="value">${customer.city || ''} - ${customer.state || ''}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">3. DADOS DO VEÍCULO</div>
            <div class="info-grid">
                <div>
                    <div class="info-item">
                        <span class="label">Modelo:</span>
                        <span class="value">${contract.moto_modelo}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Placa:</span>
                        <span class="value">${vehicle?.plate || 'N/A'}</span>
                    </div>
                </div>
                <div>
                    ${vehicle ? `
                    <div class="info-item">
                        <span class="label">Ano:</span>
                        <span class="value">${vehicle.year || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Cor:</span>
                        <span class="value">${vehicle.color || 'N/A'}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">4. CONDIÇÕES DA LOCAÇÃO</div>
            <div class="info-grid">
                <div>
                    <div class="info-item">
                        <span class="label">Período:</span>
                        <span class="value">${formatDate(contract.data_inicio)} até ${contract.data_fim ? formatDate(contract.data_fim) : 'Indeterminado'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Valor Mensal:</span>
                        <span class="value">${formatCurrency(contract.valor_mensal)}</span>
                    </div>
                    ${contract.diaria ? `
                    <div class="info-item">
                        <span class="label">Valor Diária:</span>
                        <span class="value">${formatCurrency(contract.diaria)}</span>
                    </div>
                    ` : ''}
                </div>
                <div>
                    ${contract.caucionamento ? `
                    <div class="info-item">
                        <span class="label">Caução:</span>
                        <span class="value">${formatCurrency(contract.caucionamento)}</span>
                    </div>
                    ` : ''}
                    <div class="info-item">
                        <span class="label">Local Entrega:</span>
                        <span class="value">${contract.local_entrega || 'A definir'}</span>
                    </div>
                    <div class="info-item">
                        <span class="label">Local Devolução:</span>
                        <span class="value">${contract.local_devolucao || 'A definir'}</span>
                    </div>
                </div>
            </div>
        </div>

        ${(contract.capacete_inclusos || contract.cadeado_inclusos || contract.capa_banco_inclusos || contract.multimeios_inclusos) ? `
        <div class="section">
            <div class="section-title">5. ACESSÓRIOS INCLUSOS</div>
            ${contract.capacete_inclusos ? '<div class="info-item">✓ Capacetes</div>' : ''}
            ${contract.cadeado_inclusos ? '<div class="info-item">✓ Cadeados</div>' : ''}
            ${contract.capa_banco_inclusos ? '<div class="info-item">✓ Capa de Banco</div>' : ''}
            ${contract.multimeios_inclusos ? '<div class="info-item">✓ Multimeios</div>' : ''}
        </div>
        ` : ''}

        ${contract.km_permitidos_dia || contract.multa_km_excedente ? `
        <div class="section">
            <div class="section-title">6. CONDIÇÕES DE QUILOMETRAGEM</div>
            ${contract.km_permitidos_dia ? `
            <div class="info-item">
                <span class="label">KM Permitidos/Dia:</span>
                <span class="value">${contract.km_permitidos_dia}</span>
            </div>
            ` : ''}
            ${contract.multa_km_excedente ? `
            <div class="info-item">
                <span class="label">Multa KM Excedente:</span>
                <span class="value">${formatCurrency(contract.multa_km_excedente)}</span>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <div class="terms">
            <div class="section-title">TERMOS E CONDIÇÕES GERAIS</div>
            <p>O presente contrato de locação de motocicleta é regido pelas seguintes cláusulas e condições:</p>
            <ul>
                <li>O locatário se compromete a utilizar o veículo de forma responsável e em conformidade com as leis de trânsito.</li>
                <li>O pagamento deve ser efetuado conforme as condições acordadas, sendo que o atraso pode implicar em multas e juros.</li>
                <li>O locatário é responsável por qualquer dano causado ao veículo durante o período de locação.</li>
                <li>A devolução do veículo deve ser feita no prazo e local acordados, nas mesmas condições de entrega.</li>
                <li>Este contrato pode ser rescindido por qualquer das partes mediante aviso prévio de 30 dias.</li>
            </ul>
        </div>

        <div class="signature-section">
            <div>
                <div class="signature-line">
                    <div>LOCADOR</div>
                    <div>[Nome e Assinatura]</div>
                </div>
            </div>
            <div>
                <div class="signature-line">
                    <div>LOCATÁRIO</div>
                    <div>${contract.cliente_nome}</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Contrato gerado automaticamente em ${today}</p>
            <p>ID do Contrato: ${contract.id}</p>
        </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contract_id, user_id } = await req.json();

    if (!contract_id || !user_id) {
      throw new Error('contract_id and user_id are required');
    }

    // Get contract data
    const { data: contract, error: contractError } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', contract_id)
      .eq('user_id', user_id)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found');
    }

    // Get customer data if available
    let customer = null;
    if (contract.cliente_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('cpf_cnpj', contract.cliente_cpf)
        .eq('user_id', user_id)
        .single();
      
      customer = customerData;
    }

    // Get vehicle data if available
    let vehicle = null;
    if (contract.moto_id) {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', contract.moto_id)
        .eq('user_id', user_id)
        .single();
      
      vehicle = vehicleData;
    }

    // Generate HTML
    const htmlContent = generateContractHTML(contract, customer, vehicle);

    // For now, we'll return the HTML content
    // In a production environment, you could use a service like Puppeteer to generate PDF
    return new Response(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="contrato-${contract.id}.html"`,
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error('Error generating contract PDF:', error);
    
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