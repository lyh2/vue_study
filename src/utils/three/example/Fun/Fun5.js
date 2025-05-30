import * as THREE from "three";
import fragmentShader01 from "../Shader/ArVr/fragmentShader01.glsl";
import { LightningStorm } from "../../../../../../three.jsDevGameExamplesMustStudy/other.js-其他库/LightningStorm";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { Octree } from "three/examples/jsm/math/Octree.js";
import { OctreeHelper } from "three/examples/jsm/helpers/OctreeHelper";
import { Capsule } from "three/examples/jsm/math/Capsule";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import {RGBELoader} from "three/examples/jsm/loaders/RGBELoader";
import { Reflector } from "three/examples/jsm/objects/Reflector";
import ThreePlus from "../3DWorld/ThreePlus";
import * as CANNON from "cannon-es";
import * as YUKA from "yuka";





/**
 * 元宇宙模块1
 * @param {*} options
 */
export function initArVr(options = {}) {
  // 创建一个平面
  const planeGeometry = new THREE.PlaneGeometry(20, 20, 1, 1);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffdd,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  //options.scene.add(plane);

  // 通过着色器创建材质
  const planeShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(1000, 1000) },
      rotation: { value: 0 },
    },
    vertexShader: `
            varying vec2 vUv;
            uniform float rotation;

            void main(){
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4(0.,0.,0.,1.);
            vec2 scale;
            scale.x = length(vec3(modelMatrix[0].x,modelMatrix[0].y,modelMatrix[0].z));
            scale.y = length(vec3(modelMatrix[1].x,modelMatrix[1].y,modelMatrix[1].z));
            scale *= - mvPosition.z;

            vec2 alignedPosition = -position.xy * scale / mvPosition.z;
            vec2 rotatePosition;
            rotatePosition.x = cos(rotation) * alignedPosition.x - sin(rotation) * alignedPosition.y;
            rotatePosition.y = sin(rotation) * alignedPosition.x + cos(rotation) * alignedPosition.y;
            mvPosition.xy += rotatePosition;

            gl_Position = projectionMatrix * mvPosition;

            }
        `,
    fragmentShader: fragmentShader01,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });

  const plane2 = new THREE.Mesh(planeGeometry, planeShaderMaterial);
  plane2.receiveShadow = true;
  //options.scene.add(plane2);

  const sprite = new THREE.Sprite(planeShaderMaterial);
  sprite.renderOrder = 1;
  sprite.position.set(0, 0, 0);
  options.scene.add(sprite);

  const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
  const cube = new THREE.Mesh(cubeGeometry, planeShaderMaterial);
  //options.scene.add(cube);

  const sprite2 = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.TextureLoader().load("./ArVr/textures/woman.png"),
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    })
  );

  sprite2.position.y = 1;
  sprite2.material.onBeforeCompile = (shader) => {};

  //options.scene.add(sprite2);

  const storm = new LightningStorm({
    size: 100,
    minHeight: 90,
    maxHeight: 200,
    maxSlope: 0.6,
    maxLightnings: 8,

    onLightningDown: function (lightning) {
      console.log("lightning down:", lightning);
    },
  });
  //options.scene.add(storm);

  options.camera.position.set(0, 5, 5);

  return { planeShaderMaterial: planeShaderMaterial, storm: storm };
}

/**
 * 碰撞检测
 * @param {*} options
 */
export class InitOctree {
  constructor(options = {}) {
    this._options = options;
    this._init();
  }

  _init() {
    this._clock = new THREE.Clock();

    // 创建场景
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x88ccee);
    this._scene.fog = new THREE.Fog(0x88ccdd, 0, 50);

    // 创建相机
    this._perspectiveCamera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );
    this._perspectiveCamera.position.set(0, 5, 10);

    // 创建渲染器
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.shadowMap.enabled = true; // 开启阴影
    this._renderer.shadowMap.type = THREE.VSMShadowMap;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this._options.dom.appendChild(this._renderer.domElement);

    // 性能显示
    this._stats = new Stats();
    this._stats.domElement.style.position = "absolute";
    this._stats.domElement.style.top = "0px";
    this._options.dom.appendChild(this._stats.domElement);

    // 创建控制器
    this._orbitControls = new OrbitControls(
      this._perspectiveCamera,
      this._renderer.domElement
    );

    const axesHelper = new THREE.AxesHelper(100);
    this._scene.add(axesHelper);

    this._group = new THREE.Group();
    this._group.name = "myGroup";

    this._scene.add(this._group);
    // 创建一个平面及楼梯
    this._createPlane();

    // 创建Octree
    this._createOctree();

    // 多层次细节展示
    this._useLod();

    this._addEvents();

    this._animate();
  }
  /**
   * 添加事件监听
   */
  _addEvents() {
    //console.log(this._options)
    document.addEventListener(
      "keydown",
      (event) => {
        this._keyStates[event.code] = true;
        this._keyStates.isDown = true;
        //console.log('keyDown:',this._keyStates);
      },
      false
    );

    document.addEventListener(
      "keyup",
      (event) => {
        this._keyStates[event.code] = false;
        this._keyStates.isDown = false;
        //console.log('keyUp:',this._keyStates);
      },
      false
    );

    this._options.dom.addEventListener(
      "mousedown",
      (event) => {
        document.body.requestPointerLock();
      },
      false
    );

    window.addEventListener(
      "mousemove",
      (event) => {
        this._capsule.rotation.y += event.movementX * 0.003;
      },
      false
    );
  }
  _createOctree() {
    this._worldOctree = new Octree();
    this._worldOctree.fromGraphNode(this._group); // 通过节点创建树结构

    // 创建一个octreeHelper
    const octreeHelper = new OctreeHelper(this._worldOctree, 0xff4500);
    this._scene.add(octreeHelper);

    // 创建一个人的碰撞体-虚拟的（胶囊体-物理世界或者算法层面，看不见的而又真实存在的）
    this._playerCollider = new Capsule(
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0, 1.35, 0),
      0.35
    );
    //console.log('碰撞体的中心点：',this._playerCollider.getCenter(new THREE.Vector3()));
    console.log("八叉树:", this._worldOctree);

    //创建一个平面当作胶囊体的手
    const capsulePlaneGeometry = new THREE.PlaneGeometry(2, 0.5, 1, 1);
    const capsulePlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      side: THREE.DoubleSide,
    });
    const capsulePlane = new THREE.Mesh(
      capsulePlaneGeometry,
      capsulePlaneMaterial
    );
    capsulePlane.position.set(0, 0.5, 0);

    // 创建一个小正方体放在Z轴用于调试代码
    const boxGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0x6f25fb,
      side: THREE.DoubleSide,
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(0, 0.8, 0.35);

    // 创建一个胶囊体
    const capsuleGeometry = new THREE.CapsuleGeometry(0.35, 1, 32);
    const capsuleMaterial = new THREE.MeshBasicMaterial({
      color: 0xff000,
      side: THREE.DoubleSide,
    });
    this._capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
    this._capsule.position.set(0, 0.85, 0);

    // 将相机作为胶囊体的子元素，就可以实现跟谁效果
    this._perspectiveCamera.position.set(0, 2, -5);
    this._perspectiveCamera.lookAt(this._capsule.position);
    //this._orbitControls.target = capsule.position;

    this._capsule.add(this._perspectiveCamera);
    this._capsule.add(capsulePlane); // 给胶囊体添加了一个平面,当作手
    this._capsule.add(box);

    this._scene.add(this._capsule);

    // 设置重力
    this._gravity = -9.8;
    // 设置玩家速度
    this._playerVelocity = new THREE.Vector3(0, 0, 0);
    // 方向向量
    this._playerDirection = new THREE.Vector3(0, 0, 0);

    // 键盘按下事件
    this._keyStates = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      Space: false,
      isDown: false,
    };

    this._playerOnFloor = false; // 玩家是否在地面
  }
  /**
   * 更新碰撞体
   * @param {*} deltaTime
   */
  _updatePlayer(deltaTime) {
    let damping = -0.05;

    if (this._playerOnFloor) {
      // 在地面
      this._playerVelocity.y = 0;

      this._keyStates.isDown ||
        this._playerVelocity.addScaledVector(this._playerVelocity, damping);
    } else {
      this._playerVelocity.y += this._gravity * deltaTime;
    }

    //console.log("玩家的速度:",this._playerVelocity);

    // 计算玩家移动的距离
    const playerMoveDistance = this._playerVelocity
      .clone()
      .multiplyScalar(deltaTime);
    this._playerCollider.translate(playerMoveDistance); // 移动虚拟胶囊体
    // 设置胶囊体的位置
    this._playerCollider.getCenter(this._capsule.position);
    // 进行碰撞检测
    this.__checkCollisions();
  }
  /**
   * 碰撞检测
   */
  __checkCollisions() {
    // 人物碰撞检测
    const result = this._worldOctree.capsuleIntersect(this._playerCollider);
    this._playerOnFloor = false;
    //console.log('相交结果=',result);
    if (result) {
      this._playerOnFloor = result.normal.y > 0;
      this._playerCollider.translate(
        result.normal.multiplyScalar(result.depth)
      );
    }
  }
  /**
   * 创建一个平面
   */
  _createPlane() {
    const planeGeometry = new THREE.PlaneGeometry(20, 20, 1, 1);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffddcc,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    plane.name = "isPlane";

    // 创建立方体叠楼梯效果
    for (let i = 0; i < 10; i++) {
      const boxGeometry = new THREE.BoxGeometry(1, 1, 0.15);
      const boxMaterial = new THREE.MeshBasicMaterial({
        color: 0x123456,
      });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.y = 0.5 + i; // ?
      box.position.z = i * 0.3;
      box.name = "box_" + i;
      plane.add(box);
    }

    this._group.add(plane);
  }
  /**
   * 多层次细节
   */
  _useLod() {
    const material = new THREE.MeshBasicMaterial({
      color: 0xff00dd,
      wireframe: true,
    });
    this._lod = new THREE.LOD();
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.SphereGeometry(1, 32 - i * 5, 32 - i * 5);
      const mesh = new THREE.Mesh(geometry, material);
      this._lod.addLevel(mesh, i * 5);
    }

    let mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.visible = false;
    this._lod.addLevel(mesh, 25);
    this._lod.position.set(10, 0, 10);
    this._scene.add(this._lod);
  }
  _animate() {
    let delta = this._clock.getDelta();
    this._controlPlayer(delta);
    this._updatePlayer(delta);
    this._resetPlayer();

    requestAnimationFrame(this._animate.bind(this));
    this._renderer.render(this._scene, this._perspectiveCamera);
  }
  _resetPlayer() {
    if (this._capsule.position.y < -20) {
      this._playerCollider.start.set(0, 2.35, 0);
      this._playerCollider.end.set(0, 3.35, 0);
      this._playerCollider.radius = 0.35;
      this._playerVelocity.set(0, 0, 0);
      this._playerDirection.set(0, 0, 0);
    }
  }
  /**
   * 根据键盘状态控制玩家
   * @param {*} deltaTime
   */
  _controlPlayer(deltaTime) {
    const capsuleFront = new THREE.Vector3(0, 0, 0);
    this._capsule.getWorldDirection(capsuleFront); // 获取胶囊体在世界坐标系下的正前方(也就是正Z的值)方向值，
    //console.log("胶囊的正前方:",capsuleFront);

    if (this._keyStates["KeyW"]) {
      this._playerDirection.z = -1;
      // 获取胶囊的正前面方向

      // 计算玩家的速度
      this._playerVelocity.add(capsuleFront.multiplyScalar(deltaTime));
    }

    if (this._keyStates["KeyS"]) {
      this._playerDirection.z = 1;
      this._playerVelocity.add(capsuleFront.multiplyScalar(-deltaTime));
    }

    if (this._keyStates["KeyA"]) {
      this._playerDirection.x = -1;

      capsuleFront.cross(this._capsule.up);

      this._playerVelocity.add(capsuleFront.multiplyScalar(-deltaTime));
    }

    if (this._keyStates["KeyD"]) {
      this._playerDirection.x = 1;
      //console.log('胶囊体UP：',this._capsule.up);
      /*************************************************************/
      capsuleFront.cross(this._capsule.up);
      //console.log(capsuleFront,2222)
      /*************************************************************/
      this._playerVelocity.add(capsuleFront.multiplyScalar(deltaTime));
    }

    if (this._keyStates["Space"]) {
      this._playerVelocity.y = 15;
    }
  }
  _windowResizeFun() {
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();

    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

/**
 * 控制相机上下跟随人物
 */
export class InitOctreeClass {
  constructor(_options = {}) {
    this._options = _options;

    this._init();
  }
  /**
   * 初始化
   */
  _init() {
    this._clock = new THREE.Clock();
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x88ccee);
    this._scene.fog = new THREE.Fog(0x88ccdd, 0, 50);

    // 创建相机
    this._perspectiveCamera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this._perspectiveCamera.position.set(0, 5, 10);

    // 创建渲染器
    this._renderer = new THREE.WebGLRenderer({ antialias: true });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.shadowMap.enabled = true; // 开启阴影
    this._renderer.shadowMap.type = THREE.VSMShadowMap;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 2.0;

    this._options.dom.appendChild(this._renderer.domElement);

    // 开启性能信息
    this._stats = new Stats();
    this._stats.domElement.style.position = "absolute";
    this._stats.domElement.style.top = "10px";
    this._options.dom.appendChild(this._stats.domElement);

    this._orbitControls = new OrbitControls(
      this._perspectiveCamera,
      this._renderer.domElement
    );
    this._orbitControls.target.set(0, 0, 0);

    this._group = new THREE.Group();
    this._scene.add(this._group);

    // 创建地面及楼梯
    this.__createPlaneStairAddOctree();

    // 添加事件监听
    this.__addEventListener();

    this.__animate();
  }
  /**
   * 创建地面及楼梯
   */
  __createPlaneStairAddOctree() {
    const planeGeometry = new THREE.PlaneGeometry(20, 20, 1, 1);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xdcfdcd,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;

    // 创建立方体叠加楼梯效果-可以使用instanceMesh 实现性能优化
    for (let i = 0; i < 20; i++) {
      const boxGeometry = new THREE.BoxGeometry(1, 0.4, 0.8); // x,y,z
      const boxMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() * 0xff0000,
      });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.y = 0.35 + i * 0.4; // box0:0.35,box1:0.75
      box.position.z = i * 0.4; // box0:0,box1:0.4
      plane.add(box);
    }

    this._group.add(plane);

    // 创建八叉树
    this._worldOctree = new Octree();
    this._worldOctree.fromGraphNode(this._group);

    // 显示帮助线条
    const octreeHelper = new OctreeHelper(this._worldOctree);
    this._scene.add(octreeHelper);

    // 创建一个人的胶囊体-算法世界中的对象
    this._playerCollider = new Capsule(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      0.35
    );
    // 创建一个three.js 的胶囊体对象
    const capsuleGeometry = new THREE.CapsuleGeometry(0.35, 1, 32);
    const capsuleMaterial = new THREE.MeshBasicMaterial({
      color: 0xfdefde,
      side: THREE.DoubleSide,
    });
    this._capsuleMesh = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
    this._capsuleMesh.position.set(0, 10, 0);

    // 相机作为胶囊的子元素就可以实现跟随
    this._perspectiveCamera.position.set(0, 2, -5);
    this._perspectiveCamera.lookAt(this._capsuleMesh.position);
    this._orbitControls.target = this._capsuleMesh.position;

    this._capsuleBodyControl = new THREE.Object3D(); // 创建一个空的3D 空对象
    this._capsuleBodyControl.add(this._perspectiveCamera);
    this._capsuleMesh.add(this._capsuleBodyControl);

    // 创建一个长条平面添加到胶囊体中
    const capsulePlaneGeometry = new THREE.PlaneGeometry(1, 0.4, 1, 1);
    const capsulePlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0x00dfde,
      side: THREE.DoubleSide,
    });
    const capsulePlane = new THREE.Mesh(
      capsulePlaneGeometry,
      capsulePlaneMaterial
    );
    capsulePlane.position.set(0, 0.8, 0);
    this._capsuleMesh.add(capsulePlane);

    // 在胶囊体的+Z轴处添加一个红色的球体
    const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this._capsuleMesh.add(sphere);
    sphere.position.set(0, 0.6, 0.2);
    this._scene.add(this._capsuleMesh);

    // 设置重力
    this._gravity = -9.8;
    // 玩家速度
    this._playerVelocity = new THREE.Vector3(0, 0, 0);
    // 方向向量
    this._playerDirection = new THREE.Vector3(0, 0, 0);
    // 键盘按下事件
    this._keyStates = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      Space: false,
      isDown: false,
    };
    this._playerIsOnFloor = false; // 玩家是否在地面
  }

  /**
   * 添加事件监听
   */
  __addEventListener() {
    window.addEventListener(
      "keydown",
      (event) => {
        //console.log("键盘按下事件:",event.code);
        this._keyStates[event.code] = true;
        this._keyStates.isDown = true;
      },
      false
    );

    document.addEventListener(
      "keyup",
      (e) => {
        this._keyStates[e.code] = false;
        this._keyStates.isDown = false;
        // 设置速度为0
        this._playerVelocity.set(0,0,0);
        this._playerDirection.set(0,0,0);
      },
      false
    );

    document.addEventListener(
      "mousedown",
      (e) => {
        // 锁定鼠标指针
        document.body.requestPointerLock();
      },
      false
    );

    window.addEventListener(
      "mousemove",
      (e) => {
        this._capsuleMesh.rotation.y -= e.movementX * 0.003;
        this._capsuleBodyControl.rotation.x += e.movementY * 0.003;
      },
      false
    );
  }
  /**
   * 键盘按下控制玩家
   * @param {*} deltaTime
   */
  ___controlPlayer(deltaTime) {
    // 获取胶囊的正前方方向，也就是胶囊体的+Z轴值
    const capsuleFront = new THREE.Vector3(0, 0, 0);
    this._capsuleMesh.getWorldDirection(capsuleFront);
    // 得到玩家的+Z轴之后，需要把胶囊体进行一次旋转，使胶囊体的+Z 与世界坐标系的-Z一致

    if (this._keyStates["KeyW"]) {
      // 按下W键,表示角色向自己的+Z轴的朝向继续前进
      this._playerDirection.z = 1;

      // 计算玩家的速度
      this._playerVelocity.add(capsuleFront.multiplyScalar(deltaTime));
    }
    if (this._keyStates["KeyS"]) {
      // 角色坐标系下的-Z轴移动
      this._playerDirection.z = -1;
      this._playerVelocity.add(capsuleFront.multiplyScalar(-deltaTime));
    }

    if(this._keyStates["KeyA"]){
        this._playerDirection.x = -1;
        //都是以角色坐标系
        capsuleFront.cross(this._capsuleMesh.up);// 叉乘得到+X轴
        this._playerVelocity.add(capsuleFront.multiplyScalar(-deltaTime));
    }

    if(this._keyStates["KeyD"]){
        this._playerDirection.x = 1;
        capsuleFront.cross(this._capsuleMesh.up);
        this._playerVelocity.add(capsuleFront.multiplyScalar(deltaTime));
    }

    if(this._keyStates["Space"]){
        this._playerVelocity.y = 15;
    }

  }
  /**
   * 更新用户信息
   * @param {*} deltaTime 
   */
  ___updatePlayer(deltaTime){
    let damping = -0.05;
    if(this._playerIsOnFloor){
        this._playerVelocity.y = 0;

        this._keyStates.isDown || this._playerVelocity.addScaledVector(this._playerVelocity,damping);

    }else{
        this._playerVelocity.y += this._gravity * deltaTime;
    }

    const playerMoveDistance = this._playerVelocity.clone().multiplyScalar(deltaTime);
    this._playerCollider.translate(playerMoveDistance);
    this._playerCollider.getCenter(this._capsuleMesh.position);

    // 进行碰撞检测
    this.____playerCollisions();
  }
  /**
   * 碰撞检查
   */
  ____playerCollisions(){
    const result = this._worldOctree.capsuleIntersect(this._playerCollider);
    this._playerOnFloor = false;
    //console.log('碰撞结果:',result);
    if(result){
      this._playerOnFloor = result.normal.y > 0;
      this._playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
  }
  /**
   * 重设置数据
   */
  ____resetPlayer(){
    if(this._capsuleMesh.position.y < -20){
      this._playerCollider.start.set(0,11.35,1.);
      this._playerCollider.end.set(0,10,0);
      this._playerCollider.radius = 0.35;
      this._playerVelocity.set(0,0,0);
      this._playerDirection.set(0,0,0);
    }
  }
  __animate() {
    let delta = this._clock.getDelta();
    this._stats.update();
    this._orbitControls.update();

    // 控制用户
    this.___controlPlayer(delta);
    // 更新用户
    this.___updatePlayer(delta);
    // 重新设置
    this.____resetPlayer();

    this._renderer.render(this._scene, this._perspectiveCamera);
    requestAnimationFrame(this.__animate.bind(this));
  }

  _windowResizeFun(_options = {}) {
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();

    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

/**
 * 控制人物角色
 */
export class OctreeClass{
  constructor(_options={}){
    this._options = _options;

    this._init();
  }

  _init(){
    // 创建场景
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x88ccee);
    this._scene.fog = new THREE.Fog(0x88ccee,0,50);

    this._perspectiveCamera = new THREE.PerspectiveCamera(70,window.innerWidth / window.innerHeight,0.1,1000);
    this._perspectiveCamera.position.set(0,5,10);

    // 创建另一个相机
    this._backPerspectiveCamera = new THREE.PerspectiveCamera(70,window.innerWidth / window.innerHeight,0.1,1000);
    this._backPerspectiveCamera.position.set(0,5,-10);

    this._clock = new THREE.Clock();
    this._renderer = new THREE.WebGLRenderer({
      antialias:true,
    });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth,window.innerHeight);
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.VSMShadowMap;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.;
    this._options.dom.appendChild(this._renderer.domElement);

    this._stats = new Stats();
    this._stats.domElement.style.position = "absolute";
    this._stats.domElement.style.top = "10px";
    this._options.dom.appendChild(this._stats.domElement);

    this._activeCamera = this._perspectiveCamera;
    this._group = new THREE.Group();
    this._scene.add(this._group);

    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
    // 创建平面及八叉树
    this._createPlaneAddOctree();
    this._addEventListener();
    this._animate();
  }

  _createPlaneAddOctree(){
    const planeGeometry = new THREE.PlaneGeometry(20,20,1,1);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color:0x2b3035,
      side:THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry,planeMaterial);
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;

    // 创建立方体叠楼梯效果
    for(let i = 0;i < 10;i++){
      const boxGeometry = new THREE.BoxGeometry(1,1,0.15);
      const boxMaterial = new THREE.MeshBasicMaterial({
        color:0x00ffdc,
      });
      const box = new THREE.Mesh(boxGeometry,boxMaterial);
      box.position.y = 0.15 + i * 0.15;
      box.position.z = i * 0.3;
      plane.add(box);
    }
    this._group.add(plane);

    this._worldOctree = new Octree();
    this._worldOctree.fromGraphNode(this._group);

    this._playerCollider = new Capsule(new THREE.Vector3(0,0,0),new THREE.Vector3(0,1,0),0.35);

    // 添加半球光
    const hemisphereLight = new THREE.HemisphereLight(0xfffffd,0xfdcdcc,1);
    this._scene.add(hemisphereLight);

    // 加载模型
    const loader = new GLTFLoader();
    this._mixer = null;
    this._actions = [];

    // 设置激活的动作
    this._activeAction = null;
    loader.load("./models/RobotExpressive.glb",gltf=>{
      const robot= gltf.scene;
      robot.scale.set(0.5,0.5,0.5);
      robot.position.set(0,-0.88,0);

      this._capsule.add(robot);
      this._mixer = new THREE.AnimationMixer(robot);
      for(let i = 0; i < gltf.animations.length;i++){
        let name = gltf.animations[i].name;
        this._actions[name] = this._mixer.clipAction(gltf.animations[i]);
        if(name == "Idle" || name == "Walking" || name == "Running"){
          this._actions[name].clampWhenFinished = false;
          this._actions[name].loop = THREE.LoopRepeat;
        }else{
          this._actions[name].clampWhenFinished = true;
          this._actions[name].loop = THREE.LoopOnce;
        }
      }

      this._activeAction = this._actions["Idle"];
      this._activeAction.play();

    });

    this._capsule = new THREE.Object3D();
    this._capsule.position.set(0,10,0);

    // 将相机作为胶囊的子元素，实现跟随
    this._perspectiveCamera.position.set(0,2,-5);
    this._perspectiveCamera.lookAt(this._capsule.position);

    this._backPerspectiveCamera.position.set(0,2,5);
    this._backPerspectiveCamera.lookAt(this._capsule.position);

    this._orbitControls.target  = this._capsule.position;


    this._capsuleBodyControl = new THREE.Object3D();
    this._capsuleBodyControl.add(this._perspectiveCamera);
    this._capsuleBodyControl.add(this._backPerspectiveCamera);
    this._capsule.add(this._capsuleBodyControl);

    this._scene.add(this._capsule);

    // 设置重力
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

  }

  _animate(){
    let delta = this._clock.getDelta();
    this._controlPlayer(delta);
    this._updatePlayer(delta);
    this._resetPlayer();
    this._stats.update();

    if(this._mixer){
      this._mixer.update(delta);
    }

    this._renderer.render(this._scene,this._activeCamera);

    requestAnimationFrame(this._animate.bind(this));
  }
  /**
   * 控制用户
   */
  _controlPlayer(deltaTime){
    const capsuleFront  = new THREE.Vector3(0,0,0);
    this._capsule.getWorldDirection(capsuleFront);

    if(this._keyStates['KeyW']){
      this._playerDirection.z = 1;

      this._playerVelocity.add(capsuleFront.multiplyScalar(deltaTime * 5));
    }

    if(this._keyStates["KeyS"]){
      this._playerDirection.z = 1;
      this._playerVelocity.add(capsuleFront.multiplyScalar(-deltaTime * 5));
    }

    if(this._keyStates["KeyA"]){
      this._playerDirection.x = 1;
      capsuleFront.cross(this._capsule.up);
      this._playerVelocity.add(capsuleFront.multiplyScalar(-deltaTime));
    }

    if(this._keyStates["KeyD"]){
      this._playerDirection.x = 1;
      capsuleFront.cross(this._capsule.up);
      this._playerVelocity.add(capsuleFront.multiplyScalar(deltaTime));
    }

    if(this._keyStates["Space"]){
      this._playerVelocity.y = 15;
    }

  }
  /**
   * 更新角色
   * @param {*} deltaTime 
   */
  _updatePlayer(deltaTime){
    let damping = -0.05;
    if(this._playerOnFloor){
      this._playerVelocity.y = 0;
      this._keyStates.isDown || this._playerVelocity.addScaledVector(this._playerVelocity,damping);
    }else{
      this._playerVelocity.y += this._gravity * deltaTime;
    }

    const playerMoveDistance = this._playerVelocity.clone().multiplyScalar(deltaTime);
    this._playerCollider.translate(playerMoveDistance);

    this._playerCollider.getCenter(this._capsule.position);

    this._playerCollisions();

    if(Math.abs(this._playerVelocity.x) + Math.abs(this._playerVelocity.z) > 0.1 && Math.abs(this._playerVelocity.x) + Math.abs(this._playerVelocity.z) <= 3){
      this._fadeToAction("Walking");
    }else if(Math.abs(this._playerVelocity.x) + Math.abs(this._playerVelocity.z) > 3){
      this._fadeToAction("Running");
    }else{
      this._fadeToAction("Idle");
    }
  }
  _resetPlayer(){
    if(this._capsule.position.y < -20){
      this._playerCollider.start.set(0,2.35,0);
      this._playerCollider.end.set(0,3.35,0);
      this._playerCollider.radius = 0.35;
      this._playerCollider.set(0,0,0);
      this._playerDirection.set(0,0,0);
    }
  }
  _playerCollisions(){
      const result = this._worldOctree.capsuleIntersect(this._playerCollider);
      this._playerOnFloor = false;

      if(result){
        this._playerOnFloor = result.normal.y > 0;
        this._playerCollider.translate(result.normal.multiplyScalar(result.depth));
      }
  }


  _addEventListener(){
    document.addEventListener("keydown",e=>{
      this._keyStates[e.code] = true;
      this._keyStates.isDown= true;
    },false);

    document.addEventListener("keyup",e=>{
      this._keyStates[e.code] = false;
      this._keyStates.isDown  = false;

      if(e.code === "KeyV"){
        this._activeCamera = this._activeCamera === this._perspectiveCamera ? this._backPerspectiveCamera : this._perspectiveCamera;
      }

      if(e.code === "KeyT"){
        this._fadeToAction("Wave");
      }
    },false);

    document.addEventListener("mousedown",e=>{
      document.body.requestPointerLock();
    },false);

    window.addEventListener("mousemove",(e)=>{
      this._capsule.rotation.y -= e.movementX * 0.003;
      this._capsuleBodyControl.rotation.x += e.movementY * 0.003;

      if(this._capsuleBodyControl.rotation.x > Math.PI / 8){
        this._capsuleBodyControl.rotation.x = Math.PI / 8;
      }else if(this._capsuleBodyControl.rotation.x < - Math.PI / 8){
        this._capsuleBodyControl.rotation.x = - Math.PI / 8;
      }
    },false);
  }

  _fadeToAction( name, duration=0.5 ) {
				//console.log('actions=',this._actions);
    this._previousAction = this._activeAction;
    this._activeAction = this._actions[name];
    if(this._previousAction != null)
    {
      if ( this._previousAction !== this._activeAction ) {

        this._previousAction.fadeOut( duration );		 

      }

      this._activeAction
        .reset()
        .setEffectiveTimeScale( 1 )
        .setEffectiveWeight( 1 )
        .fadeIn( duration )
        .play();
      }

  }

}

export class LightClass{
  constructor(_options={}){
    this._options = _options;
    this._init();
  }

  _init(){
    this._clock = new THREE.Clock();
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x88ccee);

    this._perspectiveCamera = new THREE.PerspectiveCamera(70,window.innerWidth / window.innerHeight,0.1,100);
    this._perspectiveCamera.position.set(0,5,10);

    this._renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth,window.innerHeight);
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.VSMShadowMap;
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 2.;
    this._options.dom.appendChild(this._renderer.domElement);

    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
    // 加载纹理
    const hdrLoader = new RGBELoader();
    hdrLoader.load("./hdr/023.hdr",texture=>{
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.format = THREE.RGBAFormat;
      this._scene.background = texture;
      this._scene.environment = texture;
      this._sphereMaterial.envMap = this._cubeRenderTarget.texture;
    });

    const sphereGeometry = new THREE.SphereGeometry(1,32,32);
    this._sphereMaterial = new THREE.MeshPhysicalMaterial({
      color:0xffdcff,
      transparent:true,
      roughness:0,
      metalness:1
    });

    const sphere = new THREE.Mesh(sphereGeometry,this._sphereMaterial);
    sphere.position.set(0,0,0);
    this._scene.add(sphere);

    // 创建立方体
    const boxGeometry = new THREE.BoxGeometry(1,1,1);
    const boxMaterial = new THREE.MeshPhysicalMaterial({
      color:0xffffff,
    });
    const box = new THREE.Mesh(boxGeometry,boxMaterial);
    box.position.set(3,0,0);
    this._scene.add(box);

    this._cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512,{
      wrapS:THREE.ClampToEdgeWrapping,// - default is ClampToEdgeWrapping.
      wrapT:THREE.ClampToEdgeWrapping,// - default is ClampToEdgeWrapping.
      magFilter:THREE.LinearFilter,// - default is .LinearFilter.
      minFilter:THREE.LinearFilter,// - default is LinearFilter.
      generateMipmaps:true,// - default is false.
      format:THREE.RGBAFormat,// - default is RGBAFormat.
      type:THREE.UnsignedByteType,// - default is UnsignedByteType.
      anisotropy:1,// - default is 1. See Texture.anisotropy
      colorSpace:THREE.SRGBColorSpace,// - default is NoColorSpace.
      depthBuffer:true,// - default is true.
      stencilBuffer:false,// - default is false.
    });
    this._cubeCamera = new THREE.CubeCamera(0.1,1000,this._cubeRenderTarget);

    // 创建平面
    const planeGeometry= new THREE.PlaneGeometry(10,10);
    const planeMaterial = new THREE.MeshPhysicalMaterial({
      color:0xfdcd00,
      side:THREE.DoubleSide,
      transparent:true,// 开启透明
      depthWrite:false,
    });
    const planeUseCanvas = new THREE.Mesh(planeGeometry,planeMaterial);

    // 创建canvas 对象
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    canvas.style.position = "absolute";
    canvas.style.top = "0px";
    canvas.style.left = "0px";
    canvas.style.zIndex = "1";
    canvas.style.transformOrigin = "0 0";
    canvas.style.transform ="scale(0.1)";
    const context = canvas.getContext("2d");
    var image = new Image();
    image.src = "./textures/chat.png";
    image.onload = function(){
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = "bold 100px Arial";
      context.fillStyle = "rgba(0,255,255,1)";
      context.fillText("Hello World" ,canvas.width / 2,canvas.height / 2);
      let texture = new THREE.CanvasTexture(canvas);
      planeUseCanvas.material.map = texture;
      planeUseCanvas.material.alphaMap = texture;
      planeUseCanvas.material.needsUpdate = true;
    };
    //document.body.appendChild(canvas);

    this._scene.add(planeUseCanvas);
    // 反射
    const plane = new Reflector(planeGeometry,{
      textureWidth:1024,
      textureHeight:1024,
      color:0xff0001,
    });
    plane.position.set(0,-1,0);
    plane.rotation.x = - Math.PI /2;
    //this._scene.add(plane);



    this._animate();
  }

  _animate(){
    let delta = this._clock.getDelta();
    this._orbitControls.update();

    this._cubeCamera.update(this._renderer,this._scene);
    this._renderer.render(this._scene,this._perspectiveCamera);

    requestAnimationFrame(this._animate.bind(this));
  }

}

export class World3D{
  constructor(_options={}){
    this._options = _options;
    this._init();
  }

  _init(){
    this._threePlus = new ThreePlus(this._options);
    this._threePlus.setBg("./world3D/assets/textures/sky11.hdr");

    this._threePlus.addCloudsPlus();

    this._threePlus.addOcean();

    // 加载模型
    this._threePlus.gltfLoader("./world3D/model/city/metaScene03.glb").then(res=>{
      let planeGroup = new THREE.Group();
      console.log(res)
      planeGroup.position.copy(res.value.scene.children[0].position);
      res.value.scene.add(planeGroup);
      res.value.scene.traverse(child=>{
        if(child.isMesh && child.material && child.material.name.indexOf("KB3D_DLA_ConcreteRiverRock") != -1){
          planeGroup.add(child.clone());
          child.visible = false;
        }


      if (
        child.isMesh &&
        child.material &&
        child.material.name.indexOf("KB3D_DLA_ConcreteScreedTan") != -1
      ) {
        // console.log("墙", child);
        planeGroup.add(child.clone());
        child.visible = false;
      }
      if (
        child.isMesh &&
        child.material &&
        child.material.name.indexOf("KB3D_DLA_ConcretePittedGrayLight") != -1
      ) {
        // console.log("光墙", child);
        planeGroup.add(child.clone());
        child.visible = false;
      }
      });
      this._threePlus.addPhysics(planeGroup);
      this._threePlus._scene.add(res.value.scene);
    });
  }

  _windowResizeFun() {
    this._threePlus._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._threePlus._perspectiveCamera.updateProjectionMatrix();

    this._threePlus._renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

/****
 * 学习物理引擎cannon-es
 */

export class StudyCannon{
  constructor(_options={}){
    this._options = _options;

    this._init();
  }
  _init(){
    // 创建物理世界
    this.__createWorld();
    // 创建3D场景
    this.__create3D();
  }

  __createWorld(){
    this._world = new CANNON.World();
    // 设置重力
    this._world.gravity.set(0,-9.82,0);

       // 设置立方体材质
       const boxMaterial = new CANNON.Material("boxMaterial");
       boxMaterial.friction = 0.7;
       boxMaterial.restitution = 1;
    // 创建一个球
    const sphereRadius = 0.5;
    const sphereShape = new CANNON.Sphere(sphereRadius);
    this._sphereBody = new CANNON.Body({
      mass:1,
      shape:sphereShape,
      position:new CANNON.Vec3(0,5,0),
      material:boxMaterial,
    });
    // 将刚体对象添加到物理世界中
    this._world.addBody(this._sphereBody);
    
 
        
    // 创建一个物理世界的平面
    const planeShape = new CANNON.Box(new CANNON.Vec3(5,0.1,5));
    const planeBody = new CANNON.Body({
      mass:0,
      shape:planeShape,
      position:new CANNON.Vec3(0,0,0),
      type:CANNON.Body.STATIC,
      material:boxMaterial,
    });
    planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),0.1);
    this._world.addBody(planeBody);

    // 创建第二个物理立方体
    const boxSlipperyMaterial = new CANNON.Material("boxSlipperyMaterial");
    boxSlipperyMaterial.friction = 0;

    const boxShape2 = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
    // 创建一个刚体对象
    this._boxBody2 = new CANNON.Body({
      shape:boxShape2,
      position:new CANNON.Vec3(1,5,0),
      mass:1,
      material:boxSlipperyMaterial,
    });
    this._world.addBody(this._boxBody2);
  
    // 定义接触材质
    const materialConnect = new CANNON.ContactMaterial(boxMaterial,boxSlipperyMaterial,{
      friction:0.1,
      restitution:0.1,
    });
    this._world.addContactMaterial(materialConnect);
  }

  __create3D(){
    this._scene = new THREE.Scene();
    this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
    this._perspectiveCamera.position.z = 3;

    this._renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
    this._renderer.setSize(window.innerWidth ,window.innerHeight);
    this._options.dom.appendChild(this._renderer.domElement);

    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
    this._orbitControls.enableDamping = true;


    // 创建球体
    const sphereGeometry = new THREE.SphereGeometry(0.5,32,32);
    const sphereMaterial = new THREE.MeshBasicMaterial({color:0x00ff00});
    this._sphereMesh = new THREE.Mesh(sphereGeometry,sphereMaterial);
    this._scene.add(this._sphereMesh);
    this._sphereMesh.name = "球体";

    // 创建一个平面
    const boxGeometry = new THREE.BoxGeometry(10,0.2,10);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color:0xffff00,
    });
    const planeMesh = new THREE.Mesh(boxGeometry,planeMaterial);
    planeMesh.rotation.x = 0.1;
    this._scene.add(planeMesh);

    this._clock = new THREE.Clock();

    const boxGeometry2 = new THREE.BoxGeometry(1,1,1);
    const boxMaterial2 = new THREE.MeshBasicMaterial({
      color:0xfdcdcd,
      side:THREE.DoubleSide,
    });
    this._box2 = new THREE.Mesh(boxGeometry2,boxMaterial2);
    this._scene.add(this._box2);



    this.__animate();
  }

  __animate(){
    let delta = this._clock.getDelta();
    this._world.step(1/60,delta);

    this._sphereMesh.position.copy(this._sphereBody.position);
    this._sphereMesh.quaternion.copy(this._sphereBody.quaternion);

    this._box2.position.copy(this._boxBody2.position);
    this._box2.quaternion.copy(this._boxBody2.quaternion);


    this._orbitControls.update();
    this._renderer.render(this._scene,this._perspectiveCamera);

    requestAnimationFrame(this.__animate.bind(this));
  }

  _windowResizeFun(){
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();

    this._renderer.setSize(window.innerWidth,window.innerHeight);
  }
}

/**
 * 碰撞事件
 */
export class CannonCollideEvent{
  constructor(_options={}){
    this._options = _options;

    this._init();
  }

  _init(){
    this._scene = new THREE.Scene();
    this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
    this._perspectiveCamera.position.set(0,5,10);

    this._renderer = new THREE.WebGLRenderer({antialias:true});
    this._renderer.setSize(window.innerWidth,window.innerHeight);
    this._options.dom.appendChild(this._renderer.domElement);

    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
    this._orbitControls.enableDamping = true;

    this._arrays =[];//{body:"物理世界对象",mesh:"Three.js 对象"}
    this._group_1 = 1; // 设置碰撞组，数值要2的幂
    this._group_2 = 2;
    this._group_3 = 4;
    this._group_4 = 8;

    this._world = new CANNON.World();
    this._world.allowSleep = true;// 设置物理世界允许休眠
    this._world.gravity.set(0,-9.82,0);

    const boxMaterial = new CANNON.Material("BoxMaterial");
    boxMaterial.friction = 0.8;
    boxMaterial.restitution = 10;


    const boxShape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
    const boxBody = new CANNON.Body({
      shape:boxShape,
      position:new CANNON.Vec3(-5,5,0),
      mass:1,
      material:boxMaterial,
      collisionFilterGroup:this._group_1,
      collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4,
      name:"Box",
    });
    boxBody.name = "Box";
    // 设置立方体允许休眠
    boxBody.allowSleep = true;
    boxBody.sleepSpeedLimit = 0.5;
    boxBody.sleepTimeLimit = 1;// 表示当速度小于0.5，时间超过1秒就进入休眠状态

    this._world.addBody(boxBody);

    // 创建立方体
    const boxGeometry_ = new THREE.BoxGeometry(1,1,1);
    const boxMaterial_ = new THREE.MeshBasicMaterial({color:0xaaffdc,side:THREE.DoubleSide});
    const boxMesh_ = new THREE.Mesh(boxGeometry_,boxMaterial_);
    this._scene.add(boxMesh_);
    this._arrays.push({body:boxBody,mesh:boxMesh_});

    // 创建物理球
    const sphereShape = new CANNON.Sphere(0.5);
    // 创建一个刚体
    const sphereBody = new CANNON.Body({
      shape:sphereShape,
      position:new CANNON.Vec3(0,0.5,0),
      mass:1,
      material:boxMaterial,
      collisionFilterGroup:this._group_2,
      collisionFilterMask:this._group_1 | this._group_4,
      name:"Sphere"
    });
    this._world.addBody(sphereBody);

    // 创建几何球体
    const sphereGeometry = new THREE.SphereGeometry(0.5,32,32);
    const sphereMaterial = new THREE.MeshBasicMaterial({color:0x0000fd});
    const sphereMesh = new THREE.Mesh(sphereGeometry,sphereMaterial);

    this._scene.add(sphereMesh);
    this._arrays.push({body:sphereBody,mesh:sphereMesh});

    // 创建物理圆柱体
    const cylinderShape = new CANNON.Cylinder(0.5,0.5,1,32);
    const cylinderBody = new CANNON.Body({
      shape:cylinderShape,
      position:new CANNON.Vec3(2,0.5,0),
      mass:2,
      material:boxMaterial,
      collisionFilterGroup:this._group_3,
      collisionFilterMask:this._group_1 | this._group_4,
      name:"Plane",
    });
    this._world.addBody(cylinderBody);

    const cylinderGeometry = new THREE.CylinderGeometry(0.5,0.5,1,32);
    const cylinderMaterial = new THREE.MeshBasicMaterial({
      color:0xff0000,
    });
    const cylinderMesh = new THREE.Mesh(cylinderGeometry,cylinderMaterial);

    this._scene.add(cylinderMesh);
    this._arrays.push({body:cylinderBody,mesh:cylinderMesh});

    // 创建地面
    const planeShape = new CANNON.Plane();
    const planeBody = new CANNON.Body({
      mass:0,shape:planeShape,
      restitution:1,
      friction:0.1,
      collisionFilterGroup:this._group_4,
      collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4,
      name:"Plane",
    });
    planeBody.name = "Plane";
    planeBody.quaternion.setFromEuler(-Math.PI / 2,0,0);
    this._world.addBody(planeBody);

    const planeGeometry = new THREE.PlaneGeometry(1024,1024,1,1);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color:0xdcdcdc,
      side:THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeometry,planeMaterial);
    planeMesh.rotation.x = - Math.PI / 2;

    this._scene.add(planeMesh);

    

    // 监听休眠事件
    boxBody.addEventListener('sleepy',e=>{
      console.log("即将进入休眠:",e);
    });

    boxBody.addEventListener("sleep",e=>{
      console.log("进入休眠:",e);
    });
    /**
     * 给立方体添加碰撞事件，e返回=>{type:"collide",body:"表示与boxBody 发生碰撞的刚体对象",contact:"接触的信息",target:"代表boxBody本身"}
     */
    boxBody.addEventListener("collide",e=>{
      console.log("碰撞了:",e);
      let impactStrength = e.contact.getImpactVelocityAlongNormal();
    });
    // 设置立方体的初始速度
    boxBody.velocity.set(2,0,0);


    this._clock = new THREE.Clock();

    this._animate();
  }
  
  _animate(){
    let delta = this._clock.getDelta();
    this._world.step(1/60,delta);

    for(let i =0; i < this._arrays.length;i++){
      this._arrays[i].mesh.position.copy(this._arrays[i].body.position);
      this._arrays[i].mesh.quaternion.copy(this._arrays[i].body.quaternion);
    }

    this._orbitControls.update();
    this._renderer.render(this._scene,this._perspectiveCamera);
    requestAnimationFrame(this._animate.bind(this));
  }

  _windowResizeFun(){
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();

    this._renderer.setSize(window.innerWidth,window.innerHeight);
  }
}

/**
 * 形状
 */
export class CannonShape{
  constructor(_options={}){
    this._options = _options;
    this._world = new CANNON.World();
    this._world.gravity.set(0,-9.82,0);


    this._arrays =[];//{body:"刚体对象",mesh:"网格对象"}
    this._group_1 = 1;
    this._group_2 = 2;
    this._group_3 = 4;
    this._group_4 = 8;
    this._init();

    this._isClick = false;// 鼠标是否按下
    this._initFixedConstraint();

    // 创建Lock约束
    this._initLockConstraint();

    // point 约束
    this._initPointConstraint();

    // distance 约束
    this._initDistanceConstraint();

    // 距离约束实现布料效果
    this._initDistanceConstraintOfCloth();

    // 弹簧约束
    this._initSpringConstraint();

    // 铰链约束
    this._initHingeConstraint();
  }
  /**
   * 铰链约束
   */
  _initHingeConstraint(){
    const fixedBody = new CANNON.Body({
      mass:0,
      position:new CANNON.Vec3(-5,15,0)});
      const fixedShape = new CANNON.Box(new CANNON.Vec3(2.5,2.5,0.25));
      fixedBody.addShape(fixedShape);
      fixedBody.type = CANNON.Body.STATIC;
      this._world.addBody(fixedBody);

      const fixedMesh = new THREE.Mesh(
        new THREE.BoxGeometry(5,5,0.5),
        new THREE.MeshBasicMaterial({color:0x00ff00})
      );
      fixedMesh.position.copy(fixedBody.position);
      fixedMesh.quaternion.copy(fixedBody.quaternion);
      this._scene.add(fixedMesh);
      this._arrays.push({body:fixedBody,mesh:fixedMesh});

      // 创建移动的物体
      const moveBody = new CANNON.Body({
        mass:1,
        position:new CANNON.Vec3(-10,4,0)
      });
      moveBody.addShape(fixedBody);
      this._world.addBody(moveBody);

      const moveMesh = new THREE.Mesh(
        new THREE.BoxGeometry(5,5,0.5),
        new THREE.MeshBasicMaterial({color:0x00ff00})
      );
      moveMesh.position.copy(moveBody.position);
      moveMesh.quaternion.copy(moveBody.quaternion);
      this._arrays.push({body:moveBody,mesh:moveMesh});
      this._scene.add(moveMesh);

      // 创建铰链约束
      const hingeConstraint = new CANNON.HingeConstraint(fixedBody,moveBody,{
        pivotA:new CANNON.Vec3(0,-3,0),
        pivotB:new CANNON.Vec3(0,3,0),
        axisA:new CANNON.Vec3(1,0,0),
        axisB:new CANNON.Vec3(1,0,0),
        collideConnected:true,
      });

      this._world.addConstraint(hingeConstraint);

      window.addEventListener('click',e=>{
        const force = new CANNON.Vec3(0,0,-100);
        moveBody.applyForce(force,moveBody.position);
        hingeConstraint.enableMotor();
        hingeConstraint.setMotorSpeed(10);

      },false);
  }
  /**
   * 实现弹簧约束
   */
  _initSpringConstraint(){
    // 创建一个固定的静态球
    const sphereShape = new CANNON.Sphere(0.2);
    const sphereBody = new CANNON.Body({
      mass:0,
      shape:sphereShape,
      position:new CANNON.Vec3(0,26,0),
      type:CANNON.Body.STATIC,
    });
    this._world.addBody(sphereBody);

    const sphereGeometry = new THREE.SphereGeometry(0.2,32,32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color:0xfffdec,
      side:THREE.DoubleSide,
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry,sphereMaterial);
    sphereMesh.position.copy(sphereBody.position);
    this._scene.add(sphereMesh);
    this._arrays.push({body:sphereBody,mesh:sphereMesh});

    const boxShape = new CANNON.Box(new CANNON.Vec3(1,1,0.3));
    const boxBody = new CANNON.Body({
      mass:1,
      shape:boxShape,
      position:new CANNON.Vec3(0,6,0)
    });
    this._world.addBody(boxBody);

    const boxGeometry = new THREE.BoxGeometry(2,2,0.6);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color:0xcdfdcc,
      side:THREE.DoubleSide,
    });
    const boxMesh = new THREE.Mesh(boxGeometry,boxMaterial);
    this._scene.add(boxMesh);
    this._arrays.push({body:boxBody,mesh:boxMesh});

    // 创建一个弹簧拉住立方体
    const spring = new CANNON.Spring(sphereBody,boxBody,{
      restLength:5,// 弹簧的长度
      stiffness:100,// 弹簧的刚度
      damping:1,// 弹簧的阻尼
      localAnchorA:new CANNON.Vec3(0,0,0),
      localAnchorB:new CANNON.Vec3(-1,1,0)
    });

    this._world.addEventListener('preStep',()=>{
      spring.applyForce();
    });
  }

  /**
   * 距离约束实现布料效果
   */
  _initDistanceConstraintOfCloth(){
    const distanceMaterialOfCloth = new CANNON.Material("distanceMaterialOfCloth");
    distanceMaterialOfCloth.friction = 0.1;
    distanceMaterialOfCloth.restitution = 10;

    const rows = 15;
    const cols = 15;
    this._bodies = {
      // rows-cols:body
    };
    const boxGeometry = new THREE.BoxGeometry(0.2,0.2,0.2);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color:0x00CC66,
      side:THREE.DoubleSide,
    });
    const particleShape = new CANNON.Particle();
    for(let i = 0; i < cols;i++){
      for(let j = 0; j < rows;j++){
        const body = new CANNON.Body({
          mass:0.5,
          shape:particleShape,
          position:new CANNON.Vec3(i - cols * 0.5,10,j - rows * 0.5),
        });
        this._world.addBody(body);
        this._bodies[`${i}-${j}`] = body;

        const mesh = new THREE.Mesh(boxGeometry,boxMaterial);
        mesh.position.set(i - cols * 0.5,10,j - rows * 0.5);
        this._arrays.push({body:body,mesh:mesh});
        this._scene.add(mesh);
      }
    }

    for(let i =0; i < cols;i++){
      for(let j = 0;j < rows;j++){
        const body = this._bodies[`${i}-${j}`];
        if(i > 0){
          const body2 = this._bodies[`${i -1}-${j}`];
          const distanceConstraint = new CANNON.DistanceConstraint(body,body2,1);
          this._world.addConstraint(distanceConstraint);
        }

        if(j > 0){
          const body2 = this._bodies[`${i}-${j-1}`];
          const distanceConstraint = new CANNON.DistanceConstraint(body,body2,1);
          this._world.addConstraint(distanceConstraint);
        }
      }
    }

    const sphereShape = new CANNON.Sphere(5);
    const sphereBody = new CANNON.Body({
      mass:0,
      shape:sphereShape,
      position:new CANNON.Vec3(0,0,0),
      material:distanceMaterialOfCloth,
      collisionFilterGroup:this._group_1,
      collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4,
    });
    this._world.addBody(sphereBody);

    const sphereGeometry = new THREE.SphereGeometry(5,5,5);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color:0xCC3300,
      side:THREE.DoubleSide,
    });

    const sphereMesh = new THREE.Mesh(sphereGeometry,sphereMaterial);
    sphereMesh.position.set(0,0,0);
    this._arrays.push({body:sphereBody,mesh:sphereMesh});
    this._scene.add(sphereMesh);

  }
  /**
   * 距离约束
   */
  _initDistanceConstraint(){
    const distanceMaterial = new CANNON.Material("DistanceMaterial");
    distanceMaterial.friction = 0;
    distanceMaterial.restitution = 1.2;

    const planeShape = new CANNON.Box(new CANNON.Vec3(5,0.1,5));
    const planeBody = new CANNON.Body({shape:planeShape,position:new CANNON.Vec3(8,4,0),type:CANNON.Body.STATIC,material:distanceMaterial,collisionFilterGroup:this._group_2,collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4});
    planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),Math.PI / 4);
    this._world.addBody(planeBody);

    const planeGeometry = new THREE.BoxGeometry(10,0.2,10);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color:0xfdcdfd,
      side:THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeometry,planeMaterial);
    planeMesh.position.y = 4;
    planeMesh.rotation.y = Math.PI / 4;

    this._scene.add(planeMesh);
    this._arrays.push({body:planeBody,mesh:planeMesh});

    const sphereShape = new CANNON.Sphere(0.5);
    let previousBody = null;
    for(let i = 0;i < 20; i ++){
      let sphereBody = new CANNON.Body({
        mass:i == 0 ? 0 : 1,
        type:i == 0 ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC,
        shape:sphereShape,
        position:new CANNON.Vec3(-4,15 - i * 1.2,0),
        material:distanceMaterial,
        collisionFilterGroup:this._group_1,
        collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4,
      });

      this._world.addBody(sphereBody);

      const sphereGeometry = new THREE.SphereGeometry(0.5,3,3);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color:0xdefdcd,
        side:THREE.DoubleSide,
      });
      const sphereMesh = new THREE.Mesh(sphereGeometry,sphereMaterial);
      this._scene.add(sphereMesh);

      this._arrays.push({body:sphereBody,mesh:sphereMesh});
      
      if(i > 0){
        let distanceConstraint = new CANNON.DistanceConstraint(previousBody,sphereBody,1.2,10);
        this._world.addConstraint(distanceConstraint);
      }
      previousBody = sphereBody;
    }
  }

  /**
   * 点约束
   */
  _initPointConstraint(){
    this._boxPointMaterial = new CANNON.Material("boxPointMaterial");
    this._boxPointMaterial.friction = 0.1;
    this._boxPointMaterial.restitution = 0.9;

    const planeShape = new CANNON.Box(new CANNON.Vec3(5,0.1,5));
    const planeBody = new CANNON.Body({
      mass:0,
      shape:planeShape,
      position:new CANNON.Vec3(0,4,-8),
      type:CANNON.Body.STATIC,
      material:this._boxPointMaterial,
      collisionFilterGroup:this._group_2,
      collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4,
    });

    planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),Math.PI / 4);
    this._world.addBody(planeBody);

    const planeGeometry = new THREE.BoxGeometry(10,0.2,10);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color:0xfdcde,
      side:THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeometry,planeMaterial);
    planeMesh.position.y = 4;
    planeMesh.rotation.x = Math.PI / 4;
    planeMesh.position.z = -8;

    this._scene.add(planeMesh);

    this._arrays.push({body:planeBody,mesh:planeMesh});

    const boxShape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.05));
    let previousBody = null;
    for(let i =0; i < 20;i++){
      const y = 30 - i * 1.1;
      const boxBody = new CANNON.Body({
        mass: i == 0 ? 0 : i,
        type:i == 0 ? CANNON.Body.STATIC : CANNON.Body.DYNAMIC,
        shape:boxShape,
        position:new CANNON.Vec3(-2,y,0),
        material:this._boxPointMaterial,
        collisionFilterGroup:this._group_2,
        collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4
      });

      this._world.addBody(boxBody);
      const boxGeometry= new THREE.BoxGeometry(1,1,0.1);
      const boxMaterial = new THREE.MeshBasicMaterial({color:0x00ff00});
      const boxMesh = new THREE.Mesh(boxGeometry,boxMaterial);
      boxMesh.position.y = y;
      this._scene.add(boxMesh);

      this._arrays.push({body:boxBody,mesh:boxMesh});

      if(i > 0){
        const pointToPointConstraint = new CANNON.PointToPointConstraint(boxBody,new CANNON.Vec3(-0.5,0.55,0),previousBody,new CANNON.Vec3(-0.5,-0.55,0));
        this._world.addConstraint(pointToPointConstraint);

        const constraint_2 = new CANNON.PointToPointConstraint(boxBody,new CANNON.Vec3(0.5,0.55,0),previousBody,new CANNON.Vec3(0.5,-0.55,0));
        //this._world.addConstraint(constraint_2);
      }

      previousBody = boxBody;
    }

    window.addEventListener('click',e=>{
      // 创建一个球
      const y = 16;
      const sphereShape = new CANNON.Sphere(0.5);
      const sphereBody = new CANNON.Body({
        mass:2,
        shape:sphereShape,
        position:new CANNON.Vec3(0,y,3),
        material:this._boxPointMaterial,
        collisionFilterGroup:this._group_3,
        collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4,
      });
      sphereBody.velocity.set(0,0,-10);
      this._world.addBody(sphereBody);

      const sphereGeometry = new THREE.SphereGeometry(0.5,2,2);
      const sphereMaterial = new THREE.MeshBasicMaterial({color:0x000dff,side:THREE.DoubleSide});
      const sphereMesh = new THREE.Mesh(sphereGeometry,sphereMaterial);
      sphereMesh.position.y = y;
      this._scene.add(sphereMesh);
      this._arrays.push({body:sphereBody,mesh:sphereMesh});

    },false);
  }

  /**
   * 创建Lock 约束
   */
  _initLockConstraint(){
    const boxMaterialConstraint = new CANNON.Material("boxMaterialConstraint");
    boxMaterialConstraint.friction = 0;
    boxMaterialConstraint.restitution = 0.1;
    const planeShape = new CANNON.Box(new CANNON.Vec3(10,1,10));
    const planeBody = new CANNON.Body({
      shape:planeShape,
      position:new CANNON.Vec3(0,-0.1,0),
      type:CANNON.Body.STATIC,
      material:boxMaterialConstraint,
      collisionFilterGroup:this._group_1,
      collisionFilterMask:this._group_1 | this._group_2|this._group_3,
    });
    // 将刚体对象旋转90°
    planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),Math.PI / 2);
    this._world.addBody(planeBody);

    const planeGeometry = new THREE.BoxGeometry(10,1,10);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color:0xffffdc,
      side:THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeometry,planeMaterial);
    planeMesh.position.y = -0.1;
    planeMesh.position.x = 6;
    // 绕X轴旋转90°
    planeMesh.rotation.x = Math.PI /2;
    this._scene.add(planeMesh);

    let previousBody;
    const boxGeometry = new THREE.BoxGeometry(1,1,1);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color:0xFF0099,
      side:THREE.DoubleSide,
    });
    const boxShape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
    for(let i =0; i < 20;i++){
        const boxMesh = new THREE.Mesh(boxGeometry,boxMaterial);
        const y = 1 + i + 0.5 * i;
        boxMesh.position.y = y;
        boxMesh.position.x = 1;

        const boxBody = new CANNON.Body({
          mass:1,
          shape:boxShape,
          position:new CANNON.Vec3( 1,y,0),
          material:boxMaterialConstraint,
          collisionFilterGroup:this._group_2,
          collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4,
        })
        this._arrays.push({body:boxBody,mesh:boxMesh});
        this._world.addBody(boxBody);
        this._scene.add(boxMesh);

        if(previousBody){
          const constraint = new CANNON.LockConstraint(boxBody,previousBody);
          this._world.addConstraint(constraint);
          //this._world.removeConstraint(constraint);// 移除约束
        }

        previousBody = boxBody;
    }
  }
  /**
   * 添加固定约束
   */
  _initFixedConstraint(){
    // 创建固定刚体
    const fixedBody = new CANNON.Body({
      mass:0,
      position:new CANNON.Vec3(0,10,0),
    });
    const fixedShape = new CANNON.Box(new CANNON.Vec3(2.5,2.5,0.25));
    fixedBody.addShape(fixedShape);
    // 设置body 为静态类型
    fixedBody.style = CANNON.Body.STATIC;
    // 将body 添加到物理世界
    this._world.addBody(fixedBody);
    // 创建three.js 可见的3D对象
    const fixedMesh = new THREE.Mesh(new THREE.BoxGeometry(5,5,0.5),new THREE.MeshBasicMaterial({
      color:0x00ff00,
      side:THREE.DoubleSide,
    }));
    fixedMesh.position.copy(fixedBody.position);
    fixedMesh.quaternion.copy(fixedBody.quaternion);
    this._arrays.push({body:fixedBody,mesh:fixedMesh});
    this._scene.add(fixedMesh);

    // 创建移动body
    const moveBody = new CANNON.Body({
      mass:2,
      position:new CANNON.Vec3(0,4,0),
    });
    moveBody.addShape(fixedShape);
    this._world.addBody(moveBody);

    const moveMesh = new THREE.Mesh(new THREE.BoxGeometry(5,5,0.5),new THREE.MeshBasicMaterial({
      color:0xfdccdd,
      side:THREE.DoubleSide,
    }));
    moveMesh.position.copy(moveBody.position);
    moveMesh.quaternion.copy(moveBody.quaternion);
    this._arrays.push({body:moveBody,mesh:moveMesh});
    this._scene.add(moveMesh);

    // 创建铰链约束
    const hingeConstraint = new CANNON.HingeConstraint(fixedBody,moveBody,{
      pivotA:new CANNON.Vec3(0,-3,0),
      pivotB:new CANNON.Vec3(0,3,0),
      axisA:new CANNON.Vec3(1,0,0),// 定义BodyA可以绕那个轴进行旋转
      axisB:new CANNON.Vec3(1,0,0),
      collideConnected:false,maxForce:1,
    });
    this._world.addConstraint(hingeConstraint);

    window.addEventListener('click',e=>{
      const force = new CANNON.Vec3(0,0,-1);
      moveBody.applyForce(force,moveBody.position);
      if(this._isClick){
        hingeConstraint.setMotorSpeed(-10);
        this._isClick = false;
      }else{
        hingeConstraint.setMotorSpeed(10);
        this._isClick = true;
      }
      hingeConstraint.enableMotor();
    },false);
  }

  _init(){
   

     this._scene = new THREE.Scene();
     this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
     this._perspectiveCamera.position.set(0,10,10);
     this._perspectiveCamera.lookAt(0,0,0);

     this._renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
     this._renderer.setSize(window.innerWidth, window.innerHeight);
     this._options.dom.appendChild(this._renderer.domElement);

     this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
     this._orbitControls.enableDamping = true;


     // 设置立方体材质
     const boxBodyMaterial = new CANNON.Material("BoxBodyMaterial");
     boxBodyMaterial.friction = 0.1;
     boxBodyMaterial.restitution = 0.8;
     
     // 创建物理世界平面
     const planeShape = new CANNON.Box(new CANNON.Vec3(5,0.1,5));
     const planeBody = new CANNON.Body({
      mass:0,
      type:CANNON.Body.STATIC,
      shape:planeShape,
      position:new CANNON.Vec3(0,-0.1,0),
      material:boxBodyMaterial,
      collisionFilterGroup:this._group_1,
      collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4,
     });
     this._world.addBody(planeBody);

     // 创建three.js 中的平面对象
     const planeGeometry = new THREE.BoxGeometry(10,0.2,10);
     const planeMaterial = new THREE.MeshBasicMaterial({
      color:0xffff00,
      side:THREE.DoubleSide,
     });
     const planeMesh = new THREE.Mesh(planeGeometry,planeMaterial);
     planeMesh.position.y = -0.1;

     this._arrays.push({body:planeBody,mesh:planeMesh});
     this._scene.add(planeMesh);

     const axesHelper = new THREE.AxesHelper(5);
     this._scene.add(axesHelper);


     // 创建物理球
     const sphereShape = new CANNON.Sphere(0.5);
     this._sphereBody = new CANNON.Body({
      mass:1,
      shape:sphereShape,
      position:new CANNON.Vec3(0,5,0),
      material:boxBodyMaterial,
      collisionFilterGroup:this._group_2,
      collisionFilterMask:this._group_1 | this._group_2 | this._group_3 | this._group_4,
     });

     this._sphereBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,0,1),Math.PI);
     this._world.addBody(this._sphereBody);

     const sphereGeometry = new THREE.SphereGeometry(0.5,8,8);
     const sphereMaterial = new THREE.MeshBasicMaterial({color:0xff0000,wireframe:true,side:THREE.DoubleSide});
     const sphereMesh = new THREE.Mesh(sphereGeometry,sphereMaterial);
     sphereMesh.position.set(0,5,0);
     this._scene.add(sphereMesh);

     this._arrays.push({body:this._sphereBody,mesh:sphereMesh});

     window.addEventListener("click",()=>{
        console.log('点击：');
        //this._sphereBody.applyTorque(new CANNON.Vec3(0,0,109));
        //this._sphereBody.applyForce(new CANNON.Vec3(109,0,0),new CANNON.Vec3(0,-0.5,0));
        //this._sphereBody.applyLocalForce(new CANNON.Vec3(50,0,0),new CANNON.Vec3(0,0.5,0));
        //this._sphereBody.applyImpulse(new CANNON.Vec3(40,0,0),new CANNON.Vec3(0,-0.5,0));
        this._sphereBody.applyLocalImpulse(new CANNON.Vec3(10 * (1/60),0,0),new CANNON.Vec3(0,0.5,0));
        
     })
     // 
     this._clock = new THREE.Clock();

     this._animate();
  }

  _animate(){
    let delta = this._clock.getDelta();
    this._world.step(1/60,delta);

    for(let i = 0; i < this._arrays.length;i++){
      this._arrays[i].mesh.position.copy(this._arrays[i].body.position);
      this._arrays[i].mesh.quaternion.copy(this._arrays[i].body.quaternion);
    }

    this._orbitControls.update();
    this._renderer.render(this._scene,this._perspectiveCamera);

    requestAnimationFrame(this._animate.bind(this));
  }
  _windowResizeFun(){
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();

    this._renderer.setSize(window.innerWidth,window.innerHeight);
  }
}
/**
 * 流体系统
 */
export class CannonSphSystem{
  constructor(_options={}){
    this._options = _options;

    this._arrays = [];
    this._group_1 = 1;
    this._group_2 = 2;
    this._group_3 = 4;
    this._group_4 = 8;
    this._world = new CANNON.World();
    this._world.gravity.set(0,-9.82,0);

    this._clock = new THREE.Clock();

    this._init();
  }

  _init(){
    this._scene = new THREE.Scene();
    this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth/ window.innerHeight,0.1,1000);
    this._perspectiveCamera.position.set(0,10,20);
    this._perspectiveCamera.lookAt(0,0,0);

    this._renderer = new THREE.WebGLRenderer({antialias:true});
    this._renderer.setSize(window.innerWidth,window.innerHeight);
    this._options.dom.appendChild(this._renderer.domElement);

    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
    this._orbitControls.enableDamping = true;

    // 创建地面
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass:0,
      shape:groundShape,
      material:new CANNON.Material("groundMaterial"),
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    this._world.addBody(groundBody);

    // 创建地面3D对象
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10,10),
      new THREE.MeshBasicMaterial({color:0x666666})
    );
    groundMesh.rotation.x = - Math.PI / 2;
    this._scene.add(groundMesh);
    this._arrays.push({body:groundBody,mesh:groundMesh});

    // 创建前后左右四个平面
    const planeShape = new CANNON.Plane();
    const planeBodyLeft = new CANNON.Body({
      mass:0,
      shape:planeShape,
      material:new CANNON.Material("planeLeftMaterial")
    });
    planeBodyLeft.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),-Math.PI /2);
    planeBodyLeft.position.set(5,5,0);
    this._world.addBody(planeBodyLeft);

    const planeMeshLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(10,10),
      new THREE.MeshBasicMaterial({
        color:0x668877,
        wireframe:true,
      })
    );
    planeMeshLeft.position.copy(planeBodyLeft.position);
    planeMeshLeft.quaternion.copy(planeBodyLeft.quaternion);
    this._scene.add(planeMeshLeft);
    this._arrays.push({body:planeBodyLeft,mesh:planeMeshLeft});

    //
    const planeBodyRight = new CANNON.Body({
      mass:0,
      shape:planeShape,
      material:new CANNON.Material()
    });
    planeBodyRight.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),Math.PI / 2);
    planeBodyRight.position.set(-5,5,0);
    this._world.addBody(planeBodyRight);

    const planeMeshRight = new THREE.Mesh(
      new THREE.PlaneGeometry(10,10),
      new THREE.MeshBasicMaterial({color:0xfdcdfe,wireframe:true})
    );
    planeMeshRight.position.copy(planeBodyRight.position);
    planeMeshRight.quaternion.copy(planeBodyRight.quaternion);
    this._scene.add(planeMeshRight);
    this._arrays.push({body:planeBodyRight,mesh:planeMeshRight});

    const planeBody3 = new CANNON.Body({
      mass: 0,
      shape: planeShape,
      material: new CANNON.Material(),
    });
    planeBody3.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI);
    planeBody3.position.set(0, 5, 5);
    this._world.addBody(planeBody3);
    
    const planeMesh3 = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({
        color: 0x666666,
        wireframe: true,
      })
    );
    planeMesh3.position.copy(planeBody3.position);
    planeMesh3.quaternion.copy(planeBody3.quaternion);
    this._scene.add(planeMesh3);
    this._arrays.push({body:planeBody3,mesh:planeMesh3});

    
    const planeBody4 = new CANNON.Body({
      mass: 0,
      shape: planeShape,
      material: new CANNON.Material(),
    });
    planeBody4.position.set(0, 5, -5);
    
    this._world.addBody(planeBody4);
    
    const planeMesh4 = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({
        color: 0x666666,
        wireframe: true,
      })
    );
    planeMesh4.position.copy(planeBody4.position);
    planeMesh4.quaternion.copy(planeBody4.quaternion);
    this._scene.add(planeMesh4);
    this._arrays.push({body:planeBody4,mesh:planeMesh4});


    // 创建SPH流体系统
    const sphSystem = new CANNON.SPHSystem();
    sphSystem.density = 1;// 流体密度
    sphSystem.viscosity = 0.01;// 流体粘度
    sphSystem.smoothingRadius = 1;// 流体交互距离
    this._world.subsystems.push(sphSystem);
    
    // 创建流体粒子
    const particleShape = new CANNON.Particle();
    const sphereGeometry = new THREE.SphereGeometry(0.1,10,10);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color:0xff0012,
    });
    const particleMaterial = new CANNON.Material();
    for(let i = 0; i < 400;i++){
      const particleBody = new CANNON.Body({
        mass:0.01,
        shape:particleShape,
        material:particleMaterial,
        friction:0.1,
        restitution:0.4
      });

      particleBody.position.set((Math.random()  - 0.5) * 10,10 + i ,(Math.random()  -0.5) * 10);
      this._world.addBody(particleBody);
      sphereMaterial.color = new THREE.Color(Math.random() ,Math.random() ,Math.random() );

      const particleMesh = new THREE.Mesh(sphereGeometry,sphereMaterial);
      particleMesh.position.copy(particleBody.position);
      particleMesh.quaternion.copy(particleBody.quaternion);
      this._scene.add(particleMesh);
      
       /***或者使用这种方式添加粒子到流物体中-不需要再一次添加**/ 
      sphSystem.add(particleBody);
      //sphSystem.particles.push(particleBody)
      /***********************************************************/
      this._arrays.push({body:particleBody,mesh:particleMesh});
    }


    
    this._animate();
  }

  _animate(){
    let delta = this._clock.getDelta();

    this._world.step(1/60,delta);


   

    for(let i = 0; i < this._arrays.length;i++){
      this._arrays[i].mesh.position.copy(this._arrays[i].body.position);
      this._arrays[i].mesh.quaternion.copy(this._arrays[i].body.quaternion);
    }


    this._renderer.render(this._scene,this._perspectiveCamera);
    this._orbitControls.update();
    requestAnimationFrame(this._animate.bind(this));
  }
  _windowResizeFun(){
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();

    this._renderer.setSize(window.innerWidth,window.innerHeight);
  }

}

/**
 * 汽车模拟
 */
export class CannonCar{
  constructor(_options={}){
      this._options = _options;
      this._arrays = [];
      this._wheelBodies =[];// 汽车轮子
      this._clock = new THREE.Clock();
      this._init();
  }

  _init(){
    // 创建物理世界
    this._world = new CANNON.World();
    this._world.gravity.set(0,-9.82,0);

    this._world.broadphase = new CANNON.SAPBroadphase(this._world);

    this._world.defaultContactMaterial.friction = 0.;
    this._scene  = new THREE.Scene();
    this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,100);
    this._perspectiveCamera.position.set(0,10,20);
    this._perspectiveCamera.lookAt(0,0,0);

    this._renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
    this._renderer.setSize(window.innerWidth,window.innerHeight);
    this._options.dom.appendChild(this._renderer.domElement);

    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
    this._orbitControls.enableDamping = true;

    // 创建地面
    const groundShape = new CANNON.Box(new CANNON.Vec3(50,0.5,50));
    const groundPhysicalMaterial = new CANNON.Material("groundMaterial");
    let groundBody = new CANNON.Body({
      mass:0,
      shape:groundShape,
      type:CANNON.Body.STATIC,
    });
    this._world.addBody(groundBody);

    let groundMesh = new THREE.Mesh(
      new THREE.BoxGeometry(100,1,100),
      new THREE.MeshBasicMaterial({
        color:0x888888,side:THREE.DoubleSide,
      })
    );
    this._scene.add(groundMesh);
    this._arrays.push({body:groundBody,mesh:groundMesh});

    // 创建车身
    let chassisShape = new CANNON.Box(new CANNON.Vec3(2,0.5,1));
    let chassisBody = new CANNON.Body({
      mass:150,
      shape:chassisShape,
    });
    chassisBody.position.set(0,5,0);
    this._world.addBody(chassisBody);

    let chassisMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4,1,2),
      new THREE.MeshBasicMaterial({
        color:0x00ff00
      })
    );
    this._scene.add(chassisMesh);
    this._arrays.push({body:chassisBody,mesh:chassisMesh});

    // 创建悬挂的车辆
    const vehicle = new CANNON.RaycastVehicle({
      chassisBody:chassisBody,
    });
    // 设置车轮的配置
    const wheelOptions = {
      radius:0.5,// 车轮半径
      directionLocal:new CANNON.Vec3(0,-1,0),
      suspensionStiffness:30,// 设置悬架的刚度
      suspensionRestLength:0.3,// 设置悬架的休息长度
      frictionSlip:1.4,// 设置车轮的滑动摩擦力
      dampingRelaxation:2.3,// 设置拉伸的阻尼
      dampingCompression:4.4,// 设置压缩的阻尼
      maxSuspensionForce:100000,// 最大的悬架力
      maxSuspensionTravel:20.2,//设置最大的悬架行程
      axleLocal:new CANNON.Vec3(0,0,1),// 车轮转向轴
    };

    // 设置车轮的配置信息
    const wheelInfoOptions ={
      radius:1,
      suspensionStiffness:30,
      suspensionRestLength:0.3,// 悬架的休息长度
      dampingRelaxation:2.3,// 振动
      dampingCompression:4.4,// 压缩
      maxSuspensionForce:100000,// 最大悬架力
      axleLocal:new CANNON.Vec3(0,0,1),// 车轴本地坐标
      chassisConnectionPointLocal:new CANNON.Vec3(-1,0,1),// 本地坐标系中的车身连接点
      maxSuspensionTravel:0.2,// 最大悬架行程
    }

    // 添加车轮
    vehicle.addWheel({
      ...wheelOptions,
      // 设置车轮的位置
      chassisConnectionPointLocal:new CANNON.Vec3(-1,0,1)
    });

    vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal:new CANNON.Vec3(-1,0,-1)
    });

    vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal:new CANNON.Vec3(1,0,1)
    });

    vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal:new CANNON.Vec3(1,0,-1)
    });


    vehicle.addToWorld(this._world);

    // 车轮形状
    const wheelShape = new CANNON.Cylinder(0.5,0.5,0.2,20);
    const wheelGeometry = new THREE.CylinderGeometry(0.5,0.5,0.2,20);
    const wheelMaterial = new THREE.MeshBasicMaterial({
      color:0xff0001,
      wireframe:true,
    });

    for(let i =0; i < vehicle.wheelInfos.length;i++){
      const wheel = vehicle.wheelInfos[i];
      const cylinderBody = new CANNON.Body({
        mass:0,
        shape:wheelShape,
      });
      cylinderBody.addShape(wheelShape);
      this._wheelBodies.push(cylinderBody);

      const cylinderMesh = new THREE.Mesh(wheelGeometry,wheelMaterial);
      cylinderMesh.rotation.x = - Math.PI / 2;
      const wheelObj = new THREE.Object3D();
      wheelObj.add(cylinderMesh);
      this._scene.add(wheelObj);
      this._arrays.push({body:cylinderBody,mesh:wheelObj});
    }

    this._world.addEventListener("postStep",()=>{
      for(let i =0; i < vehicle.wheelInfos.length;i++){
        vehicle.updateWheelTransform(i);
        const t = vehicle.wheelInfos[i].worldTransform;
        const wheelBody = this._wheelBodies[i];
        wheelBody.position.copy(t.position);
        wheelBody.quaternion.copy(t.quaternion);
      }
    });


    window.addEventListener("keydown",(event)=>{
      if(event.key == "w"){
        vehicle.applyEngineForce(1000,2);
        vehicle.applyEngineForce(1000,3);
      }
      if(event.key == "s"){
        vehicle.applyEngineForce(-1000,2);
        vehicle.applyEngineForce(-1000,3);

      }
      if (event.key == "a") {
        vehicle.setSteeringValue(Math.PI / 4, 2);
        vehicle.setSteeringValue(Math.PI / 4, 3);
      }
      if (event.key == "d") {
        vehicle.setSteeringValue(-Math.PI / 4, 2);
        vehicle.setSteeringValue(-Math.PI / 4, 3);
      }

      if (event.key == "r") {
        chassisBody.velocity.set(0, 0, 0);
        chassisBody.angularVelocity.set(0, 0, 0);
        chassisBody.position.set(0, 10, 0);
      }
      // 空格刹车
      if (event.key == " ") {
        vehicle.setBrake(100, 0);
        vehicle.setBrake(100, 1);
      }
    });


    window.addEventListener("keyup", (event) => {
      if (event.key == "w" || event.key == "s") {
        vehicle.applyEngineForce(0, 2);
        vehicle.applyEngineForce(0, 3);
      }
      if (event.key == "a" || event.key == "d") {
        vehicle.setSteeringValue(0, 2);
        vehicle.setSteeringValue(0, 3);
      }
      if (event.key == " ") {
        vehicle.setBrake(0, 0);
        vehicle.setBrake(0, 1);
      }
    });

    this._animate();
  }

  _animate(){
    let delta = this._clock.getDelta();
    this._world.step(1/60,delta);

    for(let i =0; i < this._arrays.length;i++){
      this._arrays[i].mesh.position.copy(this._arrays[i].body.position);
      this._arrays[i].mesh.quaternion.copy(this._arrays[i].body.quaternion);
    }

    this._orbitControls.update();
    this._renderer.render(this._scene,this._perspectiveCamera);
    requestAnimationFrame(this._animate.bind(this));
  }
  _windowResizeFun(){
    this._perspectiveCamera.aspect = window.innerWidth/window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth,window.innerHeight);
  }

}

/**
 * 刚体汽车
 */
export class CannonRigidCar{
  constructor(_options={}){
    this._options = _options;

    this._vehicle = null;
    this._wheels = [];
    this._arrays =[];
    this._clock = new THREE.Clock();
    this._init();
  }

  _init(){
    this._world = new CANNON.World();
    this._world.gravity.set(0,-9.82,0);

    this._scene = new THREE.Scene();
    this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,100);
    this._perspectiveCamera.position.set(0,10,20);
    this._perspectiveCamera.lookAt(0,0,0);

    // 初始化渲染引擎
    this._renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
    this._renderer.setSize(window.innerWidth,window.innerHeight);
    this._options.dom.appendChild(this._renderer.domElement);

    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
    this._orbitControls.enableDamping = true;

    // 创建地面
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass:0,
      shape:groundShape,
      material:new CANNON.Material("groundMaterial"),
    });

    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI / 2);// 绕X轴旋转
    this._world.addBody(groundBody);

    // 创建地面的three.js 对象
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(100,100),
      new THREE.MeshBasicMaterial({
        color:0x666666,
        
      })
    );

    groundMesh.rotation.x = - Math.PI / 2;
    this._scene.add(groundMesh);
    this._arrays.push({body:groundBody,mesh:groundMesh});

    // 创建车身
    const chassisShape = new CANNON.Box(new CANNON.Vec3(5,0.5,2));
    const chassisBody = new CANNON.Body({
      mass:100,
      shape:chassisShape,
    });
    chassisBody.position.set(0,5,0); // 设置车身离地面的高度

    // 创建3D 车身
    const chassisMesh = new THREE.Mesh(
      new THREE.BoxGeometry(10,1,4),
      new THREE.MeshBasicMaterial({
        color:0x660066,
        side:THREE.DoubleSide,
      })
    );

    this._scene.add(chassisMesh);
    this._arrays.push({body:chassisBody,mesh:chassisMesh});

    // 创建刚性车子
    this._vehicle = new CANNON.RigidVehicle({
      chassisBody:chassisBody
    });
    this._createWheel({
      radius:1.5,
      position:{
        x:-4,y:-0.5,z:3.5
      },
      axis:{
        x:0,
        y:0,
        z:-1
      },
      direction:{
        x:0,
        y:-1,
        z:0,
      }
    });

    this._createWheel({
      radius:1.5,
      position:{
        x:4,y:-0.5,z:3.5
      },
      axis:{
        x:0,
        y:0,
        z:-1
      },
      direction:{
        x:0,
        y:-1,
        z:0,
      }
    });

    this._createWheel({
      radius:1.5,
      position:{
        x:-4,y:-0.5,z:-3.5
      },
      axis:{
        x:0,
        y:0,
        z:-1
      },
      direction:{
        x:0,
        y:-1,
        z:0,
      }
    });
    this._createWheel({
      radius:1.5,
      position:{
        x:4,y:-0.5,z:-3.5
      },
      axis:{
        x:0,
        y:0,
        z:-1
      },
      direction:{
        x:0,
        y:-1,
        z:0,
      }
    });

    this._vehicle.addToWorld(this._world);

    // 控制车子
    window.addEventListener("keydown",(e)=>{
      if(e.key == "w"){
        this._vehicle.setWheelForce(-100,0);
        this._vehicle.setWheelForce(-100,2);
      }

      if(e.key == "s"){
        this._vehicle.setWheelForce(100,0);
        this._vehicle.setWheelForce(100,2);
      }

      if(e.key == "a"){
        this._vehicle.setSteeringValue(Math.PI / 4,0);
        this._vehicle.setSteeringValue(Math.PI / 4,0);

      }

      if(e.key == "d"){
        this._vehicle.setSteeringValue(-Math.PI / 4,0);
        this._vehicle.setSteeringValue(-Math.PI / 4,2);
      }
    });

    window.addEventListener("keyup",e=>{
      if(e.key == "w" || e.key == "s"){
        this._vehicle.setWheelForce(0,0);
        this._vehicle.setWheelForce(0,2);
      }
      if(e.key == "a" || e.key == "d"){
        this._vehicle.setSteeringValue(0,0);
        this._vehicle.setSteeringValue(0,2);
      }
    })

    this._animate();
  }
  /**
   * 创建车轮
   * @param {*} _options 
   */
  _createWheel(_options={}){

    // 创建车轮子
    const wheelShape = new CANNON.Sphere(_options?.radius ?? 1.5);
    const wheelBody = new CANNON.Body({
      mass:1,
      shape:wheelShape,
    });
    
    this._vehicle.addWheel({
      body:wheelBody,
      position:new CANNON.Vec3(_options.position.x,_options.position.y,_options.position.z),
      axis:new CANNON.Vec3(_options.axis.x,_options.axis.y,_options.axis.z),
      direction:new CANNON.Vec3(_options.direction.x,_options.direction.y,_options.direction.z),
    });

    this._wheels.push(wheelBody);

    const wheelMaterial = new THREE.MeshBasicMaterial({
      color:0x660012,
      wireframe:true,
    });
    const wheelGeometry = new THREE.SphereGeometry(1.5,8,8);
    const wheelMesh = new THREE.Mesh(wheelGeometry,wheelMaterial);

    this._scene.add(wheelMesh);

    this._arrays.push({body:wheelBody,mesh:wheelMesh});

    return wheelBody;
  }

  _animate(){
    let delta = this._clock.getDelta();
    this._world.step(1/60,delta);

    for(let i = 0 ; i < this._arrays.length;i++){
      this._arrays[i].mesh.position.copy(this._arrays[i].body.position);
      this._arrays[i].mesh.quaternion.copy(this._arrays[i].body.quaternion);
    }

    this._orbitControls.update();
    this._renderer.render(this._scene,this._perspectiveCamera);
    requestAnimationFrame(this._animate.bind(this));
  }

  _windowResizeFun(){
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();

    this._renderer.setSize(window.innerWidth , window.innerHeight);
  }
}

/**
 * 使用Yuka
 */
export class YukaClass{
  constructor(_options={}){
    this._options = _options;

    this._init();
  }

  _init(){
    this._scene = new THREE.Scene();
    this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
    this._perspectiveCamera.position.set(0,10,20);
    this._perspectiveCamera.lookAt(0,0,0);

    // 创建渲染器
    this._renderer = new THREE.WebGLRenderer({antialias:true});
    this._renderer.shadowMap.enabled= true;
    this._renderer.setSize(window.innerWidth,window.innerHeight);
    this._options.dom.appendChild(this._renderer.domElement);

    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
    this._orbitControls.enableDamping = true;

    // 创建地面
    const planeGeometry = new THREE.PlaneGeometry(100,100);
    const planeMaterial = new THREE.MeshStandardMaterial({color:0x999999});
    this._plane = new THREE.Mesh(planeGeometry,planeMaterial);
    this._plane.receiveShadow = true;
    this._plane.rotation.x = - Math.PI / 2;
    this._plane.position.y = -0.5;
    this._scene.add(this._plane);
    this._scene.add(new THREE.AmbientLight(0xffffff,1.2));

    // 创建灯光
    const light = new THREE.SpotLight(0xff00dd,3,100,Math.PI / 6,0.5);
    light.position.set(10,10,10);
    light.castShadow = true;
    light.lookAt(0,0,0);
    this._scene.add(light);

    this._clock = new YUKA.Time();

    this._vehicle = new YUKA.Vehicle();
    this._vehicle.maxSpeed = 5;
    // 创建一个椎体
    const coneGeometry = new THREE.ConeGeometry(0.2,1,32);
    coneGeometry.rotateX(Math.PI / 2);
    const coneMaterial = new THREE.MeshStandardMaterial({color:0xff0000});
    const cone = new THREE.Mesh(coneGeometry,coneMaterial);
    cone.matrixAutoUpdate = true;
    cone.receiveShadow = true;
    cone.castShaow = true;
    this._scene.add(cone);

    this._vehicle_2 = new YUKA.Vehicle();
    this._vehicle_2.maxSpeed = 10;

    this._vehicle_2.setRenderComponent(cone,this._callback);

    // 加载模型
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./draco/");
    dracoLoader.setDecoderConfig({type:"js"});
    loader.setDRACOLoader(dracoLoader);
    loader.load("./yuka-model/car.gltf",(gltf)=>{
      console.log('加载模型:',gltf);
      const car = gltf.scene.children[0];      ;
      this._scene.add(car);
      car.position.set(0,0,0);
      car.rotation.y = (Math.PI/2);
      this._vehicle.setRenderComponent(car,this._callback);
    });

  

    // 创建yuka路径
    const path = new YUKA.Path();
    path.add(new YUKA.Vector3(0,0,0));
    path.add(new YUKA.Vector3(10,1,0));
    path.add(new YUKA.Vector3(20,2,10));
    path.add(new YUKA.Vector3(30,3,-10));
    path.add(new YUKA.Vector3(-30,0,-5));
    path.add(new YUKA.Vector3(-20,1,0));
    path.add(new YUKA.Vector3(-10,0,6));
    path.add(new YUKA.Vector3(0,0,0));

    path.loop = true;
    this._vehicle.position.copy(path.current());
   
    const followPathBehavior = new YUKA.FollowPathBehavior(path);
    this._vehicle.steering.add(followPathBehavior);

    // 保持在路中间的行为
    const onPathBehavior = new YUKA.OnPathBehavior(path,0.1);
    onPathBehavior.weight = 10;
    this._vehicle.steering.add(onPathBehavior);


    // 创建目标小球
    const sphereGeometry = new THREE.SphereGeometry(0.1,32,32);
    const sphereMaterial = new THREE.MeshStandardMaterial({color:0xff00fd});
    const sphere = new THREE.Mesh(sphereGeometry,sphereMaterial);
    sphere.receiveShadow = true;
    sphere.castShadow = true;
    this._scene.add(sphere);

    // 创建yuka目标对象
    this._target = new YUKA.GameEntity();
    this._target.setRenderComponent(sphere,this._callback);
    // 添加到达行为
    const arriveBehavior = new YUKA.ArriveBehavior(this._target.position);
    this._vehicle_2.steering.add(arriveBehavior);
    // 添加一个搜索目标行为
    const seekBehavior = new YUKA.SeekBehavior(this._target.position);
    //this._vehicle_2.steering.add(seekBehavior);
    

    // 创建实体管理对象
    this._entityManager = new YUKA.EntityManager();
    this._entityManager.add(this._vehicle);
    this._entityManager.add(this._target);
    this._entityManager.add(this._vehicle_2);

    // 添加障碍物
    const obstacles =[];
    for(let i =0; i < 100;i++){
      const boxGeometry = new THREE.BoxGeometry(3,3,3);
      const boxMaterial = new THREE.MeshStandardMaterial({color:0x00ffdd});
      const box = new THREE.Mesh(boxGeometry,boxMaterial);
      box.position.set(Math.random() * 100 - 50,0,Math.random() * 100 - 50);
      box.receiveShadow = true;
      this._scene.add(box);

      // 创建yuka 中的障碍物
      const obstacle = new YUKA.GameEntity();
      obstacle.position.copy(box.position);

      // 设置障碍物半径
      boxGeometry.computeBoundingSphere();
      obstacle.boundingRadius = boxGeometry.boundingSphere.radius;
      obstacles.push(obstacle);

      this._entityManager.add(obstacle);

    }
    // 添加避障行为
    const obstacleAvoidanceBehavior = new YUKA.ObstacleAvoidanceBehavior(obstacles);
    this._vehicle_2.steering.add(obstacleAvoidanceBehavior);
    this._vehicle_2.smoother = new YUKA.Smoother(30);

    // 逃离行为
    const fleeBehavior = new YUKA.FleeBehavior(this._target.position,3);
    //this._vehicle_2.steering.add(fleeBehavior);

    // 添加追击行为-注意参数类型
    //const pursuitBehavior = new YUKA.PursuitBehavior(this._vehicle_2,5);
    //this._target.steering.add(pursuitBehavior);

    // 创建群体随机行走行为
  const wanderBehavior = new YUKA.WanderBehavior(3);

  // 设置整齐群体转向
  const alignmentBehavior = new YUKA.AlignmentBehavior();
  alignmentBehavior.weight = 5;

  // 设置聚集行为
  const cohesionBehavior = new YUKA.CohesionBehavior();
  cohesionBehavior.weight = 5;

  // 设置分离行为
  const separationBehavior = new YUKA.SeparationBehavior();
  separationBehavior.weight = 0.5;

                        


    const positions =[];
    for(let i = 0; i < path._waypoints.length;i++){
      positions.push(path._waypoints[i].x,path._waypoints[i].y,path._waypoints[i].z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    const material = new THREE.LineBasicMaterial({color:0x0000ff});
    const line = new THREE.Line(geometry,material);
    this._scene.add(line);

    // 点击将目标移动到点击的位置
    this._clickEvent();

    this._animate();
  }

  _callback(entity,renderComponent){
    console.log('回调函数：',entity,renderComponent);
    renderComponent.position.copy(entity.position);
    renderComponent.quaternion.copy(entity.rotation);
    //renderComponent.matrix.copy(entity.worldMatrix);
  }

  _clickEvent(){
    const ndc = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    window.addEventListener("pointerdown",e=>{
      ndc.x = (e.clientX / window.innerWidth ) * 2 -1;
      ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(ndc,this._perspectiveCamera);
      const intersects = raycaster.intersectObject(this._plane);
      if(intersects.length > 0){
        const point = intersects[0].point;
        this._target.position.set(point.x,0,point.z);
      }
    });
  }

  _animate(){
    const delta = this._clock.update() .getDelta();
    this._orbitControls.update();
    this._entityManager.update(delta);

    this._renderer.render(this._scene,this._perspectiveCamera);

    requestAnimationFrame(this._animate.bind(this));
  }

  _windowResizeFun(){
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth , window.innerHeight);
  }
}

export class BaseClass{
  constructor(_options={}){
    this._options = _options;
    this._time = new YUKA.Time();

    this._clock  = new THREE.Clock();
    this._raycaster = new THREE.Raycaster();

    this._entityManager = new YUKA.EntityManager();
    this._init();
    this._addClickEvent();
  }


  _init(){
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0xfdfdcd);
    this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,100);
    this._perspectiveCamera.position.set(0,10,20);
    this._perspectiveCamera.lookAt(0,0,0);

    // 创建渲染器
    this._renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
    this._renderer.shadowMap.enabled = true;
    this._renderer.setSize(window.innerWidth , window.innerHeight);
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 2;

    this._options.dom.appendChild(this._renderer.domElement);

    // 创建地面
    const planeGeometry = new THREE.PlaneGeometry(100,100);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color:0x999999,
    });
    this._plane = new THREE.Mesh(planeGeometry,planeMaterial);
    this._plane.receiveShadow = true;
    this._plane.rotation.x = - Math.PI / 2;
    this._plane.position.y = -0.5;
    this._scene.add(this._plane);

    // 创建灯光
    const spotLight = new THREE.SpotLight(0xffdedc,1.2,100,Math.PI / 3,0.5,0.1);
    spotLight.position.set(0,10,10);
    spotLight.castShadow = true;
    this._scene.add(spotLight);

    // 创建控制器
    this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);
    this._orbitControls.enableDamping = true;

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xffffff,1.2);
    this._scene.add(ambientLight);

    const axesHelper = new THREE.AxesHelper(100);
    this._scene.add(axesHelper);


    this._animate();
  }
  /**
   * 添加事件监听
   */
  _addClickEvent(){
    let ndc = new THREE.Vector2();
    window.addEventListener('pointerdown',(e)=>{
      //console.log('点击事件:....',window);
      ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
      ndc.y = -(e.clientY / window.innerHeight) * + 1;
      this._raycaster.setFromCamera(ndc,this._perspectiveCamera);
      this._addEvent();// 在派生类中实现
    });
  }
  _animate(){
    this._orbitControls.update();

    this._update();
   
    this._renderer.render(this._scene,this._perspectiveCamera);
    requestAnimationFrame(this._animate.bind(this));
  }

  _windowResizeFun(_options={}){
    this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this._perspectiveCamera.updateProjectionMatrix();

    this._renderer.setSize(window.innerWidth , window.innerHeight);
  }
}

export class CustomVehicle extends YUKA.Vehicle{
  constructor(navMesh=null){
    super();
    this._navMesh = navMesh;
    

  }

  update(delta){
    super.update(delta);
    //console.log("是否执行CustomVehicle.update===>");
    const currentRegion = this._navMesh.getRegionForPoint(this.position); // 包含这个点的区域
    if(currentRegion){
      const distance = currentRegion.distanceToPoint(this.position);// 计算的是区域边界到该点的最近距离
      this.position.y -= distance * 0.2;//使用 this.position.y 通常是因为在三维空间中，y 轴通常代表高度或垂直位置。通过减少 y 值，代码让对象向下移动，可能是为了模拟重力效果或调整对象在地面上的位置。这种调整有助于让对象看起来更自然地与环境互动。
    }
  }
}

export class YukaClassV2 extends BaseClass{
  constructor(_options={}){
    super(_options);
    this._options = _options;
    this._update();


    this.initLoader();
    this.initYuka();
    // 加载模型
    this.addModel();
    


    // 加载环境贴图
    //this.addEnvironmentMap();
  }
  initLoader(){
    this._loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./draco/");
    dracoLoader.setDecoderConfig({type:"js"});
    this._loader.setDRACOLoader(dracoLoader);
    return this._loader;
  }
  addEnvironmentMap(){
    this._hdrLoader = new RGBELoader();
    this._hdrLoader.load("./hdr/013.hdr",(texture)=>{
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this._scene.background = texture;
      this._scene.environment = texture;
    });

    let mirrorGeometry = new THREE.PlaneGeometry(200,100);
    let groundMirror = new Reflector(mirrorGeometry,{
      clipBias:0.003,
      textureWidth:window.innerWidth * window.devicePixelRatio,
      textureHeight:window.innerHeight * window.devicePixelRatio,
      color:0x777777
    });
    groundMirror.position.y = 0.1;
    groundMirror.rotateX(-Math.PI / 2);
    this._scene.add(groundMirror);
  }
  initYuka(){
    // 创建一个目标three.js 3D 小球
    const sphereGeometry = new THREE.SphereGeometry(0.1,32,32);
    const sphereMaterial = new THREE.MeshStandardMaterial({color:0xff00ff});
    const sphere = new THREE.Mesh(sphereGeometry,sphereMaterial);
    sphere.receiveShadow = true;
    sphere.castShadow = true;
    this._scene.add(sphere);

    // 创建目标
    this._target = new YUKA.GameEntity();
    this._target.setRenderComponent(sphere,this.callback);
    this._target.position.set(Math.random() * 100 - 50 ,0,Math.random() * 100 - 50);

    this._entityManager.add(this._target);

  }

  addLine(path){
    if(this._line){
      this._scene.remove(this._line);
      this._line.geometry.dispose();
      this._line.material.dispose();
    }

    // 创建点位
    let positions =[];
    for(let i =0; i < path._waypoints.length;i++){
      positions.push(
        path._waypoints[i].x,
        path._waypoints[i].y,
        path._waypoints[i].z
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    const material = new THREE.LineBasicMaterial({color:0x0000fd});
    this._line = new THREE.Mesh(geometry,material);
    this._scene.add(this._line);
  }

  callback(entity,renderComponent){
    renderComponent.position.copy(entity.position);
    renderComponent.quaternion.copy(entity.rotation);
    //renderComponent.matrix.copy(entity.worldMatrix);
  }
  addModel(){
     this._navMeshLoader = new YUKA.NavMeshLoader();
     this._navMesh = null;
     this._vehicle = null;

     this._loader.load("./yuka-model/citymap1.gltf",citymap=>{
      this._scene.add(citymap.scene);
     });
     this._navMeshLoader.load("./yuka-model/citymap1.gltf").then((navigationMesh)=>{
      console.log('导航模型:',navigationMesh);
      this._navMesh = navigationMesh;
      
      this._vehicle = new CustomVehicle(this._navMesh);
      this._vehicle.maxSpeed = 10;
      this._vehicle.smoother = new YUKA.Smoother(30);
      this._entityManager.add(this._vehicle);

      this._loader.load("./yuka-model/robot.glb",(gltf)=>{
        const car = gltf.scene;
        car.children[0].scale.set(0.6,0.6,0.6);
        this._scene.add(car);
        this._vehicle.setRenderComponent(car,this.callback);
      })
     })
  }

  _update(){
    //console.log("是否循环执行:.....");
    const delta = this._time.update().getDelta();
    this._entityManager.update(delta);
  }

  _addEvent(){
    //console.log("window 事件监听，在这里写代码....成功执行了");
    const intersects = this._raycaster.intersectObject(this._plane);
    //console.log("点击相交事件:",intersects,this._navMesh);
    if(intersects.length > 0){
      const point = intersects[0].point;
      this._target.position.set(point.x,0,point.z);

      let from = this._vehicle.position;
      let to = point;

      const path = this._navMesh.findPath(new YUKA.Vector3(from.x,from.y,from.z),new YUKA.Vector3(to.x,to.y,to.z));
      const newPath = new YUKA.Path();
      for(let item of path){
        newPath.add(new YUKA.Vector3(item.x,item.y,item.z));
      }
      this.addLine(newPath);
      this._vehicle.steering.clear();

      // 添加一个行为
      const followPathBehavior = new YUKA.FollowPathBehavior(newPath);
      followPathBehavior.weight = 10;
      this._vehicle.steering.add(followPathBehavior);

      const onPathBehavior = new YUKA.OnPathBehavior(newPath,0.1,0.1);
      this._vehicle.steering.add(onPathBehavior);
    }

  }


}


