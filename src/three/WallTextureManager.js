import * as THREE from 'three';

/**
 * Manages 2D high-resolution canvas textures for each architectural room section.
 * Supports scale, offset, rotation, opacity, fit modes, and horizontal/vertical flip.
 */
export class WallTextureSection {
  constructor(id, name, widthFt, heightFt, isCenterpiece = false) {
    this.id = id;
    this.name = name;
    this.widthFt = widthFt;
    this.heightFt = heightFt;
    this.isCenterpiece = isCenterpiece;

    const aspect = this.widthFt / this.heightFt;
    this.canvasWidth = 2048;
    this.canvasHeight = Math.max(512, Math.round(2048 / aspect));

    // Default base color: Architectural Grey (#717882) for ALL interior surfaces
    this.baseColor = '#717882';

    this.image = null;
    this.imageDataUrl = null;
    this.imageTransform = {
      scale: 1.0,
      offsetX: 0.0,
      offsetY: 0.0,
      rotation: 0,
      opacity: 1.0,
      fitMode: 'fill', // 'fit', 'fill', 'stretch', 'tile'
      flipX: false,
      flipY: false,
      frameWidth: 0
    };

    this.drawingStrokes = [];
    this.undoStack = [];

    this.initCanvas();
  }

  initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = true;

    this.renderComposite();
  }

  setBaseColor(hexColor) {
    this.baseColor = hexColor;
    this.renderComposite();
  }

  setImage(img, dataUrl = null) {
    this.image = img;
    if (dataUrl) this.imageDataUrl = dataUrl;
    this.renderComposite();
  }

  clearImage() {
    this.image = null;
    this.imageDataUrl = null;
    this.renderComposite();
  }

  setImageTransform(newParams) {
    Object.assign(this.imageTransform, newParams);
    this.renderComposite();
  }

  addStroke(stroke) {
    this.drawingStrokes.push(stroke);
    this.undoStack = [];
    this.renderComposite();
  }

  undo() {
    if (this.drawingStrokes.length > 0) {
      this.undoStack.push(this.drawingStrokes.pop());
      this.renderComposite();
    }
  }

  redo() {
    if (this.undoStack.length > 0) {
      this.drawingStrokes.push(this.undoStack.pop());
      this.renderComposite();
    }
  }

  clearDrawing() {
    this.drawingStrokes = [];
    this.undoStack = [];
    this.renderComposite();
  }

  renderComposite() {
    const { ctx, canvasWidth: W, canvasHeight: H } = this;
    ctx.clearRect(0, 0, W, H);

    // 1. Base Wall Color
    ctx.fillStyle = this.baseColor;
    ctx.fillRect(0, 0, W, H);

    // 2. Render Image Artwork Layer
    if (this.image) {
      ctx.save();
      ctx.globalAlpha = this.imageTransform.opacity;

      const imgW = this.image.naturalWidth || this.image.width;
      const imgH = this.image.naturalHeight || this.image.height;
      const fitMode = this.imageTransform.fitMode;

      let drawW, drawH, drawX, drawY;

      if (fitMode === 'stretch') {
        drawW = W * this.imageTransform.scale;
        drawH = H * this.imageTransform.scale;
        drawX = (W - drawW) / 2 + this.imageTransform.offsetX * W;
        drawY = (H - drawH) / 2 + this.imageTransform.offsetY * H;
      } else if (fitMode === 'fill') {
        const scaleFactor = Math.max(W / imgW, H / imgH) * this.imageTransform.scale;
        drawW = imgW * scaleFactor;
        drawH = imgH * scaleFactor;
        drawX = (W - drawW) / 2 + this.imageTransform.offsetX * W;
        drawY = (H - drawH) / 2 + this.imageTransform.offsetY * H;
      } else if (fitMode === 'tile') {
        const tileScale = this.imageTransform.scale * 0.4;
        const pattern = ctx.createPattern(this.image, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, W, H);
      } else {
        // 'fit' mode
        const scaleFactor = Math.min(W / imgW, H / imgH) * this.imageTransform.scale;
        drawW = imgW * scaleFactor;
        drawH = imgH * scaleFactor;
        drawX = (W - drawW) / 2 + this.imageTransform.offsetX * W;
        drawY = (H - drawH) / 2 + this.imageTransform.offsetY * H;
      }

      if (fitMode !== 'tile') {
        ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
        
        // Flip Horizontal / Vertical
        ctx.scale(this.imageTransform.flipX ? -1 : 1, this.imageTransform.flipY ? -1 : 1);

        if (this.imageTransform.rotation !== 0) {
          ctx.rotate((this.imageTransform.rotation * Math.PI) / 180);
        }

        // Picture Frame Border
        if (this.imageTransform.frameWidth > 0) {
          const fw = this.imageTransform.frameWidth;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-drawW / 2 - fw, -drawH / 2 - fw, drawW + fw * 2, drawH + fw * 2);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.strokeRect(-drawW / 2 - fw, -drawH / 2 - fw, drawW + fw * 2, drawH + fw * 2);
        }

        ctx.drawImage(this.image, -drawW / 2, -drawH / 2, drawW, drawH);
      }

      ctx.restore();
    }

    // 3. Render Direct 2D Concept Drawing Layer
    if (this.drawingStrokes.length > 0) {
      for (const stroke of this.drawingStrokes) {
        this.drawSingleStroke(ctx, stroke);
      }
    }

    this.texture.needsUpdate = true;
  }

  drawSingleStroke(ctx, stroke) {
    ctx.save();
    if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = stroke.size * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    if (stroke.tool === 'pen' || stroke.tool === 'highlighter' || stroke.tool === 'eraser') {
      if (stroke.points && stroke.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    } else if (stroke.tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(stroke.start.x, stroke.start.y);
      ctx.lineTo(stroke.end.x, stroke.end.y);
      ctx.stroke();
    } else if (stroke.tool === 'rectangle') {
      const x = Math.min(stroke.start.x, stroke.end.x);
      const y = Math.min(stroke.start.y, stroke.end.y);
      const w = Math.abs(stroke.end.x - stroke.start.x);
      const h = Math.abs(stroke.end.y - stroke.start.y);
      if (stroke.filled) {
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.strokeRect(x, y, w, h);
      }
    } else if (stroke.tool === 'circle') {
      const rx = Math.abs(stroke.end.x - stroke.start.x) / 2;
      const ry = Math.abs(stroke.end.y - stroke.start.y) / 2;
      const cx = Math.min(stroke.start.x, stroke.end.x) + rx;
      const cy = Math.min(stroke.start.y, stroke.end.y) + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (stroke.filled) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    } else if (stroke.tool === 'text') {
      ctx.font = `600 ${stroke.fontSize || 32}px "Inter", sans-serif`;
      ctx.fillStyle = stroke.color;
      ctx.fillText(stroke.text, stroke.x, stroke.y);
    }

    ctx.restore();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      baseColor: this.baseColor,
      imageDataUrl: this.imageDataUrl,
      imageTransform: this.imageTransform,
      drawingStrokes: this.drawingStrokes
    };
  }

  async fromJSON(data) {
    if (!data) return;
    this.baseColor = data.baseColor || this.baseColor;
    if (data.imageTransform) this.imageTransform = { ...this.imageTransform, ...data.imageTransform };
    this.drawingStrokes = data.drawingStrokes || [];

    if (data.imageDataUrl) {
      this.imageDataUrl = data.imageDataUrl;
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = () => {
          this.image = img;
          resolve();
        };
        img.onerror = resolve;
        img.src = data.imageDataUrl;
      });
    } else {
      this.image = null;
      this.imageDataUrl = null;
    }

    this.renderComposite();
  }
}

/**
 * Manages all room quadrant wall sections & interior features
 */
export class WallTextureManager {
  constructor(onTextureUpdate) {
    this.onTextureUpdate = onTextureUpdate || (() => {});

    this.sections = {
      1: new WallTextureSection(1, 'North-West Room Wall (Corner 1)', 24.25, 9.0),
      2: new WallTextureSection(2, 'North-East Room Wall (Corner 2)', 14.20, 9.0),
      3: new WallTextureSection(3, 'South-West Room Wall (Corner 3)', 22.25, 9.0),
      4: new WallTextureSection(4, 'South-East Room Wall (Sharp Corner 4)', 28.20, 9.0),
      5: new WallTextureSection(5, 'Centerpiece Island Column', 18.00, 9.0, true),
      6: new WallTextureSection(6, 'North Partition Fin', 7.30, 9.0),
      7: new WallTextureSection(7, 'West Partition Fin', 7.30, 9.0),
      8: new WallTextureSection(8, 'East Partition Fin', 9.00, 9.0),
      9: new WallTextureSection(9, 'South Entrance Vestibule', 6.30, 9.0)
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
      this.onTextureUpdate();
    }
  }

  serializeAll() {
    const result = {};
    for (const [id, sec] of Object.entries(this.sections)) {
      result[id] = sec.toJSON();
    }
    return result;
  }

  async deserializeAll(data) {
    if (!data) return;
    for (const [id, secData] of Object.entries(data)) {
      if (this.sections[id]) {
        await this.sections[id].fromJSON(secData);
      }
    }
    this.onTextureUpdate();
  }
}
