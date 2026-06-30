async function renderScheduler() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Scheduler</h1>
        <p class="page-subtitle">Automated skill execution — set cron, skill, and task input</p>
      </div>
      <button class="btn btn-primary" onclick="showAddJob()">+ Add Job</button>
    </div>
    <div id="jobList"><div class="loading"><div class="loading-spinner"></div></div></div>

    <div class="card mt-3" id="cronHelp">
      <div class="card-header" style="cursor:pointer" onclick="document.getElementById('cronHelpBody').style.display = document.getElementById('cronHelpBody').style.display === 'none' ? 'block' : 'none'">
        <span class="card-title">⏱ Cron Format Help</span>
        <span style="font-size:10px;color:var(--text-muted)">click to expand</span>
      </div>
      <div id="cronHelpBody" style="display:none">
        <div style="font-family:var(--font-mono);font-size:11px;line-height:1.6;color:var(--text-secondary)">
          <pre style="color:var(--accent-light);margin-bottom:8px">┌─ minute (0-59)
│ ┌─ hour (0-23)
│ │ ┌─ day (1-31)
│ │ │ ┌─ month (1-12)
│ │ │ │ ┌─ weekday (0=Sun..6=Sat)
│ │ │ │ │
* * * * *</pre>
          <table style="width:100%;font-size:10px">
            <tr style="color:var(--accent-light)"><th style="text-align:left;padding:4px">Expression</th><th style="text-align:left;padding:4px">Meaning</th></tr>
            <tr><td style="padding:3px"><code>0 0 * * *</code></td><td style="padding:3px">Every day at midnight</td></tr>
            <tr><td style="padding:3px"><code>0 9 * * *</code></td><td style="padding:3px">Every day at 9:00 AM</td></tr>
            <tr><td style="padding:3px"><code>0 9 * * 1-5</code></td><td style="padding:3px">Mon-Fri at 9:00 AM</td></tr>
            <tr><td style="padding:3px"><code>*/30 * * * *</code></td><td style="padding:3px">Every 30 minutes</td></tr>
            <tr><td style="padding:3px"><code>*/15 * * * *</code></td><td style="padding:3px">Every 15 minutes</td></tr>
            <tr><td style="padding:3px"><code>0 */2 * * *</code></td><td style="padding:3px">Every 2 hours</td></tr>
            <tr><td style="padding:3px"><code>0 2 * * 0</code></td><td style="padding:3px">Sunday at 2:00 AM</td></tr>
            <tr><td style="padding:3px"><code>0 0 1 * *</code></td><td style="padding:3px">1st of every month</td></tr>
            <tr><td style="padding:3px"><code>0 0 * * 0</code></td><td style="padding:3px">Every Sunday midnight</td></tr>
          </table>
        </div>
      </div>
    </div>
  `;

  try {
    const jobs = await api.getJobs();
    const container = document.getElementById('jobList');

    if (jobs.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏱</div><div class="empty-state-title">No scheduled jobs</div><div class="empty-state-desc">Create automated skill executions with cron scheduling</div><button class="btn btn-primary mt-3" onclick="showAddJob()">+ Add Job</button></div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Skill</th><th>Task</th><th>Cron</th><th>Status</th><th>Last Run</th><th></th></tr></thead>
          <tbody>
            ${jobs.map(j => `
              <tr>
                <td><strong>${escapeHtml(j.name)}</strong></td>
                <td><span class="badge badge-accent">${escapeHtml(j.skill)}</span></td>
                <td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(j.input || '(default task)')}</td>
                <td><code style="font-size:10px">${escapeHtml(j.cron)}</code></td>
                <td><span class="badge ${j.enabled ? 'badge-success' : 'badge-warning'}">${j.enabled ? 'Active' : 'Paused'}</span></td>
                <td style="font-size:12px;color:var(--text-muted)">${j.last_run ? formatDate(j.last_run) : 'Never'}</td>
                <td><button class="btn btn-sm btn-danger" onclick="deleteJob('${j.id}')">Delete</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:12px;color:var(--text-muted);text-align:right;margin-top:8px">${jobs.length} job${jobs.length !== 1 ? 's' : ''}</div>
    `;
  } catch (err) {
    document.getElementById('jobList').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

async function showAddJob() {
  let skills = [];
  try { const s = await api.getSkills(); skills = s; } catch {}

  showModal('Add Scheduled Job', `
    <div class="form-group">
      <label class="form-label">Job Name</label>
      <input id="jobName" class="form-input" placeholder="e.g., Daily SEO Audit">
    </div>
    <div class="form-group">
      <label class="form-label">Skill</label>
      <select id="jobSkill" class="form-select" onchange="updateJobInputHint()">
        <option value="">Select a skill...</option>
        ${skills.map(s => `<option value="${s.name}">${s.name.replace(/-/g, ' ')}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Task / Input <span class="text-sm text-muted">— какво точно да направи</span></label>
      <textarea id="jobInput" class="form-textarea" rows="3" placeholder="e.g., Check all agents, verify disk space, and report any errors.&#10;&#10;Or: Analyze https://example.com for SEO issues."></textarea>
      <div class="form-hint">Describe what the skill should do. Leave empty for default behavior.</div>
    </div>
    <div class="form-group">
      <label class="form-label">Cron Schedule</label>
      <div class="grid grid-3" style="gap:6px;margin-bottom:6px">
        <button class="btn btn-sm" onclick="document.getElementById('jobCron').value='0 * * * *';return false" style="font-size:10px">Every hour</button>
        <button class="btn btn-sm" onclick="document.getElementById('jobCron').value='0 9 * * *';return false" style="font-size:10px">Daily 9AM</button>
        <button class="btn btn-sm" onclick="document.getElementById('jobCron').value='0 2 * * *';return false" style="font-size:10px">Daily 2AM</button>
        <button class="btn btn-sm" onclick="document.getElementById('jobCron').value='*/30 * * * *';return false" style="font-size:10px">Every 30min</button>
        <button class="btn btn-sm" onclick="document.getElementById('jobCron').value='0 9 * * 1-5';return false" style="font-size:10px">Weekdays 9AM</button>
        <button class="btn btn-sm" onclick="document.getElementById('jobCron').value='0 0 * * 0';return false" style="font-size:10px">Sunday midnight</button>
      </div>
      <input id="jobCron" class="form-input" placeholder="0 0 * * *" value="0 0 * * *">
      <div class="form-hint">minute hour day month weekday</div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createJob()">Create Job</button>
  `);
}

async function createJob() {
  const name = document.getElementById('jobName').value.trim();
  const skill = document.getElementById('jobSkill').value;
  const input = document.getElementById('jobInput').value.trim();
  const cron = document.getElementById('jobCron').value.trim();
  if (!name || !skill || !cron) { showToast('All fields required', 'warning'); return; }
  try {
    await api.createJob({ name, skill, cron, input });
    closeModal();
    showToast('Job created', 'success');
    renderScheduler();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function deleteJob(id) {
  if (!confirm('Delete this scheduled job?')) return;
  try {
    await api.deleteJob(id);
    showToast('Job deleted', 'success');
    renderScheduler();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
