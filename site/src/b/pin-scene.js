// Live three.js scene for the single pin (CONCEPT-B-GUIDE.md §2; Baagad 19:32 IST: "use our 3D assets and scenes").
// Our own model: Build's pin-tv-phone.glb (assets/3d-prod, PinTV + PinPhone). Concept B composition is kept EXACTLY:
// every frame the camera is solved so the TV screen lands on the board's TV box (.pin-tv, 720 px wide, bleeding off
// the left) and the phone model is placed/scaled so its screen lands on the board's phone box (.pin-phone, 270 px);
// the DOM boxes carry the scroll dolly (CSS vars), so the 3D camera follows the same eased move. The console and
// floor are hidden (the board shows the flat TV with the lime glow only). Screens: Design's drawn TV frames and the
// <PhoneLoop name="typing"> SVG (data URL) crossfaded by the continuous step value. Demand rendering, DPR <= 1.5,
// one WebGL context (held through the 'pin' GPU lease by the caller).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FRAG = 'uniform sampler2D mapA; uniform sampler2D mapB; uniform float mixv; varying vec2 vUv; void main(){ gl_FragColor = mix(texture2D(mapA, vUv), texture2D(mapB, vUv), mixv);\n#include <colorspace_fragment>\n}';
const FOV = 30, PHONE_Z = 1.1; // phone sits 1.1 world units in front of the TV plane

export async function createPinScene(host, { modelUrl, tvTextures, phoneTextures, signal }) {
  const response = await fetch(modelUrl, { credentials: 'omit', signal }); if (!response.ok) throw Error('Scene unavailable');
  const buffer = await response.arrayBuffer(); if (buffer.byteLength > 1_100_000) throw Error('Scene exceeds budget');
  await MeshoptDecoder.ready;
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, '');
  const root = gltf.scene;
  const tvScreen = root.getObjectByName('TVScreen'), phoneScreen = root.getObjectByName('PhoneScreen'), phone = root.getObjectByName('PinPhone'), tv = root.getObjectByName('PinTV');
  if (!tvScreen || !phoneScreen || !phone || !tv) throw Error('Scene contract mismatch');
  for (const name of ['BiasStrip']) root.getObjectByName(name)?.removeFromParent();
  for (const child of [...(root.getObjectByName('PinConsoleTV')?.children || [])]) if (child !== tv) child.visible = false;
  root.updateMatrixWorld(true);
  const tvBox = new THREE.Box3().setFromObject(tvScreen), tvSize = tvBox.getSize(new THREE.Vector3()), tvCenter = tvBox.getCenter(new THREE.Vector3());
  // Phone: upright, facing the camera with a slight turn (board: phone held in front of the TV, left of centre).
  const baseScale = phone.scale.x; phone.quaternion.setFromEuler(new THREE.Euler(-.05, .16, .015));
  root.updateMatrixWorld(true);
  const pBox = new THREE.Box3().setFromObject(phoneScreen), phoneW = pBox.getSize(new THREE.Vector3()).x;

  const loader = new THREE.TextureLoader(), disposeList = [];
  const load = url => new Promise((res, rej) => loader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4; disposeList.push(t); res(t); }, undefined, rej));
  const tvMaps = await Promise.all(tvTextures.map(load)), phoneMaps = await Promise.all(phoneTextures.map(load));
  if (signal?.aborted) { disposeList.forEach(x => x.dispose()); throw Error('aborted'); }

  const canvas = document.createElement('canvas'); canvas.className = 'pin-canvas';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const env = pmrem.fromScene(room, .04); scene.environment = env.texture; scene.environmentIntensity = .45; room.dispose();
  const key = new THREE.DirectionalLight(0xeeeee6, 1.2); key.position.set(-3, 5, 6); scene.add(key);
  const glow = new THREE.PointLight(0xd4fa7b, 3, 4); glow.position.set(-.3, .7, .6); scene.add(glow); // lime spill on the phone
  scene.add(root);
  const mat = (mesh, a) => { const m = new THREE.ShaderMaterial({ uniforms: { mapA: { value: a }, mapB: { value: a }, mixv: { value: 0 } }, vertexShader: VERT, fragmentShader: FRAG, toneMapped: false }); mesh.material?.dispose?.(); mesh.material = m; disposeList.push(m); return m; };
  const mats = { tv: mat(tvScreen, tvMaps[0]), phone: mat(phoneScreen, phoneMaps[0]) };
  const camera = new THREE.PerspectiveCamera(FOV, 1, .01, 100);

  let W = 1, H = 1, frame = 0, disposed = false, state = null;
  // Screens swap by step index with a 0.2 s crossfade (time-based), both screens in the same frame.
  let shown = -1, fadeStart = 0;
  const swap = i => { if (i === shown) return; const first = shown < 0; shown = i; for (const [m, maps] of [[mats.tv, tvMaps], [mats.phone, phoneMaps]]) { m.uniforms.mapA.value = first ? maps[i] : (m.uniforms.mixv.value > .5 ? m.uniforms.mapB.value : m.uniforms.mapA.value); m.uniforms.mapB.value = maps[i]; m.uniforms.mixv.value = first ? 1 : 0; } fadeStart = first ? 0 : performance.now(); };
  function render() {
    frame = 0; if (disposed || !state) return;
    const { v, tvRect, phoneRect } = state, hr = host.getBoundingClientRect();
    // Solve a frontal camera: TV screen width -> pixels per unit at the TV plane; centre -> camera x/y.
    const s = tvRect.width / tvSize.x, half = Math.tan(THREE.MathUtils.degToRad(FOV / 2)), d = H / (2 * s * half);
    const tx = tvRect.left + tvRect.width / 2 - hr.left, ty = tvRect.top + tvRect.height / 2 - hr.top;
    const cx = tvCenter.x - (tx - W / 2) / s, cy = tvCenter.y + (ty - H / 2) / s;
    camera.aspect = W / H; camera.position.set(cx, cy, tvCenter.z + d); camera.quaternion.identity(); camera.updateProjectionMatrix();
    // Phone at PHONE_Z in front of the TV: scale so its screen spans phoneRect, then centre it on phoneRect.
    const sp = s * d / (d - PHONE_Z), k = phoneRect.width / (phoneW * sp);
    phone.scale.setScalar(baseScale * k);
    const px = phoneRect.left + phoneRect.width / 2 - hr.left, py = phoneRect.top + phoneRect.height / 2 - hr.top;
    const want = new THREE.Vector3(cx + (px - W / 2) / sp, cy - (py - H / 2) / sp, tvCenter.z + PHONE_Z);
    phone.position.set(0, 0, 0); root.updateMatrixWorld(true); // PinPhone is a root node: world = local
    const c = new THREE.Box3().setFromObject(phoneScreen).getCenter(new THREE.Vector3());
    phone.position.copy(want.sub(c)); root.updateMatrixWorld(true);
    swap(state.idx); let fading = false;
    if (fadeStart) { const t = Math.min(1, (performance.now() - fadeStart) / 200); for (const m of [mats.tv, mats.phone]) m.uniforms.mixv.value = t; if (t < 1) fading = true; else fadeStart = 0; }
    renderer.render(scene, camera);
    if (fading) frame = requestAnimationFrame(render);
  }
  const invalidate = () => { if (!frame && !disposed) frame = requestAnimationFrame(render); };
  const resize = () => { const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); renderer.setSize(W, H, false); invalidate(); };
  const ro = new ResizeObserver(resize); ro.observe(host);
  const lost = e => { e.preventDefault(); api.dispose(); host.dataset.sceneStatus = 'fallback'; };
  canvas.addEventListener('webglcontextlost', lost);
  host.append(canvas); resize();
  const api = {
    update(v, idx, tvRect, phoneRect) { state = { v, idx, tvRect, phoneRect }; invalidate(); },
    dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(frame); ro.disconnect(); canvas.removeEventListener('webglcontextlost', lost); root.traverse(n => { n.geometry?.dispose(); [].concat(n.material || []).forEach(m => m.dispose?.()); }); disposeList.forEach(x => x.dispose()); env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); }
  };
  return api;
}
