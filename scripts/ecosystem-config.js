const fs = require('fs');
const path = require('path');

const getDirectories = (source) => {
  return fs.readdirSync(source)
    .filter(item => {
      const itemPath = path.join(source, item);
      return fs.statSync(itemPath).isDirectory();
    });
};

const generateEcosystemConfig = () => {
  // Caminho para a pasta services (subindo um nível da pasta scripts)
  const servicesPath = path.join(__dirname, '../services');
  
  if (!fs.existsSync(servicesPath)) {
    console.error('❌ Pasta services não encontrada!');
    console.error(`   Caminho procurado: ${servicesPath}`);
    return;
  }
  
  const apiFolders = getDirectories(servicesPath);
  
  // Configuração do gateway
  const apps = [
    {
      name: 'gateway',
      script: 'server.js',
      cwd: path.join(__dirname, '..'), // Caminho para a raiz do projeto
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        GATEWAY_PORT: 2096
      },
      error_file: './logs/gateway-error.log',
      out_file: './logs/gateway-out.log',
      log_file: './logs/gateway-combined.log',
      time: true
    }
  ];
  
  // Adicionar cada API como um app separado no PM2
  apiFolders.forEach(folder => {
    const apiPath = path.join(servicesPath, folder);
    const packageJsonPath = path.join(apiPath, 'package.json');
    
    let apiPort = 3000;
    
    // Tentar ler porta do package.json da API
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        apiPort = packageJson.port || 3000;
      } catch (e) {
        console.warn(`⚠️  Erro ao ler package.json de ${folder}`);
      }
    }
    
    apps.push({
      name: folder,
      script: 'server.js',
      cwd: apiPath,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: apiPort
      },
      error_file: `./logs/${folder}-error.log`,
      out_file: `./logs/${folder}-out.log`,
      log_file: `./logs/${folder}-combined.log`,
      time: true
    });
  });
  
  // Criar arquivo ecosystem.config.js na raiz do projeto
  const ecosystemPath = path.join(__dirname, '../ecosystem.config.js');
  const configContent = `module.exports = {
  apps: ${JSON.stringify(apps, null, 2)}
};`;
  
  fs.writeFileSync(ecosystemPath, configContent);
  
  console.log('✅ ecosystem.config.js gerado com sucesso!');
  console.log(`   📁 Arquivo criado em: ${ecosystemPath}`);
  console.log(`\n📦 Aplicações configuradas para PM2: ${apps.length}`);
  apps.forEach(app => {
    console.log(`   - ${app.name}${app.cwd ? ` (${app.cwd})` : ''}`);
  });
  
  return apps;
};

// Executar geração
try {
  generateEcosystemConfig();
} catch (error) {
  console.error('❌ Erro ao gerar ecosystem.config.js:', error.message);
}
