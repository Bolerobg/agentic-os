async function renderMemory() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Memory</h1>
        <p class="page-subtitle">Persistent context and shared brain</p>
      </div>
    </div>
    <div id="memoryFiles"></div>
  `;

  try {
    const brain = await api.getBrain();
    const container = document.getElementById('memoryFiles');
    const fileNames = Object.keys(brain);

    if (fileNames.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">🧠</div><h3>No memory files found</h3></div>';
      return;
    }

    fileNames.forEach(name => {
      const content = brain[name];
      const preview = content.slice(0, 300);
      container.innerHTML += `
        <div class="card">
          <div class="card-header">
            <span class="card-title">${name}</span>
            <button class="btn btn-sm" onclick="editMemoryFile('${name}')">✏ Edit</button>
          </div>
          <pre style="max-height:200px;overflow:auto;font-size:12px">${escapeHtml(preview)}${content.length > 300 ? '\n...' : ''}</pre>
          <div style="margin-top:8px;font-size:11px;color:var(--text2)">${content.length} characters</div>
        </div>
      `;
    });
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="icon">⚠</div><h3>Error</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function editMemoryFile(name) {
  const content = document.getElementById('pageContent');
  let existingContent = '';
  try {
    const file = await api.getBrainFile(name);
    existingContent = file.content;
  } catch {}

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Edit: ${name}</h1>
        <p class="page-subtitle">Modify shared memory</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="saveMemoryFile('${name}')">💾 Save</button>
        <button class="btn" onclick="renderMemory()">← Back</button>
      </div>
    </div>
    <div class="card">
      <textarea id="memoryEditor" style="min-height:400px;font-family:monospace">${escapeHtml(existingContent)}</textarea>
    </div>
  `;
}

async function saveMemoryFile(name) {
  const content = document.getElementById('memoryEditor').value;
  try {
    await api.updateBrainFile(name, content);
    showToast(`'${name}' saved`, 'success');
    renderMemory();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
