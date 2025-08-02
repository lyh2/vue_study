
/**
 * 进行AR测试
 */
import * as THREE from 'three';
import { LocationBased } from "../../AR/location-based";
import { WebcamRenderer } from "../../AR/webcam-renderer";
//import { DeviceOrientationControls } from "../../AR/device-orientation-controls";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


export default class Example1{
    constructor(options={}){
        this._options = options;


    }

    _init(){
        this.scene = new THREE.Scene();
        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
        this.perspectiveCamera.position.set(10,20,20);
        this.renderer = new THREE.WebGLRenderer({
            antialias:true,
        });
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this._options.dom.appendChild(this.renderer.domElement);

        this.locationBased = new LocationBased(this.scene,this.perspectiveCamera);


        this.arRenderer = new WebcamRenderer(this.renderer);

        //this.orientationControls = new DeviceOrientationControls(this.perspectiveCamera);

        this.scene.add(new THREE.AxesHelper(1000));
        this.scene.add(new THREE.AmbientLight(0xffffff));

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);


        this._animate(0.001);
    }

    _animate(){
        //this.orientationControls.update();
        this.arRenderer.update();

        this.renderer.render(this.scene,this.perspectiveCamera);
        

        requestAnimationFrame(this._animate.bind(this));
    }

    _onWindowResizeEvent(){

    }
}