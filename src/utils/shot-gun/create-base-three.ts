import * as THREE from 'three';
import { GLTFLoader, PointerLockControls } from 'three/examples/jsm/Addons';
import ShotGunApp from '@/utils/shot-gun/ShotGunApp';

export function createScene(name: string = '') {
  const scene = new THREE.Scene();
  scene.name = name;
  //
  const gridHelper = new THREE.GridHelper(20, 20);
  scene.add(gridHelper);

  const ambientLight = new THREE.AmbientLight(0xffffff, 2);
  scene.add(ambientLight);
  return scene;
}

export function createPerspectiveCamera(name: string = '') {
  const perspectiveCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.015,
    1000
  );

  perspectiveCamera.name = name;
  perspectiveCamera.position.set(0, 1, 0);
  perspectiveCamera.updateProjectionMatrix();
  return perspectiveCamera;
}

export function createRenderer(parentEl: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(parentEl.clientWidth || window.innerWidth, parentEl.clientHeight || window.innerHeight);
  parentEl.appendChild(renderer.domElement);
  return renderer;
}

export function createPointLight(
  scene: THREE.Scene,
  color: string = '#ffffff',
  intensity: number = 1,
  distance: number = 100,
  name: string = 'pointLight_1'
) {
  const pointLight = new THREE.PointLight(color, intensity, distance);
  pointLight.position.set(0, 10, 0);
  scene.add(pointLight);
  pointLight.name = name;
  pointLight.visible = false; // 一开始不显示
  return pointLight;
}

export function createPointerLockControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
) {
  const controls = new PointerLockControls(camera, domElement);
  return controls;
}

export function windowResize(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
  const onWindowResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onWindowResize);
  return onWindowResize;
}

export function createLoadModel(shotgunApp: ShotGunApp) {
  const loader = new GLTFLoader();
  // 散弹枪
  const tommyGunUrl = './shotgun/tommy_gun.glb';
  loader.load(tommyGunUrl, gltf => {
    const tommyGun = gltf.scene;
    tommyGun.scale.set(0.25, 0.25, 0.25);
    tommyGun.position.set(
      shotgunApp.camera.position.x,
      shotgunApp.camera.position.y,
      shotgunApp.camera.position.z
    );
    shotgunApp.tommyGun = tommyGun;
    shotgunApp.scene.add(tommyGun);
    // 添加一个点光源
    const tommyGunLight = new THREE.PointLight(0xfffced, 1);
    tommyGunLight.position.set(0.025, -0.15, 0); // Adjust the position of the light relative to the gun
    tommyGun.add(tommyGunLight);
  });

  // 加载建筑模型
  const buildingUrl = './shotgun/low_poly_abandoned_brick_room.glb';
  loader.load(buildingUrl, gltf => {
    shotgunApp.abandonedBuilding = gltf.scene;
    shotgunApp.abandonedBuilding.position.set(0, 0.008, 0);
    shotgunApp.scene.add(shotgunApp.abandonedBuilding);
  });
}

// 添加事件监听
export function addKeyDownUpListener(app: ShotGunApp) {
  const onKeyDown = (event: KeyboardEvent) => {
    //console.log('keyDown:', event);
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        app.moveForward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        app.moveLeft = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        app.moveRight = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        app.moveBackward = true;
        break;
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    //console.log('keyUp:', event);
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        app.moveForward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        app.moveLeft = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        app.moveRight = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        app.moveBackward = false;
        break;
    }
  };
  // 按键监听
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
}
