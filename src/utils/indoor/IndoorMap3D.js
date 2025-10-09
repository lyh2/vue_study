import * as THREE from 'three';
import IndoorMapLoader from './IndoorMapLoader';
import { default3dTheme } from './theme/default3dTheme';
import { _0_, _1_, _root_ } from './constaint';
import { OrbitControls } from 'three/examples/jsm/Addons';
import { createNameSprites } from './common';
import { UIManager } from './UIManager';
import { parseModel } from './Utils';

export default class IndoorMap3D {
  constructor(options) {
    //console.log(options);
    this.options = options;
    this.theme = null; // 使用的主题配置
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.canvasWidthHalf = this.canvasWidth * 0.5;
    this.canvasHeightHalf = this.canvasHeight * 0.5;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.mall = null;
    this.is3d = true;
    this.controls = null;
    this.rayCaster = null;
    this.mapOptions = {
      showNames: true,
      showPubPoints: true,
    };
    this.selectedObj = null;
    this.currentFloorId = _0_; // 当前选中的楼层
    this.sceneOrtho = null; // 正交相机的场景
    this.cameraOrtho = null; // 正交相机

    this.pubPointIconsGroup = new THREE.Group();
    this.pubPointIconsGroup.name = 'pubPointIcons'; // 存储图标对象
    this.pubPointNamesGroup = new THREE.Group();
    this.pubPointNamesGroup.name = 'pubPointNames'; // 存储名

    this.spriteMaterialsOfPubPoints = []; // 功能区域ICON资源

    this.init(_1_);
  }
  /**
   * 初始化方法
   */
  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.canvasWidth / this.canvasHeight, 0.01, 2000);
    this.camera.position.set(0, 200, 200);
    // 创建正交场景,用于2D效果
    this.sceneOrtho = new THREE.Scene();
    this.sceneOrtho.add(this.pubPointIconsGroup);
    this.sceneOrtho.add(this.pubPointNamesGroup);
    //console.log('this.sceneOrtho', this.sceneOrtho);
    this.cameraOrtho = new THREE.OrthographicCamera(
      -this.canvasWidthHalf,
      this.canvasWidthHalf,
      this.canvasHeightHalf,
      -this.canvasHeightHalf,
      0.1,
      1000
    );
    this.cameraOrtho.position.z = 10;
    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    this.renderer.autoClear = true; // 默认值就是true
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.canvasWidth, this.canvasHeight);

    // 创建控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // 创景环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    // 添加灯光
    const light_1_ = new THREE.DirectionalLight(0xffffff, 1.2);
    light_1_.position.set(-500, 500, -500);
    this.scene.add(light_1_);

    //
    const light_2_ = new THREE.DirectionalLight(0xffffff, 1.2);
    light_2_.position.set(500, 500, 500);
    this.scene.add(light_2_);

    this.options.dom.appendChild(this.renderer.domElement);

    this.renderer.setAnimationLoop(this.animate.bind(this));

    this.scene.add(new THREE.AxesHelper(200));
    window.addEventListener(
      'resize',
      () => {
        this.onResize();
      },
      false
    );
  }
  /**
   * 加载JSON数据
   * @param {*} fileName  - 加载的JSON文件
   * @param {*} callback  - 回掉方法()=>{}
   */
  load(fileName, callback) {
    const loader = new IndoorMapLoader(this.is3d);
    this.theme = default3dTheme;

    this.scene.background = new THREE.Color(this.theme.background);
    loader.loadMap(fileName, mall => {
      console.log('mall:', mall);
      this.mall = mall;
      this.scene.add(mall.root);
      console.log('this.scene:', this.scene);
      if (callback) {
        callback();
      }
      this._updateFloors_();
    });

    return this;
  }
  /**
   * 显示所有楼层
   */
  showAllFloors() {
    this.currentFloorId = _0_;
    if (this.mall == null) {
      return;
    }
    this.mall.showAllFloors();
    this.adjustCamera();
    this.clearChildren(this.pubPointIconsGroup);
    this.clearChildren(this.pubPointNamesGroup);
    return this;
  }
  /**
   * 显示指定楼层
   * @param {*} floorId
   */
  showFloorById(floorId) {
    this.currentFloorId = floorId;
    if (this.mall == null) {
      // 还未创建楼层
      return;
    }
    this.mall.showFloor(floorId);
    // 改变相机位置
    this.adjustCamera();
    //console.log(this.mapOptions);
    if (this.mapOptions.showPubPoints) {
      // 显示功能区图标
      this.createPubPointSprites();
    }
    if (this.mapOptions.showNames) {
      createNameSprites.bind(this)();
    }

    return this;
  }

  createPubPointSprites() {
    if (this.spriteMaterialsOfPubPoints.length == _0_) {
      // 加载资源
      this.loadSprites();
    }
    if (this.pubPointIconsGroup.length > _0_) this.clearChildren(this.pubPointIconsGroup);
    // 创建图标
    const pubPointsJson = this.mall.getFloorJson(this.mall.getCurrentFloorId()).pubPoints;
    let imgWidth = 30;
    let imgHeight = 30;
    //console.log('www', pubPointsJson);
    for (let i = 0; i < pubPointsJson.length; i++) {
      const material = this.spriteMaterialsOfPubPoints[pubPointsJson[i].type];
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(imgWidth, imgHeight, 1);
      sprite.oriX = pubPointsJson[i].outline[0][0][0]; // 层级太深了不好
      sprite.oriY = pubPointsJson[i].outline[0][0][1]; // 这里是图标的位置
      sprite.width = imgWidth;
      sprite.height = imgHeight; // 没有作用
      sprite.name = pubPointsJson[i].name;
      this.pubPointIconsGroup.add(sprite);
    }
    //console.log('ss', this.sceneOrtho);
  }
  /**
   * 删除当前对象的所有子对象,非递归删除
   * @param {*} parent
   */
  clearChildren(parent) {
    if (parent == undefined || parent == null) {
      return;
    }
    parent.children.map(item => {
      item.geometry.dispose();
      item.material.dispose();
    });

    parent.clear();
  }
  loadSprites() {
    if (this.mall != null && this.spriteMaterialsOfPubPoints.length == _0_) {
      const images = this.theme.pubPointImg;
      const loader = new THREE.TextureLoader();
      for (const key in images) {
        const texture = loader.load(images[key]);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        this.spriteMaterialsOfPubPoints[key] = material;
      }
    }
  }
  adjustCamera() {
    this.setDefaultView();
  }

  setDefaultView() {
    const cameraAngle = this.mall.frontAngle + Math.PI / 2;
    const cameraDir = [Math.cos(cameraAngle), Math.sin(cameraAngle)];
    const cameraDistance = 500;
    const tileAngle = (75 * Math.PI) / 180.0;
    this.camera.position.set(
      cameraDir[1] * cameraDistance,
      Math.sin(tileAngle) * cameraDistance,
      cameraDir[0] * cameraDistance
    );
    this.camera.lookAt(this.scene.position);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    return this;
  }

  setTopView() {
    this.camera.position.set(0, 500, 0);
    return this;
  }
  setTheme(theme) {
    if (theme == null) {
      // 设置默认样式
      this.theme = default3dTheme;
    } else {
      this.theme = theme;
    }
    // 清除现有的所有数据，重新解析数据进行绘制
    if (this.mall) this.mall.root.clear();
    this.mall = parseModel(this.mall.jsonData, this.is3d, this.theme);
    this.scene.remove(this.scene.getObjectByName(_root_));
    this.scene.add(this.mall.root);
    this._updateFloors_();
    return this;
  }

  getTheme() {
    return this.theme;
  }
  /**
   * 内部调用方法
   */
  _updateFloors_() {
    this.renderer.setClearColor(this.theme.background);
    if (this.currentFloorId == _0_) {
      // 显示所有楼层
      this.showAllFloors();
    } else {
      // 显示指定楼层
      this.showFloorById(this.currentFloorId);
    }
  }
  /**
   * 是否显示文字
   * @param {*} bShow
   * @returns
   */
  showNames(bShow) {
    this.mapOptions.showNames = bShow;
    // 还有代码-----控制文字是否显示

    return this;
  }
  /**
   * 控制图标ICON是否显示
   * @param {*} bShow
   */
  showIcons(bShow) {
    console.log('bShow是否显示ICON', bShow);
    return this;
  }
  setSelectable(bSelect) {
    console.log('bSelect:', bSelect);
    return this;
  }
  setGui() {
    this.uiManager = new UIManager(this);
    return this;
  }
  animate() {
    this.controls.update();

    // 第一次渲染时会自动 clear（颜色 + 深度 + 模板缓冲）
    this.renderer.autoClear = true;
    this.renderer.render(this.scene, this.camera);
    this._update_();

    // 第二次渲染，先禁止自动清除，避免把前一次画的内容清空
    this.renderer.autoClear = false;
    // 只清除深度缓冲，保留颜色缓冲
    this.renderer.clearDepth();
    /**
     * 为什么要清深度？

      如果不清深度，正交相机渲染 HUD 时，它的物体可能会因为“深度检测”被楼层挡住（例如 HUD 在屏幕上本来应该覆盖，但 GPU 发现它的 Z 值比楼层大，就不画了）。

      清掉深度后，HUD 渲染就完全不受前面 3D 场景的深度影响，能稳稳叠加在屏幕上。
     */
    this.renderer.render(this.sceneOrtho, this.cameraOrtho);
  }
  _update_() {
    if (this.mall == null) {
      return;
    }
    const currentFloor = this.mall.getCurrentFloor();

    if (currentFloor == null) {
      return;
    }
    /**
     模型坐标 (model space)
        ⬇  modelMatrix
      世界坐标 (world space)
        ⬇  viewMatrix (相机矩阵的逆矩阵)
      相机坐标 / 观察空间 (view/camera space)
        ⬇  projectionMatrix (透视 or 正交投影)
      裁剪空间 (clip space, 齐次坐标，还未除以 w)
        ⬇  NDC (除以 w，范围 [-1,1])
      归一化设备坐标系 (Normalized Device Coordinates, NDC)
        ⬇  viewport transform
      屏幕坐标 (屏幕像素，原点在屏幕左下或左上，取决于 API)
      --------------------------------------------------------------------------------------
      三、为什么必须是 NDC 才能裁剪？

        渲染管线的固定硬件（GPU）在执行光栅化（rasterization）前，有一条规定：

        只有 NDC 空间的范围 [-1,1]^3 内的片元，才会被送入屏幕。

        也就是说：

        GPU 只知道如何处理一个固定大小的“立方体视锥”。

        任何超出这个范围的坐标，都会在 裁剪阶段（clipping） 被丢弃或切割。

        💡 换句话说：

        NDC 是 GPU 光栅化算法的“标准输入空间”。

        如果不变换到 NDC，你的场景范围可能是无限的、任意比例的，GPU 根本不知道怎么处理或判断哪些片元在视口内。
     */
    const projectMatrix = new THREE.Matrix4();
    //
    projectMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    if (this.pubPointNamesGroup.children.length > _0_) {
      this._updateSprites_(this.pubPointNamesGroup, projectMatrix);
    }

    if (this.pubPointIconsGroup.children.length > _0_) {
      //
      this._updateSprites_(this.pubPointIconsGroup, projectMatrix);
    }
  }

  _updateSprites_(spriteList, projectMatrix) {
    for (let i = 0; i < spriteList.children.length; i++) {
      const sprite = spriteList.children[i];
      const vec = new THREE.Vector3(sprite.oriX, 0, -sprite.oriY);
      vec.applyMatrix4(projectMatrix);

      const x = Math.round(vec.x * this.canvasWidthHalf);
      const y = Math.round(vec.y * this.canvasHeightHalf);
      sprite.position.set(x, y, 1);
    }
  }
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.canvasWidthHalf = this.canvasWidth * 0.5;
    this.canvasHeightHalf = this.canvasHeight * 0.5;

    this.cameraOrtho.left = -this.canvasWidthHalf;
    this.cameraOrtho.right = this.canvasWidthHalf;
    this.cameraOrtho.top = this.canvasHeightHalf;
    this.cameraOrtho.bottom = -this.canvasHeightHalf;
    this.cameraOrtho.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

/**
 * TODO
 * [] -图标遮挡
 * [] -切换楼层
 * [] -切换视图
 * [] -选择房间&图标&文字
 * [] -路线规划
 * [] -读取dxf文件直接创建3D对象
 */
