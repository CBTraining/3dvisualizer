import * as THREE from 'three';

/**
 * Architectural Room Builder:
 * - ALL interior wall faces (all 4 quadrant room corner walls, centerpiece sides, partition fins, 
 *   vestibule, and booth) are textured and mapped to high-res canvases with correct UV orientation.
 * - ALL exterior faces and top caps are solid black.
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

    // Static materials
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

    this.doubleBlackMaterial = new THREE.MeshStandardMaterial({
      color: this.colorBlack,
      roughness: 0.9,
      metalness: 0.08,
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
    this.interiorMaterials = [];

    const H = this.params.wallHeight;
    const T = this.params.wallThickness;
    const R = 5.5;
    const L = 13.5 - R; // 8.0 ft

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
    // 2. QUADRANT 1: NORTH-WEST ROOM CONTINUOUS CORNER WALL (Section 1)
    // -------------------------------------------------------------
    const nwPath = [];
    const stepsLine = 12;
    for (let i = 0; i <= stepsLine; i++) {
      const t = i / stepsLine;
      nwPath.push(new THREE.Vector2(-13.5, 0 + t * (-L - 0)));
    }
    const stepsArc = 24;
    for (let i = 1; i <= stepsArc; i++) {
      const angle = Math.PI + (i / stepsArc) * (Math.PI * 0.5);
      nwPath.push(new THREE.Vector2(-L + Math.cos(angle) * R, -L + Math.sin(angle) * R));
    }
    for (let i = 1; i <= stepsLine; i++) {
      const t = i / stepsLine;
      nwPath.push(new THREE.Vector2(-L + t * (0 - (-L)), -13.5));
    }
    this.buildContinuousRibbonWall(nwPath, 1, 'North-West Room Wall', H, T);

    // -------------------------------------------------------------
    // 3. QUADRANT 2: NORTH-EAST ROOM CONTINUOUS CORNER WALL (Section 2)
    // -------------------------------------------------------------
    const nePath = [];
    for (let i = 0; i <= stepsLine; i++) {
      const t = i / stepsLine;
      nePath.push(new THREE.Vector2(0 + t * L, -13.5));
    }
    const stepsNeArc = 20;
    for (let i = 1; i <= stepsNeArc; i++) {
      const angle = Math.PI * 1.5 + (i / stepsNeArc) * (Math.PI * 0.38);
      nePath.push(new THREE.Vector2(L + Math.cos(angle) * R, -L + Math.sin(angle) * R));
    }
    this.buildContinuousRibbonWall(nePath, 2, 'North-East Room Wall', H, T);

    // -------------------------------------------------------------
    // 4. QUADRANT 3: SOUTH-WEST ROOM CONTINUOUS CORNER WALL (Section 3)
    // -------------------------------------------------------------
    const swPath = [];
    for (let i = 0; i <= stepsLine; i++) {
      const t = i / stepsLine;
      swPath.push(new THREE.Vector2(-13.5, 0 + t * L));
    }
    for (let i = 1; i <= stepsArc; i++) {
      const angle = Math.PI - (i / stepsArc) * (Math.PI * 0.5);
      swPath.push(new THREE.Vector2(-L + Math.cos(angle) * R, L + Math.sin(angle) * R));
    }
    const stepsSouth = 10;
    for (let i = 1; i <= stepsSouth; i++) {
      const t = i / stepsSouth;
      swPath.push(new THREE.Vector2(-L + t * (-2.0 - (-L)), 13.5));
    }
    this.buildContinuousRibbonWall(swPath, 3, 'South-West Room Wall', H, T);

    // -------------------------------------------------------------
    // 5. QUADRANT 4: SOUTH-EAST ROOM & ENTRY WALL (Section 4)
    // -------------------------------------------------------------
    this.buildSouthEastWall(H, T);

    // -------------------------------------------------------------
    // 6. CENTERPIECE COLUMN (Section 5)
    // -------------------------------------------------------------
    this.buildCenterpiece(H);

    // -------------------------------------------------------------
    // 7. INNER PARTITION FINS (Sections 6, 7, 8)
    // -------------------------------------------------------------
    this.buildPartitionFins(H, T);

    // -------------------------------------------------------------
    // 8. SOUTH ENTRANCE VESTIBULE (Section 9)
    // -------------------------------------------------------------
    this.buildEntranceVestibule(H, T);

    // -------------------------------------------------------------
    // 9. OVERHEAD TRUSS
    // -------------------------------------------------------------
    if (this.params.showCeilingTruss) {
      this.buildOverheadTruss(H);
    }
  }

  buildContinuousRibbonWall(pathPoints, sectionId, sectionName, H, T) {
    const N = pathPoints.length;
    const group = new THREE.Group();
    group.name = `Wall_${sectionId}_${sectionName}`;

    const arcLengths = [0];
    let totalLen = 0;
    for (let i = 1; i < N; i++) {
      const dist = pathPoints[i].distanceTo(pathPoints[i - 1]);
      totalLen += dist;
      arcLengths.push(totalLen);
    }

    const normals = [];
    for (let i = 0; i < N; i++) {
      let dx = 0, dz = 0;
      if (i === 0) {
        dx = pathPoints[1].x - pathPoints[0].x;
        dz = pathPoints[1].y - pathPoints[0].y;
      } else if (i === N - 1) {
        dx = pathPoints[N - 1].x - pathPoints[N - 2].x;
        dz = pathPoints[N - 1].y - pathPoints[N - 2].y;
      } else {
        dx = pathPoints[i + 1].x - pathPoints[i - 1].x;
        dz = pathPoints[i + 1].y - pathPoints[i - 1].y;
      }
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      normals.push(new THREE.Vector2(-dz, dx));
    }

    const innerPts = [];
    const outerPts = [];
    const halfT = T / 2;

    for (let i = 0; i < N; i++) {
      const p = pathPoints[i];
      const n = normals[i];
      innerPts.push(new THREE.Vector2(p.x - n.x * halfT, p.y - n.y * halfT));
      outerPts.push(new THREE.Vector2(p.x + n.x * halfT, p.y + n.y * halfT));
    }

    // Interior Surface (Textured)
    const innerGeo = new THREE.BufferGeometry();
    const innerVerts = [];
    const innerNorms = [];
    const innerUvs = [];

    for (let i = 0; i < N; i++) {
      const p = innerPts[i];
      const n = normals[i];
      const u = arcLengths[i] / totalLen;

      innerVerts.push(p.x, 0, p.y);
      innerNorms.push(-n.x, 0, -n.y);
      innerUvs.push(u, 0);

      innerVerts.push(p.x, H, p.y);
      innerNorms.push(-n.x, 0, -n.y);
      innerUvs.push(u, 1);
    }

    const innerIndices = [];
    for (let i = 0; i < N - 1; i++) {
      const b0 = i * 2, t0 = i * 2 + 1, b1 = (i + 1) * 2, t1 = (i + 1) * 2 + 1;
      innerIndices.push(b0, b1, t0);
      innerIndices.push(b1, t1, t0);
    }

    innerGeo.setIndex(innerIndices);
    innerGeo.setAttribute('position', new THREE.Float32BufferAttribute(innerVerts, 3));
    innerGeo.setAttribute('normal', new THREE.Float32BufferAttribute(innerNorms, 3));
    innerGeo.setAttribute('uv', new THREE.Float32BufferAttribute(innerUvs, 2));

    const innerMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(sectionId).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(innerMat);

    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.receiveShadow = true;
    innerMesh.userData = { sectionId, name: sectionName };
    group.add(innerMesh);
    this.wallMeshes[sectionId] = innerMesh;

    // Exterior Surface (Solid Black)
    const outerGeo = new THREE.BufferGeometry();
    const outerVerts = [];
    const outerNorms = [];
    const outerUvs = [];

    for (let i = 0; i < N; i++) {
      const p = outerPts[i];
      const n = normals[i];
      const u = arcLengths[i] / totalLen;

      outerVerts.push(p.x, 0, p.y);
      outerNorms.push(n.x, 0, n.y);
      outerUvs.push(u, 0);

      outerVerts.push(p.x, H, p.y);
      outerNorms.push(n.x, 0, n.y);
      outerUvs.push(u, 1);
    }

    const outerIndices = [];
    for (let i = 0; i < N - 1; i++) {
      const b0 = i * 2, t0 = i * 2 + 1, b1 = (i + 1) * 2, t1 = (i + 1) * 2 + 1;
      outerIndices.push(b0, t0, b1);
      outerIndices.push(b1, t0, t1);
    }

    outerGeo.setIndex(outerIndices);
    outerGeo.setAttribute('position', new THREE.Float32BufferAttribute(outerVerts, 3));
    outerGeo.setAttribute('normal', new THREE.Float32BufferAttribute(outerNorms, 3));
    outerGeo.setAttribute('uv', new THREE.Float32BufferAttribute(outerUvs, 2));

    const outerMesh = new THREE.Mesh(outerGeo, this.outerBlackMaterial);
    outerMesh.castShadow = true;
    group.add(outerMesh);

    // Top Cap (Solid Black)
    const topGeo = new THREE.BufferGeometry();
    const topVerts = [];
    const topNorms = [];

    for (let i = 0; i < N; i++) {
      const outP = outerPts[i];
      const inP = innerPts[i];
      topVerts.push(outP.x, H, outP.y);
      topNorms.push(0, 1, 0);
      topVerts.push(inP.x, H, inP.y);
      topNorms.push(0, 1, 0);
    }

    const topIndices = [];
    for (let i = 0; i < N - 1; i++) {
      const o0 = i * 2, in0 = i * 2 + 1, o1 = (i + 1) * 2, in1 = (i + 1) * 2 + 1;
      topIndices.push(o0, o1, in0);
      topIndices.push(in0, o1, in1);
    }

    topGeo.setIndex(topIndices);
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topVerts, 3));
    topGeo.setAttribute('normal', new THREE.Float32BufferAttribute(topNorms, 3));

    group.add(new THREE.Mesh(topGeo, this.doubleBlackMaterial));

    // Jambs
    const sOut = outerPts[0], sIn = innerPts[0];
    const startJambGeo = new THREE.BufferGeometry();
    startJambGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      sOut.x, 0, sOut.y, sIn.x, 0, sIn.y, sIn.x, H, sIn.y, sOut.x, H, sOut.y
    ], 3));
    startJambGeo.setIndex([0, 1, 2, 0, 2, 3]);
    startJambGeo.computeVertexNormals();
    group.add(new THREE.Mesh(startJambGeo, this.doubleBlackMaterial));

    const eOut = outerPts[N - 1], eIn = innerPts[N - 1];
    const endJambGeo = new THREE.BufferGeometry();
    endJambGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      eOut.x, 0, eOut.y, eIn.x, 0, eIn.y, eIn.x, H, eIn.y, eOut.x, H, eOut.y
    ], 3));
    endJambGeo.setIndex([0, 2, 1, 0, 3, 2]);
    endJambGeo.computeVertexNormals();
    group.add(new THREE.Mesh(endJambGeo, this.doubleBlackMaterial));

    this.roomGroup.add(group);
  }

  buildSouthEastWall(H, T) {
    const seGroup = new THREE.Group();
    seGroup.name = 'Wall_4_SouthEast';

    const sec4Mat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(4).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(sec4Mat);

    // 1. South wall from Vestibule (x = +1.8) to Booth (x = +10.2) at z = +13.5
    const southLen = 10.2 - 1.8;
    const southGeo = new THREE.BoxGeometry(southLen, H, T);
    const southMesh = new THREE.Mesh(southGeo, [
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial, // +z Exterior
      sec4Mat // -z Interior
    ]);
    southMesh.position.set((1.8 + 10.2) / 2, H / 2, 13.5);
    southMesh.receiveShadow = true;
    southMesh.userData = { sectionId: 4, name: 'South-East Room & Entry Wall' };
    seGroup.add(southMesh);
    this.wallMeshes[4] = southMesh;

    // 2. Mid-East Wall
    const midEastGeo = new THREE.BoxGeometry(T, H, 6.0);
    const midEastMesh = new THREE.Mesh(midEastGeo, [
      this.outerBlackMaterial, // +x Exterior
      sec4Mat, // -x Interior
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    midEastMesh.position.set(13.5, H / 2, -0.5);
    midEastMesh.receiveShadow = true;
    midEastMesh.userData = { sectionId: 4, name: 'South-East Room & Entry Wall' };
    seGroup.add(midEastMesh);

    // 3. Lower-East Wall
    const lowerEastGeo = new THREE.BoxGeometry(T, H, 7.5);
    const lowerEastMesh = new THREE.Mesh(lowerEastGeo, [
      this.outerBlackMaterial, // +x Exterior
      sec4Mat, // -x Interior
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial,
      this.outerBlackMaterial
    ]);
    lowerEastMesh.position.set(13.5, H / 2, 9.75);
    lowerEastMesh.receiveShadow = true;
    lowerEastMesh.userData = { sectionId: 4, name: 'South-East Room & Entry Wall' };
    seGroup.add(lowerEastMesh);

    // 4. Southeast Booth
    this.buildSoutheastBooth(H, seGroup, sec4Mat);
    this.roomGroup.add(seGroup);
  }

  buildSoutheastBooth(H, parentGroup, boothMat) {
    const bSize = 4.4;
    const bHeight = 7.5;
    const bThickness = 0.35;
    const bx = 10.2;
    const bz = 10.5;

    const bBack = new THREE.Mesh(new THREE.BoxGeometry(bSize, bHeight, bThickness), this.outerBlackMaterial);
    bBack.position.set(bx, bHeight / 2, bz + bSize / 2);
    parentGroup.add(bBack);

    const bRight = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, bSize), this.outerBlackMaterial);
    bRight.position.set(bx + bSize / 2, bHeight / 2, bz);
    parentGroup.add(bRight);

    const bLeft = new THREE.Mesh(new THREE.BoxGeometry(bThickness, bHeight, bSize), boothMat || this.interiorGreyMaterial);
    bLeft.position.set(bx - bSize / 2, bHeight / 2, bz);
    bLeft.userData = { sectionId: 4, name: 'South-East Room & Entry Wall' };
    parentGroup.add(bLeft);

    const bFront = new THREE.Mesh(new THREE.BoxGeometry(bSize, bHeight, bThickness), boothMat || this.interiorGreyMaterial);
    bFront.position.set(bx, bHeight / 2, bz - bSize / 2);
    bFront.userData = { sectionId: 4, name: 'South-East Room & Entry Wall' };
    parentGroup.add(bFront);

    const rimGeo = new THREE.BoxGeometry(bSize + 0.1, 0.3, bSize + 0.1);
    const rim = new THREE.Mesh(rimGeo, this.boothRimMaterial);
    rim.position.set(bx, bHeight + 0.15, bz);
    parentGroup.add(rim);
  }

  /**
   * Centerpiece Island Column (Section 5):
   * Built with parametric buffer geometry for 100% clean texture mapping on all 4 rounded sides
   */
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

    const shapePoints = shape.getPoints(64);
    const N = shapePoints.length;

    // Calculate cumulative perimeter distance
    const cumDist = [0];
    let totalPerim = 0;
    for (let i = 1; i < N; i++) {
      totalPerim += shapePoints[i].distanceTo(shapePoints[i - 1]);
      cumDist.push(totalPerim);
    }

    // 1. Centerpiece Side Walls (Textured with Section 5 texture)
    const sidesGeo = new THREE.BufferGeometry();
    const verts = [];
    const uvs = [];
    const norms = [];

    for (let i = 0; i < N; i++) {
      const p = shapePoints[i];
      const u = cumDist[i] / totalPerim;

      verts.push(p.x, 0, p.y);
      norms.push(p.x, 0, p.y);
      uvs.push(u, 0);

      verts.push(p.x, H, p.y);
      norms.push(p.x, 0, p.y);
      uvs.push(u, 1);
    }

    const indices = [];
    for (let i = 0; i < N - 1; i++) {
      const b0 = i * 2, t0 = i * 2 + 1, b1 = (i + 1) * 2, t1 = (i + 1) * 2 + 1;
      indices.push(b0, b1, t0);
      indices.push(b1, t1, t0);
    }

    sidesGeo.setIndex(indices);
    sidesGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    sidesGeo.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
    sidesGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    sidesGeo.computeVertexNormals();

    const centerSidesMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(5).texture,
      roughness: 0.5,
      metalness: 0.15,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity,
      side: THREE.DoubleSide
    });
    this.interiorMaterials.push(centerSidesMat);

    const sidesMesh = new THREE.Mesh(sidesGeo, centerSidesMat);
    sidesMesh.castShadow = true;
    sidesMesh.receiveShadow = true;
    sidesMesh.userData = { sectionId: 5, name: 'Centerpiece Island Column' };
    islandGroup.add(sidesMesh);
    this.wallMeshes[5] = sidesMesh;

    // 2. Top Cap (Black)
    const topShapeGeo = new THREE.ShapeGeometry(shape);
    const topCapMesh = new THREE.Mesh(topShapeGeo, this.doubleBlackMaterial);
    topCapMesh.rotation.x = -Math.PI / 2;
    topCapMesh.position.y = H;
    islandGroup.add(topCapMesh);

    // 3. Top Rim Contour Line
    const rimPoints = shapePoints.map((p) => new THREE.Vector3(p.x, H + 0.04, p.y));
    rimPoints.push(rimPoints[0].clone());
    const topRimGeo = new THREE.BufferGeometry().setFromPoints(rimPoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const rimLine = new THREE.Line(topRimGeo, lineMat);
    islandGroup.add(rimLine);

    this.roomGroup.add(islandGroup);
  }

  buildPartitionFins(H, T) {
    const finsGroup = new THREE.Group();
    finsGroup.name = 'PartitionFins';

    // -------------------------------------------------------------
    // NORTH FIN (Section 6)
    // -------------------------------------------------------------
    const northFinMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(6).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(northFinMat);

    const northOuterGeo = new THREE.BoxGeometry(T, H, 4.5);
    const northOuterFin = new THREE.Mesh(northOuterGeo, northFinMat);
    northOuterFin.position.set(0, H / 2, -11.25);
    northOuterFin.castShadow = true;
    northOuterFin.receiveShadow = true;
    northOuterFin.userData = { sectionId: 6, name: 'North Partition Fin' };
    finsGroup.add(northOuterFin);
    this.wallMeshes[6] = northOuterFin;

    const northCenterGeo = new THREE.BoxGeometry(T, H, 2.6);
    const northCenterFin = new THREE.Mesh(northCenterGeo, northFinMat);
    northCenterFin.position.set(0, H / 2, -3.7);
    northCenterFin.castShadow = true;
    northCenterFin.receiveShadow = true;
    northCenterFin.userData = { sectionId: 6, name: 'North Partition Fin' };
    finsGroup.add(northCenterFin);

    // -------------------------------------------------------------
    // WEST FIN (Section 7)
    // -------------------------------------------------------------
    const westFinMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(7).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(westFinMat);

    const westOuterGeo = new THREE.BoxGeometry(4.5, H, T);
    const westOuterFin = new THREE.Mesh(westOuterGeo, westFinMat);
    westOuterFin.position.set(-11.25, H / 2, 0);
    westOuterFin.castShadow = true;
    westOuterFin.receiveShadow = true;
    westOuterFin.userData = { sectionId: 7, name: 'West Partition Fin' };
    finsGroup.add(westOuterFin);
    this.wallMeshes[7] = westOuterFin;

    const westCenterGeo = new THREE.BoxGeometry(2.6, H, T);
    const westCenterFin = new THREE.Mesh(westCenterGeo, westFinMat);
    westCenterFin.position.set(-3.7, H / 2, 0);
    westCenterFin.castShadow = true;
    westCenterFin.receiveShadow = true;
    westCenterFin.userData = { sectionId: 7, name: 'West Partition Fin' };
    finsGroup.add(westCenterFin);

    // -------------------------------------------------------------
    // EAST FIN (Section 8)
    // -------------------------------------------------------------
    const eastFinMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(8).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(eastFinMat);

    const eastFinGeo = new THREE.BoxGeometry(9.0, H, T);
    const eastFin = new THREE.Mesh(eastFinGeo, eastFinMat);
    eastFin.position.set(9.0, H / 2, -0.5);
    eastFin.castShadow = true;
    eastFin.receiveShadow = true;
    eastFin.userData = { sectionId: 8, name: 'East Partition Fin' };
    finsGroup.add(eastFin);
    this.wallMeshes[8] = eastFin;

    this.roomGroup.add(finsGroup);
  }

  buildEntranceVestibule(H, T) {
    const vestGroup = new THREE.Group();
    vestGroup.name = 'EntranceVestibule';

    const vestMat = new THREE.MeshStandardMaterial({
      map: this.textureManager.getSection(9).texture,
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: this.params.interiorOpacity < 1.0,
      opacity: this.params.interiorOpacity
    });
    this.interiorMaterials.push(vestMat);

    const leftWallGeo = new THREE.BoxGeometry(T, H, 6.3);
    const leftWall = new THREE.Mesh(leftWallGeo, vestMat);
    leftWall.position.set(-2.0, H / 2, 10.35);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    leftWall.userData = { sectionId: 9, name: 'South Entrance Vestibule' };
    vestGroup.add(leftWall);
    this.wallMeshes[9] = leftWall;

    const rightWallGeo = new THREE.BoxGeometry(T, H, 6.3);
    const rightWall = new THREE.Mesh(rightWallGeo, vestMat);
    rightWall.position.set(1.8, H / 2, 10.35);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    rightWall.userData = { sectionId: 9, name: 'South Entrance Vestibule' };
    vestGroup.add(rightWall);

    const doorGeo = new THREE.BoxGeometry(0.15, H * 0.85, 3.2);
    const door = new THREE.Mesh(doorGeo, vestMat);
    door.position.set(-2.8, (H * 0.85) / 2, 8.4);
    door.rotation.y = -Math.PI / 6;
    door.castShadow = true;
    door.userData = { sectionId: 9, name: 'South Entrance Vestibule' };
    vestGroup.add(door);

    const lintelGeo = new THREE.BoxGeometry(4.0, 0.6, T);
    const lintel = new THREE.Mesh(lintelGeo, vestMat);
    lintel.position.set(-0.1, H - 0.3, 7.2);
    lintel.userData = { sectionId: 9, name: 'South Entrance Vestibule' };
    vestGroup.add(lintel);

    this.roomGroup.add(vestGroup);
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
            if (mat && mat.emissive) {
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
    for (let id = 1; id <= 9; id++) {
      const sec = this.textureManager.getSection(id);
      const mesh = this.wallMeshes[id];
      if (sec && mesh) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            if (mat && mat.map) {
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
