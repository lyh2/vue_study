/**
 * ## 1. 角色-相机关系架构
    __核心思想__：相机不是直接绑定在角色身上，而是通过一个"跟随者"系统来实现平滑跟随。
    - __角色（Character）__：玩家控制的3D模型，可以移动和旋转
    - __尾部对象（Tail）__：一个虚拟的3D对象，附加在角色后方，定义了相机的理想位置，也就是：相机的锚点
    - __跟随者（Follower）__：一个中间对象，相机实际附加在这个对象上
    - __相机（Camera）__：观察场景的视角
    这种分层架构允许相机有独立的运动逻辑，而不是僵硬地固定在角色身上。
    * 
        角色 (Character)
    └── 尾部 (tail) - 定义理想相机位置
            ↓
    跟随者 (follower) - 实际移动的相机容器
    └── 相机 (Camera) - 实际渲染视角
        - __位置__：附加在角色身上 `character.add(tail)`
        - __坐标__：`tail.position.set(0, 0.5, -4)` - 在角色后方4个单位，高度0.5的位置
        - __作用__：定义相机理想目标位置__，相当于一个"位置标记点"
        - __特性__：随着角色移动而移动，始终保持相对位置

        ### follower（跟随者对象）

        - __位置__：独立于场景中的对象
        - __作用__：相机实际载体__，通过平滑插值移动到tail的位置
        - __特性__：有自己的运动逻辑，不直接绑定在角色上

 */

import * as THREE from 'three';
import { DRACOLoader, GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons';

/**
 * 第三人称控制中：“理想位置”和“实际位置” 需要进行分开
 * 
  tail 负责告诉你相机应该在哪
  follower 负责慢慢追过去，作为相机的平滑参考锚点
  OrbitControls 负责让相机绕角色旋转
  这样相机不会因为角色瞬间转身而硬切，同时又允许玩家用鼠标自由观察。
 */
export class ThirdPersonController {
  constructor(options) {
    this.options = options;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.perspectiveCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.perspectiveCamera.position.set(0, 2.1, -4);

    this.tail_position = new THREE.Vector3(); // 理想相机的位置，这个值是固定提前设定好的在角色某一处的位置
    this.look_target = new THREE.Vector3(); // 相机平滑观察目标
    this.look_target_position = new THREE.Vector3(); // 相机目标点的即时位置
    this.target_delta = new THREE.Vector3(); // 相机围绕目标旋转时的平移补偿

    this.distance = 4; // 相机距离角色的距离
    this.velocity = 0; // 角色的速度
    this.turnVelocity = 0; // 角色的转向速度
    this.turnSpeed = 2.8; // 角色的转向速度
    this.turnMoveSpeed = 0.045; // 角色的转向时给一点前进速度，让角色形成自然的弧线移动

    // tail 负责告诉你相机应该在哪个最理想的位置
    this.tail = new THREE.Object3D();
    this.tail.name = 'tail';
    this.tail.position.y = 0.5; // 在Charactor 坐标系下的位置
    this.tail.position.z = -this.distance; // 在角色的-Z轴处，表示在校色的背面

    // 创建一个相机的父级对象，便于更好的计算相机位置及变换操作
    this.follower = new THREE.Object3D();
    this.follower.name = 'follower';

    this.scene.add(this.follower); // 跟随者对象挂载在场景中
    // OrbitControls 需要直接操作世界坐标系中的相机。
    // 如果相机挂在 follower 下，再同时修改 follower.position 和 camera.position，
    // 会导致父子位移叠加，出现相机越跟越远、拖拽抖动的问题。
    this.scene.add(this.perspectiveCamera);
    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xfff, 1.2);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffff, 1.9);
    const lightDistance = 40;
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -lightDistance;
    directionalLight.shadow.camera.right = lightDistance;
    directionalLight.shadow.camera.top = lightDistance;
    directionalLight.shadow.camera.bottom = -lightDistance;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.position.set(-5, 35, 100);
    this.scene.add(directionalLight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.options.dom.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false; // 是否允许平移
    this.controls.minDistance = 2;
    this.controls.maxDistance = 12;
    this.controls.minPolarAngle = 0.3;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

    this.clock = new THREE.Clock();
    this.previousTime = 0;

    // 加载模型
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./draco/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    this.mixer = null;
    this.prevAnimate = 'idle';
    this.actions = {};
    this.character = null;
    this.characterAnimation = [];
    // 加载模型
    gltfLoader.load('./third-person-control/Character.glb', gltf => {
      //console.log('模型数据:', gltf);
      gltf.scene.scale.set(1, 1, 1);
      this.character = gltf.scene;
      this.characterAnimation = gltf.animations; // 得到动画片段数组

      this.character.add(this.tail); // 把tail 添加到玩家对象上

      gltf.scene.castShadow = true;
      gltf.scene.receiveShadow = true;

      this.scene.add(this.character);
      this.character.updateMatrixWorld(true);
      //----------------------------
      this.tail.updateMatrixWorld(true); // 首先更新tail的世界矩阵，更新自己及子孙节点的世界矩阵
      this.tail_position.setFromMatrixPosition(this.tail.matrixWorld); // 从tail的世界矩阵中得到tail的世界坐标系位置
      this.follower.position.copy(this.tail_position); // 先设置相机跟谁着对象的初始位置为tail的位置
      //----------------------------------------------------------------
      // 设置相机的目标位置 = 角色的位置 + 头顶高度
      this.look_target.set(this.character.position.x, 2.2, this.character.position.z);
      // 相机保持在世界坐标中，初始位置参考 follower 的平滑锚点。
      this.perspectiveCamera.position.copy(this.follower.position);
      this.perspectiveCamera.position.y += 1.6;
      // orbitControls的target设置为look_target(角色的位置)
      this.controls.target.copy(this.look_target);
      this.controls.update();

      this.mixer = new THREE.AnimationMixer(this.character);
      this.actions = {
        idle: this.mixer.clipAction(this.characterAnimation[0]),
        run: this.mixer.clipAction(this.characterAnimation[1]),
        walk: this.mixer.clipAction(this.characterAnimation[2]),
        back: this.mixer.clipAction(this.characterAnimation[3]),
      };
      this.prevAnimate = 'idle';
      this.actions.idle.play();
    });
    // 创建地面
    const pathToGrassTexture = name => `./third-person-control/${name}.jpg`;

    /** Load textures */
    const textureLoader = new THREE.TextureLoader();
    const repeat = 40;
    const map = textureLoader.load(pathToGrassTexture('GroundForest003_COL_VAR1_3K'));
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeat, repeat);

    const displacementMap = textureLoader.load(pathToGrassTexture('GroundForest003_DISP_3K'));
    displacementMap.wrapS = THREE.RepeatWrapping;
    displacementMap.wrapT = THREE.RepeatWrapping;
    displacementMap.repeat.set(repeat, repeat);

    const normalMap = textureLoader.load(pathToGrassTexture('GroundForest003_NRM_3K'));
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(repeat, repeat);

    const roughnessMap = textureLoader.load(pathToGrassTexture('GroundForest003_ROUGH_3K'));
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(repeat, repeat);

    this.floor = {
      material: new THREE.MeshStandardMaterial({
        map,
        normalMap,
        roughnessMap,
        displacementMap,
        normalScale: new THREE.Vector2(1.2, 1.2),
        displacementScale: 0.1,
        displacementBias: 0.008,
        roughness: 1,
      }),
      geometry: new THREE.PlaneGeometry(100, 100, 1000, 1000), //create floor geometry 100 x 100 size
      mesh: null,
    };
    this.floor.geometry.setAttribute(
      'uv2',
      new THREE.Float32BufferAttribute(this.floor.geometry.attributes.uv.array, 10)
    );

    this.floor.mesh = new THREE.Mesh(this.floor.geometry, this.floor.material);
    this.floor.mesh.receiveShadow = true;
    this.floor.mesh.position.y = 0;
    this.floor.mesh.rotation.x = -Math.PI * 0.5; // 绕X轴旋转90度
    this.scene.add(this.floor.mesh);
    this.scene.add(new THREE.AxesHelper(100));
    this.keyboards = {};
    window.addEventListener(
      'keydown',
      event => {
        //console.log(event); // 键盘按下事件消息
        this.keyboards[event.key] = true;
      },
      false
    );
    // 键盘抬起事件
    window.addEventListener(
      'keyup',
      event => {
        this.keyboards[event.key] = false;
      },
      false
    );
    // 下面开启阴影是不是每一帧都要设置呢？其实不需要，正常情况下只需要设置一次就可以了，除非你场景中动态添加了新的Mesh对象，那么你就需要在添加后设置它的castShadow和receiveShadow属性，并且如果这个Mesh对象的材质是MeshStandardMaterial或者MeshPhysicalMaterial，那么你还需要设置它的material.needsUpdate = true;来让它更新材质以支持阴影。
    this.scene.traverse(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    // 开启渲染
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }
  /**
   * 进行动画过渡
   * @param {*} newAction
   */
  crossFadeAnimation(newAction) {
    newAction.reset(); // 重置新动画的状态数据，使的恢复到初始值
    newAction.play();
    newAction.crossFadeFrom(this.actions[this.prevAnimate], 0.3);
  }
  animate() {
    const elapsedTime = this.clock.getElapsedTime();
    const deltaTime = elapsedTime - this.previousTime;
    this.previousTime = elapsedTime;

    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
    let speed = 0;
    const isTurningLeft = !!this.keyboards['a'];
    const isTurningRight = !!this.keyboards['d'];
    const isTurning = isTurningLeft || isTurningRight;

    /** Running forwards */
    if (this.keyboards['r']) {
      speed = 0.2;
    } else if (this.keyboards['w']) {
      /** Walking forward */
      speed = 0.09;
    } else if (this.keyboards['s']) {
      /** Walking backwards */
      speed = -0.09;
    } else if (isTurning) {
      // 转向时给一点前进速度，让角色形成自然的弧线移动
      speed = this.turnMoveSpeed;
    }

    /** 根据输入切换动画 */
    if (this.keyboards['s']) {
      if (this.actions.back && this.prevAnimate != 'back') {
        this.crossFadeAnimation(this.actions.back);
        this.prevAnimate = 'back';
      }
    } else if (this.keyboards['r']) {
      if (this.actions.run && this.prevAnimate != 'run') {
        this.crossFadeAnimation(this.actions.run);
        this.prevAnimate = 'run';
      }
    } else if (this.keyboards['w'] || isTurning) {
      if (this.actions.walk && this.prevAnimate != 'walk') {
        this.crossFadeAnimation(this.actions.walk);
        this.prevAnimate = 'walk';
      }
    } else if (this.actions.idle && this.prevAnimate != 'idle') {
      this.crossFadeAnimation(this.actions.idle);
      this.prevAnimate = 'idle';
    }
    // 存在玩家角色
    if (this.character) {
      /**
       * 处理角色转向
       */
      const turnDirection = (isTurningLeft ? 1 : 0) - (isTurningRight ? 1 : 0); // 表示转向方向：左转=1，右转=-1，不转=0
      const targetTurnVelocity = turnDirection * this.turnSpeed; // 目标转向速度
      this.turnVelocity += (targetTurnVelocity - this.turnVelocity) * 0.2; // 平滑
      this.character.rotateY(this.turnVelocity * deltaTime); // 旋转角色

      // 处理角色前进(沿着角色自身前方Z轴的方向移动)
      this.velocity += (speed - this.velocity) * 0.3; // 0.09*0.3=0.027,0.027 + (0.09-0.027)*0.3=0.0459,0.0459 + (0.09 - 0.0459) *0.3=0.05913， 达到一种自然加速、减速的效果，否则直接到达设定的速度比较突兀
      this.character.translateZ(this.velocity); // 是让角色沿着其自身的前进方向移动
      /**
       * ## 为什么是Z轴而不是其他轴？
            ### 1. Three.js的坐标系标准
            在Three.js中，Object3D对象的局部坐标系遵循右手坐标系：
            - __X轴__：向右（红色）
            - __Y轴__：向上（绿色）
            - __Z轴__：向前（蓝色）
            这是计算机图形学中准约定__。
            ### 2. 3D建模软件的导出规范
            大多数3D建模软件（Blender、Maya、3ds Max等）导出模型时：
            - 默认将模型向Z轴正方向
            - 这是行业标准，确保模型在不同软件和引擎中保持一致
       */

      /**
       * Smoothly move character position Vector3 to actiual character position
       * 平滑得到玩家的位置
       */
      this.look_target_position.set(this.character.position.x, 2.2, this.character.position.z);
      this.look_target.lerp(this.look_target_position, 0.4);
      this.character.updateMatrixWorld(true);

      /**
       * Set tail_position Vector3 to absolute tail position
       * 得到tail 的世界坐标系下的位置值
       */
      this.tail_position.setFromMatrixPosition(this.tail.matrixWorld);
      this.follower.position.lerp(this.tail_position, 0.02); // 相机的父容器平滑插值到tail的位置

      // 目标点移动时，让相机整体平移同样的增量，从而保持当前鼠标绕视角的结果
      this.target_delta.copy(this.look_target).sub(this.controls.target);
      this.perspectiveCamera.position.add(this.target_delta);
      this.controls.target.copy(this.look_target);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.perspectiveCamera);
  }

  _windowResizeFun() {
    this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
