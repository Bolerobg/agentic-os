// 7. Enhanced Cost & Token Analytics
async function renderCostAnalytics() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Cost & Token Analytics</h1>
        <p class="page-subtitle">Real-time cost tracking, per-agent breakdown & budget forecasting</p>
      </div>
      <div class="btn-group">
        <button class="btn" onclick="navigate('cost')">Legacy View</button>
        <button class="btn" onclick="renderCostAnalytics()">🔄 Refresh</button>
      </div>
    </div>
    <div id="costSummary" class="grid grid-4 mb-4"></div>
    <div class="grid grid-2 mb-4">
      <div class="card"><div class="card-header"><span class="card-title">💰 Cost by Agent</span></div><div class="chart-container"><canvas id="costAgentChart"></canvas></div></div>
      <div class="card"><div class="card-header"><span class="card-title">🔤 Token Usage by Agent</span></div><div class="chart-container"><canvas id="tokenAgentChart"></canvas></div></div>
    </div>
    <div class="card mb-4">
      <div class="card-header"><span class="card-title">📅 Last 7 Days — Cost & Tokens</span></div>
      <div class="chart-container"><canvas id="costDailyChart"></canvas></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">📊 Cost by Model</span></div>
      <div class="chart-container" style="height:200px"><canvas id="costModelChart"></canvas></div>
    </div>
  `;

  try {
    const [summary, tokenUsage] = await Promise.all([
      api.getCostSummary(),
      api.getTokenUsage()
    ]);

    const daily = summary.daily || [];
    const today = daily.length ? daily[daily.length - 1] : { cost: 0, tokens: 0 };

    document.getElementById('costSummary').innerHTML = `
      <div class="card stat-card"><div class="stat-icon purple">💰</div><div class="stat-value">$${summary.total_cost?.toFixed(4) || '0.0000'}</div><div class="stat-label">Total Cost</div></div>
      <div class="card stat-card"><div class="stat-icon yellow">📅</div><div class="stat-value">$${today.cost?.toFixed(4) || '0.0000'}</div><div class="stat-label">Today's Cost</div></div>
      <div class="card stat-card"><div class="stat-icon blue">🔤</div><div class="stat-value">${(summary.total_tokens || 0).toLocaleString()}</div><div class="stat-label">Total Tokens</div></div>
      <div class="card stat-card"><div class="stat-icon green">📈</div><div class="stat-value">$${(summary.monthly_projection || 0).toFixed(2)}</div><div class="stat-label">Monthly Projection</div></div>
    `;

    // Cost by agent chart
    if (typeof Chart !== 'undefined') {
      const perAgent = summary.per_agent || {};
      const agentLabels = Object.keys(perAgent);
      const agentColors = ['var(--accent)', 'var(--green)', 'var(--blue)', 'var(--yellow)'];

      new Chart(document.getElementById('costAgentChart'), {
        type: 'doughnut',
        data: { labels: agentLabels, datasets: [{ data: agentLabels.map(l => perAgent[l]), backgroundColor: agentColors }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-secondary)', font: { size: 10 } } } } },
      });

      // Token usage
      const usage = tokenUsage.usage || {};
      new Chart(document.getElementById('tokenAgentChart'), {
        type: 'bar',
        data: {
          labels: Object.keys(usage),
          datasets: [
            { label: 'Total', data: Object.values(usage).map(u => u.total), backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent)', borderWidth: 1 },
            { label: 'Today', data: Object.values(usage).map(u => u.today), backgroundColor: 'var(--green-dim)', borderColor: 'var(--green)', borderWidth: 1 },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-secondary)', font: { size: 10 } } } }, scales: { y: { ticks: { color: 'var(--text-muted)' } }, x: { ticks: { color: 'var(--text-muted)' } } } },
      });

      // Daily trend
      new Chart(document.getElementById('costDailyChart'), {
        type: 'line',
        data: {
          labels: daily.map(d => d.date.slice(5)),
          datasets: [
            { label: 'Cost ($)', data: daily.map(d => d.cost), borderColor: 'var(--accent)', yAxisID: 'y', tension: 0.3 },
            { label: 'Tokens', data: daily.map(d => d.tokens), borderColor: 'var(--green)', yAxisID: 'y1', tension: 0.3 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            y: { type: 'linear', position: 'left', title: { display: true, text: 'Cost ($)', color: 'var(--text-muted)' }, ticks: { color: 'var(--text-muted)' } },
            y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Tokens', color: 'var(--text-muted)' }, ticks: { color: 'var(--text-muted)' } },
          },
          plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-secondary)', font: { size: 10 } } } },
        },
      });

      // By model
      const perModel = summary.per_model || {};
      new Chart(document.getElementById('costModelChart'), {
        type: 'bar',
        data: { labels: Object.keys(perModel), datasets: [{ data: Object.values(perModel), backgroundColor: 'var(--accent-glow)', borderColor: 'var(--accent)', borderWidth: 1 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: 'var(--text-muted)', callback: v => '$' + v } }, y: { ticks: { color: 'var(--text-muted)', font: { size: 10 } } } } },
      });
    }

    // Alerts
    if ((summary.alerts || []).length > 0) {
      const alertHtml = summary.alerts.map(a => `<div class="badge badge-warning" style="margin:2px">⚠ ${escapeHtml(a.message || a)}</div>`).join('');
      document.getElementById('costSummary').insertAdjacentHTML('beforeend', `<div class="card" style="grid-column:1/-1;border-color:var(--yellow)"><div class="card-header"><span class="card-title">🚨 Free Tier Alerts</span></div>${alertHtml}</div>`);
    }

  } catch (err) {
    document.getElementById('costSummary').innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div></div>`;
  }

  // Load efficiency data
  try {
    const eff = await api.getCostEfficiency();
    const agents = eff.agents || {};
    document.getElementById('costSummary').insertAdjacentHTML('beforeend', `
      <div class="section-title" style="grid-column:1/-1;margin-top:12px">⚡ Token Efficiency</div>
      <div class="card" style="grid-column:1/-1">
        <div class="table-wrapper"><table><thead><tr><th>Agent</th><th>Tasks</th><th>Tokens/Task</th><th>Cost/Task</th><th>Success</th><th>Efficiency</th></tr></thead><tbody>
          ${Object.entries(agents).map(([name,a]) => {
            const eff_score = a.cost_per_task > 0 ? (a.success_rate / 100) / (a.cost_per_task * 1000) : 0;
            const best = Math.max(...Object.values(agents).map(x => x.cost_per_task > 0 ? (x.success_rate/100)/(x.cost_per_task*1000) : 0));
            return `<tr>
              <td><strong style="text-transform:capitalize">${name}</strong></td>
              <td>${a.total_tasks || 0}</td>
              <td>${(a.tokens_per_task || 0).toLocaleString()}</td>
              <td>$${(a.cost_per_task || 0).toFixed(6)}</td>
              <td><span class="badge ${(a.success_rate||100)>=95?'badge-success':'badge-warning'}">${a.success_rate||100}%</span></td>
              <td>${eff_score === best && eff_score > 0 ? '🏆 Best' : ''}</td>
            </tr>`;
          }).join('')}
        </tbody></table></div>
      </div>
      <div class="card" style="grid-column:1/-1">
        <div class="card-header"><span class="card-title">💡 Optimization Tips</span></div>
        <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">
          • Most efficient agent: <strong>${eff.summary?.most_efficient || 'N/A'}</strong><br>
          • Total tasks tracked: <strong>${eff.summary?.total_tasks || 0}</strong><br>
          • Models with cost data: <strong>${Object.keys(eff.models||{}).length}</strong>
        </div>
      </div>
    `);
  } catch {}
}
