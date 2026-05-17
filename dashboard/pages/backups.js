async function renderBackups() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Backups</h1>
        <p class="page-subtitle">System snapshots and disaster recovery</p>
      </div>
      <button class="btn btn-primary" onclick="createBackup()">+ New Backup</button>
    </div>
    <div id="backupList"><div class="loading">Loading...</div></div>
  `;

  try {
    const backups = await api.getBackups();
    const container = document.getElementById('backupList');

    if (backups.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">💾</div><h3>No backups yet</h3><p>Create your first backup to protect your system</p><button class="btn btn-primary" style="margin-top:12px" onclick="createBackup()">Create Backup</button></div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Size</th><th>Created</th><th></th></tr></thead>
          <tbody>
            ${backups.map(b => `
              <tr>
                <td><strong>${b.name}</strong></td>
                <td>${formatBytes(b.size)}</td>
                <td>${formatDate(b.created)}</td>
                <td>
                  <button class="btn btn-sm btn-danger" onclick="restoreBackup('${b.name}')">Restore</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:12px;color:var(--text2);text-align:right;margin-top:8px">${backups.length} backups</div>
    `;
  } catch (err) {
    document.getElementById('backupList').innerHTML = `<div class="empty-state"><div class="icon">⚠</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function createBackup() {
  try {
    const r = await api.createBackup();
    showToast(`Backup created: ${r.file}`, 'success');
    renderBackups();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function restoreBackup(name) {
  if (!confirm(`Restore backup: ${name}? This will overwrite current data.`)) return;
  try {
    const r = await api.restoreBackup(name);
    showToast('Backup restored successfully', 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
