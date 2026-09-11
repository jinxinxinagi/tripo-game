import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* ============================================================
   云朵水乡 · 小猫飞行记
   A cartoon water-town sky platformer. Core assets (cat hero,
   floating island, house, bridge) are generated with Tripo3D
   from the reference artwork; everything else is procedural.
   ============================================================ */

const app = document.getElementById("app");
const ui = {
  score: document.getElementById("score"),
  total: document.getElementById("total"),
  lives: document.getElementById("lives"),
  hint: document.getElementById("hint"),
  loading: document.getElementById("loading"),
  startOverlay: document.getElementById("startOverlay"),
  endOverlay: document.getElementById("endOverlay"),
  endTitle: document.getElementById("endTitle"),
  endText: document.getElementById("endText"),
};

/* ---------------- renderer / scene ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87cefa);
scene.fog = new THREE.Fog(0x87cefa, 55, 220);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);

/* ---------------- lights ---------------- */
const hemi = new THREE.HemisphereLight(0xcfefff, 0x8ec77f, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
sun.position.set(-28, 42, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 160;
sun.shadow.camera.left = -55;
sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55;
sun.shadow.camera.bottom = -55;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

/* ---------------- helpers ---------------- */
const loader = new GLTFLoader();
function loadGLB(url) {
  return new Promise((resolve, reject) =>
    loader.load(url, (g) => resolve(g), undefined, reject)
  );
}
function normalizeScale(obj, targetSize, mode = "height") {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  const dim = mode === "height" ? size.y : Math.max(size.x, size.y, size.z);
  const s = targetSize / (dim || 1);
  obj.scale.setScalar(s);
  return obj;
}
function groundObject(obj) {
  // move object so its bounding-box bottom sits at local y=0
  const box = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box.min.y;
  return obj;
}
function enableShadows(obj, cast = true, receive = true) {
  obj.traverse((c) => {
    if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; }
  });
  return obj;
}

const rand = (a, b) => a + Math.random() * (b - a);

/* ---------------- water ---------------- */
const WATER_Y = 0;
const waterGeo = new THREE.PlaneGeometry(600, 600, 96, 96);
waterGeo.rotateX(-Math.PI / 2);
const waterMat = new THREE.MeshPhongMaterial({
  color: 0x2fa4d8, shininess: 120, specular: 0x99ddff,
  transparent: true, opacity: 0.92, flatShading: true,
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.position.y = WATER_Y;
water.receiveShadow = true;
scene.add(water);
const waterPos = waterGeo.attributes.position;
const waterBase = waterPos.array.slice();

function animateWater(t) {
  for (let i = 0; i < waterPos.count; i++) {
    const x = waterBase[i * 3], z = waterBase[i * 3 + 2];
    waterPos.array[i * 3 + 1] =
      Math.sin(x * 0.12 + t * 1.4) * 0.28 + Math.cos(z * 0.16 + t * 1.1) * 0.22;
  }
  waterPos.needsUpdate = true;
  waterGeo.computeVertexNormals();
}

/* ---------------- clouds ---------------- */
const clouds = [];
function makeCloud() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(rand(0.9, 1.9), 10, 8), mat);
    s.position.set(rand(-2.2, 2.2), rand(-0.35, 0.4), rand(-0.9, 0.9));
    s.scale.y = 0.62;
    g.add(s);
  }
  return g;
}
for (let i = 0; i < 16; i++) {
  const c = makeCloud();
  c.position.set(rand(-120, 120), rand(16, 34), rand(-160, 40));
  c.scale.setScalar(rand(1.4, 3.2));
  scene.add(c);
  clouds.push({ obj: c, speed: rand(0.3, 0.9) });
}

/* ---------------- distant hills & pagoda ---------------- */
function makeHill(x, z, s, color) {
  const h = new THREE.Mesh(
    new THREE.ConeGeometry(s, s * 1.1, 7),
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
  );
  h.position.set(x, s * 0.55 - 1.5, z);
  h.rotation.y = rand(0, Math.PI);
  scene.add(h);
}
makeHill(-70, -120, 34, 0x6fbf73);
makeHill(-30, -140, 46, 0x5cb3a0);
makeHill(28, -130, 40, 0x6fbf73);
makeHill(75, -115, 30, 0x7cc98f);
makeHill(0, -180, 60, 0x5cb3a0);

function makePagoda() {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3e2c7, roughness: 0.85, flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xc94f4f, roughness: 0.8, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x39424e, roughness: 0.6, flatShading: true });
  let y = 0;
  let w = 5.2;
  for (let i = 0; i < 5; i++) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.56, 2.0, 8), wallMat);
    body.position.y = y + 1.0;
    g.add(body);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.56, w * 0.56, 0.32, 8), trimMat);
    band.position.y = y + 1.95;
    g.add(band);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.86, 1.15, 8), roofMat);
    roof.position.y = y + 2.6;
    g.add(roof);
    y += 2.75;
    w *= 0.82;
  }
  const finial = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 1.6, 8),
    new THREE.MeshStandardMaterial({ color: 0xf7c948, metalness: 0.5, roughness: 0.4 })
  );
  finial.position.y = y + 0.6;
  g.add(finial);
  g.traverse((c) => { if (c.isMesh) { c.castShadow = true; } });
  return g;
}
const pagoda = makePagoda();
pagoda.position.set(0, 0, -118);
scene.add(pagoda);

/* ---------------- procedural trees ---------------- */
function makeCherryTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, 1.8, 7),
    new THREE.MeshStandardMaterial({ color: 0x7a4a2b, roughness: 1, flatShading: true }));
  trunk.position.y = 0.9;
  trunk.rotation.z = rand(-0.14, 0.14);
  g.add(trunk);
  const pink = new THREE.MeshStandardMaterial({ color: 0xffb7d5, roughness: 1, flatShading: true });
  const pink2 = new THREE.MeshStandardMaterial({ color: 0xff9ec7, roughness: 1, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(rand(0.7, 1.1), 9, 7), i % 2 ? pink : pink2);
    b.position.set(rand(-0.8, 0.8), rand(1.9, 2.9), rand(-0.8, 0.8));
    b.scale.y = 0.8;
    g.add(b);
  }
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function makeWillow() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.34, 2.6, 7),
    new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 1, flatShading: true }));
  trunk.position.y = 1.3;
  g.add(trunk);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x7fd65a, roughness: 1, flatShading: true, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const len = rand(1.6, 2.4);
    const strand = new THREE.Mesh(new THREE.ConeGeometry(0.16, len, 5), leaf);
    const a = (i / 9) * Math.PI * 2;
    strand.position.set(Math.cos(a) * 0.75, 2.5 - len * 0.32, Math.sin(a) * 0.75);
    strand.rotation.x = Math.cos(a) * 0.5;
    strand.rotation.z = Math.sin(a) * 0.5 + Math.PI;
    g.add(strand);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.95, 9, 7),
    new THREE.MeshStandardMaterial({ color: 0x8ee06a, roughness: 1, flatShading: true }));
  crown.position.y = 2.7;
  crown.scale.y = 0.7;
  g.add(crown);
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  return g;
}

/* ---------------- lanterns ---------------- */
function makeLantern() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xff4a3d, roughness: 0.55, emissive: 0x882211, emissiveIntensity: 0.5 }));
  body.scale.y = 1.15;
  g.add(body);
  const capMat = new THREE.MeshStandardMaterial({ color: 0xf7c948, roughness: 0.4, metalness: 0.4 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 8), capMat);
  cap.position.y = 0.42;
  g.add(cap);
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.42, 6), capMat);
  tassel.position.y = -0.55;
  g.add(tassel);
  const light = new THREE.PointLight(0xff7a55, 0.9, 5);
  g.add(light);
  return g;
}

/* ============================================================
   LEVEL LAYOUT
   ============================================================ */
const platforms = [];   // {x,y,z,w,d,h, top() }
const collectibles = [];
const movers = [];
let islandProto = null, houseProto = null, bridgeProto = null, catProto = null;

function addPlatform(mesh, w, d, h, x, y, z) {
  mesh.position.set(x, y, z);
  scene.add(mesh);
  platforms.push({ x, y, z, w, d, h, top: y + h });
}

function addIslandPlatform(x, y, z, s = 2.6) {
  if (islandProto) {
    const m = islandProto.clone();
    normalizeScale(m, s, "max");
    groundObject(m);
    enableShadows(m);
    const box = new THREE.Box3().setFromObject(m);
    const size = new THREE.Vector3(); box.getSize(size);
    addPlatform(m, size.x * 0.82, size.z * 0.82, size.y, x, y - size.y, z);
    return;
  }
  const g = new THREE.Group();
  const dirt = new THREE.Mesh(
    new THREE.CylinderGeometry(s * 0.42, s * 0.16, s * 0.55, 9),
    new THREE.MeshStandardMaterial({ color: 0xb8743c, roughness: 1, flatShading: true }));
  dirt.position.y = -s * 0.275;
  g.add(dirt);
  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(s * 0.5, s * 0.44, s * 0.18, 9),
    new THREE.MeshStandardMaterial({ color: 0x62c24a, roughness: 1, flatShading: true }));
  grass.position.y = s * 0.09 - 0.001;
  g.add(grass);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(s * 0.16, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x54b23f, roughness: 1, flatShading: true }));
  tuft.position.set(s * 0.2, s * 0.22, -s * 0.1);
  g.add(tuft);
  g.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  addPlatform(g, s, s, s * 0.18, x, y - s * 0.18, z);
}

function addMovingIsland(x1, x2, y, z, period = 4, s = 2.4) {
  const g = new THREE.Group();
  const dirt = new THREE.Mesh(
    new THREE.CylinderGeometry(s * 0.42, s * 0.16, s * 0.55, 9),
    new THREE.MeshStandardMaterial({ color: 0xb8743c, roughness: 1, flatShading: true }));
  dirt.position.y = -s * 0.275;
  g.add(dirt);
  const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(s * 0.5, s * 0.44, s * 0.18, 9),
    new THREE.MeshStandardMaterial({ color: 0x74d457, roughness: 1, flatShading: true }));
  grass.position.y = s * 0.09 - 0.001;
  g.add(grass);
  g.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  scene.add(g);
  const p = { x: x1, y: y - s * 0.18, z, w: s, d: s, h: s * 0.18, top: y, obj: g };
  platforms.push(p);
  movers.push({ p, x1, x2, y, period, phase: Math.random() * Math.PI * 2 });
}

function addHousePlatform(x, y, z, rotY = 0, s = 5.2) {
  let mesh;
  if (houseProto) {
    mesh = houseProto.clone();
    normalizeScale(mesh, s, "height");
    groundObject(mesh);
    enableShadows(mesh);
    mesh.rotation.y = rotY;
  } else {
    mesh = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 3.4),
      new THREE.MeshStandardMaterial({ color: 0xf5ecdc, roughness: 0.9 }));
    wall.position.y = 1.3; mesh.add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x39424e, roughness: 0.7, flatShading: true }));
    roof.position.y = 3.3; roof.rotation.y = Math.PI / 4; mesh.add(roof);
    mesh.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    mesh.rotation.y = rotY;
  }
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3(); box.getSize(size);
  // broad roof edge serves as walkable rooftop platform
  addPlatform(mesh, size.x * 0.9, size.z * 0.9, size.y, x, y, z);
}

function addBridge(x, y, z, rotY = 0, s = 12) {
  let mesh;
  if (bridgeProto) {
    mesh = bridgeProto.clone();
    normalizeScale(mesh, s, "max");
    groundObject(mesh);
    enableShadows(mesh);
    mesh.rotation.y = rotY;
  } else {
    mesh = new THREE.Group();
    const arc = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.55, 8, 16, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xd9d2c4, roughness: 0.9, flatShading: true }));
    arc.rotation.z = 0; arc.rotation.x = 0;
    arc.scale.z = 0.45;
    mesh.add(arc);
    mesh.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    mesh.rotation.y = rotY;
  }
  mesh.position.set(x, y, z);
  scene.add(mesh);
  // walkable approximation: series of thin slabs forming the arc
  const span = s * 0.86;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const lx = (t - 0.5) * span;
    const h = Math.sin(t * Math.PI) * s * 0.16 + 0.5;
    const cos = Math.cos(rotY), sin = Math.sin(rotY);
    platforms.push({
      x: x + lx * cos, z: z + lx * sin,
      w: span / n * 1.3, d: s * 0.22,
      h: 0.6, top: y + h, arc: true,
    });
  }
}

/* ---------------- the level ---------------- */
function buildLevel() {
  // start terrace
  addIslandPlatform(0, 2.4, 8, 7);
  // first hops across small islands
  addIslandPlatform(4.6, 2.9, 2.5, 2.7);
  addIslandPlatform(8.4, 3.5, -3.5, 2.5);
  addIslandPlatform(6.4, 4.2, -9.5, 2.4);
  // house rooftop rest stop
  addHousePlatform(0, 0.6, -16, Math.PI * 0.5, 6.4);
  // garden terraces with trees
  addIslandPlatform(-6.2, 5.0, -22, 3.6);
  addIslandPlatform(-11.5, 5.6, -29, 3.0);
  // moving island chain
  addMovingIsland(-8, -16, 6.2, -37, 5.2, 2.5);
  addIslandPlatform(-19.5, 6.9, -45, 2.6);
  addIslandPlatform(-15.5, 7.6, -53, 2.3);
  // second house + lantern alley
  addHousePlatform(-6, 0.8, -62, Math.PI * 0.2, 5.6);
  addIslandPlatform(1.5, 8.4, -70, 3.2);
  addMovingIsland(2, 10, 9.0, -78, 4.4, 2.4);
  addIslandPlatform(13.5, 9.6, -86, 2.6);
  // the big stone bridge to the pagoda island
  addBridge(8, 0.4, -101, Math.PI * 0.5, 17);
  // final island with pagoda
  addIslandPlatform(0, 3.2, -114, 9);

  // trees & dressing
  const treeSpots = [[-1.8, 2.4 + 0.001, 6.2], [-6.6, 5.0, -21.2], [-12.1, 5.6, -29.5], [1.9, 8.4, -70.5], [1.8, 3.2, -112]];
  for (const [x, y, z] of treeSpots) {
    const t = Math.random() < 0.5 ? makeCherryTree() : makeWillow();
    t.position.set(x, y, z);
    scene.add(t);
  }
  const lanternSpots = [[0, 4.6, -14.6], [-6, 5.4, -61.2], [0.2, 4.0, -110.5]];
  for (const [x, y, z] of lanternSpots) {
    const l = makeLantern();
    l.position.set(x, y, z);
    scene.add(l);
    movers.push({ lantern: l, baseY: y, phase: Math.random() * 6 });
  }

  // collectible leaves along the path
  const leafPath = [
    [0, 4.2, 8], [4.6, 4.7, 2.5], [8.4, 5.3, -3.5], [6.4, 6.0, -9.5],
    [0, 8.0, -16], [-6.2, 6.8, -22], [-11.5, 7.4, -29], [-12, 8.0, -37],
    [-19.5, 8.7, -45], [-15.5, 9.4, -53], [-6, 7.4, -62], [1.5, 10.2, -70],
    [6, 10.8, -78], [13.5, 11.4, -86], [8, 5.4, -97], [8, 5.4, -105], [0, 5.0, -114],
  ];
  for (const [x, y, z] of leafPath) addLeaf(x, y, z);
}

/* ---------------- collectible leaves ---------------- */
const leafMat = new THREE.MeshStandardMaterial({
  color: 0x66d94e, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x1d4d12, emissiveIntensity: 0.25,
});
function addLeaf(x, y, z) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.55, 0.35, 0.0, 1.15);
  shape.quadraticCurveTo(-0.55, 0.35, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 10);
  geo.rotateX(-Math.PI / 2.6);
  const m = new THREE.Mesh(geo, leafMat);
  m.position.set(x, y, z);
  m.castShadow = true;
  scene.add(m);
  collectibles.push({ obj: m, x, y, z, taken: false, phase: Math.random() * 6 });
}

/* ============================================================
   PLAYER
   ============================================================ */
const player = {
  obj: new THREE.Group(),
  vel: new THREE.Vector3(),
  grounded: false,
  radius: 0.55,
  height: 2.1,
  spawn: new THREE.Vector3(0, 3.4, 8),
  facing: 0,
  lives: 3,
  invuln: 0,
};
scene.add(player.obj);

let leafBoard = null;
function makeLeafBoard() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(1.5, 0.9, 0.0, 3.1);
  shape.quadraticCurveTo(-1.5, 0.9, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 14);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0x74d94e, roughness: 0.55, side: THREE.DoubleSide,
  }));
  m.castShadow = true;
  return m;
}

function setupPlayerModel() {
  if (catProto) {
    const cat = catProto.clone();
    normalizeScale(cat, 1.9, "height");
    groundObject(cat);
    enableShadows(cat);
    // Tripo model is built lying forward (long axis on Z). Tip it upright
    // so the head points -Z (the direction of travel) and paws face down.
    const wrapper = new THREE.Group();
    cat.rotation.x = Math.PI / 2;   // stand up
    wrapper.add(cat);
    wrapper.position.y = 0.28;
    player.obj.add(wrapper);
  } else {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.7, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff6ee, roughness: 0.8 }));
    body.position.y = 1.0;
    body.castShadow = true;
    player.obj.add(body);
    const scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.13, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x59c257, roughness: 0.8 }));
    scarf.position.y = 1.45;
    scarf.rotation.x = Math.PI / 2;
    player.obj.add(scarf);
  }
  leafBoard = makeLeafBoard();
  player.obj.add(leafBoard);
}

/* ---------------- input ---------------- */
const keys = {};
addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Space") e.preventDefault();
  if (e.code === "KeyR") restart();
});
addEventListener("keyup", (e) => (keys[e.code] = false));

/* touch controls */
const touchState = { active: false, x: 0, y: 0, jump: false };
if ("ontouchstart" in window) document.body.classList.add("touch-mode");
const stickZone = document.getElementById("stickZone");
const stickNub = document.getElementById("stickNub");
let stickId = null;
stickZone.addEventListener("touchstart", (e) => {
  stickId = e.changedTouches[0].identifier;
  touchState.active = true;
}, { passive: true });
addEventListener("touchmove", (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === stickId) {
      const r = stickZone.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      touchState.x = dx; touchState.y = dy;
      stickNub.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
    }
  }
}, { passive: true });
addEventListener("touchend", (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === stickId) {
      stickId = null; touchState.active = false;
      touchState.x = 0; touchState.y = 0;
      stickNub.style.transform = "translate(0,0)";
    }
  }
});
document.getElementById("jumpBtn").addEventListener("touchstart", (e) => {
  e.preventDefault();
  touchState.jump = true;
}, { passive: false });

/* ---------------- game state ---------------- */
let state = "menu"; // menu | playing | won | dead
let score = 0;
const clock = new THREE.Clock();

function restart() {
  score = 0;
  player.lives = 3;
  player.vel.set(0, 0, 0);
  player.obj.position.copy(player.spawn);
  player.invuln = 0;
  for (const c of collectibles) { c.taken = false; c.obj.visible = true; }
  ui.score.textContent = "0";
  ui.lives.textContent = "3";
  ui.endOverlay.classList.add("hidden");
  state = "playing";
  ui.hint.style.opacity = 1;
  setTimeout(() => (ui.hint.style.opacity = 0), 6000);
}

document.getElementById("startBtn").addEventListener("click", () => {
  ui.startOverlay.classList.add("hidden");
  restart();
});
document.getElementById("restartBtn").addEventListener("click", restart);

function win() {
  state = "won";
  ui.endTitle.textContent = "抵达宝塔，通关啦！";
  ui.endText.textContent = `你收集了 ${score} / ${collectibles.length} 片叶子。水乡的天空因你更绿了。`;
  ui.endOverlay.classList.remove("hidden");
}
function die() {
  player.lives -= 1;
  ui.lives.textContent = String(Math.max(0, player.lives));
  if (player.lives <= 0) {
    state = "dead";
    ui.endTitle.textContent = "掉进了水里…";
    ui.endText.textContent = `小猫被捞了上来，晒晒太阳再出发吧。收集到 ${score} 片叶子。`;
    ui.endOverlay.classList.remove("hidden");
  } else {
    player.obj.position.copy(player.spawn);
    player.vel.set(0, 0, 0);
    player.invuln = 2;
  }
}

/* ---------------- physics ---------------- */
const GRAVITY = 24;
const SPEED = 8.5;
const JUMP = 11.5;
let coyote = 0, jumpBuf = 0;

function updatePlayer(dt) {
  const p = player.obj.position;

  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (touchState.active) { ix += touchState.x; iz += touchState.y; }
  const ilen = Math.hypot(ix, iz);
  if (ilen > 1) { ix /= ilen; iz /= ilen; }

  const wantJump = keys.Space || touchState.jump;
  if (wantJump) jumpBuf = 0.12;
  touchState.jump = false;
  jumpBuf -= dt;
  coyote -= dt;
  player.invuln -= dt;

  // horizontal accel
  const accel = player.grounded ? 60 : 32;
  player.vel.x += (ix * SPEED - player.vel.x) * Math.min(1, accel * dt / SPEED * 6);
  player.vel.z += (iz * SPEED - player.vel.z) * Math.min(1, accel * dt / SPEED * 6);
  if (ilen < 0.01 && player.grounded) {
    player.vel.x *= Math.max(0, 1 - dt * 10);
    player.vel.z *= Math.max(0, 1 - dt * 10);
  }

  // jump
  if (jumpBuf > 0 && (player.grounded || coyote > 0)) {
    player.vel.y = JUMP;
    player.grounded = false;
    coyote = 0; jumpBuf = 0;
  }

  player.vel.y -= GRAVITY * dt;
  player.vel.y = Math.max(player.vel.y, -30);

  const prev = p.clone();
  p.x += player.vel.x * dt;
  p.z += player.vel.z * dt;
  p.y += player.vel.y * dt;

  // collision: land on platform tops
  player.grounded = false;
  let groundPlatform = null;
  for (const pl of platforms) {
    const hw = pl.w / 2 + player.radius * 0.5;
    const hd = pl.d / 2 + player.radius * 0.5;
    if (Math.abs(p.x - pl.x) < hw && Math.abs(p.z - pl.z) < hd) {
      const top = pl.top;
      if (prev.y >= top - 0.05 && p.y <= top && player.vel.y <= 0) {
        p.y = top;
        player.vel.y = 0;
        player.grounded = true;
        coyote = 0.12;
        groundPlatform = pl;
      }
    }
  }
  // ride moving platforms
  if (groundPlatform) {
    const mv = movers.find((m) => m.p === groundPlatform);
    if (mv && mv.dx) { p.x += mv.dx; }
  }

  // fell into water
  if (p.y < WATER_Y - 1.2) die();

  // face movement direction
  if (ilen > 0.05) {
    const target = Math.atan2(player.vel.x, player.vel.z);
    let d = target - player.facing;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    player.facing += d * Math.min(1, dt * 10);
  }
  player.obj.rotation.y = player.facing;

  // hop / tilt animation
  const speed = Math.hypot(player.vel.x, player.vel.z);
  const t = clock.elapsedTime;
  if (player.grounded) {
    player.obj.rotation.x = THREE.MathUtils.lerp(player.obj.rotation.x, 0, dt * 8);
    player.obj.rotation.z = Math.sin(t * 10) * 0.04 * Math.min(1, speed / 4);
  } else {
    player.obj.rotation.x = THREE.MathUtils.lerp(player.obj.rotation.x, -0.25 * Math.sign(player.vel.y), dt * 5);
  }
  if (leafBoard) {
    leafBoard.position.y = 0.12 + Math.sin(t * 3.2) * 0.06;
    leafBoard.rotation.y = Math.sin(t * 1.4) * 0.15;
    leafBoard.visible = !player.grounded || speed > 1;
  }
  if (player.invuln > 0) {
    player.obj.visible = Math.floor(t * 12) % 2 === 0;
  } else player.obj.visible = true;

  // collect leaves
  for (const c of collectibles) {
    if (c.taken) continue;
    const dx = p.x - c.x, dy = p.y + 1 - c.y, dz = p.z - c.z;
    if (dx * dx + dy * dy + dz * dz < 1.44) {
      c.taken = true;
      c.obj.visible = false;
      score += 1;
      ui.score.textContent = String(score);
      popLeaf(c.x, c.y, c.z);
    }
  }

  // win check: reach pagoda island top
  if (p.z < -109 && p.y > 3.0 && Math.abs(p.x) < 5 && state === "playing") win();
}

/* pickup particle burst */
const pops = [];
function popLeaf(x, y, z) {
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xa5f07e, transparent: true }));
    m.position.set(x, y, z);
    scene.add(m);
    pops.push({
      obj: m, life: 0.6,
      vel: new THREE.Vector3(rand(-2.4, 2.4), rand(1.5, 4), rand(-2.4, 2.4)),
    });
  }
}

/* ---------------- camera ---------------- */
const camTarget = new THREE.Vector3();
function updateCamera(dt) {
  const p = player.obj.position;
  camTarget.set(p.x, p.y + 4.6, p.z + 10.5);
  camera.position.lerp(camTarget, Math.min(1, dt * 3.2));
  camera.lookAt(p.x, p.y + 1.4, p.z - 2);
}

/* ---------------- movers & ambient anim ---------------- */
function updateMovers(t) {
  for (const m of movers) {
    if (m.p) {
      const nx = THREE.MathUtils.lerp(m.x1, m.x2, (Math.sin(t * (Math.PI * 2 / m.period) + m.phase) + 1) / 2);
      m.dx = nx - m.p.x;
      m.p.x = nx;
      m.p.obj.position.x = nx;
    } else if (m.lantern) {
      m.lantern.position.y = m.baseY + Math.sin(t * 1.6 + m.phase) * 0.16;
      m.lantern.rotation.y = t * 0.5;
    }
  }
}
function updateCollectibles(t) {
  for (const c of collectibles) {
    if (c.taken) continue;
    c.obj.position.y = c.y + Math.sin(t * 2 + c.phase) * 0.22;
    c.obj.rotation.y = t * 1.8 + c.phase;
  }
}
function updatePops(dt) {
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i];
    p.life -= dt;
    p.obj.position.addScaledVector(p.vel, dt);
    p.vel.y -= 6 * dt;
    p.obj.material.opacity = Math.max(0, p.life / 0.6);
    if (p.life <= 0) {
      scene.remove(p.obj);
      pops.splice(i, 1);
    }
  }
}

/* ---------------- boot ---------------- */
async function boot() {
  ui.loading.classList.add("show");
  ui.total.textContent = "…";
  const loads = [
    ["assets/models/cat.glb", (g) => (catProto = g.scene)],
    ["assets/models/island.glb", (g) => (islandProto = g.scene)],
    ["assets/models/house.glb", (g) => (houseProto = g.scene)],
    ["assets/models/bridge.glb", (g) => (bridgeProto = g.scene)],
  ];
  await Promise.all(loads.map(async ([url, set]) => {
    try { set(await loadGLB(url)); }
    catch { console.warn("model missing, using procedural fallback:", url); }
  }));
  buildLevel();
  setupPlayerModel();
  player.obj.position.copy(player.spawn);
  ui.total.textContent = String(collectibles.length);
  ui.loading.classList.remove("show");
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  animateWater(t);
  updateMovers(t);
  updateCollectibles(t);
  updatePops(dt);
  for (const c of clouds) {
    c.obj.position.x += c.speed * dt;
    if (c.obj.position.x > 140) c.obj.position.x = -140;
  }
  if (state === "playing") updatePlayer(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

boot().finally(() => {
  camera.position.set(0, 8, 20);
  loop();
});
