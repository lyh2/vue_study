/**
 * 雾
 * 
 */

import * as THREE from "three";
import gsap from "gsap";



export class Clouds{
    // height 设置云朵高度，num 设置云朵数量
    constructor(height = 10,num = 300,size = 15,scale=10,autoRotate=true){
        let textureLoader = new THREE.TextureLoader();
        const map1 = textureLoader.load("./hall/cloud1.png");
        const map2 = textureLoader.load("./hall/cloud2.jpeg");
        const map3 = textureLoader.load("./hall/cloud3.jpeg");


        let material1 = new THREE.SpriteMaterial({
            map:map2,
            color:0xfffdee,
            alphaMap:map1,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            depthTest:false,

        });
        let material2 = new THREE.SpriteMaterial({
            map:map3,
            color:0xdcdfde,
            alphaMap:map1,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            depthTest:false,
        });

        let material3 = new THREE.SpriteMaterial({
            map:map1,
            color:0xfcfefd,
            alphaMap:map1,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            depthTest:false,
        });

        this.materials = [material1,material2,material3];

        this.group = new THREE.Group();
        for(let i =0; i < num;i++){
            let index = Math.floor(Math.random() * 3);
            let material = this.materials[index];
            let sprite = new THREE.Sprite(material);

            // 设置精灵大小
            let randomSize = Math.random() * size;
            sprite.scale.set(randomSize,randomSize,randomSize);

            // 随机设置精灵的位置
            let randomX = (Math.random() - 0.5) * 2 * scale;
            let randomY = (Math.random() * (height / 2) + height);
            let randomZ = (Math.random() - 0.5) * 2 * scale;
            sprite.position.set(randomX,randomY,randomZ);
            this.group.add(sprite);

        }

        if(autoRotate){
            this.animate();
        }
    }   

    animate(){
        gsap.to(this.group.rotation,{
            duration:120,
            repeat:-1,
            y:Math.PI * 2,
        })
    }
}

export class CloudsPlus{
    // height 设置云朵高度 ，num 设置云朵数量
    constructor(height = 20,num = 100,size = 400,scale = 100,autoRotate = true){
        this.height = height;
        this.size = size;
        this.scale = scale;
        this.autoRotate = autoRotate;
        let textureLoader = new THREE.TextureLoader();
        const map1 = textureLoader.load("./hall/cloud1.png");
        const map2 = textureLoader.load("./hall/cloud.jpeg");
        const map3 = textureLoader.load("./hall/cloud3.jpeg");

        let materials =[];
        let material1 = new THREE.PointsMaterial({
            map:map1,
            color:0x00FF7F,
            alphaMap:map2,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            depthTest:false,
            size:0.2 * size,
        });

        let material2 = new THREE.PointsMaterial({
            map:map2,
            color:0xFF8C00,
            alphaMap:map3,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            depthTest:false,
            size:0.5 * size,
        });


        let material3 = new THREE.PointsMaterial({
            map:map3,
            color:0x00FF00,
            alphaMap:map1,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            depthTest:false,
            size:0.8 * size,
        });

        let material4 = new THREE.PointsMaterial({
            map:map2,
            color:0x00FFFF,
            alphaMap:map1,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:true,
            depthTest:true,
            size:1 * size,
        });

        materials.push(material1,material2,material3,material4);
        this.group = new THREE.Group();

        for(let i = 0; i < materials.length ;i++){
            let material = materials[i];
            let geometry = this.generateGeometry(this.num);
            let points = new THREE.Points(geometry,material);
            this.group.add(points);

        }

        if(autoRotate){
            this.animate();
        }
    }

    generateGeometry(num = 300){
        const vertices =[];

        // 创建点位置
        for(let i =0; i < num;i++){
            // 随机设置精灵的位置
            let randomX = (Math.random() - 0.5) * 2 * this.scale;
            let randomY = Math.random() * ( this.height / 2) + this.height;
            let randomZ = (Math.random() - 0.5) * 2 * this.scale;
            vertices.push(randomX,randomY,randomZ);

        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
        return geometry;
    }

    animate(){
        let i = 1;
        this.group .traverse(item=>{
            let speed = 40 * i;

            if(item instanceof THREE.Points){
                gsap.to(item.rotation,{
                    duration:speed,
                    repeat:-1,
                    y:Math.PI * 2
                });
            }
            i++;
        });
    }
}