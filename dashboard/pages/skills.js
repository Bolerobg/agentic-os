async function renderSkills() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Skills</h1>
        <p class="page-subtitle">Browse, run, and monitor skill performance</p>
      </div>
    </div>
    <div id="skillsGrid" class="grid grid-3"></div>
    <div id="skillDetail" style="display:none"></div>
  `;

  try {
    const skills = await api.getSkills();
    const grid = document.getElementById('skillsGrid');
    if (skills.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="icon">⚡</div><h3>No skills installed</h3></div>';
      return;
    }
    skills.forEach(s => {
      const lastScore = s.scores && s.scores.length > 0 ? s.scores[s.scores.length - 1] : null;
      const avgScore = lastScore ? (lastScore.criteria_scores || []).reduce((a, b) => a + b, 0) / (lastScore.criteria_scores || [1]).length : null;
      grid.innerHTML += `
        <div class="skill-card" onclick="showSkillDetail('${s.name}')">
          <div class="skill-name">${s.name.replace(/-/g, ' ')}</div>
          <div class="skill-desc">${s.description ? s.description.slice(0, 120) + '...' : 'No description'}</div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
            ${avgScore !== null ? `<span class="badge badge-success">Score: ${(avgScore * 100).toFixed(0)}%</span>` : ''}
            ${s.has_learnings ? '<span class="badge badge-info">Learning</span>' : ''}
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();quickRun('${s.name}')">▶ Run</button>
          </div>
        </div>
      `;
    });
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="icon">⚠</div><h3>Error loading skills</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function showSkillDetail(name) {
  const detail = document.getElementById('skillDetail');
  const grid = document.getElementById('skillsGrid');
  grid.style.display = 'none';
  detail.style.display = 'block';

  detail.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${name.replace(/-/g, ' ')}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="quickRun('${name}')">▶ Run</button>
          <button class="btn btn-sm" onclick="backToSkills()">← Back</button>
        </div>
      </div>
      <div id="skillDetailContent" class="loading">Loading...</div>
    </div>
  `;

  try {
    const skill = await api.getSkill(name);
    const evalHistory = await api.getSkillEval(name);
    const scores = evalHistory.scores || [];

    let scoreHtml = '';
    if (scores.length > 0) {
      const recent = scores[scores.length - 1];
      const avg = recent.total_score || 0;
      scoreHtml = `
        <div style="margin:12px 0">
          <strong>Eval Score History:</strong>
          <div style="display:flex;gap:4px;margin-top:4px">
            ${scores.slice(-10).map(s => `<span class="badge ${s.total_score > 0.7 ? 'badge-success' : 'badge-warning'}">${(s.total_score * 100).toFixed(0)}%</span>`).join('')}
          </div>
        </div>
      `;
    }

    detail.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${name.replace(/-/g, ' ')}</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" onclick="quickRun('${name}')">▶ Run</button>
            <button class="btn btn-sm" onclick="backToSkills()">← Back</button>
          </div>
        </div>
        <div id="skillDetailContent">
          <div class="grid grid-2">
            <div>
              <h3 style="margin-bottom:8px">SKILL.md</h3>
              <pre style="max-height:400px;overflow:auto">${escapeHtml(skill.skill || 'No SKILL.md')}</pre>
            </div>
            <div>
              <h3 style="margin-bottom:8px">Learnings</h3>
              <pre style="max-height:400px;overflow:auto">${escapeHtml(skill.learnings || 'No learnings yet')}</pre>
            </div>
          </div>
          ${scoreHtml}
          <div style="margin-top:12px">
            <strong>Context files:</strong> ${(skill.context || []).join(', ') || 'None'}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    document.getElementById('skillDetailContent').innerHTML = `<span style="color:var(--red)">Error: ${escapeHtml(err.message)}</span>`;
  }
}

function backToSkills() {
  document.getElementById('skillsGrid').style.display = 'grid';
  document.getElementById('skillDetail').style.display = 'none';
  renderSkills();
}

async function quickRun(name) {
  try {
    const r = await api.runSkill(name);
    showToast(`'${name}' dispatched to ${r.agent}`, 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
