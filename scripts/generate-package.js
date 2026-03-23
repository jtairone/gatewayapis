const fs = require('fs');
const path = require('path');

const getDirectories = (source) => {
  return fs.readdirSync(source)
    .filter(item => {
      const itemPath = path.join(source, item);
      return fs.statSync(itemPath).isDirectory();
    });
};

const generatePackageJson = () => {
  const servicesPath = path.join(__dirname, '../services');
  
  if (!fs.existsSync(servicesPath)) {
    console.error('❌ Pasta services não encontrada!');
    return;
  }
  
  const apiFolders = getDirectories(servicesPath);
  
  // Ler package.json atual
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Gerar scripts start individuais para cada API
  const startScripts = {};
  const devScripts = {};
  const installScripts = [];
  
  apiFolders.forEach(folder => {
    // Mapear nome do script (remover 'api' do início se houver)
    let scriptName = folder;
    if (scriptName.startsWith('api')) {
      scriptName = scriptName.substring(3);
    }
    
    // Script start individual
    startScripts[`start:${scriptName}`] = `cd services/${folder} && node server.js`;
    
    // Script dev individual (com nodemon)
    devScripts[`dev:${scriptName}`] = `cd services/${folder} && nodemon --ignore api/swagger server.js`;
    
    // Script de instalação
    installScripts.push(`cd services/${folder} && npm install`);
  });
  
  // Gerar script start:all (concurrently com todas as APIs)
  const allStartCommands = [
    'npm run start:gateway',
    ...apiFolders.map(folder => {
      let scriptName = folder;
      if (scriptName.startsWith('api')) scriptName = scriptName.substring(3);
      return `npm run start:${scriptName}`;
    })
  ];
  
  // Gerar script dev:all (concurrently com nodemon para todas)
  const allDevCommands = [
    'nodemon --ignore services/* server.js',
    ...apiFolders.map(folder => {
      let scriptName = folder;
      if (scriptName.startsWith('api')) scriptName = scriptName.substring(3);
      return `npm run dev:${scriptName}`;
    })
  ];
  
  // Atualizar scripts no package.json
  packageJson.scripts = {
    ...packageJson.scripts,
    ...startScripts,
    ...devScripts,
    'start:gateway': 'node server.js',
    'dev:gateway': 'nodemon --ignore services/* server.js',
    'start': `concurrently ${allStartCommands.map(cmd => `"${cmd}"`).join(' ')}`,
    'start:dev': `concurrently ${allDevCommands.map(cmd => `"${cmd}"`).join(' ')}`,
    'install:all': `npm install && ${installScripts.join(' && ')}`,
    'pm2:start': 'pm2 start ecosystem.config.js',
    'pm2:stop': 'pm2 stop ecosystem.config.js',
    'pm2:restart': 'pm2 restart ecosystem.config.js',
    'pm2:delete': 'pm2 delete ecosystem.config.js',
    'pm2:logs': 'pm2 logs',
    'pm2:status': 'pm2 status'
  };
  
  // Adicionar scripts auxiliares se não existirem
  if (!packageJson.scripts['nodemon']) {
    packageJson.scripts['nodemon'] = 'nodemon server.js';
  }
  
  // Escrever package.json atualizado
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('✅ package.json atualizado com sucesso!');
  console.log(`\n📦 APIs encontradas: ${apiFolders.length}`);
  apiFolders.forEach(folder => {
    console.log(`   - ${folder}`);
  });
  
  console.log('\n📝 Scripts gerados:');
  console.log(`   🚀 start - Inicia gateway + todas as APIs`);
  console.log(`   🔧 start:dev - Inicia em modo desenvolvimento (com nodemon)`);
  console.log(`   📦 install:all - Instala dependências de todas as APIs`);
  console.log(`   🎯 start:<api> - Inicia API individualmente`);
  console.log(`   ⚡ dev:<api> - Inicia API em modo dev`);
};

// Executar geração
try {
  generatePackageJson();
} catch (error) {
  console.error('❌ Erro ao gerar package.json:', error.message);
}