import * as THREE from "three";

export default class CanvasPlane{
    constructor(scene,text="我是雷神!....",position = new THREE.Vector3(0,0,0),euler = new THREE.Euler(-Math.PI / 2,0,0)){
        // 创建canvas 对象
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 1024;

        const context = canvas.getContext("2d");
        this.context = context;

        var image = new Image();
        image.src = "./texture/effect/frame2.png";
        image.onload =()=>{
            context.drawImage(image,0,0,1024,1024);
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.font = "bold 300px Arial";
            context.fillStyle = "rgba(0,255,255,1)";
            context.fillText(text,canvas.width / 2,canvas.height / 2);

            let texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.LinearMipMapLinearFilter;

            const planeGeometry = new THREE.PlaneGeometry(2,2,1,1);
            const planeMaterial = new THREE.MeshBasicMaterial({
                map:texture,
                alphaMap:texture,
                color:0xfdcdce,
                side:THREE.DoubleSide,
                transparent:true,
                blending:THREE.AdditiveBlending,
                depthWrite:false,
            });

            this.mesh = new THREE.Mesh(planeGeometry,planeMaterial);
            this.mesh.position.copy(position);
            this.mesh.rotation.copy(euler);
            this.scene.add(this.mesh);
        }
    }
}