/**
 * https://sbcode.net/ 网站资源学习
 * 
 */
import * as THREE from 'three';
import { ConvexGeometry, ConvexObjectBreaker, DRACOLoader, GLTFLoader, Lensflare, LensflareElement, OrbitControls, Reflector } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as REPIER from '@dimforge/rapier3d-compat'; // 把wasm 格式文件转base64，在前端使用
import { HDRJPGLoader } from '@monogrid/gainmap-js';
import CannonDebugger from 'cannon-es-debugger';
import * as CANNON from 'cannon-es';


class RapierDebugRenderer{
    constructor(scene,world){
        this.scene = scene;
        this.world = world;
        this.mesh = new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xff0000,vertexColors:true}));
        this.mesh.frustumCulled = false;// 不进行剔除
        this.scene.add(this.mesh);
        this.enabled = true;
    }

    update(){
        if(this.enabled){
            const {vertices,colors} = this.world.debugRender();
            this.mesh.geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));
            this.mesh.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
            this.mesh.visible = true;
        }else{
            this.mesh.visible = false;
        }
    }
}

class Keyboard{
    constructor(renderer){
        this.renderer = renderer;
        this.keyMap = {};

        document.addEventListener('pointerlockchange',()=>{
            if(document.pointerLockElement === this.renderer.domElement){
                document.addEventListener('keydown',this.onDocumentKey);
                document.addEventListener('keyup',this.onDocumentKey);
            }else{
                document.removeEventListener('keydown',this.onDocumentKey);
                document.removeEventListener('keyup',this.onDocumentKey);
            }
        });
    }

    onDocumentKey(e){
        console.log('e:',e);
        this.keyMap[e.code] = e.type === 'keydown';
    }
}

class FollowCamera{
    constructor(scene,camera,renderer){
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this.pivot = new THREE.Object3D();
        this.yaw = new THREE.Object3D();
        this.pitch = new THREE.Object3D();

        this.yaw.position.y = 0.75;

        document.addEventListener('pointerlockchange',()=>{
            if(document.pointerLockElement === this.renderer.domElement){
                this.renderer.domElement.addEventListener('mousemove',this.onDocumentMouseMove);
                this.renderer.domElement.addEventListener('wheel',this.onDocumentMouseWheel);
            }else{
                this.renderer.domElement.removeEventListener('mousemove',this.onDocumentMouseMove);
                this.renderer.domElement.removeEventListener('wheel',this.onDocumentMouseWheel);
            }
        });

        this.scene.add(this.pivot);
        this.pivot.add(this.yaw);
        this.yaw.add(this.pitch);
        this.pitch.add(this.camera);
    }

    onDocumentMouseMove(e){
        this.yaw.rotation.y -= e.movementX * 0.002;
        const v = this.pitch.rotation.x - e.movementY * 0.002;

        if(v > -1 && v < 1){
            this.pitch.rotation.x = v;
        }
    }

    onDocumentMouseWheel(e){
        e.preventDefault();
        const v = this.camera.position.z + e.deltaY * 0.005;
        if(v >= 0.5 && v <= 10)
        {
            this.camera.position.z = v;
        }
    }
}
class Eve extends THREE.Group{
    constructor(){
        super();

        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('./draco/gltf/');
        dracoLoader.setDecoderConfig({ type: "js" });
        dracoLoader.preload();
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(dracoLoader);
    }

    async init(animationActions){
        const [eve,idle,run,jump,pose]=await Promise.all([
         
                        this.gltfLoader.loadAsync('/models/game/eve$@walk_compressed.glb'),
                        this.gltfLoader.loadAsync('/models/game/eve@idle.glb'),
                        this.gltfLoader.loadAsync('/models/game/eve@run.glb'),
                        this.gltfLoader.loadAsync('/models/game/eve@jump.glb'),
                        this.gltfLoader.loadAsync('/models/game/eve@pose.glb')
        ]);
        eve.scene.traverse(m=>{
            if(m.isMesh){
                m.castShadow = true;
            }
        });

        this.mixer = new THREE.AnimationMixer(eve.scene);
        animationActions['idle'] = this.mixer.clipAction(idle.animations[0]);
        animationActions['jump'] = this.mixer.clipAction(jump.animations[0]);
        animationActions['pose'] = this.mixer.clipAction(pose.animations[0]);
        animationActions['walk'] = this.mixer.clipAction(THREE.AnimationUtils.subclip(eve.animations[0],'walk',0,42));
        animationActions['run'] = this.mixer.clipAction(THREE.AnimationUtils.subclip(run.animations[0],'run',0,17));

        animationActions['idle'].play();
        this.add(eve.scene);
    }

    update(delta){
        this?.mixer?.update(delta);
    }
}
class AnimationController{
    constructor(scene,keyboard){
        this.scene = scene;
        this.keyboard = keyboard;

        this.wait = false;
        this.animationActions = {};
        this.activeAction = null;
        this.speed = 0;
        this.model = null;
    }

    async init(){
        this.model = new Eve();
        await this.model.init(this.animationActions);
        this.activeAction = this.animationActions['idle'];
        this.scene.add(this.model);
    }

    setAction(action){
        if(this.activeAction != action){
            this.activeAction.fadeOut(0.1);
            action.reset().fadeIn(0.1).play();
            this.activeAction = action;

            switch(action){
                case this.animationActions['walk']:
                    this.speed = 5.25;
                    break;
                case this.animationActions['run']:
                    case this.animationActions['jump']:
                        this.speed = 16;
                        break;
                case this.animationActions['pose']:
                    case this.animationActions['idle']:
                        this.speed = 0;
                        break;
                default:
                    this.speed = 0;
            }
        }
    }

    update(delta){
        if(!this.wait){
            let actionAssigned = false;
            // 跳跃
            if(this.keyboard.keyMap['Space']){
                this.setAction(this.animationActions['jump']);
                actionAssigned = true;
                this.wait = true;
                setTimeout(()=>{this.wait = false;},1200)
            }

            if(!actionAssigned && (this.keyboard.keyMap['KeyW'] || this.keyboard.keyMap['KeyA'] || this.keyboard.keyMap['KeyS'] || this.keyboard.keyMap['KeyD']) && this.keyboard.keyMap['ShiftLeft']){
                this.setAction(this.animationActions['run']);
                actionAssigned = true;
            }

            if(!actionAssigned && (this.keyboard.keyMap['KeyW'] || this.keyboard.keyMap['KeyA'] || this.keyboard.keyMap['KeyS'] || this.keyboard.keyMap['KeyD'])){
                this.setAction(this.animationActions['walk']);
                actionAssigned = true;
            }

            if(!actionAssigned && this.keyboard.keyMap['KeyQ']){
                this.setAction(this.animationActions['pose']);
                actionAssigned = true;
            }

            !actionAssigned && this.setAction(this.animationActions['idle']);
        }

        this.model.update(delta);
    }
}
class Player{
    constructor(scene,camera,renderer,world,position=[0,0,0]){
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.world = world;

        this.body = null;
        this.animationController = null;
        this.vector = new THREE.Vector3();
        this.inputVelocity = new THREE.Vector3();
        this.euler = new THREE.Euler();
        this.quaternion = new THREE.Quaternion();
        this.followTarget = new THREE.Object3D();//new Mesh(new SphereGeometry(0.1), new MeshNormalMaterial())
        this.grounded = true;
        
        this.rotationMatrix = new THREE.Matrix4();
        this.targetQuaternion = new THREE.Quaternion();
        this.followCamera = null;
        this.keyboard = null;
        this.wait = false;

        this.keyboard = new Keyboard(this.renderer);
        this.followCamera = new FollowCamera(this.scene,this.camera,this.renderer);

        this.scene.add(this.followTarget);

        this.body = this.world.createRigidBody(REPIER.RigidBodyDesc.dynamic().setTranslation(...position).enabledRotations(false,false,false).setLinearDamping(5).setCanSleep(false));

        const shape = REPIER.ColliderDesc.capsule(0.5,0.15).setTranslation(0,0.645,0).setMass(1).setFriction(0).setActiveEvents(REPIER.ActiveEvents.COLLISION_EVENTS);

        this.world.createCollider(shape,this.body);
    }

    async init(){
        this.animationController = new AnimationController(this.scene,this.keyboard);
        this.animationController.init();
    }

    setGround(){
        this.body.setLinearDamping(4);
        this.grounded = true;
        setTimeout(()=>{this.wait=false},250);
    }

    update(delta){
        this.inputVelocity.set(0,0,0);
        if(this.grounded){
            if(this.keyboard.keyMap['KeyW']){
                this.inputVelocity.z = -1;
            }
            if(this.keyboard.keyMap['KeyS']){
                this.inputVelocity.z = 1;
            }
            if(this.keyboard.keyMap['KeyA']){
                this.inputVelocity.x = -1;
            }
            if(this.keyboard.keyMap['KeyD']){
                this.inputVelocity.x = 1;
            }

            this.inputVelocity.setLength(delta * (this.animationController.speed || 1));

            if(!this.wait && this.keyboard.keyMap['Space']){
                this.wait = true;
                this.body.setLinearDamping(0);
                if(this.keyboard.keyMap['ShiftLeft']){
                    this.inputVelocity.multiplyScalar(15);
                }else{
                    this.inputVelocity.multiplyScalar(10);
                }

                this.inputVelocity.y  = 5;// jump height
                this.grounded = false;
            }
        }

        this.euler.y = this.followCamera.yaw.rotation.y;
        this.quaternion.setFromEuler(this.euler);
        this.inputVelocity.applyQuaternion(this.quaternion);

        this.body.applyImpulse(this.inputVelocity,true);

        this.followTarget.position.copy(this.body.translation);
        this.followTarget.getWorldPosition(this.vector);
        this.followCamera.pivot.position.lerp(this.vector,delta * 10);

        this.animationController.model.position.lerp(this.vector,delta * 20);

        this.rotationMatrix.lookAt(this.followTarget.position,this.animationController.model.position,this.animationController.model.up);
        this.targetQuaternion.setFromRotationMatrix(this.rotationMatrix);

        const distance = this.animationController.model.position.distanceTo(this.followTarget.position);

        if(distance > 0.0001 && !this.animationController.model.quaternion.equals(this.targetQuaternion)){
            this.targetQuaternion.z = 0;
            this.targetQuaternion.x = 0;
            this.targetQuaternion.normalize();
            this.animationController.model.quaternion.rotateTowards(this.targetQuaternion,delta * 20);
        }
        this.animationController.update(delta);
    }
}

class Environment{
    constructor(scene,renderer){
        this.scene = scene;
        this.renderer = renderer;
        this.scene.add(new THREE.GridHelper(50,50));

        this.light = new THREE.DirectionalLight(0xffffff,Math.PI);
        this.light.position.set(65.7,19.2,50.2);
        this.light.castShadow = true;
        this.scene.add(this.light);

        const directionalHelper = new THREE.CameraHelper(this.light.shadow.camera);
        this.scene.add(directionalHelper);

        // 加载纹理
        const loader = new THREE.TextureLoader();
        const textureFlare0 = loader.load('./lensflare/lensflare0.png');
        const textureFlare3 = loader.load('./lensflare/lensflare3.png');

        const lensflare = new Lensflare();// 添加光晕效果
        lensflare.addElement(new LensflareElement(textureFlare0,1000,0));
        lensflare.addElement(new LensflareElement(textureFlare3,500,0.2));
        lensflare.addElement(new LensflareElement(textureFlare3,250,0.8));
        lensflare.addElement(new LensflareElement(textureFlare3,125,0.6));
        lensflare.addElement(new LensflareElement(textureFlare3,62.5,0.4));
        this.light.add(lensflare);
    }

    async init(){
        // 加载纹理
        await new HDRJPGLoader(this.renderer).loadAsync('./hdr/venice_sunset_1k.hdr.jpg').then(tex=>{
            tex.renderTarget.texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = tex.renderTarget.texture;
            this.scene.background = tex.renderTarget.texture;
            this.scene.backgroundBlurriness = 0.4;
        });
    }
}

class UI{
    constructor(renderer){
        this.renderer = renderer;
        this.renderer.domElement.requestPointerLock();

    }

    init(){
        document.addEventListener('keydown',e=>{
            console.log('键盘按下');
        },false);
    }
}
class Game{
    constructor(scene,camera,renderer){
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.player = null;
        this.world = null;
        this.rapierDebugRenderer = null;
        this.eventQueue = null;
        REPIER.init().then(()=>{
                this.init(this.renderer);
        });// 只有compat 版本才需要这行代码

    }

    async init(renderer){
        console.log('REPIER:',REPIER)
     
        const gravity = new THREE.Vector3(0,-9.8,0);

        this.world = new REPIER.World(gravity);
        this.eventQueue = new REPIER.EventQueue(true);

        this.rapierDebugRenderer = new RapierDebugRenderer(this.scene,this.world);

        const gui = new GUI();
        gui.add(this.rapierDebugRenderer,'enabled').name('Rapier Debug Renderer');

        // 创建地面
        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(50,1,50),new THREE.MeshStandardMaterial({
            color:0xfdfdfd,
            side:THREE.DoubleSide,
        }));
        floorMesh.receiveShadow = true;
        floorMesh.position.y = -0.5;
        this.scene.add(floorMesh);

        const floorBody = this.world.createRigidBody(REPIER.RigidBodyDesc.fixed().setTranslation(0,-0.5,0));
        const floorShape = REPIER.ColliderDesc.cuboid(25,0.5,25);
        this.world.createCollider(floorShape,floorBody);

        this.player = new Player(this.scene,this.camera,this.renderer,this.world,[0.,0.1,0]);
        await this.player.init();

        const environment = new Environment(this.scene,this.renderer);
        environment.init();
        environment.light.target = this.player.followTarget;

        //const ui = new UI(renderer);
        
    }

    update(delta){
        this.world.timestep = Math.min(delta,0.1);
        this.world.step(this.eventQueue);
        this.eventQueue.drainCollisionEvents((_,__,started)=>{
            if(started){
                this.player.setGrounded();
            }
        });

        this.player.update(delta);
        this.rapierDebugRenderer.update();
    }
}

// 1、Obstacle Course Game : Part 1
export class FirstPerson{
    constructor(_options={}){
        this._options = _options;

        this.init();
    }
    async init(){
        this.scene = new THREE.Scene();

        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.001,1000);
        this.perspectiveCamera.position.set(0,0,2);

        this.clock = new THREE.Clock();
        
               

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.game  = new Game(this.scene,this.perspectiveCamera,this.renderer);
        //await this.game.init(this.renderer);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        this._options.dom.appendChild(this.renderer.domElement);

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
        this.orbitControls.update();

        this.stats = new Stats();
        this._options.dom.appendChild(this.stats.dom);


    }

    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
        this.game?.world &&  this.game.update(this.clock.getDelta());
        this.stats.update();
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

/**
 * 根据geometry生成CANNON中的多面体
 * @param {*} geometry 
 * @returns 
 */
function createConvexPolyhedron(geometry){
    //console.log('geometry:',geometry)
    const position = geometry.attributes.position;//{array,count}
    const normal = geometry.attributes.normal;
    const vertices = [];
    for(let i = 0; i < position.count;i++){
        vertices.push(new THREE.Vector3().fromBufferAttribute(position,i));
    }
    const faces = [];
    for(let i =0; i < position.count;i+=3){
        const vertexNormals = normal === undefined ? [] : [
            new THREE.Vector3().fromBufferAttribute(normal,i),
            new THREE.Vector3().fromBufferAttribute(normal,i+1),
            new THREE.Vector3().fromBufferAttribute(normal,i+2),
        ];

        const face = {
            a:i,
            b:i + 1,
            c:i+2,
            normals:vertexNormals
        };
        faces.push(face);
    }

    const verticesMap ={};
    const points = [];
    const changes = [];
    // 减少了很多点
    for(let i =0, l = vertices.length;i < l;i ++){
        const v = vertices[i];
        const key = Math.round(v.x * 100) + '_'+Math.round(v.y * 100) + '_'+ Math.round(v.z * 100);
        if(verticesMap[key] === undefined){
            verticesMap[key] = i;
            points.push(new CANNON.Vec3(vertices[i].x,vertices[i].y,vertices[i].z));
            changes[i] = points.length - 1;
        }else{
            changes[i] = changes[verticesMap[key]];
        }
    }
    //console.log('points:',vertices.length,points);
    const faceIdsToRemove = [];
    for(let i = 0,l = faces.length;i < l;i++){
        const face = faces[i];
        face.a = changes[face.a];
        face.b = changes[face.b];
        face.c = changes[face.c];
        const indices = [face.a,face.b,face.c];
        for(let n = 0 ; n < 3;n++){
            if(indices[n] === indices[(n + 1) % 3]){
                faceIdsToRemove.push(i);
                break;
            }
        }
    }

    for(let i = faceIdsToRemove.length - 1;i >= 0;i--){
        const idx = faceIdsToRemove[i];
        faces.splice(idx,1);
    }

    const cannonFaces = faces.map(f=>{
        return [f.a,f.b,f.c];
    });
    return new CANNON.ConvexPolyhedron({vertices:points,faces:cannonFaces});
}
/**
 * cannon+ConvexObjectBreaker 进行破碎效果实现
 */
export class UseConvexObjectBreaker {
    constructor(_options={}){
        this._options = _options;

        this.init();
    }

    init(){
        this.scene = new THREE.Scene();

        this.clock = new THREE.Clock();

        const light1 = new THREE.DirectionalLight();
        light1.position.set(20,20,20);
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight();
        light2.position.set(-20,20,20);
        this.scene.add(light2);

        this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.001,1000);

        this.perspectiveCamera.position.set(0,10,10);

        this.renderer = new THREE.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        this._options.dom.appendChild(this.renderer.domElement);

        this.renderer.domElement.addEventListener('click',this.onClick.bind(this),false);

        document.addEventListener('keydown',this.onKeydown.bind(this),false);

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

        this.world = new CANNON.World();
        this.world.gravity.set(0,-9.82,0);
        this.world.allowSleep = false;
        this.world.solver.iteration = 20;

        const material = new THREE.MeshStandardMaterial({
            color:0xa2ffb8,
            metalness:1.,
            roughness:0.25,
            transparent:true,
            opacity:0.75,
            side:THREE.DoubleSide,
          
        });

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        const envTexture = new THREE.TextureLoader().load('./hdr/40a1edfb54ca7b34b7e349afc89f73277702473047438189240.jpg',(tex)=>{
            material.envMap = pmremGenerator.fromEquirectangular(tex).texture;
        });

        this.meshes ={};
        this.bodies ={};
        this.meshId = 0;

        // 创建地面
        const groundMirror = new Reflector(new THREE.PlaneGeometry(1024,1024),{
            color:new THREE.Color(0x222222),
            clipBias:0.03,
            textureWidth:window.innerWidth * window.devicePixelRatio,
            textureHeight :window.innerHeight * window.devicePixelRatio,
        });
        groundMirror.position.y = -0.05;
        groundMirror.rotateX(-Math.PI * 0.5);
        this.scene.add(groundMirror);

        // 创建地面对应的物理世界形状
        const planeShape = new CANNON.Plane();
        const planeBody = new CANNON.Body({mass:0});
        planeBody.addShape(planeShape);
        planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI / 2);
        this.world.addBody(planeBody);

        // 创建COnvexObjectBreaker
        this.convexObjectBreaker = new ConvexObjectBreaker();

        // 创建障碍物
        for(let i =0; i < 20 ; i ++){
            const size = {
                x:Math.random() * 4 + 2,
                y:Math.random() * 10 + 5,
                z:Math.random() * 4 + 2,
            };

            const geometry = new THREE.BoxGeometry(size.x,size.y,size.z);
            const cube = new THREE.Mesh(geometry,material);
            cube.position.set(
                Math.random() * 50 - 25,
                size.y / 2 + 0.1,
                Math.random() * 50 -25
            );

            this.scene.add(cube);
            this.meshes[this.meshId] = cube;
            this.convexObjectBreaker.prepareBreakableObject(this.meshes[this.meshId],1,new THREE.Vector3(),new THREE.Vector3(),true);

            // 创建对应的形状
            const cubeShape = new CANNON.Box(new CANNON.Vec3(size.x/2,size.y/2,size.z/2));
            const cubeBody = new CANNON.Body({
                mass:1
            });
            cubeBody.userData = {splitCount:0,id:this.meshId};
            cubeBody.addShape(cubeShape);
            cubeBody.position.set(cube.position.x,cube.position.y,cube.position.z);
            this.world.addBody(cubeBody);
            this.bodies[this.meshId] = cubeBody;
            this.meshId++;
        }

        // 创建子弹
        this.bullets ={};
        this.bulletBodies ={};
        this.bulletId = 0;
        this.bulletMaterial = new THREE.MeshPhysicalMaterial({
            color:0xff0000,
            side:THREE.DoubleSide,
        });

    }
    onClick(e){
        console.log('点击')
        const bullet = new THREE.Mesh(new THREE.SphereGeometry(1,16,32),this.bulletMaterial);
        bullet.position.copy(this.perspectiveCamera.position);
        this.scene.add(bullet);
        this.bullets[this.bulletId] = bullet;

        // 创建对应的形状
        const bulletShape = new CANNON.Sphere(1);
        const bulletBody = new CANNON.Body({mass:1});
        bulletBody.addShape(bulletShape);
        bulletBody.position.set(this.perspectiveCamera.position.x,this.perspectiveCamera.position.y,this.perspectiveCamera.position.z);

        this.world.addBody(bulletBody);
        this.bulletBodies[this.bulletId] = bulletBody;

        bulletBody.addEventListener('collide',(e)=>{
            console.log('碰撞:',e)
            if(e.body.userData){
                // 记录被分割的次数
                if(e.body.userData.splitCount < 2){
                    this.splitObject(e.body.userData,e.contact);
                }
            }
        });

        const v = new THREE.Vector3(0,0,-1);// -z
        v.applyQuaternion(this.perspectiveCamera.quaternion);
        v.multiplyScalar(150);
        bulletBody.velocity.set(v.x,v.y,v.z);
        bulletBody.angularVelocity.set(Math.random() * 10 + 1,Math.random() * 10 + 1,Math.random() * 10 + 1);
        this.bulletId++;

        // 移除原来的对象
        while(Object.keys(this.bullets).length > 5){
            this.scene.remove(this.bullets[this.bulletId - 6]);
            delete this.bullets[this.bulletId - 6];
            this.world.removeBody(this.bulletBodies[this.bulletId - 6]);
            delete this.bulletBodies[this.bulletId - 6];
        }
    }
    splitObject(userData,contact){
        const contactId = userData.id;
        if(this.meshes[contactId]){
            const poi = this.bodies[contactId].pointToLocalFrame(contact.bj.position).vadd(contact.rj);
            const n = new THREE.Vector3(contact.ni.x,contact.ni.y,contact.ni.z).negate();
            const shards = this.convexObjectBreaker.subdivideByImpact(this.meshes[contactId],new THREE.Vector3(poi.x,poi.y,poi.z),n,1,0);

            this.scene.remove(this.meshes[contactId]);
            delete this.meshes[contactId];
            this.world.removeBody(this.bodies[contactId]);
            delete this.bodies[contactId];

            shards.forEach(d =>{
                const nextId = this.meshId++;
                this.scene.add(d);
                this.meshes[nextId] = d;
                d.scale.set(0.99,0.99,0.99);// 缩小

                const shape = this.geometryToShape(d.geometry);

                const body = new CANNON.Body({mass:1});
                body.addShape(shape);
                body.userData={
                    splitCount:userData.splitCount+1,
                    id:nextId,
                };
                body.position.set(d.position.x,d.position.y,d.position.z);
                body.quaternion.set(d.quaternion.x,d.quaternion.y,d.quaternion.z,d.quaternion.w);
                this.world.addBody(body);
                this.bodies[nextId] = body;
            });
        }
        
    }
    /**
     * geometry 转形状
     * @param {*} geometry 
     */
    geometryToShape(geometry){
        const position = geometry.attributes.position.array;
        const points =[];
        for(let i =0; i < position.length;i+=3){
            points.push(new THREE.Vector3(position[i],position[i + 1],position[i + 2]));
        }

        const convexHull = new ConvexGeometry(points);// 先生成多边体
        const shape = createConvexPolyhedron(convexHull);
        return shape;
    }

    onKeydown(e){

    }
    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
        let delta = this.clock.getDelta();
        if(delta > 0.1) delta = 0.1;
        this.world.step(delta);

        Object.keys(this.meshes).forEach(m=>{
            this.meshes[m].position.set(this.bodies[m].position.x,this.bodies[m].position.y,this.bodies[m].position.z);
            this.meshes[m].quaternion.set(this.bodies[m].quaternion.x,this.bodies[m].quaternion.y,this.bodies[m].quaternion.z,this.bodies[m].quaternion.w);
        });

        Object.keys(this.bullets).forEach(b=>{
            this.bullets[b].position.set(this.bulletBodies[b].position.x,this.bulletBodies[b].position.y,this.bulletBodies[b].position.z);
            this.bullets[b].quaternion.set(this.bulletBodies[b].quaternion.x,this.bulletBodies[b].quaternion.y,this.bulletBodies[b].quaternion.z,this.bulletBodies[b].quaternion.w);
            
        })
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}