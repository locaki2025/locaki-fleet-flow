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
                ${contract.km_permitidos_dia ? `Franquia mensal: ${contract.km_permitidos_dia * 30} km/mês<br>` : ''}
                ${contract.multa_km_excedente ? `Valor do km excedente: ${formatCurrency(contract.multa_km_excedente)}<br>` : ''}
            </div>
            1.2. O veículo descrito acima é de propriedade da LOCADORA e será utilizado exclusivamente pelo LOCATÁRIO, não sendo permitido sub-rogar para terceiros os direitos por ele obtidos através do presente contrato, nem permitir que outra pessoa conduza o referido veículo sem a inequívoca e expressa autorização da LOCADORA, sob pena de rescisão contratual, multa de R$ 500,00 (quinhentos reais), bem como responsabilização total por qualquer ato ou dano em relação ao veículo, inclusive os provenientes de caso fortuito ou força maior.
        </div>

        <div class="clause-title">CLÁUSULA 2ª – DO HORÁRIO DO ALUGUEL E LOCAL DE COLETA E DEVOLUÇÃO DO VEÍCULO</div>
        <div class="clause">
            2.1. O veículo em questão permanecerá na posse do LOCATÁRIO por período integral, de segunda à domingo<br>
            2.2. O LOCATÁRIO deverá apresentar o veículo a LOCADORA 01 (uma) vez por mês para a realização de vistoria, em data e endereço por este designado.<br>
            2.3. A não apresentação do veículo no prazo e local supracitados acarretará ao LOCATÁRIO multa de R$ 20,00 (vinte reais) por dia de atraso, além de possível rescisão contratual.<br>
            2.4. Em caso de interesse na devolução do veículo, o locatário deverá comunicar a LOCADORA com uma semana de Antecedência. Caso contrário será cobrado o valor referente a 1 pagamento semanal.<br>
            2.5. A retirada do veículo ocorreu no endereço ${contract.local_entrega || '[LOCAL DE ENTREGA]'} e deve ser devolvido no endereço ${contract.local_devolucao || '[LOCAL DE DEVOLUÇÃO]'} conforme acordado entre as partes.
        </div>

        <div class="clause-title">CLÁUSULA 3ª – DAS OBRIGAÇÕES DA LOCADORA</div>
        <div class="clause">
            3.1. O veículo objeto do presente contrato será submetido à manutenção preventiva periódica, ou em decorrência de problemas mecânicos e/ou elétricos aos quais o LOCATÁRIO não deu causa, em oficina mecânica designada pela LOCADORA, nos termos a seguir:<br>
            3.1.1. Troca do Kit de Tração: Sempre que houver barulho anormal e/ou apresentar desgaste excessivo;<br>
            3.1.2. Troca de Pneus: Quando estiverem no nível do Tread Wear Indicator (TWI).<br>
            3.2. Caso alguma das manutenções supracitadas, seja necessária antes ou durante o período estipulado, deverá ser arcada integralmente pela LOCADORA, salvo nos casos em que o LOCATÁRIO tenha dado causa ao evento, por mau uso.<br>
            3.3. Os gastos decorrentes da manutenção preventiva periódica supracitada, bem como o valor pago pela mão de obra do profissional que realizará o serviço serão suportados pela LOCADORA.<br>
            3.4. As manutenções que não foram citadas na cláusula 3.1 também terão que ser arcadas pela LOCADORA, quando forem necessárias e atestadas pelo mecânico do mesmo.<br>
            3.5. No caso de problemas mecânicos e/ou elétricos (quebra, defeito e/ou desgaste) percebidos em ocasião diversa da manutenção preventiva periódica, o LOCATÁRIO deverá informar imediatamente a LOCADORA, bem como apresentar o veículo a este, no prazo de 24 horas, para reparo a ser realizado em oficina mecânica designada pela LOCADORA.<br>
            3.6. A LOCADORA obriga-se a manter Proteção Veicular contratada para o veículo objeto do presente contrato, com proteção para terceiros limitada a R$20.000,00 (vinte mil reais).<br>
            3.7. É de responsabilidade da LOCADORA o pagamento do IPVA, Licenciamento, bem como o pagamento do Seguro Obrigatório do veículo objeto do presente contrato.<br>
            3.8. A LOCADORA não se obriga a disponibilizar veículo reserva e não se responsabiliza caso o LOCATÁRIO não possa dirigir devido à indisponibilidade do veículo.
        </div>

        <div class="clause-title">CLÁUSULA 4ª – DAS OBRIGAÇÕES DO LOCATÁRIO</div>
        <div class="clause">
            4.1. É de responsabilidade do LOCATÁRIO a observância básica dos itens do veículo como calibragem dos pneus, nível de óleo do motor, nível de fluido de freio, observância da marcação, sistema de iluminação e sinalização, entre outros.<br>
            4.1.1. Quaisquer danos/avarias ao veículo serão apurados ao final do contrato e os custos de reparação serão arcados pelo LOCATÁRIO.<br>
            4.1.2. Os custos de revisões reparatórias causadas pelo mau uso dos veículos correrão por conta do LOCATÁRIO. Caso a bomba de combustível queime ou danifique por falta de combustível e/ou abastecimento de combustível não compatível ao veículo e de má qualidade, caso ocorra furo/rasgo no pneu por falta de calibragem ou negligência quando o veículo estiver em posse do LOCATÁRIO, este deverá arcar com o valor integral da peça, mão de obra e demais valores inerentes ao reparo.<br>
            4.2. É de responsabilidade do LOCATÁRIO o pagamento de quaisquer multas relativas às infrações de trânsito inerentes à utilização do veículo cometidas na vigência deste contrato.<br>
            4.2.1. O pagamento das multas pelo LOCATÁRIO deve ser feito imediatamente após a constatação no sistema do DETRAN, independentemente de qualquer procedimento, seja transferência de pontos ou recurso.<br>
            4.2.2. O pagamento da Multa deve ser feita assim que a LOCADORA for Notificada pelo órgão responsável, independente de ter gerado ou não a multa definitiva, sendo adicionado ao valor da infração, o valor de 15% de taxa administrativa.<br>
            4.2.3. O LOCATÁRIO, por meio do presente instrumento, nomeiam e constituem sua bastante procuradora a LOCADORA, para firmar todos e quaisquer documentos, termos, requerimentos e o que mais fizer necessário, sem qualquer exceção, afim de indicar condutor e imputar pontuação decorrente das infrações à legislação de trânsito ocorridas no período de vigência deste contrato, nos termos do art. 257, Parágrafos 7º e 8º do Código de Trânsito Brasileiro, e Resolução CONTRAN 149/03, de 19 de setembro de 2003. A partir da indicação, o LOCATÁRIO terá legitimidade para se defender perante o órgão autuador.<br>
            4.2.4. Procuração de Multas: Cliente e motorista(s), pelo presente, nomeiam e constituem sua bastante procuradora a LOCADORA para em seu nome assinar o termo de apresentação do condutor/infrator, nos casos de multas de trânsito em geral, oriundas e praticadas na vigência deste contrato, nos termos do art. 257 Parágrafo 7º e 8º do Código Brasileiro de Trânsito.<br>
            4.2.5. Qualquer questionamento sobre eventual improcedência de infração de trânsito deverá ser feito exclusivamente pelo LOCATÁRIO perante o órgão autuador.<br>
            4.2.6. Caso o LOCATÁRIO opte por recorrer da autuação e sendo o recurso vitorioso, a LOCADORA lhe fornecerá cópia da guia de pagamento para que ele solicite ao órgão o reembolso.<br>
            4.3. Em ocorrendo multas acima mencionadas, quando a autuação da infração chegar a LOCADORA, deverá o LOCATÁRIO comparecer em local e data estipulados pela LOCADORA para a assinatura do auto de infração com o intuito de transferência dos pontos para a sua CNH, sob pena de pagar a LOCADORA a quantia de R$ 300,00 (trezentos reais), em caso de perda do prazo para a transferência dos pontos.<br>
            4.4. O LOCATÁRIO ficará com a posse de uma chave do veículo e, na hipótese de não a devolver, ou perder a mesma, independentemente do motivo, será cobrado o valor de R$ 100,00 para confecção da mesma;<br>
            4.5. É de responsabilidade do LOCATÁRIO, verificar ajuste dos parafusos da placa do veículo para evitar perda do item. Em caso de perda ou dano irreparável, será cobrado o valor de R$300,00 (trezentos reais) para confecção de uma nova placa, não sendo obrigado a substituição do veículo pela LOCADORA.<br>
            4.6. Manter atualizada e dentro da validade a CNH para que este documento possa ser utilizado como válido em caso de indicação de multas durante o período contratual, sob pena de multa de R$500,00 (quinhentos reais).<br>
            4.7. Caso o veículo seja rebocado por estacionamento irregular, ou outra hipótese a qual tenha dado causa, o LOCATÁRIO deverá arcar com todos os custos necessários para a recuperação do veículo junto ao respectivo depósito público. O LOCATÁRIO deverá arcar também com multa contratual no valor da diária do contrato por dia pelo período em que o veículo estiver no depósito, a título de lucro cessante.<br>
            4.8. Em caso de problemas com o equipamento rastreador, o LOCATÁRIO deverá disponibilizar o veículo para manutenção, momento em que a LOCADORA disponibilizará outro VEÍCULO de mesma categoria, na hipótese da manutenção levar mais de uma hora. A não disponibilização do VÉICULO, em até 24 horas para manutenção do equipamento rastreador, caracterizará inadimplemento passível de rescisão contratual.<br>
            4.9. É proibido o LOCATÁRIO acionar o serviço de Proteção Veicular do veículo objeto deste contrato sem a expressa permissão da LOCADORA, sob pena de multa de R$ 200,00 (duzentos reais), além da obrigação de arcar com eventuais custos de reboques e/ou transportes necessários, caso o serviço de Proteção Veicular não mais os disponibilize devido ao limite de utilizações mensais deste serviço.<br>
            4.10. O LOCATÁRIO se responsabiliza por quaisquer acessórios do veículo que estiverem em sua posse, como por exemplo chave de ignição, documento do veículo, etc. Caso algum acessório do veículo seja perdido ou danificado, o LOCATÁRIO deverá arcar com todos os custos necessários à reposição.<br>
            4.11. É proibido o LOCATÁRIO sair do perímetro de circulação permitido com o veículo objeto deste contrato sem a autorização expressa e por escrito da LOCADORA, sob pena de multa de R$ 150,00 (cento e cinquenta reais), além do pagamento dos custos para o retorno do veículo para base da locadora, bem como o pagamento de eventuais danos ocorridos com o veículo, inclusive caso fortuito e força maior.<br>
            4.12. Em caso de roubo ou furto do veículo, o LOCATÁRIO se compromete a avisar imediatamente a LOCADORA, bem como a comparecer à delegacia de polícia mais próxima da residência da LOCADORA para registrar a ocorrência. A não comunicação do furto ou roubo dentro do prazo de até 2 horas, acarretará multa de R$1.200,00 (mil e duzentos reais) em caso de recuperação do veículo ou multa no valor da tabela fipe em caso de não recuperação e perda da proteção.<br>
            4.13. O LOCATÁRIO se compromete a comparecer à sede da empresa de Proteção Veicular, ou outro local especificado pela mesma, a fim de cumprir com procedimento de indenização do veículo.<br>
            4.14. Caso o LOCATÁRIO se envolva em sinistro estando sob efeito de álcool/entorpecentes, ou se não fizer o teste de embriaguez requerido pela autoridade, este deverá pagar a LOCADORA o valor da tabela FIPE do veículo, caso a indenização da Proteção Veicular seja negada e/ou com todos os custos inerentes à recuperação do veículo junto ao depósito, em caso de reboque.<br>
            4.15. O LOCATÁRIO deve manter as características originais do veículo, portanto a instalação de adesivos, pinturas especiais, equipamentos ou acessórios no veículo alugado está sujeita à autorização prévia, por escrito, da LOCADORA. Neste caso, a retirada dos mesmos e a recuperação do veículo ao seu estado original são de responsabilidade do LOCATÁRIO.<br>
            4.16. É de responsabilidade do LOCATÁRIO o pagamento e a troca do óleo do motor a cada 1.000km rodados, de acordo com as especificações do fabricante do veículo. Será exigido foto do painel do veículo semanalmente no dia de pagamento da semana e vídeo da troca do óleo mensal no prazo correto.<br>
            4.17. Valor mensal da locação: ${formatCurrency(contract.valor_mensal)}, com vencimento todo dia ${new Date(contract.data_inicio).getDate()} de cada mês.<br>
            ${contract.caucionamento ? `4.18. Caução: ${formatCurrency(contract.caucionamento)}, que será devolvida ao final do contrato, descontados eventuais débitos.<br>` : ''}
        </div>

        <div class="clause-title">CLÁUSULA 8ª – DA RESCISÃO CONTRATUAL</div>
        <div class="clause">
            8.1. Este contrato poderá ser rescindido a qualquer tempo pela LOCADORA, independentemente de interpelação judicial ou extrajudicial, nas seguintes hipóteses:<br>
            8.2.1. O veículo não for devolvido na data, hora e local previamente ajustados, caso a LOCADORA não autorize a renovação de contrato;<br>
            8.2.2. Ocorrer o uso inadequado do veículo;<br>
            8.2.3. Veículo se envolva em sinistro;<br>
            8.2.4. Ocorrer apreensão do veículo locado por autoridades competentes;<br>
            8.2.5. O LOCATÁRIO não quitar seus débitos nos respectivos vencimentos;<br>
            8.2.6. O LOCATÁRIO acumular uma dívida superior a R$ 350,00 (trezentos e cinquenta reais) e não a quite imediatamente, caso no qual o veículo deverá ser entregue em local determinado pela LOCADORA, imediatamente, sob pena de multa de R$ 150,00 (cento e cinquenta reais por dia), salvo acordo contrário entre as partes.<br>
            8.3. Fica desde já pactuada a total inexistência de vínculo trabalhista entre as partes do presente contrato, sendo indevida toda e qualquer incidência das obrigações previdenciárias e os encargos sociais, não havendo entre as partes qualquer tipo de subordinação e controle típicos de relações de emprego.<br>
            8.4. Nos termos do artigo 265 do Código Civil Brasileiro, inexiste solidariedade, seja contratual ou legal entre a LOCADORA e o LOCATÁRIO, razão pela qual, com a locação e a efetiva retirada do veículo alugado, o LOCATÁRIO assume sua posse autônoma para todos os fins de direito, responsabilizando-se por eventuais indenizações decorrentes do uso e circulação do veículo, cuja responsabilidade perdurará até a efetiva devolução do veículo alugado.
        </div>

        <div class="clause-title">CLÁUSULA 9ª – DA DEVOLUÇÃO DO VEÍCULO</div>
        <div class="clause">
            9.1. Ao término do contrato, o veículo deve ser devolvido em local, dia e hora indicado pela LOCADORA, sob pena de multa de R$ 50,00 (cinquenta reais) por dia.<br>
            9.2. A não devolução de veículo pelo LOCATÁRIO, após notificação realizada pela LOCADORA, configura crime de APROPRIAÇÃO INDÉBITA conforme artigo 168 do Código Penal Brasileiro, com pena de reclusão de um a quatro anos de prisão e multa.
        </div>

        <div class="clause-title">CLÁUSULA 10ª – DO CONSENTIMENTO PARA COLETA E TRATAMENTO DE DADOS – LGPD</div>
        <div class="clause">
            A atividade de tratamento de dados realizados pela LOCADORA está de acordo com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD) e demais leis e regulamentos pertinentes.<br><br>
            Para tanto, no momento da assinatura do contrato de locação, são coletados os seguintes dados: Nome, RG, CPF, CNH, telefone, e-mail, endereço, dados do cartão de crédito para viabilizar o pagamento e/ou caução caso seja essa a opção escolhida – e a localização do veículo locado por meio de sistema de monitoramento e rastreamento.<br><br>
            Tais dados são adequados e essenciais à finalidade que se pretende com a locação de veículos, na medida em que permitem a identificação do locatário para assegurar eventuais responsabilidades decorrentes das leis de trânsito; permitem os procedimentos para pagamento e garantia do serviço de locação e, em caso de descumprimento contratual, furto ou roubo, via sistema de monitoramento, permite a localização e retomada do veículo.<br><br>
            Essencial destacar que o locatário pode se recusar a ceder tais dados neste momento. Contudo, com a recusa, a LOCADORA se reserva no direito de não formalizar a locação, pois como já mencionado, os dados mencionados neste documento são essenciais para a perfeita execução da prestação de serviço de locação.<br><br>
            Diante de todo o exposto, eu, <strong>${contract.cliente_nome}</strong>, CPF/CNPJ: ${contract.cliente_cpf}, afirmo meu consentimento livre e espontâneo para utilização dos meus dados pessoais, nos termos deste documento.
        </div>

        <div class="clause-title">CLÁUSULA 11ª – DAS DISPOSIÇÕES GERAIS</div>
        <div class="clause">
            11.1. Quaisquer notificações e comunicações enviadas sob esse contrato podem ser realizadas de forma eletrônica (e-mail ou whatsapp), escritas ou por correspondência com aviso de recebimento aos endereços constantes do preâmbulo. Em havendo alteração do endereço ficam as partes obrigadas a fornecer tal informação.<br>
            11.2. Todos os valores, despesas e encargos da locação constituem dívidas líquidas e certas para pagamento à vista, passíveis de cobrança executiva.<br>
            11.3. Eventuais tolerâncias da LOCADORA para com o LOCATÁRIO no cumprimento das obrigações ajustadas neste contrato constituem mera liberalidade, não importando em hipótese alguma em novação ou renúncia, permanecendo íntegras as cláusulas e condições aqui contratadas.<br>
            11.4. O LOCATÁRIO autoriza a LOCADORA a coletar, usar e divulgar a sua imagem para fins de cadastro, defesa e/ou promoção.<br>
            11.5. O LOCATÁRIO concorda que a sua assinatura no contrato implica ciência e adesão por si, seus herdeiros/ sucessores a estas cláusulas.<br>
            11.6. Fica eleito o foro desta cidade e Comarca local, como competente para dirimir quaisquer questões que possam advir da aplicação do presente CONTRATO, por mais privilegiado que seja ou venha a ser, qualquer Foro.<br>
            11.7. E, por estarem assim, justas e contratadas, as partes firmam o presente instrumento em 02 (duas) vias de igual teor e forma, para que produza seus efeitos legais, após ter lido o seu conteúdo ter sido claramente entendido e aceito.
        </div>

        <div style="text-align: center; margin: 30px 0;">
            ${contractLocation}, ${today}
        </div>

        <div class="signatures">
            <div class="signature-block">
                <div class="signature-line">
                    [NOME DA EMPRESA]<br>
                    LOCADORA
                </div>
            </div>
            <div class="signature-block">
                <div class="signature-line">
                    ${contract.cliente_nome}<br>
                    LOCATÁRIO
                </div>
            </div>
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