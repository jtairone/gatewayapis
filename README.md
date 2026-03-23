# 🚀 GatewayAPIs – Gateway Dinâmico para Microsserviços

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Express Version](https://img.shields.io/badge/express-5.x-blue)](https://expressjs.com/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

**GatewayAPIs** é um gateway HTTP/HTTPS em Node.js + Express que **automaticamente detecta e roteia** todas as suas APIs internas, centralizando o acesso em um único domínio e porta.

## ✨ Características Principais

- 🎯 **Detecção Automática de APIs** – Adicione novas APIs na pasta `services/` e o gateway configura tudo automaticamente
- 🔄 **Proxy Reverso Inteligente** – Roteamento dinâmico baseado no nome da pasta da API
- 📊 **Dashboard em Tempo Real** – Monitoramento visual com status, métricas e latência de cada serviço
- 🔒 **HTTPS Nativo** – Suporte a certificados SSL com auto-detecção dos arquivos
- 🛡️ **Rate Limiting** – Proteção contra abusos por IP
- 💚 **Health Check Consolidado** – Monitoramento centralizado de todas as APIs
- 📈 **Métricas Detalhadas** – Contagem de requisições por API, método HTTP e endpoints
- ⚙️ **PM2 Ready** – Configuração automática para produção
- ☁️ **Cloudflare Ready** – Suporte nativo a trust proxy

## 📋 Sumário

- [Arquitetura Dinâmica](#arquitetura-dinâmica)
- [Como Funciona](#como-funciona)
- [Pré-requisitos](#pré-requisitos)
- [Instalação Rápida](#instalação-rápida)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Configuração das APIs](#-configuração-das-apis)
- [Comandos Disponíveis](#-comandos-disponíveis)
- [Desenvolvimento](#desenvolvimento)
- [Produção com PM2](#produção-com-pm2)
- [Endpoints do Gateway](#endpoints-do-gateway)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## Arquitetura Dinâmica

O gateway foi projetado para ser **facilmente extensível**. Quando você adiciona uma nova API na pasta `services/`, o gateway detecta automaticamente durante o setup, mas é necessário executar um comando para gerar as configurações:

### Processo Automático

1. 🔍 **Adicione** a nova pasta com sua API em `services/minha-nova-api/`
2. 📖 **Crie** o `package.json` da API com as configurações necessárias
3. ⚡ **Execute** `npm run generate` para atualizar as configurações
4. 🚀 **Reinicie** o gateway (ou execute `npm run pm2:restart` em produção)

### O que acontece automaticamente após `npm run generate`:

- 📦 **package.json** – Scripts NPM são gerados para a nova API
- ⚙️ **ecosystem.config.js** – Configuração do PM2 é atualizada
- 🎯 **Rotas** – O gateway já está programado para detectar qualquer pasta em `services/` em tempo de execução
- 📊 **Dashboard** – A nova API aparece automaticamente no painel
- 💚 **Health Check** – O monitoramento já inclui a nova API

**Sem modificar uma única linha do código principal!** 🎉

### Exemplo prático:

```bash
# 1. Adicione uma nova API
mkdir services/api-pagamentos
echo '{"name": "API Pagamentos", "url": "http://localhost:3005", "endpoint": "pagamentos"}' > services/api-pagamentos/package.json

# 2. Gere as configurações
npm run generate

# 3. Reinicie o gateway
npm run pm2:restart

# 4. Acesse: https://localhost:2096/api/pagamentos
```
### Fluxo de Requisição

**Cliente** → **Gateway (HTTPS:2096)** ↓  
**Rate Limiting & Métricas** ↓  
**Detecta rota:** `/api/nova-api/*`  
↓  
**Proxy Reverso para** http://localhost:3004  
↓  
**API Processa e Retorna** ↓  
**Resposta ao Cliente**

## Como Funciona

### Detecção Automática de APIs

O gateway escaneia a pasta `services/` em busca de subpastas. Cada pasta encontrada deve conter um `package.json` com a configuração da API:

```json
{
  "name": "minha-api",
  "url": "http://localhost:3004",
  "endpoint": "minhaapi"

}
```
A rota será automaticamente criada como: /api/minhaapi

# Roteamento Inteligente

| Caminho no Gateway |	API Destino	| URL Interna |
| :--- | :--- |  :--- |
| /api/apia/*	| API A	| http://localhost:3001 
| /api/apib/*	| API B |	http://localhost:3002 
| /api/apic/*	| API C	| http://localhost:3003 
| /api/novaapi/*|	Nova API|	http://localhost:3004 

## Pré-requisitos

* **Node.js 18.0 ou superior**
* **npm ou yarn**
* **PM2 (para produção)**
* **Certificados SSL (para HTTPS)**

## Instalação Rápida
```bash
# 1. Clone o repositório
git clone https://github.com/jtairone/gatewayapis.git
cd gatewayapis

# 2. Instale as dependências
npm install

# 3. Configure seus certificados SSL
mkdir -p src/cert
# Coloque seus arquivos .key e .crt/.pem na pasta src/cert

# 4. Execute o setup automático
npm run setup

# 5. Inicie o gateway (inicia somemente o gateway)
npm run start:gateway
Acesse: https://localhost:2096 🎉

# 6. Inicie o gateway + APIS (inicia o gateway e todas as APIs)
npm run start:dev
Acesse: https://localhost:2096 🎉
Acesse: https://localhost:2096/api/enpoints_das_apis/
```

### 📁 Estrutura do Projeto

```text
gatewayapis/
├── 📄 server.js                 # Gateway principal (totalmente dinâmico)
├── 📄 package.json              # Script atualizados automaticamente pelo setup
├── 📄 ecosystem.config.js       # Configuração PM2 (gerada automaticamente)
├── 📁 scripts/                  # Scripts de automação
│   ├── setup.js                 # Setup inicial
│   ├── generate-package.js      # Gera scripts no package.
|   └── ecosystem-config.js      # Gera configuração PM2
├── 📁 src/
│   ├── apis.js                  # Loader dinâmico de APIs
│   ├── dynamicProxy.js          # Configuração automática de proxies
│   ├── dynamicHealth.js         # Health check dinâmico
│   └── cert/                    # Certificados SSL
│       ├── seu-certificado.key
│       └── seu-certificado.crt
├── 📁 services/                 # ⭐ Suas APIs vão aqui
│   ├── apiA/
│   │   └── package.json         # { "name": "...", "url": "..." }
│   ├── apiB/
│   │   └── package.json
│   └── apiC/
│       └── package.json         # E quantas mais tiver, sua regra negocio.
├── 📁 views/
│   └── home.ejs                 # Dashboard dinâmico
├── 📁 public/
│   ├── js/
│   │   └── scripts.js           # Atualização em tempo real
│   └── img/
│       └── apiGif.gif
└── 📁 logs/                     # Logs do PM2
```

### ⚙️ Configuração das APIs
Cada API dentro da pasta services/ precisa ter um package.json mínimo:

```json
{
  "name": "nome-da-api",
  "url": "http://localhost:3004",
  "endpoint": "apid",
  "port": 3004
}
```
|Campo|	Descrição|	Obrigatório|
| :--- | :--- |:--- |
|name|	Nome da API (exibido no dashboard)	|✅ Sim
url	|URL completa da API (ex: http://localhost:3004)	|✅ Sim
|endpoint|	Nome endpoint no proxy (ex: https://localhost:2096/api/apid)	|✅ Sim
port|	Porta da API (usada pelo PM2)	|⚠️ Opcional

### Exemplo Completo

```json
{
  "name": "API de Clientes",
  "version": "1.0.0",
  "description": "Gerencia cadastro de clientes",
  "url": "http://localhost:3001",
  "endpoint": "apid",
  "port": 3001
}
```
## 📦 Comandos Disponíveis
### Setup e Configuração
```bash
npm run setup              # Configuração automática do ambiente
npm run generate           # Regenera scripts no package.json
npm run generate:pm2       # Regenera configuração do PM2
npm run install:all        # Instala dependências de todas as APIs
```
### Desenvolvimento
```bash
npm run start:gateway      # Inicia apenas o gateway
npm run start:cliente      # Inicia API específica (ex: cliente)
npm run start:admin        # Inicia API específica (ex: admin)
npm run start:motorista    # Inicia API específica (ex: teste)
npm run start:all          # Inicia gateway + todas as APIs (concurrently)
npm run start:dev          # Modo desenvolvimento com nodemon todas as APIs
```
### Produção com PM2
```bash
npm run pm2:start          # Inicia todas as aplicações
npm run pm2:stop           # Para todas
npm run pm2:restart        # Reinicia todas
npm run pm2:delete         # Remove do PM2
npm run pm2:status         # Verifica status
npm run pm2:logs           # Visualiza logs
```

## 💻 Desenvolvimento
Adicionando uma Nova API
Crie a pasta da API:

```bash
mkdir services/minha-nova-api
Crie o package.json:
```
```bash
echo '{"name": "Minha Nova API", "url": "http://localhost:3004", "endpoint":"minha-nova-api"}' > services/minha-nova-api/package.json
```
Execute o gerador:

```bash
npm run generate
```
Inicie tudo:

```bash
npm run start:dev
```

 Pronto! Sua nova API já está disponível em https://localhost:2096/api/minha-nova-api 🎉

## Modo Desenvolvimento com Nodemon

```bash
npm run start:dev
```
Gateway reinicia automaticamente ao alterar server.js

Cada API reinicia individualmente ao alterar seu código

Logs em tempo real no console

## 🚢 Produção com PM2
Configuração Automática
O arquivo ecosystem.config.js é gerado automaticamente pelo npm run setup e inclui:

 Gateway principal

Todas as APIs detectadas na pasta services/

Configuração de logs individual para cada serviço

Gerenciamento de memória e auto-restart

### Iniciar em Produção
```
```bash
# 1. Configure o ambiente
npm run setup

# 2. Inicie com PM2
npm run pm2:start

# 3. Verifique o status
npm run pm2:status

# 4. Veja os logs
npm run pm2:logs
```
### Monitoramento
```bash
pm2 monit          # Monitor interativo
pm2 logs           # Todos os logs
pm2 logs gateway   # Apenas logs do gateway
```
## 🌐 Endpoints do Gateway
| Endpoint | Método |	Descrição |
| :--- | :--- |:--- | 
| / |	GET |	Dashboard com status em tempo real |
|/health |	GET	| Status consolidado de todas as APIs e métricas
|/metrics	|GET|Métricas detalhadas (requisições por API/método)
/api/status	|GET|	Status básico de todas as APIs
/api/reset-counters	|POST|	Reinicia os contadores de requisições
/api/:api/*	|ANY|	Proxy para a API correspondente

### Exemplo de Resposta /health

```json
{
  "status": "OK",
  "timestamp": "2026-03-23T12:34:56.789Z",
  "availability": "100%",
  "activeServices": 3,
  "totalServices": 3,
  "metrics": {
    "totalRequests": 1234,
    "requestsByService": {
      "apiportalclienteap": 456,
      "apiportaladm": 345,
      "apiappmotorista": 433
    },
    "avgLatency": 45
  },
  "services": {
    "apiportalclienteap": {
      "name": "API Cliente",
      "route": "/api/cliente",
      "up": true,
      "latency": 42
    }
  }
}
```
## 🔧 Variáveis de Ambiente

| Variável |	Descrição |	Padrão |
| :--- | :--- | :--- |
| GATEWAY_PORT |	Porta HTTPS do gateway |	2096 |
GATEWAY_RATE_LIMIT_MAX |	Máx. requisições por IP/15min |	1000
HEALTH_CHECK_TIMEOUT_MS |	Timeout health check (ms)	| 40000 (40s)
PUBLIC_HOST |	Host público (dashboard)	| windows.location.hostname
NODE_ENV |	Ambiente (development/production)	 | development


## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request


## 📄 Licença
Distribuído sob a licença ISC. Veja LICENSE para mais informações.

## 🙏 Agradecimentos

* [Express](https://expressjs.com/) - Framework web
* [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) - Proxy reverso
* [PM2](https://pm2.keymetrics.io/) - Gerenciamento de processos
* [Bootstrap](https://getbootstrap.com/) - UI components
* [Bootstrap Icons](https://icons.getbootstrap.com/) - Ícones

## 📞 Suporte

* 📧 **Email:** jtaironemorais@hotmail.com
* 🐛 **Issues:** [GitHub Issues](https://github.com/jtairone/gatewayapis/issues)

### Feito com ❤️ para facilitar a vida dos desenvolvedores!
