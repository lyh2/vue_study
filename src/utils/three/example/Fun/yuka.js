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

}
/**
 * 模糊逻辑
 */
export class FuzzyLogic{
    constructor(options={}){
        this._options = options;
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

        // 加载士兵模型
        this.gltfLoader = new GLTFLoader(this.loadingManager);
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
            this.assaultRifle = 
        });
    }
    animate(){

    }
    /**
     * 同步YUKA数据到Three.js 对象上
     */
    sync(){

    }
    _windowResizeFun(){

    }
}