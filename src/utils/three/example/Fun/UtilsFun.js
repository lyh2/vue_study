import * as THREE from 'three';
import GUI from "three/examples/jsm/libs/lil-gui.module.min";

// 导入动画库
import { AnimationClipCreator } from 'three/examples/jsm/Addons.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper';

import { computeMikkTSpaceTangents } from "three/examples/jsm/utils/BufferGeometryUtils";
import { wasm, isReady, ready, generateTangents } from "three/examples/jsm/libs/mikktspace.module";

/**
 * 使用 Earcut.js 对2D 坐标进行三角形刨分，高效的算法 
 */
export function initUseEarcut(params = {}) {
    const sourceArray = [0, 0, 40, 30, 60, 80, 90, 120, 20, 10, -10, 20, -40, 50, -60, 70, 0, 100];
    const result = THREE.Earcut.triangulate(sourceArray);
    console.log('Earcut.triangulate:',result)

    // 创建矩形几何体
    let geometry = new THREE.BufferGeometry();
    let vertices = new Float32Array([
        -1, -1, 0,
        1, -1, 0,
        1, 1, 0,
        -1, 1, 0
    ]);

    vertices = new Float32Array([-10, 0, 10, 0, 14, 20, 12, 12, 0, 10, -10, 8]);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    // 进行三角刨分
    let indices = THREE.Earcut.triangulate(vertices, null, 3);

    // 将三角剖分的索引赋给几何体
    geometry.setIndex(indices);

    // 创建材质
    var material = new THREE.MeshBasicMaterial({
        color: 0x00ff00, wireframe: false,
        side: THREE.DoubleSide
    });
    let mesh = new THREE.Mesh(geometry, material);
    params.scene.add(mesh);
    mesh.position.set(...params.position);
    return mesh;

}

/**
 * 使用PMREMGenerator
 * @param {*} params 
 */
export function initUsePMREMGenerator(params = {}) {
    let generator = new THREE.PMREMGenerator(params.renderer);
    let webglRenderTarget = generator.fromScene(params.scene, 0.01, 0.1, 90);

    let geometry = new THREE.BoxGeometry(1, 1, 1);
    let material = new THREE.MeshBasicMaterial({
        map: webglRenderTarget.texture,
        side: THREE.DoubleSide,
    });

    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...params.position);
    params.scene.add(mesh);
}
/**
 * 使用THREE.Path()
 */
export function initUsePath(params = {}) {
    const path = new THREE.Path();
    path.lineTo(0, 0.8);
    path.quadraticCurveTo(0, 10, 0.2, 10);
    path.lineTo(1, 1);

    console.log('path.currentPoint=', path.currentPoint);
    const points = path.getPoints();

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color: 0xff0000,
        side: THREE.DoubleSide
    });

    const line = new THREE.Line(geometry, material);
    params.scene.add(line);

}

/**
 * 使用Bones 新建骨骼对象实例
 */
let gui, lights, mesh, bones, skeletonHelper, scene;
let state = {
    animateBones: false,// 是否运动
};
export function initUseBones(params = {}) {

    scene = params.scene;
    // 创建gui
    gui = new GUI();

    // 添加灯光
    lights = [];
    lights[0] = new THREE.DirectionalLight(0x00FF7F, 3);
    lights[1] = new THREE.DirectionalLight(0xFFFF00, 3);
    lights[2] = new THREE.DirectionalLight(0xFAF0E6, 3);

    lights[0].position.set(0, 200, 0);
    lights[1].position.set(100, 200, 100);
    lights[2].position.set(-100, -200, -100);

    params.scene.add(...lights);

    // 创建Bones
    initBones();

    initGui();// 创建Gui
}


/**
 * 创建Gui
 */
function initGui() {
    let folder = gui.addFolder('参数面板');
    folder.add(state, 'animateBones');
    folder.controllers[0].name('动画骨骼');

    folder.add(mesh, 'pose');
    folder.controllers[1].name('.pose()');

    const bones = mesh.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
        const bone = bones[i];

        folder = gui.addFolder('Bone ' + i);
        folder.add(bone.position, 'x', -10 + bone.position.x, 10 + bone.position.x);
        folder.add(bone.position, 'y', -10 + bone.position.x, 10 + bone.position.y);
        folder.add(bone.position, 'z', -10 + bone.position.x, 10 + bone.position.z);

        folder.add(bone.rotation, 'x', - Math.PI * 0.5, Math.PI * 0.5);
        folder.add(bone.rotation, 'y', - Math.PI * 0.5, Math.PI * 0.5);
        folder.add(bone.rotation, 'z', - Math.PI * 0.5, Math.PI * 0.5);

        folder.add(bone.scale, 'x', 0, 2);
        folder.add(bone.scale, 'y', 0, 2);
        folder.add(bone.scale, 'z', 0, 2);

        folder.controllers[0].name('position.x');
        folder.controllers[1].name('position.y');
        folder.controllers[2].name('position.z');

        folder.controllers[3].name('rotation.x');
        folder.controllers[4].name('rotation.y');
        folder.controllers[5].name('rotation.z');

        folder.controllers[6].name('scale.x');
        folder.controllers[7].name('scale.y');
        folder.controllers[8].name('scale.z');

    }
}
/**
 * 创建骨骼
 */
function initBones() {
    // 片段的高度及个数
    const segmentHeight = 8;
    const segmentCount = 4;
    const height = segmentHeight * segmentCount;// 得到总的高度
    const halfHeight = height * 0.5;

    const sizing = {
        segmentHeight: segmentHeight,
        segmentCount: segmentCount,
        height: height,
        halfHeight: halfHeight,
    }

    // 创建几何数据
    const geometry = createGeometry(sizing);
    const bones = createBones(sizing);

    mesh = createMesh(geometry, bones);
    mesh.scale.multiplyScalar(1);
    scene.add(mesh);
}

/**
 * 创建几何数据
 * @param {*} sizing 
 */
function createGeometry(sizing = {}) {
    // 创建圆柱体几何体
    const geometry = new THREE.CylinderGeometry(3, 5, sizing.height/*32*/, 8, sizing.segmentCount * 3/*高度分12段*/, true);
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const skinIndices = [];
    const skinWeights = [];
    //console.log(position)
    /** 圆柱体高32，坐标原点在中间16 到 -16
     * 
     */
    // 坐标点位个数
    for (let i = 0; i < position.count; i++) {
        vertex.fromBufferAttribute(position, i);
        const y = (vertex.y + sizing.halfHeight);//  因为高度在+16 到 -16,所以需要加上一半的高度16，让y的值变为0-32
        const skinIndex = Math.floor(y / sizing.segmentHeight); // => 32 / 8 = 4, 
        //console.log('y:,skinIndex:',y,vertex.y,skinIndex);
        skinIndices.push(skinIndex, skinIndex + 1, 0, 0);
        const skinWeight = (y % sizing.segmentHeight) / sizing.segmentHeight;
        //console.log('skinWeight:',skinWeight);
        skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
    }

    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    return geometry;
}
/**
 * 创建骨骼
 * @param {*} sizing 
 */
function createBones(sizing = {}) {
    bones = [];

    let prevBone = new THREE.Bone();
    bones.push(prevBone);
    prevBone.position.y = - sizing.halfHeight; // 根骨骼的位置

    for (let i = 0; i < sizing.segmentCount; i++) {
        // 创建4个骨骼
        const bone = new THREE.Bone();
        bone.position.y = sizing.segmentHeight;//( i - 2) * sizing.segmentHeight;// 8,即表示骨骼的位置也表示骨骼的长度值
        bones.push(bone);
        prevBone.add(bone);
        prevBone = bone;
    }

    return bones;
}

function createMesh(geometry, bones) {
    const material = new THREE.MeshPhongMaterial({
        color: 0x156289,
        emissive: 0x072534,
        side: THREE.DoubleSide,
        flatShading: true,
    });

    const mesh = new THREE.SkinnedMesh(geometry, material);
    const skeleton = new THREE.Skeleton(bones);
    mesh.add(bones[0]);
    mesh.bind(skeleton);

    skeletonHelper = new THREE.SkeletonHelper(mesh);
    skeletonHelper.material.line = 2;
    scene.add(skeletonHelper);

    return mesh;
}

export function animateBones(time = 0.01) {
    if (state.animateBones) {
        for (let i = 0; i < mesh.skeleton.bones.length; i++) {
            mesh.skeleton.bones[i].rotation.z = Math.sin(time) * 2 / mesh.skeleton.bones.length;
        }
    }
}

/**
 * 查看.computeLineDistances () : this 方法是什么作用
 * @param {*} params 
 */
export function initUseLine(params = {}) {
    const material = new THREE.LineDashedMaterial({
        color: 0x0000ff,
        linewidth: 3,
        scale: 1,
        dashSize: 3,
        gapSize: 1,
    });

    const points = [];
    points.push(new THREE.Vector3(- 10, 0, 0));
    points.push(new THREE.Vector3(0, 10, 0));
    points.push(new THREE.Vector3(10, 0, 0));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const line = new THREE.Line(geometry, material);
    params.scene.add(line);

    const resArray = line.computeLineDistances();
    console.log(resArray);
}

/**
 * 使用扩展的动画库
 */
export function initUseAnimationCreator() {
    let clip = AnimationClipCreator.CreateRotationAnimation(10, 'x'); // 返回的是动画片段
    let mix = new THREE.AnimationMixer();
    let action = mix.clipAction(clip);
    action.play();
}

/**
 * 使用bufferGeometry 创建 几何体
 * @param {*} params 
 */
export function initBufferGeometry(params = {}) {
    const { scene } = params;
    const geometry = new THREE.BufferGeometry();
    // 设置顶点
    const vertices = new Float32Array([
        -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0
    ]);
    // 创建顶点属性
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    // 创建顶点
    let indices = [];
    for (let i = 0; i < vertices.length / 3 - 1; i += 3) {
        indices.push(i);    // 3
        indices.push(i + 1); // 4
        indices.push(i + 2); //5
        indices.push(i + 2);
        indices.push(i + 3);
        indices.push(i);
    }

    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));

    const material = new THREE.MeshBasicMaterial({
        color: 0x00ffdd,
        wireframe: true,
    });

    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);
}

// 顶点组与多个材质

export function initUseMoreMaterial(params = {}) {
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    // 创建材质
    const cubeMaterial0 = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
    });
    const cubeMaterial1 = new THREE.MeshBasicMaterial({
        color: 0xff0000,
    });
    const cubeMaterial2 = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
    });
    const cubeMaterial3 = new THREE.MeshBasicMaterial({
        color: 0xffff00,
    });
    const cubeMaterial4 = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
    });
    const cubeMaterial5 = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
    });
    // 每个面一个材质
    const cube = new THREE.Mesh(cubeGeometry, [
        cubeMaterial0, cubeMaterial1, cubeMaterial2, cubeMaterial3, cubeMaterial4, cubeMaterial5
    ]);
    cube.position.y = 2;
    params.scene.add(cube);

    // 把网格数据进行分组
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        -1, -1, 0,
        1, -1, 0,
        1, 1, 0,
        -1, 1, 0
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    // 创建索引值
    const indices = new Uint16Array([0, 1, 2, 2, 3, 0]);
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    // 设置两个顶点组，形成2个材质
    geometry.addGroup(0, 3, 0);
    geometry.addGroup(3, 3, 1);
    console.log('对顶点数据进行分组:', geometry)
    // 创建两个材质
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        // side: THREE.DoubleSide,
        wireframe: true,
    });
    const material1 = new THREE.MeshBasicMaterial({
        color: 0xff0000,
    });
    const plane = new THREE.Mesh(geometry, [material, material1]);
    params.scene.add(plane);
    plane.position.x = -2;
}

/**
 * 使用纹理
 * @param {*} params 
 */
export function initUseTexture(params = {}) {
    // 加载纹理
    let textureLoader = new THREE.TextureLoader();
    // 加载纹理
    let texture = textureLoader.load("./texture/watercover/CityNewYork002_COL_VAR1_1K.png");
    // 设置纹理颜色空间
    texture.colorSpace = THREE.SRGBColorSpace;
    // 加载ao 贴图
    let aoMap = textureLoader.load("./texture/watercover/CityNewYork002_AO_1K.jpg");
    // 透明贴图
    let alphaMap = textureLoader.load("./texture/door/height.jpg");

    // 光照贴图
    let lightMap = textureLoader.load("./texture/colors.png");

    // 高光贴图
    let specularMap = textureLoader.load("./texture/watercover/CityNewYork002_GLOSS_1K.jpg");

    // rgbeLoader 加载hdr贴图
    let rgbeLoader = new RGBELoader();
    rgbeLoader.load("./texture/Alex_Hart-Nature_Lab_Bones_2k.hdr", (envMap) => {
        // 首先需要设置贴图的模式、球形贴图还是立方体贴图
        envMap.mapping = THREE.EquirectangularReflectionMapping;
        // 设置环境贴图
        params.scene.background = envMap;
        // 设置环境贴
        params.scene.environment = envMap;

        planeMaterial.envMap = envMap;
    });

    // 创建平面
    let planeGeometry = new THREE.PlaneGeometry(10, 10, 10);
    let planeMaterial = new THREE.MeshBasicMaterial({
        color: 0xfff023e,
        map: texture,
        // 是否允许透明
        transparent: true,
        // 设置aoMap 贴图
        aoMap: aoMap,
        aoMapIntensity: 1,// 设置曝光强度值
        // 设置透明贴图
        alphaMap: alphaMap,
        lightMap: lightMap,
        // 设置高光贴图
        specularMap: specularMap,
        reflectivity: 0.5,
        refractionRatio: 0.2,

    });
    planeMaterial.map = texture;
    let plane = new THREE.Mesh(planeGeometry, planeMaterial);
    params.scene.add(plane);
    plane.position.set(-10, 2, 0);

    params.gui.add(planeMaterial, "aoMapIntensity").name("aoMap强度").min(0).max(10);
    params.gui.add(planeMaterial, "reflectivity").name("reflectivity").min(0).max(10).step(0.1);
    params.gui.add(planeMaterial, "refractionRatio").name("refractionRatio").min(0).max(10).step(0.1);

    // 添加下拉框
    let folder = params.gui.addFolder("颜色空间");
    // 设置选项
    let colorSet = ['THREE.SRGBColorSpace', 'THREE.LinearSRGBColorSpace', 'THREE.NoColorSpace'];
    // 设置默认值
    let colorSpace = { value: 'THREE.SRGBColorSpace' };

    let colorCtrl = folder.add(colorSpace, 'value').options(colorSet).onChange((val) => {
        //console.log('选择的值:',val)
        if (val == 'THREE.SRGBColorSpace') {
            texture.colorSpace = THREE.SRGBColorSpace;

        } else if (val == 'THREE.LinearSRGBColorSpace') {
            texture.colorSpace = THREE.LinearSRGBColorSpace;
        } else {
            texture.colorSpace = THREE.NoColorSpace;
        }

        texture.needsUpdate = true;
    });
    console.log('colorCtrl',colorCtrl);

    params.gui.add(texture, "colorSpace", {
        sRGB: THREE.SRGBColorSpace,
        Linear: THREE.LinearSRGBColorSpace,
        No: THREE.NoColorSpace
    }).onChange(() => {
        texture.needsUpdate = true;
    });

    // 环境中添加雾
    params.scene.fog = new THREE.Fog(0x999999, 0.1, 50);
    //params.scene.fog = new THREE.FogExp2(0xff0022,0.81);

    // 实例化加载器
    const gltfLoader = new GLTFLoader();
    gltfLoader.load("./model/Duck.glb", (gltf) => {
        params.scene.add(gltf.scene);
    });

    // 实例化draco 加载器
    const dracoLoader = new DRACOLoader();
    // 设置draco 路径
    dracoLoader.setDecoderPath("./draco/");
    // 设置gltf 加载 draco 解码器
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load("./model/city.glb", (gltf) => {
        params.scene.add(gltf.scene);
        gltf.scene.position.set(4, 0, 0);
    });

    // 创建射线
    const raycaster = new THREE.Raycaster();
    // 创建鼠标点
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        // 通过摄像机和鼠标位置更新射线
        raycaster.setFromCamera(mouse, params.camera);
        //const intersects = raycaster.intersectObjects(params.scene.children);
    })
}

/**
 * 设置UV
 * @param {*} params 
 */
export function initUseUV(params = {}) {
    // 加载纹理
    let uvTexture = new THREE.TextureLoader().load("./texture/uv_grid_opengl.jpg");
    // 创建平面
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    // 创建材质
    const planeMaterial = new THREE.MeshBasicMaterial({
        map: uvTexture,
    });
    // 创建平面
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    params.scene.add(plane);
    plane.position.x = 3;

    // 创建几何体数据
    const geometry = new THREE.BufferGeometry();
    // 创建顶点数据
    const vertices = new Float32Array([
        -1, -1, 0,
        1, -1, 0,
        1, 1, 0,
        -1, 1, 0
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    // 创建索引
    const indices = new Uint16Array([
        0, 1, 2, 2, 3, 0
    ]);
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    // 设置uv 坐标
    const uv = new Float32Array([
        0, 0, 1 * 2, 0, 1 * 2, 1 * 2, 0, 1 * 2
    ]);
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    // 设置法向量
    const normals = new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1
    ]);
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    // 计算法线
    geometry.computeVertexNormals();
    geometry.transparent = true;
    geometry.translate(4, 2, 2); // 直接改变geometry 的值
    geometry.rotateX(Math.PI / 2);
    geometry.scale(1.1, 1.2, 1.3);

    const material = new THREE.MeshBasicMaterial({
        map: uvTexture,
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping,
    });

    const uvPlane = new THREE.Mesh(geometry, material);
    params.scene.add(uvPlane);

    uvPlane.position.x = 5;
    const vertexNormalsHelper = new VertexNormalsHelper(uvPlane, 1.2, 0xff0002);
    params.scene.add(vertexNormalsHelper);

    // rgbeLoader 加载hdr 贴图
    let rgbeLoader = new RGBELoader();
    rgbeLoader.load("./texture/Alex_Hart-Nature_Lab_Bones_2k.hdr", (envMap) => {
        // 首先设置贴图的映射模式
        envMap.mapping = THREE.EquirectangularReflectionMapping;
        // 设置环境贴图
        params.scene.background = envMap;
        params.scene.environment = envMap;

        planeMaterial.envMap = envMap;

        material.envMap = envMap;
    })



}

/**
 * 几何体居中
 * @param {*} params 
 */
export function initUseGeometryCenter(params = {}) {
    // 实例化加载 gltf
    const gltfLoader = new GLTFLoader();
    gltfLoader.load("./model/Duck.glb", (gltf) => {
        params.scene.add(gltf.scene); // 加载鸭子模型
        gltf.scene.position.set(3, 0, 0);
        let duckMesh = gltf.scene.getObjectByName("LOD3spShape");
        let duckGeometry = duckMesh.geometry; // 
        // 计算包围盒
        duckGeometry.computeBoundingBox();
        // 设置几何体居中
        duckGeometry.center();
        let duckBox = duckGeometry.boundingBox; // 这个box 值是很大的值，并没有刚刚包围鸭子
        /**
         * max: _Vector3
            x: 82.73919677734375
            y: 77.02031707763672
            z: 57.6266975402832


        min: _Vector3
            x: -82.73919677734375
            y: -77.02031707763672
            z: -57.6266975402832
         */
        //console.log('包围盒矩形:',duckBox)
        // 更新世界矩阵
        duckMesh.updateWorldMatrix(true, true);
        // 更新包围盒
        duckBox.applyMatrix4(duckMesh.matrixWorld);// 
        /** 经过应用网格对象的矩阵之后，包围盒就是刚刚与模型大小一致
         * max: _Vector3
            x: 3.827391949279786
            y: 0.7702031535609848
            z: 0.5762669625222614
         * 
        min: _Vector3
            x: 2.172608050720214
            y: -0.7702031535609848
            z: -0.5762669625222614
         */
        // 获取包围盒中心点
        let center = duckBox.getCenter(new THREE.Vector3());
        console.log('center:',center);
        // 包围盒辅助器
        let boxHelper = new THREE.Box3Helper(duckBox, 0xffff00);
        // 添加包围盒
        params.scene.add(boxHelper);
        // 获取包围求
        duckGeometry.computeBoundingSphere();
        let duckSphere = duckGeometry.boundingSphere;
        duckSphere.applyMatrix4(duckMesh.matrixWorld);
        //console.log(2,duckSphere)
        let sphereGeometry = new THREE.SphereGeometry(duckSphere.radius, 16, 16);
        let sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
        });
        let sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphereMesh.position.set(...duckSphere.center);//duckSphere.center
        params.scene.add(sphereMesh);
        sphereMesh.name = "包围球";
        //gltf.scene.visible = false;

    })
}

/**
 * 对多个对象计算得到组合包围盒
 * @param {*} params 
 */
export function initUseCombinationBoundingBox(params = {}) {
    // 创建三个小球
    let sphere1 = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 12), new THREE.MeshBasicMaterial({
        color: 0xff0011,
    }));
    sphere1.position.set(3, 4, 0);
    sphere1.name = "球1";
    params.scene.add(sphere1);

    let sphere2 = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 12),
        new THREE.MeshBasicMaterial({
            color: 0x00ff00,
        })
    );
    sphere2.position.set(5, 5, 0);
    params.scene.add(sphere2);
    sphere2.name = "球2";

    let sphere3 = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 12),
        new THREE.MeshBasicMaterial({
            color: 0x112112,
        })
    );
    sphere3.position.set(7, 4, 0);
    sphere3.name = '球3';
    params.scene.add(sphere3);

    let box = new THREE.Box3();
    let arrSphere = [sphere1, sphere2, sphere3];
    for (let i = 4; i < arrSphere.length; i++) {
        // 首先计算每个包围盒
        arrSphere[i].geometry.computeBoundingBox();
        // 更新世界矩阵
        arrSphere[i].updateWorldMatrix(true, true);// 更新对象的全局变换
        // 将包围盒转换到世界坐标系
        let box3 = arrSphere[i].geometry.boundingBox;
        box3.applyMatrix4(arrSphere[i].matrixWorld);
        box.union(box3);

    }

    for (let i = 0; i < arrSphere.length; i++) {
        // 第二种计算方式
        let box3 = new THREE.Box3().setFromObject(arrSphere[i], true);
        box.union(box3);
    }
    // 创建包围盒辅助器
    let boxHelper = new THREE.Box3Helper(box, 0xffff00);
    params.scene.add(boxHelper);

}

/**
 * 线框几何体edgeGeometry
 * @param {*} params 
 */
export function initUseEdges(params = {}) {
    let rgbeLoader = new RGBELoader();
    rgbeLoader.load("./texture/Alex_Hart-Nature_Lab_Bones_2k.hdr", (envMap) => {
        envMap.mapping = THREE.EquirectangularReflectionMapping;
        // 设置环境贴图
        params.scene.background = envMap;

        params.scene.environment = envMap;

    });

    // 实例化加载器gltf
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./draco/");
    gltfLoader.setDRACOLoader(dracoLoader);

    // 加载模型
    gltfLoader.load("./model/building.glb", (gltf) => {
        params.scene.add(gltf.scene);
        // 加载完成
        let building = gltf.scene.children[0];
        let geometry = building.geometry;
        building.updateWorldMatrix(true, true);
        geometry.applyMatrix4(building.matrixWorld);
        // 获取边缘 
        let edgesGeometry = new THREE.EdgesGeometry(geometry);
        edgesGeometry.applyMatrix4(building.matrixWorld);
        // 创建材质
        let edgesMaterial = new THREE.LineBasicMaterial({
            color: 0xff1232,
        });
        let edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

        // 另一种,线框
        let edgesGeometry2 = new THREE.WireframeGeometry(geometry);
        // 创建线段
        let edgesMaterial2 = new THREE.MeshBasicMaterial({
            color: 0x33dcdc,
        })
        let edges2 = new THREE.LineSegments(edgesGeometry2, edgesMaterial2);
        edges2.matrix.copy(building.matrixWorld);// 只是拷贝矩阵，并没有进行应用，所以才有下面的这行代码
        edges2.matrix.decompose(edges2.position, edges2.quaternion, edges2.scale);

        params.scene.add(edges2);
        params.scene.add(edges);
    });


    gltfLoader.load("./model/city.glb", (gltf) => {
        //params.scene.add(gltf.scene);// 不加载模型

        gltf.scene.traverse(child => {
            if (child.isMesh) {
                // 表示对象是网格对象
                let building = child;
                // 得到几何体数据
                let geometry = building.geometry;
                // 获取边缘geometry
                let edgesGeometry = new THREE.EdgesGeometry(geometry);
                // 创建线段材质
                let edgesMaterial = new THREE.LineBasicMaterial({
                    color: 0x12321dd,
                });
                let edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
                // 首先更新建筑物的世界变换矩阵
                building.updateWorldMatrix(true, true);
                // 还需要应用建筑的矩阵数据到线框对象中，否则线框就不会紧贴着建筑模型
                edges.matrix.copy(building.matrixWorld);
                // 上面只是复制了矩阵信息、但是并没有进行应用
                edges.matrix.decompose(edges.position, edges.quaternion, edges.scale);

                // 第二种方式：使用applyMatrix 直接赋值并应用矩阵

                params.scene.add(edges);
            }
        })
    })
}
/**
 * 案例算法：https://blog.csdn.net/Zz10566/article/details/125599237
 * 使用切线算法
 * @param {*} params 
 */

export function initUseMikkTSpaceTangents(params = {}) {
    const geometry = new THREE.SphereGeometry(6, 64, 64);
    ready.then(() => {
        computeMikkTSpaceTangents(geometry, { isReady: isReady, wasm: wasm ,
            generateTangents:generateTangents});


        // 加载纹理
        let textureLoader = new THREE.TextureLoader();
        // 顶点着色器
        let vertexShader = `
        varying vec3 vNormal;
        varying vec2 vUv;
        attribute vec4 tangent;
        varying vec4 vtangent;
        varying mat3 tbn;//

        uniform vec3 myLight;
        varying vec3 lightToPos; //

        ${THREE.ShaderChunk["common"]}
        ${THREE.ShaderChunk["bsdfs"]}
        ${THREE.ShaderChunk["shadowmap_pars_vertex"]}

        void main(){
            ${THREE.ShaderChunk["beginnormal_vertex"]}
            ${THREE.ShaderChunk["defaultnormal_vertex"]}
            ${THREE.ShaderChunk["begin_vertex"]}
            ${THREE.ShaderChunk["project_vertex"]}
            ${THREE.ShaderChunk["worldpos_vertex"]}
            ${THREE.ShaderChunk["shadowmap_vertex"]}

            vec3 newPoint = vec3((modelViewMatrix * vec4(position,1.)).xyz);//
            lightToPos = myLight - newPoint;// 灯光 到物体的位置
            vNormal = normalize(normalMatrix * normal);
            vec3 vTangent = normalize(normalMatrix * tangent.xyz);
            vec3 vBinormal = normalize(cross(vNormal,vTangent) * tangent.w);
            tbn = mat3(vTangent,vBinormal,vNormal);

            vUv = uv;
            vtangent = tangent;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `;

        let fragmentShader = `
        varying vec3 vNormal;
        varying vec3 lightToPos;
        varying vec2 vUv;
        varying vec4 vtangent;
        uniform sampler2D u_texture;
        uniform sampler2D u_textureNormal;

        varying mat3 tbn;
        ${THREE.ShaderChunk["common"]}
        ${THREE.ShaderChunk["packing"]}
        ${THREE.ShaderChunk["bsdfs"]}
        ${THREE.ShaderChunk["lights_pars_begin"]}
        ${THREE.ShaderChunk["shadowmap_pars_fragment"]}
        ${THREE.ShaderChunk["shadowmask_pars_fragment"]}

        vec3 myGetPixelColor(sampler2D myTexture){
            return texture2D(myTexture,vUv).rgb;
        }

        void main(){
            vec3 normalColor = myGetPixelColor(u_textureNormal);
            normalColor = normalColor * 2.0 - 1.0; // -1 到 1
            vec3 anynormalColor= normalize(tbn * normalColor);

            // 处理光源
            float diff = max(dot(anynormalColor,normalize(lightToPos)),0.);
            vec3 diffuse = diff * vec3(1,1,1);// diff * lightColor;
            vec3 textureColor = myGetPixelColor(u_texture);
            vec3 addDiffuse = textureColor + diffuse;

            vec3 shadowColor  = vec3(0,0,0);
            vec3 addShadow = mix(shadowColor,addDiffuse,getShadowMask());

            gl_FragColor = vec4(addShadow,1.);
        }
    `;
        // 添加一个平行光
        let light = new THREE.DirectionalLight(0xfff123);
        light.position.set(8, 10, 0);
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 100;
        light.shadow.camera.left = -30;
        light.shadow.camera.right = 30;
        light.shadow.camera.top = 30;
        light.shadow.camera.bottom = -30;

        params.scene.add(light);
        // 创建着色器材质
        let shaderMaterial = new THREE.ShaderMaterial({
            uniforms: THREE.UniformsUtils.merge([
                THREE.UniformsLib["lights"], {
                    opacity: { type: "f", value: 1. },
                    myLight: { value: light.position },
                    u_texture: { value: textureLoader.load("./texture/mikk.jpeg") },
                    u_textureNormal: { value: textureLoader.load("./texture/mikk_normal.jpeg") }
                }
            ]),
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.FrontSide,
            lights: true,//
        });

        // 开启阴影
        params.renderer.shadowMap.enabled = true;



        let lightHelper = new THREE.DirectionalLightHelper(light, 10, new THREE.Color(0xff0001));
        params.scene.add(lightHelper);

        // 创建一个平面
        let plane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({
            color: 0xdcdcdc,
            side: THREE.DoubleSide,
        }));
        plane.rotateX(Math.PI / 2);
        plane.position.y = -3;
        //params.scene.add(plane);

        let sphere = new THREE.Mesh(
            new THREE.SphereGeometry(2, 16, 16),
            shaderMaterial
        );
        sphere.castShadow = true;
        params.scene.add(sphere);

    })
}

/**
 * 材质实现彩虹折射率
 * @param {*} params 
 */
export function initUseIridescence(params={}){
    // 开启阴影
    params.renderer.shadowMap.enabled = true;

    // rgeLoader 加载hdr 贴图
    let rgbeLoader = new RGBELoader();// //资源较大，使用异步加载 
    rgbeLoader.loadAsync("./texture/Alex_Hart-Nature_Lab_Bones_2k.hdr").then((envMap)=>{
    //     //console.log('环境贴图:',envMap);
    //     // 设置球形贴图
        envMap.mapping = THREE.EquirectangularReflectionMapping;
        // 设置环境贴图
        params.scene.background= envMap;
        // 设置环境贴图
        params.scene.environment = envMap;

    //     let params ={
    //         aoMap:true,
    //     };

    //     // 加载实例化加载器
        const gltfLoader = new GLTFLoader();
        // 实例化加载draco
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("./draco/");
        gltfLoader.setDRACOLoader(dracoLoader);
        // 加载模型
        gltfLoader.load("./model/Duck.glb",(gltf)=>{
            const cloneMesh = gltf.scene.clone();
            params.scene.add(cloneMesh);
            cloneMesh.position.set(3,0,0);

            params.scene.add(gltf.scene);
            // 得到子对象
            let duckMesh = gltf.scene.getObjectByName("LOD3spShape");
            let matcapTexture = new THREE.TextureLoader().load("./texture/matcaps/54584E_B1BAC5_818B91_A7ACA3-512px.png");
            let preMaterial = duckMesh.material;
            duckMesh.material = new THREE.MeshMatcapMaterial({
                matcap:matcapTexture,
                map:preMaterial.map,
            })
        })
    });

    // 加载纹理 thickness:厚度
    let thicknessMap = new THREE.TextureLoader().load("./texture/diamond/diamond_emissive.png");
    // let normalMap = new THREE.TextureLoader().load("./texture/diamond/diamond_normal.png");
    // let carbonNormal = new THREE.TextureLoader().load("./texture/carbon/Carbon_Normal.png");
    // let scratchNormal = new THREE.TextureLoader().load("./texture/carbon/Scratched_gold_01_1K_Normal.png");
    // let sofaNormal = new THREE.TextureLoader().load("./texture/sofa/normal.png");
    let brickRoughness = new THREE.TextureLoader().load("./texture/brick/brick_roughness.jpg");
    //let brickColor = new THREE.TextureLoader().load("./texture/brick/brick_diffuse.jpg");

    // 创建球几何体
    const sphereGeometry = new THREE.SphereGeometry(1,32,32);
    const sphereMaterial = new THREE.MeshPhysicalMaterial({
        color:0xffddcc,
        roughness:0.05,
        transmission:1,
        thickness:0.1,
        iridescence:1,
        reflectivity:1,
        iridescenceIOR:1.3,
        iridescenceThicknessRange:[100,1000],
        iridescenceThicknessMap:brickRoughness,
        thicknessMap:thicknessMap,

    });

    // 创建球体
    const sphere = new THREE.Mesh(sphereGeometry,sphereMaterial);
    params.scene.add(sphere);
    sphere.position.set(-3,3,0);

    params.gui.add(sphereMaterial,'iridescence',0,1).name("彩虹色");
    params.gui.add(sphereMaterial,'reflectivity',0,1).name("反射率");
    params.gui.add(sphereMaterial,"iridescenceIOR",0,3).name("彩虹色折射率");

    let iridescenceThickness = {
        min: 100,
        max: 400,
      };
    params.gui
        .add(iridescenceThickness, "min", 0, 1000)
        .name("彩虹色最小厚度")
        .onChange(() => {
          sphereMaterial.iridescenceThicknessRange[0] = iridescenceThickness.min;
        });
    params.gui
        .add(iridescenceThickness, "max", 0, 1000)
        .name("彩虹色最大厚度")
        .onChange(() => {
          sphereMaterial.iridescenceThicknessRange[1] = iridescenceThickness.max;
        });
      



}
/**
 * lambert 和 phong 材质
 * @param {*} params 
 */
export function initUseLambertAndPhong(params={}){
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load("./texture/Alex_Hart-Nature_Lab_Bones_2k.hdr",(texture)=>{
        // 设置球形贴图
        texture.mapping = THREE.EquirectangularReflectionMapping;
        // 设置背景
        params.scene.background = texture;
        // 设置环境贴图
        //params.scene.environment = texture;

        planeMaterial.envMap = texture;
    });

    // 添加环境光
    let ambientLight = new THREE.AmbientLight(0xffddcc,0.8);
    params.scene.add(ambientLight);

    // 点光源
    let pointLight = new THREE.PointLight(0xff1212,1);
    pointLight.position.set(0,10,0);
    params.scene.add(pointLight);

    // 添加纹理
    let textureLoader = new THREE.TextureLoader();
    let colorTexture = textureLoader.load("./texture/watercover/CityNewYork002_COL_VAR1_1K.png");
    // 设置纹理的颜色空间
    colorTexture.colorSpace = THREE.SRGBColorSpace;
    // 高光贴图
    let specularMap = textureLoader.load("./texture/watercover/CityNewYork002_GLOSS_1K.jpg");
    // 法线贴图
    let normalMap = textureLoader.load("./texture/watercover/CityNewYork002_NRM_1K.jpg");

    // 凹凸贴图
    let displayMap = textureLoader.load("./texture/watercover/CityNewYork002_DISP_1K.jpg");

    // 环境光遮蔽贴图
    let aoMap= textureLoader.load("./texture/watercover/CityNewYork002_AO_1K.jpg");

    let planeGeometry = new THREE.PlaneGeometry(10,10,200,200);
    let planeMaterial = new THREE.MeshPhongMaterial({
        map:colorTexture,
        specularMap:specularMap,
        transparent:true,
        normalMap:normalMap,
        bumpMap:displayMap,
        displacementMap:displayMap, // 会改变网格对象的顶点数据
        displacementBias:1.2,
        displacementScale:2,
        aoMap:aoMap,

    });

    let plane = new THREE.Mesh(planeGeometry,planeMaterial);
    plane.rotation.x = - Math.PI / 2;
    params.scene.add(plane);

    let planeOfLambert = plane.clone(false);
    let planeOfLambertMaterial = new THREE.MeshLambertMaterial({
        map:colorTexture,
        specularMap:specularMap,
        transparent:true,
        normalMap:normalMap,
        bumpMap:displayMap,
        displacementBias:1, // 这些值会改变网格对象的顶点数据
        displacementMap:displayMap,
        displacementScale:1,
        aoMap:aoMap,
    });

    planeOfLambert.material = planeOfLambertMaterial;
    planeOfLambert.needsUpdate = true;

    planeOfLambert.position.set(12,0,0);
    planeOfLambert.rotation.x = - Math.PI /2;
    //planeOfLambert.applyMatrix4(plane.matrixWorld);
    params.scene.add(planeOfLambert);
    planeOfLambert.name = "planeOfLambert";
    //console.log(params.scene);

    // 加载模型 设置模型水晶效果
    const gltfLoader = new GLTFLoader();
    gltfLoader.load("./model/Duck.glb",(gltf)=>{
        params.scene.add(gltf.scene);

        let duckMesh = gltf.scene.getObjectByName("LOD3spShape");
        let preMaterial = duckMesh.material;
        duckMesh.material = new THREE.MeshPhongMaterial({
            map:preMaterial.map,
            refractionRatio:0.7,
            reflectivity:0.99,
            envMap: planeMaterial.envMap ,
        })
    });
}
/**
 * 材质
 * @param {*} params 
 */
export function initUseStanderMaterial(params={}){
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load("./texture/Alex_Hart-Nature_Lab_Bones_2k.hdr",(texture)=>{
        texture.mapping = THREE.EquirectangularReflectionMapping,
        params.scene.background = texture;
        params.scene.environment = texture;

        let param ={
            aoMap:true,
            aoMapIntensity:1,
        };

        // 实例化加载器
        const gltfLoader= new GLTFLoader();
        // 实例化加载器
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("./draco/");
        gltfLoader.setDRACOLoader(dracoLoader);

        gltfLoader.load("./model/sword/sword.gltf",gltf=>{
            params.scene.add(gltf.scene);

            let mesh = gltf.scene.getObjectByName("Pommeau_Plane001");

            let aoMap = mesh.material.aoMap;

            params.gui.add(param,'aoMap').onChange(value=>{
                mesh.material.aoMap = value ? aoMap : null;
                mesh.material.needsUpdate = true;
            });
            params.gui.add(param,'aoMapIntensity',0,100).onChange(value=>{
                mesh.material.aoMapIntensity = value;
            })
        });



    });

    // 加载厚度纹理
    let thicknessMap = new THREE.TextureLoader().load("./texture/diamond/diamond_emissive.png");
    let brickRoughness = new THREE.TextureLoader().load(
        "./texture/brick/brick_roughness.jpg"
      );
      
      let brickColor = new THREE.TextureLoader().load(
        "./texture/brick/brick_diffuse.jpg"
      );
    const geometry = new THREE.BoxGeometry(1,1,1);
    const material = new THREE.MeshPhysicalMaterial({
        transmission:0.95,// 透射
        transparent:true,// 开启透明
        roughness:0.05,
        thickness:2,
        attenuationColor:new THREE.Color(0.9,0.9,0),
        attenuationDistance:1,
        thicknessMap:thicknessMap,
        sheenRoughness:1,
        sheenRoughnessMap:brickRoughness,
        sheenColor:new THREE.Color(0xffde33),
    });

    const cube = new THREE.Mesh(geometry,material);
    params.scene.add(cube);
    cube.position.set(0,2,0);
    params.gui.add(cube.material,'attenuationDistance',0,100).step(1).name("衰减距离");
    params.gui.add(cube.material,'thickness',0,10).step(0.1).name("厚度");
    params.gui.add(cube.material,'transmission',0,1).step(0.1).name("透射值");
    params.gui.add(cube.material,'roughness',0,10).step(0.1).name("粗糙程度值");
    params.gui.add(cube.material,'sheenRoughness',0,10).step(0.1).name("sheenRoughness");


    let carbonNormal = new THREE.TextureLoader().load("./texture/carbon/Carbon_Normal.png");
    let scratchNormal = new THREE.TextureLoader().load("./texture/carbon/Scratched_gold_01_1K_Normal.png");

    //设置材质的折射率 和 反射率
    const materialIorAndReflectivity = new THREE.MeshPhysicalMaterial({
        transmission:0.95,// 透射
        transparent:true,// 开启透明
        roughness:0.05,
        thickness:2,
        attenuationColor:new THREE.Color(0.9,0.9,0),
        attenuationDistance:1,
        thicknessMap:thicknessMap,
        clearcoatNormalMap:scratchNormal,
        normalMap:carbonNormal,
        clearcoatNormalScale:new THREE.Vector2(1,1),
    });

    const sphere = new THREE.SphereGeometry(2,12,12);

    const iorReflectivity = new THREE.Mesh(sphere,materialIorAndReflectivity);
    params.scene.add(iorReflectivity);
    iorReflectivity.position.set(3,0,0);

    params.gui.add(iorReflectivity.material,'ior',0,20).name("折射率");
    params.gui.add(iorReflectivity.material,'reflectivity',0,1).name("反射率");

    //彩虹效果
    const sphereMaterial = new THREE.MeshPhysicalMaterial({
        color:0xffdcdc,
        roughness:0.05,
        transmission:1,
        thickness:0.1,
        iridescence:1,
        reflectivity:1,
        iridescenceIOR:1.3,
        iridescenceThicknessRange:[100,400],
        iridescenceThicknessMap:brickRoughness,
    });
    // 创建球体
    const sphereIor = new THREE.Mesh(sphere,sphereMaterial);
    params.scene.add(sphereIor);
    sphereIor.position.set(0,3,0);
    const addFolder = params.gui.addFolder("虹彩效应");
    addFolder.add(sphereMaterial,'iridescence',0,1).name('彩虹色');
    addFolder.add(sphereMaterial,'reflectivity',0,1).name('反射率');
    addFolder.add(sphereMaterial,'iridescenceIOR',0,3).name('彩虹色折射率');

    let iridescenceThickness ={
        min:100,
        max:400,
    };
    addFolder.add(iridescenceThickness,'min',0,1000).name("彩虹色最小厚度").onChange(()=>{
        sphereMaterial.iridescenceThicknessRange[0] = iridescenceThickness.min;
    });
    addFolder.add(iridescenceThickness,'max',0,1000).name("彩虹色最大厚度").onChange(()=>{
        sphereMaterial.iridescenceThicknessRange[1] = iridescenceThickness.max;
    });



}