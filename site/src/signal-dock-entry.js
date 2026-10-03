import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PointLight,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer
} from "../vendor/three/three.module.js";
import { createFocusKeyScene } from "../vendor/signal-dock/focus-key-scene.js";

const assetThree = {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PointLight,
  RingGeometry,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector2,
  Vector3
};

export function createSignalDock(canvas, variant) {
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power"
  });
  if (!context) throw new Error("WebGL2 is unavailable.");

  const renderer = new WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
    powerPreference: "low-power"
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 0.96;

  const scene = new Scene();
  const asset = createFocusKeyScene(assetThree, { variant, tv: true, arcs: false });
  scene.add(asset.root);
  let disposed = false;

  return {
    asset,
    resize(cssWidth, cssHeight, pixelRatio) {
      if (disposed) return;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(cssWidth, cssHeight, false);
      asset.configureCamera(cssWidth, cssHeight, variant);
    },
    render() {
      if (disposed) return;
      renderer.render(scene, asset.camera);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      asset.dispose();
      renderer.dispose();
    }
  };
}
