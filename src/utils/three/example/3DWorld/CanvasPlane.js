import * as THREE from "three";

export default class CanvasPlane{
    constructor(scene,text="helloworld 中文",position = new THREE.Vector3(0,0,0),euler=new THREE.Euler(0,0,0)){
        // 创建canvas对象
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;
        const context = canvas.getContext("2d");
        this.context = context;
        let image = new Image();
        image.src= "./textures/frame/frame2.png";
        image.onload=()=>{
            context.drawImage(image,0,0,1024,1024);
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.font = "bold 100px Arial";
            context.fillStyle = "rgba(0,255,255,1)";
            context.fillText(text,canvas.width/2,canvas.height/2);

            let texture = new THREE.CanvasTexture(canvas);
            const planeGeometry = new THREE.PlaneGeometry(2,2,1,1);
            const planeMaterial = new THREE.MeshBasicMaterial({
                map:texture,
                alphaMap:texture,
                color:0xfdfdfc,
                side:THREE.DoubleSide,
                transparent:true,
                blending:THREE.AdditiveBlending,
                depthWrite:false,
            });
            this.mesh = new THREE.Mesh(planeGeometry,planeMaterial);
            this.mesh.position.copy(position);
            this.mesh.rotation.copy(euler);
            scene.add(this.mesh);
        }

    }
}