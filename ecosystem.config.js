module.exports = {
  apps: [
    {
      name: 'gateway',
      script: './server.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        GATEWAY_PORT: 2096,
        API_CLIENTE_URL: 'http://localhost:3001',
        API_ADMIN_URL: 'http://localhost:3002',
        API_MOTORISTA_URL: 'http://localhost:3003'
      },
      error_file: './logs/gateway-error.log',
      out_file: './logs/gateway-out.log',
      merge_logs: true
    },
    {
      name: 'api-cliente',
      script: './server.js',
      cwd: './services/apiportalclienteap',
      args: ['api/database/dbapi.sqlite', 'server.js'],
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '../../logs/api-cliente-error.log',
      out_file: '../../logs/api-cliente-out.log',
      merge_logs: true
    },
    {
      name: 'api-admin',
      script: './server.js',
      cwd: './services/apiportaladm',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: '../../logs/api-admin-error.log',
      out_file: '../../logs/api-admin-out.log',
      merge_logs: true
    },
    {
      name: 'api-motorista',
      script: './server.js',
      cwd: './services/apiappmotorista',
      args: ['server.js'],
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: '../../logs/api-motorista-error.log',
      out_file: '../../logs/api-motorista-out.log',
      merge_logs: true
    }
  ]
};
