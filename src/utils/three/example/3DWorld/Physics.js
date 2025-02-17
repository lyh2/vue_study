import * as THREE from "three";

import {Octree} from "three/examples/jsm/math/Octree";
import {OctreeHelper} from "three/examples/jsm/helpers/OctreeHelper";

import { Capsule } from "three/examples/jsm/math/Capsule.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default class Physics{
    constructor(planeGroup,camera,scene){
        this._eventPositionList =[];
        this.worldOctree = new Octree();
        this.worldOctree.fromGraphNode(planeGroup);

        this._scene = scene;
        this._camera = camera;
        // 创建一个octreeHelper
        const octreeHelper  = new OctreeHelper(this.worldOctree);
        this._scene.add(octreeHelper);

        // 创建一个人的碰撞体
        this._playerCollider = new Capsule(new THREE.Vector3(0,0.35,0),new THREE.Vector3(0,1.35,0),0.35);
        // 加载机器人
        const loader = new GLTFLoader();
        this._mixer = null;
        this._actions= {};
        this._activeAction = null;

        loader.load("./world3D/model/RobotExpressive.glb",gltf=>{
            this._robot = gltf.scene;
            this._robot.scale.set(0.5,0.5,0.5);
            this._robot.position.set(0,-0.88,0);

            this._capsule.add(this._robot);
            this._mixer = new THREE.AnimationMixer(this._robot);
            for(let i =0; i < gltf.animations.length;i++){
                let name = gltf.animations[i].name;
                this._actions[name] = this._mixer.clipAction(gltf._actions[i]);
                if(name == "Idle" || name == "Walking" || name == "Running"){
                    this._actions[name].clampWhenFinished = false;
                    this._actions[name].loop = THREE.LoopRepeat;
                }else{
                    this._actions[name].clampWhenFinished = true;
                    this._actions[name].loop = THREE.LoopOnce;
                }
            }

            this._activeAction = this._actions['Idle'];
            this._activeAction.play();
        });

        this._capsule = new THREE.Object3D();
        this._capsule.position.set(0,0.85,0);
        const backCamera = new THREE.PerspectiveCamera(70,window.innerWidth / window.innerHeight,0.1,1000);
        this._camera.position.set(0,2,-5);
        this._camera.lookAt(this._capsule.position);// 相机看向机器人

        backCamera.position.set(0,2,5);
        backCamera.lookAt(this._capsule.position);// 另一个相机也看向机器人

        this._capsuleBodyControl = new THREE.Object3D(); //控制两个相机
        this._capsuleBodyControl.add(this._camera);
        this._capsuleBodyControl.add(backCamera);
        this._capsule.add(this._capsuleBodyControl);

        this._scene.add(this._capsule);

        this._gravity = -9.8;
        this._playerVelocity = new THREE.Vector3(0,0,0);
        this._playerDirection = new THREE.Vector3(0,0,0);

        this._keyStates ={
            KeyW:false,
            KeyA:false,
            KeyS:false,
            KeyD:false,
            Space:false,
            isDown:false,
        };

        this._playerOnFloor = false;

        document.addEventListener('keydown',e=>{
            this._keyStates[e.code] = true;
            this._keyStates.isDown = true;
        },false);

        document.addEventListener('keyup',e=>{
            this._keyStates[e.code] = false;
            this._keyStates.isDown = false;
            if(e.code === "KeyV"){
                this._activeCamera = this._activeCamera === this._camera ? backCamera : this._camera;
            }
            if(e.code === "KeyT"){
                this._fadeToAction("Wave");
            }
        },false);

        document.addEventListener("mousedown",e=>{
            document.body.requestPointerLock();
        },false);

        window.addEventListener("mousemove",e=>{
            this._capsule.rotation.y -= e.movementX * 0.003;

            this._capsuleBodyControl.rotation.x += e.movementY * 0.003;

            if(this._capsuleBodyControl.rotation.x > Math.PI / 8){
                this._capsuleBodyControl.rotation.x = Math.PI / 8;
            }else if(this._capsuleBodyControl.rotation.x < - Math.PI / 8){
                this._capsuleBodyControl.rotation.x = - Math.PI / 8;
            }
        },false);
    }

    _updatePlayer(deltaTime){
        let damping = -0.25;
        if(this._playerOnFloor){
            this._playerVelocity.y =0;
            this._keyStates.isDown || this._playerVelocity.addScaledVector(this._playerVelocity,damping);
        }else{
            this._playerVelocity.y += this._gravity * deltaTime;
        }

        const playerMoveDistance = this._playerVelocity.clone().multiplyScalar(deltaTime);
        this._playerCollider.translate(playerMoveDistance);
        this._playerCollider.getCenter(this._capsule.position);

        // 进行碰撞检测
        this._playerCollisions();

        if(Math.abs(this._playerVelocity.x) + Math.abs(this._playerVelocity.z) > 0.1 && Math.abs(this._playerVelocity.x) + Math.abs(this._playerVelocity.z) <= 3){
            this._fadeToAction("Walking");
        }else  if(Math.abs(this._playerVelocity.x) + Math.abs(this._playerVelocity.z) > 3){
            this._fadeToAction("Running");
        }else{
            this._fadeToAction("Idle");
        }
    }

    _playerCollisions(){
        const result = this.worldOctree.capsuleIntersect(this._playerCollider);
        this._playerOnFloor = false;
        if(result){
            this._playerOnFloor = result.normal.y > 0;
            this._playerCollider.translate(result.normal.multiplyScalar(result.depth));
        }
    }

    _resetPlayer(){
        if(this._capsule.position.y < -20){
            this._playerCollider.start.set(0,2.35,0);
            this._playerCollider.end.set(0,3.35,0);
            this._playerCollider.radius = 0.35;
            this._playerVelocity.set(0,0,0);
            this._playerDirection.set(0,0,0);
        }
    }

    _fadeToAction(actionName){
        this._prevAction = this._activeAction;
        this._activeAction = this._actions[actionName];
        if(this._prevAction != this._activeAction){
            this._prevAction.fadeOut(0.3);
            this._activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.3).play();
            this._mixer.addEventListener("finsihed",e=>{
                this._prevAction = this._activeAction;
                this._activeAction = this._actions["Idle"];
                this._prevAction.fadeOut(0.3);
                this._activeAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.3).play();
            });
        }
    }

    _controlPlayer(deltaTime){
        const capsuleFront = new THREE.Vector3(0,0,0);
        this._capsule.getWorldDirection(capsuleFront);

        if(this._keyStates["KeyW"]){
            this._playerDirection.z = 1;

            if(this._playerVelocity.x * this._playerVelocity.x + this._playerVelocity.z * this._playerVelocity.z <= 200){
                this._playerVelocity.add(capsuleFront.multiplyScalar(deltaTime * 5));
            }
        }

        if(this._keyStates["KeyS"]){
            this._playerDirection.z = 1;
            this._playerVelocity.add(capsuleFront.multiplyScalar(-deltaTime));
        }

        if(this._keyStates['KeyA']){
            this._playerDirection.x = 1;
            capsuleFront.cross(this._capsule.up);
            this._playerVelocity.add(capsuleFront.multiplyScalar(-deltaTime));
        }

        if(this._keyStates["KeyD"]){
            this._playerDirection.x = 1;
            capsuleFront.cross(this._capsule.up);
            this._playerVelocity.add(capsuleFront.multiplyScalar(deltaTime));
        }

        if(this._keyStates['Space']){
            this._playerVelocity.y = 5;
        }
    }

    update(deltaTime){
        this._controlPlayer(deltaTime);
        this._updatePlayer(deltaTime);
        this._resetPlayer();
        if(this._mixer){
            this._mixer.update(deltaTime);
        }

        this._emitPositionEvent();
    }

    _emitPositionEvent(){
        this._eventPositionList.forEach((item,i)=>{
            const distanceToSquared = this._capsule.position.distanceToSquared(item.position);
            if(distanceToSquared < item.radius * item.radius && item.isInner == false){
                item.isInner = true;
                item.callback && item.callback(item);
            }

            if(distanceToSquared >= item.radius * item.radius && item.isInner == true)
            {
                item.isInner = false;
                item.outCallback && item.outCallback(item);
            }
        });
    }

    onPosition(position,callback,outCallback,radius = 2){
        position = position.clone();
        this._eventPositionList.push({
            position,
            callback,outCallback,
            isInner:false,
            radius
        });
    }





}