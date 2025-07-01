/**
* @author Lee Stemkoski   http://www.adelphi.edu/~stemkoski/
*/

///////////////////////////////////////////////////////////////////////////////

/////////////
// SHADERS //
/////////////

// attribute: data that may be different for each particle (such as size and color);
//      can only be used in vertex shader
// varying: used to communicate data from vertex shader to fragment shader
// uniform: data that is the same for each particle (such as texture)

import * as THREE from '../../build/three.module.js';

let particleVertexShader =
    [
        "attribute vec3  customColor;",
        "attribute float customOpacity;",
        "attribute float customSize;",
        "attribute float customAngle;",
        "attribute float customVisible;",  // float used as boolean (0 = false, 1 = true)
        "varying vec4  vColor;",
        "varying float vAngle;",
        "void main()",
        "{",
        "if ( customVisible > 0.5 )",                 // true
        "vColor = vec4( customColor, customOpacity );", //     set color associated to vertex; use later in fragment shader.
        "else",                            // false
        "vColor = vec4(0.0, 0.0, 0.0, 0.0);",         //     make particle invisible.

        "vAngle = customAngle;",

        "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
        "gl_PointSize = customSize * ( 300.0 / length( mvPosition.xyz ) );",     // scale particles as objects in 3D space
        "gl_Position = projectionMatrix * mvPosition;",
        "}"
    ].join("\n");

let particleFragmentShader =
    [
        "uniform sampler2D texture;",
        "varying vec4 vColor;",
        "varying float vAngle;",
        "void main()",
        "{",
        "gl_FragColor = vColor;",

        "float c = cos(vAngle);",
        "float s = sin(vAngle);",
        "vec2 rotatedUV = vec2(c * (gl_PointCoord.x - 0.5) + s * (gl_PointCoord.y - 0.5) + 0.5,",
        "c * (gl_PointCoord.y - 0.5) - s * (gl_PointCoord.x - 0.5) + 0.5);",  // rotate UV coordinates to rotate texture
        "vec4 rotatedTexture = texture2D( texture,  rotatedUV );",
        "gl_FragColor = gl_FragColor * rotatedTexture;",    // sets an otherwise white particle texture to desired color
        "}"
    ].join("\n");

///////////////////////////////////////////////////////////////////////////////

/////////////////
// TWEEN CLASS //
/////////////////

function ParticleTween(timeArray, valueArray) {
    this.times = timeArray || [];
    this.values = valueArray || [];
}

ParticleTween.prototype.lerp = function (t) {
    var i = 0;
    var n = this.times.length;
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

///////////////////////////////////////////////////////////////////////////////

////////////////////
// PARTICLE CLASS //
////////////////////

function Particle() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3(); // units per second
    this.acceleration = new THREE.Vector3();

    this.angle = 0;
    this.angleVelocity = 0; // degrees per second
    this.angleAcceleration = 0; // degrees per second, per second

    this.size = 16.0;

    this.color = new THREE.Color();
    this.opacity = 1.0;

    this.age = 0;
    this.alive = 0; // use float instead of boolean for shader purposes    
}

Particle.prototype.update = function (dt) {
    this.position.add(this.velocity.clone().multiplyScalar(dt));
    this.velocity.add(this.acceleration.clone().multiplyScalar(dt));

    // convert from degrees to radians: 0.01745329251 = Math.PI/180
    this.angle += this.angleVelocity * 0.01745329251 * dt;
    this.angleVelocity += this.angleAcceleration * 0.01745329251 * dt;

    this.age += dt;

    // if the tween for a given attribute is nonempty,
    //  then use it to update the attribute's value

    if (this.sizeTween.times.length > 0)
        this.size = this.sizeTween.lerp(this.age);

    if (this.colorTween.times.length > 0) {
        var colorHSL = this.colorTween.lerp(this.age);
        this.color = new THREE.Color().setHSL(colorHSL.x, colorHSL.y, colorHSL.z);
    }

    if (this.opacityTween.times.length > 0)
        this.opacity = this.opacityTween.lerp(this.age);
}

///////////////////////////////////////////////////////////////////////////////

///////////////////////////
// PARTICLE ENGINE CLASS //
///////////////////////////

let Type = Object.freeze({ "CUBE": 1, "SPHERE": 2 });

let scene;

function ParticleEngine(scene_) {
    /////////////////////////
    // PARTICLE PROPERTIES //
    /////////////////////////

    scene = scene_;

    this.positionStyle = Type.CUBE;
    this.positionBase = new THREE.Vector3();
    // cube shape data
    this.positionSpread = new THREE.Vector3();// spread:传播；（使）蔓延，扩散，散开；展开；使分散；延伸；涂；张开；打开；使散开；摊开；伸开；分（若干次）进行
    // sphere shape data
    this.positionRadius = 0; // distance from base at which particles start

    this.velocityStyle = Type.CUBE;
    // cube movement data
    this.velocityBase = new THREE.Vector3();
    this.velocitySpread = new THREE.Vector3();
    // sphere movement data
    //   direction vector calculated using initial position
    this.speedBase = 0;
    this.speedSpread = 0;

    this.accelerationBase = new THREE.Vector3();
    this.accelerationSpread = new THREE.Vector3();

    this.angleBase = 0;
    this.angleSpread = 0;
    this.angleVelocityBase = 0;
    this.angleVelocitySpread = 0;
    this.angleAccelerationBase = 0;
    this.angleAccelerationSpread = 0;

    this.sizeBase = 0.0;
    this.sizeSpread = 0.0;
    this.sizeTween = new ParticleTween();

    // store colors in HSL format in a THREE.Vector3 object
    // http://en.wikipedia.org/wiki/HSL_and_HSV
    this.colorBase = new THREE.Vector3(0.0, 1.0, 0.5);
    this.colorSpread = new THREE.Vector3(0.0, 0.0, 0.0);
    this.colorTween = new ParticleTween();

    this.opacityBase = 1.0;
    this.opacitySpread = 0.0;
    this.opacityTween = new ParticleTween();

    this.blendStyle = THREE.NormalBlending; // false;

    this.particleArray = [];
    this.particlesPerSecond = 100;
    this.particleDeathAge = 1.0;

    ////////////////////////
    // EMITTER PROPERTIES //
    ////////////////////////

    this.emitterAge = 0.0;
    this.emitterAlive = true;
    this.emitterDeathAge = 60; // time (seconds) at which to stop creating particles.

    // How many particles could be active at any time?
    this.particleCount = this.particlesPerSecond * Math.min(this.particleDeathAge, this.emitterDeathAge);

    //////////////
    // THREE.JS //
    //////////////

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleTexture = null;
    this.particleMaterial = new THREE.ShaderMaterial(
        {
            uniforms:
            {
                texture: { type: "t", value: this.particleTexture },
            },
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            blending: THREE.NormalBlending,
            depthTest: false,
            side: THREE.DoubleSide,
            transparent: true,
            // alphaTest: 0.5,  // if having transparency issues, try including: alphaTest: 0.5, 
            opacity: 1.0
        });
    this.particleMesh = new THREE.Mesh();
}

ParticleEngine.prototype.setValues = function (parameters) {
    if (parameters === undefined) return;

    // clear any previous tweens that might exist
    this.sizeTween = new ParticleTween();
    this.colorTween = new ParticleTween();
    this.opacityTween = new ParticleTween();

    for (var key in parameters)
        this[key] = parameters[key];

    // attach tweens to particles
    Particle.prototype.sizeTween = this.sizeTween;
    Particle.prototype.colorTween = this.colorTween;
    Particle.prototype.opacityTween = this.opacityTween;

    // calculate/set derived particle engine values
    this.particleArray = [];
    this.emitterAge = 0.0;
    this.emitterAlive = true;
    this.particleCount = this.particlesPerSecond * Math.min(this.particleDeathAge, this.emitterDeathAge);

    this.particleGeometry = new THREE.Geometry();
    this.particleMaterial = new THREE.ShaderMaterial(
        {
            uniforms:
            {
                texture: { type: "t", value: this.particleTexture },
            },
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            blending: THREE.NormalBlending,
            depthTest: false,
            side: THREE.DoubleSide,
            transparent: true,
            // alphaTest: 0.5, // if having transparency issues, try including: alphaTest: 0.5, 
            opacity: 1.0
        });
    this.particleMesh = new THREE.Points();
}

// helper functions for randomization
ParticleEngine.prototype.randomValue = function (base, spread) {
    return base + spread * (Math.random() - 0.5);
}

ParticleEngine.prototype.randomVector3 = function (base, spread) {
    var rand3 = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    return new THREE.Vector3().addVectors(base, new THREE.Vector3().multiplyVectors(spread, rand3));
}

ParticleEngine.prototype.createParticle = function () {
    var particle = new Particle();

    if (this.positionStyle == Type.CUBE)
        particle.position = this.randomVector3(this.positionBase, this.positionSpread);
    if (this.positionStyle == Type.SPHERE) {
        var z = 2 * Math.random() - 1;
        var t = 6.2832 * Math.random();
        var r = Math.sqrt(1 - z * z);
        var vec3 = new THREE.Vector3(r * Math.cos(t), r * Math.sin(t), z);
        particle.position = new THREE.Vector3().addVectors(this.positionBase, vec3.multiplyScalar(this.positionRadius));
    }

    if (this.velocityStyle == Type.CUBE) {
        particle.velocity = this.randomVector3(this.velocityBase, this.velocitySpread);
    }
    if (this.velocityStyle == Type.SPHERE) {
        var direction = new THREE.Vector3().subVectors(particle.position, this.positionBase);
        var speed = this.randomValue(this.speedBase, this.speedSpread);
        particle.velocity = direction.normalize().multiplyScalar(speed);
    }

    particle.acceleration = this.randomVector3(this.accelerationBase, this.accelerationSpread);

    particle.angle = this.randomValue(this.angleBase, this.angleSpread);
    particle.angleVelocity = this.randomValue(this.angleVelocityBase, this.angleVelocitySpread);
    particle.angleAcceleration = this.randomValue(this.angleAccelerationBase, this.angleAccelerationSpread);

    particle.size = this.randomValue(this.sizeBase, this.sizeSpread);

    var color = this.randomVector3(this.colorBase, this.colorSpread);
    particle.color = new THREE.Color().setHSL(color.x, color.y, color.z);

    particle.opacity = this.randomValue(this.opacityBase, this.opacitySpread);

    particle.age = 0;
    particle.alive = 0; // particles initialize as inactive

    return particle;
}

ParticleEngine.prototype.initialize = function () {

    let customVisible = [];
    let customColor = [];
    let customOpacity = [];
    let customSize = [];
    let customAngle = [];

    // link particle data with geometry/material data
    for (var i = 0; i < this.particleCount; i++) {
        // remove duplicate code somehow, here and in update function below.
        this.particleArray[i] = this.createParticle();
        this.particleGeometry.vertices[i] = this.particleArray[i].position;

        customVisible.push(this.particleArray[i].alive);
        customColor.push(this.particleArray[i].color);
        customOpacity.push(this.particleArray[i].opacity);
        customSize.push(this.particleArray[i].size);
        customAngle.push(this.particleArray[i].angle);
    }

    // 原ParticleEngine.js依赖的是旧版本的three.js，新版本的three.js的ShaderMaterial不支持attributes
    // 此处使用BufferGeometry作了修改
    for (var i = 0; i < this.particleCount - 2; i += 3) {
        let face = new THREE.Face3(i, i + 1, i + 2);
        this.particleGeometry.faces.push(face);
    }

    this.bufferGeometry = new THREE.BufferGeometry();
    this.bufferGeometry.fromGeometry(this.particleGeometry);

    this.bufferGeometry.setAttribute('customVisible', new THREE.BufferAttribute(new Float32Array(customVisible), 1));
    this.bufferGeometry.setAttribute('customColor', new THREE.BufferAttribute(new Float32Array(customColor.length * 3), 3).copyColorsArray(customColor));
    this.bufferGeometry.setAttribute('customOpacity', new THREE.BufferAttribute(new Float32Array(customOpacity), 1));
    this.bufferGeometry.setAttribute('customSize', new THREE.BufferAttribute(new Float32Array(customSize), 1));
    this.bufferGeometry.setAttribute('customAngle', new THREE.BufferAttribute(new Float32Array(customAngle), 1));

    this.particleMaterial.blending = this.blendStyle;
    if (this.blendStyle != THREE.NormalBlending)
        this.particleMaterial.depthTest = false;

    this.particleMesh = new THREE.Points(this.bufferGeometry, this.particleMaterial);
    this.particleMesh.dynamic = true;
    this.particleMesh.sortParticles = true;
    scene.add(this.particleMesh);
    this.isShow = true;
}

ParticleEngine.prototype.update = function (dt) {
    var recycleIndices = [];

    let customVisible = [];
    let customColor = [];
    let customOpacity = [];
    let customSize = [];
    let customAngle = [];
    // update particle data
    for (var i = 0; i < this.particleCount; i++) {
        if (this.particleArray[i].alive) {
            this.particleArray[i].update(dt);
            this.particleGeometry.vertices[i] = this.particleArray[i].position;

            // check if particle should expire
            // could also use: death by size<0 or alpha<0.
            if (this.particleArray[i].age > this.particleDeathAge) {
                this.particleArray[i].alive = 0.0;
                recycleIndices.push(i);
            }

            // update particle properties in shader
            customVisible.push(this.particleArray[i].alive);
            customColor.push(this.particleArray[i].color);
            customOpacity.push(this.particleArray[i].opacity);
            customSize.push(this.particleArray[i].size);
            customAngle.push(this.particleArray[i].angle);
        }
    }

    // bufferGeometry需要更新
    this.bufferGeometry.fromGeometry(this.particleGeometry);

    this.bufferGeometry.getAttribute('customVisible').copyArray(customVisible);
    this.bufferGeometry.getAttribute('customColor').copyColorsArray(customColor);
    this.bufferGeometry.getAttribute('customOpacity').copyArray(customOpacity);
    this.bufferGeometry.getAttribute('customSize').copyArray(customSize);
    this.bufferGeometry.getAttribute('customAngle').copyArray(customAngle);

    this.bufferGeometry.getAttribute('customVisible').needsUpdate = true;
    this.bufferGeometry.getAttribute('customColor').needsUpdate = true;
    this.bufferGeometry.getAttribute('customOpacity').needsUpdate = true;
    this.bufferGeometry.getAttribute('customSize').needsUpdate = true;
    this.bufferGeometry.getAttribute('customAngle').needsUpdate = true;

    // check if particle emitter is still running
    if (!this.emitterAlive) return;

    // if no particles have died yet, then there are still particles to activate
    if (this.emitterAge < this.particleDeathAge) {
        // determine indices of particles to activate
        var startIndex = Math.round(this.particlesPerSecond * (this.emitterAge + 0));
        var endIndex = Math.round(this.particlesPerSecond * (this.emitterAge + dt));
        if (endIndex > this.particleCount)
            endIndex = this.particleCount;

        for (var i = startIndex; i < endIndex; i++)
            this.particleArray[i].alive = 1.0;
    }

    // if any particles have died while the emitter is still running, we imediately recycle them
    for (var j = 0; j < recycleIndices.length; j++) {
        var i = recycleIndices[j];
        this.particleArray[i] = this.createParticle();
        this.particleArray[i].alive = 1.0; // activate right away
        this.particleGeometry.vertices[i] = this.particleArray[i].position;
    }

    // stop emitter?
    this.emitterAge += dt;
    if (this.emitterAge > this.emitterDeathAge) this.emitterAlive = false;
}

ParticleEngine.prototype.destroy = function () {
    scene.remove(this.particleMesh);
    this.isShow = false;
}

ParticleEngine.prototype.show = function () {
    scene.add(this.particleMesh);
    this.isShow = true;
}

ParticleEngine.prototype.hide = function () {
    scene.remove(this.particleMesh);
    this.isShow = false;
}
///////////////////////////////////////////////////////////////////////////////

export { ParticleEngine, Type, ParticleTween }

/**
 * 使用方式
 //消防烟雾效果

import * as THREE from '../build/three.module.js';
import { ParticleEngine, Type as ParticleType, ParticleTween } from '../js/particle-engine/ParticleEngine.js'

let particleEngine;
let clockForParticleEngine = new THREE.Clock();
let scene;
let position;

//创建烟雾 
function createSmoke(scene_, position_) {
    scene = scene_;
    position = position_;

    if (particleEngine) {
        particleEngine.destroy();
    }

    particleEngine = new ParticleEngine(scene);
    particleEngine.setValues({
        positionStyle: ParticleType.CUBE,
        positionBase: new THREE.Vector3(position.x, position.y + 0, position.z),
        positionSpread: new THREE.Vector3(10, 0, 10),

        velocityStyle: ParticleType.CUBE,
        velocityBase: new THREE.Vector3(0, 200, 0),
        velocitySpread: new THREE.Vector3(200, 150, 200),
        accelerationBase: new THREE.Vector3(0, -100, 0),

        particleTexture: new THREE.TextureLoader().load('images/particle-engine/smokeparticle.png'),

        angleBase: 0,
        angleSpread: 720,
        angleVelocityBase: 0,
        angleVelocitySpread: 720,

        sizeTween: new ParticleTween([0, 1], [64, 256]),
        opacityTween: new ParticleTween([0.8, 2], [0.5, 0]),
        colorTween: new ParticleTween([0.4, 1], [new THREE.Vector3(0, 0, 0.2), new THREE.Vector3(0, 0, 0.5)]),

        particlesPerSecond: 200,
        particleDeathAge: 2.0,
        emitterDeathAge: 60
    });
    particleEngine.initialize();
}

/** 更新烟雾 
function updateParticle() {
    let delta = clockForParticleEngine.getDelta();
    if (delta < 0.2) { // 1秒 / 5帧 = 0.2 秒/帧
        particleEngine && particleEngine.update(delta * 0.5);
    } else {
        if (scene && position) {
            let isShow = false;
            if (particleEngine && particleEngine.isShow) {
                isShow = true;
            }
            createSmoke(scene, position);
            if (!isShow) {
                particleEngine && particleEngine.hide();
            }
        }
    }
}

export { createSmoke, updateParticle, particleEngine }
 */