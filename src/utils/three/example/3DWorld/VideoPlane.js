/**
 * 视频平面
 */
import * as THREE from "three";

export default class VideoPlane{
    constructor(videoSrc,size = new THREE.Vector2(1,1),position = new THREE.Vector3(0,0,0)){
        // 创建html video元素
        this.video = new document.createElement("video");
        this.video.src = videoSrc;
        this.video.muted = true;// 设置静音 视频能够自动播放
        this.video.loop = true;
        this.video.play();
        // 使用视频创建纹理
        const texture = new THREE.VideoTexture(this.video);

        // 创建一个平面
        const planeGeometry = new THREE.PlaneGeometry(size.x,size.y,1,1);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color:0xffffdc,
            side:THREE.DoubleSide,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            map:texture,
            alphaMap:texture,
        });

        this.mesh = new THREE.Mesh(planeGeometry,planeMaterial);
        this.mesh.position.copy(position);
    }
}