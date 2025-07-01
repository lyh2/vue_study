import { ParticleEngine} from '@/utils/effect/ParticleEngine';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Smooke {
    constructor(options = {}) {
        this.options = options;
        this.elapsedTime = 0;
        this.delta = 0;
        this.windX = 0.002;
        this.windY = 0;
        this.windZ = 0;
        this.particle_smoke_a = [];// 烟雾个数
        this.particles_grass_a = [];// 草地个数
        // 创建100棵草
        for (let n = 0; n < 100; n++) {
            const scale = Math.random() * 0.5 + 0.5;// 随机
            this.particles_grass_a.push({
                offset: [Math.random() * 20 - 10, scale / 2, Math.random() * 20 - 10],// 
                scale: [scale, scale],
                quaternion: [0, 0, 0, 1],
                rotation: 0,
                color: [1, 1, 1, 1],
                blend: 1,
                texture: 2,
            });
        }

        this._initShader();
        this._init();
    }

    _init() {
        this.perspectiveCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 10000);
        this.perspectiveCamera.position.set(0, 15, 15);

        this.scene = new THREE.Scene();

        const pointLight = new THREE.PointLight(0xfee3b1, 2);
        pointLight.position.set(-20, 20, 20);
        this.scene.add(pointLight);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xb9eeff, 1);

        if (this.options.dom) {
            this.options.dom.appendChild(this.renderer.domElement);
        }


        this.clock = new THREE.Clock();
        this.textureLoader = new THREE.TextureLoader();
        this._initLoadTexture();
        this.orbitControls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);

        this._initGeometry();
        this._initFloor();
        this._initEmitters();// 创建粒子发射器,粒子发射器就是定义约束粒子的对象

        this.renderer.setAnimationLoop(this.animate.bind(this));

        this.particleEngine  = new ParticleEngine({texture:this.fire});
        this.scene.add(this.particleEngine._mesh);
        //this.particleEngine._mesh.scale.set(0.25,0.25,0.25);
        //this.particleEngine._mesh.position.set(0,1,0);
   
    }

    _initLoadTexture() {
        this.smoke = this.textureLoader.load('./texture/smoke_from_base64.png');
        this.fire = this.textureLoader.load('./texture/fire_from_base64.png');
        this.grass = this.textureLoader.load('./texture/grass_from_base64.png');
        this.floor = this.textureLoader.load('./texture/floor_from_base64.png');
        this.floor.wrapS = this.floor.wrapT = THREE.RepeatWrapping;
        this.floor.repeat.set(20, 20);
    }

    _initGeometry() {
        const geometry = new THREE.InstancedBufferGeometry();
        // 下面为啥直接使用THREE.Float32BufferAttribute 而不是 THREE.InstancdBufferAttribute 
        //position 和 uv 是定义几何体本身顶点的数据（每个粒子共用相同的矩形 geometry）

        // 顶点（4个）
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([
            -0.5, 0.5, 0,  // 0 左上
            -0.5, -0.5, 0,  // 1 左下
            0.5, 0.5, 0,  // 2 右上
            0.5, -0.5, 0   // 3 右下
        ], 3));

        // UV 坐标（与顶点对应）
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
            0, 1,   // 0
            0, 0,   // 1
            1, 1,   // 2
            1, 0    // 3
        ], 2));

        // 使用索引定义两个三角形：0-1-2, 2-1-3
        geometry.setIndex([
            0, 1, 2,
            2, 1, 3
        ]);


        const dummy = new Float32Array(4);//临时设置的值，后面会更新

        //InstancedBufferAttribute 是为 每个实例 提供不同的值（例如 offset、scale、color 等），这才需要它
        geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(dummy, 3));
        geometry.setAttribute('scale', new THREE.InstancedBufferAttribute(dummy, 2));
        geometry.setAttribute('quaternion', new THREE.InstancedBufferAttribute(dummy, 4));
        geometry.setAttribute('rotation', new THREE.InstancedBufferAttribute(dummy, 1));
        geometry.setAttribute('color', new THREE.InstancedBufferAttribute(dummy, 4));
        geometry.setAttribute('blend', new THREE.InstancedBufferAttribute(dummy, 1));
        geometry.setAttribute('texture', new THREE.InstancedBufferAttribute(dummy, 1));
    /**
            ### 1. **uniforms**:
            - map: 一个包含三个纹理的数组（this.smoke, this.fire, this.grass）。这些纹理可以在着色器中使用。
            - time: 一个随时间变化的浮点数，通常用于动画效果。
            ### 2. **着色器**:
            - vertexShader: 顶点着色器代码（存储在this.vertexShader中）。
            - fragmentShader: 片元着色器代码（存储在this.fragmentShader中）。
            ### 3. **透明和深度设置**:
            - transparent: true: 启用透明。
            - depthWrite: false: 禁止写入深度缓冲区，这通常用于半透明物体，以避免深度问题。
            ### 4. **混合设置**:
            - blending: THREE.CustomBlending: 使用自定义混合模式。
            - blendEquation: THREE.AddEquation: 混合方程使用加法（source + destination）。
            - blendSrc: THREE.OneFactor: 源因子设置为1（即源颜色乘以1）。
            - blendDst: THREE.OneMinusSrcAlphaFactor: 目标因子设置为1 - source.alpha。
            ### 混合公式解释：
            使用自定义混合参数，最终的混合公式为：
            
    结果颜色 = (源颜色 * 1) + (目标颜色 * (1 - 源颜色的alpha))

            这实际上是一种预乘Alpha的混合方式，常用于粒子效果等。
            */
        const material = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: [this.smoke, this.fire, this.grass] },//
                time: { value: 0 }
            },
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            transparent: true,
            depthTest:true,
            depthWrite: false,
            side:THREE.DoubleSide,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
        });
        /**
            你使用 THREE.Mesh + InstancedBufferGeometry 是为了：

            支持粒子系统中更复杂的 per-instance 属性，且这些属性要传入自定义着色器
         */
        this.sprite = new THREE.Mesh(geometry, material);
        this.sprite.frustumCulled = false;
        this.scene.add(this.sprite);
        
    }
    // 创建地面
    _initFloor() {
        const floorMaterial = new THREE.MeshStandardMaterial({
            map: this.floor,
            bumpMap: this.floor,
            bumpScale: 0.01,
            metalness: 0.16,
        });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMaterial);
        floor.position.y = 0;
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        this.scene.add(new THREE.AmbientLight(0xffcf, 3.2));
    }
    // 初始化发粒子射器
    // 初始化发粒子射器
    _initEmitters() {
        this.particle_emmiters = [
            {
                id:0,
                name:'emitter_0',
                position: { x: 0, y: 0, z: 0 },// 粒子发射器的位置，发射器在世界空间中的三维位置
                total_particles: 150,
                emitted_particles: 0,
                add_time: 0.05,// 每隔多少秒发射一个粒子（控制发射频率）
                elapsed: 0,//总的时间，内部计时器，记录自上次发射后的时间
                radius_1: 0.02,
                radius_2: 0.4,
                radius_height: 5,
                live_time_from: 4,// 粒子最短时间
                live_time_to: 6,
                rotation_from: 1,// 旋转
                rotation_to: 2,
                speed_from: 0.005,// 速度
                speed_to: 0.01,
                scale_from: 0.2,// 缩放
                scale_increase: 0.004,// 缩放增加
                color_from: [1, 1, 1],// 颜色变化
                color_to: [0.3, 0.3, 0.3],
                color_speed_from: 0.5,// 颜色变化速度
                color_speed_to: 1,
                brightness_from: 1,// 高光度
                brightness_to: 1,
                opacity: 0.6,// 透明度
                opacity_decrease: 0.004,// 透明度减少量
                blend: 0.8,//0~1，混合权重，用于着色器混合时的控制
                texture: 0,// 使用哪张纹理,纹理索引值
            }, 
            {
                id:1,
                name:'emitter_1',
                position: { x: -2, y: 0, z: -4 },
                total_particles: 150,
                emitted_particles: 0,
                radius_1: 0.02,
                radius_2: 1,
                radius_height: 5,
                add_time: 0.1,
                elapsed: 0,
                live_time_from: 7,
                live_time_to: 7.5,
                opacity_decrease: 0.008,
                rotation_from: 0.5,
                rotation_to: 1,
                speed_from: 0.005,
                speed_to: 0.01,
                scale_from: 0.2,
                scale_increase: 0.004,
                color_from: [2, 2, 2],
                color_to: [0, 0, 0],
                color_speed_from: 0.4,
                color_speed_to: 0.4,
                brightness_from: 1,
                brightness_to: 1,
                opacity: 1,
                blend: 0.8,
                texture: 1,
            }, {
                id:2,
                name:'emitter_2',
                position: { x: 0, y: 0, z: -4 },
                                total_particles: 150,
                emitted_particles: 0,
                radius_1: 0.02,
                radius_2: 1,
                radius_height: 5,
                add_time: 0.1,
                elapsed: 0,
                live_time_from: 10,
                live_time_to: 10.5,
                opacity_decrease: 0.008,
                rotation_from: 0.5,
                rotation_to: 1,
                speed_from: 0.005,
                speed_to: 0.01,
                scale_from: 0.2,
                scale_increase: 0.004,
                color_from: [0.1, 0.1, 0.1],
                color_to: [0.1, 0.1, 0.1],
                color_speed_from: 1,
                color_speed_to: 1,
                brightness_from: 1,
                brightness_to: 1,
                opacity: 1,
                blend: 1,
                texture: 0,
            }, {
                id:3,
                name:'emitter_3',
                position: { x: 2, y: 0, z: -4 },
                                total_particles: 150,
                emitted_particles: 0,
                radius_1: 0.02,
                radius_2: 0.4,
                radius_height: 5,
                add_time: 0.1,
                elapsed: 0,
                live_time_from: 4,
                live_time_to: 4.5,
                opacity_decrease: 0.004,
                rotation_from: 2,
                rotation_to: 3,
                speed_from: 0.005,
                speed_to: 0.01,
                scale_from: 0.1,
                scale_increase: 0.003,
                color_from: [1, 1, 1],
                color_to: [1, 1, 1],
                color_speed_from: 1,
                color_speed_to: 1,
                brightness_from: 1.0,
                brightness_to: 1,
                opacity: 0.4,
                blend: 0.5,
                texture: 0,
            }, {
                id:4,
                name:'emitter_4',
                position: { x: 4, y: 0, z: -4 },
                                total_particles: 150,
                emitted_particles: 0,
                radius_1: 2,
                radius_2: 2,
                radius_height: 5,
                add_time: 0.1,
                elapsed: 0,
                live_time_from: 1,
                live_time_to: 1.5,
                opacity_decrease: 0.004,
                rotation_from: 2,
                rotation_to: 3,
                speed_from: 0.005,
                speed_to: 0.01,
                scale_from: 0.0,
                scale_increase: 0.003,
                color_from: [1, 2, 1],
                color_to: [1, 1, 2],
                color_speed_from: 1,
                color_speed_to: 1,
                brightness_from: 1.0,
                brightness_to: 1,
                opacity: 0.4,
                blend: 0.7,
                texture: 0,
            }, {
                id:5,
                name:'emitter_5',
                position: { x: 0, y: 1, z: 0 },
                                total_particles: 150,
                emitted_particles: 0,
                radius_1: 0.02,
                radius_2: 1,
                radius_height: 5,
                add_time: 0.01,
                elapsed: 0,
                live_time_from: 1,
                live_time_to: 1.5,
                opacity_decrease: 0.008,
                rotation_from: 0.5,
                rotation_to: 1,
                speed_from: 0.005,
                speed_to: 0.01,
                scale_from: 0.2,
                scale_increase: 0.004,
                color_from: [2, 2, 2],
                color_to: [0, 0, 0],
                color_speed_from: 1,
                color_speed_to: 1,
                brightness_from: 1,
                brightness_to: 1,
                opacity: 1,
                blend: 0.8,
                texture: 1,
            }
        ];
    }

    animate() {
        this.updateParticle();
        this.delta = this.clock.getDelta();
        this.elapsedTime = this.clock.getElapsedTime();
        this.sprite.material.uniforms.time.value += this.delta;
        this.particleEngine && this.particleEngine.update(this.delta);
        this.renderer.render(this.scene, this.perspectiveCamera);
    }

    updateParticle() {
        this.updateParticleEmmiter();// 更新发射器
        const cameraPos = this.perspectiveCamera.position;// 相机的位置
        this.particles = [...this.particle_smoke_a]//, ...this.particles_grass_a];// 去掉草
        this.particles.forEach(p => {
            const [x, y, z] = p.offset;
            // 按照相机位置到粒子精灵的位置进行排序
            p.d = Math.sqrt((cameraPos.x - x) ** 2 + (cameraPos.y - y) ** 2 + (cameraPos.z - z) ** 2);
            
        });
        this.particles.sort((a, b) => b.d - a.d);
        //console.log(this.particles)
        const count = this.particles.length; // 
        const offset = new Float32Array(count * 3);
        const scale = new Float32Array(count * 2);
        const quaternion = new Float32Array(count * 4);
        const rotation = new Float32Array(count);
        const color = new Float32Array(count * 4);
        const blend = new Float32Array(count);
        const texture = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const p = this.particles[i];
            offset.set(p.offset, i * 3);
            scale.set(p.scale, i * 2);
            quaternion.set(p.quaternion, i * 4);
            rotation[i] = p.rotation;
            color.set(p.color, i * 4);
            blend[i] = p.blend;
            
            texture[i] = p.texture;
        }

        this.sprite.geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offset, 3));
        this.sprite.geometry.setAttribute('scale', new THREE.InstancedBufferAttribute(scale, 2));
        this.sprite.geometry.setAttribute('quaternion', new THREE.InstancedBufferAttribute(quaternion, 4));
        this.sprite.geometry.setAttribute('rotation', new THREE.InstancedBufferAttribute(rotation, 1));
        this.sprite.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(color, 4));
        this.sprite.geometry.setAttribute('blend', new THREE.InstancedBufferAttribute(blend, 1));
        this.sprite.geometry.setAttribute('texture', new THREE.InstancedBufferAttribute(texture, 1));
        this.sprite.geometry.instanceCount  = count;
        //console.log(this.sprite)
    }
    // 更新发射器
    updateParticleEmmiter() {
        for (const emitter of this.particle_emmiters) {
            emitter.elapsed += this.delta;//增加发射器的累计时间，用于判断是否该发射粒子了
            let addCount = Math.floor(emitter.elapsed / emitter.add_time);// 计算在本帧内应该发射多少个粒子
            emitter.elapsed %= emitter.add_time;// 保留“多余的”时间，用于下一帧继续积累
            //console.log(addCount  , emitter.emitted_particles , emitter.total_particles)
            // 原始代码：addCount -- && emitter.emitted_particles < emitter.total_particles
            addCount = Math.ceil( ( emitter.total_particles - emitter.emitted_particles ) * Math.random())
            //console.log(addCount)
            while ( addCount --) { // 这里发送粒子的时间太短了，频繁发射粒子导致颜色太重了，过渡很明显
                this.emitParticle(emitter);
                emitter.emitted_particles++;
            }
        }
         // 过滤掉opacity 透明度< 0 的数据，表示生命时间已经结束(或者是live < 0 的)
        this.particle_smoke_a = this.particle_smoke_a.filter(p => {
            const [dx, dy, dz] = p.quaternion;
            p.offset[0] += dx + this.windX;
            p.offset[1] += dy + this.windY;
            p.offset[2] += dz + this.windZ;
            p.scale[0] += p.scale_increase;
            p.scale[1] += p.scale_increase;

            if (p.color_process < 1) {
                p.color[0] = p.color_from[0] + (p.color_to[0] - p.color_from[0]) * p.color_process;
                p.color[1] = p.color_from[1] + (p.color_to[1] - p.color_from[1]) * p.color_process;
                p.color[2] = p.color_from[2] + (p.color_to[2] - p.color_from[2]) * p.color_process;
                p.color_process += this.delta * p.color_speed;
            }

            if (p.live > 0) {
                p.live -= this.delta;
            } else {
                const nextAlpha = p.color[3] - p.opacity_decrease;
                p.color[3] = nextAlpha;
                // 已经死亡
                
            }
            // let stillAlive = p.color[3] > 0;

            // if (!stillAlive) {
            //     --this.particle_emmiters[p.emitted_id].emitted_particles;
            // }
            // return stillAlive;

        });
    }
    // 发射粒子，从指定的粒子发射器配置中发射粒子
    emitParticle(emitter) {
        const r = emitter.radius_1 * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const x1 = emitter.position.x + r * Math.cos(theta);
        const z1 = emitter.position.z + r * Math.sin(theta);

        const r2 = emitter.radius_2 * Math.sqrt(Math.random());
        const theta2 = Math.random() * 2 * Math.PI;
        const x2 = x1 + r2 * Math.cos(theta2);
        const z2 = z1 + r2 * Math.sin(theta2);

        let dx = x2 - x1;
        let dy = emitter.radius_height;
        let dz = z2 - z1;

        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const speed = emitter.speed_from + Math.random() * (emitter.speed_to - emitter.speed_from);
        dx = (dx / length) * speed;// 速度*
        dy = (dy / length) * speed;
        dz = (dz / length) * speed;
        // 高光值
        const brightness = emitter.brightness_from + Math.random() * (emitter.brightness_to - emitter.brightness_from);
        // 
        this.particle_smoke_a.push({
            offset: [x1, emitter.position.y, z1],// 每一次offset偏移的值不一样
            scale: [emitter.scale_from, emitter.scale_from],
            quaternion: [dx, dy, dz],
            rotation: emitter.rotation_from + Math.random() * (emitter.rotation_to - emitter.rotation_from),
            color: [1, 1, 1, emitter.opacity],
            blend: emitter.blend,
            texture: emitter.texture,
            live: emitter.live_time_from + Math.random() * (emitter.live_time_to - emitter.live_time_from),
            scale_increase: emitter.scale_increase,
            opacity_decrease: emitter.opacity_decrease,
            color_from: emitter.color_from.map(c => c * brightness),
            color_to: emitter.color_to.map(c => c * brightness),
            color_speed: emitter.color_speed_from + Math.random() * (emitter.color_speed_to - emitter.color_speed_from),
            color_process: 0,
            emitted_id:emitter.id,
            emitter_name:emitter.name
        });
    }

    _windowResizeFun() {
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _initShader() {
        this.vertexShader = `
            attribute vec3 offset;
            attribute vec2 scale;
            attribute vec4 quaternion;
            attribute float rotation;
            attribute vec4 color;
            attribute float blend;
            attribute float texture;
            uniform float time;

            varying vec2 vUv;
            varying vec4 vColor;
            varying float vBlend;
            varying float num;
            vec3 localUpVector = vec3(0.0, 1.0, 0.0);// 定义Up 向量

            void main() {
                float angle = time * rotation;
                // 烟雾向上，Z轴不发生改变
                // 对每个顶点的 二维平面坐标 (x, y) 做绕 Z 轴旋转，再乘上缩放（scale.x, scale.y），然后保持 z 不变
                //这段代码模拟了一个“面朝相机的平面精灵”随时间绕 Z 轴旋转的行为：
                //如果 angle 是 0，它就是原始方向；
                //随着时间变化 angle 变化，会造成粒子图像在平面内打转的视觉效果；
                //position.z 保持为 0，避免粒子顶点“偏离”原始平面，从而保持 billboard 的形状。

                vec3 vRotated = vec3(
                    position.x * scale.x * cos(angle) - position.y * scale.y * sin(angle),
                    position.y * scale.y * cos(angle) + position.x * scale.x * sin(angle),
                    position.z
                );

                vUv = uv;
                vColor = color;
                vBlend = blend;
                num = texture;

                /**
                 vec3 vLook = offset - cameraPosition;// 粒子的位置 到相机的位置
                  🖐️ 右手法则图示：
                    假设：

                    拇指 = 第一个向量 vLook

                    食指 = 第二个向量 up（通常是 (0, 1, 0)）

                    中指 = 叉乘结果 vRight

                    右手摆出 3 指 —— 拇指指向 vLook，食指指向 up，中指自然就是叉乘结果方向。

                    vec3 vRight = normalize(cross(vLook, localUpVector));// 得到向右的向量
                 */

                vec3 vForward = normalize(cameraPosition - offset);
                vec3 vRight = normalize(cross(localUpVector, vForward));

                // 得到新的位置数据
                vec3 vPosition = vRotated.x * vRight + vRotated.y * localUpVector + vRotated.z;
                //gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition + offset, 1.0);
                
                vec4 mPosition = modelMatrix * vec4(vPosition,1.);
                mPosition.xyz += offset;
                gl_Position = projectionMatrix * modelViewMatrix * mPosition;

            }
        `;
        

        this.fragmentShader = `
            const int count = 3;// 纹理的个数
            uniform sampler2D map[count];// 纹理数组
            varying vec2 vUv;
            varying vec4 vColor;
            varying float vBlend;
            varying float num;// 纹理索引值

            void main() {
                vec4 texColor = vec4(0.0);
                int idx = int(floor(num + 0.5));
                if (idx == 0) texColor = texture2D(map[0], vUv);
                else if (idx == 1) texColor = texture2D(map[1], vUv);
                else if (idx == 2) texColor = texture2D(map[2], vUv);
                /**
                 * 这一步叫做 “预乘透明度”（Pre-multiplied Alpha）
                    假设你的纹理是半透明的烟雾贴图：
                    texColor.rgb 是颜色值（如 vec3(0.8, 0.8, 0.8)）
                    texColor.a 是透明度（如 0.4）
                    那么：
                    texColor.rgb = texColor.rgb * texColor.a; 
                    让颜色的“亮度”跟透明度成正比，防止混合时出现黑边、叠加发黑等问题。
                    这在启用 CustomBlending 时是常见操作。
                */
               
                texColor.rgb *= texColor.a;
                texColor.a *= vBlend;
                gl_FragColor = texColor * vColor;
            }
        `;
    }
}

