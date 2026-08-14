import * as THREE from 'three';

/**
 * Builds the 3D Room with a Rounded Rectangle floorplan, 4 distinct 15ft wall sections,
 * smooth rounded corner transitions, realistic baseboards, floor, and optional ceiling.
 */
export class RoomBuilder {
  constructor(scene, wallTextureManager) {
    this.scene = scene;
    this.textureManager = wallTextureManager;

    // Room parameters (in feet, 1 unit = 1 ft)
    this.params = {
      wallLength: 15,    // 15ft per section
      wallHeight: 9,     // 9ft ceiling height
      cornerRadius: 2.5, // 2.5ft smooth corner radius
      wallThickness: 0.5,
      showCeiling: false,
      showDimensions: true,
      floorMaterialType: 'light-wood', // 'light-wood', 'warm-oak', 'modern-tile', 'concrete'
      wallBaseColor: '#f7f6f2'
    };

    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'RoomGroup';
    this.scene.add(this.roomGroup);

    // Meshes references
    this.wallMeshes = {};     // { 1: mesh, 2: mesh, 3: mesh, 4: mesh }
    this.cornerMeshes = [];
    this.floorMesh = null;
    this.ceilingMesh = null;
    this.baseboardsGroup = null;
    this.dimensionMarkersGroup = null;

    // Shared materials
    this.cornerMaterial = new THREE.MeshStandardMaterial({
      color: 0xf7f6f2,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.outerWallMaterial = new THREE.MeshStandardMaterial({
      color: 0xdedcd6,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.floorMaterial = this.createFloorMaterial(this.params.floorMaterialType);
    this.ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbfbf9,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.BackSide
    });

    this.baseboardMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.1
    });

    this.build();
  }

  createFloorMaterial(type) {
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 1024;
    floorCanvas.height = 1024;
    const ctx = floorCanvas.getContext('2d');

    if (type === 'light-wood' || type === 'warm-oak') {
      // Procedural light wood planks
      const baseTone = type === 'light-wood' ? '#dfd6c8' : '#c8a882';
      ctx.fillStyle = baseTone;
      ctx.fillRect(0, 0, 1024, 1024);

      const plankHeight = 64;
      for (let y = 0; y < 1024; y += plankHeight) {
        ctx.fillStyle = type === 'light-wood' ? '#d8cebf' : '#bf9e77';
        if ((y / plankHeight) % 2 === 0) {
          ctx.fillRect(0, y, 1024, plankHeight);
        }

        // Plank joint lines
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();

        // Vertical staggered joints
        const offset = ((y / plankHeight) % 3) * 256;
        for (let x = offset; x < 1024; x += 384) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + plankHeight);
          ctx.stroke();
        }

        // Subtle wood grain lines
        ctx.strokeStyle = 'rgba(0,0,0,0.03)';
        ctx.lineWidth = 1;
        for (let g = 0; g < 4; g++) {
          ctx.beginPath();
          ctx.moveTo(0, y + (g * 16) + 4);
          ctx.bezierCurveTo(300, y + (g * 16) + 2, 700, y + (g * 16) + 6, 1024, y + (g * 16) + 4);
          ctx.stroke();
        }
      }
    } else if (type === 'modern-tile') {
      // Modern large porcelain tiles
      ctx.fillStyle = '#eae7e1';
      ctx.fillRect(0, 0, 1024, 1024);
      const tileSize = 256;
      ctx.strokeStyle = '#c5c2bb';
      ctx.lineWidth = 4;
      for (let i = 0; i <= 1024; i += tileSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 1024);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(1024, i);
        ctx.stroke();
      }
    } else {
      // Polished concrete
      ctx.fillStyle = '#d3d3d0';
      ctx.fillRect(0, 0, 1024, 1024);
      // Subtle noise
      for (let i = 0; i < 5000; i++) {
        const nx = Math.random() * 1024;
        const ny = Math.random() * 1024;
        const radius = Math.random() * 2 + 0.5;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(floorCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: type.includes('wood') ? 0.35 : 0.25,
      metalness: 0.08,
      side: THREE.DoubleSide
    });
  }

  setFloorMaterial(type) {
    this.params.floorMaterialType = type;
    this.floorMaterial = this.createFloorMaterial(type);
    if (this.floorMesh) {
      this.floorMesh.material = this.floorMaterial;
    }
  }

  build() {
    // Clear existing meshes
    while (this.roomGroup.children.length > 0) {
      const obj = this.roomGroup.children[0];
      this.roomGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    this.wallMeshes = {};
    this.cornerMeshes = [];

    const { wallLength: L, wallHeight: H, cornerRadius: R, wallThickness: T } = this.params;
    const halfL = L / 2;
    const halfDepth = halfL + R;
    const halfWidth = halfL + R;

    // -------------------------------------------------------------
    // 1. FLOOR (Rounded Rectangle Shape)
    // -------------------------------------------------------------
    const floorShape = new THREE.Shape();
    floorShape.moveTo(-halfL, halfDepth);
    floorShape.lineTo(halfL, halfDepth);
    floorShape.absarc(halfL, halfL, R, Math.PI / 2, 0, true);
    floorShape.lineTo(halfWidth, -halfL);
    floorShape.absarc(halfL, -halfL, R, 0, -Math.PI / 2, true);
    floorShape.lineTo(-halfL, -halfDepth);
    floorShape.absarc(-halfL, -halfL, R, -Math.PI / 2, -Math.PI, true);
    floorShape.lineTo(-halfWidth, halfL);
    floorShape.absarc(-halfL, halfL, R, Math.PI, Math.PI / 2, true);

    const floorGeometry = new THREE.ShapeGeometry(floorShape, 32);
    this.floorMesh = new THREE.Mesh(floorGeometry, this.floorMaterial);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = 0;
    this.floorMesh.receiveShadow = true;
    this.floorMesh.name = 'FloorMesh';
    this.roomGroup.add(this.floorMesh);

    // Subtle Ground Shadow Plane underneath
    const shadowGeo = new THREE.PlaneGeometry((halfWidth + 4) * 2, (halfDepth + 4) * 2);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.15 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.01;
    shadowPlane.receiveShadow = true;
    this.roomGroup.add(shadowPlane);

    // -------------------------------------------------------------
    // 2. 4 INTERIOR STRAIGHT WALL SECTIONS (15ft each)
    // -------------------------------------------------------------
    const wallPlaneGeo = new THREE.PlaneGeometry(L, H);

    // Wall 1: North Wall (facing south, normal +Z)
    const wall1Mat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(1).texture,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.FrontSide
    });
    const wall1 = new THREE.Mesh(wallPlaneGeo, wall1Mat);
    wall1.position.set(0, H / 2, -halfDepth);
    wall1.receiveShadow = true;
    wall1.castShadow = false;
    wall1.userData = { sectionId: 1, name: 'Wall 1 (North)' };
    this.roomGroup.add(wall1);
    this.wallMeshes[1] = wall1;

    // Wall 2: East Wall (facing west, normal -X)
    const wall2Mat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(2).texture,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.FrontSide
    });
    const wall2 = new THREE.Mesh(wallPlaneGeo, wall2Mat);
    wall2.rotation.y = -Math.PI / 2;
    wall2.position.set(halfWidth, H / 2, 0);
    wall2.receiveShadow = true;
    wall2.userData = { sectionId: 2, name: 'Wall 2 (East)' };
    this.roomGroup.add(wall2);
    this.wallMeshes[2] = wall2;

    // Wall 3: South Wall (facing north, normal -Z)
    const wall3Mat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(3).texture,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.FrontSide
    });
    const wall3 = new THREE.Mesh(wallPlaneGeo, wall3Mat);
    wall3.rotation.y = Math.PI;
    wall3.position.set(0, H / 2, halfDepth);
    wall3.receiveShadow = true;
    wall3.userData = { sectionId: 3, name: 'Wall 3 (South)' };
    this.roomGroup.add(wall3);
    this.wallMeshes[3] = wall3;

    // Wall 4: West Wall (facing east, normal +X)
    const wall4Mat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(4).texture,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.FrontSide
    });
    const wall4 = new THREE.Mesh(wallPlaneGeo, wall4Mat);
    wall4.rotation.y = Math.PI / 2;
    wall4.position.set(-halfWidth, H / 2, 0);
    wall4.receiveShadow = true;
    wall4.userData = { sectionId: 4, name: 'Wall 4 (West)' };
    this.roomGroup.add(wall4);
    this.wallMeshes[4] = wall4;

    // -------------------------------------------------------------
    // 3. 4 ROUNDED CORNER SECTIONS
    // -------------------------------------------------------------
    // Quarter cylinder curved meshes
    const cornerCylinderGeo = new THREE.CylinderGeometry(
      R, R, H, 24, 1, true, 0, Math.PI / 2
    );

    // Northeast Corner (+X, -Z)
    const cornerNE = new THREE.Mesh(cornerCylinderGeo, this.cornerMaterial);
    cornerNE.position.set(halfL, H / 2, -halfL);
    cornerNE.rotation.y = Math.PI;
    cornerNE.scale.set(-1, 1, 1); // Flip normal to point inward
    this.roomGroup.add(cornerNE);
    this.cornerMeshes.push(cornerNE);

    // Southeast Corner (+X, +Z)
    const cornerSE = new THREE.Mesh(cornerCylinderGeo, this.cornerMaterial);
    cornerSE.position.set(halfL, H / 2, halfL);
    cornerSE.rotation.y = -Math.PI / 2;
    cornerSE.scale.set(-1, 1, 1);
    this.roomGroup.add(cornerSE);
    this.cornerMeshes.push(cornerSE);

    // Southwest Corner (-X, +Z)
    const cornerSW = new THREE.Mesh(cornerCylinderGeo, this.cornerMaterial);
    cornerSW.position.set(-halfL, H / 2, halfL);
    cornerSW.rotation.y = 0;
    cornerSW.scale.set(-1, 1, 1);
    this.roomGroup.add(cornerSW);
    this.cornerMeshes.push(cornerSW);

    // Northwest Corner (-X, -Z)
    const cornerNW = new THREE.Mesh(cornerCylinderGeo, this.cornerMaterial);
    cornerNW.position.set(-halfL, H / 2, -halfL);
    cornerNW.rotation.y = Math.PI / 2;
    cornerNW.scale.set(-1, 1, 1);
    this.roomGroup.add(cornerNW);
    this.cornerMeshes.push(cornerNW);

    // -------------------------------------------------------------
    // 4. EXTERIOR WALL CASING (Thickness)
    // -------------------------------------------------------------
    this.buildExteriorWalls(halfL, halfWidth, halfDepth, H, R, T);

    // -------------------------------------------------------------
    // 5. BASEBOARDS (Skirting board along perimeter)
    // -------------------------------------------------------------
    this.buildBaseboards(halfL, halfWidth, halfDepth, R);

    // -------------------------------------------------------------
    // 6. CEILING (Optional)
    // -------------------------------------------------------------
    if (this.params.showCeiling) {
      const ceilingGeometry = new THREE.ShapeGeometry(floorShape, 32);
      this.ceilingMesh = new THREE.Mesh(ceilingGeometry, this.ceilingMaterial);
      this.ceilingMesh.rotation.x = Math.PI / 2;
      this.ceilingMesh.position.y = H;
      this.roomGroup.add(this.ceilingMesh);
    }

    // -------------------------------------------------------------
    // 7. DIMENSION MARKERS & SECTION LABELS
    // -------------------------------------------------------------
    if (this.params.showDimensions) {
      this.buildDimensionMarkers(halfL, halfWidth, halfDepth, H);
    }
  }

  buildExteriorWalls(halfL, halfWidth, halfDepth, H, R, T) {
    const extGroup = new THREE.Group();
    extGroup.name = 'ExteriorWalls';

    const extL = this.params.wallLength;
    const extThicknessGeo = new THREE.BoxGeometry(extL, H, T);

    // North outer back
    const northExt = new THREE.Mesh(extThicknessGeo, this.outerWallMaterial);
    northExt.position.set(0, H / 2, -halfDepth - T / 2);
    northExt.castShadow = true;
    extGroup.add(northExt);

    // South outer back
    const southExt = new THREE.Mesh(extThicknessGeo, this.outerWallMaterial);
    southExt.position.set(0, H / 2, halfDepth + T / 2);
    southExt.castShadow = true;
    extGroup.add(southExt);

    // East outer back
    const eastExt = new THREE.Mesh(extThicknessGeo, this.outerWallMaterial);
    eastExt.rotation.y = Math.PI / 2;
    eastExt.position.set(halfWidth + T / 2, H / 2, 0);
    eastExt.castShadow = true;
    extGroup.add(eastExt);

    // West outer back
    const westExt = new THREE.Mesh(extThicknessGeo, this.outerWallMaterial);
    westExt.rotation.y = Math.PI / 2;
    westExt.position.set(-halfWidth - T / 2, H / 2, 0);
    westExt.castShadow = true;
    extGroup.add(westExt);

    this.roomGroup.add(extGroup);
  }

  buildBaseboards(halfL, halfWidth, halfDepth, R) {
    const baseGroup = new THREE.Group();
    baseGroup.name = 'Baseboards';
    const bHeight = 0.4;
    const bDepth = 0.08;

    const baseStraightGeo = new THREE.BoxGeometry(this.params.wallLength, bHeight, bDepth);

    // Wall 1 Baseboard
    const b1 = new THREE.Mesh(baseStraightGeo, this.baseboardMaterial);
    b1.position.set(0, bHeight / 2, -halfDepth + bDepth / 2);
    baseGroup.add(b1);

    // Wall 2 Baseboard
    const b2 = new THREE.Mesh(baseStraightGeo, this.baseboardMaterial);
    b2.rotation.y = Math.PI / 2;
    b2.position.set(halfWidth - bDepth / 2, bHeight / 2, 0);
    baseGroup.add(b2);

    // Wall 3 Baseboard
    const b3 = new THREE.Mesh(baseStraightGeo, this.baseboardMaterial);
    b3.position.set(0, bHeight / 2, halfDepth - bDepth / 2);
    baseGroup.add(b3);

    // Wall 4 Baseboard
    const b4 = new THREE.Mesh(baseStraightGeo, this.baseboardMaterial);
    b4.rotation.y = Math.PI / 2;
    b4.position.set(-halfWidth + bDepth / 2, bHeight / 2, 0);
    baseGroup.add(b4);

    this.roomGroup.add(baseGroup);
  }

  buildDimensionMarkers(halfL, halfWidth, halfDepth, H) {
    const markersGroup = new THREE.Group();
    markersGroup.name = 'DimensionMarkers';

    const createLabelSprite = (text) => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');

      // Rounded pill badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 2;
      
      const r = 18;
      ctx.beginPath();
      ctx.roundRect(8, 8, 304, 64, r);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 160, 40);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(4, 1, 1);
      return sprite;
    };

    // 4 Wall Section Badges
    const badge1 = createLabelSprite('Wall 1 (North) • 15 ft');
    badge1.position.set(0, H + 0.8, -halfDepth);
    markersGroup.add(badge1);

    const badge2 = createLabelSprite('Wall 2 (East) • 15 ft');
    badge2.position.set(halfWidth, H + 0.8, 0);
    markersGroup.add(badge2);

    const badge3 = createLabelSprite('Wall 3 (South) • 15 ft');
    badge3.position.set(0, H + 0.8, halfDepth);
    markersGroup.add(badge3);

    const badge4 = createLabelSprite('Wall 4 (West) • 15 ft');
    badge4.position.set(-halfWidth, H + 0.8, 0);
    markersGroup.add(badge4);

    this.roomGroup.add(markersGroup);
    this.dimensionMarkersGroup = markersGroup;
  }

  setDimensions(options = {}) {
    this.params = { ...this.params, ...options };
    this.build();
  }

  toggleCeiling(visible) {
    this.params.showCeiling = visible;
    this.build();
  }

  toggleDimensions(visible) {
    this.params.showDimensions = visible;
    if (this.dimensionMarkersGroup) {
      this.dimensionMarkersGroup.visible = visible;
    }
  }

  highlightWall(sectionId) {
    // Reset all walls roughness/emissive
    for (let id = 1; id <= 4; id++) {
      const mesh = this.wallMeshes[id];
      if (mesh && mesh.material) {
        if (id === sectionId) {
          mesh.material.emissive = new THREE.Color(0x1a2e40);
        } else {
          mesh.material.emissive = new THREE.Color(0x000000);
        }
      }
    }
  }

  updateTextures() {
    for (let id = 1; id <= 4; id++) {
      const sec = this.textureManager.getSection(id);
      if (sec && this.wallMeshes[id]) {
        this.wallMeshes[id].material.map = sec.texture;
        this.wallMeshes[id].material.needsUpdate = true;
      }
    }
  }
}
