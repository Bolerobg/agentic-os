// Agents — Unified agent overview page
async function renderAgents() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agents</h1>
        <p class="page-subtitle">All 4 agents — status, capabilities, performance & quick actions</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="navigate('agent-orchestration')">🎯 Orchestration</button>
        <button class="btn" onclick="navigate('agent-config')">⚙ Config</button>
        <button class="btn" onclick="navigate('performance-kpis')">📊 KPIs</button>
        <button class="btn" onclick="renderAgents()">🔄 Refresh</button>
      </div>
    </div>
    <div id="agentsGrid" class="grid grid-2"></div>
  `;

  try {
    const [status, configs, kpis] = await Promise.all([
      api.getStatus(),
      api.getAgentConfigs().catch(() => ({ agents: [] })),
      api.getAgentKpis().catch(() => ({ agents: {} })),
    ]);

    const agents = status.agents || [];
    const agentConfigs = configs.agents || [];
    const agentKpis = kpis.agents || {};
    const agentIcons = { opencode: '🔧', hermes: '⚡', gemini: '🧠', jcode: '⚡' };
    const agentColors = { opencode: 'purple', hermes: 'green', gemini: 'blue', jcode: 'yellow' };
    const agentNames = { opencode: 'OpenCode', hermes: 'Hermes', gemini: 'Gemini CLI', jcode: 'jcode' };

    document.getElementById('agentsGrid').innerHTML = agents.map(a => {
      const cfg = agentConfigs.find(c => c.name === a.name) || {};
      const kpi = agentKpis[a.name] || {};
      const sc = statusColor(a.status);
      const sr = kpi.success_rate || 100;
      const caps = cfg.capabilities || [];
      const color = agentColors[a.name] || 'accent';
      const icon = agentIcons[a.name] || '🤖';
      const name = agentNames[a.name] || a.name;

      return `
      <div class="card" style="border-left:3px solid var(--${color});position:relative;overflow:hidden">
        <div style="position:absolute;top:-30px;right:-15px;font-size:80px;opacity:0.04">${icon}</div>
        
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div style="width:44px;height:44px;border-radius:var(--radius);background:var(--${color}-dim);display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--${color})">${icon}</div>
            <div>
              <div style="font-size:16px;font-weight:700">${name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${cfg.description || ''}</div>
            </div>
          </div>
          <div style="text-align:right">
            <span class="badge ${a.status === 'online' ? 'badge-success' : a.status === 'warning' ? 'badge-warning' : 'badge-danger'}" style="font-size:11px">${a.status}</span>
            ${kpi.total_runs > 0 ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">${kpi.total_runs} runs</div>` : ''}
          </div>
        </div>

        <!-- Stats row -->
        <div class="grid grid-4" style="gap:8px;margin-bottom:12px">
          <div style="text-align:center;background:var(--bg-secondary);border-radius:8px;padding:8px 4px">
            <div style="font-size:16px;font-weight:700;color:${sr >= 95 ? 'var(--green)' : sr >= 80 ? 'var(--yellow)' : 'var(--red)'}">${sr}%</div>
            <div style="font-size:9px;color:var(--text-muted)">Success</div>
          </div>
          <div style="text-align:center;background:var(--bg-secondary);border-radius:8px;padding:8px 4px">
            <div style="font-size:16px;font-weight:700;color:var(--accent-light)">${kpi.avg_response_ms ? (kpi.avg_response_ms / 1000).toFixed(1) + 's' : '—'}</div>
            <div style="font-size:9px;color:var(--text-muted)">Avg Time</div>
          </div>
          <div style="text-align:center;background:var(--bg-secondary);border-radius:8px;padding:8px 4px">
            <div style="font-size:16px;font-weight:700;color:var(--blue)">${(kpi.total_tokens || 0).toLocaleString()}</div>
            <div style="font-size:9px;color:var(--text-muted)">Tokens</div>
          </div>
          <div style="text-align:center;background:var(--bg-secondary);border-radius:8px;padding:8px 4px">
            <div style="font-size:16px;font-weight:700;color:var(--yellow)">$${(kpi.total_cost || 0).toFixed(4)}</div>
            <div style="font-size:9px;color:var(--text-muted)">Cost</div>
          </div>
        </div>

        <!-- Model & Provider -->
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;font-size:11px">
          <span class="badge badge-accent">${cfg.provider || '—'}</span>
          <code style="color:var(--text-muted);font-size:10px">${cfg.default_model || '—'}</code>
          <span style="margin-left:auto;color:var(--text-muted);font-size:10px">${(cfg.context_window || 0).toLocaleString()} ctx</span>
        </div>

        <!-- Capabilities -->
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">
          ${caps.map(c => `<span class="badge badge-info" style="font-size:9px;padding:1px 6px">${c.replace(/_/g, ' ')}</span>`).join('')}
          ${caps.length === 0 ? '<span class="text-sm text-muted">No capabilities listed</span>' : ''}
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:6px;padding-top:10px;border-top:1px solid var(--border)">
          <button class="btn btn-sm" onclick="navigate('agent-config')">⚙ Configure</button>
          <button class="btn btn-sm" onclick="navigate('performance-kpis')">📊 KPIs</button>
          <button class="btn btn-sm" onclick="navigate('conversation-inspector')">💬 Chats</button>
          ${a.status === 'online' 
            ? `<button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="quickChat('${a.name}')">💬 Chat</button>`
            : `<button class="btn btn-sm" disabled style="margin-left:auto">Offline</button>`
          }
        </div>
      </div>`;
    }).join('');

  } catch (err) {
    document.getElementById('agentsGrid').innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Connection Error</div><div class="empty-state-desc">${escapeHtml(err.message)}</div><button class="btn btn-primary mt-3" onclick="renderAgents()">Retry</button></div></div>`;
  }
}

function quickChat(agent) {
  navigate('chat');
  setTimeout(() => selectAgent(agent), 300);
}
