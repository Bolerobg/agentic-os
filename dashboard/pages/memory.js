async function renderMemory() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Memory</h1>
        <p class="page-subtitle">Shared brain context across all agents — they read these files to understand your projects</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="newMemory()">➕ New Memory</button>
        <button class="btn" onclick="renderMemory()">🔄 Refresh</button>
      </div>
    </div>
    <div id="memoryList"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;

  try {
    const brain = await api.getBrain();
    const files = Object.entries(brain);
    const container = document.getElementById('memoryList');

    if (files.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧠</div><div class="empty-state-title">No memory files yet</div><div class="empty-state-desc">Memory files are shared context that all agents can read. Create one to give agents project-specific knowledge.</div><button class="btn btn-primary mt-3" onclick="newMemory()">➕ Create First Memory</button></div>';
      return;
    }

    container.innerHTML = `
      <div class="grid grid-2" style="gap:12px">
        ${files.map(([name, content]) => {
          const preview = content ? content.slice(0, 200) : '';
          const safeName = name.replace('.md', '').replace(/-/g, ' ');
          const lines = content ? content.split('\n').length : 0;
          return `
          <div class="card" style="cursor:pointer" onclick="editMemory('${encodeURIComponent(name)}')">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span style="font-size:20px">🧠</span>
                <span class="card-title" style="text-transform:capitalize">${escapeHtml(safeName)}</span>
              </div>
              <span class="badge badge-info">${lines} lines</span>
            </div>
            <pre style="max-height:120px;overflow:hidden;font-size:11px;color:var(--text-secondary);line-height:1.4;font-family:var(--font)">${escapeHtml(preview)}${content && content.length > 200 ? '...' : ''}</pre>
          </div>`;
        }).join('')}
      </div>
      <div class="card mt-3" style="border-color:var(--accent-glow)">
        <div class="card-header"><span class="card-title">💡 How Memory Works</span></div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">
          <p>Memory files are <strong>Markdown files</strong> in the <code>brain/</code> folder. All agents (opencode, Hermes, Gemini, jcode) read them for context.</p>
          <p style="margin-top:6px"><strong>Example:</strong> If you write <em>"Project X uses PostgreSQL on port 5432"</em>, every agent will know this fact when working on Project X.</p>
          <p style="margin-top:6px">Click any file to <strong>edit</strong> or create a <strong>new one</strong> with the button above.</p>
        </div>
      </div>
    `;

  } catch (err) {
    document.getElementById('memoryList').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function newMemory() {
  showModal('New Memory File', `
    <div class="form-group">
      <label class="form-label">File Name</label>
      <input id="newMemName" class="form-input" placeholder="e.g., project-notes" oninput="this.value=this.value.replace(/\\s+/g,'-').replace(/[^a-z0-9-]/gi,'').toLowerCase()">
      <div class="form-hint">Use lowercase, hyphens. Auto-saved as <code>.md</code> file in brain/</div>
    </div>
    <div class="form-group">
      <label class="form-label">Content (Markdown)</label>
      <textarea id="newMemContent" class="form-textarea" rows="8" style="font-family:var(--font-mono);font-size:12px" placeholder="# Title&#10;&#10;Write your memory content here.&#10;&#10;Agents will read this for context."></textarea>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createMemory()">💾 Create</button>
  `);
}

async function createMemory() {
  const name = document.getElementById('newMemName').value.trim();
  const content = document.getElementById('newMemContent').value;
  if (!name) { showToast('File name required', 'warning'); return; }
  const fileName = name.endsWith('.md') ? name : name + '.md';
  try {
    await api.updateBrainFile(fileName, content);
    closeModal();
    showToast(`Memory "${name}" created`, 'success');
    renderMemory();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function editMemory(encodedName) {
  const name = decodeURIComponent(encodedName);
  const display = name.replace('.md', '').replace(/-/g, ' ');
  let content = '';
  try { const r = await api.getBrainFile(name); content = r.content || ''; } catch {}

  showModal(`Edit: ${display}`, `
    <div class="form-group">
      <label class="form-label">Content (Markdown)</label>
      <textarea id="memContent" class="form-textarea" style="min-height:350px;font-size:12px;font-family:var(--font-mono)">${escapeHtml(content)}</textarea>
    </div>
  `, `
    <button class="btn btn-sm btn-danger" style="margin-right:auto" onclick="deleteMemory('${encodeURIComponent(name)}')">🗑 Delete</button>
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveMemory('${encodeURIComponent(name)}')">💾 Save</button>
  `);
}

async function saveMemory(encodedName) {
  const name = decodeURIComponent(encodedName);
  const content = document.getElementById('memContent').value;
  try {
    await api.updateBrainFile(name, content);
    closeModal();
    showToast('Memory updated', 'success');
    renderMemory();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function deleteMemory(encodedName) {
  const name = decodeURIComponent(encodedName);
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await api.updateBrainFile(name, '');
    closeModal();
    showToast(`"${name}" deleted`, 'success');
    renderMemory();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}
