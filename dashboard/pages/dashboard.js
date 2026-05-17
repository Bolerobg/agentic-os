let healthChart = null;

async function renderDashboard() {
  const content = document.getElementById('pageContent');
  let status;
  try {
    status = await api.getStatus();
  } catch {
    content.innerHTML = '<div class="empty-state"><div class="icon">⚠</div><h3>Cannot connect to server</h3><p>Make sure server.py is running</p></div>';
    return;
  }

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">System overview and quick actions</p>
      </div>
      <button class="btn btn-primary" onclick="refreshDashboard()">⟳ Refresh</button>
    </div>

    <div class="grid grid-4" id="statCards">
      <div class="card"><div class="card-value" id="agentsOnline">-</div><div class="card-label">Agents Online</div></div>
      <div class="card"><div class="card-value" id="skillsCount">-</div><div class="card-label">Skills Available</div></div>
      <div class="card"><div class="card-value" id="systemUptime">-</div><div class="card-label">System Uptime</div></div>
      <div class="card"><div class="card-value" id="healthStatus">-</div><div class="card-label">Health Status</div></div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Agent Status</span>
        </div>
        <div id="agentList"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Quick Run</span>
        </div>
        <div class="form-group">
          <label class="form-label">Select Skill</label>
          <select id="quickSkillSelect"></select>
        </div>
        <div class="form-group">
          <label class="form-label">Input (optional)</label>
          <textarea id="quickSkillInput" rows="2" placeholder="Optional input for the skill..."></textarea>
        </div>
        <button class="btn btn-primary" onclick="quickRunSkill()">▶ Run Skill</button>
        <div id="quickRunResult" style="margin-top:12px"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Recent Activity</span>
      </div>
      <div id="recentActivity"><div class="loading">Loading...</div></div>
    </div>
  `;

  // Fill stat cards
  const agents = status.agents || [];
  document.getElementById('agentsOnline').textContent = `${agents.filter(a => a.status === 'online').length}/${agents.length}`;
  document.getElementById('skillsCount').textContent = status.skills_count || 0;
  document.getElementById('systemUptime').textContent = status.uptime ? Math.floor((Date.now()/1000 - status.uptime) / 60) + ' min' : '-';
  document.getElementById('healthStatus').textContent = status.status === 'healthy' ? 'Healthy' : 'Degraded';
  document.getElementById('healthStatus').style.color = status.status === 'healthy' ? 'var(--green)' : 'var(--red)';

  // Agent list
  const agentList = document.getElementById('agentList');
  agents.forEach(a => {
    agentList.innerHTML += `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div class="status-dot ${a.status}"></div>
        <strong>${a.name}</strong>
        <span style="color:var(--text2);font-size:12px">${a.status}</span>
      </div>
    `;
  });

  // Skill select
  try {
    const skills = await api.getSkills();
    const select = document.getElementById('quickSkillSelect');
    skills.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      select.appendChild(opt);
    });
  } catch {}

  // Recent activity
  try {
    const audit = await api.getAudit(10);
    const activity = document.getElementById('recentActivity');
    if (audit.entries && audit.entries.length > 0) {
      activity.innerHTML = audit.entries.reverse().map(e => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border)">
          <span style="color:var(--text2);font-size:11px">${formatDate(e.timestamp)}</span>
          <span class="badge badge-info">${e.action}</span>
          <span>${e.skill || e.file || ''}</span>
        </div>
      `).join('');
    } else {
      activity.innerHTML = '<div class="empty-state" style="padding:20px"><span>No activity yet</span></div>';
    }
  } catch {}
}

async function quickRunSkill() {
  const select = document.getElementById('quickSkillSelect');
  const input = document.getElementById('quickSkillInput');
  const result = document.getElementById('quickRunResult');
  if (!select.value) { showToast('Select a skill first', 'error'); return; }
  result.innerHTML = '<span style="color:var(--text2)">Running...</span>';
  try {
    const r = await api.runSkill(select.value, input.value);
    result.innerHTML = `<span style="color:var(--green)">✓ ${r.message}</span>`;
    showToast(`Skill '${select.value}' dispatched to ${r.agent}`, 'success');
  } catch (err) {
    result.innerHTML = `<span style="color:var(--red)">✗ ${err.message}</span>`;
  }
}

async function refreshDashboard() {
  showToast('Refreshing dashboard...', 'info');
  renderDashboard();
}
