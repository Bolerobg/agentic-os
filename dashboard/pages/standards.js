async function renderStandards() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Standards</h1>
        <p class="page-subtitle">Project conventions & coding standards — create, edit, or AI-generate</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="showNewStandard()">+ New Standard</button>
        <button class="btn" onclick="showAiStandardGenerator()" style="background:linear-gradient(135deg,var(--accent),#fd79a8);color:white;border:none">🤖 AI Generate</button>
      </div>
    </div>
    <div id="standardsContent"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;

  try {
    const data = await api.getStandards();
    const standards = data.standards || [];
    const container = document.getElementById('standardsContent');

    if (standards.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📐</div><div class="empty-state-title">No standards defined</div><div class="empty-state-desc">Create coding standards manually or let AI generate them</div><button class="btn btn-primary mt-3" onclick="showNewStandard()">+ New Standard</button></div>';
      return;
    }

    container.innerHTML = `
      <div class="grid grid-2" style="gap:12px">
        ${standards.map(s => `
          <div class="card" style="cursor:pointer" onclick="editStandard('${encodeURIComponent(s.name)}')">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span style="font-size:18px">📐</span>
                <strong style="text-transform:capitalize">${escapeHtml(s.name.replace(/-/g, ' '))}</strong>
              </div>
              <span class="badge badge-info">${s.content.split('\\n').length} lines</span>
            </div>
            <pre style="max-height:120px;overflow:hidden;font-size:11px;color:var(--text-muted);font-family:var(--font);white-space:pre-wrap">${escapeHtml(s.content.slice(0, 250))}${s.content.length > 250 ? '...' : ''}</pre>
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;gap:6px">
              <button class="btn btn-sm" onclick="event.stopPropagation();editStandard('${encodeURIComponent(s.name)}')">✏ Edit</button>
              <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteStandardConfirm('${encodeURIComponent(s.name)}')" style="margin-left:auto">🗑</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    document.getElementById('standardsContent').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function showNewStandard() {
  showModal('New Standard', `
    <div class="form-group"><label class="form-label">Name</label><input id="newStdName" class="form-input" placeholder="e.g., api-response-format"></div>
    <div class="form-group"><label class="form-label">Content (Markdown)</label><textarea id="newStdContent" class="form-textarea" rows="12" style="font-family:var(--font-mono);font-size:12px" placeholder="# Title&#10;&#10;Write your standard here..."></textarea></div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createStandard()">💾 Create</button>
  `);
}

async function createStandard() {
  const name = document.getElementById('newStdName').value.trim();
  const content = document.getElementById('newStdContent').value;
  if (!name || !content) { showToast('Name and content required', 'warning'); return; }
  try {
    await api.createStandard(name, content);
    closeModal();
    showToast('Standard created', 'success');
    renderStandards();
  } catch (err) { showToast(err.message, 'error'); }
}

async function editStandard(encodedName) {
  const name = decodeURIComponent(encodedName);
  let content = '';
  try { const data = await api.getStandards(); const s = (data.standards||[]).find(x => x.name===name); if(s) content=s.content; } catch {}

  showModal(`Edit: ${escapeHtml(name)}`, `
    <div class="form-group"><label class="form-label">Content</label><textarea id="editStdContent" class="form-textarea" rows="15" style="font-family:var(--font-mono);font-size:12px">${escapeHtml(content)}</textarea></div>
  `, `
    <button class="btn btn-danger" style="margin-right:auto" onclick="deleteStandardConfirm('${encodeURIComponent(name)}')">🗑 Delete</button>
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveStandard('${encodeURIComponent(name)}')">💾 Save</button>
  `);
}

async function saveStandard(encodedName) {
  const name = decodeURIComponent(encodedName);
  const content = document.getElementById('editStdContent').value;
  try { await api.updateStandard(name, content); closeModal(); showToast('Saved', 'success'); renderStandards(); }
  catch (err) { showToast(err.message, 'error'); }
}

function deleteStandardConfirm(encodedName) {
  const name = decodeURIComponent(encodedName);
  if (!confirm(`Delete "${name}"?`)) return;
  api.deleteStandard(name).then(() => { showToast('Deleted', 'success'); renderStandards(); }).catch(e => showToast(e.message, 'error'));
}

// AI Generate
async function showAiStandardGenerator() {
  showModal('🤖 AI Standard Generator', `
    <div class="form-group">
      <label class="form-label">Describe your standard</label>
      <textarea id="aiStdIdea" class="form-textarea" rows="5" placeholder="Example: API responses must use consistent JSON format with status, data, and error fields. All dates in ISO 8601. Errors must include code and message."></textarea>
      <div class="form-hint">Write naturally — AI will format it as a professional standard</div>
    </div>
    <div id="aiStdResult" style="display:none;margin-top:12px">
      <label class="form-label">Generated Standard</label>
      <pre id="aiStdContent" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:12px;font-size:11px;white-space:pre-wrap;max-height:300px;overflow-y:auto"></pre>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input id="aiStdName" class="form-input" placeholder="standard-name" style="flex:1;font-size:12px">
        <button class="btn btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('aiStdContent').textContent);showToast('Copied','success')">📋 Copy</button>
        <button class="btn btn-sm btn-primary" onclick="saveAiStandard()">💾 Save</button>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="generateAiStandard()" id="aiStdGenBtn">🤖 Generate</button>
  `);
}

async function generateAiStandard() {
  const idea = document.getElementById('aiStdIdea').value.trim();
  if (idea.length < 10) { showToast('Describe your idea (min 10 chars)', 'warning'); return; }
  const btn = document.getElementById('aiStdGenBtn');
  btn.disabled = true; btn.textContent = '⏳ Generating...';
  try {
    const res = await api.aiGenerateStandard(idea);
    document.getElementById('aiStdContent').textContent = res.standard_md || '';
    document.getElementById('aiStdResult').style.display = 'block';
    const firstLine = (res.standard_md||'').split('\\n')[0].replace(/^# /,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+$/,'').slice(0,40);
    document.getElementById('aiStdName').value = firstLine || 'new-standard';
    btn.disabled = false; btn.textContent = '🔄 Regenerate';
  } catch (err) { showToast(err.message, 'error'); btn.disabled = false; btn.textContent = '🤖 Generate'; }
}

async function saveAiStandard() {
  const name = document.getElementById('aiStdName').value.trim();
  const content = document.getElementById('aiStdContent').textContent;
  if (!name) { showToast('Enter a name', 'warning'); return; }
  try { await api.createStandard(name, content); closeModal(); showToast(`"${name}" saved!`, 'success'); renderStandards(); }
  catch (err) { showToast(err.message, 'error'); }
}
