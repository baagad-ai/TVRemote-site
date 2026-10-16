// Live three.js scene for the single pinned section (Concept B §2.2): a stylised TV + phone, scroll-driven.
// Loaded lazily (dynamic import) only when the pin nears view, with the page's one GPU lease already held by the caller.
// Production: Build's pin-tv-phone.glb + pin-contract.json (cameras cam_search / cam_results / cam_link, textures per
// step, scroll ranges and swap points). Until those land: the existing remote-hero.glb (HeroPhone, HeroTV, PhoneScreen,
// TVScreen), cameras framed from its own bounds, and the same textures the DOM stills use. Textures swap only while the
// camera is at rest (0.2 s crossfade); the camera eases between keyframes. Demand rendering, DPR <= 1.5.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'; // Build's GLB requires EXT_meshopt_compression

export const STEP_IDS = ['search', 'results', 'link'];
// Placeholder timeline (progress 0..1 over the 300vh pin). Camera moves and texture swaps never overlap; snap points
// 0 / .5 / 1 land inside the holds.
export const PLACEHOLDER = {
  steps: [
    { id: 'search', camera: 'cam_search', range: [0, .33], swapAt: 0 },
    { id: 'results', camera: 'cam_results', range: [.33, .66], swapAt: .43 },
    { id: 'link', camera: 'cam_link', range: [.66, 1], swapAt: .79 }
  ],
  moves: [[.25, .40], [.60, .76]] // camera transitions search->results, results->link
};
const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // power2.inOut
function parseGLB(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(8, true) !== buffer.byteLength) throw Error('Invalid scene');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, view.getUint32(12, true))));
  if ([...(json.buffers || []), ...(json.images || [])].some(item => item.uri && !item.uri.startsWith('data:'))) throw Error('External scene resources are not allowed');
  return buffer;
}
// Normalise Build's contract into { model, steps:[{id,camera,range,swapAt}], moves, cameras, screens:{phone,tv}:[{at,url}] }.
// Build's pin-contract.json v1: steps[].PhoneScreen/TVScreen name a key in textures{} (file relative to the contract),
// timeline.camera_moves[].progress are the camera transitions and timeline.texture_swaps[] swap ONE screen at a time,
// always outside a camera move. Step copy follows step ranges. Older/placeholder shapes still work.
export function normaliseContract(raw, base) {
  const url = p => p && new URL(p, base).href, tex = key => url(raw.textures?.[key]?.file || key);
  const steps = (raw.steps || []).map((s, i) => ({
    id: s.id || STEP_IDS[i], camera: s.camera || s.cameraKeyframe || s.cam || PLACEHOLDER.steps[i].camera,
    range: s.range || s.scroll || s.scrollRange || PLACEHOLDER.steps[i].range,
    swapAt: s.swapAt ?? s.swap ?? s.textureSwap ?? (s.range ? s.range[0] : PLACEHOLDER.steps[i].swapAt),
    phone: (s.PhoneScreen && tex(s.PhoneScreen)) || url(s.textures?.PhoneScreen || s.phone || s.phoneTexture),
    tv: (s.TVScreen && tex(s.TVScreen)) || url(s.textures?.TVScreen || s.tv || s.tvTexture)
  }));
  const moves = raw.timeline?.camera_moves?.map(m => m.progress) || raw.moves || raw.cameraMoves || steps.slice(1).map((s, i) => { const prev = steps[i]; const a = s.range[0] - (prev.range[1] - prev.range[0]) * .25; return [Math.max(0, a), Math.min(s.swapAt - .02, s.range[0] + (s.range[1] - s.range[0]) * .3)]; });
  let screens = null;
  if (raw.timeline?.texture_swaps?.length) {
    const first = raw.steps?.[0] || {}, typing = first.optional_typing_beat;
    screens = { phone: [{ at: 0, url: tex(typing?.PhoneScreen || first.PhoneScreen) }], tv: [{ at: 0, url: tex(first.TVScreen) }] };
    for (const sw of [...raw.timeline.texture_swaps].sort((a, b) => a.at - b.at)) {
      const list = sw.screen === (raw.nodes?.tv_screen || 'TVScreen') ? screens.tv : screens.phone;
      if (sw.optional && !typing) continue;
      list.push({ at: sw.at, url: tex(sw.to) });
    }
  }
  return { model: url(raw.model || raw.glb || 'pin-tv-phone.glb'), phoneMesh: raw.nodes?.phone_screen || raw.meshes?.phone || 'PhoneScreen', tvMesh: raw.nodes?.tv_screen || raw.meshes?.tv || 'TVScreen', steps, moves, screens, cameras: raw.cameras || null, flipY: raw.screen_texture?.flipY ?? raw.flipY ?? false, build: Boolean(raw.timeline) };
}
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FRAG = 'uniform sampler2D mapA; uniform sampler2D mapB; uniform float mixv; varying vec2 vUv; void main(){ gl_FragColor = mix(texture2D(mapA, vUv), texture2D(mapB, vUv), mixv);\n#include <colorspace_fragment>\n}';

export async function createPinScene(host, { contractUrl, modelUrl, tvTextures, phoneTextures, signal }) {
  let contract;
  if (contractUrl) {
    const response = await fetch(contractUrl, { credentials: 'omit', signal }); if (!response.ok) throw Error('Contract unavailable');
    contract = normaliseContract(await response.json(), new URL(contractUrl, location.href));
    if (modelUrl) contract.model = new URL(modelUrl, location.href).href;
  } else contract = { model: new URL(modelUrl, location.href).href, phoneMesh: 'PhoneScreen', tvMesh: 'TVScreen', steps: PLACEHOLDER.steps.map(s => ({ ...s })), moves: PLACEHOLDER.moves, cameras: null, flipY: false, placeholder: true };
  contract.steps.forEach((s, i) => { s.phone ||= phoneTextures[i]; s.tv ||= tvTextures[i]; });
  contract.screens ||= { phone: contract.steps.map(s => ({ at: s.swapAt, url: s.phone })), tv: contract.steps.map(s => ({ at: s.swapAt, url: s.tv })) };

  let disposed = false, frame = 0, progress = 0, shown = -1, width = 1, height = 1;
  const disposeList = [];
  const response = await fetch(contract.model, { credentials: 'omit', signal }); if (!response.ok) throw Error('Scene unavailable');
  const buffer = await response.arrayBuffer(); if (buffer.byteLength > 1_100_000) throw Error('Scene exceeds budget');
  await MeshoptDecoder.ready;
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(parseGLB(buffer), '');
  const root = gltf.scene;
  root.getObjectByName('FocusRail')?.removeFromParent(); // placeholder GLB: drop the lime corner brackets
  const phoneScreen = root.getObjectByName(contract.phoneMesh), tvScreen = root.getObjectByName(contract.tvMesh);
  if (!phoneScreen || !tvScreen) throw Error('Scene contract mismatch');

  // Cameras: Build's named GLB cameras (or contract cameras) win; else frame the placeholder from its own bounds.
  const keyframes = {};
  root.updateMatrixWorld(true);
  for (const cam of gltf.cameras || []) {
    const node = cam.parent && cam.parent.name ? cam.parent : cam, id = [cam.name, node.name].find(n => /^cam/.test(n || ''));
    if (!id) continue;
    const position = new THREE.Vector3(), quaternion = new THREE.Quaternion(); cam.getWorldPosition(position); cam.getWorldQuaternion(quaternion);
    keyframes[id.replace(/[-.]/g, '_')] = { position, quaternion, fov: cam.isPerspectiveCamera ? cam.fov : null, zoom: cam.isOrthographicCamera ? (cam.right - cam.left) : null };
  }
  if (contract.cameras) for (const [id, c] of Object.entries(contract.cameras)) {
    const position = new THREE.Vector3().fromArray(c.position), target = new THREE.Vector3().fromArray(c.target || [0, 0, 0]);
    const m = new THREE.Matrix4().lookAt(position, target, new THREE.Vector3(0, 1, 0));
    keyframes[id.replace(/[-.]/g, '_')] = { position, quaternion: new THREE.Quaternion().setFromRotationMatrix(m), fov: c.fov ?? null, zoom: c.orthographic_scale ?? null };
  }
  const perspective = Object.values(keyframes).some(k => k.fov);
  if (!contract.steps.every(s => keyframes[s.camera.replace(/[-.]/g, '_')])) {
    // Placeholder framing: same viewing direction as the hero render; ortho spans fitted to phone, TV, then both.
    const dir = new THREE.Vector3(3.3, 4.1, 14.7).normalize();
    const box = name => new THREE.Box3().setFromObject(root.getObjectByName(name) || root);
    const phone = box('HeroPhone'), tv = box('HeroTV'), all = new THREE.Box3().setFromObject(root);
    const frameBox = (b, pad, bias = new THREE.Vector3()) => { const c = b.getCenter(new THREE.Vector3()).add(bias), s = b.getSize(new THREE.Vector3()); const position = c.clone().addScaledVector(dir, 20); const m = new THREE.Matrix4().lookAt(position, c, new THREE.Vector3(0, 1, 0)); return { position, quaternion: new THREE.Quaternion().setFromRotationMatrix(m), fov: null, zoom: Math.max(s.x, s.y * 1.6) * pad }; };
    keyframes.cam_search = frameBox(phone.clone().union(new THREE.Box3(tv.min.clone().lerp(tv.max, .1), tv.min.clone().lerp(tv.max, .5))), 1.3);
    keyframes.cam_results = frameBox(tv, 1.18, new THREE.Vector3(-.3, -.35, 0));
    keyframes.cam_link = frameBox(all, 1.12);
  }
  const camera = perspective ? new THREE.PerspectiveCamera(35, 16 / 10, .01, 200) : new THREE.OrthographicCamera(-4, 4, 3, -3, .01, 200);
  const kf = id => keyframes[id.replace(/[-.]/g, '_')];

  // Screen materials with a two-texture crossfade.
  const loader = new THREE.TextureLoader();
  const load = url => new Promise((resolve, reject) => loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.flipY = contract.flipY; t.anisotropy = 4; disposeList.push(t); resolve(t); }, undefined, reject));
  const cache = new Map(), get = u => { if (!cache.has(u)) cache.set(u, load(u)); return cache.get(u); };
  const lists = { phone: await Promise.all(contract.screens.phone.map(async e => ({ at: e.at, map: await get(e.url) }))), tv: await Promise.all(contract.screens.tv.map(async e => ({ at: e.at, map: await get(e.url) }))) };
  if (signal?.aborted) { disposeList.forEach(x => x.dispose()); throw Error('aborted'); }
  const canvas = document.createElement('canvas'); canvas.className = 'pin-canvas';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = contract.build ? 1 : 1.15;
  const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; room.dispose();
  if (contract.build) { // Build's lighting recommendation (pin-contract.json "lighting"); BiasStrip is emissive in the GLB.
    scene.environmentIntensity = .45; const key = new THREE.DirectionalLight(0xeeeee6, 1.2); key.position.set(-3, 5, 6); scene.add(key);
  } else {
    scene.add(new THREE.HemisphereLight(0xeeeee6, 0x151b16, 2.2));
    const key = new THREE.DirectionalLight(0xeeeee6, 3.2); key.position.set(-3, 5, 6); scene.add(key);
    const bias = new THREE.PointLight(0xd4fa7b, 18, 12); bias.position.set(0, -.6, -1.2); scene.add(bias); // lime bias light behind the TV
  }
  scene.add(root);

  const screen = (mesh, a) => { const material = new THREE.ShaderMaterial({ uniforms: { mapA: { value: a }, mapB: { value: a }, mixv: { value: 0 } }, vertexShader: VERT, fragmentShader: FRAG, toneMapped: false }); mesh.material?.dispose?.(); mesh.material = material; disposeList.push(material); return material; };
  const mats = { phone: screen(phoneScreen, lists.phone[0].map), tv: screen(tvScreen, lists.tv[0].map) }, fades = { phone: null, tv: null }, shownMap = { phone: lists.phone[0].map, tv: lists.tv[0].map };
  const mapAt = (list, p) => list.reduce((m, e) => p >= e.at ? e.map : m, list[0].map);

  function stepAt(p) { let i = 0; contract.steps.forEach((s, j) => { if (p >= s.swapAt) i = j; }); return i; }
  function cameraAt(p) {
    let a = kf(contract.steps[0].camera), b = a, t = 0;
    for (let i = 0; i < contract.moves.length; i++) {
      const [m0, m1] = contract.moves[i];
      if (p >= m1) { a = b = kf(contract.steps[i + 1].camera); t = 0; }
      else if (p > m0) { a = kf(contract.steps[i].camera); b = kf(contract.steps[i + 1].camera); t = ease((p - m0) / (m1 - m0)); break; }
      else break;
    }
    camera.position.lerpVectors(a.position, b.position, t); camera.quaternion.slerpQuaternions(a.quaternion, b.quaternion, t);
    if (perspective) camera.fov = (a.fov || 35) + ((b.fov || 35) - (a.fov || 35)) * t;
    else { const half = ((a.zoom || 8) + ((b.zoom || 8) - (a.zoom || 8)) * t) / 2; camera.left = -half; camera.right = half; camera.top = half * height / width; camera.bottom = -camera.top; }
    camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  function render(now) {
    frame = 0; if (disposed || document.hidden) return;
    cameraAt(progress);
    let fading = false;
    for (const k of ['phone', 'tv']) { const f = fades[k], u = mats[k].uniforms; if (!f) continue; const t = Math.min(1, (now - f) / 200); u.mixv.value = t; if (t === 1) { u.mapA.value = u.mapB.value; u.mixv.value = 0; fades[k] = null; } else fading = true; }
    renderer.render(scene, camera);
    if (fading) frame = requestAnimationFrame(render);
  }
  const invalidate = () => { if (!frame && !disposed) frame = requestAnimationFrame(render); };
  function setProgress(p) {
    progress = Math.max(0, Math.min(1, p));
    const first = shown < 0; shown = stepAt(progress);
    for (const k of ['phone', 'tv']) { const map = mapAt(lists[k], progress), u = mats[k].uniforms; if (map === shownMap[k]) continue; shownMap[k] = map; if (first) { u.mapA.value = u.mapB.value = map; continue; } u.mapA.value = u.mixv.value > 0 ? u.mapB.value : u.mapA.value; u.mapB.value = map; u.mixv.value = 0; fades[k] = performance.now(); }
    invalidate();
  }
  const resize = () => { const r = host.getBoundingClientRect(); width = Math.max(1, r.width); height = Math.max(1, r.height); renderer.setSize(width, height, false); invalidate(); };
  const observer = new ResizeObserver(resize); observer.observe(host);
  const lost = event => { event.preventDefault(); api.dispose(); host.dataset.sceneStatus = 'fallback'; };
  canvas.addEventListener('webglcontextlost', lost);
  host.append(canvas); resize(); setProgress(0);
  const api = { setProgress, stepAt, contract, dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(frame); observer.disconnect(); canvas.removeEventListener('webglcontextlost', lost);
    root.traverse(n => { n.geometry?.dispose(); [].concat(n.material || []).forEach(m => m.dispose?.()); });
    disposeList.forEach(x => x.dispose()); environment.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  } };
  return api;
}
