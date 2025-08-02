/**
 * state状态驱动
 */

import * as YUKA from 'yuka';
import * as THREE from 'three';
import { GLTFLoader, OrbitControls ,DRACOLoader} from 'three/examples/jsm/Addons.js';
const actionEnum ={
    idle:'IDLE',
    walk:'WALK',
    tpose:'TPOSE'
};
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { showDialog } from 'vant';
import Deck from '../blackjack/Deck';
import Player from '../blackjack/Player';
import AI from '../blackjack/AI.js';
//import World from '../firstShooterGame/World.js';
/**
 * 有暂停状态切换行走状态
 */
class IdleState extends YUKA.State{
    constructor(other){
        super();
        this.other = other;
    }
    enter(girl){
        const idle = girl.animationsMap.get(actionEnum.idle);
        idle.reset().fadeIn(girl.crossFadeDuration);
        girl.stateMachine.handleMessage(new YUKA.Telegram(girl,girl,'进入idle',1000,{'position':{x:0,y:9,z:0}}))
    }

    execute(girl){
        if(girl.currentTime >= girl.stateDuration){
            girl.currentTime = 0;
            girl.stateMachine.changeTo(actionEnum.walk);
        }
    }
   onMessage(owner,telegram){
        console.log('idle:',owner,telegram);
    }
    exit(girl){
        const idle = girl.animationsMap.get(actionEnum.idle);
        idle.fadeOut(girl.crossFadeDuration);// 1秒钟消失
    }
}

class WalkState extends YUKA.State{
    enter(girl){
        const walk = girl.animationsMap.get(actionEnum.walk);
        walk.reset().fadeIn(girl.crossFadeDuration);
            girl.stateMachine.handleMessage(new YUKA.Telegram(girl,girl,'进入walk',1000,{'position':{x:0,y:9,z:0}}))

    }

    execute(girl){
        if(girl.currentTime >= girl.stateDuration){
            girl.currentTime = 0;
            girl.stateMachine.changeTo(actionEnum.tpose);
        }
    }
    onMessage(owner,telegram){
        console.log('walk:',owner,telegram);
    }
    exit(girl){
        const walk = girl.animationsMap.get(actionEnum.walk);
        walk.fadeOut(girl.crossFadeDuration);
    }
}

class TPoseState extends YUKA.State{
    enter(girl){
        const tpose = girl.animationsMap.get(actionEnum.tpose);
        tpose.reset().fadeIn(girl.crossFadeDuration);
    }

    execute(girl){
        if(girl.currentTime >= girl.stateDuration){
            girl.currentTime = 0;
            girl.stateMachine.changeTo(actionEnum.idle);
            // 发送消息
            girl.stateMachine.handleMessage(new YUKA.Telegram(girl,girl,'由tpose 到 idle',1000,{'position':{x:0,y:9,z:0}}))
        }
    }
   onMessage(owner,telegram){
        console.log('tpose:',owner,telegram);
    }
    exit(girl){
        const tpose = girl.animationsMap.get(actionEnum.tpose);
        tpose.fadeOut(girl.crossFadeDuration);
    }
}

class Robot extends YUKA.GameEntity{
    constructor(name,mesh){
        super();
        this.name = name;
        this.mesh = mesh;
    }
    handleMessage(telegram){
        console.log('robot 接收消息:',telegram);
    }
}
/**
 * 创建一个派生的游戏实体类：GameEntity 
 */
class Girl extends YUKA.GameEntity{
    constructor(mixer,animationsMap){
        super();

        this.mixer = mixer;
        this.animationsMap = animationsMap;

        this.stateMachine = new YUKA.StateMachine(this);// 状态机

        this.stateMachine.add('IDLE',new IdleState());
        this.stateMachine.add('WALK',new WalkState());
        this.stateMachine.add('TPOSE',new TPoseState());

        this.stateMachine.changeTo('IDLE');

        this.currentTime = 0;
        this.stateDuration = 5;
        this.crossFadeDuration = 1;// 
    }

    update(delta){
        this.currentTime += delta;
        this.stateMachine.update();
        this.mixer.update(delta);
        return this;
    }

    handleMessage(telegram){
        console.log('girl：handleMessage',telegram);
    }
}
/**
 * 状态驱动
 */
export class StateDriveAgentDesign{
    constructor(_options={}){
        this._options = _options;
        this.messageDispatcher = new YUKA.MessageDispatcher();
        this.init();
    }

    init(){
        this.loaderManager = new THREE.LoadingManager(()=>{
            
            // 等待所有的数据加载完毕之后，再开启渲染
            this.renderer.setAnimationLoop(this.animate.bind(this));
            console.log(this.girl,this.robot)
            // girl 向 robot 发送消息
            this.girl.sendMessage(this.robot,'girl 向 robot 发送消息，改变robot位置',0,{position:{x:10,y:0,z:-20}});
            this.robot.sendMessage(this.girl,'robot 向 girl 发送消息',200,{position:{x:0,y:0,z:0}});
      
        });
        this._init();
    }
    _init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);
        this.scene.fog = new THREE.Fog(0xFF6600,20,40);
        
        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.001,1000);
        this.perspectiveCamera.position.set(0,20,20);

        const geometry = new THREE.PlaneGeometry(150,150);
        const material = new THREE.MeshPhongMaterial({color:0x999999,depthWrite:false});

        this.target = new THREE.Vector3();

        const ground = new THREE.Mesh(geometry,material);
        ground.rotation.x = - Math.PI  * 0.5;
        ground.matrixAutoUpdate = false;
        ground.receiveShadow = true;
        ground.updateMatrix();
        this.scene.add(ground);
        ground.name = 'ground';

        const hemisphereLight = new THREE.HemisphereLight(0xffffff,0x444444,0.6);
        hemisphereLight.position.set(0,100,0);
        hemisphereLight.matrixAutoUpdate = false;
        hemisphereLight.updateMatrix();
        this.scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xfffccc,0.8);
        directionalLight.position.set(-4,5,-5);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.top = 2;
        directionalLight.shadow.camera.bottom = -2;
        directionalLight.shadow.camera.left = -2;
        directionalLight.shadow.camera.right = 2;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far  = 20;
        this.scene.add(directionalLight);
        //console.log(this.loaderManager)
        // 加载模型
        const gltfLoader = new GLTFLoader(this.loaderManager);
        gltfLoader.load('./yuka/yuka.glb',gltf=>{
            //console.log('加载模型:',gltf);
            const avator = gltf.scene;
            avator.animations = gltf.animations;
            avator.traverse(object=>{
                if(object.isMesh){
                    object.material.transparent = true;
                    object.material.opacity = 1;
                    object.material.alphaTest = 0.7;
                    object.material.side = THREE.DoubleSide;
                    object.castShadow = true;
                }
            });

            avator.add(this.perspectiveCamera);

            this.target.copy(avator.position);// 获取模型的位置
            this.target.y += 1;
            this.perspectiveCamera.lookAt(this.target);

            this.scene.add(avator);

            // 创建动画混合器
            this.mixer = new THREE.AnimationMixer(avator);
            const animationsMap = new Map();

            const idleAction = this.mixer.clipAction('Character_Idle');
            idleAction.play();
            idleAction.enabled = false;

            const walkAction = this.mixer.clipAction('Character_Walk');
            walkAction.play();
            walkAction.enabled = false;

            const tPoseAction = this.mixer.clipAction('Character_TPose');
            tPoseAction.play();
            tPoseAction.enabled = false;

            animationsMap.set('IDLE',idleAction);
            animationsMap.set('WALK',walkAction);
            animationsMap.set('TPOSE',tPoseAction);

            // gril 
            this.girl = new Girl(this.mixer,animationsMap);
            this.entityManager.add(this.girl);
        });
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('./draco/');
        gltfLoader.setDRACOLoader(dracoLoader);
        // 加载机器人模型
        gltfLoader.load('./yuka-model/robot.glb',gltf=>{
            //console.log('robot:',gltf);
            this.scene.add(gltf.scene);
            gltf.scene.name = 'robot';
            gltf.scene.position.set(0,0,10);
            
            this.robot = new Robot('robot');
            this.entityManager.add(this.robot);
            // this.robot.handleMessage = (telegram)=>{
            //     console.log('robot没有执行到接收到消息:',telegram)
            // }
            //this.messageDispatcher.dispatch(this.robot,this.girl,'使用MessageDispatcher发送消息',0,{});
        });
        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();
        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this._options.dom.appendChild(this.renderer.domElement);
        this.renderer.shadowMap.enabled = true;

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
    }
    animate(){
        const delta = this.yukaTime.update().getDelta();
        this.entityManager.update(delta);
      
        this.renderer.render(this.scene,this.perspectiveCamera);
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

const Enums ={
    REST:'REST',
    GATHER:'GATHER',
    FIND_NEXT:'FIND NEXT',
    SEEK:'SEEK',
    PICK_UP:'PICK UP',
    PLACEHOLDER:'-',

    WALK:'WALK',
    RIGHT_TURN:'RIGHT_TURN',
    LEFT_TURN:'LEFT_TURN',
    IDLE:'IDLE',
    inverseMatrix:new YUKA.Matrix4(),
    localPosition:new YUKA.Vector3(),
}
// Base class for representing a goal in context of Goal-driven agent design.
class ResetGoal extends YUKA.Goal{
    constructor(owner){
        super(owner);
    }
    // Executed when this goal is activated.
    activate(){
        const owner = this.owner; // 代表是girl 对象
        owner._state.currentGoal = Enums.REST;
        owner._state.currentSubgoal = Enums.PLACEHOLDER;

        const idle = owner.animationsMap.get(Enums.IDLE);
        idle.reset().fadeIn(owner.crossFadeDuration);
    }
    // Executed in each simulation step.
    execute(){
        const owner = this.owner;

        owner.currentTime += owner.deltaTime;
        if(owner.currentTime >= owner.resetDuration){
            this.status = YUKA.Goal.STATUS.COMPLETED;// 状态完成
        } 
    }
    // Executed when this goal is satisfied.
    terminate(){
        const owner = this.owner;
        owner.currentTime = 0;
        owner.fatigueLevel = 0;
    }
}
/**
 * 查找下一个目标对象
 */
class FindNextCollectibleGoal extends YUKA.Goal{
    constructor(owner){
        super(owner);
        this.animationId = null;
    }

    activate(){
        const owner = this.owner;
        owner._state.currentGoal = Enums.FIND_NEXT;

        const entities = owner.manager.entities;
        let minDistance = Infinity;

        for(let i =0, l= entities.length;i < l;i++){
            const entity = entities[i];
            if(entity !== owner){
                const squaredDistance = owner.position.squaredDistanceTo(entity.position);
                if(squaredDistance < minDistance){
                    minDistance = squaredDistance;
                    owner.currentTarget = entity;// 寻找最近那个
                }
            }
        }

        owner.worldMatrix.getInverse(Enums.inverseMatrix);
        Enums.localPosition.copy(owner.currentTarget.position).applyMatrix4(Enums.inverseMatrix);
        
        this.animationId = (Enums.localPosition.x >= 0) ? Enums.LEFT_TURN : Enums.RIGHT_TURN;

        const turn = owner.animationsMap.get(this.animationId);
        turn.reset().fadeIn(owner.crossFadeDuration);
    }

    execute(){
        const owner = this.owner;
        if(owner.currentTarget !== null){
            if(owner.rotateTo(owner.currentTarget.position,owner.deltaTime) === true){
                this.status = YUKA.Goal.STATUS.COMPLETED;
            }
        }else{
            this.status = YUKA.Goal.STATUS.FAILED;
        }
    }

    terminate(){
        const owner = this.owner;
        const turn = owner.animationsMap.get(this.animationId);
        turn.fadeOut(owner.crossFadeDuration);
    }
}

class SeekToCollectibleGoal extends YUKA.Goal{
    constructor(owner){
        super(owner);
    }

    activate(){
        const owner = this.owner;
        owner._state.currentSubgoal = Enums.SEEK;

        if(owner.currentTarget !== null){
            const arriveBehavior = owner.steering.behaviors[0];
            arriveBehavior.target = owner.currentTarget.position;
            arriveBehavior.active = true;
        }else{
            this.status = YUKA.Goal.STATUS.FAILED;
        }

        const walk = owner.animationsMap.get(Enums.WALK);
        walk.reset().fadeIn(owner.crossFadeDuration);
    }

    execute(){
        if(this.active()){
            const owner = this.owner;
            const squaredDistance = owner.position.squaredDistanceTo(owner.currentTarget.position);
            if(squaredDistance < 0.25){
                this.status = YUKA.Goal.STATUS.COMPLETED;
            }

            const animation = owner.animationsMap.get(Enums.WALK);
            animation.timeScale = Math.min(0.75,owner.getSpeed() / owner.maxSpeed);
        }
    }
    //Executed when this goal is satisfied. 目标瞒住状态时执行
    terminate(){
        const arriveBehavior = this.owner.steering.behaviors[0];
        arriveBehavior.active = false;
        this.owner.velocity.set(0,0,0);

        const owner = this.owner;
        const walk = owner.animationsMap.get(Enums.WALK);
        walk.fadeOut(owner.crossFadeDuration);
    }
}

class PickUpCollectibleGoal extends YUKA.Goal{
    constructor(owner){
        super(owner);

        this.collectibleRemoveTimeout = 3;// 多少秒之后被移除之后
    }

    activate(){
        const owner = this.owner;
        owner._state.currentSubgoal  = Enums.PICK_UP;
        const gather = owner.animationsMap.get(Enums.GATHER);
        gather.reset().fadeIn(owner.crossFadeDuration);
    }

    execute(){
        const owner = this.owner;
        owner.currentTime += owner.deltaTime;

        if(owner.currentTime >= owner.pickUpDuration){
            this.status = YUKA.Goal.STATUS.COMPLETED;
        }else if(owner.currentTime >= this.collectibleRemoveTimeout){
            if(owner.currentTarget !== null){
                owner.sendMessage(owner.currentTarget,'PickedUp');
                owner.currentTarget = null;
            }
        }
    }

    terminate(){
        const owner = this.owner;
        owner.currentTime = 0;
        owner.fatigueLevel ++;
        const gather = owner.animationsMap.get(Enums.GATHER);
        gather.fadeOut(owner.crossFadeDuration);
    }
}
// Class representing a composite goal. Essentially it's a goal which consists of subgoals.
// Goal -> CompositeGoal，收集组合状态对象
class GatherGoal extends YUKA.CompositeGoal{
    constructor(owner){
        super(owner);
    }

    activate(){
        this.clearSubgoals();
        const owner = this.owner;
        
        owner._state.currentGoal = Enums.GATHER;
        this.addSubgoal(new FindNextCollectibleGoal(owner));// 找下一个
        this.addSubgoal(new SeekToCollectibleGoal(owner));// 搜索
        this.addSubgoal(new PickUpCollectibleGoal(owner));// 拾取

        const idle = owner.animationsMap.get(Enums.IDLE);
       
        idle.fadeOut(owner.crossFadeDuration);
    }

    execute(){
        this.status = this.executeSubgoals();
        this.replanIfFailed();
    }
}


// Base class for representing a goal evaluator in context of Goal-driven agent design.
// evaluator:评估  YUKA.GoalEvaluator 目标评估器基类
class ResetEvaluator extends YUKA.GoalEvaluator{
    calculateDesirability(girl){
        return (girl.tired() === true) ? 1 : 0;
    }

    setGoal(girl){
        //console.log('girl:',girl)
        const currentSubgoal = girl.brain.currentSubgoal();
        if((currentSubgoal instanceof ResetGoal) === false){
            girl.brain.clearSubgoals();
            girl.brain.addSubgoal(new ResetGoal(girl));
        }
    }
}
// 内部使用GatherGoal
class GatherEvaluator extends YUKA.GoalEvaluator{
    calculateDesirability(){
        return 0.5;
    }
    setGoal(girl){
        const currentSubgoal = girl.brain.currentSubgoal();
        
        if((currentSubgoal instanceof GatherGoal) === false){
            girl.brain.clearSubgoals();
            girl.brain.addSubgoal(new GatherGoal(girl));
        }
    }
}
/**
 * Vehicle：汽车
 * 使用用户具有其他的行为
 */
class GoalGirl extends YUKA.Vehicle{
    constructor(mixer,animationsMap){
        super();

        this.maxTurnRate = Math.PI * 0.5;// 最大旋转弧度
        this.maxSpeed = 1.5;

        this.mixer = mixer;
        this.animationsMap = animationsMap;

        const idle = this.animationsMap.get(Enums.IDLE);
        idle.enabled = true;
        // 自定义内部变量
        this._state = {
            currentGoal:'',
            currentSubgoal:'',
        };
        this.brain = new YUKA.Think(this);
        this.brain.addEvaluator(new ResetEvaluator());// 恢复
        this.brain.addEvaluator(new GatherEvaluator()); // 收集

        const arriveBehavior = new YUKA.ArriveBehavior();
        arriveBehavior.deceleration = 1.5;
        this.steering.add(arriveBehavior);

        this.fatigueLevel = 0;
        this.resetDuration = 5;
        this.crossFadeDuration = 0.5;
        this.pickUpDuration = 6;
        this.currentTarget = null;
        this.currentTime = 0;
        this.deltaTime = 0;
        this.max_fatigue = 3;// fatigue:疲劳

    }

    update(delta){
        super.update(delta);
        this.deltaTime = delta;
        this.brain.execute();
        this.brain.arbitrate();
        this.mixer.update(delta);
        
        return this;
    }

    tired(){
        return this.fatigueLevel >= this.max_fatigue;
    }
}
/**
 * 立方体盒子对象
 */
class CollectibleEntity extends YUKA.GameEntity{
    spawn(){
        this.position.x = Math.random() * 15 - 7.5;
        this.position.z = Math.random() * 15 - 7.5;

        if(this.position.x < 1 && this.position.x > -1) this.position.x += 1;
        if(this.position.z < 1 && this.position.z > -1) this.position.z += 1;
    }

    handleMessage(telegram){
        const message = telegram.message;
        switch(message){
            case 'PickedUp':
                this.spawn();
                return true;
            default:
                console.log('CollectibleEntity 未知消息!');
        }

        return false;
    }
}
/**
 * 全局驱动代理
 */
export class GoalDrivenAgentDesign{
    constructor(_options ={}){
        this._options = _options;

        this.init();
    }

    init(){
        this.loaderManager = new THREE.LoadingManager(()=>{
            // 加载完毕回调
            this.renderer.setAnimationLoop(this.animate.bind(this));
        });

        this._init()
    }
    _init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);
        this.scene.fog = new THREE.Fog(0xa0a0a0,20,40);

        this.perspectiveCamera = new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,0.001,200);
        this.perspectiveCamera.position.set(0,5,15);
        this.perspectiveCamera.lookAt(this.scene.position);

        const groundGeometry = new THREE.PlaneGeometry(150,150);
        const groundMaterial = new THREE.MeshPhongMaterial({color:0x999999});
        const groundMesh = new THREE.Mesh(groundGeometry,groundMaterial);
        groundMesh.rotation.x = -Math.PI /2;
        groundMesh.receiveShadow = true;
        this.scene.add(groundMesh);

        const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444, 0.6 );
			hemiLight.position.set( 0, 100, 0 );
			hemiLight.matrixAutoUpdate = false;
			hemiLight.updateMatrix();
			this.scene.add( hemiLight );

		 	const dirLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
			dirLight.position.set( 4, 5, 5 );
			dirLight.matrixAutoUpdate = false;
			dirLight.updateMatrix();
			dirLight.castShadow = true;
			dirLight.shadow.camera.top = 10;
			dirLight.shadow.camera.bottom = - 10;
			dirLight.shadow.camera.left = - 10;
			dirLight.shadow.camera.right = 10;
			dirLight.shadow.camera.near = 0.1;
			dirLight.shadow.camera.far = 20;
			dirLight.shadow.mapSize.x = 2048;
			dirLight.shadow.mapSize.y = 2048;
			this.scene.add( dirLight );

            this.scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );

        this.gltfLoader = new GLTFLoader(this.loaderManager);
        this.gltfLoader.load('./yuka/yuka.glb',gltf=>{
            console.log('gltf:',gltf)
            const avatar = gltf.scene;
            avatar.animations = gltf.animations;
            // 加载模型
            avatar.traverse(object=>{
                if(object.isMesh){
                    object.material.transparent = true;
                    object.material.opacity = 1;
                    object.material.alphaTest = 0.7;
                    object.material.side = THREE.DoubleSide;
                    object.castShadow = true;
                }
            });
            //avatar.matrixWorldAutoUpdate  = false;
            avatar.matrixAutoUpdate = true;
            this.scene.add(avatar);
            // 创建动画混合器
            this.mixer = new THREE.AnimationMixer(avatar);
            this.animationsMap = new Map();
            // 保存所有的动画
            this.animationsMap.set(Enums.IDLE,this.createAnimationAction('Character_Idle'));
            this.animationsMap.set(Enums.WALK,this.createAnimationAction('Character_Walk'));
            this.animationsMap.set(Enums.GATHER,this.createAnimationAction('Character_Gather'));
            this.animationsMap.set(Enums.RIGHT_TURN,this.createAnimationAction('Character_RightTurn'));
            this.animationsMap.set(Enums.LEFT_TURN,this.createAnimationAction('Character_LeftTurn'));

            // 创建管理
            this.entityManager = new YUKA.EntityManager();
            this.yukaTime = new YUKA.Time();

            // 创建girl对象是一个 YUKA.Vehicle
            const girl = new GoalGirl(this.mixer,this.animationsMap);
            girl.setRenderComponent(avatar,this.sync.bind(this));

            this.entityManager.add(girl);

            // 创建收集的立方体
            const collectibleGeometry = new THREE.BoxGeometry(0.2,0.2,0.2);
            collectibleGeometry.translate(0,0.1,0);
            const collectibleMaterial = new THREE.MeshBasicMaterial({color:0x040404});

            for(let i =0; i < 5;i++){
                const collectibleMesh = new THREE.Mesh(collectibleGeometry,collectibleMaterial);
                //collectibleMesh.matrixAutoUpdate = false;
                collectibleMesh.castShadow = true;
                // 一个YUKA.GameEntity 对象
                const collectible = new CollectibleEntity();
                collectible.setRenderComponent(collectibleMesh,this.sync.bind(this));
                collectible.spawn();

                this.scene.add(collectibleMesh);
                this.entityManager.add(collectible);
            }
        });

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this._options.dom.appendChild(this.renderer.domElement);
        this.renderer.shadowMap.enabled = true;

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
    }
    animate(){
        this.orbitControls.update();
        const delta = this.yukaTime.update().getDelta();
        this.entityManager.update(delta);
        this.renderer.render(this.scene,this.perspectiveCamera);
    }
    sync(entity,renderComponent){
        //console.log(2,entity,renderComponent);
        
        // 使用 YUKA 的 worldMatrix（包含旋转）更新 Three.js 模型
        renderComponent.matrix.copy(entity.worldMatrix);
        // 第一种直接修改位置值
        //renderComponent.position.copy(entity.position);
        // 第二种更好，把矩阵解析到position，quaternion，scale等
        renderComponent.matrix.decompose(
            renderComponent.position,
            renderComponent.quaternion,
            renderComponent.scale
        );
    }
    createAnimationAction(clipName){
        //console.log(this.mixer)
        let action = this.mixer.clipAction(clipName);
        action.play();
        action.enabled = false;
        return action;
    }
    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

/**
 * 士兵游戏实体对象
 */
class SoldierGameEntity extends YUKA.GameEntity{
    constructor(){
        super();

        this.assaultRifle = null;
        this.shotgun = null;
        this.ammoShotgun = 12;
        this.ammoAssaultRifle = 30;

        this.zombie = null;

        this.fuzzyModuleShotGun = new YUKA.FuzzyModule();
        this.fuzzyModuleAssaultRifle = new YUKA.FuzzyModule();

    }
    // Executed when this game entity is updated for the first time by its EntityManager.
    start(){
        this.zombie = this.manager.getEntityByName('zombie');
        return this;
    }

    update(){
        super.update();
        if(this.shotgun != null && this.assaultRifle != null){

            this.selectWeapon();// weapon:武器
        }
        return this;
    }

    selectWeapon(){
        const fuzzyModuleShotGun = this.fuzzyModuleShotGun;
        const fuzzyModuleAssaultRifle = this.fuzzyModuleAssaultRifle;
        const distance = this.position.distanceTo(this.zombie.position);// 到丧尸的距离
        // flv:FuzzyVariable	

        fuzzyModuleShotGun.fuzzify('distanceToTarget',distance);
        fuzzyModuleAssaultRifle.fuzzify('distanceToTarget',distance);

        fuzzyModuleShotGun.fuzzify('ammoStatus',this.ammoShotgun);
        fuzzyModuleAssaultRifle.fuzzify('ammoStatus',this.ammoAssaultRifle);

        const desirabilityShotgun = (this.ammoShotgun === 0) ? 0 : fuzzyModuleShotGun.defuzzify('desirability');
        const desirabilityAssaultRifle = this.ammoAssaultRifle === 0 ? 0 : fuzzyModuleAssaultRifle.defuzzify('desirability');

        if(desirabilityShotgun > desirabilityAssaultRifle){
            this.assaultRifle.visible = false;
            this.shotgun.visible = true;
        }else{
            this.assaultRifle.visible = true;
            this.shotgun.visible = false;
        }
    }

    _initFuzzyModule(){
        const fuzzyModuleShotGunParent = this.fuzzyModuleShotGun;
        const fuzzyModuleAssaultRifleParent = this.fuzzyModuleAssaultRifle;

        const distanceToTarget = new YUKA.FuzzyVariable();

        const targetClose = new YUKA.LeftShoulderFuzzySet(0,5,10);
        const targetMedium = new YUKA.TriangularFuzzySet(5,10,15);
        const targetFar = new YUKA.RightShoulderFuzzySet(10,15,20);

        distanceToTarget.add(targetClose);
        distanceToTarget.add(targetMedium);
        distanceToTarget.add(targetFar);

        fuzzyModuleShotGunParent.addFLV('distanceToTarget',distanceToTarget);
        fuzzyModuleAssaultRifleParent.addFLV('distanceToTarget',distanceToTarget);

        const desirability =  new YUKA.FuzzyVariable();

        const undesirable = new YUKA.LeftShoulderFuzzySet(0,25,50);
        const desirable = new YUKA.TriangularFuzzySet(25,50,75);
        const veryDesirable = new YUKA.RightShoulderFuzzySet(50,75,100);

        desirability.add(undesirable);
        desirability.add(desirable);
        desirability.add(veryDesirable);

        fuzzyModuleShotGunParent.addFLV('desirability',desirability);
        fuzzyModuleAssaultRifleParent.addFLV('desirability',desirability);

        const ammoStatusShotgun = new YUKA.FuzzyVariable();

		const lowShot = new YUKA.LeftShoulderFuzzySet( 0, 2, 4 );
		const okayShot = new YUKA.TriangularFuzzySet( 2, 7, 10 );
		const loadsShot = new YUKA.RightShoulderFuzzySet( 7, 10, 12 );

		ammoStatusShotgun.add( lowShot );
		ammoStatusShotgun.add( okayShot );
		ammoStatusShotgun.add( loadsShot );

		fuzzyModuleShotGunParent.addFLV( 'ammoStatus', ammoStatusShotgun );

        const ammoStatusAssaultRifle = new YUKA.FuzzyVariable();

		const lowAssault = new YUKA.LeftShoulderFuzzySet( 0, 2, 8 );
		const okayAssault = new YUKA.TriangularFuzzySet( 2, 10, 20 );
		const loadsAssault = new YUKA.RightShoulderFuzzySet( 10, 20, 30 );

		ammoStatusAssaultRifle.add( lowAssault );
		ammoStatusAssaultRifle.add( okayAssault );
		ammoStatusAssaultRifle.add( loadsAssault );

		fuzzyModuleAssaultRifleParent.addFLV( 'ammoStatus', ammoStatusAssaultRifle );

        // rules shotgun

		fuzzyModuleShotGunParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetClose, lowShot ), desirable ) );
		fuzzyModuleShotGunParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetClose, okayShot ), veryDesirable ) );
		fuzzyModuleShotGunParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetClose, loadsShot ), veryDesirable ) );

		fuzzyModuleShotGunParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetMedium, lowShot ), desirable ) );
		fuzzyModuleShotGunParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetMedium, okayShot ), veryDesirable ) );
		fuzzyModuleShotGunParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetMedium, loadsShot ), veryDesirable ) );

		fuzzyModuleShotGunParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetFar, lowShot ), undesirable ) );
		fuzzyModuleShotGunParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetFar, okayShot ), undesirable ) );
		fuzzyModuleShotGunParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetFar, loadsShot ), undesirable ) );

		// rules assault rifle

		fuzzyModuleAssaultRifleParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetClose, lowAssault ), undesirable ) );
		fuzzyModuleAssaultRifleParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetClose, okayAssault ), desirable ) );
		fuzzyModuleAssaultRifleParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetClose, loadsAssault ), desirable ) );

		fuzzyModuleAssaultRifleParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetMedium, lowAssault ), desirable ) );
		fuzzyModuleAssaultRifleParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetMedium, okayAssault ), desirable ) );
		fuzzyModuleAssaultRifleParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetMedium, loadsAssault ), veryDesirable ) );

		fuzzyModuleAssaultRifleParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetFar, lowAssault ), desirable ) );
		fuzzyModuleAssaultRifleParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetFar, okayAssault ), veryDesirable ) );
		fuzzyModuleAssaultRifleParent.addRule( new YUKA.FuzzyRule( new YUKA.FuzzyAND( targetFar, loadsAssault ), veryDesirable ) );

    }

    setInit(options={}){
        this.assaultRifle = options.assaultRifle;
        this.shotgun = options.shotgun;
        this._initFuzzyModule();

    }
}
/**
 * 模糊逻辑
 */
export class FuzzyLogic{
    constructor(options={}){
        this.options = options;
        this.mixers =[];
        this.params = {
            distance:8,
            ammoShotgun:12,
            ammoAssaultRifle:30
        };
        this.init();
    }

    init(){
        this.loadingManager = new THREE.LoadingManager(()=>{
            // 加载完毕之后执行代码
            this.initGUI();
            this.soldier.setInit({assaultRifle:this.assaultRifle,shotgun:this.shotgun});
            this.renderer.setAnimationLoop(this.animate.bind(this));
        },(url,loaded,total)=>{
            console.log('加载进度条:',url,loaded,total);
        },(err)=>{
            console.log('错误:',err);
        });
        this._init();
    }
    _init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);
        this.scene.fog = new THREE.Fog(0xf2f,20,40);

        this.perspectiveCamera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.001,1000);
        this.perspectiveCamera.position.set(-0.5,2,-2.5);
        this.perspectiveCamera.lookAt(0,0,15);


        const geometry = new THREE.PlaneGeometry(150,150);
        const material = new THREE.MeshPhongMaterial({color:0x999999,depthWrite:false});
        const ground = new THREE.Mesh(geometry,material);
        ground.rotation.x = - Math.PI * 0.5;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const hemisphereLight = new THREE.HemisphereLight(0xffff,0x444444,0.6);
        hemisphereLight.position.set(0,100,0);
        this.scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xfffccd,2.8);
        directionalLight.position.set(-10,10,10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.top = 2;
        directionalLight.shadow.camera.bottom = -2;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.near = 0.01;
        directionalLight.shadow.camera.far = 20;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;

        //Create a helper for the shadow camera (optional)
        const helper = new THREE.CameraHelper( directionalLight.shadow.camera );
        this.scene.add( helper );

        this.scene.add(new THREE.PolarGridHelper(20,20,20,20,0xff0000,0xffddff));

        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();


        // 加载士兵模型
        this.gltfLoader = new GLTFLoader(this.loadingManager);
     

        // load zombie：僵尸
        this.gltfLoader.load('./yuka/zombie.glb',gltf=>{
            const renderComponent = gltf.scene;
            renderComponent.animations = gltf.animations;
            renderComponent.traverse(item=>{
                if(item.isMesh){
                    item.material.side = THREE.DoubleSide;
                    item.castShadow= true;
                }
            });

            const mixer = new THREE.AnimationMixer(renderComponent);
            this.mixers.push(mixer);

            const idleAction = mixer.clipAction('Character_Idle');
            idleAction.play();
            // 丧尸
            this.zombie = new YUKA.GameEntity();
            this.zombie.name = 'zombie';
            this.zombie.position.set(0,0,this.params.distance);
            this.zombie.setRenderComponent(renderComponent,this.sync.bind(this));

            this.entityManager.add(this.zombie);
            this.scene.add(renderComponent);
        });
        // load shotgun 
        this.gltfLoader.load('./yuka/shotgun.glb',gltf=>{
            this.shotgun = gltf.scene;
            this.shotgun.traverse(object=>{
                if(object.isMesh) object.castShadow = true;
            });
            this.shotgun.scale.set(0.35,0.35,0.35);
            this.shotgun.rotation.set(Math.PI * 0.5,Math.PI * -0.45,0.1);
            this.shotgun.position.set(-50,300,0);
        });

        //load assaultRifle 装载突击步枪
        this.gltfLoader.load('./yuka.assaultRifle.glb',gltf=>{
            this.assaultRifle = gltf.scene;
            this.assaultRifle.traverse(item=>{
                if(item.isMesh) item.castShadow = true;
            });
            this.assaultRifle.scale.multiplyScalar(150);
            this.assaultRifle.rotation.set(Math.PI * 0.45,Math.PI * 0.55,0);
            this.assaultRifle.position.set(-30,200,70);
        });
   this.gltfLoader.load('./yuka/soldier.glb',(gltf)=>{
            console.log('士兵模型:',gltf);
            const renderComponent = gltf.scene;
            renderComponent.animations = gltf.animations;
            renderComponent.traverse(object=>{
                if(object.isMesh){
                    object.material.side = THREE.DoubleSide;
                    object.castShadow = true;
                    
                }
            });

            const mixer = new THREE.AnimationMixer(renderComponent);
            this.mixers.push(mixer);

            const idleAction = mixer.clipAction('Character_Idle');
            idleAction.play();

            // 代表士兵的游戏实体
            this.soldier = new SoldierGameEntity();
            this.soldier.rotation.fromEuler(0,Math.PI * -0.5,0);
            this.soldier.setRenderComponent(renderComponent,this.sync.bind(this));

            this.entityManager.add(this.soldier);
            this.scene.add(renderComponent);
        });
        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.options.dom.appendChild(this.renderer.domElement);
        this.renderer.shadowMap.enabled = true;
        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

    }
    animate(){
        const delta = this.yukaTime.update().getDelta();
        if(this.mixers.length > 0){
            for(let i =0; i < this.mixers.length;i++){
                this.mixers[i].update(delta);
            }
        }
        this.entityManager.update(delta);
        this.renderer.render(this.scene,this.perspectiveCamera);

    }
    /**
     * 同步YUKA数据到Three.js 对象上
     */
    sync(entity,renderComponent){
        renderComponent.matrix.copy(entity.worldMatrix);
        renderComponent.matrix.decompose(
            renderComponent.position,renderComponent.quaternion,renderComponent.scale
        );
    }
    /**
     * 
     * @param {*} event 
     */
    onTransitionEnd(event){
        event.target.remove();
    }
    initGUI(){
        const gui = new GUI( { width: 400 } );

			gui.add( this.params, 'distance', 5, 20 ).name( 'Distance To Enemy' ).onChange( ( value ) => {

				this.zombie.position.z = value;

			} );

			gui.add( this.params, 'ammoShotgun', 0, 12 ).step( 1 ).name( 'Ammo Shotgun' ).onChange( ( value ) => {

				this.soldier.ammoShotgun = value;

			} );

			gui.add( this.params, 'ammoAssaultRifle', 0, 30 ).step( 1 ).name( 'Ammo Assault Rifle' ).onChange( ( value ) => {

				this.soldier.ammoAssaultRifle = value;

			} );
    }
    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
    
}

/**
 * 导航计算
 */
export class GraphBasic{
    constructor(options={}){
        this._options = options;
        this.params ={algorithm:'AStar'};
        this.nodes =[];
        this.from = 0;
        this.init();
    }

    init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfdfdfd);

        this.scene.add(new THREE.AmbientLight(0xffffff,1.2));

        this.perspectiveCamera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.001,1000);
        this.perspectiveCamera.position.set(0,20,20);

        this.raycaster = new THREE.Raycaster();

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this._options.dom.appendChild(this.renderer.domElement);
        this.renderer.setAnimationLoop(this.animate.bind(this));

        this.renderer.domElement.addEventListener('mousedown',this.onMouseDown.bind(this),false);
        
        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

        this.scene.add(new THREE.AxesHelper(100));

        // graph
        this.graph = YUKA.GraphUtils.createGridLayout(50,10);
        console.log('graph:',this.graph);
        const graphHelper = this.createGraphHelper(0.25);
        this.scene.add(graphHelper);
        graphHelper.traverse(item=>{
            if(item.isMesh) this.nodes.push(item);
        });

        

        const gui = new GUI({width:300});
        gui.add(this.params,'algorithm',['AStar','Dijkstra','BFS','DFS']).onChange(()=>{
            this.performSearch();
        });

    }

    createGraphHelper(nodeSize,nodeColor=0x4e84c4,edgeColor=0x000){
        const group = new THREE.Group();
        group.name = 'graphGroup';

        const nodeGeometry = new THREE.IcosahedronGeometry(nodeSize,2);
        const nodeMaterial = new THREE.MeshBasicMaterial({color:nodeColor});

        const nodes = [];
        this.graph.getNodes(nodes);// 获取所有的节点数据
        for(let node of nodes){
            const nodeMesh = new THREE.Mesh(nodeGeometry,nodeMaterial);
            nodeMesh.position.copy(node.position);
            nodeMesh.userData.nodeIndex = node.index;

            group.add(nodeMesh);
        }
        
        // 绘制边
        const edgesGeometry = new THREE.BufferGeometry();
        const positions = [];
        const edgesMaterial = new THREE.LineBasicMaterial({color:edgeColor});
        const edges =[];
        for(let node of nodes){
            this.graph.getEdgesOfNode(node.index,edges);

            for(let edge of edges){
                const fromNode = this.graph.getNode(edge.from);
                const toNode = this.graph.getNode(edge.to);

                positions.push(fromNode.position.x,fromNode.position.y,fromNode.position.z);
                positions.push(toNode.position.x,toNode.position.y,toNode.position.z);
            }
        }

        edgesGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(positions),3));
        const lines = new THREE.LineSegments(edgesGeometry,edgesMaterial);
        lines.name = 'edge';
        group.add(lines);
        return group;
    }

    createSearchTreeHelper(searchTree,color=0xff0000){
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const material = new THREE.LineBasicMaterial({color:color});
        for(let edge of searchTree){
            const fromNode = this.graph.getNode(edge.from);
            const toNode = this.graph.getNode(edge.to);
            positions.push(fromNode.position.x,fromNode.position.y,fromNode.position.z);
            positions.push(toNode.position.x,toNode.position.y,toNode.position.z);
        }
        geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(positions),3));
        const lines = new THREE.LineSegments(geometry,material);
        lines.name = 'searchTree';
        return lines;
    }
    createPathHelper(path,nodeSize=0.4,color=0x00CC66){
        const group = new THREE.Group();

        const startNodeMaterial = new THREE.MeshBasicMaterial({color:0xffddcc});
        const endNodeMaterial = new THREE.MeshBasicMaterial({color:0x00ff});
        const nodeGeometry = new THREE.IcosahedronGeometry(nodeSize,2);

        const startNodeMesh = new THREE.Mesh(nodeGeometry,startNodeMaterial);
        const endNodeMesh = new THREE.Mesh(nodeGeometry,endNodeMaterial);

        const startNode = this.graph.getNode(path[0]);
        const endNode = this.graph.getNode(path[path.length - 1]);

        startNodeMesh.position.copy(startNode.position);
        endNodeMesh.position.copy(endNode.position);

        group.add(startNodeMesh);
        group.add(endNodeMesh);

        // edges 
        const edgesGeometry = new THREE.BufferGeometry();
        const positions = [];

        const edgesMaterial = new THREE.LineBasicMaterial({color:color});
        for(let i =0; i < path.length - 1;i ++){
            const fromNode = this.graph.getNode(path[i]);
            const toNode = this.graph.getNode(path[i + 1]);

            positions.push(fromNode.position.x,fromNode.position.y,fromNode.position.z);
            positions.push(toNode.position.x,toNode.position.y,toNode.position.z);
        }

        edgesGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(positions),3));
        const lines = new THREE.LineSegments(edgesGeometry,edgesMaterial);
        lines.name = 'path';
        group.add(lines);
        return group;
    }
    performSearch(){
        const graphSearch = new YUKA[this.params.algorithm](this.graph,this.from,this.to);
        graphSearch.search();
        //console.log(this.from,this.to)
        const searchTree = graphSearch.getSearchTree(); // 边，包含所有课行走的路线
        //console.log('searchTree:',searchTree);
        const path = graphSearch.getPath(); // 索引列表
        //console.log('path:',path);

        if(this.searchTreeHelper !== undefined && this.pathHelper !== undefined){
            this.scene.remove(this.searchTreeHelper);
            this.scene.remove(this.pathHelper);
            this.dispose(this.searchTreeHelper);
            this.dispose(this.pathHelper);
        }

        this.searchTreeHelper = this.createSearchTreeHelper(searchTree);
        this.searchTreeHelper.renderOrder = 1;
        this.scene.add(this.searchTreeHelper);

        // 
        this.pathHelper = this.createPathHelper(path,0.4);
        this.pathHelper.renderOrder = 2;
        this.scene.add(this.pathHelper);

        graphSearch.clear();

    }

    dispose(object){
        object.traverse(item=>{
            if(item.isMesh || item.isLine){
                item.geometry.dispose();
                item.material.dispose();
            }
        })
    }
    onMouseDown(evt){
        const mouse = new THREE.Vector2();
        mouse.x = (evt.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(evt.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        //console.log(this.renderer.domElement.clientWidth);
        this.raycaster.setFromCamera(mouse,this.perspectiveCamera);

        const intersects = this.raycaster.intersectObjects(this.nodes);
        if(intersects.length > 0){
            const first = intersects[0];
            this.to = first.object.userData.nodeIndex;
            this.performSearch();
        }
    }
    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
    }
    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

export class Navmesh {
    constructor(options={}){
        this._options = options;
        this.params={showNavigationGraph:true};
        this.navMesh = null;
        this.init();
    }

    init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfdfdfd);

        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,1000);
        this.perspectiveCamera.position.set(0,25,25);
        this.perspectiveCamera.lookAt(0,0,0);


        this.raycaster = new THREE.Raycaster();
        this.mouseCoordinates = new THREE.Vector2();

        const pathMaterial = new THREE.LineBasicMaterial({color:0xff0000});
        this.pathHelper = new THREE.Line(new THREE.BufferGeometry(),pathMaterial);
        this.pathHelper.visible = false;
        this.scene.add(this.pathHelper);

        this.scene.add(new THREE.AxesHelper(100));
        // 创建箭头
        const vehicleGeometry = new THREE.ConeGeometry(0.25,1,16);
        vehicleGeometry.rotateX(Math.PI * 0.5);
        vehicleGeometry.translate(0,0.25,0);
        const vehicleMaterial = new THREE.MeshNormalMaterial({});
        const vehicleMesh = new THREE.Mesh(vehicleGeometry,vehicleMaterial);
        this.scene.add(vehicleMesh);
        this.yukaTime = new YUKA.Time();
        this.entityManager = new YUKA.EntityManager();

        // renderer 
        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth , window.innerHeight);
        this._options.dom.appendChild(this.renderer.domElement);
        this.renderer.domElement.addEventListener('click',this.onClick.bind(this),false);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        
        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);


        const gui = new GUI({width:300});
        gui.add(this.params,'showNavigationGraph').onChange(value=>{
            if(this.graphHelper) this.graphHelper.visible = value;
        });
        gui.open();
        
        // 加载模型
        const loader = new YUKA.NavMeshLoader();
        loader.load('./yuka/navmeshes/basic/navmesh.gltf').then(navMesh=>{
            console.log('模型:',navMesh)
            this.navMesh = navMesh;
            this.navMeshGroup = this.createConvexRegionHelper(navMesh);
            this.scene.add(this.navMeshGroup);

            const graph = navMesh.graph;
            this.graphHelper = this.createGraphHelper(graph,0.8);
            this.scene.add(this.graphHelper);

          
            this.vehicle = new YUKA.Vehicle();
            this.vehicle.maxSpeed = 1.5;
            this.vehicle.maxForce = 10;
            this.vehicle.setRenderComponent(vehicleMesh,this.sync.bind(this));

            // 添加一个跟随路径行为
            const followPathBehavior = new YUKA.FollowPathBehavior();
            followPathBehavior.active = false;
            this.vehicle.steering.add(followPathBehavior);
            this.entityManager.add(this.vehicle);


        });
    }

    createGraphHelper(graph,nodeSize,nodeColor=0x4e84c4,edgeColor=0xffd){
        const group = new THREE.Group();
        group.name = 'group';

        const nodeMaterial = new THREE.MeshBasicMaterial({color:nodeColor});
        const nodeGeometry = new THREE.IcosahedronGeometry(nodeSize,2);
        const nodes =[];

        graph.getNodes(nodes);
        for(let node of nodes){
            const nodeMesh = new THREE.Mesh(nodeGeometry,nodeMaterial);
            nodeMesh.position.copy(node.position);
            nodeMesh.userData.nodeIndex = node.index;

            group.add(nodeMesh);
        }

        const edgesGeometry = new THREE.BufferGeometry();
        const positions = [];
        const edgesMaterial = new THREE.LineBasicMaterial({color:edgeColor});
        const edges = [];

        for(let node of nodes ){
            graph.getEdgesOfNode(node.index,edges);
            for(let edge of edges){
                const fromNode = graph.getNode(edge.from);
                const toNode = graph.getNode(edge.to);

                positions.push(fromNode.position.x,fromNode.position.y,fromNode.position.z);
                positions.push(toNode.position.x,toNode.position.y,toNode.position.z);
            }
        }

        edgesGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(positions),3));
        const lines = new THREE.LineSegments(edgesGeometry,edgesMaterial);
        lines.name = 'lines';
        group.add(lines);
        return group;
    }
    createConvexRegionHelper(navMesh){
        const regions = navMesh.regions;
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.MeshBasicMaterial({vertexColors:true});
        const mesh = new THREE.Mesh(geometry,material);

        const positions = [];
        const colors = [];

        const color = new THREE.Color();
        for(let region of regions){
            color.setHex(Math.random() * 0xffffff);
            let edge = region.edge;
            const edges =[];
            do{
                edges.push(edge);
                edge = edge.next;
            }while(edge !== region.edge);

            const triangleCount = (edges.length - 2);
            for(let i =1;i < triangleCount;i++){
                const v1 = edges[0].vertex;
                const v2 = edges[i + 0].vertex;
                const v3 = edges[i + 1].vertex;

                positions.push(v1.x,v1.y,v1.z);
                positions.push(v2.x,v2.y,v2.z);
                positions.push(v3.x,v3.y,v3.z);

                colors.push(color.r,color.g,color.b);
                colors.push(color.r,color.g,color.b);
                colors.push(color.r,color.g,color.b);
            }
        }

        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
        return mesh;
    }

    findPathTo(target){
        const from = this.vehicle.position;
        const to = target;

        const path = this.navMesh.findPath(from,to);

        this.pathHelper.visible = true;
        this.pathHelper.geometry.dispose();
        this.pathHelper.geometry = new THREE.BufferGeometry().setFromPoints(path);

        const followPathBehavior = this.vehicle.steering.behaviors[0];
        followPathBehavior.active = true;
        followPathBehavior.path.clear();

        for(const point of path){
            followPathBehavior.path.add(point);
        }
    }
    onClick(evt){
        //console.log('鼠标点击:',evt.clientX);
        this.mouseCoordinates.x = (evt.clientX / this.renderer.domElement.clientWidth) * 2 -1;
        this.mouseCoordinates.y = -(evt.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouseCoordinates,this.perspectiveCamera);

        const intersects = this.raycaster.intersectObject(this.navMeshGroup,true);
        if(intersects.length > 0){
            this.findPathTo(new YUKA.Vector3().copy(intersects[0].point));
        }
    }
    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
        const delta = this.yukaTime.update().getDelta();
        this.entityManager.update(delta);

    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }

    sync(entity,renderComponent){
        renderComponent.matrix.copy(entity.worldMatrix);
        renderComponent.matrix.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);
    }
}

class PathPlannerTask extends YUKA.Task{
    constructor(planner,vehicle,from,to,callback){
        super();

        this.callback = callback;
        this.planner = planner;
        this.vehicle = vehicle;
        this.from = from;
        this.to = to;
    }

    execute(){
        const path = this.planner.navMesh.findPath(this.from,this.to);
        this.callback(this.vehicle,path);
    }
}

/**
 * 路线规划
 */
class PathPlanner{
    constructor(navMesh){
        this.navMesh = navMesh;
        this.taskQueue = new YUKA.TaskQueue();
    }

    findPath(vehicle,from,to,callback){
        const task = new PathPlannerTask(this,vehicle,from,to,callback);
        this.taskQueue.enqueue(task);
    }

    update(){
        this.taskQueue.update();
    }
}

class CustomVehicle extends YUKA.Vehicle{
    constructor(){
        super();

        this.navMesh = null;
        this.currentRegion = null;
        this.fromRegion = null;
        this.toRegion = null;
    }

    update(delta){
        super.update(delta);

        const currentRegion = this.navMesh.getRegionForPoint(this.position,1);
        if(currentRegion !== null){
            this.currentRegion = currentRegion;
            const distance = this.currentRegion.distanceToPoint(this.position);
            this.position.y -= distance * 0.2;
        }
        return this;
    }
}
/**
 * 
 * 空间索引
 */
export class NavSpatial{
    constructor(options={}){
        this._options = options;
        
        this.vehicleCount = 100;
        this.vehicles =[];
        this.pathHelpers = [];
        this.params = {
            showNavigationPaths:false,
            showRegions:false,
            showSpatialIndex:false,
        };
        this.init();
    }

    init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfdfede);

        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,1000);
        this.perspectiveCamera.position.set(0,40,60);
        // 路线材质
        const pathMaterial = new THREE.LineBasicMaterial({color:0xff0000});
        // 模拟汽车
        const vehicleGeometry = new THREE.ConeGeometry(0.1,0.5,16);
        vehicleGeometry.rotateX(Math.PI * 0.5);
        vehicleGeometry.translate(0,0.1,0);
        const vehicleMaterial = new THREE.MeshBasicMaterial({color:0xff0000});

        const hemisphereLight = new THREE.HemisphereLight(0xfff,0x444444,0.6);
        hemisphereLight.position.set(0,100,0);
        this.scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xdcfddd,0.8);
        directionalLight.position.set(0,200,100);
        this.scene.add(directionalLight);

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this._options.dom.appendChild(this.renderer.domElement);
        
        this.initGUI();

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

        // 加载模型
        const loadingManager = new THREE.LoadingManager(()=>{
            // 加载3D资源
            const loader = new YUKA.NavMeshLoader();
            loader.load('./yuka/navmeshes/complex/navmesh.glb').then(navigationMesh=>{
                console.log('navmesh.glb路网:',navigationMesh);
                this.regionHelper = this.createConvexRegionHelper(navigationMesh);
                this.regionHelper.visible = false;
                this.scene.add(this.regionHelper);

                // 创建实体对象管理器
                this.entityManager = new YUKA.EntityManager();
                this.yukaTime = new YUKA.Time();

                this.pathPlanner = new PathPlanner(navigationMesh);
                // 设置空间索引划分
                const width = 100,height = 40,depth = 75;
                const cellsX = 20,cellsY = 5,cellsZ = 20;

                navigationMesh.spatialIndex = new YUKA.CellSpacePartitioning(width,height,depth,cellsX,cellsY,cellsZ);
                navigationMesh.updateSpatialIndex();

                this.spatialIndexHelper = this.createCellSpaceHelper(navigationMesh.spatialIndex);
                this.scene.add(this.spatialIndexHelper);
                this.spatialIndexHelper.visible = false;

                // 创建vehicle
                this.vehicleMesh = new THREE.InstancedMesh(vehicleGeometry,vehicleMaterial,this.vehicleCount);
                this.vehicleMesh.frustumCulled = false;
                this.scene.add(this.vehicleMesh);

                for(let i =0; i < this.vehicleCount;i++){
                    const pathHelper = new THREE.Line(new THREE.BufferGeometry(),pathMaterial);// 还没有数据
                    this.pathHelpers.visible = false;
                    this.scene.add(pathHelper);
                    this.pathHelpers.push(pathHelper);

                    // vehicle
                    const vehicle = new CustomVehicle();
                    vehicle.navMesh = navigationMesh;
                    vehicle.maxSpeed = 10;
                    vehicle.maxForce = 10;

                    const toRegion = vehicle.navMesh.getRandomRegion();
                    vehicle.position.copy(toRegion.centroid);
                    vehicle.toRegion = toRegion;

                    const followPathBehavior = new YUKA.FollowPathBehavior();
                    followPathBehavior.nextWaypointDistance = 0.5;
                    followPathBehavior.active = false;
                    vehicle.steering.add(followPathBehavior);

                    this.entityManager.add(vehicle);
                    this.vehicles.push(vehicle);
                }

                this.renderer.setAnimationLoop(this.animate.bind(this));

            });
        });

        // 加载建筑模型放到three.js
        const gltfLoader = new GLTFLoader(loadingManager);
        gltfLoader.load('./yuka/level.glb',gltf=>{
            console.log('level.glb:',gltf);
            this.scene.add(gltf.scene);
            gltf.scene.rotation.y = Math.PI;
            
        });
    }
    /**
     * 创建凸多边形
     * @param {*} navMesh 
     */
    createConvexRegionHelper(navMesh){
        // 内部区域数据
        const regions = navMesh.regions;

        const geometry = new THREE.BufferGeometry();
        const material = new THREE.MeshBasicMaterial({vertexColors:true});
        const mesh = new THREE.Mesh(geometry,material);

        const positions = [];
        const colors = [];

        const color = new THREE.Color();
        /**
         * regions=[{centroid:,edge,plane:}]
         */
        for(let region of regions){
            // 每一个区域一种颜色
            color.setHex(Math.random() * 0xffffff);

            // 统计边
            let edge = region.edge;
            const edges =[];
            do{
                edges.push(edge);
                edge = edge.next;
            }while(edge !== region.edge);

            // triangleCount 
            const triangleCount = (edges.length - 2);// 知道边数，直接减2就得到可以创建的三角形个数

            for(let i = 1; i < triangleCount;i++){
                const v1 = edges[0].vertex;
                const v2 = edges[i + 0].vertex;
                const v3 = edges[i + 1].vertex;

                positions.push(v1.x,v1.y,v1.z);
                positions.push(v2.x,v2.y,v2.z);
                positions.push(v3.x,v3.y,v3.z);

                colors.push(color.r,color.g,color.b);
                colors.push(color.r,color.g,color.b);
                colors.push(color.r,color.g,color.b);
                
            }

        }

        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(colors),3));
        return mesh;
    }
    /**
     * 显示空间索引分割块
     * @param {*} spatialIndex 
     */
    createCellSpaceHelper(spatialIndex){
        const cells = spatialIndex.cells;
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({color:0xfdcfdd});
        const lines = new THREE.LineSegments(geometry,material);
        const positions =[];

        for(let i =0; i < cells.length;i++){
            const cell = cells[i];
            const min = cell.aabb.min;
            const max = cell.aabb.max;

            // bottom line
            positions.push(min.x,min.y,min.z, max.x,min.y,min.z);
            positions.push(min.x,min.y,min.z, min.x,min.y,max.z);
            positions.push(max.x,min.y,max.z, max.x,min.y,min.z);
            positions.push(max.x,min.y,max.z, min.x,min.y,max.z);


            positions.push( min.x, max.y, min.z, 	max.x, max.y, min.z );
            positions.push( min.x, max.y, min.z, 	min.x, max.y, max.z );
            positions.push( max.x, max.y, max.z, 	max.x, max.y, min.z );
            positions.push( max.x, max.y, max.z, 	min.x, max.y, max.z );

            // torso lines

            positions.push( min.x, min.y, min.z, 	min.x, max.y, min.z );
            positions.push( max.x, min.y, min.z, 	max.x, max.y, min.z );
            positions.push( max.x, min.y, max.z, 	max.x, max.y, max.z );
            positions.push( min.x, min.y, max.z, 	min.x, max.y, max.z );
        }

        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));

        return lines;
    }

    updatePathfinding(){
        for(let i =0; i < this.vehicles.length;i++){
            const vehicle = this.vehicles[i];

            if(vehicle.currentRegion === vehicle.toRegion){
                vehicle.fromRegion = vehicle.toRegion;
                vehicle.toRegion = vehicle.navMesh.getRandomRegion();

                const from = vehicle.position;
                const to = vehicle.toRegion.centroid;
                this.pathPlanner.findPath(vehicle,from,to,this.onPathFoundCallback.bind(this));
            }
        }
    }

    onPathFoundCallback(vehicle,path){
        const index = this.vehicles.indexOf(vehicle);
        const pathHelper = this.pathHelpers[index];

        pathHelper.geometry.dispose();
        pathHelper.geometry = new THREE.BufferGeometry().setFromPoints(path);


        const followPathBehavior = vehicle.steering.behaviors[0];
        followPathBehavior.active = true;
        followPathBehavior.path.clear();

        for(const point of path){
            followPathBehavior.path.add(point);
        }
    }
    /**
     * 更新每个实例Mesh对象
     */
    updateInstancing(){
        for ( let i = 0, l = this.vehicles.length; i < l; i ++ ) {
				const vehicle = this.vehicles[ i ];
				this.vehicleMesh.setMatrixAt( i, vehicle.worldMatrix );
			}
			this.vehicleMesh.instanceMatrix.needsUpdate = true;
    }
    animate(){
        this.updatePathfinding();
        const delta = this.yukaTime.update().getDelta();
        this.entityManager.update(delta);
        this.pathPlanner.update();
        this.updateInstancing();
        this.renderer.render(this.scene,this.perspectiveCamera);
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }

    initGUI(){
        const gui = new GUI({width:300});
        gui.add(this.params,'showNavigationPaths').onChange(value=>{
            // 显示导航路线
            for(let i =0; i < this.pathHelpers.length;i++){
                this.pathHelpers[i].visible = value;
            }
        });

        gui.add(this.params,'showRegions').onChange(value=>{
            this.regionHelper.visible = value;
        });

        gui.add(this.params,'showSpatialIndex').onChange(value=>{
            this.spatialIndexHelper.visible = value;
        });
        gui.open();
    }
}

const _half_pi_ = Math.PI / 2;
const direction = new YUKA.Vector3();
const velocity = new YUKA.Vector3();
let currentSign = 1;
let elapsedTime = 0;
/**
 * 控制第一人称视角的移动和视角转动
 */
class FirstPersonControls extends YUKA.EventDispatcher{
    constructor(owner = null){
        super();
        this.owner = owner;
        this.movementX = 0;// 鼠标左右滑动
        this.movementY = 0;// 鼠标上下滑动

        this.acceleration = 40;
        this.brakingPower = 10;
        this.lookingSpeed = 1;
        this.headMovement = 1.5;

        this.input ={
            forward:false,
            backward:false,
            right:false,
            left:false,
        };

        this.sounds = new Map();

        this._mouseMoveHandler = this.onMouseMove.bind(this);
        this._pointerlockChangeHandler = this.onPointerlockChange.bind(this);
        this._pointerlockErrorHandler = this.onPointerlockError.bind(this);
        this._keyDownHandler = this.onKeyDown.bind(this);
        this._keyUpHandler = this.onKeyUp.bind(this);

     
    }
   
    connect(){
        document.addEventListener('mousemove',this._mouseMoveHandler,false);
        document.addEventListener('pointerlockchange',this._pointerlockChangeHandler,false);
        document.addEventListener('pointerlockerror',this._pointerlockErrorHandler,false);
        document.addEventListener('keydown',this._keyDownHandler,false);
        document.addEventListener('keyup',this._keyUpHandler,false);

        document.body.requestPointerLock();// 开启屏幕锁定
    }

    disconnect(){
        document.removeEventListener('mousemove',this._mouseMoveHandler,false);
        document.removeEventListener('pointerlockchange',this._pointerlockChangeHandler,false);
        document.removeEventListener('pointerlockerror',this._pointerlockErrorHandler,false);
        document.removeEventListener('keydown',this._keyDownHandler,false);
        document.removeEventListener('keyup',this._keyUpHandler,false);
    }

    update(delta){
        const input = this.input;
        const owner = this.owner;

        velocity.x -= velocity.x * this.brakingPower * delta;
        velocity.z -= velocity.z * this.brakingPower * delta;

        direction.z = Number(input.forward) - Number(input.backward);
        direction.x =Number(input.left) - Number(input.right);
        direction.normalize();
        // 当用户按下“向前”键时，direction.z 为负值（因为向前移动时 z 轴方向为负），而 velocity.z 会减去一个负值，相当于增加了向前的速度
        if(input.forward || input.backward) velocity.z -= direction.z * this.acceleration * delta;
        if(input.left || input.right) velocity.x -= direction.x * this.acceleration * delta;

        owner.velocity.copy(velocity).applyRotation(owner.rotation);

        this._updateHead(delta);
    }
    /**
     * 
     * @param {*} yaw 左右
     * @param {*} pitch 上下摇头
     */
    setRotation(yaw,pitch){
        this.movementX = yaw;
        this.movementY = pitch;

        this.owner.rotation.fromEuler(0,this.movementX,0);
        this.owner.head.rotation.fromEuler(this.movementY,0,0);
    }
    _updateHead(delta){
        const owner = this.owner;
        const head = owner.head;

        const speed = owner.getSpeed();
        elapsedTime += delta * speed;

        const motion = Math.sin(elapsedTime * this.headMovement);
        head.position.y = Math.abs(motion) * 0.06;
        head.position.x = motion * 0.08;
        head.position.y += owner.height;

        const sign = Math.sign(Math.cos(elapsedTime * this.headMovement));
        if(sign < currentSign){
            currentSign = sign;
            const audio = this.sounds.get('rightStep');
            audio.play();
        }

        if(sign > currentSign){
            currentSign = sign;
            const audio  = this.sounds.get('leftStep');
            audio.play();
        }
    }
    /**
     * 
        event.movementX 和 event.movementY 表示鼠标在当前帧的移动距离。它们是相对于上一帧的增量值。
        如果鼠标向右移动，movementX 为正值；如果鼠标向左移动，movementX 为负值
     * @param {*} event 
     */
    onMouseMove(event){
        this.movementX -= event.movementX * 0.001 * this.lookingSpeed;
        this.movementY -= event.movementY * 0.001 * this.lookingSpeed;
        //限制 this.movementY 的值在 [-π/2, π/2] 范围内，即防止视角过度向上或向下旋转。_half_pi_ 是 π/2，表示 90 度
        this.movementY = Math.max(_half_pi_,Math.min(_half_pi_,this.movementY));
        this.owner.rotation.fromEuler(0,this.movementX,0);// yaw this.movementX 应用于 owner 的旋转，控制角色的水平旋转（yaw）。

        this.owner.head.rotation.fromEuler(this.movementY,0,0);// pitch this.movementY 应用于 owner.head 的旋转，控制角色头部的垂直旋转（pitch）
    }

    onPointerlockChange(){
        if(document.pointerLockElement === document.body){
            this.dispatchEvent({type:'lock'});
        }else{
            this.disconnect();
            this.dispatchEvent({type:'unlock'});
        }
    }

    onPointerlockError(){
        console.log('YUKA.Player:Unable to use Pointer Lock API.');
    }

    onKeyDown(event){
        switch(event.keyCode){
            case 38:// up
            case 87:// w
                this.input.forward = true;
                break;
            case 37:// left
            case 65:// a
                this.input.left = true;
                break;
            case 40:// down
            case 83:// s
                this.input.backward = true;
                break;
            case 39:// right
            case 68:// d
                this.input.right = true;
                break;
        }
    }

    onKeyUp(event){
        switch(event.keyCode){
            case 38:// up
            case 87:// w
                this.input.forward = false;
                break;
            case 37:// left
            case 65:// a
                this.input.left = false;
                break;
            case 40:// down
            case 83:// s
                this.input.backward = false;
                break;
            case 39:// right
            case 68:// d
                this.input.right = false;
                break;
        }
    }
}
// 设置全局变量
const startPosition = new YUKA.Vector3();
const endPosition = new YUKA.Vector3();

class CustomPlayer extends YUKA.MovingEntity{
    constructor(options={}){
        super();
        this.name = options?.name || 'Player';

        this.maxSpeed = 4;
        this.height = 2;

        this.head  = new YUKA.GameEntity();
        this.add(this.head);

        this.updateOrientation = false;
        this.navMesh = null;
        this.currentRegion = null;
    }

    update(delta){
        startPosition.copy(this.position);
        super.update(delta);
        endPosition.copy(this.position);

        this.currentRegion = this.navMesh.clampMovement(this.currentRegion,startPosition,endPosition,this.position);

        const distance = this.currentRegion.distanceToPoint(this.position);
        this.position.y -= distance * 0.2;
    }
}

/**
 * 第一人称控制移动
 * 
 */
export class FirstPersonControlsGame{
    constructor(options={}){
        this._options = options;

        this.init();
    }

    init(){
        // 创建相机
        this.perspectiveCamera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.01,200);
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);
        this.scene.fog = new THREE.Fog(0xa0a,20,40);

        // 创建地面
        const geometry = new THREE.PlaneGeometry(150,150);
        const material = new THREE.MeshPhongMaterial({color:0x999999,depthWrite:false});
        const ground = new THREE.Mesh(geometry,material);
        ground.rotation.x = - Math.PI / 2;
        ground.updateMatrix();
        this.scene.add(ground);

        // 添加半球光
        const hemisphereLight = new THREE.HemisphereLight(0xfdfccc,0x444444,0.6);
        hemisphereLight.position.set(0,100,0);
        this.scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xaddddd,1.2);
        directionalLight.position.set(0,20,10);
        this.scene.add(directionalLight);

        const loadingManager = new THREE.LoadingManager(()=>{

            const loader = new YUKA.NavMeshLoader();
            loader.load('./yuka/firstperson/navmesh/scene.glb',{epsilonCoplanarTest:0.25}).then(navMesh=>{
                this.player.navMesh = navMesh;
                
                showDialog({
                    title: '进入PointerLock模式',
                    message: '点击消失之后，进入PointerLock模式',
                }).then(() => {
                // on close
                    console.log(2222);
                    this.firstPersonControls = new FirstPersonControls(this.player);
                    this.firstPersonControls.setRotation(-2.2,0.2);
                    this.firstPersonControls.sounds.set('rightStep',this.step1);
                    this.firstPersonControls.sounds.set('leftStep',this.step2);
    
                    this.firstPersonControls.connect();

                    //const context =new THREE.AudioContext().getContext();
                    //console.log('context:',context);
                    //context.resume();
                    this.renderer.setAnimationLoop(this.animate.bind(this));
                });
            });
        });

        // 加载音频
        const audioLoader = new THREE.AudioLoader(loadingManager);// 创建音频加载器
        const listener = new THREE.AudioListener();
        this.perspectiveCamera.add(listener);

        this.step1 = new THREE.Audio(listener);
        this.step2 = new THREE.Audio(listener);

        audioLoader.load('./yuka/audio/step1.ogg',buffer=> this.step1.setBuffer(buffer));
        audioLoader.load('./yuka/audio/step2.ogg',buffer=> this.step2.setBuffer(buffer));

        const gltfLoader = new GLTFLoader(loadingManager);
        gltfLoader.load('./yuka/firstperson/model/house.glb',gltf=>{
            // 添加到场景
            this.scene.add(gltf.scene);
            gltf.scene.traverse(object=>{
                if(object.isMesh) object.material.alphaTest = 0.5;
            });
        });

        // 创建渲染器
        this.renderer  = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this._options.dom.appendChild(this.renderer.domElement);

        //this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
        

        // 创建yuka
        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();

        this.player = new CustomPlayer();
        this.player.head.setRenderComponent(this.perspectiveCamera,this.sync.bind(this));
        this.player.position.set(-13,-10.75,9);

        this.entityManager.add(this.player);

    }
    sync(entity,renderComponent){

        renderComponent.matrix.copy(entity.worldMatrix);
        renderComponent.matrix.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);
    }
    animate(){
        const delta = this.yukaTime.update().getDelta();
        this.firstPersonControls.update(delta);
        this.entityManager.update(delta);

        this.renderer.render(this.scene,this.perspectiveCamera);
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }

}

class CustomEntity extends YUKA.GameEntity{
    constructor(){
        super();

        this.name = 'target';
        this.currentTime = 0;
        this.endTime = 0;
    }

    update(delta){
        this.currentTime += delta;
        if(this.currentTime >= this.endTime){
            this.generatePosition();
        }

        return super.update(delta);
    }

    generatePosition(){
        const radius = 4;// 和外面的sphere 保持一致
        const phi = Math.acos((2 * Math.random()) - 1);// Math.acos(-1<->1);
        const theta = Math.random() * Math.PI * 2;
        this.position.fromSpherical(radius,phi,theta);
        this.endTime += 3;// 3s
    }

    toJSON(){
        const json  = super.toJSON();
        // 自定义的属性也要保存进去
        json.currentTime = this.currentTime;
        json.endTime = this.endTime;
        return json;
    }

    fromJSON(json){
        super.fronJSON(json);//返序列化时间
        this.currentTime = json.currentTime;
        this.endTime = json.endTime;
        return this;
    }
}

class CustomVehicleJSON extends YUKA.Vehicle{
    constructor(){
        super();

        this.name = 'vehicle';
        this.target = null;
    }
    update(delta){
        const seekBehavior = this.steering.behaviors[0];
        seekBehavior.target.copy(this.target.position);
        return super.update(delta);
    }

    toJSON(){
        const json = super.toJSON();
        json.target = this.target.uuid;
        return json;
    }

    fromJSON(json){
        super.fromJSON(json);
        this.target = json.target;
        return this;
    }

    resolveReferences(entities){
        super.resolveReferences(entities);
        this.target = entities.get(this.target);
        return this;
    }
}

export class SaveAndReload{
    constructor(options={}){
        this._options = options;

        this.init();
    }

    init(){
        // 创建场景
        this.scene = new THREE.Scene();

        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,1000);
        this.perspectiveCamera.position.set(0,0,10);
        
        // 创建Cone
        const entityGeometry = new THREE.ConeGeometry(0.1,0.5,8);
        entityGeometry.rotateX(Math.PI * 0.5);
        const entityMaterial = new THREE.MeshNormalMaterial({});

        this.vehicleMesh = new THREE.Mesh(entityGeometry,entityMaterial);
        this.scene.add(this.vehicleMesh);
        this.vehicleMesh.name = 'vehicle';

        // 目标点
        const targetGeometry = new THREE.SphereGeometry(0.05);
        const targetMaterial = new THREE.MeshBasicMaterial({color:0xff0000});
        this.targetMesh = new THREE.Mesh(targetGeometry,targetMaterial);
        this.scene.add(this.targetMesh);
        this.targetMesh.name = 'target';

        // 
        const sphereGeometry = new THREE.SphereGeometry(4,32,32);
        const sphereMaterial = new THREE.MeshBasicMaterial({color:0xcccc,wireframe:true,transparent:true,opacity:0.2});
        const sphere = new THREE.Mesh(sphereGeometry,sphereMaterial);
        this.scene.add(sphere);
        sphere.name = "路网";

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this._options.dom.appendChild(this.renderer.domElement);
        this.renderer.setAnimationLoop(this.animate.bind(this));

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);


        const gui = new GUI({width:300});
        this.params={
            save:false,
            load:false,
            clear:false
        };
        gui.add(this.params,'save').onChange(value=>{
            // 保存
            console.log('保存:',value);
            const json = this.entityManager.toJSON();
            const jsonString = JSON.stringify(json);
            localStorage.setItem('yuka_savegame',jsonString);
        });
        gui.add(this.params,'load').onChange(value=>{
            console.log('加载:',value);
            const jsonString = localStorage.getItem('yuka_savegame');
            try{
                if(jsonString == null)
                    throw new Error('jsonString错误:');

                const json = JSON.parse(jsonString);
                this.entityManager.fromJSON(json);

                const target = this.entityManager.getEntityByName('target');
                target.setRenderComponent(this.targetMesh,this.sync.bind(this));

                const vehicle = this.entityManager.getEntityByName('vehicle');
                vehicle.setRenderComponent(this.vehicleMesh,this.sync.bind(this));
            }catch(e){
                console.log('异常:',e);
                this.onClear();
                window.location.reload();
            }
        });
        gui.add(this.params,'clear').onChange(value=>{
            console.log('清除:',value);
        });

        // 创建管理器 
        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();

        // 注册自定义类型，让EntityManager 可以实例化
        this.entityManager.registerType('CustomEntity',CustomEntity);
        this.entityManager.registerType('CustomVehicleJSON',CustomVehicleJSON);
        
        if(this.hasSavegame()){
            this.onLoad();
        }else{
            // 保存
            const target = new CustomEntity();
            target.setRenderComponent(this.targetMesh,this.sync.bind(this));
            target.generatePosition();

            const vehicle = new CustomVehicleJSON();
            vehicle.target = target;
            vehicle.setRenderComponent(this.vehicleMesh,this.sync.bind(this));

            // 添加
            const seekBehavior = new YUKA.SeekBehavior(target.position);
            vehicle.steering.add(seekBehavior);

            this.entityManager.add(target);
            this.entityManager.add(vehicle);
        }
    }
    hasSavegame(){
        return localStorage.getItem('yuka_savegame') !== null;
    }
    onClear(){
        localStorage.removeItem('yuka_savegame');
    }
    sync(entity,renderComponent){
        renderComponent.matrix.copy(entity.worldMatrix);
        renderComponent.matrix.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);
    }
    animate(){
        this.yukaTime.update();
        const delta = this.yukaTime.getDelta();
        this.entityManager.update(delta);

        this.renderer.render(this.scene,this.perspectiveCamera);
    }
    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

class CustomTrigger extends YUKA.Trigger{
    constructor(triggerRegion){
        super(triggerRegion);
    }
    check(entity){
        // 每一帧都被调用
        console.log(entity)
    }
    execute(entity){
        super.execute();
        entity._renderComponent.material.color.set(0x00ff00);
    }
}

/**
 * 触发器
 */
export class YukaTrigger{
    constructor(options={}){
        this._options = options;

        this.init();
    }

    init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfcfdfd);

        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,1000);
        this.perspectiveCamera.position.set(0,10,15);

        const entityGeometry = new THREE.BoxGeometry(0.5,0.5,0.5);
        const entityMaterial = new THREE.MeshBasicMaterial({color:0xff0000});
        const entityMesh = new THREE.Mesh(entityGeometry,entityMaterial);
        this.scene.add(entityMesh);

        const grid = new THREE.GridHelper(10,25);
        this.scene.add(grid);

        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();

        this.entity = new YUKA.GameEntity();
        this.entity.boundingRadius = 0.25;
        this.entity.setRenderComponent(entityMesh,this.sync.bind(this));
        this.entityManager.add(this.entity);

        // 创建障碍区域
        const radius = 2;
        const size = new YUKA.Vector3(3,3,3);
        const sphericalTriggerRegion = new YUKA.SphericalTriggerRegion(radius);
        const rectangularTriggerRegion = new YUKA.RectangularTriggerRegion(size);

        // 创建触发器
        const triggerSpherical = new CustomTrigger(sphericalTriggerRegion);// 球形触发器
        triggerSpherical.position.set(3,0,0);

        const triggerRectangular = new CustomTrigger(rectangularTriggerRegion);
        triggerRectangular.position.set(-3,0,0);

        this.entityManager.add(triggerSpherical);
        this.entityManager.add(triggerRectangular);

        // 可视化触发器
        const sphereGeometry = new THREE.SphereGeometry(radius,16,16);
        const sphereMaterial = new THREE.MeshBasicMaterial({color:0x6083c2,wireframe:true,transparent:true});
        const triggerSphereMesh = new THREE.Mesh(sphereGeometry,sphereMaterial);
        this.scene.add(triggerSphereMesh);

        triggerSpherical.setRenderComponent(triggerSphereMesh,this.sync.bind(this));

        const boxGeometry = new THREE.BoxGeometry(size.x,size.y,size.z);
        const boxMaterial = new THREE.MeshBasicMaterial({color:0x6083c2,wireframe:true,transparent:true});
        const triggerRectMesh = new THREE.Mesh(boxGeometry,boxMaterial);
        this.scene.add(triggerRectMesh);
        triggerRectangular.setRenderComponent(triggerRectMesh,this.sync.bind(this));

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        this._options.dom.appendChild(this.renderer.domElement);

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

    }

    animate(){
        const delta = this.yukaTime.update().getDelta();
        const elapsedTime = this.yukaTime.getElapsed();

        this.entity.position.x = Math.sin(elapsedTime) * 2;
        this.entity._renderComponent.material.color.set(0xff0000);

        this.entityManager.update(delta);

        this.renderer.render(this.scene,this.perspectiveCamera);
    }
    sync(entity,renderComponent){
        renderComponent.matrixWorld.copy(entity.worldMatrix);
        renderComponent.matrixWorld.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);
    }
    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth/window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);

    }
}
class MyObstacle extends YUKA.GameEntity{
    constructor(geometry = new YUKA.MeshGeometry()){
        super();

        this.geometry = geometry;
    }

    lineOfSightTest(ray,intersectionPoint){
        return this.geometry.intersectRay(ray,this.worldMatrix,true,intersectionPoint);

    }
}
function createVisionHelper(vision,division=8){
    const fieldOfView = vision.fieldOfView;
    const range = vision.range;

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshBasicMaterial({wireframe:true});
    const mesh = new THREE.Mesh(geometry,material);
    const positions = [];

    const foV05 = fieldOfView /2;// 视角除2=45°
    const step = fieldOfView / division;// 分成8份，每份的度数值
    // 创建XZ平面的辅助线，-45 +45=> -45 + 12,-45+24,-45+36....
    for(let i = -foV05;i < foV05;i+= step){
        positions.push(0,0,0);
        positions.push(Math.sin(i) * range,0,Math.cos(i) * range);
        positions.push(Math.sin(i + step) * range,0,Math.cos(i + step) * range);// 总共是三个点
    }

    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    return mesh;
}
/**
 * 射线检测
 */
export class LineOfSight{
    constructor(options={}){
        this._options = options;

        this.init();
    }

    init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffcfdf);

        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,1000);
        this.perspectiveCamera.position.set(0,5,10);

        // 发射点
        const entityGeometry = new THREE.ConeGeometry(0.1,0.5,8);
        entityGeometry.rotateX(Math.PI * 0.5);
        const entityMaterial = new THREE.MeshNormalMaterial({});
        const entityMesh = new THREE.Mesh(entityGeometry,entityMaterial);
        this.scene.add(entityMesh);

        // 障碍平面
        const obstacleGeometry = new THREE.PlaneGeometry(2,2,5,5);
        /***************************
         * THREE.PlaneGeometry 默认情况下是面向正 Z 轴的，即其法线方向指向 Z 轴的正方向。
         * 这意味着当你从正 Z 轴方向观察时，平面是面向你的。
         * 然而，在许多场景中，我们可能希望平面面向负 Z 轴方向（即朝向相机方向）。
         * 通过旋转 180 度，可以将平面翻转过来
         */
		obstacleGeometry.rotateY( Math.PI );

        const obstacleMaterial = new THREE.MeshBasicMaterial({color:0x777777,side:THREE.DoubleSide,wireframe:true});
        const obstacleMesh = new THREE.Mesh(obstacleGeometry,obstacleMaterial);
        this.scene.add(obstacleMesh);

        // 目标点
        const targetGeometry = new THREE.SphereGeometry(0.05);
        this.targetMaterial = new THREE.MeshBasicMaterial({color:0xdcdcdc});
        const targetMesh = new THREE.Mesh(targetGeometry,this.targetMaterial);
        this.scene.add(targetMesh);

        // 创建网格
        const grid = new THREE.GridHelper(10,25);
        this.scene.add(grid);

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this._options.dom.appendChild(this.renderer.domElement);

        // 创建YUKA
        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();

        
        const vertices = obstacleGeometry.attributes.position.array;
        const indices  = obstacleGeometry.index.array;
        const geometry = new YUKA.MeshGeometry(vertices,indices); 
        const obstacle = new MyObstacle(geometry);// 其实是GameEntity
        obstacle.position.z = 3;
        obstacle.setRenderComponent(obstacleMesh,this.sync.bind(this));

        this.target = new YUKA.GameEntity();
        this.target.setRenderComponent(targetMesh,this.sync.bind(this));

        this.entity = new YUKA.GameEntity();
        this.entity.setRenderComponent(entityMesh,this.sync.bind(this));

        const vision = new YUKA.Vision(this.entity);// Class for representing the vision component of a game entity.
        vision.range = 5;//
        vision.fieldOfView = Math.PI * 0.5;
        vision.addObstacle(obstacle);
        this.entity.vision = vision;

        // 创建辅助线
        const helper = createVisionHelper(vision);
        entityMesh.add(helper);
        
        this.entityManager.add(this.entity);
        this.entityManager.add(obstacle);
        this.entityManager.add(this.target);

        this.renderer.setAnimationLoop(this.animate.bind(this));
        this.scene.add(new THREE.AxesHelper(100));
    }

    animate(){
        const delta= this.yukaTime.update().getDelta();
        const elapsedTime = this.yukaTime.getElapsed();

        // 目标可见的时候改变成绿色
        this.target.position.set(Math.sin(elapsedTime * 0.5) * 4,0,4);

        if(this.entity.vision.visible(this.target.position) === true){
            this.targetMaterial.color.set(0x00ff00);
        }else{
            this.targetMaterial.color.set(0xff0000);
        }
        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);


        this.entityManager.update(delta);
        this.renderer.render(this.scene,this.perspectiveCamera);
    }
    sync(entity,renderComponent){
        renderComponent.matrixWorld.copy(entity.worldMatrix);
        renderComponent.matrixWorld.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);
    }
    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth , window.innerHeight);

    }
}

class CustomEntityV extends YUKA.GameEntity{
    constructor(){
        super();

        this.memorySystem = new YUKA.MemorySystem();
        this.memorySystem.memorySpan = 3;// Represents the duration of the game entities short term memory in seconds. When a bot requests a list of all recently sensed game entities, this value is used to determine if the bot is able to remember a game entity or not.

        this.vision = new YUKA.Vision(this);
        this.vision.range = 5;// 可见范围
        this.vision.fieldOfView = Math.PI * 0.5;// 90 弧度

        this.maxTurnRate = Math.PI * 0.5;
        this.currentTime = 0;
        this.memoryRecords = new Array();
        this.target = null;
    }

    start(){
        const target = this.manager.getEntityByName('target');
        const obstacle = this.manager.getEntityByName('obstacle');
        this.target = target;
        this.vision.addObstacle(obstacle);
        return this;
    }

    update(delta){
        this.currentTime += delta;
        this.updateVision();

        this.memorySystem.getValidMemoryRecords(this.currentTime,this.memoryRecords);
        if(this.memoryRecords.length > 0){
            const record = this.memoryRecords[0];
            const entity = record.entity;

            if(record.visible === true){
                this.rotateTo(entity.position,delta);// 起点游戏实体对象进行旋转
                entity._renderComponent.material.color.set(0x00ff00);
            }else{
                // timeLastSensed :Records the time the entity was last sensed (e.g. seen or heard). Used to determine if a game entity can "remember" this record or not.
                if(record.timeLastSensed !== -1){
                    this.rotateTo(record.lastSensedPosition,delta);
                    entity._renderComponent.material.color.set(0xff0000);
                }
            }
        }else{
            this.rotateTo(this.forward,delta);
        }

        return this;
    }

    updateVision(){
        const memorySystem = this.memorySystem;
        const vision = this.vision;
        const target = this.target;
        // 是否有记录
        if(memorySystem.hasRecord(target) === false){
            memorySystem.createRecord(target);
        }

        const record = memorySystem.getRecord(target);
        if(vision.visible(target.position) === true){
            record.timeLastSensed = this.currentTime;// 当起点可见目标点时，记录当前的时间
            record.lastSensedPosition.copy(target.position);// 记录最近可见时的位置
            record.visible = true;// 并设置为可见
        }else{
            record.visible = false;
        }
    }
}

export class UseMemorySystem{
    constructor(options={}){
        this._options = options;
        this.init();
    }

    init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xfdcccc);

        this.perspectiveCamera = new THREE.PerspectiveCamera(40,window.innerWidth / window.innerHeight,0.01,1000);
        this.perspectiveCamera.position.set(0,10,10);

        // 原点
        const entityGeometry = new THREE.ConeGeometry(0.1,0.5,8);
        entityGeometry.rotateX(Math.PI * 0.5);
        const entityMaterial = new THREE.MeshNormalMaterial();
        const entityMesh = new THREE.Mesh(entityGeometry,entityMaterial);
        this.scene.add(entityMesh);
        entityMesh.name = 'begin';

        // 障碍物平面
        const obstacleGeometry = new THREE.PlaneGeometry(2,2,5,5);
        obstacleGeometry.rotateY(Math.PI);
        const obstacleMaterial = new THREE.MeshBasicMaterial({color:0x777777,side:THREE.DoubleSide});
        const obstacleMesh = new THREE.Mesh(obstacleGeometry,obstacleMaterial);
        this.scene.add(obstacleMesh);

        // 创建目标点
        const targetGeometry = new THREE.SphereGeometry(0.05);
        const targetMaterial = new THREE.MeshBasicMaterial({color:0xff0000});
        const targetMesh = new THREE.Mesh(targetGeometry,targetMaterial);
        this.scene.add(targetMesh);

        // 创建地面网格
        this.scene.add(new THREE.GridHelper(10,25));

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this._options.dom.appendChild(this.renderer.domElement);

        // 创建entityManager 管理器
        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();

        const vertices = obstacleGeometry.attributes.position.array;
        const indices = obstacleGeometry.index.array;
        const geometry = new YUKA.MeshGeometry(vertices,indices);

        // 障碍物-平面
        const obstacle = new MyObstacle(geometry);
        obstacle.name = 'obstacle';
        obstacle.position.z = 3;
        obstacle.setRenderComponent(obstacleMesh,this.sync.bind(this));

        // 目标点
        this.target = new YUKA.GameEntity();
        this.target.name = 'target';
        this.target.setRenderComponent(targetMesh,this.sync.bind(this));

        /**
         * 对原点对象重载对应的游戏实体，设置该实体的视角及可视化逻辑
         */
        const entity = new CustomEntityV();
        entity.setRenderComponent(entityMesh,this.sync.bind(this));

        const helper = createVisionHelper(entity.vision);
        entityMesh.add(helper);

        this.entityManager.add(entity);
        this.entityManager.add(obstacle);
        this.entityManager.add(this.target);

        this.renderer.setAnimationLoop(this.animate.bind(this));

        this.scene.add(new THREE.AxesHelper(100));
        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

    }

    animate(){
        const delta = this.yukaTime.update().getDelta();
        const elapsed = this.yukaTime.update().getElapsed();
        
        this.target.position.set(Math.sin(elapsed * 0.3) * 5 ,0,4);
        this.entityManager.update(delta);
        this.renderer.render(this.scene,this.perspectiveCamera);

    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth , window.innerHeight);
    }
    sync(entity,renderComponent){
        renderComponent.matrixWorld.copy(entity.worldMatrix);
        renderComponent.matrixWorld.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);
    }
}

/**
 * 模拟转向
 */
export class UseSteering{
    constructor(options={}){
        this._options = options;
        this.radius = 2;
        this.init();
    }
    init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xdddddd);

        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,1000);
        this.perspectiveCamera.position.set(0,0,10);

        // 代替汽车的几何体对象
        const vehicleGeometry = new THREE.ConeGeometry(0.1,0.5,8);
        vehicleGeometry.rotateX(Math.PI * 0.5);
        const vehicleMaterial = new THREE.MeshNormalMaterial();
        const vehicleMesh = new THREE.Mesh(vehicleGeometry,vehicleMaterial);
        this.scene.add(vehicleMesh);

        // 创建目标点
        const targetGeometry = new THREE.SphereGeometry(0.05);
        const targetMaterial = new THREE.MeshBasicMaterial({color:0xff0000});
        const targetMesh = new THREE.Mesh(targetGeometry,targetMaterial);
        this.scene.add(targetMesh);

        //创建一个大球体，当作路网数据
        const sphereGeometry = new THREE.SphereGeometry(this.radius,32,32);
        const sphereMaterial = new THREE.MeshBasicMaterial({color:0xcccccc,wireframe:true,opacity:0.8,transparent:true});
        const sphere = new THREE.Mesh(sphereGeometry,sphereMaterial);
        this.scene.add(sphere);

        // renderer
        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this._options.dom.appendChild(this.renderer.domElement);
        
        //创建yuka
        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();

        this.target = new YUKA.GameEntity();
        this.target.setRenderComponent(targetMesh,this.sync.bind(this));

        this.vehicle = new YUKA.Vehicle();
        this.vehicle.setRenderComponent(vehicleMesh,this.sync.bind(this));
        this.generatePosition();

        // 创建arriveBehavior 行为，不像seek 直接到达，arraive 会减速到达
        const arriveBehavior = new YUKA.ArriveBehavior(this.target.position,2.5,0.1);
        this.vehicle.steering.add(arriveBehavior);

        // 添加转向行为 //////////////////////////////////////////////
        // flee 逃离行为
        const fleeBehavior = new YUKA.FleeBehavior(this.target.position,5);
        this.vehicle.steering.add(fleeBehavior);


        //////////////////////////////////////////////////////////
        this.entityManager.add(this.target);
        this.entityManager.add(this.vehicle);

        // 生成随机位置
        setInterval(()=>{
            this.generatePosition();
        },10000);

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

        this.renderer.setAnimationLoop(this.animate.bind(this));
    }

    generatePosition(){
        const phi = Math.acos((2 * Math.random()) - 1);
        const theta = Math.random() * Math.PI * 2;

        this.target.position.fromSpherical(this.radius,phi,theta);

        // 想实现当vehicle 到达目标点之后2s之后再改变位置
    }
    sync(entity,renderComponent){
        renderComponent.matrixWorld.copy(entity.worldMatrix);
        renderComponent.matrixWorld.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);
    }
    animate(){
        const delta = this.yukaTime.update().getDelta();
        this.entityManager.update(delta);

        this.renderer.render(this.scene,this.perspectiveCamera);
    }
    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth , window.innerHeight);
    }
}

/**
 * 使用多个转向，
 */
export class UseMoreCohesionSteering{
    constructor(options={}){
        this._options = options;
        this.params = {
            alignment:1,
            cohesion:0.9,
            separation:0.3,
            followParams:{
                onPathActive:true,
                radius:0.1,
                nextWaypointDistance:0.5,
            }
        };

        this.init();
    }

    init(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xdddddd);

        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.01,1000);
        this.perspectiveCamera.position.set(0,75,0);

        // 创建vehicle 几何体
        const vehicleGeometry = new THREE.ConeGeometry(0.1,0.5,8);
        vehicleGeometry.rotateX(Math.PI * 0.5);
        const vehicleMaterial = new THREE.MeshNormalMaterial();

        const grid = new THREE.GridHelper(100,50);
        this.scene.add(grid);

        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();

        // 创建对齐行为
        const alignmentBehavior = new YUKA.AlignmentBehavior();
        const cohesionBehavior = new YUKA.CohesionBehavior();// 靠近质心
        const separationBehavior = new YUKA.SeparationBehavior();// 分割
        alignmentBehavior.weight = this.params.alignment;
        cohesionBehavior.weight = this.params.cohesion;
        separationBehavior.weight = this.params.separation;

        for(let i =0; i < 50;i++){
            const vehicleMesh = new THREE.Mesh(vehicleGeometry,vehicleMaterial);
            this.scene.add(vehicleMesh);

            const vehicle = new YUKA.Vehicle();
            vehicle.maxSpeed = 1.5;
            vehicle.updateNeighborhood = true;
            vehicle.neighborhoodRadius = 10;
            vehicle.rotation.fromEuler(0,Math.PI * Math.random(),0);
            vehicle.position.x = 10 - Math.random() * 20;
            vehicle.position.z = 10 - Math.random() * 20;

            vehicle.setRenderComponent(vehicleMesh,this.sync.bind(this));

            vehicle.steering.add(alignmentBehavior);
            vehicle.steering.add(cohesionBehavior);
            vehicle.steering.add(separationBehavior);

            const wanderBehavior = new YUKA.WanderBehavior();
            wanderBehavior.weight = 0.5;
            vehicle.steering.add(wanderBehavior);

            this.entityManager.add(vehicle);

        }
        this.initFollowPathBehavior();
        this.initInterposeBehavior();
        this.initObstacleAvoidanceBehavior();// 避开障碍物行为
        this.initOffsetPursuitBehavior();// 与领头的保持固定的距离
        this.initPursuitBehavior();// 追击行为
        this.initWanderBehavior();// 随机漫游行为


        const gui = new GUI({width:300});
        gui.add(this.params,'alignment',0.1,10).name('对齐').onChange(value=>{
            alignmentBehavior.weight = value;
        });
        gui.add(this.params,'cohesion',0.1,10).name('cohesion').onChange(value=>{
            cohesionBehavior.weight = value;
        });
        gui.add(this.params,'separation',0.1,10).name('separation').onChange(value=>{
            separationBehavior.weight = value;
        });
        // followBehavior
        gui.add(this.params.followParams,'onPathActive').name('activate onPath').onChange(value=>{
            this.onPathBehavior.active = value;
        });
        gui.add(this.params.followParams,'radius',0.01,10).name('radius').onChange(value=>{
            this.onPathBehavior.radius = value;
        });
        gui.add(this.params.followParams,'nextWaypointDistance',0.1,10).name('nextWaypointDistance').onChange(value=>{
            this.followPathBehavior.nextWaypointDistance = value;
        });

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        this._options.dom.appendChild(this.renderer.domElement);
        
        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
        this.orbitControls.mouseButtons.LEFT = THREE.MOUSE.PAN;// 改变鼠标左键
    }
    initFollowPathBehavior(){
        const geometry = new THREE.ConeGeometry(0.2,0.5,8);
        const material = new THREE.MeshBasicMaterial({color:0x996699,side:THREE.DoubleSide});
        const mesh = new THREE.Mesh(geometry,material);
        mesh.name = 'vehicle';
        this.scene.add(mesh);
        // 创建路线
        const path = new YUKA.Path();
        path.loop = true;
        	path.add( new YUKA.Vector3( - 14, 10, 14 ) );
			path.add( new YUKA.Vector3( - 16, -10, 20 ) );
			path.add( new YUKA.Vector3( - 14, -10, - 42 ) );
			path.add( new YUKA.Vector3( 0, 0, 0 ) );
			path.add( new YUKA.Vector3( 14, 0, - 14 ) );
			path.add( new YUKA.Vector3( 16, 0, 0 ) );
			path.add( new YUKA.Vector3( 14, 0, 14 ) );
			path.add( new YUKA.Vector3( 0, 0, 16 ) );
            const vehicle = new YUKA.Vehicle();
            vehicle.position.copy(path.current());
        vehicle.setRenderComponent(mesh,this.sync.bind(this));
        this.followPathBehavior = new YUKA.FollowPathBehavior(path,this.params.followParams.nextWaypointDistance);
        vehicle.steering.add(this.followPathBehavior);

        // onPathBehavior
        this.onPathBehavior = new YUKA.OnPathBehavior(path);
        vehicle.steering.add(this.onPathBehavior);
        this.entityManager.add(vehicle);

        this.__createLines(path);

    }
    __createLines(path){
         const position = [];

			for ( let i = 0; i < path._waypoints.length; i ++ ) {

				const waypoint = path._waypoints[ i ];

				position.push( waypoint.x, waypoint.y, waypoint.z );

			}

			const lineGeometry = new THREE.BufferGeometry();
			lineGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( position, 3 ) );

			const lineMaterial = new THREE.LineBasicMaterial( { color: 0x663333 } );
			const lines = new THREE.LineLoop( lineGeometry, lineMaterial );
			this.scene.add( lines );
    }
    /**
     * 靠近两点的中间点
     */
    initInterposeBehavior(){
            // pursuer 追捕手
			const pursuerGeometry = new THREE.ConeGeometry( 0.2, 1, 8 );
			pursuerGeometry.rotateX( Math.PI * 0.5 );
			const pursuerMaterial = new THREE.MeshNormalMaterial();

			const pursuerMesh = new THREE.Mesh( pursuerGeometry, pursuerMaterial );
			this.scene.add( pursuerMesh );

            // 两点
            const targetGeometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
			const targetMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

			const entityMesh1 = new THREE.Mesh( targetGeometry, targetMaterial );
			this.scene.add( entityMesh1 );

			const entityMesh2 = new THREE.Mesh( targetGeometry, targetMaterial );
			this.scene.add( entityMesh2 );
            // 创建两点之间的连线
            const lineGeometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3(), new THREE.Vector3() ] );
			const lineMaterial = new THREE.LineBasicMaterial( { color: 0xff0000 } );
			this.line = new THREE.Line( lineGeometry, lineMaterial );
			this.scene.add( this.line );
            this.line.name = 'line';

            // 创建目标坐标，就是两点对应的值
            this.target1Position = new YUKA.Vector3();
			this.target2Position = new YUKA.Vector3();
            // 对应两个点
			this.entity1 = new YUKA.Vehicle();
			this.entity1.maxSpeed = 2;
			this.entity1.setRenderComponent( entityMesh1, this.sync.bind(this) );

            // 创建搜索行为
			const seekBehavior1 = new YUKA.SeekBehavior( this.target1Position );
			this.entity1.steering.add( seekBehavior1 );

			this.entity2 = new YUKA.Vehicle();
			this.entity2.maxSpeed = 2;
			this.entity2.setRenderComponent( entityMesh2, this.sync.bind(this) );

			const seekBehavior2 = new YUKA.SeekBehavior( this.target2Position );
			this.entity2.steering.add( seekBehavior2 );

			this.pursuer = new YUKA.Vehicle();
			this.pursuer.maxSpeed = 3;
			this.pursuer.setRenderComponent( pursuerMesh, this.sync.bind(this) );

			const interposeBehavior = new YUKA.InterposeBehavior( this.entity1, this.entity2, 1 );
			this.pursuer.steering.add( interposeBehavior );

			this.entityManager.add( this.entity1 );
			this.entityManager.add( this.entity2 );
			this.entityManager.add( this.pursuer );

    }
    initObstacleAvoidanceBehavior(){
        this.obstacles =[];
        	const vehicleGeometry = new THREE.ConeGeometry( 0.5, 2, 8 );
			vehicleGeometry.rotateX( Math.PI * 0.5 );
			vehicleGeometry.computeBoundingSphere();// 计算包围球大小
			const vehicleMaterial = new THREE.MeshNormalMaterial();

			const vehicleMesh = new THREE.Mesh( vehicleGeometry, vehicleMaterial );
			this.scene.add( vehicleMesh );
            // 创建要更随的路线
            const path = new YUKA.Path();
			path.loop = true;
			path.add( new YUKA.Vector3( 10, 0, 10 ) );
			path.add( new YUKA.Vector3( 10, 0, - 10 ) );
			path.add( new YUKA.Vector3( - 10, 0, - 10 ) );
			path.add( new YUKA.Vector3( - 10, 0, 10 ) );
            //console.log('path:',path)
			const vehicle = new YUKA.Vehicle();
			vehicle.maxSpeed = 3;
			vehicle.setRenderComponent( vehicleMesh, this.sync.bind(this) );

			vehicle.boundingRadius = vehicleGeometry.boundingSphere.radius;
			vehicle.smoother = new YUKA.Smoother( 20 );

			this.entityManager.add( vehicle );
            // 创建obstacle
            this.createObstacles();

			const obstacleAvoidanceBehavior = new YUKA.ObstacleAvoidanceBehavior( this.obstacles );
			vehicle.steering.add( obstacleAvoidanceBehavior );

			const followPathBehavior = new YUKA.FollowPathBehavior( path );
			vehicle.steering.add( followPathBehavior );

			// 
            this.__createLines(path);

    }
    createObstacles(){
        const geometry = new THREE.BoxGeometry( 2, 2, 2 );
			geometry.computeBoundingSphere();
			const material = new THREE.MeshPhongMaterial( { color: 0xff0000 } );

			const mesh1 = new THREE.Mesh( geometry, material );
			const mesh2 = new THREE.Mesh( geometry, material );
			const mesh3 = new THREE.Mesh( geometry, material );

			mesh1.position.set( - 10, 0, 0 );
			mesh2.position.set( 12, 0, 0 );
			mesh3.position.set( 4, 0, - 10 );

			this.scene.add( mesh1 );
			this.scene.add( mesh2 );
			this.scene.add( mesh3 );

			const obstacle1 = new YUKA.GameEntity();
			obstacle1.position.copy( mesh1.position );
			obstacle1.boundingRadius = geometry.boundingSphere.radius;
			this.entityManager.add( obstacle1 );
			this.obstacles.push( obstacle1 );

			const obstacle2 = new YUKA.GameEntity();
			obstacle2.position.copy( mesh2.position );
			obstacle2.boundingRadius = geometry.boundingSphere.radius;
			this.entityManager.add( obstacle2 );
			this.obstacles.push( obstacle2 );

			const obstacle3 = new YUKA.GameEntity();
			obstacle3.position.copy( mesh3.position );
			obstacle3.boundingRadius = geometry.boundingSphere.radius;
			this.entityManager.add( obstacle3 );
			this.obstacles.push( obstacle3 );
    }
    initOffsetPursuitBehavior(){
        // 创建领头的几何体
			const vehicleGeometry = new THREE.ConeGeometry( 0.2, 1, 8 );
			vehicleGeometry.rotateX( Math.PI * 0.5 );
			const vehicleMaterial = new THREE.MeshNormalMaterial();

			const leaderMesh = new THREE.Mesh( vehicleGeometry, vehicleMaterial );
			this.scene.add( leaderMesh );
        // 创建跟随的几何体
			const followerMeshTemplate = new THREE.Mesh( vehicleGeometry, vehicleMaterial );
        //    
        this.targetOfLoader = new YUKA.Vector3();

			// leader 领头的

			const leader = new YUKA.Vehicle();
			leader.setRenderComponent( leaderMesh, this.sync.bind(this) );
            // 
			const seekBehavior = new YUKA.SeekBehavior( this.targetOfLoader );
			leader.steering.add( seekBehavior );

			this.entityManager.add( leader );
            // 定义偏移值
            const offsets = [
				new YUKA.Vector3( 0.5, 0, - 0.5 ),
				new YUKA.Vector3( - 0.5, 0, - 0.5 ),
				new YUKA.Vector3( 1.5, 0, - 1.5 ),
				new YUKA.Vector3( - 1.5, 0, - 1.5 )
			];

			for ( let i = 0; i < 4; i ++ ) {

				const followerMesh = followerMeshTemplate.clone();
				this.scene.add( followerMesh );
                followerMesh.name = 'followMesh';

				const follower = new YUKA.Vehicle();
				follower.maxSpeed = 2;
				follower.position.copy( offsets[ i ] ); // initial position
				follower.scale.set( 0.5, 0.5, 0.5 ); // make the followers a bit smaller
				follower.setRenderComponent( followerMesh, this.sync.bind(this) );
                // 设置领头的对象
				const offsetPursuitBehavior = new YUKA.OffsetPursuitBehavior( leader, offsets[ i ] );
				follower.steering.add( offsetPursuitBehavior );

				this.entityManager.add( follower );

			}
    }
    initPursuitBehavior(){

			const pursuerGeometry = new THREE.ConeGeometry( 0.2, 1, 8 );
			pursuerGeometry.rotateX( Math.PI * 0.5 );
			const pursuerMaterial = new THREE.MeshNormalMaterial();

			const pursuerMesh = new THREE.Mesh( pursuerGeometry, pursuerMaterial );
			this.scene.add( pursuerMesh );
        // evader 逃避着
			const evaderGeometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
			const evaderMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

			const evaderMesh = new THREE.Mesh( evaderGeometry, evaderMaterial );
			this.scene.add( evaderMesh );
        // 设置目标点
            this.targetOfPursuit = new YUKA.Vector3();
        // 逃避对象
			const evader = new YUKA.Vehicle();
			evader.maxSpeed = 3;
			evader.setRenderComponent( evaderMesh, this.sync.bind(this) );

			const pursuer = new YUKA.Vehicle();
			pursuer.maxSpeed = 3;
			pursuer.position.z = - 5;
			pursuer.setRenderComponent( pursuerMesh, this.sync.bind(this) );

			const pursuitBehavior = new YUKA.PursuitBehavior( evader, 2 );
			pursuer.steering.add( pursuitBehavior );

			const seekBehavior = new YUKA.SeekBehavior( this.targetOfPursuit );
			evader.steering.add( seekBehavior );

			this.entityManager.add( evader );
			this.entityManager.add( pursuer );

    }
    initWanderBehavior(){
        const vehicleGeometry = new THREE.ConeGeometry( 1, 5, 8 );
			vehicleGeometry.rotateX( Math.PI * 0.5 );
			const vehicleMaterial = new THREE.MeshNormalMaterial();

			for ( let i = 0; i < 50; i ++ ) {

				const vehicleMesh = new THREE.Mesh( vehicleGeometry, vehicleMaterial );
				this.scene.add( vehicleMesh );

				const vehicle = new YUKA.Vehicle();
				vehicle.rotation.fromEuler( 0, 2 * Math.PI * Math.random(), 0 );
				vehicle.position.x = 2.5 - Math.random() * 5;
				vehicle.position.z = 2.5 - Math.random() * 5;
				vehicle.setRenderComponent( vehicleMesh, this.sync.bind(this) );

				const wanderBehavior = new YUKA.WanderBehavior();
				vehicle.steering.add( wanderBehavior );

				this.entityManager.add( vehicle );

			}
    }
    sync(entity,renderComponent){
        renderComponent.matrix.copy(entity.worldMatrix);
        renderComponent.matrix.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);

    }
    animate(){
        const delta = this.yukaTime.update().getDelta();
        this.entityManager.update(delta);

        const elapsedTime = this.yukaTime.update().getElapsed();
        // 更新目标点的位置
		this.target1Position.x = Math.cos( elapsedTime * 0.1 ) * Math.sin( elapsedTime * 0.1 ) * 6;
		this.target1Position.z = Math.sin( elapsedTime * 0.3 ) * 6;

		this.target2Position.x = 1 + Math.cos( elapsedTime * 0.5 ) * Math.sin( elapsedTime * 0.3 ) * 4;
		this.target2Position.z = 1 + Math.sin( elapsedTime * 0.3 ) * 6;

			// 更新领头的目的地点位
            this.targetOfLoader.z = Math.cos( elapsedTime * 0.2 ) * 15;
			this.targetOfLoader.x = Math.sin( elapsedTime * 0.2 ) * 15;


			// update line helper 更新线

			const positionAttribute = this.line.geometry.attributes.position;

			let position = this.entity1.position;
			positionAttribute.setXYZ( 0, position.x, position.y, position.z );

			position = this.entity2.position;
			positionAttribute.setXYZ( 1, position.x, position.y, position.z );

			positionAttribute.needsUpdate = true;

			this.targetOfPursuit.z = Math.sin( elapsedTime * 0.8 ) * 16;
            this.targetOfPursuit.x = Math.cos( elapsedTime ) * Math.sin( elapsedTime * 0.2 ) * 16;

            
        this.renderer.render(this.scene,this.perspectiveCamera);
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

export class Blackjack{
    constructor(options={}){
        this._options = options;
        /**
         * Object.freeze() 静态方法可以使一个对象被冻结。冻结对象可以防止扩展，并使现有的属性不可写入和不可配置。
         * 被冻结的对象不能再被更改：不能添加新的属性，不能移除现有的属性，不能更改它们的可枚举性、可配置性、可写性或值，对象的原型也不能被重新指定。
         * freeze() 返回与传入的对象相同的对象。
         */
        this.players = Object.freeze({
            HUMAN:0,
            AI:1,
            DEALER:2
        });
        this.activePlayer = this.players.HUMAN;
        this.gameOver = false;
        this.deck = null;
        this.dealer = null;
        this.ai = null;
        this.human = null;

        this.humanWins = 0;
        this.aiWins = 0;

        this.init();
    }

    init(){
        // 创建卡牌
        this.deck = new Deck();
        // 洗牌
        this.deck.shuffle();
        // dealer 经销商；交易商；贸易商；毒品贩子；(纸牌游戏的)发牌者；贩毒者
        this.dealer = new Player();
        this.ai = new AI(this.dealer);
        this.human = new Player();

    }
    _windowResizeFun(){

    }
}

