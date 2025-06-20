<template>
  <div class="container" id="container" ref="container">
    <div class="btns">
      <div class="btn">
        <div class="btn-icon1"></div>
        <button class="btn-text" @click="btnChangeColor">颜色</button>

      </div>
      <div class="btn">
        <div class="btn-icon2"></div>
        <button class="btn-text" @click="btnEnter">内饰</button>

      </div>
      <div class="btn">
        <div class="btn-icon3"></div>
        <button class="btn-text" @click="btnOutCar">车身</button>

      </div>
    </div>
  </div>
</template>
<script setup >

import { onMounted, ref, provide, readonly } from 'vue'
// 导入three
import * as THREE from "three";
// 导入控制器
import { OrbitControls } from "three/addons";
// 导入webgpu渲染器
import * as THREEGPU from "three/webgpu"
// 判断webgpu是否可用
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import * as Nodes from "three/tsl";

import gsap from "gsap";
// 判断webgpu是否可用
if (WebGPU.isAvailable() === false) {
  alert("WebGPU is not available");
  throw new Error("WebGPU is not available");
}

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


let renderer,scene,camera,controls,container;
 container = ref(null);

onMounted(()=>{
  //console.log(container)
  init();


})

function init(){
  



  // 创建场景
  scene = new THREE.Scene();
  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  // 设置相机位置
  camera.position.set(0, 20, 20);

  // 创建渲染器
  renderer = new THREEGPU.WebGPURenderer({
    // 抗锯齿
    // antialias: true,
  });
  // 设置渲染器大小
  renderer.setSize(window.innerWidth, window.innerHeight);
  // 添加渲染器到dom
  // const container = ref()
  //document.getElementById('app').appendChild(renderer.domElement);
  container.value.appendChild(renderer.domElement);

  let timer = Nodes.timerLocal(0.2, 0);

  // 添加辅助坐标系
  const axesHelper = new THREE.AxesHelper(10);
  scene.add(axesHelper);

  // 添加环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  console.log('Nodes:', Nodes);
  // 创建控制器
  controls = new OrbitControls(camera, renderer.domElement);

  // 加载场景纹理
  const textureLoader = new THREE.TextureLoader();
  let envMap = textureLoader.load("./texture/Scene_1108.jpg");
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  envMap.flipY = false;

  scene.background = envMap;
  scene.environment = envMap;

  // 创建天空的包围求
  let sphere = new THREE.SphereGeometry(50, 64, 64);
  envMap.flipY = true;
  let skyboxMaterial = new THREE.MeshBasicMaterial({
    map: envMap,
    side: THREE.BackSide,
  });
  let skybox = new THREE.Mesh(sphere, skyboxMaterial);
  scene.add(skybox);

  skybox.position.set(0, 10, 0);



  let planeGeometry = new THREE.CircleGeometry(40, 64);
  let planeMaterial = new Nodes.MeshPhongNodeMaterial();
  planeMaterial.side = THREE.DoubleSide;
  // 设置节点材质
  // 添加阴影贴图
  let aoTexture = textureLoader.load("./texture/ferrari_ao.png");

  // 加载地面材质纹理
  let uvNode = Nodes.uv().mul(5);
  let fabricTexture = textureLoader.load("./texture/fabric/FabricPlainWhiteBlackout009_COL_2K.jpg");
  fabricTexture.wrapS = THREE.RepeatWrapping;
  fabricTexture.wrapT = THREE.RepeatWrapping;

  //planeMaterial.colorNode = Nodes.texture(fabricTexture,uvNode);
  planeMaterial.colorNode = Nodes.texture(fabricTexture, uvNode)
    .mul(Nodes.texture(aoTexture, Nodes.uv().mul(Nodes.vec2(30, 14)).add(Nodes.vec2(-14.525, -6.52))));
  // 加载法线贴图
  let fabricNormalMap = textureLoader.load("./texture/fabric/FabricPlainWhiteBlackout009_NRM_2K.png");
  fabricNormalMap.wrapS = fabricNormalMap.wrapT = THREE.RepeatWrapping;
  planeMaterial.normalNode = Nodes.texture(fabricNormalMap, uvNode);
  // 加载高光贴图
  let fabricSheenMap = textureLoader.load("./texture/fabric/FabricPlainWhiteBlackout009_GLOSS_2K.png");
  fabricSheenMap.wrapS = fabricNormalMap.wrapT = THREE.RepeatWrapping;
  planeMaterial.shininessNode = Nodes.texture(fabricSheenMap, uvNode);
  //planeMaterial.specularMap = fabricSheenMap;
  //console.log(planeMaterial)




  let plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);


  // 添加聚光灯
  let spotLight = new THREE.SpotLight(0xFF1493);
  spotLight.position.set(0, 20, 0);
  spotLight.angle = Math.PI / 8;
  spotLight.penumbra = 0.3;
  spotLight.intensity = 200;
  //spotLight.distance = 100;
  scene.add(spotLight);
  let spotLightAxesHelper = new THREE.SpotLightHelper(spotLight);
  scene.add(spotLightAxesHelper);


  // 加载汽车
  const gltfLoader = new GLTFLoader();
  gltfLoader.load("./model/zeekr.glb", (gltf) => {
    let model = gltf.scene;
    model.traverse((child) => {
      //console.log(child);
      if (child.isMesh) {
        if (child.name === "车顶窗") {
          child.material.transparent = true;
        }
        if (child.name === "挡风玻璃") {
          child.material.transparent = true;
        }

        if (child.name === "后右车门窗") {
          child.material.transparent = true;
          child.material.opacity = 0.8;
          child.material.thickness = 2;
          child.material.color = new THREE.Color(0x333333);
        }

        if (child.name === "车灯罩") {
          child.material.transparent = true;
          child.material.opacity = 0.5;
          child.material.thickness = 2;
        }
        if (child.name === "机盖2") {
          child.material.color = new THREE.Color(0xffccff);
          child.material.roughness = 0.5;
          child.material.clearcoat = 1;
          child.material.clearcoatRoughness = 0;
          //child.material.transparent = true;

        }

        if(child.material && child.material.name == "视频纹理"){
          video.addEventListener("loadeddata",()=>{
            let videoTexture = new THREE.VideoTexture(video);

            child.material = new THREE.MeshPhongMaterial({
              map:videoTexture,
              emissiveMap:videoTexture,
            })
          })
        }
      }
    })
    scene.add(model);
  });

  // 添加点光源
  let pointLight = new THREE.PointLight(0xff9999,1,1);
  pointLight.position.set(14,14,0);
  scene.add(pointLight);

  // 添加第二个点光源
  let pointLight2 = new THREE.PointLight(0x99ffff,1,1);
  pointLight2.position.set(-14,14,0);
  scene.add(pointLight2);
  
  let pointLight3 = new THREE.PointLight(0xff99ff,1,1);
  pointLight3.position.set(0,14,-14);
  scene.add(pointLight3);

  let pointLight4 = new THREE.PointLight(0x00ffff,1,1);
  pointLight4.position.set(0,14,-14);
  scene.add(pointLight4);

  // 创建视频对象
  let video = document.createElement("video");
  video.src = "./texture/video.mp4";
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.crossOrigin = "anonymous";


  animate();
}

// 监听交互事件
let timeLine = gsap.timeline();
const btnEnter=(e)=>{
  timeLine.to(camera.position,{
    x:0.43,
    z:-0.1,
    y:1.24,
    duration:1,
    ease:"power2.inOut",
  });

  controls.target.set(0.4,1.2,0);
}
/**
 * 离开车内
 */
const btnOutCar =()=>{

}

const btnChangeColor = ()=>{

}


// 渲染场景
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
</script>


<style>
.container {
  display: flex;
  margin: 0;
  padding: 0;
}

.btns{
  position: fixed;
  display: flex;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: rgba(0,0,0,0.8);
  z-index: 100;
}

.btn {
  width: 33%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.btn-icon1{
  background-color: aquamarine;

  background-image: url(@/assets/img/car.png);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-size: 50px;
}

.btn-icon2{
  background-image: url(@/assets/img/car3.png);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color:aqua;
  background-size: 50px;

}
.btn-icon3{
  background-image: url(@/assets/img/car2.png);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: bisque;
  background-size: 50px;
}
</style>
