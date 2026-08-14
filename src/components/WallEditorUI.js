/**
 * UI Component for Wall Section selection, Image uploads, transformations, and paint finishes.
 */
export class WallEditorUI {
  constructor(container, textureManager, roomBuilder, sceneManager, onStateChange) {
    this.container = container;
    this.textureManager = textureManager;
    this.roomBuilder = roomBuilder;
    this.sceneManager = sceneManager;
    this.onStateChange = onStateChange || (() => {});

    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="wall-editor-card">
        <!-- Wall Section Selector Tabs -->
        <div class="section-tabs-header">
          <div class="section-tabs-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <span>WALL SECTIONS (4 x 15 FT)</span>
          </div>
          <div class="wall-tabs">
            <button class="wall-tab-btn active" data-section="1">
              <span class="tab-num">1</span>
              <span class="tab-label">North (15ft)</span>
            </button>
            <button class="wall-tab-btn" data-section="2">
              <span class="tab-num">2</span>
              <span class="tab-label">East (15ft)</span>
            </button>
            <button class="wall-tab-btn" data-section="3">
              <span class="tab-num">3</span>
              <span class="tab-label">South (15ft)</span>
            </button>
            <button class="wall-tab-btn" data-section="4">
              <span class="tab-num">4</span>
              <span class="tab-label">West (15ft)</span>
            </button>
          </div>
        </div>

        <div class="wall-content-body">
          <!-- Active Wall Meta & Camera Snap -->
          <div class="wall-meta-bar">
            <div class="active-wall-info">
              <h3 id="activeWallTitle">Wall 1 (North)</h3>
              <p class="wall-subtext">Dimensions: 15.0 ft × 9.0 ft • Surface Area: 135 sq ft</p>
            </div>
            <button class="btn-snap-view" id="btnSnapWall" title="Align camera directly in front of this wall">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6Z"/></svg>
              <span>Face Wall</span>
            </button>
          </div>

          <!-- Tabbed Mode Switcher: Image / Paint / Presets -->
          <div class="wall-subtabs">
            <button class="subtab-btn active" data-tab="image">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Image & Art</span>
            </button>
            <button class="subtab-btn" data-tab="paint">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/></svg>
              <span>Wall Paint</span>
            </button>
            <button class="subtab-btn" data-tab="samples">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              <span>Sample Art</span>
            </button>
          </div>

          <!-- Panel 1: Image Upload & Controls -->
          <div class="panel-section" id="panelImage">
            <!-- Dropzone -->
            <div class="image-dropzone" id="dropzoneEl">
              <input type="file" id="fileInputEl" accept="image/png, image/jpeg, image/webp, image/svg+xml" style="display: none;" />
              <div class="dropzone-inner" id="dropzoneTrigger">
                <div class="upload-icon-circle">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div class="dropzone-text">
                  <span class="primary-text">Click to upload or drag image here</span>
                  <span class="secondary-text">PNG, JPG, WebP (high-res supported)</span>
                </div>
              </div>
            </div>

            <!-- Image Settings (Shown when image loaded) -->
            <div class="image-controls-group" id="imageControlsGroup" style="display: none;">
              <div class="control-row-header">
                <span class="section-badge">Image Transform</span>
                <button class="btn-clear-link" id="btnClearImage">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  <span>Remove Image</span>
                </button>
              </div>

              <!-- Fit Mode -->
              <div class="control-field">
                <label>Placement Mode</label>
                <div class="segmented-control" id="fitModeGroup">
                  <button class="seg-btn active" data-fit="fit">Fit</button>
                  <button class="seg-btn" data-fit="fill">Fill Wall</button>
                  <button class="seg-btn" data-fit="stretch">Stretch</button>
                  <button class="seg-btn" data-fit="tile">Tile / Repeat</button>
                </div>
              </div>

              <!-- Scale Slider -->
              <div class="control-field">
                <div class="field-label-row">
                  <label>Scale</label>
                  <span class="field-val" id="scaleVal">100%</span>
                </div>
                <input type="range" id="scaleSlider" min="20" max="300" value="100" class="slider" />
              </div>

              <!-- Position Offset X & Y -->
              <div class="control-grid-2">
                <div class="control-field">
                  <div class="field-label-row">
                    <label>Position X</label>
                    <span class="field-val" id="posXVal">0%</span>
                  </div>
                  <input type="range" id="posXSlider" min="-100" max="100" value="0" class="slider" />
                </div>
                <div class="control-field">
                  <div class="field-label-row">
                    <label>Position Y</label>
                    <span class="field-val" id="posYVal">0%</span>
                  </div>
                  <input type="range" id="posYSlider" min="-100" max="100" value="0" class="slider" />
                </div>
              </div>

              <!-- Rotation & Opacity -->
              <div class="control-grid-2">
                <div class="control-field">
                  <div class="field-label-row">
                    <label>Rotation</label>
                    <span class="field-val" id="rotVal">0°</span>
                  </div>
                  <input type="range" id="rotSlider" min="-180" max="180" value="0" class="slider" />
                </div>
                <div class="control-field">
                  <div class="field-label-row">
                    <label>Opacity</label>
                    <span class="field-val" id="opacityVal">100%</span>
                  </div>
                  <input type="range" id="opacitySlider" min="10" max="100" value="100" class="slider" />
                </div>
              </div>

              <!-- Picture Frame / Border -->
              <div class="control-field">
                <div class="field-label-row">
                  <label>Art Frame Border</label>
                  <span class="field-val" id="frameVal">None</span>
                </div>
                <div class="segmented-control" id="frameGroup">
                  <button class="seg-btn active" data-frame="0">None</button>
                  <button class="seg-btn" data-frame="12">Thin Black</button>
                  <button class="seg-btn" data-frame="28">Gallery Frame</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Panel 2: Wall Paint & Finish -->
          <div class="panel-section" id="panelPaint" style="display: none;">
            <div class="control-field">
              <label>Wall Paint Color</label>
              <div class="paint-swatches-grid">
                <button class="paint-swatch active" data-color="#f8f8f6" style="background: #f8f8f6" title="Studio Alabaster"></button>
                <button class="paint-swatch" data-color="#ebe7df" style="background: #ebe7df" title="Warm Greige"></button>
                <button class="paint-swatch" data-color="#dce6e5" style="background: #dce6e5" title="Sage Mist"></button>
                <button class="paint-swatch" data-color="#dce3ea" style="background: #dce3ea" title="Nordic Sky"></button>
                <button class="paint-swatch" data-color="#2a3b4c" style="background: #2a3b4c" title="Navy Slate"></button>
                <button class="paint-swatch" data-color="#2c3038" style="background: #2c3038" title="Charcoal"></button>
                <button class="paint-swatch" data-color="#e8d5c4" style="background: #e8d5c4" title="Terracotta"></button>
                <button class="paint-swatch" data-color="#24342a" style="background: #24342a" title="Forest Green"></button>
              </div>
              <div class="custom-color-row">
                <span>Custom Paint Tone:</span>
                <input type="color" id="wallColorPicker" value="#f8f8f6" class="color-picker-input" />
              </div>
            </div>

            <div class="control-field">
              <button class="btn-apply-all" id="btnApplyColorAll">Apply Paint to All 4 Walls</button>
            </div>
          </div>

          <!-- Panel 3: Sample Art Gallery -->
          <div class="panel-section" id="panelSamples" style="display: none;">
            <p class="sample-intro">Click any sample graphic or mural to load onto the active wall:</p>
            <div class="sample-art-grid">
              <button class="sample-card" data-sample="geometric">
                <div class="sample-thumb geo-thumb"></div>
                <span>Modern Geometric</span>
              </button>
              <button class="sample-card" data-sample="architectural">
                <div class="sample-thumb arch-thumb"></div>
                <span>Blueprint Grid</span>
              </button>
              <button class="sample-card" data-sample="nature">
                <div class="sample-thumb nature-thumb"></div>
                <span>Abstract Landscape</span>
              </button>
              <button class="sample-card" data-sample="minimal">
                <div class="sample-thumb minimal-thumb"></div>
                <span>Minimalist Gallery</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
    this.updateForActiveSection();
  }

  setupEvents() {
    const root = this.container;

    // Wall Tabs (1, 2, 3, 4)
    root.querySelectorAll('.wall-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const secId = parseInt(btn.dataset.section, 10);
        this.selectSection(secId);
      });
    });

    // Subtabs (Image / Paint / Samples)
    root.querySelectorAll('.subtab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.subtab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.tab;
        root.querySelector('#panelImage').style.display = tab === 'image' ? 'block' : 'none';
        root.querySelector('#panelPaint').style.display = tab === 'paint' ? 'block' : 'none';
        root.querySelector('#panelSamples').style.display = tab === 'samples' ? 'block' : 'none';
      });
    });

    // Snap Camera to Wall
    root.querySelector('#btnSnapWall').addEventListener('click', () => {
      this.sceneManager.setView(`wall-${this.textureManager.activeSectionId}`);
    });

    // File Upload Trigger
    const fileInput = root.querySelector('#fileInputEl');
    const dropzoneTrigger = root.querySelector('#dropzoneTrigger');
    dropzoneTrigger.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    // Drag & Drop
    const dropzone = root.querySelector('#dropzoneEl');
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    // Remove Image
    root.querySelector('#btnClearImage').addEventListener('click', () => {
      const active = this.textureManager.getActiveSection();
      if (active) {
        active.clearImage();
        this.updateForActiveSection();
        this.onStateChange();
      }
    });

    // Fit Mode Segmented Control
    root.querySelectorAll('#fitModeGroup .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('#fitModeGroup .seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const active = this.textureManager.getActiveSection();
        if (active) {
          active.setImageTransform({ fitMode: btn.dataset.fit });
          this.onStateChange();
        }
      });
    });

    // Scale Slider
    const scaleSlider = root.querySelector('#scaleSlider');
    const scaleVal = root.querySelector('#scaleVal');
    scaleSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      scaleVal.textContent = `${val}%`;
      const active = this.textureManager.getActiveSection();
      if (active) {
        active.setImageTransform({ scale: val / 100 });
        this.onStateChange();
      }
    });

    // Position X & Y
    const posXSlider = root.querySelector('#posXSlider');
    const posXVal = root.querySelector('#posXVal');
    posXSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      posXVal.textContent = `${val}%`;
      const active = this.textureManager.getActiveSection();
      if (active) {
        active.setImageTransform({ offsetX: val / 100 });
        this.onStateChange();
      }
    });

    const posYSlider = root.querySelector('#posYSlider');
    const posYVal = root.querySelector('#posYVal');
    posYSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      posYVal.textContent = `${val}%`;
      const active = this.textureManager.getActiveSection();
      if (active) {
        active.setImageTransform({ offsetY: val / 100 });
        this.onStateChange();
      }
    });

    // Rotation Slider
    const rotSlider = root.querySelector('#rotSlider');
    const rotVal = root.querySelector('#rotVal');
    rotSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      rotVal.textContent = `${val}°`;
      const active = this.textureManager.getActiveSection();
      if (active) {
        active.setImageTransform({ rotation: val });
        this.onStateChange();
      }
    });

    // Opacity Slider
    const opacitySlider = root.querySelector('#opacitySlider');
    const opacityVal = root.querySelector('#opacityVal');
    opacitySlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      opacityVal.textContent = `${val}%`;
      const active = this.textureManager.getActiveSection();
      if (active) {
        active.setImageTransform({ opacity: val / 100 });
        this.onStateChange();
      }
    });

    // Frame Border
    root.querySelectorAll('#frameGroup .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('#frameGroup .seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const fw = parseInt(btn.dataset.frame, 10);
        const active = this.textureManager.getActiveSection();
        if (active) {
          active.setImageTransform({ frameWidth: fw });
          this.onStateChange();
        }
      });
    });

    // Paint Swatches
    root.querySelectorAll('.paint-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.paint-swatch').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.dataset.color;
        root.querySelector('#wallColorPicker').value = color;
        const active = this.textureManager.getActiveSection();
        if (active) {
          active.setBaseColor(color);
          this.onStateChange();
        }
      });
    });

    // Custom Color Picker
    const colorPicker = root.querySelector('#wallColorPicker');
    colorPicker.addEventListener('input', (e) => {
      const color = e.target.value;
      root.querySelectorAll('.paint-swatch').forEach((b) => b.classList.remove('active'));
      const active = this.textureManager.getActiveSection();
      if (active) {
        active.setBaseColor(color);
        this.onStateChange();
      }
    });

    // Apply Color to All Walls
    root.querySelector('#btnApplyColorAll').addEventListener('click', () => {
      const active = this.textureManager.getActiveSection();
      if (active) {
        const color = active.baseColor;
        for (let i = 1; i <= 4; i++) {
          this.textureManager.getSection(i).setBaseColor(color);
        }
        this.onStateChange();
      }
    });

    // Sample Art Cards
    root.querySelectorAll('.sample-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.loadSampleGraphic(card.dataset.sample);
      });
    });
  }

  selectSection(id) {
    this.textureManager.setActiveSection(id);
    this.roomBuilder.highlightWall(id);

    const root = this.container;
    root.querySelectorAll('.wall-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.section, 10) === id);
    });

    this.updateForActiveSection();
    this.onStateChange();
  }

  updateForActiveSection() {
    const root = this.container;
    const active = this.textureManager.getActiveSection();
    if (!active) return;

    root.querySelector('#activeWallTitle').textContent = active.name;

    const hasImage = !!active.image;
    root.querySelector('#imageControlsGroup').style.display = hasImage ? 'block' : 'none';

    if (hasImage) {
      const t = active.imageTransform;
      root.querySelector('#scaleSlider').value = Math.round(t.scale * 100);
      root.querySelector('#scaleVal').textContent = `${Math.round(t.scale * 100)}%`;

      root.querySelector('#posXSlider').value = Math.round(t.offsetX * 100);
      root.querySelector('#posXVal').textContent = `${Math.round(t.offsetX * 100)}%`;

      root.querySelector('#posYSlider').value = Math.round(t.offsetY * 100);
      root.querySelector('#posYVal').textContent = `${Math.round(t.offsetY * 100)}%`;

      root.querySelector('#rotSlider').value = Math.round(t.rotation);
      root.querySelector('#rotVal').textContent = `${Math.round(t.rotation)}°`;

      root.querySelector('#opacitySlider').value = Math.round(t.opacity * 100);
      root.querySelector('#opacityVal').textContent = `${Math.round(t.opacity * 100)}%`;

      root.querySelectorAll('#fitModeGroup .seg-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.fit === t.fitMode);
      });
    }

    root.querySelector('#wallColorPicker').value = active.baseColor;
  }

  handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        const active = this.textureManager.getActiveSection();
        if (active) {
          active.setImage(img, dataUrl);
          this.updateForActiveSection();
          this.onStateChange();
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  loadSampleGraphic(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');

    if (type === 'geometric') {
      // Modern Bauhaus / Geometric composition
      ctx.fillStyle = '#fbf7ee';
      ctx.fillRect(0, 0, 1600, 960);

      ctx.fillStyle = '#e76f51';
      ctx.beginPath();
      ctx.arc(800, 480, 260, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#264653';
      ctx.fillRect(200, 150, 400, 660);

      ctx.fillStyle = '#e9c46a';
      ctx.beginPath();
      ctx.moveTo(700, 700);
      ctx.lineTo(1300, 700);
      ctx.lineTo(1000, 200);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#2a9d8f';
      ctx.lineWidth = 16;
      ctx.strokeRect(300, 250, 1000, 460);
    } else if (type === 'architectural') {
      // Blueprint grid
      ctx.fillStyle = '#0f2744';
      ctx.fillRect(0, 0, 1600, 960);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 1600; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 960); ctx.stroke();
      }
      for (let y = 0; y <= 960; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1600, y); ctx.stroke();
      }

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(200, 160, 1200, 640);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('SECTION ELEVATION - 15 FT INTERIOR MODULE', 240, 230);
    } else if (type === 'nature') {
      // Landscape art
      const grad = ctx.createLinearGradient(0, 0, 0, 960);
      grad.addColorStop(0, '#fbcfe8');
      grad.addColorStop(0.5, '#fed7aa');
      grad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1600, 960);

      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.arc(800, 360, 140, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, 960);
      ctx.lineTo(400, 500);
      ctx.lineTo(800, 700);
      ctx.lineTo(1200, 450);
      ctx.lineTo(1600, 800);
      ctx.lineTo(1600, 960);
      ctx.closePath();
      ctx.fill();
    } else {
      // Minimalist gallery poster
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1600, 960);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(800, 420, 200, 0, Math.PI);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = '300 48px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N E O   S T U D I O', 800, 750);
      ctx.font = '400 20px "Inter", sans-serif';
      ctx.fillText('INTERIOR ARCHITECTURAL CONCEPT • 15FT SECTION', 800, 800);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      const active = this.textureManager.getActiveSection();
      if (active) {
        active.setImage(img, dataUrl);
        this.updateForActiveSection();
        this.onStateChange();
      }
    };
    img.src = dataUrl;
  }
}
