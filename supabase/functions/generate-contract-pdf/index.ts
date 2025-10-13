import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (date: string | Date) => {
  if (!date) return "[DATA]";
  return new Date(date).toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateShort = (date: string | Date) => {
  if (!date) return "[DATA]";
  return new Date(date).toLocaleDateString("pt-BR");
};

// Convert Uint8Array to base64
const arrayBufferToBase64 = (buffer: Uint8Array): string => {
  const chunks: string[] = [];
  const chunkSize = 0x8000;

  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, Math.min(i + chunkSize, buffer.length));
    chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
  }

  return globalThis.btoa(chunks.join(""));
};

// Generate complete PDF with full contract text
const generatePDF = async (contract: any, customer: any, vehicle: any): Promise<string> => {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const fontSize = 10;
  const titleSize = 12;
  const headerSize = 14;
  const lineHeight = fontSize * 1.4;

  let currentPage = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = currentPage.getSize();
  const margin = 50;
  let yPosition = height - margin;

  // Helper to add new page when needed
  const checkNewPage = (minSpace = 100) => {
    if (yPosition < margin + minSpace) {
      currentPage = pdfDoc.addPage([595.28, 841.89]);
      yPosition = currentPage.getHeight() - margin;
    }
  };

  // Helper to add text with word wrapping
  const addText = (text: string, options: any = {}) => {
    const {
      size = fontSize,
      font = timesRomanFont,
      color = rgb(0, 0, 0),
      bold = false,
      indent = 0,
      spaceBefore = 0,
      spaceAfter = 0,
    } = options;

    yPosition -= spaceBefore;
    checkNewPage();

    const selectedFont = bold ? timesRomanBoldFont : font;
    const maxWidth = width - 2 * margin - indent;
    const words = text.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      const testWidth = selectedFont.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && line) {
        currentPage.drawText(line, {
          x: margin + indent,
          y: yPosition,
          size,
          font: selectedFont,
          color,
        });
        yPosition -= lineHeight;
        checkNewPage();
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      currentPage.drawText(line, {
        x: margin + indent,
        y: yPosition,
        size,
        font: selectedFont,
        color,
      });
      yPosition -= lineHeight;
    }

    yPosition -= spaceAfter;
  };

  const addHeading = (text: string, size = titleSize) => {
    checkNewPage(80);
    yPosition -= 10;
    addText(text, { size, bold: true, spaceAfter: 5 });
  };

  // HEADER
  addText("CONTRATO PARTICULAR DE LOCAÇÃO DE VEÍCULO PJ-PF", {
    size: headerSize,
    bold: true,
    spaceAfter: 20,
  });

  // PARTIES
  addText("Pelo presente instrumento particular, de um lado:", { spaceAfter: 10 });

  addText(
    'Locaki locadora e rastreador de veículos, pessoa jurídica de direito privado, CNPJ 54.858.795/0001.00, email: pauliniamotos@gmail.com, telefone: "" , estabelecida na Avenida Presidente Getúlio Vargas, número 343, Paulínia - SP, doravante denominada LOCADORA;',
    {
      bold: true,
      spaceAfter: 10,
    },
  );

  addText("e de outro lado,", { spaceAfter: 10 });

  const clientName = contract?.cliente_nome || "[NOME DO CLIENTE]";
  const clientCPF = contract?.cliente_cpf || "[CPF]";
  const clientEmail = contract?.cliente_email || "[EMAIL]";
  const clientPhone = customer?.phone || "[TELEFONE]";
  const clientCNH = customer?.cnh_category ? `CNH ${customer.cnh_category}` : "[CNH]";
  const clientAddress = `${customer?.street || "[RUA]"}, nº ${customer?.number || "[NÚMERO]"}`;
  const clientNeighborhood = customer?.city || "[BAIRRO]";
  const clientCity = customer?.city || "[CIDADE]";
  const clientZip = customer?.zip_code || "[CEP]";

  addText(
    `${clientName}, brasileiro, inscrito no CPF nº ${clientCPF}, ${clientCNH}, email ${clientEmail}, telefone ${clientPhone}, residente e domiciliado na ${clientAddress}, bairro ${clientNeighborhood}, cidade ${clientCity}, CEP ${clientZip}, doravante denominado LOCATÁRIO, têm entre si como justo e contratado o que segue:`,
    {
      bold: true,
      spaceAfter: 15,
    },
  );

  // CLÁUSULA 1 - OBJETO DO CONTRATO
  addHeading("CLÁUSULA 1ª – DO OBJETO DO CONTRATO");

  addText("1. Por meio deste contrato regula-se a locação do veículo:", { spaceAfter: 5 });

  const vehicleBrand = vehicle?.brand || "[MARCA]";
  const vehicleModel = vehicle?.model || "[MODELO]";
  const vehiclePlate = vehicle?.plate || "[PLACA]";
  const vehicleYear = vehicle?.year || "[ANO]";
  const vehicleKm = vehicle?.odometer || 0;

  addText(`- Veículo de Marca: ${vehicleBrand}`, { indent: 20 });
  addText(`- Modelo: ${vehicleModel}`, { indent: 20 });
  addText(`- Placa: ${vehiclePlate}`, { indent: 20 });
  addText(`- Ano: ${vehicleYear}`, { indent: 20 });
  addText(`- Quilometragem atual: ${vehicleKm.toLocaleString("pt-BR")} Km`, { indent: 20 });
  addText(`- Franquia mensal: ${contract?.km_permitidos_dia ? contract.km_permitidos_dia * 30 : "9.000"} km/mês`, {
    indent: 20,
  });
  addText(
    `- Valor do km excedente: ${contract?.multa_km_excedente ? formatCurrency(contract.multa_km_excedente) : "R$ 0,50"}`,
    {
      indent: 20,
      spaceAfter: 10,
    },
  );

  addText(
    "2. O veículo descrito acima é de propriedade da LOCADORA e será utilizado exclusivamente pelo LOCATÁRIO, não sendo permitido sub-rogar para terceiros os direitos por ele obtidos através do presente contrato, nem permitir que outra pessoa conduza o referido veículo sem a inequívoca e expressa autorização da LOCADORA, sob pena de rescisão contratual, multa de R$ 500,00 (quinhentos reais), bem como responsabilização total por qualquer ato ou dano em relação ao veículo, inclusive os provenientes de caso fortuito ou força maior.",
    {
      spaceAfter: 15,
    },
  );

  // CLÁUSULA 2 - HORÁRIO E LOCAL
  addHeading("CLÁUSULA 2ª – DO HORÁRIO DO ALUGUEL E LOCAL DE COLETA E DEVOLUÇÃO DO VEÍCULO");

  addText("1. O veículo em questão permanecerá na posse do LOCATÁRIO por período integral, de segunda à domingo.", {
    spaceAfter: 5,
  });
  addText(
    "2. O LOCATÁRIO deverá apresentar o veículo a LOCADORA 01 (uma) vez por mês para a realização de vistoria, em data e endereço por este designado.",
    { spaceAfter: 5 },
  );
  addText(
    "3. A não apresentação do veículo no prazo e local supracitados acarretará ao LOCATÁRIO multa de R$ 20,00 (vinte reais) por dia de atraso, além de possível rescisão contratual.",
    { spaceAfter: 5 },
  );
  addText(
    "4. Em caso de interesse na devolução do veículo, o locatário deverá comunicar a LOCADORA com uma semana de antecedência. Caso contrário será cobrado o valor referente a 1 pagamento semanal.",
    { spaceAfter: 5 },
  );

  const localRetirada = contract?.local_entrega || "[LOCAL DE RETIRADA]";
  const localDevolucao = contract?.local_devolucao || localRetirada;
  addText(
    `5. A retirada do veículo ocorreu no endereço ${localRetirada} e deve ser devolvido no endereço ${localDevolucao} conforme acordado entre as partes.`,
    { spaceAfter: 15 },
  );

  // CLÁUSULA 3 - OBRIGAÇÕES DA LOCADORA
  addHeading("CLÁUSULA 3ª – DAS OBRIGAÇÕES DA LOCADORA");

  addText(
    "1. O veículo objeto do presente contrato será submetido à manutenção preventiva periódica, ou em decorrência de problemas mecânicos e/ou elétricos aos quais o LOCATÁRIO não deu causa, em oficina mecânica designada pela LOCADORA, nos termos a seguir:",
    { spaceAfter: 5 },
  );
  addText("1. Troca do Kit de Tração: Sempre que houver barulho anormal e/ou apresentar desgaste excessivo;", {
    indent: 20,
    spaceAfter: 3,
  });
  addText("2. Troca de Pneus: Quando estiverem no nível do Tread Wear Indicator (TWI).", { indent: 20, spaceAfter: 5 });
  addText(
    "2. Caso alguma das manutenções supracitadas seja necessária antes ou durante o período estipulado, deverá ser arcada integralmente pela LOCADORA, salvo nos casos em que o LOCATÁRIO tenha dado causa ao evento, por mau uso.",
    { spaceAfter: 5 },
  );
  addText(
    "3. Os gastos decorrentes da manutenção preventiva periódica supracitada, bem como o valor pago pela mão de obra do profissional que realizará o serviço serão suportados pela LOCADORA.",
    { spaceAfter: 5 },
  );
  addText(
    "4. As manutenções que não foram citadas na cláusula 3.1 também terão que ser arcadas pela LOCADORA, quando forem necessárias e atestadas pelo mecânico do mesmo.",
    { spaceAfter: 5 },
  );
  addText(
    "5. No caso de problemas mecânicos e/ou elétricos (quebra, defeito e/ou desgaste) percebidos em ocasião diversa da manutenção preventiva periódica, o LOCATÁRIO deverá informar imediatamente a LOCADORA, bem como apresentar o veículo a este, no prazo de 24 horas, para reparo a ser realizado em oficina mecânica designada pela LOCADORA.",
    { spaceAfter: 5 },
  );
  addText(
    "6. A LOCADORA obriga-se a manter Proteção Veicular contratada para o veículo objeto do presente contrato, com proteção para terceiros limitada a R$20.000,00 (vinte mil reais).",
    { spaceAfter: 5 },
  );
  addText(
    "7. É de responsabilidade da LOCADORA o pagamento do IPVA, Licenciamento, bem como o pagamento do Seguro Obrigatório do veículo objeto do presente contrato.",
    { spaceAfter: 5 },
  );
  addText(
    "8. A LOCADORA não se obriga a disponibilizar veículo reserva e não se responsabiliza caso o LOCATÁRIO não possa dirigir devido à indisponibilidade do veículo.",
    { spaceAfter: 15 },
  );

  // CLÁUSULA 4 - OBRIGAÇÕES DO LOCATÁRIO
  checkNewPage(150);
  addHeading("CLÁUSULA 4ª – DAS OBRIGAÇÕES DO LOCATÁRIO");

  addText(
    "4.1. É de responsabilidade do LOCATÁRIO a observância básica dos itens do veículo como calibragem dos pneus, nível de óleo do motor, nível de fluido de freio, observância da marcação, sistema de iluminação e sinalização, entre outros.",
    { spaceAfter: 5 },
  );
  addText(
    "4.1.1. Quaisquer danos/avarias ao veículo serão apurados ao final do contrato e os custos de reparação serão arcados pelo LOCATÁRIO.",
    { indent: 20, spaceAfter: 5 },
  );
  addText(
    "4.1.2. Os custos de revisões reparatórias causadas pelo mau uso dos veículos correrão por conta do LOCATÁRIO.",
    { indent: 20, spaceAfter: 5 },
  );
  addText(
    "4.2. É de responsabilidade do LOCATÁRIO o pagamento de quaisquer multas relativas às infrações de trânsito inerentes à utilização do veículo cometidas na vigência deste contrato.",
    { spaceAfter: 5 },
  );
  addText(
    "4.3. O LOCATÁRIO ficará com a posse de uma chave do veículo e, na hipótese de não a devolver, ou perder a mesma, independentemente do motivo, será cobrado o valor de R$ 100,00 para confecção da mesma.",
    { spaceAfter: 5 },
  );
  addText(
    "4.4. É de responsabilidade do LOCATÁRIO verificar ajuste dos parafusos da placa do veículo para evitar perda do item. Em caso de perda ou dano irreparável, será cobrado o valor de R$ 300,00 (trezentos reais) para confecção de uma nova placa.",
    { spaceAfter: 15 },
  );

  // CLÁUSULA 5 - COLISÕES E AVARIAS
  checkNewPage(100);
  addHeading("CLÁUSULA 5ª – DAS OBRIGAÇÕES DECORRENTES DE COLISÕES E AVARIAS DO VEÍCULO");

  addText(
    "5.1. É de responsabilidade do LOCATÁRIO o pagamento do reboque, taxas e reparos ao veículo objeto do presente contrato ou a veículo de outrem na ocorrência de acidentes e colisões sofridas na vigência do presente contrato quando não contempladas pela cobertura da Proteção Veicular contratada para este veículo.",
    { spaceAfter: 5 },
  );
  addText(
    "5.2. Na ocorrência da necessidade do pagamento da cota de participação da Proteção Veicular, a quantia será integralmente de responsabilidade do LOCATÁRIO, no valor de R$ 1.200,00 (um mil e duzentos reais).",
    { spaceAfter: 5 },
  );
  addText(
    "5.3. Será de responsabilidade do LOCATÁRIO o pagamento de taxas e diárias para a liberação do veículo decorrentes de reboque realizado pelo Poder Público.",
    { spaceAfter: 15 },
  );

  // CLÁUSULA 6 - PAGAMENTO
  addHeading("CLÁUSULA 6ª – DO PAGAMENTO EM RAZÃO DA LOCAÇÃO DO VEÍCULO");

  const valorMensal = contract?.valor_mensal || contract?.diaria || 0;
  const valorFormatado = formatCurrency(valorMensal);
  const frequencia = contract?.recorrente ? "semanalmente" : "mensalmente";

  addText(
    `6.1. O LOCATÁRIO pagará à LOCADORA o valor de ${valorFormatado} ${frequencia}, sempre de forma antecipada ao período correspondente.`,
    { spaceAfter: 5 },
  );
  addText(
    "6.2. Caso o pagamento seja feito após a data acordada, o valor sofrerá um acréscimo de 10% (dez por cento) a título de multa, bem como um acréscimo de 1% (um por cento) por mês de atraso a título de juros.",
    { spaceAfter: 5 },
  );
  addText("6.3. Fica o LOCATÁRIO obrigado a arquivar o comprovante de pagamento, valendo o mesmo como recibo.", {
    spaceAfter: 15,
  });

  // CLÁUSULA 7 - CAUÇÃO
  addHeading("CLÁUSULA 7ª – DA QUANTIA CAUÇÃO");

  const valorCaucao = contract?.caucionamento ? formatCurrency(contract.caucionamento) : "[VALOR DA CAUÇÃO]";
  addText(
    `7.1. Estabelecem as partes, a QUANTIA CAUÇÃO no valor total de ${valorCaucao} a ser integralizada conforme acordado entre as partes.`,
    { spaceAfter: 5 },
  );
  addText(
    "7.2. Ao término da vigência do presente contrato caberá a LOCADORA restituir a integralidade da QUANTIA CAUÇÃO ao LOCATÁRIO no prazo de 20 (vinte) dias úteis a contar da devolução do veículo.",
    { spaceAfter: 15 },
  );

  // CLÁUSULA 8 - VIGÊNCIA E RESCISÃO
  checkNewPage(150);
  addHeading("CLÁUSULA 8ª – VIGÊNCIA E RESCISÃO");

  const dataInicio = formatDateShort(contract?.data_inicio || contract?.data_inicio_completa);
  const dataFim = formatDateShort(contract?.data_fim || contract?.data_fim_completa);

  addText(`8.1. O presente contrato inicia-se na data de ${dataInicio} com término na data ${dataFim}.`, {
    spaceAfter: 5,
  });
  addText(
    "8.1.1. Caso o Locatário opte por permanecer com o veículo locado após o período de locação inicialmente contratado, deverá dirigir-se pessoalmente à LOCADORA para confirmar a disponibilidade do veículo e assinar um novo contrato.",
    { indent: 20, spaceAfter: 5 },
  );
  addText(
    "8.1.2. Em caso de devolução antecipada o LOCATÁRIO pagará uma multa no valor de 50% das diárias restantes.",
    { indent: 20, spaceAfter: 5 },
  );
  addText("8.2. O contrato poderá ser considerado rescindido de pleno direito pela LOCADORA quando:", {
    spaceAfter: 5,
  });
  addText("8.2.1. O veículo não for devolvido na data, hora e local previamente ajustados;", {
    indent: 20,
    spaceAfter: 3,
  });
  addText("8.2.2. Ocorrer o uso inadequado do veículo;", { indent: 20, spaceAfter: 3 });
  addText("8.2.3. O LOCATÁRIO não quitar seus débitos nos respectivos vencimentos;", { indent: 20, spaceAfter: 15 });

  // CLÁUSULA 9 - DEVOLUÇÃO
  addHeading("CLÁUSULA 9ª – DA DEVOLUÇÃO DO VEÍCULO");

  addText(
    "9.1. Ao término do contrato, o veículo deve ser devolvido em local, dia e hora indicado pela LOCADORA, sob pena de multa de R$ 50,00 (cinquenta reais) por dia.",
    { spaceAfter: 5 },
  );
  addText(
    "9.2. A não devolução de veículo pelo LOCATÁRIO, após notificação realizada pela LOCADORA, configura crime de APROPRIAÇÃO INDÉBITA conforme artigo 168 do Código Penal Brasileiro.",
    { spaceAfter: 15 },
  );

  // CLÁUSULA 10 - LGPD
  checkNewPage(150);
  addHeading("CLÁUSULA 10ª – DO CONSENTIMENTO PARA COLETA E TRATAMENTO DE DADOS – LGPD");

  addText(
    "A atividade de tratamento de dados realizados pela LOCADORA está de acordo com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD) e demais leis e regulamentos pertinentes.",
    { spaceAfter: 5 },
  );
  addText(
    `Diante de todo o exposto, eu, ${clientName}, CPF: ${clientCPF}, afirmo meu consentimento livre e espontâneo para utilização dos meus dados pessoais, nos termos deste documento.`,
    { spaceAfter: 15 },
  );

  // CLÁUSULA 11 - DISPOSIÇÕES GERAIS
  addHeading("CLÁUSULA 11ª – DAS DISPOSIÇÕES GERAIS");

  addText(
    "11.1. Quaisquer notificações e comunicações enviadas sob esse contrato podem ser realizadas de forma eletrônica (e-mail ou whatsapp).",
    { spaceAfter: 5 },
  );
  addText(
    "11.2. Todos os valores, despesas e encargos da locação constituem dívidas líquidas e certas para pagamento à vista, passíveis de cobrança executiva.",
    { spaceAfter: 5 },
  );
  addText(
    "11.3. O LOCATÁRIO autoriza a LOCADORA a coletar, usar e divulgar a sua imagem para fins de cadastro, defesa e/ou promoção.",
    { spaceAfter: 5 },
  );
  addText(
    "11.4. E, por estarem assim, justas e contratadas, as partes firmam o presente instrumento em 02 (duas) vias de igual teor e forma.",
    { spaceAfter: 20 },
  );

  // Date and location
  const today = new Date();
  const cityName = customer?.city || "[CIDADE]";
  addText(`${cityName}, ${formatDate(today)}`, { spaceAfter: 40 });

  // Signatures
  checkNewPage(120);
  yPosition -= 40;

  const signatureY = yPosition;
  const signatureWidth = 200;
  const leftSignatureX = margin;
  const rightSignatureX = width - margin - signatureWidth;

  // Left signature (LOCADORA)
  currentPage.drawLine({
    start: { x: leftSignatureX, y: signatureY },
    end: { x: leftSignatureX + signatureWidth, y: signatureY },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  currentPage.drawText("[NOME DA EMPRESA]", {
    x: leftSignatureX + 40,
    y: signatureY - 15,
    size: fontSize,
    font: timesRomanBoldFont,
    color: rgb(0, 0, 0),
  });

  currentPage.drawText("LOCADORA", {
    x: leftSignatureX + 70,
    y: signatureY - 30,
    size: fontSize - 1,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Right signature (LOCATÁRIO)
  currentPage.drawLine({
    start: { x: rightSignatureX, y: signatureY },
    end: { x: rightSignatureX + signatureWidth, y: signatureY },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  const nameWidth = timesRomanBoldFont.widthOfTextAtSize(clientName, fontSize);
  const centerOffset = (signatureWidth - nameWidth) / 2;

  currentPage.drawText(clientName, {
    x: rightSignatureX + centerOffset,
    y: signatureY - 15,
    size: fontSize,
    font: timesRomanBoldFont,
    color: rgb(0, 0, 0),
  });

  currentPage.drawText("LOCATÁRIO", {
    x: rightSignatureX + 70,
    y: signatureY - 30,
    size: fontSize - 1,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  // Footer
  const footerText = `Documento gerado em ${formatDateShort(today)}`;
  const footerWidth = timesRomanFont.widthOfTextAtSize(footerText, 9);
  currentPage.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: 30,
    size: 9,
    font: timesRomanFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  const base64 = arrayBufferToBase64(pdfBytes);
  return base64;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contract_id, user_id, contract_data } = await req.json();

    console.log("Starting PDF generation...", { contract_id, user_id, has_contract_data: !!contract_data });

    if (!user_id) {
      throw new Error("user_id is required");
    }

    let contractData = null;
    let customerData = null;
    let vehicleData = null;

    if (contract_data) {
      contractData = contract_data;
    } else if (contract_id) {
      const { data: dbContractData, error: contractError } = await supabase
        .from("contratos")
        .select("*")
        .eq("id", contract_id)
        .eq("user_id", user_id)
        .single();

      if (contractError || !dbContractData) {
        throw new Error("Contract not found");
      }

      contractData = dbContractData;
    }

    // Fetch customer data
    if (contractData?.cliente_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("*")
        .eq("id", contractData.cliente_id)
        .single();
      customerData = customer;
    }

    // Fetch vehicle data
    if (contractData?.moto_id) {
      const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", contractData.moto_id).single();
      vehicleData = vehicle;
    }

    console.log("Generating PDF...");
    const pdfBase64 = await generatePDF(contractData, customerData, vehicleData);

    console.log("PDF generated successfully, base64 length:", pdfBase64.length);

    return new Response(
      JSON.stringify({
        success: true,
        pdf: pdfBase64,
        filename: `contrato_${contractData?.id || "novo"}_${Date.now()}.pdf`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

serve(handler);
