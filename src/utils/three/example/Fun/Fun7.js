/*
 * @Author: 412285349@qq.com 412285349@qq.com
 * @Date: 2024-10-02 21:19:25
 * @LastEditors: 412285349@qq.com 412285349@qq.com
 * @LastEditTime: 2024-11-17 21:30:17
 * @FilePath: /www/vue_study/src/utils/three/example/Fun/Fun7.js
 * @Description: 节点开发相关
 * 
 * Copyright (c) 2024 by ${git_name_email}, All Rights Reserved. 
 */
// 引入 AStar 库
import AStar from 'astar';

import * as THREE from "three/webgpu";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {RGBELoader} from "three/examples/jsm/loaders/RGBELoader";
import { If,PI2,atan2,color,frontFacing,output,positionLocal,Fn,uniform,vec4,vec2,texture,uv,mix,oneMinus,mul,smoothstep,rotateUV,vec3, storage, instanceIndex,uniformArray,uint, float,hash, PI, Loop, positionWorld, cameraPosition, normalWorld,normalize,max,step,bumpMap} from "three/tsl";
import { DRACOLoader, TransformControls } from "three/examples/jsm/Addons.js";
import {GUI} from "three/examples/jsm/libs/lil-gui.module.min";
import { GLTFLoader } from "three/examples/jsm/Addons.js";




/**
 * tsl进行角度分割
 */
export class TslAngularSlicing{
    constructor(_options={}){
        this._options = _options;

        this._init();
    }

    _init(params={}){
        console.log("THREE:",THREE);

        this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth/ window.innerHeight,0.1,1000);
        this._perspectiveCamera.position.set(0,100,100);
        
        // 创建场景
        this._scene = new THREE.Scene();
        this._gui = new GUI();

        // 加载环境贴图
        const rgbeLoader = new RGBELoader();
        rgbeLoader.load("./textures/equirectangular/royal_esplanade_1k.hdr",(environmentMap)=>{
            environmentMap.mapping  = THREE.EquirectangularReflectionMapping;
            this._scene.background = environmentMap;
            this._scene.environment = environmentMap;
        });

        // 添加灯光
        const directionalLight = new THREE.DirectionalLight(0xfffde2,4);
        directionalLight.position.set(10,3,4);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.set(2048,2048);
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.far= 30;
        directionalLight.shadow.camera.top = 8;
        directionalLight.shadow.camera.right = 8;
        directionalLight.shadow.camera.bottom  = -8;
        directionalLight.shadow.camera.left = -8;
        directionalLight.shadow.normalBias = 0.05;
        this._scene.add(directionalLight);

        // 定义TSL function
        const inAngle = Fn(([position,angleStart,angleArc])=>{
            const angle = atan2(position.y ,position.x).sub(angleStart).mod(PI2).toVar();
            return angle.greaterThan(0).and(angle.lessThan(angleArc));
        });

        // 创建一个节点材质
        const defaultMaterial = new THREE.MeshPhysicalNodeMaterial({
            metalness:0.5,
            roughness:0.25,
            envMapIntensity:0.5,
            color:0x858080,
        });

        const slicedMaterial = new THREE.MeshPhysicalNodeMaterial({
            metalness:0.5,
            roughness:0.25,
            envMapIntensity:0.5,
            color:0x858080,
            side:THREE.DoubleSide,
        });

        // uniforms 
        const sliceStart = uniform(1.75);
        const sliceArc = uniform(1.25);
        const sliceColor = uniform(color(0xb62f58));

        this._gui.add(sliceStart,'value',-Math.PI,Math.PI,0.001).name("sliceStart"); // 开始的角度-180 到180
        this._gui.add(sliceArc,'value',0,Math.PI * 2,0.001).name('sliceArc');// 开口弧度取值范围 0-360
        this._gui.addColor({color:sliceColor.value.getHexString(THREE.SRGBColorSpace)},'color').onChange(value=>sliceColor.value.set(value));

        slicedMaterial.outputNode = Fn(()=>{
            // 丢弃 discard
            inAngle(positionLocal.xy,sliceStart,sliceArc).discard();
            // backface color
            const finalOutput = output;
            If(frontFacing.not(),()=>{
                finalOutput.assign(vec4(sliceColor,1));
            });
            return finalOutput;
        })();

        slicedMaterial.shadowNode = Fn(()=>{
            inAngle(positionLocal.xy,sliceStart,sliceArc).discard();
            return vec4(0,0,0,1);
        })();

        // 加载模型
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("./draco/");

        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load("./model/gears.glb",gltf=>{
            gltf.scene.traverse(child=>{
                // 修改材质
                if(child.isMesh){
                    if(child.name === 'outerHull'){
                        child.material = slicedMaterial;
                    }else{
                        child.material = defaultMaterial;
                    }

                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            this._scene.add(gltf.scene);

        });

        // 创建平面
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(10,10,10,10),
		new THREE.MeshStandardNodeMaterial({
            color:0xaaaaaa,
        }));
        plane.receiveShadow = true;
        plane.position.set(0,-3,0);
        plane.lookAt(new THREE.Vector3(0,0,0));
        this._scene.add(plane);

        this._renderer = new THREE.WebGPURenderer({antialias:true});
        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 1;
        this._renderer.shadowMap.enabled = true;
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._renderer.setAnimationLoop(this._animate.bind(this));
        this._options.dom.appendChild(this._renderer.domElement);


        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
        this._orbitControls.enableDamping = true;
        this._orbitControls.minDistance = 0.001;
        this._orbitControls.maxDistance = 100;

        this._animate();
    }

    async _animate(){
        //requestAnimationFrame(this._animate.bind(this));
        this._orbitControls.update();

        this._renderer.renderAsync(this._scene,this._perspectiveCamera);
    }
    
    _windowResizeFun(params={}){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

/**
 * 实现咖啡冒烟效果
 */
export class TslCoffeeSmoke{
    constructor(_options ={}){
        this._options = _options;
        
        this._init();
    }

    _init(){
        // 创建相机
        this._perspectiveCamera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.1,100);
        this._perspectiveCamera.position.set(8,10,12);

        this._scene = new THREE.Scene();

        const gltfLoader = new GLTFLoader();
        const textureLoader = new THREE.TextureLoader();

        // 加载模型
        gltfLoader.load("./models/gltf/coffeeMug.glb",gltf=>{
            gltf.scene.getObjectByName('baked').material.map.anisotropy = 8;
            this._scene.add(gltf.scene);
        });

        // 创建平面几何体
        const smokeGeometry = new THREE.PlaneGeometry(1,1,16,16);
        smokeGeometry.translate(0,0.5,0);
        smokeGeometry.scale(1.5,6,1.5);

        // 加载纹理
        const noiseTexture = textureLoader.load("./textures/noises/perlin/128x128.png");
        noiseTexture.wrapS = THREE.RepeatWrapping;
        noiseTexture.wrapT = THREE.RepeatWrapping;

        // 创建材质
        const smokeMaterial = new THREE.MeshBasicNodeMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false});
        // 修改位置
        smokeMaterial.positionNode = Fn(()=>{
            // twist- 扭曲                // y轴：
            const twistNoiseUv = vec2(0.5,uv().y.mul(0.2).sub(time.mul(0.005)).mod(1));
            const twist = texture(noiseTexture,twistNoiseUv).r.mul(10);
            positionLocal.xz.assgin(rotateUV(positionLocal.xz,twist,vec2(0)));

            // wind -风
            const windOffset = vec2(
                texture(noiseTexture,vec2(0.25,time.mul(0.01)).mod(1)).r.sub(0.5),
                texture(noiseTexture,vec2(0.75,time.mul(0.01)).mod(1)).r.sub(0.5)
            ).mul(uv().y.pow(2).mul(10));
            positionLocal.addAssign(windOffset);

            return positionLocal;
        })();

        // 颜色节点
        smokeMaterial.colorNode = Fn(()=>{
            // alpha 
            const alphaNoiseUv = uv().mul(vec2(0.5,0.3)).add(vec2(0,time.mul(0.03).negate()));
            const alpha = mul(
                texture(noiseTexture,alphaNoiseUv).r.smoothstep(0.4,1),smoothstep(0,0.1,uv().x),
                smoothstep(0,0.1,oneMinus(uv().x)),
                smoothstep(0,0.1,uv().y),
                smoothstep(0,0.1,oneMinus(uv().y))
            );

            // color 
            const finalColor = mix(vec3(0.6,0.3,0.2),vec3(1,1,1),alpha.pow(3));
            return vec4(finalColor,alpha);
        })();

        const smoke = new THREE.Mesh(smokeGeometry,smokeMaterial);
        smoke.position.y = 1.83;
        this._scene.add(smoke);

        // renderer 
        this._renderer = new THREE.WebGPURenderer({antialias:true});
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._renderer.setAnimationLoop(this._animate.bind(this));
        this._options.dom.appendChild(this._renderer.domElement);

        // controls
        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
        this._orbitControls.enableDamping = true;
        this._orbitControls.minDistance = 0.1;
        this._orbitControls.maxDistance = 50;
        this._orbitControls.target.y = 3;


    }

    async _animate(){
        this._orbitControls.update();
        this._renderer.render(this._scene,this._perspectiveCamera);
    }
    _windowResizeFun(params={}){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}


/**
 * attractors:吸引子
 */
export class TslComputeAttractorsParticles{
    constructor(_options ={}){
        this._options = _options;

        this._init();
    }

    _init(){
        // 创建相机
        this._perspectiveCamera = new THREE.PerspectiveCamera(74,window.innerWidth / window.innerHeight,0.1,100);
        this._perspectiveCamera.position.set(0,10,10);

        this._scene = new THREE.Scene(); // 创建场景

        const ambientLight = new THREE.AmbientLight(0xffffff,0.5);
        this._scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xfffff1,1.5);
        directionalLight.position.set(4,2,0);
        this._scene.add(directionalLight);

        // renderer 
        this._renderer = new THREE.WebGPURenderer({antialias:true});
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth , window.innerHeight);
        this._renderer.setAnimationLoop(this._animate.bind(this));
        this._options.dom.appendChild(this._renderer.domElement);

        // orbitControls
        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
        this._renderer.enableDamping = true;

        // attractors 吸引子,定义三个吸引点的位置
        const attractorsPositions =  uniformArray([
            new THREE.Vector3(-1,0,0),
            new THREE.Vector3(1,0,-0.5),
            new THREE.Vector3(0,0.5,1)
        ]);

        // 定义每个吸引子的旋转轴
        const attractorsRotationAxes = uniformArray([
            new THREE.Vector3(0,1,0),// 第一个吸引子绕Y轴旋转
            new THREE.Vector3(0,0,1),
            new THREE.Vector3(1,0,-0.5).normalize()
        ]);

        // 定义吸引子的个数
        const attractorsLength = uniform(attractorsPositions.array.length);
        const attractors =[];// 吸引子
        const helpersRingGeometry = new THREE.RingGeometry(1,1.02,32,1,0,Math.PI * 1.5);
        const helpersArrowGeometry = new THREE.ConeGeometry(0.1,0.4,12,1,false);
        const helpersMaterial = new THREE.MeshBasicNodeMaterial({
            side:THREE.DoubleSide,
        });
        // 吸引点
        for(let i =0;i < attractorsPositions.array.length;i++){
            const attractor ={};
            // 设置吸引子的位置
            attractor.position = attractorsPositions.array[i];
            attractor.orientation = attractorsRotationAxes.array[i];
            attractor.reference = new THREE.Object3D();
            attractor.reference.position.copy(attractor.position);
            attractor.reference.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),attractor.orientation);
            this._scene.add(attractor.reference);

            attractor.helper = new THREE.Group();
            attractor.helper.scale.setScalar(0.325);
            attractor.reference.add(attractor.helper);

            attractor.ring = new THREE.Mesh(helpersRingGeometry,helpersMaterial);
            attractor.ring.rotation.x = - Math.PI * 0.5;
            attractor.helper.add(attractor.ring);

            attractor.arrow = new THREE.Mesh(helpersArrowGeometry,helpersMaterial);
            attractor.arrow.position.x = 1;
            attractor.arrow.position.z = 0.2;
            attractor.arrow.rotation.x = Math.PI * 0.5;
            attractor.helper.add(attractor.arrow);


            attractor.controls = new TransformControls(this._perspectiveCamera,this._renderer.domElement);
            attractor.controls .mode = 'rotate';
            attractor.controls.size = 0.5;
            attractor.controls.attach(attractor.reference);
            attractor.controls.visible = true;
            attractor.controls.enabled = attractor.controls.visible;
            this._scene.add(attractor.controls.getHelper());
            
            attractor.controls.addEventListener('draggng-changed',(event)=>{
                controls.enabled = !event.value;
            });

            attractor.controls.addEventListener('change',()=>{
                attractor.position.copy(attractor.reference.position);
                attractor.orientation.copy(new THREE.Vector3(0,1,0).applyQuaternion(attractor.reference.quaternion));
            });

            attractors.push(attractor);

        }

        // 创建粒子
        const count = Math.pow(2,18);

        const material = new THREE.SpriteNodeMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
        const attractorMass = uniform(Number(`1e${7}`));// 吸引子的质量
        const particleGlobalMass = uniform(Number(`1e${4}`)); // 粒子的质量
        const timeScale = uniform(1);
        const spinningStrength = uniform(2.75);
        const maxSpeed = uniform(8);
        const gravityConstant = 6.67e-11;
        const velocityDamping = uniform(0.1);
        const scale = uniform(0.008);
        const boundHalfExtent = uniform(8);
        const colorA = uniform(color(0x5900ff));
        const colorB = uniform(color(0xffa575));

        const positionBuffer = storage(new THREE.StorageInstancedBufferAttribute(count,3),'vec3',count);
        const velocityBuffer = storage(new THREE.StorageInstancedBufferAttribute(count,3),'vec3',count);
        const sphericalToVec3 = Fn(([phi,theta])=>{
            const sinPhiRadius = sin(phi);
            return vec3(
                sinPhiRadius.mul(sin(theta)),cos(phi),sinPhiRadius.mul(cos(theta))
            );
        });

        // init compute
        const init = Fn(()=>{
            let position = positionBuffer.element(instanceIndex);
            let velocity = velocityBuffer.element(instanceIndex);

            const basePosition = vec3(
                hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
                hash(instanceIndex.add(uint(Math.random() * 0xffffff))),
                hash(instanceIndex.add(uint(Math.random() * 0xffffff)))
            ).sub(0.5).mul(vec3(5,0.2,5));
            position.assign(basePosition);

            const phi = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).mul(PI).mul(2);
            const theta = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).mul(PI);
            const baseVelocity = sphericalToVec3(phi,theta).mul(0.05);
            velocity.assign(baseVelocity);

        });

        const initCompute = init().compute(count);
        
        const reset =()=>{
            this._renderer.computeAsync(initCompute);
        }

        reset();

        // 更新计算
        const particleMassMultiplier = hash(instanceIndex.add(uint(Math.random() * 0xffffff))).remap(0.25,1).toVar();
        const particleMass = particleMassMultiplier.mul(particleGlobalMass).toVar();

        const update = Fn(()=>{
            //const delta = timerDelta().mul(timeScale).min(1/30).toVar();
            const delta = float(1/60).mul(timeScale).toVar();
            const position = positionBuffer.element(instanceIndex);
            const velocity = velocityBuffer.element(instanceIndex);

            let force = vec3(0).toVar();
            Loop(attractorsLength,({i})=>{
                const attractorPosition = attractorsPositions.element(i);
                const attractorRotationAxis = attractorsRotationAxes.element(i);
                const toAttractor = attractorPosition.sub(position);
                const distance = toAttractor.length();
                const direction = toAttractor.normalize();

                const gravityStrength = attractorMass.mul(particleMass).mul(gravityConstant).div(distance.pow(2)).toVar();
                const gravityForce = direction.mul(gravityStrength);
                force.addAssign(gravityForce);

                // spinning 
                const spinningForce = attractorRotationAxis.mul(gravityStrength).mul(spinningStrength);
                const spinningVelocity = spinningForce.cross(toAttractor);
                force.addAssign(spinningVelocity);
            });

            // velocity
            velocity.addAssign(force.mul(delta));
            const speed = velocity.length();
            If(speed.greaterThan(maxSpeed),()=>{
                velocity.assign(velocity.normalize().mul(maxSpeed));
            });
            velocity.mulAssign(velocityDamping.oneMinus());

            //position
            position.addAssign(velocity.mul(delta));

            // box loop
            const halfHalfExtent = boundHalfExtent.div(2).toVar();
            position.assign(mod(position.add(halfHalfExtent),boundHalfExtent).sub(halfHalfExtent));

        });

        this._updateCompute = update().compute(count);
        //console.log(this._updateCompute);
        //nodes
        material.positionNode = positionBuffer.toAttribute();
        material.colorNode = Fn(()=>{
            const velocity = velocityBuffer.toAttribute();
            const speed = velocity.length();
            const colorMix = speed.div(maxSpeed).smoothstep(0,0.5);
            const finalColor = mix(colorA,colorB,colorMix);
            
            return vec4(finalColor,1);
        })();

        material.scaleNode = particleMassMultiplier.mul(scale);

        //mesh
        const geometry = new THREE.PlaneGeometry(1,1);
        const mesh = new THREE.InstancedMesh(geometry,material,count);
        this._scene.add(mesh);

        // gui
        const gui = new GUI();
        gui.add({attractorMassExponent:attractorMass.value.toString().length - 1},'attractorMassExponent',1,10,1).onChange(value=>attractorMass.value=Number(`1e${value}`));
        gui.add({particleGlobalMassExponent:particleGlobalMass.value.toString().length - 1},'particleGlobalMassExponent',1,10,1).onChange(value=>particleGlobalMass.value = Number(`1e${value}`));
        gui.add(maxSpeed,'value',0,10,0.01).name('maxSpeed');
        gui.add(velocityDamping,'value',0,0.1,0.001).name('velocityDamping');
        gui.add(spinningStrength,'value',0,10,0.01).name('spinningStrength');
        gui.add(scale,'value',0,0.1,0.001).name('scale');
        gui.add(boundHalfExtent,'value',0,20,0.01).name("boundHalfExtent");
        gui.addColor({color:colorA.value.getHexString(THREE.SRGBColorSpace)},'color').name('colorA').onChange(value =>colorA.value.set(value));
        gui.addColor({color:colorB.value.getHexString(THREE.SRGBColorSpace)},'color').name('colorB').onChange(value=>colorB.value.set(value));
        gui.add({controlsMode:attractors[0].controls.mode},'controlsMode').options(['translate','rotate','none']).onChange(value=>{
            for(const attractor of attractors){
                if(value === 'none'){
                    attractor.controls.visible = false;
                    attractor.controls.enabled = false;
                }else{
                    attractor.controls.visible = true;
                    attractor.controls.enabled = true;
                    attractor.controls.mode = value;
                }
            }
        });

        gui.add({helperVisible:attractors[0].helper.visible},'helperVisible').onChange(value=>{
            for(const attractor of attractors){
                attractor.helper.visible = value;
            }
        });
        gui.add({reset},'reset');

    }

    async _animate(){
        this._orbitControls.update();

        this._renderer.compute(this._updateCompute);
        this._renderer.render(this._scene,this._perspectiveCamera);
    }

    _windowResizeFun(params={}){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

export class TslEarth{
    constructor(_options={}){
        this._options = _options;
        this._clock = new THREE.Clock();
        this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,100);
        this._perspectiveCamera.position.set(4.5,2,3);

        this._scene = new THREE.Scene();

        // 创建太阳
        const sun = new THREE.DirectionalLight(0xffffff,2);
        sun.position.set(0,0,3);
        this._scene.add(sun);

        // 创建uniforms 
        const atmosphereDayColor = uniform(color(0x4db2ff));
        const atmosphereTwilightColor = uniform(color(0xbc490b));
        const roughnessLow = uniform(0.25);// 粗糙程度值
        const roughnessHigh = uniform(0.35);
        
        // 加载纹理
        const loader = new THREE.TextureLoader();
        const dayTexture = loader.load("./textures/planets/earth_day_4096.jpg");
        dayTexture.colorSpace = THREE.SRGBColorSpace;
        dayTexture.anisotropy = 8;

        const nightTexture = loader.load("./textures/planets/earth_night_4096.jpg");
        nightTexture.colorSpace = THREE.SRGBColorSpace;
        nightTexture.anisotropy = 8;

        const bumpRoughnessCloudsTexture = loader.load("./textures/planets/earth_bump_roughtness_clouds_4096.jpg");
        bumpRoughnessCloudsTexture.anisotropy = 8;

        // //fresnel 菲涅耳
        const viewDirection = positionWorld.sub(cameraPosition).normalize();
        const fresnel = viewDirection.dot(normalWorld).abs().oneMinus().toVar();

        // // sun orientation 
        const sunOrientation = normalWorld.dot(normalize(sun.position)).toVar();
        const atmosphereColor = mix(atmosphereTwilightColor,atmosphereDayColor,sunOrientation.smoothstep(-0.25,0.75));
        
        this._globeMaterial = new THREE.MeshStandardNodeMaterial();
        const cloudsStrength = texture(bumpRoughnessCloudsTexture,uv()).b.smoothstep(0.2,1);
        this._globeMaterial.colorNode = mix(texture(dayTexture),vec3(1),cloudsStrength.mul(2));

        const roughness = max(
            texture(bumpRoughnessCloudsTexture).g,
            step(0.01,cloudsStrength)
        );
        this._globeMaterial.roughnessNode = roughness.remap(0,1,roughnessLow,roughnessHigh);
        const night = texture(nightTexture);
        const dayStrength = sunOrientation.smoothstep(-0.25,0.5);
        const atmosphereDayStrength = sunOrientation.smoothstep(-0.5,1);
        const atmosphereMix = atmosphereDayStrength.mul(fresnel.pow(2)).clamp(0,1);

        let finalOutput = mix(night.rgb,output.rgb,dayStrength);
        finalOutput = mix(finalOutput,atmosphereColor,atmosphereMix);

        this._globeMaterial.outputNode = vec4(finalOutput,output.a);
        const bumpElevation = max(texture(bumpRoughnessCloudsTexture).r,cloudsStrength);
        this._globeMaterial.normalNode = bumpMap(bumpElevation);

        // // 创建球体
        const sphereGeometry = new THREE.SphereGeometry(1,64,64);
        this._globe = new THREE.Mesh(sphereGeometry,this._globeMaterial);
        this._scene.add(this._globe);

        // atmosphere
        const atmosphereMaterial = new THREE.MeshBasicNodeMaterial({
            side:THREE.BackSide,
            transparent:true,
        });
        let alpha = fresnel.remap(0.73,1,1,0,1.2).pow(3);
        alpha = alpha.mul(sunOrientation.smoothstep(-0.5,1.));
        atmosphereMaterial.outputNode = vec4(atmosphereColor,alpha);

        const atmosphere = new THREE.Mesh(sphereGeometry,atmosphereMaterial);
        atmosphere.scale.setScalar(1.04);
        this._scene.add(atmosphere);

        // gui
        const gui = new GUI();
        gui.addColor({color:atmosphereDayColor.value.getHex(THREE.SRGBColorSpace)},'color').onChange(value=>{
            atmosphereDayColor.value.set(value);
        }).name('atmosphereDayColor');

        gui.addColor({color:atmosphereTwilightColor.value.getHex(THREE.SRGBColorSpace)},'color').onChange(value=>{
            atmosphereTwilightColor.value.set(value)
        }).name('atmosphereTwilightColor');

        gui.add(roughnessLow,'value',0,1,0.001).name('roughnessLow');
        gui.add(roughnessHigh,'value',0,1,0.001).name('roughnessHigh');

        // renderer 
        this._renderer = new THREE.WebGPURenderer({antialias:true});
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._renderer.setAnimationLoop(this._animate.bind(this));
        this._options.dom.appendChild(this._renderer.domElement);

        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
        this._orbitControls.enableDamping = true;
        this._orbitControls.minDistance = 0.1;
        this._orbitControls.maxDistance = 50;

    }
    _animate(){
        const delta = this._clock.getDelta();
        this._globe.rotation.y += delta * 0.025;
        this._orbitControls.update();
        this._renderer.render(this._scene,this._perspectiveCamera);

    }
    _windowResizeFun(){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();
        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}
