import * as YUKA from 'yuka';
import * as THREE from 'three';
import AssetManager from './AssetManager';
import { showToast } from 'vant';
import CustomFirstPersonControls from './CustomFirstPersonControls';
import BulletMovingEntity from './BulletMovingEntity';
import EnemyVehicle from './EnemyVehicle';
import PlayerMovingEntity from './PlayerMovingEntity';
import GroundGameEntity from './GroundGameEntity';
import ObstacleGameEntity from './ObstacleGameEntity';
/**
 * 射线相交的点及法线
 */
const intersection = {
    point:new YUKA.Vector3(),
    normal:new YUKA.Vector3()
};

const targetV3 = new YUKA.Vector3();// 

export default class World{
    static _instance = null;

    static getInstance(){
        if(World._instance !== null)
            return World._instance;
        else{
            //throw new warn('暂未获取到实例....!');
            console.log('暂未获取到实例....!');
            return null;// 
        }
    }
    constructor(options={}){
        this.options = options;

        this.maxBulletHoles = 48;// 子弹孔洞最大个数
        this.enemyCount = 30;// 敌人个数
        this.minSpawningDistance = 10; // 表示最小的产生距离

        // yuka
        this.entityManager = new YUKA.EntityManager();
        this.yukaTime = new YUKA.Time();

        // three.js
        this.scene = null;
        this.perspectiveCamera = null;
        this.renderer = null;
        this.mixer = null;

        this.player = null;
        this.controls = null;

        //Array
        this.enemies = new Array();
        this.obstacles = new Array();
        this.bulletHoles = new Array();
        this.spawningPoints = new Array();  // 产生的敌人的点为列表
        this.usedSpawningPoints = new Set();// 已经使用过的点(生成敌人的点)

        this.assetManager = new AssetManager();// 资源加载类

        this.animationMaps = new Map();

        this.started = false;
        this.gameOver = false;
        this.debug = true;

        this.init();
   
    }
    // 初始化
    init(){
        this.assetManager.init().then(()=>{
            World._instance = this;
            // 执行成功之后，隐藏加载图层 // 消除overlay
            this.options.isLoading.value = false;
            /////////////////////////////////////
            this._initScene();
            this._initPlayer();
            this._initControls();
            this._initGround();
            this._initObstacles();
            this._initSpawningPoints();
            //////////////////////////////////
            // 换行时不截断单词
            showToast({
                title:'',
                message: 'Click to Play.',
                wordBreak: 'break-word',
                duration:0,
                closeOnClick:true,
                onClose:()=>{
                    this.options.isShowOverlay.value = false
                    //console.log('点击事件:',);
                    // 唤醒音乐
                    if(this.gameOver === false){
                        this.controls.connect();
                        const context = THREE.AudioContext.getContext();
                        if(context.state === 'suspended') context.resume();
                        this.started = true;
                        this._initAnimate();
                    }
                }
            });
        }).catch(err=>{
            console.log('加载资源失败....',err);
        });
    }
    // 创建第一人对象
    _initPlayer(){
        this.player = new PlayerMovingEntity();
        this.player.position.set(6,0,35);
        this.player.head.setRenderComponent(this.perspectiveCamera,this.sync.bind(this));

        this.add(this.player);
        
        // weapon：添加武器
        const weapon = this.player.weapon;
        const weaponMesh = this.assetManager.modelMaps.get('weapon');
        weapon.setRenderComponent(weaponMesh,this.sync.bind(this));
        this.scene.add(weaponMesh);

        weaponMesh.add(this.assetManager.audioMaps.get('shot'));
        weaponMesh.add(this.assetManager.audioMaps.get('shotReload'));
        weaponMesh.add(this.assetManager.audioMaps.get('reload'));
        weaponMesh.add(this.assetManager.audioMaps.get('empty'));

        // animations
        this.mixer = new THREE.AnimationMixer(this.player.weapon);
        const shotClip = this.assetManager.clipMaps.get('shot');
        const shotAction = this.mixer.clipAction(shotClip);
        shotAction.loop = THREE.LoopOnce;

        this.animationMaps.set('shot',shotAction);

        const reloadClip = this.assetManager.clipMaps.get('reload');
        const reloadAction = this.mixer.clipAction(reloadClip);
        reloadAction.loop = THREE.LoopOnce;

        this.animationMaps.set('reload',reloadAction);
    }
    // 创建3D场景
	_initScene() {

		// camera
		this.perspectiveCamera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 200 );
        this.perspectiveCamera.add( this.assetManager.listener );
        this.perspectiveCamera.name = 'perspectiveCamera';
		// scene

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xa0a0a0 );
		this.scene.fog = new THREE.Fog( 0xa0a0a0, 20, 150 );

		// lights

		const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444, 0.8 );
		hemiLight.position.set( 0, 100, 0 );
	
		this.scene.add( hemiLight );

		const dirLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
		dirLight.position.set( 20, 25, 25 );

		dirLight.castShadow = true;
		dirLight.shadow.camera.top = 25;
		dirLight.shadow.camera.bottom = - 25;
		dirLight.shadow.camera.left = - 30;
		dirLight.shadow.camera.right = 30;
		dirLight.shadow.camera.near = 0.1;
		dirLight.shadow.camera.far = 100;
		dirLight.shadow.mapSize.width = 2048;
		dirLight.shadow.mapSize.height = 2048;
		this.scene.add( dirLight );

		if ( this.debug ) this.scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );

		// renderer

		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.shadowMap.enabled = true;
		this.options.dom.appendChild( this.renderer.domElement );

		// listeners

		window.addEventListener( 'resize', this.onWindowResize.bind(this), false );
	}

    _initControls() {
		this.controls = new CustomFirstPersonControls( this.player );
		this.controls.addEventListener( 'lock', () => {
		} );

		this.controls.addEventListener( 'unlock', () => {

		} );

	}
    _initGround(){
        const groundMesh = World.getInstance().assetManager.modelMaps.get('ground');
        const vertices = groundMesh.geometry.attributes.position.array;
        const indices = groundMesh.geometry.index.array;

        const geometry = new YUKA.MeshGeometry(vertices,indices);
        
        const ground = new GroundGameEntity(geometry);
        ground.setRenderComponent(groundMesh,this.sync.bind(this));
        this.add(ground);
    }
    _initObstacles(){
        const obstacleMesh = this.assetManager.modelMaps.get( 'obstacle' );
		const vertices = obstacleMesh.geometry.attributes.position.array;
		const indices = obstacleMesh.geometry.index.array;

		const geometry = new YUKA.MeshGeometry( vertices, indices );// 射线检测时需要
        // 创建16个障碍物
		for ( let i = 0; i < 16; i ++ ) {
			const mesh = obstacleMesh.clone();// 必须要克隆，否则只会创建一个
			const obstacle = new ObstacleGameEntity( geometry );

			const x = 48 - ( ( i % 4 ) * 12 );
			const z = 48 - ( Math.floor( i / 4 ) * 12 );

			obstacle.position.set( x, 0, z );
			obstacle.boundingRadius = 4;// 障碍物的半径
			obstacle.setRenderComponent( mesh, this.sync.bind(this) );
			this.add( obstacle );

			if ( this.debug ) {
				const helperGeometry = new THREE.SphereGeometry( obstacle.boundingRadius, 16, 16 );
				const helperMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: true } );

				const helper = new THREE.Mesh( helperGeometry, helperMaterial );
				mesh.add( helper );
			}
		}
    }
    _initSpawningPoints(){
        for(let i =0; i < this.enemyCount;i++){
            const spawningPoint = new YUKA.Vector3();
            spawningPoint.x = 48 - ((i % 3) * 12);
            spawningPoint.z = 48 - (Math.floor(i / 3) * 12);
            this.spawningPoints.push(spawningPoint);
        }

        if(this.debug){
            const spawningPointGeometry = new THREE.BoxGeometry(0.2);
            const spawningPointMaterial = new THREE.MeshBasicMaterial({color:0x00ffff,depthWrite:false,depthTest:false,transparent:true});
            this.spawningPoints.map((item)=>{
                const mesh = new THREE.Mesh(spawningPointGeometry,spawningPointMaterial);
                mesh.position.copy(item);
                this.scene.add(mesh);
                mesh.name = 'spawningPoint';
            });
        }
    }
    _initAnimate(){
        this.renderer.setAnimationLoop(this.animate.bind(this));
    }
    // 射线检测，把数据返回到参数中
    intersectRay(ray,intersectionPoint,normal=null){
        const obstacles = this.obstacles;// 障碍物列表
        let minDistance = Infinity;// 最短的距离
        let closestObstacle = null;// 相交的障碍物

        for(let i=0;i < obstacles.length;i++){
            const obstacle = obstacles[i];
            /*
            intersectRay(ray, worldMatrix-The matrix that transforms the geometry to world space.,代表geometry 世界空间的变换
             closest, //Whether the closest intersection point should be computed or not.
             intersectionPoint, normal) → {Vector3}
            */
            if(obstacle.geometry.intersectRay(ray,obstacle.worldMatrix,false,intersection.point,intersection.normal) !== null){
                const squaredDistance = intersection.point.squaredDistanceTo(ray.origin);
                if(squaredDistance < minDistance){
                    minDistance = squaredDistance;
                    closestObstacle = obstacle;

                    intersectionPoint.copy(intersection.point);
                    if(normal) normal.copy(intersection.normal);
                }
            }
        }

        return closestObstacle !== null ? closestObstacle : null;
    }
    // 发射子弹
    addBullet(owner,ray){
        // 记住！这里必须要进行拷贝，否则只有一个几何体对象
        const bulletLine = this.assetManager.modelMaps.get('bulletLine').clone();
        const bullet = new BulletMovingEntity(owner/* this.player */,ray);
        bullet.setRenderComponent(bulletLine,this.sync.bind(this)); // 子弹与自定义的游戏实体进行绑定
        this.add(bullet);
    }
    addBulletHole(position,normal){
        // 获取子弹孔洞的3D效果
        const bulletHole = this.assetManager.modelMaps.get('bulletHole').clone();
        // 随机进行缩放
        const s = 1 + (Math.random() * 0.5);
        bulletHole.scale.set(s,s,s);
        // 设置子弹孔洞的位置
        bulletHole.position.copy(position);// 设置弹孔的位置
        targetV3.copy(position).add(normal);
        bulletHole.lookAt(targetV3.x,targetV3.y,targetV3.z);
        //bulletHole.updateMatrix();
        
        if(this.bulletHoles.length >= this.maxBulletHoles){
            // 子弹孔洞数量大于阈值
            const toRemove = this.bulletHoles.shift();
            this.scene.remove(toRemove);
        }
        // 添加新的子弹孔
        this.bulletHoles.push(bulletHole);
        this.scene.add(bulletHole);
    }
    // 添加敌人
    addEnemy(){
        const renderComponent = this.assetManager.modelMaps.get('enemy').clone();
        // 创建材质
        const enemyMaterial = new THREE.MeshStandardMaterial({color:0xff0000,side:THREE.DoubleSide,transparent:true});
        enemyMaterial.onBeforeCompile = function(shader){
            shader.uniforms.alpha = {value:0};
            shader.uniforms.direction = {value:new THREE.Vector3()};
            shader.vertexShader = 'uniform float alpha;\n'+shader.vertexShader;
            shader.vertexShader = 'attribute vec3 scatter;\n'+shader.vertexShader;
            shader.vertexShader = 'attribute float extent;\n'+shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                [
                    'vec3 transformed = vec3(position);',
                    'transformed += normalize(scatter) * alpha * extent;',
                ].join('\n')
            );
            enemyMaterial.userData.shader = shader;// 保存材质shader
        };

        renderComponent.material = enemyMaterial;
        const vertices = renderComponent.geometry.attributes.position.array;
        const geometry = new YUKA.MeshGeometry(vertices);
        const enemy = new EnemyVehicle(geometry);

        enemy.boundingRadius = renderComponent.geometry.boundingSphere.radius;
        enemy.setRenderComponent(renderComponent,this.sync.bind(this));

        let spawningPoint = null,spawningPointName = '';
        const minSqDistance = this.minSpawningDistance * this.minSpawningDistance;
        do{
            // 获取一个随机索引值
            const spawningPointIndex = Math.floor(Math.random() * (this.spawningPoints.length ));
            //console.log('index:',spawningPointIndex)
            spawningPoint = this.spawningPoints[spawningPointIndex];

            spawningPointName = 'spawningPoint_'+spawningPoint.x+'_'+spawningPoint.y+'_'+spawningPoint.z;
            //this.usedSpawningPoints.has(spawningPointName) === true || 
            //console.log(this.usedSpawningPoints.has(spawningPointName)  )
        } while(  spawningPoint.squaredDistanceTo(this.player.position) < minSqDistance);
        
        this.usedSpawningPoints.add(spawningPointName);
        enemy.position.copy(spawningPoint);// 生成敌人的位置
        enemy.spawningPointName = spawningPointName;
        this.add(enemy);
        
    }
    // 添加实体到实体管理器中
    add(entity){
        this.entityManager.add(entity);
        if(entity._renderComponent !== null){
            // 存在对应的Mesh对象，添加到three.js 中
            this.scene.add(entity._renderComponent);
        }
        // 添加到障碍物数组中
        if(entity.geometry){
            this.obstacles.push(entity);
        }

        // 判断是不是敌人
        if(entity instanceof EnemyVehicle){
            this.enemies.push(entity);
        }
    }
    // 移除操作
    remove(entity){
        // 移除实体对象
        this.entityManager.remove(entity);

        // 移除3D对象
        if(entity._renderComponent !== null){
            this.scene.remove(entity._renderComponent);
        }

        // 移除障碍物
        if(entity.geometry){
            const index = this.obstacles.indexOf(entity);
            if(index !== -1) this.obstacles.splice(index,1);
        }
        // 移除敌人
        if(entity instanceof EnemyVehicle){
            const index = this.enemies.indexOf(entity);
            if(index !== -1) this.enemies.splice(index,1);
            this.usedSpawningPoints.delete(entity.spawningPointName); //
        }
    }
    animate(){
        const delta = this.yukaTime.update().getDelta();

		// add enemies if necessary
		const enemies = this.enemies;// 添加敌人
		if ( enemies.length < this.enemyCount) {
			for ( let i = enemies.length, l = this.enemyCount; i < l; i ++ ) {
				this.addEnemy();
			}
		}

		// update UI
		if ( this.started === true && this.gameOver === false ) {
			this.player.updatePlayingTime(- delta);
            
			if ( this.player.getPlayingTime() < 0 ) {
				this.gameOver = true;
				this.controls.exit();
                this.started = false;//--   
			}

		}

		//
        
		this.controls.update( delta );

		this.entityManager.update( delta );

		if ( this.mixer ) this.mixer.update( delta );

		this.renderer.render( this.scene, this.perspectiveCamera );
        
    }
    sync( entity, renderComponent ) {
        
        renderComponent.matrix.copy( entity.worldMatrix );
        renderComponent.matrix.decompose(renderComponent.position,renderComponent.quaternion,renderComponent.scale);
    }
    
    onWindowResize() {
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    }
}