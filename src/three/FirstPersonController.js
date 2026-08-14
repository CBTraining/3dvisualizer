import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

/**
 * First-Person Walk-Around Controller using WASD + Mouse PointerLock / Drag Look
 */
export class FirstPersonController {
  constructor(camera, domElement, scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    this.enabled = false;
    this.controls = new PointerLockControls(this.camera, this.domElement);

    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.eyeHeight = 5.2; // 5.2 ft human eye level

    // Boundary limits (room bounding box)
    this.bounds = {
      minX: -13.8,
      maxX: 13.8,
      minZ: -13.8,
      maxZ: 13.8
    };

    this.prevTime = performance.now();

    this.setupEvents();
  }

  setupEvents() {
    // Key listeners
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));

    // Pointer Lock change
    this.controls.addEventListener('lock', () => {
      if (this.onLockChange) this.onLockChange(true);
    });

    this.controls.addEventListener('unlock', () => {
      if (this.onLockChange) this.onLockChange(false);
    });
  }

  onKeyDown(e) {
    if (!this.enabled) return;

    // Prevent scrolling when using WASD / Arrow keys in Walk Mode
    if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    }

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isSprinting = true;
        break;
    }
  }

  onKeyUp(e) {
    if (!this.enabled) return;

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.moveForward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.moveLeft = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.moveBackward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.moveRight = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.isSprinting = false;
        break;
    }
  }

  enterWalkMode(spawnPos = null, lookAtTarget = null) {
    this.enabled = true;
    this.camera.position.set(
      spawnPos ? spawnPos.x : 0,
      this.eyeHeight,
      spawnPos ? spawnPos.z : 10.5
    );

    if (lookAtTarget) {
      this.camera.lookAt(lookAtTarget.x, this.eyeHeight, lookAtTarget.z);
    } else {
      this.camera.lookAt(0, this.eyeHeight, 0);
    }

    this.velocity.set(0, 0, 0);
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.isSprinting = false;
  }

  exitWalkMode() {
    this.enabled = false;
    if (this.controls.isLocked) {
      this.controls.unlock();
    }
  }

  requestLock() {
    if (this.enabled && !this.controls.isLocked) {
      this.controls.lock();
    }
  }

  update(time) {
    if (!this.enabled) return;

    const delta = (time - this.prevTime) / 1000;
    this.prevTime = time;

    // Apply friction/damping
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize(); // Ensure consistent speed in all directions

    const walkSpeed = this.isSprinting ? 28.0 : 16.0;

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * walkSpeed * delta;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * walkSpeed * delta;
    }

    // Move in first person
    this.controls.moveRight(-this.velocity.x * delta);
    this.controls.moveForward(-this.velocity.z * delta);

    // Keep camera at fixed eye level
    this.camera.position.y = this.eyeHeight;

    // Constrain within room bounds
    this.camera.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.camera.position.x));
    this.camera.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.camera.position.z));
  }
}
