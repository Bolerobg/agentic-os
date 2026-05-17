async function renderAudit() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Audit Trail</h1>
        <p class="page-subtitle">Complete history of all agent actions</p>
      </div>
      <div style="display:flex;gap:8px">
        <select id="auditFilter" onchange="renderAudit()" style="width:auto">
          <option value="all">All Actions</option>
          <option value="skill_run">Skill Runs</option>
          <option value="brain_update">Memory Updates</option>
          <option value="backup_created">Backups</option>
          <option value="settings_updated">Settings</option>
          <option value="job_created">Jobs</option>
        </select>
        <input id="auditSearch" placeholder="Search..." style="width:200px" oninput="renderAudit()">
      </div>
    </div>
    <div id="auditEntries"><div class="loading">Loading...</div></div>
  `;

  try {
    const audit = await api.getAudit(200);
    let entries = audit.entries || [];

    const filter = document.getElementById('auditFilter')?.value || 'all';
    const search = (document.getElementById('auditSearch')?.value || '').toLowerCase();

    if (filter !== 'all') entries = entries.filter(e => e.action === filter);
    if (search) entries = entries.filter(e => JSON.stringify(e).toLowerCase().includes(search));

    const container = document.getElementById('auditEntries');
    if (entries.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><h3>No audit entries</h3></div>';
      return;
    }

    container.innerHTML = `
      <div class="card" style="padding:0">
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Time</th><th>Action</th><th>Details</th><th>ID</th></tr></thead>
            <tbody>
              ${entries.reverse().map(e => `
                <tr>
                  <td style="white-space:nowrap;font-size:11px">${formatDate(e.timestamp)}</td>
                  <td><span class="badge badge-info">${e.action}</span></td>
                  <td>${e.skill || e.file || e.job || e.plugin || e.job_id || '-'}</td>
                  <td style="font-size:11px;color:var(--text2)">${e.id || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text2);text-align:right">${entries.length} entries</div>
    `;
  } catch (err) {
    document.getElementById('auditEntries').innerHTML = `<div class="empty-state"><div class="icon">⚠</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}
