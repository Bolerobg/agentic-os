const pageCache = {};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (pageCache[src]) { resolve(pageCache[src]); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => { pageCache[src] = true; resolve(); };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

async function navigate(page) {
  const hash = page || window.location.hash.slice(1) || 'dashboard';
  const content = document.getElementById('pageContent');

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.querySelector(`[data-page="${hash}"]`);
  if (navItem) navItem.classList.add('active');

  content.innerHTML = '<div class="loading">Loading...</div>';

  try {
    switch (hash) {
      case 'dashboard':
        content.innerHTML = '<div class="loading">Loading dashboard...</div>';
        await loadScript('pages/dashboard.js');
        content.innerHTML = '';
        renderDashboard();
        break;
      case 'skills':
        content.innerHTML = '<div class="loading">Loading skills...</div>';
        await loadScript('pages/skills.js');
        content.innerHTML = '';
        renderSkills();
        break;
      case 'memory':
        content.innerHTML = '<div class="loading">Loading memory...</div>';
        await loadScript('pages/memory.js');
        content.innerHTML = '';
        renderMemory();
        break;
      case 'scheduler':
        content.innerHTML = '<div class="loading">Loading scheduler...</div>';
        await loadScript('pages/scheduler.js');
        content.innerHTML = '';
        renderScheduler();
        break;
      case 'audit':
        content.innerHTML = '<div class="loading">Loading audit...</div>';
        await loadScript('pages/audit.js');
        content.innerHTML = '';
        renderAudit();
        break;
      case 'cost':
        content.innerHTML = '<div class="loading">Loading cost analytics...</div>';
        await loadScript('pages/cost-analytics.js');
        content.innerHTML = '';
        renderCostAnalytics();
        break;
      case 'plugins':
        content.innerHTML = '<div class="loading">Loading plugins...</div>';
        await loadScript('pages/plugins.js');
        content.innerHTML = '';
        renderPlugins();
        break;
      case 'backups':
        content.innerHTML = '<div class="loading">Loading backups...</div>';
        await loadScript('pages/backups.js');
        content.innerHTML = '';
        renderBackups();
        break;
      case 'prompts':
        content.innerHTML = '<div class="loading">Loading prompts...</div>';
        await loadScript('pages/prompts.js');
        content.innerHTML = '';
        renderPrompts();
        break;
      case 'standards':
        content.innerHTML = '<div class="loading">Loading standards...</div>';
        await loadScript('pages/standards.js');
        content.innerHTML = '';
        renderStandards();
        break;
      case 'settings':
        content.innerHTML = '<div class="loading">Loading settings...</div>';
        await loadScript('pages/settings.js');
        content.innerHTML = '';
        renderSettings();
        break;
      default:
        content.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><h3>Page not found</h3></div>';
    }
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="icon">⚠</div><h3>Error loading page</h3><p>${escapeHtml(err.message)}</p></div>`;
    console.error(err);
  }
}

async function updateAgentStatus() {
  try {
    const status = await api.getStatus();
    const el = document.getElementById('agentStatus');
    const agents = status.agents || [];
    const allOnline = agents.every(a => a.status === 'online');
    const anyOnline = agents.some(a => a.status === 'online');
    el.innerHTML = `
      <div class="status-dot ${allOnline ? 'online' : anyOnline ? 'warning' : 'offline'}"></div>
      <span>${agents.filter(a => a.status === 'online').length}/${agents.length} agents online</span>
    `;
  } catch {
    document.getElementById('agentStatus').innerHTML = '<div class="status-dot offline"></div><span>Offline</span>';
  }
}

window.addEventListener('hashchange', () => navigate());
window.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  navigate(window.location.hash.slice(1) || 'dashboard');
  updateAgentStatus();
  setInterval(updateAgentStatus, 30000);
});
