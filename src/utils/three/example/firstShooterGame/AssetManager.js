import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons';

/**
 * 资源加载管理器
 */
export default class AssetManager{
    constructor(){
        this.loadingManager = new THREE.LoadingManager();

        this.audioLoader = new THREE.AudioLoader(this.loadingManager);
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.gltfLoader = new GLTFLoader(this.loadingManager);

        this.listener = new THREE.AudioListener();

        this.animationMaps = new Map();
        this.audioMaps = new Map();
        this.modelMaps = new Map();
    }

    init(){
        // 加载音频文件
        this._loadAudios();
        // 加载模型
        this._loadModels();
        // 加载动画
        this._loadAnimations();

        return new Promise((resolve,reject)=>{
            this.loadingManager.onLoad=()=>{
                resolve({status:1,msg:'加载完毕',value:0});
            };
            this.loadingManager.onError = (error)=>{
                reject({msg:'加载失败',status:0,value:error})
            };
        });
    }

    _loadAudios(){
        const step1 = new THREE.Audio(this.listener);
        const step2 = new THREE.Audio(this.listener);

        const shoot = new THREE.PositionalAudio(this.listener);
        const reload = new THREE.PositionalAudio(this.listener);
        const impact1 = new THREE.PositionalAudio(this.listener);
        const impact2 = new THREE.PositionalAudio(this.listener);
        const impact3 = new THREE.PositionalAudio(this.listener);
        const impact4 = new THREE.PositionalAudio(this.listener);
        const impact5 = new THREE.PositionalAudio(this.listener);
        const empty = new THREE.PositionalAudio(this.listener);

        // 设置声音大小
        shoot.setVolume(0.3);
        reload.setVolume(0.1);
        empty.setVolume(0.3);

        this.audioLoader.load('./yuka/firstShooter/audio/step1.ogg',buffer=>step1.setBuffer(buffer));
        this.audioLoader.load('./yuka/firstShooter/audio/step2.ogg',buffer=>step2.setBuffer(buffer));
        this.audioLoader.load('./yuka/firstShooter/audio/shoot.ogg',buffer=>shoot.setBuffer(buffer));
        this.audioLoader.load('./yuka/firstShooter/audio/reload.ogg',buffer=>reload.setBuffer(buffer));
        this.audioLoader.load('./yuka/firstShooter/audio/impact1.ogg',buffer=>impact1.setBuffer(buffer));
        this.audioLoader.load('./yuka/firstShooter/audio/impact2.ogg',buffer=>impact2.setBuffer(buffer));
        this.audioLoader.load('./yuka/firstShooter/audio/impact3.ogg',buffer=>impact3.setBuffer(buffer));
        this.audioLoader.load('./yuka/firstShooter/audio/impact4.ogg',buffer=>impact4.setBuffer(buffer));
        this.audioLoader.load('./yuka/firstShooter/audio/impact5.ogg',buffer=>impact5.setBuffer(buffer));
        this.audioLoader.load('./yuka/firstShooter/audio/empty.ogg',buffer=>empty.setBuffer(buffer));

        // 设置到map 中减
        this.audioMaps.set('step1',step1);
        this.audioMaps.set('step2',step2);
        this.audioMaps.set('shoot',shoot);
        this.audioMaps.set('reload',reload);
        this.audioMaps.set('impact1',impact1);
        this.audioMaps.set('impact2',impact2);
        this.audioMaps.set('impact3',impact3);
        this.audioMaps.set('impact4',impact4);
        this.audioMaps.set('impact5',impact5);
        this.audioMaps.set('empty',empty);

    }
    _loadModels(){
        // 加载目标点
        this.gltfLoader.load('./yuka/firstShooter/model/target.glb',gltf=>{
            console.log('目标靶子:',gltf);
            const targetMesh = gltf.scene.getObjectByName('LowPoly003__0');
            // 下面的操作移到yuka中去
            // targetMesh.geometry.scale(0.5,0.5,0.5);
            // targetMesh.geometry.rotateX(Math.PI * 0.5)
            // targetMesh.geometry.rotateY(Math.PI)
            // targetMesh.geometry.rotateZ(Math.PI);
            
               
            targetMesh.castShadow = true;
            this.modelMaps.set('target',targetMesh);
        });

        // 加载枪的模型,weapon
        this.gltfLoader.load('./yuka/firstShooter/model/gun.glb',gltf=>{
            //console.log('枪:',gltf);
            const weaponMesh = gltf.scene.children[0];
            const tempMesh = weaponMesh.getObjectByName('1_low__0');
            // console.log(weaponMesh.clone());
            // console.log(tempMesh);
            tempMesh.geometry.scale(0.8,0.8,0.8);
            tempMesh.geometry.rotateZ(Math.PI * 0.5);
            tempMesh.geometry.rotateY(Math.PI * 0.5);
            this.modelMaps.set('weapon',weaponMesh);

            // 加载开枪时枪口火焰的纹理
            const texture = this.textureLoader.load('./yuka/firstShooter/model/muzzle.png');
            const material = new THREE.SpriteMaterial({map:texture});
            const sprite = new THREE.Sprite(material);
            // muzzle :枪口
            sprite.position.set(0,-0.03,-1.6);
            sprite.scale.set(0.3,0.3,0.3);
            sprite.visible = false;
            this.modelMaps.set('muzzle',sprite);
            weaponMesh.add(sprite);
        });

        // 子弹孔洞
        const texture = this.textureLoader.load('./yuka/firstShooter/model/bulletHole.png');
        texture.minFilter = THREE.LinearFilter;
        const bulletHoleGeometry = new THREE.PlaneGeometry(0.1,0.1);
        const bulletHoleMaterial = new THREE.MeshLambertMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4});
        const bulletHole = new THREE.Mesh(bulletHoleGeometry,bulletHoleMaterial);
        this.modelMaps.set('bulletHole',bulletHole);

        // 子弹线就是子弹
        const bulletLineGeometry = new THREE.BufferGeometry();
        const bulletLineMaterial = new THREE.LineBasicMaterial({color:0xfbf8e6});
        bulletLineGeometry.setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]);// 这里的方向应该是相机的位置 -> 相机的朝向。模拟人类的眼睛效果
        const bulletLine = new THREE.LineSegments(bulletLineGeometry,bulletLineMaterial);
        this.modelMaps.set('bulletLine',bulletLine);

        // ground-地面
        const groundGeometry = new THREE.PlaneGeometry(200,200);
        groundGeometry.rotateX(-Math.PI * 0.5);
        const groundMaterial = new THREE.MeshPhongMaterial({color:0x999999});
        const groundMesh = new THREE.Mesh(groundGeometry,groundMaterial);
        groundMesh.receiveShadow = true;
        //this.scene.add(new THREE.PlaneHelper(groundMesh,1,0xffff00));
        this.modelMaps.set('ground',groundMesh);
    }

    _loadAnimations(){
        // 创建关键帧
        let positionKeyframes,rotationKeyframes;
        let q0,q1,q2;

        // 创建shoot 射击动画
        positionKeyframes = new THREE.VectorKeyframeTrack('.position',[0,0.05,0.15,0.3],[
            0.3,-0.3,-1, // 这个值的设置，是因为设置了枪的位置在0.3,-0.3,-1 上
            0.3,-0.2,-0.7,
            0.3,-0.305,-1,
            0.3,-0.3,-1
        ]);
        q0 = new THREE.Quaternion();
        q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),0.2);
        q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-0.02);

        rotationKeyframes = new THREE.QuaternionKeyframeTrack('.rotation',[0,0.05,0.15,0.3],[
            q0.x,q0.y,q0.z,q0.w,
            q1.x,q1.y,q1.z,q1.w,
            q2.x,q2.y,q2.z,q2.w,
            q0.x,q0.y,q0.z,q0.w
        ]);

        const shootClip = new THREE.AnimationClip('shoot',0.3,[positionKeyframes,rotationKeyframes]);
        this.animationMaps.set('shoot',shootClip);

        // reload 
        positionKeyframes = new THREE.VectorKeyframeTrack('.position',[0,0.2,1.3,1.5],[
            0.3,-0.3,-1,
            0.3,-0.6,-1,
            0.3,-0.6,-1,
            0.3,-0.3,-1
        ]);
        q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-0.4);
        rotationKeyframes = new THREE.QuaternionKeyframeTrack('.rotation',[0,0.2,1.3,1.5],[
            q0.x,q0.y,q0.z,q0.w,
            q1.x,q1.y,q1.z,q1.w,
            q1.x,q1.y,q1.z,q1.w,
            q0.x,q0.y,q0.z,q0.w
        ]);
        const reloadClip = new THREE.AnimationClip('reload',1.5,[positionKeyframes,rotationKeyframes]);
        this.animationMaps.set('reload',reloadClip);

    }
}