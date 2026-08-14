import * as THREE from 'three';

/**
 * Manages dynamic high-res canvas textures for each distinct architectural wall/panel section.
 */
export class WallTextureSection {
  constructor(id, name, widthFt = 15, heightFt = 9, options = {}) {
    this.id = id;
    this.name = name;
    this.widthFt = widthFt;
    this.heightFt = heightFt;

    this.canvasWidth = 2048;
    this.canvasHeight = Math.round((2048 * heightFt) / widthFt);
    if (this.canvasHeight < 512) this.canvasHeight = 512;
    
    // Main composite canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    // Drawing layer canvas
    this.drawingCanvas = document.createElement('canvas');
    this.drawingCanvas.width = this.canvasWidth;
    this.drawingCanvas.height = this.canvasHeight;
    this.drawingCtx = this.drawingCanvas.getContext('2d', { willReadFrequently: true });

    // Three.js Canvas Texture
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = true;

    // State properties
    this.baseColor = options.baseColor || '#555e42'; // Default olive/khaki or grey
    this.hasScreen = options.hasScreen || false;
    this.screenTexture = null;
    this.image = null;
    this.imageDataUrl = null;
    this.imageTransform = {
      fitMode: 'fit',
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      opacity: 1.0,
      frameColor: '#1e293b',
      frameWidth: 0
    };

    this.strokes = [];
    this.redoStack = [];

    this.renderComposite();
  }

  setBaseColor(color) {
    this.baseColor = color;
    this.renderComposite();
  }

  setImage(imgElement, dataUrl = null) {
    this.image = imgElement;
    this.imageDataUrl = dataUrl;
    this.renderComposite();
  }

  clearImage() {
    this.image = null;
    this.imageDataUrl = null;
    this.renderComposite();
  }

  setImageTransform(options = {}) {
    this.imageTransform = { ...this.imageTransform, ...options };
    this.renderComposite();
  }

  renderComposite() {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    // 1. Base Paint Color
    ctx.fillStyle = this.baseColor;
    ctx.fillRect(0, 0, w, h);

    // Subtle wall texture gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.04)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Default Mounted Display Screen (if configured and no custom full-image)
    if (this.hasScreen && !this.image) {
      this.drawDefaultScreen(ctx, w, h);
    }

    // 3. Custom Image Layer
    if (this.image && (this.image.complete || this.image.width > 0)) {
      ctx.save();
      ctx.globalAlpha = this.imageTransform.opacity;

      const imgW = this.image.naturalWidth || this.image.width;
      const imgH = this.image.naturalHeight || this.image.height;
      const mode = this.imageTransform.fitMode;

      if (mode === 'tile') {
        const pattern = ctx.createPattern(this.image, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        let drawW = w;
        let drawH = h;
        let posX = w / 2;
        let posY = h / 2;

        if (mode === 'fit') {
          const aspect = imgW / imgH;
          const canvasAspect = w / h;
          if (aspect > canvasAspect) {
            drawW = w * 0.85 * this.imageTransform.scale;
            drawH = (drawW / aspect);
          } else {
            drawH = h * 0.85 * this.imageTransform.scale;
            drawW = (drawH * aspect);
          }
        } else if (mode === 'fill') {
          const aspect = imgW / imgH;
          const canvasAspect = w / h;
          if (aspect > canvasAspect) {
            drawH = h * this.imageTransform.scale;
            drawW = drawH * aspect;
          } else {
            drawW = w * this.imageTransform.scale;
            drawH = drawW / aspect;
          }
        } else if (mode === 'stretch') {
          drawW = w * this.imageTransform.scale;
          drawH = h * this.imageTransform.scale;
        }

        posX += this.imageTransform.offsetX * (w / 2);
        posY += this.imageTransform.offsetY * (h / 2);

        ctx.translate(posX, posY);
        if (this.imageTransform.rotation !== 0) {
          ctx.rotate((this.imageTransform.rotation * Math.PI) / 180);
        }

        if (this.imageTransform.frameWidth > 0) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 8;
          ctx.fillStyle = this.imageTransform.frameColor;
          const fw = this.imageTransform.frameWidth;
          ctx.fillRect(-drawW / 2 - fw, -drawH / 2 - fw, drawW + fw * 2, drawH + fw * 2);
          ctx.shadowColor = 'transparent';
        }

        ctx.drawImage(this.image, -drawW / 2, -drawH / 2, drawW, drawH);
      }
      ctx.restore();
    }

    // 4. Drawing Layer
    ctx.drawImage(this.drawingCanvas, 0, 0);

    // Subtle dimension border
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.restore();

    this.texture.needsUpdate = true;
  }

  drawDefaultScreen(ctx, w, h) {
    const sw = w * 0.6;
    const sh = h * 0.45;
    const sx = (w - sw) / 2;
    const sy = (h - sh) / 2 - 20;

    // Bezel
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(sx - 10, sy - 10, sw + 20, sh + 20);

    // Screen Panel
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sx, sy, sw, sh);

    // Screen subtle graphic
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.font = 'bold 36px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DISPLAY PANEL', w / 2, sy + sh / 2);
  }

  clearDrawing() {
    this.drawingCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.strokes = [];
    this.redoStack = [];
    this.renderComposite();
  }

  addStroke(strokeData) {
    this.strokes.push(strokeData);
    this.redoStack = [];
    this.redrawAllStrokes();
  }

  undo() {
    if (this.strokes.length > 0) {
      this.redoStack.push(this.strokes.pop());
      this.redrawAllStrokes();
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      this.strokes.push(this.redoStack.pop());
      this.redrawAllStrokes();
    }
  }

  redrawAllStrokes() {
    this.drawingCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    for (const stroke of this.strokes) {
      this.drawSingleStroke(this.drawingCtx, stroke);
    }
    this.renderComposite();
  }

  drawSingleStroke(ctx, stroke) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.size || 20;
      ctx.beginPath();
      if (stroke.points && stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    } else if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = stroke.color || '#ffeb3b';
      ctx.lineWidth = stroke.size || 28;
      ctx.beginPath();
      if (stroke.points && stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    } else if (stroke.tool === 'pen' || stroke.tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color || '#1e293b';
      ctx.lineWidth = stroke.size || 6;
      ctx.beginPath();
      if (stroke.points && stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    } else if (stroke.tool === 'line') {
      ctx.strokeStyle = stroke.color || '#1e293b';
      ctx.lineWidth = stroke.size || 6;
      ctx.beginPath();
      ctx.moveTo(stroke.start.x, stroke.start.y);
      ctx.lineTo(stroke.end.x, stroke.end.y);
      ctx.stroke();
    } else if (stroke.tool === 'rectangle') {
      ctx.strokeStyle = stroke.color || '#1e293b';
      ctx.lineWidth = stroke.size || 6;
      const rx = Math.min(stroke.start.x, stroke.end.x);
      const ry = Math.min(stroke.start.y, stroke.end.y);
      const rw = Math.abs(stroke.end.x - stroke.start.x);
      const rh = Math.abs(stroke.end.y - stroke.start.y);
      ctx.strokeRect(rx, ry, rw, rh);
    } else if (stroke.tool === 'circle') {
      ctx.strokeStyle = stroke.color || '#1e293b';
      ctx.lineWidth = stroke.size || 6;
      const rx = (stroke.start.x + stroke.end.x) / 2;
      const ry = (stroke.start.y + stroke.end.y) / 2;
      const radX = Math.abs(stroke.end.x - stroke.start.x) / 2;
      const radY = Math.abs(stroke.end.y - stroke.start.y) / 2;
      ctx.beginPath();
      ctx.ellipse(rx, ry, radX, radY, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (stroke.tool === 'text') {
      ctx.fillStyle = stroke.color || '#1e293b';
      ctx.font = `bold ${stroke.fontSize || 36}px "Inter", sans-serif`;
      ctx.fillText(stroke.text, stroke.x, stroke.y);
    }

    ctx.restore();
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      widthFt: this.widthFt,
      heightFt: this.heightFt,
      baseColor: this.baseColor,
      hasScreen: this.hasScreen,
      imageDataUrl: this.imageDataUrl,
      imageTransform: { ...this.imageTransform },
      strokes: this.strokes
    };
  }

  async deserialize(data) {
    if (!data) return;
    this.baseColor = data.baseColor || this.baseColor;
    this.hasScreen = data.hasScreen !== undefined ? data.hasScreen : this.hasScreen;
    if (data.imageTransform) {
      this.imageTransform = { ...this.imageTransform, ...data.imageTransform };
    }
    this.strokes = data.strokes || [];
    this.redoStack = [];

    if (data.imageDataUrl) {
      this.imageDataUrl = data.imageDataUrl;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        img.onload = () => {
          this.image = img;
          resolve();
        };
        img.onerror = () => {
          this.image = null;
          resolve();
        };
        img.src = data.imageDataUrl;
      });
    } else {
      this.image = null;
      this.imageDataUrl = null;
    }

    this.redrawAllStrokes();
  }
}

/**
 * Manager handling all architectural wall sections from the reference floorplan
 */
export class WallTextureManager {
  constructor(onUpdateCallback) {
    this.onUpdate = onUpdateCallback || (() => {});
    
    // Wall sections configured matching the reference floorplan colors and layout
    this.sections = {
      1: new WallTextureSection(1, 'North Wall (Right Screen)', 15, 9, { baseColor: '#5c6448', hasScreen: true }),
      2: new WallTextureSection(2, 'Upper West Wall (Screen)', 12, 9, { baseColor: '#5c6448', hasScreen: true }),
      3: new WallTextureSection(3, 'Lower West Wall (Screen)', 12, 9, { baseColor: '#7a818c', hasScreen: true }),
      4: new WallTextureSection(4, 'South Wall (Left Grey)', 10, 9, { baseColor: '#7a818c', hasScreen: false }),
      5: new WallTextureSection(5, 'South Wall (Right Screen)', 12, 9, { baseColor: '#5c6448', hasScreen: true }),
      6: new WallTextureSection(6, 'East Wall (Mid Section)', 10, 9, { baseColor: '#5c6448', hasScreen: false }),
      7: new WallTextureSection(7, 'East Wall (Lower / Booth)', 10, 9, { baseColor: '#5c6448', hasScreen: false }),
      8: new WallTextureSection(8, 'Center Island Column', 18, 9, { baseColor: '#475569', hasScreen: false }),
      9: new WallTextureSection(9, 'North Partition Fin', 8, 9, { baseColor: '#ffffff', hasScreen: false }),
      10: new WallTextureSection(10, 'West Partition Fin', 8, 9, { baseColor: '#ffffff', hasScreen: false }),
      11: new WallTextureSection(11, 'East Partition Fin', 8, 9, { baseColor: '#ffffff', hasScreen: false }),
      12: new WallTextureSection(12, 'South Entrance Vestibule', 8, 9, { baseColor: '#ffffff', hasScreen: false })
    };

    this.activeSectionId = 1;
  }

  getSection(id) {
    return this.sections[id];
  }

  getActiveSection() {
    return this.sections[this.activeSectionId];
  }

  setActiveSection(id) {
    if (this.sections[id]) {
      this.activeSectionId = id;
      this.onUpdate();
    }
  }

  serializeAll() {
    const result = {};
    for (const [id, section] of Object.entries(this.sections)) {
      result[id] = section.serialize();
    }
    return result;
  }

  async deserializeAll(data) {
    if (!data) return;
    for (const [id, sectionData] of Object.entries(data)) {
      if (this.sections[id]) {
        await this.sections[id].deserialize(sectionData);
      }
    }
    this.onUpdate();
  }
}
