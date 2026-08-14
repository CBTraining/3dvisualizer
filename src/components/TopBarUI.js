import { exportProjectToFile, importProjectFromFile, captureCanvasScreenshot } from '../utils/exportImport.js';

/**
 * TopBar UI with view switches, opacity/transparency toggle, project save/load, room config, and snapshot capture
 */
export class TopBarUI {
  constructor(container, sceneManager, roomBuilder, textureManager, storage, onProjectReset) {
    this.container = container;
    this.sceneManager = sceneManager;
    this.roomBuilder = roomBuilder;
    this.textureManager = textureManager;
    this.storage = storage;
    this.onProjectReset = onProjectReset || (() => {});

    this.isGhostMode = false;

    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <header class="app-topbar">
        <!-- Logo & Branding -->
        <div class="brand-group">
          <div class="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <div class="brand-text">
            <h1 class="app-title">3D Room Designer</h1>
            <div class="cache-indicator" id="cacheIndicator">
              <span class="cache-dot"></span>
              <span class="cache-text">Saved to Cache</span>
            </div>
          </div>
        </div>

        <!-- Camera View Modes -->
        <div class="view-mode-pills">
          <button class="pill-btn active" data-view="overview" title="3D Orbit Overview">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <span>3D Orbit</span>
          </button>
          <button class="pill-btn" data-view="walk" title="First-Person Walk Around (WASD + Mouse)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21v-7a3.5 3.5 0 0 1 7 0v7"/><path d="M12.5 21v-4a3.5 3.5 0 0 1 6 0v4"/></svg>
            <span>Walk POV (WASD)</span>
          </button>
          <button class="pill-btn" data-view="topdown" title="Top-Down 2D/3D Floorplan">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <span>Floorplan</span>
          </button>
        </div>

        <!-- Quick X-Ray Transparency Toggle -->
        <button class="btn-ghost-toggle" id="btnGhostToggle" title="Toggle Transparent / Ghost Inner Walls & Centerpiece">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span id="ghostToggleLabel">Transparent Walls: Off</span>
        </button>

        <!-- Action Tools & Settings -->
        <div class="actions-group">
          <!-- Room Settings Dropdown Button -->
          <div class="dropdown-wrap">
            <button class="btn-secondary" id="btnRoomSettings" title="Room Materials, Opacity & Dimensions">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Room Options</span>
            </button>

            <!-- Room Settings Popover -->
            <div class="settings-popover" id="settingsPopover" style="display: none;">
              <h4 class="popover-title">Room & Wall Visibility</h4>

              <!-- Opacity Slider -->
              <div class="popover-field">
                <div class="field-label-row">
                  <label>Inner Walls & Centerpiece Opacity</label>
                  <span class="field-val" id="popoverOpacityVal">100%</span>
                </div>
                <input type="range" id="interiorOpacitySlider" min="10" max="100" value="100" class="slider" />
                <div class="quick-opacity-row">
                  <button class="btn-micro active" data-op="1.0">Solid (100%)</button>
                  <button class="btn-micro" data-op="0.4">Semi (40%)</button>
                  <button class="btn-micro" data-op="0.15">Glass (15%)</button>
                </div>
              </div>
              
              <div class="popover-field" style="margin-top: 12px;">
                <label>Flooring Finish</label>
                <div class="segmented-control" id="floorTypeGroup">
                  <button class="seg-btn active" data-floor="grid-tile">Studio Grey</button>
                  <button class="seg-btn" data-floor="light-wood">Light Oak</button>
                  <button class="seg-btn" data-floor="warm-oak">Warm Wood</button>
                </div>
              </div>

              <div class="popover-checkbox-row">
                <label class="checkbox-label">
                  <input type="checkbox" id="chkDimensions" checked />
                  <span>Show Overhead Dimension Rails</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Capture Snapshot -->
          <button class="btn-secondary" id="btnSnapshot" title="Download High-Res 3D Snapshot PNG">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>Snapshot</span>
          </button>

          <!-- Hidden Project File Input -->
          <input type="file" id="importProjectInput" accept=".json,.room,.roomproj" style="display: none;" />

          <!-- Import / Open Project -->
          <button class="btn-secondary" id="btnImportProject" title="Load saved project file from computer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Open File</span>
          </button>

          <!-- Save / Export Project File -->
          <button class="btn-primary" id="btnExportProject" title="Download portable project file (.json)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Save Project</span>
          </button>
        </div>
      </header>
    `;

    this.setupEvents();
  }

  setupEvents() {
    const root = this.container;

    // View Pills
    root.querySelectorAll('.pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.sceneManager.setView(btn.dataset.view);
      });
    });

    // Quick Ghost / Transparency Toggle Button
    const btnGhost = root.querySelector('#btnGhostToggle');
    const ghostLabel = root.querySelector('#ghostToggleLabel');
    btnGhost.addEventListener('click', () => {
      this.isGhostMode = !this.isGhostMode;
      btnGhost.classList.toggle('active', this.isGhostMode);

      const targetOpacity = this.isGhostMode ? 0.3 : 1.0;
      this.roomBuilder.setInteriorOpacity(targetOpacity);
      ghostLabel.textContent = this.isGhostMode ? 'Transparent Walls: ON' : 'Transparent Walls: Off';

      const slider = root.querySelector('#interiorOpacitySlider');
      const valText = root.querySelector('#popoverOpacityVal');
      if (slider) slider.value = Math.round(targetOpacity * 100);
      if (valText) valText.textContent = `${Math.round(targetOpacity * 100)}%`;
    });

    // Interior Opacity Slider
    const opacitySlider = root.querySelector('#interiorOpacitySlider');
    const opacityValText = root.querySelector('#popoverOpacityVal');
    opacitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      opacityValText.textContent = `${val}%`;
      const op = val / 100;
      this.roomBuilder.setInteriorOpacity(op);

      this.isGhostMode = op < 0.95;
      btnGhost.classList.toggle('active', this.isGhostMode);
      ghostLabel.textContent = this.isGhostMode ? 'Transparent Walls: ON' : 'Transparent Walls: Off';
    });

    // Quick Opacity Presets
    root.querySelectorAll('.quick-opacity-row .btn-micro').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.quick-opacity-row .btn-micro').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const op = parseFloat(btn.dataset.op);
        opacitySlider.value = Math.round(op * 100);
        opacityValText.textContent = `${Math.round(op * 100)}%`;
        this.roomBuilder.setInteriorOpacity(op);

        this.isGhostMode = op < 0.95;
        btnGhost.classList.toggle('active', this.isGhostMode);
        ghostLabel.textContent = this.isGhostMode ? 'Transparent Walls: ON' : 'Transparent Walls: Off';
      });
    });

    // Settings Popover Toggle
    const btnSettings = root.querySelector('#btnRoomSettings');
    const popover = root.querySelector('#settingsPopover');
    btnSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.style.display = popover.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && e.target !== btnSettings) {
        popover.style.display = 'none';
      }
    });

    // Snapshot
    root.querySelector('#btnSnapshot').addEventListener('click', () => {
      captureCanvasScreenshot(this.sceneManager.renderer.domElement, `room_design_${Date.now()}.png`);
    });

    // Export Project File
    root.querySelector('#btnExportProject').addEventListener('click', () => {
      const projectData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        dimensions: this.roomBuilder.params,
        walls: this.textureManager.serializeAll()
      };
      exportProjectToFile(projectData, 'room_project.json');
    });

    // Import Project File
    const importInput = root.querySelector('#importProjectInput');
    root.querySelector('#btnImportProject').addEventListener('click', () => importInput.click());

    importInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files[0]) {
        try {
          const data = await importProjectFromFile(e.target.files[0]);
          if (data.walls) {
            await this.textureManager.deserializeAll(data.walls);
            this.roomBuilder.updateTextures();
          }
          this.flashCacheIndicator('Project Loaded from File');
        } catch (err) {
          alert('Could not open file: ' + err.message);
        }
      }
    });
  }

  flashCacheIndicator(text = 'Saved to Cache') {
    const el = this.container.querySelector('#cacheIndicator');
    const txt = this.container.querySelector('.cache-text');
    if (el && txt) {
      txt.textContent = text;
      el.classList.add('pulse');
      setTimeout(() => el.classList.remove('pulse'), 1200);
    }
  }
}
