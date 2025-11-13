const express = require("express");
const https = require("https");
const cors = require("cors");
const multer = require("multer");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PROXY_SECRET = process.env.PROXY_SECRET || "";

// Diretório dos certificados persistidos
const CERT_DIR = path.join(__dirname, "certs");
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR);

// Middleware para validar PROXY_SECRET
function checkProxySecret(req, res, next) {
  const secret = req.headers["x-proxy-secret"];
  if (!secret || secret !== PROXY_SECRET) return res.status(401).json({ error: "Unauthorized: invalid proxy secret" });
  next();
}

// Upload em memória
const upload = multer({ storage: multer.memoryStorage() });

// Função HTTPS genérica
async function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
        } catch {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    req.on("error", (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

// Retorna um agente HTTPS com o último cert/key salvos
function getHttpsAgent() {
  const certPath = path.join(CERT_DIR, "client.crt");
  const keyPath = path.join(CERT_DIR, "client.key");
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    return new https.Agent({ cert, key, rejectUnauthorized: true });
  }
  return new https.Agent({ rejectUnauthorized: true });
}

// Middleware global
app.use("/cora", checkProxySecret);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "cora-mtls-proxy" });
});

// --------------------
// Rota pega token
// --------------------
app.post(
  "/cora/token",
  upload.fields([
    { name: "cert_file", maxCount: 1 },
    { name: "key_file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { client_id, base_url } = req.body;
      if (!client_id || !base_url) return res.status(400).json({ error: "Missing client_id or base_url" });

      // Salva os arquivos enviados
      if (req.files?.cert_file && req.files?.key_file) {
        fs.writeFileSync(path.join(CERT_DIR, "client.crt"), req.files.cert_file[0].buffer);
        fs.writeFileSync(path.join(CERT_DIR, "client.key"), req.files.key_file[0].buffer);
        console.log("✅ Certificado e chave salvos em ./certs/");
      } else {
        console.warn("⚠ Nenhum certificado/chave enviado.");
      }

      const urlObj = new URL(base_url);
      const basePath = urlObj.pathname.replace(/\/$/, "");

      let options = {
        hostname: urlObj.hostname,
        path: `${basePath}/token`,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        agent: getHttpsAgent(),
      };

      let result;
      try {
        result = await makeRequest(options, `grant_type=client_credentials&client_id=${client_id}`);
      } catch {
        console.warn("Primary /token failed, retrying with /oauth2/token");
        options.path = `${basePath}/oauth2/token`;
        result = await makeRequest(options, `grant_type=client_credentials&client_id=${client_id}`);
      }
      res.json(result);
    } catch (error) {
      console.error("Token error:", error);
      res.status(500).json({ error: error.message });
    }
  },
);

// --------------------
// Rota consultar extrato bancária
// --------------------
app.post("/cora/statement", async (req, res) => {
  try {
    // Verificação do proxySecret
    const proxySecret = req.headers["x-proxy-secret"];
    if (!proxySecret || proxySecret !== process.env.PROXY_SECRET) {
      return res.status(403).json({ error: "Acesso não autorizado: proxySecret inválido" });
    }

    const { access_token, base_url, start, end, type, transaction_type, page, perPage, aggr } = req.body;
    if (!access_token || !base_url) return res.status(400).json({ error: "access_token e base_url são obrigatórios" });

    const queryParams = new URLSearchParams({
      start: start || "",
      end: end || "",
      type: type || "DEBIT",
      transaction_type: transaction_type || "TRANSFER",
      page: parseInt(page, 10) || 1,
      perPage: parseInt(perPage, 10) || 10,
      aggr: (typeof aggr === "boolean" ? aggr : aggr === "true") ? "true" : "false",
    });

    const url = `${base_url}/bank-statement/statement?${queryParams}`;
    const agent = getHttpsAgent();

    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" },
      agent,
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Erro interno:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Rota consultar conta bancária
// --------------------
app.post("/cora/account", async (req, res) => {
  try {
    // Verificação do proxySecret
    const proxySecret = req.headers["x-proxy-secret"];
    if (!proxySecret || proxySecret !== process.env.PROXY_SECRET) {
      return res.status(403).json({ error: "Acesso não autorizado: proxySecret inválido" });
    }

    const { access_token, base_url } = req.body;

    if (!access_token || !base_url) {
      return res.status(400).json({
        error: "access_token e base_url são obrigatórios",
      });
    }

    const url = `${base_url}/third-party/account`;
    const agent = getHttpsAgent();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
      agent,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Erro interno em /cora/account:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Rota consultar saldo da conta
// --------------------
app.post("/cora/balance", async (req, res) => {
  try {
    const proxySecretHeader = req.headers["x-proxy-secret"];
    if (proxySecretHeader !== process.env.PROXY_SECRET) {
      return res.status(403).json({ error: "Proxy secret inválido" });
    }

    const { access_token, base_url } = req.body;

    if (!access_token || !base_url) {
      return res.status(400).json({
        error: "access_token e base_url são obrigatórios",
      });
    }

    // Caminho da API para consultar saldo (ajuste se necessário)
    const url = `${base_url}/third-party/account/balance`;

    // Usa o certificado salvo em memória
    const agent = getHttpsAgent();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
      agent,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Erro interno em /cora/balance:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Rota consultar boletos (invoices)
// --------------------
app.post("/cora/invoices", async (req, res) => {
  try {
    // Verificação do proxySecret
    const proxySecret = req.headers["x-proxy-secret"];
    if (!proxySecret || proxySecret !== process.env.PROXY_SECRET) {
      return res.status(403).json({ error: "Acesso não autorizado: proxySecret inválido" });
    }

    const { access_token, base_url, start, end, state, page, perPage } = req.body;

    // Validação obrigatória
    if (!access_token || !base_url) {
      return res.status(400).json({
        error: "access_token e base_url são obrigatórios",
      });
    }

    // Conversão segura de tipos
    const queryParams = new URLSearchParams({
      start: start || "",
      end: end || "",
      state: state || "",
      page: parseInt(page, 10) || 1,
      perPage: parseInt(perPage, 10) || 10,
    });

    // URL final da Cora
    const url = `${base_url}/v2/invoices?${queryParams}`;
    const agent = getHttpsAgent();

    // Requisição GET com mTLS + Bearer token
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
      agent,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Erro interno em /cora/invoices:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Rota consultar uma fatura específicos (invoice_id)
// --------------------
app.post("/cora/invoices/invoice_id", async (req, res) => {
  try {
    // Verificação do proxySecret
    const proxySecret = req.headers["x-proxy-secret"];
    if (!proxySecret || proxySecret !== process.env.PROXY_SECRET) {
      return res.status(403).json({ error: "Acesso não autorizado: proxySecret inválido" });
    }

    const { access_token, base_url, invoice_id } = req.body;

    // Validação obrigatória
    if (!access_token || !base_url || !invoice_id) {
      return res.status(400).json({
        error: "access_token, base_url e invoice_id são obrigatórios",
      });
    }

    // URL final da Cora
    const url = `${base_url}/v2/invoices?invoice_id=${invoice_id}`;
    const agent = getHttpsAgent();

    // Requisição GET com mTLS + Bearer token
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
      agent,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Erro interno em /cora/invoices/invoice_id:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Rota consultar um boleto específico (invoice)
// --------------------
app.post("/cora/invoices/invoice", async (req, res) => {
  try {
    // Verificação do proxySecret
    const proxySecret = req.headers["x-proxy-secret"];
    if (!proxySecret || proxySecret !== process.env.PROXY_SECRET) {
      return res.status(403).json({ error: "Acesso não autorizado: proxySecret inválido" });
    }

    const { access_token, base_url, invoice } = req.body;

    // Validação obrigatória
    if (!access_token || !base_url || !invoice) {
      return res.status(400).json({
        error: "access_token, base_url e invoice são obrigatórios",
      });
    }

    // URL final da Cora
    const url = `${base_url}/v2/invoices/${invoice}`;
    const agent = getHttpsAgent();

    // Requisição GET com mTLS + Bearer token
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
      agent,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Erro interno em /cora/invoices/invoice:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Rota criar boleto (invoice)
// --------------------
app.post("/cora/invoices/create", async (req, res) => {
  try {
    // Validação do proxy secret
    const proxySecret = req.headers["x-proxy-secret"];
    if (!proxySecret || proxySecret !== process.env.PROXY_SECRET) {
      return res.status(403).json({ error: "Acesso não autorizado: proxySecret inválido" });
    }

    const { access_token, base_url, idempotencyKey, boleto } = req.body;

    // Verificação obrigatória
    if (!access_token || !base_url || !boleto) {
      return res.status(400).json({ error: "access_token, base_url e boleto são obrigatórios" });
    }

    // Garante uma chave idempotente válida
    const idempKey =
      idempotencyKey || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));

    // Monta URL
    const url = `${base_url}/v2/invoices`;

    // Cria o agente HTTPS com mTLS
    const agent = getHttpsAgent();

    // Faz o POST com o Bearer e Idempotency-Key
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Idempotency-Key": idempKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(boleto),
      agent,
    });

    const data = await response.json();

    res.status(response.status).json({
      idempotency_key_usada: idempKey,
      ...data,
    });
  } catch (err) {
    console.error("Erro interno em /cora/invoices/create:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Rota deletar um boleto específico (invoice)
// --------------------
app.post("/cora/invoices/delete", async (req, res) => {
  try {
    // Verificação do proxySecret
    const proxySecret = req.headers["x-proxy-secret"];
    if (!proxySecret || proxySecret !== process.env.PROXY_SECRET) {
      return res.status(403).json({ error: "Acesso não autorizado: proxySecret inválido" });
    }

    const { access_token, base_url, invoice } = req.body;

    // Validação obrigatória
    if (!access_token || !base_url || !invoice) {
      return res.status(400).json({
        error: "access_token, base_url e invoice são obrigatórios",
      });
    }

    // URL final da Cora
    const url = `${base_url}/v2/invoices/${invoice}`;
    const agent = getHttpsAgent();

    // Requisição DELETE com mTLS + Bearer token
    const response = await fetch(url, {
      method: "DELETE", // corrigido
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
      agent,
    });

    // Captura o corpo como texto primeiro
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text); // tenta parsear JSON
    } catch {
      data = { message: text }; // se não for JSON, retorna texto bruto
    }

    res.status(response.status).json(data);
  } catch (err) {
    console.error("Erro interno em /cora/invoices/delete:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Cora mTLS Proxy running on port ${PORT}`));
