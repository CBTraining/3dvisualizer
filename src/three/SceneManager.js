import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomBuilder } from './RoomBuilder.js';
import { Lighting } from './Lighting.js';

/**
 * Main 3D Scene Manager orchestrating camera, controls, raycasting, and render loop
 */
export class SceneManager {
  constructor(container, textureManager, onWallSelect) {
    this.container = container;
    this.textureManager = textureManager;
    this.onWallSelect = onWallSelect || (() => {});

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    // Setup Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.defaultCameraPos = new THREE.Vector3(22, 18, 26);
    this.defaultTarget = new THREE.Vector3(0, 4.5, 0);
    this.camera.position.copy(this.defaultCameraPos);

    // Setup WebGL Renderer with High-DPI and soft shadows
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

    // Setup Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.02; // Prevent going below floor
    this.controls.minDistance = 3;
    this.controls.maxDistance = 65;
    this.controls.target.copy(this.defaultTarget);

    // Lighting & Room
    this.lighting = new Lighting(this.scene);
    this.roomBuilder = new RoomBuilder(this.scene, this.textureManager);

    // Raycasting for wall picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Camera animation state
    this.isAnimatingCamera = false;
    this.animStartTime = 0;
    this.animDuration = 800; // ms
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

    // Click on canvas to pick wall
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this.pointerDownTime = Date.now();
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      // Check if it was a click (not a drag)
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
    const intersects = this.raycaster.intersectObjects(wallMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const sectionId = hit.object.userData.sectionId;
      if (sectionId) {
        this.onWallSelect(sectionId);
      }
    }
  }

  /**
   * Smoothly animate camera to target position & lookAt
   */
  animateCameraTo(targetPos, targetLookAt, duration = 800) {
    this.isAnimatingCamera = true;
    this.animStartTime = performance.now();
    this.animDuration = duration;

    this.animStartPos.copy(this.camera.position);
    this.animEndPos.copy(targetPos);

    this.animStartTarget.copy(this.controls.target);
    this.animEndTarget.copy(targetLookAt);
  }

  // Camera Presets
  setView(preset) {
    const L = this.roomBuilder.params.wallLength;
    const H = this.roomBuilder.params.wallHeight;
    const R = this.roomBuilder.params.cornerRadius;
    const halfDepth = L / 2 + R;

    switch (preset) {
      case 'overview':
        this.animateCameraTo(new THREE.Vector3(22, 18, 26), new THREE.Vector3(0, H / 2, 0));
        break;

      case 'topdown':
        this.animateCameraTo(new THREE.Vector3(0, 34, 0.01), new THREE.Vector3(0, 0, 0));
        break;

      case 'interior':
        // Human eye-level inside room center
        this.animateCameraTo(new THREE.Vector3(0, 5.2, 2), new THREE.Vector3(0, 5.2, -halfDepth));
        break;

      case 'wall-1': // North
        this.animateCameraTo(new THREE.Vector3(0, H / 2, halfDepth - 2), new THREE.Vector3(0, H / 2, -halfDepth));
        break;

      case 'wall-2': // East
        this.animateCameraTo(new THREE.Vector3(-halfDepth + 2, H / 2, 0), new THREE.Vector3(halfDepth, H / 2, 0));
        break;

      case 'wall-3': // South
        this.animateCameraTo(new THREE.Vector3(0, H / 2, -halfDepth + 2), new THREE.Vector3(0, H / 2, halfDepth));
        break;

      case 'wall-4': // West
        this.animateCameraTo(new THREE.Vector3(halfDepth - 2, H / 2, 0), new THREE.Vector3(-halfDepth, H / 2, 0));
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
      // Cubic ease-out
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
