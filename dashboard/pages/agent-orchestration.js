// 1. Real-time Agent Orchestration View
let orchStream = null;

async function renderAgentOrchestration() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-title">Agent Orchestration</div>
        <div class="page-subtitle">Real-time monitoring of agent activities and tasks</div>
      </div>
      <div class="btn-group">
        <label class="switch" title="Live updates (SSE)">
          <input type="checkbox" id="orchLiveToggle" checked onchange="toggleOrchLive()">
          <span class="switch-slider"></span>
        </label>
        <span class="text-sm text-muted">Live</span>
        <button class="btn btn-primary" onclick="renderAgentOrchestration()">🔄 Refresh</button>
        <button class="btn" onclick="navigate('task-queue')">📋 Task Queue</button>
      </div>
    </div>
    <div id="orchStats" class="grid grid-4 mb-3"></div>
    <div id="orchAgents" class="grid grid-2 mb-3"></div>
    <div class="card">
      <div class="card-header"><span class="card-title">📡 Live Event Stream</span><span id="orchLiveDot" style="font-size:10px;color:var(--green)">● connected</span></div>
      <div id="orchEvents" style="max-height:300px;overflow-y:auto;font-family:var(--font-mono);font-size:11px">
        <div class="empty-state" style="padding:20px"><div class="empty-state-icon">📡</div><div class="empty-state-title">Waiting for events...</div></div>
      </div>
    </div>
  `;

  await refreshOrchestration();
  if (document.getElementById('orchLiveToggle')?.checked) startOrchLive();
}

async function refreshOrchestration() {
  try {
    const data = await api.getOrchestrationState();
    const agents = data.agents || {};
    const stats = document.getElementById('orchStats');
    const agentsEl = document.getElementById('orchAgents');
    if (!stats) return;

    const agentNames = Object.keys(agents);
    const totalActive = agentNames.reduce((s, n) => s + (agents[n]?.active_tasks || 0), 0);
    const totalQueued = agentNames.reduce((s, n) => s + (agents[n]?.queued_tasks || 0), 0);
    const onlineCount = agentNames.filter(n => agents[n]?.status === 'online').length;

    stats.innerHTML = `
      <div class="card stat-card"><div class="stat-icon purple">⬡</div><div class="stat-value">${onlineCount}/${agentNames.length}</div><div class="stat-label">Agents Online</div></div>
      <div class="card stat-card"><div class="stat-icon green">▶</div><div class="stat-value">${totalActive}</div><div class="stat-label">Active Tasks</div></div>
      <div class="card stat-card"><div class="stat-icon yellow">⏳</div><div class="stat-value">${totalQueued}</div><div class="stat-label">Queued Tasks</div></div>
      <div class="card stat-card"><div class="stat-icon blue">📊</div><div class="stat-value">${Object.keys(_activeTasks || {}).length || 0}</div><div class="stat-label">Total Tasks</div></div>
    `;

    const agentColors = { opencode: 'purple', hermes: 'green', gemini: 'blue', jcode: 'yellow' };
    const agentIcons = { opencode: '🔧', hermes: '⚡', gemini: '🧠', jcode: '⚡' };

    agentsEl.innerHTML = agentNames.map(name => {
      const a = agents[name] || {};
      const sc = statusColor(a.status);
      const task = a.current_task;
      return `<div class="card" style="border-left:3px solid var(--${agentColors[name] || 'accent'});position:relative;overflow:hidden">
        <div style="position:absolute;top:-15px;right:-10px;font-size:60px;opacity:0.04">${agentIcons[name] || '🤖'}</div>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="agent-dot ${a.status}"></span>
            <strong style="text-transform:capitalize">${name}</strong>
          </div>
          <span class="badge ${a.status === 'online' ? 'badge-success' : a.status === 'warning' ? 'badge-warning' : 'badge-danger'}">${a.status}</span>
        </div>
        <div class="grid grid-3" style="gap:8px;margin-bottom:12px">
          <div style="text-align:center"><div style="font-size:18px;font-weight:700;color:var(--accent-light)">${a.active_tasks || 0}</div><div style="font-size:10px;color:var(--text-muted)">Active</div></div>
          <div style="text-align:center"><div style="font-size:18px;font-weight:700;color:var(--yellow)">${a.queued_tasks || 0}</div><div style="font-size:10px;color:var(--text-muted)">Queued</div></div>
          <div style="text-align:center"><div style="font-size:18px;font-weight:700;color:var(--green)">${a.status === 'online' ? '✓' : '✗'}</div><div style="font-size:10px;color:var(--text-muted)">Healthy</div></div>
        </div>
        ${task ? `<div style="background:var(--bg-secondary);border-radius:6px;padding:8px 10px;font-size:11px">
          <div style="color:var(--accent-light);font-weight:600;margin-bottom:3px">▶ ${escapeHtml(task.title || 'Untitled')}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:4px;background:var(--bg-dim);border-radius:99px"><div style="width:${task.progress || 0}%;height:100%;background:var(--accent);border-radius:99px;transition:width 0.5s"></div></div>
            <span style="font-size:10px;color:var(--text-muted)">${task.progress || 0}%</span>
          </div>
        </div>` : `<div style="color:var(--text-muted);font-size:11px;text-align:center;padding:12px">Idle — waiting for tasks</div>`}
      </div>`;
    }).join('');

  } catch (err) {
    document.getElementById('orchStats').innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div></div>`;
  }
}

function startOrchLive() {
  stopOrchLive();
  try {
    const evtSource = new EventSource('/api/orchestration/stream');
    window._orchSource = evtSource;
    evtSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'event') {
          addOrchEvent(msg.data);
        } else if (msg.type === 'connected') {
          const dot = document.getElementById('orchLiveDot');
          if (dot) { dot.textContent = '● connected'; dot.style.color = 'var(--green)'; }
        }
      } catch {}
    };
    evtSource.onerror = () => {
      const dot = document.getElementById('orchLiveDot');
      if (dot) { dot.textContent = '○ reconnecting...'; dot.style.color = 'var(--yellow)'; }
    };
  } catch {}
}

function stopOrchLive() {
  if (window._orchSource) {
    window._orchSource.close();
    window._orchSource = null;
  }
}

function toggleOrchLive() {
  if (document.getElementById('orchLiveToggle')?.checked) startOrchLive();
  else stopOrchLive();
}

function addOrchEvent(event) {
  const container = document.getElementById('orchEvents');
  if (!container) return;
  const welcome = container.querySelector('.empty-state');
  if (welcome) welcome.remove();

  const icons = {
    task_created: '📝', task_action: '🔄', task_progress: '📊',
    metric_recorded: '📈', workflow_started: '🔗', alert: '🚨'
  };
  const icon = icons[event.type] || '📡';
  const typeLabel = (event.type || '').replace(/_/g, ' ');
  const div = document.createElement('div');
  div.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:flex-start;animation:fadeIn 0.3s ease';
  div.innerHTML = `<span>${icon}</span><span style="color:var(--accent-light)">${typeLabel}</span><span style="color:var(--text-muted);margin-left:auto;font-size:10px">just now</span>`;
  container.insertBefore(div, container.firstChild);

  while (container.children.length > 50) container.lastChild.remove();
}
