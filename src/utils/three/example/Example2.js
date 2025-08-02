/**
 * 第一章
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {GUI} from 'three/examples/jsm/libs/lil-gui.module.min';

import * as TWEEN from 'three/examples/jsm/libs/tween.module';
//import { initBufferGeometry,initUseCombinationBoundingBox,initUseEdges,initUseGeometryCenter,initUseMikkTSpaceTangents,initUseMoreMaterial,
//     initUseTexture, initUseUV ,initUseIridescence, initUseLambertAndPhong,initUseStanderMaterial} from './Fun/UtilsFun';
import{    initUseStanderMaterial} from './Fun/UtilsFun';

export default class Example2 {
    constructor(_options={}){
        this._options = _options;

    }

    _init(){
        // 创建场景
        this._scene = new THREE.Scene();
        // 创建相机
        this._perspectiveCamera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.1,100);
        this._perspectiveCamera.position.set(0,20,20);

        // 创建渲染器
        this._renderer = new THREE.WebGLRenderer({
            antialias:true,
            logarithmicDepthBuffer:true,
        });
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._options.dom.appendChild(this._renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff,1);
        this._scene.add(ambientLight);

        // 添加世界坐标
        const axesHelper = new THREE.AxesHelper(100);
        this._scene.add(axesHelper);

        // 添加轨道控制器
        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
        // 设置带阻尼的惯性
        this._orbitControls.enableDamping = true;
        this._orbitControls.dumpingFactor = 0.05;
        // 设置旋转速度
        this._orbitControls.autoRotate = true;
        this._orbitControls.autoRotateSpeed = 0.2;

        // 创建球体
        const sphere1 = new THREE.Mesh(new THREE.SphereGeometry(1,32,32),new THREE.MeshBasicMaterial({
            color:0x00ff00
        }));
        sphere1.position.x = -10;
        this._scene.add(sphere1);

        const tween = new TWEEN.Tween(sphere1.position);
        tween.to({x:10,y:3,z:-10},4);
        tween.onUpdate((e)=>{
            console.log('onUpdate:',e);
        }).onComplete(res=>{
            console.log('动画执行完毕:',res);
        }).easing(TWEEN.Easing.Quadratic.InOut);
        //tween.repeat(Infinity); // 设置无限次重复
        tween.yoyo(true);
        tween.repeat(2);
        tween.delay(3000);
        // 创建第二个补间动画
        let tween2 = new TWEEN.Tween(sphere1.position);
        tween2.to({x:-10,y:0,z:0},2000);

        tween.chain(tween2);
        tween2.chain(tween);

        tween.start();

        let paramsGui = {
            stop:()=>{
                tween.stop();
            },
            fullScreen:function(){
                document.body.requestFullscreen();
            },
            exitFullScreen:()=>{
                document.exitFullscreen();
            }
        };

        const gui = new GUI();
        gui.add(paramsGui,'stop');
        gui.add(paramsGui,'fullScreen').name('全屏');
        gui.add(paramsGui,'exitFullScreen').name('退出全屏');

        //initBufferGeometry({scene:this._scene});
        
       // initUseMoreMaterial({scene:this._scene});

        //initUseTexture({scene:this._scene,gui:gui,camera:this._perspectiveCamera});

        //initUseUV({scene:this._scene});

        //initUseGeometryCenter({scene:this._scene});

        //initUseCombinationBoundingBox({scene:this._scene});

        //initUseEdges({scene:this._scene});

        //initUseMikkTSpaceTangents({scene:this._scene,renderer:this._renderer});
        
        //initUseIridescence({renderer:this._renderer,scene:this._scene,gui:gui});

        //initUseLambertAndPhong({scene:this._scene,renderer:this._renderer});
        
        initUseStanderMaterial({scene:this._scene,renderer:this._renderer,gui:gui});



        this._animate(0.01);
    }

    _animate(){
        requestAnimationFrame(this._animate.bind(this));

        this._renderer.render(this._scene,this._perspectiveCamera);


        TWEEN.update();
    }


    _onWindowResizeEvent(){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth , window.innerHeight);
    }


}