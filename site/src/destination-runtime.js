import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { acquireGPU } from './gpu-budget';
import contract from '../assets/3d/room-destinations-contract.json';

const required = ['DestinationLiving','DestinationBedroom','SelectionLiving','SelectionBedroom'];
function inspectGLB(buffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength > 700000 || view.getUint32(0,true) !== 0x46546c67 || view.getUint32(4,true) !== 2 || view.getUint32(8,true) !== buffer.byteLength || view.getUint32(16,true) !== 0x4e4f534a) throw Error('Invalid destination asset');
  const data = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,view.getUint32(12,true))));
  if ([...(data.images || []),...(data.buffers || [])].some(value => value.uri && !value.uri.startsWith('data:')) || data.extensionsRequired?.length) throw Error('Destination resources must be embedded');
}
export async function createDestination(host, getRoom, signal) {
  let api, renderer, disposed = false, frame = 0, model, environment, pmrem, selectedRoom = getRoom();
  const release = acquireGPU(Symbol('destination'), () => api?.dispose()), controller = new AbortController();
  const half = contract.camera.horizontal_span / 2;
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-half,half,half/1.5,-half/1.5,.01,100);
  const resize = new ResizeObserver(() => render());
  const materials = new Set(), geometries = new Set(), textures = new Set(), selectionBase = new Map();
  function dispose() {
    if (disposed) return;
    disposed = true; signal?.removeEventListener('abort',dispose); controller.abort(); cancelAnimationFrame(frame); resize.disconnect();
    host.classList.remove('scene-live');
    materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose());
    environment?.dispose(); pmrem?.dispose(); renderer?.domElement.remove(); renderer?.dispose(); renderer?.forceContextLoss(); release();
  }
  function render() {
    if (disposed || !model || document.hidden) return;
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width,height,false);
    const close = matchMedia('(max-width:740px)').matches ? contract.optional_close_views[selectedRoom] : null;
    for (const [room,name] of Object.entries(contract.destinations)) model.getObjectByName(name).visible = !close || room === selectedRoom;
    const settings = close || contract.camera, span = settings.horizontal_span, vertical = close ? settings.vertical_span : span / contract.camera.aspect_ratio, ratio = span / vertical;
    const fitWidth = Math.min(width,height * ratio), fitHeight = fitWidth / ratio;
    renderer.setViewport((width - fitWidth) / 2,(height - fitHeight) / 2,fitWidth,fitHeight);
    camera.left = -span / 2; camera.right = span / 2; camera.top = vertical / 2; camera.bottom = -vertical / 2;
    camera.position.fromArray(settings.position); camera.lookAt(new THREE.Vector3().fromArray(settings.target)); camera.updateProjectionMatrix();
    try { renderer.render(scene,camera); } catch { host.dataset.sceneStatus = 'fallback'; dispose(); }
  }
  function select(room, animate = true) {
    if (disposed || !model) return;
    selectedRoom = room;
    cancelAnimationFrame(frame);
    const start = performance.now(), rings = ['Living','Bedroom'].map(name => model.getObjectByName('Selection' + name));
    const prior = rings.map(ring => ring.userData.selectionFactor ?? 1), targets = room === 'bedroom' ? [.88,1] : [1,.88];
    // Selection is a destination cue, never a playback result or a generic pointer tilt.
    rings.forEach((ring,i) => { ring.visible = targets[i] === 1; });
    const tick = time => {
      if (disposed) return;
      const t = animate ? Math.min(1,(time - start) / 240) : 1, eased = 1 - (1 - t) ** 3;
      rings.forEach((ring,i) => { ring.userData.selectionFactor = prior[i] + (targets[i] - prior[i]) * eased; ring.scale.copy(selectionBase.get(ring)).multiplyScalar(ring.userData.selectionFactor); });
      render(); frame = t < 1 ? requestAnimationFrame(tick) : 0;
    };
    tick(start);
  }
  api = { select, dispose };
  signal?.addEventListener('abort',dispose,{ once:true });
  if (signal?.aborted) { dispose(); throw new DOMException('Canceled','AbortError'); }
  try {
    renderer = new THREE.WebGLRenderer({ alpha:true,antialias:true,powerPreference:'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1,contract.performance.dpr[1])); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .75;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.addEventListener('webglcontextlost', event => { if (disposed) return; event.preventDefault(); host.dataset.sceneStatus = 'fallback'; dispose(); }, { once:true });
    pmrem = new THREE.PMREMGenerator(renderer); const roomEnvironment = new RoomEnvironment();
    try { environment = pmrem.fromScene(roomEnvironment,.04); } finally { roomEnvironment.dispose(); }
    scene.environment = environment.texture; scene.environmentIntensity = .45;
    scene.add(new THREE.HemisphereLight(0xffffff,0x303630,.7));
    const key = new THREE.DirectionalLight(0xffffff,1.5); key.position.set(-3,5,6); key.castShadow = true; key.shadow.mapSize.set(512,512); key.shadow.camera.left = key.shadow.camera.bottom = -5; key.shadow.camera.right = key.shadow.camera.top = 5; key.shadow.camera.far = 20; key.shadow.normalBias = .025; key.shadow.bias = -.0006; scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff,.4); fill.position.set(4,2,-3); scene.add(fill);
    camera.position.fromArray(contract.camera.position); camera.lookAt(new THREE.Vector3().fromArray(contract.camera.target));
    const response = await fetch(new URL('../assets/3d/room-destinations.glb',import.meta.url), { credentials:'omit',signal:controller.signal });
    if (!response.ok) throw Error('Destination asset unavailable');
    const buffer = await response.arrayBuffer(); inspectGLB(buffer);
    const gltf = await new GLTFLoader().parseAsync(buffer,''); model = gltf.scene;
    model.traverse(node => { if (node.geometry) { geometries.add(node.geometry); node.castShadow = node.receiveShadow = true; } [].concat(node.material || []).forEach(material => { materials.add(material); Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); }); }); });
    if (disposed) { materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); return api; }
    if (required.some(name => !model.getObjectByName(name))) throw Error('Destination contract mismatch');
    ['SelectionLiving','SelectionBedroom'].forEach(name => { const node = model.getObjectByName(name); selectionBase.set(node,node.scale.clone()); node.visible = name === contract.selection[getRoom()]; });
    for (const name of Object.values(contract.selection)) model.getObjectByName(name).traverse(node => { if (!node.material) return; const material = new THREE.MeshBasicMaterial({ color:0xd5ff75,toneMapped:false }); node.material = material; materials.add(material); });
    scene.add(model); host.append(renderer.domElement); resize.observe(host); select(getRoom(),false); render();
    if (!disposed) { host.classList.add('scene-live'); host.dataset.sceneStatus = 'ready'; }
    return api;
  } catch (error) { dispose(); throw error; }
}
