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
import { rasterizeScreen } from './screen-texture.js';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FRAG = 'uniform sampler2D mapA; uniform sampler2D mapB; uniform float mixv; varying vec2 vUv; void main(){ gl_FragColor = mix(texture2D(mapA, vUv), texture2D(mapB, vUv), mixv);\n#include <colorspace_fragment>\n}';
const FOV = 30, PHONE_Z = 1.1; // phone sits 1.1 world units in front of the TV plane

export async function createPinScene(host, { modelUrl, tvTextures, phoneTextures, signal }) {
  const response = await fetch(modelUrl, { credentials: 'omit', signal }); if (!response.ok) throw Error('Scene unavailable');
  const buffer = await response.arrayBuffer(); if (buffer.byteLength > 1_100_000) throw Error('Scene exceeds budget');
  await MeshoptDecoder.ready;
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer, '');
  const root = gltf.scene;
  // Build's 19:30 export: PhoneScreen / PinPhoneBody / PinPhoneGlass are separate root nodes and the TV body is part of
  // the PinConsole mesh. Older exports nest them under PinPhone / PinTV (PinConsoleTV). Both are accepted.
  const tvScreen = root.getObjectByName('TVScreen'), phoneScreen = root.getObjectByName('PhoneScreen');
  if (!tvScreen || !phoneScreen) throw Error('Scene contract mismatch');
  root.getObjectByName('BiasStrip')?.removeFromParent();
  let phone = root.getObjectByName('PinPhone');
  if (!phone) { phone = new THREE.Group(); phone.name = 'PinPhone'; root.add(phone); root.updateMatrixWorld(true); for (const n of ['PhoneScreen', 'PinPhoneBody', 'PinPhoneGlass', 'PinPhoneChassis', 'PinPhonePower', 'PinPhoneVolume']) { const o = root.getObjectByName(n); if (o) phone.attach(o); } }
  const tv = root.getObjectByName('PinTV');
  for (const child of [...(root.getObjectByName('PinConsoleTV')?.children || [])]) if (child !== tv) child.visible = false;
  root.updateMatrixWorld(true);
  const tvBox = new THREE.Box3().setFromObject(tvScreen), tvSize = tvBox.getSize(new THREE.Vector3()), tvCenter = tvBox.getCenter(new THREE.Vector3());
  // Board: the flat TV only, no cabinet. When the TV is merged into the console mesh, clip everything below the TV.
  const clip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -(tvBox.min.y - tvSize.y * .035))];
  const consoleMesh = root.getObjectByName('PinConsole');
  if (consoleMesh) consoleMesh.traverse(n => { if (n.isMesh) { n.material = n.material.clone(); n.material.clippingPlanes = clip; } });
  // The TV's outer box (screen + bezel): the visible TV body's vertices above the clip plane, near the screen plane.
  // The camera maps THIS box onto the board's TV box (720px incl. the bezel), so the 3D TV lands on it exactly.
  const body = tvBox.clone(), v3 = new THREE.Vector3(), y0 = tvBox.min.y - tvSize.y * .035;
  (consoleMesh || root.getObjectByName('PinTV'))?.traverse(n => { if (!n.isMesh) return; const pos = n.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { v3.fromBufferAttribute(pos, i).applyMatrix4(n.matrixWorld); if (v3.y >= y0 && Math.abs(v3.z - tvCenter.z) < tvSize.x * .08) body.expandByPoint(v3); } });
  const bodySize = body.getSize(new THREE.Vector3()), bodyCenter = body.getCenter(new THREE.Vector3());
  // PM 16 Oct: the phone body / bezel is ink #0b0e0d (Design's phone components), set in code, not in the GLB.
  const BEZEL = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#0b0e0d'), roughness: .38, metalness: 0, clearcoat: .35, clearcoatRoughness: .3 });
  phone.traverse(n => { if (n.isMesh && n !== phoneScreen && !/glass/i.test(n.name)) { n.material = BEZEL; } });
  // Phone: Build's baked orientation (upright, facing the camera with a slight turn), as on the board.
  const baseScale = phone.scale.x;
  root.updateMatrixWorld(true);
  const pBox = new THREE.Box3().setFromObject(phoneScreen), phoneW = pBox.getSize(new THREE.Vector3()).x;

  const loader = new THREE.TextureLoader(), disposeList = [BEZEL];
  const prep = t => { t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4; disposeList.push(t); return t; };
  // A phone screen given as an SVG string (phoneScreenSvg) is rasterized with Work Sans embedded (screen-texture.js).
  const load = src => src.startsWith('<svg') ? rasterizeScreen(src).then(c => prep(new THREE.CanvasTexture(c)))
    : new Promise((res, rej) => loader.load(src, t => res(prep(t)), undefined, rej));
  const tvMaps = await Promise.all(tvTextures.map(load)), phoneMaps = await Promise.all(phoneTextures.map(load));
  if (signal?.aborted) { disposeList.forEach(x => x.dispose()); throw Error('aborted'); }

  const canvas = document.createElement('canvas'); canvas.className = 'pin-canvas';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
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
  // TV and phone keep their own index (step 02 keeps the typed search on the phone until its snap has finished).
  const shown = new Map(); let fadeStart = 0;
  const swap = (m, maps, i) => { const was = shown.has(m) ? shown.get(m) : -1; if (i === was) return; const first = was < 0; shown.set(m, i); m.uniforms.mapA.value = first ? maps[i] : (m.uniforms.mixv.value > .5 ? m.uniforms.mapB.value : m.uniforms.mapA.value); m.uniforms.mapB.value = maps[i]; m.uniforms.mixv.value = first ? 1 : 0; if (!first) { m.userData.fade = performance.now(); fadeStart = 1; } };
  function render() {
    frame = 0; if (disposed || !state) return;
    const { v, tvRect, phoneRect } = state, hr = host.getBoundingClientRect();
    // Solve a frontal camera: TV screen width -> pixels per unit at the TV plane; centre -> camera x/y.
    const s = tvRect.width / bodySize.x, half = Math.tan(THREE.MathUtils.degToRad(FOV / 2)), d = H / (2 * s * half);
    const tx = tvRect.left + tvRect.width / 2 - hr.left, ty = tvRect.top + tvRect.height / 2 - hr.top;
    const cx = bodyCenter.x - (tx - W / 2) / s, cy = bodyCenter.y + (ty - H / 2) / s;
    camera.aspect = W / H; camera.position.set(cx, cy, bodyCenter.z + d); camera.quaternion.identity(); camera.updateProjectionMatrix();
    // Phone at PHONE_Z in front of the TV: scale so its screen spans phoneRect, then centre it on phoneRect.
    const sp = s * d / (d - PHONE_Z), k = phoneRect.width / (phoneW * sp);
    phone.scale.setScalar(baseScale * k);
    const px = phoneRect.left + phoneRect.width / 2 - hr.left, py = phoneRect.top + phoneRect.height / 2 - hr.top;
    const want = new THREE.Vector3(cx + (px - W / 2) / sp, cy - (py - H / 2) / sp, tvCenter.z + PHONE_Z);
    phone.position.set(0, 0, 0); root.updateMatrixWorld(true); // PinPhone is a root node: world = local
    const c = new THREE.Box3().setFromObject(phoneScreen).getCenter(new THREE.Vector3());
    phone.position.copy(want.sub(c)); root.updateMatrixWorld(true);
    swap(mats.tv, tvMaps, state.idx); swap(mats.phone, phoneMaps, state.phoneIdx); let fading = false;
    if (fadeStart) { fadeStart = 0; for (const m of [mats.tv, mats.phone]) { if (!m.userData.fade) continue; const t = Math.min(1, (performance.now() - m.userData.fade) / 200); m.uniforms.mixv.value = t; if (t < 1) fading = fadeStart = 1; else m.userData.fade = 0; } }
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
    update(v, idx, phoneIdx, tvRect, phoneRect) { state = { v, idx, phoneIdx, tvRect, phoneRect }; invalidate(); },
    dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(frame); ro.disconnect(); canvas.removeEventListener('webglcontextlost', lost); root.traverse(n => { n.geometry?.dispose(); [].concat(n.material || []).forEach(m => m.dispose?.()); }); disposeList.forEach(x => x.dispose()); env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); }
  };
  return api;
}
