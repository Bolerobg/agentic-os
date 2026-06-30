async function renderChat() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">AI Chat</h1>
        <p class="page-subtitle">Talk to opencode, Hermes, and Gemini CLI</p>
      </div>
      <div class="btn-group">
        <button class="btn" onclick="clearChat()">🗑 Clear</button>
        <button class="btn" onclick="refreshChat()">🔄 Refresh</button>
      </div>
    </div>
    <div class="chat-layout">
      <div class="chat-sidebar">
        <div class="chat-agents-label">Agents</div>
        <div class="chat-agent active" data-agent="opencode" onclick="selectAgent('opencode')">
          <div class="agent-dot online"></div>
          <div>
            <div class="chat-agent-name">opencode</div>
            <div class="chat-agent-desc">Code & DevOps</div>
          </div>
        </div>
        <div class="chat-agent" data-agent="hermes" onclick="selectAgent('hermes')">
          <div class="agent-dot online"></div>
          <div>
            <div class="chat-agent-name">Hermes</div>
            <div class="chat-agent-desc">Memory & Scheduling</div>
          </div>
        </div>
        <div class="chat-agent" data-agent="gemini" onclick="selectAgent('gemini')">
          <div class="agent-dot offline"></div>
          <div>
            <div class="chat-agent-name">Gemini CLI</div>
            <div class="chat-agent-desc">Research & Analysis</div>
          </div>
        </div>
        <div class="chat-agent" data-agent="jcode" onclick="selectAgent('jcode')">
          <div class="agent-dot online"></div>
          <div>
            <div class="chat-agent-name">jcode</div>
            <div class="chat-agent-desc">JavaScript & Node.js</div>
          </div>
        </div>
        <div class="chat-agents-label" style="margin-top:12px">LLM APIs</div>
        <div class="chat-agent" data-agent="llm:deepseek" onclick="selectAgent('llm:deepseek')">
          <div class="agent-dot online"></div>
          <div>
            <div class="chat-agent-name">🤖 DeepSeek</div>
            <div class="chat-agent-desc">deepseek-v4-pro</div>
          </div>
        </div>
        <div class="chat-agent" data-agent="llm:openrouter" onclick="selectAgent('llm:openrouter')">
          <div class="agent-dot online"></div>
          <div>
            <div class="chat-agent-name">🌐 OpenRouter</div>
            <div class="chat-agent-desc">deepseek/deepseek-chat</div>
          </div>
        </div>
        <div class="chat-agent" data-agent="llm:gemini" onclick="selectAgent('llm:gemini')">
          <div class="agent-dot online"></div>
          <div>
            <div class="chat-agent-name">🧠 Gemini</div>
            <div class="chat-agent-desc">gemini-2.5-pro</div>
          </div>
        </div>
        <div style="margin-top:auto;padding:12px;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border)">
          <div id="chatAgentStatus">opencode • ready</div>
          <select id="chatModelSelect" class="form-select" style="margin-top:6px;font-size:10px;height:26px;padding:2px 6px" onchange="window._chatModel=this.value">
            <option value="">Default model</option>
          </select>
        </div>
      </div>
      <div class="chat-main">
        <div id="chatMessages" class="chat-messages">
          <div class="chat-welcome">
            <div class="chat-welcome-icon">💬</div>
            <div class="chat-welcome-title">Agentic OS Chat</div>
            <div class="chat-welcome-desc">Select an agent on the left and start a conversation.<br>Each agent has different capabilities — choose the right one for your task.</div>
            <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;justify-content:center">
              <button class="btn btn-sm" onclick="sendQuickPrompt('opencode','Check the system status and running processes')">🔍 System Check</button>
              <button class="btn btn-sm" onclick="sendQuickPrompt('hermes','What did I work on recently?')">🧠 Recall Memory</button>
              <button class="btn btn-sm" onclick="sendQuickPrompt('gemini','Research the latest trends in AI agents')">📊 Research</button>
              <button class="btn btn-sm" onclick="sendQuickPrompt('jcode','Run a JavaScript task with Node.js')">⚡ jcode</button>
              <button class="btn btn-sm" onclick="sendQuickPrompt('llm:deepseek','Здравей, с какво можеш да ми помогнеш?')">🤖 DeepSeek</button>
              <button class="btn btn-sm" onclick="sendQuickPrompt('llm:openrouter','Hello, how can you help me?')">🌐 OpenRouter</button>
              <button class="btn btn-sm" onclick="sendQuickPrompt('llm:gemini','Explain what you can do')">🧠 Gemini</button>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div class="chat-agent-indicator" id="chatAgentIndicator">opencode</div>
            <input type="text" id="projectPath" class="form-input" placeholder="📁 Project folder (optional)" 
              style="flex:1;font-size:11px;padding:6px 10px;height:30px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:6px;color:var(--text-primary)"
              onchange="window._projectPath = this.value" onkeydown="if(event.key==='Enter'){document.getElementById('chatInput').focus()}">
            <input type="file" id="nativeFolderPicker" webkitdirectory style="display:none" onchange="handleNativeFolderPick(event)">
            <button class="btn btn-sm" onclick="openFolderPicker()" style="height:30px;font-size:11px" title="Browse folders in Finder">📂 Browse</button>
          </div>
          <textarea id="chatInput" class="chat-input" rows="1" placeholder="Type a message..." onkeydown="handleChatKey(event)"></textarea>
          <button class="btn btn-primary btn-icon" onclick="sendChatMessage()" id="chatSendBtn" title="Send">➤</button>
        </div>
      </div>
    </div>
  `;

  window._currentAgent = 'opencode';
  window._chatHistory = [];
  document.getElementById('chatInput').focus();

  // Update agent status indicators
  try {
    const status = await api.getStatus();
    (status.agents || []).forEach(a => {
      const el = document.querySelector(`.chat-agent[data-agent="${a.name}"]`);
      if (el) {
        const dot = el.querySelector('.agent-dot');
        dot.className = `agent-dot ${a.status}`;
      }
    });
    updateAgentStatusText();
  } catch {}

  // Load chat history
  await refreshChat();
}

function selectAgent(agent) {
  window._currentAgent = agent;
  document.querySelectorAll('.chat-agent').forEach(el => el.classList.remove('active'));
  document.querySelector(`.chat-agent[data-agent="${agent}"]`).classList.add('active');
  document.getElementById('chatAgentIndicator').textContent = agent;
  document.getElementById('chatInput').focus();
  updateAgentStatusText();
  updateModelSelect(agent);
}

function updateModelSelect(agent) {
  const sel = document.getElementById('chatModelSelect');
  const models = {
    'opencode': [['','DeepSeek v4-pro (default)'],['deepseek-v4-pro','DeepSeek v4-pro'],['deepseek-chat','DeepSeek Chat']],
    'hermes': [['','OpenRouter default'],['deepseek/deepseek-chat','DeepSeek Chat'],['deepseek/deepseek-r1','DeepSeek R1'],['anthropic/claude-3.5-sonnet','Claude 3.5 Sonnet'],['openai/gpt-4o','GPT-4o'],['google/gemini-2.5-pro','Gemini 2.5 Pro'],['google/gemini-2.5-flash','Gemini 2.5 Flash'],['meta-llama/llama-4-maverick','Llama 4 Maverick'],['qwen/qwen3-235b','Qwen 3 235B'],['mistralai/mistral-large','Mistral Large']],
    'gemini': [['','Gemini 2.5 Pro (default)'],['gemini-2.5-pro','Gemini 2.5 Pro'],['gemini-2.5-flash','Gemini 2.5 Flash']],
    'jcode': [['','DeepSeek v4-pro (default)'],['deepseek-v4-pro','DeepSeek v4-pro']],
    'llm:deepseek': [['','DeepSeek v4-pro'],['deepseek-v4-pro','DeepSeek v4-pro'],['deepseek-chat','DeepSeek Chat']],
    'llm:openrouter': [['','OpenRouter default'],['deepseek/deepseek-chat','DeepSeek Chat'],['deepseek/deepseek-r1','DeepSeek R1'],['anthropic/claude-3.5-sonnet','Claude 3.5 Sonnet'],['openai/gpt-4o','GPT-4o'],['google/gemini-2.5-pro','Gemini 2.5 Pro'],['google/gemini-2.5-flash','Gemini 2.5 Flash'],['meta-llama/llama-4-maverick','Llama 4 Maverick'],['qwen/qwen3-235b','Qwen 3 235B'],['mistralai/mistral-large','Mistral Large']],
    'llm:gemini': [['','Gemini 2.5 Pro'],['gemini-2.5-pro','Gemini 2.5 Pro'],['gemini-2.5-flash','Gemini 2.5 Flash']],
  };
  const opts = models[agent] || [['','Default model']];
  sel.innerHTML = opts.map(([v,label]) => `<option value="${v}">${label}</option>`).join('');
  window._chatModel = '';
}

function updateAgentStatusText() {
  const el = document.getElementById('chatAgentStatus');
  if (el && window._currentAgent) {
    const agentEl = document.querySelector(`.chat-agent[data-agent="${window._currentAgent}"]`);
    const dot = agentEl ? agentEl.querySelector('.agent-dot').className : 'offline';
    el.textContent = `${window._currentAgent} • ${dot === 'agent-dot online' ? 'online' : 'offline'}`;
  }
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
  autoResizeTextarea(e.target);
}

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 150) + 'px';
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  const agent = window._currentAgent || 'opencode';
  const project = document.getElementById('projectPath')?.value?.trim() || '';
  input.value = '';
  input.style.height = 'auto';

  addChatMessage('user', message, agent);
  const streamMsg = addChatMessage('assistant', '', agent, true);

  try {
    const model = window._chatModel || '';
    const body = JSON.stringify({ agent, message, project, model });
    const resp = await fetch('/api/chat/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token' && streamMsg) {
              streamMsg.element.querySelector('.chat-message-content').textContent += data.text;
              streamMsg.element.querySelector('.chat-message-content').innerHTML = escapeHtml(
                streamMsg.element.querySelector('.chat-message-content').textContent
              );
              document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    if (streamMsg) streamMsg.element.querySelector('.chat-message-content').textContent = '⚠ Error: ' + err.message;
  }

  if (streamMsg) streamMsg.element.querySelector('.chat-message-content').classList.remove('streaming');
}

function addChatMessage(role, content, agent, streaming = false) {
  const container = document.getElementById('chatMessages');
  const welcome = container.querySelector('.chat-welcome');
  if (welcome) welcome.style.display = 'none';

  const msg = document.createElement('div');
  msg.className = `chat-message ${role}${streaming ? ' streaming' : ''}`;
  msg.innerHTML = `
    <div class="chat-message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
    <div class="chat-message-body">
      <div class="chat-message-header">
        <span class="chat-message-agent">${role === 'user' ? 'You' : agent}</span>
        <span class="chat-message-time">just now</span>
      </div>
      <div class="chat-message-content">${escapeHtml(content)}</div>
    </div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  return streaming ? { element: msg } : null;
}

function showTypingIndicator(agent) {
  const container = document.getElementById('chatMessages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-message assistant';
  div.id = id;
  div.innerHTML = `
    <div class="chat-message-avatar">🤖</div>
    <div class="chat-message-body">
      <div class="chat-message-header">
        <span class="chat-message-agent">${agent}</span>
      </div>
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

async function refreshChat() {
  try {
    const data = await api.getChatHistory();
    const messages = data.messages || [];
    window._chatHistory = messages;
    renderChatHistory(messages);
  } catch {}
}

function renderChatHistory(messages) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const welcome = container.querySelector('.chat-welcome');
  if (welcome) welcome.style.display = 'none';

  // Remove all existing messages (keep welcome)
  container.querySelectorAll('.chat-message').forEach(el => el.remove());

  if (messages.length === 0) {
    if (welcome) welcome.style.display = '';
    return;
  }

  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = `chat-message ${msg.role}`;
    div.innerHTML = `
      <div class="chat-message-avatar">${msg.role === 'user' ? '👤' : '🤖'}</div>
      <div class="chat-message-body">
        <div class="chat-message-header">
          <span class="chat-message-agent">${msg.role === 'user' ? 'You' : msg.agent}</span>
          <span class="chat-message-time">${timeAgo(msg.timestamp)}</span>
        </div>
        <div class="chat-message-content">${escapeHtml(msg.content)}</div>
      </div>
    `;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

function clearChat() {
  document.querySelectorAll('#chatMessages .chat-message').forEach(el => el.remove());
  const welcome = document.querySelector('.chat-welcome');
  if (welcome) welcome.style.display = '';
  window._chatHistory = [];
}

function openFolderPicker() {
  // Try native folder picker first (Chromium)
  const native = document.getElementById('nativeFolderPicker');
  if (native && 'showDirectoryPicker' in window) {
    try {
      window.showDirectoryPicker().then(handle => {
        document.getElementById('projectPath').value = handle.name;
        window._projectPath = handle.name;
        showToast('📁 Project: ' + handle.name, 'success');
      }).catch(() => browseProject());
      return;
    } catch {}
  }
  // Fallback: visual modal browser
  browseProject();
}

function handleNativeFolderPick(event) {
  const files = event.target.files;
  if (files.length > 0) {
    const path = files[0].webkitRelativePath.split('/')[0];
    document.getElementById('projectPath').value = path;
    showToast('📁 ' + path, 'success');
  }
}

async function browseProject(currentPath) {
  const startPath = currentPath || document.getElementById('projectPath')?.value?.trim() || '/Users/bolero/Documents';
  let items = [];
  try {
    const url = '/api/projects?path=' + encodeURIComponent(startPath);
    const resp = await fetch(url);
    const data = await resp.json();
    items = data.items || [];
    if (data.error) { showToast(data.error, 'error'); return; }
  } catch { showToast('Cannot access folder', 'error'); return; }

  const dirs = items.filter(f => f.type === 'dir');
  const files = items.filter(f => f.type === 'file');

  showModal('📂 Browse Project', `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:12px">
      <span style="color:var(--text-muted)">📁</span>
      <span id="browsePath" style="font-family:var(--font-mono);color:var(--accent-light);font-size:11px;word-break:break-all">${escapeHtml(startPath)}</span>
    </div>
    ${dirs.length > 0 ? `
      <div class="section-title" style="font-size:11px;margin-bottom:4px">📁 Folders</div>
      <div style="max-height:200px;overflow-y:auto;margin-bottom:8px">
        ${dirs.map(d => `
          <div class="flex items-center gap-2" style="padding:6px 8px;cursor:pointer;border-radius:6px;font-size:12px"
            onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background=''"
            onclick="closeModal();browseProject('${escapeHtml((startPath + '/' + d.name).replace(/\/\/+/g, '/'))}')">
            <span>📁</span><span>${escapeHtml(d.name)}</span>
          </div>
        `).join('')}
      </div>
    ` : '<div class="text-sm text-muted" style="padding:8px 0">No subfolders</div>'}
    ${files.length > 0 ? `
      <div class="section-title" style="font-size:11px;margin-bottom:4px">📄 Files (${files.length})</div>
      <div style="font-size:10px;color:var(--text-muted);max-height:80px;overflow-y:auto">
        ${files.slice(0, 10).map(f => `<div>📄 ${escapeHtml(f.name)}</div>`).join('')}
        ${files.length > 10 ? `<div style="color:var(--text-muted)">... and ${files.length - 10} more</div>` : ''}
      </div>
    ` : ''}
  `, `
    <button class="btn btn-primary" onclick="selectBrowsePath('${escapeHtml(startPath)}')">✅ Select This Folder</button>
    ${startPath !== '/' ? `<button class="btn btn-sm" onclick="closeModal();browseProject('${escapeHtml(startPath.split('/').slice(0,-1).join('/') || '/')}')">⬆ Parent</button>` : ''}
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
  `);
}

function selectBrowsePath(path) {
  closeModal();
  const input = document.getElementById('projectPath');
  if (input) { input.value = path; window._projectPath = path; }
  showToast('📁 Project: ' + path.split('/').pop() || path, 'success');
}

function sendQuickPrompt(agent, message, model) {
  selectAgent(agent);
  document.getElementById('chatInput').value = message;
  if (model) { window._chatModel = model; document.getElementById('chatModelSelect').value = model; }
  sendChatMessage();
}
