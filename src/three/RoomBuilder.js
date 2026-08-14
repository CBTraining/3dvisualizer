import * as THREE from 'three';

/**
 * Architectural Room Builder with exact inner partition fins and passage gaps
 * matching the user's annotated diagram:
 * - North partition split: Outer North fin + passage gap + Center-North stub fin
 * - West partition split: Outer West fin + passage gap + Center-West stub fin
 * - East partition: Continuous horizontal fin from East wall extending to center
 * - South Entrance Vestibule with angled door
 * - Solid watertight 3D walls, black exterior, grey interior, black centerpiece
 */
export class RoomBuilder {
  constructor(scene, wallTextureManager) {
    this.scene = scene;
    this.textureManager = wallTextureManager;

    this.params = {
      wallHeight: 9.0,
      wallThickness: 0.5,
      showCeilingTruss: true,
      showDimensions: true,
      floorMaterialType: 'grid-tile',
      interiorOpacity: 1.0,
      isTransparent: false
    };

    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'RoomGroup';
    this.scene.add(this.roomGroup);

    this.wallMeshes = {};
    this.interiorMaterials = [];

    // Colors
    this.colorInteriorGrey = 0x717882;
    this.colorBlack = 0x18191d;

    // Materials
    this.interiorGreyMaterial = new THREE.MeshStandardMaterial({
      color: this.colorInteriorGrey,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    this.interiorMaterials.push(this.interiorGreyMaterial);

    this.outerBlackMaterial = new THREE.MeshStandardMaterial({
      color: this.colorBlack,
      roughness: 0.9,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    this.doubleBlackMaterial = new THREE.MeshStandardMaterial({
      color: this.colorBlack,
      roughness: 0.9,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    this.centerpieceMaterial = new THREE.MeshStandardMaterial({
      color: this.colorBlack,
      roughness: 0.6,
      metalness: 0.15,
      side: THREE.DoubleSide
    });
    this.interiorMaterials.push(this.centerpieceMaterial);

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

    ctx.fillStyle = '#c5cbd4';
    ctx.fillRect(0, 0, 1024, 1024);

    const step = 64;
    ctx.strokeStyle = '#b2b8c2';
    ctx.lineWidth = 2;

    for (let i = 0; i <= 1024; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(1024, i); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
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
    this.interiorMaterials = [this.interiorGreyMaterial, this.centerpieceMaterial];

    const H = this.params.wallHeight;
    const T = this.params.wallThickness;
    const R = 5.5;
    const L = 13.5 - R; // 8.0 ft

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
    const plinth = new THREE.Mesh(plinthGeo, this.doubleBlackMaterial);
    plinth.position.set(0, -0.21, 0);
    this.roomGroup.add(plinth);

    // -------------------------------------------------------------
    // 2. NORTH WALL
    // -------------------------------------------------------------
    const northStraightLength = L * 2;
    const northGeo = new THREE.BoxGeometry(northStraightLength, H, T);
    const northInteriorMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(1).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(northInteriorMat);

    const northMesh = new THREE.Mesh(northGeo, [
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      northInteriorMat, // +z Interior
      this.outerBlackMaterial  // -z Exterior
    ]);
    northMesh.position.set(0, H / 2, -13.5);
    northMesh.receiveShadow = true;
    northMesh.userData = { sectionId: 1, name: 'North Wall' };
    this.roomGroup.add(northMesh);
    this.wallMeshes[1] = northMesh;

    // Northwest & Northeast Curved Corners
    this.buildWatertightCurvedCorner(-L, -L, R, Math.PI, Math.PI * 1.5, H, T);
    this.buildWatertightCurvedCorner(L, -L, R, Math.PI * 1.5, Math.PI * 1.88, H, T);

    // -------------------------------------------------------------
    // 3. WEST WALL
    // -------------------------------------------------------------
    const westGeo = new THREE.BoxGeometry(T, H, L);

    const upperWestMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(2).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(upperWestMat);

    const upperWestMesh = new THREE.Mesh(westGeo, [
      upperWestMat, // +x Interior
      this.outerBlackMaterial, // -x Exterior
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    upperWestMesh.position.set(-13.5, H / 2, -L / 2);
    upperWestMesh.receiveShadow = true;
    upperWestMesh.userData = { sectionId: 2, name: 'Upper West Wall' };
    this.roomGroup.add(upperWestMesh);
    this.wallMeshes[2] = upperWestMesh;

    const lowerWestMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(3).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(lowerWestMat);

    const lowerWestMesh = new THREE.Mesh(westGeo, [
      lowerWestMat, // +x Interior
      this.outerBlackMaterial, // -x Exterior
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    lowerWestMesh.position.set(-13.5, H / 2, L / 2);
    lowerWestMesh.receiveShadow = true;
    lowerWestMesh.userData = { sectionId: 3, name: 'Lower West Wall' };
    this.roomGroup.add(lowerWestMesh);
    this.wallMeshes[3] = lowerWestMesh;

    // Southwest Corner
    this.buildWatertightCurvedCorner(-L, L, R, Math.PI * 0.5, Math.PI, H, T);

    // -------------------------------------------------------------
    // 4. SOUTH WALL - FULLY CLOSED SOLID WALL
    // -------------------------------------------------------------
    const southLength = L + 13.5;
    const southGeo = new THREE.BoxGeometry(southLength, H, T);

    const southInteriorMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(4).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(southInteriorMat);

    const southMesh = new THREE.Mesh(southGeo, [
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial, // +z Exterior
      southInteriorMat // -z Interior
    ]);
    southMesh.position.set((-L + 13.5) / 2, H / 2, 13.5);
    southMesh.receiveShadow = true;
    southMesh.userData = { sectionId: 4, name: 'South Wall' };
    this.roomGroup.add(southMesh);
    this.wallMeshes[4] = southMesh;

    // South Entrance Vestibule
    this.buildEntranceVestibule(H, T);

    // -------------------------------------------------------------
    // 5. EAST WALL
    // -------------------------------------------------------------
    const midEastMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(5).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(midEastMat);

    const midEastMesh = new THREE.Mesh(new THREE.BoxGeometry(T, H, 6.0), [
      this.outerBlackMaterial, // +x Exterior
      midEastMat, // -x Interior
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    midEastMesh.position.set(13.5, H / 2, -0.5);
    midEastMesh.receiveShadow = true;
    midEastMesh.userData = { sectionId: 5, name: 'East Wall (Mid Section)' };
    this.roomGroup.add(midEastMesh);
    this.wallMeshes[5] = midEastMesh;

    const lowerEastMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(6).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(lowerEastMat);

    const lowerEastMesh = new THREE.Mesh(new THREE.BoxGeometry(T, H, 7.5), [
      this.outerBlackMaterial, // +x Exterior
      lowerEastMat, // -x Interior
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    lowerEastMesh.position.set(13.5, H / 2, 9.75);
    lowerEastMesh.receiveShadow = true;
    lowerEastMesh.userData = { sectionId: 6, name: 'East Wall (Lower / Booth)' };
    this.roomGroup.add(lowerEastMesh);
    this.wallMeshes[6] = lowerEastMesh;

    // Southeast Booth
    this.buildSoutheastBooth(H);

    // -------------------------------------------------------------
    // 6. CENTERPIECE COLUMN (Solid Black)
    // -------------------------------------------------------------
    this.buildCenterpiece(H);

    // -------------------------------------------------------------
    // 7. INNER PARTITION FINS WITH PASSAGE GAPS (Exact Match)
    // -------------------------------------------------------------
    this.buildPartitionFins(H, T);

    // -------------------------------------------------------------
    // 8. OVERHEAD TRUSS
    // -------------------------------------------------------------
    if (this.params.showCeilingTruss) {
      this.buildOverheadTruss(H);
    }
  }

  buildWatertightCurvedCorner(cx, cz, radius, startAngle, endAngle, H, T) {
    const segments = 32;
    const rIn = radius - T / 2;
    const rOut = radius + T / 2;
    const angleStep = (endAngle - startAngle) / segments;

    const cornerGroup = new THREE.Group();

    // 1. Outer Curved Shell (Solid Black)
    const outerGeo = new THREE.BufferGeometry();
    const outerVerts = [];
    const outerNorms = [];
    const outerUvs = [];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + Math.cos(angle) * rOut;
      const z = cz + Math.sin(angle) * rOut;
      outerVerts.push(x, 0, z);
      outerNorms.push(Math.cos(angle), 0, Math.sin(angle));
      outerUvs.push(i / segments, 0);

      outerVerts.push(x, H, z);
      outerNorms.push(Math.cos(angle), 0, Math.sin(angle));
      outerUvs.push(i / segments, 1);
    }

    const outerIndices = [];
    for (let i = 0; i < segments; i++) {
      const b0 = i * 2, t0 = i * 2 + 1, b1 = (i + 1) * 2, t1 = (i + 1) * 2 + 1;
      outerIndices.push(b0, t0, b1); outerIndices.push(b1, t0, t1);
    }

    outerGeo.setIndex(outerIndices);
    outerGeo.setAttribute('position', new THREE.Float32BufferAttribute(outerVerts, 3));
    outerGeo.setAttribute('normal', new THREE.Float32BufferAttribute(outerNorms, 3));
    outerGeo.setAttribute('uv', new THREE.Float32BufferAttribute(outerUvs, 2));

    const outerMesh = new THREE.Mesh(outerGeo, this.outerBlackMaterial);
    outerMesh.castShadow = true;
    cornerGroup.add(outerMesh);

    // 2. Inner Curved Shell (Grey)
    const innerGeo = new THREE.BufferGeometry();
    const innerVerts = [];
    const innerNorms = [];
    const innerUvs = [];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + Math.cos(angle) * rIn;
      const z = cz + Math.sin(angle) * rIn;
      innerVerts.push(x, 0, z);
      innerNorms.push(-Math.cos(angle), 0, -Math.sin(angle));
      innerUvs.push(i / segments, 0);

      innerVerts.push(x, H, z);
      innerNorms.push(-Math.cos(angle), 0, -Math.sin(angle));
      innerUvs.push(i / segments, 1);
    }

    const innerIndices = [];
    for (let i = 0; i < segments; i++) {
      const b0 = i * 2, t0 = i * 2 + 1, b1 = (i + 1) * 2, t1 = (i + 1) * 2 + 1;
      innerIndices.push(b0, b1, t0); innerIndices.push(b1, t1, t0);
    }

    innerGeo.setIndex(innerIndices);
    innerGeo.setAttribute('position', new THREE.Float32BufferAttribute(innerVerts, 3));
    innerGeo.setAttribute('normal', new THREE.Float32BufferAttribute(innerNorms, 3));
    innerGeo.setAttribute('uv', new THREE.Float32BufferAttribute(innerUvs, 2));

    const innerMesh = new THREE.Mesh(innerGeo, this.interiorGreyMaterial);
    innerMesh.receiveShadow = true;
    cornerGroup.add(innerMesh);

    // 3. Top Cap (Solid Black)
    const topGeo = new THREE.BufferGeometry();
    const topVerts = [];
    const topNorms = [];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep;
      topVerts.push(cx + Math.cos(angle) * rOut, H, cz + Math.sin(angle) * rOut);
      topNorms.push(0, 1, 0);
      topVerts.push(cx + Math.cos(angle) * rIn, H, cz + Math.sin(angle) * rIn);
      topNorms.push(0, 1, 0);
    }

    const topIndices = [];
    for (let i = 0; i < segments; i++) {
      const o0 = i * 2, in0 = i * 2 + 1, o1 = (i + 1) * 2, in1 = (i + 1) * 2 + 1;
      topIndices.push(o0, o1, in0); topIndices.push(in0, o1, in1);
    }

    topGeo.setIndex(topIndices);
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topVerts, 3));
    topGeo.setAttribute('normal', new THREE.Float32BufferAttribute(topNorms, 3));

    const topMesh = new THREE.Mesh(topGeo, this.doubleBlackMaterial);
    cornerGroup.add(topMesh);

    // 4. Start Jamb
    const sOutX = cx + Math.cos(startAngle) * rOut;
    const sOutZ = cz + Math.sin(startAngle) * rOut;
    const sInX = cx + Math.cos(startAngle) * rIn;
    const sInZ = cz + Math.sin(startAngle) * rIn;

    const startJambGeo = new THREE.BufferGeometry();
    startJambGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      sOutX, 0, sOutZ,
      sInX, 0, sInZ,
      sInX, H, sInZ,
      sOutX, H, sOutZ
    ], 3));
    startJambGeo.setIndex([0, 1, 2, 0, 2, 3]);
    startJambGeo.computeVertexNormals();
    const startJambMesh = new THREE.Mesh(startJambGeo, this.doubleBlackMaterial);
    cornerGroup.add(startJambMesh);

    // 5. End Jamb (Doorway Closure)
    const eOutX = cx + Math.cos(endAngle) * rOut;
    const eOutZ = cz + Math.sin(endAngle) * rOut;
    const eInX = cx + Math.cos(endAngle) * rIn;
    const eInZ = cz + Math.sin(endAngle) * rIn;

    const endJambGeo = new THREE.BufferGeometry();
    endJambGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      eOutX, 0, eOutZ,
      eInX, 0, eInZ,
      eInX, H, eInZ,
      eOutX, H, eOutZ
    ], 3));
    endJambGeo.setIndex([0, 2, 1, 0, 3, 2]);
    endJambGeo.computeVertexNormals();
    const endJambMesh = new THREE.Mesh(endJambGeo, this.doubleBlackMaterial);
    cornerGroup.add(endJambMesh);

    this.roomGroup.add(cornerGroup);
  }

  buildEntranceVestibule(H, T) {
    const vestGroup = new THREE.Group();
    vestGroup.name = 'EntranceVestibule';

    const leftWallGeo = new THREE.BoxGeometry(T, H, 6.3);
    const leftWall = new THREE.Mesh(leftWallGeo, this.interiorGreyMaterial);
    leftWall.position.set(-2.0, H / 2, 10.35);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    leftWall.userData = { sectionId: 11, name: 'South Entrance Vestibule' };
    vestGroup.add(leftWall);
    this.wallMeshes[11] = leftWall;

    const rightWallGeo = new THREE.BoxGeometry(T, H, 6.3);
    const rightWall = new THREE.Mesh(rightWallGeo, this.interiorGreyMaterial);
    rightWall.position.set(1.8, H / 2, 10.35);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    vestGroup.add(rightWall);

    const doorGeo = new THREE.BoxGeometry(0.15, H * 0.85, 3.2);
    const door = new THREE.Mesh(doorGeo, this.interiorGreyMaterial);
    door.position.set(-2.8, (H * 0.85) / 2, 8.4);
    door.rotation.y = -Math.PI / 6;
    door.castShadow = true;
    vestGroup.add(door);

    const lintelGeo = new THREE.BoxGeometry(4.0, 0.6, T);
    const lintel = new THREE.Mesh(lintelGeo, this.interiorGreyMaterial);
    lintel.position.set(-0.1, H - 0.3, 7.2);
    vestGroup.add(lintel);

    this.roomGroup.add(vestGroup);
  }

  buildSoutheastBooth(H) {
    const boothGroup = new THREE.Group();
    boothGroup.name = 'SoutheastBooth';

    const bSize = 4.4;
    const bHeight = 7.5;
    const bThickness = 0.35;
    const bx = 10.2;
    const bz = 10.5;

    const bBack = new THREE.Mesh(new THREE.BoxGeometry(bSize, bHeight, bThickness), this.outerBlackMaterial);
    bBack.position.set(bx, bHeight / 2, bz + bSize / 2);
    boothGroup.add(bBack);

    const bRight = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, bSize), this.outerBlackMaterial);
    bRight.position.set(bx + bSize / 2, bHeight / 2, bz);
    boothGroup.add(bRight);

    const bLeft = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, bSize), this.interiorGreyMaterial);
    bLeft.position.set(bx - bSize / 2, bHeight / 2, bz);
    boothGroup.add(bLeft);

    const bFront = new THREE.Mesh(new THREE.BoxGeometry(bSize, bHeight, bThickness), this.interiorGreyMaterial);
    bFront.position.set(bx, bHeight / 2, bz - bSize / 2);
    boothGroup.add(bFront);

    const rimGeo = new THREE.BoxGeometry(bSize + 0.1, 0.3, bSize + 0.1);
    const rim = new THREE.Mesh(rimGeo, this.boothRimMaterial);
    rim.position.set(bx, bHeight + 0.15, bz);
    boothGroup.add(rim);

    this.roomGroup.add(boothGroup);
  }

  buildCenterpiece(H) {
    const islandGroup = new THREE.Group();
    islandGroup.name = 'Centerpiece';

    const size = 4.8;
    const r = 1.0;
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

    const centerInteriorMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(7).texture,
      roughness: 0.5,
      metalness: 0.15,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity,
      side: THREE.DoubleSide
    });
    this.interiorMaterials.push(centerInteriorMat);

    const islandMesh = new THREE.Mesh(geom, [
      centerInteriorMat,
      this.centerpieceMaterial
    ]);
    islandMesh.rotation.x = Math.PI / 2;
    islandMesh.position.y = H;
    islandMesh.receiveShadow = true;
    islandMesh.castShadow = true;
    islandMesh.userData = { sectionId: 7, name: 'Centerpiece Island Column' };
    islandGroup.add(islandMesh);
    this.wallMeshes[7] = islandMesh;

    const topRimGeo = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2.5 });
    const line = new THREE.LineSegments(topRimGeo, lineMat);
    line.rotation.x = Math.PI / 2;
    line.position.y = H + 0.05;
    islandGroup.add(line);

    this.roomGroup.add(islandGroup);
  }

  /**
   * Builds the exact inner partition fins with passage gaps matching the user's diagram:
   * 1. North Spoke: Outer fin attached to North wall + passage gap + Center-North stub fin
   * 2. West Spoke: Outer fin attached to West wall + passage gap + Center-West stub fin
   * 3. East Spoke: Continuous long fin spanning from East wall leftward toward center
   */
  buildPartitionFins(H, T) {
    const finsGroup = new THREE.Group();
    finsGroup.name = 'PartitionFins';

    // -------------------------------------------------------------
    // NORTH SPOKE (Split into 2 segments with passage gap)
    // -------------------------------------------------------------
    // Segment 1: Attached to North wall (z from -13.5 to -9.0, length 4.5ft)
    const northOuterGeo = new THREE.BoxGeometry(T, H, 4.5);
    const northOuterFin = new THREE.Mesh(northOuterGeo, this.interiorGreyMaterial);
    northOuterFin.position.set(0, H / 2, -11.25);
    northOuterFin.castShadow = true;
    northOuterFin.receiveShadow = true;
    northOuterFin.userData = { sectionId: 8, name: 'North Partition Fin (Outer)' };
    finsGroup.add(northOuterFin);
    this.wallMeshes[8] = northOuterFin;

    // Segment 2: Attached to Centerpiece (z from -5.0 to -2.4, length 2.6ft)
    const northCenterGeo = new THREE.BoxGeometry(T, H, 2.6);
    const northCenterFin = new THREE.Mesh(northCenterGeo, this.interiorGreyMaterial);
    northCenterFin.position.set(0, H / 2, -3.7);
    northCenterFin.castShadow = true;
    northCenterFin.receiveShadow = true;
    finsGroup.add(northCenterFin);

    // -------------------------------------------------------------
    // WEST SPOKE (Split into 2 segments with passage gap)
    // -------------------------------------------------------------
    // Segment 1: Attached to West wall (x from -13.5 to -9.0, length 4.5ft)
    const westOuterGeo = new THREE.BoxGeometry(4.5, H, T);
    const westOuterFin = new THREE.Mesh(westOuterGeo, this.interiorGreyMaterial);
    westOuterFin.position.set(-11.25, H / 2, 0);
    westOuterFin.castShadow = true;
    westOuterFin.receiveShadow = true;
    westOuterFin.userData = { sectionId: 9, name: 'West Partition Fin (Outer)' };
    finsGroup.add(westOuterFin);
    this.wallMeshes[9] = westOuterFin;

    // Segment 2: Attached to Centerpiece (x from -5.0 to -2.4, length 2.6ft)
    const westCenterGeo = new THREE.BoxGeometry(2.6, H, T);
    const westCenterFin = new THREE.Mesh(westCenterGeo, this.interiorGreyMaterial);
    westCenterFin.position.set(-3.7, H / 2, 0);
    westCenterFin.castShadow = true;
    westCenterFin.receiveShadow = true;
    finsGroup.add(westCenterFin);

    // -------------------------------------------------------------
    // EAST SPOKE (Continuous long fin spanning to center)
    // -------------------------------------------------------------
    // Spanning from x = +13.5 extending left to x = +4.5 (length 9.0ft) at z = -0.5
    const eastFinGeo = new THREE.BoxGeometry(9.0, H, T);
    const eastFin = new THREE.Mesh(eastFinGeo, this.interiorGreyMaterial);
    eastFin.position.set(9.0, H / 2, -0.5);
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

  setInteriorOpacity(val) {
    this.params.interiorOpacity = val;
    this.params.isTransparent = val < 0.99;

    const isTrans = val < 0.99;
    for (const mat of this.interiorMaterials) {
      if (mat) {
        mat.transparent = isTrans;
        mat.opacity = val;
        mat.depthWrite = !isTrans || val > 0.4;
        mat.needsUpdate = true;
      }
    }
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
