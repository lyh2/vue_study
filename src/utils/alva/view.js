import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { AlvaARConnectorTHREE } from './alva_ar_three';
export class ARCameraView{
    /**
     * 
     * @param {*} container dom
     * @param {*} width 宽度
     * @param {*} height 高度
     * @param {*} x 几何体位置.x
     * @param {*} y 
     * @param {*} z 
     * @param {*} scale 几何体缩放系数.scale
     */
    constructor(container,width,height,x=0,y=0,z=-10,scale=1.0){
        this.applyPose = AlvaARConnectorTHREE.Initialize(THREE);
        
        // 创建相机
        this.perspectiveCamera = new THREE.PerspectiveCamera(74,width / height,0.01,1000);
        this.perspectiveCamera.rotation.reorder('YXZ');
        this.perspectiveCamera.updateProjectionMatrix();
        this.perspectiveCamera.position.set(0,0,0);
        // 创建一个3D对象
        this.object = new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),new THREE.MeshBasicMaterial({
            color:0xff0000,
            side:THREE.DoubleSide,
        }));
        this.object.scale.set(scale,scale,scale);
        this.object.position.set(x,y,z);
        this.object.visible = false;
        this.object.name = 'object';
        this.perspectiveCamera.lookAt(this.object.position);

        // 
        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AmbientLight(0x808080,1.2));
        this.scene.add(new THREE.HemisphereLight(0xf0f0f0,1));
        this.scene.add(this.object);

           // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
        this.renderer.setSize(width,height);
        this.renderer.setClearColor(0x000000,0);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setAnimationLoop(this.animate.bind(this));

        container.appendChild(this.renderer.domElement);

        //this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

    }
    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
       
    }

    updateCameraPose(pose){
        this.applyPose(pose,this.perspectiveCamera.quaternion,this.perspectiveCamera.position);
        this.object.visible = true;
    }
    lostCamera(){
        this.object.visible = false;
    }
    windowResizeFun(width,height){
        this.perspectiveCamera.aspect = width / height;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(width,height);
    }
}