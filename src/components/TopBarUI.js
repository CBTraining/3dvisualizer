import { exportProjectToFile, importProjectFromFile, captureCanvasScreenshot } from '../utils/exportImport.js';

/**
 * TopBar UI with view switches, project save/load, room config, and snapshot capture
 */
export class TopBarUI {
  constructor(container, sceneManager, roomBuilder, textureManager, storage, onProjectReset) {
    this.container = container;
    this.sceneManager = sceneManager;
    this.roomBuilder = roomBuilder;
    this.textureManager = textureManager;
    this.storage = storage;
    this.onProjectReset = onProjectReset || (() => {});

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
            <span>3D Overview</span>
          </button>
          <button class="pill-btn" data-view="interior" title="Inside Room View">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"/><path d="M20 12v8H4v-8"/><path d="m4 4 8-2 8 2"/></svg>
            <span>Interior POV</span>
          </button>
          <button class="pill-btn" data-view="topdown" title="Top-Down 2D/3D Floorplan">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <span>Floorplan</span>
          </button>
        </div>

        <!-- Action Tools & Settings -->
        <div class="actions-group">
          <!-- Room Settings Dropdown Button -->
          <div class="dropdown-wrap">
            <button class="btn-secondary" id="btnRoomSettings" title="Room Materials & Dimensions">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Room Options</span>
            </button>

            <!-- Room Settings Modal/Popover -->
            <div class="settings-popover" id="settingsPopover" style="display: none;">
              <h4 class="popover-title">Room Specifications</h4>
              
              <div class="popover-field">
                <label>Flooring Finish</label>
                <div class="segmented-control" id="floorTypeGroup">
                  <button class="seg-btn active" data-floor="light-wood">Light Oak</button>
                  <button class="seg-btn" data-floor="warm-oak">Warm Wood</button>
                  <button class="seg-btn" data-floor="modern-tile">Porcelain</button>
                  <button class="seg-btn" data-floor="concrete">Concrete</button>
                </div>
              </div>

              <div class="popover-field">
                <label>Wall Section Length</label>
                <div class="dim-row">
                  <span class="dim-badge">Default: 4 × 15 ft</span>
                  <span class="dim-sub">(Total 60 ft perimeter)</span>
                </div>
              </div>

              <div class="popover-checkbox-row">
                <label class="checkbox-label">
                  <input type="checkbox" id="chkDimensions" checked />
                  <span>Show 3D Dimension Badges</span>
                </label>
              </div>

              <div class="popover-checkbox-row">
                <label class="checkbox-label">
                  <input type="checkbox" id="chkCeiling" />
                  <span>Enclose Ceiling</span>
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
            <span>Save Project File</span>
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

    // Room Settings Popover Toggle
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

    // Floor Type selection
    root.querySelectorAll('#floorTypeGroup .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('#floorTypeGroup .seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.roomBuilder.setFloorMaterial(btn.dataset.floor);
      });
    });

    // Dimension Checkbox
    const chkDimensions = root.querySelector('#chkDimensions');
    chkDimensions.addEventListener('change', (e) => {
      this.roomBuilder.toggleDimensions(e.target.checked);
    });

    // Ceiling Checkbox
    const chkCeiling = root.querySelector('#chkCeiling');
    chkCeiling.addEventListener('change', (e) => {
      this.roomBuilder.toggleCeiling(e.target.checked);
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
          if (data.dimensions) {
            this.roomBuilder.setDimensions(data.dimensions);
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
