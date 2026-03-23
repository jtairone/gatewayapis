const { createProxyMiddleware } = require('http-proxy-middleware');
const { APIs } = require('./apis');

// Configurar proxies dinamicamente
const setupDynamicProxies = (app, requestCounters) => {
  const proxies = [];
  
  Object.keys(APIs).forEach(apiKey => {
    const api = APIs[apiKey];
    
    // Middleware de contagem para esta API
    const countMiddleware = (req, res, next) => {
      if (requestCounters[apiKey]) {
        requestCounters[apiKey]++;
      }
      next();
    };
    
    // Configurar o proxy
    const proxyMiddleware = createProxyMiddleware({
      target: api.url,
      changeOrigin: true,
      pathRewrite: { [`^${api.route}`]: '' },
      proxyTimeout: 15000,
      timeout: 15000,
      onError: (err, req, res) => {
        console.error(`❌ Erro no proxy ${apiKey}:`, err.message);
        res.status(503).json({ 
          error: `Serviço ${apiKey} indisponível`,
          service: apiKey,
          timestamp: new Date().toISOString()
        });
      },
      onProxyReq: (proxyReq, req, res) => {
        // Adicionar headers úteis
        proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
        proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
      }
    });
    
    // Aplicar o proxy na rota
    app.use(api.route, countMiddleware, proxyMiddleware);
    
    proxies.push({
      name: apiKey,
      route: api.route,
      target: api.url
    });
  });
  
  return proxies;
};

module.exports = { setupDynamicProxies };