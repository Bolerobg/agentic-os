// 4. Agent Configuration & Capability Matrix
async function renderAgentConfig() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agent Configuration</h1>
        <p class="page-subtitle">Capability matrix, model configs, API key status & rate limits</p>
      </div>
      <button class="btn" onclick="renderAgentConfig()">🔄 Refresh</button>
    </div>
    <div id="configAgents" class="grid grid-2 mb-4"></div>
  `;

  try {
    const [configData, statusData] = await Promise.all([
      api.getAgentConfigs(),
      api.getStatus(),
    ]);

    const agents = configData.agents || [];
    const statuses = statusData.agents || [];
    const statusMap = {};
    statuses.forEach(s => { statusMap[s.name] = s.status; });

    const agentIcons = { opencode: '🔧', hermes: '⚡', gemini: '🧠', jcode: '⚡' };
    const agentColors = { opencode: 'purple', hermes: 'green', gemini: 'blue', jcode: 'yellow' };

    document.getElementById('configAgents').innerHTML = agents.map(a => {
      const isOnline = statusMap[a.name] === 'online';
      return `
      <div class="card" style="border-left:3px solid var(--${agentColors[a.name] || 'accent'})">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span style="font-size:24px">${agentIcons[a.name] || '🤖'}</span>
            <div><strong style="font-size:15px">${escapeHtml(a.display_name || a.name)}</strong><div style="font-size:11px;color:var(--text-muted)">${escapeHtml(a.description || '')}</div></div>
          </div>
          <label class="switch"><input type="checkbox" ${a.enabled ? 'checked' : ''} onchange="toggleAgent('${a.name}', this.checked)"><span class="switch-slider"></span></label>
        </div>
        <div class="grid grid-2" style="gap:10px;margin-bottom:12px">
          <div><span class="text-sm text-muted">Model:</span> <code style="font-size:11px">${escapeHtml(a.default_model || '—')}</code></div>
          <div><span class="text-sm text-muted">Provider:</span> <span class="badge badge-accent">${escapeHtml(a.provider || '—')}</span></div>
          <div><span class="text-sm text-muted">Context Window:</span> <span>${(a.context_window || 0).toLocaleString()} tokens</span></div>
          <div><span class="text-sm text-muted">API Key:</span> <span class="agent-dot ${a.api_key_status === 'ok' ? 'online' : 'offline'}" style="display:inline-block"></span> ${escapeHtml(a.api_key_status || 'unknown')}</div>
          <div><span class="text-sm text-muted">Rate Limit:</span> <span>${a.rate_limit ? a.rate_limit + '/min' : 'unlimited'}</span></div>
          <div><span class="text-sm text-muted">Status:</span> ${isOnline ? '<span class="badge badge-success">online</span>' : '<span class="badge badge-danger">offline</span>'}</div>
        </div>
        <div style="margin-bottom:8px"><span class="text-sm text-muted">Capabilities:</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${(a.capabilities || []).map(c => `<span class="badge badge-info" style="font-size:10px">${c.replace(/_/g, ' ')}</span>`).join('')}
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
          <button class="btn btn-sm" onclick="editAgentConfig('${a.name}')">⚙ Configure</button>
          <button class="btn btn-sm" style="margin-left:6px" onclick="navigate('performance-kpis')">📊 View KPIs</button>
        </div>
      </div>`;
    }).join('');

  } catch (err) {
    document.getElementById('configAgents').innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div></div>`;
  }
}

async function toggleAgent(name, enabled) {
  try {
    await api.updateAgentConfig(name, { enabled });
    showToast(`${name} ${enabled ? 'enabled' : 'disabled'}`, 'success');
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function editAgentConfig(name) {
  try {
    const config = await api.getAgentConfig(name);
    showModal(`Configure: ${config.display_name || name}`, `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Model</label><input id="cfgModel" class="form-input" value="${escapeHtml(config.default_model || '')}"></div>
        <div class="form-group"><label class="form-label">Rate Limit (req/min)</label><input id="cfgRate" class="form-input" type="number" value="${config.rate_limit || 0}"></div>
      </div>
      <div class="form-group"><label class="form-label">API Key Status</label>
        <select id="cfgKeyStatus" class="form-select">
          <option value="ok" ${config.api_key_status === 'ok' ? 'selected' : ''}>OK</option>
          <option value="missing" ${config.api_key_status === 'missing' ? 'selected' : ''}>Missing</option>
          <option value="expired" ${config.api_key_status === 'expired' ? 'selected' : ''}>Expired</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Capabilities (comma-separated)</label>
        <input id="cfgCaps" class="form-input" value="${escapeHtml((config.capabilities || []).join(', '))}">
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveAgentConfig('${name}')">Save</button>
    `);
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function saveAgentConfig(name) {
  const model = document.getElementById('cfgModel').value.trim();
  const rate = parseInt(document.getElementById('cfgRate').value) || 0;
  const keyStatus = document.getElementById('cfgKeyStatus').value;
  const caps = document.getElementById('cfgCaps').value.split(',').map(s => s.trim()).filter(Boolean);
  try {
    await api.updateAgentConfig(name, { default_model: model, rate_limit: rate, api_key_status: keyStatus, capabilities: caps });
    closeModal();
    showToast('Config saved', 'success');
    renderAgentConfig();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}
