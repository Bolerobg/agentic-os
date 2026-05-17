async function renderPlugins() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Plugin Registry</h1>
        <p class="page-subtitle">Manage installed skills and plugins</p>
      </div>
      <button class="btn btn-primary" onclick="showInstallPlugin()">+ Install</button>
    </div>
    <div id="pluginList"><div class="loading">Loading...</div></div>
    <div id="installPluginForm" style="display:none"></div>
  `;

  try {
    const data = await api.getPlugins();
    const plugins = data.plugins || [];
    const container = document.getElementById('pluginList');

    if (plugins.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">🔌</div><h3>No plugins installed</h3></div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Plugin</th><th>Version</th><th>Type</th><th>Installed</th></tr></thead>
          <tbody>
            ${plugins.map(p => `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td><code>${p.version}</code></td>
                <td><span class="badge badge-info">${p.type || 'unknown'}</span></td>
                <td style="font-size:12px">${formatDate(p.installed)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:12px;color:var(--text2);text-align:right;margin-top:8px">${plugins.length} plugins</div>
    `;
  } catch (err) {
    document.getElementById('pluginList').innerHTML = `<div class="empty-state"><div class="icon">⚠</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function showInstallPlugin() {
  document.getElementById('installPluginForm').style.display = 'block';
  document.getElementById('installPluginForm').innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">Install Plugin</span></div>
      <div class="form-group">
        <label class="form-label">Plugin Name</label>
        <input id="pluginName" placeholder="e.g., my-custom-skill">
      </div>
      <button class="btn btn-primary" onclick="installPlugin()">Install</button>
      <button class="btn" onclick="cancelInstallPlugin()" style="margin-left:8px">Cancel</button>
    </div>
  `;
}

async function installPlugin() {
  const name = document.getElementById('pluginName').value.trim();
  if (!name) { showToast('Plugin name required', 'error'); return; }
  try {
    const r = await api.installPlugin(name);
    showToast(r.status === 'already_installed' ? 'Already installed' : 'Plugin installed', 'success');
    renderPlugins();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function cancelInstallPlugin() {
  document.getElementById('installPluginForm').style.display = 'none';
}
