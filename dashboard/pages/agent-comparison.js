// 10. Agent A/B Testing & Comparison
async function renderAgentComparison() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Agent Comparison</h1>
        <p class="page-subtitle">Side-by-side A/B testing — compare agent outputs for the same prompt</p>
      </div>
      <div class="btn-group">
        <button class="btn" onclick="renderAgentComparison()">🔄 Refresh</button>
      </div>
    </div>
    <div class="card mb-4">
      <div class="card-header"><span class="card-title">🧪 Run Comparison</span></div>
      <div class="form-group">
        <label class="form-label">Prompt</label>
        <textarea id="compPrompt" class="form-textarea" rows="3" placeholder="Enter a prompt to test across agents..."></textarea>
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="compAgentChecks">
          <label class="text-sm" style="display:flex;align-items:center;gap:4px"><input type="checkbox" value="opencode" checked> opencode</label>
          <label class="text-sm" style="display:flex;align-items:center;gap:4px"><input type="checkbox" value="hermes" checked> Hermes</label>
          <label class="text-sm" style="display:flex;align-items:center;gap:4px"><input type="checkbox" value="gemini" checked> Gemini</label>
          <label class="text-sm" style="display:flex;align-items:center;gap:4px"><input type="checkbox" value="jcode"> jcode</label>
        </div>
        <button class="btn btn-primary" onclick="runComparison()" id="compRunBtn">🚀 Run Comparison</button>
      </div>
    </div>
    <div id="compResult"></div>
    <div class="section-title">Comparison History</div>
    <div id="compHistory"></div>
  `;

  await loadComparisonHistory();
}

async function runComparison() {
  const prompt = document.getElementById('compPrompt').value.trim();
  if (!prompt) { showToast('Enter a prompt', 'warning'); return; }

  const checks = document.querySelectorAll('#compAgentChecks input:checked');
  const agents = Array.from(checks).map(c => c.value);
  if (agents.length < 2) { showToast('Select at least 2 agents', 'warning'); return; }

  const btn = document.getElementById('compRunBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Running...';

  const result = document.getElementById('compResult');
  result.innerHTML = `<div class="loading"><div class="loading-spinner"></div><span>Comparing ${agents.join(', ')}...</span></div>`;

  try {
    const data = await api.runComparison({ prompt, agents });
    const results = data.results || {};
    const agentNames = Object.keys(results);
    const agentIcons = { opencode: '🔧', hermes: '⚡', gemini: '🧠', jcode: '⚡' };
    const agentColors = { opencode: 'purple', hermes: 'green', gemini: 'blue', jcode: 'yellow' };

    result.innerHTML = `
      <div class="section-title">Results for: "${escapeHtml(data.prompt?.slice(0, 100) || '')}${(data.prompt || '').length > 100 ? '...' : ''}"</div>
      <div class="grid grid-2" style="gap:12px">
        ${agentNames.map(name => {
          const r = results[name] || {};
          return `<div class="card" style="border-left:3px solid var(--${agentColors[name] || 'accent'})">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span>${agentIcons[name] || '🤖'}</span>
                <strong style="text-transform:capitalize">${name}</strong>
              </div>
              <div class="flex gap-2">
                <span class="badge ${r.success ? 'badge-success' : 'badge-danger'}">${r.success ? '✓ OK' : '✕ Error'}</span>
                <span class="badge badge-info">~${(r.tokens_approx || 0).toLocaleString()} tok</span>
                <span class="badge badge-accent">${(r.response_length || 0).toLocaleString()} chars</span>
              </div>
            </div>
            <pre style="white-space:pre-wrap;font-family:var(--font);font-size:12px;line-height:1.5;max-height:400px;overflow-y:auto;color:var(--text-primary)">${escapeHtml(r.response || r.error || 'No response')}</pre>
          </div>`;
        }).join('')}
      </div>
      <div class="card mt-3">
        <div class="card-header"><span class="card-title">📊 Quick Stats</span></div>
        <div class="table-wrapper">
          <table><thead><tr><th>Agent</th><th>Status</th><th>Response Length</th><th>Tokens (est.)</th><th>Winner?</th></tr></thead><tbody>
            ${agentNames.map(name => {
              const r = results[name] || {};
              const isLongest = r.response_length === Math.max(...agentNames.map(n => results[n]?.response_length || 0));
              return `<tr>
                <td><strong style="text-transform:capitalize">${name}</strong></td>
                <td><span class="badge ${r.success ? 'badge-success' : 'badge-danger'}">${r.success ? 'OK' : 'FAIL'}</span></td>
                <td>${(r.response_length || 0).toLocaleString()}</td>
                <td>~${(r.tokens_approx || 0).toLocaleString()}</td>
                <td>${isLongest ? '🏆 Most detailed' : ''}</td>
              </tr>`;
            }).join('')}
          </tbody></table>
        </div>
      </div>
    `;

    await loadComparisonHistory();

  } catch (err) {
    result.innerHTML = `<div class="card" style="border-color:var(--red)"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div></div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Run Comparison';
  }
}

async function loadComparisonHistory() {
  const container = document.getElementById('compHistory');
  if (!container) return;
  try {
    const history = await api.getComparisonHistory();
    if (history.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">🧪</div><div class="empty-state-title">No comparisons yet</div><div class="empty-state-desc">Run your first A/B test above</div></div>';
      return;
    }
    container.innerHTML = `
      <div class="table-wrapper"><table><thead><tr><th>Prompt</th><th>Agents</th><th>When</th><th></th></tr></thead><tbody>
        ${history.slice(-10).reverse().map(c => `
          <tr>
            <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.prompt || '')}</td>
            <td>${(c.agents || []).map(a => `<span class="badge badge-accent">${a}</span>`).join(' ')}</td>
            <td style="font-size:12px">${timeAgo(c.timestamp)}</td>
            <td><button class="btn btn-sm" onclick="viewComparison('${c.id}')">View</button></td>
          </tr>
        `).join('')}
      </tbody></table></div>
    `;
  } catch {}
}

function viewComparison(compId) {
  showToast('Comparison loaded above', 'info');
}
