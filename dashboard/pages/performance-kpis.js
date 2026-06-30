// 2. Agent Performance KPIs Dashboard
async function renderPerformanceKpis() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Performance KPIs</h1>
        <p class="page-subtitle">Response times, success rates, token usage & SLA tracking</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="recordTestMetric()">+ Record Test</button>
        <button class="btn" onclick="renderPerformanceKpis()">🔄 Refresh</button>
      </div>
    </div>
    <div id="kpiSummary" class="grid grid-4 mb-4"></div>
    <div id="kpiAgents" class="grid grid-2 mb-4"></div>
    <div class="card mb-4">
      <div class="card-header"><span class="card-title">📈 Success Rate Trends (30 days)</span></div>
      <div class="chart-container"><canvas id="kpiTrendChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">🏆 Agent Performance Leaderboard</span></div>
      <div id="kpiLeaderboard"></div>
    </div>
  `;

  try {
    const [kpis, trends] = await Promise.all([
      api.getAgentKpis(),
      api.getMetricTrends()
    ]);

    const agents = kpis.agents || {};
    const agentNames = Object.keys(agents);

    // Summary stats
    const totalRuns = agentNames.reduce((s, n) => s + (agents[n]?.total_runs || 0), 0);
    const totalTokens = agentNames.reduce((s, n) => s + (agents[n]?.total_tokens || 0), 0);
    const totalCost = agentNames.reduce((s, n) => s + (agents[n]?.total_cost || 0), 0);
    const avgSuccess = agentNames.length ? (agentNames.reduce((s, n) => s + (agents[n]?.success_rate || 100), 0) / agentNames.length) : 100;

    document.getElementById('kpiSummary').innerHTML = `
      <div class="card stat-card"><div class="stat-icon purple">📊</div><div class="stat-value">${totalRuns.toLocaleString()}</div><div class="stat-label">Total Executions</div></div>
      <div class="card stat-card"><div class="stat-icon green">✓</div><div class="stat-value">${avgSuccess.toFixed(1)}%</div><div class="stat-label">Avg Success Rate</div></div>
      <div class="card stat-card"><div class="stat-icon blue">🔤</div><div class="stat-value">${totalTokens.toLocaleString()}</div><div class="stat-label">Total Tokens</div></div>
      <div class="card stat-card"><div class="stat-icon yellow">💰</div><div class="stat-value">$${totalCost.toFixed(4)}</div><div class="stat-label">Total Cost</div></div>
    `;

    // Per-agent cards
    const agentColors = { opencode: 'purple', hermes: 'green', gemini: 'blue', jcode: 'yellow' };
    const agentIcons = { opencode: '🔧', hermes: '⚡', gemini: '🧠', jcode: '⚡' };

    document.getElementById('kpiAgents').innerHTML = agentNames.map(name => {
      const a = agents[name] || {};
      const sr = a.success_rate || 100;
      const color = sr >= 95 ? 'var(--green)' : sr >= 80 ? 'var(--yellow)' : 'var(--red)';
      return `<div class="card" style="border-left:3px solid var(--${agentColors[name] || 'accent'})">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2"><span>${agentIcons[name]}</span><strong style="text-transform:capitalize">${name}</strong></div>
          <span class="badge ${sr >= 95 ? 'badge-success' : sr >= 80 ? 'badge-warning' : 'badge-danger'}">SLA: ${sr >= 95 ? '✓' : '✗'}</span>
        </div>
        <div class="grid grid-2" style="gap:8px">
          <div><div style="font-size:11px;color:var(--text-muted)">Success Rate</div><div style="font-size:20px;font-weight:700;color:${color}">${sr}%</div></div>
          <div><div style="font-size:11px;color:var(--text-muted)">Runs (24h)</div><div style="font-size:20px;font-weight:700">${a.last_24h_runs || 0}</div></div>
          <div><div style="font-size:11px;color:var(--text-muted)">Avg Response</div><div style="font-size:14px;font-weight:600">${a.avg_response_ms ? (a.avg_response_ms / 1000).toFixed(1) + 's' : '—'}</div></div>
          <div><div style="font-size:11px;color:var(--text-muted)">P95 Response</div><div style="font-size:14px;font-weight:600">${a.p95_response_ms ? (a.p95_response_ms / 1000).toFixed(1) + 's' : '—'}</div></div>
          <div><div style="font-size:11px;color:var(--text-muted)">Tokens</div><div style="font-size:14px;font-weight:600">${(a.total_tokens || 0).toLocaleString()}</div></div>
          <div><div style="font-size:11px;color:var(--text-muted)">Error Rate</div><div style="font-size:14px;font-weight:600;color:${(a.error_rate || 0) > 5 ? 'var(--red)' : 'var(--green)'}">${a.error_rate || 0}%</div></div>
        </div>
      </div>`;
    }).join('');

    // Trend chart
    const trendData = trends.trends || {};
    const labels = trends.labels || [];
    const datasets = agentNames.map(name => ({
      label: name,
      data: trendData[name] || [],
      borderColor: `var(--${agentColors[name] || 'accent'})`,
      backgroundColor: 'transparent',
      tension: 0.3,
      spanGaps: true,
    }));

    if (labels.length > 0 && typeof Chart !== 'undefined') {
      new Chart(document.getElementById('kpiTrendChart'), {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { y: { min: 0, max: 100, ticks: { callback: v => v + '%' } } },
          plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-secondary)', font: { size: 11 } } } },
        },
      });
    }

    // Leaderboard
    const ranked = agentNames.map(name => ({ name, ...agents[name] }))
      .sort((a, b) => (b.success_rate || 0) - (a.success_rate || 0));

    document.getElementById('kpiLeaderboard').innerHTML = `
      <div class="table-wrapper">
        <table><thead><tr><th>#</th><th>Agent</th><th>Runs</th><th>Success</th><th>Avg Time</th><th>P95</th><th>Tokens</th><th>Cost</th></tr></thead><tbody>
          ${ranked.map((a, i) => `
            <tr>
              <td><strong>${i + 1}</strong></td>
              <td>${agentIcons[a.name]} <strong style="text-transform:capitalize">${a.name}</strong></td>
              <td>${a.total_runs || 0}</td>
              <td><span class="badge ${(a.success_rate || 100) >= 95 ? 'badge-success' : 'badge-warning'}">${a.success_rate || 100}%</span></td>
              <td>${a.avg_response_ms ? (a.avg_response_ms / 1000).toFixed(1) + 's' : '—'}</td>
              <td>${a.p95_response_ms ? (a.p95_response_ms / 1000).toFixed(1) + 's' : '—'}</td>
              <td>${(a.total_tokens || 0).toLocaleString()}</td>
              <td>$${(a.total_cost || 0).toFixed(4)}</td>
            </tr>
          `).join('')}
        </tbody></table>
      </div>
    `;

  } catch (err) {
    document.getElementById('kpiSummary').innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div></div>`;
  }
}

async function recordTestMetric() {
  const agents = ['opencode', 'hermes', 'gemini', 'jcode'];
  const agent = agents[Math.floor(Math.random() * agents.length)];
  const rt = Math.floor(Math.random() * 5000) + 200;
  try {
    await api.recordMetric({
      agent, task_type: 'test',
      response_time_ms: rt, tokens_used: Math.floor(Math.random() * 1000) + 100,
      success: Math.random() > 0.1, cost: Math.random() * 0.01,
    });
    showToast(`Metric recorded for ${agent}: ${rt}ms`, 'success');
    setTimeout(() => renderPerformanceKpis(), 500);
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
