/**
 * 资源管理器类
 */

import * as THREE from "three";
import * as YUKA from "yuka";

import GameConfig from "./GameConfig";
import { GLTFLoader } from "three/examples/jsm/Addons";

export default class AssetManager {
    constructor(){
        this.loadingManager = new THREE.LoadingManager();

        this.animationLoader = new THREE.AnimationLoader(this.loadingManager);
        this.audioLoader = new THREE.AudioLoader(this.loadingManager);
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.gltfLoader = new GLTFLoader(this.loadingManager);
        this.navMeshLoader = new YUKA.NavMeshLoader();// 加载导航网格数据

        this.listener = new THREE.AudioListener();

        this.animationMaps = new Map();
        this.audioMaps = new Map();
        this.configMaps = new Map();
        this.modelMaps = new Map();
        this.textureMaps = new Map();

        this.navMesh = null;
        this.costTable = null;
    }

    init(){
        this._loadAnimations();
        this._loadAudios();
        this._loadConfigs();
        this._loadModels();
        this._loadTextures();
        this._loadNavMesh();

        return new Promise((resolve,reject)=>{
            this.loadingManager.onLoad = ()=>{
                resolve({msg:'加载完毕',data:{}})
            };
            this.loadingManager.onProgress = ( url, itemsLoaded, itemsTotal)=>{
                // 加载过程
                console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
            };
            this.loadingManager.onError =(url)=>{
                reject({msg:'加载失败',data:{url}});
            };
            this.loadingManager.onStart=(url, itemsLoaded, itemsTotal)=>{
                console.log( 'Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
            }
        });
    }

    _loadAnimations(){
        // player 
        this.animationLoader.load('./yuka-dive/animations/player.json',clips=>{
            //console.log('player clips:',clips);
            for(const clip of clips){
                this.animationMaps.set(clip.name,clip);
            }
        });
        // blaster:喷砂机；起爆器；导火线；点火器；爆破工，放炮工(武器)
        this.animationLoader.load('./yuka-dive/animations/blaster.json',clips=>{
            for(const clip of clips){
                this.animationMaps.set(clip.name,clip);
            }
        });

        // shotgun
        this.animationLoader.load('./yuka-dive/animations/shotgun.json',clips=>{
            for(const clip of clips){
                this.animationMaps.set(clip.name,clip);
            }
        });

        // assault rifle：来福枪
        this.animationLoader.load('./yuka-dive/animations/assaultRifle.json',clips=>{
            for(const clip of clips){
                this.animationMaps.set(clip.name,clip);
            }
        });

        return this;
    }

    _loadAudios() {

		const audioLoader = this.audioLoader;
	
		const listener = this.listener;

		const blasterShot = new THREE.PositionalAudio( listener );// 爆能枪
		blasterShot.matrixAutoUpdate = false;

		const shotgunShot = new THREE.PositionalAudio( listener );// 普通的枪
		shotgunShot.matrixAutoUpdate = false;

		const assaultRifleShot = new THREE.PositionalAudio( listener );// 来福枪
		assaultRifleShot.matrixAutoUpdate = false;

		const reload = new THREE.PositionalAudio( listener );// 重新加载音频
		reload.matrixAutoUpdate = false;

		const shotgunShotReload = new THREE.PositionalAudio( listener );
		shotgunShotReload.matrixAutoUpdate = false;

		const step1 = new THREE.PositionalAudio( listener );
		step1.matrixAutoUpdate = false;
        step1.setVolume(GameConfig.AUDIO.VOLUME_2);

		const step2 = new THREE.PositionalAudio( listener );
		step2.matrixAutoUpdate = false;
        step2.setVolume(GameConfig.AUDIO.VOLUME_2);

		const impact1 = new THREE.PositionalAudio( listener );
		impact1.setVolume( GameConfig.AUDIO.VOLUME_IMPACT );
		impact1.matrixAutoUpdate = false;

		const impact2 = new THREE.PositionalAudio( listener );
		impact2.setVolume( GameConfig.AUDIO.VOLUME_IMPACT );
		impact2.matrixAutoUpdate = false;

		const impact3 = new THREE.PositionalAudio( listener );
		impact3.setVolume( GameConfig.AUDIO.VOLUME_IMPACT );
		impact3.matrixAutoUpdate = false;

		const impact4 = new THREE.PositionalAudio( listener );
		impact4.setVolume( GameConfig.AUDIO.VOLUME_IMPACT );
		impact4.matrixAutoUpdate = false;

		const impact5 = new THREE.PositionalAudio( listener );
		impact5.setVolume( GameConfig.AUDIO.VOLUME_IMPACT );
		impact5.matrixAutoUpdate = false;

		const impact6 = new THREE.PositionalAudio( listener );
		impact6.setVolume( GameConfig.AUDIO.VOLUME_IMPACT );
		impact6.matrixAutoUpdate = false;

		const impact7 = new THREE.PositionalAudio( listener );
		impact7.setVolume( GameConfig.AUDIO.VOLUME_IMPACT );
		impact7.matrixAutoUpdate = false;

		const health = new THREE.PositionalAudio( listener );
		health.matrixAutoUpdate = false;

		const ammo = new THREE.PositionalAudio( listener );
		ammo.matrixAutoUpdate = false;

		audioLoader.load( './yuka-dive/audios/blaster_shot.ogg', buffer => blasterShot.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/shotgun_shot.ogg', buffer => shotgunShot.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/assault_rifle_shot.ogg', buffer => assaultRifleShot.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/reload.ogg', buffer => reload.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/shotgun_shot_reload.ogg', buffer => shotgunShotReload.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/step1.ogg', buffer => step1.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/step2.ogg', buffer => step2.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/impact1.ogg', buffer => impact1.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/impact2.ogg', buffer => impact2.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/impact3.ogg', buffer => impact3.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/impact4.ogg', buffer => impact4.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/impact5.ogg', buffer => impact5.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/impact6.ogg', buffer => impact6.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/impact7.ogg', buffer => impact7.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/health.ogg', buffer => health.setBuffer( buffer ) );
		audioLoader.load( './yuka-dive/audios/ammo.ogg', buffer => ammo.setBuffer( buffer ) );

		this.audioMaps.set( 'blaster_shot', blasterShot );
		this.audioMaps.set( 'shotgun_shot', shotgunShot );
		this.audioMaps.set( 'assault_rifle_shot', assaultRifleShot );
		this.audioMaps.set( 'reload', reload );
		this.audioMaps.set( 'shotgun_shot_reload', shotgunShotReload );
		this.audioMaps.set( 'step1', step1 );
		this.audioMaps.set( 'step2', step2 );
		this.audioMaps.set( 'impact1', impact1 );
		this.audioMaps.set( 'impact2', impact2 );
		this.audioMaps.set( 'impact3', impact3 );
		this.audioMaps.set( 'impact4', impact4 );
		this.audioMaps.set( 'impact5', impact5 );
		this.audioMaps.set( 'impact6', impact6 );
		this.audioMaps.set( 'impact7', impact7 );
		this.audioMaps.set( 'health', health );
		this.audioMaps.set( 'ammo', ammo );

		return this;

	}

    _loadConfigs(){
        this.loadingManager.itemStart('levelConfig');
        fetch('./yuka-dive/config/level.json').then(response=>{
            return response.json();
        }).then(json=>{
            this.configMaps.set('level',json);
            this.loadingManager.itemEnd('levelConfig');
        });

        return this;
    }

    _loadModels(){
        // 加载阴影纹理
        const shadowTexture = this.textureLoader.load('./yuka-dive/textures/shadow.png');
        const planeGeometry = new THREE.PlaneGeometry(1,1);
        const planeMaterial = new THREE.MeshBasicMaterial({
            map:shadowTexture,
            transparent:true,
            opacity:0.4,
        });
        const shadowPlane = new THREE.Mesh(planeGeometry,planeMaterial);
        shadowPlane.position.set(0,0.05,0);
        shadowPlane.rotation.set(-Math.PI * 0.5,0,0);
        shadowPlane.scale.multiplyScalar(2);
        shadowPlane.matrixAutoUpdate = false;
        shadowPlane.updateMatrix();

        // soldier-士兵
        this.gltfLoader.load('./yuka-dive/models/soldier.glb',gltf=>{
            // 获取gltf.scene 数据就是对象
            const renderComponent = gltf.scene;
            renderComponent.animations = gltf.animations;
            renderComponent.matrixAutoUpdate = false;// 取消自动更新
            renderComponent.updateMatrix();

            // 遍历子对象
            renderComponent.traverse(object=>{
                if(object.isMesh){
                    object.material.side = THREE.DoubleSide;
                    object.matrixAutoUpdate = false;
                    object.updateMatrix();
                }
            });

            renderComponent.add(shadowPlane);// 
            this.modelMaps.set('soldier',renderComponent);
            // 组装动画
            for(let animation of gltf.animations){
                this.animationMaps.set(animation.name,animation);
            }
        });

        // level -级别关卡,里面是一些生成枪的点等
        this.gltfLoader.load('./yuka-dive/models/level.glb',gltf=>{
            const renderComponent = gltf.scene;
            renderComponent.matrixAutoUpdate = false;
            renderComponent.updateMatrix();//Updates the local transform.

            renderComponent.traverse(object =>{
                object.matrixAutoUpdate = false;
                object.updateMatrix();
            });

            // 手动添加高光贴图
            const mesh = renderComponent.getObjectByName('level');
            mesh.material.lightMap = this.textureLoader.load('./yuka-dive/textures/lightmap.png');
            mesh.material.lightMap.flipY = false;
            mesh.material.map.anisotropy = 4;

            this.modelMaps.set('level',renderComponent);
        });

        // blaster 爆炸枪，高精度的模型
        this.gltfLoader.load('./yuka-dive/models/blaster_high.glb',gltf=>{
            const renderComponent = gltf.scene;
            renderComponent.matrixAutoUpdate = false;
            renderComponent.updateMatrix();

            renderComponent.traverse(object=>{
                object.matrixAutoUpdate = false;
                object.updateMatrix();
            });
            this.modelMaps.set('blaster_high',renderComponent);
        });

        // blaster 爆炸枪 低精度
        this.gltfLoader.load('./yuka-dive/models/blaster_low.glb',gltf=>{
            const renderComponent = gltf.scene;
            renderComponent.matrixAutoUpdate = false;
            renderComponent.updateMatrix();

            renderComponent.traverse(object=>{
                object.matrixAutoUpdate = false;
                object.updateMatrix();
            });
            this.modelMaps.set('blaster_low',renderComponent);
        });

        // 加载shotgun 高精度
        this.gltfLoader.load('./yuka-dive/models/shotgun_high.glb',gltf=>{
            const renderComponent = gltf.scene;
            this._setMatrix(renderComponent);

            renderComponent.traverse(object=>{
                this._setMatrix(object);
            });

            this.modelMaps.set('shotgun_high',renderComponent);
        });

        // 加载shotgun:枪 低精度模型
        this.gltfLoader.load('./yuka-dive/models/shotgun_low.glb',gltf=>{
            const renderComponent = gltf.scene;
            this._setMatrix(renderComponent);

            renderComponent.traverse(object=>{
                this._setMatrix(object);
            });

            this.modelMaps.set('shotgun_low',renderComponent);
        });

        // 加载assault rifle 来福枪 高精度
        this.gltfLoader.load('./yuka-dive/models/assaultRifle_high.glb',gltf=>{
            const renderComponent = gltf.scene;
            this._setGlbMatrix(renderComponent);

            this.modelMaps.set('assaultRifle_high',renderComponent);
        });

        // 加载assault rifle 来福枪低精度
        this.gltfLoader.load('./yuka-dive/models/assaultRifle_low.glb',gltf=>{
            const renderComponent = gltf.scene;
            this._setGlbMatrix(renderComponent);

            this.modelMaps.set('assaultRifle_low',renderComponent);
        });

        //health pack 健康包
        this.gltfLoader.load('./yuka-dive/models/healthPack.glb',gltf=>{
            const renderComponent = gltf.scene;
            this._setGlbMatrix(renderComponent);
            this.modelMaps.set('healthPack',renderComponent);
        });

        // muzzle sprite 开枪🔥火焰效果
        const muzzleTexture = this.textureLoader.load('./yuka-dive/textures/muzzle.png');
        muzzleTexture.matrixAutoUpdate = false;

        const muzzleMaterial = new THREE.SpriteMaterial({map:muzzleTexture});
        const muzzle = new THREE.Sprite(muzzleMaterial);
        muzzle.matrixAutoUpdate = false;
        muzzle.visible  = false;
        this.modelMaps.set('muzzle',muzzle);

        // 创建子弹
        const bulletLineGeometry = new THREE.BufferGeometry();
        const bulletLineMaterial = new THREE.MeshBasicMaterial({color:0xfbf8e6});
        //bulletLineGeometry.rotateX(Math.PI );// 绕X轴旋转
        bulletLineGeometry.setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]);

        const bulletLineMesh = new THREE.LineSegments(bulletLineGeometry,bulletLineMaterial);
        bulletLineMesh.matrixAutoUpdate = false;
        bulletLineMesh.updateMatrix();

        this.modelMaps.set('bulletLine',bulletLineMesh);
        return this;
    }
    // 加载纹理
    _loadTextures(){
        let texture = this.textureLoader.load('./yuka-dive/textures/crosshairs.png');
        this.textureMaps.set('crosshairs',texture);


		texture = this.textureLoader.load( './yuka-dive/textures/damageIndicatorFront.png' );
		texture.matrixAutoUpdate = false;
		this.textureMaps.set( 'damageIndicatorFront', texture );

		texture = this.textureLoader.load( './yuka-dive/textures/damageIndicatorRight.png' );
		texture.matrixAutoUpdate = false;
		this.textureMaps.set( 'damageIndicatorRight', texture );

		texture = this.textureLoader.load( './yuka-dive/textures/damageIndicatorLeft.png' );
		texture.matrixAutoUpdate = false;
		this.textureMaps.set( 'damageIndicatorLeft', texture );

		texture = this.textureLoader.load( './yuka-dive/textures/damageIndicatorBack.png' );
		texture.matrixAutoUpdate = false;
		this.textureMaps.set( 'damageIndicatorBack', texture );

		return this;
    }
    _loadNavMesh(){
        this.loadingManager.itemStart('navmesh');
        this.navMeshLoader.load('./yuka-dive/navmeshes/navmesh.glb').then(navMesh=>{
            this.navMesh = navMesh; // 返回的是NavMesh 对象
            //console.log(11,navMesh);
            this.loadingManager.itemEnd('navmesh');
        });

        this.loadingManager.itemStart('costTable');
        fetch('./yuka-dive/navmeshes/costTable.json').then(response=>{
            return response.json();
        }).then(json=>{
            this.costTable = new YUKA.CostTable().fromJSON(json);
            this.loadingManager.itemEnd('costTable');
        });

        return this;
    }
    /**
     * 
     * @param {*} source a positionalAudio 
     * @returns 
     */
    cloneAudio(source){
        const audio =  new source.constructor(source.listener);
        audio.buffer = source.buffer;
        return audio;
    }

    _setGlbMatrix(renderComponent){
        this._setMatrix(renderComponent);
        renderComponent.traverse(object=>{
            this._setMatrix(object);
        });
    }
    _setMatrix(renderComponent){
        renderComponent.matrixAutoUpdate = false;
        renderComponent.updateMatrix();
    }
}