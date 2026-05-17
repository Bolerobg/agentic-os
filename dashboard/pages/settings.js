async function renderSettings() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Configure Agentic OS</p>
      </div>
      <button class="btn btn-primary" onclick="saveSettings()">💾 Save Settings</button>
    </div>
    <div id="settingsForm"><div class="loading">Loading...</div></div>
  `;

  try {
    const settings = await api.getSettings();
    const container = document.getElementById('settingsForm');

    const prefs = settings.agent_preferences || {};
    const dashboard = settings.dashboard || {};
    const limits = settings.free_tier_limits || {};

    container.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">Agent Preferences</span></div>
        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label">opencode Enabled</label>
            <select id="ocEnabled">
              <option value="true" ${prefs.opencode?.enabled !== false ? 'selected' : ''}>Enabled</option>
              <option value="false" ${prefs.opencode?.enabled === false ? 'selected' : ''}>Disabled</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Hermes Enabled</label>
            <select id="hermesEnabled">
              <option value="true" ${prefs.hermes?.enabled !== false ? 'selected' : ''}>Enabled</option>
              <option value="false" ${prefs.hermes?.enabled === false ? 'selected' : ''}>Disabled</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Gemini CLI Enabled</label>
            <select id="geminiEnabled">
              <option value="true" ${prefs.gemini?.enabled !== false ? 'selected' : ''}>Enabled</option>
              <option value="false" ${prefs.gemini?.enabled === false ? 'selected' : ''}>Disabled</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Dashboard Theme</label>
            <select id="themeSelect">
              <option value="dark" ${dashboard.dark_mode !== false ? 'selected' : ''}>Dark</option>
              <option value="light" ${dashboard.dark_mode === false ? 'selected' : ''}>Light</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Dashboard</span></div>
        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label">Port</label>
            <input id="dashPort" value="${dashboard.port || 8080}" type="number">
          </div>
          <div class="form-group">
            <label class="form-label">Host</label>
            <input id="dashHost" value="${dashboard.host || '127.0.0.1'}">
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Free Tier Limits</span></div>
        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label">Gemini Flash — Requests/Day</label>
            <input id="geminiReqs" value="${limits.gemini_flash?.requests_per_day || 1500}" type="number">
          </div>
          <div class="form-group">
            <label class="form-label">Gemini Flash — Tokens/Day</label>
            <input id="geminiTokens" value="${limits.gemini_flash?.tokens_per_day || 1000000}" type="number">
          </div>
          <div class="form-group">
            <label class="form-label">OpenRouter Free — Requests/Day</label>
            <input id="orReqs" value="${limits.openrouter_free?.requests_per_day || 100}" type="number">
          </div>
          <div class="form-group">
            <label class="form-label">OpenRouter Free — Tokens/Day</label>
            <input id="orTokens" value="${limits.openrouter_free?.tokens_per_day || 200000}" type="number">
          </div>
        </div>
      </div>

      <div class="card" style="border-color:var(--red)">
        <div class="card-header"><span class="card-title" style="color:var(--red)">Danger Zone</span></div>
        <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Reset all settings to defaults. This cannot be undone.</p>
        <button class="btn btn-danger" onclick="resetSettings()">Reset to Defaults</button>
      </div>
    `;
  } catch (err) {
    document.getElementById('settingsForm').innerHTML = `<div class="empty-state"><div class="icon">⚠</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function saveSettings() {
  try {
    const settings = {
      agent_preferences: {
        opencode: { enabled: document.getElementById('ocEnabled').value === 'true' },
        hermes: { enabled: document.getElementById('hermesEnabled').value === 'true' },
        gemini: { enabled: document.getElementById('geminiEnabled').value === 'true' },
      },
      dashboard: {
        port: parseInt(document.getElementById('dashPort').value) || 8080,
        host: document.getElementById('dashHost').value || '127.0.0.1',
        dark_mode: document.getElementById('themeSelect').value === 'dark',
      },
      free_tier_limits: {
        gemini_flash: {
          requests_per_day: parseInt(document.getElementById('geminiReqs').value) || 1500,
          tokens_per_day: parseInt(document.getElementById('geminiTokens').value) || 1000000,
        },
        openrouter_free: {
          requests_per_day: parseInt(document.getElementById('orReqs').value) || 100,
          tokens_per_day: parseInt(document.getElementById('orTokens').value) || 200000,
        },
      },
    };
    await api.updateSettings(settings);
    showToast('Settings saved', 'success');
    renderSettings();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) return;
  const defaults = {
    theme: 'dark',
    agent_preferences: {
      opencode: { enabled: true, binary: 'opencode', max_turns: 50 },
      hermes: { enabled: true, binary: 'hermes' },
      gemini: { enabled: true, binary: 'gemini', model: 'gemini-2.5-flash' },
    },
    dashboard: { port: 8080, host: '127.0.0.1', dark_mode: true },
    free_tier_limits: {
      gemini_flash: { requests_per_day: 1500, tokens_per_day: 1000000 },
      openrouter_free: { requests_per_day: 100, tokens_per_day: 200000 },
    },
  };
  api.updateSettings(defaults).then(() => {
    showToast('Settings reset to defaults', 'success');
    renderSettings();
  }).catch(err => {
    showToast(`Error: ${err.message}`, 'error');
  });
}
