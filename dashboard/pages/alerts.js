// 8. Alerting & Notification Center
async function renderAlerts() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Alerting Center</h1>
        <p class="page-subtitle">Configurable alerts for agent failures, costs, rate limits & error spikes</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="showAddAlertRule()">+ New Rule</button>
        <button class="btn btn-warning" onclick="testAlert()">🔔 Test Alert</button>
        <button class="btn" onclick="renderAlerts()">🔄 Refresh</button>
      </div>
    </div>
    <div id="alertStats" class="grid grid-3 mb-4"></div>
    <div class="section-title">Alert Rules</div>
    <div id="alertRules"></div>
    <div class="section-title mt-4">Alert History</div>
    <div id="alertHistory"></div>
  `;

  try {
    const data = await api.getAlertRules();
    const rules = data.rules || [];
    const history = data.history || [];
    const unread = history.filter(a => !a.read).length;

    document.getElementById('alertStats').innerHTML = `
      <div class="card stat-card"><div class="stat-icon red">🔔</div><div class="stat-value">${unread}</div><div class="stat-label">Unread Alerts</div>${unread > 0 ? '<div class="stat-change down">needs attention</div>' : ''}</div>
      <div class="card stat-card"><div class="stat-icon purple">📋</div><div class="stat-value">${rules.length}</div><div class="stat-label">Active Rules</div></div>
      <div class="card stat-card"><div class="stat-icon blue">📊</div><div class="stat-value">${history.length}</div><div class="stat-label">Total Events</div></div>
    `;

    // Rules
    if (rules.length === 0) {
      document.getElementById('alertRules').innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">🔕</div><div class="empty-state-title">No alert rules</div><div class="empty-state-desc">Create rules to get notified about important events</div></div>';
    } else {
      const typeIcons = { agent_down: '🔴', high_cost: '💰', rate_limit: '⏱', error_spike: '📈', skill_failure: '⚡' };
      document.getElementById('alertRules').innerHTML = `
        <div class="table-wrapper"><table><thead><tr><th>Name</th><th>Type</th><th>Threshold</th><th>Agent</th><th>Channels</th><th>Status</th><th>Triggers</th><th></th></tr></thead><tbody>
          ${rules.map(r => `
            <tr>
              <td><strong>${escapeHtml(r.name)}</strong></td>
              <td>${typeIcons[r.type] || '⚠'} ${r.type?.replace(/_/g, ' ') || ''}</td>
              <td>${r.threshold || '—'}</td>
              <td>${r.agent || 'all'}</td>
              <td>${(r.channels || []).map(c => `<span class="badge badge-info">${c}</span>`).join(' ') || '<span class="text-muted">default</span>'}</td>
              <td><span class="badge ${r.enabled ? 'badge-success' : 'badge-warning'}">${r.enabled ? 'Active' : 'Paused'}</span></td>
              <td>${r.trigger_count || 0}</td>
              <td><button class="btn btn-sm btn-danger" onclick="deleteAlertRule('${r.id}')">✕</button></td>
            </tr>
          `).join('')}
        </tbody></table></div>
      `;
    }

    // History
    if (history.length === 0) {
      document.getElementById('alertHistory').innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">📭</div><div class="empty-state-title">No alert history</div></div>';
    } else {
      const severityColors = { critical: 'var(--red)', warning: 'var(--yellow)', info: 'var(--blue)' };
      document.getElementById('alertHistory').innerHTML = `
        <div class="event-list">
          ${history.slice(-20).reverse().map(a => `
            <div class="event-item" style="${a.read ? '' : 'background:var(--accent-glow)'}">
              <div class="event-dot" style="background:${severityColors[a.severity] || 'var(--accent)'}"></div>
              <div class="event-content">
                <div class="event-title">${escapeHtml(a.message || a.type || 'Alert')}</div>
                <div class="event-meta">${a.type || ''} · ${a.severity || 'info'}</div>
              </div>
              <div class="event-time">${timeAgo(a.timestamp)}</div>
            </div>
          `).join('')}
        </div>
        ${unread > 0 ? `<div style="text-align:right;margin-top:8px"><button class="btn btn-sm" onclick="markAlertsRead()">✓ Mark all read</button></div>` : ''}
      `;
    }

  } catch (err) {
    document.getElementById('alertRules').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function showAddAlertRule() {
  showModal('New Alert Rule', `
    <div class="form-group"><label class="form-label">Rule Name</label><input id="alertName" class="form-input" placeholder="e.g., Agent Down Alert"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Alert Type</label>
        <select id="alertType" class="form-select">
          <option value="agent_down">Agent Down</option>
          <option value="high_cost">High Cost</option>
          <option value="rate_limit">Rate Limit Hit</option>
          <option value="error_spike">Error Spike</option>
          <option value="skill_failure">Skill Failure</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Agent</label>
        <select id="alertAgent" class="form-select">
          <option value="">All Agents</option>
          <option value="opencode">opencode</option>
          <option value="hermes">Hermes</option>
          <option value="gemini">Gemini</option>
          <option value="jcode">jcode</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Threshold</label><input id="alertThreshold" class="form-input" type="number" value="3" placeholder="3"></div>
      <div class="form-group"><label class="form-label">Channels (comma)</label><input id="alertChannels" class="form-input" placeholder="email, slack, webhook"></div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createAlertRule()">Create Rule</button>
  `);
}

async function createAlertRule() {
  const name = document.getElementById('alertName').value.trim();
  const type = document.getElementById('alertType').value;
  const agent = document.getElementById('alertAgent').value;
  const threshold = parseFloat(document.getElementById('alertThreshold').value) || 0;
  const channels = document.getElementById('alertChannels').value.split(',').map(s => s.trim()).filter(Boolean);
  if (!name) { showToast('Name required', 'warning'); return; }
  try {
    await api.createAlertRule({ name, type, threshold, agent, channels });
    closeModal();
    showToast('Rule created', 'success');
    renderAlerts();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function deleteAlertRule(ruleId) {
  if (!confirm('Delete this alert rule?')) return;
  try { await api.deleteAlertRule(ruleId); showToast('Deleted', 'success'); renderAlerts(); }
  catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function testAlert() {
  try { await api.testAlert(); showToast('Test alert sent', 'success'); renderAlerts(); }
  catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function markAlertsRead() {
  try { await api.markAlertsRead(); showToast('Marked all read', 'success'); renderAlerts(); }
  catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}
