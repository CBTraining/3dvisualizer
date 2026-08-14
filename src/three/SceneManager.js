import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomBuilder } from './RoomBuilder.js';
import { Lighting } from './Lighting.js';
import { FirstPersonController } from './FirstPersonController.js';

/**
 * Scene Manager orchestrating Orbit controls, First-Person WASD Walk controls, raycasting, and camera presets
 */
export class SceneManager {
  constructor(container, textureManager, onWallSelect) {
    this.container = container;
    this.textureManager = textureManager;
    this.onWallSelect = onWallSelect || (() => {});

    this.currentMode = 'orbit'; // 'orbit' | 'walk'

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    // Setup Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      48,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      250
    );
    this.defaultCameraPos = new THREE.Vector3(0, 36, 32);
    this.defaultTarget = new THREE.Vector3(0, 4.5, 0);
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

    // Lighting & Custom Room
    this.lighting = new Lighting(this.scene);
    this.roomBuilder = new RoomBuilder(this.scene, this.textureManager);

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Camera animation
    this.isAnimatingCamera = false;
    this.animStartTime = 0;
    this.animDuration = 800;
    this.animStartPos = new THREE.Vector3();
    this.animEndPos = new THREE.Vector3();
    this.animStartTarget = new THREE.Vector3();
    this.animEndTarget = new THREE.Vector3();

    this.createWalkHud();
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

  animateCameraTo(targetPos, targetLookAt, duration = 800) {
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
      // Spawn just inside south entrance vestibule facing north into room center
      this.fpController.enterWalkMode(new THREE.Vector3(0, 5.2, 10.5), new THREE.Vector3(0, 5.2, 0));
      return;
    }

    // Switch back to orbit mode
    this.currentMode = 'orbit';
    this.fpController.exitWalkMode();
    this.orbitControls.enabled = true;
    this.hudEl.style.display = 'none';

    switch (preset) {
      case 'overview':
        this.animateCameraTo(new THREE.Vector3(0, 36, 32), new THREE.Vector3(0, 4.5, 0));
        break;

      case 'topdown':
        this.animateCameraTo(new THREE.Vector3(0, 48, 0.01), new THREE.Vector3(0, 0, 0));
        break;

      case 'wall-1': // North Wall
        this.animateCameraTo(new THREE.Vector3(0, H / 2, -2), new THREE.Vector3(0, H / 2, -13));
        break;

      case 'wall-2': // Upper West Wall
        this.animateCameraTo(new THREE.Vector3(-2, H / 2, -4.75), new THREE.Vector3(-13, H / 2, -4.75));
        break;

      case 'wall-3': // Lower West Wall
        this.animateCameraTo(new THREE.Vector3(-2, H / 2, 4.75), new THREE.Vector3(-13, H / 2, 4.75));
        break;

      case 'wall-4': // South Left
        this.animateCameraTo(new THREE.Vector3(-5.75, H / 2, 4), new THREE.Vector3(-5.75, H / 2, 13));
        break;

      case 'wall-5': // South Right
        this.animateCameraTo(new THREE.Vector3(7.4, H / 2, 4), new THREE.Vector3(7.4, H / 2, 13));
        break;

      case 'wall-6': // Mid East
        this.animateCameraTo(new THREE.Vector3(2, H / 2, -0.5), new THREE.Vector3(13, H / 2, -0.5));
        break;

      case 'wall-7': // SE Booth
        this.animateCameraTo(new THREE.Vector3(4, H / 2, 9.5), new THREE.Vector3(13, H / 2, 9.5));
        break;

      case 'wall-8': // Center Island
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
