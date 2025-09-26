import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrafficFine {
  id: string;
  placa: string;
  infracao: string;
  motivo: string;
  data_infracao: string;
  valor_multa: number;
  valor_com_desconto?: number;
  situacao: string;
  gravidade?: string;
  pontuacao: number;
  orgao_autuador?: string;
  data_limite_recurso?: string;
  habilitado_faturar: boolean;
  faturado: boolean;
  em_recurso: boolean;
  em_posse_cliente: boolean;
  created_at: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

function generateFinesHTML(fines: TrafficFine[]): string {
  const stats = {
    total: fines.length,
    abertas: fines.filter(f => f.situacao === 'aberta').length,
    pagas: fines.filter(f => f.situacao === 'paga').length,
    emRecurso: fines.filter(f => f.em_recurso).length,
    valorTotal: fines.reduce((acc, f) => acc + Number(f.valor_multa), 0),
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Multas de Trânsito</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 12px;
        }
        th {
            background-color: #007bff;
            color: white;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
        }
        .badge-success { background: #28a745; color: white; }
        .badge-danger { background: #dc3545; color: white; }
        .badge-warning { background: #ffc107; color: #212529; }
        .badge-secondary { background: #6c757d; color: white; }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Relatório de Multas de Trânsito</h1>
        <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total de Multas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.abertas}</div>
            <div class="stat-label">Abertas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.pagas}</div>
            <div class="stat-label">Pagas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.emRecurso}</div>
            <div class="stat-label">Em Recurso</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${formatCurrency(stats.valorTotal)}</div>
            <div class="stat-label">Valor Total</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Placa</th>
                <th>Infração</th>
                <th>Data</th>
                <th>Valor</th>
                <th>Situação</th>
                <th>Gravidade</th>
                <th>Pontos</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${fines.map(fine => `
                <tr>
                    <td>${fine.placa}</td>
                    <td style="max-width: 200px; word-wrap: break-word;">${fine.infracao}</td>
                    <td>${formatDate(fine.data_infracao)}</td>
                    <td>
                        ${formatCurrency(Number(fine.valor_multa))}
                        ${fine.valor_com_desconto ? `<br><small style="color: green;">Com desconto: ${formatCurrency(Number(fine.valor_com_desconto))}</small>` : ''}
                    </td>
                    <td>
                        <span class="badge ${getSituationBadgeClass(fine.situacao)}">
                            ${fine.situacao}
                        </span>
                    </td>
                    <td>
                        ${fine.gravidade ? `<span class="badge ${getGravityBadgeClass(fine.gravidade)}">${fine.gravidade}</span>` : '-'}
                    </td>
                    <td>${fine.pontuacao} pts</td>
                    <td>
                        ${fine.faturado ? '<span class="badge badge-secondary">Faturado</span> ' : ''}
                        ${fine.em_recurso ? '<span class="badge badge-warning">Recurso</span> ' : ''}
                        ${fine.em_posse_cliente ? '<span class="badge badge-secondary">Cliente</span> ' : ''}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>Relatório gerado automaticamente pelo sistema de gestão de frotas</p>
    </div>
</body>
</html>
  `;
}

function getSituationBadgeClass(situacao: string): string {
  switch (situacao.toLowerCase()) {
    case 'aberta': return 'badge-danger';
    case 'paga': return 'badge-success';
    case 'em recurso': return 'badge-warning';
    default: return 'badge-secondary';
  }
}

function getGravityBadgeClass(gravidade: string): string {
  switch (gravidade.toLowerCase()) {
    case 'leve': return 'badge-secondary';
    case 'média': return 'badge-warning';
    case 'grave': return 'badge-danger';
    case 'gravíssima': return 'badge-danger';
    default: return 'badge-secondary';
  }
}

// Mock PDF generation - in a real implementation you would use a library like Puppeteer
async function generatePDFFromHTML(html: string): Promise<string> {
  // For now, return the HTML as base64
  const encoder = new TextEncoder();
  const data = encoder.encode(html);
  return btoa(String.fromCharCode(...data));
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { fines } = await req.json();

    if (!fines || !Array.isArray(fines)) {
      return new Response(
        JSON.stringify({ error: 'Invalid fines data provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Generating report for ${fines.length} fines`);

    // Generate HTML content
    const html = generateFinesHTML(fines);
    
    // Generate PDF (mock implementation)
    const pdfBase64 = await generatePDFFromHTML(html);

    return new Response(
      JSON.stringify({
        success: true,
        pdf: pdfBase64,
        html: html, // Also return HTML for preview
        message: `Relatório gerado com sucesso para ${fines.length} multas`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error generating fines report:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

Deno.serve(handler);