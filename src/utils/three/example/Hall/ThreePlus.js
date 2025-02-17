/**
 * 对three.js 进行封装
 * 
 */
import * as THREE from "three";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { DotScreenPass } from "three/examples/jsm/postprocessing/DotScreenPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {SSRPass} from "three/examples/jsm/postprocessing/SSRPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import {GammaCorrectionShader} from "three/examples/jsm/shaders/GammaCorrectionShader";
import { ReflectorForSSRPass } from "three/examples/jsm/objects/ReflectorForSSRPass.js";
import MirrorPlane from "./MirrorPlane";
import { Clouds } from "./Clouds";
import Ocean from "./Ocean";
import VideoPlane from "./VideoPlane";
import LightCircle from "./LightCircle";
import CanvasPlane from "./CanvasPlane";
import TextVideo from "./TextVideo";
import FireSprite from "./FireSprite";
import SpriteCanvas from "./SpriteCanvas";


export default class ThreePlus{
    constructor(selector){
        this.mixers =[];
        this.actions = [];
        this.textVideoArrays =[];
        this.clock = new THREE.Clock();
        this.domElement = selector;
        this.width = this.domElement.clientWidth;
        this.height = this.domElement.clientHeight;
        this.updateMeshArr =[];

        this.init();
    }

    init(){
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initControls();
        //this.controlsCamera();
        this.initEffect();
        this.render();
        this.addAxes();

    }

    initScene(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xcccccc);
    }

    initCamera(){
        this.camera = new THREE.PerspectiveCamera(45,this.width / this.height,0.0001,10000);
        this.camera.position.set(0,10.5,12);

    }

    initRenderer(){
        this.renderer = new THREE.WebGLRenderer({
            logarithmicDepthBuffer:true,
            antialiase:true,
        });
        this.renderer.setSize(this.width,this.height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 2;
        this.renderer.sortObjects = true;
        this.domElement.appendChild(this.renderer.domElement);

    }

    initControls(){
        this.controls = new OrbitControls(this.camera,this.renderer.domElement);
    }

    render(){
        let deltaTime = this.clock.getDelta();
        // 更新mixers
        for(let i =0; i < this.mixers.length;i++){
            this.mixers[i].update(deltaTime * 0.2);
        }
        // 更新控制器
        this.controls && this.controls.update();
        this.renderer.render(this.scene,this.camera);
        if(this.physics){
            // 开启物理引擎
            this.physics.update(deltaTime);
        }

        if(this.textVideoArrays.length > 0){
            // 视频纹理
            for(let i =0; i < this.textVideoArrays.length;i++){
                this.textVideoArrays[i].update(deltaTime);
            }
        }
        // 更新mesh 对象
        if(this.updateMeshArr.length > 0){
            for(let i =0; i < this.updateMeshArr.length;i++){
                this.updateMeshArr[i].update(deltaTime);
            }
        }

        this.effectComposer.render();// 效果合成
        requestAnimationFrame(this.render.bind(this));
    }

    /**
     * gltf 模型加载
     * @param {*} url 
     */
    gltfLoader(url){
        const gltfLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("./draco/gltf/");
        dracoLoader.setDecoderConfig({type:"js"});// 设置加载类型
        dracoLoader.preload();
        gltfLoader.setDRACOLoader(dracoLoader);

        return new Promise((resolve,reject)=>{
            gltfLoader.load(url,gltf=>{
                resolve(gltf);
            });
        });
    }

    /**
     * 加载fbx模型
     * @param {*} url 
     */
    fbxLoader(url){
        const fbxLoader = new FBXLoader();
        return new Promise((resolve,reject)=>{
            fbxLoader.load(url,fbx=>{
                resolve(fbx);
            });
        });
    }

    /**
     * 加载hdr
     * @param {*} url 
     */
    hdrLoader(url){
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
    setBackground(url){
        this.hdrLoader(url).then((texture)=>{
            // 设置纹理的属性
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.anisotropy = 16;// 设置各异向性
            texture.format = THREE.RGBAFormat;
            this.scene.background = texture;
            this.scene.environment = texture;

        });
    }
    /**
     * 使用jpg 作为背景
     * @param {*} url 
     */
    setBackgroundUseJpg(url){
        let texture = new THREE.TextureLoader().load(url);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.anisotropy = 16;
        texture.format= THREE.RGBAFormat;
        this.scene.background = texture;
        this.scene.environment = texture;

    }
    /**
     * 设置灯光
     */
    setLight(){
        // 添加环境光
        this.ambientLight = new THREE.AmbientLight(0xffffff,1.);
        this.scene.add(this.ambientLight);

        // 平行光
        const directionalLight_1 = new THREE.DirectionalLight(0xffddcc,1.);
        directionalLight_1.position.set(0,10,10);
        directionalLight_1.castShadow = true; // 开启阴影
        directionalLight_1.shadow.mapSize.width = 10240;
        directionalLight_1.shadow.mapSize.height = 10240;


        const directionalLight_2 = new THREE.DirectionalLight(0xfffede,1.);
        directionalLight_2.position.set(0,10,-10);
        directionalLight_2.castShadow = true;
        directionalLight_2.shadow.mapSize.width = 10240;
        directionalLight_2.shadow.mapSize.height = 10240;


        const directionalLight_3 = new THREE.DirectionalLight(0xffccce,1.);
        directionalLight_3.position.set(10,10,10);
        directionalLight_3.castShadow = true;
        directionalLight_3.shadow.mapSize.width = 10240;
        directionalLight_3.shadow.mapSize.height = 10240;

        this.scene.add(directionalLight_1,directionalLight_2,directionalLight_3);

    }

    /**
     * 后期效果合成
     */
    initEffect(){
        // 合成效果
        this.effectComposer = new EffectComposer(this.renderer);
        this.effectComposer.setSize(window.innerWidth,window.innerHeight);

        // 添加渲染通道
        const renderPass = new RenderPass(this.scene,this.camera);
        this.effectComposer.addPass(renderPass);

        // 点效果
        const dotScreenPass = new DotScreenPass();
        dotScreenPass.enabled = false;
        //this.effectComposer.addPass(dotScreenPass);

        // 抗锯齿
        const sammPass = new SMAAPass();
        //this.effectComposer.addPass(sammPass);

        // 发光效果
        const unrealBloomPass = new UnrealBloomPass();
        this.effectComposer.addPass(unrealBloomPass);

        // 添加反射平面
        //this.addReflectorPlane();


        //SSR 屏幕反射
        const ssrPass = new SSRPass({
            renderer:this.renderer,
            scene:this.scene,
            camera:this.camera,
            width:this.width,
            height:this.height,
            groundReflector:this.groundReflector ? this.groundReflector : null,
            selects:this.groundReflector ? this.reflectorSelects : null,
            distanceAttenuation:true,
        });

        //this.effectComposer.addPass(ssrPass);

        //this.effectComposer.addPass(new ShaderPass(GammaCorrectionShader));
    }
    /**
     * 添加反射平面
     * @param {*} size 
     */
    addReflectorPlane(size= new THREE.Vector2(100,100)){
        let geometry = new THREE.PlaneGeometry(size.x,size.y);
        this.groundReflector = new ReflectorForSSRPass(geometry,{
            clipBias:0.0003,
            textureWidth:this.width,
            textureHeight:this.height,
            color:0x888888,
            useDepthTexture:true,
            distanceAttenuation:true,
        });// 创建的是一个Mesh 网格对象
        this.groundReflector.maxDistance = 1000000;

        this.groundReflector.material.depthWrite = false;// 关闭深度写入
        this.groundReflector.rotation.x = -Math.PI / 2;
        this.groundReflector.visible = false;//-------------------------------
        this.scene.add(this.groundReflector);
    }

    /**
     * 添加镜面平面
     * @param {*} size 
     */
    addMirrorPlane(size = new THREE.Vector2(100,100)){
        let mirroePlane = new MirrorPlane(size);
        this.scene.add(mirroePlane);
    }
    /**
     * 添加云效果
     */
    addClouds(){
        let clouds = new Clouds();
        this.scene.add(clouds.group);

    }

    addCloudsPlus(){
        let clouds = new CloudsPlus();
        this.scene.add(clouds.group);

    }
    /**
     * 添加海水
     */
    addOcean(){
        let ocean = new Ocean();
        this.scene.add(ocean.mesh);
    }

    // 添加辅助
    addAxes(){
        this.scene.add(new THREE.AxesHelper(20));
    }

    addPhysics(planeGroup){
        this.physics = new Physics(planeGroup,this.camera,this.scene);
        return this.physics;
    }

    addVideoPlane(url,size,position){
        let videoPlane = new VideoPlane(url,size,position);
        this.scene.add(videoPlane.mesh);
        return videoPlane;
    }

    addLightCircle(position,scale){
        let lightCircle = new LightCircle(this.scene,position,scale);
        return lightCircle;
    }

    addCanvasPlane(text,position,euler){
        let canvasPlane = new CanvasPlane(this.scene,text,position,euler);
        return canvasPlane;
    }

    addTextVideo(url,position,euler){
        let textVideo = new TextVideo(this.scene,url,position,euler);
        this.textVideoArrays.push(textVideo);
        return textVideo;
    }

    addFireSprite(position,scale){
        let fireSprite = new FireSprite(this.camera,position,scale);
        this.scene.add(fireSprite.mesh);
        this.updateMeshArr.push(fireSprite);

        return fireSprite;
    }

    makeMirror(mesh){
        return MirrorMesh(mesh);
    }

    controlsCamera(){
        this.isKeyDown = false;
        this.domElement.addEventListener("mousedown",e=>{
            this.isKeyDown = true;
        });

        this.domElement.addEventListener("mouseup",e=>{
            this.isKeyDown = false;
        });

        this.domElement.addEventListener("mouseout",e=>{
            this.isKeyDown = false;
        });

        this.domElement.addEventListener("mousemove",e=>{
            if(this.isKeyDown){
                this.camera.rotation.y -= e.movementX * 0.002;
                this.camera.rotation.x -= e.movementY * 0.002;
                this.camera.rotation.x = 0;
                this.camera.rotation.order = "YXZ";

                this.camera.updateMatrix();
                this.camera.matrixWorld = this.camera.matrix;
                this.camera.updateWorldMatrix();
                this.camera.matrix = new THREE.Matrix4();
                this.camera.up.set(0,1,0);
                this.camera.updateProjectionMatrix();

            }
        });
    }

    initRaycaster(){
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.domElement.addEventListener("click",e=>{
            this.pointerEvent(e);
        });
    }

    pointerEvent(e){
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (e.clientY / (1080 * ( window.innerWidth / 1920))) * 2 + 1;
        return this.mouse;
    }

    onRaycaster(meshArr,fn){
        this.raycaster.setFromCamera(this.mouse,this.camera);
        let intersects = this.raycaster.intersectObjects(meshArr);
        if(intersects.length > 0){
            fn(intersects);
        }
    }

    mouseRay(meshArr,fn,clickFn){
        this.initRaycaster();

        // 创建一个平面
        let texture = new THREE.TextureLoader().load("./texture/effect/kj.png");
        const geometry = new THREE.SphereGeometry(0.2,32,32);
        const material = new THREE.MeshBasicMaterial({
            color:0xff3333,
            side:THREE.DoubleSide,
            transparent:true,
            opacity:0.5,
        });
        const plane = new THREE.Mesh(geometry,material);
        this.scene.add(plane);
        this.domElement.addEventListener("mousemove",e=>{
            this.pointerEvent(e);
            plane.visible = false;

            this.onRaycaster(meshArr,(intersects)=>{
                plane.visible = true;

                fn(intersects);
                plane.position.copy(intersects[0].point);
                plane.rotation.setFromVector3(intersects[0].face.normal);
            });
        });
    }

    clickRay(meshArr,clickFn){
        this.initRaycaster();

        this.domElement.addEventListener("click",e=>{
            this.pointerEvent(e);

            this.onRaycaster(meshArr,(intersects)=>{
                clickFn(intersects);

                this.camera.position.x = intersects[0].point.x;
                this.camera.position.y = intersects[0].point.y;
                this.camera.position.z = intersects[0].point.z;

            });
        });
    }

    addSpriteText(text,position){
        let spriteText = new SpriteCanvas(this.camera,text,position);
        this.scene.add(spriteText.mesh);
        return spriteText;
    }











}