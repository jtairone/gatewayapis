// --- 1. Atualizar Data e Hora ---
function updateDateTime() {
    const now = new Date();
    
    const timeEl = document.getElementById('current-time');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('pt-BR');
    
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = now.getFullYear();
}

// --- 2. Verificar Status e Métricas (Latência Real) ---
async function checkServices() {
    const startTime = Date.now(); // Marca o início para cálculo de latência
    
    try {
        const response = await fetch('/health');
        const data = await response.json();
        const endTime = Date.now();

        // Cálculo de Latência: prioriza dado do servidor ou calcula localmente
        const latency = data.metrics?.avgLatency || (endTime - startTime);
        const latencyEl = document.getElementById('average-latency');
        if (latencyEl) latencyEl.textContent = `${latency} ms`;

        // Atualizar Métricas (Total e por Serviço)
        if (data.metrics) {
            const totalEl = document.getElementById('total-requests');
            if (totalEl) totalEl.textContent = (data.metrics.totalRequests || 0).toLocaleString();

            // Mapeamento dinâmico baseado nos IDs do novo HTML
            const serviceMapping = {
                'cliente': 'cliente-requests',
                'admin': 'admin-requests',
                'motorista': 'appmotorista-requests' // Ajustado para o ID do HTML
            };

            for (const [key, id] of Object.entries(serviceMapping)) {
                const el = document.getElementById(id);
                const value = data.metrics.requestsByService?.[key];
                if (el) el.textContent = (value || 0).toLocaleString();
            }
        }

        // Atualizar Status dos Cards e Contagem de Nodes Ativos
        if (data.services) {
            let activeCount = 0;

            const updateBadge = (selector, serviceData) => {
                const card = document.querySelector(selector);
                if (!card) return;
                
                const badge = card.querySelector('.status-badge');
                const isUp = serviceData?.up ?? false;
                
                if (isUp) activeCount++;

                if (badge) {
                    badge.innerHTML = `<span class="status-dot ${isUp ? '' : 'bg-danger'}"></span> ${isUp ? 'Online' : 'Offline'}`;
                    badge.style.color = isUp ? 'var(--accent-green)' : '#ff4d4d';
                }
            };

            // Seletores baseados nas classes das APIs no novo HTML
            updateBadge('.api-card.cliente', data.services.cliente);
            updateBadge('.api-card.admin', data.services.admin);
            updateBadge('.api-card.motorista', data.services.motorista);

            const activeEl = document.getElementById('active-services');
            if (activeEl) activeEl.textContent = activeCount;
        }
        
    } catch (error) {
        console.error('Erro ao verificar serviços:', error);
        const activeEl = document.getElementById('active-services');
        if (activeEl) activeEl.textContent = '0';
    }
}

// --- 3. Inicialização e Hostname ---
updateDateTime();
setInterval(updateDateTime, 1000);

checkServices();
setInterval(checkServices, 30000); // Verifica a cada 30 segundos

// Preenche o Hostname na tabela técnica
const gatewayEl = document.querySelector('.gateway');
if (gatewayEl) gatewayEl.textContent = window.location.hostname;

// Ciclo de títulos da aba
const titles = ['Gateway API JTI', 'Roteamento Inteligente', 'APIs Unificadas'];
let titleIndex = 0;
setInterval(() => {
    titleIndex = (titleIndex + 1) % titles.length;
    document.title = titles[titleIndex] + ' | JTI';
}, 3000);