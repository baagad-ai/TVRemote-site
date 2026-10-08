import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import contract from '../assets/3d/runtime-contract.json';
import { acquireGPU } from './gpu-budget';

const required = {
  hero: ['HeroPhone', 'HeroTV', 'FocusRail', 'PhoneScreen', 'TVScreen'],
  handoff: ['ReviewPhone', 'ReviewCard', 'HandoffPath', 'HandoffPacket', 'DestinationTV'],
  rooms: ['RoomLiving', 'RoomBedroom', 'RoomSelection'],
  focus: ['FocusHousing', 'FocusUp', 'FocusRight', 'FocusDown', 'FocusLeft', 'FocusCenter']
};
const previewed = new Map();
function parseEmbeddedGLB(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) throw Error('Invalid scene');
  if (view.getUint32(16, true) !== 0x4e4f534a) throw Error('Missing scene data');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, view.getUint32(12, true))));
  if ([...(json.buffers || []), ...(json.images || [])].some(item => item.uri && !item.uri.startsWith('data:'))) throw Error('External scene resources are not allowed');
  if (json.extensionsRequired?.length) throw Error('Unsupported scene extension');
  return buffer;
}
function disposeObject(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of [].concat(node.material || [])) { materials.add(material); for (const value of Object.values(material)) if (value?.isTexture) textures.add(value); }
  });
  geometries.forEach(x => x.dispose()); materials.forEach(x => x.dispose()); textures.forEach(x => x.dispose());
}
export async function createSceneRuntime() {
  let api;
  const releaseLease = acquireGPU(Symbol('three'), () => api?.dispose());
  const canvas = document.createElement('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (error) { canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(); releaseLease(); throw error; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-4, 4, 3, -3, .01, 100);
  const pmrem = new THREE.PMREMGenerator(renderer), roomEnvironment = new RoomEnvironment();
  let environment;
  try { environment = pmrem.fromScene(roomEnvironment, .04); scene.environment = environment.texture; }
  catch (error) { roomEnvironment.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss(); releaseLease(); throw error; }
  roomEnvironment.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223024, 2.5));
  const keyLight = new THREE.DirectionalLight(0xeaffd0, 4); keyLight.position.set(-3, 5, 6); scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0x8d9fc0, 3); rim.position.set(4, 2, -3); scene.add(rim);
  const loader = new GLTFLoader(), assets = new Map(), loads = new Map(), controllers = new Set();
  let disposed = false, generation = 0, active = null, activeKey = '', host = null, frame = 0, start = 0, tilt = { x: 0, y: 0 }, previousShot = '';
  let packetMotion = null, keyMotion = null, shotGeneration = 0;
  const original = new Map();
  const lost = event => { event.preventDefault(); host?.classList.remove('scene-live'); retire(); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  function render(time) {
    frame = 0; if (disposed || !active || document.hidden) return;
    active.rotation.x += (tilt.x - active.rotation.x) * .2;
    active.rotation.y += (tilt.y - active.rotation.y) * .2;
    if (packetMotion) {
      const t = Math.min(1, (time - packetMotion.start) / 850), packet = active.getObjectByName('HandoffPacket');
      packet.position.set(-1.7 + 3.3 * t, .45 + .74 * (2 * t - 1) ** 2, -(.07 + .37 * t));
      if (t === 1) packetMotion = null;
    }
    if (keyMotion && time - keyMotion.start >= 140) { keyMotion.node.position.copy(original.get(keyMotion.node)); keyMotion = null; }
    try { renderer.render(scene, camera); } catch { if (host) host.dataset.sceneStatus = 'fallback'; api.dispose(); return; }
    if (time - start < 900 || packetMotion || keyMotion) frame = requestAnimationFrame(render);
  }
  function invalidate() { if (disposed || !active) return; start = performance.now(); if (!frame) frame = requestAnimationFrame(render); }
  function resize() {
    if (!host || !active) return;
    const { width, height } = host.getBoundingClientRect(); if (!width || !height) return;
    renderer.setSize(width, height, false);
    const settings = contract.scenes[activeKey].camera, half = settings.orthographic_scale / 2;
    camera.left = -half; camera.right = half; camera.top = half * height / width; camera.bottom = -camera.top;
    camera.position.fromArray(settings.gltf_position); camera.lookAt(new THREE.Vector3().fromArray(settings.gltf_target)); camera.updateProjectionMatrix(); invalidate();
  }
  const resizeObserver = new ResizeObserver(resize);
  async function load(key) {
    if (assets.has(key)) return assets.get(key);
    if (loads.has(key)) return loads.get(key);
    const promise = loadAsset(key); loads.set(key, promise);
    try { return await promise; } finally { if (loads.get(key) === promise) loads.delete(key); }
  }
  async function loadAsset(key) {
    const controller = new AbortController(); controllers.add(controller);
    try {
      const response = await fetch(new URL(`../assets/3d/remote-${key}.glb`, import.meta.url), { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw Error('Scene unavailable');
      const buffer = await response.arrayBuffer(); if (buffer.byteLength > 1_100_000) throw Error('Scene exceeds budget');
      const gltf = await loader.parseAsync(parseEmbeddedGLB(buffer), '');
      if (disposed) { disposeObject(gltf.scene); return null; }
      for (const name of required[key]) if (!gltf.scene.getObjectByName(name)) { disposeObject(gltf.scene); throw Error('Scene contract mismatch'); }
      gltf.scene.traverse(node => original.set(node, node.position.clone()));
      assets.set(key, gltf.scene); return gltf.scene;
    } finally { controllers.delete(controller); }
  }
  async function select(key, element, getState) {
    const revision = ++generation;
    retire(false); host = element;
    try {
      const object = await load(key); if (disposed || revision !== generation || !object) return;
      active = object; activeKey = key; packetMotion = keyMotion = null; tilt = { x: 0, y: 0 }; active.rotation.set(0, 0, 0);
      scene.add(active); host.append(renderer.domElement); resizeObserver.observe(host); previousShot = ''; update(key, getState());
      resize(); host.classList.add('scene-live'); host.dataset.sceneStatus = 'ready';
    } catch { if (revision === generation && host) { host.dataset.sceneStatus = 'fallback'; api.dispose(); } }
  }
  function update(key, state) {
    if (!active) return;
    if (key === 'rooms') {
      const selection = active.getObjectByName('RoomSelection');
      selection.position.fromArray(contract.scenes.rooms.interaction.selection_positions_gltf[state.room === 'bedroom' ? 'bedroom' : 'living']);
    }
    if (key === 'focus') {
      for (const direction of ['Up', 'Right', 'Down', 'Left', 'Center']) {
        const node = active.getObjectByName('Focus' + direction); node.position.copy(original.get(node));
        if (direction.toLowerCase() === state.key) { node.position.z -= .025; keyMotion = { node, start: performance.now() }; }
      }
    }
    if (key === 'handoff') {
      const packet = active.getObjectByName('HandoffPacket'), path = active.getObjectByName('HandoffPath');
      packet.position.copy(original.get(packet));
      const t = state.step === 'tv' ? 1 : state.step === 'review' ? .5 : 0;
      packet.position.set(-1.7 + 3.3 * t, .45 + .74 * (2 * t - 1) ** 2, -(.07 + .37 * t));
      if (state.preview > (previewed.get(key) || 0)) packetMotion = { start: performance.now() };
      previewed.set(key, state.preview || 0);
      if (path?.material) path.material.emissive?.set(state.step === 'tv' ? 0x8cac38 : 0x234015);
    }
    if ((key === 'hero' || key === 'handoff') && (key === 'handoff' ? 'share' : state.shot) !== previousShot) {
      previousShot = key === 'handoff' ? 'share' : state.shot; const revision = generation, screenshotRevision = ++shotGeneration, object = active;
      const url = key === 'handoff' ? '../assets/showcase/youtube-share.png' : '../assets/showcase/remote-home.png';
      new THREE.TextureLoader().load(new URL(url, import.meta.url).href, texture => {
        if (disposed || generation !== revision || screenshotRevision !== shotGeneration || active !== object) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace; texture.flipY = false;
        const screen = object.getObjectByName(key === 'handoff' ? 'ReviewPhoneScreen' : 'PhoneScreen'); screen.material?.map?.dispose(); screen.material?.dispose(); screen.material = new THREE.MeshBasicMaterial({ map: texture }); invalidate();
      }, undefined, () => {});
    }
    invalidate();
  }
  function pointer(x, y) { tilt = { x: -y * .05, y: x * .05 }; invalidate(); }
  function retire(increment = true) {
    if (increment) generation++;
    cancelAnimationFrame(frame); frame = 0; resizeObserver.disconnect(); host?.classList.remove('scene-live');
    if (active) scene.remove(active); active = null; packetMotion = keyMotion = null; renderer.domElement.remove();
  }
  api = { select, update, pointer, retire, get disposed() { return disposed; }, dispose() {
    if (disposed) return;
    disposed = true; retire(); controllers.forEach(c => c.abort()); assets.forEach(disposeObject); assets.clear();
    resizeObserver.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', lost); environment.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss(); releaseLease();
  } };
  return api;
}
