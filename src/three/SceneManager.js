import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomBuilder } from './RoomBuilder.js';
import { Lighting } from './Lighting.js';
import { FirstPersonController } from './FirstPersonController.js';

/**
 * Scene Manager orchestrating Orbit controls, First-Person WASD Walk controls, 
 * 8-direction angled camera rotations, angle amount shortcuts (15°, 30°, 45°, 60°, 90° elevation),
 * collapsible non-conflicting compass widget, raycasting, and camera presets
 */
export class SceneManager {
  constructor(container, textureManager, onWallSelect) {
    this.container = container;
    this.textureManager = textureManager;
    this.onWallSelect = onWallSelect || (() => {});

    this.currentMode = 'orbit'; // 'orbit' | 'walk'
    this.currentHeadingIndex = 0; // 0 = S, 1 = SW, 2 = W, 3 = NW, 4 = N, 5 = NE, 6 = E, 7 = SE
    this.currentAngleDegrees = 0; // 0 to 360
    this.elevationAngle = 30; // degrees: 15, 30, 45, 60, 90
    this.rotationStepAmount = 45; // step size: 15°, 45°, 90°
    this.isCompassCollapsed = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    // Setup Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      48,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      250
    );
    this.defaultCameraPos = new THREE.Vector3(0, 19.5, 34);
    this.defaultTarget = new THREE.Vector3(0, 3.5, 0);
    this.camera.position.copy(this.defaultCameraPos);

    // High-DPI WebGL Renderer with soft shadow maps
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    // Orbit Controls
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.maxPolarAngle = Math.PI / 2 + 0.02;
    this.orbitControls.minDistance = 3;
    this.orbitControls.maxDistance = 85;
    this.orbitControls.target.copy(this.defaultTarget);

    // First Person Walk Controller
    this.fpController = new FirstPersonController(this.camera, this.renderer.domElement, this.scene);
    this.fpController.onLockChange = (isLocked) => {
      this.updateHudState(isLocked);
    };

    // Lighting & Room
    this.lighting = new Lighting(this.scene);
    this.roomBuilder = new RoomBuilder(this.scene, this.textureManager);

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Camera animation
    this.isAnimatingCamera = false;
    this.animStartTime = 0;
    this.animDuration = 650;
    this.animStartPos = new THREE.Vector3();
    this.animEndPos = new THREE.Vector3();
    this.animStartTarget = new THREE.Vector3();
    this.animEndTarget = new THREE.Vector3();

    this.createWalkHud();
    this.createCompassWidget();
    this.bindEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  createWalkHud() {
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'walk-hud';
    this.hudEl.style.display = 'none';
    this.hudEl.innerHTML = `
      <div class="walk-crosshair"></div>
      <div class="walk-hud-badge" id="walkHudBadge">
        <div class="hud-row">
          <span class="hud-pill">W A S D</span>
          <span>or <strong>Arrows</strong> to Walk</span>
          <span class="hud-pill">Mouse</span>
          <span>to Look</span>
          <span class="hud-pill">Shift</span>
          <span>Sprint</span>
        </div>
        <div class="hud-sub" id="walkHudSub">Click viewport to lock mouse for smooth 360° look • Esc to release cursor</div>
      </div>
    `;
    this.container.appendChild(this.hudEl);
  }

  createCompassWidget() {
    this.compassEl = document.createElement('div');
    this.compassEl.className = 'booth-compass-widget';
    this.compassEl.innerHTML = `
      <div class="compass-panel" id="compassPanel">
        <div class="compass-header">
          <div class="header-left">
            <span class="compass-title">BOOTH ROTATION</span>
            <span class="compass-deg-badge" id="compassDegBadge">0° (S)</span>
          </div>
          <div class="compass-header-actions">
            <div class="compass-step-btns">
              <button class="step-btn" id="btnRotateCCW" title="Rotate Left">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <button class="step-btn" id="btnRotateCW" title="Rotate Right">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
              </button>
            </div>
            <button class="step-btn minimize-btn" id="btnToggleCompass" title="Minimize / Expand Compass">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="compassMinIcon"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>

        <div class="compass-body" id="compassBody">
          <!-- 8 Cardinal & Intercardinal Direction Compass Grid -->
          <div class="compass-grid-8">
            <button class="dir-btn" data-dir="NW" data-deg="135" title="North-West (135°)">NW<span class="btn-subdeg">135°</span></button>
            <button class="dir-btn" data-dir="N" data-deg="180" title="North / Back (180°)">N<span class="btn-subdeg">180°</span></button>
            <button class="dir-btn" data-dir="NE" data-deg="225" title="North-East (225°)">NE<span class="btn-subdeg">225°</span></button>
            <button class="dir-btn" data-dir="W" data-deg="90" title="West / Left (90°)">W<span class="btn-subdeg">90°</span></button>
            <div class="compass-center-dial" id="compassCenterDial" title="Current View: South (0°)">0°</div>
            <button class="dir-btn" data-dir="E" data-deg="270" title="East / Right (270°)">E<span class="btn-subdeg">270°</span></button>
            <button class="dir-btn" data-dir="SW" data-deg="45" title="South-West (45°)">SW<span class="btn-subdeg">45°</span></button>
            <button class="dir-btn active" data-dir="S" data-deg="0" title="South / Front (0°)">S<span class="btn-subdeg">0°</span></button>
            <button class="dir-btn" data-dir="SE" data-deg="315" title="South-East (315°)">SE<span class="btn-subdeg">315°</span></button>
          </div>

          <!-- Angle Amount & Elevation Pitch Shortcuts -->
          <div class="angle-shortcuts-section">
            <div class="shortcut-row-label">CAMERA TILT / PITCH ANGLE</div>
            <div class="pitch-chips-row">
              <button class="pitch-chip" data-elev="15" title="Low Angle (15° Eye Level)">15°</button>
              <button class="pitch-chip active" data-elev="30" title="Balanced Angle (30° Wall + Floor)">30°</button>
              <button class="pitch-chip" data-elev="45" title="Isometric Angle (45° Diagonal)">45°</button>
              <button class="pitch-chip" data-elev="60" title="High Angle (60° Elevated)">60°</button>
            </div>

            <div class="shortcut-row-label" style="margin-top: 6px;">STEP INCREMENT</div>
            <div class="step-increment-row">
              <button class="step-inc-btn" data-step="15" title="Rotate by 15° per click">±15°</button>
              <button class="step-inc-btn active" data-step="45" title="Rotate by 45° per click">±45°</button>
              <button class="step-inc-btn" data-step="90" title="Rotate by 90° per click">±90°</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.compassEl);
    this.setupCompassEvents();
  }

  setupCompassEvents() {
    const root = this.compassEl;

    // Toggle minimize
    const btnToggle = root.querySelector('#btnToggleCompass');
    const body = root.querySelector('#compassBody');
    const minIcon = root.querySelector('#compassMinIcon');
    btnToggle.addEventListener('click', () => {
      this.isCompassCollapsed = !this.isCompassCollapsed;
      body.style.display = this.isCompassCollapsed ? 'none' : 'block';
      minIcon.innerHTML = this.isCompassCollapsed
        ? '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
        : '<line x1="5" y1="12" x2="19" y2="12"/>';
    });

    // 8 Direction buttons
    root.querySelectorAll('.dir-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const deg = parseInt(btn.dataset.deg, 10);
        this.rotateToHeadingDegrees(deg);
      });
    });

    // Step rotation buttons
    root.querySelector('#btnRotateCCW').addEventListener('click', () => {
      this.rotateStep(-this.rotationStepAmount);
    });

    root.querySelector('#btnRotateCW').addEventListener('click', () => {
      this.rotateStep(this.rotationStepAmount);
    });

    // Elevation pitch angle chips (15°, 30°, 45°, 60°)
    root.querySelectorAll('.pitch-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        root.querySelectorAll('.pitch-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.elevationAngle = parseInt(chip.dataset.elev, 10);
        this.applyCurrentRotation();
      });
    });

    // Step increment amount buttons (15°, 45°, 90°)
    root.querySelectorAll('.step-inc-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.step-inc-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.rotationStepAmount = parseInt(btn.dataset.step, 10);
      });
    });
  }

  updateCompassActive(deg) {
    if (!this.compassEl) return;
    const normalizedDeg = ((deg % 360) + 360) % 360;

    const dirMap = {
      0: 'S', 45: 'SW', 90: 'W', 135: 'NW', 180: 'N', 225: 'NE', 270: 'E', 315: 'SE'
    };
    const closest45 = Math.round(normalizedDeg / 45) * 45 % 360;
    const dirName = dirMap[closest45] || `${normalizedDeg}°`;

    this.compassEl.querySelectorAll('.dir-btn').forEach((btn) => {
      const btnDeg = parseInt(btn.dataset.deg, 10);
      btn.classList.toggle('active', btnDeg === closest45);
    });

    const dial = this.compassEl.querySelector('#compassCenterDial');
    if (dial) {
      dial.textContent = `${normalizedDeg}°`;
      dial.title = `Current View: ${dirName} (${normalizedDeg}°)`;
    }

    const badge = this.compassEl.querySelector('#compassDegBadge');
    if (badge) {
      badge.textContent = `${normalizedDeg}° (${dirName})`;
    }
  }

  rotateToHeadingDegrees(deg) {
    this.currentAngleDegrees = ((deg % 360) + 360) % 360;
    this.applyCurrentRotation();
  }

  rotateStep(deltaDeg) {
    this.currentAngleDegrees = ((this.currentAngleDegrees + deltaDeg) % 360 + 360) % 360;
    this.applyCurrentRotation();
  }

  applyCurrentRotation() {
    if (this.currentMode === 'walk') {
      this.setView('overview');
    }

    const deg = this.currentAngleDegrees;
    this.updateCompassActive(deg);

    const rad = deg * (Math.PI / 180);
    const elevRad = this.elevationAngle * (Math.PI / 180);

    const totalDist = 38.0;
    const groundDist = totalDist * Math.cos(elevRad);
    const cameraHeight = Math.max(4.0, totalDist * Math.sin(elevRad));

    const camX = Math.sin(rad) * -groundDist;
    const camZ = Math.cos(rad) * groundDist;

    const targetCameraPos = new THREE.Vector3(camX, cameraHeight, camZ);
    const lookAtTarget = new THREE.Vector3(0, 3.5, 0);

    this.animateCameraTo(targetCameraPos, lookAtTarget, 650);
  }

  updateHudState(isLocked) {
    const sub = this.hudEl.querySelector('#walkHudSub');
    if (sub) {
      if (isLocked) {
        sub.innerHTML = `Mouse locked • Move mouse to look around • <strong>Esc</strong> to unlock cursor`;
      } else {
        sub.innerHTML = `Click viewport to lock mouse for smooth 360° look • <strong>Esc</strong> to release cursor`;
      }
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this.pointerDownTime = Date.now();
      this.pointerDownPos = { x: e.clientX, y: e.clientY };

      if (this.currentMode === 'walk') {
        this.fpController.requestLock();
      }
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (this.currentMode === 'orbit') {
        const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
        if (Date.now() - this.pointerDownTime < 300 && dist < 5) {
          this.handleCanvasClick(e);
        }
      }
    });
  }

  onResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  handleCanvasClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const wallMeshes = Object.values(this.roomBuilder.wallMeshes);
    const intersects = this.raycaster.intersectObjects(wallMeshes, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj && !obj.userData.sectionId && obj.parent) {
        obj = obj.parent;
      }
      if (obj && obj.userData.sectionId) {
        this.onWallSelect(obj.userData.sectionId);
      }
    }
  }

  animateCameraTo(targetPos, targetLookAt, duration = 650) {
    this.isAnimatingCamera = true;
    this.animStartTime = performance.now();
    this.animDuration = duration;

    this.animStartPos.copy(this.camera.position);
    this.animEndPos.copy(targetPos);

    this.animStartTarget.copy(this.orbitControls.target);
    this.animEndTarget.copy(targetLookAt);
  }

  setView(preset) {
    const H = this.roomBuilder.params.wallHeight;

    if (preset === 'walk' || preset === 'interior') {
      this.currentMode = 'walk';
      this.orbitControls.enabled = false;
      this.hudEl.style.display = 'block';
      if (this.compassEl) this.compassEl.style.display = 'none';
      this.fpController.enterWalkMode(new THREE.Vector3(0, 5.2, 10.5), new THREE.Vector3(0, 5.2, 0));
      return;
    }

    // Switch back to orbit mode
    this.currentMode = 'orbit';
    this.fpController.exitWalkMode();
    this.orbitControls.enabled = true;
    this.hudEl.style.display = 'none';
    if (this.compassEl) this.compassEl.style.display = 'block';

    switch (preset) {
      case 'overview':
        this.rotateToHeadingDegrees(0);
        break;

      case 'topdown':
        this.animateCameraTo(new THREE.Vector3(0, 48, 0.01), new THREE.Vector3(0, 0, 0));
        break;

      case 'wall-1': // NW Room Corner Wall
        this.animateCameraTo(new THREE.Vector3(-4, 5.2, -4), new THREE.Vector3(-12, 4.5, -12));
        break;

      case 'wall-2': // NE Room Corner Wall
        this.animateCameraTo(new THREE.Vector3(4, 5.2, -4), new THREE.Vector3(12, 4.5, -12));
        break;

      case 'wall-3': // SW Room Corner Wall
        this.animateCameraTo(new THREE.Vector3(-4, 5.2, 4), new THREE.Vector3(-12, 4.5, 12));
        break;

      case 'wall-4': // SE Room Wall
        this.animateCameraTo(new THREE.Vector3(4, 5.2, 4), new THREE.Vector3(12, 4.5, 12));
        break;

      case 'wall-5': // Centerpiece Island
        this.animateCameraTo(new THREE.Vector3(0, 6, 9), new THREE.Vector3(0, 4.5, 0));
        break;

      default:
        this.animateCameraTo(this.defaultCameraPos, this.defaultTarget);
    }
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    if (this.currentMode === 'walk') {
      this.fpController.update(time);
    } else {
      if (this.isAnimatingCamera) {
        const elapsed = time - this.animStartTime;
        const progress = Math.min(elapsed / this.animDuration, 1.0);
        const ease = 1 - Math.pow(1 - progress, 3);

        this.camera.position.lerpVectors(this.animStartPos, this.animEndPos, ease);
        this.orbitControls.target.lerpVectors(this.animStartTarget, this.animEndTarget, ease);

        if (progress >= 1.0) {
          this.isAnimatingCamera = false;
        }
      }
      this.orbitControls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
