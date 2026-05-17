let costChart = null;

async function renderCostAnalytics() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Cost Analytics</h1>
        <p class="page-subtitle">Token usage and spending across all agents</p>
      </div>
    </div>

    <div class="grid grid-4" id="costCards">
      <div class="card"><div class="card-value" id="totalTokens">0</div><div class="card-label">Total Tokens</div></div>
      <div class="card"><div class="card-value" id="todayTokens">0</div><div class="card-label">Today's Tokens</div></div>
      <div class="card"><div class="card-value" id="estimatedMonthly">$0</div><div class="card-label">Est. Monthly</div></div>
      <div class="card"><div class="card-value" id="freeTierStatus" style="font-size:24px">Free</div><div class="card-label">Free Tier Status</div></div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header"><span class="card-title">Usage by Agent</span></div>
        <div id="costAgentBreakdown"></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Usage Trend</span></div>
        <div class="chart-container"><canvas id="costChart"></canvas></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Free Tier Alerts</span></div>
      <div id="freeTierAlerts"></div>
    </div>
  `;

  try {
    const cost = await api.getCost();
    const entries = cost.entries || [];

    // Aggregate
    const totalTokens = entries.reduce((sum, e) => sum + (e.tokens || 0), 0);
    const today = new Date().toISOString().slice(0, 10);
    const todayTokens = entries.filter(e => e.timestamp && e.timestamp.startsWith(today)).reduce((sum, e) => sum + (e.tokens || 0), 0);

    document.getElementById('totalTokens').textContent = totalTokens.toLocaleString();
    document.getElementById('todayTokens').textContent = todayTokens.toLocaleString();
    document.getElementById('estimatedMonthly').textContent = `$${(totalTokens * 0.000002).toFixed(2)}`;

    // Agent breakdown
    const byAgent = {};
    entries.forEach(e => {
      const agent = e.agent || 'unknown';
      byAgent[agent] = (byAgent[agent] || 0) + (e.tokens || 0);
    });
    const breakdown = document.getElementById('costAgentBreakdown');
    Object.entries(byAgent).forEach(([agent, tokens]) => {
      const pct = totalTokens > 0 ? (tokens / totalTokens * 100).toFixed(1) : 0;
      breakdown.innerHTML += `
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
            <strong>${agent}</strong>
            <span>${tokens.toLocaleString()} (${pct}%)</span>
          </div>
          <div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:4px;transition:width 0.5s"></div>
          </div>
        </div>
      `;
    });

    // Free tier alerts
    const alerts = cost.free_tier_alerts || [];
    const alertsContainer = document.getElementById('freeTierAlerts');
    if (alerts.length === 0) {
      alertsContainer.innerHTML = '<div class="empty-state" style="padding:16px"><span>No active alerts. All within free tier limits.</span></div>';
    } else {
      alertsContainer.innerHTML = alerts.map(a => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid var(--border);font-size:13px">
          <span class="badge badge-warning">ALERT</span>
          <span>${a}</span>
        </div>
      `).join('');
    }

    // Chart
    const ctx = document.getElementById('costChart');
    if (ctx && Chart) {
      if (costChart) costChart.destroy();
      const dailyTotals = {};
      entries.forEach(e => {
        if (e.timestamp) {
          const day = e.timestamp.slice(0, 10);
          dailyTotals[day] = (dailyTotals[day] || 0) + (e.tokens || 0);
        }
      });
      const days = Object.keys(dailyTotals).slice(-14);
      const values = days.map(d => dailyTotals[d]);
      costChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: days,
          datasets: [{
            label: 'Daily Tokens',
            data: values,
            borderColor: '#6c5ce7',
            backgroundColor: 'rgba(108,92,231,0.1)',
            fill: true,
            tension: 0.4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#8b8fa3', maxTicksLimit: 7 } },
            y: { ticks: { color: '#8b8fa3' } }
          }
        }
      });
    }
  } catch (err) {
    document.getElementById('costCards').innerHTML = `<div class="card"><p style="color:var(--red)">Error: ${escapeHtml(err.message)}</p></div>`;
  }
}
