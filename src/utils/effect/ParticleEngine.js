import * as THREE from 'three';

export const ParticleType = Object.freeze({ "CUBE": 1, "SPHERE": 2 ,"CONE":3});

const particleVertexShader =
    [
        "attribute vec3  customColor;",
        "attribute float customOpacity;",
        "attribute float customSize;",
        "attribute float customAngle;",
        "attribute float customBlend;",
        "attribute float customVisible;",  // float used as boolean (0 = false, 1 = true)
        "varying vec4  vColor;",
        "varying float vAngle;",
        "varying float vOpacity;",
        "varying float vBlend;",
        "void main()",
        "{",
        "if ( customVisible > 0.0 )",                 // true 表示还在生命周期中,
        "vColor = vec4( customColor, customOpacity );", //     set color associated to vertex; use later in fragment shader.
        "else",                            // false
        "vColor = vec4(0.0, 0.0, 0.0, 0.0);",         //     make particle invisible.
        "vBlend = customBlend;",
        "vAngle = customAngle;",

        "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
        "gl_PointSize = customSize * ( 300.0 / length( mvPosition.xyz ) );",     // scale particles as objects in 3D space
        "gl_Position = projectionMatrix * mvPosition;",
        "}"
    ].join("\n");

const particleFragmentShader =
    [
        "uniform sampler2D uTexture;",
        "varying vec4 vColor;",
        "varying float vAngle;",
        "varying float vOpacity;",
        "varying float vBlend;",
        "void main()",
        "{",


        "float c = cos(vAngle);",
        "float s = sin(vAngle);",
        "vec2 rotatedUV = vec2(c * (gl_PointCoord.x - 0.5) + s * (gl_PointCoord.y - 0.5) + 0.5,",
        "c * (gl_PointCoord.y - 0.5) - s * (gl_PointCoord.x - 0.5) + 0.5);",  // rotate UV coordinates to rotate texture
        "vec4 rotatedTexture = texture2D( uTexture,  rotatedUV );",
        "rotatedTexture.rgb *= rotatedTexture.a;",
        "rotatedTexture.a *= vBlend;",

        "gl_FragColor = vColor * rotatedTexture;",    // sets an otherwise white particle texture to desired color
        "}"
    ].join("\n");
/**
 * 进行插值
 */
class ParticleTween {
    constructor(timeArray, valueArray) {

        this.times = timeArray || [];
        this.values = valueArray || [];
    }

    lerp(t) {
        let i = 0;
        let n = this.times.length;// 得到时间个数
        while (i < n && t > this.times[i])
            i++;
        if (i == 0) return this.values[0];
        if (i == n) return this.values[n - 1];
        var p = (t - this.times[i - 1]) / (this.times[i] - this.times[i - 1]);
        if (this.values[0] instanceof THREE.Vector3)
            return this.values[i - 1].clone().lerp(this.values[i], p);
        else // its a float
            return this.values[i - 1] + p * (this.values[i] - this.values[i - 1]);
    }
}

class Particle {
    constructor() {

        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3(); // units per second
        this.acceleration = new THREE.Vector3();

        this.sizeTween = new ParticleTween();
        this.colorTween = new ParticleTween();
        this.opacityTween = new ParticleTween();

        // 角度
        this.angle = 0;
        this.angleVelocity = 0; // degrees per second
        this.angleAcceleration = 0; // degrees per second, per second

        this.size = 16.0;

        this.color = new THREE.Color();
        this.opacity = 0.6;

        this.age = 0;
        this.alive = 0; // use float instead of boolean for shader purposes    
    }

    update(dt) {
        this.position.add(this.velocity.clone().multiplyScalar(dt));// 位置 = 速度 * 时间
        this.velocity.add(this.acceleration.clone().multiplyScalar(dt)); // 速度 = 加速度* 时间

        // convert from degrees to radians: 0.01745329251 = Math.PI/180
        this.angle += this.angleVelocity * 0.01745329251 * dt;
        this.angleVelocity += this.angleAcceleration * 0.01745329251 * dt;// 角速度=角加速度 * 时间

        this.age += dt;// 存活了多长时间


        // if the tween for a given attribute is nonempty,
        //  then use it to update the attribute's value

        if (this.sizeTween.times.length > 0)
            this.size = this.sizeTween.lerp(this.age);

        if (this.colorTween.times.length > 0) {
            var colorHSL = this.colorTween.lerp(this.age);
            
            //this.color.setHSL(colorHSL.x, colorHSL.y, colorHSL.z);
            this.color.set(colorHSL.x, colorHSL.y, colorHSL.z)
        }
        
        if (this.opacityTween.times.length > 0)
            this.opacity = this.opacityTween.lerp(this.age);
    }
}

export class ParticleEngine {
    constructor(parameters = {}) {

        this.positionStyle = parameters?.positionStyle === undefined ? ParticleType.CUBE : parameters.positionStyle; // 盒子 模型
        this.positionBase = parameters?.positionBase === undefined ? new THREE.Vector3() : parameters.positionBase;// 基础位置
        // cube shape data
        this.positionSpread = parameters?.positionSpread === undefined ? new THREE.Vector3(0.5, 0, 0.4) : parameters.positionSpread;// spread:传播；（使）蔓延，扩散，散开；展开；使分散；延伸；涂；张开；打开；使散开；摊开；伸开；分（若干次）进行
        // sphere shape data 球形模型需要的参数
        this.positionRadius = parameters?.positionRadius === undefined ? 1 : parameters.positionRadius; // distance from base at which particles start

        this.velocityStyle = parameters?.velocityStyle === undefined ? ParticleType.CUBE : parameters.velocityStyle;// 速度模式
        // cube movement data 立方体速度
        this.velocityBase = parameters?.velocityBase === undefined ? new THREE.Vector3(0, 0, 0) : parameters.velocityBase;
        this.velocitySpread = parameters?.velocitySpread === undefined ? new THREE.Vector3(4, 16, 4) : parameters.velocitySpread;

        // sphere movement data 球体速度
        //   direction vector calculated using initial position
        this.speedBase = 0;
        this.speedSpread = 0;
        // 圆锥体的参数
        this.radius_b = 0.4;
        this.radius_t = 1.2;
        this.radius_height = 2.4;
        // 加速度
        this.accelerationBase = parameters?.accelerationBase === undefined ? new THREE.Vector3(0, 9.8, 0) : parameters.accelerationBase;
        this.accelerationSpread = parameters?.accelerationSpread === undefined ? new THREE.Vector3() : parameters.accelerationSpread;

        this.angleBase = parameters?.angleBase === undefined ? 0 : parameters.angleBase;// 角度
        this.angleSpread = parameters?.angleSpread === undefined ? 720 : parameters.angleSpread;// 角度扩展速度
        this.angleVelocityBase = parameters?.angleVelocityBase === undefined ? 0 : parameters.angleVelocityBase;// 角速度
        this.angleVelocitySpread = parameters?.angleVelocitySpread === undefined ? 720 : parameters.angleVelocitySpread;
        this.angleAccelerationBase = parameters?.angleAccelerationBase === undefined ? 0.1 : parameters.angleAccelerationBase;// 角加速度
        this.angleAccelerationSpread = parameters?.angleAccelerationSpread === undefined ? 0.01 : parameters.angleAccelerationSpread;

        this.sizeTween = parameters?.sizeTween === undefined ? new ParticleTween(
            [0.0, 0.6, 1.0],
            [2,3.5, 6.5] // 越来越大（膨胀扩散）
        ) : parameters.sizeTween;

        // store colors in HSL format in a THREE.Vector3 object
        //插值算法使用的Vector3，而不是Color
        this.colorTween = parameters?.colorTween === undefined ? new ParticleTween(
            [0.0, 0.3, 0.7, 1.0],
            [
                new THREE.Vector3(1.0, 0.5, 0.1), // 初始橙色（HSL）→ 红橙
                new THREE.Vector3(1.0, 0.2, 0.3), // 偏黄红
                new THREE.Vector3(0.05, 0.9, 0.1), // 偏红灰（灰烬感）
                new THREE.Vector3(0.1, 0.6, 0.3)        // 黑色
            ]
        ) : parameters.colorTween;

        this.opacityTween = parameters?.opacityTween === undefined ? new ParticleTween(
            [0.0, 0.6, 1.0],
            [1., 0.5, 0.] // 快速消散
        ) : parameters?.opacityTween;

        this.blendStyle = parameters?.blendStyle === undefined ? THREE.NormalBlending : parameters?.blendStyle; // false;

        this.particleArray = [];// 粒子数组
        this.particlesPerSecond = parameters?.particlesPerSecond === undefined ? 200 : parameters.particlesPerSecond;// 每秒粒子数量
        this.particleDeathAge = parameters?.particleDeathAge === undefined ? 2.0 : parameters.particleDeathAge;// 粒子生命周期时间1s

        //////////////////////////////////
        // EMITTER PROPERTIES-发射器特性 //
        ////////////////////////////////

        this.emitterAge = 0.0;
        this.emitterAlive = true;
        this.emitterDeathAge = parameters?.emitterDeathAge === undefined ? Infinity : parameters.emitterDeathAge; // time (seconds) at which to stop creating particles.

        // How many particles could be active at any time?
        this.particleCount = this.particlesPerSecond * Math.min(this.particleDeathAge, this.emitterDeathAge);

        //////////////
        // THREE.JS //
        //////////////

        this.particleTexture = parameters?.texture === undefined ? null : parameters.texture;

        this.particleMaterial = new THREE.ShaderMaterial({
            uniforms:
            {
                uTexture: { type: "t", value: this.particleTexture },
            },
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,

            transparent: true,
            depthTest: true,
            depthWrite: false,
            
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            // blendEquation: THREE.AddEquation,
            // blendSrc: THREE.OneFactor,
            // blendDst: THREE.OneMinusSrcAlphaFactor,
        });
        this.bufferGeometry = new THREE.BufferGeometry();

        this._mesh = new THREE.Points(this.bufferGeometry, this.particleMaterial);
        this._mesh.dynamic = true;

        this.initialize();
    }

    // helper functions for randomization 一维的随机值
    randomValue(base, spread) {
        return base + spread * (Math.random() - 0.5);
    }
    // 三维随机值
    randomVector3(base, spread) {
        var rand3 = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        return new THREE.Vector3().addVectors(base, new THREE.Vector3().multiplyVectors(spread, rand3));
    }

    /**
     * 初始化
     */
    initialize() {
        let positionArray = [];
        let customVisible = [];
        let customColor = [];
        let customOpacity = [];
        let customSize = [];
        let customAngle = [];
        let customBlend = [];

        // link particle data with geometry/material data
        for (var i = 0; i < this.particleCount; i++) {
            // remove duplicate code somehow, here and in update function below.
            this.particleArray[i] = this.createParticle(); // 创建一个Particle 粒子对象

            positionArray.push(this.particleArray[i].position);

            customVisible.push(this.particleArray[i].alive);
            customColor.push(this.particleArray[i].color.r, this.particleArray[i].color.g, this.particleArray[i].color.b);
            customOpacity.push(this.particleArray[i].opacity);
            customSize.push(this.particleArray[i].size);
            customAngle.push(this.particleArray[i].angle);
            customBlend.push(this.particleArray[i].blend);
        }

        this.bufferGeometry.setFromPoints(positionArray);
        //console.log('co:',customColor)
        // 自定义属性
        this.bufferGeometry.setAttribute('customVisible', new THREE.BufferAttribute(new Float32Array(customVisible), 1));
        this.bufferGeometry.setAttribute('customColor', new THREE.BufferAttribute(new Float32Array(customColor), 3));
        this.bufferGeometry.setAttribute('customOpacity', new THREE.BufferAttribute(new Float32Array(customOpacity), 1));
        this.bufferGeometry.setAttribute('customSize', new THREE.BufferAttribute(new Float32Array(customSize), 1));
        this.bufferGeometry.setAttribute('customAngle', new THREE.BufferAttribute(new Float32Array(customAngle), 1));
        this.bufferGeometry.setAttribute('customBlend', new THREE.BufferAttribute(new Float32Array(customBlend), 1));

        this.particleMaterial.blending = this.blendStyle;
        if (this.blendStyle != THREE.NormalBlending)
            this.particleMaterial.depthTest = false;// 关闭深度测试
        //console.log(11,this.bufferGeometry)

        this.isShow = true;
    }
    //创建粒子
    createParticle() {
        let particle = new Particle();
        // 赋值 sizeTween、colorTween、opacityTween
        if (this.sizeTween !== undefined) particle.sizeTween = this.sizeTween;
        if (this.colorTween !== undefined) particle.colorTween = this.colorTween;
        if (this.opacityTween !== undefined) particle.opacityTween = this.opacityTween;

        // 如果是Cube 模式
        if (this.positionStyle == ParticleType.CUBE)
            particle.position = this.randomVector3(this.positionBase, this.positionSpread);
        // Sphere 模式，在一个球体表面生成随机点（因为半径被归一化为1）
        /**
        球体表面的点可以用球坐标表示，参数为：
            - 半径（固定为1，因为后面会乘以`this.positionRadius`）
            - 极角（θ，这里用`t`表示，范围[0, 2π],水平XY平面）
            - 方位角（φ，这里用`z`来间接表示）

                Z 轴
                ↑
                • (z=1) 北极
            •   |   • 
        •       |      • → 赤道平面 (z=0)
            •   |   •
                • (z=-1) 南极
         */
        if (this.positionStyle == ParticleType.SPHERE) {
            let z = 2 * Math.random() - 1;// -1 到 1 之间
            let t = 6.2832 * Math.random();// 可以用Math.PI * 2 代替
            let r = Math.sqrt(1 - z * z);// 设置半径为1
            let vec3 = new THREE.Vector3(r * Math.cos(t), r * Math.sin(t), z);
            particle.position = new THREE.Vector3().addVectors(this.positionBase, vec3.multiplyScalar(this.positionRadius));
        }

        // Cone 圆柱体
        if(this.positionStyle == ParticleType.CONE){
            const r = this.radius_b * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            let vec3 = new THREE.Vector3(r * Math.cos(theta), this.positionBase.y, r * Math.sin(theta));
            particle.position = new THREE.Vector3().addVectors(this.positionBase, vec3);
        }
        // Cube 的速度计算
        if (this.velocityStyle == ParticleType.CUBE) {
            particle.velocity = this.randomVector3(this.velocityBase, this.velocitySpread);
        }
        // Sphere 球体速度
        if (this.velocityStyle == ParticleType.SPHERE) {
            //球体表面上点的方向 = 球体表面位置数据 - 球体中心点位置数据 
            let direction = new THREE.Vector3().subVectors(particle.position, this.positionBase);
            let speed = this.randomValue(this.speedBase, this.speedSpread);
            particle.velocity = direction.normalize().multiplyScalar(speed);
        }
        // Cone 圆柱体的速度
        if(this.velocityStyle == ParticleType.CONE){
            const r = this.radius_b * Math.sqrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const x1 = this.positionBase.x + r * Math.cos(theta);
            const z1 = this.positionBase.z + r * Math.sin(theta);

            const r2 = this.radius_t * Math.sqrt(Math.random());
            const theta2 = Math.random() * 2 * Math.PI;
            const x2 = x1 + r2 * Math.cos(theta2);
            const z2 = z1 + r2 * Math.sin(theta2);

            let dx = x2 - x1;
            let dy = this.radius_height;
            let dz = z2 - z1;

            let direction = new THREE.Vector3(dx,dy,dz);
            let speed = this.randomValue(this.speedBase, this.speedSpread);
            particle.velocity = direction.normalize().multiplyScalar(speed);
        }
        // 加速度
        particle.acceleration = this.randomVector3(this.accelerationBase, this.accelerationSpread);
        // 角度
        particle.angle = this.randomValue(this.angleBase, this.angleSpread);
        particle.angleVelocity = this.randomValue(this.angleVelocityBase, this.angleVelocitySpread);
        particle.angleAcceleration = this.randomValue(this.angleAccelerationBase, this.angleAccelerationSpread);
        
        if (!(this.sizeTween !== undefined))
        particle.size = this.randomValue(this.sizeBase, this.sizeSpread);
        //console.log('color:',color)
        // 先取第一个颜色为主色
        particle.color = new THREE.Color(1, 1, 1);// (Math.abs(color.x), Math.abs(color.y),Math.abs(color.z) );
        //console.log('color:',particle.color)
        particle.opacity = 0.8;

        particle.age = 0;
        particle.alive = 0; // particles initialize as inactive
        particle.blend = 0.8;// 混合设置

        return particle;
    }
    // 更新
    update(dt) {
        let recycleIndices = [];
        let positionArray = [];
        let customVisible = [];
        let customColor = [];
        let customOpacity = [];
        let customSize = [];
        let customAngle = [];
        let customBlend = [];
        // update particle data
        for (var i = 0; i < this.particleCount; i++) {
            // 粒子还在生命周期之中
            if (this.particleArray[i].alive) {
                // 
                this.particleArray[i].update(dt);

                // check if particle should expire
                // could also use: death by size<0 or alpha<0.
                if (this.particleArray[i].age > this.particleDeathAge) {
                    this.particleArray[i].alive = 0.0;
                    recycleIndices.push(i); // 回收粒子的索引
                    // 直接生成避免统一生成，效果不加
                    this.particleArray[i] = this.createParticle();
                    this.particleArray[i].alive = 1.0; // activate right away

                }
                positionArray.push(this.particleArray[i].position.x, this.particleArray[i].position.y, this.particleArray[i].position.z);

                // update particle properties in shader
                customVisible.push(this.particleArray[i].alive);
                customColor.push(this.particleArray[i].color.r, this.particleArray[i].color.g, this.particleArray[i].color.b);

                customOpacity.push(this.particleArray[i].opacity);
                customSize.push(this.particleArray[i].size);
                customAngle.push(this.particleArray[i].angle);
                customBlend.push(this.particleArray[i].blend);
            }
        }

        // bufferGeometry需要更新
        this.bufferGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positionArray), 3));
        // 自定义属性
        this.bufferGeometry.setAttribute('customVisible', new THREE.BufferAttribute(new Float32Array(customVisible), 1));
        this.bufferGeometry.setAttribute('customColor', new THREE.BufferAttribute(new Float32Array(customColor), 3));
        this.bufferGeometry.setAttribute('customOpacity', new THREE.BufferAttribute(new Float32Array(customOpacity), 1));
        this.bufferGeometry.setAttribute('customSize', new THREE.BufferAttribute(new Float32Array(customSize), 1));
        this.bufferGeometry.setAttribute('customAngle', new THREE.BufferAttribute(new Float32Array(customAngle), 1));
        this.bufferGeometry.setAttribute('customBlend', new THREE.BufferAttribute(new Float32Array(customBlend), 1));

        
        // check if particle emitter is still running
        if (!this.emitterAlive) return;

        // if no particles have died yet, then there are still particles to activate
        if (this.emitterAge < this.particleDeathAge) {
            // determine indices of particles to activate
            let startIndex = Math.round(this.particlesPerSecond * (this.emitterAge + 0));
            let endIndex = Math.round(this.particlesPerSecond * (this.emitterAge + dt));
            if (endIndex > this.particleCount)
                endIndex = this.particleCount;

            for (let i = startIndex; i < endIndex; i++)
                this.particleArray[i].alive = 1.0;
        }
        //console.log(this.bufferGeometry)
        // if any particles have died while the emitter is still running, we imediately recycle them
        // 这里统一回收显示
        // for (let j = 0; j < recycleIndices.length; j++) {
        //     let i = recycleIndices[j];
        //     this.particleArray[i] = this.createParticle();
        //     this.particleArray[i].alive = 1.0; // activate right away
        //     // 更新数据
        //     this.bufferGeometry.attributes.position.setXYZ(i,this.particleArray[i].position.x,this.particleArray[i].position.y,this.particleArray[i].position.z);
        // }

        // stop emitter?
        this.emitterAge += dt;
        if (this.emitterAge > this.emitterDeathAge) this.emitterAlive = false;
    }
    // 销毁
    destroy() {
        this._mesh.geometry.dispose();
        this._mesh.material.dispose();

        //scene.remove(this._mesh);
        this.isShow = false;
    }
    // 显示
    show() {
        this._mesh.visible = true;
        this.isShow = true;
    }

    // 隐藏并不是销毁
    hide() {
        this._mesh.visible = false;
        this.isShow = false;
    }

}






