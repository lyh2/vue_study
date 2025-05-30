import * as THREE from "three";

import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import TWEEN from "three/examples/jsm/libs/tween.module";

import vertexShader from "../Shader/FlyLine/vertex.glsl";
import fragmentShader from "../Shader/FlyLine/fragment.glsl";

import { Water } from "three/examples/jsm/objects/Water2.js";
import Fireworks from "../Example_4_Shader/Fireworks";
import Heart from "../Example_4_Shader/heart";

import fireVertexShader from "../Shader/FireEffect/vertex.glsl";
import fireFragmentShader from "../Shader/FireEffect/fragment.glsl";

import vertexShaderEyes from "../Shader/eyes/vertex.glsl";
import fragmentShaderEyes from "../Shader/eyes/fragment.glsl";
import SimplexNoise from "../../../SimplexNoise";
import gsap from "gsap";
import City from "../City/city";


let fireworks = [];

export function initUseScene(params = {}) {
    const rgbeLoader = new RGBELoader();
    rgbeLoader.loadAsync("./2k.hdr").then(texture => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        params.scene.background = texture;
        params.scene.environment = texture;
    });

    // 创建着色器材质
    const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {

        },
        side: THREE.DoubleSide,
        transparent: true,
    });

    // 加载模型
    const gltfLoader = new GLTFLoader();
    let LightBox = null;
    gltfLoader.load("./model/flyLight.glb", gltf => {
        console.log(gltf)
        LightBox = gltf.scene.children[0];
        LightBox.material = shaderMaterial;

        for (let i = 0; i < 150; i++) {
            let flyLight = gltf.scene.clone(true);
            let x = (Math.random() - 0.5) * 300;
            let y = (Math.random() * 60 + 5);
            let z = (Math.random() - 0.5) * 300;

            flyLight.position.set(x, y, z);

            new TWEEN.Tween(flyLight.rotation).to({ y: 2 * Math.PI }, 1000 + Math.random() * 10000).repeat(Infinity).start();
            new TWEEN.Tween(flyLight.position).to({ x: x + (Math.random()) * 100, y: y + (Math.random() * 100) }, 5000 + Math.random() * 10000).repeat(Infinity).start();

            params.scene.add(flyLight);
        }
    });

    // 加载newYear 模型
    gltfLoader.load("./model/newyears_min.glb", gltf => {
        params.scene.add(gltf.scene);
        // 创建水面
        const waterGeometry = new THREE.PlaneGeometry(100, 100);
        let water = new Water(waterGeometry, {
            scale: 4,
            textureWidth: 1024,
            textureHeight: 1024,
        });
        water.position.y = 1;
        water.rotation.x = - Math.PI / 2;

        params.scene.add(water);

    });

    //console.log(params.scene);

    //  添加点击事件
    params.renderer.domElement.addEventListener('click', createFireworks);


    function createFireworks() {
        let color = `hsl(${Math.floor(Math.random() * 360)},100%,80%)`;
        let position = { // 结束位置
            x: (Math.random() - 0.5) * 40,
            z: - (Math.random() - 0.5) * 40,
            y: 10 + Math.random() * 15
        };
        // 随机生成颜色和烟花放的位置
        //let firework = new Fireworks(color, position);
        //firework.addScene(params.scene, params.perspectiveCamera);
        //fireworks.push(firework);

        let to = {
            x: (Math.random() - 0.5) * 5,
            y: 5 + Math.random() * 10,
            z: 0
        };
        let heart = new Heart(color, to);
        heart.addScene(params.scene);
        fireworks.push(heart);
    }

    return fireworks;
}
/**
 * 实现火焰效果
 * @param {*} params 
 */
export function initUseShaderSpriteFireyAuraeffect(params = {}) {
    // 创建材质
    const loader = new THREE.TextureLoader();
    const map = loader.load("./textures/matcaps/1.png");
    const fireMap = loader.load("./texture/fire.jpeg");
    fireMap.wrapS = THREE.RepeatWrapping;
    fireMap.wrapT = THREE.RepeatWrapping;

    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            repeatX: { value: 2., type: "f" },
            map: { value: map },
            fireMap: { value: fireMap },
            uColor: { value: new THREE.Vector4(0., 1., 1., 1.) }
        },
        vertexShader: fireVertexShader,
        fragmentShader: fireFragmentShader,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
    });
    // 创建几何体
    const _sprite = new THREE.Sprite(shaderMaterial);

    params.scene.add(_sprite);

    return _sprite;
}
/**
 * 
 * @param {shader 实现多个眼睛的效果} params 
 */
export function initUseEyes(params = {}) {
    const planeGeometry = new THREE.PlaneGeometry(10, 10, 1, 1);
    const planeMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uScale: { value: 0.2 },
            uRatio: { value: window.devicePixelRatio },
            uSaturation: { value: 0.7 },// 饱和度
            uSpeed: { value: 0.2 },
            uBlueRatio: { value: 0.5 },
            uRedness: { value: 0.25 },
            uPointer: { value: new THREE.Vector2(0, 0) },
        },
        vertexShader: vertexShaderEyes,
        fragmentShader: fragmentShaderEyes,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,

    });

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    params.scene.add(plane);

    let mouse = new THREE.Vector2();

    params.dom.addEventListener('mousemove', (e) => {
        //console.log(e)
        const ratio = window.devicePixelRatio;
        mouse.x += (e.pageX - mouse.x) * ratio;
        mouse.y += (e.pageY - mouse.y) * ratio;

        mouse.x = mouse.x / window.innerWidth;
        mouse.y = 1. - mouse.y / window.innerHeight;
        planeMaterial.uniforms.uPointer.value = mouse;
    });

    return plane;
}

/**
 * 给立方体添加标记点div 锚点
 * @param {*} params 
 */
export function initUseAnnotation(params = {}) {
    const ctx = params.canvas.getContext("2d");
    //console.log(ctx);
    const x = 32;
    const y = 32;
    const radius = 30;
    const startAngle = 0;
    const endAngle = Math.PI * 2;
    ctx.fillStyle = "#ff5722";
    ctx.beginPath();
    ctx.arc(x, y, radius, startAngle, endAngle);
    ctx.fill();

    ctx.strokeStyle = "$ff0000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, startAngle, endAngle);
    ctx.stroke();
    ctx.fillStyle = "#00ee00";
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText('2', x, y);

    // 创建一个立方体
    const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);
    const cube = new THREE.Mesh(cubeGeometry, new THREE.MeshBasicMaterial({
        color: "#2196f3",

        side: THREE.DoubleSide,

    }));

    const line = new THREE.LineSegments(new THREE.WireframeGeometry(cubeGeometry), new THREE.LineBasicMaterial({
        color: 0xffffde,
        linewidth: 2,
        opacity: 0.35,
        transparent: true,
    }));

    params.scene.add(cube);
    params.scene.add(line);

    const numberTexture = new THREE.CanvasTexture(params.canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
        map: numberTexture,
        alphaTest: 0.5,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(5, 5, 5);
    sprite.scale.set(2, 2, 1);

    params.scene.add(sprite);
    console.log(params.scene);
    return {
        cube, sprite
    }
}
let spriteBehindObject = 0;
export function updateAnnotation(params = {}) {
    // 更新锚点的透明度
    const cubeDistance = params.camera.position.distanceTo(params.cube.position);
    const spriteDistance = params.camera.position.distanceTo(params.sprite.position);
    spriteBehindObject = spriteDistance > cubeDistance;
    params.sprite.material.opacity = spriteBehindObject ? 0.25 : 1;
    //params.sprite.material.opacity = 0;

    // 更新位置
    const vector = new THREE.Vector3(5, 5, 5);
    const canvas = params.dom;
    vector.project(params.camera);

    vector.x = Math.round((0.5 + vector.x / 2) * (canvas.width / window.devicePixelRatio));
    vector.y = Math.round((0.5 - vector.y / 2) * (canvas.height / window.devicePixelRatio));
    //console.log(vector)
    params.annotation.style.left = `${vector.x}px`;
    params.annotation.style.top = `${vector.y}px`;
    params.annotation.style.opacity = spriteBehindObject ? 0.25 : 1;

}
/**
 * 发光球由6种效果合成：一个转动的熔浆球体，一层透明气场，外发光，飞线聚集特效，内部发光，蓝色耀斑
 * @param {*} params 
 */
export function initUseLighting(params = {}) {
    // 加载纹理
    const loader = new THREE.TextureLoader();
    const map = loader.load("./shaderOfShpere/magma.png");
    map.wrapS = map.wrapT = THREE.RepeatWrapping;

    const mesh_1 = new THREE.Mesh(
        new THREE.SphereGeometry(2, 20, 20),
        new THREE.MeshBasicMaterial({
            map: map,
        })
    );

    params.scene.add(mesh_1);
    // 加载第二个纹理
    const particleMap = loader.load("./shaderOfShpere/Particle01.png");
    const particleMaterial = new THREE.SpriteMaterial({
        map: particleMap,
        color: 0xffffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
    });
    const sprite = new THREE.Sprite(particleMaterial);
    // 扩大倍数
    sprite.scale.multiplyScalar(11);
    params.scene.add(sprite);

    // 第三个纹理
    const BurstMap = loader.load("./shaderOfShpere/Burst01.png");
    const mesh_2 = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 2),
        new THREE.MeshBasicMaterial({ map }));
    params.scene.add(mesh_2);
    mesh_2.position.y = 5;

    return { mesh_1, sprite, mesh_2 };
}

/**
 * 有点像重生之门
 * @param {*} params 
 */
import firefilesVertexShader from "../Shader/firefiles/fire/vertex.glsl";
import firefilesFragmentShader from "../Shader/firefiles/fire/fragment.glsl";
import portalVertexShader from "../Shader/firefiles/portal/vertex.glsl";
import portalFragmentShader from "../Shader/firefiles/portal/fragment.glsl";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

export function initUseFireflies(params = {}) {
    const debugObject = {
        clearColor: "#1e2243",
        portalColorStart: "#b91fac",
        portalColorEnd: "#ffebf3"
    };

    params.renderer.outputColorSpace = THREE.SRGBColorSpace;
    params.renderer.setClearColor(debugObject.clearColor);

    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    // 加载gltf 模型
    const gltfLoader = new GLTFLoader();

    // 加载烘焙纹理
    const bakedTexture = textureLoader.load("./texture/Firefiles/baked-02.jpeg");
    bakedTexture.colorSpace = THREE.SRGBColorSpace;
    // 创建烘焙材质
    const bakedMaterial = new THREE.MeshBasicMaterial({
        map: bakedTexture,
    });
    bakedTexture.flipY = false;

    // 极光灯 material
    const poleLightMaterial = new THREE.MeshBasicMaterial({
        color: "#f0bf94"
    });

    // 入口照明灯 Material 
    const portalLightMaterial = new THREE.ShaderMaterial({
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0. },
            uColorStart: { value: new THREE.Color(debugObject.portalColorStart) },
            uColorEnd: { value: new THREE.Color(debugObject.portalColorEnd) }
        }
    });


    // 加载模型
    gltfLoader.load("./model/Firefiles/portal-2.glb", (gltf) => {
        console.log(111, gltf)

        let bakedMesh = gltf.scene.children.find((child) => child.name === "baked");
        // 修改模型的材质为烘焙材质
        bakedMesh.material = bakedMaterial;
        // 
        const portalLight = gltf.scene.children.find((child) => child.name === "portalCircle");
        portalLight.material = portalLightMaterial;

        gltf.scene.children.filter((child) => child.name.includes("lampLight")).forEach((light) => {
            light.material = poleLightMaterial;
        });

        params.scene.add(gltf.scene);
    });

    const firefilesGeometry = new THREE.BufferGeometry();
    const firefilesCount = 30;
    const positionArray = new Float32Array(firefilesCount * 3);// 位置数据
    const scaleArray = new Float32Array(firefilesCount);// 缩放值

    for (let i = 0; i < firefilesCount; i++) {
        new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            Math.random() * 1.5,
            (Math.random() - 0.5) * 4
        ).toArray(positionArray, i * 3);
        scaleArray[i] = Math.random() * 20.;// 缩放的随机值

    }
    firefilesGeometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
    firefilesGeometry.setAttribute("aScale", new THREE.BufferAttribute(scaleArray, 1));
    const firefilesMaterial = new THREE.ShaderMaterial({
        vertexShader: firefilesVertexShader,
        fragmentShader: firefilesFragmentShader,
        transparent: true,
        uniforms: {
            uTime: { value: 0. },
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            uSize: { value: 100 },
        },
        blending: THREE.AdditiveBlending,
        depthWrite: false,// 开始深度写入
    });
    const firefiles = new THREE.Points(firefilesGeometry, firefilesMaterial);
    params.scene.add(firefiles);
    return { firefilesMaterial, portalLightMaterial };
}

/**
 * 烟花效果
 * @param {*} params 
 */
// 设置重力
const gravity = new THREE.Vector3(0, -0.005, 0);
// 设置莫查理
const friction = 0.998;
const noise = new SimplexNoise();
const textureSize = 128.0;
const fireworksInstances = [];// 存储实例
let outputDom, isAutoLaunch = true;
let canvasTexture;

// const gui = new GUI();
// const guiControls = new (function () {
//     this.particleSize = 300;
//     this.autoLaunch = true;
// })();

// gui.add(guiControls, 'autoLaunch').onChange(e => {
//     isAutoLaunch = e;

// });
// gui.add(guiControls, 'particleSize', 100, 600);

const getOffsetRGBA = i => {
    const offset = 4;
    const index = i * offset;
    const r = index;
    const g = index + 1;
    const b = index + 2;
    const a = index + 3;

    return { r, g, b, a };
};


// 传递参数进行偏移值，进行3偏移值
const getOffsetXYZ = i => {
    const offset = 3;
    const index = i * offset;
    const x = index;
    const y = index + 1;
    const z = index + 2;

    return { x, y, z };
};

const getTexture = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = textureSize;
    canvas.height = textureSize;
    const canvasRadius = textureSize / 2;
    drawRadialGradation(ctx, canvasRadius, canvas.width, canvas.height);
    const texture = new THREE.Texture(canvas);
    texture.type = THREE.FloatType;
    texture.needsUpdate = true;
    return texture;

}

canvasTexture = getTexture();

function drawRadialGradation(ctx, canvasRadius, canvasW, canvasH) {
    ctx.save();
    var gradient = ctx.createRadialGradient(canvasRadius, canvasRadius, 0, canvasRadius, canvasRadius, canvasRadius);
    gradient.addColorStop(0., 'blue');
    gradient.addColorStop(0.5, 'purple');
    gradient.addColorStop(1., 'yellow');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
}

import vertexPointsShader from "../Shader/YanHua/vertex.glsl";
import fragmentPointsShader from "../Shader/YanHua/fragment.glsl";


export function initUseFireworks(params = {}) {

    /**js 定义的立即执行函数，用于定义一个函数并立即调用它
     * (function(){})() 
     * 
     */
    params.renderer.setClearColor(new THREE.Color(0x000000), 0);
    params.renderer.shadowMap.enabled = true;
    params.renderer.setClearAlpha(0);

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x666666);
    params.scene.add(ambientLight);

    // 添加聚光灯
    const spotLight = new THREE.SpotLight(0xffffcc);
    spotLight.distance = 2000;
    spotLight.position.set(-500, 1000, 0);
    spotLight.castShadow = true;
    params.scene.add(spotLight);

    // 创建一个平面
    const planeGeometry = new THREE.PlaneGeometry(200, 200, 10, 10);
    const planeMaterial = new THREE.MeshLambertMaterial({
        color: 0xfffdce,
        side: THREE.DoubleSide,
        wireframe: true,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
    plane.rotation.x = - Math.PI * 0.5;
    plane.position.x = 0;
    plane.position.y = -50;
    plane.position.z = 0;
    params.scene.add(plane);

    makeRoughGround(plane);

    setInterval(() => {
        if (!isAutoLaunch) return;
        if (Math.random() > 0.7) {
            createFireWorks(params);
        }
        const exploadedIndexList = [];

        for (let i = fireworksInstances.length - 1; i >= 0; i--) {
            const instance = fireworksInstances[i];
            instance.update(gravity);
            if (instance.isExplode) exploadedIndexList.push(i);
        }

        for (let i = 0, l = exploadedIndexList.length; i < l; i++) {
            const index = exploadedIndexList[i];
            const instance = fireworksInstances[index];
            if (!instance) return;

            /*
                Be careful because js heap size will continue to increase unless you do the following:
                - Remove unuse mesh from scene 
                - Execute dispose method of Geometres and Materials in the Mesh
            */
            instance.meshGroup.remove(instance.seed.mesh);
            instance.seed.disposeAll();
            if (instance.life <= 0) {
                scene.remove(instance.meshGroup);
                if (instance.tailMeshGroup) {
                    instance.tails.forEach(v => {
                        v.disposeAll();
                    });
                }
                instance.flower.disposeAll();
                fireworksInstances.splice(index, 1);
            }
        }

    }, 100);
}

const getPointMesh = (num, vels, type) => {
    // 创建几何体
    const bufferGeometry = new THREE.BufferGeometry();
    const vertices = [];
    const velocities = [];
    const colors = [];
    const adjustSizes = [];
    const masses = [];
    const colorType = Math.random() > 0.3 ? 'single' : 'multiple';
    const singleColor = getRandomNum(20, 100) * 0.01;
    const multipleColor = () => getRandomNum(1, 100) * 0.01;

    let rgbType;
    const rgbTypeDice = Math.random();
    if (rgbTypeDice > 0.66) {
        rgbType = 'red';
    } else if (rgbTypeDice > 0.33) {
        rgbType = 'green';
    } else {
        rgbType = 'blue';
    }

    for (let i = 0; i < num; i++) {
        const pos = new THREE.Vector3(0, 0, 0);
        vertices.push(pos.x, pos.y, pos.z);
        velocities.push(vels[i].x, vels[i].y, vels[i].z);

        if (type === 'seed') {
            let size;
            if (type === 'trail') {
                size = Math.random() * 0.1 + 0.1;
            } else {
                size = Math.pow(vels[i].y, 2) * 0.04;
            }

            if (i === 0) size *= 1.1;

            adjustSizes.push(size);
            masses.push(size * 0.017);
            colors.push(1.0, 1.0, 1.0, 1.0);
        } else {
            const size = getRandomNum(guiControls.ParticleSize, 10) * 0.001;
            adjustSizes.push(size);
            masses.push(size * 0.017);
            if (colorType === 'multiple') {
                colors.push(multipleColor(), multipleColor(), multipleColor(), 1.);
            } else {
                switch (rgbType) {
                    case 'red':
                        colors.push(singleColor, 0.1, 0.1, 1.);
                        break;
                    case 'green':
                        colors.push(0.1, singleColor, 0.1, 1.);
                        break;
                    case 'blue':
                        colors.push(0.1, 0.1, singleColor, 1.);
                        break;
                    default:
                        colors.push(singleColor, 0.1, 0.1, 1.);
                }
            }
        }
    }

    bufferGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    bufferGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    bufferGeometry.setAttribute('adjustSize', new THREE.Float32BufferAttribute(adjustSizes, 1));
    bufferGeometry.setAttribute('mass', new THREE.Float32BufferAttribute(masses, 1));

    const shaderMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            size: {
                type: 'f',
                value: textureSize
            },
            texture: { type: 't', value: canvasTexture }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: vertexPointsShader,
        fragmentShader: fragmentPointsShader,
    });

    return new THREE.Points(bufferGeometry, shaderMaterial);
}
class ParticleMesh {
    constructor(num, vels, type) {
        this.particleNum = num;
        this.timerStartFading = 10;
        this.mesh = getPointMesh(num, vels, type);

    }

    update(gravity) {
        if (this.timerStartFading > 0) {
            this.timerStartFading -= 0.3;
        }

        const { position, velocity, color, mass } = this.mesh.geometry.attributes;

        const decrementRandom = () => (Math.random() > 0.5 ? 0.98 : 0.96);
        const decrementByVel = v => (Math.random() > 0.5 ? 0 : (1 - v) * 0.1);

        for (let i = 0; i < this.particleNum; i++) {
            const { x, y, z } = getOffsetXYZ(i);
            velocity.array[y] += gravity.y - mass.array[i];
            velocity.array[x] *= friction;
            velocity.array[z] *= friction;
            position.array[x] += velocity.array[x];
            position.array[y] += velocity.array[y];
            position.array[z] += velocity.array[z];

            const { a } = getOffsetRGBA(i);

            if (this.timerStartFading <= 0) {
                color.array[a] *= decrementRandom() - decrementByVel(color.array[a]);
                if (color.array[a] < 0.001) color.array[a] = 0;
            }
        }

        position.needsUpdate = true;
        velocity, needsUpdate = true;
        color.needsUpdate = true;

    }

    disposeAll() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

class ParticleSeedMesh extends ParticleMesh {
    constructor(num, vels) {
        super(num, vels, 'seed');
    }

    update(gravity) {
        const { position, velocity, color, mass } = this.mesh.geometry.attributes;
        const decrementRandom = () => (Math.random() > 0.3 ? 0.99 : 0.96);
        const decrementByVel = v => (Math.random() > 0.3 ? 0 : (1 - v) * 0.1);
        const shake = () => (Math.random() > 0.5 ? 0.05 : - 0.05);
        const dice = () => Math.random() > 0.1;
        const _f = friction * 0.98;
        for (let i = 0; i < this.particleNum; i++) {
            const { x, y, z } = getOffsetXYZ(i);
            velocity.array[y] += gravity.y - mass.array[i];
            velocity.array[x] *= _f;
            velocity.array[z] *= _f;
            velocity.array[y] *= _f;
            position.array[x] *= velocity.array[x];
            position.array[y] += velocity.array[y];
            position.array[z] += velocity.array[z];

            if (dice()) position.array[x] += shake();
            if (dice()) position.array[z] += shake();

            const { a } = getOffsetRGBA(i);
            color.array[a] *= decrementRandom() - decrementByVel(color.array[a]);
            if (color.array[a] < 0.001) {
                color.array[a] = 0;
            }

            position.needsUpdate = true;
            velocity.needsUpdate = true;
            color.needsUpdate = true;
        }
    }



}

class BasicFireWorks {
    constructor() {
        this.meshGroup = new THREE.Group();
        this.isExplode = false;
        const max = 400;
        const min = 150;

        this.petalsNum = getRandomNum(min, max);
        this.life = 150;// 生命时间
        this.seed = this.getSeed();// 设置种子
        this.meshGroup.add(this.seed.mesh);
        this.flowerSizeRate = THREE.MathUtils.mapLinear(this.petalsNum, min, max, 0.4, 0.7);

        this.flower = null;
    }
    /**
     * 设置种子
     */
    getSeed() {
        const num = 40;
        const vels = [];

        for (let i = 0; i < num; i++) {
            const vx = 0;
            const vy = i === 0 ? Math.random() * 2.5 + 0.9 : Math.random() * 2. + 0.4;
            const vz = 0;
            vels.push(new THREE.Vector3(vx, vy, vz));
        }

        const pm = new ParticleSeedMesh(num, vels);
        const x = Math.random() * 80 - 40;
        const y = -50;
        const z = Math.random() * 80 - 40;
        pm.mesh.position.set(x, y, z);
        return pm;
    }

    explode(pos) {
        this.isExplode = true;
        this.flower = this.getFlower(pos);

        this.meshGroup.add(this.flower.mesh);
        this.meshGroup.remove(this.seed.mesh);
        this.seed.disposeAll();
    }


    getFlower(pos) {
        const num = this.petalsNum;
        const vels = [];
        let radius;
        const dice = Math.random();
        if (dice > 0.5) {
            for (let i = 0; i < num; i++) {
                radius = getRandomNum(120, 60) * 0.01;
                const theta = THREE.MathUtils.degToRad(Math.random() * 180);
                const phi = THREE.MathUtils.degToRad(Math.random() * 360);
                const vx = Math.sin(theta) * Math.cos(phi) * radius;
                const vy = Math.sin(theta) * Math.sin(phi) * radius;
                const vz = Math.cos(theta) * radius;

                const vel = new THREE.Vector3(vx, vy, vz);
                vel.multiplyScalar(this.flowerSizeRate);

                vels.push(vel);
            }
        } else {
            const zStep = 180 / num;
            const trad = (360 * (Math.random() * 20 + 1)) / num;
            const xStep = trad;
            const yStep = trad;
            radius = getRandomNum(120, 60) * 0.01;

            for (let i = 0; i < num; i++) {
                const sphereRate = Math.sin(THREE.MathUtils.degToRad(zStep * i));
                const vz = Math.cos(THREE.MathUtils.degToRad(zStep * i)) * radius;
                const vx = Math.cos(THREE.MathUtils.degToRad(xStep * i)) * sphereRate * radius;
                const vy = Math.sin(THREE.MathUtils.degToRad(yStep * i)) * sphereRate * radius;

                const vel = new THREE.Vector3(vx, vy, vz);
                vel.multiplyScalar(this.flowerSizeRate);
                vels.push(vel);
            }
        }

        const particleMesh = new ParticleMesh(num, vels);
        particleMesh.mesh.position.set(pos.x, pos.y, pos.z);
        return particleMesh;
    }

    update(gravity) {
        if (!this.isExplode) {
            this.drawTail();
        } else {
            this.flower.update(gravity);
            if (this.life > 0) this.life -= 1;
        }
    }

    drawTail() {
        this.seed.update(gravity);
        const { position, velocity } = this.seed.mesh.geometry.attributes;
        let count = 0;
        let isComplete = true;
        for (let i = 0, l = velocity.array.length; i < l; i++) {
            const v = velocity.array[i];
            const index = i % 3;

            if (index === 1 && v > 0) {
                count++;
            }
        }

        isComplete = count == 0;
        if (!isComplete) return;

        const { x, y, z } = this.seed.mesh.position;
        const flowerPos = new THREE.Vector3(x, y, z);
        let highestPos = 0;
        let offsetPos;
        for (let i = 0; i < position.array.length; i++) {
            const p = position.array[i];
            const index = i % 3;

            if (index === 1 && p > highestPos) {
                highestPos = p;
                offset = new THREE.Vector3(position.array[i - 1], p, position.array[i + 2]);


            }
        }

        flowerPos.add(offsetPos);
        this.explode(flowerPos);
    }
}

class RichFireWorks extends BasicFireWorks {
    constructor() {
        super();

        const max = 150;
        const min = 100;
        this.petalsNum = getRandomNum(min, max);
        this.flowerSizeRate = THREE.MathUtils.mapLinear(this.petalsNum, min, max, 0.4, 0.7);
        this.tailMeshGroup = new THREE.Group();
        this.tails = [];
    }

    explode(pos) {
        this.isExplode = true;
        this.flower = this.getFlower(pos);
        this.tails = this.getTail();

        this.meshGroup.add(this.flower.mesh);
        this.meshGroup.add(this.tailMeshGroup);
    }

    getTail() {
        const tails = [];
        const num = 20;
        const { color: petalColor } = this.flower.mesh.geometry.attributes;

        for (let i = 0; i < this.petalsNum; i++) {
            const vels = [];
            for (let j = 0; j < num; j++) {
                const vx = 0;
                const vy = 0;
                const vz = 0;

                vels.push(new THREE.Vector3(vx, vy, vz));
            }
            const tail = new ParticleTailMesh(num, vels);

            const { r, g, b, a } = getOffsetRGBA(i);
            const petalR = petalColor.array[r];
            const petalG = petalColor.array[g];
            const petalB = petalColor.array[b];
            const petalA = petalColor.array[a];

            const { position, color } = tail.mesh.geometry.attributes;

            for (let k = 0; k < position.count; k++) {
                const { r, g, b, a } = getOffsetRGBA(k);

                color.array[r] = petalR;
                color.array[g] = petalG;
                color.array[b] = petalB;
                color.array[a] = petalA;
            }

            const { x, y, z } = this.flower.mesh.position;
            tail.mesh.position.set(x, y, z);
            tails.push(tail);
            this.tailMeshGroup.add(tail.mesh);
        }
        return tails;
    }

    update(gravity) {
        if (!this.isExplode) {
            this.drawTail();
        } else {
            this.flower.update(gravity);
            const { position, flowerGeometry } = this.flower.mesh.geometry.attributes;

            for (let i = 0; i < this.tails.length; i++) {
                const tail = this.tails[i];
                tail.update(gravity);
                const { x, y, z } = getOffsetXYZ(i);
                const flowerPos = new THREE.Vector3(flowerGeometry.array[x],
                    flowerGeometry.array[y], flowerGeometry.array[z]);
                const { position, velocity } = tail.mesh.geometry.attributes;
                for (let k = 0; k < position.count; k++) {
                    const { x, y, z } = getOffsetXYZ(k);
                    const desiredVelocity = new THREE.Vector3();
                    const tailPos = new THREE.Vector3(position.array[x],
                        position.array[y], position.array[z]);
                    const tailVel = new THREE.Vector3(velocity.array[x],
                        velocity.array[y], velocity.array[z]);

                    desiredVelocity.subVectors(flowerPos, tailPos);
                    const steer = desiredVelocity.sub(tailVel);
                    steer.normalize();

                    steer.multiplyScalar(Math.random() * 0.0003 * this.life);
                    velocity.array[x] += steer.x;
                    velocity.array[y] += steer.y;
                    velocity.array[z] += steer.z;
                }
                velocity.needsUpdate = true;
            }
            if (this.life > 0) this.life -= 1.2;
        }
    }
}

function getRandomNum(min = 0, max = 0) {
    return Math.floor(Math.random() * (max + 1 - min)) + min;
}
/**
 * 创建烟花效果
 * @param {*} params 
 */
function createFireWorks(params = {}) {
    if (fireworksInstances.length > 5) return;

    const fw = Math.random() * 10 > 8 ? new BasicFireWorks() : new RichFireWorks();

    fireworksInstances.push(fw);
    params.scene.add(fw.meshGroup);
}

const makeRoughGround = mesh => {
    const time = Date.now();
    console.log(111, mesh)
    const { geometry } = mesh;
    for (let i = 0; i < geometry.attributes.position.length; i++) {
        const vertex = geometry.attributes.position[i];
        const noise1 = noise.noise2D(vertex.x * 0.01 + time * 0.0002, vertex.y * 0.01 + time * 0.0002, vertex.z * 0.01 + time * 0.002) * 5;
        const noise2 = noise.noise2D(vertex.x * 0.02 + time * 0.00002, vertex.y * 0.02 + time * 0.00004, vertex.z * 0.02 + time * 0.00002) * 2;
        const noise3 = noise.noise2D(vertex.x * 0.009 + time * 0.00001, vertex.y * 0.012 + time * 0.000003, vertex.z * 0.015 + time * 0.00003) * 2;
        const distance = noise1 + noise2 + noise3;
        vertex.z = distance;
    }

    //geometry.computeVertexNormals();
    //geometry.computeFacNormals();
}

/**
 * 着色器处理
 * @param {*} params 
 */
export function initUseDealShader(params = {}) {
    const textureLoader = new THREE.TextureLoader();
    // 添加环境纹理
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    const envMapTexture = cubeTextureLoader.load([
        "textures/environmentMaps/0/px.jpg",
        "textures/environmentMaps/0/nx.jpg",
        "textures/environmentMaps/0/py.jpg",
        "textures/environmentMaps/0/ny.jpg",
        "textures/environmentMaps/0/pz.jpg",
        "textures/environmentMaps/0/nz.jpg"
    ]);
    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xffdead, 1.2);
    params.scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xfcfdfe, 1.5);
    params.scene.add(pointLight);
    pointLight.position.set(2, 3, 5);

    // 添加平行光
    const directionalLight = new THREE.DirectionalLight(0xfdedfe, 2.);
    directionalLight.castShadow = true;
    directionalLight.position.set(0, 0, 200);
    params.scene.add(directionalLight);

    params.scene.environment = envMapTexture;
    params.scene.background = envMapTexture;

    // 加载模型文件
    const modelTexture = textureLoader.load("./model/LeePerrySmith/color.jpg");
    // 加载模型的法线纹理
    const normalTexture = textureLoader.load("./model/LeePerrySmith/normal.jpg");
    const material = new THREE.MeshStandardMaterial({
        map: modelTexture,
        normalMap: normalTexture,
    });
    const customUniforms = {
        uTime: { value: 0 },
    };
    material.onBeforeCompile = (shader) => {
        // 传递时间
        shader.uniforms.uTime = customUniforms.uTime;
        shader.vertexShader = shader.vertexShader.replace("#include <common>", `
            
            #include <common>
            mat2 rotate2d(float _angle){
                return mat2(cos(_angle),-sin(_angle),sin(_angle),cos(_angle));
            }
            uniform float uTime;
        `);

        // 在进行编辑改变
        shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", `
            
        #include <beginnormal_vertex>
        float angle = sin(position.y + uTime) * 0.5;
        mat2 rotateMatrix = rotate2d(angle);

        objectNormal.xz = rotateMatrix * objectNormal.xz;
        `);

        shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
            #include <begin_vertex>
            angle = transformed.y * 0.5;
            //mat2 rotateMatrix = rotate2d(angle);

            transformed.xy = rotateMatrix * transformed.xy;

        `);
    };

    const depthMaterial = new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
    });

    depthMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = customUniforms.uTime;
        shader.vertexShader = shader.vertexShader.replace("#include <common>", `

            #include <common>

            mat2 rotate2d(float _angle){
                return mat2(cos(_angle),-sin(_angle),sin(_angle),cos(_angle));
            }
            uniform float uTime;
        `);

        shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
            
            #include <begin_vertex>
            float angle = sin(position.y + uTime) * 0.8;
            mat2 rotateMatrix = rotate2d(angle);

            transformed.xz = rotateMatrix * transformed.xz;
        `);
    }

    // 加载模型
    const gltfLoader = new GLTFLoader();
    gltfLoader.load("./model/LeePerrySmith/LeePerrySmith.glb", (gltf) => {
        const mesh = gltf.scene.children[0];
        mesh.material = material;
        mesh.castShadow = true;
        mesh.customDepthMaterial = depthMaterial;
        params.scene.add(mesh);
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial());
    plane.position.set(0, 0, -6);
    plane.receiveShadow = true;
    params.scene.add(plane);

    return customUniforms;
}

export function initUseBaseMaterial(params = {}) {
    let basicMaterial = new THREE.MeshBasicMaterial({
        color: "#00ff00",
        side: THREE.DoubleSide,
    });

    const basicUniform = {
        uTime: { value: 0 },
    }

    basicMaterial.onBeforeCompile = (shader, renderer) => {
        console.log('onBeforeCompile 中的Renderer:', renderer);

        shader.uniforms.uTime = basicUniform.uTime;
        shader.vertexShader = shader.vertexShader.replace('#include <common>', `

        #include <common>

        uniform float uTime;
        `);

        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `

        #include <begin_vertex>

        transformed.x += sin(uTime) * 2.;
        transformed.z += cos(uTime) * 3.; 
        transformed.y += sin(uTime * 2.) * 2.;
        `);
    }

    // 创建一个平面
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 64, 64), basicMaterial);

    params.scene.add(floor);

    const directionalLight = new THREE.DirectionalLight(0xdfede, 2.);
    directionalLight.position.set(5, 5, 5);
    params.scene.add(directionalLight);

    return basicUniform;
}


import baseVertexShader from "../Shader/basic/vertex.glsl";
import baseFragmentShader from "../Shader/basic/fragment.glsl";
import deepVertexShader from "../Shader/deep/vertex.glsl";
import deepFragmentShader from "../Shader/deep/fragment.glsl";

/**
 * 学习 shader
 * @param {*} params 
 */
export function initStudyShader(params = {}) {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load("../texture/fire.jpeg");
    const uniforms = {
        uTime: {
            type: "f",
            value: 0
        },
        uFrequency: {
            type: "f",
            value: 12.,
        },
        uScale: {
            type: "f",
            value: 2.,
        },
        uColor: {
            value: new THREE.Color(0xFF00FF)
        },
        uTexture: {
            value: texture
        }
    };
    const planeGeometry = new THREE.SphereGeometry(10);
    const planeMaterial = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        vertexShader: baseVertexShader,
        fragmentShader: baseFragmentShader,
        uniforms: uniforms,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    params.scene.add(plane);
    plane.rotateX(Math.PI / 2);
    plane.position.x = -10;

    const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);
    const cubeMaterial = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        vertexShader: deepVertexShader,
        fragmentShader: deepFragmentShader,
        uniforms: uniforms,
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    params.scene.add(cube);

    return uniforms;
}

// 引入效果合成器
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
// three.js 自带的效果
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { DotScreenPass } from "three/examples/jsm/postprocessing/DotScreenPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { SSAARenderPass } from "three/examples/jsm/postprocessing/SSAARenderPass.js";
import { GlitchPass } from "three/examples/jsm/postprocessing/GlitchPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { BloomPass } from "three/examples/jsm/postprocessing/BloomPass.js"
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";










/**
 * 使用效果合成技术
 * @param {*} params 
 */
export function initUseEffectComposer(params = {}) {
    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    // 添加环境纹理
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    const envMapTexture = cubeTextureLoader.load([
        "./textures/environmentMaps/0/px.jpg",
        "./textures/environmentMaps/0/nx.jpg",
        "./textures/environmentMaps/0/py.jpg",
        "./textures/environmentMaps/0/ny.jpg",
        "./textures/environmentMaps/0/pz.jpg",
        "./textures/environmentMaps/0/nz.jpg",

    ]);

    params.scene.background = envMapTexture;
    params.scene.environment = envMapTexture;

    const directionalLight = new THREE.DirectionalLight('#ffffff', 1.);
    directionalLight.castShadow = true;
    directionalLight.position.set(0, 0, 20);
    params.scene.add(directionalLight);

    // 加载模型
    const gltfLoader = new GLTFLoader();
    gltfLoader.load("./model/DamagedHelmet/glTF/DamagedHelmet.gltf", (gltf) => {
        const mesh = gltf.scene.children[0];
        params.scene.add(mesh);

    });

    params.renderer.shadowMap.enabled = true;

    // 效果合成
    const effectComposer = new EffectComposer(params.renderer);
    effectComposer.setSize(window.innerWidth, window.innerHeight);

    // 添加渲染通道
    const renderPass = new RenderPass(params.scene, params.camera);
    effectComposer.addPass(renderPass);

    // 点效果
    const dotScreenPass = new DotScreenPass(new THREE.Vector2(1, 1), 90, 100);
    dotScreenPass.enabled = false;
    //effectComposer.addPass(dotScreenPass);

    // 抗锯齿
    const smaaPass = new SMAAPass(10, 10);
    //effectComposer.addPass(smaaPass);

    // 发光效果
    const unrealBloomPass = new UnrealBloomPass();
    //effectComposer.addPass(unrealBloomPass);
    unrealBloomPass.exposure = 2;
    unrealBloomPass.strength = 10;
    unrealBloomPass.radius = 10;
    unrealBloomPass.threshold = 2;

    // 屏幕闪动
    const glitchPass = new GlitchPass(10);
    //effectComposer.addPass(glitchPass);


    params.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    params.renderer.toneMappingExposure = 1;

    const colorParams = {
        r: Math.random(), g: Math.random(), b: Math.random()
    };
    // 加载纹理
    const tDiffuse = textureLoader.load("./textures/matcaps/4.png");
    const shaderPass = new ShaderPass({
        uniforms: {
            tDiffuse: {
                value: tDiffuse
            },
            uColor: {
                value: new THREE.Color(colorParams.r, colorParams.g, colorParams.b)
            }
        },
        vertexShader: `varying vec2 vUv; void main(){
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.);
    }`,
        fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform vec3 uColor;
        void main(){
            vec4 color = texture2D(tDiffuse,vUv);
            color.xyz *= uColor;
            gl_FragColor = color;

            //gl_FragColor = vec4(vUv,0.,1.);
        }
    `,
    });

    effectComposer.addPass(shaderPass);

    // 第二个
    const normalTexture = textureLoader.load("./textures/interfaceNormalMap.png");
    const techPass = new ShaderPass({
        uniforms: {
            tDiffuse: {
                value: null,
            },
            tNormalMap: {
                value: null,
            },
            uTime: {
                value: 0
            }
        },
        vertexShader: `
            varying vec2 vUv;
            void main(){
                vUv = uv;
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.);
            }
        `,
        fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform sampler2D tNormalMap;
        uniform float uTime;

        void main(){
            vec2 newUv = vUv;
            newUv += sin(newUv.x * 10. + uTime * 0.5);

            vec4 color = texture2D(tDiffuse,newUv);
            vec4 normalColor = texture2D(tNormalMap,vUv);
            // 设置光线的角度
            vec3 lightDirectional = normalize(vec3(-5,5,2));
            float lightness = clamp(dot(normalColor.xyz,lightDirectional),0.,1.);
            color.xyz += lightness;

            gl_FragColor = color;
        }
        `,

    });

    techPass.material.uniforms.tNormalMap.value = normalTexture;
    effectComposer.addPass(techPass);


    return { effectComposer, techPass };
}

import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
/**
 * 使用2D渲染器
 * @param {*} params 
 */
export function initUseCSS2DRenderer(params = {}) {
    // 地球半径
    const earthRadius = 10;
    const moonRadius = 2;// 月球半径

    const textureLoader = new THREE.TextureLoader();

    // 添加灯光
    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(0, 0, -15);
    params.scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xfffdef, 1.2);
    params.scene.add(ambientLight);



    const earthGeometry = new THREE.SphereGeometry(earthRadius, 16, 16);
    const earthMaterial = new THREE.MeshPhongMaterial({
        specular: 0x333333,// 高光颜色
        shininess: 5,
        map: textureLoader.load("./textures/planets/earth_atmos_2048.jpg"),
        specularMap: textureLoader.load("./textures/planets/eart_specular_2048.jpg"),
        normalMap: textureLoader.load("./textures/planets/earth_normal_2048.jpg"),
        normalScale: new THREE.Vector2(2.85, 2.85),
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    params.scene.add(earth);

    // 创建月球
    const moonGeometry = new THREE.SphereGeometry(moonRadius, 16, 16);
    const moonMaterial = new THREE.MeshPhongMaterial({
        shininess: 5,
        map: textureLoader.load("./textures/planets/moon_1024.jpg"),
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(12, 2, 0);
    params.scene.add(moon);

    // 添加提示标签
    const earthDiv = document.createElement('div');
    earthDiv.className = "label";
    earthDiv.innerHTML = "地球";
    const earthLabel = new CSS2DObject(earthDiv);
    earthLabel.position.set(0, 6, 0);
    earth.add(earthLabel);

    // 中国
    const chinaDiv = document.createElement("div");
    chinaDiv.className = "label1";
    chinaDiv.innerHTML = "中国";
    const chinaLabel = new CSS2DObject(chinaDiv);
    chinaLabel.position.set(6, 6, 2);
    earth.add(chinaLabel);

    // 月球
    const moonDiv = document.createElement("div");
    moonDiv.className = "label";
    moonDiv.innerHTML = "月球";
    moonDiv.name = "Moon";
    const moonLabel = new CSS2DObject(moonDiv);
    moonLabel.position.set(1.5, 1.2, 0);
    moon.add(moonLabel);

    // 实例化css2d 渲染器
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    params.dom.appendChild(labelRenderer.domElement);
    labelRenderer.domElement.style.position = 'fixed';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.left = '0px';
    labelRenderer.domElement.style.zIndex = '10';

    //params.orbitControls.domElement = labelRenderer.domElement;

    // 创建曲线
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(20, 0, 0),
        new THREE.Vector3(14, 35, -30),
        new THREE.Vector3(-12, -20, 2),
        new THREE.Vector3(-3, 5, 30)
    ], true, 'centripetal', 10);

    // 对线段进行细分
    const points = curve.getPoints(100);// 实际得到101 个点
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff000d });
    const curveObject = new THREE.Line(geometry, material);
    params.scene.add(curveObject);


    return { labelRenderer, curve, moon, earth };
}

import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
/**
 * 变形动画
 * @param {*} params 
 */
export function initUseMorphTarget(params = {}) {
    // 加载hdr 环境纹理
    const loader = new RGBELoader();
    loader.load("./textures/038.hdr", (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        params.scene.background = texture;
        params.scene.environment = texture;
    });

    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    let param = {
        value: 0,
        value1: 0,
    };
    // 加载压缩的glb模型
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderConfig({ type: "js" });
    dracoLoader.setDecoderPath("./draco/gltf/");
    dracoLoader.preload();
    gltfLoader.setDRACOLoader(dracoLoader);

    let mixer, stem, petal, stem1, petal1, stem2, petal2;
    gltfLoader.load("./model/f4.glb", (gltf1) => {
        stem = gltf1.scene.children[0];
        petal = gltf1.scene.children[1];
        gltf1.scene.rotation.x = Math.PI;

        gltf1.scene.traverse((item) => {
            if (item.material && item.material.name == "Water") {
                item.material = new THREE.MeshStandardMaterial({
                    color: "skyblue",
                    depthWrite: false,
                    transparent: true,
                    depthTest: false,
                    opacity: 0.5,
                });
            }

            if (item.material && item.material.name == "Stem") {
                stem = item;
            }

            if (item.material && item.material.name == "Petal") {
                petal = item;
            }
        });

        // 加载另一个模型
        gltfLoader.load("./model/f2.glb", (gltf2) => {
            gltf2.scene.traverse((item) => {
                if (item.material && item.material.name == "Stem") {
                    stem1 = item;
                    stem.geometry.morphAttributes.position = [
                        stem1.geometry.attributes.position,
                    ];
                    stem.updateMorphTargets();
                }
                if (item.material && item.material.name == "Petal") {
                    petal1 = item;
                    petal.geometry.morphAttributes.position = [
                        petal1.geometry.attributes.position,
                    ];
                    petal.updateMorphTargets();
                }

                gltfLoader.load("./model/f1.glb", (gltf3) => {
                    gltf3.scene.traverse((item) => {
                        if (item.material && item.material.name == "Stem") {
                            stem2 = item;
                            stem.geometry.morphAttributes.position.push(stem2.geometry.attributes.position);
                            stem.updateMorphTargets();
                        }

                        if (item.material && item.material.name == "Petal") {
                            petal2 = item;
                            petal.geometry.morphAttributes.position.push(petal2.geometry.attributes.position);
                            petal.updateMorphTargets();
                        }
                    })
                })
            });
            gsap.to(param, {
                value: 1, duration: 4, onUpdate: function () {
                    stem.morphTargetInfluences[0] = param.value;
                    petal.morphTargetInfluences[0] = param.value;
                }, onComplete: function () {
                    gsap.to(param, {
                        value1: 1,
                        duration: 4,
                        onUpdate: function () {
                            stem.morphTargetInfluences[1] = param.value1;
                            petal.morphTargetInfluences[1] = param.value1;
                        }
                    })
                }
            })
        });

        params.scene.add(gltf1.scene);
    })

}


/**
 * 实现全景看房
 * @param {*} params 
 */
import RoomShapeMesh from "../Wall/RoomShapeMesh";
import WallShaderMaterial from "../Wall/WallShaderMaterial";
import Wall from "../Wall/Wall";
import CityArea from "../City/CityArea";


export function initUseVRRoom(params = {}) {
    // 加载全景图
    const loader = new THREE.TextureLoader();
    const texture = loader.load("./assets/HdrSkyCloudy004_JPG_8K.jpg");
    texture.mapping = THREE.EquirectangularReflectionMapping;
    params.scene.background = texture;
    params.scene.environment = texture;

    // 加载json 文件
    let idToPanorama = {};
    let jsonUrl = "https://test-1251830808.cos.ap-guangzhou.myqcloud.com/three_course/demo720.json";

    fetch("./Json/demo720.json").then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    }).then(res => {
        console.log('加载的Json数据:', res);

        /**
         * cameraLocation
         * housePic
         * objData->roomList,->walls
         * panoramaLocation
         * segments
         * wallRelation
         */
        // 循环创建房间
        for (let i = 0; i < res.objData.roomList.length; i++) {
            // 获取房间数据
            const room = res.objData.roomList[i];// 得到房间列表
            let roomMesh = new RoomShapeMesh(room);// 
            /**
             * areas:
             * roomId:
             * roomName:
             * usageId:2
             */
            let roomMesh2 = new RoomShapeMesh(room, true);
            params.scene.add(roomMesh, roomMesh2);

            // 得到全景锚点
            let panoramaLocation = res.panoramaLocation;

            // 房间到全景图的映射
            for (let j = 0; j < res.panoramaLocation.length; j++) {
                const panorama = res.panoramaLocation[j];
                if (panorama.roomId === room.roomId) {
                    // 表示属于这个房间
                    let material = false ? new WallShaderMaterial(panorama) : new WallShaderMaterial(panorama);
                    /** panoramaLocation=[]
                     * {
                     * hole
                     * point
                     * roomId
                     * roomName
                     * roomOldUsageName
                     * roomUsageName
                     * usageId
                     * }
                     */

                    panorama.material = material;
                    idToPanorama[room.roomId] = panorama;
                }
            }
            // 
            roomMesh.material = idToPanorama[room.roomId].material;
            roomMesh.material.side = THREE.DoubleSide;
            roomMesh2.material = idToPanorama[room.roomId].material.clone();
            roomMesh2.material.side = THREE.FrontSide;


        }

        // 创建墙
        for (let i = 0; i < res.wallRelation.length; i++) {
            let wallPoints = res.wallRelation[i].wallPoints;
            let faceRelation = res.wallRelation[i].faceRelation;

            faceRelation.forEach((item) => {
                item.panorama = idToPanorama[item.roomId];
            });

            let mesh = new Wall(wallPoints, faceRelation);
            params.scene.add(mesh);

        }

    });

    let roomIndex = 0;
    let timeline = gsap.timeline();
    let dir = new THREE.Vector3();
    let panoramaLocation;

    function changeRoom() {
        let room = panoramaLocation[roomIndex];
        dir = params.camera.position.clone().sub(new THREE.Vector3(room.point[0].x / 100, room.point[0].z / 100, room.point[0].y / 100)).normalize();

        timeline.to(params.camera.position, {
            duration: 1,
            x: room.point[0].x / 100 + dir.x * 0.01,
            y: room.point[0].z / 100,
            z: room.point[0].y / 100 + dir.z * 0.01
        });

        params.camera.lookAt(room.point[0].x / 100, room.point[0].z / 100, room.point[0].y / 100);

        params.controls.target.set(room.point[0].x / 100, room.point[0].z / 100, room.point[0].y / 100);
        roomIndex++;
        if (roomIndex >= panoramaLocation.length) {
            roomIndex = 0;
        }
    }

}

/**
 * 智慧城市
 * @param {*} options 
 */
export function initUseSmartCity(options = {}) {
    const city = new City(options);

    //new CityArea();
}

/**
 * 骨骼动画
 * @param {*} options 
 */
export function initBoneAnimation(options = {}) {
    // 添加hdr 环境纹理
    const loader = new RGBELoader();
    loader.load("./textures/Dosch-Space_0026_4k.hdr", (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        options.scene.background = texture;
        options.scene.environment = texture;
    });

    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load("./textures/cloth_pos.png");
    const normalMap = textureLoader.load("./textures/cloth_norm.png");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(0.2, 0.2);

    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(0.2, 0.2);
    texture.offset.set(0, 0);


    gsap.to(texture.offset, {
        x: 1, y: 1, duration: 1,
        repeat: -1,
        onUpdate: function () {
            texture.needsUpdate = true;
        },
    });

    // 加载压缩模型
    let material = null;
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./draco/gltf/");
    dracoLoader.setDecoderConfig({ type: "js" });
    dracoLoader.preload();
    gltfLoader.setDRACOLoader(dracoLoader);
    let mixer;
    gltfLoader.load("./model/jianshen-min.glb", (gltf) => {
        options.scene.add(gltf.scene);

        gltf.scene.traverse((child) => {
            if (child.name == "Body") {

            }
            if (child.name == "Floor") {
                child.material = new THREE.MeshStandardMaterial({
                    color: 0xffdcdd,
                });

            }

            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    map: texture,
                    emissiveMap: texture,
                    side: THREE.DoubleSide,
                    emissiveIntensity: 2.,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    normalMap: normalMap,
                });
            }
        });

        // 设置动画
        mixer = new THREE.AnimationMixer(gltf.scene);
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
        action.timeScale = 4;

        // 添加平行光
        const light = new THREE.DirectionalLight(0xffeded, 1.2);
        light.position.set(0, 100, -100);
        options.scene.add(light);

        // 添加点光源
        const pointLight = new THREE.PointLight(0xfedecc, 10.0);
        pointLight.position.set(0, 100, 100);

        // 创建一个金属球
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        material = new THREE.MeshStandardMaterial({
            color: 0xfefefd,
            metalness: 0.5,
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(-2, 0, 0);
        options.scene.add(sphere);

        return { mixer: mixer };

    });


}
