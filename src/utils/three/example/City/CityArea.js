import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import * as THREE from "three";
import gsap from "gsap";

import scene from "./Scene";
import eventHub from "../../../EventMitt";

export default class CityArea {
    constructor() {
        // 加载模型
        this.loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("./draco/");
        this.loader.setDRACOLoader(dracoLoader);
        this.loader.load("./model/city4.glb", gltf => {
            scene.add(gltf.scene);

            gltf.scene.position.y = 2;
            // 遍历场景子元素
            this.gltf = gltf;
            gltf.scene.traverse((item) => {
                if (item.name === "热气球") {
                    this.mixer = new THREE.AnimationMixer();
                    this.clip = gltf.animations[1];
                    this.action = this.mixer.clipAction(this.clip);
                    this.action.play();
                }

                if (item.name === "汽车园区轨迹") {
                    const line = item;
                    line.visible = true;
                    // 根据点创建曲线
                    const points = [];
                    for (let i = line.geometry.attributes.position.count - 1; i >= 0; i++) {
                        points.push(new THREE.Vector3(line.geometry.attributes.position.getX(i), line.geometry.attributes.position.getY(i), line.geometry.attributes.position.getZ(i)));

                    }

                    this.curve = new THREE.CatmullRomCurve3(points);
                    this.curveProgress = 0;
                    this.carAnimation();
                }

                if (item.name === "redcar") {
                    this.redcar = item;
                }
            });

            gltf.cameras.forEach((camera) => {

            });
        });

        eventHub.on("actionClick", (i) => {
            this.action.reset();
            this.clip = this.gltf.animations[i];
            this.action = this.mixer.clipAction(this.clip);
            this.action.play();
        })
    }

    update(time) {
        if (this.mixer) {
            this.mixer.update(time);
        }
    }

    carAnimation() {
        gsap.to(this, {
            curveProgress: 0.999,
            duration: 10,
            repeat: -1,
            onUpdate: () => {
                const point = this.curve.getPoint(this.curveProgress);
                this.redcar.position.set(point.x, point.y, point.z);
                if (this.curveProgress + 0.001 < 1) {
                    const point = this.curve.getPoint(this.curveProgress + 0.001);
                    this.redcar.lookAt(point);
                }
            }
        })
    }
}