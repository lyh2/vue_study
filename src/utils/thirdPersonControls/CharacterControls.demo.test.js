import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterControls } from './characterControls';

//scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

//camera
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.y = 5;
camera.position.z = 5;
camera.position.x = 0;

//renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

//controls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 5;
orbitControls.maxDistance = 15;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.update();

//lights
light();

//floor
generateFloor();

//TODO model with animations

var characterControls;
new GLTFLoader().load('models/Soldier.glb', function (gltf) {
  const model = gltf.scene;
  model.traverse(function (e) {
    if (e.isMesh) e.castShadow = true;
  });

  scene.add(model);
  const gltfAnimations = gltf.animations;
  const mixer = new THREE.AnimationMixer(model);
  const animationMap = new Map();
  gltfAnimations
    .filter(a => a.name != 'TPose')
    .forEach(a => {
      animationMap[a.name] = mixer.clipAction(a);
    });

  characterControls = new CharacterControls(
    model,
    mixer,
    animationMap,
    orbitControls,
    camera,
    'Idle'
  );
});

//control keys
const keysPressed = {};
document.addEventListener(
  'keydown',
  event => {
    if (event.shiftKey && characterControls) {
      characterControls.switchRunToggle();
    } else {
      keysPressed[event.key.toLowerCase()] = true;
    }
  },
  false
);

document.addEventListener(
  'keyup',
  event => {
    keysPressed[event.key.toLowerCase()] = false;
  },
  false
);

const clock = new THREE.Clock();
//animate
function animate() {
  let mixerUpdateDelta = clock.getDelta();
  if (characterControls) {
    characterControls.update(mixerUpdateDelta, keysPressed);
  }
  orbitControls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

document.body.appendChild(renderer.domElement);
animate();
// RESIZE HANDLER
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

function generateFloor() {
  // TEXTURES
  const textureLoader = new THREE.TextureLoader();
  const placeholder = textureLoader.load('./textures/placeholder/placeholder.png');
  const sandBaseColor = textureLoader.load('./textures/sand/Sand 002_COLOR.jpg');
  const sandNormalMap = textureLoader.load('./textures/sand/Sand 002_NRM.jpg');
  const sandHeightMap = textureLoader.load('./textures/sand/Sand 002_DISP.jpg');
  const sandAmbientOcclusion = textureLoader.load('./textures/sand/Sand 002_OCC.jpg');

  const WIDTH = 4;
  const LENGTH = 4;
  const NUM_X = 15;
  const NUM_Z = 15;

  const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
  const material = new THREE.MeshStandardMaterial({
    map: sandBaseColor,
    normalMap: sandNormalMap,
    displacementMap: sandHeightMap,
    displacementScale: 0.1,
    aoMap: sandAmbientOcclusion,
  });
  // const material = new THREE.MeshPhongMaterial({ map: placeholder})

  for (let i = 0; i < NUM_X; i++) {
    for (let j = 0; j < NUM_Z; j++) {
      const floor = new THREE.Mesh(geometry, material);
      floor.receiveShadow = true;
      floor.rotation.x = -Math.PI / 2;

      floor.position.x = i * WIDTH - (NUM_X / 2) * WIDTH;
      floor.position.z = j * LENGTH - (NUM_Z / 2) * LENGTH;

      scene.add(floor);
    }
  }
}

function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-60, 100, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  scene.add(dirLight);
}
