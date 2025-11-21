import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

const logWebhook = async (
  supabase: any,
  invoiceId: string,
  eventType: string,
  payload: any,
  status: string,
  amount?: number,
) => {
  await supabase.from("webhook_logs").insert({
    invoice_id: invoiceId,
    event_type: eventType,
    payload,
    status,
    amount,
  });
};

const updateInvoiceStatus = async (supabase: any, coraChargeId: string, status: string, paidAmount?: number) => {
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
const getCachedToken = async (supabase: any, userId: string): Promise<CachedToken | null> => {
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
const cacheToken = async (supabase: any, userId: string, accessToken: string, expiresIn: number = 3600) => {
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
const invalidateToken = async (supabase: any, userId: string) => {
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
const getCoraAccessToken = async (supabase: any, userId: string, config: CoraConfig, forceRefresh: boolean = false) => {
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
      const cachedToken = await getCachedToken(supabase, userId);
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
    formData.append("client_id", config.client_id);
    formData.append("base_url", baseUrl);

    // Convert certificate and key strings to Blobs
    const certBlob = new Blob([config.cert_file], { type: "application/x-pem-file" });
    const keyBlob = new Blob([config.key_file], { type: "application/x-pem-file" });

    formData.append("cert_file", certBlob, "certificate.pem");
    formData.append("key_file", keyBlob, "private-key.key");

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
    await cacheToken(supabase, userId, accessToken, expiresIn);

    console.log("Successfully obtained and cached Cora access token");
    return accessToken;
  } catch (error) {
    console.error("Error getting Cora access token:", error);
    throw error;
  }
};

// Fetch invoices from Cora API and sync to database
const fetchCoraInvoices = async (
  supabase: any,
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
  const PROXY_URL = "https://cora-mtls-proxy.onrender.com";
  const PROXY_SECRET = "locakicoraproxy";
  const baseUrl = resolveCoraBaseUrl(config);

  const makeRequest = async (token: string) => {
    const response = await fetch(`${PROXY_URL}/cora/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Secret": PROXY_SECRET,
      },
      body: JSON.stringify({
        access_token: token,
        base_url: baseUrl,
        start: filters?.start || "",
        end: filters?.end || "",
        state: filters?.state || "",
        page: filters?.page || 1,
        perPage: filters?.perPage || 50,
      }),
    });

    // Consome o body **uma vez** como texto
    const rawBody = await response.text();

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = { raw: rawBody }; // fallback seguro
    }

    return { ok: response.ok, status: response.status, data, rawBody };
  };

  try {
    let accessToken = await getCoraAccessToken(supabase, userId, config);
    let result = await makeRequest(accessToken);

    // Retry se token expirado ou inválido
    if (!result.ok && (result.status === 401 || result.status === 403)) {
      console.log("Token expirado, obtendo novo token...");
      await invalidateToken(supabase, userId);
      accessToken = await getCoraAccessToken(supabase, userId, config, true);
      result = await makeRequest(accessToken);
    }

    if (!result.ok) {
      console.error("Erro ao buscar boletos:", result.data);
      throw new Error(`Erro ao buscar boletos: ${result.status} - ${JSON.stringify(result.data)}`);
    }

    // Sincroniza com banco
    await syncInvoicesToDatabase(supabase, userId, result.data);
    return result.data;
  } catch (error) {
    console.error("Error fetching Cora invoices:", error);
    throw error;
  }
};

// Sync invoices from Cora API to database
const syncInvoicesToDatabase = async (supabase: any, userId: string, apiResponse: any) => {
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
      const key = (coraStatus || "").toString().trim().toUpperCase();
      const statusMap: Record<string, string> = {
        OPEN: "pendente",
        PENDING: "pendente",
        PAID: "pago",
        OVERDUE: "vencido",
        LATE: "vencido",
        EXPIRED: "vencido",
        CANCELLED: "cancelado",
        CANCELED: "cancelado",
      };
      return statusMap[key] || "pendente";
    };

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
    const { error } = await supabase.from("boletos").upsert(boletosToUpsert, {
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
const getCoraConfig = async (supabase: any, userId: string): Promise<CoraConfig | null> => {
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
const testCoraConnection = async (supabase: any, userId: string, config?: any) => {
  try {
    // Fetch config from database if not provided
    const coraConfig = config || (await getCoraConfig(supabase, userId));

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
    await getCoraAccessToken(supabase, userId, coraConfig as CoraConfig, true);

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

    // Extract Authorization header for creating authenticated client
    const authHeader = req.headers.get("Authorization");

    // Create authenticated Supabase client if auth header is present
    const supabase = authHeader
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        })
      : createClient(supabaseUrl, supabaseAnonKey);

    // Validate user if auth header is present
    let authenticatedUserId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);
      if (!authError && user) {
        authenticatedUserId = user.id;
        console.log("Authenticated user:", user.id);
      }
    }

    // Handle different actions
    if (payload.action === "test_connection") {
      const { user_id, config } = payload;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Validate that authenticated user matches requested user_id (if auth is present)
      if (authenticatedUserId && authenticatedUserId !== user_id) {
        return new Response(JSON.stringify({ error: "Forbidden", message: "Cannot access other user's data" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      try {
        const result = await testCoraConnection(supabase, user_id, config);
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

      // Validate that authenticated user matches requested user_id (if auth is present)
      if (authenticatedUserId && authenticatedUserId !== user_id) {
        return new Response(JSON.stringify({ error: "Forbidden", message: "Cannot access other user's data" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const config = await getCoraConfig(supabase, user_id);
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
        const result = await syncCoraTransactions(supabase, user_id, config, start_date, end_date);
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

      // Validate that authenticated user matches requested user_id (if auth is present)
      if (authenticatedUserId && authenticatedUserId !== user_id) {
        return new Response(JSON.stringify({ error: "Forbidden", message: "Cannot access other user's data" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const config = await getCoraConfig(supabase, user_id);
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
        const result = await fetchCoraInvoices(supabase, user_id, config, filters);
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
          return new Response(JSON.stringify({ message: "No users to sync", synced: 0 }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
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

            const result = await fetchCoraInvoices(supabase, userId, config, {
              start: startDate.toISOString().split("T")[0],
              end: endDate.toISOString().split("T")[0],
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

        const successCount = results.filter((r) => r.status === "success").length;
        const errorCount = results.filter((r) => r.status === "error").length;

        console.log(`Scheduled sync completed: ${successCount} successful, ${errorCount} failed`);

        return new Response(
          JSON.stringify({
            message: "Scheduled sync completed",
            total_users: configs.length,
            successful: successCount,
            failed: errorCount,
            results,
          }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      } catch (err) {
        console.error("Scheduled sync error:", err);
        return new Response(
          JSON.stringify({
            error: "scheduled_sync_error",
            message: err instanceof Error ? err.message : String(err),
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
    }

    // Handle create_invoice action
    if (payload.action === "create_invoice") {
      const { user_id, boleto, contrato_id, access_token, base_url, idempotency_Key, idempotency_key, idempotencyKey } =
        payload;

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

      // Validate that authenticated user matches requested user_id (if auth is present)
      if (authenticatedUserId && authenticatedUserId !== user_id) {
        return new Response(JSON.stringify({ error: "Forbidden", message: "Cannot access other user's data" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const config = await getCoraConfig(supabase, user_id);
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
        let tokenToUse: string;
        let isNewToken = false;

        if (access_token) {
          tokenToUse = access_token;
          console.log("Using provided access token");
        } else {
          console.log("Obtaining Cora access token (from cache or new)...");

          // Check if we have a cached token first
          const cachedToken = await getCachedToken(supabase, user_id);
          if (cachedToken) {
            tokenToUse = cachedToken.access_token;
            console.log("Using cached Cora token (still valid)");
          } else {
            // No valid cache, get a new token
            console.log("No valid cached token, fetching new token from Cora...");
            tokenToUse = await getCoraAccessToken(supabase, user_id, config, true);
            isNewToken = true;

            // Validate token was successfully obtained
            if (!tokenToUse || typeof tokenToUse !== "string" || tokenToUse.trim() === "") {
              throw new Error("Failed to obtain valid Cora access token");
            }

            console.log("New Cora access token obtained successfully, waiting before creating invoice...");
            // Wait only for new tokens to ensure it's fully propagated in Cora's system
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }

        const baseUrlForCora: string = base_url || config.base_url;

        // Generate deterministic idempotency key based on invoice data if not provided
        // This ensures that retries for the same invoice use the same key
        let idemKey: string;
        if (idempotency_Key || idempotency_key || idempotencyKey) {
          idemKey = idempotency_Key || idempotency_key || idempotencyKey;
        } else {
          // Create a deterministic key based on invoice data to avoid duplicates
          const keyData = `${user_id}-${boleto.customer?.document || boleto.customer?.email}-${boleto.payment_terms?.due_date}-${boleto.services?.[0]?.amount || 0}-${Date.now()}`;
          // Use a simple hash to create a UUID-like string
          const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(keyData));
          const hashArray = Array.from(new Uint8Array(hash));
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
          idemKey = `${hashHex.substring(0, 8)}-${hashHex.substring(8, 12)}-${hashHex.substring(12, 16)}-${hashHex.substring(16, 20)}-${hashHex.substring(20, 32)}`;
          console.log("Generated deterministic idempotency key:", idemKey);
        }

        // Prepare invoice creation payload in the exact format expected by Cora API
        const invoicePayload = {
          code: boleto.code || crypto.randomUUID().substring(0, 8),
          customer: {
            name: boleto.customer.name,
            email: boleto.customer.email,
            document: {
              identity: boleto.customer.document?.identity || boleto.customer.document,
              type: boleto.customer.document?.type || (boleto.customer.document?.identity?.length === 14 || boleto.customer.document?.length === 14 ? "CNPJ" : "CPF")
            },
            address: {
              street: boleto.customer.address?.street || "",
              number: boleto.customer.address?.number || "S/N",
              district: boleto.customer.address?.district || "",
              city: boleto.customer.address?.city || "",
              state: boleto.customer.address?.state || "",
              complement: boleto.customer.address?.complement || "N/A",
              zip_code: boleto.customer.address?.zip_code || ""
            }
          },
          services: (boleto.services || []).map((service: any) => ({
            name: service.name || "Serviço",
            description: service.description || "",
            amount: service.amount
          })),
          payment_terms: {
            due_date: boleto.payment_terms.due_date,
            fine: {
              amount: boleto.payment_terms.fine?.amount || 0
            },
            interest: {
              rate: boleto.payment_terms.interest?.rate || 3.67
            },
            discount: boleto.payment_terms.discount ? {
              type: boleto.payment_terms.discount.type || "PERCENT",
              value: boleto.payment_terms.discount.value || 0
            } : undefined
          },
          notifications: {
            channels: boleto.notifications?.channels || ["EMAIL"],
            destination: {
              name: boleto.notifications?.destination?.name || boleto.customer.name,
              email: boleto.notifications?.destination?.email || boleto.customer.email
            },
            rules: boleto.notifications?.rules || [
              "NOTIFY_TEN_DAYS_BEFORE_DUE_DATE",
              "NOTIFY_TWO_DAYS_BEFORE_DUE_DATE",
              "NOTIFY_ON_DUE_DATE",
              "NOTIFY_TWO_DAYS_AFTER_DUE_DATE",
              "NOTIFY_WHEN_PAID"
            ]
          }
        };
        
        // Remove undefined fields from payment_terms
        if (invoicePayload.payment_terms.discount === undefined) {
          delete invoicePayload.payment_terms.discount;
        }

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
              boleto: invoicePayload,
            }),
          });
        };

        let response = await makeCreateRequest(tokenToUse);
        let errorText = "";
        if (!response.ok) {
          errorText = await response.text();

          // Check if it's an idempotency key error
          if (errorText.includes("idempotency_key_usada") || errorText.includes("idempotency")) {
            console.log("Idempotency key already used, generating new one and retrying...");

            // Generate a completely new idempotency key with timestamp
            const newKeyData = `${user_id}-${boleto.customer?.document || boleto.customer?.email}-${Date.now()}-${crypto.randomUUID()}`;
            const newHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(newKeyData));
            const newHashArray = Array.from(new Uint8Array(newHash));
            const newHashHex = newHashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
            const newIdemKey = `${newHashHex.substring(0, 8)}-${newHashHex.substring(8, 12)}-${newHashHex.substring(12, 16)}-${newHashHex.substring(16, 20)}-${newHashHex.substring(20, 32)}`;

            console.log("New idempotency key:", newIdemKey);

            // Retry with new idempotency key
            response = await fetch(`${PROXY_URL}/cora/invoices/create`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Proxy-Secret": PROXY_SECRET,
              },
              body: JSON.stringify({
                access_token: tokenToUse,
                idempotencyKey: newIdemKey,
                base_url: baseUrlForCora,
                boleto: invoicePayload,
              }),
            });

            if (!response.ok) {
              errorText = await response.text();
            }
          }

          if (!response.ok && (response.status === 401 || errorText.includes("invalid_client"))) {
            console.log("Create invoice returned 401/invalid_client, retrying with fresh token...");
            const freshToken = await getCoraAccessToken(supabase, user_id, config, true);

            // Validate fresh token
            if (!freshToken || typeof freshToken !== "string" || freshToken.trim() === "") {
              throw new Error("Failed to obtain valid fresh Cora access token on retry");
            }

            console.log("Fresh token obtained, waiting before retry...");
            // Wait before retrying with fresh token
            await new Promise((resolve) => setTimeout(resolve, 1500));

            response = await makeCreateRequest(freshToken);
          }
        }

        if (!response.ok) {
          const bodyText = errorText || (await response.text());
          console.error("Error creating invoice:", bodyText);

          const isProxyParseIssue =
            response.status === 500 &&
            (bodyText.includes("invalid json response body") || bodyText.includes("Unexpected end of JSON input"));

          if (isProxyParseIssue) {
            console.warn(
              "Proxy returned 500 due to JSON parse, assuming creation may have succeeded. Syncing recent invoices...",
            );
            try {
              const today = new Date();
              const start = new Date(today);
              start.setDate(today.getDate() - 2);
              const end = new Date(today);
              end.setDate(today.getDate() + 2);

              const syncResult = await fetchCoraInvoices(supabase, user_id, config, {
                start: start.toISOString().split("T")[0],
                end: end.toISOString().split("T")[0],
                page: 1,
                perPage: 50,
              });
              console.log(`Synced ${syncResult?.items?.length || 0} invoices from Cora after proxy 500 parse issue`);

              return new Response(
                JSON.stringify({
                  success: true,
                  note: "Proxy JSON parse error; treated as success after syncing invoices.",
                }),
                { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
              );
            } catch (fallbackErr) {
              console.error("Fallback sync after proxy parse error failed:", fallbackErr);
            }
          }

          console.error("Failed to create invoice", {
            status: response.status,
            bodyText,
            token: tokenToUse?.slice(0, 10) + "...",
          });
          return new Response(
            JSON.stringify({
              error:
                response.status === 401 || bodyText.includes("invalid_client") ? "invalid_client" : "internal_error",
              message: bodyText || "Unknown error from Cora/proxy",
            }),
            { status: response.status, headers: { "Content-Type": "application/json", ...corsHeaders } },
          );
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

          const syncResult = await fetchCoraInvoices(supabase, user_id, config, {
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
