const https = require('https');
const http = require('http');
const { APIs } = require('./apis');

function checkServiceHealth(url, timeoutMs = 3000) {
  const startTime = Date.now(); // Marca o início da requisição para calcular latência
  
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const client = parsed.protocol === 'https:' ? https : http;
      
      const req = client.get(url, { timeout: timeoutMs }, (res) => {
        let data = '';
        const latency = Date.now() - startTime; // Calcula latência da resposta
        
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          let healthData = {};
          try {
            healthData = JSON.parse(data);
          } catch(e) {
            healthData = { message: data };
          }
          resolve({ 
            up: true, 
            statusCode: res.statusCode,
            healthData: healthData,
            latency: latency
          });
        });
      });
      
      req.on('error', (err) => resolve({ 
        up: false, 
        error: err.message,
        latency: Date.now() - startTime
      }));
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ 
          up: false, 
          error: 'Timeout',
          latency: Date.now() - startTime
        });
      });
    } catch (error) {
      resolve({ 
        up: false, 
        error: error.message,
        latency: Date.now() - startTime
      });
    }
  });
}

const setupDynamicHealth = (app, requestCounters) => {
  app.get('/health', async (req, res) => {
    const timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS, 10) || 3000;
    const services = {};
    const checks = [];
    
    // Realizar health check para todas as APIs
    Object.keys(APIs).forEach(apiKey => {
      const api = APIs[apiKey];
      checks.push(
        checkServiceHealth(api.url, timeout)
          .then(status => {
            services[apiKey] = {
              name: api.name,
              route: api.route,
              url: api.url,
              up: status.up,
              statusCode: status.statusCode,
              healthData: status.healthData,
              requests: requestCounters[apiKey] || 0,
              latency: status.latency || null,
              error: status.error || null
            };
          })
      );
    });
    
    await Promise.all(checks);
    
    const allUp = Object.values(services).every(s => s.up);
    const activeServices = Object.values(services).filter(s => s.up).length;
    const totalServices = Object.keys(APIs).length;
    
    // Calcular disponibilidade percentual
    const availability = totalServices > 0 
      ? ((activeServices / totalServices) * 100).toFixed(1)
      : 0;
    
    // Calcular latência média apenas dos serviços online
    const latencies = Object.values(services)
      .filter(s => s.up && s.latency)
      .map(s => s.latency);
    const avgLatency = latencies.length > 0 
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null;
    
    // Calcular total de requisições
    const totalRequests = requestCounters.total || 0;
    
    // Preparar requests por serviço
    const requestsByService = {};
    Object.keys(APIs).forEach(key => {
      requestsByService[key] = requestCounters[key] || 0;
    });
    
    res.status(allUp ? 200 : 503).json({
      status: allUp ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      availability: `${availability}%`,
      activeServices: activeServices,
      totalServices: totalServices,
      metrics: {
        totalRequests: totalRequests,
        requestsByService: requestsByService,
        avgLatency: avgLatency,
        uptime: process.uptime(),
        startTime: requestCounters.startTime,
        lastReset: requestCounters.lastReset
      },
      services: services,
      gateway: {
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        port: process.env.GATEWAY_PORT || 2096,
        host: process.env.PUBLIC_HOST || 'api.acopotiguar.com.br'
      }
    });
  });
};

module.exports = { setupDynamicHealth };