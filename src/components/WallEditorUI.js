/**
 * Wall Editor UI with categorized section selector matching the 4 continuous quadrant room corner walls
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
        <!-- Wall Section Selector Header -->
        <div class="section-tabs-header">
          <div class="section-tabs-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <span>ROOM CORNER SURFACES & WALLS</span>
          </div>

          <div class="wall-category-group">
            <label class="cat-label">Quadrant Room Corner Walls</label>
            <div class="wall-tabs-grid">
              <button class="wall-tab-btn active" data-section="1" title="North-West Room Corner Wall (24.3ft continuous)">
                <span class="tab-num">NW</span>
                <span class="tab-label">NW Room</span>
              </button>
              <button class="wall-tab-btn" data-section="2" title="North-East Room Corner Wall (14.2ft continuous)">
                <span class="tab-num">NE</span>
                <span class="tab-label">NE Room</span>
              </button>
              <button class="wall-tab-btn" data-section="3" title="South-West Room Corner Wall (22.3ft continuous)">
                <span class="tab-num">SW</span>
                <span class="tab-label">SW Room</span>
              </button>
              <button class="wall-tab-btn" data-section="4" title="South-East Room Wall (28.2ft continuous sharp corner)">
                <span class="tab-num">SE</span>
                <span class="tab-label">SE Room</span>
              </button>
            </div>

            <label class="cat-label" style="margin-top: 8px;">Centerpiece Island & Partition Fins</label>
            <div class="wall-tabs-grid-sub">
              <button class="wall-tab-btn" data-section="5" title="Centerpiece Island Column">
                <span class="tab-num">CTR</span>
                <span class="tab-label">Centerpiece</span>
              </button>
              <button class="wall-tab-btn" data-section="6" title="North Partition Fin">
                <span class="tab-num">F-N</span>
                <span class="tab-label">North Fin</span>
              </button>
              <button class="wall-tab-btn" data-section="7" title="West Partition Fin">
                <span class="tab-num">F-W</span>
                <span class="tab-label">West Fin</span>
              </button>
              <button class="wall-tab-btn" data-section="8" title="East Partition Fin">
                <span class="tab-num">F-E</span>
                <span class="tab-label">East Fin</span>
              </button>
              <button class="wall-tab-btn" data-section="9" title="South Entrance Vestibule">
                <span class="tab-num">VEST</span>
                <span class="tab-label">Vestibule</span>
              </button>
            </div>
          </div>
        </div>

        <div class="wall-content-body">
          <!-- Active Wall Meta & Camera Snap -->
          <div class="wall-meta-bar">
            <div class="active-wall-info">
              <h3 id="activeWallTitle">North-West Room Wall (Corner 1)</h3>
              <p class="wall-subtext" id="activeWallSubtext">Dimensions: 24.3 ft × 9.0 ft (Continuous Curved Corner)</p>
            </div>
            <button class="btn-snap-view" id="btnSnapWall" title="Align camera directly facing this room corner">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6Z"/></svg>
              <span>Face Room</span>
            </button>
          </div>

          <!-- Tabbed Mode Switcher: Image / Paint / Presets -->
          <div class="wall-subtabs">
            <button class="subtab-btn active" data-tab="image">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Image / Art</span>
            </button>
            <button class="subtab-btn" data-tab="paint">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/></svg>
              <span>Color Paint</span>
            </button>
            <button class="subtab-btn" data-tab="samples">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              <span>Sample Art</span>
            </button>
          </div>

          <!-- Panel 1: Image Upload & Controls -->
          <div class="panel-section" id="panelImage">
            <div class="image-dropzone" id="dropzoneEl">
              <input type="file" id="fileInputEl" accept="image/png, image/jpeg, image/webp, image/svg+xml" style="display: none;" />
              <div class="dropzone-inner" id="dropzoneTrigger">
                <div class="upload-icon-circle">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div class="dropzone-text">
                  <span class="primary-text">Click to upload or drag image here</span>
                  <span class="secondary-text">PNG, JPG, WebP (wraps continuously around corner)</span>
                </div>
              </div>
            </div>

            <!-- Image Settings -->
            <div class="image-controls-group" id="imageControlsGroup" style="display: none;">
              <div class="control-row-header">
                <span class="section-badge">Corner Transform</span>
                <button class="btn-clear-link" id="btnClearImage">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  <span>Remove Image</span>
                </button>
              </div>

              <!-- Fit Mode -->
              <div class="control-field">
                <label>Placement Mode</label>
                <div class="segmented-control" id="fitModeGroup">
                  <button class="seg-btn active" data-fit="fill">Fill Corner Wall</button>
                  <button class="seg-btn" data-fit="fit">Fit</button>
                  <button class="seg-btn" data-fit="stretch">Stretch</button>
                  <button class="seg-btn" data-fit="tile">Tile</button>
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
                    <label>Position X (Along Corner)</label>
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

              <!-- Rotation, Flip & Opacity -->
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

              <!-- Mirror / Flip Orientation -->
              <div class="control-field">
                <label>Image Orientation</label>
                <div class="segmented-control" id="flipGroup">
                  <button class="seg-btn" id="btnFlipH" title="Flip Image Horizontally (Mirror X)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/><path d="M12 22v-6"/></svg>
                    <span>Flip Left/Right</span>
                  </button>
                  <button class="seg-btn" id="btnFlipV" title="Flip Image Vertically (Invert Y)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/></svg>
                    <span>Flip Up/Down</span>
                  </button>
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
                  <button class="seg-btn" data-frame="12">Thin Frame</button>
                  <button class="seg-btn" data-frame="28">Gallery Frame</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Panel 2: Color Paint -->
          <div class="panel-section" id="panelPaint" style="display: none;">
            <div class="control-field">
              <label>Section Base Color</label>
              <div class="paint-swatches-grid">
                <button class="paint-swatch active" data-color="#717882" style="background: #717882" title="Architectural Grey"></button>
                <button class="paint-swatch" data-color="#18191d" style="background: #18191d" title="Matte Black"></button>
                <button class="paint-swatch" data-color="#ffffff" style="background: #ffffff" title="Pure White"></button>
                <button class="paint-swatch" data-color="#ebe7df" style="background: #ebe7df" title="Warm Greige"></button>
                <button class="paint-swatch" data-color="#2a3b4c" style="background: #2a3b4c" title="Navy Blue"></button>
                <button class="paint-swatch" data-color="#24342a" style="background: #24342a" title="Forest Green"></button>
                <button class="paint-swatch" data-color="#d97706" style="background: #d97706" title="Warm Amber"></button>
                <button class="paint-swatch" data-color="#5c6448" style="background: #5c6448" title="Olive Khaki"></button>
              </div>
              <div class="custom-color-row">
                <span>Custom Paint Tone:</span>
                <input type="color" id="wallColorPicker" value="#717882" class="color-picker-input" />
              </div>
            </div>
          </div>

          <!-- Panel 3: Sample Art Gallery -->
          <div class="panel-section" id="panelSamples" style="display: none;">
            <p class="sample-intro">Click any graphic to load onto the active room wall:</p>
            <div class="sample-art-grid">
              <button class="sample-card" data-sample="geometric">
                <div class="sample-thumb geo-thumb"></div>
                <span>Modern Bauhaus</span>
              </button>
              <button class="sample-card" data-sample="architectural">
                <div class="sample-thumb arch-thumb"></div>
                <span>Blueprint Elevation</span>
              </button>
              <button class="sample-card" data-sample="nature">
                <div class="sample-thumb nature-thumb"></div>
                <span>Abstract Horizon</span>
              </button>
              <button class="sample-card" data-sample="minimal">
                <div class="sample-thumb minimal-thumb"></div>
                <span>Exhibition Space</span>
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

    // Wall Tabs
    root.querySelectorAll('.wall-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const secId = parseInt(btn.dataset.section, 10);
        this.selectSection(secId);
      });
    });

    // Subtabs
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

    // Snap Camera
    root.querySelector('#btnSnapWall').addEventListener('click', () => {
      this.sceneManager.setView(`wall-${this.textureManager.activeSectionId}`);
    });

    // File Upload
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

    // Fit Mode
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

    // Rotation
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

    // Flip Horizontal & Vertical
    const btnFlipH = root.querySelector('#btnFlipH');
    btnFlipH.addEventListener('click', () => {
      const active = this.textureManager.getActiveSection();
      if (active) {
        active.setImageTransform({ flipX: !active.imageTransform.flipX });
        btnFlipH.classList.toggle('active', active.imageTransform.flipX);
        this.onStateChange();
      }
    });

    const btnFlipV = root.querySelector('#btnFlipV');
    btnFlipV.addEventListener('click', () => {
      const active = this.textureManager.getActiveSection();
      if (active) {
        active.setImageTransform({ flipY: !active.imageTransform.flipY });
        btnFlipV.classList.toggle('active', active.imageTransform.flipY);
        this.onStateChange();
      }
    });

    // Opacity
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
    root.querySelector('#activeWallSubtext').textContent = `Dimensions: ${active.widthFt.toFixed(1)} ft × ${active.heightFt.toFixed(1)} ft (${Math.round(active.widthFt * active.heightFt)} sq ft)`;

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

      const btnFlipH = root.querySelector('#btnFlipH');
      if (btnFlipH) btnFlipH.classList.toggle('active', !!t.flipX);

      const btnFlipV = root.querySelector('#btnFlipV');
      if (btnFlipV) btnFlipV.classList.toggle('active', !!t.flipY);
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
    const active = this.textureManager.getActiveSection();
    const canvas = document.createElement('canvas');
    canvas.width = active ? active.canvasWidth : 1600;
    canvas.height = active ? active.canvasHeight : 960;
    const ctx = canvas.getContext('2d');

    if (type === 'geometric') {
      ctx.fillStyle = '#fbf7ee';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#e76f51';
      ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, canvas.height * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#264653';
      ctx.fillRect(canvas.width * 0.15, canvas.height * 0.15, canvas.width * 0.25, canvas.height * 0.7);
    } else if (type === 'architectural') {
      ctx.fillStyle = '#0f2744';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    } else if (type === 'nature') {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#fbcfe8');
      grad.addColorStop(0.5, '#fed7aa');
      grad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f172a';
      ctx.font = '300 48px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXHIBIT SPACE', canvas.width / 2, canvas.height / 2);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      if (active) {
        active.setImage(img, dataUrl);
        this.updateForActiveSection();
        this.onStateChange();
      }
    };
    img.src = dataUrl;
  }
}
