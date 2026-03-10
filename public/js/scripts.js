// Atualizar data e hora
function updateDateTime() {
  const now = new Date();
  
  const optionsDate = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
  };
  
  document.getElementById('current-date').textContent = 
      now.toLocaleDateString('pt-BR', optionsDate);
  
  document.getElementById('current-time').textContent = 
      now.toLocaleTimeString('pt-BR');
  
  document.getElementById('year').textContent = now.getFullYear();
}

updateDateTime();
setInterval(updateDateTime, 1000);

// Verificar status dos serviços via API
async function checkServices() {
  try {
      const response = await fetch('/health');
      const data = await response.json();
      
      if(data.services){
        const updateServiceBadge = (card, serviceData) => {
          const badge = card.querySelector('.badge');
          const span = badge.querySelector('.status-badge');
          const isUp = serviceData?.up ?? false;
          span.className = 'status-badge ' + (isUp ? 'status-online' : 'status-offline');
          badge.innerHTML = span.outerHTML + ' ' + (isUp ? 'Online' : 'Offline');
        };
        updateServiceBadge(document.querySelector('.service-card-cliente'), data.services.cliente);
        updateServiceBadge(document.querySelector('.service-card-admin'), data.services.admin);
        updateServiceBadge(document.querySelector('.service-card-motorista'), data.services.motorista);
      }
      // Atualiza contador total
      if (data.metrics) {
          document.getElementById('total-requests').textContent = 
              data.metrics.totalRequests.toLocaleString();
          document.getElementById('cliente-requests').textContent = 
              data.metrics.requestsByService.cliente.toLocaleString();
          document.getElementById('admin-requests').textContent = 
              data.metrics.requestsByService.admin.toLocaleString();
             //console.log('Requisições Cliente:', data.metrics.requestsByService.cliente);
            //console.log('Requisições Admin:', data.metrics.requestsByService.admin);
      }

      // Contar serviços ativos
      let activeCount = 0;
      if (data.services) {
          for (const [service] of Object.entries(data.services)) {
              if (service.up) {
                  activeCount++;
              }
          }
      }
      
      document.getElementById('active-services').textContent = activeCount || 0;
      
  } catch (error) {
      console.error('Erro ao verificar serviços:', error);
      document.getElementById('active-services').textContent = '0';
  }
}

// Verificar serviços a cada 30 segundos
checkServices();
setInterval(checkServices, 30000);

// Adicionar efeito de digitação no título
const titles = [
  'Gateway API JTI',
  'Roteamento Inteligente',
  'APIs Unificadas',
  'Microsserviços'
];

let titleIndex = 0;
setInterval(() => {
  titleIndex = (titleIndex + 1) % titles.length;
  document.title = titles[titleIndex] + ' | JTI';
}, 3000);
document.querySelector('.gateway').textContent = window.location.hostname