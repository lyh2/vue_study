/**
 * 云雾效果
 */

import * as THREE from "three";
import gsap from "gsap";

export class Clouds{
    constructor(height=10,num = 300,size=15,scale=10,autoRotate=true){
        // 首先加载纹理
        let loader = new THREE.TextureLoader();
        const map_1 = loader.load("./textures/cloud/cloud1.jfif");
        const map_2 = loader.load("./textures/cloud/cloud2.jfif");
        const map_3 = loader.load("./textures/cloud/cloud3.jpg");

        let material_1 = new THREE.SpriteMaterial({
            map:map_2,
            color:0xffffff,
            alphaMap:map_1,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthTest:false,
            depthWrite:false,
        });

        let material_2 = new THREE.SpriteMaterial({
            map:map_3,
            color:0xffffff,
            alphaMap:map_2,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            depthTest:false,
            
        });

        let material_3 = new THREE.SpriteMaterial({
            map:map_1,
            color:0xffffff,
            alphaMap:map_3,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            depthTest:false,
        });

        this._materials =[material_1,material_2,material_3];
        this._group = new THREE.Group();
        for(let i = 0;i < num;i++){
            let index = Math.floor(Math.random() * 3);
            let material = this._materials[index];
            let sprite = new THREE.Sprite(material);

            let randomSize = Math.random() * size;
            sprite.scale.set(randomSize,randomSize,randomSize);
            sprite.position.set((Math.random() -0.5) * 2 * scale,Math.random() * (height / 2) + height,(Math.random() - 0.5) * 2 * scale);

            this._group.add(sprite);
        }

        if(autoRotate){
            this._animate();
        }
    }

    _animate(){
        gsap.to(this._group.rotation,{
            duration:120,repeat:-1,y:Math.PI * 2,
        });
    }
}

/**
 * 升级版
 */
export class CloudsPlus{
    constructor(height = 20,num = 100,size=400,scale=100,autoRotate=true){
        this.height = height;
        this.num = num;
        this.size = size;
        this.scale = scale;
        this.autoRotate = autoRotate;
        const loader = new THREE.TextureLoader();
        const map_1 = loader.load("./textures/cloud/cloud1.jfif");
        const map_2 = loader.load("./textures/cloud/cloud2.jfif");
        const map_3 = loader.load("./textures/cloud/cloud1.jpg");

        const materials =[];
        let material_1 = new THREE.PointsMaterial({
            map: map_1,
            color: 0xffffff,
            alphaMap: map_2,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            size: 0.2 * size,
          });
          let material_2 = new THREE.PointsMaterial({
            map: map_2,
            color: 0xffffff,
            alphaMap: map_3,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            size: 0.5 * size,
          });
          let material_3 = new THREE.PointsMaterial({
            map: map_3,
            color: 0xffffff,
            alphaMap: map_1,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            size: 0.8 * size,
          });
          let material_4 = new THREE.PointsMaterial({
            map: map_2,
            color: 0xffffff,
            alphaMap: map_1,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            size: 1 * size,
          });
        
          materials .push(material_1,material_2,material_3,material_4);
          this._group = new THREE.Group();
          for(let i = 0; i < materials.length;i++){
            let material = materials[i];
            let geometry = this._generateGeometry(this.num);
            let points= new THREE.Points(geometry,material);
            this._group.add(points);
          }

        if(this.autoRotate){
            this._animate();
        }
    }

    _generateGeometry(num = 300){
        const vertices =[];

        for(let i =0;i < num;i++){
            let randomX = (Math.random() - 0.5) * 2 * this.scale;
            let randomY = Math.random() * ( this.height / 2) + this.height;
            let randomZ = (Math.random() - 0.5) * 2 * this.scale;
            vertices.push(randomX,randomY,randomZ);
        }

        const geometry= new THREE.BufferGeometry();
        geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
        return geometry;
    }

    _animate(){
        let i = 1;
        this._group.traverse(item=>{
            let speed = 40 * i;
            if(item instanceof THREE.Points){
                gsap.to(item.rotation,{
                    duration:speed,
                    repeat:-1,
                    y:Math.PI * 2,
                });
            }
            i++;
        });
    }
}