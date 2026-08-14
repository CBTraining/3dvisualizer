import * as THREE from 'three';

/**
 * Sets up bright, realistic, natural interior and exterior studio lighting
 * with soft contact shadows and subtle environmental reflections.
 */
export class Lighting {
  constructor(scene) {
    this.scene = scene;
    this.lightsGroup = new THREE.Group();
    this.lightsGroup.name = 'LightingGroup';
    this.scene.add(this.lightsGroup);

    this.initLights();
  }

  initLights() {
    // 1. Bright balanced Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.lightsGroup.add(ambientLight);

    // 2. Hemispheric Sky/Ground Bounce Light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.9);
    hemiLight.position.set(0, 50, 0);
    this.lightsGroup.add(hemiLight);

    // 3. Primary Key Directional Sunlight (Casting soft shadows)
    const mainSun = new THREE.DirectionalLight(0xfffbf0, 1.8);
    mainSun.position.set(18, 30, 22);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 80;
    mainSun.shadow.bias = -0.0003;
    mainSun.shadow.radius = 3.5; // Soft blur

    const d = 20;
    mainSun.shadow.camera.left = -d;
    mainSun.shadow.camera.right = d;
    mainSun.shadow.camera.top = d;
    mainSun.shadow.camera.bottom = -d;
    this.lightsGroup.add(mainSun);

    // 4. Fill Directional Light (prevents harsh dark corners)
    const fillLight = new THREE.DirectionalLight(0xf0f7ff, 0.9);
    fillLight.position.set(-20, 25, -18);
    this.lightsGroup.add(fillLight);

    // 5. Warm interior center accent light
    const centerPoint = new THREE.PointLight(0xfffaed, 1.1, 35, 1.5);
    centerPoint.position.set(0, 8.5, 0);
    this.lightsGroup.add(centerPoint);

    // 6. Subtle wall wash spotlights for rich texture viewing
    const spotNW = new THREE.SpotLight(0xffffff, 0.6, 25, Math.PI / 4, 0.4);
    spotNW.position.set(0, 8.8, 0);
    spotNW.target.position.set(0, 4.5, -7.5);
    this.lightsGroup.add(spotNW);
    this.lightsGroup.add(spotNW.target);
  }

  setBrightness(multiplier = 1.0) {
    this.lightsGroup.traverse((child) => {
      if (child.isLight && child.userData.baseIntensity !== undefined) {
        child.intensity = child.userData.baseIntensity * multiplier;
      }
    });
  }
}
