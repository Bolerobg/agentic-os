async function renderPrompts() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Prompt Library</h1>
        <p class="page-subtitle">Reusable templates — create, edit, delete prompt templates</p>
      </div>
      <button class="btn btn-primary" onclick="showNewPrompt()">+ New Prompt</button>
    </div>
    <div id="promptGrid" class="grid grid-2"></div>
  `;

  try {
    const prompts = await api.getPrompts();
    const entries = Object.entries(prompts);
    const grid = document.getElementById('promptGrid');

    if (entries.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📝</div><div class="empty-state-title">No prompt templates</div><div class="empty-state-desc">Create reusable prompt templates for common agent tasks</div><button class="btn btn-primary mt-3" onclick="showNewPrompt()">+ New Prompt</button></div>';
      return;
    }

    grid.innerHTML = entries.map(([name, content]) => {
      const displayName = name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const preview = content.slice(0, 200);
      const lines = content.split('\n').length;
      return `<div class="card" style="cursor:pointer" onclick="editPrompt('${encodeURIComponent(name)}')">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span style="font-size:18px">📝</span>
            <strong>${escapeHtml(displayName)}</strong>
          </div>
          <span class="badge badge-info">${lines} lines</span>
        </div>
        <pre style="max-height:100px;overflow:hidden;font-size:11px;color:var(--text-muted);font-family:var(--font);white-space:pre-wrap">${escapeHtml(preview)}${content.length > 200 ? '...' : ''}</pre>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;gap:6px">
          <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();copyPromptContent('${encodeURIComponent(name)}')">📋 Copy</button>
          <button class="btn btn-sm" onclick="event.stopPropagation();editPrompt('${encodeURIComponent(name)}')">✏ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deletePromptConfirm('${encodeURIComponent(name)}')" style="margin-left:auto">🗑</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    document.getElementById('promptGrid').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function showNewPrompt() {
  showModal('New Prompt', `
    <div class="form-group"><label class="form-label">Name</label><input id="newPromptName" class="form-input" placeholder="e.g., code-review-template"></div>
    <div class="form-group"><label class="form-label">Content</label><textarea id="newPromptContent" class="form-textarea" rows="10" style="font-family:var(--font-mono);font-size:12px" placeholder="Write your prompt template here..."></textarea></div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createPrompt()">💾 Create</button>
  `);
}

async function createPrompt() {
  const name = document.getElementById('newPromptName').value.trim();
  const content = document.getElementById('newPromptContent').value;
  if (!name || !content) { showToast('Name and content required', 'warning'); return; }
  try {
    await api.createPrompt(name, content);
    closeModal();
    showToast('Prompt created', 'success');
    renderPrompts();
  } catch (err) { showToast(err.message, 'error'); }
}

async function editPrompt(encodedName) {
  const name = decodeURIComponent(encodedName);
  let content = '';
  try { const prompts = await api.getPrompts(); content = prompts[name] || ''; } catch {}

  showModal(`Edit: ${escapeHtml(name)}`, `
    <div class="form-group"><label class="form-label">Content</label><textarea id="editPromptContent" class="form-textarea" rows="15" style="font-family:var(--font-mono);font-size:12px">${escapeHtml(content)}</textarea></div>
  `, `
    <button class="btn btn-danger" style="margin-right:auto" onclick="deletePromptConfirm('${encodeURIComponent(name)}')">🗑 Delete</button>
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="savePrompt('${encodeURIComponent(name)}')">💾 Save</button>
  `);
}

async function savePrompt(encodedName) {
  const name = decodeURIComponent(encodedName);
  const content = document.getElementById('editPromptContent').value;
  try {
    await api.updatePrompt(name, content);
    closeModal();
    showToast('Prompt saved', 'success');
    renderPrompts();
  } catch (err) { showToast(err.message, 'error'); }
}

function deletePromptConfirm(encodedName) {
  const name = decodeURIComponent(encodedName);
  if (!confirm(`Delete prompt "${name}"?`)) return;
  api.deletePrompt(name).then(() => { showToast('Deleted', 'success'); renderPrompts(); }).catch(e => showToast(e.message, 'error'));
}

async function copyPromptContent(encodedName) {
  const name = decodeURIComponent(encodedName);
  try {
    const prompts = await api.getPrompts();
    const content = prompts[name] || '';
    await navigator.clipboard.writeText(content);
    showToast('Copied!', 'success');
  } catch { showToast('Failed to copy', 'error'); }
}
