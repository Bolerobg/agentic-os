// Dashboard — Professional Command Center
let dashInterval = null;
let dashWidgets = { stats: true, agents: true, activity: true, cost_chart: true, alerts: true, system_health: true, quick_actions: true };

async function renderDashboard() {
  if (dashInterval) clearInterval(dashInterval);

  // Load widget config
  try { const cfg = await api.getDashboardConfig(); dashWidgets = cfg.widgets || dashWidgets; } catch {}

  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Command Center</h1>
        <p class="page-subtitle">Agentic OS — real-time multi-agent orchestration overview  <span class="agent-dot online" style="display:inline-block;width:8px;height:8px;vertical-align:middle;margin-left:6px"></span> <span style="font-size:10px;color:var(--green)" id="dashLiveDot">live</span></p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="navigate('agent-orchestration')">🎯 Orchestration</button>
        <button class="btn" onclick="navigate('task-queue')">📋 Task Queue</button>
        <button class="btn" onclick="navigate('agent-comparison')">🧪 A/B Test</button>
        <button class="btn" onclick="toggleDashWidgets()">⚙ Customize</button>
        <button class="btn" onclick="renderDashboard()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Stat cards row -->
    <div id="dashStats" class="grid grid-4 mb-3"></div>

    <!-- Agent command cards -->
    <div class="section-title">🤖 Agent Command</div>
    <div id="dashAgents" class="grid grid-4 mb-3"></div>

    <!-- Middle row: Activity + Charts -->
    <div class="grid grid-2 mb-3">
      <div class="card" style="max-height:380px;display:flex;flex-direction:column">
        <div class="card-header">
          <span class="card-title">📡 Live Activity</span>
          <button class="btn btn-sm btn-ghost" onclick="renderDashboard()">🔄</button>
        </div>
        <div id="dashActivity" style="flex:1;overflow-y:auto"></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">💰 Cost Trend (7 days)</span></div>
        <div class="chart-container" style="height:180px"><canvas id="dashCostChart"></canvas></div>
        <div id="dashCostSummary" style="display:flex;gap:16px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"></div>
      </div>
    </div>

    <!-- Bottom row: Alerts + System Health -->
    <div class="grid grid-2 mb-3">
      <div class="card">
        <div class="card-header">
          <span class="card-title">🔔 Recent Alerts</span>
          <button class="btn btn-sm" onclick="navigate('alerts')">View All</button>
        </div>
        <div id="dashAlerts"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">🖥 System Health</span>
          <button class="btn btn-sm" onclick="navigate('system-health')">Details</button>
        </div>
        <div id="dashSysHealth"></div>
      </div>
    </div>

    <!-- Quick Actions bar -->
    <div class="card">
      <div class="card-header"><span class="card-title">⚡ Quick Actions</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="navigate('chat')">💬 Chat with Agent</button>
        <button class="btn btn-sm" onclick="navigate('smart-router')">🧭 Smart Route Task</button>
        <button class="btn btn-sm" onclick="navigate('task-queue')">📝 Create Task</button>
        <button class="btn btn-sm" onclick="navigate('workflows')">🔗 Run Pipeline</button>
        <button class="btn btn-sm" onclick="navigate('agent-config')">⚙ Configure Agents</button>
        <button class="btn btn-sm" onclick="navigate('agent-comparison')">🧪 Compare Agents</button>
        <button class="btn btn-sm" onclick="runQuickSkill()">▶ Quick Run Skill</button>
        <button class="btn btn-sm" onclick="navigate('backups')">💾 Backup</button>
      </div>
    </div>
  `;

  // Add dashboard-specific styles
  if (!document.getElementById('dashStyles')) {
    const style = document.createElement('style');
    style.id = 'dashStyles';
    style.textContent = `
      .agent-cmd-card { cursor:pointer;transition:var(--transition);position:relative;overflow:hidden }
      .agent-cmd-card:hover { border-color:var(--accent);transform:translateY(-2px) }
      .agent-cmd-card::after { content:'';position:absolute;top:0;right:0;width:80px;height:80px;background:radial-gradient(circle,rgba(108,92,231,0.06),transparent 70%);border-radius:50% }
      .sys-gauge { text-align:center }
      .sys-gauge-ring { width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin:0 auto 4px;border:3px solid transparent }
      .activity-item { display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px }
      .activity-item:last-child { border-bottom:none }
      .activity-dot { width:6px;height:6px;border-radius:50%;margin-top:4px;flex-shrink:0 }
      .activity-time { font-size:10px;color:var(--text-muted);white-space:nowrap }
    `;
    document.head.appendChild(style);
  }

  try {
    // Fetch everything in parallel
    const [status, audit, costSummary, alerts, sysHealth, tasks, kpis] = await Promise.all([
      api.getStatus(),
      api.getAudit(20),
      api.getCostSummary().catch(() => ({ total_cost: 0, today_cost: 0, per_agent: {}, daily: [] })),
      api.getAlertRules().catch(() => ({ rules: [], history: [] })),
      api.getSystemHealth().catch(() => ({ has_psutil: false })),
      api.listTasks().catch(() => ({ total: 0, by_agent: {}, columns: {} })),
      api.getAgentKpis().catch(() => ({ agents: {} })),
    ]);

    const agents = status.agents || [];
    const skillsCount = status.skills_count || 0;
    const entries = audit.entries || [];
    const online = agents.filter(a => a.status === 'online').length;
    const totalTasks = tasks.total || 0;
    const runningTasks = (tasks.columns?.running || []).length;
    const pendingTasks = (tasks.columns?.pending || []).length;
    const alertHistory = alerts.history || [];
    const unreadAlerts = alertHistory.filter(a => !a.read).length;
    const daily = costSummary.daily || [];
    const todayCost = costSummary.today_cost || 0;

    // === Stat cards ===
    document.getElementById('dashStats').innerHTML = `
      <div class="card stat-card">
        <div class="stat-icon ${online === agents.length ? 'green' : online > 0 ? 'yellow' : 'red'}">${online === agents.length ? '✓' : online > 0 ? '⚠' : '✕'}</div>
        <div class="stat-value">${online}/${agents.length}</div>
        <div class="stat-label">Agents Online</div>
        <div class="stat-change ${online === agents.length ? 'up' : 'down'}">${online === agents.length ? 'all operational' : `${agents.length - online} offline`}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon blue">📋</div>
        <div class="stat-value">${runningTasks}<span style="font-size:14px;font-weight:400;color:var(--text-muted)">/${totalTasks}</span></div>
        <div class="stat-label">Active / Total Tasks</div>
        <div class="stat-change ${pendingTasks > 0 ? 'down' : 'up'}">${pendingTasks} pending</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon purple">💰</div>
        <div class="stat-value">$${todayCost.toFixed(4)}</div>
        <div class="stat-label">Today's Cost</div>
        <div class="stat-change up">${skillsCount} skills</div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon ${unreadAlerts > 0 ? 'red' : 'green'}">${unreadAlerts > 0 ? '🔔' : '✓'}</div>
        <div class="stat-value">${unreadAlerts}</div>
        <div class="stat-label">Unread Alerts</div>
        <div class="stat-change ${unreadAlerts > 0 ? 'down' : 'up'}">${unreadAlerts > 0 ? 'needs attention' : 'all clear'}</div>
      </div>
    `;

    // === Agent Command Cards ===
    const agentIcons = { opencode: '🔧', hermes: '⚡', gemini: '🧠', jcode: '⚡' };
    const agentColors = { opencode: 'purple', hermes: 'green', gemini: 'blue', jcode: 'yellow' };
    const agentNames = { opencode: 'OpenCode', hermes: 'Hermes', gemini: 'Gemini', jcode: 'jcode' };
    const agentDescs = { opencode: 'Code & DevOps', hermes: 'Memory & Schedule', gemini: 'Research & Analysis', jcode: 'JavaScript & Web' };

    document.getElementById('dashAgents').innerHTML = agents.map(a => {
      const kpi = kpis.agents?.[a.name] || {};
      const color = agentColors[a.name] || 'accent';
      const agentTasks = tasks.by_agent?.[a.name] || 0;
      return `
      <div class="card agent-cmd-card" onclick="navigate('agents')" style="border-top:3px solid var(--${color})">
        <div class="flex items-center gap-2 mb-2">
          <span style="font-size:18px">${agentIcons[a.name] || '🤖'}</span>
          <div style="flex:1"><strong style="font-size:13px">${agentNames[a.name] || a.name}</strong><div style="font-size:10px;color:var(--text-muted)">${agentDescs[a.name] || ''}</div></div>
          <span class="agent-dot ${a.status}" style="width:8px;height:8px" title="${a.status}"></span>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">
          <span class="badge ${(kpi.success_rate || 100) >= 95 ? 'badge-success' : 'badge-warning'}" style="font-size:9px;padding:1px 6px">${kpi.success_rate || 100}% SR</span>
          <span class="badge badge-info" style="font-size:9px;padding:1px 6px">${(kpi.total_tokens || 0).toLocaleString()} tok</span>
          <span class="badge badge-accent" style="font-size:9px;padding:1px 6px">${agentTasks} tasks</span>
        </div>
        <div style="font-size:10px;color:var(--text-muted)">
          ${a.status === 'online' ? 'Ready for tasks' : 'Agent offline'}
          ${kpi.last_24h_runs > 0 ? ` · ${kpi.last_24h_runs} runs today` : ''}
        </div>
      </div>`;
    }).join('');

    // === Activity Feed ===
    if (entries.length === 0) {
      document.getElementById('dashActivity').innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">📭</div><div class="empty-state-title" style="font-size:13px">No activity yet</div></div>';
    } else {
      const actionIcons = { skill_run: '⚡', chat_message: '💬', chat_stream: '💬', task_created: '📝', job_created: '⏱', backup_created: '💾', scheduler_run: '⏱', agent_health_refreshed: '🏥', skill_generated: '🆕', workflow_created: '🔗', workflow_run: '▶' };
      const actionColors = { skill_run: 'var(--accent)', chat_message: 'var(--blue)', chat_stream: 'var(--blue)', task_created: 'var(--yellow)', job_created: 'var(--purple)', backup_created: 'var(--green)', error: 'var(--red)' };

      document.getElementById('dashActivity').innerHTML = entries.slice(0, 12).map(e => `
        <div class="activity-item">
          <div class="activity-dot" style="background:${actionColors[e.action] || 'var(--text-muted)'}"></div>
          <div style="flex:1">
            <span style="font-weight:500">${actionIcons[e.action] || ''} ${escapeHtml(e.action || 'event')}</span>
            ${e.skill ? `<span style="color:var(--accent-light)">: ${escapeHtml(e.skill)}</span>` : ''}
            ${e.title ? `<span style="color:var(--text-secondary)"> — ${escapeHtml(e.title)}</span>` : ''}
            ${e.agent ? `<span class="badge badge-accent" style="font-size:8px;padding:1px 5px;margin-left:4px">${e.agent}</span>` : ''}
          </div>
          <div class="activity-time">${timeAgo(e.timestamp)}</div>
        </div>
      `).join('');
    }

    // === Cost Chart ===
    if (daily.length > 0 && typeof Chart !== 'undefined') {
      const costCtx = document.getElementById('dashCostChart');
      if (costCtx) {
        new Chart(costCtx, {
          type: 'bar',
          data: {
            labels: daily.map(d => d.date.slice(5)),
            datasets: [{
              data: daily.map(d => d.cost),
              backgroundColor: daily.map((d, i) => i === daily.length - 1 ? 'var(--accent)' : 'var(--accent-glow)'),
              borderRadius: 4,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => '$' + ctx.raw.toFixed(6) } } },
            scales: { y: { ticks: { color: 'var(--text-muted)', callback: v => '$' + v, font: { size: 9 } } }, x: { ticks: { color: 'var(--text-muted)', font: { size: 9 } } } },
          },
        });
      }

      // Cost breakdown
      const perAgent = costSummary.per_agent || {};
      const maxCost = Math.max(...Object.values(perAgent), 0.01);
      document.getElementById('dashCostSummary').innerHTML = Object.entries(perAgent).map(([agent, cost]) => {
        const pct = (cost / maxCost * 100).toFixed(0);
        return `<div style="flex:1;font-size:11px">
          <div class="flex items-center justify-between mb-1"><span style="text-transform:capitalize">${agent}</span><span>$${cost.toFixed(4)}</span></div>
          <div style="height:4px;background:var(--bg-dim);border-radius:99px"><div style="width:${pct}%;height:100%;background:var(--accent);border-radius:99px"></div></div>
        </div>`;
      }).join('');
    }

    // === Alerts ===
    if (alertHistory.length === 0) {
      document.getElementById('dashAlerts').innerHTML = '<div class="empty-state" style="padding:16px"><span style="font-size:13px;color:var(--green)">✅ No alerts — all clear</span></div>';
    } else {
      const severityColors = { critical: 'var(--red)', warning: 'var(--yellow)', info: 'var(--blue)' };
      document.getElementById('dashAlerts').innerHTML = alertHistory.slice(-5).reverse().map(a => `
        <div class="activity-item" style="${a.read ? '' : 'background:var(--accent-glow);border-radius:6px;padding:6px'}">
          <div class="activity-dot" style="background:${severityColors[a.severity] || 'var(--accent)'}"></div>
          <div style="flex:1;font-size:11px">${escapeHtml(a.message || a.type || 'Alert')}</div>
          <div class="activity-time">${timeAgo(a.timestamp)}</div>
        </div>
      `).join('');
    }

    // === System Health Gauges ===
    if (sysHealth.has_psutil) {
      const cpu = sysHealth.cpu?.percent || 0;
      const mem = sysHealth.memory?.percent || 0;
      const disk = sysHealth.disk?.percent || 0;
      const cpuColor = cpu > 80 ? 'var(--red)' : cpu > 50 ? 'var(--yellow)' : 'var(--green)';
      const memColor = mem > 80 ? 'var(--red)' : mem > 50 ? 'var(--yellow)' : 'var(--green)';
      const diskColor = disk > 80 ? 'var(--red)' : disk > 50 ? 'var(--yellow)' : 'var(--green)';

      document.getElementById('dashSysHealth').innerHTML = `
        <div style="display:flex;gap:16px;justify-content:space-around">
          <div class="sys-gauge">
            <div class="sys-gauge-ring" style="border-color:${cpuColor};color:${cpuColor}">${cpu.toFixed(0)}%</div>
            <div style="font-size:10px;color:var(--text-muted)">CPU</div>
            <div style="font-size:9px;color:var(--text-muted)">${sysHealth.cpu?.cores || '?'} cores</div>
          </div>
          <div class="sys-gauge">
            <div class="sys-gauge-ring" style="border-color:${memColor};color:${memColor}">${mem.toFixed(0)}%</div>
            <div style="font-size:10px;color:var(--text-muted)">RAM</div>
            <div style="font-size:9px;color:var(--text-muted)">${sysHealth.memory?.used_gb || 0} / ${sysHealth.memory?.total_gb || 0} GB</div>
          </div>
          <div class="sys-gauge">
            <div class="sys-gauge-ring" style="border-color:${diskColor};color:${diskColor}">${disk.toFixed(0)}%</div>
            <div style="font-size:10px;color:var(--text-muted)">Disk</div>
            <div style="font-size:9px;color:var(--text-muted)">${sysHealth.disk?.free_gb || 0} GB free</div>
          </div>
          <div class="sys-gauge">
            <div class="sys-gauge-ring" style="border-color:var(--accent);color:var(--accent-light)">${sysHealth.process?.uptime_seconds ? Math.floor(sysHealth.process.uptime_seconds / 3600) + 'h' : '?'}</div>
            <div style="font-size:10px;color:var(--text-muted)">Uptime</div>
            <div style="font-size:9px;color:var(--text-muted)">PID ${sysHealth.process?.pid || '?'}</div>
          </div>
        </div>
      `;
    } else {
      document.getElementById('dashSysHealth').innerHTML = '<div class="empty-state" style="padding:16px"><span style="font-size:13px;color:var(--text-muted)">Install psutil for system metrics</span></div>';
    }

  } catch (err) {
    document.getElementById('dashStats').innerHTML = `<div class="card" style="grid-column:1/-1;border-color:var(--red)"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Connection Error</div><div class="empty-state-desc">${escapeHtml(err.message)}</div><button class="btn btn-primary mt-3" onclick="navigate('dashboard')">Retry</button></div></div>`;
  }

  // Auto-refresh every 30 seconds — only when on dashboard
  dashInterval = setInterval(() => {
    if (window.location.hash.replace('#', '') !== 'dashboard') return;
    const dot = document.getElementById('dashLiveDot');
    if (dot) { dot.textContent = 'updating...'; dot.style.color = 'var(--yellow)'; }
    renderDashboard();
  }, 30000);
}

function toggleDashWidgets() {
  const icons = { stats: '📊', agents: '🤖', activity: '📡', cost_chart: '💰', alerts: '🔔', system_health: '🖥', quick_actions: '⚡' };
  const names = { stats: 'Stats Cards', agents: 'Agent Cards', activity: 'Live Activity', cost_chart: 'Cost Chart', alerts: 'Alerts', system_health: 'System Health', quick_actions: 'Quick Actions' };
  const toggles = Object.keys(dashWidgets).map(k =>
    `<label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <span>${icons[k]} ${names[k]}</span>
      <label class="switch"><input type="checkbox" id="dw_${k}" ${dashWidgets[k] ? 'checked' : ''}><span class="switch-slider"></span></label>
    </label>`
  ).join('');

  showModal('Customize Dashboard', `
    <div style="margin-bottom:12px;font-size:12px;color:var(--text-muted)">Toggle which widgets appear on the Command Center</div>
    ${toggles}
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveDashWidgets()">💾 Save Layout</button>
  `);
}

async function saveDashWidgets() {
  Object.keys(dashWidgets).forEach(k => { dashWidgets[k] = document.getElementById('dw_'+k)?.checked ?? true; });
  try {
    await api.updateDashboardConfig({ widgets: dashWidgets });
    closeModal();
    showToast('Layout saved', 'success');
    renderDashboard();
  } catch (err) { showToast(err.message, 'error'); }
}

async function runQuickSkill() {
  showModal('Quick Run Skill', `
    <div class="form-group">
      <label class="form-label">Skill Name</label>
      <select id="qrSkill" class="form-select"><option value="">Loading skills...</option></select>
    </div>
    <div class="form-group">
      <label class="form-label">Input (optional)</label>
      <textarea id="qrInput" class="form-textarea" rows="3" placeholder="Enter input for the skill..."></textarea>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="executeQuickRun()">▶ Run Skill</button>
  `);

  try {
    const skills = await api.getSkills();
    const select = document.getElementById('qrSkill');
    select.innerHTML = '<option value="">Select a skill...</option>';
    skills.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name.replace(/-/g, ' ');
      select.appendChild(opt);
    });
  } catch {}
}

async function executeQuickRun() {
  const name = document.getElementById('qrSkill').value;
  const input = document.getElementById('qrInput').value;
  if (!name) { showToast('Please select a skill', 'warning'); return; }
  try {
    const r = await api.runSkill(name, input);
    closeModal();
    showToast(`"${name}" dispatched to ${r.agent} #${r.run_id}`, 'success');
    setTimeout(() => renderDashboard(), 1500);
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}
