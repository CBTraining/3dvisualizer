import * as THREE from 'three';

/**
 * Clean, consolidated architectural Room Builder:
 * - ALL outside / exterior faces (straight walls, curved corners, top caps, outer casing) are SOLID BLACK (0x18191d)
 * - ALL inside faces (interior walls, interior curves, fins, vestibule) are GREY (0x717882)
 * - Centerpiece island column is SOLID BLACK (0x18191d)
 * - Floor is a distinct contrasting lighter studio grey (0xc4c9d1)
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
      side: THREE.FrontSide
    });

    this.outerBlackMaterial = new THREE.MeshStandardMaterial({
      color: this.colorBlack,
      roughness: 0.9,
      metalness: 0.08,
      side: THREE.FrontSide
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
    // 2. NORTH WALL (Solid 19ft span, Interior Grey, ALL Exterior Black)
    // -------------------------------------------------------------
    const northGeo = new THREE.BoxGeometry(19.0, H, T);
    const northMesh = new THREE.Mesh(northGeo, [
      this.outerBlackMaterial, // +x
      this.outerBlackMaterial, // -x
      this.outerBlackMaterial, // +y (Top Cap Black)
      this.outerBlackMaterial, // -y (Bottom Cap Black)
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(1).texture, roughness: 0.85, side: THREE.FrontSide }), // +z Interior
      this.outerBlackMaterial  // -z Exterior (Solid Black)
    ]);
    northMesh.position.set(0, H / 2, -13.0);
    northMesh.receiveShadow = true;
    northMesh.userData = { sectionId: 1, name: 'North Wall' };
    this.roomGroup.add(northMesh);
    this.wallMeshes[1] = northMesh;

    // Northwest & Northeast Rounded Fillets (Outer Black, Inner Grey, Top Cap Black)
    this.buildCurvedFilletTwoTone(-9.5, -9.5, 3.5, Math.PI, Math.PI * 1.5, H, T);
    this.buildCurvedFilletTwoTone(9.5, -9.5, 3.5, Math.PI * 1.5, Math.PI * 1.85, H, T);

    // -------------------------------------------------------------
    // 3. WEST WALL (Upper & Lower Segments, Interior Grey, ALL Exterior Black)
    // -------------------------------------------------------------
    const westHalfGeo = new THREE.BoxGeometry(T, H, 9.5);
    
    // Upper West Wall
    const upperWestMesh = new THREE.Mesh(westHalfGeo, [
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(2).texture, roughness: 0.85, side: THREE.FrontSide }), // +x Interior
      this.outerBlackMaterial, // -x Exterior (Solid Black)
      this.outerBlackMaterial, // +y Top Cap
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
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(3).texture, roughness: 0.85, side: THREE.FrontSide }), // +x Interior
      this.outerBlackMaterial, // -x Exterior (Solid Black)
      this.outerBlackMaterial, // +y Top Cap
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    lowerWestMesh.position.set(-13.0, H / 2, 4.75);
    lowerWestMesh.receiveShadow = true;
    lowerWestMesh.userData = { sectionId: 3, name: 'Lower West Wall' };
    this.roomGroup.add(lowerWestMesh);
    this.wallMeshes[3] = lowerWestMesh;

    // Southwest Rounded Fillet (Outer Black, Inner Grey, Top Cap Black)
    this.buildCurvedFilletTwoTone(-9.5, 9.5, 3.5, Math.PI * 0.5, Math.PI, H, T);

    // -------------------------------------------------------------
    // 4. SOUTH WALL - FULLY CLOSED & SOLID (Exterior Solid Black)
    // -------------------------------------------------------------
    const southGeo = new THREE.BoxGeometry(22.5, H, T);
    const southMesh = new THREE.Mesh(southGeo, [
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial, // +y Top Cap Black
      this.outerBlackMaterial,
      this.outerBlackMaterial, // +z Exterior (Solid Black)
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(4).texture, roughness: 0.85, side: THREE.FrontSide }) // -z Interior
    ]);
    southMesh.position.set(1.75, H / 2, 13.0);
    southMesh.receiveShadow = true;
    southMesh.userData = { sectionId: 4, name: 'South Wall' };
    this.roomGroup.add(southMesh);
    this.wallMeshes[4] = southMesh;

    // South Entrance Vestibule Chamber
    this.buildEntranceVestibule(H, T);

    // -------------------------------------------------------------
    // 5. EAST WALL (Mid & Lower Segments with Portals, Exterior Black)
    // -------------------------------------------------------------
    // Mid-East Wall
    const midEastGeo = new THREE.BoxGeometry(T, H, 6.0);
    const midEastMesh = new THREE.Mesh(midEastGeo, [
      this.outerBlackMaterial, // +x Exterior (Solid Black)
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(5).texture, roughness: 0.85, side: THREE.FrontSide }), // -x Interior
      this.outerBlackMaterial, // +y Top Cap Black
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    midEastMesh.position.set(13.0, H / 2, -0.5);
    midEastMesh.receiveShadow = true;
    midEastMesh.userData = { sectionId: 5, name: 'East Wall (Mid Section)' };
    this.roomGroup.add(midEastMesh);
    this.wallMeshes[5] = midEastMesh;

    // Lower-East Wall
    const lowerEastGeo = new THREE.BoxGeometry(T, H, 7.0);
    const lowerEastMesh = new THREE.Mesh(lowerEastGeo, [
      this.outerBlackMaterial, // +x Exterior (Solid Black)
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(6).texture, roughness: 0.85, side: THREE.FrontSide }), // -x Interior
      this.outerBlackMaterial, // +y Top Cap Black
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

  /**
   * Builds curved corner fillet with 100% BLACK outer shell, GREY inner shell, and BLACK top cap
   */
  buildCurvedFilletTwoTone(cx, cz, radius, startAngle, endAngle, H, T) {
    const segments = 24;
    const rIn = radius - T / 2;
    const rOut = radius + T / 2;
    const angleStep = (endAngle - startAngle) / segments;

    const filletGroup = new THREE.Group();

    // 1. Outer Curved Shell (Facing OUTSIDE -> SOLID BLACK)
    const outerGeo = new THREE.BufferGeometry();
    const outerVertices = [];
    const outerNormals = [];
    const outerUvs = [];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + Math.cos(angle) * rOut;
      const z = cz + Math.sin(angle) * rOut;
      const nx = Math.cos(angle);
      const nz = Math.sin(angle);

      // Bottom vertex
      outerVertices.push(x, 0, z);
      outerNormals.push(nx, 0, nz);
      outerUvs.push(i / segments, 0);

      // Top vertex
      outerVertices.push(x, H, z);
      outerNormals.push(nx, 0, nz);
      outerUvs.push(i / segments, 1);
    }

    const outerIndices = [];
    for (let i = 0; i < segments; i++) {
      const b0 = i * 2;
      const t0 = i * 2 + 1;
      const b1 = (i + 1) * 2;
      const t1 = (i + 1) * 2 + 1;

      outerIndices.push(b0, t0, b1);
      outerIndices.push(b1, t0, t1);
    }

    outerGeo.setIndex(outerIndices);
    outerGeo.setAttribute('position', new THREE.Float32BufferAttribute(outerVertices, 3));
    outerGeo.setAttribute('normal', new THREE.Float32BufferAttribute(outerNormals, 3));
    outerGeo.setAttribute('uv', new THREE.Float32BufferAttribute(outerUvs, 2));

    const outerMesh = new THREE.Mesh(outerGeo, this.outerBlackMaterial);
    outerMesh.castShadow = true;
    filletGroup.add(outerMesh);

    // 2. Inner Curved Shell (Facing INSIDE -> GREY)
    const innerGeo = new THREE.BufferGeometry();
    const innerVertices = [];
    const innerNormals = [];
    const innerUvs = [];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + Math.cos(angle) * rIn;
      const z = cz + Math.sin(angle) * rIn;
      const nx = -Math.cos(angle);
      const nz = -Math.sin(angle);

      innerVertices.push(x, 0, z);
      innerNormals.push(nx, 0, nz);
      innerUvs.push(i / segments, 0);

      innerVertices.push(x, H, z);
      innerNormals.push(nx, 0, nz);
      innerUvs.push(i / segments, 1);
    }

    const innerIndices = [];
    for (let i = 0; i < segments; i++) {
      const b0 = i * 2;
      const t0 = i * 2 + 1;
      const b1 = (i + 1) * 2;
      const t1 = (i + 1) * 2 + 1;

      innerIndices.push(b0, b1, t0);
      innerIndices.push(b1, t1, t0);
    }

    innerGeo.setIndex(innerIndices);
    innerGeo.setAttribute('position', new THREE.Float32BufferAttribute(innerVertices, 3));
    innerGeo.setAttribute('normal', new THREE.Float32BufferAttribute(innerNormals, 3));
    innerGeo.setAttribute('uv', new THREE.Float32BufferAttribute(innerUvs, 2));

    const innerMesh = new THREE.Mesh(innerGeo, this.interiorGreyMaterial);
    innerMesh.receiveShadow = true;
    filletGroup.add(innerMesh);

    // 3. Top Cap (BLACK)
    const topCapGeo = new THREE.BufferGeometry();
    const topVertices = [];
    const topNormals = [];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep;
      const xOut = cx + Math.cos(angle) * rOut;
      const zOut = cz + Math.sin(angle) * rOut;
      const xIn = cx + Math.cos(angle) * rIn;
      const zIn = cz + Math.sin(angle) * rIn;

      topVertices.push(xOut, H, zOut);
      topNormals.push(0, 1, 0);
      topVertices.push(xIn, H, zIn);
      topNormals.push(0, 1, 0);
    }

    const topIndices = [];
    for (let i = 0; i < segments; i++) {
      const o0 = i * 2;
      const in0 = i * 2 + 1;
      const o1 = (i + 1) * 2;
      const in1 = (i + 1) * 2 + 1;

      topIndices.push(o0, o1, in0);
      topIndices.push(in0, o1, in1);
    }

    topCapGeo.setIndex(topIndices);
    topCapGeo.setAttribute('position', new THREE.Float32BufferAttribute(topVertices, 3));
    topCapGeo.setAttribute('normal', new THREE.Float32BufferAttribute(topNormals, 3));

    const topCapMesh = new THREE.Mesh(topCapGeo, this.outerBlackMaterial);
    filletGroup.add(topCapMesh);

    this.roomGroup.add(filletGroup);
  }

  buildEntranceVestibule(H, T) {
    const vestGroup = new THREE.Group();
    vestGroup.name = 'EntranceVestibule';

    const leftWallGeo = new THREE.BoxGeometry(T, H, 6.0);
    const leftWall = new THREE.Mesh(leftWallGeo, this.interiorGreyMaterial);
    leftWall.position.set(-2.0, H / 2, 10.0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    leftWall.userData = { sectionId: 11, name: 'South Entrance Vestibule' };
    vestGroup.add(leftWall);
    this.wallMeshes[11] = leftWall;

    const rightWallGeo = new THREE.BoxGeometry(T, H, 6.0);
    const rightWall = new THREE.Mesh(rightWallGeo, this.interiorGreyMaterial);
    rightWall.position.set(1.8, H / 2, 10.0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    vestGroup.add(rightWall);

    const doorGeo = new THREE.BoxGeometry(0.15, H * 0.85, 3.2);
    const door = new THREE.Mesh(doorGeo, this.interiorGreyMaterial);
    door.position.set(-2.8, (H * 0.85) / 2, 8.2);
    door.rotation.y = -Math.PI / 6;
    door.castShadow = true;
    vestGroup.add(door);

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

    // Back wall (Exterior Black)
    const bBack = new THREE.Mesh(new THREE.BoxGeometry(bSize, bHeight, bThickness), this.outerBlackMaterial);
    bBack.position.set(bx, bHeight / 2, bz + bSize / 2);
    boothGroup.add(bBack);

    // Right wall (Exterior Black)
    const bRight = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, bSize), this.outerBlackMaterial);
    bRight.position.set(bx + bSize / 2, bHeight / 2, bz);
    boothGroup.add(bRight);

    // Left wall (Interior Grey)
    const bLeft = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, bSize), this.interiorGreyMaterial);
    bLeft.position.set(bx - bSize / 2, bHeight / 2, bz);
    boothGroup.add(bLeft);

    // Front wall (Interior Grey)
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

    const northFinGeo = new THREE.BoxGeometry(T, H, 7.0);
    const northFin = new THREE.Mesh(northFinGeo, this.interiorGreyMaterial);
    northFin.position.set(0, H / 2, -9.5);
    northFin.castShadow = true;
    northFin.receiveShadow = true;
    northFin.userData = { sectionId: 8, name: 'North Partition Fin' };
    finsGroup.add(northFin);
    this.wallMeshes[8] = northFin;

    const westFinGeo = new THREE.BoxGeometry(7.0, H, T);
    const westFin = new THREE.Mesh(westFinGeo, this.interiorGreyMaterial);
    westFin.position.set(-9.5, H / 2, 0);
    westFin.castShadow = true;
    westFin.receiveShadow = true;
    westFin.userData = { sectionId: 9, name: 'West Partition Fin' };
    finsGroup.add(westFin);
    this.wallMeshes[9] = westFin;

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
