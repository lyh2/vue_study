/**
 * 智慧城市
 * 
 */

import * as THREE from "three";
import gsap from "gsap";

// 导入gui 对象
import gui from "@/utils/three/example/City/gui.js";

// 导入场景
import scene from "./Scene";
import renderer from "./Renderer";

// 透视相机
import perspectiveCamera from "./Camera";
import axesHelper from "./AxesHelper";

// 导入添加物体的函数
import loadCity from "./LoadCity";
import animate from "./Animate";

export default class City {
    constructor(options = {}) {
        // 添加相机
        scene.add(perspectiveCamera);

        scene.add(axesHelper);

        options.dom.appendChild(renderer.domElement);

        loadCity();

        animate();
    }
}