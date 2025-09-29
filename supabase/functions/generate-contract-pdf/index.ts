import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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

// Convert Uint8Array to base64 using browser-compatible method
const arrayBufferToBase64 = (buffer: Uint8Array): string => {
  const chunks: string[] = [];
  const chunkSize = 0x8000; // Process in chunks to avoid call stack size limit
  
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, Math.min(i + chunkSize, buffer.length));
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
  }
  
  // Use globalThis.btoa which is available in Deno
  return globalThis.btoa(chunks.join(''));
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR');
};

const generateContractHTML = (contract: any, customer: any, vehicle: any, selectedFields: string[] = [], format: string = 'detailed') => {
  const today = new Date().toLocaleDateString('pt-BR');
  
  // Helper functions for empty template
  const contractStartDate = contract?.data_inicio ? new Date(contract.data_inicio).toLocaleDateString('pt-BR') : '[DATA INÍCIO]';
  const contractEndDate = contract?.data_fim ? new Date(contract.data_fim).toLocaleDateString('pt-BR') : '[DATA FIM]';
  const nextBilling = contract?.proxima_cobranca ? new Date(contract.proxima_cobranca).toLocaleDateString('pt-BR') : '[PRÓXIMA COBRANÇA]';
  
  // Check if field should be included
  const includeField = (fieldName: string) => {
    if (selectedFields.length === 0) return true; // If no fields selected, include all
    return selectedFields.includes(fieldName);
  };
  
  // Format-specific styles
  const getFormatStyles = () => {
    switch (format) {
      case 'summary':
        return `
          body { font-size: 11px; }
          .clause { margin: 10px 0; }
          .clause-title { margin: 15px 0 8px 0; font-size: 13px; }
        `;
      case 'compact':
        return `
          body { font-size: 10px; line-height: 1.3; padding: 15px; }
          .clause { margin: 8px 0; }
          .clause-title { margin: 12px 0 6px 0; font-size: 12px; }
          .signatures { margin-top: 40px; }
        `;
      default: // detailed
        return '';
    }
  };
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contrato de Locação ${contract?.id || 'Template'}</title>
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
            .field-placeholder {
                color: #666;
                font-style: italic;
            }
            ${getFormatStyles()}
            @media print {
                body { margin: 0; padding: 15px; font-size: 11px; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            CONTRATO PARTICULAR DE LOCAÇÃO DE VEÍCULO PJ-PF
        </div>

        ${includeField('cliente') ? `
        <div class="parties">
            Pelo presente instrumento particular, de um lado:<br><br>
            <strong>[NOME DA EMPRESA]</strong>, pessoa jurídica de direito privado, CNPJ [CNPJ DA EMPRESA], email: [EMAIL DA EMPRESA], 
            telefone [TELEFONE DA EMPRESA], estabelecida na [ENDEREÇO DA EMPRESA], doravante denominada <strong>LOCADORA</strong>;<br><br>
            e de outro lado,<br><br>
            <strong>${contract?.cliente_nome || '[NOME DO CLIENTE]'}</strong>, brasileiro, inscrito no CPF nº ${contract?.cliente_cpf || '[CPF]'}, 
            CNH [CNH], email ${contract?.cliente_email || '[EMAIL]'}, telefone ${customer?.phone || '[TELEFONE]'}, 
            residente e domiciliado na ${customer?.street || '[ENDEREÇO]'}, nº ${customer?.number || '[NÚMERO]'}, 
            bairro ${customer?.city || '[BAIRRO]'}, cidade ${customer?.city || '[CIDADE]'}, 
            CEP ${customer?.zip_code || '[CEP]'}, doravante denominado <strong>LOCATÁRIO</strong>, têm entre si como justo e contratado o que segue:
        </div>
        ` : ''}

        ${includeField('veiculo') ? `
        <div class="clause-title">CLÁUSULA 1ª – DO OBJETO DO CONTRATO</div>
        <div class="clause">
            1.1. Por meio deste contrato regula-se a locação do veículo:
            <div class="vehicle-info">
                Veículo de Marca: ${vehicle?.brand || '[MARCA]'}<br>
                Modelo: ${contract?.moto_modelo || '[MODELO]'}<br>
                Placa: ${vehicle?.plate || '[PLACA]'}<br>
                Ano: ${vehicle?.year || '[ANO]'}<br>
                ${format !== 'compact' ? `Quilometragem atual: ${vehicle?.odometer || 0} Km<br>` : ''}
            </div>
            1.2. O veículo descrito acima é de propriedade da LOCADORA e será utilizado exclusivamente pelo LOCATÁRIO.
        </div>
        ` : ''}

        ${includeField('periodo') ? `
        <div class="clause-title">CLÁUSULA 2ª – DO PERÍODO DE LOCAÇÃO</div>
        <div class="clause">
            2.1. O período de locação inicia em ${contractStartDate} e termina em ${contractEndDate}.<br>
            ${format !== 'compact' ? `2.2. A próxima cobrança está agendada para ${nextBilling}.<br>` : ''}
            ${format === 'detailed' && contract?.descricao ? `2.3. ${contract.descricao}` : ''}
        </div>
        ` : ''}

        ${includeField('valor') ? `
        <div class="clause-title">CLÁUSULA 3ª – DO VALOR</div>
        <div class="clause">
            3.1. Valor mensal da locação: ${contract?.valor_mensal ? formatCurrency(contract.valor_mensal) : '[VALOR]'}<br>
            ${format === 'detailed' && contract?.diaria ? `3.2. Valor da diária: ${formatCurrency(contract.diaria)}<br>` : ''}
            ${format === 'detailed' && contract?.caucionamento ? `3.3. Valor do caucionamento: ${formatCurrency(contract.caucionamento)}<br>` : ''}
        </div>
        ` : ''}

        ${includeField('status') || format === 'detailed' ? `
        <div class="clause-title">CLÁUSULA ${includeField('valor') ? '4' : '3'}ª – DAS OBRIGAÇÕES</div>
        <div class="clause">
            3.1. O LOCATÁRIO se compromete a utilizar o veículo de forma adequada e responsável.<br>
            3.2. O LOCATÁRIO é responsável pelo pagamento pontual das parcelas.<br>
            3.3. A LOCADORA se compromete a fornecer o veículo em perfeitas condições de uso.
            ${format === 'detailed' && contract?.status ? `<br><br><strong>Status atual do contrato:</strong> ${contract.status}` : ''}
        </div>
        ` : ''}

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
                    ${contract?.cliente_nome || '[NOME DO CLIENTE]'}
                </div>
            </div>
        </div>

        <div style="margin-top: 30px; text-align: center; font-size: 10px;">
            ${contract ? `Contrato gerado em ${today}` : `Template gerado em ${today}`}
        </div>
    </body>
    </html>
  `;
};


// Generate a real PDF using pdf-lib
const generatePDF = async (
  contract: any, 
  customer: any, 
  vehicle: any, 
  selectedFields: string[] = [], 
  format: string = 'detailed'
): Promise<string> => {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  // Helper to check if field should be included
  const includeField = (fieldName: string) => {
    if (selectedFields.length === 0) return true;
    return selectedFields.includes(fieldName);
  };
  
  // Font sizes based on format
  const fontSize = format === 'compact' ? 10 : format === 'summary' ? 11 : 12;
  const titleSize = fontSize + 2;
  const headerSize = fontSize + 4;
  
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  const margin = 50;
  let yPosition = height - margin;
  
  // Helper function to add text
  const addText = (text: string, options: any = {}) => {
    const {
      x = margin,
      size = fontSize,
      font = timesRomanFont,
      color = rgb(0, 0, 0),
      maxWidth = width - (2 * margin),
      lineHeight = size * 1.5
    } = options;
    
    const lines = text.split('\n');
    for (const line of lines) {
      if (yPosition < margin + 50) {
        // Add new page if needed
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        yPosition = newPage.getHeight() - margin;
      }
      
      page.drawText(line, {
        x,
        y: yPosition,
        size,
        font,
        color,
        maxWidth
      });
      yPosition -= lineHeight;
    }
  };
  
  // Header
  addText('CONTRATO PARTICULAR DE LOCAÇÃO DE VEÍCULO PJ-PF', {
    x: width / 2 - 200,
    size: headerSize,
    font: timesRomanBoldFont
  });
  yPosition -= 20;
  
  // Parties section
  if (includeField('cliente')) {
    addText('Pelo presente instrumento particular, de um lado:');
    yPosition -= 10;
    addText('[NOME DA EMPRESA], pessoa jurídica de direito privado, CNPJ [CNPJ DA EMPRESA],');
    addText('email: [EMAIL DA EMPRESA], telefone [TELEFONE DA EMPRESA],');
    addText('estabelecida na [ENDEREÇO DA EMPRESA], doravante denominada LOCADORA;', {
      font: timesRomanBoldFont
    });
    yPosition -= 10;
    addText('e de outro lado,');
    yPosition -= 10;
    
    const clientName = contract?.cliente_nome || '[NOME DO CLIENTE]';
    const clientCPF = contract?.cliente_cpf || '[CPF]';
    const clientEmail = contract?.cliente_email || '[EMAIL]';
    const clientPhone = customer?.phone || '[TELEFONE]';
    const clientAddress = `${customer?.street || '[ENDEREÇO]'}, nº ${customer?.number || '[NÚMERO]'}`;
    const clientCity = `${customer?.city || '[CIDADE]'}, CEP ${customer?.zip_code || '[CEP]'}`;
    
    addText(`${clientName}, brasileiro, inscrito no CPF nº ${clientCPF},`, {
      font: timesRomanBoldFont
    });
    addText(`CNH [CNH], email ${clientEmail}, telefone ${clientPhone},`);
    addText(`residente e domiciliado na ${clientAddress},`);
    addText(`bairro ${customer?.city || '[BAIRRO]'}, cidade ${clientCity},`);
    addText('doravante denominado LOCATÁRIO, têm entre si como justo e contratado o que segue:', {
      font: timesRomanBoldFont
    });
    yPosition -= 20;
  }
  
  // Vehicle clause
  if (includeField('veiculo')) {
    addText('CLÁUSULA 1ª – DO OBJETO DO CONTRATO', {
      font: timesRomanBoldFont,
      size: titleSize
    });
    yPosition -= 5;
    addText('1.1. Por meio deste contrato regula-se a locação do veículo:');
    yPosition -= 5;
    
    addText(`Marca: ${vehicle?.brand || '[MARCA]'}  |  Modelo: ${contract?.moto_modelo || '[MODELO]'}`);
    addText(`Placa: ${vehicle?.plate || '[PLACA]'}  |  Ano: ${vehicle?.year || '[ANO]'}`);
    if (format !== 'compact') {
      addText(`Quilometragem: ${vehicle?.odometer || 0} Km`);
    }
    yPosition -= 10;
  }
  
  // Period clause
  if (includeField('periodo')) {
    addText('CLÁUSULA 2ª – DO PERÍODO DE LOCAÇÃO', {
      font: timesRomanBoldFont,
      size: titleSize
    });
    yPosition -= 5;
    
    const startDate = contract?.data_inicio ? new Date(contract.data_inicio).toLocaleDateString('pt-BR') : '[DATA INÍCIO]';
    const endDate = contract?.data_fim ? new Date(contract.data_fim).toLocaleDateString('pt-BR') : '[DATA FIM]';
    
    addText(`2.1. Período: ${startDate} até ${endDate}`);
    
    if (format !== 'compact' && contract?.proxima_cobranca) {
      const nextBilling = new Date(contract.proxima_cobranca).toLocaleDateString('pt-BR');
      addText(`2.2. Próxima cobrança: ${nextBilling}`);
    }
    yPosition -= 10;
  }
  
  // Value clause
  if (includeField('valor')) {
    addText('CLÁUSULA 3ª – DO VALOR', {
      font: timesRomanBoldFont,
      size: titleSize
    });
    yPosition -= 5;
    
    const monthlyValue = contract?.valor_mensal ? formatCurrency(contract.valor_mensal) : '[VALOR]';
    addText(`3.1. Valor mensal: ${monthlyValue}`);
    
    if (format === 'detailed' && contract?.diaria) {
      addText(`3.2. Valor da diária: ${formatCurrency(contract.diaria)}`);
    }
    yPosition -= 10;
  }
  
  // Obligations
  addText('CLÁUSULA 4ª – DAS OBRIGAÇÕES', {
    font: timesRomanBoldFont,
    size: titleSize
  });
  yPosition -= 5;
  addText('4.1. O LOCATÁRIO se compromete a utilizar o veículo adequadamente.');
  addText('4.2. O LOCATÁRIO é responsável pelo pagamento pontual.');
  addText('4.3. A LOCADORA fornecerá o veículo em perfeitas condições.');
  yPosition -= 30;
  
  // Signatures
  const signatureY = Math.max(yPosition, 100);
  addText('_____________________________', {
    x: margin,
    size: fontSize
  });
  yPosition = signatureY - 20;
  addText('LOCADORA', {
    x: margin + 30,
    size: fontSize - 1
  });
  
  yPosition = signatureY;
  addText('_____________________________', {
    x: width - margin - 150,
    size: fontSize
  });
  yPosition = signatureY - 20;
  addText('LOCATÁRIO', {
    x: width - margin - 120,
    size: fontSize - 1
  });
  
  // Footer
  const today = new Date().toLocaleDateString('pt-BR');
  page.drawText(`Documento gerado em ${today}`, {
    x: width / 2 - 80,
    y: 30,
    size: 9,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  const pdfBytes = await pdfDoc.save();
  const base64 = arrayBufferToBase64(pdfBytes);
  return base64;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contract_id, user_id, contract_data, selectedFields, format } = await req.json();
    
    console.log('Generating contract PDF with:', { contract_id, user_id, has_contract_data: !!contract_data, selectedFields, format });

    // Allow generating empty templates without contract data
    if (!user_id) {
      throw new Error('user_id is required');
    }
    
    // If no contract_id or contract_data, generate empty template
    const isEmptyTemplate = !contract_id && !contract_data;

    let contractData = null;
    let customerData = null;
    let vehicleData = null;
    
    if (!isEmptyTemplate) {
      if (contract_data) {
        // Use provided contract data for new contracts
        contractData = contract_data;
      } else if (contract_id) {
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
      if (contractData?.cliente_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', contractData.cliente_id)
          .single();
        customerData = customer;
      }

      // Fetch vehicle data (optional)
      if (contractData?.moto_id) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', contractData.moto_id)
          .single();
        vehicleData = vehicle;
      }
    }

    const pdf_base64 = await generatePDF(contractData, customerData, vehicleData, selectedFields, format);
    
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