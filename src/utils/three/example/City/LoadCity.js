/**
 * 加载城市模型
 * 
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import scene from "./Scene";
import perspectiveCamera from "./Camera";
import modifyCityMaterial from "./Modify/modifyCityMaterial";
import MeshLine from "./MeshLine";
import FlyLine from "./FlyLine";
import FlyLineShader from "./FlyLineShader";
import Radar from "./Radar";
import LightWall from "./LightWall";
import AlarmSprite from "./AlarmSprite";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";


export default function loadCity() {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./draco/");
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.load("./model/city.glb", gltf => {
        gltf.scene.traverse((item) => {
            if (item.type == "Mesh") {
                const cityMaterial = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(0x0c0c33),
                });
                item.material = cityMaterial;
                modifyCityMaterial(item);

                if (item.name == "Layerbuildings") {
                    const meshLine = new MeshLine(item.geometry);
                    const size = item.scale.x;
                    meshLine.mesh.scale.set(size, size, size);
                    scene.add(meshLine.mesh);
                }
            }
        });

        scene.add(gltf.scene);
        //gltf.scene.rotateX(-Math.PI);

        // 添加飞线效果
        const flyLine = new FlyLine();
        scene.add(flyLine.mesh);

        // 添加着色器飞线
        const flyLineShader = new FlyLineShader();
        scene.add(flyLineShader.mesh);

        // 添加雷达
        const radar = new Radar();
        scene.add(radar.mesh);
        // 添加光墙
        const lightWall = new LightWall();
        scene.add(lightWall.mesh);

        // 警告标识
        const alarmSprite = new AlarmSprite();
        scene.add(alarmSprite.mesh);
    });
}