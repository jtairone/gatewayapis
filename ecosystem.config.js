module.exports = {
  apps: [
  {
    "name": "gateway",
    "script": "server.js",
    "cwd": "C:\\Users\\jtair\\Documents\\Projetos\\AP\\gatewayapis",
    "instances": 1,
    "autorestart": true,
    "watch": false,
    "max_memory_restart": "1G",
    "env": {
      "NODE_ENV": "production",
      "GATEWAY_PORT": 2096
    },
    "error_file": "./logs/gateway-error.log",
    "out_file": "./logs/gateway-out.log",
    "log_file": "./logs/gateway-combined.log",
    "time": true
  },
  {
    "name": "apiappmotorista",
    "script": "server.js",
    "cwd": "C:\\Users\\jtair\\Documents\\Projetos\\AP\\gatewayapis\\services\\apiappmotorista",
    "instances": 1,
    "autorestart": true,
    "watch": false,
    "max_memory_restart": "512M",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3000
    },
    "error_file": "./logs/apiappmotorista-error.log",
    "out_file": "./logs/apiappmotorista-out.log",
    "log_file": "./logs/apiappmotorista-combined.log",
    "time": true
  },
  {
    "name": "apiportaladm",
    "script": "server.js",
    "cwd": "C:\\Users\\jtair\\Documents\\Projetos\\AP\\gatewayapis\\services\\apiportaladm",
    "instances": 1,
    "autorestart": true,
    "watch": false,
    "max_memory_restart": "512M",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3000
    },
    "error_file": "./logs/apiportaladm-error.log",
    "out_file": "./logs/apiportaladm-out.log",
    "log_file": "./logs/apiportaladm-combined.log",
    "time": true
  },
  {
    "name": "apiportalclienteap",
    "script": "server.js",
    "cwd": "C:\\Users\\jtair\\Documents\\Projetos\\AP\\gatewayapis\\services\\apiportalclienteap",
    "instances": 1,
    "autorestart": true,
    "watch": false,
    "max_memory_restart": "512M",
    "env": {
      "NODE_ENV": "production",
      "PORT": 3000
    },
    "error_file": "./logs/apiportalclienteap-error.log",
    "out_file": "./logs/apiportalclienteap-out.log",
    "log_file": "./logs/apiportalclienteap-combined.log",
    "time": true
  }
]
};