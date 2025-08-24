# LOCAKI - Sistema de Locação de Motos

Sistema SaaS completo para gestão de locadoras de motocicletas, desenvolvido com React, TypeScript e TailwindCSS.

## 🚀 Funcionalidades Implementadas

### 📊 Dashboard
- KPIs em tempo real (ocupação da frota, receita, inadimplência)
- Status dos veículos com localização
- Alertas e notificações importantes
- Visão geral das manutenções

### 👥 Gestão de Clientes
- Cadastro de pessoas físicas e jurídicas
- Status do cliente (ativo, inadimplente, bloqueado)
- Histórico completo de locações
- Busca e filtros avançados

### 🏍️ Gestão de Veículos
- Controle completo da frota de motocicletas
- Status em tempo real (disponível, alugada, manutenção)
- Informações técnicas (odômetro, categoria, documentos)
- Integração com sistema de rastreamento

### 📄 Contratos de Locação
- Criação de contratos (mensal, semanal, diária)
- Acompanhamento de prazos e renovações
- Diferentes tipos de planos de locação
- Status detalhado dos contratos

### 💰 Gestão Financeira
- Controle de faturas e pagamentos
- Integração com métodos de pagamento (PIX, boleto, cartão)
- Análise de inadimplência
- Relatórios financeiros detalhados

### 🗺️ Mapa e Rastreamento
- Visualização da frota em tempo real
- Alertas de velocidade e geofencing
- Histórico de localizações
- Status dos rastreadores

### 📈 Relatórios e Analytics
- Relatórios financeiros completos
- Análise operacional da frota
- Performance por período
- Custos de manutenção
- Exportação de dados

## 🛠️ Tecnologias Utilizadas

- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **TailwindCSS** para estilização
- **shadcn/ui** para componentes
- **Lucide React** para ícones
- **React Router DOM** para navegação
- **TanStack Query** para gerenciamento de estado
- **React Hook Form** + **Zod** para formulários

## 🎨 Design System

Sistema de design completo com:
- Paleta de cores automotiva (laranja vibrante + azul tecnológico)
- Componentes reutilizáveis
- Tokens semânticos para cores, gradientes e sombras
- Suporte a modo escuro
- Interface responsiva

## 🏗️ Arquitetura

### Estrutura de Pastas
```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn/ui)
│   ├── AppSidebar.tsx  # Navegação principal
│   ├── Dashboard.tsx   # Dashboard principal
│   ├── Header.tsx      # Cabeçalho
│   └── Layout.tsx      # Layout base
├── data/               # Dados simulados
│   └── mockData.ts     # Mock data para demonstração
├── pages/              # Páginas da aplicação
│   ├── Customers.tsx   # Gestão de clientes
│   ├── Finance.tsx     # Gestão financeira
│   ├── Map.tsx         # Mapa e rastreamento
│   ├── Rentals.tsx     # Contratos
│   ├── Reports.tsx     # Relatórios
│   └── Vehicles.tsx    # Gestão de veículos
└── hooks/              # Hooks customizados
```

### Multi-Tenancy
O sistema foi projetado para suporte multi-tenant:
- Isolamento de dados por `tenant_id`
- Gestão de filiais (`branch_id`)
- RBAC (controle de acesso baseado em função)

### Dados Simulados
Implementação com dados mock que simulam:
- 3 clientes (PF/PJ) com diferentes status
- 4 veículos com localização e rastreamento
- 2 contratos ativos
- 3 faturas em diferentes status
- 2 ordens de manutenção

## 🚀 Como Executar

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Execute o projeto: `npm run dev`
4. Acesse `http://localhost:8080`

## 🔮 Próximos Passos

### Para Implementação Completa:

1. **Backend** (Next.js + tRPC + Prisma)
   - APIs REST para todas as entidades
   - Banco PostgreSQL com schema completo
   - Autenticação NextAuth.js
   - Middleware de multi-tenancy

2. **Integrações**
   - Sistema de pagamento Asaas
   - API Traccar para rastreamento
   - Upload de arquivos S3
   - Geração de PDFs

3. **Funcionalidades Avançadas**
   - Wizard de contratos
   - Assinatura digital
   - Notificações em tempo real
   - Relatórios customizáveis

4. **Infraestrutura**
   - Docker Compose para desenvolvimento
   - CI/CD com GitHub Actions
   - Testes automatizados (Jest + Playwright)

## 📝 Características do MVP

✅ **Interface Completa** - Todas as telas principais implementadas  
✅ **Design Profissional** - Sistema de design consistente  
✅ **Navegação Intuitiva** - Sidebar responsiva com estados ativos  
✅ **Dados Realistas** - Mock data que simula cenários reais  
✅ **Componentes Reutilizáveis** - Arquitetura modular e escalável  
✅ **TypeScript** - Tipagem completa para maior segurança  
✅ **Responsivo** - Interface adaptável para desktop e mobile  

---

**LOCAKI** - *Transformando a gestão de locadoras de motos*