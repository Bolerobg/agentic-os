async function renderSkills() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Skills Hub</h1>
        <p class="page-subtitle">Browse, run, and monitor skill performance</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="showNewSkill()">+ New Skill</button>
        <button class="btn" onclick="showAiSkillGenerator()" style="background:linear-gradient(135deg,var(--accent),#fd79a8);color:white;border:none">🤖 AI Generate</button>
        <input id="skillFilter" class="form-input" style="width:200px" placeholder="Filter skills..." oninput="filterSkills()">
      </div>
    </div>
    <div class="tabs" id="skillTabs">
      <button class="tab active" data-view="grid" onclick="switchSkillView('grid')">📊 Grid</button>
      <button class="tab" data-view="list" onclick="switchSkillView('list')">📋 List</button>
    </div>
    <div id="skillsContainer"><div class="loading"><div class="loading-spinner"></div></div></div>
    <div id="skillDetail" style="display:none"></div>
  `;

  try {
    const skills = await api.getSkills();
    window._allSkills = skills;
    renderSkillGrid(skills);
  } catch (err) {
    document.getElementById('skillsContainer').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

function renderSkillGrid(skills) {
  const container = document.getElementById('skillsContainer');
  if (!skills || skills.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚡</div><div class="empty-state-title">No skills installed</div></div>';
    return;
  }
    container.innerHTML = `<div class="grid grid-3" id="skillGrid">${skills.map(s => {
    const lastScore = s.scores && s.scores.length > 0 ? s.scores[s.scores.length - 1] : null;
    const avg = lastScore && lastScore.criteria_scores ? (lastScore.criteria_scores.reduce((a, b) => a + b, 0) / lastScore.criteria_scores.length) : null;
    const icons = ['⚡', '🔧', '📝', '🔍', '🔄', '🎯', '📊', '🛠', '💡', '🧪', '📋', '💾', '💰', '🔄', '🎨'];
    const iconIdx = s.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % icons.length;
    const icon = icons[iconIdx];
    const sName = escapeHtml(s.name);
    const sDesc = escapeHtml(s.description || '').slice(0, 120) + ((s.description || '').length > 120 ? '...' : '');
    return `<div class="skill-card" onclick="showSkillDetail('${encodeURIComponent(s.name)}')">
      <div class="skill-card-header">
        <div class="skill-card-icon">${icon}</div>
        <div class="skill-card-name">${sName.replace(/-/g, ' ')}</div>
      </div>
      <div class="skill-card-desc">${sDesc || 'No description'}</div>
      <div class="skill-card-footer">
        ${avg !== null ? `<span class="badge badge-success">${(avg * 100).toFixed(0)}%</span>` : '<span class="badge badge-info">New</span>'}
        ${s.has_learnings ? '<span class="badge badge-accent">📖</span>' : ''}
        <button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="event.stopPropagation();quickRunSkill('${encodeURIComponent(s.name)}')">▶ Run</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function switchSkillView(view) {
  document.querySelectorAll('#skillTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  if (view === 'list') {
    const skills = window._allSkills || [];
    document.getElementById('skillsContainer').innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Skill</th><th>Score</th><th>Learnings</th><th></th></tr></thead><tbody>${skills.map(s => {
      const lastScore = s.scores && s.scores.length > 0 ? s.scores[s.scores.length - 1] : null;
      const avg = lastScore && lastScore.criteria_scores ? (lastScore.criteria_scores.reduce((a, b) => a + b, 0) / lastScore.criteria_scores.length) : null;
      const sName = escapeHtml(s.name);
      return `<tr onclick="showSkillDetail('${encodeURIComponent(s.name)}')" style="cursor:pointer">
        <td><strong>${sName.replace(/-/g, ' ')}</strong></td>
        <td>${avg !== null ? `<span class="badge badge-success">${(avg * 100).toFixed(0)}%</span>` : '<span class="badge badge-info">—</span>'}</td>
        <td>${s.has_learnings ? '<span class="badge badge-accent">✓</span>' : '<span class="badge">—</span>'}</td>
        <td><button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteSkillConfirm('${encodeURIComponent(s.name)}')" title="Delete">🗑</button>
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();quickRunSkill('${encodeURIComponent(s.name)}')">▶</button></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
  } else {
    renderSkillGrid(window._allSkills || []);
  }
}

function filterSkills() {
  const q = document.getElementById('skillFilter').value.toLowerCase();
  const skills = (window._allSkills || []).filter(s => s.name.toLowerCase().includes(q));
  renderSkillGrid(skills);
}

async function showSkillDetail(encodedName) {
  const name = decodeURIComponent(encodedName);
  document.getElementById('skillsContainer').style.display = 'none';
  document.getElementById('skillTabs').style.display = 'none';
  document.getElementById('skillFilter').style.display = 'none';
  const detail = document.getElementById('skillDetail');
  detail.style.display = 'block';
  detail.innerHTML = `<div class="loading"><div class="loading-spinner"></div></div>`;

  try {
    const skill = await api.getSkill(name);
    const scores = skill.score_history || [];
    const lastScore = scores.length > 0 ? scores[scores.length - 1] : null;
    const avg = lastScore && lastScore.criteria_scores ? (lastScore.criteria_scores.reduce((a, b) => a + b, 0) / lastScore.criteria_scores.length) : null;
    const safeName = escapeHtml(name);

    detail.innerHTML = `
      <div style="margin-bottom:16px">
        <button class="btn btn-ghost" onclick="backToSkills()">← Back to Skills</button>
        <button class="btn btn-primary" style="margin-left:8px" onclick="quickRunSkill('${encodeURIComponent(name)}')">▶ Run ${safeName.replace(/-/g, ' ')}</button>
        <button class="btn" style="margin-left:8px" onclick="editSkillContent('${encodeURIComponent(name)}')">✏ Edit</button>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><span class="card-title">📄 SKILL.md</span></div>
          <pre style="max-height:400px;overflow:auto;font-size:12px">${escapeHtml(skill.skill || 'No SKILL.md')}</pre>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📖 Learnings</span></div>
          <pre style="max-height:400px;overflow:auto;font-size:12px">${escapeHtml(skill.learnings || 'No learnings yet')}</pre>
        </div>
      </div>
      <div class="grid grid-2 mt-3">
        <div class="card">
          <div class="card-header"><span class="card-title">📊 Performance</span></div>
          ${scores.length > 0 ? `
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
              ${scores.slice(-10).map(s => `<span class="badge ${(s.total_score || 0) > 0.7 ? 'badge-success' : 'badge-warning'}">${((s.total_score || 0) * 100).toFixed(0)}%</span>`).join('')}
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${(avg || 0) * 100}%"></div></div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px">Average: ${avg !== null ? (avg * 100).toFixed(0) : 'N/A'}% (${scores.length} runs)</div>
          ` : '<div style="color:var(--text-muted);font-size:13px">No evaluation scores yet</div>'}
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📁 Context Files</span></div>
          ${skill.context && skill.context.length > 0
            ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${skill.context.map(f => `<span class="badge badge-info">${escapeHtml(f)}</span>`).join('')}</div>`
            : '<div style="color:var(--text-muted);font-size:13px">No context files</div>'}
          ${skill.eval && skill.eval.criteria ? `<div style="margin-top:12px"><strong style="font-size:12px">Eval Criteria:</strong><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${skill.eval.criteria.map(c => `<span class="badge badge-accent">${escapeHtml(c)}</span>`).join('')}</div></div>` : ''}
        </div>
      </div>
    `;
  } catch (err) {
    detail.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Error</div><div class="empty-state-desc">${escapeHtml(err.message)}</div><button class="btn btn-primary mt-3" onclick="backToSkills()">Back</button></div>`;
  }
}

function backToSkills() {
  document.getElementById('skillsContainer').style.display = '';
  document.getElementById('skillTabs').style.display = '';
  document.getElementById('skillFilter').style.display = '';
  document.getElementById('skillDetail').style.display = 'none';
}

async function quickRunSkill(encodedName) {
  const name = decodeURIComponent(encodedName);
  const displayName = escapeHtml(name.replace(/-/g, ' '));
  showModal(`Run: ${displayName}`, `
    <div class="form-group">
      <label class="form-label">Task / Input</label>
      <textarea id="qrsInput" class="form-textarea" rows="4" placeholder="Describe what you want this skill to do..."></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Agent</label>
        <select id="qrsAgent" class="form-select">
          <option value="auto">Auto-detect</option>
          <option value="opencode">opencode</option>
          <option value="hermes">Hermes</option>
          <option value="gemini">Gemini CLI</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Output Folder (where to save files)</label>
        <div style="display:flex;gap:6px">
          <input id="qrsOutputPath" class="form-input" placeholder="skills/${escapeHtml(name)}/output" style="font-size:11px">
          <button class="btn btn-sm" onclick="browseSkillOutput()" title="Browse folders">📂</button>
        </div>
        <div class="form-hint">Auto-saves generated code files to this folder</div>
      <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px">
        <input type="checkbox" id="qrsMultiStep"> 🔄 Multi-step — auto-split into 3-4 parts (for large projects)
      </label>
      </div>
    </div>
    <div id="skillResult" style="display:none"></div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="executeSkillRun('${encodeURIComponent(name)}')">▶ Run</button>
  `);
}

// Browse folder for skill output (reuses chat's browseProject)
window.browseSkillOutput = function(currentPath) {
  var sp = currentPath || (document.getElementById("qrsOutputPath") ? document.getElementById("qrsOutputPath").value.trim() : "") || "/Users/bolero/Documents";
  var inputEl = document.getElementById("qrsOutputPath");
  
  // Use inner modal: show folder picker inside the existing modal body
  var modalBody = document.querySelector("#modalContainer .modal-body");
  if (!modalBody) return;
  
  // Save original content AND input values
  if (!window._skillRunOriginalBody) {
    window._skillRunOriginalBody = modalBody.innerHTML;
    window._skillRunOriginalFooter = document.querySelector("#modalContainer .modal-footer") ? document.querySelector("#modalContainer .modal-footer").innerHTML : "";
    // Save all input values before they get lost
    window._savedInputValues = {};
    var inputs = modalBody.querySelectorAll("input, textarea, select");
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.id) window._savedInputValues[el.id] = el.value;
    }
  }
  
  fetch("/api/projects?path=" + encodeURIComponent(sp)).then(function(r) { return r.json(); }).then(function(data) {
    var items = data.items || [];
    var dirs = items.filter(function(f) { return f.type === "dir"; });
    var h = "";
    dirs.forEach(function(d) {
      var np = (sp.replace(/\/+$/, "") + "/" + d.name).replace(/'/g, "\'");
      h += '<div style="padding:6px 8px;cursor:pointer;border-radius:6px;font-size:12px" onmouseover="this.style.background=\'var(--bg-card-hover)\'" onmouseout="this.style.background=\'\'" onclick="browseSkillOutput(\'' + np + '\')">📁 ' + d.name + '</div>';
    });
    
    var titleEl = document.querySelector("#modalContainer .modal-title");
    if (titleEl) titleEl.textContent = "📂 Select Output Folder";
    
    modalBody.innerHTML = 
      '<div style="font-family:monospace;font-size:11px;color:var(--accent-light);margin-bottom:12px">📁 ' + sp + '</div>' +
      (dirs.length > 0 ? '<div style="max-height:250px;overflow-y:auto">' + h + '</div>' : '<div style="font-size:12px;color:var(--text-muted)">No subfolders</div>');
    
    var footerEl = document.querySelector("#modalContainer .modal-footer");
    if (footerEl) {
      var parent = sp.split("/").slice(0, -1).join("/") || "/";
      footerEl.innerHTML = 
        '<button class="btn btn-primary" onclick="selectBrowseOutput(\'' + sp.replace(/'/g, "\'") + '\')">✅ Select</button>' +
        (sp !== "/" ? '<button class="btn btn-sm" onclick="browseSkillOutput(\'' + parent.replace(/'/g, "\'") + '\')">⬆ Parent</button>' : '') +
        '<button class="btn btn-ghost" onclick="cancelBrowseOutput()">Cancel</button>';
    }
  });
};

window.selectBrowseOutput = function(path) {
  // Save the selected path to be restored
  if (!window._savedInputValues) window._savedInputValues = {};
  window._savedInputValues["qrsOutputPath"] = path;
  cancelBrowseOutput();
};

window.cancelBrowseOutput = function() {
  var modalBody = document.querySelector("#modalContainer .modal-body");
  var titleEl = document.querySelector("#modalContainer .modal-title");
  var footerEl = document.querySelector("#modalContainer .modal-footer");
  if (modalBody && window._skillRunOriginalBody) {
    modalBody.innerHTML = window._skillRunOriginalBody;
    window._skillRunOriginalBody = null;
    // Restore saved input values
    if (window._savedInputValues) {
      Object.keys(window._savedInputValues).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = window._savedInputValues[id];
      });
      window._savedInputValues = null;
    }
  }
  if (titleEl) titleEl.textContent = titleEl.textContent.replace("📂 Select Output Folder", "");
  if (footerEl && window._skillRunOriginalFooter) {
    footerEl.innerHTML = window._skillRunOriginalFooter;
    window._skillRunOriginalFooter = null;
  }
  // Re-bind the Run button onclick
  var runBtn = footerEl ? footerEl.querySelector(".btn-primary") : null;
  // The button already has the onclick from original
};

async function executeSkillRun(encodedName) {
  const name = decodeURIComponent(encodedName);
  const input = document.getElementById('qrsInput').value;
  const agent = document.getElementById('qrsAgent').value;
  const outputPath = document.getElementById('qrsOutputPath')?.value?.trim() || '';
  const multiStep = document.getElementById('qrsMultiStep')?.checked || false;
  const runBtn = document.querySelector('#modalContainer .btn-primary');
  const resultArea = document.getElementById('skillResult');

  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ Running...'; }
  if (resultArea) { resultArea.style.display = 'block'; resultArea.innerHTML = ''; }

  
// Inject progress styles
if (!document.getElementById("skillProgressStyles")) {
  var s = document.createElement("style");
  s.id = "skillProgressStyles";
  s.textContent = ".skill-progress-bar { height:4px; background:var(--bg-dim); border-radius:99px; margin:8px 0; overflow:hidden } .skill-progress-fill { height:100%; background:linear-gradient(90deg,var(--accent),var(--green)); border-radius:99px; transition:width 0.3s; width:0% } .skill-spinner { display:inline-block; width:12px; height:12px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin 0.8s linear infinite; margin-right:6px; vertical-align:middle } @keyframes spin { to { transform:rotate(360deg) } } .skill-log-line { display:flex; align-items:center; gap:4px }";
  document.head.appendChild(s);
}

  
  // Initialize progress tracking
  window._skillRunning = true;
  window._skillProgressPct = 5;
  window._skillProgressLabel = 'Initializing...';

  // Log window helper
  var logs = [];
  function addLog(msg, type) {
    var t = new Date().toLocaleTimeString();
    logs.push({time: t, msg: msg, type: type || 'info'});
    var colors = {info: 'var(--text-secondary)', success: 'var(--green)', error: 'var(--red)', ai: 'var(--accent-light)', file: 'var(--yellow)'};
    var icons = {info: 'ℹ', success: '✓', error: '✕', ai: '🤖', file: '📁', progress: '⏳'};
    var running = window._skillRunning;
    var h = '<div class="card" style="padding:10px;margin-bottom:4px;border-color:var(--border)">';
    // Progress bar
    if (running && window._skillProgressPct >= 0) {
      h += '<div class="skill-progress-bar"><div class="skill-progress-fill" style="width:' + window._skillProgressPct + '%"></div></div>';
      h += '<div style="font-size:9px;color:var(--text-muted);text-align:center;margin-bottom:4px">' + (window._skillProgressLabel || 'Working...') + '</div>';
    }
    h += '<div style="font-family:var(--font-mono);font-size:10px;line-height:1.5;max-height:280px;overflow-y:auto" id="skillLogArea">';
    for (var i = 0; i < logs.length; i++) {
      var isActive = running && i === logs.length - 1 && (logs[i].type === 'ai' || logs[i].type === 'progress');
      var spinner = isActive ? '<span class="skill-spinner"></span>' : '';
      h += '<div class="skill-log-line" style="color:' + (colors[logs[i].type] || colors.info) + ';margin-bottom:1px">' + spinner + icons[logs[i].type] + ' <span style="color:var(--text-muted)">' + logs[i].time + '</span> ' + logs[i].msg + '</div>';
    }
    h += '</div></div>';
    resultArea.innerHTML = h;
    var logArea = document.getElementById('skillLogArea');
    if (logArea) logArea.scrollTop = logArea.scrollHeight;
  }

  addLog('Starting skill execution...', 'info');
  addLog('Agent: ' + (agent || 'auto'), 'info');

  try {
    let r;
    if (multiStep) {
      addLog('Multi-step mode enabled', 'ai');
      addLog('AI planning task split...', 'ai');
      
      // Use default 3-step split (always works, no API call needed)
      const steps = [
        {title: "Part 1: Core & Config", task: "Write ONLY the config files, main entry point, and core infrastructure modules. Include: config.py, main.py, .env.example, requirements.txt. Task: " + input.slice(0,250)},
        {title: "Part 2: Features & Logic", task: "Write ONLY the feature modules, business logic, strategies, and algorithms. Do NOT repeat config or main files. Task: " + input.slice(0,250)},
        {title: "Part 3: Docs & Final", task: "Write ONLY documentation (README.md), tests, and any remaining utility files. Do NOT repeat code from previous parts. Task: " + input.slice(0,250)}
      ];
      addLog('Split into ' + steps.length + ' steps', 'success');

      let allOutput = '';
      addLog('Starting ' + steps.length + '-step execution...', 'info');
      for (let i = 0; i < steps.length; i++) {
        addLog('▶ Step ' + (i+1) + '/' + steps.length + ': ' + steps[i].title, 'ai');
        addLog('  Prompt size: ' + steps[i].task.length + ' chars', 'info');
        var stepStart = Date.now();
        const stepRes = await api.runSkill(name, steps[i].task, agent, outputPath);
        var stepTime = ((Date.now() - stepStart) / 1000).toFixed(1);
        addLog('  Completed in ' + stepTime + 's, output: ' + ((stepRes.output || '').length) + ' chars', 'success');
        if (stepRes.files_created && stepRes.files_created.length > 0) {
          addLog('  📁 ' + stepRes.files_created.length + ' files saved', 'file');
        }
        allOutput += '\n## ' + steps[i].title + '\n' + (stepRes.output || '');
        if (stepRes.files_created) allOutput += '\n📁 ' + stepRes.files_created.length + ' files saved';
      }
      r = { output: allOutput, agent: 'multi-step', run_id: 'ms-' + Date.now(), files_created: [], output_dir: outputPath, message: 'Multi-step completed' };
    } else {
      window._skillRunning = true;
      window._skillProgressPct = 10; window._skillProgressLabel = 'Connecting...';
      addLog('Single-step mode', 'info');
      addLog('Prompt: ' + input.length + ' chars → DeepSeek', 'ai');
      window._skillProgressPct = 25; window._skillProgressLabel = 'Generating...';
      var t0 = Date.now();
      r = await api.runSkill(name, input, agent, outputPath);
      window._skillProgressPct = 90; window._skillProgressLabel = 'Saving files...';
      var elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      addLog('Response: ' + ((r.output || '').length) + ' chars in ' + elapsed + 's', 'success');
      if (r.files_created && r.files_created.length > 0) {
        addLog(r.files_created.length + ' files created', 'file');
        r.files_created.forEach(function(f) { addLog('  ' + f, 'file'); });
      }
    }
    window._skillRunning = false;
    window._skillProgressPct = 100; window._skillProgressLabel = 'Complete';
    if (r.files_created && r.files_created.length > 0) {
      addLog(r.files_created.length + ' files saved to ' + (r.output_dir || 'output/'), 'file');
      r.files_created.forEach(function(f) { addLog(f, 'file'); });
    }
    addLog('Done!', 'success');
    if (resultArea) {
      const outputText = r.output || '(no output)';
      resultArea.innerHTML = `
        <div class="card" style="margin-top:8px">
          <div class="card-header" style="border-color:var(--green-dim)">
            <span class="card-title" style="color:var(--green)">✓ Completed — ${r.agent} #${r.run_id}</span>
          </div>
          <pre style="max-height:400px;overflow:auto;font-size:12px;white-space:pre-wrap;margin:0;padding:12px;background:var(--bg-code, #1a1a2e);border-radius:0 0 8px 8px">${escapeHtml(outputText)}</pre>
        </div>`;
    }
    if (runBtn) { runBtn.textContent = '✓ Done'; runBtn.disabled = false; }
  } catch (err) {
    if (resultArea) {
      resultArea.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-state-icon">⚠</div><div class="empty-state-title">Error</div><div class="empty-state-desc">${escapeHtml(err.message)}</div></div>`;
    }
    if (runBtn) { runBtn.textContent = '▶ Run'; runBtn.disabled = false; }
  }
}

async function showNewSkill() {
  showModal('New Skill', `
    <div class="form-group">
      <label class="form-label">Skill Name (lowercase, hyphens)</label>
      <input id="newSkillName" class="form-input" placeholder="my-new-skill" oninput="this.value=this.value.replace(/\\s+/g,\'−\').replace(/[^a-z0-9-]/gi,\'−\').toLowerCase()">
    </div>
    <div class="form-group">
      <label class="form-label">Description</label>
      <textarea id="newSkillDesc" class="form-textarea" rows="3" placeholder="What does this skill do?\n\nBe specific — this helps the AI understand when to use it."></textarea>
    </div>
    <div class="form-hint">Creates SKILL.md, learnings.md, eval.json, score-history.json automatically.</div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createNewSkill()">Create Skill</button>
  `);
}

async function createNewSkill() {
  const name = document.getElementById('newSkillName').value.trim();
  const desc = document.getElementById('newSkillDesc').value.trim();
  if (!name) { showToast('Name required', 'warning'); return; }
  try {
    await api.generateSkill(name, desc);
    closeModal();
    showToast(`Skill "${name}" created`, 'success');
    renderSkills();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

function deleteSkillConfirm(encodedName) {
  const name = decodeURIComponent(encodedName);
  if (!confirm(`Delete skill "${name}"? This removes the entire skill folder and cannot be undone.`)) return;
  deleteSkill(name);
}

async function deleteSkill(name) {
  try {
    await api.deleteSkill(name);
    showToast(`"${name}" deleted`, 'success');
    renderSkills();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}


async function showAiSkillGenerator() {
  showModal('🤖 AI Skill Generator', `
    <div class="form-group">
      <label class="form-label">Describe your skill idea</label>
      <textarea id="aiSkillIdea" class="form-textarea" rows="5" placeholder="Example: A skill that analyzes website SEO and suggests improvements. It should check meta tags, headings, keywords, page speed, and generate a report with actionable fixes."></textarea>
      <div class="form-hint">Write naturally — the AI will format it into a professional SKILL.md</div>
    </div>
    <div id="aiSkillResult" style="display:none;margin-top:12px">
      <label class="form-label">Generated SKILL.md</label>
      <pre id="aiSkillContent" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);padding:12px;font-size:11px;font-family:var(--font-mono);white-space:pre-wrap;max-height:300px;overflow-y:auto"></pre>
      <div id="aiSkillActions" style="display:flex;gap:8px;margin-top:8px">
        <input id="aiSkillName" class="form-input" placeholder="skill-name" style="flex:1;font-size:12px">
        <button class="btn btn-sm" onclick="copyAiSkill()">📋 Copy</button>
        <button class="btn btn-sm btn-primary" onclick="saveAiSkill()">💾 Save as Skill</button>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="generateAiSkill()" id="aiGenBtn">🤖 Generate</button>
  `);
}

async function generateAiSkill() {
  const idea = document.getElementById('aiSkillIdea').value.trim();
  if (idea.length < 10) { showToast('Please describe your idea (at least 10 chars)', 'warning'); return; }
  const btn = document.getElementById('aiGenBtn');
  btn.disabled = true; btn.textContent = '⏳ Generating...';
  try {
    const res = await api.aiGenerateSkill(idea);
    document.getElementById('aiSkillContent').textContent = res.skill_md || '';
    document.getElementById('aiSkillResult').style.display = 'block';
    // Auto-suggest name from first line
    const rawName = (res.skill_md || '').split('\\n')[0].replace(/^# /, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '').replace(/^-+/, '');
    document.getElementById('aiSkillName').value = rawName.slice(0, 50).replace(/-$/, '') || 'new-skill';
    btn.disabled = false; btn.textContent = '🤖 Regenerate';
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false; btn.textContent = '🤖 Generate';
  }
}

function copyAiSkill() {
  const content = document.getElementById('aiSkillContent').textContent;
  navigator.clipboard.writeText(content).then(() => showToast('Copied!', 'success'));
}

async function saveAiSkill() {
  const name = document.getElementById('aiSkillName').value.trim();
  const content = document.getElementById('aiSkillContent').textContent;
  if (!name) { showToast('Enter a skill name', 'warning'); return; }
  try {
    await api.generateSkill(name, content);
    closeModal();
    showToast(`Skill "${name}" saved!`, 'success');
    renderSkills();
  } catch (err) { showToast(err.message, 'error'); }
}


async function editSkillContent(encodedName) {
  const name = decodeURIComponent(encodedName);
  let content = "";
  try { const s = await api.getSkill(name); content = s.skill || ""; } catch {}
  showModal("Edit SKILL.md: " + name, `
    <textarea id="editSkillMd" class="form-textarea" rows="20" style="font-family:var(--font-mono);font-size:12px">${escapeHtml(content)}</textarea>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveSkillMd('${encodeURIComponent(name)}')">💾 Save</button>
  `);
}

async function saveSkillMd(encodedName) {
  const name = decodeURIComponent(encodedName);
  const content = document.getElementById("editSkillMd").value;
  try {
    await api.updateSkill(name, content);
    closeModal();
    showToast("SKILL.md saved", "success");
    showSkillDetail(encodedName);
  } catch (err) { showToast(err.message, "error"); }
}
