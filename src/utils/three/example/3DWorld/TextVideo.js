/**
 * 
 */

import * as THREE from "three";

export default class TextVideo{
    constructor(scene,text="helloworld 清澈的爱只为中国",position = new THREE.Vector3(0,0,0),euler=new THREE.Euler(0,0,0)){
        this.text = text;
        const canvas = document.createElement("canvas");
        this.canvas = canvas;
        this.canvas.width = 1024;
        this.canvas.height = 1024;

        const video = document.createElement("video");
        this.video = video;
        video.src = "./video/chatFrame.mp4";
        video.muted = true;
        video.loop = true;
        video.play();

        const context = canvas.getContext("2d");
        this.context = context;
        this.texture = new THREE.CanvasTexture(canvas);
        const planeGeometry = new THREE.PlaneGeometry(2,2,1,1);
        this.planeMaterial = new THREE.MeshBasicMaterial({
            map:this.texture,
            alphaMap:this.texture,
            color:0xffffff,
            side:THREE.DoubleSide,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
        });

        this.mesh = new THREE.Mesh(planeGeometry,this.planeMaterial);
        this.mesh.position.copy(position);
        this.mesh.rotation.copy(euler);
        scene.add(this.mesh);
    }

    drawVideoText(text){
        let context = this.context;
        context.clearRect(0,0,this.canvas.width,this.canvas.height);
        context.drawImage(this.video,0,0,1024,1024);
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = "bold 100px Arial";
        context.fillStyle = "rgba(0,255,255,1)";
        context.fillText(text,this.canvas.width /2, this.canvas.height/2);
        this.texture.needsUpdate = true;
        this.planeMaterial.needsUpdate = true;
    }

    update(deltaTime){
        this.drawVideoText(this.text);
    }
}