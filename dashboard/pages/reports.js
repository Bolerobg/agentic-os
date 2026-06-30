// Reports — Scheduled Reports & Digest
async function renderReports() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Scheduled Reports</h1>
        <p class="page-subtitle">Automated daily/weekly digests — agent activity, costs, errors</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="generateReportNow()">📊 Generate Now</button>
        <button class="btn" onclick="showAddSchedule()">+ Schedule Report</button>
        <button class="btn" onclick="renderReports()">🔄 Refresh</button>
      </div>
    </div>

    <div class="section-title">📅 Report Schedules</div>
    <div id="reportSchedules"></div>

    <div class="section-title mt-4">📋 Recent Reports</div>
    <div id="reportHistory"></div>

    <div id="reportViewer" style="display:none"></div>
  `;

  try {
    const data = await api.getReportConfigs();
    const schedules = data.schedules || [];
    const history = (data.history || []).slice(-10).reverse();

    // Schedules
    if (schedules.length === 0) {
      document.getElementById('reportSchedules').innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">📅</div><div class="empty-state-title">No scheduled reports</div><div class="empty-state-desc">Set up automatic daily or weekly digests</div><button class="btn btn-primary mt-3" onclick="showAddSchedule()">+ Schedule Report</button></div>';
    } else {
      const freqIcons = { daily: '📅', weekly: '📆', monthly: '🗓' };
      document.getElementById('reportSchedules').innerHTML = `
        <div class="grid grid-2" style="gap:12px">
          ${schedules.map(s => `
            <div class="card">
              <div class="flex items-center justify-between mb-2">
                <strong>${freqIcons[s.frequency] || '📊'} ${escapeHtml(s.name)}</strong>
                <span class="badge ${s.enabled ? 'badge-success' : 'badge-warning'}">${s.enabled ? 'Active' : 'Paused'}</span>
              </div>
              <div class="text-sm text-muted mb-2">
                ${s.frequency} · ${s.recipients ? '→ ' + escapeHtml(s.recipients) : 'no recipients'}
              </div>
              <div class="flex gap-1 mb-2" style="flex-wrap:wrap">
                ${(s.include_sections || []).map(sec => `<span class="badge badge-info" style="font-size:9px">${sec}</span>`).join('')}
              </div>
              <div class="text-sm text-muted">
                Sent: ${s.sent_count || 0} · Last: ${s.last_sent ? timeAgo(s.last_sent) : 'never'}
              </div>
              <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;gap:6px">
                <button class="btn btn-sm btn-primary" onclick="sendReportNow('${s.id}')">📤 Send Now</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${s.id}')">Delete</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // History
    if (history.length === 0) {
      document.getElementById('reportHistory').innerHTML = '<div class="empty-state" style="padding:16px"><span style="font-size:13px;color:var(--text-muted)">No reports generated yet</span></div>';
    } else {
      document.getElementById('reportHistory').innerHTML = `
        <div class="table-wrapper"><table><thead><tr><th>Title</th><th>Agents</th><th>Cost</th><th>Tasks</th><th>Generated</th><th></th></tr></thead><tbody>
          ${history.map(r => {
            const s = r.summary || {};
            return `<tr>
              <td><strong>${escapeHtml(r.title || 'Report')}</strong></td>
              <td>${s.agents_online || 0}/${s.agents_total || 0} online</td>
              <td>$${(s.today_cost || 0).toFixed(4)}</td>
              <td>${s.active_tasks || 0} active</td>
              <td style="font-size:12px">${timeAgo(r.generated)}</td>
              <td><button class="btn btn-sm" onclick="viewReport('${r.id}')">📄 View</button></td>
            </tr>`;
          }).join('')}
        </tbody></table></div>
      `;
    }

  } catch (err) {
    document.getElementById('reportSchedules').innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div></div>`;
  }
}

async function generateReportNow() {
  try {
    const report = await api.generateReport();
    showToast('Report generated!', 'success');
    viewReportContent(report);
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

function viewReport(reportId) {
  showToast('Loading report...', 'info');
  // Find in history
  api.getReportConfigs().then(data => {
    const report = (data.history || []).find(r => r.id === reportId);
    if (report) viewReportContent(report);
    else showToast('Report not found', 'error');
  });
}

function viewReportContent(report) {
  const s = report.summary || {};
  const agents = report.agents || {};
  const tasks = report.tasks || {};
  const errors = report.errors || [];
  const topSkills = report.top_skills || [];

  document.getElementById('reportSchedules').style.display = 'none';
  document.getElementById('reportHistory').style.display = 'none';
  const viewer = document.getElementById('reportViewer');
  viewer.style.display = 'block';
  viewer.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3>${escapeHtml(report.title || 'Report')}</h3>
      <button class="btn btn-sm" onclick="renderReports()">← Back</button>
    </div>

    <div class="grid grid-4 mb-3">
      <div class="card stat-card"><div class="stat-icon green">🟢</div><div class="stat-value">${s.agents_online}/${s.agents_total}</div><div class="stat-label">Agents Online</div></div>
      <div class="card stat-card"><div class="stat-icon blue">📋</div><div class="stat-value">${s.active_tasks || 0}</div><div class="stat-label">Active Tasks</div></div>
      <div class="card stat-card"><div class="stat-icon purple">💰</div><div class="stat-value">$${(s.today_cost || 0).toFixed(4)}</div><div class="stat-label">Today's Cost</div></div>
      <div class="card stat-card"><div class="stat-icon ${s.unread_alerts > 0 ? 'red' : 'green'}">${s.unread_alerts > 0 ? '🔔' : '✓'}</div><div class="stat-value">${s.unread_alerts || 0}</div><div class="stat-label">Unread Alerts</div></div>
    </div>

    <div class="card mb-3">
      <div class="card-header"><span class="card-title">🤖 Agent Performance</span></div>
      <div class="table-wrapper"><table><thead><tr><th>Agent</th><th>Status</th><th>Runs Today</th><th>Success</th><th>Tokens</th><th>Cost</th></tr></thead><tbody>
        ${Object.entries(agents).map(([name, a]) => `
          <tr>
            <td><strong style="text-transform:capitalize">${name}</strong></td>
            <td><span class="badge ${a.status === 'online' ? 'badge-success' : 'badge-danger'}">${a.status}</span></td>
            <td>${a.today_runs || 0}</td>
            <td>${a.success_rate || 100}%</td>
            <td>${(a.total_tokens || 0).toLocaleString()}</td>
            <td>$${(a.total_cost || 0).toFixed(4)}</td>
          </tr>
        `).join('')}
      </tbody></table></div>
    </div>

    <div class="grid grid-2 mb-3">
      <div class="card">
        <div class="card-header"><span class="card-title">📋 Tasks</span></div>
        <div style="display:flex;gap:16px;padding:8px 0">
          <div style="text-align:center"><span class="badge badge-warning" style="font-size:14px;padding:4px 12px">${tasks.pending || 0}</span><div style="font-size:10px;color:var(--text-muted);margin-top:2px">Pending</div></div>
          <div style="text-align:center"><span class="badge badge-accent" style="font-size:14px;padding:4px 12px">${tasks.running || 0}</span><div style="font-size:10px;color:var(--text-muted);margin-top:2px">Running</div></div>
          <div style="text-align:center"><span class="badge badge-success" style="font-size:14px;padding:4px 12px">${tasks.completed || 0}</span><div style="font-size:10px;color:var(--text-muted);margin-top:2px">Done</div></div>
          <div style="text-align:center"><span class="badge badge-danger" style="font-size:14px;padding:4px 12px">${tasks.failed || 0}</span><div style="font-size:10px;color:var(--text-muted);margin-top:2px">Failed</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">⚡ Top Skills</span></div>
        ${topSkills.length === 0 ? '<div class="empty-state" style="padding:12px"><span style="font-size:12px;color:var(--text-muted)">No skill data</span></div>' : topSkills.map(sk => `
          <div class="flex items-center justify-between" style="padding:6px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:12px">${escapeHtml(sk.name)}</span>
            <span class="badge badge-accent">${sk.runs} runs · ${(sk.avg_score * 100).toFixed(0)}%</span>
          </div>
        `).join('')}
      </div>
    </div>

    ${errors.length > 0 ? `
    <div class="card">
      <div class="card-header"><span class="card-title">⚠ Recent Errors</span></div>
      ${errors.map(e => `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px"><span class="badge badge-danger" style="margin-right:6px">${escapeHtml(e.category || '')}</span>${escapeHtml(e.message || '')}</div>`).join('')}
    </div>` : ''}
  `;
}

function showAddSchedule() {
  showModal('Schedule Report', `
    <div class="form-group"><label class="form-label">Name</label><input id="schedName" class="form-input" placeholder="e.g., Daily Morning Digest"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Frequency</label>
        <select id="schedFreq" class="form-select"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
      </div>
      <div class="form-group"><label class="form-label">Recipients (comma-separated)</label>
        <input id="schedRecipients" class="form-input" placeholder="admin@example.com, team@slack.com">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Sections</label>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <label><input type="checkbox" checked onchange="window._schedSections=this.checked"> summary</label>
        <label><input type="checkbox" checked> agents</label>
        <label><input type="checkbox" checked> cost</label>
        <label><input type="checkbox" checked> errors</label>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createSchedule()">Create</button>
  `);
}

async function createSchedule() {
  const name = document.getElementById('schedName').value.trim();
  const frequency = document.getElementById('schedFreq').value;
  const recipients = document.getElementById('schedRecipients').value.trim();
  if (!name) { showToast('Name required', 'warning'); return; }
  try {
    await api.createReportSchedule({ name, frequency, recipients });
    closeModal();
    showToast('Schedule created', 'success');
    renderReports();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function sendReportNow(scheduleId) {
  try {
    const res = await api.sendReport(scheduleId);
    showToast(`Report sent to ${(res.recipients || []).join(', ') || 'no recipients'}`, 'success');
    renderReports();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function deleteSchedule(scheduleId) {
  if (!confirm('Delete this schedule?')) return;
  try { await api.deleteReportSchedule(scheduleId); showToast('Deleted', 'success'); renderReports(); }
  catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}
