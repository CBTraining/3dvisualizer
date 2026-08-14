import * as THREE from 'three';

/**
 * Custom Parametric Room matching the reference floorplan:
 * - Rounded NW and SW perimeter corners
 * - Curved NE corner with Upper East Entrance portal
 * - Mid-East wall with fin and Lower East Passage portal
 * - Southeast corner 3D square booth enclosure
 * - South Entrance Vestibule chamber with angled door
 * - Central rounded-square column/island
 * - 3 Radial interior partition fins (North, West, East)
 * - Wall-mounted display screen panels
 * - Overhead architectural truss/rail
 */
export class RoomBuilder {
  constructor(scene, wallTextureManager) {
    this.scene = scene;
    this.textureManager = wallTextureManager;

    this.params = {
      wallHeight: 9.0,
      wallThickness: 0.45,
      showCeilingTruss: true,
      showDimensions: true,
      floorMaterialType: 'grid-tile'
    };

    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'RoomGroup';
    this.scene.add(this.roomGroup);

    this.wallMeshes = {};
    this.interactiveMeshes = [];

    // Base materials
    this.oliveMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c6448,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.greyMaterial = new THREE.MeshStandardMaterial({
      color: 0x7a818c,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.finMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.boothMaterial = new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    this.boothRimMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.2
    });

    this.floorMaterial = this.createFloorMaterial();

    this.build();
  }

  createFloorMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Studio floor matching reference image (light grey grid)
    ctx.fillStyle = '#cbcbcb';
    ctx.fillRect(0, 0, 1024, 1024);

    const step = 64; // 16x16 grid
    ctx.strokeStyle = '#bababa';
    ctx.lineWidth = 2;

    for (let i = 0; i <= 1024; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.32,
      metalness: 0.08,
      side: THREE.DoubleSide
    });
  }

  build() {
    // Clear existing
    while (this.roomGroup.children.length > 0) {
      const obj = this.roomGroup.children[0];
      this.roomGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    this.wallMeshes = {};
    this.interactiveMeshes = [];

    const H = this.params.wallHeight;
    const T = this.params.wallThickness;

    // -------------------------------------------------------------
    // 1. FLOOR & OUTER BOUNDARY
    // -------------------------------------------------------------
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMaterial);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = 0;
    this.floorMesh.receiveShadow = true;
    this.roomGroup.add(this.floorMesh);

    // Outer Dark Gallery Frame / Plinth
    this.buildOuterPlinth();

    // -------------------------------------------------------------
    // 2. NORTH WALL & CURVES
    // -------------------------------------------------------------
    // Straight North Wall (x: -9.5 to +9.5 at z = -13.0)
    const northGeo = new THREE.BoxGeometry(19.0, H, T);
    const northMesh = new THREE.Mesh(northGeo, [
      this.oliveMaterial, // +x
      this.oliveMaterial, // -x
      this.oliveMaterial, // +y
      this.oliveMaterial, // -y
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(1).texture, roughness: 0.85 }), // +z (Interior)
      this.oliveMaterial  // -z (Exterior)
    ]);
    northMesh.position.set(0, H / 2, -13.0);
    northMesh.receiveShadow = true;
    northMesh.userData = { sectionId: 1, name: 'North Wall' };
    this.roomGroup.add(northMesh);
    this.wallMeshes[1] = northMesh;

    // Northwest Rounded Fillet (Curving from z: -13 to x: -13)
    this.buildCurvedFillet(-9.5, -9.5, 3.5, Math.PI, Math.PI * 1.5, H, T, this.oliveMaterial);

    // Northeast Rounded Fillet (Curving from z: -13 around to East entrance at z: -8.5)
    this.buildCurvedFillet(9.5, -9.5, 3.5, Math.PI * 1.5, Math.PI * 1.85, H, T, this.oliveMaterial);

    // -------------------------------------------------------------
    // 3. WEST WALL & SW CURVE
    // -------------------------------------------------------------
    // Upper West Wall (z: -9.5 to 0 at x = -13.0)
    const upperWestGeo = new THREE.BoxGeometry(T, H, 9.5);
    const upperWestMesh = new THREE.Mesh(upperWestGeo, [
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(2).texture, roughness: 0.85 }), // +x (Interior)
      this.oliveMaterial, // -x (Exterior)
      this.oliveMaterial,
      this.oliveMaterial,
      this.oliveMaterial,
      this.oliveMaterial
    ]);
    upperWestMesh.position.set(-13.0, H / 2, -4.75);
    upperWestMesh.receiveShadow = true;
    upperWestMesh.userData = { sectionId: 2, name: 'Upper West Wall' };
    this.roomGroup.add(upperWestMesh);
    this.wallMeshes[2] = upperWestMesh;

    // Lower West Wall (z: 0 to +9.5 at x = -13.0)
    const lowerWestGeo = new THREE.BoxGeometry(T, H, 9.5);
    const lowerWestMesh = new THREE.Mesh(lowerWestGeo, [
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(3).texture, roughness: 0.85 }), // +x (Interior)
      this.greyMaterial, // -x (Exterior)
      this.greyMaterial,
      this.greyMaterial,
      this.greyMaterial,
      this.greyMaterial
    ]);
    lowerWestMesh.position.set(-13.0, H / 2, 4.75);
    lowerWestMesh.receiveShadow = true;
    lowerWestMesh.userData = { sectionId: 3, name: 'Lower West Wall' };
    this.roomGroup.add(lowerWestMesh);
    this.wallMeshes[3] = lowerWestMesh;

    // Southwest Rounded Fillet (Curving from x: -13 to South wall at z: +13)
    this.buildCurvedFillet(-9.5, 9.5, 3.5, Math.PI * 0.5, Math.PI, H, T, this.greyMaterial);

    // -------------------------------------------------------------
    // 4. SOUTH WALL & ENTRANCE VESTIBULE
    // -------------------------------------------------------------
    // South Left (Grey, x: -9.5 to -2.0 at z = +13.0)
    const southLeftGeo = new THREE.BoxGeometry(7.5, H, T);
    const southLeftMesh = new THREE.Mesh(southLeftGeo, [
      this.greyMaterial,
      this.greyMaterial,
      this.greyMaterial,
      this.greyMaterial,
      this.greyMaterial, // +z (Exterior)
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(4).texture, roughness: 0.85 }) // -z (Interior)
    ]);
    southLeftMesh.position.set(-5.75, H / 2, 13.0);
    southLeftMesh.receiveShadow = true;
    southLeftMesh.userData = { sectionId: 4, name: 'South Wall (Left Grey)' };
    this.roomGroup.add(southLeftMesh);
    this.wallMeshes[4] = southLeftMesh;

    // South Right (Olive, x: +1.8 to +13.0 at z = +13.0)
    const southRightGeo = new THREE.BoxGeometry(11.2, H, T);
    const southRightMesh = new THREE.Mesh(southRightGeo, [
      this.oliveMaterial,
      this.oliveMaterial,
      this.oliveMaterial,
      this.oliveMaterial,
      this.oliveMaterial, // +z (Exterior)
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(5).texture, roughness: 0.85 }) // -z (Interior)
    ]);
    southRightMesh.position.set(7.4, H / 2, 13.0);
    southRightMesh.receiveShadow = true;
    southRightMesh.userData = { sectionId: 5, name: 'South Wall (Right Screen)' };
    this.roomGroup.add(southRightMesh);
    this.wallMeshes[5] = southRightMesh;

    // South Entrance Vestibule Walls (Tunnel into room)
    this.buildEntranceVestibule(H, T);

    // -------------------------------------------------------------
    // 5. EAST WALL & SOUTHEAST BOOTH
    // -------------------------------------------------------------
    // Mid-East Wall (z: -3.5 to +2.5 at x = +13.0)
    const midEastGeo = new THREE.BoxGeometry(T, H, 6.0);
    const midEastMesh = new THREE.Mesh(midEastGeo, [
      this.oliveMaterial,
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(6).texture, roughness: 0.85 }), // -x (Interior)
      this.oliveMaterial,
      this.oliveMaterial,
      this.oliveMaterial,
      this.oliveMaterial
    ]);
    midEastMesh.position.set(13.0, H / 2, -0.5);
    midEastMesh.receiveShadow = true;
    midEastMesh.userData = { sectionId: 6, name: 'East Wall (Mid Section)' };
    this.roomGroup.add(midEastMesh);
    this.wallMeshes[6] = midEastMesh;

    // Lower-East Wall (z: +6.0 to +13.0 at x = +13.0)
    const lowerEastGeo = new THREE.BoxGeometry(T, H, 7.0);
    const lowerEastMesh = new THREE.Mesh(lowerEastGeo, [
      this.oliveMaterial,
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(7).texture, roughness: 0.85 }), // -x (Interior)
      this.oliveMaterial,
      this.oliveMaterial,
      this.oliveMaterial,
      this.oliveMaterial
    ]);
    lowerEastMesh.position.set(13.0, H / 2, 9.5);
    lowerEastMesh.receiveShadow = true;
    lowerEastMesh.userData = { sectionId: 7, name: 'East Wall (Lower / Booth)' };
    this.roomGroup.add(lowerEastMesh);
    this.wallMeshes[7] = lowerEastMesh;

    // Southeast 3D Square Booth Enclosure
    this.buildSoutheastBooth(H);

    // -------------------------------------------------------------
    // 6. CENTRAL ROUNDED SQUARE ISLAND / COLUMN
    // -------------------------------------------------------------
    this.buildCenterIsland(H);

    // -------------------------------------------------------------
    // 7. RADIAL INTERIOR PARTITION FINS
    // -------------------------------------------------------------
    this.buildPartitionFins(H, T);

    // -------------------------------------------------------------
    // 8. CEILING ARCHITECTURAL TRUSS / DOTTED OUTLINES
    // -------------------------------------------------------------
    if (this.params.showCeilingTruss) {
      this.buildOverheadTruss(H);
    }
  }

  buildCurvedFillet(cx, cz, radius, startAngle, endAngle, H, T, material) {
    const segments = 24;
    const curveGroup = new THREE.Group();

    const shape = new THREE.Shape();
    const angleStep = (endAngle - startAngle) / segments;

    // Outer and inner arc points
    const rIn = radius - T / 2;
    const rOut = radius + T / 2;

    const outerPoints = [];
    const innerPoints = [];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep;
      outerPoints.push(new THREE.Vector2(cx + Math.cos(angle) * rOut, cz + Math.sin(angle) * rOut));
      innerPoints.push(new THREE.Vector2(cx + Math.cos(angle) * rIn, cz + Math.sin(angle) * rIn));
    }

    shape.moveTo(outerPoints[0].x, outerPoints[0].y);
    for (let i = 1; i <= segments; i++) {
      shape.lineTo(outerPoints[i].x, outerPoints[i].y);
    }
    for (let i = segments; i >= 0; i--) {
      shape.lineTo(innerPoints[i].x, innerPoints[i].y);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: H,
      bevelEnabled: false
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mesh = new THREE.Mesh(geom, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = H;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.roomGroup.add(mesh);
  }

  buildEntranceVestibule(H, T) {
    const vestGroup = new THREE.Group();
    vestGroup.name = 'EntranceVestibule';

    // Left Vestibule Wall (x = -2.0, z from +13.0 to +7.0)
    const leftWallGeo = new THREE.BoxGeometry(T, H, 6.0);
    const leftWall = new THREE.Mesh(leftWallGeo, this.finMaterial);
    leftWall.position.set(-2.0, H / 2, 10.0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    vestGroup.add(leftWall);

    // Right Vestibule Wall (x = +1.8, z from +13.0 to +7.0)
    const rightWallGeo = new THREE.BoxGeometry(T, H, 6.0);
    const rightWall = new THREE.Mesh(rightWallGeo, this.finMaterial);
    rightWall.position.set(1.8, H / 2, 10.0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    vestGroup.add(rightWall);

    // Angled Swinging Door (hinged at -2.0, 7.0, swinging out to left at ~35 degrees)
    const doorGeo = new THREE.BoxGeometry(0.15, H * 0.85, 3.2);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x5c6448,
      roughness: 0.6,
      metalness: 0.1
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(-2.8, (H * 0.85) / 2, 8.2);
    door.rotation.y = -Math.PI / 6; // Angled open
    door.castShadow = true;
    vestGroup.add(door);

    // Top lintel connector
    const lintelGeo = new THREE.BoxGeometry(4.0, 0.6, T);
    const lintel = new THREE.Mesh(lintelGeo, this.finMaterial);
    lintel.position.set(-0.1, H - 0.3, 7.0);
    vestGroup.add(lintel);

    this.roomGroup.add(vestGroup);
  }

  buildSoutheastBooth(H) {
    const boothGroup = new THREE.Group();
    boothGroup.name = 'SoutheastBooth';

    const bSize = 4.2;
    const bHeight = 7.5;
    const bThickness = 0.35;
    const bx = 10.0;
    const bz = 10.5;

    // Booth Walls: Back (South), Right (East), Front (North), Left (West)
    // Back wall
    const bBack = new THREE.Mesh(new THREE.BoxGeometry(bSize, bHeight, bThickness), this.boothMaterial);
    bBack.position.set(bx, bHeight / 2, bz + bSize / 2);
    boothGroup.add(bBack);

    // Right wall
    const bRight = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, bSize), this.boothMaterial);
    bRight.position.set(bx + bSize / 2, bHeight / 2, bz);
    boothGroup.add(bRight);

    // Left wall
    const bLeft = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, bSize), this.boothMaterial);
    bLeft.position.set(bx - bSize / 2, bHeight / 2, bz);
    boothGroup.add(bLeft);

    // Front partial wall (with entrance portal)
    const bFront = new THREE.Mesh(new THREE.BoxGeometry(bSize, bHeight, bThickness), this.boothMaterial);
    bFront.position.set(bx, bHeight / 2, bz - bSize / 2);
    boothGroup.add(bFront);

    // Top White Rim Border (matching reference image)
    const rimGeo = new THREE.BoxGeometry(bSize + 0.1, 0.3, bSize + 0.1);
    const rim = new THREE.Mesh(rimGeo, this.boothRimMaterial);
    rim.position.set(bx, bHeight + 0.15, bz);
    boothGroup.add(rim);

    this.roomGroup.add(boothGroup);
  }

  buildCenterIsland(H) {
    const islandGroup = new THREE.Group();
    islandGroup.name = 'CenterIsland';

    const size = 4.6;
    const r = 0.9;
    const half = size / 2 - r;

    // Rounded rectangle shape
    const shape = new THREE.Shape();
    shape.moveTo(-half, size / 2);
    shape.lineTo(half, size / 2);
    shape.absarc(half, half, r, Math.PI / 2, 0, true);
    shape.lineTo(size / 2, -half);
    shape.absarc(half, -half, r, 0, -Math.PI / 2, true);
    shape.lineTo(-half, -size / 2);
    shape.absarc(-half, -half, r, -Math.PI / 2, -Math.PI, true);
    shape.lineTo(-size / 2, half);
    shape.absarc(-half, half, r, Math.PI, Math.PI / 2, true);

    const extrudeSettings = {
      depth: H,
      bevelEnabled: false
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const islandMesh = new THREE.Mesh(geom, [
      new THREE.MeshStandardMaterial({
        map: this.textureManager.getSection(8).texture,
        roughness: 0.65,
        metalness: 0.1
      }),
      this.finMaterial
    ]);
    islandMesh.rotation.x = Math.PI / 2;
    islandMesh.position.y = H;
    islandMesh.receiveShadow = true;
    islandMesh.castShadow = true;
    islandMesh.userData = { sectionId: 8, name: 'Center Island Column' };
    islandGroup.add(islandMesh);
    this.wallMeshes[8] = islandMesh;

    // White top rim
    const topRimGeo = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const line = new THREE.LineSegments(topRimGeo, lineMat);
    line.rotation.x = Math.PI / 2;
    line.position.y = H + 0.05;
    islandGroup.add(line);

    this.roomGroup.add(islandGroup);
  }

  buildPartitionFins(H, T) {
    const finsGroup = new THREE.Group();
    finsGroup.name = 'PartitionFins';

    // 1. North Partition Fin (from x = 0, z = -13.0 extending to z = -6.0)
    const northFinGeo = new THREE.BoxGeometry(T, H, 7.0);
    const northFin = new THREE.Mesh(northFinGeo, this.finMaterial);
    northFin.position.set(0, H / 2, -9.5);
    northFin.castShadow = true;
    northFin.receiveShadow = true;
    northFin.userData = { sectionId: 9, name: 'North Partition Fin' };
    finsGroup.add(northFin);
    this.wallMeshes[9] = northFin;

    // 2. West Partition Fin (from z = 0, x = -13.0 extending to x = -6.0)
    const westFinGeo = new THREE.BoxGeometry(7.0, H, T);
    const westFin = new THREE.Mesh(westFinGeo, this.finMaterial);
    westFin.position.set(-9.5, H / 2, 0);
    westFin.castShadow = true;
    westFin.receiveShadow = true;
    westFin.userData = { sectionId: 10, name: 'West Partition Fin' };
    finsGroup.add(westFin);
    this.wallMeshes[10] = westFin;

    // 3. East Partition Fin (from z = -0.5, x = +13.0 extending to x = +6.0)
    const eastFinGeo = new THREE.BoxGeometry(7.0, H, T);
    const eastFin = new THREE.Mesh(eastFinGeo, this.finMaterial);
    eastFin.position.set(9.5, H / 2, -0.5);
    eastFin.castShadow = true;
    eastFin.receiveShadow = true;
    eastFin.userData = { sectionId: 11, name: 'East Partition Fin' };
    finsGroup.add(eastFin);
    this.wallMeshes[11] = eastFin;

    this.roomGroup.add(finsGroup);
  }

  buildOverheadTruss(H) {
    const trussGroup = new THREE.Group();
    trussGroup.name = 'OverheadTruss';

    // Outer Dotted Boundary Rail
    const railPoints = [
      new THREE.Vector3(-14.5, H + 0.1, -14.5),
      new THREE.Vector3(14.5, H + 0.1, -14.5),
      new THREE.Vector3(14.5, H + 0.1, 14.5),
      new THREE.Vector3(-14.5, H + 0.1, 14.5),
      new THREE.Vector3(-14.5, H + 0.1, -14.5)
    ];

    const railGeo = new THREE.BufferGeometry().setFromPoints(railPoints);
    const railMat = new THREE.LineDashedMaterial({
      color: 0x94a3b8,
      dashSize: 0.5,
      gapSize: 0.3,
      linewidth: 2
    });
    const rail = new THREE.Line(railGeo, railMat);
    rail.computeLineDistances();
    trussGroup.add(rail);

    this.roomGroup.add(trussGroup);
  }

  buildOuterPlinth() {
    const plinthGeo = new THREE.BoxGeometry(34, 0.4, 34);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(0, -0.21, 0);
    this.roomGroup.add(plinth);
  }

  highlightWall(sectionId) {
    for (const [id, mesh] of Object.entries(this.wallMeshes)) {
      if (mesh) {
        const isSelected = parseInt(id, 10) === parseInt(sectionId, 10);
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if (mat.emissive) {
              mat.emissive.set(isSelected ? 0x223a5e : 0x000000);
            }
          });
        } else if (mesh.material && mesh.material.emissive) {
          mesh.material.emissive.set(isSelected ? 0x223a5e : 0x000000);
        }
      }
    }
  }

  updateTextures() {
    for (let id = 1; id <= 12; id++) {
      const sec = this.textureManager.getSection(id);
      const mesh = this.wallMeshes[id];
      if (sec && mesh) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if (mat.map) {
              mat.map = sec.texture;
              mat.needsUpdate = true;
            }
          });
        } else if (mesh.material && mesh.material.map) {
          mesh.material.map = sec.texture;
          mesh.material.needsUpdate = true;
        }
      }
    }
  }
}
