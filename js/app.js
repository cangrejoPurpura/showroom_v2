/* Motor Three.js para sebasCocina.skp - Habitación Greige, Piso Calacatta 120x60, Luz 5500K y Relieve PBR */
(function () {
  'use strict';

  const container = document.getElementById('canvas-container');
  const hotspotsLayer = document.getElementById('hotspots-layer');
  const statusText = document.getElementById('status-text');
  const btnGear = document.getElementById('btn-gear-toggle');
  const guiPanel = document.getElementById('gui-panel');

  // 1. Escena, Cámara y Renderer con balance neutro 5500K
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfc9bf); // Greige arquitectónico cálido
  scene.fog = new THREE.FogExp2(0xcfc9bf, 0.045);

  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.03, 30.0);
  // Estado del caminante (persona en la habitación mirando al Bajo Mesada)
  const walker = {
    x: 0.0,
    y: 1.38,       // Altura de vista cómoda para cocina
    z: 2.35,       // A 1.75 m del frente del Bajo Mesada
    yaw: 0.0,      // Mirando hacia -Z (hacia el Bajo Mesada)
    pitch: -0.16,  // Ligeramente inclinado hacia el Bajo Mesada
    vx: 0.0,
    vz: 0.0,
    speed: 2.2,
    bobPhase: 0.0
  };

  function syncCameraFromWalker() {
    camera.position.set(walker.x, walker.y, walker.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = walker.yaw;
    camera.rotation.x = walker.pitch;
    camera.rotation.z = 0;
  }
  syncCameraFromWalker();

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const maxAniso = renderer.capabilities.getMaxAnisotropy() || 8;
  const texLoader = new THREE.TextureLoader();

  // 2. Generador de Mapas Normales y de Rugosidad PBR de Alta Frecuencia en Canvas (para relieve instantáneo sin bloqueos CORS)
  function createMicroNormalAndRoughness(kind) {
    const w = 512, h = 512;
    const normCanvas = document.createElement('canvas');
    normCanvas.width = w; normCanvas.height = h;
    const nCtx = normCanvas.getContext('2d');
    const nImg = nCtx.createImageData(w, h);

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = w; roughCanvas.height = h;
    const rCtx = roughCanvas.getContext('2d');
    const rImg = rCtx.createImageData(w, h);

    const hField = new Float32Array(w * h);
    // Semilla determinística rápida
    let seed = kind === 'stone' ? 918273 : (kind === 'metal' ? 554433 : (kind === 'linen' ? 773311 : 123457));
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return (seed / 4294967296) * 2 - 1;
    }

    const raw = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) raw[i] = rand();

    if (kind === 'wood_fine' || kind === 'wood_deep') {
      // Traqueidas verticales y poros de madera
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sumV = 0;
          for (let dy = -6; dy <= 6; dy++) {
            const yy = (y + dy + h) & (h - 1);
            sumV += raw[yy * w + x];
          }
          const fiber = sumV / 13.0;
          const pore = raw[y * w + x] > 0.72 ? -1.4 : 0.0;
          hField[y * w + x] = fiber * 0.75 + pore * 0.65;
        }
      }
    } else if (kind === 'stone') {
      // Cavidades pétreas y micro-cristales minerales (Mesada Amberes / Travertino)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = raw[y * w + x];
          const r1 = raw[((y + 1) & (h - 1)) * w + ((x + 1) & (w - 1))];
          const pit = (c + r1) > 1.05 ? -1.6 : 0.25 * (c + r1);
          hField[y * w + x] = pit + 0.35 * Math.sin(x * 0.08 + y * 0.05 + c);
        }
      }
    } else if (kind === 'linen') {
      // Trama y urdimbre textil (Lino Blanco)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const warp = Math.sin((x * 2 * Math.PI) / 6.0);
          const weft = Math.sin((y * 2 * Math.PI) / 6.0);
          hField[y * w + x] = 0.5 * warp + 0.5 * weft + 0.15 * raw[y * w + x];
        }
      }
    } else if (kind === 'metal') {
      // Cepillado metálico continuo vertical
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let s = 0;
          for (let dy = -10; dy <= 10; dy++) {
            s += raw[((y + dy + h) & (h - 1)) * w + x];
          }
          hField[y * w + x] = s / 12.0;
        }
      }
    } else {
      // Estuco / pared greige mate
      for (let i = 0; i < w * h; i++) hField[i] = raw[i] * 0.35;
    }

    const strength = kind === 'stone' ? 3.2 : (kind === 'wood_deep' ? 3.0 : (kind === 'wood_fine' ? 2.4 : 1.8));
    const baseRough = kind === 'stone' ? 0.38 : (kind === 'metal' ? 0.32 : (kind === 'linen' ? 0.76 : 0.56));

    for (let y = 0; y < h; y++) {
      const yp = (y + 1) & (h - 1);
      const ym = (y - 1 + h) & (h - 1);
      for (let x = 0; x < w; x++) {
        const xp = (x + 1) & (w - 1);
        const xm = (x - 1 + w) & (w - 1);
        const dx = (hField[y * w + xp] - hField[y * w + xm]) * 0.5 * strength;
        const dy = (hField[yp * w + x] - hField[ym * w + x]) * 0.5 * strength;
        const invLen = 1.0 / Math.sqrt(dx * dx + dy * dy + 1.0);
        const nx = -dx * invLen;
        const ny = dy * invLen;
        const nz = invLen;
        const idx = (y * w + x) * 4;
        nImg.data[idx] = Math.min(255, Math.max(0, Math.round((nx * 0.5 + 0.5) * 255)));
        nImg.data[idx + 1] = Math.min(255, Math.max(0, Math.round((ny * 0.5 + 0.5) * 255)));
        nImg.data[idx + 2] = Math.min(255, Math.max(0, Math.round((nz * 0.5 + 0.5) * 255)));
        nImg.data[idx + 3] = 255;

        const rv = Math.min(245, Math.max(15, Math.round((baseRough - 0.1 * hField[y * w + x]) * 255)));
        rImg.data[idx] = rv;
        rImg.data[idx + 1] = rv;
        rImg.data[idx + 2] = rv;
        rImg.data[idx + 3] = 255;
      }
    }
    nCtx.putImageData(nImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);

    const normalTex = new THREE.CanvasTexture(normCanvas);
    normalTex.wrapS = THREE.RepeatWrapping;
    normalTex.wrapT = THREE.RepeatWrapping;
    normalTex.repeat.set(3, 3);
    normalTex.anisotropy = maxAniso;

    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.wrapS = THREE.RepeatWrapping;
    roughTex.wrapT = THREE.RepeatWrapping;
    roughTex.repeat.set(3, 3);
    roughTex.anisotropy = maxAniso;

    return { normalTex, roughTex, baseRough };
  }

  const pbrBanks = {
    wood_fine: createMicroNormalAndRoughness('wood_fine'),
    wood_deep: createMicroNormalAndRoughness('wood_deep'),
    stone: createMicroNormalAndRoughness('stone'),
    linen: createMicroNormalAndRoughness('linen'),
    metal: createMicroNormalAndRoughness('metal'),
    greige_wall: createMicroNormalAndRoughness('wall')
  };

  const finishKindMap = {
    '012_Camellia': 'wood_fine',
    '031_Roble_Halifax_natural': 'wood_deep',
    '004_Pino_Aland_polar': 'wood_deep',
    '001_Blanco_Nature': 'wood_fine',
    '064_Sauco': 'wood_fine',
    '073_Blanco': 'wood_fine',
    '144_Chromix_plata': 'stone',
    '126_Lino_Blanco': 'linen',
    '148_Amberes': 'stone',
    '139_Travertino': 'stone',
    '151_Metal_cepillado_oro': 'metal'
  };

  // Caché de texturas Albedo (carga instantánea desde base64 + upgrade progresivo desde ./textures/ en servidor/GitHub Pages)
  const albedoCache = {};
  function getAlbedoTexture(key, rot90, repeatX, repeatY) {
    const cacheKey = key + (rot90 ? '_rot90' : '') + '_' + (repeatX || 1) + '_' + (repeatY || 1);
    if (albedoCache[cacheKey]) return albedoCache[cacheKey];

    const b64 = (window.EMBEDDED_TEXTURES && window.EMBEDDED_TEXTURES[key]) || '';
    const tex = texLoader.load(b64);
    tex.encoding = THREE.sRGBEncoding;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = maxAniso;
    if (repeatX && repeatY) {
      tex.repeat.set(repeatX, repeatY);
    }
    if (rot90) {
      tex.center.set(0.5, 0.5);
      tex.rotation = Math.PI / 2;
    }

    // Si estamos corriendo en servidor HTTP / GitHub Pages, actualiza automáticamente a la textura 1536x3310 completa
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      const hdMap = {
        '012_Camellia': './textures/012_Camellia.jpg',
        '148_Amberes': './textures/148_Amberes.jpg',
        '064_Sauco': './textures/064_Sauco.jpg',
        '073_Blanco': './textures/073_Blanco.jpg',
        '144_Chromix_plata': './textures/144_Chromix_plata.jpg',
        '031_Roble_Halifax_natural': './textures/031_Roble_Halifax_natural.jpg',
        '001_Blanco_Nature': './textures/001_Blanco_Nature.jpg',
        '004_Pino_Aland_polar': './textures/004_Pino_Aland_polar.jpg',
        '126_Lino_Blanco': './textures/126_Lino_Blanco.jpg',
        '139_Travertino': './textures/139_Travertino.jpg',
        '151_Metal_cepillado_oro': './textures/151_Metal_cepillado_oro.jpg'
      };
      if (hdMap[key] && !window.__IS_CANVAS_PREVIEW__) {
        texLoader.load(hdMap[key], function (hdTex) {
          tex.image = hdTex.image;
          tex.needsUpdate = true;
        }, undefined, function () {});
      }
    }

    albedoCache[cacheKey] = tex;
    return tex;
  }

  // 3. Construcción de la Habitación Fondo Greige y Piso Porcelanato Calacatta 120x60 cm
  const roomGroup = new THREE.Group();
  scene.add(roomGroup);

  // Dimensiones de la habitación: 6.40m ancho x 5.40m profundo x 2.80m alto
  const ROOM_W = 6.40;
  const ROOM_D = 5.40;
  const ROOM_H = 2.80;

  // Piso Porcelanato Calacatta 120x60 cm: cada placa mide exactamente 1.20m (X) x 0.60m (Z)
  const tilesX = ROOM_W / 1.20;
  const tilesZ = ROOM_D / 0.60;
  const floorAlbedo = getAlbedoTexture('calacatta_albedo', false, tilesX, tilesZ);
  const floorNormal = texLoader.load((window.EMBEDDED_TEXTURES && window.EMBEDDED_TEXTURES['calacatta_normal']) || '');
  floorNormal.wrapS = THREE.RepeatWrapping;
  floorNormal.wrapT = THREE.RepeatWrapping;
  floorNormal.repeat.set(tilesX, tilesZ);
  floorNormal.anisotropy = maxAniso;

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorAlbedo,
    normalMap: floorNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.22,
    metalness: 0.04
  });
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0, ROOM_D / 2 - 0.02);
  floorMesh.receiveShadow = true;
  roomGroup.add(floorMesh);

  // Paredes Fondo Greige (#CFC9BF) con textura micro-mate arquitectónica
  const greigeWallMat = new THREE.MeshStandardMaterial({
    color: 0xd2cdc3,
    normalMap: pbrBanks.greige_wall.normalTex,
    normalScale: new THREE.Vector2(0.25, 0.25),
    roughness: 0.88,
    metalness: 0.0
  });

  // Pared de fondo (detrás del Bajo Mesada en Z = -0.01)
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), greigeWallMat);
  backWall.position.set(0, ROOM_H / 2, -0.01);
  backWall.receiveShadow = true;
  roomGroup.add(backWall);

  // Pared izquierda (X = -ROOM_W/2)
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), greigeWallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-ROOM_W / 2, ROOM_H / 2, ROOM_D / 2 - 0.01);
  leftWall.receiveShadow = true;
  roomGroup.add(leftWall);

  // Pared derecha (X = +ROOM_W/2)
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), greigeWallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(ROOM_W / 2, ROOM_H / 2, ROOM_D / 2 - 0.01);
  rightWall.receiveShadow = true;
  roomGroup.add(rightWall);

  // Pared trasera (detrás de la cámara en Z = ROOM_D - 0.01)
  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), greigeWallMat);
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, ROOM_H / 2, ROOM_D - 0.01);
  roomGroup.add(frontWall);

  // Cielorraso blanco cálido 5500K
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xf6f4f0, roughness: 0.92 });
  const ceilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), ceilingMat);
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.set(0, ROOM_H, ROOM_D / 2 - 0.01);
  roomGroup.add(ceilingMesh);

  // Zócalo perimetral de la habitación (8 cm de alto en blanco satinado)
  const skirtingMat = new THREE.MeshStandardMaterial({ color: 0xebe8e2, roughness: 0.45 });
  const backSkirt = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.08, 0.015), skirtingMat);
  backSkirt.position.set(0, 0.04, -0.002);
  roomGroup.add(backSkirt);
  const leftSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, ROOM_D), skirtingMat);
  leftSkirt.position.set(-ROOM_W / 2 + 0.007, 0.04, ROOM_D / 2);
  roomGroup.add(leftSkirt);
  const rightSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, ROOM_D), skirtingMat);
  rightSkirt.position.set(ROOM_W / 2 - 0.007, 0.04, ROOM_D / 2);
  roomGroup.add(rightSkirt);

  // 4. Iluminación Neutra 5500K Ambiente + 3 Luces Spot que caen sobre el Bajo Mesada
  // 5500K corresponde a RGB(255, 253, 248) -> 0xfffdf8
  const hemiLight = new THREE.HemisphereLight(0xfffdf8, 0xd4cfc7, 0.95);
  hemiLight.position.set(0, ROOM_H, 1.5);
  scene.add(hemiLight);

  const ambLight = new THREE.AmbientLight(0xfffdf8, 0.42);
  scene.add(ambLight);

  // Luz de relleno frontal suave 5500K para que al acercarse a las puertas se aprecie todo el micro-relieve PBR
  const fillDirLight = new THREE.DirectionalLight(0xfffdf8, 0.55);
  fillDirLight.position.set(0.8, 2.1, 2.8);
  scene.add(fillDirLight);

  // 3 Luces Focales (SpotLights) cayendo directamente sobre los 3 sectores del Bajo Mesada
  const spotPositionsX = [-0.68, -0.08, 0.54];
  const bajoMesadaSpots = [];
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.3, metalness: 0.8 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffef8 });

  spotPositionsX.forEach(function (sx, idx) {
    const spot = new THREE.SpotLight(0xfffcf5, 1.45);
    spot.position.set(sx, 2.35, 0.42);
    spot.target.position.set(sx, 0.82, 0.32);
    spot.angle = Math.PI / 3.8;
    spot.penumbra = 0.72;
    spot.decay = 1.25;
    spot.distance = 4.8;
    spot.castShadow = true;
    spot.shadow.mapSize.width = 1024;
    spot.shadow.mapSize.height = 1024;
    spot.shadow.camera.near = 0.3;
    spot.shadow.camera.far = 4.0;
    spot.shadow.bias = -0.0004;
    scene.add(spot);
    scene.add(spot.target);
    bajoMesadaSpots.push(spot);

    // Luminaria dicroica empotrada en el techo
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 24), fixtureMat);
    housing.position.set(sx, ROOM_H - 0.01, 0.42);
    roomGroup.add(housing);
    const emitter = new THREE.Mesh(new THREE.CircleGeometry(0.038, 20), bulbMat);
    emitter.rotation.x = Math.PI / 2;
    emitter.position.set(sx, ROOM_H - 0.021, 0.42);
    roomGroup.add(emitter);
  });

  // 5. Construcción del Modelo Exacto sebasCocina.skp (38 tableros + 5 grupos abribles interactivos)
  const sceneData = window.SEBAS_COCINA_SCENE;
  const cabinetRoot = new THREE.Group();
  scene.add(cabinetRoot);

  // Materiales activos por slot
  const currentMatKeys = {
    frente: '012_Camellia',
    mesada: '148_Amberes',
    estructura: '064_Sauco',
    cajon_interior: '073_Blanco',
    zocalo: '144_Chromix_plata'
  };
  let globalNormalScale = 1.15;

  const slotMeshes = {
    frente: [],
    mesada: [],
    estructura: [],
    cajon_interior: [],
    zocalo: []
  };

  function buildPBRMaterial(matKey, uvRot90) {
    const kind = finishKindMap[matKey] || 'wood_fine';
    const bank = pbrBanks[kind] || pbrBanks.wood_fine;
    const mapTex = getAlbedoTexture(matKey, uvRot90);
    const ns = kind === 'stone' ? globalNormalScale * 1.15 : globalNormalScale;

    return new THREE.MeshStandardMaterial({
      map: mapTex,
      normalMap: bank.normalTex,
      normalScale: new THREE.Vector2(ns, ns),
      roughnessMap: bank.roughTex,
      roughness: bank.baseRough,
      metalness: kind === 'metal' ? 0.72 : (matKey === '144_Chromix_plata' ? 0.22 : 0.02),
      bumpMap: mapTex,
      bumpScale: 0.0035 * globalNormalScale
    });
  }

  // Crear los 5 grupos de pivote para los elementos que se abren
  const openableGroups = {};
  const openableStates = {};

  sceneData.openables.forEach(function (op) {
    const grp = new THREE.Group();
    grp.position.set(op.hinge_pivot[0], op.hinge_pivot[1], op.hinge_pivot[2]);
    cabinetRoot.add(grp);
    openableGroups[op.id] = grp;
    openableStates[op.id] = {
      config: op,
      group: grp,
      isOpen: false,
      progress: 0.0, // 0 = cerrado, 1 = abierto
      target: 0.0,
      hotspotEl: null,
      sliderEl: null
    };
  });

  // Geometría con UVs escaladas en metros reales para que la veta tenga proporción física exacta
  function createBoardGeometry(dx, dy, dz) {
    const geom = new THREE.BoxGeometry(dx, dy, dz);
    const pos = geom.attributes.position;
    const norm = geom.attributes.normal;
    const uv = geom.attributes.uv;
    // Escala física del tablero de melamina (1.22m x 2.60m)
    const scaleU = 1.0 / 0.85;
    const scaleV = 1.0 / 1.65;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i) + dx * 0.5;
      const vy = pos.getY(i) + dy * 0.5;
      const vz = pos.getZ(i) + dz * 0.5;
      const nx = Math.abs(norm.getX(i));
      const ny = Math.abs(norm.getY(i));
      const nz = Math.abs(norm.getZ(i));

      if (nz > 0.5) {
        // Cara frontal / trasera (X, Y)
        uv.setXY(i, vx * scaleU, vy * scaleV);
      } else if (nx > 0.5) {
        // Cara lateral (Z, Y)
        uv.setXY(i, vz * scaleU, vy * scaleV);
      } else if (ny > 0.5) {
        // Cara superior / inferior (X, Z)
        uv.setXY(i, vx * scaleU, vz * scaleV);
      }
    }
    uv.needsUpdate = true;
    return geom;
  }

  const edgeLineMat = new THREE.LineBasicMaterial({
    color: 0x1a1816,
    transparent: true,
    opacity: 0.28
  });

  const interactiveMeshes = [];

  sceneData.pieces.forEach(function (piece) {
    const b = piece.bbox; // [x0, y0, z0, x1, y1, z1]
    const dx = b[3] - b[0];
    const dy = b[4] - b[1];
    const dz = b[5] - b[2];
    const cx = (b[0] + b[3]) * 0.5;
    const cy = (b[1] + b[4]) * 0.5;
    const cz = (b[2] + b[5]) * 0.5;

    const geom = createBoardGeometry(dx, dy, dz);
    const uvRot90 = piece.uv_rot === 90;
    const matKey = currentMatKeys[piece.mat_slot] || '064_Sauco';
    const mat = buildPBRMaterial(matKey, uvRot90);

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      pieceId: piece.id,
      pieceName: piece.name,
      matSlot: piece.mat_slot,
      uvRot90: uvRot90,
      animGroup: piece.anim_group
    };

    // Línea sutil de tapacanto / encuentro entre tableros
    const edgesGeom = new THREE.EdgesGeometry(geom);
    const edgeLines = new THREE.LineSegments(edgesGeom, edgeLineMat);
    mesh.add(edgeLines);

    if (piece.anim_group && openableGroups[piece.anim_group]) {
      const opGrp = openableGroups[piece.anim_group];
      const piv = openableStates[piece.anim_group].config.hinge_pivot;
      mesh.position.set(cx - piv[0], cy - piv[1], cz - piv[2]);
      opGrp.add(mesh);
      interactiveMeshes.push(mesh);
    } else {
      mesh.position.set(cx, cy, cz);
      cabinetRoot.add(mesh);
    }

    if (slotMeshes[piece.mat_slot]) {
      slotMeshes[piece.mat_slot].push(mesh);
    }
  });

  // Herrajes interiores realistas (bisagras cazoleta 35mm y correderas telescópicas metálicas)
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd0d5dd, roughness: 0.25, metalness: 0.88 });
  [0.22, 0.78].forEach(function (hRatio) {
    // Bisagras puerta izquierda y derecha
    const yHinge = 0.098 + hRatio * 0.772;
    const hLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.04, 12), chromeMat);
    hLeft.position.set(-0.932, yHinge, 0.545);
    cabinetRoot.add(hLeft);

    const hRight = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.04, 12), chromeMat);
    hRight.position.set(0.353, yHinge, 0.545);
    cabinetRoot.add(hRight);
  });

  // 6. Creación de los Puntos Concéntricos Interactivos y Controles en la GUI
  const openablesListEl = document.getElementById('openables-controls-list');

  function toggleOpenable(id, forceState) {
    const st = openableStates[id];
    if (!st) return;
    st.isOpen = typeof forceState === 'boolean' ? forceState : !st.isOpen;
    st.target = st.isOpen ? 1.0 : 0.0;
    if (st.hotspotEl) {
      st.hotspotEl.classList.toggle('is-open', st.isOpen);
      const tip = st.hotspotEl.querySelector('.hotspot-tooltip');
      if (tip) {
        tip.textContent = st.config.label + (st.isOpen ? ' (Abierto · Clic para cerrar)' : ' (Cerrado · Clic para abrir)');
      }
    }
    if (statusText) {
      statusText.innerHTML = '<strong>' + st.config.label + '</strong>: ' + (st.isOpen ? 'Abierto' : 'Cerrado');
    }
  }

  sceneData.openables.forEach(function (op) {
    const st = openableStates[op.id];

    // Punto concéntrico flotante en el DOM
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hotspot-concentric';
    btn.setAttribute('aria-label', 'Abrir o cerrar ' + op.label);
    btn.innerHTML =
      '<span class="hotspot-ring-outer"></span>' +
      '<span class="hotspot-ring-mid"></span>' +
      '<span class="hotspot-core"></span>' +
      '<span class="hotspot-tooltip">' + op.label + ' (Cerrado · Clic para abrir)</span>';

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleOpenable(op.id);
    });
    hotspotsLayer.appendChild(btn);
    st.hotspotEl = btn;

    // Fila de control individual en la GUI
    const row = document.createElement('div');
    row.className = 'gui-row';
    row.innerHTML =
      '<label>' + op.label + '</label>' +
      '<input type="range" class="gui-slider" min="0" max="100" value="0" aria-label="' + op.label + '" />';
    const slider = row.querySelector('input');
    slider.addEventListener('input', function () {
      const val = parseFloat(slider.value) / 100.0;
      st.target = val;
      st.isOpen = val > 0.5;
      btn.classList.toggle('is-open', st.isOpen);
    });
    openablesListEl.appendChild(row);
    st.sliderEl = slider;
  });

  // Botones Abrir Todo / Cerrar Todo y mostrar/ocultar puntos concéntricos
  document.getElementById('btn-open-all').addEventListener('click', function () {
    Object.keys(openableStates).forEach(function (k) { toggleOpenable(k, true); });
  });
  document.getElementById('btn-close-all').addEventListener('click', function () {
    Object.keys(openableStates).forEach(function (k) { toggleOpenable(k, false); });
  });
  const chkHotspots = document.getElementById('chk-show-hotspots');
  chkHotspots.addEventListener('change', function () {
    hotspotsLayer.style.display = chkHotspots.checked ? 'block' : 'none';
  });

  // 7. Botón de Engranaje en la Esquina para Activar/Desactivar la GUI
  btnGear.addEventListener('click', function () {
    const isHidden = guiPanel.classList.toggle('hidden');
    btnGear.classList.toggle('active', !isHidden);
  });

  // 8. Selectores de Melaminas HD y Profundidad de Relieve en la GUI
  function updateSlotMaterial(slot, newKey) {
    currentMatKeys[slot] = newKey;
    const list = slotMeshes[slot] || [];
    list.forEach(function (mesh) {
      mesh.material.dispose();
      mesh.material = buildPBRMaterial(newKey, mesh.userData.uvRot90);
    });
    if (statusText) {
      statusText.innerHTML = 'Textura aplicada: <strong>' + newKey.replace(/_/g, ' ') + '</strong> con relieve PBR';
    }
  }

  document.getElementById('sel-mat-frente').addEventListener('change', function (e) {
    updateSlotMaterial('frente', e.target.value);
  });
  document.getElementById('sel-mat-mesada').addEventListener('change', function (e) {
    updateSlotMaterial('mesada', e.target.value);
  });
  document.getElementById('sel-mat-estructura').addEventListener('change', function (e) {
    updateSlotMaterial('estructura', e.target.value);
  });
  document.getElementById('rng-normal-scale').addEventListener('input', function (e) {
    globalNormalScale = parseFloat(e.target.value);
    Object.keys(slotMeshes).forEach(function (slot) {
      slotMeshes[slot].forEach(function (mesh) {
        if (mesh.material && mesh.material.normalScale) {
          mesh.material.normalScale.set(globalNormalScale, globalNormalScale);
          mesh.material.bumpScale = 0.0035 * globalNormalScale;
        }
      });
    });
  });

  // Controles de Iluminación 5500K y Spots sobre Bajo Mesada
  document.getElementById('rng-amb-5500k').addEventListener('input', function (e) {
    const v = parseFloat(e.target.value);
    hemiLight.intensity = v;
    ambLight.intensity = v * 0.44;
    fillDirLight.intensity = v * 0.58;
  });
  document.getElementById('rng-spots-bm').addEventListener('input', function (e) {
    const v = parseFloat(e.target.value);
    bajoMesadaSpots.forEach(function (sp) { sp.intensity = v; });
  });
  document.getElementById('rng-walk-speed').addEventListener('input', function (e) {
    walker.speed = parseFloat(e.target.value);
  });

  // Vistas Rápidas de Cámara (con interpolación suave)
  let camTransition = null;
  function animateCameraTo(tx, ty, tz, tyaw, tpitch) {
    camTransition = {
      sx: walker.x, sy: walker.y, sz: walker.z, syaw: walker.yaw, spitch: walker.pitch,
      tx: tx, ty: ty, tz: tz, tyaw: tyaw, tpitch: tpitch,
      t: 0.0
    };
  }

  document.getElementById('btn-cam-front').addEventListener('click', function () {
    animateCameraTo(0.0, 1.38, 2.35, 0.0, -0.16);
  });
  document.getElementById('btn-cam-zoom-door').addEventListener('click', function () {
    // Zoom cercano sobre la puerta y cajones en 012_Camellia para apreciar la veta y el poro PBR
    animateCameraTo(-0.35, 0.72, 0.88, 0.0, -0.06);
  });
  document.getElementById('btn-cam-zoom-mesada').addEventListener('click', function () {
    // Zoom cercano sobre la mesada 148_Amberes iluminada por los spots
    animateCameraTo(0.18, 1.06, 0.76, 0.12, -0.45);
  });
  document.getElementById('btn-cam-floor').addEventListener('click', function () {
    // Vista del piso Porcelanato Calacatta 120x60 y el Bajo Mesada
    animateCameraTo(0.65, 1.15, 2.10, -0.32, -0.36);
  });

  // 9. Controles de Caminata (WASD + Flechas), Giro 360° con Ruedita Presionada y Zoom con Ruedita Arriba/Abajo
  const keysPressed = {};
  window.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    keysPressed[e.code] = true;
    camTransition = null;
  });
  window.addEventListener('keyup', function (e) {
    keysPressed[e.code] = false;
  });

  let isDraggingLook = false;
  let dragStartX = 0, dragStartY = 0;
  let pointerDownX = 0, pointerDownY = 0;
  let draggedDistance = 0;

  container.addEventListener('mousedown', function (e) {
    // Botón central (ruedita presionada: e.button === 1) o clic izquierdo/derecho sobre el visor
    if (e.button === 1 || e.button === 0 || e.button === 2) {
      if (e.button === 1) e.preventDefault(); // Evita el auto-scroll del navegador al presionar la ruedita
      isDraggingLook = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      draggedDistance = 0;
      camTransition = null;
      container.classList.add('dragging');
    }
  });

  window.addEventListener('mousemove', function (e) {
    if (!isDraggingLook) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    draggedDistance += Math.abs(dx) + Math.abs(dy);

    // Giro 360° continuo horizontal (yaw) e inclinación vertical (pitch)
    const sensitivity = 0.0042;
    walker.yaw -= dx * sensitivity;
    walker.pitch = Math.max(-1.42, Math.min(1.42, walker.pitch - dy * sensitivity));
    syncCameraFromWalker();
  });

  window.addEventListener('mouseup', function (e) {
    if (isDraggingLook) {
      isDraggingLook = false;
      container.classList.remove('dragging');
      // Si fue un clic limpio sin arrastrar con botón izquierdo, verificamos si tocó una puerta o cajón 3D
      if (e.button === 0 && draggedDistance < 6) {
        handleCanvasClick(e.clientX, e.clientY);
      }
    }
  });

  container.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // Raycaster para abrir/cerrar puertas y cajones también al hacer clic directo sobre su malla 3D
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();
  function handleCanvasClick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObjects(interactiveMeshes, false);
    if (hits.length > 0) {
      const ag = hits[0].object.userData.animGroup;
      if (ag) toggleOpenable(ag);
    }
  }

  // Zoom con ruedita del mouse arriba y abajo (acerca/aleja suavemente en la dirección de la mirada 3D)
  container.addEventListener('wheel', function (e) {
    e.preventDefault();
    camTransition = null;
    const zoomDir = e.deltaY < 0 ? 1 : -1;
    const step = 0.16 * zoomDir;

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    const nextX = walker.x + forward.x * step;
    const nextY = walker.y + forward.y * step;
    const nextZ = walker.z + forward.z * step;

    // Límites de la habitación permitiendo zoom macro a 6 cm de las texturas
    walker.x = Math.max(-ROOM_W / 2 + 0.25, Math.min(ROOM_W / 2 - 0.25, nextX));
    walker.y = Math.max(0.18, Math.min(ROOM_H - 0.22, nextY));
    walker.z = Math.max(0.64, Math.min(ROOM_D - 0.28, nextZ));
    syncCameraFromWalker();
  }, { passive: false });

  // 10. Bucle de Animación Principal (Movimiento de caminata WASD/Flechas, Apertura de Puertas/Cajones y Proyección de Puntos Concéntricos)
  let lastTime = performance.now();
  const tempVec3 = new THREE.Vector3();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, (now - lastTime) / 1000.0);
    lastTime = now;

    // A. Transición suave de vistas rápidas si está activa
    if (camTransition) {
      camTransition.t = Math.min(1.0, camTransition.t + dt * 2.4);
      const s = camTransition.t * camTransition.t * (3 - 2 * camTransition.t); // smoothstep
      walker.x = camTransition.sx + (camTransition.tx - camTransition.sx) * s;
      walker.y = camTransition.sy + (camTransition.ty - camTransition.sy) * s;
      walker.z = camTransition.sz + (camTransition.tz - camTransition.sz) * s;
      walker.yaw = camTransition.syaw + (camTransition.tyaw - camTransition.syaw) * s;
      walker.pitch = camTransition.spitch + (camTransition.tpitch - camTransition.spitch) * s;
      syncCameraFromWalker();
      if (camTransition.t >= 1.0) camTransition = null;
    } else {
      // B. Caminata en primera persona con W, A, S, D y Flechas direccionales
      let moveFwd = 0;
      let moveRight = 0;
      if (keysPressed['KeyW'] || keysPressed['ArrowUp']) moveFwd += 1;
      if (keysPressed['KeyS'] || keysPressed['ArrowDown']) moveFwd -= 1;
      if (keysPressed['KeyD'] || keysPressed['ArrowRight']) moveRight += 1;
      if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) moveRight -= 1;

      if (moveFwd !== 0 || moveRight !== 0) {
        const len = Math.sqrt(moveFwd * moveFwd + moveRight * moveRight);
        moveFwd /= len;
        moveRight /= len;

        // Dirección horizontal de caminata según el ángulo yaw actual
        const sinY = Math.sin(walker.yaw);
        const cosY = Math.cos(walker.yaw);
        const dirX = -sinY * moveFwd + cosY * moveRight;
        const dirZ = -cosY * moveFwd - sinY * moveRight;

        const dist = walker.speed * dt;
        let nx = walker.x + dirX * dist;
        let nz = walker.z + dirZ * dist;

        // Colisión suave con las paredes de la habitación
        nx = Math.max(-ROOM_W / 2 + 0.32, Math.min(ROOM_W / 2 - 0.32, nx));
        nz = Math.max(0.20, Math.min(ROOM_D - 0.32, nz));

        // Colisión física con el volumen del Bajo Mesada (X: -1.12..+1.12, Z: 0.0..0.76)
        if (nx > -1.12 && nx < 1.12 && nz < 0.78) {
          nz = Math.max(0.78, walker.z);
        }

        walker.x = nx;
        walker.z = nz;
        walker.bobPhase += dist * 5.2;
        // Sutil oscilación natural de paso al caminar
        camera.position.set(walker.x, walker.y + Math.sin(walker.bobPhase) * 0.008, walker.z);
      }
    }

    // C. Animación de apertura/cierre de las 2 puertas y 3 cajones + actualización de Puntos Concéntricos
    const halfW = window.innerWidth * 0.5;
    const halfH = window.innerHeight * 0.5;

    Object.keys(openableStates).forEach(function (id) {
      const st = openableStates[id];
      const diff = st.target - st.progress;
      if (Math.abs(diff) > 0.0005) {
        st.progress += diff * Math.min(1.0, dt * 7.5);
        if (st.sliderEl) {
          st.sliderEl.value = Math.round(st.progress * 100);
        }
      } else {
        st.progress = st.target;
      }

      const op = st.config;
      if (op.type === 'door') {
        const angleRad = THREE.MathUtils.degToRad(op.max_angle_deg * st.progress);
        st.group.rotation.y = angleRad;
      } else if (op.type === 'drawer') {
        st.group.position.set(
          op.hinge_pivot[0] + op.slide_vec[0] * st.progress,
          op.hinge_pivot[1] + op.slide_vec[1] * st.progress,
          op.hinge_pivot[2] + op.slide_vec[2] * st.progress
        );
      }

      // Proyectar la posición 3D del Punto Concéntrico a la pantalla
      if (st.hotspotEl) {
        tempVec3.set(op.hotspot_local[0], op.hotspot_local[1], op.hotspot_local[2]);
        st.group.localToWorld(tempVec3);
        tempVec3.project(camera);

        if (tempVec3.z < 1.0 && tempVec3.z > -1.0) {
          const sx = (tempVec3.x * halfW) + halfW;
          const sy = -(tempVec3.y * halfH) + halfH;
          st.hotspotEl.style.display = 'flex';
          st.hotspotEl.style.left = sx.toFixed(1) + 'px';
          st.hotspotEl.style.top = sy.toFixed(1) + 'px';
        } else {
          st.hotspotEl.style.display = 'none';
        }
      }
    });

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  requestAnimationFrame(animate);
})();
