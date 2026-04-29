import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/Addons';
import { Camera } from './Camera';

export function initRenderer(dom: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
    //outputBufferType: THREE.HalfFloatType,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMappingExposure = 1.0;
  dom.appendChild(renderer.domElement);
  addUnrealBloomPass(renderer);
  return renderer;
}

function addUnrealBloomPass(renderer: THREE.WebGLRenderer) {
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2,
    0.8,
    0.5
  );
  renderer.setEffects([bloomPass]);
  return bloomPass;
}

export function initScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xadb2ba);
  // 添加fog
  scene.fog = new THREE.Fog(0xadb2ba, 30, 55);

  return scene;
}

export function initLights(scene: THREE.Scene) {
  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(11.4, 15, -5.3);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.setScalar(4096);
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 60;

  scene.add(directionalLight);
  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0xc8d8e8, 0.5);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0xc8d8e8, 0x7a8a5a, 1.5);
  scene.add(hemisphereLight);

  return directionalLight;
}

export function initWindowResize(renderer: THREE.WebGLRenderer, camera: Camera) {
  camera.camera.aspect = window.innerWidth / window.innerHeight;
  camera.camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
