let setupStep = 0;
const setupSteps = [
  { title: 'Welcome', desc: 'Configure Agentic OS for your environment' },
  { title: 'Agent Discovery', desc: 'Detecting installed agents...' },
  { title: 'Workspace', desc: 'Set your preferences' },
  { title: 'Ready', desc: 'All set!' },
];

async function renderSetupWizard() {
  const content = document.getElementById('pageContent');
  setupStep = 0;
  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Setup Wizard</h1>
      <p class="page-subtitle">Configure Agentic OS for your environment</p>
    </div>
    <div id="wizardContainer" class="card"></div>
  `;
  renderSetupStep();
}

async function renderSetupStep() {
  const container = document.getElementById('wizardContainer');
  const step = setupSteps[setupStep];
  if (!step) { finishSetup(); return; }

  container.innerHTML = `
    <div style="margin-bottom:20px">
      <div style="font-size:12px;color:var(--text2);margin-bottom:8px">Step ${setupStep + 1} of ${setupSteps.length}</div>
      <div style="display:flex;gap:6px;margin-bottom:16px">
        ${setupSteps.map((s, i) => `
          <div style="flex:1;height:4px;border-radius:2px;background:${i <= setupStep ? 'var(--accent)' : 'var(--border)'}"></div>
        `).join('')}
      </div>
      <h2 style="margin-bottom:4px">${step.title}</h2>
      <p style="color:var(--text2);font-size:14px">${step.desc}</p>
    </div>
    <div id="wizardBody"></div>
    <div style="display:flex;justify-content:space-between;margin-top:20px">
      <button class="btn" onclick="prevSetupStep()" ${setupStep === 0 ? 'disabled style="opacity:0.4"' : ''}>← Back</button>
      <button class="btn btn-primary" onclick="nextSetupStep()">${setupStep === setupSteps.length - 1 ? 'Finish' : 'Continue →'}</button>
    </div>
  `;

  const body = document.getElementById('wizardBody');

  switch (setupStep) {
    case 0:
      body.innerHTML = `
        <p style="margin-bottom:12px">Agentic OS coordinates <strong>opencode</strong>, <strong>Hermes Agent</strong>, and <strong>Gemini CLI</strong> into a unified orchestration platform.</p>
        <p style="margin-bottom:12px">This wizard will help you verify the setup and configure preferences.</p>
        <div class="form-group">
          <label class="form-label">Your Name</label>
          <input id="wizName" value="Mihir N Modi" placeholder="Enter your name">
        </div>
      `;
      break;

    case 1:
      body.innerHTML = '<div class="loading">Detecting agents...</div>';
      try {
        const status = await api.getStatus();
        const agents = status.agents || [];
        body.innerHTML = `
          <div class="grid grid-2">
            ${agents.map(a => `
              <div class="card" style="display:flex;align-items:center;gap:12px;padding:16px">
                <div class="status-dot ${a.status === 'online' ? 'online' : 'offline'}" style="width:12px;height:12px"></div>
                <div>
                  <strong>${a.name}</strong>
                  <div style="font-size:12px;color:${a.status === 'online' ? 'var(--green)' : 'var(--red)'}">${a.status}</div>
                </div>
              </div>
            `).join('')}
          </div>
          ${agents.some(a => a.status === 'offline') ? '<p style="color:var(--yellow);font-size:13px;margin-top:12px">Note: Offline agents won\'t be available for skill execution. Install them to enable full functionality.</p>' : ''}
        `;
      } catch (err) {
        body.innerHTML = `<p style="color:var(--red)">Could not connect to backend: ${escapeHtml(err.message)}</p>`;
      }
      break;

    case 2:
      body.innerHTML = `
        <div class="form-group">
          <label class="form-label">Dashboard Theme</label>
          <select id="wizTheme">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Default Agent for Unknown Tasks</label>
          <select id="wizDefaultAgent">
            <option value="opencode">opencode (Best for code/DevOps)</option>
            <option value="hermes">Hermes (Best for memory/scheduling)</option>
            <option value="gemini">Gemini CLI (Best for research)</option>
          </select>
        </div>
      `;
      break;

    case 3:
      body.innerHTML = `
        <div style="text-align:center;padding:20px">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h3>Agentic OS is ready!</h3>
          <p style="color:var(--text2);margin-top:8px">All components are configured. Start by exploring the Dashboard or running a skill.</p>
        </div>
      `;
      break;
  }
}

function nextSetupStep() {
  if (setupStep < setupSteps.length - 1) {
    setupStep++;
    renderSetupStep();
  } else {
    finishSetup();
  }
}

function prevSetupStep() {
  if (setupStep > 0) {
    setupStep--;
    renderSetupStep();
  }
}

function finishSetup() {
  showToast('Setup complete!', 'success');
  navigate('dashboard');
}
