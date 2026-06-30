// Command Palette — Cmd+K / Ctrl+K global search & actions
(function() {
  const PALETTE_ID = 'cmdPalette';
  let allCommands = [];

  // Build command list
  function buildCommands() {
    const nav = [
      { id: 'dashboard', label: 'Command Center', icon: '◉', group: 'Navigate', action: () => navigate('dashboard') },
      { id: 'agents', label: 'Agents Overview', icon: '🤖', group: 'Navigate', action: () => navigate('agents') },
      { id: 'chat', label: 'AI Chat', icon: '💬', group: 'Navigate', action: () => navigate('chat') },
      { id: 'skills', label: 'Skills Hub', icon: '⚡', group: 'Navigate', action: () => navigate('skills') },
      { id: 'agent-orchestration', label: 'Agent Orchestration', icon: '🎯', group: 'Navigate', action: () => navigate('agent-orchestration') },
      { id: 'performance-kpis', label: 'Performance KPIs', icon: '📊', group: 'Navigate', action: () => navigate('performance-kpis') },
      { id: 'task-queue', label: 'Task Queue', icon: '📋', group: 'Navigate', action: () => navigate('task-queue') },
      { id: 'agent-config', label: 'Agent Configuration', icon: '⚙', group: 'Navigate', action: () => navigate('agent-config') },
      { id: 'conversation-inspector', label: 'Conversation Inspector', icon: '💬', group: 'Navigate', action: () => navigate('conversation-inspector') },
      { id: 'workflows', label: 'Workflow Orchestrator', icon: '🔗', group: 'Navigate', action: () => navigate('workflows') },
      { id: 'cost-analytics', label: 'Cost & Token Analytics', icon: '💰', group: 'Navigate', action: () => navigate('cost-analytics') },
      { id: 'alerts', label: 'Alerting Center', icon: '🔔', group: 'Navigate', action: () => navigate('alerts') },
      { id: 'system-health', label: 'System Health', icon: '🖥', group: 'Navigate', action: () => navigate('system-health') },
      { id: 'agent-comparison', label: 'Agent Comparison', icon: '🧪', group: 'Navigate', action: () => navigate('agent-comparison') },
      { id: 'memory', label: 'Memory / Brain', icon: '🧠', group: 'Navigate', action: () => navigate('memory') },
      { id: 'scheduler', label: 'Scheduler', icon: '⏱', group: 'Navigate', action: () => navigate('scheduler') },
      { id: 'audit', label: 'Audit Log', icon: '📋', group: 'Navigate', action: () => navigate('audit') },
      { id: 'kanban', label: 'Kanban Board', icon: '📌', group: 'Navigate', action: () => navigate('kanban') },
      { id: 'errors', label: 'Error Dashboard', icon: '⚠', group: 'Navigate', action: () => navigate('errors') },
      { id: 'settings', label: 'Settings', icon: '⚙', group: 'Navigate', action: () => navigate('settings') },
    ];

    const chat = [
      { id: 'chat-opencode', label: 'Chat with opencode', icon: '🔧', group: 'Quick Chat', action: () => { navigate('chat'); setTimeout(() => { if (typeof selectAgent === 'function') selectAgent('opencode'); }, 400); } },
      { id: 'chat-hermes', label: 'Chat with Hermes', icon: '⚡', group: 'Quick Chat', action: () => { navigate('chat'); setTimeout(() => { if (typeof selectAgent === 'function') selectAgent('hermes'); }, 400); } },
      { id: 'chat-gemini', label: 'Chat with Gemini', icon: '🧠', group: 'Quick Chat', action: () => { navigate('chat'); setTimeout(() => { if (typeof selectAgent === 'function') selectAgent('gemini'); }, 400); } },
      { id: 'chat-jcode', label: 'Chat with jcode', icon: '⚡', group: 'Quick Chat', action: () => { navigate('chat'); setTimeout(() => { if (typeof selectAgent === 'function') selectAgent('jcode'); }, 400); } },
    ];

    const actions = [
      { id: 'quick-skill', label: 'Quick Run Skill', icon: '▶', group: 'Actions', action: () => { if (typeof runQuickSkill === 'function') runQuickSkill(); } },
      { id: 'new-task', label: 'Create New Task', icon: '📝', group: 'Actions', action: () => { navigate('task-queue'); setTimeout(() => { if (typeof showAddTask === 'function') showAddTask(); }, 500); } },
      { id: 'new-workflow', label: 'New Pipeline', icon: '🔗', group: 'Actions', action: () => { navigate('workflows'); setTimeout(() => { if (typeof showAddWorkflow === 'function') showAddWorkflow(); }, 500); } },
      { id: 'test-alert', label: 'Send Test Alert', icon: '🔔', group: 'Actions', action: async () => { try { await api.testAlert(); showToast('Test alert sent', 'success'); } catch(e) {} } },
      { id: 'new-backup', label: 'Create Backup', icon: '💾', group: 'Actions', action: async () => { try { await api.createBackup(); showToast('Backup created', 'success'); } catch(e) { showToast(e.message, 'error'); } } },
      { id: 'refresh', label: 'Refresh Dashboard', icon: '🔄', group: 'Actions', action: () => navigate(window.location.hash.slice(1) || 'dashboard') },
      { id: 'dark-mode', label: 'Toggle Dark/Light Mode', icon: '🌓', group: 'Actions', action: () => { if (typeof toggleTheme === 'function') toggleTheme(); } },
      { id: 'global-search', label: 'Search Everything...', icon: '🔍', group: 'Actions', action: () => navigate('global-search') },
      { id: 'auto-route', label: 'Auto-Route New Task', icon: '🤖', group: 'Actions', action: () => { navigate('task-queue'); setTimeout(() => { if (typeof showAutoRouteTask === 'function') showAutoRouteTask(); }, 500); } },
      { id: 'generate-report', label: 'Generate Report', icon: '📊', group: 'Actions', action: async () => { try { await api.generateReport(); showToast('Report generated', 'success'); } catch(e) {} } },
      { id: 'sidebar-toggle', label: 'Toggle Sidebar', icon: '📐', group: 'Actions', action: () => { if (typeof toggleSidebar === 'function') toggleSidebar(); } },
    ];

    return [...nav, ...chat, ...actions];
  }

  function createPalette() {
    // Remove existing
    const existing = document.getElementById(PALETTE_ID);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = PALETTE_ID;
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
      display:flex;align-items:flex-start;justify-content:center;padding-top:15vh;
      animation:fadeIn 0.15s ease;
    `;

    overlay.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);width:560px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.5);overflow:hidden">
        <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)">
          <span style="font-size:18px">🔍</span>
          <input id="cmdPaletteInput" type="text" placeholder="Search commands, pages, agents..." 
            style="flex:1;background:none;border:none;outline:none;color:var(--text-primary);font-size:15px;font-family:var(--font)"
            autofocus>
          <kbd style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:4px;padding:2px 7px;font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">esc</kbd>
        </div>
        <div id="cmdPaletteResults" style="max-height:380px;overflow-y:auto;padding:4px"></div>
        <div style="padding:6px 16px;border-top:1px solid var(--border);font-size:10px;color:var(--text-muted);display:flex;gap:12px">
          <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('cmdPaletteInput');
    const results = document.getElementById('cmdPaletteResults');

    // Render all commands initially
    renderResults(allCommands, results, '');

    // Search on input
    input.addEventListener('input', () => {
      renderResults(allCommands, results, input.value.toLowerCase());
    });

    // Keyboard navigation
    let selectedIdx = -1;
    input.addEventListener('keydown', (e) => {
      const items = results.querySelectorAll('.cmd-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
        updateSelection(items, selectedIdx);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        updateSelection(items, selectedIdx);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIdx >= 0 && items[selectedIdx]) {
          items[selectedIdx].click();
        } else if (items.length > 0) {
          items[0].click();
        }
      } else if (e.key === 'Escape') {
        closePalette();
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePalette();
    });

    // Focus input
    setTimeout(() => input.focus(), 50);
  }

  function renderResults(commands, container, query) {
    let filtered = commands;
    if (query) {
      const q = query.toLowerCase();
      filtered = commands.filter(c =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:13px">No commands found</div>';
      return;
    }

    // Group by category
    const groups = {};
    filtered.forEach(c => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });

    let html = '';
    for (const [group, cmds] of Object.entries(groups)) {
      html += `<div style="padding:6px 14px 2px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted)">${group}</div>`;
      cmds.forEach((c, i) => {
        html += `
          <div class="cmd-item" data-action="${c.id}" 
            style="display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer;font-size:13px;transition:background 0.1s;border-radius:6px;margin:1px 6px"
            onmouseover="this.style.background='var(--bg-card-hover)'"
            onmouseout="this.style.background=''"
          >
            <span style="font-size:16px;width:24px;text-align:center">${c.icon}</span>
            <span style="flex:1">${escapeHtml(c.label)}</span>
            ${c.shortcut ? `<kbd style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${c.shortcut}</kbd>` : ''}
          </div>
        `;
      });
    }
    container.innerHTML = html;

    // Attach click handlers
    container.querySelectorAll('.cmd-item').forEach(el => {
      el.addEventListener('click', () => {
        const cmd = commands.find(c => c.id === el.dataset.action);
        if (cmd && cmd.action) {
          closePalette();
          setTimeout(() => cmd.action(), 50);
        }
      });
    });
  }

  function updateSelection(items, idx) {
    items.forEach((el, i) => {
      if (i === idx) {
        el.style.background = 'var(--accent-glow)';
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.style.background = '';
      }
    });
  }

  function closePalette() {
    const el = document.getElementById(PALETTE_ID);
    if (el) el.remove();
  }

  function openPalette() {
    allCommands = buildCommands();
    createPalette();
  }

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      // Don't open if already open or inside an input
      if (!document.getElementById(PALETTE_ID)) {
        openPalette();
      }
    }
    // Escape closes
    if (e.key === 'Escape' && document.getElementById(PALETTE_ID)) {
      e.preventDefault();
      closePalette();
    }
  });

  // Expose globally
  window.openCommandPalette = openPalette;
})();
