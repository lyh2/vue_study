import * as THREE from 'three';

import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

import { initUseEarcut ,initUsePMREMGenerator,initUsePath,initUseBones,animateBones,initUseLine, initUseAnimationCreator} from './Fun/UtilsFun';

export default class Example0{
    constructor(_options={}){
        this._options = _options;

    }

    _init(params={}){
        console.log(params);
        // 创建场景
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0xffffff);
        this._perspectiveCamera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.01,100);
        this._perspectiveCamera.position.set(0,30,30);

        this._renderer = new THREE.WebGLRenderer({
            antialias:true,
            logarithmicDepthBuffer:true
        });
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._renderer.setPixelRatio(window.devicePixelRatio);

        this._options.dom.appendChild(this._renderer.domElement);

        this._clock = new THREE.Clock();
        // 添加控制
        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

        // 添加坐标轴
        this._scene.add(new THREE.AxesHelper(100));

        initUseEarcut({scene:this._scene,position:[1,2,0]});

        initUsePMREMGenerator({scene:this._scene,position:[-2,0,0],renderer:this._renderer});

        initUsePath({scene:this._scene});

        initUseBones({scene:this._scene});// 创建骨骼

        initUseLine({scene:this._scene});

        initUseAnimationCreator({scene:this._scene});

        this._animate(0.01);

    }

    _animate(){
        requestAnimationFrame(this._animate.bind(this));

        animateBones(this._clock.getElapsedTime());
        this._renderer.render(this._scene,this._perspectiveCamera);

    }

    _initExample(){
        //console.log('到来了')
    }

    _onWindowResizeEvent(){
        //console.log(params);
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}