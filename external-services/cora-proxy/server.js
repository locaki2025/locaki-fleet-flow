const express = require('express');
const https = require('https');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cora-mtls-proxy' });
});

// Endpoint para testar conexão com Cora
app.post('/cora/test', async (req, res) => {
  try {
    const { client_id, certificate, private_key, base_url } = req.body;

    if (!client_id || !certificate || !private_key || !base_url) {
      return res.status(400).json({ 
        error: 'Missing required fields: client_id, certificate, private_key, base_url' 
      });
    }

    const urlObj = new URL(base_url);
    const basePath = urlObj.pathname.replace(/\/$/, '');
    let options = {
      hostname: urlObj.hostname,
      path: `${basePath}/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      cert: certificate,
      key: private_key,
      rejectUnauthorized: true,
    };

    let result;
    try {
      result = await makeRequest(options, `grant_type=client_credentials&client_id=${client_id}`);
    } catch (err) {
      const msg = String((err && err.message) || err);
      if (msg.includes('No context-path') || msg.includes('HTTP 404')) {
        console.warn('Primary /token failed, retrying with /oauth2/token');
        const fallbackOptions = { ...options, path: `${basePath}/oauth2/token` };
        result = await makeRequest(fallbackOptions, `grant_type=client_credentials&client_id=${client_id}`);
      } else {
        throw err;
      }
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Cora test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint para obter token de acesso
app.post('/cora/token', async (req, res) => {
  try {
    const { client_id, certificate, private_key, base_url } = req.body;

    if (!client_id || !certificate || !private_key || !base_url) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    const urlObj = new URL(base_url);
    const basePath = urlObj.pathname.replace(/\/$/, '');
    let options = {
      hostname: urlObj.hostname,
      path: `${basePath}/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      cert: certificate,
      key: private_key,
      rejectUnauthorized: true,
    };

    let result;
    try {
      result = await makeRequest(options, `grant_type=client_credentials&client_id=${client_id}`);
    } catch (err) {
      const msg = String((err && err.message) || err);
      if (msg.includes('No context-path') || msg.includes('HTTP 404')) {
        console.warn('Primary /token failed, retrying with /oauth2/token');
        const fallbackOptions = { ...options, path: `${basePath}/oauth2/token` };
        result = await makeRequest(fallbackOptions, `grant_type=client_credentials&client_id=${client_id}`);
      } else {
        throw err;
      }
    }
    res.json(result);
  } catch (error) {
    console.error('Token error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para buscar transações
app.post('/cora/transactions', async (req, res) => {
  try {
    const { access_token, certificate, private_key, base_url, start_date, end_date } = req.body;

    if (!access_token || !certificate || !private_key || !base_url) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    const urlObj = new URL(base_url);
    const basePath = urlObj.pathname.replace(/\/$/, '');
    const path = `${basePath}/transactions?startDate=${start_date}&endDate=${end_date}`;
    
    const options = {
      hostname: urlObj.hostname,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      cert: certificate,
      key: private_key,
      rejectUnauthorized: true,
    };

    const result = await makeRequest(options);
    res.json(result);
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Função auxiliar para fazer requisições HTTPS com mTLS
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Cora mTLS Proxy running on port ${PORT}`);
});
