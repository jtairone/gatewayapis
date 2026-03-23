// ========== CONFIGURAÇÕES ==========
const REFRESH_INTERVAL = 40000; // 30 segundos
const API_COLORS = {
    default: { icon: 'bi-cloud-fill', gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }
};
//Alimentar o intervalo dinamico na pagina
document.querySelector('#interval').textContent = REFRESH_INTERVAL /1000
// Mapeamento de ícones por nome da API
const ICON_MAP = {
    'cliente': 'bi-people-fill',
    'admin': 'bi-shield-lock-fill',
    'motorista': 'bi-truck-front-fill',
    'appmotorista': 'bi-truck-front-fill',
    'portalcliente': 'bi-person-badge-fill',
    'portaladm': 'bi-building-fill',
    'auth': 'bi-key-fill',
    'pagamento': 'bi-credit-card-fill',
    'notificacao': 'bi-bell-fill',
    'log': 'bi-file-text-fill'
};

// Cores por tipo de API
const COLOR_MAP = {
    'cliente': '#3b82f6',
    'admin': '#8b5cf6',
    'motorista': '#10b981',
    'appmotorista': '#10b981',
    'default': '#3b82f6'
};

// ========== FUNÇÕES AUXILIARES ==========
function getApiIcon(apiName) {
    const lowerName = apiName.toLowerCase();
    for (const [key, icon] of Object.entries(ICON_MAP)) {
        if (lowerName.includes(key)) {
            return icon;
        }
    }
    return 'bi-cloud-fill';
}

function getApiColor(apiName) {
    const lowerName = apiName.toLowerCase();
    for (const [key, color] of Object.entries(COLOR_MAP)) {
        if (lowerName.includes(key)) {
            return color;
        }
    }
    return COLOR_MAP.default;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${Math.floor(seconds)}s`;
}

// ========== ATUALIZAR DATA/HORA ==========
function updateDateTime() {
    const now = new Date();
    const timeEl = document.getElementById('current-time');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('pt-BR');
    
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = now.getFullYear();
}

// ========== RENDERIZAR SERVIÇOS ==========
function renderServices(services, metrics) {
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;
    
    if (!services || Object.keys(services).length === 0) {
        servicesGrid.innerHTML = `
            <div class="api-card" style="grid-column: 1/-1; text-align: center;">
                <i class="bi bi-exclamation-triangle-fill" style="font-size: 3rem; color: var(--accent-red);"></i>
                <h4 class="mt-3">Nenhum serviço encontrado</h4>
                <p class="text-secondary">Adicione APIs na pasta ./services e reinicie o gateway.</p>
            </div>
        `;
        return;
    }
    
    servicesGrid.innerHTML = '';
    
    Object.keys(services).forEach(apiKey => {
        const service = services[apiKey];
        const isUp = service.up;
        const icon = getApiIcon(apiKey);
        const color = getApiColor(apiKey);
        const requests = metrics?.requestsByService?.[apiKey] || 0;
        const latency = service.latency || null;
        
        const card = document.createElement('div');
        card.className = `api-card ${apiKey}`;
        card.onclick = () => window.location.href = service.route;
        
        let statusClass = '';
        let statusText = '';
        let statusDotClass = '';
        
        if (isUp) {
            statusClass = '';
            statusText = 'Online';
            statusDotClass = '';
        } else {
            statusClass = 'offline';
            statusText = 'Offline';
            statusDotClass = 'offline';
        }
        
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <i class="bi ${icon}" style="color: ${color}; font-size: 2rem;"></i>
                <span class="status-badge ${statusClass}">
                    <span class="status-dot ${statusDotClass}"></span> 
                    ${statusText}
                </span>
            </div>
            <h4 class="mt-3">${service.name || apiKey}</h4>
            
            <code class="text-info" style="color: ${color} !important;">${service.route}</code>
            <div class="mt-2 small text-secondary">
                <i class="bi bi-arrow-repeat"></i> ${formatNumber(requests)} requisições
                ${latency ? `<span class="ms-3"><i class="bi bi-speedometer2"></i> ${latency}ms</span>` : ''}
                ${service.statusCode ? `<span class="ms-3"><i class="bi bi-code-slash"></i> ${service.statusCode}</span>` : ''}
            </div>
        `;
        servicesGrid.appendChild(card);
    });
}

// ========== RENDERIZAR ENDPOINTS ==========
function renderEndpoints(services) {
    const endpointList = document.getElementById('endpoint-list');
    if (!endpointList) return;
    
    if (!services || Object.keys(services).length === 0) {
        endpointList.innerHTML = `
            <div class="endpoint-item">
                <span class="method">GET</span>
                <span class="path">/health</span>
                <span class="ms-auto badge bg-dark text-secondary">Monitoramento</span>
            </div>
        `;
        return;
    }
    
    endpointList.innerHTML = `
        <div class="endpoint-item">
            <span class="method get">GET</span> 
            <span class="path">/health</span>
            <span class="ms-auto badge bg-dark text-secondary">Monitoramento</span>
        </div>
        <div class="endpoint-item">
            <span class="method get">GET</span> 
            <span class="path">/metrics</span>
            <span class="ms-auto badge bg-dark text-secondary">Métricas</span>
        </div>
        <div class="endpoint-item">
            <span class="method get">GET</span> 
            <span class="path">/api/status</span>
            <span class="ms-auto badge bg-dark text-secondary">Status APIs</span>
        </div>
    `;
    
    Object.keys(services).forEach(apiKey => {
        const service = services[apiKey];
        endpointList.innerHTML += `
            <div class="endpoint-item">
                <span class="method any">ANY</span> 
                <span class="path">${service.route}/*</span>
                <span class="ms-auto badge bg-dark text-secondary">Proxy ${apiKey}</span>
            </div>
        `;
    });
}

// ========== RENDERIZAR PROPRIEDADES DO NODE ==========
function renderNodeProperties(gateway) {
    const nodeProps = document.getElementById('node-properties');
    if (!nodeProps) return;
    
    const uptime = formatUptime(gateway?.uptime || 0);
    
    nodeProps.innerHTML = `
        <tr>
            <td class="text-secondary"><i class="bi bi-hdd-stack me-2"></i>Gateway Port:</td>
            <td class="text-end fw-bold">${gateway?.port || '2096'}</td>
        </tr>
        <tr>
            <td class="text-secondary"><i class="bi bi-shield-lock me-2"></i>Protocol:</td>
            <td class="text-end text-success fw-bold">HTTPS (SSL)</td>
        </tr>
        <tr>
            <td class="text-secondary"><i class="bi bi-globe2 me-2"></i>Public Host:</td>
            <td class="text-end text-info">${ window.location.hostname}</td>
        </tr>
        <tr>
            <td class="text-secondary"><i class="bi bi-clock me-2"></i>Server Time:</td>
            <td class="text-end" id="current-time">--:--:--</td>
        </tr>
        <tr>
            <td class="text-secondary"><i class="bi bi-stopwatch me-2"></i>Uptime:</td>
            <td class="text-end">${uptime}</td>
        </tr>
        <tr>
            <td class="text-secondary"><i class="bi bi-node-plus me-2"></i>Node Version:</td>
            <td class="text-end">${gateway?.nodeVersion || '--'}</td>
        </tr>
        <tr>
            <td class="text-secondary"><i class="bi bi-gear me-2"></i>Environment:</td>
            <td class="text-end">${gateway?.environment || 'development'}</td>
        </tr>
    `;
    
    // Atualizar data/hora
    updateDateTime();
}

// ========== VERIFICAR SERVIÇOS ==========
let lastHealthData = null;

async function checkServices() {
    const startTime = Date.now();
    
    try {
        const response = await fetch('/health');
        const data = await response.json();
        const endTime = Date.now();
        
        lastHealthData = data;
        
        // Calcular disponibilidade
        const activeCount = data.activeServices || 0;
        const totalCount = data.totalServices || Object.keys(data.services || {}).length;
        const availability = totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(1) : 0;
        
        // Atualizar estatísticas
        const availabilityEl = document.getElementById('availability');
        if (availabilityEl) availabilityEl.textContent = `${availability}%`;
        
        const activeEl = document.getElementById('active-services');
        if (activeEl) activeEl.textContent = `${activeCount}/${totalCount}`;
        
        const totalServicesEl = document.getElementById('total-services');
        if (totalServicesEl) totalServicesEl.textContent = totalCount;
        
        const totalRequestsEl = document.getElementById('total-requests');
        if (totalRequestsEl && data.metrics) {
            totalRequestsEl.textContent = formatNumber(data.metrics.totalRequests || 0);
        }
        
        const latencyEl = document.getElementById('average-latency');
        const latency = data.metrics?.avgLatency || (endTime - startTime);
        if (latencyEl) latencyEl.textContent = `${latency} ms`;
        
        // Atualizar status do gateway
        const gatewayStatus = document.getElementById('gateway-status');
        if (gatewayStatus) {
            const allUp = data.status === 'OK';
            const hasIssues = activeCount > 0 && activeCount < totalCount;
            
            if (allUp) {
                gatewayStatus.innerHTML = '<i class="bi bi-check-circle-fill"></i> Sistemas Online';
                gatewayStatus.className = 'badge bg-success-subtle text-success border border-success-subtle';
            } else if (hasIssues) {
                gatewayStatus.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Sistema Degradado';
                gatewayStatus.className = 'badge bg-warning-subtle text-warning border border-warning-subtle';
            } else {
                gatewayStatus.innerHTML = '<i class="bi bi-x-circle-fill"></i> Sistema Offline';
                gatewayStatus.className = 'badge bg-danger-subtle text-danger border border-danger-subtle';
            }
        }
        
        // Atualizar versão do gateway
        const gatewayVersion = document.getElementById('gateway-version');
        if (gatewayVersion && data.gateway) {
            gatewayVersion.textContent = data.gateway.version || 'v1.0.0';
        }
        
        // Renderizar serviços e endpoints
        if (data.services) {
            renderServices(data.services, data.metrics);
            renderEndpoints(data.services);
        }
        
        // Renderizar propriedades do node
        if (data.gateway) {
            renderNodeProperties(data.gateway);
        }
        
        // Atualizar título com status
        const statusIcon = data.status === 'OK' ? '✅' : (activeCount > 0 ? '⚠️' : '❌');
        document.title = `${statusIcon} Gateway JTI | ${activeCount}/${totalCount} APIs Online`;
        
        // Atualizar favicon dinamicamente (opcional)
        updateFavicon(data.status === 'OK');
        
    } catch (error) {
        console.error('Erro ao verificar serviços:', error);
        
        const activeEl = document.getElementById('active-services');
        if (activeEl) activeEl.textContent = '0/0';
        
        const gatewayStatus = document.getElementById('gateway-status');
        if (gatewayStatus) {
            gatewayStatus.innerHTML = '<i class="bi bi-plug-fill"></i> Conexão Perdida';
            gatewayStatus.className = 'badge bg-danger-subtle text-danger border border-danger-subtle';
        }
        
        // Mostrar mensagem de erro na página
        const servicesGrid = document.getElementById('services-grid');
        if (servicesGrid && servicesGrid.children.length === 0) {
            servicesGrid.innerHTML = `
                <div class="api-card" style="grid-column: 1/-1; text-align: center;">
                    <i class="bi bi-wifi-off" style="font-size: 3rem; color: var(--accent-red);"></i>
                    <h4 class="mt-3">Erro de Conexão</h4>
                    <p class="text-secondary">Não foi possível conectar ao gateway. Verifique se o serviço está rodando.</p>
                    <button class="btn btn-primary btn-sm mt-2" onclick="location.reload()">
                        <i class="bi bi-arrow-repeat"></i> Tentar novamente
                    </button>
                </div>
            `;
        }
        
        document.title = `❌ Gateway JTI | Offline`;
    }
}

// ========== ATUALIZAR FAVICON ==========
function updateFavicon(isHealthy) {
    let favicon = document.querySelector("link[rel*='icon']");
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
    }
    
    // Usar emoji como favicon alternativo (funciona na maioria dos browsers)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = isHealthy ? '#10b981' : '#ef4444';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.fillText(isHealthy ? '✓' : '✗', 8, 24);
    
    favicon.href = canvas.toDataURL();
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
    // Atualizar data/hora a cada segundo
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Primeira verificação
    checkServices();
    
    // Verificar periodicamente
    setInterval(checkServices, REFRESH_INTERVAL);
    
    // Ciclo de títulos da aba
    const titles = ['Gateway API JTI', 'Roteamento Inteligente', 'APIs Unificadas', 'Monitoramento'];
    let titleIndex = 0;
    setInterval(() => {
        if (!document.title.includes('✅') && !document.title.includes('⚠️') && !document.title.includes('❌')) {
            titleIndex = (titleIndex + 1) % titles.length;
            document.title = titles[titleIndex] + ' | JTI';
        }
    }, 3000);
    
    // Adicionar listener para tecla F5 (recarregar dados sem recarregar página)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault();
            checkServices();
            const toast = document.createElement('div');
            toast.className = 'position-fixed bottom-0 end-0 p-3';
            toast.style.zIndex = '9999';
            toast.innerHTML = `
                <div class="toast show" role="alert">
                    <div class="toast-header bg-dark text-white">
                        <i class="bi bi-arrow-repeat me-2"></i>
                        <strong class="me-auto">Gateway JTI</strong>
                        <small>agora</small>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                    </div>
                    <div class="toast-body bg-dark text-white">
                        Dados atualizados com sucesso!
                    </div>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    });
});

// ========== EXPORTAR PARA DEBUG (OPCIONAL) ==========
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkServices, renderServices, renderEndpoints };
}