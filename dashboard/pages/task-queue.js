// 3. Unified Task Queue - Swimlane View
async function renderTaskQueue() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Task Queue</h1>
        <p class="page-subtitle">Unified view of all agent tasks — pending, running, and completed</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="showAddTask()">+ New Task</button>
        <button class="btn" onclick="showAutoRouteTask()" title="AI picks the best agent automatically">🤖 Auto-Route</button>
        <button class="btn" onclick="showTaskTemplates()">📋 Templates</button>
        <button class="btn" onclick="renderTaskQueue()">🔄 Refresh</button>
      </div>
    </div>
    <div class="flex gap-2 mb-3">
      <select id="taskFilterAgent" class="form-select" style="width:150px" onchange="renderTaskQueue()">
        <option value="">All Agents</option>
        <option value="opencode">opencode</option>
        <option value="hermes">Hermes</option>
        <option value="gemini">Gemini</option>
        <option value="jcode">jcode</option>
      </select>
      <select id="taskFilterStatus" class="form-select" style="width:150px" onchange="renderTaskQueue()">
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="running">Running</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <span id="taskCount" class="badge badge-accent" style="align-self:center"></span>
    </div>
    <div id="taskSwimlane" class="task-swimlane"></div>
  `;

  if (!document.getElementById('taskSwimlaneStyle')) {
    const style = document.createElement('style');
    style.id = 'taskSwimlaneStyle';
    style.textContent = `
      .task-swimlane { display:grid; grid-template-columns:repeat(5, 1fr); gap:12px; }
      .task-column { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:12px; min-height:200px; }
      .task-column h4 { font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); margin-bottom:10px; display:flex; align-items:center; gap:6px; }
      .task-item { background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius); padding:10px; margin-bottom:8px; cursor:pointer; transition:var(--transition); font-size:12px; }
      .task-item:hover { border-color:var(--accent); transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,0.1); }
      .task-item.critical { border-left:3px solid var(--red); }
      .task-item.high { border-left:3px solid var(--yellow); }
      .task-item.medium { border-left:3px solid var(--blue); }
      .task-item.low { border-left:3px solid var(--text-muted); }
      .task-priority { font-size:10px; font-weight:600; text-transform:uppercase; }
      .task-agent { font-size:10px; color:var(--text-muted); }
      @media(max-width:900px){ .task-swimlane{grid-template-columns:repeat(2,1fr)} }
    `;
    document.head.appendChild(style);
  }

  try {
    const agent = document.getElementById('taskFilterAgent')?.value || '';
    const status = document.getElementById('taskFilterStatus')?.value || '';
    const data = await api.listTasks(status, agent);
    const columns = data.columns || {};
    const total = data.total || 0;

    document.getElementById('taskCount').textContent = `${total} tasks`;

    const colNames = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    const colIcons = { pending: '⏳', running: '▶', completed: '✓', failed: '✕', cancelled: '⊘' };
    const colColors = { pending: 'var(--yellow)', running: 'var(--accent)', completed: 'var(--green)', failed: 'var(--red)', cancelled: 'var(--text-muted)' };

    document.getElementById('taskSwimlane').innerHTML = colNames.map(col => `
      <div class="task-column">
        <h4><span style="color:${colColors[col]}">${colIcons[col]}</span> ${col} <span class="badge badge-info" style="margin-left:4px">${(columns[col] || []).length}</span></h4>
        ${(columns[col] || []).length === 0
          ? '<div style="color:var(--text-muted);font-size:11px;text-align:center;padding:20px">Empty</div>'
          : (columns[col] || []).map(t => `
            <div class="task-item ${t.priority || 'medium'}" onclick="showTaskDetail('${t.id}')">
              <div style="font-weight:600;margin-bottom:3px">${escapeHtml(t.title || 'Untitled')}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span class="task-agent">${t.agent || 'unassigned'}</span>
                <span class="task-priority" style="color:${t.priority === 'critical' ? 'var(--red)' : t.priority === 'high' ? 'var(--yellow)' : 'var(--text-muted)'}">${t.priority || 'medium'}</span>
              </div>
              ${t.progress > 0 ? `<div style="height:3px;background:var(--bg-dim);border-radius:99px"><div style="width:${t.progress}%;height:100%;background:var(--accent);border-radius:99px"></div></div>` : ''}
              ${t.error ? `<div style="color:var(--red);font-size:10px;margin-top:4px">⚠ ${escapeHtml(t.error).slice(0,60)}</div>` : ''}
            </div>
          `).join('')
        }
      </div>
    `).join('');

  } catch (err) {
    document.getElementById('taskSwimlane').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

async function showAddTask() {
  showModal('New Task', `
    <div class="form-group"><label class="form-label">Title</label><input id="newTaskTitle" class="form-input" placeholder="Task title..."></div>
    <div class="form-group"><label class="form-label">Description</label><textarea id="newTaskDesc" class="form-textarea" rows="2" placeholder="Optional description"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Agent</label>
        <select id="newTaskAgent" class="form-select">
          <option value="">Unassigned</option>
          <option value="opencode">opencode</option>
          <option value="hermes">Hermes</option>
          <option value="gemini">Gemini</option>
          <option value="jcode">jcode</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Priority</label>
        <select id="newTaskPriority" class="form-select">
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="createNewTask()">Create Task</button>
  `);
}

async function showTaskTemplates() {
  try {
    const data = await api.getTaskTemplates();
    const templates = data.templates || {};
    const entries = Object.entries(templates);
    const catIcons = {code:"💻",devops:"🚀",maintenance:"🔧",research:"🧠",reporting:"📊",docs:"📝",optimization:"⚡"};
    showModal('Task Templates', `
      <div class="grid grid-2" style="gap:8px">
        ${entries.map(([key,t]) => `
          <div class="card" style="cursor:pointer;padding:12px" onclick="useTemplate('${key}')">
            <div class="flex items-center gap-2 mb-1">
              <span>${catIcons[t.category]||"📋"}</span>
              <strong style="font-size:12px">${escapeHtml(t.title)}</strong>
            </div>
            <div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">${escapeHtml(t.description)}</div>
            <div class="flex gap-1">
              <span class="badge badge-accent" style="font-size:8px">${t.agent}</span>
              <span class="badge badge-info" style="font-size:8px">${t.priority}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>`);
  } catch (err) { showToast(err.message, 'error'); }
}

window.useTemplate = async function(key) {
  const data = await api.getTaskTemplates();
  const t = data.templates[key];
  if (!t) return;
  closeModal();
  try {
    await api.createTask({title:t.title,description:t.description,agent:t.agent,priority:t.priority});
    showToast(`Task "${t.title}" created for ${t.agent}`,'success');
    renderTaskQueue();
  } catch(err) { showToast(err.message,'error'); }
};

async function showAutoRouteTask() {
  showModal('🤖 Auto-Route Task', `
    <div class="form-group"><label class="form-label">Title</label><input id="autoTaskTitle" class="form-input" placeholder="Describe what needs to be done..."></div>
    <div class="form-group"><label class="form-label">Description (optional)</label><textarea id="autoTaskDesc" class="form-textarea" rows="2" placeholder="More details help the AI pick the right agent"></textarea></div>
    <div class="form-group"><label class="form-label">Priority</label>
      <select id="autoTaskPriority" class="form-select">
        <option value="medium">Medium</option><option value="low">Low</option><option value="high">High</option><option value="critical">Critical</option>
      </select>
    </div>
    <div class="form-hint">The AI will analyze your task and assign it to the best agent based on capabilities and current workload.</div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="executeAutoRoute()">🤖 Auto-Route</button>
  `);
}

async function executeAutoRoute() {
  const title = document.getElementById('autoTaskTitle').value.trim();
  const description = document.getElementById('autoTaskDesc').value.trim();
  const priority = document.getElementById('autoTaskPriority').value;
  if (!title) { showToast('Title required', 'warning'); return; }
  try {
    const res = await api.autoRouteTask({ title, description, priority });
    closeModal();
    showToast(`Routed to ${res.routed_to} (${res.confidence} confidence)`, 'success');
    renderTaskQueue();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function createNewTask() {
  const title = document.getElementById('newTaskTitle').value.trim();
  const description = document.getElementById('newTaskDesc').value.trim();
  const agent = document.getElementById('newTaskAgent').value;
  const priority = document.getElementById('newTaskPriority').value;
  if (!title) { showToast('Title required', 'warning'); return; }
  try {
    await api.createTask({ title, description, agent, priority });
    closeModal();
    showToast('Task created', 'success');
    renderTaskQueue();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function showTaskDetail(taskId) {
  try {
    const task = await api.getTask(taskId);
    showModal(`Task: ${escapeHtml(task.title)}`, `
      <div style="display:grid;gap:8px">
        <div><span class="text-muted text-sm">ID:</span> ${task.id}</div>
        <div><span class="text-muted text-sm">Agent:</span> ${task.agent || 'unassigned'}</div>
        <div><span class="text-muted text-sm">Priority:</span> <span class="badge ${task.priority === 'critical' ? 'badge-danger' : task.priority === 'high' ? 'badge-warning' : 'badge-info'}">${task.priority}</span></div>
        <div><span class="text-muted text-sm">Status:</span> <span class="badge badge-accent">${task.status}</span></div>
        <div><span class="text-muted text-sm">Progress:</span> ${task.progress || 0}%</div>
        <div><span class="text-muted text-sm">Created:</span> ${formatDate(task.created)}</div>
        ${task.description ? `<div style="margin-top:8px;padding:10px;background:var(--bg-secondary);border-radius:6px;font-size:12px">${escapeHtml(task.description)}</div>` : ''}
        ${task.error ? `<div style="color:var(--red);font-size:12px">⚠ ${escapeHtml(task.error)}</div>` : ''}
      </div>
    `, `
      ${task.status === 'pending' || task.status === 'failed' ? `<button class="btn btn-sm btn-danger" onclick="taskAction('${taskId}','cancel')">Cancel</button>` : ''}
      ${task.status === 'failed' ? `<button class="btn btn-sm btn-primary" onclick="taskAction('${taskId}','retry')">Retry</button>` : ''}
      <button class="btn btn-sm" onclick="showReroute('${taskId}')">Reroute</button>
      <button class="btn btn-ghost" onclick="closeModal()">Close</button>
    `);
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function taskAction(taskId, action) {
  try {
    await api.taskAction(taskId, action);
    closeModal();
    showToast(`Task ${action}ed`, 'success');
    renderTaskQueue();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

function showReroute(taskId) {
  showModal('Reroute Task', `
    <div class="form-group"><label class="form-label">Target Agent</label>
      <select id="rerouteAgent" class="form-select">
        <option value="opencode">opencode</option>
        <option value="hermes">Hermes</option>
        <option value="gemini">Gemini</option>
        <option value="jcode">jcode</option>
      </select>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="doReroute('${taskId}')">Reroute</button>
  `);
}

async function doReroute(taskId) {
  const target = document.getElementById('rerouteAgent').value;
  try {
    await api.taskAction(taskId, 'reroute', target);
    closeModal();
    showToast('Task rerouted', 'success');
    renderTaskQueue();
  } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}
