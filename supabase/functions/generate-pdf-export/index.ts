import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generatePDFHTML = (type: string, data: any[], selectedFields: string[], format: string) => {
  const title = type === 'maintenance' ? 'Relatório de Manutenção' : 
               type === 'invoices' ? 'Relatório de Faturas' : 
               'Relatório de Dados';

  const getTableHeaders = () => {
    switch (type) {
      case 'maintenance':
        return selectedFields.map(field => {
          switch (field) {
            case 'veiculo': return 'Veículo';
            case 'servico': return 'Serviço';
            case 'custo': return 'Custo';
            case 'data': return 'Data';
            case 'status': return 'Status';
            default: return field;
          }
        });
      case 'invoices':
        return selectedFields.map(field => {
          switch (field) {
            case 'numero': return 'Número';
            case 'cliente': return 'Cliente';
            case 'valor': return 'Valor';
            case 'vencimento': return 'Vencimento';
            case 'status': return 'Status';
            default: return field;
          }
        });
      default:
        return selectedFields;
    }
  };

  const getTableRows = () => {
    return data.map(item => {
      return selectedFields.map(field => {
        switch (type) {
          case 'maintenance':
            switch (field) {
              case 'veiculo': return `${item.vehicle?.brand || ''} ${item.vehicle?.model || ''} - ${item.vehicle?.plate || ''}`;
              case 'servico': return item.description || item.service_type || '';
              case 'custo': return item.cost ? `R$ ${item.cost.toLocaleString('pt-BR')}` : 'R$ 0,00';
              case 'data': return item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('pt-BR') : '';
              case 'status': return item.status || '';
              default: return item[field] || '';
            }
          case 'invoices':
            switch (field) {
              case 'numero': return item.invoice_number || item.numero_nota || '';
              case 'cliente': return item.customer_name || item.cliente_nome || '';
              case 'valor': return item.total_amount ? `R$ ${item.total_amount.toLocaleString('pt-BR')}` : 'R$ 0,00';
              case 'vencimento': return item.due_date ? new Date(item.due_date).toLocaleDateString('pt-BR') : '';
              case 'status': return item.status || '';
              default: return item[field] || '';
            }
          default:
            return item[field] || '';
        }
      });
    });
  };

  const headers = getTableHeaders();
  const rows = getTableRows();

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.4;
                max-width: 210mm;
                margin: 0 auto;
                padding: 20px;
                color: #000;
                font-size: 12px;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #333;
                padding-bottom: 15px;
            }
            .header h1 {
                font-size: 18px;
                margin: 0 0 5px 0;
                color: #333;
            }
            .header p {
                margin: 0;
                color: #666;
                font-size: 11px;
            }
            .summary {
                margin-bottom: 20px;
                background: #f5f5f5;
                padding: 15px;
                border-left: 4px solid #007bff;
            }
            .summary h2 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #333;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
                font-size: ${format === 'compact' ? '10px' : '11px'};
            }
            th {
                background-color: #f2f2f2;
                font-weight: bold;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 10px;
            }
            @media print {
                body { margin: 0; padding: 15px; font-size: 10px; }
                th, td { padding: 4px; font-size: 9px; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${title}</h1>
            <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>

        <div class="summary">
            <h2>Resumo do Relatório</h2>
            <p><strong>Tipo:</strong> ${title}</p>
            <p><strong>Total de registros:</strong> ${data.length}</p>
            <p><strong>Formato:</strong> ${format === 'detailed' ? 'Detalhado' : format === 'summary' ? 'Resumido' : 'Compacto'}</p>
            <p><strong>Campos incluídos:</strong> ${headers.join(', ')}</p>
        </div>

        <table>
            <thead>
                <tr>
                    ${headers.map(header => `<th>${header}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${rows.map(row => `
                    <tr>
                        ${row.map(cell => `<td>${cell}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <p>Este relatório foi gerado automaticamente pelo sistema de gestão.</p>
            <p>Total de ${data.length} registro(s) processado(s).</p>
        </div>
    </body>
    </html>
  `;
};

// Generate PDF using Puppeteer equivalent (browser automation)
const generatePDFFromHTML = async (html: string): Promise<Uint8Array> => {
  // For now, we'll return a mock PDF response
  // In production, you'd use a service like Puppeteer, jsPDF, or similar
  throw new Error('PDF generation not yet implemented. Please install a PDF generation service.');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const body = await req.json();
    const { type, selectedFields, format, data } = body;

    if (!type || !selectedFields || !data) {
      throw new Error('Missing required parameters');
    }

    console.log(`Generating ${type} PDF for user ${user.id} with ${data.length} records`);

    // Generate HTML content
    const htmlContent = generatePDFHTML(type, data, selectedFields, format);

    // For now, return the HTML as base64 since we haven't implemented PDF generation yet
    const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));
    
    return new Response(JSON.stringify({ 
      success: true,
      html_preview: htmlContent,
      pdf_base64: htmlBase64, // This would be actual PDF bytes in production
      message: `${type} export generated successfully`
    }), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    });

  } catch (error) {
    console.error('Error generating PDF export:', error);
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders 
      },
    });
  }
};

serve(handler);