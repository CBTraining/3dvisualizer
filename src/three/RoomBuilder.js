import * as THREE from 'three';

/**
 * Clean, consolidated architectural Room Builder with minimal parts:
 * - South wall is completely CLOSED/SOLID across the exterior bottom boundary
 * - Entrance vestibule is an interior chamber with inward swinging door
 * - East wall has the two open entrance/passage portals
 * - All interior walls are Grey (0x717882), outer walls and centerpiece are Black (0x18191d)
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

    // Color tokens
    this.colorInteriorGrey = 0x717882;
    this.colorBlack = 0x18191d;

    // Materials
    this.interiorGreyMaterial = new THREE.MeshStandardMaterial({
      color: this.colorInteriorGrey,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.outerBlackMaterial = new THREE.MeshStandardMaterial({
      color: this.colorBlack,
      roughness: 0.9,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    this.centerpieceMaterial = new THREE.MeshStandardMaterial({
      color: this.colorBlack,
      roughness: 0.65,
      metalness: 0.15,
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

    // Distinct contrasting lighter studio grey floor
    ctx.fillStyle = '#c4c9d1';
    ctx.fillRect(0, 0, 1024, 1024);

    const step = 64;
    ctx.strokeStyle = '#b0b7c0';
    ctx.lineWidth = 2;

    for (let i = 0; i <= 1024; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(1024, i);
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
      roughness: 0.35,
      metalness: 0.06,
      side: THREE.DoubleSide
    });
  }

  build() {
    while (this.roomGroup.children.length > 0) {
      const obj = this.roomGroup.children[0];
      this.roomGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    this.wallMeshes = {};

    const H = this.params.wallHeight;
    const T = this.params.wallThickness;

    // -------------------------------------------------------------
    // 1. FLOOR & OUTER BLACK PLINTH
    // -------------------------------------------------------------
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMaterial);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.position.y = 0;
    this.floorMesh.receiveShadow = true;
    this.roomGroup.add(this.floorMesh);

    const plinthGeo = new THREE.BoxGeometry(34, 0.4, 34);
    const plinth = new THREE.Mesh(plinthGeo, this.outerBlackMaterial);
    plinth.position.set(0, -0.21, 0);
    this.roomGroup.add(plinth);

    // -------------------------------------------------------------
    // 2. NORTH WALL (Solid 19ft span, Interior Grey, Exterior Black)
    // -------------------------------------------------------------
    const northGeo = new THREE.BoxGeometry(19.0, H, T);
    const northMesh = new THREE.Mesh(northGeo, [
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(1).texture, roughness: 0.85 }), // +z Interior
      this.outerBlackMaterial  // -z Exterior
    ]);
    northMesh.position.set(0, H / 2, -13.0);
    northMesh.receiveShadow = true;
    northMesh.userData = { sectionId: 1, name: 'North Wall' };
    this.roomGroup.add(northMesh);
    this.wallMeshes[1] = northMesh;

    // Northwest & Northeast Rounded Fillets
    this.buildCurvedFillet(-9.5, -9.5, 3.5, Math.PI, Math.PI * 1.5, H, T, this.interiorGreyMaterial);
    this.buildCurvedFillet(9.5, -9.5, 3.5, Math.PI * 1.5, Math.PI * 1.85, H, T, this.interiorGreyMaterial);

    // -------------------------------------------------------------
    // 3. WEST WALL (Upper & Lower Segments, Interior Grey, Exterior Black)
    // -------------------------------------------------------------
    const westHalfGeo = new THREE.BoxGeometry(T, H, 9.5);
    
    // Upper West Wall
    const upperWestMesh = new THREE.Mesh(westHalfGeo, [
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(2).texture, roughness: 0.85 }), // +x Interior
      this.outerBlackMaterial, // -x Exterior
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    upperWestMesh.position.set(-13.0, H / 2, -4.75);
    upperWestMesh.receiveShadow = true;
    upperWestMesh.userData = { sectionId: 2, name: 'Upper West Wall' };
    this.roomGroup.add(upperWestMesh);
    this.wallMeshes[2] = upperWestMesh;

    // Lower West Wall
    const lowerWestMesh = new THREE.Mesh(westHalfGeo, [
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(3).texture, roughness: 0.85 }), // +x Interior
      this.outerBlackMaterial, // -x Exterior
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    lowerWestMesh.position.set(-13.0, H / 2, 4.75);
    lowerWestMesh.receiveShadow = true;
    lowerWestMesh.userData = { sectionId: 3, name: 'Lower West Wall' };
    this.roomGroup.add(lowerWestMesh);
    this.wallMeshes[3] = lowerWestMesh;

    // Southwest Rounded Fillet
    this.buildCurvedFillet(-9.5, 9.5, 3.5, Math.PI * 0.5, Math.PI, H, T, this.interiorGreyMaterial);

    // -------------------------------------------------------------
    // 4. SOUTH WALL - FULLY CLOSED & SOLID (x: -9.5 to +13.0 at z: +13.0)
    // -------------------------------------------------------------
    const southGeo = new THREE.BoxGeometry(22.5, H, T);
    const southMesh = new THREE.Mesh(southGeo, [
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial, // +z Exterior Black (Fully Closed)
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(4).texture, roughness: 0.85 }) // -z Interior Grey
    ]);
    southMesh.position.set(1.75, H / 2, 13.0);
    southMesh.receiveShadow = true;
    southMesh.userData = { sectionId: 4, name: 'South Wall' };
    this.roomGroup.add(southMesh);
    this.wallMeshes[4] = southMesh;

    // South Entrance Vestibule Chamber (Attached inward to solid south wall)
    this.buildEntranceVestibule(H, T);

    // -------------------------------------------------------------
    // 5. EAST WALL (Mid & Lower Segments with Portals)
    // -------------------------------------------------------------
    // Mid-East Wall (z: -3.5 to +2.5)
    const midEastGeo = new THREE.BoxGeometry(T, H, 6.0);
    const midEastMesh = new THREE.Mesh(midEastGeo, [
      this.outerBlackMaterial,
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(5).texture, roughness: 0.85 }), // -x Interior
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    midEastMesh.position.set(13.0, H / 2, -0.5);
    midEastMesh.receiveShadow = true;
    midEastMesh.userData = { sectionId: 5, name: 'East Wall (Mid Section)' };
    this.roomGroup.add(midEastMesh);
    this.wallMeshes[5] = midEastMesh;

    // Lower-East Wall (z: +6.0 to +13.0)
    const lowerEastGeo = new THREE.BoxGeometry(T, H, 7.0);
    const lowerEastMesh = new THREE.Mesh(lowerEastGeo, [
      this.outerBlackMaterial,
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(6).texture, roughness: 0.85 }), // -x Interior
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    lowerEastMesh.position.set(13.0, H / 2, 9.5);
    lowerEastMesh.receiveShadow = true;
    lowerEastMesh.userData = { sectionId: 6, name: 'East Wall (Lower / Booth)' };
    this.roomGroup.add(lowerEastMesh);
    this.wallMeshes[6] = lowerEastMesh;

    // Southeast Square Booth Enclosure
    this.buildSoutheastBooth(H);

    // -------------------------------------------------------------
    // 6. CENTERPIECE COLUMN (Solid Black)
    // -------------------------------------------------------------
    this.buildCenterpiece(H);

    // -------------------------------------------------------------
    // 7. RADIAL PARTITION FINS (Interior Grey)
    // -------------------------------------------------------------
    this.buildPartitionFins(H, T);

    // -------------------------------------------------------------
    // 8. OVERHEAD TRUSS
    // -------------------------------------------------------------
    if (this.params.showCeilingTruss) {
      this.buildOverheadTruss(H);
    }
  }

  buildCurvedFillet(cx, cz, radius, startAngle, endAngle, H, T, material) {
    const segments = 20;
    const shape = new THREE.Shape();
    const angleStep = (endAngle - startAngle) / segments;

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

    const geom = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false });
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

    // Left Vestibule Wall (x = -2.0, z from 13.0 to 7.0)
    const leftWallGeo = new THREE.BoxGeometry(T, H, 6.0);
    const leftWall = new THREE.Mesh(leftWallGeo, this.interiorGreyMaterial);
    leftWall.position.set(-2.0, H / 2, 10.0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    leftWall.userData = { sectionId: 11, name: 'South Entrance Vestibule' };
    vestGroup.add(leftWall);
    this.wallMeshes[11] = leftWall;

    // Right Vestibule Wall (x = +1.8, z from 13.0 to 7.0)
    const rightWallGeo = new THREE.BoxGeometry(T, H, 6.0);
    const rightWall = new THREE.Mesh(rightWallGeo, this.interiorGreyMaterial);
    rightWall.position.set(1.8, H / 2, 10.0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    vestGroup.add(rightWall);

    // Inward Angled Swinging Door (attached to inward end at -2.0, 7.0)
    const doorGeo = new THREE.BoxGeometry(0.15, H * 0.85, 3.2);
    const door = new THREE.Mesh(doorGeo, this.interiorGreyMaterial);
    door.position.set(-2.8, (H * 0.85) / 2, 8.2);
    door.rotation.y = -Math.PI / 6;
    door.castShadow = true;
    vestGroup.add(door);

    // Inward Top lintel connector
    const lintelGeo = new THREE.BoxGeometry(4.0, 0.6, T);
    const lintel = new THREE.Mesh(lintelGeo, this.interiorGreyMaterial);
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

    // Back wall
    const bBack = new THREE.Mesh(new THREE.BoxGeometry(bSize, bHeight, bThickness), this.outerBlackMaterial);
    bBack.position.set(bx, bHeight / 2, bz + bSize / 2);
    boothGroup.add(bBack);

    // Right wall
    const bRight = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, bSize), this.outerBlackMaterial);
    bRight.position.set(bx + bSize / 2, bHeight / 2, bz);
    boothGroup.add(bRight);

    // Left wall
    const bLeft = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, bSize), this.interiorGreyMaterial);
    bLeft.position.set(bx - bSize / 2, bHeight / 2, bz);
    boothGroup.add(bLeft);

    // Front wall
    const bFront = new THREE.Mesh(new THREE.BoxGeometry(bSize, bHeight, bThickness), this.interiorGreyMaterial);
    bFront.position.set(bx, bHeight / 2, bz - bSize / 2);
    boothGroup.add(bFront);

    // Top White Rim Border
    const rimGeo = new THREE.BoxGeometry(bSize + 0.1, 0.3, bSize + 0.1);
    const rim = new THREE.Mesh(rimGeo, this.boothRimMaterial);
    rim.position.set(bx, bHeight + 0.15, bz);
    boothGroup.add(rim);

    this.roomGroup.add(boothGroup);
  }

  buildCenterpiece(H) {
    const islandGroup = new THREE.Group();
    islandGroup.name = 'Centerpiece';

    const size = 4.6;
    const r = 0.9;
    const half = size / 2 - r;

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

    const geom = new THREE.ExtrudeGeometry(shape, { depth: H, bevelEnabled: false });
    const islandMesh = new THREE.Mesh(geom, [
      new THREE.MeshStandardMaterial({
        map: this.textureManager.getSection(7).texture,
        roughness: 0.5,
        metalness: 0.15
      }),
      this.centerpieceMaterial
    ]);
    islandMesh.rotation.x = Math.PI / 2;
    islandMesh.position.y = H;
    islandMesh.receiveShadow = true;
    islandMesh.castShadow = true;
    islandMesh.userData = { sectionId: 7, name: 'Centerpiece Island Column' };
    islandGroup.add(islandMesh);
    this.wallMeshes[7] = islandMesh;

    // White top rim outline
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

    // 1. North Partition Fin
    const northFinGeo = new THREE.BoxGeometry(T, H, 7.0);
    const northFin = new THREE.Mesh(northFinGeo, this.interiorGreyMaterial);
    northFin.position.set(0, H / 2, -9.5);
    northFin.castShadow = true;
    northFin.receiveShadow = true;
    northFin.userData = { sectionId: 8, name: 'North Partition Fin' };
    finsGroup.add(northFin);
    this.wallMeshes[8] = northFin;

    // 2. West Partition Fin
    const westFinGeo = new THREE.BoxGeometry(7.0, H, T);
    const westFin = new THREE.Mesh(westFinGeo, this.interiorGreyMaterial);
    westFin.position.set(-9.5, H / 2, 0);
    westFin.castShadow = true;
    westFin.receiveShadow = true;
    westFin.userData = { sectionId: 9, name: 'West Partition Fin' };
    finsGroup.add(westFin);
    this.wallMeshes[9] = westFin;

    // 3. East Partition Fin
    const eastFinGeo = new THREE.BoxGeometry(7.0, H, T);
    const eastFin = new THREE.Mesh(eastFinGeo, this.interiorGreyMaterial);
    eastFin.position.set(9.5, H / 2, -0.5);
    eastFin.castShadow = true;
    eastFin.receiveShadow = true;
    eastFin.userData = { sectionId: 10, name: 'East Partition Fin' };
    finsGroup.add(eastFin);
    this.wallMeshes[10] = eastFin;

    this.roomGroup.add(finsGroup);
  }

  buildOverheadTruss(H) {
    const trussGroup = new THREE.Group();
    trussGroup.name = 'OverheadTruss';

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
    for (let id = 1; id <= 11; id++) {
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
