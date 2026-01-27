import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/Addons';
import * as Poly2tri from 'poly2tri';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min';

export class MorphAnimation {
  constructor(options) {
    this.options = options;
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x262336);

    const ambientLight = new THREE.AmbientLight(0xffff);
    this.scene.add(ambientLight);
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      74,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );
    this.perspectiveCamera.position.set(0, 20, 20);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setAnimationLoop(this.animate.bind(this));

    this.clock = new THREE.Clock();
    // 添加控制器
    this.orbitControls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);
    this.createAnimate();

    this.options.dom.appendChild(this.renderer.domElement);
  }
  createAnimate() {
    // 创建box
    const geometry = new THREE.BoxGeometry(5, 5, 5);
    geometry.name = 'box1';

    const targetGeometry = new THREE.BoxGeometry(10, 20, 10);

    const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    // 设置geometry变形数据
    console.log('geometry:', geometry);
    geometry.morphAttributes.position = [
      targetGeometry.attributes.position,
      boxGeometry.attributes.position,
    ];
    geometry.morphAttributes.position[0].name = 'box2';
    geometry.morphAttributes.position[1].name = 'box3';

    const material = new THREE.MeshLambertMaterial({
      color: 0x00dede,
      flatShading: true,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = '制作变形动画';
    this.scene.add(this.mesh);
    console.log('mesh:', this.mesh);
    this.mesh.updateMorphTargets();

    this.mesh.morphTargetInfluences[0] = 0.5; // 让第 0 个 target 50% 生效
    this.mesh.morphTargetInfluences[1] = 0.8; // 让第 1 个 target 80% 生效
    const track = new THREE.KeyframeTrack('.morphTargetInfluences[0]', [0, 10, 20], [0, 1, 0]);
    const track2 = new THREE.KeyframeTrack('.morphTargetInfluences[1]', [30, 40, 50], [0, 1, 0]);
    const clip = new THREE.AnimationClip('default', 50, [track, track2]);

    this.mixer = new THREE.AnimationMixer(this.mesh);
    let action = this.mixer.clipAction(clip);
    action.timeScale = 2; // 设置播放速度

    action.play();
  }
  animate() {
    if (this.mixer) this.mixer.update(this.clock.getDelta());
    this.orbitControls.update();
    this.renderer.render(this.scene, this.perspectiveCamera);
  }

  _windowResizeFun() {
    this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

export class CADDraw {
  constructor(options) {
    this.options = options;
    this.init();
  }
  init() {
    // 初始化渲染器、相机、场景
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 50, 100);
    this.camera.lookAt(0, 0, 0);
    this.scene.background = new THREE.Color(0xfcfcfc);
    this.scene.add(new THREE.AmbientLight(0xffff));
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.options.dom.appendChild(this.renderer.domElement);

    // CSS2D 渲染器（显示文字）
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.options.dom.appendChild(this.labelRenderer.domElement);
    this.orbitControls = new OrbitControls(this.camera, this.labelRenderer.domElement);

    // 网格辅助（类似 CAD 背景）
    const gridHelper = new THREE.GridHelper(200, 20);
    this.scene.add(gridHelper);

    // 射线与鼠标
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // 绘制状态变量
    let drawing = false;
    let startPoint = null;
    let tempGroup = null;

    const solidMaterial = new THREE.LineBasicMaterial({ color: 0xff0033 });
    const dashedMaterial = new THREE.LineDashedMaterial({
      color: 0xcc33ff,
      dashSize: 1,
      gapSize: 0.5,
    });

    // 点击事件
    window.addEventListener('click', event => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, point);

      if (!drawing) {
        startPoint = point.clone();
        drawing = true;

        tempGroup = new THREE.Group();
        this.scene.add(tempGroup);

        // 初始化文字
        const div = document.createElement('div');
        div.style.color = 'red';
        div.style.fontSize = '18px';
        div.textContent = '0.00';
        const label = new CSS2DObject(div);
        label.name = 'label';
        tempGroup.add(label);
      } else {
        drawing = false;
        tempGroup = null;
        startPoint = null;
      }
    });

    // 鼠标移动事件
    window.addEventListener('mousemove', event => {
      if (!drawing || !tempGroup) return;

      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const endPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, endPoint);

      // 清空旧的（保留 label）
      tempGroup.children = tempGroup.children.filter(obj => obj.type === 'Object3D');

      // 主线
      // const mainLine = new THREE.Line(
      //   new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]),
      //   solidMaterial
      // );
      // tempGroup.add(mainLine);

      // // 计算方向
      // const dir = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
      // 主线方向与 XZ 平面的垂直方向
      const dir = new THREE.Vector3().subVectors(endPoint, startPoint);
      if (dir.lengthSq() === 0) return;
      dir.normalize();
      /**
      2. 二维向量的垂直方向
        在二维里，如果有一个向量：
        v = (x, y)
        它的一个垂直向量可以写成：
        v_perp = (-y, x)   或   (y, -x)
        👉 你可以理解为：把向量 逆时针或顺时针旋转 90°。
        例如：
        v = (1, 0)（水平向右），则 v_perp = (0, 1)（竖直向上）。
        v = (0, 1)（竖直向上），则 v_perp = (-1, 0)（水平向左）。
       */
      const perp = new THREE.Vector3(-dir.z, 0, dir.x); // XZ 平面上垂直方向

      const offset = 0.5; // 标注虚线与主线距离

      // 平移后的点
      const startOffset = startPoint.clone().addScaledVector(perp, offset);
      const endOffset = endPoint.clone().addScaledVector(perp, offset);

      // 标注虚线
      const dimLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([startOffset, endOffset]),
        dashedMaterial
      );
      dimLine.computeLineDistances();
      tempGroup.add(dimLine);

      // 两端竖线
      // 两端竖线 (从主线端点到虚线端点)
      // const tickA = new THREE.Line(
      //   new THREE.BufferGeometry().setFromPoints([startPoint, startOffset]),
      //   solidMaterial
      // );
      // const tickB = new THREE.Line(
      //   new THREE.BufferGeometry().setFromPoints([endPoint, endOffset]),
      //   solidMaterial
      // );
      //tempGroup.add(tickA, tickB);
      // 更新文字
      // const length = startPoint.distanceTo(endPoint).toFixed(2);
      // const mid = new THREE.Vector3().addVectors(startOffset, endOffset).multiplyScalar(0.5);
      // const label = tempGroup.getObjectByName('label');
      // label.element.textContent = length;
      // label.position.copy(mid);
      // 可调参数
      const TICK_GAP = 0.35; // 竖线与主线的最小间隙
      const TICK_LEN = 1.8; // 竖线总长度
      const DASH_OFFSET = TICK_GAP + TICK_LEN * 0.5; // 虚线偏移=0.27

      // 鼠标移动事件里（已有 startPoint、计算得 endPoint 后）：
      if (!drawing || !tempGroup) return;

      // 清掉上一次的几何（但保留文字标签）
      for (let i = tempGroup.children.length - 1; i >= 0; i--) {
        const c = tempGroup.children[i];
        if (!(c.isCSS2DObject && c.name === 'label')) tempGroup.remove(c);
      }

      // 1) 主线（实线）
      const mainLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]),
        solidMaterial
      );
      tempGroup.add(mainLine);

      // 2) 两端竖线（固定 0.5，起点距主线 0.02）
      const a0 = startPoint.clone().addScaledVector(perp, TICK_GAP); // 0.02
      const a1 = startPoint.clone().addScaledVector(perp, TICK_GAP + TICK_LEN); // 0.52
      const b0 = endPoint.clone().addScaledVector(perp, TICK_GAP);
      const b1 = endPoint.clone().addScaledVector(perp, TICK_GAP + TICK_LEN);

      const tickA = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([a0, a1]),
        solidMaterial
      );
      const tickB = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([b0, b1]),
        solidMaterial
      );
      tempGroup.add(tickA, tickB);

      // 3) 标注虚线（在竖线中点位置，偏移 0.27，且与主线平行）
      const sd = startPoint.clone().addScaledVector(perp, DASH_OFFSET); // 0.27
      const ed = endPoint.clone().addScaledVector(perp, DASH_OFFSET);

      const dimDashed = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([sd, ed]),
        dashedMaterial // THREE.LineDashedMaterial
      );
      dimDashed.computeLineDistances(); // 虚线必需
      tempGroup.add(dimDashed);

      // 4) 长度文字（放在虚线中点）
      const label = tempGroup.getObjectByName('label'); // CSS2DObject
      if (label) {
        const len = startPoint.distanceTo(endPoint);
        label.element.textContent = len.toFixed(2);
        label.position.copy(new THREE.Vector3().addVectors(sd, ed).multiplyScalar(0.5));
      }
    });

    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  animate() {
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  _windowResizeFun() {
    this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

/**
 * 学习使用 Poly2tri 三角剖分算法库
 */
export class StudyPoly2tri {
  constructor(options = {}) {
    this.options = options;
    this.init();
  }

  init() {
    // 创建场景
    this.scene = new THREE.Scene();
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    this.perspectiveCamera.position.z = 1000;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(new THREE.Color(0xaaccff), 1);
    this.options.dom.appendChild(this.renderer.domElement);
    this.renderer.setAnimationLoop(this.animate.bind(this));

    this.initPoly2tri();
  }

  initPoly2tri() {
    const vs1 = [
      new THREE.Vector2(-222, -50),
      new THREE.Vector2(-199, 88),
      new THREE.Vector2(-101, 188),
      new THREE.Vector2(28, 131),
      new THREE.Vector2(74, -16),
      new THREE.Vector2(145, -70),
      new THREE.Vector2(216, 42),
      new THREE.Vector2(280, 14),
      new THREE.Vector2(155, -141),
      new THREE.Vector2(54, -90),
      new THREE.Vector2(-20, 54),
      new THREE.Vector2(-94, 91),
      new THREE.Vector2(-149, 35),
      new THREE.Vector2(-161, -44),
    ];

    // const vs2 = [
    //   new THREE.Vector2(0, 86),
    //   new THREE.Vector2(42, 157),
    //   new THREE.Vector2(43, 74),
    //   new THREE.Vector2(115, 115),
    //   new THREE.Vector2(74, 43),
    //   new THREE.Vector2(157, 42),
    //   new THREE.Vector2(86, 0),
    //   new THREE.Vector2(157, -42),
    //   new THREE.Vector2(74, -43),
    //   new THREE.Vector2(115, -115),
    //   new THREE.Vector2(43, -74),
    //   new THREE.Vector2(42, -157),
    //   new THREE.Vector2(0, -86),
    //   new THREE.Vector2(-42, -157),
    //   new THREE.Vector2(-43, -74),
    //   new THREE.Vector2(-115, -115),
    //   new THREE.Vector2(-74, -43),
    //   new THREE.Vector2(-157, -42),
    //   new THREE.Vector2(-86, 0),
    //   new THREE.Vector2(-157, 42),
    //   new THREE.Vector2(-74, 43),
    //   new THREE.Vector2(-115, 115),
    //   new THREE.Vector2(-43, 74),
    //   new THREE.Vector2(-42, 157),
    // ];

    // const    vs2Hole = [
    //       new THREE.Vector2(0, 50),
    //       new THREE.Vector2(50, 50),
    //       new THREE.Vector2(50, 0),
    //       new THREE.Vector2(50, -50),
    //       new THREE.Vector2(0, -50),
    //       new THREE.Vector2(-50, -50),
    //       new THREE.Vector2(-50, 0),
    //       new THREE.Vector2(-50, 50),
    //     ];
    generateGeometryFromTriangles(createTrianglesByPoly2tri(vs1));
  }
  animate() {
    this.renderer.render(this.scene, this.perspectiveCamera);
  }
  _windowResizeFun() {
    this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

export function createTrianglesByPoly2tri(vecs, holes) {
  // 需要把坐标数据转成poly2tri 支持的格式,只要是包含x,y属性的值就行
  let contour = [];
  let holeContour = [];
  for (let i = 0; i < vecs.length; i++) {
    contour.push(new Poly2tri.Point(vecs[i].x, vecs[i].y));
  }
  if (holes !== undefined) {
    for (let i = 0; i < holes.length; i++) {
      holeContour.push(new Poly2tri.Point(holes[i].x, holes[i].y));
    }
    // 添加孔洞
    return new Poly2tri.SweepContext(contour).addHole(holeContour).triangulate().getTriangles();
  } else {
    // 不存在孔洞的情况
    return new Poly2tri.SweepContext(contour).triangulate().getTriangles();
  }
}

export function generateGeometryFromTriangles(tris) {
  // 通过生成的点创建几何体数据
  console.log('Poly2tri生成的点:', tris);
}
/**
 * 判断两个是否发生碰撞
 * @param {*} box1
 * @param {*} box2
 */
function boxMeshCollision(box1, box2) {
  const xCollision = box1.right >= box2.left && box1.left <= box2.right;
  const yCollision = box1.bottom + box1.velocity.y <= box2.top && box1.top >= box2.bottom;
  const zCollision = box1.front >= box2.back && box1.back <= box2.front;

  return xCollision && yCollision && zCollision;
}
class CustomBoxMesh extends THREE.Mesh {
  constructor(options) {
    super(
      new THREE.BoxGeometry(options.width, options.height, options.depth),
      new THREE.MeshStandardMaterial({ color: options.color })
    );

    this.width = options.width;
    this.height = options.height;
    this.depth = options.depth;

    this.position.set(options.position.x, options.position.y, options.position.z);

    this.right = this.position.x + this.width / 2;
    this.left = this.position.x - this.width / 2;

    this.bottom = this.position.y - this.height / 2;
    this.up = this.position.y + this.height / 2;

    this.front = this.position.z + this.depth / 2;
    this.back = this.position.z - this.depth / 2;

    this.velocity = options.velocity;
    this.gravity = -0.002;

    this.zAcceleration = options.zAcceleration;
  }

  update(ground) {
    this._updateSides();
    if (this.zAcceleration) this.velocity.z += 0.0003;

    this.position.x += this.velocity.x;
    this.position.z += this.velocity.z;
    if (this.name != 'cube') this._applyGravity(ground);
  }
  /**
   * 应用重力
   * @param {*} ground
   */
  _applyGravity(ground) {
    this.velocity.y += this.gravity;
    // 判断是否与地面碰撞
    const isCollision = boxMeshCollision(this, ground);
    if (isCollision) {
      const friction = 0.5;
      this.velocity.y *= friction;
      this.velocity.y = -this.velocity.y;
    } else {
      this.position.y += this.velocity.y;
    }
    //console.log('isCollision:', isCollision);
  }
  /**
   * 实时更新Box 6个面的值
   */
  _updateSides() {
    this.right = this.position.x + this.width / 2;
    this.left = this.position.x - this.width / 2;

    this.bottom = this.position.y - this.height / 2;
    this.top = this.position.y + this.height / 2;

    this.front = this.position.z + this.depth / 2;
    this.back = this.position.z - this.depth / 2;
  }
}
/**
 * 推箱子游戏
 */
export class MoveBoxGame {
  constructor(options) {
    this.options = options;
    this.keys = {
      a: {
        pressed: false,
      },
      d: {
        pressed: false,
      },
      s: {
        pressed: false,
      },
      w: {
        pressed: false,
      },
    };
    this.frames = 0;
    this.spawnRate = 200;
    this.enemies = [];
    this.animationId = null;
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.perspectiveCamera.position.set(4.6, 3, 8);

    this.renderer = new THREE.WebGLRenderer({
      alpha: true, // alpha - controls the default clear alpha value. When set to true, the value is 0. Otherwise it's 1. Default is false.
      antialias: true, // antialias - whether to perform antialiasing. Default is false.
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.options.dom.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);

    //this.renderer.setAnimationLoop(this.animate.bind(this));
    // 给canvas 添加事件

    // 关键修复：设置 tabindex 使 canvas 可聚焦
    this.renderer.domElement.setAttribute('tabindex', '0');
    this.renderer.domElement.style.outline = 'none'; // 移除焦点时的轮廓

    this.renderer.domElement.addEventListener('keydown', event => {
      switch (event.code) {
        case 'KeyA':
          this.keys.a.pressed = true;
          break;
        case 'KeyD':
          this.keys.d.pressed = true;
          break;
        case 'KeyS':
          this.keys.s.pressed = true;
          break;
        case 'KeyW':
          this.keys.w.pressed = true;
          break;
        case 'Space':
          this.cube.velocity.y = 0.08;
          break;
      }
    });
    this.renderer.domElement.addEventListener('keyup', event => {
      switch (event.code) {
        case 'KeyA':
          this.keys.a.pressed = false;
          break;
        case 'KeyD':
          this.keys.d.pressed = false;
          break;
        case 'KeyS':
          this.keys.s.pressed = false;
          break;
        case 'KeyW':
          this.keys.w.pressed = false;
          break;
      }
    });
    // 确保 canvas 在点击时获得焦点
    this.renderer.domElement.addEventListener('click', () => {
      this.renderer.domElement.focus();
    });

    // 添加环境观
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const directionalLight = new THREE.DirectionalLight(0xffccdd, 1);
    directionalLight.position.set(0, 3, 1);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    this.scene.add(new THREE.AxesHelper(100));

    // 创建box
    this.cube = new CustomBoxMesh({
      width: 1,
      height: 1,
      depth: 1,
      velocity: {
        x: 0,
        y: -0.01,
        z: 0,
      },
      color: '#00ff00',

      position: {
        x: 0,
        y: 0,
        z: 0,
      },
      zAcceleration: false,
    });
    this.cube.castShadow = true;
    this.cube.name = 'cube';
    this.scene.add(this.cube);
    // ground
    this.ground = new CustomBoxMesh({
      width: 10,
      height: 0.5,
      depth: 50,
      color: '#0359a1',
      position: {
        x: 0,
        y: -2,
        z: 0,
      },
      velocity: {
        x: 0,
        y: 0,
        z: 0,
      },

      zAcceleration: false,
    });

    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.scene.add(this.ground);

    this.animate();
  }

  animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.perspectiveCamera);

    this.cube.velocity.x = 0;
    this.cube.velocity.z = 0;

    if (this.keys.a.pressed) this.cube.velocity.x = -0.05;
    else if (this.keys.d.pressed) this.cube.velocity.x = 0.05;

    if (this.keys.s.pressed) this.cube.velocity.z = 0.05;
    else if (this.keys.w.pressed) this.cube.velocity.z = -0.05;
    //console.log(this.keys.a, this.keys.d, this.keys.w, this.keys.s);
    this.cube.update(this.ground);

    this.enemies.forEach(enemy => {
      enemy.update(this.ground);
      if (boxMeshCollision(this.cube, enemy)) {
        cancelAnimationFrame(this.animationId);
        //console.log(this.animationId);
      }
    });

    if (this.frames % this.spawnRate === 0) {
      if (this.spawnRate > 20) this.spawnRate -= 20;
      const enemy = new CustomBoxMesh({
        width: 1,
        height: 1,
        depth: 1,
        position: {
          x: (Math.random() - 0.5) * 10,
          y: 10,
          z: Math.random() * -20,
        },
        velocity: {
          x: 0,
          y: 0,
          z: 0.005,
        },
        color: 'red',
        zAcceleration: true,
      });
      enemy.name = 'enemy';
      enemy.castShadow = true;
      this.scene.add(enemy);
      this.enemies.push(enemy);
    }
    this.frames++;
  }

  _windowResizeFun() {
    this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

/**
 * 学习深度及模版缓存
 * 1. Depth Buffer（深度缓冲区）
原理：
深度缓冲区（也称为 Z-Buffer）是一个用于存储每个像素深度值的缓冲区。深度值通常表示从相机到物体表面的距离。在渲染过程中，当多个物体重叠时，深度测试用于确定哪个物体应该被显示（即哪个物体更近）。
深度测试的基本原理是：对于每个像素，当有一个新的片段（fragment）要绘制时，会将其深度值与深度缓冲区中当前存储的深度值进行比较。如果新的片段深度值小于（或根据设置的比较函数）当前深度缓冲区中的值，则新的片段颜色会被写入颜色缓冲区，并且深度缓冲区更新为新的深度值。否则，片段被丢弃。
在 Three.js 中，默认情况下深度测试是开启的，并且深度比较函数为 LessEqual（即当片段的深度值小于或等于当前深度缓冲区值时通过测试）。
使用条件：
当需要正确渲染三维场景中的物体遮挡关系时，必须使用深度缓冲区。
在 Three.js 中，深度缓冲区是默认创建的，除非在创建 WebGLRenderer 时明确指定 depthBuffer: false。
可以通过以下方式控制深度测试：
1、
const renderer = new THREE.WebGLRenderer({ depthBuffer: true }); // 默认即为true
2、也可以在材质级别控制深度测试：
material.depthTest = true; // 或 false
还可以设置深度比较函数：
material.depthFunc = THREE.LessEqualDepth; // 默认值，其他值如：NeverDepth, AlwaysDepth, EqualDepth, etc.
material.depthFunc = THREE.AlwaysDepth; // 总是通过
material.depthFunc = THREE.NeverDepth;  // 总是不通过
material.depthFunc = THREE.LessDepth;   // 默认：小于则通过
material.depthFunc = THREE.GreaterDepth; // 大于则通过
 * 
stencilBuffer：
 * 模板缓冲区是一个用于存储每个像素模板值的缓冲区。模板测试通常用于实现一些特殊效果，如镜面反射、阴影、轮廓显示等。模板测试发生在深度测试之前（在标准的渲染管线中，顺序是：模板测试 -> 深度测试 -> 混合）。
模板测试的原理是：根据设定的模板函数和参考值，将当前片段的模板值与模板缓冲区中对应位置的模板值进行比较。根据比较结果决定是否通过测试，并且可以根据测试结果更新模板缓冲区中的值。
模板测试的设置包括：
          stencilFunc: 设置模板测试的函数（如 always, equal, not equal 等）和参考值、掩码。
          stencilOp: 设置当模板测试通过、失败或深度测试失败时如何更新模板缓冲区（如 keep, replace, increment, decrement 等）。
 */
export class StudyDepthStencil {
  constructor(options) {
    this.options = options;
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    this.perspectiveCamera.position.set(0, 10, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, depth: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.options.dom.appendChild(this.renderer.domElement);
    this.renderer.setClearColor(0x222222);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    //
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    this.scene.add(new THREE.AxesHelper(100));

    // depth 深度测试
    // 创建两个几何体
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const sphereGeometry = new THREE.SphereGeometry(0.7, 32, 32);

    // 创建材质
    /**
     * .depthFunc : Integer
        Which depth function to use. Default is LessEqualDepth. See the depth mode constants for all possible values.

        .depthTest : Boolean
        Whether to have depth test enabled when rendering this material. Default is true. When the depth test is disabled, the depth write will also be implicitly disabled.

        .depthWrite : Boolean
        Whether rendering this material has any effect on the depth buffer. Default is true.

        When drawing 2D overlays it can be useful to disable the depth writing in order to layer several things together without creating z-index artifacts.
     */
    this.cubeMaterial = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
    });

    this.sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.8,
    });

    // 创建立方体和球体网格
    this.cube = new THREE.Mesh(cubeGeometry, this.cubeMaterial);
    this.sphere = new THREE.Mesh(sphereGeometry, this.sphereMaterial);

    // 设置位置 - 让它们部分重叠
    this.cube.position.set(-0.5, 0, 0);
    this.sphere.position.set(0.5, 0, 0);
    this.controls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);
    // 添加到场景
    this.scene.add(this.cube);
    this.scene.add(this.sphere);
    /**
     * Which depth function the material uses to compare incoming pixels Z-depth against the current Z-depth buffer value. If the result of the comparison is true, the pixel will be drawn.
     * 材质使用哪个深度函数来将传入像素 Z 深度与当前 Z 深度缓冲区值进行比较。如果比较结果为真，则绘制该像素。
     */
    this.depthFuncMap = {
      'THREE.NeverDepth': THREE.NeverDepth, //will never return true.永远不会返回 true。
      'THREE.AlwaysDepth': THREE.AlwaysDepth, //will always return true.将始终返回 true。
      'THREE.EqualDepth': THREE.EqualDepth, //will return true if the incoming pixel Z-depth is equal to the current buffer Z-depth.如果传入像素 Z 深度等于当前缓冲区 Z 深度，则返回 true。
      'THREE.LessDepth': THREE.LessDepth, //will return true if the incoming pixel Z-depth is less than the current buffer Z-depth.如果传入像素 Z 深度小于当前缓冲区 Z 深度，则返回 true。
      'THREE.LessEqualDepth': THREE.LessEqualDepth, //is the default and will return true if the incoming pixel Z-depth is less than or equal to the current buffer Z-depth.是默认值，如果传入像素 Z 深度小于或等于当前缓冲区 Z 深度，则返回 true。
      'THREE.GreaterEqualDepth': THREE.GreaterEqualDepth, //will return true if the incoming pixel Z-depth is greater than or equal to the current buffer Z-depth.如果传入像素 Z 深度大于或等于当前缓冲区 Z 深度，则返回 true。
      'THREE.GreaterDepth': THREE.GreaterDepth, //will return true if the incoming pixel Z-depth is greater than the current buffer Z-depth.如果传入像素 Z 深度大于当前缓冲区 Z 深度，则返回 true。
      'THREE.NotEqualDepth': THREE.NotEqualDepth, //will return true if the incoming pixel Z-depth is not equal to the current buffer Z-depth.如果传入像素 Z 深度不等于当前缓冲区 Z 深度，则返回 true。
    };
    this.depthFuncArr = [
      'THREE.NeverDepth',
      'THREE.AlwaysDepth',
      'THREE.EqualDepth',
      'THREE.LessDepth',
      'THREE.LessEqualDepth',
      'THREE.GreaterEqualDepth',
      'THREE.GreaterDepth',
      'THREE.NotEqualDepth',
    ];
    // 创建GUI
    const gui = new GUI();
    const cubeFolder = gui.addFolder('cube');
    cubeFolder
      .add(this.cubeMaterial, 'depthTest')
      .name('depthTest')
      .onChange(value => {
        this.cubeMaterial.depthTest = value;
        this.update();
      });
    cubeFolder
      .add(this.cubeMaterial, 'depthWrite')
      .name('depthWrite')
      .onChange(value => {
        this.cubeMaterial.depthWrite = value;
        this.update();
      });
    cubeFolder
      .add({ depthFunc: 'THREE.LessEqualDepth' }, 'depthFunc', this.depthFuncArr)
      .name('depthFunc')
      .onChange(value => {
        this.cubeMaterial.depthFunc = this.depthFuncMap[value];
        this.cubeMaterial.needsUpdate = true;
      });
    cubeFolder
      .add(this.cube, 'renderOrder', [0, 1])
      .name('renderOrder')
      .onChange(value => {
        //console.log('renderOrder:', value);
        this.cube.renderOrder = value;
        this.update();
      });
    // sphere
    const sphereFolder = gui.addFolder('sphere');
    sphereFolder
      .add(this.sphereMaterial, 'depthTest')
      .name('depthTest')
      .onChange(value => {
        this.sphereMaterial.depthTest = value;
        this.update();
      });
    sphereFolder
      .add(this.sphereMaterial, 'depthWrite')
      .name('depthWrite')
      .onChange(value => {
        this.sphereMaterial.depthWrite = value;
        this.update();
      });
    sphereFolder
      .add({ depthFunc: 'THREE.LessEqualDepth' }, 'depthFunc', this.depthFuncArr)
      .name('depthFunc')
      .onChange(value => {
        // 将字符串映射到Three.js常量
        this.sphereMaterial.depthFunc = this.depthFuncMap[value];
        this.update();
      });
    sphereFolder
      .add(this.cube, 'renderOrder', [0, 1])
      .name('renderOrder')
      .onChange(value => {
        //console.log('renderOrder:', value);
        this.sphere.renderOrder = value;
        this.update();
      });
    // stencil
    // 注意：这里只是模板测试的示例代码，实际使用时需要取消注释并确保变量不重复声明

    // 2. 创建主要物体（一个立方体）
    const stencilCubeGeometry = new THREE.BoxGeometry();
    const stencilCubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const stencilCube = new THREE.Mesh(stencilCubeGeometry, stencilCubeMaterial);
    this.scene.add(stencilCube);
    stencilCube.position.set(0, 2, 0);

    // 3. 创建放大的立方体作为轮廓
    const outlineGeometry = new THREE.BoxGeometry(1.1, 1.1, 1.1); // 稍微大一点
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.BackSide, // 只渲染背面，避免与原始立方体重叠
    });

    const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);

    // 4. 配置轮廓的模板材质
    outlineMaterial.stencilWrite = true;
    outlineMaterial.stencilFunc = THREE.AlwaysStencilFunc; // 总是通过测试
    outlineMaterial.stencilZPass = THREE.ReplaceStencilOp; // 当深度通过时，将模板值替换为参考值
    outline.position.set(0, 2, 0);
    this.scene.add(outline);

    // 5. 配置原始立方体的模板材质
    stencilCubeMaterial.stencilWrite = false; // 不写入模板
    stencilCubeMaterial.stencilFunc = THREE.NotEqualStencilFunc; // 只渲染在模板值不等于参考值的地方
    stencilCubeMaterial.stencilRef = 1; // 参考值设为 1

    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  update() {
    this.cubeMaterial.needsUpdate = true;
    this.sphereMaterial.needsUpdate = true;
  }
  animate() {
    this.renderer.render(this.scene, this.perspectiveCamera);
    // 旋转几何体以便更好地观察
    this.cube.rotation.y += 0.01;
    this.sphere.rotation.y += 0.01;
  }

  _windowResizeFun() {
    this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
