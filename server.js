const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

// Rate limit no gateway: limite maior pois agrega tráfego das 3 APIs
// Ajuste GATEWAY_RATE_LIMIT_MAX conforme a soma dos limites das suas APIs
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.GATEWAY_RATE_LIMIT_MAX, 10) || 600, // 600 req/15min por IP (3 APIs × ~200)
  message: { error: 'Muitas solicitações recebidas. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ['/health', '/metrics', '/favicon.ico'].some(p => req.path === p || req.path.startsWith(p))
});

const app = express();

app.use(limiter);
// Usar variáveis de ambiente
const API_CLIENTE_URL = process.env.API_CLIENTE_URL || 'http://localhost:3001';
const API_ADMIN_URL = process.env.API_ADMIN_URL || 'http://localhost:3002';
const API_MOTORISTA_URL = process.env.API_MOTORISTA_URL || 'http://localhost:3003';

// ========== CONTADORES ==========
const requestCounters = {
  total: 0,
  cliente: 0,
  admin: 0,
  motorista: 0,
  byEndpoint: {}, // Para contar endpoints específicos
  byMethod: {     // Contar por método HTTP
    GET: 0,
    POST: 0,
    PUT: 0,
    PATCH: 0,
    OPTIONS: 0,
    HEAD: 0,
    DELETE: 0,
    OTHER: 0
  },
  startTime: new Date().toISOString(),
  lastReset: new Date().toISOString()
};

// Só conta requisições que passam pelos proxies das APIs
const API_PATHS = ['/api/cliente', '/api/admin', '/api/appmotorista'];

// Middleware para contar requisições (apenas rotas de proxy das APIs)
app.use((req, res, next) => {
  const isApiRequest = API_PATHS.some(path => req.path === path || req.path.startsWith(path + '/'));
  if (!isApiRequest) return next();

  requestCounters.total++;
  const method = req.method;
  const STANDARD_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  if (STANDARD_METHODS.includes(method)) {
    requestCounters.byMethod[method]++;
  } else {
    requestCounters.byMethod['OTHER']++;
  }
  const baseEndpoint = req.path.split('/')[2] || 'root'; // api/cliente -> cliente
  if (!requestCounters.byEndpoint[baseEndpoint]) {
    requestCounters.byEndpoint[baseEndpoint] = 0;
  }
  requestCounters.byEndpoint[baseEndpoint]++;
  next();
});

app.set('view engine', 'ejs')
app.set('views', './views')
app.use(express.static('public'))

app.route('/')
  .get((req, res) => {
    res.render('home', { 
      titulo: 'Página Inicial',
      mensagem: 'Bem-vindo ao Gateway API',
      apiClienteUrl: API_CLIENTE_URL,
      apiAdminUrl: API_ADMIN_URL,
      apiAppMotoristaUrl: API_MOTORISTA_URL,
      porta: '2096',
      contadores: requestCounters

    });
});

// Verifica se uma API está respondendo (tenta /health, fallback para /)
function checkServiceHealth(url, timeoutMs = 3000) {
  const tryUrl = (path) =>
    new Promise((resolve) => {
      const parsed = new URL(url);
      const client = parsed.protocol === 'https:' ? https : http;
      const targetUrl = `${url.replace(/\/$/, '')}${path}`;
      const req = client.get(targetUrl, { timeout: timeoutMs }, (res) => {
        res.resume(); // consome o body para liberar a conexão
        resolve({ up: true, statusCode: res.statusCode });
      });
      req.on('error', (err) => resolve({ up: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ up: false, error: 'Timeout' });
      });
    });

  return tryUrl('/health').then((r) => (r.up ? r : tryUrl('/')));
}

// Health check do gateway com verificação real das APIs
app.get('/health', async (req, res) => {
  const timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS, 10) || 3000;
  const [clienteStatus, adminStatus, motoristaStatus] = await Promise.all([
    checkServiceHealth(API_CLIENTE_URL, timeout),
    checkServiceHealth(API_ADMIN_URL, timeout),
    checkServiceHealth(API_MOTORISTA_URL, timeout)
  ]);

  const allUp = clienteStatus.up && adminStatus.up && motoristaStatus.up;

  res.status(allUp ? 200 : 503).json({
    status: allUp ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    services: {
      cliente: { url: API_CLIENTE_URL, up: clienteStatus.up, ...clienteStatus },
      admin: { url: API_ADMIN_URL, up: adminStatus.up, ...adminStatus },
      motorista: { url: API_MOTORISTA_URL, up: motoristaStatus.up, ...motoristaStatus }
    },
    metrics: {
      totalRequests: requestCounters.total,
      requestsByService: {
        cliente: requestCounters.cliente,
        admin: requestCounters.admin,
        motorista: requestCounters.motorista
      },
      requestsByMethod: requestCounters.byMethod,
      uptime: process.uptime(),
      startTime: requestCounters.startTime,
      lastReset: requestCounters.lastReset
    }
  });
});

// Proxy para API Cliente
app.use('/api/cliente', (req, res, next) => {
  requestCounters.cliente++;
  next();
}, createProxyMiddleware({
  target: API_CLIENTE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/cliente': '' },
  proxyTimeout: 15000, // 15s
  timeout: 15000,
  onError: (err, req, res) => {
    console.error('Erro no proxy cliente:', err);
    res.status(503).json({ error: 'Serviço cliente indisponível' });
  }
}));

// Proxy para API Admin
app.use('/api/admin', (req, res, next) => {
  requestCounters.admin++;
  next();
}, createProxyMiddleware({
  target: API_ADMIN_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/admin': '' },
  proxyTimeout: 15000, // 15s
  timeout: 15000,
  onError: (err, req, res) => {
    console.error('Erro no proxy admin:', err);
    res.status(503).json({ error: 'Serviço admin indisponível' });
  }
}));

// Proxy para API Motorista
app.use('/api/appmotorista', (req, res, next) => {
  requestCounters.motorista++;
  next();
}, createProxyMiddleware({
  target: API_MOTORISTA_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/appmotorista': '' },
  proxyTimeout: 15000, // 15s
  timeout: 15000,
  onError: (err, req, res) => {
    console.error('Erro no proxy motorista:', err);
    res.status(503).json({ error: 'Serviço motorista indisponível' });
  }
}));

// Certificados SSL
let credentials;
try {
  credentials = {
    key: fs.readFileSync('src/cert/privado.key'),
    cert: fs.readFileSync('src/cert/certificado.pem')
  };
} catch (error) {
  console.error('Erro ao carregar certificados SSL:', error);
  process.exit(1);
}

const PORT = process.env.GATEWAY_PORT || 2096;

// Gateway HTTPS
https.createServer(credentials, app).listen(PORT, () => {
  console.log(`🚀 Gateway rodando em HTTPS na porta ${PORT}`);
  console.log(`📡 API Cliente: ${API_CLIENTE_URL}`);
  console.log(`📡 API Admin: ${API_ADMIN_URL}`);
  console.log(`📡 API App Motorista: ${API_MOTORISTA_URL}`);
});