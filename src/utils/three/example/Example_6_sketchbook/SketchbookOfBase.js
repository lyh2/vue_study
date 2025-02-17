/**
 * 主入口
 */
import * as THREE from "three";
import * as CANNON from "cannon-es";
import Swal from "sweetalert2";
import * as _ from "lodash";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import {FXAAShader} from "three/examples/jsm/shaders/FXAAShader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import {Stats} from "three/examples/jsm/libs/stats.module.js";
import * as GUI from "three/examples/jsm/libs/lil-gui.module.min";
import { InputManager } from "./core/InputManager";

export default class SketchbookOfBase{
    
    constructor(_options={}){
        this.renderer = null;
        this.perspectiveCamera = null;
        this.composer= null;
        this.stats = null;
        this.graphicsWorld = null;
        this.sky = null;
        this.physicsWorld = null;
        this.parallelPairs = null;
        this.physicsFrameRate=null;
        this.physicsFrameTime = null;
        this.physicsMaxPrediction =null;
        this.clock = new THREE.Clock();
        this.renderDelta=0;
        this.logicDelta= 0;
        this.requestDelta= 0;
        this.sinceLastFrame=0;
        this.justRendered = false;
        this.params = null;
        this.inputManager = null;
        this.cameraOperator=null;
        this.timeScaleTarget = 1;
        this.console=null;
        this.cannonDebugRenderer=null;
        this.scenarios = [];//
        this.characters = [] ;
        this.vehicles=[];
        this.paths=[];
        this.scenarioGUIFolder = null;
        this.updatables = [];

        this.lastScenarioID = "";
        this.fxaaPass = null;

        this.init();
    }

    init(){
        this.renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 创建场景
        this.graphicsWorld = new THREE.Scene();
        this.perspectiveCamera = new THREE.PerspectiveCamera(80,window.innerWidth/window.innerHeight,0.1,1000);

        // passes
        let renderPass = new RenderPass(this.graphicsWorld,this.perspectiveCamera);
        this.fxaaPass = new ShaderPass(FXAAShader);

        // fxaa
        let pixelRatio = this.renderer.getPixelRatio();
        this.fxaaPass.material['uniforms'].resolution.value.x = 1 / (window.innerWidth * pixelRatio);
        this.fxaaPass.material['uniforms'].resolution.value.y = 1 / (window.innerHeight * pixelRatio);

        // composer
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderPass);
        this.composer.addPass(this.fxaaPass);

        // 创建物理世界
        this.physicsWorld = new CANNON.World();
        this.physicsWorld.gravity.set(0,-9.82,0);
        this.physicsWorld.broadphase = new CANNON.SAPBroadphase(this.physicsWorld);// 粗检测碰撞方法
        this.physicsWorld.solver.iterations = 10;
        this.physicsWorld.allowSleep = true;


        this.parallelPairs =[];
        this.physicsFrameRate = 60;
        this.physicsFrameTime = 1 / this.physicsFrameRate;
        this.physicsMaxPrediction = this.physicsFrameRate;

        this.clock  = new THREE.Clock();
        this.renderDelta = 0;
        this.logicDelta = 0;
        this.sinceLastFrame = 0;
        this.justRendered = false;

        this.stats = new Stats();
        // 创建右边的GUI面板
        this.createParamsGUI();
        // 初始化
        this.inputManager = new InputManager(this,this.renderer.domElement);
        this.cameraOperator = new CameraOperator(this,this.perspectiveCamera,this.params.Mouse_Sensitivity);





    }

    createParamsGUI(){
        this.params = {
            Pointer_Lock:true,
            Mouse_Sensitivity:0.3,
            Time_Scale:1,
            Shadows:true,
            FXAA:true,
            Debug_Physics:false,
            Debug_FPS:false,
            Sun_Elevation:50,
            Sun_Rotation:145,
        };

        const gui = new GUI.GUI();
        this.scenarioGUIFolder = gui.addFolder("Scenarios");
        this.scenarioGUIFolder.open();

        // world
        let worldFolder = gui.addFolder("world");
        worldFolder.add(this.params,'Time_Scale',0,1).listen().onChange(value=>{
            this.timeScaleTarget = value;
        });
        worldFolder.add(this.params,'Sun_Elevation',0,180).listen().onChange(value=>{
            this.sky.phi = value;
        });
        worldFolder.add(this.params,'Sun_Rotation',0,360).listen().onChange(value=>{
            this.sky.theta = value;
        });

        // 输入
        let settingsFolder = gui.addFolder("Settings");
        settingsFolder.add(this.params,'FXAA');
        settingsFolder.add(this.params,'Shadows').onChange(enabled=>{
            if(enabled){
                this.sky.csm.lights.forEach(light=>{
                    light.castShadow = true;
                });
            }else{
                this.sky.csm.lights.forEach(light=>{
                    light.castShadow = false;
                });
            }
        });

        settingsFolder.add(this.params,'Pointer_Lock').onChange(enabled=>{
            this.inputManager.setPointerLock(enabled);
        });
        settingsFolder.add(this.params,'Mouse_sensitivity',0,1).onChange(value=>{
            this.cameraOperator.setSensitivity(value,value * 0.8);
        });
        settingsFolder.add(this.params,'Debug_Physics').onChange(enabled=>{
            if(enabled){
                this.cannonDebugRenderer = new CannonDebugRenderer(this.graphicsWorld,this.physicsWorld);
            }else{
                this.cannonDebugRenderer.clearMeshes();
                this.cannonDebugRenderer = null;
            }

            this.characters.forEach(char=>{
                char.raycastBox.visible = enabled;
            });
        });

        settingsFolder.add(this.params,'Debug_FPS').onChange(enabled=>{
            UIManager.setFPSVisible(enabled);
        });

        gui.open();
    }

    registerUpdatable(register){
        this.updatables.push(register);
        this.updatables.sort((a,b)=>(a.updateOrder > b.updateOrder) ? 1 : -1);
    }

    _windowResizeFun(options={}){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.fxaaPass.uniforms['resolution'].value.set(1 / (window.innerWidth * this.renderer.getPixelRatio()),1/ (window.innerHeight * this.renderer.getPixelRatio()));
        this.composer.setSize(window.innerWidth * this.renderer.getPixelRatio(), window.innerHeight * this.renderer.getPixelRatio());
    }
}