const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Configurando ambiente...\n');

// Gerar package.json atualizado
console.log('1️⃣ Gerando package.json...');
require('./generate-package');

console.log('\n2️⃣ Gerando ecosystem.config.js para PM2...');
require('./ecosystem-config');

// Verificar se as pastas de logs existem
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  console.log('\n3️⃣ Criando pasta de logs...');
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('   ✅ Pasta logs criada');
}

// Instalar dependências das APIs
console.log('\n4️⃣ Instalando dependências das APIs...');
try {
  execSync('npm run install:all', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (error) {
  console.error('   ⚠️  Erro ao instalar dependências de algumas APIs');
}

console.log('\n✅ Setup concluído com sucesso!');
console.log('\n📝 Comandos disponíveis:');
console.log('   🚀 npm run start:all     - Inicia gateway + todas as APIs');
console.log('   🔧 npm run dev:all       - Inicia em modo desenvolvimento');
console.log('   ⚡ npm run pm2:start     - Inicia com PM2 (produção)');
console.log('   📊 npm run pm2:status    - Ver status no PM2');
console.log('   📝 npm run pm2:logs      - Ver logs do PM2');