const api = {
  async get(path) {
    const r = await fetch(path);
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Request failed: ${r.status}`); }
    return r.json();
  },
  async post(path, body = {}, controller) {
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    if (controller) opts.signal = controller.signal;
    const r = await fetch(path, opts);
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Request failed: ${r.status}`); }
    return r.json();
  },
  async put(path, body = {}) {
    const r = await fetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Request failed: ${r.status}`); }
    return r.json();
  },
  async patch(path, body = {}) {
    const r = await fetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Request failed: ${r.status}`); }
    return r.json();
  },
  async del(path) {
    const r = await fetch(path, { method: 'DELETE' });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Request failed: ${r.status}`); }
    return r.json();
  },
  getStatus: () => api.get('/api/status'),
  getBrain: () => api.get('/api/brain'),
  getBrainFile: (name) => api.get(`/api/brain/${encodeURIComponent(name)}`),
  updateBrainFile: (name, content) => api.put(`/api/brain/${encodeURIComponent(name)}`, { content }),
  getSkills: () => api.get('/api/skills'),
  getSkill: (name) => api.get(`/api/skills/${encodeURIComponent(name)}`),
  runSkill: (name, input = '', agent = 'auto') => api.post(`/api/skills/${encodeURIComponent(name)}/run`, { input, agent }),
  getSkillEval: (name) => api.get(`/api/skills/${encodeURIComponent(name)}/eval`),
  getJobs: () => api.get('/api/scheduler/jobs'),
  createJob: (job) => api.post('/api/scheduler/jobs', job),
  deleteJob: (id) => api.del(`/api/scheduler/jobs/${encodeURIComponent(id)}`),
  getAudit: (limit = 100) => api.get(`/api/audit?limit=${limit}`),
  getCost: () => api.get('/api/cost'),
  recordCost: (data) => api.post('/api/cost/record', data),
  getPlugins: () => api.get('/api/plugins'),
  installPlugin: (name) => api.post('/api/plugins/install', { name }),
  getBackups: () => api.get('/api/backups'),
  createBackup: () => api.post('/api/backup'),
  restoreBackup: (file) => api.post('/api/backup/restore', { file }),
  getPrompts: () => api.get('/api/prompts'),
  getSettings: () => api.get('/api/settings'),
  updateSettings: (settings) => api.put('/api/settings', { settings }),
  getStandards: () => api.get('/api/standards'),
  discoverStandards: () => api.post('/api/standards/discover'),
  chat: (agent, message, controller) => api.post('/api/chat', { agent, message }, controller),
  chatLLM: (message, provider, model, controller) => api.post('/api/chat/llm', { message, provider, model }, controller),
  getChatHistory: () => api.get('/api/chat/history'),
  // Kanban
  getKanbanBoard: (status) => api.get(status ? `/api/kanban/board?status=${encodeURIComponent(status)}` : '/api/kanban/board'),
  getKanbanTask: (id) => api.get(`/api/kanban/tasks/${encodeURIComponent(id)}`),
  createKanbanTask: (data) => api.post('/api/kanban/tasks', data),
  updateKanbanTask: (id, data) => api.patch(`/api/kanban/tasks/${encodeURIComponent(id)}`, data),
  completeKanbanTask: (id, summary) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/complete`, { summary }),
  blockKanbanTask: (id, reason) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/block`, { reason }),
  unblockKanbanTask: (id) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/unblock`, {}),
  addKanbanComment: (id, message) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/comments`, { message }),
  linkKanbanTasks: (parentId, childId) => api.post('/api/kanban/links', { parent_id: parentId, child_id: childId }),
  unlinkKanbanTasks: (parentId, childId) => api.del(`/api/kanban/links?parent_id=${encodeURIComponent(parentId)}&child_id=${encodeURIComponent(childId)}`),
  dispatchKanban: () => api.post('/api/kanban/dispatch', {}),
  specifyKanbanTask: (id) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/specify`, {}),
  decomposeKanbanTask: (id) => api.post(`/api/kanban/tasks/${encodeURIComponent(id)}/decompose`, {}),
  // Goals
  getGoals: () => api.get('/api/goals'),
  createGoal: (data) => api.post('/api/goals', data),
  updateGoal: (id, data) => api.put(`/api/goals/${encodeURIComponent(id)}`, data),
  deleteGoal: (id) => api.del(`/api/goals/${encodeURIComponent(id)}`),
  // Journal
  getJournalEntries: () => api.get('/api/journal/entries'),
  getJournalEntry: (date) => api.get(`/api/journal/entries/${encodeURIComponent(date)}`),
  saveJournalEntry: (date, content) => api.put(`/api/journal/entries/${encodeURIComponent(date)}`, { content }),
  searchJournal: (query) => api.get(`/api/journal/search?q=${encodeURIComponent(query)}`),
  // Agent Health
  getAgentHealth: () => api.get('/api/agents/health'),
  getAgentStats: (name) => api.get(`/api/agents/${encodeURIComponent(name)}/stats`),
  refreshAgentHealth: () => api.post('/api/agents/health/refresh', {}),
  // Smart Router
  suggestRouter: (task) => api.post('/api/router/suggest', { task }),
  routeTask: (task, agent) => api.post('/api/router/route', { task, agent }),
  // Learning Analytics
  getSkillAnalytics: () => api.get('/api/analytics/skills'),
  getTrendAnalytics: () => api.get('/api/analytics/trends'),
  // Session Replay
  listSessions: () => api.get('/api/sessions/list'),
  getSessionReplay: (id) => api.get(`/api/sessions/${encodeURIComponent(id)}/replay`),
  // v0.3.0: Scheduler Events
  getSchedulerEvents: (limit) => api.get(`/api/scheduler/events?limit=${limit || 50}`),
  triggerJob: (id) => api.post(`/api/scheduler/trigger/${encodeURIComponent(id)}`, {}),
  sendWebhook: (data) => api.post('/api/webhook', data),
  // v0.3.0: Error Tracking
  getErrors: (limit, category) => api.get(`/api/errors?limit=${limit || 50}${category ? `&category=${encodeURIComponent(category)}` : ''}`),
  reportError: (data) => api.post('/api/errors/report', data),
  clearErrors: () => api.del('/api/errors'),
  // v0.3.0: Circuit Breaker
  getCircuitBreaker: () => api.get('/api/circuit-breaker'),
  tripCircuitBreaker: (agent) => api.post('/api/circuit-breaker/trip', { agent }),
  resetCircuitBreaker: (agent) => api.post('/api/circuit-breaker/reset', { agent }),
  // v0.3.0: PWA
  getManifest: () => api.get('/manifest.json'),
  // v2.0: Professional Dashboard APIs
  getOrchestrationState: () => api.get('/api/orchestration/state'),
  getAgentKpis: () => api.get('/api/metrics/kpi'),
  recordMetric: (data) => api.post('/api/metrics/record', data),
  getMetricTrends: () => api.get('/api/metrics/trends'),
  listTasks: (status, agent) => api.get(`/api/tasks${status ? '?status=' + encodeURIComponent(status) : ''}${agent ? (status ? '&' : '?') + 'agent=' + encodeURIComponent(agent) : ''}`),
  createTask: (data) => api.post('/api/tasks', data),
  getTask: (id) => api.get(`/api/tasks/${encodeURIComponent(id)}`),
  taskAction: (id, action, targetAgent) => api.post(`/api/tasks/${encodeURIComponent(id)}/action`, { action, target_agent: targetAgent || '' }),
  getAgentConfigs: () => api.get('/api/agents/config'),
  getAgentConfig: (name) => api.get(`/api/agents/config/${encodeURIComponent(name)}`),
  updateAgentConfig: (name, data) => api.put(`/api/agents/config/${encodeURIComponent(name)}`, data),
  listConversations: (agent) => api.get(`/api/conversations${agent ? '?agent=' + encodeURIComponent(agent) : ''}`),
  getConversation: (id) => api.get(`/api/conversations/${encodeURIComponent(id)}`),
  getWorkflows: () => api.get('/api/workflows'),
  createWorkflow: (data) => api.post('/api/workflows', data),
  runWorkflow: (id) => api.post(`/api/workflows/${encodeURIComponent(id)}/run`, {}),
  deleteWorkflow: (id) => api.del(`/api/workflows/${encodeURIComponent(id)}`),
  getCostSummary: () => api.get('/api/analytics/cost-summary'),
  getTokenUsage: () => api.get('/api/analytics/token-usage'),
  getAlertRules: () => api.get('/api/alerts/rules'),
  createAlertRule: (data) => api.post('/api/alerts/rules', data),
  deleteAlertRule: (id) => api.del(`/api/alerts/rules/${encodeURIComponent(id)}`),
  testAlert: () => api.post('/api/alerts/test', {}),
  markAlertsRead: () => api.post('/api/alerts/read-all', {}),
  getSystemHealth: () => api.get('/api/system/health'),
  runComparison: (data) => api.post('/api/comparison', data),
  getReportConfigs: () => api.get('/api/reports/config'),
  createReportSchedule: (data) => api.post('/api/reports/schedule', data),
  deleteReportSchedule: (id) => api.del(`/api/reports/schedule/${encodeURIComponent(id)}`),
  generateReport: () => api.post('/api/reports/generate', {}),
  sendReport: (id) => api.post(`/api/reports/send/${encodeURIComponent(id)}`, {}),
  getGithubStatus: () => api.get('/api/github/status'),
  getGithubRepos: () => api.get('/api/github/repos'),
  createGithubRepo: (data) => api.post('/api/github/create-repo', data),
  githubInit: (data) => api.post('/api/github/init', data),
  githubCommit: (data) => api.post('/api/github/commit', data),
  githubPush: (data) => api.post('/api/github/push', data),
  getGithubProjectInfo: (path) => api.get(`/api/github/project-info?path=${encodeURIComponent(path)}`),
  getBrainContext: () => api.get('/api/brain/context'),
  getTaskTemplates: () => api.get('/api/tasks/templates'),
  batchTaskAction: (data) => api.post('/api/tasks/batch', data),
  getCostEfficiency: () => api.get('/api/analytics/efficiency'),
  suggestSkillImprovement: (name) => api.post(`/api/skills/suggest-improvement/${encodeURIComponent(name)}`, {}),
  getDashboardConfig: () => api.get('/api/dashboard/config'),
  updateDashboardConfig: (data) => api.put('/api/dashboard/config', data),
  getComparisonHistory: () => api.get('/api/comparison/history'),
  globalSearch: (q) => api.get(`/api/search?q=${encodeURIComponent(q)}`),
  autoRouteTask: (data) => api.post('/api/tasks/auto-route', data),
};
