/**
 * 相机相关的板块
 * 
 */

import * as THREE from "three";

// 创建透视相机
const perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,1,50000);
// 设置相机的位置
perspectiveCamera.position.set(5,10,15);

export default perspectiveCamera;