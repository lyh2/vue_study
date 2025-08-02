import * as THREE from 'three';
import * as YUKA from 'yuka';
import AssetManager from './AssetManager.js';
import { showToast } from 'vant';
import GroundGameEntity from './GroundGameEntity.js';
import  BulletMovingEntity  from './BulletMovingEntity.js';
import PlayerMovingEntity from './PlayerMovingEntity.js';
import TargetGameEntity from './TargetGameEntity.js';
import CustomFirstPersonControls from './CustomFirstPersonControls.js';


// 全局变量
const target = new YUKA.Vector3();
const intersection ={
    point:new YUKA.Vector3(),
    normal:new YUKA.Vector3()
};
/**
 * YUKA 中的shooter 项目，就是打靶项目
 */
export default class World {
    static _instance = null;
    static getInstance(){
        return World._instance;
    }

    constructor(options={}){
        this._options = options;

        if(World._instance != null){
            throw new Error('请使用World.getInstance(),而不是new World()');
        }

        this.maxBulletHoles = 20;// 子弹打到墙上的孔洞个数

        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();

        /////////three.js
        this.perspectiveCamera = null;
        this.scene = null;
        this.renderer = null;
        this.audioMaps = new Map();
        this.animationMaps = new Map();

        this.player = null;
        this.controls = null;
        this.obstacles =new Array();// 障碍物数组
        this.bulletHoles = new Array();// 子弹的孔洞

        this.assetManager = new AssetManager();// 资源管理器

        
        this._onWindowResize = onWindowResizeFun.bind(this);
        this.init();
    }
    init(){
        this.assetManager.init().then(res=>{
            console.log('res:',res);
            World._instance = this;

            // 执行成功之后，隐藏加载图层 // 消除overlay
            this._options.isLoading.value = false;
            /////////////////////////////////////////////////////
            this._initScene();
            this._initGround();
            this._initPlayer();
            this._initControls();
            this._initTarget();
            this._initAnimate();
            /////////////////////////////////////////////////////
            // 换行时不截断单词
            showToast({
                title:'',
                message: 'Click to Play.',
                wordBreak: 'break-word',
                duration:0,
                closeOnClick:true,
                onClose:()=>{
                    this._options.isShowOverlay.value = false
                    //console.log('点击事件:',);
                    // 唤醒音乐
                    this.controls.connect();
                    const context = THREE.AudioContext.getContext();
                    if(context.state === 'suspended') context.resume();
                }
            });

        }).catch(error=>{
            console.log('执行失败:',error);
        });
        
    }

    _initScene(){
        // 创建相机
        this.perspectiveCamera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.1,200);
        this.perspectiveCamera.position.set(0,1,1);
        // 给相机添加音频监听
        this.perspectiveCamera.add(this.assetManager.listener);

        // audios
        this.audioMaps = this.assetManager.audioMaps;

        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xa0a0a0);
        this.scene.fog = new THREE.Fog(0xfdf,10,50);

        // lights
        const hemisphereLight = new THREE.HemisphereLight(0xffffcc,0x444444,1.2);
        hemisphereLight.position.set(0,100,0);
        this.scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xFF33CC,1.4);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.top  = 5;
        directionalLight.shadow.camera.bottom = -5;
        directionalLight.shadow.camera.left = -5;
        directionalLight.shadow.camera.right = 5;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 25;
        directionalLight.target.position.set(0,0,-25);
        this.scene.add(directionalLight,directionalLight.target);
        directionalLight.target.updateMatrixWorld();

        this.scene.add( new THREE.CameraHelper( directionalLight.shadow.camera ) );

        // renderer 
        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this._options.dom.appendChild(this.renderer.domElement);
        

        window.addEventListener('resize',onWindowResizeFun.bind(this),false);

    }
    // 创建地面，且把地面添加到障碍物数组了，为了当射击到地面时，留下单孔，比较真实
    _initGround(){
        const groundMesh = this.assetManager.modelMaps.get('ground');
        const vertices = groundMesh.geometry.attributes.position.array;
        const indices = groundMesh.geometry.index.array;
        const geometry = new YUKA.MeshGeometry(vertices,indices);
        const ground = new GroundGameEntity(geometry);
        ground.setRenderComponent(groundMesh,sync.bind(this));
        this.add(ground);
    }
    _initAnimate(){
        this.renderer.setAnimationLoop(this.animate.bind(this));

    }
    _initPlayer(){
        // 模拟人
        const player = new PlayerMovingEntity();
        //console.log('player:',player);
        player.head.setRenderComponent(this.perspectiveCamera,sync.bind(this));

        this.add(player);
        this.player = player;

        // weapon 武器
        const weapon = player.weapon;
        const weaponMesh = this.assetManager.modelMaps.get('weapon');// 枪的3D模型
        weapon.setRenderComponent(weaponMesh,sync.bind(this));
        this.scene.add(weaponMesh);


        weaponMesh.add(this.audioMaps.get('shoot'));
        weaponMesh.add(this.audioMaps.get('reload'));
        weaponMesh.add(this.audioMaps.get('empty'));

        this.mixer = new THREE.AnimationMixer(weapon);

        // 设置开枪和换子弹的动画
        const shootClip = this.assetManager.animationMaps.get('shoot');
        const shootAction = this.mixer.clipAction(shootClip);
        shootAction.loop = THREE.LoopOnce;

        this.animationMaps.set('shoot',shootAction);

        const reloadClip = this.assetManager.animationMaps.get('reload');
        const reloadAction = this.mixer.clipAction(reloadClip);
        reloadAction.loop = THREE.LoopOnce;

        this.animationMaps.set('reload',reloadAction);
    }
    _initControls(){
        const player = this.player;
        this.controls = new CustomFirstPersonControls(player);

        this.controls.addEventListener('lock',()=>{

        });
        this.controls.addEventListener('unlock',()=>{

        });

    }
    /**
     * 创建靶子，且把靶子添加到障碍物数组中去了
     */
    _initTarget(){
        const targetMesh = this.assetManager.modelMaps.get('target');
        const vertices = targetMesh.geometry.attributes.position.array;
        const indices = targetMesh.geometry.index.array;

        const geometry = new YUKA.MeshGeometry(vertices,indices);
        const target = new TargetGameEntity(geometry);
        target.position.set(0,3,-20);
        target.setRenderComponent(targetMesh,sync.bind(this));
        this.add(target);
    }
    add(entity){
        this.entityManager.add(entity);
        if(entity._renderComponent !== null){
            this.scene.add(entity._renderComponent);

        }

        if(entity.geometry){
            this.obstacles.push(entity);
        }
    }
    remove(entity){
        this.entityManager.remove(entity);
        if(entity._renderComponent !== null){
            //entity._renderComponent.geometry.dispose();
            this.scene.remove(entity._renderComponent);
        }

        if(entity.geometry){
            const index = this.obstacles.indexOf(entity);
            if(index !== -1) this.obstacles.splice(index,1);
        }
    }
    // 进行射线检测，返回被检测到的障碍物
    intersectRay(ray,intersectionPoint,normal=null){
        const obstacles = this.obstacles; // 
        let minDistance = Infinity;
        let closestObstacle = null;
        // 循环判断是否与障碍物发生碰撞
        for(let i =0; i < obstacles.length;i++){
            const obstacle = obstacles[i];
            if(obstacle.geometry.intersectRay(ray,obstacle.worldMatrix,false,intersection.point,intersection.normal) !== null){
                const squaredDistance = intersection.point.squaredDistanceTo(ray.origin);
                if(squaredDistance < minDistance){
                    minDistance = squaredDistance;
                    closestObstacle = obstacle;
                    // 把射线检测到交点返回回去
                    intersectionPoint.copy(intersection.point);
                    if(normal) normal.copy(intersection.normal);
                }
            }
        }
        return (closestObstacle === null) ? null : closestObstacle;
    }
    /**
     * 添加子弹
     * @param {*} owner  代表的是PlayerGameEntity 对象
     * @param {*} ray 从枪口到目标点的射线
     */
    addBullet(owner,ray){
        const bulletLine = this.assetManager.modelMaps.get('bulletLine').clone();
        const bulletEntity = new BulletMovingEntity(owner,ray);
        bulletEntity.setRenderComponent(bulletLine,sync.bind(this));
        this.add(bulletEntity);
    }
    // 添加弹孔效果
    addBulletHole(position,normal,audio){
        const bulletHole = this.assetManager.modelMaps.get('bulletHole').clone();
        bulletHole.add(audio);

        const s = 1 + (Math.random() * 1.5);
        bulletHole.scale.set(s,s,s); // 随机改变弹孔大小

        bulletHole.position.copy(position);// 设置弹孔的位置
        target.copy(position).add(normal); // 位置+法线
        bulletHole.updateMatrix();
        bulletHole.lookAt(target.x,target.y,target.z);
        bulletHole.updateMatrix();

        if(this.bulletHoles.length >= this.maxBulletHoles){
            const toRemove = this.bulletHoles.shift();
            this.scene.remove(toRemove);
        }

        this.bulletHoles.push(bulletHole);
        this.scene.add(bulletHole);
    }
    animate(){
        const delta = this.yukaTime.update().getDelta();
        this.controls.update(delta);// 
        this.entityManager.update(delta);
        if(this.mixer) this.mixer.update(delta);
        this.renderer.render(this.scene,this.perspectiveCamera); 
    }
} 

function sync(entity,renderComponent){
    renderComponent.matrix.copy(entity.worldMatrix);
    renderComponent.matrix.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);
}

function onWindowResizeFun(){
    //console.log('窗口发生改变:',this)
    this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth , window.innerHeight);
}

