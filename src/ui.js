/**
 * Rotterdam Open World - User Interface & HUD (Czech Language)
 * Mode badges, vehicle dashboard gauges, interaction prompts, and help overlays.
 */

export class UIManager {
  constructor() {
    this.createStyles();
    this.createHUD();
    this.initEvents();
  }

  createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #ffffff;
      }
      #hud-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        box-sizing: border-box;
      }
      .hud-panel {
        pointer-events: auto;
      }
      /* Top Bar */
      #top-bar {
        position: absolute;
        top: 18px;
        left: 20px;
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .brand-title {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        background: linear-gradient(135deg, #00d2d3, #ff9f43);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 2px 10px rgba(0,0,0,0.5);
      }
      .mode-badge {
        background: rgba(18, 25, 38, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(8px);
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: #f1f2f6;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      /* Top Right Actions */
      #top-right {
        position: absolute;
        top: 18px;
        right: 20px;
        display: flex;
        gap: 10px;
      }
      .hud-btn {
        background: rgba(20, 28, 42, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(8px);
        color: #fff;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .hud-btn:hover {
        background: rgba(40, 52, 75, 0.95);
        border-color: #00d2d3;
        transform: translateY(-1px);
      }
      /* Interaction Prompt */
      #prompt-banner {
        position: absolute;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(10, 15, 24, 0.9);
        border: 2px solid #ff9f43;
        border-radius: 28px;
        padding: 10px 24px;
        font-size: 15px;
        font-weight: 700;
        color: #fff;
        display: none;
        align-items: center;
        gap: 10px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7);
        animation: pulsePrompt 1.6s infinite ease-in-out;
      }
      @keyframes pulsePrompt {
        0%, 100% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.04); }
      }
      .key-tag {
        background: #ff9f43;
        color: #111;
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: 900;
      }
      /* Minimap Container */
      #minimap-wrapper {
        position: absolute;
        bottom: 24px;
        left: 24px;
      }
      /* Vehicle Dashboard */
      #dashboard {
        position: absolute;
        bottom: 24px;
        right: 24px;
        background: rgba(12, 18, 28, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
        border-radius: 14px;
        padding: 14px 20px;
        min-width: 170px;
        display: none;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
      }
      .dash-speed {
        font-size: 34px;
        font-weight: 900;
        line-height: 1;
        color: #ffffff;
        font-family: monospace;
      }
      .dash-unit {
        font-size: 13px;
        color: #a4b0be;
        font-weight: 600;
        margin-left: 4px;
      }
      .dash-gauge {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
        margin-top: 8px;
        overflow: hidden;
      }
      .dash-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00d2d3, #ff4757);
        transition: width 0.08s ease;
      }
      .dash-sub {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #ced6e0;
        margin-top: 6px;
        font-weight: 600;
      }
      /* Help Modal */
      #help-modal {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(15, 22, 34, 0.96);
        border: 2px solid rgba(0, 210, 211, 0.5);
        border-radius: 16px;
        padding: 26px 32px;
        max-width: 520px;
        width: 90%;
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(15px);
        display: none;
        z-index: 100;
      }
      .help-title {
        font-size: 22px;
        font-weight: 800;
        margin-bottom: 16px;
        color: #00d2d3;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .help-close {
        cursor: pointer;
        font-size: 18px;
        color: #a4b0be;
      }
      .help-section {
        margin-bottom: 14px;
      }
      .help-section h4 {
        margin: 0 0 6px 0;
        font-size: 14px;
        color: #ff9f43;
      }
      .help-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        margin-bottom: 4px;
        color: #dfe4ea;
      }
      .kbd {
        background: #2f3542;
        padding: 2px 7px;
        border-radius: 4px;
        font-family: monospace;
        font-weight: bold;
        color: #fff;
        border: 1px solid #57606f;
      }
    `;
    document.head.appendChild(style);
  }

  createHUD() {
    this.container = document.createElement('div');
    this.container.id = 'hud-container';

    this.container.innerHTML = `
      <div id="top-bar" class="hud-panel">
        <div class="brand-title">Rotterdam 3D</div>
        <div id="mode-badge" class="mode-badge">🏃 Pěšky</div>
      </div>

      <div id="top-right" class="hud-panel">
        <button id="btn-tod" class="hud-btn">☀️ Den / Noc</button>
        <button id="btn-respawn" class="hud-btn">🔄 Restart</button>
        <button id="btn-help" class="hud-btn">❓ Nápověda [H]</button>
      </div>

      <div id="prompt-banner" class="hud-panel">
        <span class="key-tag">E</span>
        <span id="prompt-text">Nasednout do auta</span>
      </div>

      <div id="minimap-wrapper" class="hud-panel">
        <div id="minimap-container"></div>
      </div>

      <div id="dashboard" class="hud-panel">
        <div>
          <span id="dash-val" class="dash-speed">0</span>
          <span id="dash-unit" class="dash-unit">KM/H</span>
        </div>
        <div class="dash-gauge">
          <div id="dash-bar" class="dash-bar"></div>
        </div>
        <div class="dash-sub">
          <span id="dash-sub1">Rychlost: D</span>
          <span id="dash-sub2">RPM: 900</span>
        </div>
      </div>

      <div id="help-modal" class="hud-panel">
        <div class="help-title">
          <span>🎮 Ovládání hry Rotterdam Open World</span>
          <span id="help-close-btn" class="help-close">✕</span>
        </div>

        <div class="help-section">
          <h4>🏃 Pohyb pěšky</h4>
          <div class="help-row"><span>Chůze</span><span><span class="kbd">W</span> <span class="kbd">A</span> <span class="kbd">S</span> <span class="kbd">D</span></span></div>
          <div class="help-row"><span>Sprint</span><span><span class="kbd">Shift</span></span></div>
          <div class="help-row"><span>Výskok</span><span><span class="kbd">Mezerník</span></span></div>
          <div class="help-row"><span>Otáčení kamery</span><span><span class="kbd">Myš (tažení)</span></span></div>
          <div class="help-row"><span>Přiblížení kamery</span><span><span class="kbd">Kolečko myši</span></span></div>
        </div>

        <div class="help-section">
          <h4>🚗 Řízení auta (Rotterdam GT)</h4>
          <div class="help-row"><span>Plyn / Zpátečka</span><span><span class="kbd">W</span> / <span class="kbd">S</span></span></div>
          <div class="help-row"><span>Zatáčení kol</span><span><span class="kbd">A</span> / <span class="kbd">D</span></span></div>
          <div class="help-row"><span>Ruční brzda (Drift)</span><span><span class="kbd">Mezerník</span></span></div>
          <div class="help-row"><span>Narovnat převrácené auto</span><span><span class="kbd">R</span></span></div>
          <div class="help-row"><span>Vystoupit z auta</span><span><span class="kbd">E</span> nebo <span class="kbd">F</span></span></div>
        </div>

        <div class="help-section">
          <h4>🚤 Plavba lodí (Rotterdam Wave)</h4>
          <div class="help-row"><span>Tah motoru vpřed / vzad</span><span><span class="kbd">W</span> / <span class="kbd">S</span></span></div>
          <div class="help-row"><span>Kormidlo (Otáčení)</span><span><span class="kbd">A</span> / <span class="kbd">D</span></span></div>
          <div class="help-row"><span>Vystoupit z lodi na molo</span><span><span class="kbd">E</span> nebo <span class="kbd">F</span></span></div>
        </div>

        <div style="font-size: 11px; color: #747d8c; margin-top: 14px; text-align: center;">
          3D Modely pocházejí přímo z otevřeného portálu <b>3drotterdam.nl</b> (Erasmusbrug + mrakodrapy).
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.modeBadge = document.getElementById('mode-badge');
    this.promptBanner = document.getElementById('prompt-banner');
    this.promptText = document.getElementById('prompt-text');
    this.dashboard = document.getElementById('dashboard');
    this.dashVal = document.getElementById('dash-val');
    this.dashUnit = document.getElementById('dash-unit');
    this.dashBar = document.getElementById('dash-bar');
    this.dashSub1 = document.getElementById('dash-sub1');
    this.dashSub2 = document.getElementById('dash-sub2');
    this.helpModal = document.getElementById('help-modal');
  }

  initEvents() {
    const helpBtn = document.getElementById('btn-help');
    const helpClose = document.getElementById('help-close-btn');

    const toggleHelp = () => {
      const isVisible = this.helpModal.style.display === 'block';
      this.helpModal.style.display = isVisible ? 'none' : 'block';
    };

    helpBtn.addEventListener('click', toggleHelp);
    helpClose.addEventListener('click', toggleHelp);

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'h' || e.key === 'F1') {
        toggleHelp();
        e.preventDefault();
      }
    });
  }

  setMode(mode) {
    if (mode === 'foot') {
      this.modeBadge.innerHTML = '🏃 Pěšky';
      this.dashboard.style.display = 'none';
    } else if (mode === 'car') {
      this.modeBadge.innerHTML = '🚗 V autě (Rotterdam GT)';
      this.dashUnit.textContent = 'KM/H';
      this.dashboard.style.display = 'block';
      this.hidePrompt();
    } else if (mode === 'boat') {
      this.modeBadge.innerHTML = '🚤 Na lodi (Rotterdam Wave)';
      this.dashUnit.textContent = 'UZLŮ';
      this.dashboard.style.display = 'block';
      this.hidePrompt();
    }
  }

  showPrompt(text) {
    this.promptText.textContent = text;
    this.promptBanner.style.display = 'flex';
  }

  hidePrompt() {
    this.promptBanner.style.display = 'none';
  }

  updateDashboard(val, maxVal, sub1, sub2) {
    this.dashVal.textContent = val;
    const pct = Math.min(100, Math.max(0, (val / maxVal) * 100));
    this.dashBar.style.width = pct + '%';
    if (sub1) this.dashSub1.textContent = sub1;
    if (sub2) this.dashSub2.textContent = sub2;
  }
}
