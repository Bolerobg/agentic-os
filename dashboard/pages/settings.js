async function renderSettings() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Configure Agentic OS — APIs, GitHub, limits</p>
      </div>
      <button class="btn btn-primary" onclick="saveAllSettings()">💾 Save All</button>
    </div>
    <div id="settingsForm"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;

  try {
    const settings = await api.getSettings();
    const prefs = settings.agent_preferences || {};
    const dashboard = settings.dashboard || {};
    const limits = settings.free_tier_limits || {};
    const apiKeys = settings.api_keys || {};
    const llm = settings.llm || {};
    const github = settings.github || {};

    document.getElementById('settingsForm').innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">🤖 Agent Preferences</span></div>
        <div class="grid grid-3">
          ${['opencode', 'hermes', 'gemini', 'jcode'].map(a => `
            <div class="card" style="padding:14px">
              <div class="flex items-center gap-2 mb-2">
                <div class="agent-dot ${prefs[a] && prefs[a].enabled !== false ? 'online' : 'offline'}" style="width:10px;height:10px"></div>
                <strong style="font-size:13px">${a}</strong>
              </div>
              <label class="switch" style="margin:8px 0">
                <input type="checkbox" id="agent_${a}" ${prefs[a] && prefs[a].enabled !== false ? 'checked' : ''} onchange="toggleAgent('${a}')">
                <span class="switch-slider"></span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card" style="border-left:3px solid var(--accent)">
        <div class="card-header"><span class="card-title">🐙 GitHub Integration</span></div>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">
          Connect GitHub to create repos, commit & push from any project.
          <a href="https://github.com/settings/tokens" target="_blank" style="color:var(--accent-light)">Create token →</a>
          <span style="font-size:10px;color:var(--text-muted)"> (needs <code>repo</code> scope for private repos)</span>
        </p>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">GitHub Username</label>
            <input id="ghUser" class="form-input" value="${escapeHtml(github.username || '')}" placeholder="Bolerobg">
          </div>
          <div class="form-group">
            <label class="form-label">Personal Access Token</label>
            <input id="ghToken" class="form-input" type="password" value="${escapeHtml(github.token || '')}" placeholder="ghp_...">
          </div>
        </div>
        <div id="ghStatusCheck" style="margin-top:8px"></div>
        <button class="btn btn-sm" onclick="checkGhConnection()">🔍 Test Connection</button>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">🧠 LLM Configuration</span></div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Default Provider</label>
            <select id="llmProvider" class="form-select">
              <option value="deepseek" ${llm.default_provider === 'deepseek' ? 'selected' : ''}>🤖 DeepSeek</option>
              <option value="openrouter" ${llm.default_provider === 'openrouter' ? 'selected' : ''}>🌐 OpenRouter</option>
              <option value="gemini" ${llm.default_provider === 'gemini' ? 'selected' : ''}>🧠 Gemini</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">DeepSeek Model</label>
            <input id="llmDSModel" class="form-input" value="${escapeHtml(llm.deepseek_model || 'deepseek-v4-pro')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">OpenRouter Model</label>
          <input id="llmORModel" class="form-input" value="${escapeHtml(llm.openrouter_model || 'deepseek/deepseek-chat')}">
        </div>
        <div class="form-group">
          <label class="form-label">Gemini Model</label>
          <input id="llmGModel" class="form-input" value="${escapeHtml(llm.gemini_model || 'gemini-2.5-pro')}">
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">🔑 API Keys</span></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">DeepSeek API Key</label><input id="keyDeepseek" class="form-input" type="password" value="${escapeHtml(apiKeys.deepseek || '')}" placeholder="sk-..."></div>
          <div class="form-group"><label class="form-label">OpenRouter API Key</label><input id="keyOpenrouter" class="form-input" type="password" value="${escapeHtml(apiKeys.openrouter || '')}" placeholder="sk-or-v1-..."></div>
        </div>
        <div class="form-group"><label class="form-label">Gemini API Key</label><input id="keyGemini" class="form-input" type="password" value="${escapeHtml(apiKeys.gemini || '')}"></div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">🎨 Dashboard</span></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Port</label><input id="setPort" class="form-input" type="number" value="${dashboard.port || 8080}"></div>
          <div class="form-group"><label class="form-label">Host</label><input id="setHost" class="form-input" value="${escapeHtml(dashboard.host || '127.0.0.1')}"></div>
        </div>
        <label class="switch" style="display:flex;align-items:center;gap:10px">
          <input type="checkbox" id="setDarkMode" ${dashboard.dark_mode !== false ? 'checked' : ''}><span class="switch-slider"></span>
          <span style="font-size:13px">Dark Mode</span>
        </label>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">💰 Free Tier Limits</span></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Gemini Flash — Requests/Day</label><input id="limGReqs" class="form-input" type="number" value="${(limits.gemini_flash && limits.gemini_flash.requests_per_day) || 1500}"></div>
          <div class="form-group"><label class="form-label">Gemini Flash — Tokens/Day</label><input id="limGTokens" class="form-input" type="number" value="${(limits.gemini_flash && limits.gemini_flash.tokens_per_day) || 1000000}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">OpenRouter Free — Requests/Day</label><input id="limORReqs" class="form-input" type="number" value="${(limits.openrouter_free && limits.openrouter_free.requests_per_day) || 100}"></div>
          <div class="form-group"><label class="form-label">OpenRouter Free — Tokens/Day</label><input id="limORTokens" class="form-input" type="number" value="${(limits.openrouter_free && limits.openrouter_free.tokens_per_day) || 200000}"></div>
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('settingsForm').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function toggleAgent(name) {
  const cb = document.getElementById(`agent_${name}`);
  const card = cb.closest('.card');
  const dot = card.querySelector('.agent-dot');
  dot.className = `agent-dot ${cb.checked ? 'online' : 'offline'}`;
}

async function checkGhConnection() {
  const user = document.getElementById('ghUser').value.trim();
  const token = document.getElementById('ghToken').value.trim();
  const status = document.getElementById('ghStatusCheck');
  if (!user || !token) { status.innerHTML = '<span style="color:var(--red);font-size:12px">✗ Username and token required</span>'; return; }
  status.innerHTML = '<span style="color:var(--yellow);font-size:12px">⏳ Testing...</span>';

  // Save temporarily so the API can use it
  const settings = { github: { username: user, token } };
  try {
    await api.updateSettings(settings);
    const ghStatus = await api.getGithubStatus();
    if (ghStatus.connected) {
      status.innerHTML = `<span style="color:var(--green);font-size:12px">✓ Connected as <strong>${ghStatus.user}</strong> (${ghStatus.repos_count} repos)</span>`;
    } else {
      status.innerHTML = `<span style="color:var(--red);font-size:12px">✗ ${escapeHtml(ghStatus.error)}</span>`;
    }
  } catch (err) {
    status.innerHTML = `<span style="color:var(--red);font-size:12px">✗ ${escapeHtml(err.message)}</span>`;
  }
}

async function saveAllSettings() {
  try {
    const settings = {
      agent_preferences: {
        opencode: { enabled: document.getElementById('agent_opencode').checked },
        hermes: { enabled: document.getElementById('agent_hermes').checked },
        gemini: { enabled: document.getElementById('agent_gemini').checked },
        jcode: { enabled: document.getElementById('agent_jcode').checked },
      },
      github: {
        username: document.getElementById('ghUser').value.trim(),
        token: document.getElementById('ghToken').value.trim(),
      },
      llm: {
        default_provider: document.getElementById('llmProvider').value,
        deepseek_model: document.getElementById('llmDSModel').value,
        openrouter_model: document.getElementById('llmORModel').value,
        gemini_model: document.getElementById('llmGModel').value,
      },
      dashboard: {
        port: parseInt(document.getElementById('setPort').value) || 8080,
        host: document.getElementById('setHost').value || '127.0.0.1',
        dark_mode: document.getElementById('setDarkMode').checked,
      },
      api_keys: {
        deepseek: document.getElementById('keyDeepseek').value,
        openrouter: document.getElementById('keyOpenrouter').value,
        gemini: document.getElementById('keyGemini').value,
      },
      free_tier_limits: {
        gemini_flash: { requests_per_day: parseInt(document.getElementById('limGReqs').value) || 1500, tokens_per_day: parseInt(document.getElementById('limGTokens').value) || 1000000 },
        openrouter_free: { requests_per_day: parseInt(document.getElementById('limORReqs').value) || 100, tokens_per_day: parseInt(document.getElementById('limORTokens').value) || 200000 },
      },
    };
    await api.updateSettings(settings);
    showToast('Settings saved', 'success');
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function resetSettings() {
  showModal('Reset to Defaults', `
    <div class="card" style="background:var(--red-dim)"><div class="flex items-center gap-2"><span style="font-size:18px">⚠</span><div><strong style="font-size:13px">Warning</strong><div style="font-size:12px;color:var(--text-secondary)">This resets all settings and cannot be undone.</div></div></div></div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-danger" onclick="confirmReset()">Reset</button>
  `);
}

async function confirmReset() {
  const defaults = {
    theme: 'dark', agent_preferences: { opencode: { enabled: true }, hermes: { enabled: true }, gemini: { enabled: true }, jcode: { enabled: true } },
    llm: { default_provider: 'deepseek', deepseek_model: 'deepseek-v4-pro', openrouter_model: 'deepseek/deepseek-chat', gemini_model: 'gemini-2.5-pro' },
    dashboard: { port: 8080, host: '127.0.0.1', dark_mode: true }, api_keys: { deepseek: '', openrouter: '', gemini: '' },
    free_tier_limits: { gemini_flash: { requests_per_day: 1500, tokens_per_day: 1000000 }, openrouter_free: { requests_per_day: 100, tokens_per_day: 200000 } },
  };
  try { await api.updateSettings(defaults); closeModal(); showToast('Settings reset', 'success'); renderSettings(); }
  catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}
