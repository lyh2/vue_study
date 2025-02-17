/**
 * 警告牌
 */

import * as THREE from "three";
import perspectiveCamera from "./Camera";

export default class AlarmSprite {
    constructor(type = 'fire', position = { x: -1.8, y: 3.5, z: 3 }, color = 0xffff00) {
        const textureLoader = new THREE.TextureLoader();
        const typeObj = {
            'fire': "./textures/tag/fire.png",
            'safe': "./textures/tag/jingcha.png",
            'power': "./textures/tag/e.png"
        };

        const map = textureLoader.load(typeObj[type]);

        this.material = new THREE.SpriteMaterial({
            map: map,

            color: color,
            transparent: true,
            depthTest: false,
        });

        this.mesh = new THREE.Sprite(this.material);

        // 设置位置
        this.mesh.position.set(position.x, position.y, position.z);

        // 封装点击事件
        this.fns = [];

        // 创建射线
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // 事件监听
        window.addEventListener("click", (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // X轴 -1 ，到 1
            this.mouse.y = -((event.clientY / window.innerHeight) * 2 - 1);// Y轴 上面是1，下面是-1

            this.raycaster.setFromCamera(this.mouse, perspectiveCamera);

            event.mesh = this.mesh;
            event.alarm = this;

            const intersects = this.raycaster.intersectObject(this.mesh);
            if (intersects.length > 0) {
                this.fns.forEach((fn) => {
                    fn(event);
                })
            }
        });

    }

    onClick(fn) {
        this.fns.push(fn);
    }

    remove() {
        this.mesh.remove();
        this.mesh.removeFromParent();
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}