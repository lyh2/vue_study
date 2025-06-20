/**
 * 打造3D元宇宙
 * 
 */
import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader";
import {RGBELoader} from "three/examples/jsm/loaders/RGBELoader";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer"
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {DotScreenPass} from "three/examples/jsm/postprocessing/DotScreenPass";
import {SMAAPass} from "three/examples/jsm/postprocessing/SMAAPass";
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { Clouds, CloudsPlus } from "./Clouds";
import Ocean from "./Ocean";
import Physics from "./Physics";
import VideoPlane from "./VideoPlane";
import LightCircle from "./LightCircle";
import CanvasPlane from "./CanvasPlane";
import TextVideo from "./TextVideo";
import FireSprite from "./FireSprite";


export default class ThreePlus{
    constructor(_options={}){
        this._mixers =[];
        this._actions =[];
        this._textVideoArrays =[];
        this._clock = new THREE.Clock();
        this._options = _options;
        this._width = window.innerWidth;
        this._height = window.innerHeight;
        this._updateMeshArr =[];

        this._init();
    }
    /**
     * 初始化函数
     */
    _init(){
        this._initScene();
        this._initCamera();
        this._initRenderer();
        this._initControls();
        this._initEffect();
        this._render();
        this._addAxis();

    }

    _initScene(){
        this._scene = new THREE.Scene();

    }

    _initCamera(){
        this._perspectiveCamera = new THREE.PerspectiveCamera(45,this._width / this._height,0.1,1000);
        this._perspectiveCamera.position.set(0,10,15);
        this._perspectiveCamera.aspect = this._width / this._height;
        this._perspectiveCamera.updateProjectionMatrix();
    }

    _initRenderer(){
        this._renderer = new THREE.WebGLRenderer({
            logarithmicDepthBuffer:true,
            antialias:true,
        });
        this._renderer.setSize(this._width,this._height);
        this._renderer.shadowMap.enabled = true;
        this._renderer.outputColorSpace = THREE.SRGBColorSpace;
        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 0.75;
        this._renderer.sortObjects = true;// 开启排序
        this._options.dom.appendChild(this._renderer.domElement);
    }

    _initControls(){
        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

    }

    _render(){
        let deltaTime = this._clock.getDelta();
        for(let i =0;i < this._mixers.length;i++){
            this._mixers[i].update(deltaTime * 0.2);
        }

        this._orbitControls && this._orbitControls.update();
        this._renderer.render(this._scene,this._perspectiveCamera);
        if(this._physics){
            this._physics.update(deltaTime);
        }

        if(this._textVideoArrays.length > 0){
            for(let i =0;i < this._textVideoArrays.length;i++){
                this._textVideoArrays[i].update(deltaTime);
            }
        }

        if(this._updateMeshArr.length > 0){
            for(let i =0;i < this._updateMeshArr.length;i++){
                this._updateMeshArr[i].update(deltaTime);
            }
        }

        //this._effectComposer.render();
        requestAnimationFrame(this._render.bind(this));
    }
    /**
     * 加载gltf模型
     * @param {*} url 
     */
    gltfLoader(url){
        const gltfLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("./draco/gltf/");
        dracoLoader.setDecoderConfig({type:"js"});
        dracoLoader.preload();
        gltfLoader.setDRACOLoader(dracoLoader);

        return new Promise((resolve,reject)=>{
            gltfLoader.load(url,gltf=>{
                resolve({type:'model',value:gltf});
            });
        });
    }
    /**
     * 加载fbx 模型
     * @param {*} url 
     */
    fbxLoader(url=""){
        const fbxLoader = new FBXLoader();
        return new Promise((resolve,reject)=>{
            fbxLoader.load(url,(fbx)=>{
                resolve(fbx);
            })
        });
    }

    hdrLoader(url=""){
        const hdrLoader = new RGBELoader();
        return new Promise((resolve,reject)=>{
            hdrLoader.load(url,hdr=>{
                resolve(hdr);
            });
        });
    }
    /**
     * 设置背景
     * @param {*} url 
     */
    setBg(url=""){
        this.hdrLoader(url).then(texture=>{
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.anisotropy = 16;
            texture.format = THREE.RGBAFormat;
            this._scene.background = texture;
            this._scene.environment = texture;
        })
    }

    setLight(){
        const ambientLight = new THREE.AmbientLight(0xffddcd,0.2);
        this._scene.add(ambientLight);

        const light_1_ = new THREE.DirectionalLight(0xdc1fdc,0.1);
        light_1_.position.set(0,10,10);

        const light_2_ = new THREE.DirectionalLight(0xff00ff,0.2);
        light_2_.position.set(0,10,-10);

        const light_3_ = new THREE.DirectionalLight(0x000fff,0.5);
        light_3_.position.set(10,10,10);

        light_1_.castShadow = true;
        light_2_.castShadow = true;
        light_3_.castShadow = true;

        light_1_.shadow.mapSize.width= 10240;
        light_1_.shadow.mapSize.height= 10240;

        light_2_.shadow.mapSize.width= 10240;
        light_2_.shadow.mapSize.height= 10240;

        light_3_.shadow.mapSize.width= 10240;
        light_3_.shadow.mapSize.height= 10240;

        this._scene.add(light_1_,light_2_,light_3_);
    }

    /**
     * 把所有的效果都运行一下
     */
    _initEffect(){
        // 合成效果
        this._effectComposer = new EffectComposer(this._renderer);
        this._effectComposer.setSize(this._width,this._height);

        // 添加渲染通道
        const renderPass = new RenderPass(this._scene,this._perspectiveCamera);
        this._effectComposer.addPass(renderPass);

        // 点效果
        const dotScreenPass = new DotScreenPass();
        dotScreenPass.enabled = false;
        this._effectComposer.addPass(dotScreenPass);

        // 抗锯齿
        const smaaPass = new SMAAPass();
        this._effectComposer.addPass(smaaPass);

        // 发光效果
        const unrealBloomPass = new UnrealBloomPass();
        this._effectComposer.addPass(unrealBloomPass);

    }

    /**
     * 添加云雾效果
     */
    addClouds(){
        let clouds = new Clouds();
        this._scene.add(clouds._group);
    }

    addCloudsPlus(){
        let clouds  = new CloudsPlus();
        this._scene.add(clouds._group);
    }

    addOcean(){
        let ocean = new Ocean();
        this._scene.add(ocean.mesh);
    }
    /**
     * 添加辅助坐标轴
     */
    _addAxis(){
        let axis = new THREE.AxesHelper(20);
        this._scene.add(axis);
    }
    /**
     * 添加物理效果
     * @param {} planeGroup 
     */
    addPhysics(planeGroup){
        this.physics = new Physics(planeGroup,this._perspectiveCamera,this._scene);
        return this.physics;
    }
    /**
     * 添加视频平面
     * @param {*} url 
     * @param {*} size 
     * @param {*} position 
     */
    addVideoPlane(url,size,position){
        let videoPlane = new VideoPlane(url,size,position);
        this._scene.add(videoPlane.mesh);
        return videoPlane;
    }
    /**
     * 
     * @param {*} position 
     * @param {*} scale 
     */
    addLightCircle(position,scale){
        let lightCircle = new LightCircle(this._scene,position,scale);
        return lightCircle;
    }
    /**
     * 添加文字
     * @param {*} text 
     * @param {*} position 
     * @param {*} euler 
     */
    addCanvasPlane(text,position,euler){
        let canvasPlane = new CanvasPlane(this._scene,text,position,euler);
        return canvasPlane;
    }

    addTextVideo(url,position,euler){
        let textVideo = new TextVideo(this._scene,url,position,euler);
        this._textVideoArrays.push(textVideo);
        return textVideo;
    }

    addFireSprite(position,scale){
        let fireSprite = new FireSprite(this._perspectiveCamera,position,scale);
        this._scene.add(fireSprite.mesh);
        this._updateMeshArr.push(fireSprite);
        return fireSprite;
    }


}