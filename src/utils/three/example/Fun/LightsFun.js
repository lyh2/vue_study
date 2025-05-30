import * as THREE from "three";
//import { texture, equirectUV } from "three/nodes";
//import * as Nodes from "three/nodes";

//import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
//import WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";
import * as CANNON from "cannon-es";

import * as TWEEN from "three/examples/jsm/libs/tween.module";

import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {GUI} from "three/examples/jsm/libs/lil-gui.module.min";

/**
 * 使用canvas 创建图片
 */
function createImageUseCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    // 获取上下文
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return canvas;
}
/**
 * 使用canvas 绘制纹理
 */
export function initUseCanvas(params = {}) {
    const geometry = new THREE.SphereGeometry(2, Math.random() * 64, Math.random() * 32);
    const texture = new THREE.CanvasTexture(createImageUseCanvas());
    const sphereMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        color: Math.random() * 0xffffff,
    });
    const sphere = new THREE.Mesh(geometry, sphereMaterial);
    sphere.name = "使用Canvas创建的纹理球体";
    params.scene.add(sphere);


    for (let i = 0; i < 50; i++) {
        // 每一个三角形 需要3个顶点，每个顶点需要3个值
        const geometry = new THREE.BufferGeometry();
        const positionArray = new Float32Array(9);
        for (let j = 0; j < 9; j++) {
            positionArray[j] = Math.random() * 10 - 5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
        let color = new THREE.Color(Math.random(), Math.random(), Math.random());
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        params.scene.add(mesh);
    }


    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    const textureMin = textureLoader.load("./textures/minecraft.png");
    const doorTexture = textureLoader.load("./textures/map.png");
    const doorAlphaTexture = textureLoader.load("./textures/door/alpha.jpg");
    const doorAoTexture = textureLoader.load("./textures/door/ambientOcclusion.jpg");
    const doorDisplacementTexture = textureLoader.load("./textures/door/height.jpg");


    const cubeGeometry = new THREE.BoxGeometry(3, 3, 3);
    const basicMaterial = new THREE.MeshBasicMaterial({
        color: "#ffff00",
        map: textureMin,
    });
    const cube = new THREE.Mesh(cubeGeometry, basicMaterial);
    params.scene.add(cube);
    cube.position.set(10 - Math.random() * 10, 10 - Math.random() * 10, 0);

    // 设置纹理偏移
    doorTexture.offset.x = 0.85; // 表示从纹理的0.85 处开始
    doorTexture.offset.y = 0.85; // Y轴从0.85 开始
    doorTexture.center.set(0.5, 0.5);
    doorTexture.rotation = Math.PI / 4;
    // 设置纹理重复
    doorTexture.repeat.set(2, 3);
    doorTexture.wrapS = THREE.MirroredRepeatWrapping;
    doorTexture.wrapT = THREE.RepeatWrapping;
    doorTexture.minFilter = THREE.LinearFilter;
    doorTexture.magFilter = THREE.LinearFilter;
    //doorTexture.magFilter = THREE.LinearMipmapNearestFilter;

    const doorMaterial = new THREE.MeshStandardMaterial({
        color: "#ffddcc",
        map: doorTexture,
        transparent: true,
        aoMap: doorAoTexture,
        aoMapIntensity: 2,
        alphaMap: doorAlphaTexture,
        displacementMap: doorDisplacementTexture,
        displacementScale: 0.41,
        opacity: 0.3,

    });
    const cubeMesh = new THREE.Mesh(cubeGeometry, doorMaterial);
    cubeMesh.position.set(10 - Math.random() * 10, 10 - Math.random() * 10, 10 - Math.random() * 10);
    cubeGeometry.setAttribute('vu2', new THREE.BufferAttribute(cubeGeometry.attributes.uv.array, 2));
    params.scene.add(cubeMesh);
}

/**
 * 
 * @param {*} params 
 */
export function initUsePoint(params = {}) {
    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    const particlesTexture = textureLoader.load("./textures/particles/1.png");

    const param = {
        count: 20000, // 粒子个数
        size: 0.5, //粒子大小
        radius: 10, // 粒子围绕的半径值
        branch: 3, // 树枝、分支
        color: "#556B2F",// 开始颜色
        rotateScale: 0.3,
        endColor: "#FF00FF",

    };
    let geometry = null;
    let material = null;
    let points = null;
    const centerColor = new THREE.Color(param.color);
    const endColor = new THREE.Color(param.endColor);
    const clock = new THREE.Clock();

    const generateGalaxy = () => {
        geometry = new THREE.BufferGeometry();
        // 随机生成位置
        const positions = new Float32Array(param.count * 3);
        const colors = new Float32Array(param.count * 3);

        for (let i = 0; i < param.count; i++) {
            // 当前点应该在那一条分支的角度上 (2 * Math.PI) / param.branch 表示每个分支多少度，在圆平面上等分为3份
            // 每份就是120度，根据分支的索引可以把全部粒子分散在0°，120°，360°上面
            const branchAngel = (i % param.branch) * ((2 * Math.PI) / param.branch);
            // 当前点距离圆心的距离
            const distance = Math.random() * param.radius;//* Math.pow(Math.random(),3);
            const current = i * 3;
            //  Math.random() * 2 - 1 取值[-1,1]
            const randomX = (Math.pow(Math.random() * 2 - 1, 3) * clock.getElapsedTime() * (param.radius - distance)) / 5;
            const randomY = (Math.pow(Math.random() * 2 - 1, 3) * (param.radius - distance)) / 5;
            const randomZ = (Math.pow(Math.random() * 2 - 1, 3) * clock.getDelta() * (param.radius - distance)) / 5;

            positions[current] = Math.cos(branchAngel + distance * param.rotateScale) * distance + randomX;
            positions[current + 1] = 0 + randomY;
            positions[current + 2] = Math.sin(branchAngel + distance * param.rotateScale) * distance + randomZ;
            // 混合颜色，形成渐进色
            const mixColor = centerColor.clone();
            mixColor.lerp(endColor, distance / param.radius);

            colors[current] = mixColor.r;
            colors[current + 1] = mixColor.g;
            colors[current + 2] = mixColor.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        material = new THREE.PointsMaterial({
            size: param.size,
            sizeAttenuation: true,
            depthWrite: true,
            blending: THREE.AdditiveBlending,
            map: particlesTexture,
            alphaMap: particlesTexture,
            transparent: true,
            vertexColors: true,
        });

        points = new THREE.Points(geometry, material);
        params.scene.add(points);
        points.position.set(5, 0, 0);
    }


    generateGalaxy();

    params.renderer.shadowMap.enabled = true;
}

export function initUseSphereDelUv(params = {}) {
    // 创建球几何体
    const sphereGeometry = new THREE.SphereGeometry(3, 30, 30);
    delete sphereGeometry.attributes.uv;
    const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
    });
    const mesh = new THREE.Mesh(sphereGeometry, material);
    params.scene.add(mesh);

    const pointsMaterial = new THREE.PointsMaterial();
    pointsMaterial.size = 0.2;
    pointsMaterial.color.set(0xff0000);
    pointsMaterial.sizeAttenuation = true;

    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load("./textures/particles/2.png");
    // 设置材质纹理
    pointsMaterial.map = texture;
    //pointsMaterial.alphaMap = texture;
    pointsMaterial.transparent = true;
    pointsMaterial.depthWrite = true;
    pointsMaterial.blending = THREE.AdditiveBlending;

    const points = new THREE.Points(sphereGeometry, pointsMaterial);

    params.scene.add(points);

    points.position.set(4, 0, 0);

}

export function initUsePoints(params = {}) {
    const geometry = new THREE.BufferGeometry();
    const count = 500;
    let positions = new Float32Array(count * 3);
    let colors = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 100;
        colors[i] = Math.random();
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // 设置材质
    const pointsMaterial = new THREE.PointsMaterial();
    pointsMaterial.size = 1.5;
    pointsMaterial.color.set(0xFF0000);
    pointsMaterial.sizeAttenuation = true;

    // 加载纹理
    const loader = new THREE.TextureLoader();
    const texture = loader.load("./textures/xmas.jpg");
    pointsMaterial.map = texture;
    pointsMaterial.alphaMap = texture;
    pointsMaterial.transparent = true;
    pointsMaterial.depthWrite = false;
    pointsMaterial.alphaTest = 0.1;
    pointsMaterial.blending = THREE.AdditiveBlending;
    pointsMaterial.blending = THREE.MultiplyBlending;
    pointsMaterial.blending = THREE.SubtractiveBlending;
    pointsMaterial.blendEquation = THREE.EqualCompare;
    pointsMaterial.blendAlpha = THREE.AddOperation;
    pointsMaterial.blendDstAlpha = THREE.ZeroStencilOp;

    pointsMaterial.vertexColors = false;

    const points = new THREE.Points(geometry, pointsMaterial);

    params.scene.add(points);
    params.renderer.shadowMap.enabled = true;

    // 使用gpu 程序化节点 创建粒子效果
    console.log(Nodes)
}

//Blend混合效果: https://www.andersriggelsen.dk/glblendfunc.php
export function initUseWebGPUNodes(params = {}) {
    if (WebGPU.isAvailable() === false) {
        document.body.appendChild(WebGPU.getErrorMessage());

        throw new Error("No WebGPU support");
    }
}

/**
 * 使用Stencil模版写入操作
 */
export function initUseStencil(params = {}) {
    // 添加半球光
    const hemisphereLight = new THREE.HemisphereLight(0xffddcc, 0x444444);
    hemisphereLight.position.set(0, 200, 0);

    params.scene.add(hemisphereLight);

    // 添加平行光
    const directionalLight = new THREE.DirectionalLight(0xff0000, 1.);
    directionalLight.position.set(0, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 180;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.left = -120;
    directionalLight.shadow.camera.right = 120;
    params.scene.add(directionalLight);

    // 添加地面
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshPhongMaterial({ color: 0xaaaaaa, depthWrite: false })
    );

    ground.rotation.x = - Math.PI / 2;
    ground.receiveShadow = true;
    params.scene.add(ground);

    const grid = new THREE.GridHelper(20, 10, 0x000111, 0xffdd22);
    grid.material.opacity = 0.8;
    grid.material.transparent = true;
    params.scene.add(grid);

    // 创建圆柱体
    const boxHole = new THREE.CylinderGeometry(15, 15, 65, 32, 32);
    let materialHole = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
    });
    materialHole.colorWrite = false;// 开启这个颜色写入，那么这个圆柱体就会有颜色
    let meshHole = new THREE.Mesh(boxHole, materialHole);
    meshHole.castShadow = true;
    meshHole.position.y = 50;
    meshHole.rotation.x = Math.PI / 2;
    //params.scene.add(meshHole);

    // 创建立方体
    const geometry = new THREE.BoxGeometry(50, 50, 50);
    let material = new THREE.MeshPhongMaterial({
        color: 0xadadad,
    });
    let mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.y = 50;
    params.scene.add(mesh);

    // 背面材质
    const materialBackFace = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
    });
    materialBackFace.side = THREE.FrontSide;
    materialBackFace.depthWrite = true;
    materialBackFace.depthTest = true;
    materialBackFace.colorWrite = false;
    materialBackFace.stencilWrite = true; //------
    materialBackFace.stencilFunc = THREE.AlwaysStencilFunc;
    materialBackFace.stencilFail = THREE.KeepStencilOp;
    materialBackFace.stencilZFail = THREE.IncrementStencilOp;
    materialBackFace.stencilZPass = THREE.ReplaceStencilOp;
    materialBackFace.stencilRef = 1;
    // 第二个圆柱体
    const boxHole0 = new THREE.CylinderGeometry(15, 15, 65, 32, 32);
    let mesh0 = new THREE.Mesh(boxHole0, materialBackFace);
    mesh0.rotation.x = Math.PI / 2;
    mesh0.castShadow = true;
    mesh0.position.y = 50;
    //mesh0.position.x = 50;
    params.scene.add(mesh0);

    // 前面
    const mat1 = new THREE.MeshPhongMaterial({ color: 0xffdd00 });
    mat1.side = THREE.DoubleSide;
    mat1.depthWrite = false;
    mat1.depthTest = true;
    mat1.colorWrite = true;
    mat1.stencilWrite = true;
    mat1.depthFunc = THREE.AlwaysDepth;
    mat1.stencilFunc = THREE.EqualStencilFunc;
    mat1.stencilFail = THREE.IncrementStencilOp;
    mat1.stencilZFail = THREE.DecrementStencilOp;
    mat1.stencilZPass = THREE.DecrementStencilOp;
    mat1.stencilRef = 1;

    const boxHole1 = new THREE.CylinderGeometry(15, 15, 65, 32, 32, true);
    let mesh1 = new THREE.Mesh(boxHole1, mat1);
    //mesh1.rotation.x = Math.PI / 2;
    mesh1.castShadow = true;
    mesh1.position.z = 0;
    mesh1.position.y = 50;
    params.scene.add(mesh1);

    params.renderer.shadowMap.enabled = true;
    //params.renderer.localClippingEnabled = true;

    params.scene.background = new THREE.Color(0xd000000);
    params.camera.position.set(0, 80, 80);

    params.camera.lookAt(mesh.position);


}

/**
 * 简单stencil测试 
 * @param {*} params 
 */
export function initUseStencilTest(params = {}) {
    // 首先创建一个黑色的平面
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
        transparent:true,
        alphaTest:true,
        // stencilWrite: true,
        // stencilRef: 1,
        // stencilFunc: THREE.NotEqualStencilFunc,// 表示大于当前设置的模版值，
    
    });
    let plane = new THREE.Mesh(planeGeometry, planeMaterial);
    //plane.rotateX(- Math.PI / 2);
    //plane.rotation.x = - Math.PI /8;
    plane.position.y = 5;
    plane.position.z = 1.2;
    // 开启stencil 测试
    planeMaterial.stencilWrite = true;
    planeMaterial.stencilRef = 1;
    planeMaterial.stencilFunc = THREE.NotEqualStencilFunc;// 表示大于当前设置的模版值，
    
    // //planeMaterial.stencilFail = THREE.KeepStencilOp;// 比较失败的，依然显示
    //planeMaterial.stencilZPass = THREE.ReplaceStencilOp;
    // planeMaterial.stencilZFail = THREE.ReplaceStencilOp;
    

    

    // 创建一个立方体
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
    let boxMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide
    });

    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    params.scene.add(box);
    box.position.set(0, 1, 0);

    // 使用第二种材质开启stencil 测试
    let boxMaterialStencil = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        transparent:true,
        opacity:0.8,
        stencilWrite:true,
        stencilRef:1,
        stencilZPass:THREE.ReplaceStencilOp,
    });
    // boxMaterialStencil.depthWrite = true;
    // boxMaterialStencil.depthTest = true;
    // boxMaterialStencil.depthFunc = THREE.LessDepth;

    //boxMaterialStencil.stencilWrite = true;
    //boxMaterialStencil.stencilRef = 1;
    //boxMaterialStencil.stencilFunc = THREE.EqualStencilFunc;
    //boxMaterialStencil.stencilFail = THREE.ReplaceStencilOp;
    //boxMaterialStencil.stencilZFail = THREE.ReplaceStencilOp;
    //boxMaterialStencil.stencilZPass = THREE.ReplaceStencilOp; 

    const boxStencil = new THREE.Mesh(boxGeometry, boxMaterialStencil);
    boxStencil.position.set(3, 1, 0);
    params.scene.add(boxStencil);
    //boxStencil.renderOrder = 2;
    params.scene.add(plane);
    plane.renderOrder = 2;



    boxStencil.onAfterRender((_renderer, _scene, _camera) => {
        //_renderer.clearStencil();

    })


    // 创建绿色立方体
    const boxGeometry2 = new THREE.BoxGeometry(2, 2, 2);
    const boxMaterial2 = new THREE.MeshPhongMaterial({
        transparent: true,
        color: '#00ff00',
        opacity: 1.,
        stencilWrite: true,
        stencilRef: 1,
        stencilZPass: THREE.ReplaceStencilOp
    });
    const boxMesh2 = new THREE.Mesh(boxGeometry2, boxMaterial2);
    params.scene.add(boxMesh2);
    boxMesh2.position.set(8, 3, 0);

    // 创建大一点的黄色立方体
    const maskMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        color: '#ffff00',
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.NotEqualStencilFunc,
        //stencilZPass:THREE.IncrementWrapStencilOp,
    });
    let maskMesh = new THREE.Mesh(boxGeometry2, maskMaterial);
    maskMesh.position.copy(boxMesh2.position);
    maskMesh.scale.set(1.1, 1.1, 1.1);
    maskMesh.renderOrder = 1;
    params.scene.add(maskMesh);
    maskMesh.onBeforeRender = ((_renderer,_scene,_camera)=>{
        // 在渲染绿色box 之前，清除深度缓存+模板缓冲
        //_renderer.clearStencil(); // 执行这个方法将只绘制大的黄色几何体对象，因为已经清除了之前的模版缓存
        //_renderer.clearDepth();
        //_renderer.clearColor();
        //console.log(_renderer)
    })
}

/**
 * 满天的粒子
 * @param {*} params 
 */
export function initPoints(params={}){
    const points = createPoints("1",1.5);
    const points1 = createPoints("xh",1);
    const points2 = createPoints("xh",2);

    params.scene.add(points);
    params.scene.add(points1);
    params.scene.add(points2);

}
/**
 * 创建粒子
 * @param {*} url 
 * @param {*} size 
 */
function createPoints(url,size = 0.5){
    const particleGeometry = new THREE.BufferGeometry();
    const count = 10000;
    // 设置缓冲区
    const positions = new Float32Array(count * 3);
    // 设置粒子颜色
    const colors = new Float32Array(count * 3);
    // 设置定点
    for(let i =0; i < count * 3;i++){
        positions[i] = (Math.random() - 0.5) * 100;
        colors[i] = Math.random();
    }

    particleGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    particleGeometry.setAttribute("color",new THREE.BufferAttribute(colors,3));

    // 设置顶点的材质
    const pointsMaterial = new THREE.PointsMaterial();
    pointsMaterial.size = 0.5;
    pointsMaterial.color.set(0xfff000);
    pointsMaterial.sizeAttenuation = true;

    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(`./textures/particles/${url}.png`);
    // 设置点材质的纹理
    pointsMaterial.map = texture;
    pointsMaterial.alphaMap = texture;
    pointsMaterial.transparent = true;
    pointsMaterial.depthWrite = false;// 
    pointsMaterial.blending = THREE.AdditiveBlending;

    // 设置定点颜色
    pointsMaterial.vertexColors = true;

    const points = new THREE.Points(particleGeometry,pointsMaterial);


    return points;
}

/**
 * 使用物理引擎cannon-es
 * @param {*} params 
 */
export function initUseCannon(params={}){
    const cubeArr =[];
    // 设置物体的材质
    const cubeWorldMaterial = new CANNON.Material("Cube");

    // 创建物理世界
    const world = new CANNON.World();
    world.gravity.set(0,-9.8,0);
    // 添加点击事件
    params.cubeWorldMaterial = cubeWorldMaterial;
    params.world = world;
    params.cubeArr = cubeArr;
    params.hitSound = new Audio("./audio/metalHit.mp3");
    params.dom.addEventListener("click",()=>{
        createCube(params);
    });

    // 添加一个平面
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20,20),
        new THREE.MeshStandardMaterial()
    );
    floor.position.set(0,-5,0);
    floor.rotation.x = - Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "floor";
    params.scene.add(floor);
    // 创建对应的物理世界平面
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body();
    const floorMaterial = new CANNON.Material("floor");
    floorBody.material = floorMaterial;
    floorBody.mass = 0;
    floorBody.addShape(floorShape);
    floorBody.position.set(0,-5,0);
    // 地面旋转
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI / 2);
    world.addBody(floorBody);

    // 设置2种 材质的碰撞系数
    const defaultContactMaterial = new CANNON.ContactMaterial(cubeWorldMaterial,floorMaterial,{
        friction:0.1,
        restitution:0.7
    });

    world.addContactMaterial(defaultContactMaterial);
    world.defaultContactMaterial = defaultContactMaterial;



    return params;
}

/**
 * 创建Cube
 */
function createCube(params={}){
    //console.log('点击事件.....');
    // 创建立方体和平面
    const cubeGeometry  = new THREE.BoxGeometry(1,1,1);
    const cubeMaterial = new THREE.MeshStandardMaterial();
    const cube = new THREE.Mesh(cubeGeometry,cubeMaterial);
    cube.castShadow = true;
    params.scene.add(cube);
    cube.position.set(10 -Math.random() * 5,10 * Math.random() + 2,10  - Math.random() * 5);

    // 创建物理世界的物体
    const cubeShape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
    // 创建body
    const cubeBody = new CANNON.Body({
        shape:cubeShape,
        position:new CANNON.Vec3(0,0,0),
        mass:1,// 设置质量
        material:params.cubeWorldMaterial,
    });
    // 给物体施加一个力
    cubeBody.applyLocalForce(new CANNON.Vec3(300,0,0),new CANNON.Vec3(0,0,0));
    params.world.addBody(cubeBody);
    cubeBody.addEventListener("collide",HitEvent);// 给世界物体添加碰撞事件
    function HitEvent(e){
        // 碰撞事件
        console.log('碰撞世界:',e);
        const impactStrength = e.contact.getImpactVelocityAlongNormal();
        console.log('impactStrength:',impactStrength);
        if(impactStrength > 2){
            // 重新从零开始播放
            //console.log(22,params.hitSound)
            params.hitSound.currentTime = 0;
            params.hitSound.volume = impactStrength / 12;
            params.hitSound.play();
        }
    }
    params.cubeArr.push({mesh:cube,body:cubeBody});

    return {mesh:cube,body:cubeBody};
}

// 保龄球：https://www.zhihu.com/tardis/bd/art/588921179?source_id=1001
// cannon 碰撞： https://blog.csdn.net/u014291990/article/details/135268846
// 图片处理： https://www.51cto.com/article/701498.html
// 图片处理：https://gitcode.com/ChrisCindy/wx-caman/tree/master

/**
 * 着色器编程
 * @param {*} params 
 */
import basicVertexShader from "../Shader/Raw/vertex.glsl";
import basicFragmentShader from "../Shader/Raw/fragment.glsl";

export function initUseShader(params={}){
    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load("./texture/colors.png");
    const param = {
        uFrequency:10,
        uScale:0.1,
    };

    // 创建原始材质，需要自己传递参数
    let rawShaderMaterial = new THREE.RawShaderMaterial({
        vertexShader:basicVertexShader,
        fragmentShader:basicFragmentShader,
        side:THREE.DoubleSide,
        uniforms:{
            uTime:{
                value:0,
            },
            uTexture:{
                value:texture,
            }
        },
        //vertexColors:true,
        //color:new THREE.Color(0xff00dd),
    });

    // 修改平面的材质
    let floor = params.scene.getObjectByName("floor");
    floor.material = rawShaderMaterial;
    floor.needsUpdate = true;
    rawShaderMaterial.needsUpdate = true;
    //console.log(2,floor);
    //console.log(TWEEN);

    let sphereGeometry = new THREE.SphereGeometry(3.2);
    let sphere = new THREE.Mesh(sphereGeometry,rawShaderMaterial);
    params.scene.add(sphere);
    //sphere.position.set(-3,2,2);


}

import { Water } from "three/examples/jsm/objects/Water.js";
import { Water as Water2 } from "three/examples/jsm/objects/Water2.js";
/**
 * 
 * @param {*} params 
 */
export function initUseWater(params={}){
    // 加载water 
    const water = new Water2(new THREE.PlaneGeometry(10,10,1024 * 2,1024 * 2),{
        color:new THREE.Color(0xdddd00),
        textureWidth:512,
        textureHeight:512,
        clipBias:0.1, // 偏移值
        flowDirection:new THREE.Vector2(1,1),
        flowSpeed:0.14,
        reflectivity:0.02,
        scale:1,
        //shader:Water.WaterShader,
        flowMap:"",// 纹理
        normalMap0:"",// 法线贴图
        normalMap1:"",// 法线贴图
    });
    water.rotation.x = - Math.PI / 2;
    params.scene.add(water);
}

/**
 * 把水放入浴缸
 * @param {*} params 
 */
export function initUseWaterInYuGuang(params={}){
    // 加载背景 
    const rgbeLoader = new RGBELoader();
    rgbeLoader.loadAsync("./050.hdr").then(texture=>{
        texture.mapping = THREE.EquirectangularReflectionMapping;
        params.scene.background = texture;
        params.scene.environment = texture;
    });

    // 加载纹理
    const loader = new THREE.TextureLoader();
    const waterNormals = loader.load("./textures/water/Water_1_M_Normal.jpg");
    // 加载模型
    const gltfLoader = new GLTFLoader();
    gltfLoader.load("./model/yugang.glb",(gltf)=>{
        const yugang = gltf.scene.children[0];
        yugang.material.side = THREE.DoubleSide;

        const waterGeometry = gltf.scene.children[1].geometry;
        // 使用第一种water
        const water = new Water(waterGeometry,{
            textureWidth:1024,
            textureHeight:1024,
            clipBias:0.01,
            alpha:0.8,
            time:params.clock.getDelta(),
            waterNormals: waterNormals,//normalSampler
            sunDirection:new THREE.Vector3(10,10,0),
            sunColor:new THREE.Color(0xff0000),
            waterColor:new THREE.Color(0x123321),
            eye:new THREE.Vector3(0,4,4),
            distortionScale:20,
            side:THREE.DoubleSide,
            fog:new THREE.Fog(0xdfdcd,10,100)
        });
        params.scene.add(water);
        // 第二种water
        const water2 = new Water2(waterGeometry,{
            color:"#ffff00",
            scale:1,
            clipBias:0.005,
            flowDirection:new THREE.Vector2(1,1),
            textureWidth:1024,
            textureHeight:1024
        });
        //params.scene.add(water2);
        params.scene.add(yugang);
    });
}

import vertexShaderCode from "../Shader/Smooke/vertex.glsl";
import fragmentShaderCode from "../Shader/Smooke/fragment.glsl";
/**
 * 实现烟雾效果
 * @param {*} params 
 */
export function initUseFireEffect(params={}){
    // 输出TWEEN 模块
    //console.log('TWEEN:',TWEEN);

    // 效果参数
    const param = {
        uWaresFrequency:14,
        uScale:0.03,
        
        uXzScale:1.5,
        uNoiseFrequency:10,
        uNoiseScale:1.5,
        uLowColor:"#ff0000",
        uHighColor:"#000012",
        uXspeed:1,
        uZspeed:1,
        uNoiseSpeed:1,
        uOpacity:1,

    };

    // 创建材质
    const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader:vertexShaderCode,
        fragmentShader:fragmentShaderCode,
        side:THREE.DoubleSide,
        uniforms:{
            uWaresFrequency:{
                value:param.uWaresFrequency,
            },
            uScale:{
                value:param.uScale,
            },
            uNoiseFrequency:{
                value:param.uNoiseFrequency,
            },
            uNoiseScale:{
                value:param.uNoiseScale,
            },
            uXzScale:{
                value:param.uXzScale,
            },
            uTime:{
                value:0
            },
            uLowColor:{
                value:new THREE.Color(param.uLowColor)
            },
            uHighColor:{
                value:new THREE.Color(param.uHighColor)
            },
            uXspeed:{
                value:param.uXspeed
            },
            uZspeed:{
                value:param.uZspeed
            },
            uNoiseSpeed:{
                value:param.uNoiseSpeed,
            },
            uOpacity:{
                value:param.uOpacity
            }
        },
        transparent:true,
    });
    const gui = new GUI();
    gui.add(param,"uWaresFrequency").min(1).max(100).step(0.01).onChange(value=>{
        shaderMaterial.uniforms.uWaresFrequency.value = value;
    });

    gui.add(param,"uScale").min(0).max(10).step(0.1).onChange(val=>{
        shaderMaterial.uniforms.uScale.value = val;
    });

    gui.add(param,'uNoiseFrequency').min(1).max(100).step(0.1).onChange(val=>{
        shaderMaterial.uniforms.uNoiseFrequency.value = val;
    });
    gui.add(param,"uNoiseScale").min(0).max(10).step(0.001).onChange(val=>{
        shaderMaterial.uniforms.uNoiseScale.value = val;
    });
    gui.add(param,"uNoiseSpeed").min(0).max(10).step(0.01).onChange(val=>{
        shaderMaterial.uniforms.uNoiseSpeed.value = val;
    })
    gui.add(param,"uXzScale").min(0).max(10).step(0.1).onChange(val=>{
        shaderMaterial.uniforms.uXzScale.value = val;
    });

    gui.addColor(param,"uLowColor").onFinishChange(val=>{
        shaderMaterial.uniforms.uLowColor.value = new THREE.Color(val);
    });

    gui.addColor(param,"uHighColor").onFinishChange(val=>{
        shaderMaterial.uniforms.uHighColor.value = new THREE.Color(val);
    });

    gui.add(param,'uXspeed').min(0).max(10).step(0.01).onChange(val=>{
        shaderMaterial.uniforms.uXspeed.value = val;
    });

    gui.add(param,"uZspeed").min(0).max(10).step(0.001).onChange(val=>{
        shaderMaterial.uniforms.uZspeed.value = val;
    });

    gui.add(param,'uOpacity').min(0).max(10).step(0.01).onChange(val=>{
        shaderMaterial.uniforms.uOpacity.value = val;
    });

    // 创建一个平面
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1,1,1024,1024),shaderMaterial);
    plane.rotation.x = - Math.PI / 2;
    params.scene.add(plane);

    params.shaderMaterial =  shaderMaterial;
    const _tween =new TWEEN.Tween(shaderMaterial.uniforms.uTime);
    _tween.to({value:10},10000).repeat(Infinity).start();
    return shaderMaterial;
}

import vertexShaderPoint from "../Shader/Points/vertex.glsl";
import fragmentShaderPoint from "../Shader/Points/fragment.glsl";

import vertexShader__ from "../Shader/Smooke/vertexShader__.glsl";
import fragmentShader__ from "../Shader/Smooke/fragmentShader__.glsl";
/**
 * shader 实现粒子效果
 * @param {*} params 
 */
export function initUseParticle(params={}){
    // 点材质
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([0,2,0]);
    geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));

    // 
    const pointsMaterial = new THREE.PointsMaterial({
        color:0xffdd00,
        size:10,
        sizeAttenuation:true,// 根据距离进行衰减
    });

    //const points = new THREE.Points(geometry,pointsMaterial);
    //params.scene.add(points);

    // 加载纹理
    const loader = new THREE.TextureLoader();
    const texture = loader.load("./textures/particles/10.png");
    const _texture_1 = loader.load("./textures/particles/9.png");
    const _texture_2 = loader.load("./textures/particles/11.png");

    // 点着色器材质
    const pointsShaderMaterial = new THREE.ShaderMaterial({
        uniforms:{
            uTexture:{
                value:texture,
            },
            uTime:{
                value:0,
            }
        },
        vertexShader:vertexShaderPoint,
        fragmentShader:fragmentShaderPoint,
        transparent:true,
        //color:new THREE.Color(0xff0000),
        //blending:THREE.AdditiveBlending,
    });
    const geometry_ = new THREE.BufferGeometry();
    const positions_ = new Float32Array([3,2,0]);
    geometry_.setAttribute("position",new THREE.BufferAttribute(positions_,3));

    const colors_ = new Float32Array([Math.random(),Math.random(),Math.random()]);
    geometry_.setAttribute("color",new THREE.BufferAttribute(colors_,3));

    //const  points_ = new THREE.Points(geometry_,pointsShaderMaterial);
    //params.scene.add(points_);
    //points_.position.set(2.5,2,0);
    //console.log(points_);

    const _tween = new TWEEN.Tween(pointsShaderMaterial.uniforms.uTime).to({value:10},10000).repeat(Infinity).start();

    let geometry__ = null;
    let points__ = null;
    // 切换纹理
    const param ={
        count:1000,
        size:0.1,
        radius:5,
        branches:4,// 分支
        spin:0.5,
        color:"#000000",
        outColor:"#ffffff",
    };
    let galaxyColor = new THREE.Color(param.color);
    let outGalaxyColor = new THREE.Color(param.outColor);
    let material__ = null;

    const generateGalaxy =()=>{
        // 存在点 先删除
        if(points__ !== null){
            geometry__.dispose();
            material__.dispose();
            param.scene.remove(points__);
        };

        // 首先生成顶点数据
        geometry__ = new THREE.BufferGeometry();
        // 随机生成位置
        const positions__ = new Float32Array(param.count * 3);
        const colors__ = new Float32Array(param.count * 3);
        const scales__ = new Float32Array(param.count );

        const imgIndex = new Float32Array(param.count);

        for(let i =0; i < param.count;i++){
            const current = i * 3;
            // 根据分支的个数 计算每个分支的角度
            const branchAngle = (i % param.branches) * ( (2 * Math.PI) / param.branches);
            const radius = Math.random() * param.radius;
            // 距离圆心越远，旋转的角度越大
            const spinAngle = radius * param.spin;

            const randomX = Math.pow(Math.random() * 2 -1,3) * 0.5 * (param.radius - radius) * 0.3;
            const randomY = Math.sin(Math.random() * 2 - 1) * 0.5 * (param.radius - radius) * 0.3;
            const randomZ = Math.pow(Math.random() * 2 - 1,4) * 0.5 * (param.radius - radius) * 0.3;

            positions__[current] = Math.cos(branchAngle) * radius + randomX;
            positions__[current+1] = randomY;
            positions__[current + 2] = Math.sin(branchAngle) * radius + randomZ;

            const mixColor = galaxyColor.clone();
            let color = new THREE.Color();
            color.lerpColors(galaxyColor,outGalaxyColor,radius/param.radius);
            //console.log(radius/param.radius)
            colors__[current] = 1.;
            colors__[current + 1] = color.g;
            colors__[current + 2] = color.b;

            scales__[current] = Math.random();
            imgIndex[current] = i % 3;
        }

        geometry__.setAttribute("position",new THREE.BufferAttribute(positions__,3));
        geometry__.setAttribute("color",new THREE.BufferAttribute(colors__,3));
        geometry__.setAttribute("aScale",new THREE.BufferAttribute(scales__,1));
        geometry__.setAttribute("aImgIndex",new THREE.BufferAttribute(imgIndex,1));
    }

    generateGalaxy();
    // 设置点材质
    material__ = new THREE.PointsMaterial({
        color:new THREE.Color(0xffddee),
        size:param.size,
        sizeAttenuation:true,
        depthWrite:true,
        blending:THREE.AdditiveBlending,
        map:texture,
        alphaMap:texture,
        transparent:true,
        vertexColors:true,
    });

    //points__ = new THREE.Points(geometry__,material__);
    //params.scene.add(points__);


    // 使用着色器
    material__ = new THREE.ShaderMaterial({
        vertexShader:vertexShader__,
        fragmentShader:fragmentShader__,
        transparent:true,
        vertexColors:true,
        blending:THREE.AdditiveBlending,
        depthWrite:false,

        uniforms:{
            uTime:{
                value:0
            },
            uTexture:{
                value:texture,
            },
            uTexture1:{
                value:_texture_1
            },
            uTexture2:{
                value:_texture_2
            },
            uColor:{
                value:galaxyColor
            }
        }
    });

    points__ = new THREE.Points(geometry__,material__);
    params.scene.add(points__);
    points__.position.set(0,2,0);
    points__.name = "Points__";
    //console.log(params.scene);

    const __tween = new TWEEN.Tween(material__.uniforms.uTime).to({value:10},10000).repeat(Infinity).start();
}