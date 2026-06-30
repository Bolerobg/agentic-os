async function renderBackup() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Backup & Restore</h1>
        <p class="page-subtitle">Create and restore system snapshots</p>
      </div>
    </div>
    <div class="grid grid-2" id="backupContent"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;

  try {
    const status = await api.getStatus();
    const container = document.getElementById('backupContent');
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">📦 Create Backup</span></div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Save a snapshot of all brain, skills, agents, standards, and prompts.</p>
        <button class="btn btn-primary" onclick="createBackup()">🔒 Create Backup Now</button>
        <div id="backupResult" style="margin-top:12px"></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">🔄 Restore</span></div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Restore the system from a previous backup snapshot.</p>
        <button class="btn btn-primary" onclick="restoreBackup()">📂 Restore from Backup</button>
        <div id="restoreResult" style="margin-top:12px"></div>
      </div>
    `;
  } catch (err) {
    document.getElementById('backupContent').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

async function createBackup() {
  try {
    const r = await api.createBackup();
    document.getElementById('backupResult').innerHTML = `<div class="badge badge-success">✓ ${r.message || 'Backup created'}</div>`;
  } catch (err) {
    document.getElementById('backupResult').innerHTML = `<div class="badge badge-danger">✕ ${err.message}</div>`;
  }
}

async function restoreBackup() {
  try {
    const r = await api.restoreBackup();
    document.getElementById('restoreResult').innerHTML = `<div class="badge badge-success">✓ ${r.message || 'Restored'}</div>`;
  } catch (err) {
    document.getElementById('restoreResult').innerHTML = `<div class="badge badge-danger">✕ ${err.message}</div>`;
  }
}
