import * as THREE from 'three';


/** 实现火焰的效果
使用方式：     
this._fire = new Fire({texture:this.fire,particle_total:150,radius_height:5});
        this.scene.add(this._fire._mesh);
        this._fire._mesh.scale.set(1.8,1.8,1.8); 

        this._fire.update(delta) -循环中调用
 */

export class Fire {
    constructor(options = {}) {
        this.id = (Math.random() * 10000).toFixed(0);
        this.name = options?.name || 'Fire';
        this.type = 'Fire';

        this.position = options?.position || { x: 0, y: 0, z: 0 };
        this.particle_total = options?.particle_total || 50;
        this.radius_1 = options?.radius_b || 0.02;
        this.radius_2 = options?.radius_t || 0.8;
        this.radius_height = options?.radius_height || 4;

        this.live_time_from = options?.live_time_from || 1; // 粒子最短存活时间
        this.live_time_to = options?.live_time_to || 1.5;
        this.rotation_from = options?.rotation_from || 0.5;
        this.rotation_to = options?.rotation_to || 1;
        this.speed_from = options?.speed_from || 0.005;
        this.speed_to = options?.speed_to || 0.01;
        this.scale_from = options?.scale_from || 0.2;
        this.scale_increase = options?.scale_increase || 0.004;
        // 颜色变化
        this.color_from = options?.color_from || [2, 2, 2];
        this.color_to = options?.color_to || [0, 0, 0];
        this.color_speed_from = options?.color_speed_from || 1; // 颜色变化的速度
        this.color_speed_to = options?.color_speed_to || 0.8;
        // 高光
        this.brightness_from = options?.brightness_from || 1;
        this.brightness_to = options?.brightness_to || 0.85;

        this.opacity = options?.opacity || 1;
        this.opacity_decrease = options?.opacity_decrease || 0.008; // 透明度减少量
        this.blend = options?.blend || 0.8;

        this.texture = options?.texture || null;

        this.windX =options?.windX || 0.002;
        this.windY = options?.windY || 0;
        this.windZ = options?.windZ || 0;

        this.particles =[];
        this.initShader();
        // 创建几何体
        this.init();
    }
    init() {
        const geometry = new THREE.InstancedBufferGeometry();
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


        const count = this.particle_total; // 
        const offset = new Float32Array(count * 3);
        const scale = new Float32Array(count * 2);
        const quaternion = new Float32Array(count * 4);
        const rotation = new Float32Array(count);
        const color = new Float32Array(count * 4);
        const blend = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            // 首先判断粒子是否已经死亡，就重新创建
            this.particles.push (this.createParticle());
        }

        //InstancedBufferAttribute 是为 每个实例 提供不同的值（例如 offset、scale、color 等），这才需要它
        geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offset, 3));
        geometry.setAttribute('scale', new THREE.InstancedBufferAttribute(scale, 2));
        geometry.setAttribute('quaternion', new THREE.InstancedBufferAttribute(quaternion, 4));
        geometry.setAttribute('rotation', new THREE.InstancedBufferAttribute(rotation, 1));
        geometry.setAttribute('color', new THREE.InstancedBufferAttribute(color, 4));
        geometry.setAttribute('blend', new THREE.InstancedBufferAttribute(blend, 1));
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
                uTexture: { value: this.texture ,type:'t'},//
                uTime: { value: 0 }
            },
            vertexShader: this.vertexShader,
            fragmentShader: this.fragmentShader,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.CustomBlending,
            blendEquation: THREE.AddEquation,
            blendSrc: THREE.OneFactor,
            blendDst: THREE.OneMinusSrcAlphaFactor,
        });
        /**
            你使用 THREE.Mesh + InstancedBufferGeometry 是为了：

            支持粒子系统中更复杂的 per-instance 属性，且这些属性要传入自定义着色器
         */
        this._mesh = new THREE.Mesh(geometry, material);
        this._mesh.frustumCulled = false;
    }

    update(dt) {
        const count = this.particle_total; // 
        const offset = new Float32Array(count * 3);
        const scale = new Float32Array(count * 2);
        const quaternion = new Float32Array(count * 4);
        const rotation = new Float32Array(count);
        const color = new Float32Array(count * 4);
        const blend = new Float32Array(count);
        const texture = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // 首先判断粒子是否已经死亡，就重新创建
            
            let p = this.particles[i];
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
                p.color_process += dt * p.color_speed;
            }

            if (p.live > 0) {
                p.live -= dt;
            } else {
                const nextAlpha = p.color[3] - p.opacity_decrease;
                p.color[3] = nextAlpha;
                // 已经死亡,重新创建粒子
                this.particles[i] = this.createParticle();
                //console.log(this.particle_smoke_a[i]);
                p = this.particles[i];
            }
            offset.set(p.offset, i * 3);
            scale.set(p.scale, i * 2);
            quaternion.set(p.quaternion, i * 4);
            rotation[i] = p.rotation;
            color.set(p.color, i * 4);
            blend[i] = p.blend;
            
        }

        this._mesh.geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offset, 3));
        this._mesh.geometry.setAttribute('scale', new THREE.InstancedBufferAttribute(scale, 2));
        this._mesh.geometry.setAttribute('quaternion', new THREE.InstancedBufferAttribute(quaternion, 4));
        this._mesh.geometry.setAttribute('rotation', new THREE.InstancedBufferAttribute(rotation, 1));
        this._mesh.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(color, 4));
        this._mesh.geometry.setAttribute('blend', new THREE.InstancedBufferAttribute(blend, 1));
        this._mesh.geometry.setAttribute('texture', new THREE.InstancedBufferAttribute(texture, 1));
        this._mesh.geometry.instanceCount  = count;
        this._mesh.material.uniforms.uTime.value += dt;
    }
    createParticle() {
        const r = this.radius_1 * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const x1 = this.position.x + r * Math.cos(theta);
        const z1 = this.position.z + r * Math.sin(theta);

        const r2 = this.radius_2 * Math.sqrt(Math.random());
        const theta2 = Math.random() * 2 * Math.PI;
        const x2 = x1 + r2 * Math.cos(theta2);
        const z2 = z1 + r2 * Math.sin(theta2);

        let dx = x2 - x1;
        let dy = this.radius_height;
        let dz = z2 - z1;

        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const speed = this.speed_from + Math.random() * (this.speed_to - this.speed_from);
        dx = (dx / length) * speed;// 速度*
        dy = (dy / length) * speed;
        dz = (dz / length) * speed;
        // 高光值
        const brightness = this.brightness_from + Math.random() * (this.brightness_to - this.brightness_from);
        // 
        return {
            offset: [x1, this.position.y, z1],// 每一次offset偏移的值不一样
            scale: [this.scale_from, this.scale_from],
            quaternion: [dx, dy, dz,1],
            rotation: this.rotation_from + Math.random() * (this.rotation_to - this.rotation_from),
            color: [1, 1, 1, this.opacity],
            blend: this.blend,
           
            live: this.live_time_from + Math.random() * (this.live_time_to - this.live_time_from),
            scale_increase: this.scale_increase,
            opacity_decrease: this.opacity_decrease,
            color_from: this.color_from.map(c => c * brightness),
            color_to: this.color_to.map(c => c * brightness),
            color_speed: this.color_speed_from + Math.random() * (this.color_speed_to - this.color_speed_from),
            color_process: 0,
            
        };
    }
    initShader() {
        this.vertexShader = `
            attribute vec3 offset;
            attribute vec2 scale;
            attribute vec4 quaternion;
            attribute float rotation;
            attribute vec4 color;
            attribute float blend;
            uniform float uTime;

            varying vec2 vUv;
            varying vec4 vColor;
            varying float vBlend;

            void main() {
                float angle = uTime * rotation;
                // 局部平面旋转
                vec3 vRotated = vec3(
                    position.x * scale.x * cos(angle) - position.y * scale.y * sin(angle),
                    position.y * scale.y * cos(angle) + position.x * scale.x * sin(angle),
                    position.z
                );

                vUv = uv;
                vColor = color;
                vBlend = blend;

                // === 新增 Billboarding 核心代码 ===
                // 计算相机到粒子的方向向量
                vec3 camToParticle = normalize(offset - cameraPosition);
                
                // 构建正交基向量（使用世界空间的UP向量作为参考）
                vec3 worldUp = vec3(0.0, 1.0, 0.0);
                vec3 particleRight = normalize(cross(worldUp, camToParticle));
                vec3 particleUp = normalize(cross(camToParticle, particleRight));
                
                // 将旋转后的顶点偏移到相机平面
                vec3 billboardPos = offset 
                    + particleRight * vRotated.x 
                    + particleUp * vRotated.y;

                // 转换到裁剪空间
                vec4 mvPosition = modelViewMatrix * vec4(billboardPos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        this.fragmentShader = `
           
            uniform sampler2D uTexture;// 纹理数组
            varying vec2 vUv;
            varying vec4 vColor;
            varying float vBlend;

            void main() {
                vec4 texColor = texture2D(uTexture, vUv);
                
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
