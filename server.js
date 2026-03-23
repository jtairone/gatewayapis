const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cloudflare = require('cloudflare-ip');

const { APIs } = require('./src/apis');
const { setupDynamicProxies } = require('./src/dynamicProxy');
const { setupDynamicHealth } = require('./src/dynamicHealth');

// ========== CONFIGURAÇÕES INICIAIS ==========
const app = express();

// ========== RATE LIMIT ==========
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.GATEWAY_RATE_LIMIT_MAX, 10) || 1000,
  message: { error: 'Muitas solicitações recebidas. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ['/health', '/metrics', '/favicon.ico', '/'].some(p => req.path === p || req.path.startsWith(p))
});

app.use(limiter);

// ========== TRUST PROXY (CLOUDFLARE) ==========
app.set('trust proxy', cloudflare.express);

// ========== VIEW ENGINE ==========
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

// ========== CONTADORES DINÂMICOS ==========
const requestCounters = {
  total: 0,
  startTime: new Date().toISOString(),
  lastReset: new Date().toISOString(),
  byEndpoint: {},
  byMethod: {
    GET: 0, POST: 0, PUT: 0, PATCH: 0, OPTIONS: 0, HEAD: 0, DELETE: 0, OTHER: 0
  }
};

// Adicionar contadores para cada API dinamicamente
Object.keys(APIs).forEach(apiKey => {
  requestCounters[apiKey] = 0;
});

console.log('\n📦 APIs carregadas dinamicamente:');
Object.keys(APIs).forEach(apiKey => {
  const api = APIs[apiKey];
  console.log(`   ✅ ${apiKey}: ${api.route} -> ${api.url}`);
});

// ========== MIDDLEWARE DE CONTAGEM ==========
const apiRoutes = Object.values(APIs).map(api => api.route);

app.use((req, res, next) => {
  const isApiRequest = apiRoutes.some(route => req.path === route || req.path.startsWith(route + '/'));
  if (!isApiRequest) return next();

  requestCounters.total++;
  
  // Contar por método HTTP
  const method = req.method;
  const STANDARD_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  if (STANDARD_METHODS.includes(method)) {
    requestCounters.byMethod[method]++;
  } else {
    requestCounters.byMethod['OTHER']++;
  }
  
  // Contar por endpoint (baseado na rota)
  const baseEndpoint = req.path.split('/')[2] || 'root';
  if (!requestCounters.byEndpoint[baseEndpoint]) {
    requestCounters.byEndpoint[baseEndpoint] = 0;
  }
  requestCounters.byEndpoint[baseEndpoint]++;
  
  // Contar para API específica
  const matchedRoute = apiRoutes.find(route => req.path === route || req.path.startsWith(route + '/'));
  if (matchedRoute) {
    const apiKey = Object.keys(APIs).find(key => APIs[key].route === matchedRoute);
    if (apiKey && requestCounters[apiKey] !== undefined) {
      requestCounters[apiKey]++;
    }
  }
  
  next();
});

// ========== ROTA PRINCIPAL ==========
app.route('/').get(async (req, res) => {
  try {
    // Buscar dados do health para a view
    const protocol = req.protocol;
    const host = req.get('host');
    const healthUrl = `${protocol}://${host}/health`;
    
    const healthResponse = await fetch(healthUrl);
    const healthData = await healthResponse.json();
    
    res.render('home', { 
      titulo: 'Gateway API JTI',
      mensagem: 'Hub de Microsserviços',
      porta: process.env.GATEWAY_PORT || 2096,
      publichost: process.env.PUBLIC_HOST || 'api.dominioempresa.com.br',
      contadores: requestCounters,
      apis: APIs,
      health: healthData,
      apiCount: Object.keys(APIs).length
    });
  } catch (error) {
    console.error('Erro ao buscar health data:', error.message);
    res.render('home', { 
      titulo: 'Gateway API JTI',
      mensagem: 'Hub de Microsserviços',
      porta: process.env.GATEWAY_PORT || 2096,
      publichost: process.env.PUBLIC_HOST || 'api.dominioempresa.com.br',
      contadores: requestCounters,
      apis: APIs,
      health: null,
      apiCount: Object.keys(APIs).length
    });
  }
});

// ========== HEALTH CHECK DINÂMICO ==========
setupDynamicHealth(app, requestCounters);

// ========== CONFIGURAR PROXIES DINÂMICOS ==========
const proxies = setupDynamicProxies(app, requestCounters);

console.log('\n🚀 Proxies configurados:');
proxies.forEach(proxy => {
  console.log(`   📡 ${proxy.name}: ${proxy.route} -> ${proxy.target}`);
});

// ========== ROTA DE STATUS DAS APIS ==========
app.get('/api/status', (req, res) => {
  const status = {
    gateway: {
      uptime: process.uptime(),
      startTime: requestCounters.startTime,
      totalRequests: requestCounters.total,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    },
    apis: {}
  };
  
  Object.keys(APIs).forEach(apiKey => {
    status.apis[apiKey] = {
      name: APIs[apiKey].name,
      route: APIs[apiKey].route,
      target: APIs[apiKey].url,
      requests: requestCounters[apiKey] || 0
    };
  });
  
  res.json(status);
});

// ========== ROTA DE MÉTRICAS SIMPLES ==========
app.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    total_requests: requestCounters.total,
    requests_by_method: requestCounters.byMethod,
    requests_by_endpoint: requestCounters.byEndpoint,
    apis: {}
  };
  
  Object.keys(APIs).forEach(apiKey => {
    metrics.apis[apiKey] = {
      requests: requestCounters[apiKey] || 0,
      route: APIs[apiKey].route,
      target: APIs[apiKey].url
    };
  });
  
  res.json(metrics);
});

// ========== ROTA DE RESET DE CONTADORES ==========
app.post('/api/reset-counters', (req, res) => {
  requestCounters.total = 0;
  requestCounters.byMethod = {
    GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, OPTIONS: 0, HEAD: 0, OTHER: 0
  };
  requestCounters.byEndpoint = {};
  requestCounters.lastReset = new Date().toISOString();
  
  Object.keys(APIs).forEach(apiKey => {
    requestCounters[apiKey] = 0;
  });
  
  res.json({ 
    message: 'Contadores resetados com sucesso',
    resetTime: requestCounters.lastReset
  });
});

// ========== CARREGAR CERTIFICADOS SSL ==========
let credentials;
try {
  const certDir = path.join(__dirname, 'src/cert');
  
  if (!fs.existsSync(certDir)) {
    throw new Error(`Pasta de certificados não encontrada: ${certDir}`);
  }
  
  const files = fs.readdirSync(certDir);
  
  // Procura por arquivos de chave (.key)
  const keyFile = files.find(file => 
    file.endsWith('.key') || file.match(/\.key$/i)
  );
  
  // Procura por arquivos de certificado (.pem, .crt, .cer)
  const certFile = files.find(file => 
    file.endsWith('.pem') || 
    file.endsWith('.crt') || 
    file.endsWith('.cer') ||
    file.match(/\.(pem|crt|cer)$/i)
  );
  
  if (!keyFile) {
    throw new Error(`Nenhum arquivo .key encontrado em ${certDir}`);
  }
  
  if (!certFile) {
    throw new Error(`Nenhum arquivo .pem, .crt ou .cer encontrado em ${certDir}`);
  }
  
  // Carrega os arquivos
  const keyPath = path.join(certDir, keyFile);
  const certPath = path.join(certDir, certFile);
  
  credentials = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  console.log(`\n✅ Certificados SSL carregados com sucesso:`);
  console.log(`   📁 Pasta: ${certDir}`);
  console.log(`   🔑 Chave: ${keyFile}`);
  console.log(`   📜 Certificado: ${certFile}`);

} catch (error) {
  console.error('\n❌ Erro ao carregar certificados SSL:', error.message);
  console.error('   Certifique-se de que os arquivos .key e .pem/.crt existem na pasta src/cert');
  process.exit(1);
}

// ========== INICIAR SERVIDOR ==========
const PORT = process.env.GATEWAY_PORT || 2096;

// Gateway HTTPS
https.createServer(credentials, app).listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 GATEWAY RODANDO EM HTTPS NA PORTA ${PORT}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📊 Total de APIs carregadas: ${Object.keys(APIs).length}`);
  console.log(`\n📡 Endpoints disponíveis:`);
  console.log(`   🏠 Home: https://localhost:${PORT}/`);
  console.log(`   ❤️  Health: https://localhost:${PORT}/health`);
  console.log(`   📈 Metrics: https://localhost:${PORT}/metrics`);
  console.log(`   🔄 Status: https://localhost:${PORT}/api/status`);
  
  console.log(`\n🎯 Proxies configurados:`);
  Object.keys(APIs).forEach(apiKey => {
    const api = APIs[apiKey];
    console.log(`   📍 ${api.route} → ${api.url}`);
  });
  
  console.log(`\n✨ Gateway dinâmico pronto!`);
  console.log(`📝 Adicione novas APIs na pasta ./services e reinicie o gateway`);
  console.log(`${'='.repeat(60)}\n`);
});

// ========== TRATAMENTO DE ENCERRAMENTO GRACEFUL ==========
/* process.on('SIGINT', () => {
  console.log('\n\n🛑 Recebido sinal SIGINT. Encerrando gateway...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Recebido sinal SIGTERM. Encerrando gateway...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Erro não tratado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Promise rejeitada não tratada:', reason);
}); */