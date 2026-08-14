import * as THREE from 'three';

/**
 * Architectural Room Builder with precise floorplan geometry matching Reference Diagram:
 * - Wide, smooth continuous curved corners (NW, NE, SW)
 * - Continuous solid black outer shell enclosing the entire perimeter without gaps
 * - Clean architectural grey interior surfaces
 * - Centerpiece island column (Black with white top rim)
 * - Interior partition fins (North, West, East) & South Vestibule
 * - Southeast booth with white rim
 * - Distinct contrasting light grey floor
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
      floorMaterialType: 'grid-tile'
    };

    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'RoomGroup';
    this.scene.add(this.roomGroup);

    this.wallMeshes = {};

    // Colors
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

    // Light neutral studio grey floor matching reference
    ctx.fillStyle = '#c5cbd4';
    ctx.fillRect(0, 0, 1024, 1024);

    const step = 64;
    ctx.strokeStyle = '#b2b8c2';
    ctx.lineWidth = 2;

    for (let i = 0; i <= 1024; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
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

    const H = this.params.wallHeight;
    const T = this.params.wallThickness;

    // Room coordinate boundaries:
    // North: z = -13.5
    // South: z = +13.5
    // West:  x = -13.5
    // East:  x = +13.5
    // Fillet corner radius matching reference: R = 5.5 ft
    const R = 5.5;
    const L = 13.5 - R; // 8.0 ft straight segment center offset

    // -------------------------------------------------------------
    // 1. FLOOR & OUTER BASE PLINTH
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
    // 2. NORTH WALL (Straight central span from x: -8.0 to +8.0 at z: -13.5)
    // -------------------------------------------------------------
    const northStraightLength = L * 2; // 16.0 ft
    const northGeo = new THREE.BoxGeometry(northStraightLength, H, T);
    const northMesh = new THREE.Mesh(northGeo, [
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial, // Top cap
      this.outerBlackMaterial,
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(1).texture, roughness: 0.85, side: THREE.FrontSide }), // +z Interior
      this.outerBlackMaterial  // -z Exterior (Black)
    ]);
    northMesh.position.set(0, H / 2, -13.5);
    northMesh.receiveShadow = true;
    northMesh.userData = { sectionId: 1, name: 'North Wall' };
    this.roomGroup.add(northMesh);
    this.wallMeshes[1] = northMesh;

    // -------------------------------------------------------------
    // 3. NORTHWEST CORNER (Continuous broad curve from North to West)
    // -------------------------------------------------------------
    this.buildSmoothCurvedCorner(-L, -L, R, Math.PI, Math.PI * 1.5, H, T);

    // -------------------------------------------------------------
    // 4. NORTHEAST CORNER (Continuous broad curve from North to East Entrance)
    // -------------------------------------------------------------
    this.buildSmoothCurvedCorner(L, -L, R, Math.PI * 1.5, Math.PI * 1.88, H, T);

    // -------------------------------------------------------------
    // 5. WEST WALL (Upper & Lower straight sections between NW and SW curves)
    // -------------------------------------------------------------
    const westSegmentLength = L; // 8.0 ft each
    const westGeo = new THREE.BoxGeometry(T, H, westSegmentLength);

    // Upper West Wall (z from -8.0 to 0)
    const upperWestMesh = new THREE.Mesh(westGeo, [
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(2).texture, roughness: 0.85, side: THREE.FrontSide }), // +x Interior
      this.outerBlackMaterial, // -x Exterior (Black)
      this.outerBlackMaterial, // Top cap
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    upperWestMesh.position.set(-13.5, H / 2, -L / 2);
    upperWestMesh.receiveShadow = true;
    upperWestMesh.userData = { sectionId: 2, name: 'Upper West Wall' };
    this.roomGroup.add(upperWestMesh);
    this.wallMeshes[2] = upperWestMesh;

    // Lower West Wall (z from 0 to +8.0)
    const lowerWestMesh = new THREE.Mesh(westGeo, [
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(3).texture, roughness: 0.85, side: THREE.FrontSide }), // +x Interior
      this.outerBlackMaterial, // -x Exterior (Black)
      this.outerBlackMaterial, // Top cap
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    lowerWestMesh.position.set(-13.5, H / 2, L / 2);
    lowerWestMesh.receiveShadow = true;
    lowerWestMesh.userData = { sectionId: 3, name: 'Lower West Wall' };
    this.roomGroup.add(lowerWestMesh);
    this.wallMeshes[3] = lowerWestMesh;

    // -------------------------------------------------------------
    // 6. SOUTHWEST CORNER (Continuous broad curve from West to South)
    // -------------------------------------------------------------
    this.buildSmoothCurvedCorner(-L, L, R, Math.PI * 0.5, Math.PI, H, T);

    // -------------------------------------------------------------
    // 7. SOUTH WALL - FULLY CLOSED SOLID WALL (x: -8.0 to +13.5 at z: +13.5)
    // -------------------------------------------------------------
    const southLength = L + 13.5; // 21.5 ft solid span
    const southGeo = new THREE.BoxGeometry(southLength, H, T);
    const southMesh = new THREE.Mesh(southGeo, [
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial, // Top cap
      this.outerBlackMaterial,
      this.outerBlackMaterial, // +z Exterior (Solid Black)
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(4).texture, roughness: 0.85, side: THREE.FrontSide }) // -z Interior
    ]);
    southMesh.position.set((-L + 13.5) / 2, H / 2, 13.5);
    southMesh.receiveShadow = true;
    southMesh.userData = { sectionId: 4, name: 'South Wall' };
    this.roomGroup.add(southMesh);
    this.wallMeshes[4] = southMesh;

    // South Entrance Vestibule Chamber
    this.buildEntranceVestibule(H, T);

    // -------------------------------------------------------------
    // 8. EAST WALL (Mid & Lower Segments, Open Portals, Exterior Black)
    // -------------------------------------------------------------
    // Mid-East Wall (z: -3.5 to +2.5)
    const midEastGeo = new THREE.BoxGeometry(T, H, 6.0);
    const midEastMesh = new THREE.Mesh(midEastGeo, [
      this.outerBlackMaterial, // +x Exterior (Black)
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(5).texture, roughness: 0.85, side: THREE.FrontSide }), // -x Interior
      this.outerBlackMaterial, // Top cap
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    midEastMesh.position.set(13.5, H / 2, -0.5);
    midEastMesh.receiveShadow = true;
    midEastMesh.userData = { sectionId: 5, name: 'East Wall (Mid Section)' };
    this.roomGroup.add(midEastMesh);
    this.wallMeshes[5] = midEastMesh;

    // Lower-East Wall (z: +6.0 to +13.5)
    const lowerEastGeo = new THREE.BoxGeometry(T, H, 7.5);
    const lowerEastMesh = new THREE.Mesh(lowerEastGeo, [
      this.outerBlackMaterial, // +x Exterior (Black)
      new THREE.MeshStandardMaterial({ map: this.textureManager.getSection(6).texture, roughness: 0.85, side: THREE.FrontSide }), // -x Interior
      this.outerBlackMaterial, // Top cap
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    lowerEastMesh.position.set(13.5, H / 2, 9.75);
    lowerEastMesh.receiveShadow = true;
    lowerEastMesh.userData = { sectionId: 6, name: 'East Wall (Lower / Booth)' };
    this.roomGroup.add(lowerEastMesh);
    this.wallMeshes[6] = lowerEastMesh;

    // Southeast Square Booth Enclosure
    this.buildSoutheastBooth(H);

    // -------------------------------------------------------------
    // 9. CENTERPIECE COLUMN (Solid Black with white top rim)
    // -------------------------------------------------------------
    this.buildCenterpiece(H);

    // -------------------------------------------------------------
    // 10. RADIAL PARTITION FINS (Interior Grey)
    // -------------------------------------------------------------
    this.buildPartitionFins(H, T);

    // -------------------------------------------------------------
    // 11. OVERHEAD TRUSS
    // -------------------------------------------------------------
    if (this.params.showCeilingTruss) {
      this.buildOverheadTruss(H);
    }
  }

  /**
   * Builds broad, smooth continuous curved corners:
   * - Outer curved surface: 100% Solid Black
   * - Inner curved surface: Clean Interior Grey
   * - Top cap: Solid Black
   */
  buildSmoothCurvedCorner(cx, cz, radius, startAngle, endAngle, H, T) {
    const segments = 32;
    const rIn = radius - T / 2;
    const rOut = radius + T / 2;
    const angleStep = (endAngle - startAngle) / segments;

    const cornerGroup = new THREE.Group();

    // 1. Outer Curved Shell (Facing Outside -> Solid Black)
    const outerGeo = new THREE.BufferGeometry();
    const outerVerts = [];
    const outerNorms = [];
    const outerUvs = [];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + Math.cos(angle) * rOut;
      const z = cz + Math.sin(angle) * rOut;
      const nx = Math.cos(angle);
      const nz = Math.sin(angle);

      outerVerts.push(x, 0, z);
      outerNorms.push(nx, 0, nz);
      outerUvs.push(i / segments, 0);

      outerVerts.push(x, H, z);
      outerNorms.push(nx, 0, nz);
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
    outerGeo.setAttribute('position', new THREE.Float32BufferAttribute(outerVerts, 3));
    outerGeo.setAttribute('normal', new THREE.Float32BufferAttribute(outerNorms, 3));
    outerGeo.setAttribute('uv', new THREE.Float32BufferAttribute(outerUvs, 2));

    const outerMesh = new THREE.Mesh(outerGeo, this.outerBlackMaterial);
    outerMesh.castShadow = true;
    cornerGroup.add(outerMesh);

    // 2. Inner Curved Shell (Facing Inside -> Clean Grey)
    const innerGeo = new THREE.BufferGeometry();
    const innerVerts = [];
    const innerNorms = [];
    const innerUvs = [];

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + Math.cos(angle) * rIn;
      const z = cz + Math.sin(angle) * rIn;
      const nx = -Math.cos(angle);
      const nz = -Math.sin(angle);

      innerVerts.push(x, 0, z);
      innerNorms.push(nx, 0, nz);
      innerUvs.push(i / segments, 0);

      innerVerts.push(x, H, z);
      innerNorms.push(nx, 0, nz);
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
      const xOut = cx + Math.cos(angle) * rOut;
      const zOut = cz + Math.sin(angle) * rOut;
      const xIn = cx + Math.cos(angle) * rIn;
      const zIn = cz + Math.sin(angle) * rIn;

      topVerts.push(xOut, H, zOut);
      topNorms.push(0, 1, 0);
      topVerts.push(xIn, H, zIn);
      topNorms.push(0, 1, 0);
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

    topGeo.setIndex(topIndices);
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topVerts, 3));
    topGeo.setAttribute('normal', new THREE.Float32BufferAttribute(topNorms, 3));

    const topMesh = new THREE.Mesh(topGeo, this.doubleBlackMaterial);
    cornerGroup.add(topMesh);

    this.roomGroup.add(cornerGroup);
  }

  buildEntranceVestibule(H, T) {
    const vestGroup = new THREE.Group();
    vestGroup.name = 'EntranceVestibule';

    // Left Vestibule Wall (x = -2.0, z from 13.5 to 7.2)
    const leftWallGeo = new THREE.BoxGeometry(T, H, 6.3);
    const leftWall = new THREE.Mesh(leftWallGeo, this.interiorGreyMaterial);
    leftWall.position.set(-2.0, H / 2, 10.35);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    leftWall.userData = { sectionId: 11, name: 'South Entrance Vestibule' };
    vestGroup.add(leftWall);
    this.wallMeshes[11] = leftWall;

    // Right Vestibule Wall (x = +1.8, z from 13.5 to 7.2)
    const rightWallGeo = new THREE.BoxGeometry(T, H, 6.3);
    const rightWall = new THREE.Mesh(rightWallGeo, this.interiorGreyMaterial);
    rightWall.position.set(1.8, H / 2, 10.35);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    vestGroup.add(rightWall);

    // Inward Angled Swinging Door
    const doorGeo = new THREE.BoxGeometry(0.15, H * 0.85, 3.2);
    const door = new THREE.Mesh(doorGeo, this.interiorGreyMaterial);
    door.position.set(-2.8, (H * 0.85) / 2, 8.4);
    door.rotation.y = -Math.PI / 6;
    door.castShadow = true;
    vestGroup.add(door);

    // Inward Top lintel connector
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

    // Top White Rim Border (matching reference image)
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
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2.5 });
    const line = new THREE.LineSegments(topRimGeo, lineMat);
    line.rotation.x = Math.PI / 2;
    line.position.y = H + 0.05;
    islandGroup.add(line);

    this.roomGroup.add(islandGroup);
  }

  buildPartitionFins(H, T) {
    const finsGroup = new THREE.Group();
    finsGroup.name = 'PartitionFins';

    // 1. North Partition Fin (from z = -13.5 extending down to z = -6.2)
    const northFinGeo = new THREE.BoxGeometry(T, H, 7.3);
    const northFin = new THREE.Mesh(northFinGeo, this.interiorGreyMaterial);
    northFin.position.set(0, H / 2, -9.85);
    northFin.castShadow = true;
    northFin.receiveShadow = true;
    northFin.userData = { sectionId: 8, name: 'North Partition Fin' };
    finsGroup.add(northFin);
    this.wallMeshes[8] = northFin;

    // 2. West Partition Fin (from x = -13.5 extending right to x = -6.2)
    const westFinGeo = new THREE.BoxGeometry(7.3, H, T);
    const westFin = new THREE.Mesh(westFinGeo, this.interiorGreyMaterial);
    westFin.position.set(-9.85, H / 2, 0);
    westFin.castShadow = true;
    westFin.receiveShadow = true;
    westFin.userData = { sectionId: 9, name: 'West Partition Fin' };
    finsGroup.add(westFin);
    this.wallMeshes[9] = westFin;

    // 3. East Partition Fin (from x = +13.5 extending left to x = +6.2)
    const eastFinGeo = new THREE.BoxGeometry(7.3, H, T);
    const eastFin = new THREE.Mesh(eastFinGeo, this.interiorGreyMaterial);
    eastFin.position.set(9.85, H / 2, -0.5);
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
