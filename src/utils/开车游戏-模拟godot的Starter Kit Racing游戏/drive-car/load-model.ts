import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons';
import DriveCarApp from './DriveCarApp';

export function initGltfLoader() {
  const loader = new GLTFLoader();
  return loader;
}
const modelNames = [
  'vehicle-truck-yellow',
  'vehicle-truck-green',
  'vehicle-truck-purple',
  'vehicle-truck-red',
  'track-straight',
  'track-corner',
  'track-bump',
  'track-finish',
  'decoration-empty',
  'decoration-forest',
  'decoration-tents',
];
/**
 * 加载所有的模型数据，使用Promise
 */
export async function loadModels(parent: DriveCarApp) {
  const loader = initGltfLoader();
  const promises = modelNames.map(name => {
    return new Promise((resolve, reject) => {
      loader.load(
        `./开车游戏-模拟godot的Starter Kit Racing游戏/models/${name}.glb`,
        gltf => {
          gltf.scene.traverse(child => {
            if (child.isMesh) {
              child.material.side = THREE.FrontSide;
            }
          });

          if (name.startsWith('vehicle-')) {
            gltf.scene.scale.setScalar(0.5);
          }

          parent.models[name] = gltf.scene;
          resolve({ name, gltf });
        },
        process => {
          console.log('加载进度:', process);
        },
        reject
      );
    });
  });

  return Promise.all(promises);
}
