async function renderStandards() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Standards</h1>
        <p class="page-subtitle">Project standards and conventions</p>
      </div>
      <button class="btn btn-primary" onclick="runStandardsDiscovery()">🔍 Discover</button>
    </div>
    <div id="standardsContent"><div class="loading">Loading...</div></div>
  `;

  try {
    const data = await api.getStandards();
    const standards = data.standards || [];
    const index = data.index || '';
    const container = document.getElementById('standardsContent');

    let html = '';

    if (index) {
      html += `
        <div class="card">
          <div class="card-header"><span class="card-title">Standards Index</span></div>
          <pre style="font-size:12px">${escapeHtml(index)}</pre>
        </div>
      `;
    }

    if (standards.length === 0) {
      html += '<div class="empty-state"><div class="icon">📐</div><h3>No standards defined</h3><p>Run "Discover" to extract patterns from your codebase</p></div>';
    } else {
      standards.forEach(s => {
        html += `
          <div class="card">
            <div class="card-header"><span class="card-title">${s.name}</span></div>
            <pre style="font-size:12px;max-height:300px;overflow:auto">${escapeHtml(s.content)}</pre>
          </div>
        `;
      });
    }

    container.innerHTML = html;
  } catch (err) {
    document.getElementById('standardsContent').innerHTML = `<div class="empty-state"><div class="icon">⚠</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function runStandardsDiscovery() {
  try {
    const r = await api.discoverStandards();
    showToast(r.message, 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
