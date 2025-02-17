/**
 * 
 * 着色器实现飞线效果,完整的一条线
 */

import * as THREE from "three";
import gsap from "gsap";
import vertex from "./Shader/FlyLine/vertex.glsl";
import fragment from "./Shader/FlyLine/fragment.glsl";

export default class FlyLineShader {
    constructor(endPosition = { x: -10, y: 10, z: 10 }, color = 0xffff0f) {
        this.number = 1000;// 点位个数
        // 根据点生成曲线
        let linePoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(endPosition.x / 2, endPosition.y, endPosition.z / 2),
            new THREE.Vector3(endPosition.x, endPosition.y, endPosition.z),
        ];
        // 创建一个曲线
        this.lineCurve = new THREE.CatmullRomCurve3(linePoints);
        const points = this.lineCurve.getPoints(this.number);// 表示把曲线分割成多少段1001
        // 根据上面的point 创建几何数据
        this.geometry = new THREE.BufferGeometry().setFromPoints(points);
        // 给每个顶点设置属性
        const aSizeArray = new Float32Array(points.length);
        aSizeArray.map((item, index) => {
            item = index * 10;
        });
        // 设置几何体顶点属性
        this.geometry.setAttribute("aSize", new THREE.BufferAttribute(aSizeArray, 1));
        // 设置着色器材质
        this.shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                uColor: {
                    value: new THREE.Color(color),
                },
                uLength: {
                    value: points.length,
                }
            },
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.mesh = new THREE.Points(this.geometry, this.shaderMaterial);

        // 改变uTime 事件
        gsap.to(this.shaderMaterial.uniforms.uTime, {
            value: this.number,
            duration: 2,
            repeat: -1,
            ease: "bounce.inOut",
        });


    }

    remove() {
        this.mesh.remove();
        this.mesh.removeFromParent();
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}