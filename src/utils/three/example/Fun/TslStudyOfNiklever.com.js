/**
 * niklever.com tsl 日志
 */
import * as THREEGL from 'three';
import * as THREEGPU from 'three/webgpu';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min';
import { attribute, attributeArray, cameraProjectionMatrix, cameraViewMatrix, instanceIndex, positionLocal, time ,Fn,uniform,float,cos,sin,floor,vec3,mix,modelWorldMatrix, mat3,vec2, uint, Continue, If, deltaTime,Loop,exp,length,normalLocal,normalize,cross,fract,select, instance, textureStore,uvec2,vec4,texture,mx_noise_float, saturate, positionWorld, cameraPosition, oneMinus,abs,uv, ceil, lessThan, int, Break, log2,dot, pow} from 'three/tsl';
import { _perlinFbm_, _pointInAABB_, _remap_, _worleyFbm_ } from '../../tsl-common/tsl-common';
//import { noise } from '../tsl-textures/tsl-utils';

const _times_ = 20;// 循环次数
const _bounds_ = 20;
const _bounds_half_ = _bounds_ /2;

class FlockGeometry  extends THREEGPU.BufferGeometry{
    constructor(initGeometry){
        super();

        const geometry = initGeometry.toNonIndexed();
        const srcPositionAttr = geometry.getAttribute('position');
        const srcNormalAttr = geometry.getAttribute('normal');
        const count = srcPositionAttr.count;
        const total = count * _times_;

        const newPositionAttr = new THREEGPU.BufferAttribute(new Float32Array(total * 3),3);
        const newNormalAttr = new THREEGPU.BufferAttribute(new Float32Array(total * 3),3);
        const newInstanceIDAttr = new THREEGPU.BufferAttribute(new Uint32Array(total),1);

        this.setAttribute('position',newPositionAttr);
        this.setAttribute('normal',newNormalAttr);
        this.setAttribute('instanceID',newInstanceIDAttr);

        for(let t = 0; t < _times_;t++){
            // 循环次数
            let offset = t * count * 3;
            for(let i = 0; i < count * 3;i++){
                newPositionAttr.array[offset + i] = srcPositionAttr.array[i];
                newNormalAttr.array[offset + i] = srcNormalAttr.array[i];
            }
            offset = t * count;
            for(let i = 0; i < count;i++){
                newInstanceIDAttr.array[offset + i] = t;
            }
        }
    }
}

export class TslCreateFunRunGPU{
    constructor(_options={}){
        this._options = _options;

        this._init();
    }

    _init(){
        this._perspectiveCamera = new THREEGPU.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,1000);
        this._perspectiveCamera.position.set(0,10,10);

        this._scene = new THREEGPU.Scene();
        this._scene.background = new THREEGPU.Color(0x444488);

        this._renderer = new THREEGPU.WebGPURenderer({antialias:true});
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._renderer.setAnimationLoop(this._animate.bind(this));
        this._options.dom.appendChild(this._renderer.domElement);

        const ambientLight = new THREEGPU.AmbientLight(0xaaaaaa,0x333333);
        const light = new THREEGPU.DirectionalLight(0xfdf,4);
        light.position.set(3,3,1);
        this._scene.add(ambientLight);
        this._scene.add(light);

        this._clock = new THREEGPU.Clock();

        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
        // 加载模型
        this._initLoadGlb('boid');
    }
    _initLoadGlb(name){
        const loader = new GLTFLoader().setPath('./model/');
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('./draco/gltf/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(`${name}.glb`,gltf=>{
            this._boid = gltf.scene.children[0];
            this._boid.geometry.scale(0.4,0.4,0.4);

            // tsl
            //this._initTsl();
            // 第二个案例
            this._initTslComputing();
        });
    }

    _initTslComputing(){
        const [positionStorage,directionStorage,noiseStorage] = this._initCreateStorage();
        this._deltaTime = uniform(float());
        const boidSpeed = uniform(3);
        const flockPosition = uniform(vec3());
        const neighbourDistance = uniform(5);
        const rotationSpeed = uniform(1);

        this._flockVertexTsl_ = Fn(()=>{
            const instanceID = attribute('instanceID');
            const normal = normalLocal.toVar();
            const dir = normalize(directionStorage.element(instanceID)).toVar();

            const zaxis = dir.negate().normalize().toVar();
            const xaxis = cross(vec3(0,1,0),zaxis).normalize().toVar();
            const yaxis = cross(zaxis,xaxis).toVar();
            const mat = mat3(
                xaxis.x,
                yaxis.x,
                zaxis.x,

                xaxis.y,
                yaxis.y,
                zaxis.y,

                xaxis.z,
                yaxis.z,
                zaxis.z,

            ).toVar();

            const finalVert = modelWorldMatrix.mul(mat.mul(positionLocal)).add(positionStorage.element(instanceID));
            return cameraProjectionMatrix.mul(cameraViewMatrix).mul(finalVert);
        });

        this._computeVelocity_ = Fn(()=>{
            const boid_pos = positionStorage.element(instanceIndex).toVar();
            const boid_dir = directionStorage.element(instanceIndex).toVar();

            const separation = vec3(0).toVar();
            const alignment = vec3(0).toVar();
            const cohesion = vec3(flockPosition).toVar();
            const nearbyCount = uint(1).toVar();
            Loop({start:uint(0),end:uint(_times_),type:'uint',condition:'<'},({i})=>{
                If(i == instanceIndex,()=>{
                    Continue();
                });
                const tempBoid_pos = positionStorage.element(i).toVar();
                const tempBoid_dir = directionStorage.element(i).toVar();

                const offset = boid_pos.sub(tempBoid_pos).toVar();
                const dist = length(offset).toVar();
                If(dist.lessThan(neighbourDistance),()=>{
                    If(dist.lessThan(0.0001),()=>{
                        Continue();
                    });

                    const s = offset.mul(float(1.) .div(dist).sub(float(1.0).div(neighbourDistance))).toVar();
                    separation.addAssign(s);
                    alignment.addAssign(tempBoid_dir);
                    cohesion.addAssign(tempBoid_pos);

                    nearbyCount.addAssign(1);
                });
            });

            const avg = float(1.0).div(nearbyCount).toVar();
            alignment.mulAssign(avg);
            cohesion.mulAssign(avg);
            cohesion.assign(cohesion.normalize().sub(boid_pos));

            const direction = alignment.add(separation).add(cohesion).toVar();
            const ip = exp(rotationSpeed.mul(-1).mul(deltaTime));
            boid_dir.assign(mix(direction,boid_dir.normalize(),ip));
            directionStorage.element(instanceIndex).assign(boid_dir);
        })().compute(_times_);

        this._computePosition_ = Fn(()=>{
            const boid_pos = positionStorage.element(instanceIndex).toVar();
            const boid_dir = directionStorage.element(instanceIndex).toVar();
            const noise_offset = noiseStorage.element(instanceIndex).toVar();
            // 下面代码有问题
            const tempVec2 = boid_pos.mul(time.div(100.).add(noise_offset));
            const noise = mx_noise_float(tempVec2,2,1);//mx_noise_float(boid_pos.mul(time.div(100.).add(noise_offset))).add(1.0).div(2.0).toVar();
            const velocity = boidSpeed.mul(float(10).add(sin(time))).toVar();
            const tempVar = float(1.).toVar();
            velocity.add(noise);
            //console.log(velocity,boid_pos,tempVar.addAssign(noise))
            boid_pos.addAssign(boid_dir.mul(velocity).mul(this._deltaTime));
            positionStorage.element(instanceIndex).assign(boid_pos);
        })().compute(_times_);

        this._computeTest_ = Fn(()=>{
            const position = positionStorage.element(instanceIndex);
            position.addAssign(vec3(0,this._deltaTime.mul(100),0));
        })().compute(_times_);

        const geometry = new FlockGeometry(this._boid.geometry);
        const material = new THREEGPU.MeshStandardNodeMaterial();
        this._more_flock_ = new THREEGPU.Mesh(geometry,material);
        this._scene.add(this._more_flock_);
        material.vertexNode = this._flockVertexTsl_();
        let options = {
            delta: 0
          };
        
          const gui = new GUI();
          gui.add(options, "delta", 0, 1).onChange((value) => {
            this._deltaTime.value = value;
          });
    }

    _initCreateStorage(){
        const positionArray = new Float32Array(_times_ * 3);
        const directionArray = new Float32Array(_times_ * 3);
        const noiseArray = new Float32Array(_times_);

        const q = new THREEGPU.Quaternion();
        const v = new THREEGPU.Euler();

        for(let i =0;i < _times_;i++){
            // 创建多少个Mesh 就循环多少次
            const offset = i * 3;

            for(let j = 0 ; j < 3;j++){
                positionArray[offset + j] = Math.random() * _bounds_ - _bounds_half_;
            }

            q.random();
            v.setFromQuaternion(q);
            directionArray[offset + 0] = v.x;
            directionArray[offset + 1] = v.y;
            directionArray[offset + 2] = v.z;

            noiseArray[i] = Math.random() * 1000.0;
        }
        const positionStorage = attributeArray(positionArray,'vec3').label('positionStorage');
        const directionStorage = attributeArray(directionArray,'vec3').label('directionStorage');
        const noiseStorage = attributeArray(noiseArray,'float').label('noiseStorage');

        positionStorage.setPBO(true);
        directionStorage.setPBO(true);
        noiseStorage.setPBO(true);

        return [positionStorage,directionStorage,noiseStorage];
    }
    _initTsl(){
        const positionStorage = this._initStorage();// 初始数据
        const flockVertexTsl = Fn(()=>{
            const instanceID = attribute('instanceID');
            const finalVert = modelWorldMatrix .mul(positionLocal).add(positionStorage.element(instanceID)).toVar();
            return cameraProjectionMatrix.mul(cameraViewMatrix).mul(finalVert);
        });

        const geometry = new FlockGeometry(this._boid.geometry);
        const material = new THREEGPU.MeshStandardNodeMaterial();
        const radius = uniform(float(0.7));
        const delta = uniform(float());

        this._computePosition = Fn(()=>{
            const PI2 = float(6.2832);
            const theta = PI2.div(_times_).toVar();
            const posX  = cos(time.add(theta.mul(instanceIndex))).mul(radius).toVar();
            const posY = sin(time.add(theta.mul(instanceIndex))).mul(radius).toVar();

            const cellSize = float(0.5).toVar();
            const row = float(instanceIndex).mod(3.0).sub(1.0);
            const col = floor(float(instanceIndex).div(3.0)).sub(1.0);
            const position = positionStorage.element(instanceIndex);
            const v1 = vec3(posX,posY,0).toVar();
            const v2 = vec3(col.mul(cellSize),row.mul(cellSize),0).toVar();
            position.assign(mix(v1,v2,delta));
        })().compute(_times_);

        this._flock = new THREEGPU.Mesh(geometry,material);
        this._scene.add(this._flock);

        material.vertexNode = flockVertexTsl();

        const gui = new GUI();
        gui.add(radius,'value',0.2,2).name('radius');
        gui.add(delta,'value',0,1).name('delta');
    }
    /**
     * 在gpu中创建缓冲区
     */
    _initStorage(){
        const positionArray = new Float32Array((_times_ + 1) * 3);// （循环次数+1）* xyz|3个float
        const cellSize = 1;

        for(let i =0; i < _times_;i++){
            const offset = i * 3; // 偏移值:因为位置有3个float，xyz，所以要偏移3个值,0,3,6,9,12,15,18,21,24,27,30
            const row = (i % 3) - 2;
            const col = (~~(i/3)) - 2;
            positionArray[offset + 0] = col * cellSize;
            positionArray[offset + 1] = row * cellSize;
        }
        //console.log('positionArray:',positionArray);
        const positionStorage = attributeArray(positionArray,'vec3').label('positionStorage');
        // 获取GPU computed data in the WebGL2 fallback
        positionStorage.setPBO(true);
        return positionStorage;
    }
    _animate(){
        if(this._deltaTime ) this._deltaTime.value = this._clock.getDelta();
        if(this._computeVelocity_) this._renderer.compute(this._computeVelocity_);
        if(this._computePosition_) this._renderer.compute(this._computePosition_);
        // 上一个项目的
        // if(this._computePosition) this._renderer.compute(this._computePosition);

        this._renderer.render(this._scene,this._perspectiveCamera);
    }

    _windowResizeFun(){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();
        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

// 9
const _boid_total = 2;// 个数
/**
 * 创新生成geometry数据
 */
class FlockGeometryT extends THREEGPU.BufferGeometry{
    constructor(geo){
        super();

        const geometry = geo;
        const srcPositionAttr = geometry.getAttribute('position');
        const srcNormalAttr = geometry.getAttribute('normal');
        const srcUVAttr = geometry.getAttribute('uv');
        let   count = srcPositionAttr.count;
        const total = count * _boid_total;// 位置个数 * 循环次数

        const posAttr = new THREEGPU.BufferAttribute(new Float32Array(total * 3),3);
        const normalAttr = new THREEGPU.BufferAttribute(new Float32Array(total * 3),3);
        const uvAttr = new THREEGPU.BufferAttribute(new Float32Array(total * 2),2);
        const instanceIDAttr = new THREEGPU.BufferAttribute(new Uint32Array(total),1);
        const vertexIDAttr = new THREEGPU.BufferAttribute(new Uint32Array(total),1);

        this.setAttribute('position',posAttr);
        this.setAttribute('vertexID',vertexIDAttr);
        this.setAttribute('instanceID',instanceIDAttr);
        this.setAttribute('normal',normalAttr);
        this.setAttribute('uv',uvAttr);

        for(let b = 0; b < _boid_total;b++){
            let offset = b * count * 3;
            for(let i =0;  i < count * 3;i++){
                posAttr.array[offset + i] = srcPositionAttr.array[i];
                normalAttr.array[offset + i] = srcNormalAttr.array[i];
            }
            offset = b * count * 2;
            for(let i =0; i < count * 2 ;i++){
                uvAttr.array[offset + i] = srcUVAttr.array[i];
            }

            offset = b * count;
            for(let i =0; i < count;i++){
                instanceIDAttr.array[offset + i] = b;
                vertexIDAttr.array[offset + i] = i;
            }
        }
    }
}
/**
 * 动画烘焙效果
 */
export class TslBakeAnimation{
    constructor(_options={}){
        this._options = _options;
        this._init();
    }

    _init(){
        this._perspectiveCamera = new THREEGPU.PerspectiveCamera(40,window.innerWidth / window.innerHeight,1,100);
        this._perspectiveCamera.position.set(0,10,10);

        this._scene = new THREEGPU.Scene();
        this._scene.background = new THREEGPU.Color(0x444488);

        this._renderer = new THREEGPU.WebGPURenderer({antialias:true});
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._renderer.setAnimationLoop(this._animate.bind(this));
        this._options.dom.appendChild(this._renderer.domElement);

       
    
        // 添加环境光
        const ambientLight = new THREEGPU.HemisphereLight(0xaaaaaa,0x333333);
        const directionalLight = new THREEGPU.DirectionalLight(0xfffddc,1);
        directionalLight.position.set(300,300,1);
        this._scene.add(ambientLight);
        this._scene.add(directionalLight);
        this._clock = new THREEGPU.Clock();
        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
        this._initGlb('sparrow');
    }
    _initGlb(name=''){
        const loader = new GLTFLoader().setPath('./gltf/');
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('./draco/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(`${name}.glb`,gltf=>{
            this._boid = gltf;
            this._initTsl();
        });
    }

    _initTsl(){
        
        // 创建缓存区
        const vertexStorage = this._bakeAnimation(this._boid);
        const [positionStorage,timeStorage] = this._initStorage();

        this._deltaTime = uniform(float());
        const duration = uniform(this._animInfo.duration);
        const interval = uniform(this._animInfo.interval);
        const frameCount = uniform(this._animInfo.frameCount);
        const vertexCount = uniform(this._animInfo.vertexCount);
        const useStorage = uniform(uint(1));

        const flockVertexTSL = Fn(()=>{
            const instanceID = attribute('instanceID').toVar();
            const vertexID = attribute('vertexID').toVar();
            const frame = timeStorage.element(instanceID).div(interval);
            const frameIndex = uint(frame).toVar();
            const nextIndex = uint(frameIndex.add(1)).toVar();
            const delta = fract(frame).toVar();
            If(nextIndex.greaterThanEqual(frameCount),()=>{
                nextIndex.assign(0);
            });

            vertexID.addAssign(vertexCount.mul(frameIndex));
            const pos_1 = vertexStorage.element(vertexID).toVar();
            vertexID.assign(attribute('vertexID').add(vertexCount.mul(nextIndex)));
            const pos_2 = vertexStorage.element(vertexID).toVar();
            const pos = mix(pos_1,pos_2,delta);
            const position = select(useStorage.greaterThan(0),pos,positionLocal);
            const finalVert = modelWorldMatrix .mul(position).add(positionStorage.element(instanceID));
            return cameraProjectionMatrix .mul(cameraViewMatrix).mul(finalVert);
        });

        this._computeTime = Fn(()=>{
            const instanceTime = timeStorage.element(instanceIndex);
            instanceTime.addAssign(this._deltaTime);
            If(instanceTime.greaterThan(duration),()=>{
                instanceTime.subAssign(duration);
            })
        })().compute(_boid_total);

        const geometry = new FlockGeometryT(this._boid.scene.children[0].children[0].geometry);
        const material = new THREEGPU.MeshStandardNodeMaterial({
            map:this._boid.scene.children[0].children[0].material.map
        });

        this._flock = new THREEGPU.Mesh(geometry,material);
        material.vertexNode = flockVertexTSL();
        this._scene.add(this._flock);

        const options = {
            useStorage:true,
        };
        const gui = new GUI();
        gui.add(options,'useStorage').onChange(value=>{
            useStorage.value = value ? 1 : 0;
        });
    }
    _initStorage(){
        const positionArray = new Float32Array(_boid_total * 3);
        const timeArray = new Float32Array(_boid_total);
        const cellSize = 1.5;

        for(let i =0; i < _boid_total;i++){
            const offset = i * 3;
            const row = ( i % 3) - 1;
            const col = 0;
            positionArray[offset + 0] = col * cellSize;
            positionArray[offset + 1] = row * cellSize;
        }
        for(let i =0; i < _boid_total;i++){
            timeArray[i] = Math.random() * this._animInfo.duration;
        }

        const positionStorage = attributeArray(positionArray,'vec3').label('positionStorage');
        positionStorage.setPBO(true);

        const timeStorage = attributeArray(timeArray,'float').label('timeStorage');
        timeStorage.setPBO(true);

        return [positionStorage,timeStorage];
    }
    /**
     * 烘焙动画
     * @param {*} gltf 
     */
    _bakeAnimation(gltf){
        const skinnedMesh = gltf.scene.children[0].children[0];
        const geometry = skinnedMesh.geometry.toNonIndexed(); // 非索引话数据之后，数据会重复
        skinnedMesh.geometry = geometry;

        gltf.scene.visible = false;// 
        this._scene.add(gltf.scene);

        this._mixer = new THREEGPU.AnimationMixer(gltf.scene);
        const clip = gltf.animations[0];
        const action = this._mixer.clipAction(clip);
        action.play();
        const interval = 1/15;
        const frameCount = ~~(clip.duration / interval) + 1;//得到帧数

        let posAttr = geometry.getAttribute('position');
        const vertexCount = posAttr.count;// 顶点个数
        const vertexArray  = new Float32Array(vertexCount * frameCount * 3);
        this._animInfo = {duration:clip.duration,interval,vertexCount,frameCount};
        const skinned = new THREEGPU.Vector3();

        for(let f = 0; f < frameCount;f++){
            this._mixer.setTime(f * interval);
            this._renderer.render(this._scene,this._perspectiveCamera);
            const offset = f * vertexCount * 3;
            for(let i =0; i < vertexCount;i++){
                skinned.set(posAttr.getX(i),posAttr.getY(i),posAttr.getZ(i));
                skinnedMesh.applyBoneTransform(i,skinned);
                skinned.applyMatrix4(skinnedMesh.matrixWorld);
                vertexArray[offset + i * 3 + 0] = skinned.x;
                vertexArray[offset + i * 3 + 1] = skinned.y;
                vertexArray[offset + i * 3 + 2] = skinned.z;
            }
        }

        this._scene.remove(gltf.scene);

        const vertexStorage = attributeArray(vertexArray,'vec3').label('vertexStorage');
        vertexStorage.setPBO(true);
        return  vertexStorage;
    }
    _animate(){
        if(this._deltaTime) this._deltaTime.value = this._clock.getDelta();
        if(this._computeTime) this._renderer.compute(this._computeTime);
        // Update the rendering:
       
        this._renderer.render(this._scene,this._perspectiveCamera);
    }
    _windowResizeFun(){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();
        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

// 10
const _total_boid_ = 2000;// 重复2000 次模型
const _bounds_new_ = 20;
const _bounds_new_half_ = _bounds_new_ / 2;// 一半

class FlockGeometryExtendsBufferGeometry extends THREEGPU.BufferGeometry{
    constructor(geo){
        super();

        const geometry = geo;
        const srcPosAttr = geometry.getAttribute('position');
        const srcNormalAttr = geometry.getAttribute('normal');
        const srcUVAttr = geometry.getAttribute('uv');

        let count = srcPosAttr.count;
        const total = count * _total_boid_;// 每个模型顶点个数 * 模型循环总次数

        const posAttr = new THREEGPU.BufferAttribute(new Float32Array(total * 3),3);
        const normalAttr = new THREEGPU.BufferAttribute(new Float32Array(total * 3),3);
        const uvAttr = new THREEGPU.BufferAttribute(new Float32Array(total * 2),2);
        const instanceIDAttr = new THREEGPU.BufferAttribute(new Uint32Array(total * 1),1); // 这里是不是该是 _total_boid_
        const vertexIDAttr = new THREEGPU.BufferAttribute(new Uint32Array(total * 1),1); // 

        this.setAttribute('position',posAttr);
        this.setAttribute('normal',normalAttr);
        this.setAttribute('uv',uvAttr);
        this.setAttribute('instanceID',instanceIDAttr);
        this.setAttribute('vertexID',vertexIDAttr);

        for(let b = 0; b < _total_boid_;b++){
            let offset = b * count * 3;
            for(let i =0; i < count * 3;i++){
                posAttr.array[offset + i] = srcPosAttr.array[i];
                normalAttr.array[offset + i] = srcNormalAttr.array[i];
            }
            offset = b * count * 2;
            for(let i =0; i < count * 2;i ++){
                uvAttr.array[offset + i] = srcUVAttr.array[i];
            }

            offset = b * count ;
            for(let i = 0; i < count ;i++){
                instanceIDAttr.array[offset + i] = b;
                vertexIDAttr.array[offset + i] = i;
            }
        }
    }
}

export class TslBakeMore{
    constructor(_options={}){
        this._options = _options;
        this._init();
    }

    _init(){
        this._perspectiveCamera = new THREEGPU.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.1,1000);
        this._perspectiveCamera.position.set(0,10,10);

        this._scene = new THREEGPU.Scene();
        this._scene.background = new THREEGPU.Color(0x444488);

        this._renderer = new THREEGPU.WebGPURenderer({antialias:true});
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._renderer.setAnimationLoop(this._animate.bind(this));
        this._options.dom.appendChild(this._renderer.domElement);

        const ambient = new THREEGPU.AmbientLight(0xaaaaaa,0x333333);
        this._scene.add(ambient);
        const directionalLight = new THREEGPU.DirectionalLight(0xfcfd,3);
        directionalLight.position.set(3,3,1);
        this._scene.add(directionalLight);

        this._clock = new THREEGPU.Clock();
        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
        // 加载天空盒
        this._initSky();

        // 加载模型
        this._initGlb('sparrow');
    }

    _initGlb(name=''){
        const loader = new GLTFLoader().setPath('./gltf/');
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('./draco/');
        loader.setDRACOLoader(dracoLoader);
        loader.load(`${name}.glb`,gltf=>{
            console.log('gltf:',gltf);
            this._boid = gltf;
            this._initTsl();
        });
    }

    _initTsl(){
        const vertexStorage = this._bakeAnimation(this._boid);
        const [positionStorage,directionStorage,noiseStorage,timeStorage] = this._initStorage();

        this._deltaTime = uniform(float());
        const boidSpeed = uniform(2);
        const flockPosition = uniform(vec3());
        const neighbourDistance = uniform(4);
        const rotationSpeed = uniform(1);
        const duration = uniform(this._animInfo.duration);
        const interval = uniform(this._animInfo.interval);
        const vertexCount = uniform(this._animInfo.vertexCount);
        const useStorage = uniform(uint(1));

        const flockVertexTsl = Fn(()=>{
            const instanceID = attribute('instanceID').toVar();
            const vertexID = attribute('vertexID').toVar();
            const frameIndex = uint(timeStorage.element(instanceID).div(interval)).toVar();
            vertexID.addAssign(vertexCount.mul(frameIndex));// 顶点个数 * 帧
            const normal = normalLocal.toVar();// 
            const dir = normalize(directionStorage.element(instanceID)).toVar();//

            // 创建矩阵
            const zaxis = dir.negate().normalize().toVar();
            const xaxis = cross(vec3(0,1,0),zaxis).normalize().toVar();
            const yaxis = cross(zaxis,xaxis).toVar();

            const mat = mat3(
                xaxis.x,
                yaxis.x,
                zaxis.x,
                xaxis.y,
                yaxis.y,
                zaxis.y,
                xaxis.z,
                yaxis.z,
                zaxis.z
            );

            const position = select(useStorage.greaterThan(0),vertexStorage.element(vertexID),positionLocal);

            const finalVertex = modelWorldMatrix.mul(mat.mul(position)).add(positionStorage.element(instanceID));
            return cameraProjectionMatrix.mul(cameraViewMatrix).mul(finalVertex); 
        });

        this._computeVelocity = Fn(()=>{
            const boid_pos= positionStorage.element(instanceIndex).toVar();
            const boid_dir = directionStorage.element(instanceIndex).toVar();

            const separation = vec3(0).toVar();
            const alignment = vec3(0).toVar();
            const cohesion = vec3(flockPosition).toVar();

            const nearbyCount  = uint(1).toVar();
            Loop({start:uint(0),end:uint(_total_boid_),type:'uint',condition:'<'},({i})=>{
                If(i == instanceIndex,()=>{
                    Continue();
                });

                const tempBoid_pos = positionStorage.element(i).toVar();
                const tempBoid_dir = directionStorage.element(i).toVar();
                const offset = boid_pos.sub(tempBoid_pos).toVar();
                const dist = length(offset).toVar();

                If(dist.lessThan(neighbourDistance),()=>{
                    If(dist.lessThan(0.0001),()=>{
                        Continue();
                    });

                    const s= offset.mul(float(1).div(dist).sub(float(1).div(neighbourDistance))).toVar();
                    separation.addAssign(s);
                    alignment.addAssign(tempBoid_dir);
                    cohesion.addAssign(tempBoid_pos);

                    nearbyCount.addAssign(1);
                });
            });
            const avg = float(1.).div(nearbyCount).toVar();
            alignment.mulAssign(avg);
            cohesion.mulAssign(avg);
            cohesion.assign(cohesion.normalize().sub(boid_pos));
            const direction = alignment.add(separation).add(cohesion).toVar();

            const ip = exp(rotationSpeed.mul(-1).mul(this._deltaTime));
            boid_dir.assign(mix(direction,boid_dir.normalize(),ip));
            directionStorage.element(instanceIndex).assign(boid_dir);
        })().compute(_total_boid_);

        this._computePosition = Fn(()=>{
            const boid_pos = positionStorage.element(instanceIndex).toVar();
            const boid_dir = directionStorage.element(instanceIndex).toVar();
            const noise_offset = noiseStorage.element(instanceIndex).toVar();
            const noise = mx_noise_float(boid_pos.mul(time.div(100.0).add(noise_offset))).add(1).div(2.).toVar();
            const float_1 = float(1.0);
            float_1.add(noise);
            console.log('为啥返回的节点类型不一致:',float_1,float(1.0).add(noise));
            const velocity = boidSpeed.mul(float_1).toVar();
            //velocity.add(noise);
            boid_pos.addAssign(boid_dir.mul(velocity).mul(this._deltaTime));
            positionStorage.element(instanceIndex).assign(boid_pos);
        })().compute(_total_boid_);

        this._computeTest = Fn(()=>{
            const position = positionStorage.element(instanceIndex);
            position.addAssign(vec3(0,this._deltaTime .mul(100),0));

        })().compute(_total_boid_);

        this._computeTime = Fn(()=>{
            const instanceTime = timeStorage.element(instanceIndex).toVar();
            const boid_pos = positionStorage.element(instanceIndex).toVar();
            //const boid_dir = directionStorage.element(instanceIndex).toVar();
            const noise_offset = noiseStorage.element(instanceIndex).toVar();
            const noise = mx_noise_float(boid_pos.mul(time.div(100.0).add(noise_offset))).add(1).div(2.0);//.toVar();
            const velocity = boidSpeed.mul(float(1.0)).toVar();
            velocity.add(noise);
            //const velocity = boidSpeed.mul(float(1.0).add(noise)).toVar();
            const speed = length(velocity);
            instanceTime.addAssign(this._deltaTime.mul(speed).mul(boidSpeed).mul(0.25));
            If(instanceTime.greaterThan(duration),()=>{
                instanceTime.subAssign(duration);
            });

        })().compute(_total_boid_);

        const geometry = new FlockGeometryExtendsBufferGeometry(this._boid.scene.children[0].children[0].geometry);
        const material = new THREEGPU.MeshStandardNodeMaterial({
            map:this._boid.scene.children[0].children[0].material.map
        });
        this._flock = new THREEGPU.Mesh(geometry,material);
        this._scene.add(this._flock);

        material.vertexNode = flockVertexTsl();

        const options = {
            useStorage:true,
        };

        const gui = new GUI();
        gui.add(neighbourDistance,'value',1,8).name('Neighbour Distance');
        gui.add(boidSpeed,'value',0.5,6).name('boid speed');
        gui.add(rotationSpeed,'value',0.5,6).name('rotation Speed');
    }
    /**
     * 给循环的每个模型设置位置，方向，时间，随机值等
     * @returns 
     */
    _initStorage(){
        const positionArray = new Float32Array(_total_boid_ * 3);
        const directionArray = new Float32Array(_total_boid_ * 3);
        const noiseArray = new Float32Array(_total_boid_);
        const timeArray= new Float32Array(_total_boid_);

        const q = new THREEGPU.Quaternion();
        const e = new THREEGPU.Euler();

        // 循环每一个模型对象
        for(let i =0; i < _total_boid_;i++){
            const offset = i * 3;
            for(let j =0;j < 3;j++){
                positionArray[offset + j] = Math.random() * _bounds_new_ - _bounds_new_half_;// 计算得到每个模型的位置
            }
            q.random();
            e.setFromQuaternion(q);

            directionArray[offset + 0] = e.x;
            directionArray[offset + 1] = e.y;
            directionArray[offset + 2] = e.z;

            noiseArray[i] = Math.random() * 1000.0;
            timeArray[i] = Math.random() * this._animInfo.duration;
        }

        const positionStorage = attributeArray(positionArray,'vec3').label('positionStorage');
        const directionStorage = attributeArray(directionArray,'vec3').label('directionStorage');
        const noiseStorage = attributeArray(noiseArray,'float').label('noiseStorage');
        const timeStorage = attributeArray(timeArray,'float').label('timeStorage');

        // the pixel buffer Object (PBO) is required to get the gpu computed data in the webGL2 fallback
        positionStorage.setPBO(true);
        directionStorage.setPBO(true);
        noiseStorage.setPBO(true);
        timeStorage.setPBO(true);

        return [positionStorage,directionStorage,noiseStorage,timeStorage];
    }

    /**
     * 备份模型的数据
     */
    _bakeAnimation(gltf){
        const skinnedMesh = gltf.scene.children[0].children[0];// 得到mesh
        const geometry = skinnedMesh.geometry.toNonIndexed();// 返回非索引化的数据
        skinnedMesh.geometry = geometry;

        gltf.scene.visible = false;
        this._scene.add(gltf.scene);

        // 创建混合器
        this._mixer = new THREEGPU.AnimationMixer(gltf.scene);
        const clip = gltf.animations[0];// 获取第一个动画片段
        const action = this._mixer.clipAction(clip);// 执行动画片段
        action.play();
        const interval = 1/25;
        // ~~ 是 JavaScript 中的一种双按位取反 (bitwise NOT) 操作，它用于快速向下取整，等价于 Math.floor()，但执行速度通常更快（现代 JavaScript 引擎优化后差异不大
        const frameCount = ~~(clip.duration / interval) + 1;// 得到帧数
        // const frameCount = Math.floor(clip.duration / interval) + 1;

        let posAttr = geometry.getAttribute('position');// 获取position 数据
        const vertexCount = posAttr.count;// 获取顶点个数
        const vertexArray = new Float32Array(vertexCount * frameCount * 3);// 顶点个数 * 帧数 * 3
        this._animInfo ={duration:clip.duration,interval,vertexCount,frameCount};

        const tempV3 = new THREEGPU.Vector3();
        for(let f = 0; f < frameCount;f++){
            this._mixer.setTime(f * interval);
            this._renderer.render(this._scene,this._perspectiveCamera);
            const offset = f * vertexCount * 3;
            for(let i =0; i < vertexCount;i++){
                tempV3.set(posAttr.getX(i),posAttr.getY(i),posAttr.getZ(i));
                skinnedMesh.applyBoneTransform(i,tempV3);
                tempV3.applyMatrix4(skinnedMesh.matrixWorld);
                tempV3.multiplyScalar(1.2);// 扩大1.2倍
                vertexArray[offset + i * 3 + 0] = tempV3.x;
                vertexArray[offset + i * 3 + 1] = tempV3.y;
                vertexArray[offset + i * 3 + 2] = tempV3.z;

            }
        }

        // 从场景中移除
        this._scene.remove(gltf.scene);
        // 创建缓冲区
        const vertexStorage = attributeArray(vertexArray,'vec3').label('vertexStorage');
        vertexStorage.setPBO(true);
        return vertexStorage;
    }
    _initSky(){
        this._scene.background = new THREEGPU.CubeTextureLoader().setPath('./sky-1/skybox4_').load([
            'px.jpg','nx.jpg','py.jpg','ny.jpg','pz.jpg','nz.jpg'
        ],texture=>{
            this._scene.environment = texture;
        });
    }
    _animate(){
        if(this._deltaTime) this._deltaTime.value = this._clock.getDelta();
        if(this._computeTime) this._renderer.compute(this._computeTime);
         if(this._computeVelocity) this._renderer.compute(this._computeVelocity);
         if(this._computePosition) this._renderer.compute(this._computePosition);

        this._renderer.render(this._scene,this._perspectiveCamera);
    }
    _windowResizeFun(){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();
        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

/**
 * 11-1 使用gpu计算管线创建噪声纹理
 */
export class TslMakeNoiseTexture{
    constructor(_options={}){
        this.options = _options;
        this.init();
    }
    init(){
        this.renderer = new THREEGPU.WebGPURenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        this.options.dom.appendChild(this.renderer.domElement);
        //document.body.appendChild(this.renderer.domElement);

        this.scene = new THREEGPU.Scene();
        this.scene.background = new THREEGPU.Color(0x561a);
        this.scene.add(new THREEGPU.AmbientLight(0xffff));

        this.perspectiveCamera = new THREEGPU.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,100);
        this.perspectiveCamera.position.set(0,10,20);

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

        this.initTsl();
    }

    async initTsl(){
        const geometry = new THREEGPU.PlaneGeometry(10,10);
        const material = new THREEGPU.MeshBasicNodeMaterial({transparent:true,wireframe:false});

        const mesh = new THREEGPU.Mesh(geometry,material);
        const storageTexture = await this.createNoiseTexture(512,512);
        material.colorNode = texture(storageTexture);

        this.scene.add(mesh);
    }

    async createNoiseTexture(width=512,height=512){
        const storageTexture = new THREEGPU.StorageTexture(width,height);
        const computeTexture = Fn(({texture})=>{
            const posX = instanceIndex.modInt(width);// 0/ 512,2/512,512*512/512
            const posY= instanceIndex.div(height);// 0/512,2/512,3/512,512*512/512
            const indexUV =  uvec2(posX,posY);

            const scale = vec3(20);
            const pt = vec3(posX,posY,0).div(width).mul(scale);
           
            const tempVal = mx_noise_float(pt,1,0).toFloat();// 
          
            textureStore(texture,indexUV,vec4(tempVal,tempVal,tempVal,tempVal)).toWriteOnly();

        });

        await this.renderer.computeAsync(computeTexture({texture:storageTexture}).compute(width * height));
        return storageTexture;
    }
    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
    }
    _windowResizeFun(){
        this.perspectiveCamera.aspect  = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

export class TslMakeNoiseTextureFbm{
    constructor(_options={}){
        this.options = _options;
        this.init();
    }

    init(){
        this.renderer = new THREEGPU.WebGPURenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        this.options.dom.appendChild(this.renderer.domElement);

        this.scene = new THREEGPU.Scene();
        this.scene.background = new THREEGPU.Color(0x0561a0);

        this.perspectiveCamera = new THREEGPU.PerspectiveCamera(75,window.innerWidth / window.innerHeight ,0.1,1000);
        this.perspectiveCamera.position.set(0,0,30);

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
        this.clock = new THREEGPU.Clock();

        this.initTsl();

    }
    async initTsl(){
        const geometry = new THREEGPU.BoxGeometry(40,20,40);
        const material = new THREEGPU.MeshBasicNodeMaterial({
            transparent:true,
        });
        this.mesh = new THREEGPU.Mesh(geometry,material);
        const bbox = new THREEGPU.Box3();
        this.mesh.geometry.computeBoundingBox();
        bbox.copy(this.mesh.geometry.boundingBox).applyMatrix4(this.mesh.matrixWorld);
        const bbmin = uniform(vec3(bbox.min));
        const bbmax = uniform(vec3(bbox.max));

        const cellsX = 16;
        const cellsY = 8;
        const slices = cellsX * cellsY;

        // 创建噪声纹理
        const storageTexture = await this.createNoiseTexture(256,cellsX,cellsY);

        const stepSize = uniform(float(1));
        const stepCount = uniform(uint(30));
        const intensity = uniform(float(2.8));
        const pwctrl = uniform(float(0.85));
        const wfbmctrl = uniform(float(1));
        const useExp = uniform(uint(0));

        const getDensityTsl= Fn(({storageTexture,pt,next})=>{
            const slices = cellsX * cellsY;
            const slice = select(next,ceil(pt.z.mul(slices)),floor(pt.z.mul(slices)));
            If(slice.greaterThanEqual(slices),()=>{
                slice.subAssign(slices);
            });
            const col = slice.modInt(cellsX).toVar();
            const row = uint(slice.div(cellsX)).toVar();
            const origin = vec2(float(col).div(cellsX),float(row).div(cellsY));

            const uv1 = vec2(pt.xy).div(vec2(cellsX,cellsY)).toVar();
            uv1.addAssign(origin);

            const texel = texture(storageTexture,uv1,0).toVar();
            const perlinWorley = texel.x.toVar();
            const worley = texel.yzw.toVar();

            const wfbm = worley.x.mul(0.625).add(worley.y.mul(0.125)).add(worley.z.mul(0.25)).toVar();

            const cloud = _remap(perlinWorley,wfbm.sub(wfbmctrl),1,0,1).toVar();
            cloud .assign(saturate(_remap(cloud,pwctrl,1,0,1)));
            return cloud;
        });

        const samplePositionToUV = Fn(({pos,bbmin,bbmax})=>{
            const uv = pos.sub(bbmin).div(bbmax.sub(bbmin)).toVar();
            uv.x.subAssign(time.mul(0.02));
            uv.y.subAssign(time.mul(0.02));
            uv.x = fract(uv.x);
            uv.y = fract(uv.y);
            return uv;
        });

        const raymarchTSL = Fn(({storageTexture})=>{
            const rayDirection = positionWorld.sub(cameraPosition).normalize().toVar();
            const samplePosition = positionWorld.toVar();
            const stepVec = rayDirection.mul(stepSize);
            const slices = cellsX * cellsY;

            const density = float().toVar();
            const count = uint(0).toVar();
            const pt = vec3().toVar();
            const s1 = float().toVar();
            const s2 = float().toVar();

            Loop({start:uint(0),end:stepCount,type:'uint',condition:'<'},({i})=>{
                If(_pointInAABB(samplePosition,bbmin,bbmax),()=>{
                    pt.assign(samplePositionToUV({pos:samplePosition,bbmin,bbmax}));
                    s1.assign(getDensityTsl({storageTexture,pt,next:false}));
                    s2.assign(getDensityTsl({storageTexture,pt,next:true}));

                    density.addAssign(mix(s1,s2,fract(pt.z.mul(slices))));
                    count.addAssign(1);
                });
                samplePosition.addAssign(stepVec);
            });
            density.divAssign(count);
            If((useExp.equal(1)),()=>{
                density.assign(oneMinus(exp(density.negate())));
            });
            return vec4(1,1,1,saturate(density.mul(intensity)));
        });

        material.fragmentNode = raymarchTSL({storageTexture});

        this.scene.add(mesh);

        const options = {
            useExp:false,
        };

        const gui = new GUI();
        gui.add(stepSize, "value", 0, 5).name("stepSize");
        gui.add(stepCount, "value", 1, 128).name("stepCount");
        gui.add(intensity, "value", 0, 3).name("intensity");
        gui.add(pwctrl, "value", 0, 1).name("pwctrl");
        gui.add(wfbmctrl, "value", 0, 1).name("wfbmctrl");
        gui.add(options, "useExp").onChange( value => {
          useExp.value = ( value ) ? 1 : 0;
        });
    }

    async createNoiseTexture(size=256,cellsX=16,cellsY = 8){
        const storagetTexture = new THREEGPU.StorageTexture(size * cellsX,size * cellsY);

        storagetTexture.minFilter = THREEGPU.NearestFilter;
        storagetTexture.maxFilter = THREEGPU.NearestFilter;
        storagetTexture.generateMipmaps = false;

        const computeTexture = Fn(({storageTexture})=>{
            const posX = instanceIndex.modInt(size * cellsX).toVar();
            const posY = instanceIndex.div(size * cellsX).toVar();
            const indexUV = uvec2(posX,posY);

            const slices = cellsX * cellsY;
            const row = uint(posY.div(size)).toVar();
            const col = uint(posX.div(size)).toVar();
            const slice = row.mul(cellsX).add(col).toVar();

            const pt = vec3(posX.sub(col.mul(size)),posY.sub(row.mul(size)),0).div(size);
            pt.z = float(slice).div(slices);
            const freq = float(4);

            const pfbm = mix(1,perlinFbm(pt,4,7),0.5).toVar();
            pfbm.assign(abs(pfbm.mul(2).sub(1)));

            const g = worleyFbm(pt,freq);
            const b = worleyFbm(pt,freq.mul(2));
            const a = worleyFbm(pt,freq.mul(4));
            const r = _remap(pfbm,0,1,g,1);
            textureStore(storageTexture,indexUV,vec4(r,g,b,a)).toWriteOnly();
        })({storagetTexture}).compute(size * size * cellsX * cellsY);

        await this.renderer.computeAsync(computeTexture);
        return storagetTexture;
    }
    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth/window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

export class TslMakeNoiseTextureOfTileable{
    constructor(options ={}){
        this.options = options;
        this.init();
    }

    init(){
        this.renderer = new THREEGPU.WebGPURenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        this.options.dom.appendChild(this.renderer.domElement);

        this.scene = new THREEGPU.Scene();
        this.scene.background = new THREEGPU.Color(0x0561a0);

        this.perspectiveCamera = new THREEGPU.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
        this.perspectiveCamera.position.set(0,10,10);

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
        this.initTsl();
    }
    /**
     * 在gpu上面创建纹理
     * @param {*} size 
     */
    async createNoiseTexture(size=512){
        const storageTexture = new THREEGPU.StorageTexture(size,size);

        const computeTexture = Fn(({texture})=>{
            const posX = instanceIndex.modInt(size);
            const posY = instanceIndex.div(size);
            const indexUV = uvec2(posX,posY);

            const pt = vec3(posX,posY,0).div(size);// 变成0-1
            const freq = float(4).toVar();

            const pfbm = mix(1,_perlinFbm_(pt,4,7),0.5).toVar();
            pfbm.assign(abs(pfbm.mul(2).sub(1)));

            const g = _worleyFbm_(pt,freq);
            const b = _worleyFbm_(pt,freq.mul(2));
            const a = _worleyFbm_(pt,freq.mul(4));
            const r = _remap_(pfbm,0,1,g,1);

            textureStore(texture,indexUV,vec4(r,g,b,a)).toWriteOnly();
        })({texture:storageTexture}).compute(size * size);

        await this.renderer.computeAsync(computeTexture);
        return storageTexture;
    }
    async initTsl(){
        const geometry = new THREEGPU.PlaneGeometry(10,10);
        const material = new THREEGPU.MeshBasicNodeMaterial({transparent:true});
        this.mesh = new THREEGPU.Mesh(geometry,material);
        this.scene.add(this.mesh);
        
        const storageTexture = await this.createNoiseTexture();

        const channel = uniform(uint(4));// 定义4个通道

        const colorTsl = Fn(({storagetTexture})=>{
            const texel = texture(storageTexture);
            const result = vec4().toVar();

            If(channel.lessThan(uint(1)),()=>{
                result.assign(vec4(texel.r));
            }).ElseIf(channel.lessThan(uint(2)),()=>{
                result.assign(vec4(texel.g));
            }).ElseIf(channel.lessThan(uint(3)),()=>{
                result.assign(vec4(texel.b));
            }).ElseIf(channel.lessThan(uint(4)),()=>{
                result.assign(vec4(texel.a));
            }).Else(()=>{
                result.assign(texel);
            });
            return result;
        });

        material.colorNode = colorTsl({storageTexture});
        const options = {
            channel:'all',
        }
        const gui = new GUI();
        const channels = ['red','green','blue','alpha','all'];
        gui.add(options,'channel',channels).onChange(value=>{
            channel.value = channels.indexOf(value);
        });
    }
    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

export class TslMakeNoiseTextureAddTime{
    constructor(options={}){
        this.options = options;
        this.init();
    }
    init(){
        this.renderer = new THREEGPU.WebGPURenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));

        this.options.dom.appendChild(this.renderer.domElement);

        this.scene = new THREEGPU.Scene();
        this.scene.background = new THREEGPU.Color(0x06defd);

        this.perspectiveCamera = new THREEGPU.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
        this.perspectiveCamera.position.set(0,10,10);
        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
        this.initTsl();
    }
    async createNoiseTexture(size = 512){
        const storageTexture = new THREEGPU.StorageTexture(size,size);

        const computeTexture = Fn(({texture})=>{
            const posX = instanceIndex.modInt(size);// 0%512,,,,(512*512 - 1) %512
            const posY = instanceIndex.div(size);
            const indexUV = uvec2(posX,posY);

            const pt = vec3(posX,posY,0).div(size);
            const freq = float(4);

            const pfbm = mix(1,_perlinFbm_(pt,4,7),0.5).toVar();
            pfbm.assign(abs(pfbm.mul(2).sub(1)));

            const g = _worleyFbm_(pt,freq);
            const b = _worleyFbm_(pt,freq.mul(2));
            const a = _worleyFbm_(pt,freq.mul(4));
            const r = _remap_(pfbm,0,1,g,1);

            textureStore(texture,indexUV,vec4(r,g,b,a)).toWriteOnly();

        })({texture:storageTexture}).compute(size * size);

        await this.renderer.computeAsync(computeTexture);
        return storageTexture;
    }
    /**
     * 创建纹理
     * @param {*} size  纹理的尺寸
     * @param {*} cellsX  水平多少个纹理
     * @param {*} cellsY  垂直多少个纹理
     */
    async createNoiseTextureV(size=256,cellsX=16,cellsY=8){
        const storageTexture = new THREEGPU.StorageTexture(size * cellsX,size * cellsY);
        const computeTextureFn = Fn(({storageTexture})=>{
            const posX = instanceIndex.modInt(size * cellsX).toVar();
            const posY = instanceIndex.div(size * cellsY).toVar();
            const indexUV = uvec2(posX,posY);

            const slices = cellsX * cellsY;
            const row = uint(posY .div(size)).toVar();
            const col = uint(posX.div(size)).toVar();
            const slice = row.mul(cellsX).add(col).toVar();
            const pt = vec3(posX.sub(col.mul(size)),posY.sub(row.mul(size)),0).div(size);
            pt.z = float(slice).div(slices);

            const freq = float(4);
            const pfbm = mix(1,_perlinFbm_(pt,4,7),0.5).toVar();
            pfbm.assign(abs(pfbm.mul(2).sub(1)));

            const g = _worleyFbm_(pt,freq).toVar();
            const b = _worleyFbm_(pt,freq.mul(2)).toVar();
            const a = _worleyFbm_(pt,freq.mul(4)).toVar();
            const r = _remap_(pfbm,0,1,g,1).toVar();

            If((pt.x.lessThan(0.03).or(pt.y.lessThan(0.03))),()=>{
                r.assign(0);
                g.assign(0);
                b.assign(0);
                a.assign(1);
            });
            textureStore(storageTexture,indexUV,vec4(r,g,b,a)).toWriteOnly();
        })({storageTexture}).compute(size * size * cellsX * cellsY);

        await this.renderer.computeAsync(computeTextureFn);
        return storageTexture;
    }
    async initTsl(){
        const geometry = new THREEGPU.PlaneGeometry(100,100);
        const material = new THREEGPU.MeshBasicNodeMaterial({transparent:true});
        const mesh = new THREEGPU.Mesh(geometry,material);

        const storageTexture = await this.createNoiseTexture();

        const wfbmctrl = uniform(float(1));
        const pwctrl = uniform(float(0.85));

        const fragmentTsl = Fn(({storageTexture})=>{
            const uv1 = vec2(uv()).sub(time.mul(0.02)).toVar();
            uv1.assign(fract(uv1));

            const texel = texture(storageTexture,uv1,0).toVar();

            const perlinWorley = texel.r.toVar();
            const worley = texel.gba.toVar();
            const wfbm = worley.r.mul(0.625).add(worley.g.mul(0.125)).add(worley.b.mul(0.25)).toVar();

            const cloud = _remap_(perlinWorley,wfbm.sub(wfbmctrl),1,0,1).toVar();
            cloud.assign(saturate(_remap_(cloud,pwctrl,1,0,1)));
            return vec4(1,1,1,cloud);
        });
        material.fragmentNode = fragmentTsl({storageTexture});
        this.scene.add(mesh);
        //console.log(this.scene)
        //this.scene.backgroundNode = storageTexture;
        const gui = new GUI();
        gui.add(wfbmctrl,'value',0,20).name('wfbmctrl');
        gui.add(pwctrl,'value',0,1).name('pwctrl');
    }
    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}
/**
 * 光线透视
 */
export class TslRaymarching{
    constructor(options ={}){
        this.options = options;
        this.init();
    }

    init(){
        this.renderer = new THREEGPU.WebGPURenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        this.options.dom.appendChild(this.renderer.domElement);

        this.scene = new THREEGPU.Scene();
        this.scene.background = new THREEGPU.Color(0x5345fd);

        this.perspectiveCamera = new THREEGPU.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
        this.perspectiveCamera.position.set(0,10,10);

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
        
        this.clock = new THREEGPU.Clock();

        this.initTsl();
    }
    async createNoiseTexture(size = 256,cellsX=16,cellsY= 8){
        const storageTexture = new THREEGPU.StorageTexture(size * cellsX,size * cellsY);
        storageTexture.minFilter = THREEGPU.NearestFilter;
        storageTexture.maxFilter = THREEGPU.NearestFilter;
        storageTexture.generateMipmaps = false;

        const computeTexture = Fn(({storageTexture})=>{
            const posX = instanceIndex.modInt(size * cellsX).toVar();
            const posY = instanceIndex.div(size * cellsX).toVar();
            const indexUV = uvec2(posX,posY);

            const slices = cellsX * cellsY;// 总瓦片数
            const row = uint(posY.div(size)).toVar();
            const col = uint(posX.div(size)).toVar();
            const slice = row.mul(cellsX).add(col).toVar();
            const pt = vec3(posX.sub(col.mul(size)),posY.sub(row.mul(size)),0).div(size);
            pt.z = float(slice).div(slices);

            const freq = float(4);

            const pfbm = mix(1,_perlinFbm_(pt,4,7),0.5).toVar();
            pfbm.assign(abs(pfbm.mul(2).sub(1)));

            const g = _worleyFbm_(pt,freq);
            const b = _worleyFbm_(pt,freq.mul(2));
            const a = _worleyFbm_(pt,freq.mul(4));
            const r = _remap_(pfbm,0,1,g,1);

            textureStore(storageTexture,indexUV,vec4(r,g,b,a)).toWriteOnly();
        })({storageTexture}).compute(size * size * cellsX * cellsY);

        await this.renderer.computeAsync(computeTexture);
        return storageTexture;
    }
    async initTsl(){
        const geometry = new THREEGPU.BoxGeometry(40,20,40);
        const material = new THREEGPU.MeshBasicNodeMaterial({transparent:true});
        const mesh = new THREEGPU.Mesh(geometry,material);
        const bbox = new THREEGPU.Box3();
        mesh.geometry.computeBoundingBox();
        bbox.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);

        const bbmin = uniform(vec3(bbox.min));
        const bbmax = uniform(vec3(bbox.max));

        const cellsX = 16;
        const cellsY  = 8;
        const slices = cellsX * cellsY;

        const storageTexture = await this.createNoiseTexture(256,cellsX,cellsY);

        const stepSize = uniform(float(1));
        const stepCount = uniform(uint(30));
        const intensity = uniform(float(2.8));
        const pwctrl = uniform(float(0.85));
        const wfbmctrl = uniform(float(1));
        const useExp = uniform(uint(0));
        
        const getDensityTsl = Fn(({storageTexture,pt,next})=>{
            const slices = cellsX * cellsY;
            const slice = select(next,ceil(pt.z.mul(slices)),floor(pt.z.mul(slices)));
            If(slice.greaterThanEqual(slices),()=>{
                slice.subAssign(slices);
            });

            const col = slice.modInt(cellsX).toVar();
            const row = uint(slice.div(cellsX)).toVar();
            const origin = vec2(float(col).div(cellsX),float(row).div(cellsY));

            const uv1 = vec2(pt.xy).div(vec2(cellsX,cellsY)).toVar();
            uv1.addAssign(origin);
            const texel = texture(storageTexture,uv1,0).toVar();
            const perlinWorley = texel.x.toVar();
            const worley = texel.yzw.toVar();

            const wfbm = worley.x .mul(0.725).add(worley.y.mul(0.125)).add(worley.z.mul(0.25)).toVar();

            const cloud = _remap_(perlinWorley,wfbm.sub(wfbmctrl),1,0,1).toVar();
            cloud.assign(saturate(_remap_(cloud,pwctrl,1,0,1)));

            return cloud;
        });

        const samplePositionToUV = Fn(({pos,bbmin,bbmax})=>{
            const uv = pos.sub(bbmin).div(bbmax.sub(bbmin)).toVar();
            uv.x.subAssign(time.mul(0.02));
            uv.y.subAssign(time.mul(0.02));
            uv.x = fract(uv.x);
            uv.y = fract(uv.y);
            return uv;
        });

        const raymarchTsl = Fn(({storageTexture})=>{
            const rayDirection = positionWorld.sub(cameraPosition).normalize().toVar();
            const samplePosition = positionWorld.toVar();
            const stepVec = rayDirection.mul(stepSize);
            const slices = cellsX * cellsY;

            const density = float().toVar();
            const count = uint(0).toVar();
            const pt = vec3().toVar();
            const s1 = float().toVar();
            const s2 = float().toVar();
            Loop({start:uint(0),end:stepCount,type:'uint',condition:'<'},({i})=>{
                If(_pointInAABB_(samplePosition,bbmin,bbmax),()=>{
                    pt.assign(samplePositionToUV({pos:samplePosition,bbmin,bbmax}));
                    s1.assign(getDensityTsl({storageTexture,pt,next:false}));
                    s2.assign(getDensityTsl({storageTexture,pt,next:true}));

                    density.addAssign(mix(s1,s2,fract(pt.z.mul(slices))));
                    count.addAssign(1);
                });

                samplePosition.addAssign(stepVec);
            });

            density.divAssign(count);

            If((useExp.equal(1)),()=>{
                density.assign(oneMinus(exp(density.negate())));
            });

            return vec4(1,1,1,saturate(density.mul(intensity)));

        });

        material.fragmentNode = raymarchTsl({storageTexture});
        this.scene.add(mesh);

        const options  = {
            useExp:false
        };

        const gui = new GUI();
        gui.add(stepSize,'value',0,10).name('stepSize');
        gui.add(stepCount,'value',1,128).name('stepCount');
        gui.add(intensity,'value',0,3).name('intensity');
        gui.add(pwctrl,'value',0,1).name('pwctrl');
        gui.add(options,'useExp').onChange(value=>{
            useExp.value  = (value) ? 1 : 0;
        });
    }
    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
    }
    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth/window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

/**
 * 使用传统的glsl 写法
 */
export class TslMakeOutlineOfGLSL{
    constructor(options={}){
        this.options = options;
        this.initShader();
        this.init();
    }
    initShader(){
        this.vertexShader = `
            varying vec2 vUv;

            void main(){
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }
        `;

        this.fragmentShader = `
            varying vec2 vUv;

            uniform float uTime;
            uniform float uContrast;
            uniform float uBrightness;
            uniform float uFrequency;
            uniform vec3 uPhase;
            uniform int uCount;

            float mandelbrot(vec2 c){
                float c2 = dot(c,c);
                if(256. * c2 * c2 - 96. * c2 + 32. * c.x- 3. < 0.) return 0.;

                if(16. * (c2 + 2. * c.x + 1.) - 1. < 0.) return 0.;

                float B = float(uCount);
                float n = 0.0;
                vec2 z = vec2(0.0);

                for(int i =0; i < uCount;i++){
                    z = vec2(z.x * z.x - z.y * z.y ,2. * z.x * z.y) + c;
                    if(dot(z,z) > B) break;
                    n += 1.;
                }

                if(n > float(uCount - 1)) return 0.0;

                float sn = n - log2(log2(dot(z,z))) + 4.;
                return sn;
            }

            void main(){
                vec3 col = vec3(0.);
                int AA = 2;
                float AAsq = float(AA * AA);
                for(int m =0; m < AA;m++){
                    for(int n = 0;n < AA;n++){
                        vec2 p = (-1. + 2.0 * (vUv + vec2(float(m) * 0.001,float(n) * 0.001)/float(AA)));

                        float w = float(AA * m + n);
                        float time = uTime + 0.5 * (1. / 24.) * AAsq;
                        float zoo = 0.72 + 0.28 * cos(0.09 * time);
                        float theta = 0.05 * ( 1. - zoo) * time;
                        float coa = cos(theta);
                        float sia = sin(theta);

                        zoo = pow(zoo,8.0);

                        vec2 xy = vec2(p.x * coa - p.y * sia,p.x * sia + p.y * coa);
                        vec2 c = vec2(-.720,-0.26) + xy* zoo;

                        float l = mandelbrot(c);

                        col += (l < 0.5) ? vec3(0.,0.,0.) : uContrast + uBrightness * cos(6.28 * (uFrequency * (l / float(uCount)) + uPhase));
                    }
                
                }
                col /= AAsq;
                gl_FragColor = vec4(col,1.0);
            }
        `;
    }
    init(){
        this.clock = new THREEGPU.Clock();

        this.renderer = new THREEGL.WebGLRenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        this.options.dom.appendChild(this.renderer.domElement);

        this.scene = new THREEGL.Scene();
        this.scene.background = new THREEGL.Color(0x3fdfde);

        this.perspectiveCamera = new THREEGL.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
        this.perspectiveCamera.position.set(0,10,10);

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

        this.uniforms ={
            uTime:{value:0},
            uCount:{value:100},
            uPhase:{value:new THREEGL.Vector3(0.1,0.8,1.0)},
            uContrast:{value:0.746},
            uBrightness:{value:0.402},
            uFrequency:{value:4.1}
        };

        const geometry = new THREEGL.PlaneGeometry(100,100);
        const material = new THREEGL.ShaderMaterial({
            fragmentShader:this.fragmentShader,
            vertexShader:this.vertexShader,
            uniforms:this.uniforms
        });

        const mesh = new THREEGL.Mesh(geometry,material);
        this.scene.add(mesh);

        const options = {
            phase:0x978672,
        };

        const color = new THREEGL.Color(options.phase);
        this.uniforms.uPhase.value.set(color.r,color.g,color.b);

        const gui = new GUI();
        gui.add(this.uniforms.uCount,'value',10,512,1).name('count');
        gui.add(this.uniforms.uContrast,'value',0,2).name('contrast');
        gui.add(this.uniforms.uBrightness,'value',0,2).name('brightness');
        gui.add(this.uniforms.uFrequency,'value',0,10).name('frequency');
        gui.addColor(options,'phase').onChange(value=>{
            color.setHex(value);
            this.uniforms.uPhase.value.set(color.r,color.g,color.b);
        })
    }

    animate(){
        this.uniforms.uTime.value += this.clock.getDelta();
        this.renderer.render(this.scene,this.perspectiveCamera);
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}
/**
 * 将glsl转 tsl 写法
 */
export class TslMakeOutlineOfTsl{
    constructor(options={}){
        this.options = options;
        this.init();
    }

    init(){
        this.renderer = new THREEGPU.WebGPURenderer({antialias:true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth,window.innerHeight);
        this.renderer.setAnimationLoop(this.animate.bind(this));
        this.options.dom.appendChild(this.renderer.domElement);

        this.scene = new THREEGPU.Scene();
        this.scene.background = new THREEGPU.Color(0xdcfdcd);

        this.perspectiveCamera = new THREEGPU.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
        this.perspectiveCamera.position.set(0,10,10);

        this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

         this.initTsl();
    }

    initTsl(){
        const geometry = new THREEGPU.PlaneGeometry(100,100);
        const material = new THREEGPU.MeshBasicNodeMaterial({transparent:true});
        const mesh = new THREEGPU.Mesh(geometry,material);

        // 定义 uniform 变量
        const uContrast = uniform(float(0.5));
        const uBrightness = uniform(float(0.402));
        const uFrequency = uniform(float(4.1));
        const uPhase = uniform(vec3());
        const uCount = uniform(int(100));

        const mandelbrotFn = /*__PURE__*/Fn(([c_immutable])=>{
            
            const c = vec2(c_immutable).toVar();
            const c2 = float(dot(c,c)).toVar();

            If(float(256).mul(c2).mul(c2).sub(float(96).mul(c2)).add(float(32).mul(c.x).sub(float(3))).lessThan(float(0)),()=>{
                return float(0).toVar();
            });

            If(float(16.0).mul(c2.add(float(2.).mul(c.x)).add(1.)).sub(1.).lessThan(0.),()=>{
                return float(0);
            });

            const B = float(uCount).toVar();
            const n = float(0.).toVar();
            const z = vec2(0.).toVar();

            Loop({start:int(0),end:uCount,type:'int',condition:'<'},({i})=>{
                z.assign(vec2(z.x.mul(z.x).sub(z.y.mul(z.y)),float(2).mul(z.x).mul(z.y)).add(c));

                If(dot(z,z).greaterThan(B.mul(B)),()=>{
                    Break();
                });

                n.addAssign(1.0);
            });

            If(n.greaterThan(float(uCount.sub(int(1)))),()=>{
                return float(0);
            });

            const sn = float(n.sub(log2(log2(dot(z,z)))).add(4.)).toVar();
            return sn;
        }).setLayout({
            name:'mandelbrotFn',
            type:'float',
            inputs:[{
                name:'c',
                type:'vec2'
            }]
        });

        const fragTsl = /*__PURE__*/ Fn(()=>{
            const col = vec3(0.).toVar();
            const AA = int(2).toVar();
            const AAsq = float(AA).mul(float(AA)).toVar();
            const vUv = uv().toVar();// 

            Loop({end:AA,name:'m'},({m})=>{
                Loop({end:AA,name:'n'},({n})=>{
                    const p = vec2(float(-1.).add(float(2.).mul(vUv.add(vec2(float(m).mul(0.001),float(n).mul(0.001)).div(float(AA)))))).toVar();
                    const w = float(AA.mul(m).add(n)).toVar();
                    const tm = float(time.add(float(0.5 * 1. / 24.).mul(w).div(AAsq))).toVar();
                    const zoo = float(float(0.72).add(float(0.28).mul(cos(float(0.09).mul(tm))))).toVar();
                    const theta = float(float(0.05).mul(float(1.).sub(zoo)).mul(tm)).toVar();
                    const coa = float(cos(theta)).toVar();
                    const sia = float(sin(theta)).toVar();

                    zoo.assign(pow(zoo,8.));
                    const xy = vec2(p.x.mul(coa).sub(p.y.mul(sia)),p.x.mul(sia).add(p.y.mul(coa))).toVar();
                    const c = vec2(vec2(float(-0.72),float(-0.26)).add(xy.mul(zoo))).toVar();
                
                    const l = float(mandelbrotFn(c)).toVar();
                    col.addAssign(select(l.lessThan(0.5),vec3(0.,0.,0.),uContrast.add(uBrightness.mul(cos(float(6.28).mul(uFrequency.mul(l.div(float(uCount))).add(uPhase)))))));

                });

            });

            col.divAssign(AAsq);
            return vec4(col,1.);
        });

        //material.fragmentNode = fragTsl();
        material.outputNode = fragTsl(); // 和上面的一样
        const options = {
            phase: 0x978672
        }
    
        const color = new THREEGPU.Color(options.phase);
        uPhase.value.set( color.r, color.g, color.b );
    
        const gui = new GUI();
        gui.add( uCount, 'value', 10, 512, 1 ).name( 'count' );
        gui.add( uContrast, 'value', 0, 2 ).name( 'contrast' );
        gui.add( uBrightness, 'value', 0, 2 ).name( 'brightness' );
        gui.add( uFrequency, 'value', 0, 10).name( 'frequency' );
        gui.addColor( options, 'phase' ).onChange( value => {
            color.setHex( value );
            uPhase.value.set( color.r, color.g, color.b );
        } );

        this.scene.add(mesh);
    }
    animate(){
        this.renderer.render(this.scene,this.perspectiveCamera);
    }

    _windowResizeFun(){
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
}