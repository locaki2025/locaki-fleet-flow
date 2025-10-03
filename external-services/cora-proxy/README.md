# Cora mTLS Proxy Server

Servidor Node.js intermediário para fazer requisições mTLS à API do Banco Cora.

## 🚀 Deploy no Render

### Passo 1: Preparar o Repositório

1. Crie um novo repositório no GitHub
2. Faça upload destes arquivos para o repositório
3. Commit e push

### Passo 2: Criar Web Service no Render

1. Acesse [render.com](https://render.com) e faça login
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configure o serviço:
   - **Name**: `cora-mtls-proxy` (ou o nome que preferir)
   - **Region**: Escolha a região mais próxima
   - **Branch**: `main`
   - **Root Directory**: `external-services/cora-proxy`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (ou outro plano)

5. Clique em "Create Web Service"

### Passo 3: Anotar a URL

Após o deploy, você receberá uma URL como:
```
https://cora-mtls-proxy.onrender.com
```

Anote essa URL para configurar no seu Edge Function.

## 📝 Atualizar Edge Function

No arquivo `supabase/functions/cora-webhook/index.ts`, substitua as chamadas diretas à API Cora por chamadas ao proxy:

```typescript
// Em vez de fazer mTLS diretamente, chame o proxy:
const response = await fetch('https://SEU-PROXY.onrender.com/cora/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: config.client_id,
    certificate: config.certificate,
    private_key: config.private_key,
    base_url: config.base_url
  })
});

const data = await response.json();
```

## 🔒 Segurança

Para produção, considere adicionar:
- Autenticação via API Key
- Rate limiting
- Validação de origem das requisições
- HTTPS obrigatório

## 🧪 Testar Localmente

```bash
cd external-services/cora-proxy
npm install
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

## 📚 Endpoints Disponíveis

- `GET /health` - Health check
- `POST /cora/test` - Testar conexão com Cora
- `POST /cora/token` - Obter token de acesso
- `POST /cora/transactions` - Buscar transações

## 🛠️ Manutenção

O Render fará automaticamente:
- Deploy quando você fizer push no repositório
- Restart em caso de falha
- Health checks periódicos

**Nota**: No plano Free do Render, o serviço pode entrar em "sleep" após 15 minutos de inatividade e levar ~30 segundos para "acordar" na próxima requisição.
