/**
 * 
 * canvas 纹理文字
 * 
 */

import { Camera } from "three";

export default class SpriteText{
    constructor(text,options={}){
        this.callbacks =[];
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext("2d");
        context.fillStyle = "rgba(100,100,100,0.7)";
        context.fillRect(0,256,1024,512);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = "bold 200px Arial";
        context.fiilStyle = "white";
        context.fiilText(text,512,512);

        let texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map:texture,
            transparent:true,
            depthWrite:true,
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.5,0.5,0.5);
        sprite.position.copy(options.position);

        this.sprite = sprite;
        sprite.renderOrder = 1;
        options.scene.add(sprite);

        let mouse = new THREE.Vector2();
        let raycaster = new THREE.Raycaster();

        window.addEventListener("click",(e)=>{
            mouse.x = (e.clientX / window.innerWidth ) * 2 - 1;
            mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse,options.camera);
            let intersects = raycaster.intersectObject(sprite);
            if(intersects.length > 0){
                this.callbacks.forEach((callback)=>{
                    callback();
                });
            }
        });
    }


    onClick(callback){
        this.callbacks.push(callback);
    }
}