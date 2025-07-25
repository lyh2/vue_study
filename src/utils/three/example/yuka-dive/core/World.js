import * as THREE from "three";
import * as YUKA from "yuka";
import GameConfig from "./GameConfig";
import AssetManager from "./AssetManager";
import { showToast, closeToast } from "vant";
import Sky from "../effects/Sky";
import LevelGameEntity from "../entities/LevelGameEntity";
import NavMeshUtils from "../etc/NavMeshUtils";
import SpawningManager from "./SpawningManager";
import  SceneUtils  from "../etc/SceneUtils";
import PathPlanner from "../etc/PathPlanner";
import BulletExtendsProjectile from "../weapons/BulletExetndsProjectile";
import EnemyVehicle from "../entities/EnemyVehicle";
import PlayerMovingEntity from "../entities/PlayerMovingEntity";
import FirstPersonControls from "../controls/FirstPersonControls";
import { OrbitControls } from "three/examples/jsm/Addons";
import UIManager from "./UIManager";

// 定义全局变量
const currentIntersectionPoint = new YUKA.Vector3();

export default class World {
    static _instance = null;
    static _getInstance() {
        return World._instance;
    }
    constructor(options = {}) {
        this.options = options;

        // 实体管理器
        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();
        this.tick = 0;

        this.assetManager = new AssetManager(); // 资源管理
        this.navMesh = null; // 导航网格
        this.costTable = null; // 存储了导航点位之间的cost消耗值，也就是长度，比如选择两个所付出的代价
        this.pathPlanner = null;
        this.spawningManager = new SpawningManager(this); // spawning:产卵；引发；导致；造成；引起
        this.uiManager = new UIManager(this); // UIManager

        this.renderer = null;
        this.perspectiveCamera = null;
        this.scene = null;
        this.fpsControls = null;
        this.orbitControls = null;
        this.useFPSControls = false; // 是否进入第一人称玩游戏

        this.player = null;

        // 敌人个数
        this.enemyCount = GameConfig.BOT.COUNT;
        this.competitors = new Array(); // competitors:竞争者，存储产生的敌人

        this.debug = true; // 是否开启调试模式

        this.helpers = {
            convexRegionHelper: null, // 显示凸多边形
            spatialIndexHelper: null, // 显示空间划分
            axesHelper: null,// 坐标原点
            graphHelper: null, // 
            pathHelpers: new Array(),
            spawnHelpers: new Array(), // 产生武器、血条🩸的点
            uuidHelpers: new Array(),// 显示所有用户的名称
            skeletonHelpers: new Array(),// 骨骼
            itemHelpers: new Array(),// 显示半径
        };

        this.init();
    }

    init() {
        this.assetManager.init()
            .then((res) => {
                World._instance = this;
                //console.log('加载完毕:',res,this.options);
                // 执行成功之后，隐藏加载图层 // 消除overlay
                this.options.isShowOverlay.value = false;
                this.options.isLoading.value = false;
                /////////////////////////////////////
                const navMesh = this.assetManager.navMesh;

                this.pathPlanner = new PathPlanner(navMesh);

                this._initScene();
                this._initLevel();
                this._initEnemies();
                this._initPlayer();
                this._initControls();
                this._initUI();

                //////////////////////////////////
               // 开始玩游戏
               this._animate();
            })
            .catch((err) => {
                console.log("加载异常:", err);
            });

        return this;
    }

    _initScene(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffdfed);

        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,1000);
        this.perspectiveCamera.position.set(0,75,100);
        this.perspectiveCamera.add(this.assetManager.listener);// THREE.AudioListener();

        // 是否开启调试
        if(this.debug){
            this.helpers.axesHelper = new THREE.AxesHelper(5);
            this.helpers.axesHelper.visible = false;
            this.scene.add(this.helpers.axesHelper);
        }
        //this.scene.add(new THREE.AmbientLight(0xffffff,1.2));
        // lights
        const hemisphereLight = new THREE.HemisphereLight(0xffffff,0x444444,0.4);
        hemisphereLight.position.set(0,100,0);
        this.scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xffdefe,1.2);
        directionalLight.position.set(-700,1000,-750);
        this.scene.add(directionalLight);

        // sky
        const sky = new Sky();
        sky.scale.setScalar(1000);
        sky.material.uniforms.turbidity.value = 5.;
        sky.material.uniforms.rayleigh.value = 1.5;
        sky.material.uniforms.sunPosition.value.set(-700,1000,-750);
        this.scene.add(sky);

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.autoClear = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.options.dom.appendChild(this.renderer.domElement);

        window.addEventListener('resize',this._resize.bind(this));
        return this;
    }
    /**
     * 定义武器，血包等位置
     */
    _initLevel(){
        //1、 获取关卡模型,室内地面已经被挖空
        //console.log(this.assetManager.modelMaps)
        const renderComponent = this.assetManager.modelMaps.get('level');// 加载模型
        const mesh = renderComponent.getObjectByName('level');// 得到网格对象

        const vertices = mesh.geometry.attributes.position.array; // 得到点位数据
        const indices = mesh.geometry.index.array;// 得到索引数据
        // 创建YUKA.MeshGeometry
        const yukaMeshGeometry = new YUKA.MeshGeometry(vertices,indices);
        const level = new LevelGameEntity(yukaMeshGeometry);
        level.name = 'level';
        level.setRenderComponent(renderComponent,this.sync.bind(this));
        // 添加到yuka 及 three.js 中,子弹需要和关卡进行射线检测
        this.add(level);

        //2、 加载导航模型
        this.navMesh = this.assetManager.navMesh;// 路网模型navMesh.glb，返回的是navMesh 对象
        this.costTable = this.assetManager.costTable;

        // 获取空间划分配置信息
        const levelConfig = this.assetManager.configMaps.get('level'); // json 里面保存的数据

        const width = levelConfig.spatialIndex.width;
        const height = levelConfig.spatialIndex.height;
        const depth = levelConfig.spatialIndex.depth;
        const cellsX = levelConfig.spatialIndex.cellsX; // X 轴分成多少个
        const cellsY = levelConfig.spatialIndex.cellsY;
        const cellsZ = levelConfig.spatialIndex.cellsZ;
        // 进行空间划分，可提高查询判断效率
        this.navMesh.spatialIndex = new YUKA.CellSpacePartitioning(width,height,depth,cellsX,cellsY,cellsZ);
        this.navMesh.updateSpatialIndex();

        // 创建空间划分的辅助线
        this.helpers.spatialIndexHelper = NavMeshUtils.createCellSpaceHelper(this.navMesh.spatialIndex);
        // 添加到场景中去
        this.scene.add(this.helpers.spatialIndexHelper);

        // 初始化武器、血条等点位
        this.spawningManager.init();

        // 开启调试
        if(this.debug){
            // 绘制可视化凸多边形
            this.helpers.convexRegionHelper = NavMeshUtils.createConvexRegionHelper(this.navMesh);
            this.scene.add(this.helpers.convexRegionHelper);

            /**绘制导航路网
             * - YUKA的`navMesh.graph`实际上存储的是导航网格域（region）中心点__，而非原始顶点
                - 这种设计源于导航网格被划分为多个凸多边形区域（convex polygons）
                - 每个区域只需存储中心点作为路径节点的代表
                YUKA的设计采用了"区域抽象+中心点导航"的模式，在保证路径搜索效率的同时，显著降低了内存消耗。这种折中方案是3D导航领域的常见优化手段。
             */
            this.helpers.graphHelper = NavMeshUtils.createGraphHelper(this.navMesh.graph,0.2);
            this.scene.add(this.helpers.graphHelper);

            // 创建可视化对象表示产生敌人的点位
            this.helpers.spawnHelpers = SceneUtils.createSpawnPointHelper(this.spawningManager.spawningPoints);
            this.scene.add(this.helpers.spawnHelpers);
        }   
        return this;
    }

    /**
     * 初始化敌人,存在bug 敌人打不死
     */
    _initEnemies(){
        const enemyCount = this.enemyCount;// 敌人个数
 
        for(let i =0; i < enemyCount;i++){
            const name = 'Enemy:'+i;
            const renderComponent = SceneUtils.cloneWithSkinning(this.assetManager.modelMaps.get('soldier'));// 这里为啥不用clone(),简单的clone() 不能正确复制骨骼、蒙皮等数据，需要自己单独实现或者调用three.js 中的SkeletonUtils.clone() 方法
            renderComponent.name = name;
            const enemy =new  EnemyVehicle(this /* world */);
            enemy.name = name;
            enemy.setRenderComponent(renderComponent,this.sync.bind(this));
            //console.log('克隆出来的士兵:',renderComponent);
            // 设置动画
            const mixer = new THREE.AnimationMixer(renderComponent); // 创建动画混合器
            const idleClip = this.assetManager.animationMaps.get('soldier_idle');
            const runForwardClip = this.assetManager.animationMaps.get('soldier_forward');
            const runBackwardClip = this.assetManager.animationMaps.get('soldier_backward');
            const runLeftClip = this.assetManager.animationMaps.get('soldier_left');
            const runRightClip = this.assetManager.animationMaps.get('soldier_right');
            const death1Clip = this.assetManager.animationMaps.get('soldier_death1');
            const death2Clip = this.assetManager.animationMaps.get('soldier_death2');

            const clips = [idleClip,runForwardClip,runBackwardClip,runLeftClip,runRightClip,death1Clip,death2Clip];
            enemy.setAnimationMaps(mixer,clips);

            this.add(enemy);
            this.competitors.push(enemy);// 存储敌人的数组
            this.spawningManager.respawnCompetitor(enemy); // 设置敌人(士兵)出现(产生的位置)

            // 开启调试
            if(this.debug){
                const pathHelper = NavMeshUtils.createPathHelper();
                enemy.pathHelper = pathHelper;

                this.scene.add(pathHelper);
                this.helpers.pathHelpers.push(pathHelper);

                // 创建THREE.js中文字
                const uuidHelper = SceneUtils.createUUIDLabel(enemy.name);
                uuidHelper.position.y = 3;
                uuidHelper.visible = false;

                renderComponent.add(uuidHelper);
                this.helpers.uuidHelpers.push(uuidHelper);

                // 
                const skeletonHelper = new THREE.SkeletonHelper(renderComponent);
                skeletonHelper.visible = false;

                this.scene.add(skeletonHelper);
                this.helpers.skeletonHelpers.push(skeletonHelper);
            }
        }
       
        return this;
    }
    /**
     * 创建玩家实例对象
     */
    _initPlayer(){
        const assetManager = this.assetManager;
        const player = new PlayerMovingEntity(this);
        //console.log(4,player)

        // renderComponent 
        const body = new THREE.Object3D();
        body.matrixAutoUpdate = false;
        body.name = "player";
        player.setRenderComponent(body,this.sync.bind(this));
        
        // audio 
        const step1 = assetManager.cloneAudio(assetManager.audioMaps.get('step1'));
        const step2 = assetManager.cloneAudio(assetManager.audioMaps.get('step2'));

        const impact1 = assetManager.audioMaps.get( 'impact1' );
		const impact2 = assetManager.audioMaps.get( 'impact2' );
		const impact3 = assetManager.audioMaps.get( 'impact3' );
		const impact4 = assetManager.audioMaps.get( 'impact4' );
		const impact5 = assetManager.audioMaps.get( 'impact5' );
		const impact6 = assetManager.audioMaps.get( 'impact6' );
		const impact7 = assetManager.audioMaps.get( 'impact7' );

		step1.setVolume( 3.5 );
		step2.setVolume( 3.5 );

        body.add( step1, step2 );
		body.add( impact1, impact2, impact3, impact4, impact5, impact6, impact7 );

		player.audioMaps.set( 'step1', step1 );
		player.audioMaps.set( 'step2', step2 );
		player.audioMaps.set( 'impact1', impact1 );
		player.audioMaps.set( 'impact2', impact2 );
		player.audioMaps.set( 'impact3', impact3 );
		player.audioMaps.set( 'impact4', impact4 );
		player.audioMaps.set( 'impact5', impact5 );
		player.audioMaps.set( 'impact6', impact6 );
		player.audioMaps.set( 'impact7', impact7 );

        const mixer = new THREE.AnimationMixer(player.head);
        const deathClip = this.assetManager.animationMaps.get('player_death');
        const clips = [deathClip];
        player.setAnimationMaps(mixer,clips);

        this.add(player);
        this.competitors.push(player);
        this.spawningManager.respawnCompetitor(player);

        if(this.debug){
            player.deactivate();
        }

        this.player = player;
        return this;
    }
    _initControls(){
        this.fpsControls = new FirstPersonControls(this.player);
        this.fpsControls.sync();

        this.fpsControls.addEventListener( 'lock', ( ) => {

			this.useFPSControls = true;
            this.options.isFPSControls.value = true;
			this.orbitControls.enabled = false;
			this.player.activate();
			this.player.head.setRenderComponent( this.perspectiveCamera, this.sync.bind(this) );

			this.uiManager.showFPSInterface();

			if ( this.debug ) {

				this.uiManager.closeDebugUI();

			}
            
		} );

		this.fpsControls.addEventListener( 'unlock', () => {

			this.useFPSControls = false;
            this.options.isFPSControls.value = false;

			this.orbitControls.enabled = true;

			this.player.deactivate();
			this.player.head.setRenderComponent( null, null );

			this.uiManager.hideFPSInterface();

			if ( this.debug ) {

				this.uiManager.openDebugUI();

			}

		} );

		//

		if ( this.debug ) {

			this.orbitControls = new OrbitControls( this.perspectiveCamera, this.renderer.domElement );
			this.orbitControls.maxDistance = 500;

		}

		return this;
    }
    _initUI(){
        this.uiManager.init();
        return this;
    }
    /**
     * 添加子弹
     * @param {*} owner - enemy 对象
     * @param {*} ray 
     */
    addBullet(owner,ray){
        const bulletLine = this.assetManager.modelMaps.get('bulletLine').clone();// 获取模型
        bulletLine.visible = false;//
        // 创建子弹实体对象
        const bulletEntity = new BulletExtendsProjectile(owner,ray);
        bulletEntity.setRenderComponent(bulletLine,this.sync.bind(this));

        this.add(bulletEntity);
        return this;
    }

    /**
     * 检测游戏实体是否与弹丸相交
     * @param {*} projectile 
     * @param {*} intersectionPoint 
     */
    checkProjectileIntersection(projectile,intersectionPoint){
        // 获取实体列表，以便后面进行相交测试
        const entities = this.entityManager.entities;
        let minDistance = Infinity; // 最小距离
        let hittedEntity = null;// 被击中的实体对象
        //console.log('entities:',this.entityManager.entities)
        const owner = projectile.owner;/* 代表enemy or player 对象*/ // 表示当前子弹是属于哪个对象的
        const ray = projectile.ray;

        for(let i =0; i < entities.length;i++){
            const entity = entities[i];
            //console.log('world entity:',entity);
            if(entity !== owner/* 不与自己进行碰撞测试 */ && entity.active &&  entity.checkProjectileIntersection  /* 对象是否存在某个方法 */){
                if(entity.checkProjectileIntersection(ray,currentIntersectionPoint) !== null){
                    const squaredDistance = currentIntersectionPoint .squaredDistanceTo(ray.origin);
                    if(squaredDistance < minDistance){
                        minDistance = squaredDistance;
                        hittedEntity = entity;
                        //console.log('击中的是否是敌人:',entity.name)
                        intersectionPoint.copy(currentIntersectionPoint);
                    }
                }
            }
        }
        return hittedEntity;
    }
    /**
     * Finds the nearest item of the given item type for the given entity.
     * @param {*} entity 
     * @param {*} itemType 
     * @param {*} result 
     */
    getClosestItem(entity,itemType,result){
        let itemList = this.spawningManager.getItemList(itemType);
        let closestItem = null;
        let minDistance = Infinity;

        for(let i =0; i < itemList.length;i++){
            const item = itemList[i];
            if(item.active){
                const fromRegion = entity.currentRegion;
                const toRegion = item.currentRegion;

                const from = this.navMesh.getNodeIndex(fromRegion);
                const to= this.navMesh.getNodeIndex(toRegion);

                const distance = this.costTable.get(from,to);
                if(distance < minDistance){
                    minDistance = distance;
                    closestItem = item;
                }
            }
        }

        result.item = closestItem;
        result.distance = minDistance;
        return result;
    }
    /**
     * 
     * @param {*} entity 是 yuka.GameEntity 对象
     */
    add(entity){
        this.entityManager.add(entity); // 添加到yuka
        // 判断是否绑定three.js 对象，存在就添加到three.js 场景中
        if(entity._renderComponent !== null){
            this.scene.add(entity._renderComponent); // 添加到three.js
        }

        return this;
    }
    /**
     * 移除实体对象
     * @param {*} entity 
     */
    remove(entity){
        this.entityManager.remove(entity);
        // 判断是否存在3D模型对象
        if(entity._renderComponent !== null){
            // 清除数据
            entity._renderComponent.geometry.dispose();
            entity._renderComponent.material.dispose();
            this.scene.remove(entity._renderComponent);
        }
        return this;
    }
    /**
     * yuka 对象数据与 three.js 进行同步
     * @param {*} entity 
     * @param {*} renderComponent 
     */
    sync(entity,renderComponent){
        renderComponent.matrix.copy(entity.worldMatrix);
        renderComponent.matrix.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);
        //console.log(renderComponent.name,renderComponent.position,renderComponent.quaternion,renderComponent.scale)
    }
    _animate(){
        this.renderer.setAnimationLoop(this.__loop.bind(this));
    }

    __loop(){
        this.yukaTime.update();
        this.tick ++;
        
        const delta = this.yukaTime.getDelta();
        if(this.debug){
            if(this.useFPSControls){
                this.fpsControls.update(delta);
            }
        }else{
            this.fpsControls.update(delta);
        }

        this.spawningManager.update(delta);
        this.entityManager.update(delta);
        this.pathPlanner.update(delta);
        this.renderer.clear();
        this.renderer.render(this.scene,this.perspectiveCamera);
        this.uiManager.update(delta);
    }
    /**
     * 窗口发生改变执行的回调方法
     */
    _resize(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}
