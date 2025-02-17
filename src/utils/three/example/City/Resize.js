/**
 * 窗口尺寸发生改变
 * 
 */

import perspectiveCamera from "./Camera";
import renderer from "./Renderer";

// 更新摄像头
perspectiveCamera.aspect = window.innerWidth / window.innerHeight;

// 更新投影矩阵
perspectiveCamera.updateProjectionMatrix();

// 监听窗口变化
window.addEventListener("resize",()=>{
    // 更新摄像头
    perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    perspectiveCamera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth , window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
})