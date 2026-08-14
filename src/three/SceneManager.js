import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomBuilder } from './RoomBuilder.js';
import { Lighting } from './Lighting.js';

/**
 * Scene Manager orchestrating camera, orbital controls, raycasting, and camera presets
 */
export class SceneManager {
  constructor(container, textureManager, onWallSelect) {
    this.container = container;
    this.textureManager = textureManager;
    this.onWallSelect = onWallSelect || (() => {});

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    // Setup Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
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
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.02;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 85;
    this.controls.target.copy(this.defaultTarget);

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

    this.bindEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this.pointerDownTime = Date.now();
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (Date.now() - this.pointerDownTime < 300 && dist < 5) {
        this.handleCanvasClick(e);
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

    this.animStartTarget.copy(this.controls.target);
    this.animEndTarget.copy(targetLookAt);
  }

  setView(preset) {
    const H = this.roomBuilder.params.wallHeight;

    switch (preset) {
      case 'overview':
        this.animateCameraTo(new THREE.Vector3(0, 36, 32), new THREE.Vector3(0, 4.5, 0));
        break;

      case 'topdown':
        // Direct top-down 2D floorplan view matching reference image
        this.animateCameraTo(new THREE.Vector3(0, 48, 0.01), new THREE.Vector3(0, 0, 0));
        break;

      case 'interior':
        // Step inside south entrance
        this.animateCameraTo(new THREE.Vector3(0, 5.2, 8), new THREE.Vector3(0, 5.2, -6));
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

    if (this.isAnimatingCamera) {
      const elapsed = time - this.animStartTime;
      const progress = Math.min(elapsed / this.animDuration, 1.0);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(this.animStartPos, this.animEndPos, ease);
      this.controls.target.lerpVectors(this.animStartTarget, this.animEndTarget, ease);

      if (progress >= 1.0) {
        this.isAnimatingCamera = false;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
