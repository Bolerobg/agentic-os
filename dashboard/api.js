const api = {
  async get(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`);
    return r.json();
  },

  async post(path, body = {}) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`POST ${path} failed: ${r.status}`);
    return r.json();
  },

  async put(path, body = {}) {
    const r = await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`PUT ${path} failed: ${r.status}`);
    return r.json();
  },

  async del(path) {
    const r = await fetch(path, { method: 'DELETE' });
    if (!r.ok) throw new Error(`DELETE ${path} failed: ${r.status}`);
    return r.json();
  },

  // Convenience methods
  getStatus: () => api.get('/api/status'),
  getBrain: () => api.get('/api/brain'),
  getBrainFile: (name) => api.get(`/api/brain/${name}`),
  updateBrainFile: (name, content) => api.put(`/api/brain/${name}`, { content }),
  getSkills: () => api.get('/api/skills'),
  getSkill: (name) => api.get(`/api/skills/${name}`),
  runSkill: (name, input = '', agent = 'auto') => api.post(`/api/skills/${name}/run`, { input, agent }),
  getSkillEval: (name) => api.get(`/api/skills/${name}/eval`),
  getJobs: () => api.get('/api/scheduler/jobs'),
  createJob: (job) => api.post('/api/scheduler/jobs', job),
  deleteJob: (id) => api.del(`/api/scheduler/jobs/${id}`),
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
};
