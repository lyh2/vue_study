<script setup >

// 学习案例：https://www.donmccurdy.com/2019/03/17/three-nodematerial-introduction/

// 导入three
import * as THREE from "three";
// 导入控制器
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// 导入webgpu渲染器
import THREEGPU from "three/webgpu";
// 判断webgpu是否可用
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import * as Nodes from "three/tsl";
// 判断webgpu是否可用
if (WebGPU.isAvailable() === false) {
  alert("WebGPU is not available");
  throw new Error("WebGPU is not available");
}

// 创建场景
const scene = new THREE.Scene();
// 创建相机
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// 设置相机位置
camera.position.set(0, 20, 60);

// 创建渲染器
const renderer = new THREEGPU.WebGPURenderer({
  // 抗锯齿
  // antialias: true,
});
// 设置渲染器大小
renderer.setSize(window.innerWidth, window.innerHeight);
// 添加渲染器到dom
document.body.appendChild(renderer.domElement);

let timer = Nodes.timerLocal(0.2, 0);

// 生命周期随机值
const lifeRange = Nodes.range(0.1, 1);
// 每个精灵的生命时间
const lifeTime = timer.mul(lifeRange).mod(1);
// 每个精灵生命周期所花费的时间
const life = lifeTime.div(lifeRange);
// 随机精灵大小的范围
const scaleRange = Nodes.range(0.3, 2);
// 随机精灵的旋转角度
const rotateRange = Nodes.range(0, Math.PI * 2);

// 创建随机的位置
const offsetRange = Nodes.range(
  new THREE.Vector3(-2, 3, -2),
  new THREE.Vector3(2, 5, 2)
);

// 烟火的纹理
const smokeTexture = new THREE.TextureLoader().load("./textures/smoke1.png");
const textureNode = Nodes.texture(
  smokeTexture,
  Nodes.uv().rotateUV(timer.mul(rotateRange))
);

const smokeColor = Nodes.mix(
  Nodes.color(0xf27d0c),
  Nodes.color(0x222222),
  Nodes.positionLocal.y.mul(3).clamp()
);
// 创建烟火粒子
const smokeNodeMaterial = new Nodes.SpriteNodeMaterial();
smokeNodeMaterial.colorNode = Nodes.mix(
  smokeColor,
  Nodes.color(0x222222),
  lifeTime
);
smokeNodeMaterial.positionNode = offsetRange.mul(lifeTime);
smokeNodeMaterial.opacityNode = textureNode.a;
// smokeNodeMaterial.opacityNode = lifeTime;
smokeNodeMaterial.scaleNode = scaleRange.mul(lifeTime.max(0.3));
smokeNodeMaterial.depthWrite = false;
smokeNodeMaterial.transparent = true;

const smokeInstancedSprite = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  smokeNodeMaterial
);
smokeInstancedSprite.isInstancedMesh = true;
smokeInstancedSprite.count = 1000;
scene.add(smokeInstancedSprite);

const fireNodeMaterial = new Nodes.SpriteNodeMaterial();

fireNodeMaterial.colorNode = Nodes.mix(
  Nodes.color(0xf7ff17),
  Nodes.color(0xb72f17),
  lifeTime
);
fireNodeMaterial.opacityNode = textureNode.a;
fireNodeMaterial.positionNode = Nodes.range(
  new THREE.Vector3(-1, 1, -1),
  new THREE.Vector3(1, 3, 1)
).mul(lifeTime);

fireNodeMaterial.scaleNode = smokeNodeMaterial.scaleNode;
fireNodeMaterial.depthWrite = false;
fireNodeMaterial.transparent = true;
fireNodeMaterial.blending = THREE.AdditiveBlending;

const fireInstancedSprite = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  fireNodeMaterial
);
fireInstancedSprite.isInstancedMesh = true;
fireInstancedSprite.count = 100;
scene.add(fireInstancedSprite);

// 添加辅助坐标系
const axesHelper = new THREE.AxesHelper(10);
scene.add(axesHelper);

console.log('Nodes:',Nodes);
// 创建控制器
const controls = new OrbitControls(camera, renderer.domElement);

// 渲染场景
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
</script>
<template>
  <div >
    
  </div>
</template>

<style>

</style>
