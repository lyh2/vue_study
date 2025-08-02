import { OrbitControls } from 'three/examples/jsm/Addons.js';
import * as THREE from 'three';
class BasePerspectiveCamera{
    constructor(_options={}){
        this._options=_options;
        this._initScene();
        this._initCamera();
        this._init(); // 可以没有定义

        this._initRenderer();

        this._initControls();
        this._initHelper();
        this._initClock();

    }

    _initCamera(){
        this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
        this._perspectiveCamera.position.set(0,100,100);
    }
    _initScene(){
        this._scene = new THREE.Scene();

    }

    _initRenderer(){
        this._renderer = new THREE.WebGPURenderer({antialias:true});
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._renderer.setAnimationLoop(this._animate.bind(this));
        this._options.dom.appendChild(this._renderer.domElement);
    }
    _initClock(){
        this._clock = new THREE.Clock();
    }
    _initControls(){
        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
    }
    _initHelper(){
        const axesHelper = new THREE.AxesHelper(1000);
        this._scene.add(axesHelper);

    }
    _animate(){
        this._renderer.render(this._scene,this._perspectiveCamera);
        this._orbitControls.update();
        this._childAnimate();
    }
    _windowResizeFun(){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

/**
 * 正交相机基类
 */
class BaseOrthographicCamera{
    constructor(_options={}){
        this._options = _options;

        this._initScene();
        this._init();
    }

    _initScene(){

    }
}

export {BasePerspectiveCamera,BaseOrthographicCamera} ;