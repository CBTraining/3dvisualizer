import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomBuilder } from './RoomBuilder.js';
import { Lighting } from './Lighting.js';
import { FirstPersonController } from './FirstPersonController.js';

/**
 * Scene Manager orchestrating Orbit controls, First-Person WASD Walk controls, 
 * 8-direction angled camera rotations, raycasting, and camera presets
 */
export class SceneManager {
  constructor(container, textureManager, onWallSelect) {
    this.container = container;
    this.textureManager = textureManager;
    this.onWallSelect = onWallSelect || (() => {});

    this.currentMode = 'orbit'; // 'orbit' | 'walk'
    this.currentHeadingIndex = 0; // 0 = S, 1 = SW, 2 = W, 3 = NW, 4 = N, 5 = NE, 6 = E, 7 = SE
    this.elevationAngle = 30; // degrees above ground (keeps wall and floor clearly visible)

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    // Setup Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      48,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      250
    );
    this.defaultCameraPos = new THREE.Vector3(0, 20, 34);
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
    this.animDuration = 700;
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
      <div class="compass-panel">
        <div class="compass-header">
          <span class="compass-title">8-WAY BOOTH ROTATION</span>
          <div class="compass-step-btns">
            <button class="step-btn" id="btnRotateCCW" title="Rotate Left 45° (Counter-Clockwise)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button class="step-btn" id="btnRotateCW" title="Rotate Right 45° (Clockwise)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            </button>
          </div>
        </div>

        <!-- 8 Cardinal & Intercardinal Direction Buttons -->
        <div class="compass-grid-8">
          <button class="dir-btn" data-dir="NW" title="North-West (Angled View)">NW</button>
          <button class="dir-btn" data-dir="N" title="North / Back (Angled View)">N</button>
          <button class="dir-btn" data-dir="NE" title="North-East (Angled View)">NE</button>
          <button class="dir-btn" data-dir="W" title="West / Left (Angled View)">W</button>
          <div class="compass-center-dial" id="compassCenterDial" title="Current View: South (Front)">S</div>
          <button class="dir-btn" data-dir="E" title="East / Right (Angled View)">E</button>
          <button class="dir-btn" data-dir="SW" title="South-West (Angled View)">SW</button>
          <button class="dir-btn active" data-dir="S" title="South / Front (Angled View)">S</button>
          <button class="dir-btn" data-dir="SE" title="South-East (Angled View)">SE</button>
        </div>
      </div>
    `;

    this.container.appendChild(this.compassEl);
    this.setupCompassEvents();
  }

  setupCompassEvents() {
    const root = this.compassEl;

    // 8 Direction buttons
    root.querySelectorAll('.dir-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.rotateToDirection(btn.dataset.dir);
      });
    });

    // Step rotation buttons
    root.querySelector('#btnRotateCCW').addEventListener('click', () => {
      this.rotateStep(-1);
    });

    root.querySelector('#btnRotateCW').addEventListener('click', () => {
      this.rotateStep(1);
    });
  }

  updateCompassActive(dirKey) {
    if (!this.compassEl) return;
    this.compassEl.querySelectorAll('.dir-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.dir === dirKey);
    });
    const dial = this.compassEl.querySelector('#compassCenterDial');
    if (dial) {
      dial.textContent = dirKey;
      dial.title = `Current View: ${dirKey}`;
    }
  }

  /**
   * Rotate to one of the 8 directions at an angled perspective showing wall + floor
   */
  rotateToDirection(dirKey) {
    const directions = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
    const idx = directions.indexOf(dirKey);
    if (idx !== -1) {
      this.currentHeadingIndex = idx;
      this.apply8WayRotation(idx);
    }
  }

  /**
   * Rotate in 45° increments (step = +1 for CW, -1 for CCW)
   */
  rotateStep(step) {
    this.currentHeadingIndex = (this.currentHeadingIndex + step + 8) % 8;
    this.apply8WayRotation(this.currentHeadingIndex);
  }

  apply8WayRotation(idx) {
    // Switch to orbit mode if in walk mode
    if (this.currentMode === 'walk') {
      this.setView('overview');
    }

    const directions = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
    const dirKey = directions[idx];
    this.updateCompassActive(dirKey);

    // Angle in radians (0 is South looking North, +PI/4 is SW, etc.)
    const angleRad = idx * (Math.PI / 4);

    const distRadius = 34.0; // Distance from center
    const cameraHeight = 19.5; // Elevated angle so floor and walls are clearly visible together
    const lookAtTarget = new THREE.Vector3(0, 3.5, 0);

    const camX = Math.sin(angleRad) * -distRadius;
    const camZ = Math.cos(angleRad) * distRadius;

    const targetCameraPos = new THREE.Vector3(camX, cameraHeight, camZ);
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

  animateCameraTo(targetPos, targetLookAt, duration = 700) {
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
        this.rotateToDirection('S');
        break;

      case 'topdown':
        this.animateCameraTo(new THREE.Vector3(0, 48, 0.01), new THREE.Vector3(0, 0, 0));
        break;

      case 'wall-1':
        this.animateCameraTo(new THREE.Vector3(0, H / 2, -2), new THREE.Vector3(0, H / 2, -13.5));
        break;

      case 'wall-2':
        this.animateCameraTo(new THREE.Vector3(-2, H / 2, -4.75), new THREE.Vector3(-13.5, H / 2, -4.75));
        break;

      case 'wall-3':
        this.animateCameraTo(new THREE.Vector3(-2, H / 2, 4.75), new THREE.Vector3(-13.5, H / 2, 4.75));
        break;

      case 'wall-4':
        this.animateCameraTo(new THREE.Vector3(1.75, H / 2, 4), new THREE.Vector3(1.75, H / 2, 13.5));
        break;

      case 'wall-5':
        this.animateCameraTo(new THREE.Vector3(2, H / 2, -0.5), new THREE.Vector3(13.5, H / 2, -0.5));
        break;

      case 'wall-6':
        this.animateCameraTo(new THREE.Vector3(4, H / 2, 9.75), new THREE.Vector3(13.5, H / 2, 9.75));
        break;

      case 'wall-7':
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
