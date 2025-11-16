import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CoraTransaction {
  id: string;
  amount: number;
  currency: string;
  type: "credit" | "debit";
  status: "settled" | "pending" | "failed";
  description: string;
  created_at: string;
}

interface CoraConfig {
  client_id: string;
  cert_file: string;
  key_file: string;
  base_url: string;
  environment: "production" | "stage";
}

interface CachedToken {
  access_token: string;
  expires_at: string; // ISO timestamp
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logWebhook = async (invoiceId: string, eventType: string, payload: any, status: string, amount?: number) => {
  await supabase.from("webhook_logs").insert({
    invoice_id: invoiceId,
    event_type: eventType,
    payload,
    status,
    amount,
  });
};

const updateInvoiceStatus = async (coraChargeId: string, status: string, paidAmount?: number) => {
  // Find invoice by Cora charge ID (we'll need to store this in the boletos table)
  const { data: invoice, error: findError } = await supabase
    .from("boletos")
    .select("*")
    .eq("fatura_id", coraChargeId)
    .single();

  if (findError || !invoice) {
    console.error("Invoice not found for Cora charge ID:", coraChargeId);
    return null;
  }

  // Update invoice status
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "pago" && paidAmount) {
    updateData.data_pagamento = new Date().toISOString();
    updateData.valor_pago = paidAmount / 100; // Convert from cents
  }

  const { error: updateError } = await supabase.from("boletos").update(updateData).eq("id", invoice.id);

  if (updateError) {
    console.error("Error updating invoice:", updateError);
    return null;
  }

  return invoice;
};

// Get cached token from database
const getCachedToken = async (userId: string): Promise<CachedToken | null> => {
  const { data, error } = await supabase
    .from("tenant_config")
    .select("config_value")
    .eq("user_id", userId)
    .eq("config_key", "cora_access_token")
    .single();

  if (error || !data) {
    return null;
  }

  const cachedToken = data.config_value as CachedToken;
  const expiresAt = new Date(cachedToken.expires_at);
  const now = new Date();

  // Check if token is still valid (with 5 minute buffer)
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return cachedToken;
  }

  return null;
};

// Save token to cache
const cacheToken = async (userId: string, accessToken: string, expiresIn: number = 3600) => {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

  const cachedToken: CachedToken = {
    access_token: accessToken,
    expires_at: expiresAt.toISOString(),
  };

  await supabase.from("tenant_config").upsert(
    {
      user_id: userId,
      config_key: "cora_access_token",
      config_value: cachedToken,
    },
    {
      onConflict: "user_id,config_key",
    },
  );
};

// Invalidate cached token
const invalidateToken = async (userId: string) => {
  await supabase.from("tenant_config").delete().eq("user_id", userId).eq("config_key", "cora_access_token");
};

// Normalize Cora base URL based on environment (ensures mTLS host)
const resolveCoraBaseUrl = (config: CoraConfig): string => {
  if (config?.base_url && config.base_url.includes("matls-clients.")) return config.base_url;
  return config.environment === "production"
    ? "https://matls-clients.api.cora.com.br"
    : "https://matls-clients.api.stage.cora.com.br";
};

// Get Cora access token using mTLS proxy (with caching)
const getCoraAccessToken = async (userId: string, config: CoraConfig, forceRefresh: boolean = false) => {
  const PROXY_URL = "https://cora-mtls-proxy.onrender.com";
  const PROXY_SECRET = "locakicoraproxy";

  try {
    // Validate config before attempting authentication
    if (!config.client_id || !config.cert_file || !config.key_file) {
      throw new Error("Configuração incompleta: client_id, certificado e chave privada são obrigatórios");
    }

    // Validate certificate format
    if (!config.cert_file.includes("BEGIN CERTIFICATE") || !config.cert_file.includes("END CERTIFICATE")) {
      throw new Error("Formato de certificado inválido. O certificado deve estar em formato PEM");
    }

    // Validate private key format
    if (!config.key_file.includes("BEGIN") || !config.key_file.includes("PRIVATE KEY")) {
      throw new Error("Formato de chave privada inválido. A chave deve estar em formato PEM");
    }

    // Check cache first unless forced refresh
    if (!forceRefresh) {
      const cachedToken = await getCachedToken(userId);
      if (cachedToken) {
        console.log("Using cached Cora token");
        return cachedToken.access_token;
      }
    }

    const baseUrl = resolveCoraBaseUrl(config);
    console.log("Fetching new Cora token from proxy", {
      base_url: baseUrl,
      client_id: config.client_id,
      cert_length: config.cert_file.length,
      key_length: config.key_file.length,
    });

    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('client_id', config.client_id);
    formData.append('base_url', baseUrl);
    
    // Convert certificate and key strings to Blobs
    const certBlob = new Blob([config.cert_file], { type: 'application/x-pem-file' });
    const keyBlob = new Blob([config.key_file], { type: 'application/x-pem-file' });
    
    formData.append('cert_file', certBlob, 'certificate.pem');
    formData.append('key_file', keyBlob, 'private-key.key');

    const response = await fetch(`${PROXY_URL}/cora/token`, {
      method: "POST",
      headers: {
        "X-Proxy-Secret": PROXY_SECRET,
        // Don't set Content-Type, let the browser set it with boundary
      },
      body: formData,
    });

    const responseText = await response.text();
    console.log("Proxy token response:", {
      status: response.status,
      body: responseText.substring(0, 200), // Log only first 200 chars
    });

    if (!response.ok) {
      // Parse error details if available
      let errorDetails = responseText;
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.error) {
          errorDetails = errorJson.error;

          // Provide more specific error messages
          if (errorDetails.includes("invalid_client")) {
            throw new Error(
              "Credenciais inválidas. Verifique se:\n" +
                "1. O client_id está correto\n" +
                "2. O certificado corresponde ao client_id\n" +
                "3. A chave privada corresponde ao certificado\n" +
                "4. As credenciais são válidas para o ambiente " +
                config.environment,
            );
          }
        }
      } catch (parseError) {
        // If not JSON, use original text
      }

      throw new Error(`Falha na autenticação com Cora (${response.status}): ${errorDetails}`);
    }

    const data = JSON.parse(responseText);

    if (!data.access_token) {
      throw new Error("Token de acesso não retornado pela API do Cora");
    }

    const accessToken = data.access_token;
    const expiresIn = data.expires_in || 3600; // Default 1 hour

    // Cache the token
    await cacheToken(userId, accessToken, expiresIn);

    console.log("Successfully obtained and cached Cora access token");
    return accessToken;
  } catch (error) {
    console.error("Error getting Cora access token:", error);
    throw error;
  }
};

// Sync transactions from Cora API
/*const syncCoraTransactions = async (userId: string, config: CoraConfig, startDate: string, endDate: string) => {
  const startTime = Date.now();
  let importedCount = 0;
  let conciliatedCount = 0;
  let errorMessage = "";

  try {
    console.log(`Starting Cora sync for user ${userId} from ${startDate} to ${endDate}`);

    const PROXY_URL = "https://cora-mtls-proxy.onrender.com";
    const PROXY_SECRET = "locakicoraproxy";
    let accessToken = await getCoraAccessToken(userId, config);
    const baseUrl = resolveCoraBaseUrl(config);

    // Fetch transactions through proxy
    console.log(`Fetching transactions from ${startDate} to ${endDate}`);
    // Fetch transactions through proxy
    console.log(`JSON body ${ccessToken}, ${config.cert_file}, 
    ${config.key_file}, ${baseUrl}, ${startDate}, ${endDate}`);

    let transactionsResponse = await fetch(`${PROXY_URL}/cora/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Secret": PROXY_SECRET,
      },
      body: JSON.stringify({
        access_token: accessToken,
        cert_file: config.cert_file,
        key_file: config.key_file,
        base_url: baseUrl,
        start: startDate,
        end: endDate,
      }),
    });

    // If token expired, refresh and retry
    if (transactionsResponse.status === 401 || transactionsResponse.status === 403) {
      console.log("Token expired, refreshing...");
      await invalidateToken(userId);
      accessToken = await getCoraAccessToken(userId, config, true);

      // Fetch transactions through proxy
      console.log(`JSON body ${ccessToken}, ${config.cert_file}, 
      ${config.key_file}, ${baseUrl}, ${startDate}, ${endDate}`);

      transactionsResponse = await fetch(`${PROXY_URL}/cora/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Proxy-Secret": PROXY_SECRET,
        },
        body: JSON.stringify({
          access_token: accessToken,
          cert_file: config.cert_file,
          key_file: config.key_file,
          base_url: baseUrl,
          start_date: startDate,
          end_date: endDate,
        }),
      });
    }

    if (!transactionsResponse.ok) {
      const errorText = await transactionsResponse.text();
      throw new Error(`Erro ao buscar transações: ${transactionsResponse.status} - ${errorText}`);
    }

    const statementData = await transactionsResponse.json();
    const entries = statementData.entries || [];
    console.log(`Found ${entries.length} entries from Cora statement`);

    // Process each entry (transaction)
    for (const entry of entries) {
      try {
        // Convert amount from cents to reais
        const amountInReais = entry.amount / 100;

        // Determine transaction type (credit or debit)
        const transactionType = entry.type === "CREDIT" ? "credit" : "debit";

        // Get description from transaction object
        const description = entry.transaction?.description || "Transação Cora";
        const counterPartyName = entry.transaction?.counterParty?.name || "";
        const fullDescription = counterPartyName ? `${description} - ${counterPartyName}` : description;

        // Insert or update transaction
        const { error: insertError } = await supabase.from("cora_transactions").upsert(
          {
            user_id: userId,
            cora_transaction_id: entry.id,
            amount: Math.abs(amountInReais),
            currency: "BRL",
            type: transactionType,
            status: "settled", // Cora statement entries are already settled
            description: fullDescription,
            transaction_date: entry.createdAt,
            raw_data: entry,
          },
          {
            onConflict: "user_id,cora_transaction_id",
            ignoreDuplicates: false,
          },
        );

        if (insertError) {
          console.error("Error inserting transaction:", insertError);
          continue;
        }

        importedCount++;

        // Try to auto-conciliate with boletos (only for credit transactions)
        if (transactionType === "credit") {
          const conciliated = await autoReconcileTransaction(
            userId,
            {
              id: entry.id,
              amount: entry.amount,
              created_at: entry.createdAt,
              type: transactionType,
              status: "settled",
              description: fullDescription,
              currency: "BRL",
            },
            Math.abs(amountInReais),
          );
          if (conciliated) {
            conciliatedCount++;
          }
        }
      } catch (entryError) {
        console.error(`Error processing entry ${entry.id}:`, entryError);
      }
    }

    // Log sync result
    await supabase.from("cora_sync_logs").insert({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      status: "success",
      transactions_imported: importedCount,
      transactions_conciliated: conciliatedCount,
      execution_time_ms: Date.now() - startTime,
    });

    return {
      success: true,
      imported: importedCount,
      conciliated: conciliatedCount,
      message: `Sincronizados ${importedCount} lançamentos, ${conciliatedCount} conciliados automaticamente`,
    };
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Cora sync error:", error);

    // Log error
    await supabase.from("cora_sync_logs").insert({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      status: "error",
      transactions_imported: importedCount,
      transactions_conciliated: conciliatedCount,
      error_message: errorMessage,
      execution_time_ms: Date.now() - startTime,
    });

    throw error;
  }
};

// Auto reconcile transaction with boletos
const autoReconcileTransaction = async (userId: string, transaction: CoraTransaction, amount: number) => {
  try {
    // Look for matching boleto by amount and approximate date
    const transactionDate = new Date(transaction.created_at);
    const dateRange = 7; // Search within 7 days
    const dateStart = new Date(transactionDate);
    dateStart.setDate(dateStart.getDate() - dateRange);
    const dateEnd = new Date(transactionDate);
    dateEnd.setDate(dateEnd.getDate() + dateRange);

    const { data: matchingBoletos, error } = await supabase
      .from("boletos")
      .select("*")
      .eq("user_id", userId)
      .eq("valor", amount)
      .eq("status", "pendente")
      .gte("vencimento", dateStart.toISOString().split("T")[0])
      .lte("vencimento", dateEnd.toISOString().split("T")[0])
      .order("vencimento", { ascending: true });

    if (error || !matchingBoletos || matchingBoletos.length === 0) {
      return false;
    }

    // Take the first match (closest date)
    const boleto = matchingBoletos[0];

    // Update both records
    await Promise.all([
      // Mark boleto as paid
      supabase
        .from("boletos")
        .update({
          status: "pago",
          data_pagamento: transaction.created_at,
          valor_pago: amount,
          metodo_pagamento: "cora_automatico",
        })
        .eq("id", boleto.id),

      // Mark transaction as conciliated
      supabase
        .from("cora_transactions")
        .update({
          conciliated: true,
          conciliated_boleto_id: boleto.id,
        })
        .eq("user_id", userId)
        .eq("cora_transaction_id", transaction.id),
    ]);

    console.log(`Auto-conciliated transaction ${transaction.id} with boleto ${boleto.id}`);
    return true;
  } catch (error) {
    console.error("Auto reconciliation error:", error);
    return false;
  }
};*/

// Fetch invoices from Cora API and sync to database
const fetchCoraInvoices = async (
  userId: string,
  config: CoraConfig,
  filters?: {
    start?: string;
    end?: string;
    state?: string;
    page?: number;
    perPage?: number;
  },
) => {
  try {
    const PROXY_URL = "https://cora-mtls-proxy.onrender.com";
    const PROXY_SECRET = "locakicoraproxy";
    let accessToken = await getCoraAccessToken(userId, config);
    const baseUrl = resolveCoraBaseUrl(config);

    const invoicesResponse = await fetch(`${PROXY_URL}/cora/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Secret": PROXY_SECRET,
      },
      body: JSON.stringify({
        access_token: accessToken,
        base_url: baseUrl,
        start: filters?.start || "",
        end: filters?.end || "",
        state: filters?.state || "",
        page: filters?.page || 1,
        perPage: filters?.perPage || 50,
      }),
    });

    // If token expired, refresh and retry
    if (invoicesResponse.status === 401 || invoicesResponse.status === 403) {
      console.log("Token expired while fetching invoices, refreshing...");
      await invalidateToken(userId);
      accessToken = await getCoraAccessToken(userId, config, true);

      const retryResponse = await fetch(`${PROXY_URL}/cora/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Proxy-Secret": PROXY_SECRET,
        },
        body: JSON.stringify({
          access_token: accessToken,
          base_url: baseUrl,
          start: filters?.start || "",
          end: filters?.end || "",
          state: filters?.state || "",
          page: filters?.page || 1,
          perPage: filters?.perPage || 50,
        }),
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`Erro ao buscar boletos: ${retryResponse.status} - ${errorText}`);
      }

      const result = await retryResponse.json();
      await syncInvoicesToDatabase(userId, result);
      return result;
    }

    if (!invoicesResponse.ok) {
      const errorText = await invoicesResponse.text();
      throw new Error(`Erro ao buscar boletos: ${invoicesResponse.status} - ${errorText}`);
    }

    const result = await invoicesResponse.json();
    await syncInvoicesToDatabase(userId, result);
    return result;
  } catch (error) {
    console.error("Error fetching Cora invoices:", error);
    throw error;
  }
};

// Sync invoices from Cora API to database
const syncInvoicesToDatabase = async (userId: string, apiResponse: any) => {
  try {
    // Cora API returns 'items' not 'invoices'
    const invoices = apiResponse.items || apiResponse.invoices || [];
    if (!invoices.length) {
      console.log("No invoices to sync");
      return;
    }

    console.log(`Syncing ${invoices.length} invoices to database...`);
    
    // Log first invoice structure for debugging
    if (invoices.length > 0) {
      console.log("Sample invoice structure:", JSON.stringify(invoices[0], null, 2));
    }

    // Map status from Cora to our system
    const mapStatus = (coraStatus: string): string => {
      const key = (coraStatus || '').toString().trim().toUpperCase();
      const statusMap: Record<string, string> = {
        OPEN: 'pendente',
        PENDING: 'pendente',
        PAID: 'pago',
        OVERDUE: 'vencido',
        LATE: 'vencido',
        EXPIRED: 'vencido',
        CANCELLED: 'cancelado',
        CANCELED: 'cancelado',
      };
      return statusMap[key] || 'pendente';
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Prepare boletos for upsert
    const boletosToUpsert = invoices.map((invoice: any) => {
      const valor = parseFloat(invoice.total_amount) || 0;
      console.log(`Processing invoice ${invoice.id}: total_amount=${invoice.total_amount}, final valor=${valor}`);
      
      // Get mapped status from Cora
      let finalStatus = mapStatus(invoice.status);
      
      // Override status if due date has passed and invoice is not paid or cancelled
      if (invoice.due_date && finalStatus !== "pago" && finalStatus !== "cancelado") {
        const dueDate = new Date(invoice.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          finalStatus = "vencido";
          console.log(`Invoice ${invoice.id} is overdue (due: ${invoice.due_date})`);
        }
      }
      
      return {
        user_id: userId,
        fatura_id: invoice.id,
        cliente_id: invoice.customer_id || "",
        cliente_nome: invoice.customer_name || "Cliente Cora",
        cliente_email: invoice.customer_email || "",
        cliente_cpf: invoice.customer_document || null,
        valor: valor,
        vencimento: invoice.due_date,
        status: finalStatus,
        url_boleto: invoice.invoice_url || null,
        codigo_barras: invoice.barcode || null,
        qr_code_pix: invoice.pix_qr_code || null,
        descricao: invoice.description || null,
        tipo_cobranca: "cora",
        data_pagamento: invoice.paid_at || null,
        valor_pago: invoice.total_paid ? parseFloat(invoice.total_paid) : null,
        metodo_pagamento: invoice.paid_at ? "cora" : null,
      };
    });

    // Upsert boletos (update if exists, insert if not)
    const { error } = await supabase
      .from("boletos")
      .upsert(boletosToUpsert, {
        onConflict: "fatura_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error("Error syncing invoices to database:", error);
      throw error;
    }

    console.log(`Successfully synced ${boletosToUpsert.length} invoices to database`);
  } catch (error) {
    console.error("Error in syncInvoicesToDatabase:", error);
    throw error;
  }
};

// Get Cora config from database
const getCoraConfig = async (userId: string): Promise<CoraConfig | null> => {
  const { data, error } = await supabase
    .from("tenant_config")
    .select("config_value")
    .eq("user_id", userId)
    .eq("config_key", "cora_settings")
    .single();

  if (error || !data) {
    console.error("Error fetching Cora config:", error);
    return null;
  }

  return data.config_value as CoraConfig;
};

// Test Cora API connection through proxy
const testCoraConnection = async (userId: string, config?: any) => {
  try {
    // Fetch config from database if not provided
    const coraConfig = config || (await getCoraConfig(userId));

    if (!coraConfig) {
      throw new Error("Configuração do Cora não encontrada. Por favor, configure a integração primeiro.");
    }

    const { client_id, cert_file, key_file } = coraConfig;

    if (!client_id || !cert_file || !key_file) {
      throw new Error("Configuração incompleta: client_id, certificado e chave privada são obrigatórios");
    }

    const PROXY_URL = "https://cora-mtls-proxy.onrender.com";
    const PROXY_SECRET = "locakicoraproxy";

    // Test by getting a token (will cache it for future use)
    await getCoraAccessToken(userId, coraConfig as CoraConfig, true);

    return { success: true, message: "Conexão com Cora estabelecida com sucesso através do proxy mTLS" };
  } catch (error) {
    console.error("Cora connection test failed:", error);
    throw new Error(`Erro na conexão: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Received Cora request:", JSON.stringify(payload, null, 2));

    // Handle different actions
    if (payload.action === "test_connection") {
      const { user_id, config } = payload;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      try {
        const result = await testCoraConnection(user_id, config);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isAuth = msg.includes("401") || msg.includes("invalid_client");
        const status = isAuth ? 401 : 500;
        return new Response(
          JSON.stringify({
            error: isAuth ? "invalid_client" : "internal_error",
            message: msg,
          }),
          { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
    }

    if (payload.action === "sync_transactions") {
      const { user_id, start_date, end_date } = payload;

      if (!user_id || !start_date || !end_date) {
        return new Response(
          JSON.stringify({
            error: "Missing required parameters: user_id, start_date, end_date",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const config = await getCoraConfig(user_id);
      if (!config) {
        return new Response(
          JSON.stringify({
            error: "Configuração do Cora não encontrada",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      try {
        const result = await syncCoraTransactions(user_id, config, start_date, end_date);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isAuth = msg.includes("401") || msg.includes("invalid_client");
        const status = isAuth ? 401 : 500;
        return new Response(
          JSON.stringify({
            error: isAuth ? "invalid_client" : "internal_error",
            message: msg,
          }),
          { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
    }

    if (payload.action === "fetch_invoices") {
      const { user_id, filters } = payload;

      if (!user_id) {
        return new Response(
          JSON.stringify({
            error: "Missing required parameter: user_id",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const config = await getCoraConfig(user_id);
      if (!config) {
        return new Response(
          JSON.stringify({
            error: "Configuração do Cora não encontrada",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      try {
        const result = await fetchCoraInvoices(user_id, config, filters);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isAuth = msg.includes("401") || msg.includes("invalid_client");
        const status = isAuth ? 401 : 500;
        return new Response(
          JSON.stringify({
            error: isAuth ? "invalid_client" : "internal_error",
            message: msg,
          }),
          { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
    }

    if (payload.action === "scheduled_sync") {
      try {
        console.log("Starting scheduled sync for all users...");
        
        // Fetch all users with Cora configuration
        const { data: configs, error: configError } = await supabase
          .from("tenant_config")
          .select("user_id, config_value")
          .eq("config_key", "cora_settings");

        if (configError) {
          console.error("Error fetching configs:", configError);
          throw configError;
        }

        if (!configs || configs.length === 0) {
          console.log("No users with Cora configuration found");
          return new Response(
            JSON.stringify({ message: "No users to sync", synced: 0 }),
            { headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        console.log(`Found ${configs.length} users to sync`);

        // Sync invoices for each user (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const results = [];
        for (const configRow of configs) {
          try {
            const userId = configRow.user_id;
            const config = configRow.config_value as CoraConfig;
            
            console.log(`Syncing invoices for user ${userId}...`);
            
            const result = await fetchCoraInvoices(userId, config, {
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0],
              page: 1,
              perPage: 100,
            });

            results.push({
              user_id: userId,
              status: "success",
              invoices_count: result?.invoices?.length || 0,
            });
            
            console.log(`Successfully synced ${result?.invoices?.length || 0} invoices for user ${userId}`);
          } catch (error) {
            console.error(`Error syncing user ${configRow.user_id}:`, error);
            results.push({
              user_id: configRow.user_id,
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const successCount = results.filter(r => r.status === "success").length;
        const errorCount = results.filter(r => r.status === "error").length;

        console.log(`Scheduled sync completed: ${successCount} successful, ${errorCount} failed`);

        return new Response(
          JSON.stringify({
            message: "Scheduled sync completed",
            total_users: configs.length,
            successful: successCount,
            failed: errorCount,
            results,
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (err) {
        console.error("Scheduled sync error:", err);
        return new Response(
          JSON.stringify({
            error: "scheduled_sync_error",
            message: err instanceof Error ? err.message : String(err),
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ROTA COMENTADA - Auto sync não está em uso
    // if (payload.action === "auto_sync") {
    //   // Auto sync for all users (used by cron)
    //   const { data: configs, error: configError } = await supabase
    //     .from("tenant_config")
    //     .select("user_id, config_value")
    //     .eq("config_key", "cora_settings");

    //   if (configError || !configs) {
    //     throw new Error("Error fetching Cora configurations");
    //   }

    //   const results = [];
    //   const today = new Date();
    //   const thirtyDaysAgo = new Date(today);
    //   thirtyDaysAgo.setDate(today.getDate() - 30);

    //   for (const configRow of configs) {
    //     try {
    //       const result = await syncCoraTransactions(
    //         configRow.user_id,
    //         configRow.config_value,
    //         thirtyDaysAgo.toISOString().split("T")[0],
    //         today.toISOString().split("T")[0],
    //       );
    //       results.push({ user_id: configRow.user_id, ...result });
    //     } catch (error) {
    //       console.error(`Auto sync failed for user ${configRow.user_id}:`, error);
    //       results.push({
    //         user_id: configRow.user_id,
    //         success: false,
    //         error: error instanceof Error ? error.message : String(error),
    //       });
    //     }
    //   }

    //   return new Response(
    //     JSON.stringify({
    //       success: true,
    //       message: `Auto sync completed for ${configs.length} users`,
    //       results,
    //     }),
    //     {
    //       headers: { "Content-Type": "application/json", ...corsHeaders },
    //     },
    //   );
    // }

    // WEBHOOK HANDLERS COMENTADOS - Webhooks não estão configurados
    // // Handle webhook events
    // const { event_type, data } = payload;
    // const chargeId = data?.id || data?.charge_id;
    // const amount = data?.amount;

    // if (!chargeId) {
    //   console.error("Missing charge ID in webhook payload");
    //   return new Response("Missing charge ID", {
    //     status: 400,
    //     headers: corsHeaders,
    //   });
    // }

    // // Log the webhook
    // await logWebhook(chargeId, event_type, payload, "received", amount);

    // let invoiceStatus: string;
    // let updatedInvoice = null;

    // switch (event_type) {
    //   case "charge.paid":
    //     invoiceStatus = "pago";
    //     updatedInvoice = await updateInvoiceStatus(chargeId, invoiceStatus, amount);
    //     console.log(`Invoice ${chargeId} marked as paid`);
    //     break;

    //   case "charge.failed":
    //   case "charge.refused":
    //     invoiceStatus = "recusado";
    //     updatedInvoice = await updateInvoiceStatus(chargeId, invoiceStatus);
    //     console.log(`Invoice ${chargeId} marked as refused`);
    //     break;

    //   case "charge.expired":
    //     invoiceStatus = "vencido";
    //     updatedInvoice = await updateInvoiceStatus(chargeId, invoiceStatus);
    //     console.log(`Invoice ${chargeId} marked as expired`);
    //     break;

    //   case "charge.cancelled":
    //     invoiceStatus = "cancelado";
    //     updatedInvoice = await updateInvoiceStatus(chargeId, invoiceStatus);
    //     console.log(`Invoice ${chargeId} marked as cancelled`);
    //     break;

    //   case "charge.chargeback":
    //     invoiceStatus = "estornado";
    //     updatedInvoice = await updateInvoiceStatus(chargeId, invoiceStatus);
    //     console.log(`Invoice ${chargeId} marked as chargeback`);
    //     break;

    //   default:
    //     console.log(`Unhandled event type: ${event_type}`);
    //     await logWebhook(chargeId, event_type, payload, "unhandled");
    //     return new Response("Event acknowledged", {
    //       status: 200,
    //       headers: corsHeaders,
    //     });
    // }

    // // Log the processing result
    // if (updatedInvoice) {
    //   await logWebhook(chargeId, event_type, payload, "processed", amount);

    //   // If it's a recurring invoice that was paid, we could trigger additional logic here
    //   if (invoiceStatus === "pago" && updatedInvoice.tipo_cobranca === "recorrente") {
    //     console.log(`Recurring invoice paid for contract: ${updatedInvoice.contrato_origem_id}`);
    //     // Could trigger notifications, update customer status, etc.
    //   }
    // } else {
    //   await logWebhook(chargeId, event_type, payload, "error");
    // }

    // return new Response(
    //   JSON.stringify({
    //     success: true,
    //     message: "Webhook processed successfully",
    //     invoice_updated: !!updatedInvoice,
    //   }),
    //   {
    //     status: 200,
    //     headers: {
    //       "Content-Type": "application/json",
    //       ...corsHeaders,
    //     },
    //   },
    // );

    // Handle create_invoice action
    if (payload.action === "create_invoice") {
      const { user_id, boleto, contrato_id, access_token, base_url, idempotency_Key, idempotency_key, idempotencyKey } = payload;

      if (!user_id || !boleto) {
        return new Response(
          JSON.stringify({
            error: "Missing required parameters: user_id and boleto",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      const config = await getCoraConfig(user_id);
      if (!config) {
        return new Response(
          JSON.stringify({
            error: "Configuração do Cora não encontrada",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      try {
        // Prefer provided token/base url/idempotency key when sent by the client
        const tokenToUse: string = access_token || (await getCoraAccessToken(user_id, config));
        const baseUrlForCora: string = base_url || config.base_url;
        const idemKey: string = idempotency_Key || idempotency_key || idempotencyKey || crypto.randomUUID();

        // Prepare invoice creation payload
        const invoicePayload = {
          code: boleto.code || crypto.randomUUID().substring(0, 8),
          customer: boleto.customer,
          services: boleto.services,
          payment_terms: boleto.payment_terms,
          notifications: boleto.notifications || {
            channels: ["EMAIL"],
            destination: {
              name: boleto.customer?.name,
              email: boleto.customer?.email,
            },
            rules: [
              "NOTIFY_TEN_DAYS_BEFORE_DUE_DATE",
              "NOTIFY_TWO_DAYS_BEFORE_DUE_DATE",
              "NOTIFY_ON_DUE_DATE",
              "NOTIFY_TWO_DAYS_AFTER_DUE_DATE",
              "NOTIFY_WHEN_PAID",
            ],
          },
        };

        console.log("Creating invoice with payload:", JSON.stringify(invoicePayload, null, 2));

        // Use the same mTLS proxy used for listing invoices
        const PROXY_URL = "https://cora-mtls-proxy.onrender.com";
        const PROXY_SECRET = "locakicoraproxy";

        // Create invoice via proxy endpoint (retry once on invalid_client)
        const makeCreateRequest = async (token: string) => {
          return fetch(`${PROXY_URL}/cora/invoices/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Proxy-Secret": PROXY_SECRET,
            },
            body: JSON.stringify({
              access_token: token,
              idempotencyKey: idemKey, // correct key for proxy
              base_url: baseUrlForCora,
              invoice: invoicePayload,
            }),
          });
        };

        let response = await makeCreateRequest(tokenToUse);
        let errorText = "";
        if (!response.ok) {
          errorText = await response.text();
          if (response.status === 401 || errorText.includes("invalid_client")) {
            console.log("Create invoice returned 401/invalid_client, retrying with fresh token...");
            const freshToken = await getCoraAccessToken(user_id, config, true);
            response = await makeCreateRequest(freshToken);
          }
        }

        if (!response.ok) {
          const bodyText = errorText || (await response.text());
          console.error("Error creating invoice:", bodyText);
          throw new Error(`Failed to create invoice: ${response.status} - ${bodyText}`);
        }

        // Safely handle possible empty or non-JSON responses from proxy/Cora
        const contentType = response.headers.get("content-type") || "";
        const rawBody = await response.text();
        let createdInvoice: any = null;
        if (rawBody) {
          if (contentType.includes("application/json")) {
            try {
              createdInvoice = JSON.parse(rawBody);
            } catch {
              createdInvoice = { raw: rawBody };
            }
          } else {
            createdInvoice = { raw: rawBody };
          }
        } else {
          createdInvoice = { message: "Invoice created successfully (empty body)" };
        }
        console.log("Invoice created successfully:", createdInvoice);

        // Ensure created invoice has an id before any sync when JSON is returned
        if (createdInvoice && createdInvoice.id === undefined) {
          // Skip strict ID check when API returns non-JSON/empty body; rely on subsequent sync
          console.warn("Invoice API did not return JSON with id; proceeding to sync recent invoices.");
        }

        console.log("Fetching invoices from Cora to sync with database...");
        try {
          const today = new Date();
          const start = new Date(today);
          start.setDate(today.getDate() - 2);
          const end = new Date(today);
          end.setDate(today.getDate() + 2);

          const syncResult = await fetchCoraInvoices(user_id, config, {
            start: start.toISOString().split("T")[0],
            end: end.toISOString().split("T")[0],
            page: 1,
            perPage: 50,
          });
          console.log(`Synced ${syncResult?.items?.length || 0} invoices from Cora`);
        } catch (syncError) {
          console.error("Error syncing invoices after creation:", syncError);
          // Don't fail the request if sync fails, invoice was created successfully
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Invoice created successfully in Cora and synced to database",
            invoice: createdInvoice,
          }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isAuth = msg.includes("401") || msg.includes("invalid_client");
        const status = isAuth ? 401 : 500;
        
        console.error("Error in create_invoice:", msg);
        
        return new Response(
          JSON.stringify({
            error: isAuth ? "invalid_client" : "internal_error",
            message: msg,
          }),
          { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
    }

    // Se chegou aqui, é uma action desconhecida
    return new Response(
      JSON.stringify({
        error: "Unknown action",
        message:
          "A action fornecida não é suportada. Actions disponíveis: test_connection, sync_transactions, fetch_invoices, create_invoice",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (error) {
    console.error("Error processing Cora webhook:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }
};

serve(handler);
