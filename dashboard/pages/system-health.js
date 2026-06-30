// 9. System Health & Resource Monitoring
let sysHealthInterval = null;

async function renderSystemHealth() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">System Health</h1>
        <p class="page-subtitle">CPU, memory, disk, network & process monitoring</p>
      </div>
      <div class="btn-group">
        <label class="switch" title="Auto-refresh every 5s">
          <input type="checkbox" id="sysAutoRefresh" checked onchange="toggleSysAutoRefresh()">
          <span class="switch-slider"></span>
        </label>
        <span class="text-sm text-muted">Auto</span>
        <button class="btn btn-primary" onclick="refreshSystemHealth()">🔄 Refresh</button>
      </div>
    </div>
    <div id="sysStats" class="grid grid-4 mb-4"></div>
    <div class="grid grid-2 mb-4">
      <div class="card"><div class="card-header"><span class="card-title">🖥 CPU Usage</span></div><div class="chart-container"><canvas id="cpuGauge"></canvas></div></div>
      <div class="card"><div class="card-header"><span class="card-title">💾 Memory</span></div><div class="chart-container"><canvas id="memGauge"></canvas></div></div>
    </div>
    <div class="grid grid-2 mb-4">
      <div class="card"><div class="card-header"><span class="card-title">📀 Disk Usage</span></div><div class="chart-container"><canvas id="diskGauge"></canvas></div></div>
      <div class="card"><div class="card-header"><span class="card-title">⚙ Process Info</span></div><div id="processInfo"></div></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">🌐 Network I/O</span></div>
      <div id="networkInfo"></div>
    </div>
  `;

  await refreshSystemHealth();
  if (document.getElementById('sysAutoRefresh')?.checked) startSysAutoRefresh();
}

function startSysAutoRefresh() {
  stopSysAutoRefresh();
  sysHealthInterval = setInterval(refreshSystemHealth, 5000);
}

function stopSysAutoRefresh() {
  if (sysHealthInterval) { clearInterval(sysHealthInterval); sysHealthInterval = null; }
}

function toggleSysAutoRefresh() {
  if (document.getElementById('sysAutoRefresh')?.checked) startSysAutoRefresh();
  else stopSysAutoRefresh();
}

function drawGauge(canvasId, value, color) {
  if (typeof Chart === 'undefined') return;
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (ctx._chart) ctx._chart.destroy();
  ctx._chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [value, 100 - value],
        backgroundColor: [color, 'var(--bg-dim)'],
        borderWidth: 0,
        circumference: 270,
        rotation: 225,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });
}

async function refreshSystemHealth() {
  try {
    const data = await api.getSystemHealth();
    const hasPsutil = data.has_psutil;

    document.getElementById('sysStats').innerHTML = `
      <div class="card stat-card"><div class="stat-icon ${data.cpu ? (data.cpu.percent > 80 ? 'red' : data.cpu.percent > 50 ? 'yellow' : 'green') : 'green'}">🖥</div><div class="stat-value">${data.cpu ? data.cpu.percent.toFixed(1) + '%' : '—'}</div><div class="stat-label">CPU Usage</div>${data.cpu ? `<div class="stat-change">${data.cpu.cores} cores</div>` : ''}</div>
      <div class="card stat-card"><div class="stat-icon ${data.memory ? (data.memory.percent > 80 ? 'red' : data.memory.percent > 50 ? 'yellow' : 'green') : 'green'}">💾</div><div class="stat-value">${data.memory ? data.memory.percent.toFixed(1) + '%' : '—'}</div><div class="stat-label">Memory</div>${data.memory ? `<div class="stat-change">${data.memory.used_gb} / ${data.memory.total_gb} GB</div>` : ''}</div>
      <div class="card stat-card"><div class="stat-icon ${data.disk ? (data.disk.percent > 80 ? 'red' : data.disk.percent > 50 ? 'yellow' : 'green') : 'green'}">📀</div><div class="stat-value">${data.disk ? data.disk.percent.toFixed(1) + '%' : '—'}</div><div class="stat-label">Disk</div>${data.disk ? `<div class="stat-change">${data.disk.free_gb} GB free</div>` : ''}</div>
      <div class="card stat-card"><div class="stat-icon green">⚙</div><div class="stat-value">${data.process ? data.process.uptime_seconds : '—'}</div><div class="stat-label">Uptime (s)</div>${data.process ? `<div class="stat-change">PID: ${data.process.pid}</div>` : ''}</div>
    `;

    if (!hasPsutil) {
      document.getElementById('sysStats').innerHTML += `<div class="card" style="grid-column:1/-1;border-color:var(--yellow)"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">psutil not installed</div><div class="empty-state-desc">Install with: pip install psutil</div></div></div>`;
      return;
    }

    // Gauges
    drawGauge('cpuGauge', data.cpu?.percent || 0, data.cpu?.percent > 80 ? 'var(--red)' : data.cpu?.percent > 50 ? 'var(--yellow)' : 'var(--green)');
    drawGauge('memGauge', data.memory?.percent || 0, data.memory?.percent > 80 ? 'var(--red)' : data.memory?.percent > 50 ? 'var(--yellow)' : 'var(--green)');
    drawGauge('diskGauge', data.disk?.percent || 0, data.disk?.percent > 80 ? 'var(--red)' : data.disk?.percent > 50 ? 'var(--yellow)' : 'var(--green)');

    // Process info
    const proc = data.process;
    if (proc) {
      document.getElementById('processInfo').innerHTML = `
        <div class="grid grid-2" style="gap:10px">
          <div><span class="text-sm text-muted">PID:</span> <strong>${proc.pid}</strong></div>
          <div><span class="text-sm text-muted">Threads:</span> <strong>${proc.threads}</strong></div>
          <div><span class="text-sm text-muted">Memory:</span> <strong>${proc.memory_mb} MB</strong></div>
          <div><span class="text-sm text-muted">CPU:</span> <strong>${proc.cpu_percent}%</strong></div>
          <div style="grid-column:1/-1"><span class="text-sm text-muted">Uptime:</span> <strong>${Math.floor(proc.uptime_seconds / 3600)}h ${Math.floor((proc.uptime_seconds % 3600) / 60)}m</strong></div>
        </div>
      `;
    }

    // Network
    const net = data.network;
    if (net) {
      document.getElementById('networkInfo').innerHTML = `
        <div class="flex gap-4" style="flex-wrap:wrap">
          <div><span class="text-sm text-muted">Sent:</span> <strong>${net.sent_mb} MB</strong></div>
          <div><span class="text-sm text-muted">Received:</span> <strong>${net.recv_mb} MB</strong></div>
        </div>
      `;
    }

  } catch (err) {
    document.getElementById('sysStats').innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div></div>`;
  }
}
