async function renderScheduler() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Scheduler</h1>
        <p class="page-subtitle">Manage scheduled workflows and cron jobs</p>
      </div>
      <button class="btn btn-primary" onclick="showNewJobForm()">+ New Job</button>
    </div>
    <div id="jobList"></div>
    <div id="newJobForm" style="display:none"></div>
  `;

  try {
    const jobs = await api.getJobs();
    const container = document.getElementById('jobList');
    if (jobs.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="icon">⏱</div><h3>No scheduled jobs</h3></div>';
      return;
    }

    const html = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Skill</th><th>Cron</th><th>Last Run</th><th>Next Run</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${jobs.map(j => `
              <tr>
                <td><strong>${j.name}</strong></td>
                <td><span class="badge badge-info">${j.skill}</span></td>
                <td><code>${j.cron}</code></td>
                <td>${formatDate(j.last_run)}</td>
                <td>${formatDate(j.next_run)}</td>
                <td><span class="badge ${j.enabled ? 'badge-success' : 'badge-warning'}">${j.enabled ? 'Active' : 'Paused'}</span></td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteJob('${j.id}')">✕</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    container.innerHTML = html;
  } catch (err) {
    document.getElementById('jobList').innerHTML = `<div class="empty-state"><div class="icon">⚠</div><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function showNewJobForm() {
  document.getElementById('newJobForm').style.display = 'block';
  document.getElementById('newJobForm').innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">New Scheduled Job</span></div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input id="jobName" placeholder="e.g., Weekly Backup">
      </div>
      <div class="form-group">
        <label class="form-label">Skill</label>
        <select id="jobSkill"></select>
      </div>
      <div class="form-group">
        <label class="form-label">Cron Expression</label>
        <input id="jobCron" placeholder="e.g., 0 6 * * 1" value="0 6 * * *">
        <div style="font-size:11px;color:var(--text2);margin-top:4px">
          Common: <code>*/5 * * * *</code> (5 min), <code>0 6 * * *</code> (daily 6AM), <code>0 6 * * 1</code> (weekly Mon)
        </div>
      </div>
      <button class="btn btn-primary" onclick="createJob()">Create Job</button>
      <button class="btn" onclick="cancelNewJob()" style="margin-left:8px">Cancel</button>
    </div>
  `;

  try {
    const skills = await api.getSkills();
    const select = document.getElementById('jobSkill');
    skills.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      select.appendChild(opt);
    });
  } catch {}
}

async function createJob() {
  const name = document.getElementById('jobName').value.trim();
  const skill = document.getElementById('jobSkill').value;
  const cron = document.getElementById('jobCron').value.trim();
  if (!name || !skill || !cron) { showToast('All fields required', 'error'); return; }
  try {
    await api.createJob({ name, skill, cron });
    showToast('Job created', 'success');
    renderScheduler();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function cancelNewJob() {
  document.getElementById('newJobForm').style.display = 'none';
}

async function deleteJob(id) {
  if (!confirm('Delete this job?')) return;
  try {
    await api.deleteJob(id);
    showToast('Job deleted', 'success');
    renderScheduler();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
