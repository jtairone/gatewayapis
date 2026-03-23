const fs = require('fs');
const path = require('path');

const getDirectories = (source) => {
  return fs.readdirSync(source)
    .filter(item => {
      const itemPath = path.join(source, item);
      return fs.statSync(itemPath).isDirectory();
    });
};

const loadApis = () => {
  const servicesPath = path.join(__dirname, '../services');
  
  if (!fs.existsSync(servicesPath)) {
    console.warn(`⚠️  Pasta services não encontrada: ${servicesPath}`);
    return {};
  }
  
  const apiFolders = getDirectories(servicesPath);
  const apis = {};
  
  apiFolders.forEach(folder => {
    const packageJsonPath = path.join(servicesPath, folder, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Criar nome da variável de ambiente
        const envVarName = `API_${packageJson.endpoint.toUpperCase().replace(/-/g, '_')}_URL`;
        
        // URL: variável de ambiente > package.json > fallback
        const url = process.env[envVarName] || packageJson.url || `http://localhost:3000`;
        
        apis[folder] = {
          name: packageJson.endpoint,
          route: `/api/${packageJson.endpoint.toLowerCase()}`,
          envVar: envVarName,
          url: url,
          packageJson: packageJson
        };
        
      } catch (error) {
        console.error(`❌ Erro ao ler package.json de ${folder}:`, error.message);
      }
    } else {
      console.warn(`⚠️  package.json não encontrado em ${folder}`);
    }
  });
  
  return apis;
};

const APIs = loadApis();

module.exports = {
  APIs,
  getApiConfig: (apiName) => APIs[apiName],
  getApiUrls: () => {
    const urls = {};
    Object.keys(APIs).forEach(key => {
      urls[key] = APIs[key].url;
    });
    return urls;
  }
};