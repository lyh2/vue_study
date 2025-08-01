/**
 * 灯光模块
 */

import * as THREE from 'three';

//import { texture, equirectUV } from "three/nodes";

//import WebGPU from "three/addons/capabilities/WebGPU.js";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
//import { initPoints, initUseCannon, initUseCanvas, initUsePoint, initUsePoints, initUseShader, initUseSphereDelUv, initUseStencil, initUseStencilTest ,initUseWater, initUseWaterInYuGuang} from './Fun/LightsFun';
import { initUseFireEffect, initUseParticle} from './Fun/LightsFun';
// 
//import * as CANNON from "cannon-es";
import TWEEN from "three/examples/jsm/libs/tween.module";

//import Stats from "three/examples/jsm/libs/stats.module";

export default class Example3 {
    constructor(options = {}) {
        this._options = options;


    }

    /**
     * 
     * @param {*} params 
     */
    _init() {
        // 创建场景
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0xf2f2f2);
        this._perspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this._perspectiveCamera.position.set(0, 20, 20);

        this._renderer = new THREE.WebGLRenderer({
            antialias: true,
            stencil: true,// 开启模版测试
            logarithmicDepthBuffer: true
        });
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._options.dom.appendChild(this._renderer.domElement);
        // 开启阴影
        this._renderer.shadowMap.enabled = true;
        this._clock = new THREE.Clock();

        this._orbitControls = new OrbitControls(this._perspectiveCamera, this._renderer.domElement);

        const axesHelper = new THREE.AxesHelper(100);
        this._scene.add(axesHelper);
        // 添加环境光
        let ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this._scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffddcc,1.2);
        directionalLight.castShadow = true;
        this._scene.add(directionalLight);
        this._renderer.shadowMap.enabled = true;


        //initUseCanvas({scene:this._scene,renderer:this._renderer});

        //initUsePoint({scene:this._scene,renderer:this._renderer});

        //initUseSphereDelUv({scene:this._scene,renderer:this._renderer});

        //initUsePoints({scene:this._scene,renderer:this._renderer});

        //initUseStencil({scene:this._scene,renderer:this._renderer,camera:this._perspectiveCamera});

        //initUseStencilTest({ scene: this._scene, renderer: this._renderer });

        //initPoints({scene:this._scene,renderer:this._renderer});

        //this._cannon = initUseCannon({scene:this._scene,renderer:this._renderer,dom:this._renderer.domElement});

        //initUseShader({scene:this._scene,renderer:this._renderer});
        //this._floor = this._scene.getObjectByName("floor");

        //initUseWater({scene:this._scene});

        //initUseWaterInYuGuang({scene:this._scene,clock:this._clock});
        this._shaderMaterial = initUseFireEffect({scene:this._scene});
        //console.log(this._shaderMaterial)

        initUseParticle({scene:this._scene});





        this._animate(0.01);
    }

  

    _animate() {
        requestAnimationFrame(this._animate.bind(this));
        let deltaTime = this._clock.getDelta();
        if(this._cannon){
            this._cannon.world.step(1/120,deltaTime);

            this._cannon.cubeArr.forEach(item=>{
                item.mesh.position.copy(item.body.position);
                item.mesh.quaternion.copy(item.body.quaternion);
            })
        }

        // 修改floor 的时间uTime
        if(this._floor){
            this._floor.material.uniforms.uTime.value = deltaTime;
        }

        if(this._shaderMaterial){
            
            this._shaderMaterial.uniforms.uTime.value += this._clock.getDelta();
        }

        TWEEN.update();
        this._renderer.render(this._scene, this._perspectiveCamera);

    }
    _animateWebGPU(){
        //this._delta = this._clock.getDelta;
        this._orbitControls ?  this._orbitControls.update() :'';
        this._renderer.render(this._scene,this._perspectiveCamera);
    }
    _onWindowResizeEvent() {
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth, window.innerHeight);
    }
}