/**
 * 初始化场景
 * 
 */

import * as THREE from "three";

// 创建场景
const scene = new THREE.Scene();

// 场景天空盒
const textureCubeLoader = new THREE.CubeTextureLoader().setPath("./textures/");
const textureCube = textureCubeLoader.load([
    "posx.jpg",
    "negx.jpg",
    "posy.jpg",
    "negy.jpg",
    "posz.jpg",
    "negz.jpg",
]);

// 设置背景
scene.background = textureCube;
scene.environment = textureCube;

export default scene;