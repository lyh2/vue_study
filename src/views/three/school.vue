<template>
  <div class="container" ref="container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import {
  If,
  PI2,
  atan2,
  color,
  frontFacing,
  output,
  positionLocal,
  Fn,
  uniform,
  vec4,
} from "three/webgpu";
import { DRACOLoader } from "three/examples/jsm/Addons.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min";
import { GLTFLoader } from "three/examples/jsm/Addons.js";
const container = ref(null);
let _perspectiveCamera, _scene, _gui, _renderer, _orbitControls;
onMounted(() => {
  _init();
});

function _init(params = {}) {
  console.log("THREE:", THREE);

  _perspectiveCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  _perspectiveCamera.position.set(0, 100, 100);

  // 创建场景
  _scene = new THREE.Scene();
  _gui = new GUI();

  // 加载环境贴图
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load(
    "./textures/equirectangular/royal_esplanade_1k.hdr",
    (environmentMap) => {
      environmentMap.mapping = THREE.EquirectangularReflectionMapping;
      _scene.background = environmentMap;
      _scene.environment = environmentMap;
    }
  );

  // 添加灯光
  const directionalLight = new THREE.DirectionalLight(0xfffde2, 4);
  directionalLight.position.set(10, 3, 4);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.far = 30;
  directionalLight.shadow.camera.top = 8;
  directionalLight.shadow.camera.right = 8;
  directionalLight.shadow.camera.bottom = -8;
  directionalLight.shadow.camera.left = -8;
  directionalLight.shadow.normalBias = 0.05;
  _scene.add(directionalLight);

  // 定义TSL function
  const inAngle = Fn(([position, angleStart, angleArc]) => {
    const angle = atan2(position.y, position.x)
      .sub(angleStart)
      .mod(PI2)
      .toVar();
    return angle.greaterThan(0).and(angle.lessThan(angleArc));
  });

  // 创建一个材质
  const defaultMaterial = new THREE.MeshPhysicalNodeMaterial({
    metalness: 0.5,
    roughness: 0.25,
    envMapIntensity: 0.5,
    color: 0x858080,
  });

  const slicedMaterial = new THREE.MeshPhysicalNodeMaterial({
    metalness: 0.5,
    roughness: 0.25,
    envMapIntensity: 0.5,
    color: 0x858080,
    side: THREE.DoubleSide,
  });

  // uniforms
  const sliceStart = uniform(1.75);
  const sliceArc = uniform(1.25);
  const sliceColor = uniform(color(0xb62f58));

  _gui.add(sliceStart, "value", -Math.PI, Math.PI, 0.001).name("sliceStart");
  _gui.add(sliceArc, "value", 0, Math.PI * 2, 0.001).name("sliceArc");
  _gui
    .addColor(
      { color: sliceColor.value.getHexString(THREE.SRGBColorSpace) },
      "color"
    )
    .onChange((value) => sliceColor.value.set(value));

  slicedMaterial.outputNode = Fn(() => {
    // 丢弃 discard
    inAngle(positionLocal.xy, sliceStart, sliceArc).discard();
    // backface color
    const finalOutput = output;
    If(frontFacing.not(), () => {
      finalOutput.assign(vec4(sliceColor, 1));
    });
    return finalOutput;
  })();

  slicedMaterial.shadowNode = Fn(() => {
    inAngle(positionLocal.xy, sliceStart, sliceArc).discard();
    return vec4(0, 0, 0, 1);
  })();

  // 加载模型
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("./draco/");

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  gltfLoader.load("./model/gears.glb", (gltf) => {
    gltf.scene.traverse((child) => {
      // 修改材质
      if (child.isMesh) {
        if (child.name === "outerHull") {
          child.material = slicedMaterial;
        } else {
          child.material = defaultMaterial;
        }

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    _scene.add(gltf.scene);
  });

  // 创建平面
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10, 10, 10),
    new THREE.MeshStandardNodeMaterial({
      color: 0xaaaaaa,
    })
  );
  plane.receiveShadow = true;
  plane.position.set(0, -3, 0);
  plane.lookAt(new THREE.Vector3(0, 0, 0));
  _scene.add(plane);

  _renderer = new THREE.WebGPURenderer({ antialias: true });
  _renderer.toneMapping = THREE.ACESFilmicToneMapping;
  _renderer.toneMappingExposure = 1;
  _renderer.shadowMap.enabled = true;
  _renderer.setPixelRatio(window.devicePixelRatio);
  _renderer.setSize(window.innerWidth, window.innerHeight);
  _renderer.setAnimationLoop(_animate);
  container.value.appendChild(_renderer.domElement);

  _orbitControls = new OrbitControls(_perspectiveCamera, _renderer.domElement);
  _orbitControls.enableDamping = true;
  _orbitControls.minDistance = 0.001;
  _orbitControls.maxDistance = 100;

  //_animate();
}

async function _animate() {
  //requestAnimationFrame(_animate);
  _orbitControls.update();

  _renderer.render(_scene, _perspectiveCamera);
}
</script>

<style>
.container {
  display: flex;
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
}
</style>
