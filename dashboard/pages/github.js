// GitHub Manager — Intelligent repo management
let githubConnected = false;
let githubUser = null;

async function renderGithub() {
  const content = document.getElementById('pageContent');

  // First check connection
  try {
    const status = await api.getGithubStatus();
    githubConnected = status.connected;
    githubUser = status;
  } catch {
    githubConnected = false;
  }

  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">GitHub Manager</h1>
        <p class="page-subtitle">Init, commit, push — manage any project's GitHub repo from here</p>
      </div>
      <div class="btn-group">
        ${githubConnected
          ? `<span style="display:flex;align-items:center;gap:6px"><img src="${githubUser?.avatar || ''}" style="width:24px;height:24px;border-radius:50%"><strong>${githubUser?.user || ''}</strong><span class="agent-dot online" style="width:8px;height:8px"></span></span>`
          : `<button class="btn btn-primary" onclick="navigate('settings')">⚙ Configure GitHub Token</button>`
        }
        <button class="btn" onclick="renderGithub()">🔄 Refresh</button>
      </div>
    </div>

    ${!githubConnected ? `
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:48px;margin-bottom:12px">🔐</div>
        <h3>GitHub Not Connected</h3>
        <p style="color:var(--text-muted);margin:8px 0 16px">Add your GitHub username and personal access token in Settings to enable repo management.</p>
        <button class="btn btn-primary" onclick="navigate('settings')">⚙ Go to Settings</button>
        <div style="margin-top:12px;font-size:11px;color:var(--text-muted)">
          Token needs: <code>repo</code> scope for private repos, or <code>public_repo</code> for public only
        </div>
      </div>
    ` : `
      <!-- Quick Actions -->
      <div class="card mb-4" style="background:linear-gradient(135deg,var(--bg-card),var(--accent-glow))">
        <div class="grid grid-3" style="gap:12px">
          <div>
            <label class="form-label">Project Folder</label>
            <div style="display:flex;gap:6px">
              <input id="ghProjectPath" class="form-input" placeholder="/Users/bolero/Documents/my-project" value="/Users/bolero/Documents/">
              <button class="btn btn-sm" onclick="browseGhFolder()" title="Browse">📂</button>
            </div>
          </div>
          <div>
            <label class="form-label">Repo Name (optional)</label>
            <input id="ghRepoName" class="form-input" placeholder="Auto-detected from folder name">
          </div>
          <div style="display:flex;align-items:flex-end;gap:6px">
            <button class="btn btn-primary" onclick="smartInitRepo()" id="ghInitBtn">🚀 Smart Init</button>
            <button class="btn" onclick="checkProjectStatus()">🔍 Check</button>
          </div>
        </div>
        <div class="form-hint" style="margin-top:8px">
          <strong>Smart Init</strong> automatically: creates GitHub repo → git init → .gitignore → commit → push. If already a repo, it shows commit/push options.
        </div>
      </div>

      <!-- Project Status -->
      <div id="ghProjectStatus" class="mb-4"></div>

      <!-- Your Repositories -->
      <div class="section-title">📦 Your GitHub Repositories</div>
      <div id="ghReposList"><div class="loading"><div class="loading-spinner"></div></div></div>
    `}
  `;

  if (githubConnected) {
    loadGhRepos();
  }

  // Add styles
  if (!document.getElementById('ghStyles')) {
    const style = document.createElement('style');
    style.id = 'ghStyles';
    style.textContent = `
      .gh-repo-card { cursor:pointer;transition:var(--transition) }
      .gh-repo-card:hover { border-color:var(--accent);transform:translateY(-1px) }
      .gh-file-row { display:flex;align-items:center;gap:6px;padding:4px 0;font-size:12px;font-family:var(--font-mono) }
      .gh-file-row.modified { color:var(--yellow) }
      .gh-file-row.added { color:var(--green) }
      .gh-file-row.deleted { color:var(--red) }
      .gh-commit-box { background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:12px;font-family:var(--font-mono);font-size:11px;max-height:200px;overflow-y:auto }
    `;
    document.head.appendChild(style);
  }
}

async function browseGhFolder() {
  const input = document.getElementById('ghProjectPath');
  const path = prompt('Enter project folder path:', input?.value || '/Users/bolero/Documents');
  if (path) {
    input.value = path;
    checkProjectStatus();
  }
}

async function checkProjectStatus() {
  const path = document.getElementById('ghProjectPath')?.value?.trim();
  if (!path) { showToast('Enter a project path first', 'warning'); return; }

  const container = document.getElementById('ghProjectStatus');
  container.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

  try {
    const info = await api.getGithubProjectInfo(path);

    if (!info.is_repo) {
      container.innerHTML = `
        <div class="card" style="border-color:var(--yellow)">
          <div class="flex items-center justify-between">
            <div>
              <strong>📁 ${escapeHtml(info.path)}</strong>
              <div class="text-sm text-muted">Not a git repository yet</div>
            </div>
            <button class="btn btn-primary" onclick="smartInitRepo()">🚀 Initialize Repo</button>
          </div>
        </div>
      `;
      return;
    }

    const files = info.changed_files || [];
    const staged = files.filter(f => !f.startsWith('??') && !f.startsWith(' M') && !f.startsWith(' D'));
    const unstaged = files.filter(f => f.startsWith(' M') || f.startsWith(' D') || f.startsWith('??'));

    container.innerHTML = `
      <div class="card" style="border-color:var(--green)">
        <div class="flex items-center justify-between mb-3">
          <div>
            <strong>📁 ${escapeHtml(info.path)}</strong>
            <div class="text-sm text-muted">
              🌿 ${info.branch || 'main'} · ${info.remote ? '🔗 ' + escapeHtml(info.remote) : 'no remote'}
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-primary" onclick="smartCommit('${escapeHtml(path)}')" ${files.length === 0 ? 'disabled' : ''}>💾 Commit & Push</button>
            <button class="btn btn-sm" onclick="quickPush('${escapeHtml(path)}')">📤 Push</button>
          </div>
        </div>

        ${info.last_commit ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Last: ${escapeHtml(info.last_commit)}</div>` : ''}

        ${files.length > 0 ? `
          <div class="section-title" style="font-size:11px">Changed Files (${files.length})</div>
          <div style="max-height:200px;overflow-y:auto">
            ${files.map(f => {
              const prefix = f.substring(0, 2);
              const filename = f.substring(3);
              const cls = prefix.includes('M') ? 'modified' : prefix.includes('D') ? 'deleted' : 'added';
              const icon = cls === 'modified' ? '✏' : cls === 'deleted' ? '🗑' : '➕';
              return `<div class="gh-file-row ${cls}"><span>${icon}</span><span>${escapeHtml(filename)}</span></div>`;
            }).join('')}
          </div>
        ` : '<div class="text-sm text-muted" style="padding:12px 0">✅ Working tree clean — nothing to commit</div>'}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="card" style="border-color:var(--red)"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div></div>`;
  }
}

async function smartInitRepo() {
  const path = document.getElementById('ghProjectPath')?.value?.trim();
  const name = document.getElementById('ghRepoName')?.value?.trim();

  if (!path) { showToast('Enter a project path', 'warning'); return; }

  const btn = document.getElementById('ghInitBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Initializing...';

  try {
    const res = await api.githubInit({ path, name, private: false });
    showToast(`✅ Repo created: ${res.repo}`, 'success');

    // Show result
    const container = document.getElementById('ghProjectStatus');
    container.innerHTML = `
      <div class="card" style="border-color:var(--green)">
        <div class="flex items-center justify-between mb-2">
          <strong>🚀 Repository Initialized!</strong>
          <a href="${res.url}" target="_blank" class="btn btn-sm">🔗 Open on GitHub</a>
        </div>
        <div class="text-sm text-muted mb-2">${res.repo} · ${escapeHtml(res.path)}</div>
        <div class="gh-commit-box">${escapeHtml(res.commit || '')}\n${escapeHtml(res.push || '')}</div>
      </div>
    `;
    loadGhRepos();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
    // Check if already a repo
    if (err.message.includes('already')) {
      checkProjectStatus();
    }
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Smart Init';
  }
}

async function smartCommit(path) {
  const message = prompt('Commit message:', 'Update via Agentic OS');
  if (!message) return;

  showToast('Committing...', 'info');
  try {
    const res = await api.githubCommit({ path, message });
    if (res.status === 'nothing_to_commit') {
      showToast('Nothing to commit', 'warning');
    } else {
      showToast('✅ Committed & pushed!', 'success');
    }
    checkProjectStatus();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function quickPush(path) {
  try {
    await api.githubPush({ path });
    showToast('Pushed to remote', 'success');
    checkProjectStatus();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function loadGhRepos() {
  const container = document.getElementById('ghReposList');
  try {
    const repos = await api.getGithubRepos();
    if (repos.length === 0) {
      container.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">📭</div><div class="empty-state-title">No repositories</div></div>';
      return;
    }

    container.innerHTML = `
      <div class="grid grid-2" style="gap:12px">
        ${repos.slice(0, 10).map(r => `
          <div class="card gh-repo-card">
            <div class="flex items-center justify-between mb-2">
              <strong>
                ${r.private ? '🔒' : '📖'} <a href="${r.url}" target="_blank" style="color:var(--accent-light)">${escapeHtml(r.full_name)}</a>
              </strong>
              <span class="text-sm text-muted">${timeAgo(r.updated)}</span>
            </div>
            ${r.description ? `<div class="text-sm text-muted mb-2">${escapeHtml(r.description)}</div>` : ''}
            <div class="flex gap-2" style="flex-wrap:wrap">
              ${r.language ? `<span class="badge badge-accent">${r.language}</span>` : ''}
              <button class="btn btn-sm" onclick="document.getElementById('ghProjectPath').value='${escapeHtml(r.clone_url)}';checkProjectStatus()">🔍 Check</button>
              <button class="btn btn-sm" onclick="navigator.clipboard.writeText('${escapeHtml(r.clone_url)}');showToast('URL copied','success')">📋 Clone URL</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

async function createNewRepo() {
  showModal('Create GitHub Repository', `
    <div class="form-group"><label class="form-label">Repository Name</label><input id="newRepoName" class="form-input" placeholder="my-awesome-project"></div>
    <div class="form-group"><label class="form-label">Description</label><textarea id="newRepoDesc" class="form-textarea" rows="2" placeholder="Optional description"></textarea></div>
    <div class="form-group"><label><input type="checkbox" id="newRepoPrivate"> Private repository</label></div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="doCreateRepo()">Create</button>
  `);
}

async function doCreateRepo() {
  const name = document.getElementById('newRepoName').value.trim();
  const description = document.getElementById('newRepoDesc').value.trim();
  const isPrivate = document.getElementById('newRepoPrivate').checked;
  if (!name) { showToast('Name required', 'warning'); return; }
  try {
    const repo = await api.createGithubRepo({ name, description, private: isPrivate });
    closeModal();
    showToast(`Repo ${repo.full_name} created!`, 'success');
    loadGhRepos();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}
