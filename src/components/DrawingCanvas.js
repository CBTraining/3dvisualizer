/**
 * Interactive 2D Drawing Studio for concepting directly on wall sections.
 * The canvas dynamically matches the exact size and aspect ratio of the selected wall section.
 */
export class DrawingCanvas {
  constructor(container, textureManager, onDrawingChange) {
    this.container = container;
    this.textureManager = textureManager;
    this.onDrawingChange = onDrawingChange || (() => {});

    this.activeTool = 'pen'; // 'pen', 'highlighter', 'eraser', 'line', 'rectangle', 'circle', 'text'
    this.currentColor = '#1e293b';
    this.brushSize = 6;
    this.isDrawing = false;
    this.currentStroke = null;

    this.initUI();
  }

  initUI() {
    this.container.innerHTML = `
      <div class="drawing-studio">
        <!-- Toolbar Header -->
        <div class="drawing-toolbar">
          <div class="tool-group">
            <button class="tool-btn active" data-tool="pen" title="Pen / Marker">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>
              <span>Pen</span>
            </button>
            <button class="tool-btn" data-tool="highlighter" title="Highlighter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 11-6 6v3h3l6-6"/><path d="m22 2-2.3 2.3a3.5 3.5 0 0 0-5 0l-1.4 1.4 7.3 7.3 1.4-1.4a3.5 3.5 0 0 0 0-5z"/></svg>
              <span>Highlight</span>
            </button>
            <button class="tool-btn" data-tool="line" title="Straight Line">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>
              <span>Line</span>
            </button>
            <button class="tool-btn" data-tool="rectangle" title="Rectangle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
              <span>Box</span>
            </button>
            <button class="tool-btn" data-tool="circle" title="Circle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
              <span>Circle</span>
            </button>
            <button class="tool-btn" data-tool="text" title="Text Note / Dimension Callout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
              <span>Text</span>
            </button>
            <button class="tool-btn" data-tool="eraser" title="Eraser">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
              <span>Eraser</span>
            </button>
          </div>

          <div class="tool-divider"></div>

          <!-- Color Palette & Swatches -->
          <div class="color-group">
            <input type="color" id="drawColorInput" value="${this.currentColor}" class="color-picker-input" title="Custom Color" />
            <div class="swatches">
              <button class="swatch-btn active" style="background: #1e293b" data-color="#1e293b" title="Charcoal"></button>
              <button class="swatch-btn" style="background: #ffffff; border: 1px solid #cbd5e1" data-color="#ffffff" title="White"></button>
              <button class="swatch-btn" style="background: #2563eb" data-color="#2563eb" title="Royal Blue"></button>
              <button class="swatch-btn" style="background: #16a34a" data-color="#16a34a" title="Emerald"></button>
              <button class="swatch-btn" style="background: #ea580c" data-color="#ea580c" title="Amber Orange"></button>
              <button class="swatch-btn" style="background: #dc2626" data-color="#dc2626" title="Crimson"></button>
              <button class="swatch-btn" style="background: #eab308" data-color="#eab308" title="Yellow Accent"></button>
            </div>
          </div>

          <div class="tool-divider"></div>

          <!-- Brush Size -->
          <div class="size-group">
            <span class="size-label">Size: <strong id="brushSizeVal">${this.brushSize}px</strong></span>
            <input type="range" id="brushSizeSlider" min="2" max="48" value="${this.brushSize}" class="slider" />
          </div>

          <div class="tool-divider"></div>

          <!-- Actions -->
          <div class="action-group">
            <button class="action-btn" id="btnUndo" title="Undo (Ctrl+Z)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
              <span>Undo</span>
            </button>
            <button class="action-btn" id="btnRedo" title="Redo (Ctrl+Y)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
              <span>Redo</span>
            </button>
            <button class="action-btn danger" id="btnClearDraw" title="Clear Drawing Layer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              <span>Clear</span>
            </button>
          </div>
        </div>

        <!-- Interactive Canvas Viewport (Strict Aspect Ratio Fit) -->
        <div class="drawing-canvas-wrap" id="canvasViewport">
          <canvas id="liveDrawingCanvas"></canvas>
          <div class="canvas-dimension-tag" id="canvasDimTag">SELECTED WALL CONCEPT CANVAS</div>
        </div>
      </div>
    `;

    this.setupEvents();
    this.resizeCanvas();
  }

  setupEvents() {
    const root = this.container;

    // Tool switching
    root.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTool = btn.dataset.tool;
      });
    });

    // Color Swatches
    root.querySelectorAll('.swatch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.swatch-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentColor = btn.dataset.color;
        root.querySelector('#drawColorInput').value = this.currentColor;
      });
    });

    // Custom Color Input
    const colorInput = root.querySelector('#drawColorInput');
    colorInput.addEventListener('input', (e) => {
      this.currentColor = e.target.value;
      root.querySelectorAll('.swatch-btn').forEach((b) => b.classList.remove('active'));
    });

    // Brush Size
    const sizeSlider = root.querySelector('#brushSizeSlider');
    const sizeVal = root.querySelector('#brushSizeVal');
    sizeSlider.addEventListener('input', (e) => {
      this.brushSize = parseInt(e.target.value, 10);
      sizeVal.textContent = `${this.brushSize}px`;
    });

    // Undo / Redo / Clear
    root.querySelector('#btnUndo').addEventListener('click', () => this.undo());
    root.querySelector('#btnRedo').addEventListener('click', () => this.redo());
    root.querySelector('#btnClearDraw').addEventListener('click', () => this.clear());

    // Canvas Events
    this.canvasEl = root.querySelector('#liveDrawingCanvas');
    this.canvasCtx = this.canvasEl.getContext('2d');

    this.canvasEl.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvasEl.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvasEl.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.canvasEl.addEventListener('pointercancel', (e) => this.onPointerUp(e));

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      }
    });

    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.canvasEl) return;
    const activeSection = this.textureManager.getActiveSection();
    if (!activeSection) return;

    const rect = this.canvasEl.parentElement.getBoundingClientRect();
    const aspect = activeSection.widthFt / activeSection.heightFt; // Actual wall aspect ratio

    let w = rect.width - 32;
    let h = w / aspect;
    if (h > rect.height - 32) {
      h = rect.height - 32;
      w = h * aspect;
    }

    this.canvasEl.style.width = `${Math.round(w)}px`;
    this.canvasEl.style.height = `${Math.round(h)}px`;

    // Exact internal texture resolution matching aspect ratio
    this.canvasEl.width = activeSection.canvasWidth;
    this.canvasEl.height = activeSection.canvasHeight;

    const dimTag = this.container.querySelector('#canvasDimTag');
    if (dimTag) {
      dimTag.textContent = `${activeSection.name.toUpperCase()} • ${activeSection.widthFt.toFixed(1)} FT × ${activeSection.heightFt.toFixed(1)} FT (ASPECT ${aspect.toFixed(2)}:1)`;
    }

    this.refreshView();
  }

  getPointerCoords(e) {
    const rect = this.canvasEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * this.canvasEl.width;
    const y = ((e.clientY - rect.top) / rect.height) * this.canvasEl.height;
    return { x, y };
  }

  onPointerDown(e) {
    e.preventDefault();
    this.canvasEl.setPointerCapture(e.pointerId);
    const coords = this.getPointerCoords(e);
    const activeSection = this.textureManager.getActiveSection();
    if (!activeSection) return;

    if (this.activeTool === 'text') {
      const text = prompt(`Enter text annotation for ${activeSection.name}:`);
      if (text) {
        activeSection.addStroke({
          tool: 'text',
          text,
          x: coords.x,
          y: coords.y,
          color: this.currentColor,
          fontSize: Math.max(28, this.brushSize * 4)
        });
        this.refreshView();
        this.onDrawingChange();
      }
      return;
    }

    this.isDrawing = true;
    if (this.activeTool === 'pen' || this.activeTool === 'highlighter' || this.activeTool === 'eraser') {
      this.currentStroke = {
        tool: this.activeTool,
        color: this.currentColor,
        size: this.brushSize * 3,
        points: [coords]
      };
    } else {
      this.currentStroke = {
        tool: this.activeTool,
        color: this.currentColor,
        size: this.brushSize * 3,
        start: coords,
        end: coords,
        filled: false
      };
    }
  }

  onPointerMove(e) {
    if (!this.isDrawing || !this.currentStroke) return;
    const coords = this.getPointerCoords(e);

    if (this.activeTool === 'pen' || this.activeTool === 'highlighter' || this.activeTool === 'eraser') {
      this.currentStroke.points.push(coords);
    } else {
      this.currentStroke.end = coords;
    }

    this.renderLivePreview();
  }

  onPointerUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentStroke) {
      const activeSection = this.textureManager.getActiveSection();
      if (activeSection) {
        activeSection.addStroke(this.currentStroke);
        this.onDrawingChange();
      }
      this.currentStroke = null;
    }
    this.refreshView();
  }

  renderLivePreview() {
    this.refreshView();
    if (this.currentStroke) {
      const activeSection = this.textureManager.getActiveSection();
      if (activeSection) {
        activeSection.drawSingleStroke(this.canvasCtx, this.currentStroke);
      }
    }
  }

  refreshView() {
    if (!this.canvasEl || !this.canvasCtx) return;
    const activeSection = this.textureManager.getActiveSection();
    if (!activeSection) return;

    this.canvasCtx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    this.canvasCtx.drawImage(activeSection.canvas, 0, 0, this.canvasEl.width, this.canvasEl.height);
  }

  undo() {
    const activeSection = this.textureManager.getActiveSection();
    if (activeSection) {
      activeSection.undo();
      this.refreshView();
      this.onDrawingChange();
    }
  }

  redo() {
    const activeSection = this.textureManager.getActiveSection();
    if (activeSection) {
      activeSection.redo();
      this.refreshView();
      this.onDrawingChange();
    }
  }

  clear() {
    if (confirm('Clear all sketches on this wall section?')) {
      const activeSection = this.textureManager.getActiveSection();
      if (activeSection) {
        activeSection.clearDrawing();
        this.refreshView();
        this.onDrawingChange();
      }
    }
  }
}
