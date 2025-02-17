/**
 * 实现雷达效果
 * 
 */

import * as THREE from "three";
import gsap from "gsap";
import vertex from "./Shader/Radar/vertex.glsl";
import fragment from "./Shader/Radar/fragment.glsl";

export default class Radar {
    constructor(radius = 2, position = { x: 0, y: 0, z: 0 }, color = 0xff0000) {
        this.geometry = new THREE.PlaneGeometry(radius, radius);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(color) },
                uTime: { value: 0 },
            },
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true,// 开启透明
            side: THREE.DoubleSide,
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(position.x, position.y, position.z);
        this.mesh.rotation.x = - Math.PI / 2;

        // 开启时间
        gsap.to(this.material.uniforms.uTime, {
            value: 1,
            duration: 1,
            repeat: -1,
            ease: "none",
        });
    }

    remove() {
        this.mesh.remove();
        this.mesh.removeFromParent();
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}