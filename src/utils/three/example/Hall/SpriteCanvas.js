import * as THREE from "three";

export default class SpriteCanvas{
    constructor(camera,text="雷神大牛.....好厉害",position=new THREE.Vector3(0,0,0),euler = new THREE.Euler(0,0,0)){
        this.fns =[];

        // 创建canvas 对象
        const canvas= document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext("2d");
        this.context = context;
        context.fillStyle = "rgba(90,90,90,0.7)";
        context.fillRect(0,256,1024,512);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = "bold 200px Arial";
        context.fillStyle = "rgba(255,255,255,1)";
        context.fillText(text,canvas.width /2,canvas.height/2);
        let texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.SpriteMaterial({
            map:texture,
            color:0xffddcc,
            alphaMap:texture,
            side:THREE.DoubleSide,
            transparent:true,
            blending:THREE.AdditiveBlending,
        });
        this.mesh = new THREE.Sprite(material);
        this.mesh.scale.set(1,1,1);

        this.mesh.position.copy(position);
        this.mesh.rotation.copy(euler);

        // 创建射线
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // 事件监听
        window.addEventListener("click",e=>{
            this.mouse.x = (e.clientX / window.innerWidth ) * 2 - 1;
            this.mouse.y = - (e.clientY / (1080 * ( window.innerWidth / 1920))) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse,camera);

            e.mesh = this.mesh;
            e.spriteCanvas = this;

            const intersects = this.raycaster.intersectObject(this.mesh);
            e.intersects = intersects;

            if(intersects.length > 0){
                this.fns.forEach(fn=>{
                    fn(e);
                });
            }
        },false);

    }

    onClick(fn){
        this.fns.push(fn);
    }
}