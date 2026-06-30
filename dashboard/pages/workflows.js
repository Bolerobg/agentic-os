// 6. Pipeline/Workflow Orchestrator — with demo templates
const DEMO_TEMPLATES = [
  {
    name: '🚀 Research → Code → Deploy',
    desc: 'Gemini researches, opencode writes code, Hermes deploys',
    icon: '🚀',
    nodes: [
      { id: 'r1', agent: 'gemini', skill: 'Research the task and gather context' },
      { id: 'c1', agent: 'opencode', skill: 'Generate implementation code', depends_on: ['r1'] },
      { id: 'd1', agent: 'hermes', skill: 'Deploy to production', depends_on: ['c1'] },
    ],
  },
  {
    name: '📝 Content Marketing Pipeline',
    desc: 'Research topic → write copy → schedule publish',
    icon: '📝',
    nodes: [
      { id: 'r1', agent: 'gemini', skill: 'Research trending topics & keywords' },
      { id: 'w1', agent: 'opencode', skill: 'Write blog post / landing page', depends_on: ['r1'] },
      { id: 'p1', agent: 'hermes', skill: 'Schedule post & notify channels', depends_on: ['w1'] },
    ],
  },
  {
    name: '🔍 DevOps Audit Pipeline',
    desc: 'System audit → backup → health check — daily maintenance',
    icon: '🔍',
    nodes: [
      { id: 'a1', agent: 'hermes', skill: 'Run devops-audit: check system state' },
      { id: 'b1', agent: 'hermes', skill: 'Run backup-skill: create backup', depends_on: ['a1'] },
      { id: 'h1', agent: 'hermes', skill: 'Run heartbeat: verify all agents online', depends_on: ['b1'] },
    ],
  },
  {
    name: '🐛 Bug Investigation Pipeline',
    desc: 'Investigate error → analyze root cause → generate fix',
    icon: '🐛',
    nodes: [
      { id: 'i1', agent: 'gemini', skill: 'Investigate error logs and trace issue' },
      { id: 'a1', agent: 'opencode', skill: 'Analyze root cause and propose fix', depends_on: ['i1'] },
      { id: 'f1', agent: 'opencode', skill: 'Implement the fix', depends_on: ['a1'] },
      { id: 't1', agent: 'jcode', skill: 'Run tests to verify the fix', depends_on: ['f1'] },
    ],
  },
  {
    name: '📊 Data Analysis Pipeline',
    desc: 'Scrape data → analyze → generate report → send',
    icon: '📊',
    nodes: [
      { id: 's1', agent: 'opencode', skill: 'Scrape/collect data from sources' },
      { id: 'a1', agent: 'gemini', skill: 'Analyze data and find insights', depends_on: ['s1'] },
      { id: 'r1', agent: 'hermes', skill: 'Generate report and send to team', depends_on: ['a1'] },
    ],
  },
];

async function renderWorkflows() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Workflow Orchestrator</h1>
        <p class="page-subtitle">Multi-agent pipeline builder — chain agents together step by step</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="showAddWorkflow()">+ New Pipeline</button>
        <button class="btn" onclick="renderWorkflows()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Demo Templates -->
    <div class="section-title">📦 Demo Templates <span class="text-sm text-muted" style="font-weight:400">— click to use</span></div>
    <div id="wfTemplates" class="grid grid-2 mb-4"></div>

    <!-- User's Pipelines -->
    <div class="section-title">🔗 Your Pipelines</div>
    <div id="wfList" class="grid grid-2 mb-4"></div>
    <div class="section-title">📋 Recent Runs</div>
    <div id="wfRuns"></div>
  `;

  if (!document.getElementById('wfStyle')) {
    const style = document.createElement('style');
    style.id = 'wfStyle';
    style.textContent = `
      .wf-node { display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:var(--radius);background:var(--bg-secondary);border:1px solid var(--border);font-size:10px;white-space:nowrap }
      .wf-arrow { color:var(--text-muted);margin:0 4px;font-size:14px }
      .wf-template-card { cursor:pointer;transition:var(--transition);position:relative;overflow:hidden }
      .wf-template-card:hover { border-color:var(--accent);transform:translateY(-2px);box-shadow:0 8px 24px rgba(108,92,231,0.2) }
      .wf-visual { display:flex;align-items:center;flex-wrap:wrap;gap:2px;padding:8px 0 }
      .wf-step { display:flex;flex-direction:column;align-items:center;text-align:center;min-width:70px }
      .wf-step-icon { width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;margin-bottom:3px }
      .wf-step-label { font-size:9px;color:var(--text-muted);line-height:1.2;max-width:70px }
      .wf-connector { font-size:16px;color:var(--text-muted);margin:0 2px }
    `;
    document.head.appendChild(style);
  }

  // Render demo templates
  const agentIcons = { opencode: '🔧', hermes: '⚡', gemini: '🧠', jcode: '⚡' };
  const agentColors = { opencode: 'purple', hermes: 'green', gemini: 'blue', jcode: 'yellow' };

  document.getElementById('wfTemplates').innerHTML = DEMO_TEMPLATES.map((t, i) => {
    const nodes = t.nodes || [];
    return `
    <div class="card wf-template-card" onclick="useTemplate(${i})">
      <div class="flex items-center justify-between mb-2">
        <strong>${t.icon} ${t.name}</strong>
        <span class="badge badge-accent" style="font-size:9px">${nodes.length} steps</span>
      </div>
      <div class="text-sm text-muted mb-2">${t.desc}</div>
      <!-- Visual flow -->
      <div class="wf-visual">
        ${nodes.map((n, j) => `
          ${j > 0 ? '<span class="wf-connector">→</span>' : ''}
          <div class="wf-step">
            <div class="wf-step-icon" style="background:var(--${agentColors[n.agent] || 'accent'}-dim);color:var(--${agentColors[n.agent] || 'accent'})">${agentIcons[n.agent] || '🤖'}</div>
            <div class="wf-step-label">${escapeHtml((n.skill || n.agent || '').slice(0, 20))}</div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();useTemplate(${i})" style="margin-top:8px">📋 Use Template</button>
    </div>`;
  }).join('');

  // Load user pipelines
  try {
    const data = await api.getWorkflows();
    const workflows = data.workflows || [];
    const runs = (data.runs || []).slice(-10).reverse();

    if (workflows.length === 0) {
      document.getElementById('wfList').innerHTML = '<div class="card" style="grid-column:1/-1"><div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">No custom pipelines yet</div><div class="empty-state-desc">Click a demo template above or create your own</div></div></div>';
    } else {
      document.getElementById('wfList').innerHTML = workflows.map(wf => {
        const nodes = wf.nodes || [];
        return `<div class="card">
          <div class="flex items-center justify-between mb-3">
            <div><strong>${escapeHtml(wf.name)}</strong><div class="text-sm text-muted">${escapeHtml(wf.description || '')}</div></div>
            <span class="badge ${wf.enabled ? 'badge-success' : 'badge-warning'}">${wf.enabled ? 'Active' : 'Paused'}</span>
          </div>
          <div class="wf-visual">
            ${nodes.map((n, j) => `
              ${j > 0 ? '<span class="wf-connector">→</span>' : ''}
              <div class="wf-step">
                <div class="wf-step-icon" style="background:var(--${agentColors[n.agent] || 'accent'}-dim);color:var(--${agentColors[n.agent] || 'accent'})">${agentIcons[n.agent] || '🤖'}</div>
                <div class="wf-step-label">${escapeHtml(n.skill || n.agent || '')}</div>
              </div>
            `).join('')}
          </div>
          <div class="flex items-center gap-2 text-sm text-muted">
            <span>Runs: ${wf.run_count || 0}</span>
            <span>Last: ${wf.last_run ? timeAgo(wf.last_run) : 'never'}</span>
          </div>
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
            <button class="btn btn-sm btn-primary" onclick="runWorkflow('${wf.id}')">▶ Run</button>
            <button class="btn btn-sm btn-danger" style="margin-left:6px" onclick="deleteWorkflow('${wf.id}')">Delete</button>
          </div>
        </div>`;
      }).join('');
    }

    document.getElementById('wfRuns').innerHTML = runs.length === 0
      ? '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">📭</div><div class="empty-state-title">No runs yet — click ▶ Run on a pipeline</div></div>'
      : `<div class="table-wrapper"><table><thead><tr><th>Workflow</th><th>Status</th><th>Started</th><th>Completed</th></tr></thead><tbody>
        ${runs.map(r => `
          <tr>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td><span class="badge ${r.status === 'completed' ? 'badge-success' : r.status === 'running' ? 'badge-accent' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}">${r.status}</span></td>
            <td style="font-size:12px">${formatDate(r.started)}</td>
            <td style="font-size:12px">${r.completed ? formatDate(r.completed) : '—'}</td>
          </tr>
        `).join('')}
      </tbody></table></div>`;

  } catch (err) {
    document.getElementById('wfList').innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div></div>`;
  }
}

function useTemplate(index) {
  const t = DEMO_TEMPLATES[index];
  if (!t) return;
  const json = JSON.stringify(t.nodes, null, 2);
  showAddWorkflow(t.name, t.desc, json);
}

function showAddWorkflow(prefillName, prefillDesc, prefillNodes) {
  showModal(prefillName ? `New Pipeline: ${prefillName}` : 'New Pipeline', `
    <div class="form-group"><label class="form-label">Pipeline Name</label><input id="wfName" class="form-input" placeholder="e.g., Research → Code → Deploy" value="${escapeHtml(prefillName || '')}"></div>
    <div class="form-group"><label class="form-label">Description</label><textarea id="wfDesc" class="form-textarea" rows="2" placeholder="What does this pipeline do?">${escapeHtml(prefillDesc || '')}</textarea></div>
    <div class="form-group">
      <label class="form-label">Nodes (JSON) <span class="text-sm text-muted">— defines the pipeline steps</span></label>
      <textarea id="wfNodes" class="form-textarea" rows="8" style="font-size:11px;font-family:var(--font-mono)">${escapeHtml(prefillNodes || `[
  {"id":"r1","agent":"gemini","skill":"Research topic"},
  {"id":"c1","agent":"opencode","skill":"Generate code","depends_on":["r1"]},
  {"id":"d1","agent":"hermes","skill":"Deploy","depends_on":["c1"]}
]`)}</textarea>
      <div class="form-hint" style="margin-top:6px">
        <strong>How JSON works:</strong><br>
        • Each object = one step. <code>id</code> must be unique.<br>
        • <code>agent</code>: opencode / hermes / gemini / jcode<br>
        • <code>skill</code>: description of what this step does<br>
        • <code>depends_on</code>: array of step IDs that must finish first (creates → arrows)<br>
        • Steps without depends_on run immediately. Others wait for dependencies.
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createWorkflow()">Create Pipeline</button>
  `);
}

async function createWorkflow() {
  const name = document.getElementById('wfName').value.trim();
  const description = document.getElementById('wfDesc').value.trim();
  let nodes = [];
  try { nodes = JSON.parse(document.getElementById('wfNodes').value); } catch { showToast('Invalid JSON — check brackets and commas', 'error'); return; }
  if (!name) { showToast('Name required', 'warning'); return; }
  if (!Array.isArray(nodes) || nodes.length === 0) { showToast('Nodes must be a non-empty array', 'error'); return; }
  // Validate nodes
  for (const n of nodes) {
    if (!n.id) { showToast(`Each node needs an "id" field`, 'error'); return; }
    if (!n.agent) { showToast(`Node "${n.id}" needs an "agent" field`, 'error'); return; }
    if (!['opencode','hermes','gemini','jcode'].includes(n.agent)) {
      showToast(`Node "${n.id}": agent must be opencode/hermes/gemini/jcode`, 'error'); return;
    }
  }
  try {
    await api.createWorkflow({ name, description, nodes });
    closeModal();
    showToast('Pipeline created!', 'success');
    renderWorkflows();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function runWorkflow(wfId) {
  try {
    const res = await api.runWorkflow(wfId);
    showToast(`Pipeline "${res.run?.name}" started`, 'success');
    renderWorkflows();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function deleteWorkflow(wfId) {
  if (!confirm('Delete this pipeline?')) return;
  try { await api.deleteWorkflow(wfId); showToast('Deleted', 'success'); renderWorkflows(); }
  catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}
