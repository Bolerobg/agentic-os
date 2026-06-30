// 5. Conversation & Context Inspector
async function renderConversationInspector() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Conversation Inspector</h1>
        <p class="page-subtitle">Browse, search, and inspect agent conversations with token breakdowns</p>
      </div>
      <div class="btn-group">
        <select id="convFilterAgent" class="form-select" style="width:140px" onchange="renderConversationInspector()">
          <option value="">All Agents</option>
          <option value="opencode">opencode</option>
          <option value="hermes">Hermes</option>
          <option value="gemini">Gemini CLI</option>
          <option value="jcode">jcode</option>
        </select>
        <button class="btn" onclick="renderConversationInspector()">🔄 Refresh</button>
      </div>
    </div>
    <div id="convList"></div>
    <div id="convDetail" style="display:none"></div>
  `;

  try {
    const agent = document.getElementById('convFilterAgent')?.value || '';
    const data = await api.listConversations(agent);
    const conversations = data.conversations || [];

    if (conversations.length === 0) {
      document.getElementById('convList').innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-title">No conversations</div><div class="empty-state-desc">Start chatting with agents to populate this view</div></div>';
      return;
    }

    document.getElementById('convList').innerHTML = `
      <div class="table-wrapper">
        <table><thead><tr><th>Agent</th><th>User Message</th><th>Messages</th><th>Tokens</th><th>Time</th><th></th></tr></thead><tbody>
          ${conversations.map(c => `
            <tr>
              <td><span class="badge badge-accent">${escapeHtml(c.agent || 'unknown')}</span></td>
              <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.user_message || '')}</td>
              <td>${(c.messages || []).length}</td>
              <td>~${(c.token_count || 0).toLocaleString()}</td>
              <td style="font-size:12px">${timeAgo(c.timestamp)}</td>
              <td><button class="btn btn-sm" onclick="inspectConversation('${c.id}')">🔍 Inspect</button></td>
            </tr>
          `).join('')}
        </tbody></table>
      </div>
    `;

  } catch (err) {
    document.getElementById('convList').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

async function inspectConversation(convId) {
  try {
    const data = await api.getConversation(convId);
    const conv = data.conversation || [];

    document.getElementById('convList').style.display = 'none';
    const detail = document.getElementById('convDetail');
    detail.style.display = 'block';
    detail.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <div>
          <span class="badge badge-accent">${escapeHtml(data.agent)}</span>
          <span class="text-sm text-muted" style="margin-left:8px">${data.message_count} messages</span>
          <span class="text-sm text-muted" style="margin-left:8px">~${(data.total_tokens || 0).toLocaleString()} tokens</span>
        </div>
        <button class="btn btn-sm" onclick="document.getElementById('convDetail').style.display='none';document.getElementById('convList').style.display='block'">← Back</button>
      </div>
      <div class="conv-messages">
        ${conv.map(msg => {
          const isUser = msg.role === 'user';
          return `<div class="conv-message ${isUser ? 'user' : 'assistant'}" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:8px;border-left:3px solid ${isUser ? 'var(--accent)' : 'var(--green)'}">
            <div class="flex items-center justify-between mb-2">
              <span style="font-weight:600;font-size:12px">${isUser ? '👤 User' : '🤖 ' + escapeHtml(msg.agent || 'assistant')}</span>
              <span style="font-size:10px;color:var(--text-muted)">~${Math.floor((msg.content || '').length / 4)} tokens</span>
            </div>
            <pre style="white-space:pre-wrap;font-family:var(--font);font-size:12px;line-height:1.5;color:var(--text-primary);max-height:300px;overflow-y:auto">${escapeHtml(msg.content || '')}</pre>
          </div>`;
        }).join('')}
      </div>
    `;

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
