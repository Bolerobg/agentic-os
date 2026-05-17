async function renderPrompts() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Prompt Library</h1>
        <p class="page-subtitle">Reusable prompt templates for common tasks</p>
      </div>
    </div>
    <div id="promptGrid" class="grid grid-3"></div>
  `;

  try {
    const prompts = await api.getPrompts();
    const grid = document.getElementById('promptGrid');

    const entries = Object.entries(prompts);
    if (entries.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">📝</div><h3>No prompts in library</h3></div>';
      return;
    }

    entries.forEach(([name, content]) => {
      const displayName = name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const preview = content.slice(0, 150);
      grid.innerHTML += `
        <div class="card" style="cursor:pointer" onclick="showPromptDetail('${name}')">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px">${displayName}</div>
          <pre style="font-size:11px;max-height:120px;overflow:hidden">${escapeHtml(preview)}...</pre>
          <div style="margin-top:8px;display:flex;gap:4px">
            <span class="badge badge-info">${content.split('\n').length} lines</span>
          </div>
        </div>
      `;
    });
  } catch (err) {
    document.getElementById('promptGrid').innerHTML = `<div class="empty-state"><div class="icon">⚠</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function showPromptDetail(name) {
  const content = document.getElementById('pageContent');
  let fullContent = '';
  try {
    const prompts = await api.getPrompts();
    fullContent = prompts[name] || '';
  } catch {}

  const displayName = name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${displayName}</h1>
        <p class="page-subtitle">Prompt template</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="copyPrompt()" id="copyPromptBtn">📋 Copy</button>
        <button class="btn" onclick="renderPrompts()">← Back</button>
      </div>
    </div>
    <div class="card">
      <pre id="promptContent" style="white-space:pre-wrap">${escapeHtml(fullContent)}</pre>
    </div>
  `;
}

function copyPrompt() {
  const pre = document.getElementById('promptContent');
  if (!pre) return;
  navigator.clipboard.writeText(pre.textContent).then(() => {
    showToast('Copied to clipboard', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}
