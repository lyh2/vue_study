import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons';

export default class AssetManager {
    constructor(){
        this.loadingManager = new THREE.LoadingManager();

        this.audioLoader = new THREE.AudioLoader(this.loadingManager);
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.gltfLoader = new GLTFLoader(this.loadingManager);

        this.listener  = new THREE.AudioListener();

        this.clipMaps = new Map();
        this.audioMaps = new Map();
        this.modelMaps = new Map();
    }

    init(){
        // 记载音频
        this._loadAudios();
        this._loadModels();
        this._loadAnimations();

        return new Promise((resolve,reject)=>{
            this.loadingManager.onLoad =()=>{
                resolve({msg:'加载成功',data:{}})
            }
            this.loadingManager.onError =(error)=>{
                reject({msg:'加载异常',data:{error}});
            }
        });
    }

    _loadAudios(){
        // 走路左右脚音频
        const step1 = new THREE.Audio(this.listener);
        const step2 = new THREE.Audio(this.listener);

        // 开枪
        const shot = new THREE.PositionalAudio(this.listener);
        // 
        const shotReload = new THREE.PositionalAudio(this.listener);
        // 换弹夹
        const reload = new THREE.PositionalAudio(this.listener);
        // 随机开枪声音
        const impact1 = new THREE.PositionalAudio( this.listener );
		const impact2 = new THREE.PositionalAudio( this.listener );
		const impact3 = new THREE.PositionalAudio( this.listener );
		const impact4 = new THREE.PositionalAudio( this.listener );
		const impact5 = new THREE.PositionalAudio( this.listener );
        // 无子弹，开枪声音
		const empty = new THREE.PositionalAudio( this.listener );
        // 死亡声音
		const dead = new THREE.PositionalAudio( this.listener );

        shot.setVolume(1.2);
        shotReload.setVolume(0.8);
        reload.setVolume(0.8);
        empty.setVolume(1);


		this.audioLoader.load( './yuka/audio/step1.ogg', buffer => step1.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/step2.ogg', buffer => step2.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/shot.ogg', buffer => shot.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/shot_reload.ogg', buffer => shotReload.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/reload.ogg', buffer => reload.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/impact1.ogg', buffer => impact1.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/impact2.ogg', buffer => impact2.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/impact3.ogg', buffer => impact3.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/impact4.ogg', buffer => impact4.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/impact5.ogg', buffer => impact5.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/empty.ogg', buffer => empty.setBuffer( buffer ) );
		this.audioLoader.load( './yuka/audio/dead.ogg', buffer => dead.setBuffer( buffer ) );

		this.audioMaps.set( 'step1', step1 );
		this.audioMaps.set( 'step2', step2 );
		this.audioMaps.set( 'shot', shot );
		this.audioMaps.set( 'shotReload', shotReload );
		this.audioMaps.set( 'reload', reload );
		this.audioMaps.set( 'impact1', impact1 );
		this.audioMaps.set( 'impact2', impact2 );
		this.audioMaps.set( 'impact3', impact3 );
		this.audioMaps.set( 'impact4', impact4 );
		this.audioMaps.set( 'impact5', impact5 );
		this.audioMaps.set( 'empty', empty );
		this.audioMaps.set( 'dead', dead );
    }
    // 加载模型
    _loadModels(){
        this.gltfLoader.load('./yuka/shotgun.glb',gltf=>{
            // 获取Weapon：武器
            const weaponMesh = gltf.scene.getObjectByName('UntitledObjcleanergles').children[0];
            weaponMesh.geometry.scale(0.00045,0.00045,0.00045);
            weaponMesh.geometry.rotateX(Math.PI * -0.5);
            weaponMesh.geometry.rotateY(Math.PI * -0.5);

            this.modelMaps.set('weapon',weaponMesh);

            // 加载纹理-开枪时火焰效果,后续在加上烟雾
            const texture = this.textureLoader.load('./yuka/muzzle.png');
            const material = new THREE.SpriteMaterial({map:texture});
            const sprite = new THREE.Sprite(material);
            sprite.position.set(0.15,0.1,-0.45);
            sprite.scale.set(0.3,0.3,0.3);
            sprite.visible = false;// 开枪的时候才显示
            
            // 保存
            this.modelMaps.set('muzzle',sprite);
            // 火焰作为枪的子对象
            weaponMesh.add(sprite); // 相对于枪的相对位置
        });

        // bullet hole 子弹留下的弹孔
        const texture = this.textureLoader.load('./yuka/bulletHole.png');
        texture.minFilter = THREE.LinearFilter;
        const bulletGeometry = new THREE.PlaneGeometry(0.1,0.1);
        const bulletMaterial = new THREE.MeshLambertMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4});
        const bulletHole = new THREE.Mesh(bulletGeometry,bulletMaterial);
        
        this.modelMaps.set('bulletHole',bulletHole);

        // 子弹飞行的线条，也就是可见的子弹
        const bulletLineGeometry = new THREE.BufferGeometry();
        const bulletLineMaterial = new THREE.LineBasicMaterial({color:0xfbf8e6});
        bulletLineGeometry.setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-1)]);// 向-Z轴
        const bulletLine = new THREE.LineSegments(bulletLineGeometry,bulletLineMaterial);
        this.modelMaps.set('bulletLine',bulletLine);

        // ground 地面
        const groundGeometry  = new THREE.PlaneGeometry(200,200);
        groundGeometry.rotateX(-Math.PI * 0.5);
        const groundMaterial = new THREE.MeshPhongMaterial({color:0x999999});
        const groundMesh = new THREE.Mesh(groundGeometry,groundMaterial);
        groundMesh.receiveShadow = true;

        this.modelMaps.set('ground',groundMesh);

        // enemy 敌人
        let enemyGeometry = new THREE.ConeGeometry(0.2,1,8,4);
        enemyGeometry = enemyGeometry.toNonIndexed();//Return a non-index version of an indexed BufferGeometry.
        enemyGeometry.rotateX(Math.PI * 0.5);
        enemyGeometry.translate(0,0.5,0);// 修改中心点位置，原始中心点位置在XY平面圆心处，现在向Y轴移动了0.5个单位
        enemyGeometry.computeBoundingSphere();

        const position = enemyGeometry.attributes.position;
        const scatter =[];// 分散
        const scatterFactor = 0.5;
        // 预先设置每个点的分散值-可以修改循环的step 值，看一下效果
        for(let i =0; i < position.count;i+=3){
            const x = (1- Math.random() * 2) * scatterFactor;// (-1 到 1 ) * 0.5
            const y = (1 - Math.random() * 2) * scatterFactor;
            const z = (1 - Math.random() * 2) * scatterFactor;

            scatter.push(x,y,z);
            scatter.push(x,y,z);
            scatter.push(x,y,z);
        }
        enemyGeometry.setAttribute('scatter',new THREE.Float32BufferAttribute(scatter,3));
        const extent = [];// 程度
        for(let i =0; i < position.count;i+=3){
            const x = 5 + Math.random() * 5;
            extent.push(x);
            extent.push(x);
            extent.push(x);
        }
        enemyGeometry.setAttribute('extent',new THREE.Float32BufferAttribute(extent,1));

        const enemyMesh = new THREE.Mesh(enemyGeometry,new THREE.MeshBasicMaterial({color:0x996699}));
        enemyMesh.castShadow = true;
        this.modelMaps.set('enemy',enemyMesh);

        // obstacle 障碍物
        const obstacleGeometry = new THREE.BoxGeometry(4,8,4);
        obstacleGeometry.translate(0,4,0);
        obstacleGeometry.computeBoundingSphere();
        const obstacleMaterial = new THREE.MeshBasicMaterial({color:0x006699,dithering:true/*对颜色应用抖动，消除条带效果*/});
        const obstacleMesh = new THREE.Mesh(obstacleGeometry,obstacleMaterial);
        obstacleMesh.castShadow = true;
        this.modelMaps.set('obstacle',obstacleMesh);
    }
    // 自定义动画
    _loadAnimations() {
		// manually create some keyframes for testing 手动创建一些动画
		let positionKeyframes, rotationKeyframes;
		let q0, q1, q2;

		// shot 开枪动画
		positionKeyframes = new THREE.VectorKeyframeTrack( '.position', [ 0, 0.05, 0.15, 0.3 ]/*表示执行时间为:0.3s*/, 
            [
			0.25, - 0.3, - 1,
			0.25, - 0.2, - 0.7,
			0.25, - 0.305, - 1,
		 	0.25, - 0.3, - 1 ]
		);

		q0 = new THREE.Quaternion();
		q1 = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), 0.2 );// 绕X轴旋转0.2°
		q2 = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), - 0.02 ); // 绕X轴旋转0.2°

		rotationKeyframes = new THREE.QuaternionKeyframeTrack( '.rotation', [ 0, 0.05, 0.15, 0.3 ], [
			q0.x, q0.y, q0.z, q0.w,
			q1.x, q1.y, q1.z, q1.w,
			q2.x, q2.y, q2.z, q2.w,
			q0.x, q0.y, q0.z, q0.w ]
		);

		const shotClip = new THREE.AnimationClip( 'Shot', 0.3, [ positionKeyframes, rotationKeyframes ] );
		this.clipMaps.set( 'shot', shotClip );

		// reload 换枪动画
		positionKeyframes = new THREE.VectorKeyframeTrack( '.position', [ 0, 0.2, 1.3, 1.5 ], [
			0.25, - 0.3, - 1,
			0.25, - 0.6, - 1,
			0.25, - 0.6, - 1,
			0.25, - 0.3, - 1 ]
		);

		q1 = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), - 0.4 );

		rotationKeyframes = new THREE.QuaternionKeyframeTrack( '.rotation', [ 0, 0.2, 1.3, 1.5 ], [
			q0.x, q0.y, q0.z, q0.w,
			q1.x, q1.y, q1.z, q1.w,
			q1.x, q1.y, q1.z, q1.w,
			q0.x, q0.y, q0.z, q0.w ]
		);

		const reloadClip = new THREE.AnimationClip( 'Reload', 1.5, [ positionKeyframes, rotationKeyframes ] );
		this.clipMaps.set( 'reload', reloadClip );

	}
}