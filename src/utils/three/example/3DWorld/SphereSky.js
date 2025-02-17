import * as THREE from "three";

import {Lensflare,LensflareElement} from "three/examples/jsm/objects/Lensflare";

export default class SphereSky{
    constructor(radius,uTime,envMap){
        let geometry = new THREE.SphereGeometry(radius,32,32);
        let material = new THREE.MeshBasicMaterial({
            map:envMap,
            side:THREE.DoubleSide,
        });
        this.mesh = new THREE.Mesh(geometry,material);
        this.mesh.rotation.y = - Math.PI / 2;

        material.onBeforeCompile = (shader)=>{
            // 在编译之前修改材质
            shader.uniforms.uTime  = uTime;
            shader.fragmentShader = shader.fragmentShader.replace("#include <common>",`
                
                #include <common>
                uniforms float uTime;

                `);
            shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>",`
                
                #include <dithering_fragment>
                float dayStrength = 0.0;
                if(abs(uTime - 12.) < 4.){
                    dayStrength = 1.0;
                }
                    if(abs(uTime - 12.) > 6.){
                        dayStrength = 0.15;
                    }
                        // 4点到6点之间
                        if(abs(uTime - 12.0) >= 4.0 && abs(uTime - 12.0) <= 6.0){
                        dayStrength= 1.0 - (abs(uTime - 12.) - 4.) / 2.0;
                        dayStrength = clamp(dayStrength,0.15,1.);
                        }
                        gl_FragColor = mix(vec4(0.,0.0,0.,1.),gl_FragColor,dayStrength);
                `);
        };

        // 创建太阳
        let sunGeometry = new THREE.SphereGeometry(100,32,32);
        let sunMaterial = new THREE.MeshStandardMaterial({
            emissive:0xffffcc,
        });
        this.sun = new THREE.Mesh(sunGeometry,sunMaterial);
        this.sun.position.set(500,500,4000);
        this.sun.visible = false;

        // 创建直线光
        let sunLight = new THREE.DirectionalLight(0xffffcc,2);
        sunLight.castShadow = true;
        sunLight.shadow.camera.near = 0.1;
        sunLight.shadow.camera.far = 10000;
        sunLight.shadow.camera.left = -1000;
        sunLight.shadow.camera.right = 1000;
        sunLight.shadow.camera.top = 1000;
        sunLight.shadow.camera.bottom = -1000;
        sunLight.shadow.mapSize.width = 20480;
        sunLight.shadow.mapSize.height = 20480;
        sunLight.shadow.radius = 3;
        this.sun.add(sunLight);

        // 光晕效果
        const textureLoader = new THREE.TextureLoader();
        const textureFlare0 = textureLoader.load("./textures/lensflare/lensflare0.png");
        const textureFlare3 = textureLoader.load("./textures/lensflare/lensflare3.png");

        const lensflare = new Lensflare();
        lensflare.addElement(new LensflareElement(textureFlare0,700,0));
        lensflare.addElement(new LensflareElement(textureFlare3,300,0.6));
        lensflare.addElement(new LensflareElement(textureFlare3,200,0.75));
        lensflare.addElement(new LensflareElement(textureFlare3,150,0.9));
        lensflare.addElement(new LensflareElement(textureFlare3,100,1));
        sunLight.add(lensflare);
    }

    updateSun(time){
        this.sun.position.z = Math.cos(((time - 6) * 2 * Math.PI) / 24) * 4000;
        this.sun.position.y = Math.sin(((time - 6) * 2 * Math.PI) / 24) * 4000;
    }
}