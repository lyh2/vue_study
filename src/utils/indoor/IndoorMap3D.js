import * as THREE from 'three';
import IndoorMapLoader from './IndoorMapLoader';
import { default3dTheme } from './theme/default3dTheme';
import { _0_, _1_, _2_, _arrow_, _plane_, _root_ } from './constaint';
import { OrbitControls } from 'three/examples/jsm/Addons';
import { createNameSprites } from './common';
import { UIManager } from './UIManager';
import { parseModel } from './Utils';
import Rect from './Rect';

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
    if (this.pubPointIconsGroup.children.length > _0_) this.clearChildren(this.pubPointIconsGroup);
    // 创建图标

    const pubPointsJson =
      this.mall.getCurrentFloorId() !== _0_
        ? this.mall.getFloorJson(this.mall.getCurrentFloorId()).pubPoints
        : [];
    let imgWidth = 30;
    let imgHeight = 30;
    for (let i = 0; i < pubPointsJson.length; i++) {
      const material = this.spriteMaterialsOfPubPoints[pubPointsJson[i].type];
      //console.log('material:', pubPointsJson[i], material);
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
    /** 建筑正面朝向角度，逆时针旋转为正值
      frontAngle ≈ 0 → 朝 +Z
      frontAngle ≈ π/2 → 朝 +X
      frontAngle ≈ π → 朝 -Z
      frontAngle ≈ -π/2 → 朝 -X
     */
    const cameraAngle = this.mall.frontAngle + Math.PI / 2;
    const cameraDir = [Math.sin(cameraAngle), Math.cos(cameraAngle)];
    const cameraDistance = 800; // 设置半径
    const tileAngle = (75 * Math.PI) / 180.0; // 相机视角的角度转弧度
    // 设置相机的位置
    this.camera.position.set(
      cameraDir[1] * cameraDistance, // x轴sin计算
      Math.sin(tileAngle) * 0.8 * cameraDistance, // y轴
      cameraDir[0] * cameraDistance // z轴cos计算
    );
    // 可视化方向向量
    const frontDir = new THREE.Vector3(cameraDir[0], 0, cameraDir[1]);
    const arrow = new THREE.ArrowHelper(
      frontDir.clone().normalize(),
      new THREE.Vector3(0, 0, 0),
      1000,
      0xff0000
    );
    arrow.name = _arrow_;
    if (!this.scene.getObjectByName(_arrow_)) this.scene.add(arrow);

    //this.camera.lookAt(this.scene.position);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
    return this;
  }

  setTopView() {
    this.camera.position.set(0, 500, 0);
    this.controls.enableRotate = false;
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

    this.pubPointNamesGroup.visible = bShow;
    return this;
  }
  /**
   * 控制图标ICON是否显示
   * @param {*} bShow
   */
  showIcons(bShow) {
    //console.log('bShow是否显示ICON', bShow);
    this.pubPointIconsGroup.visible = bShow;
    return this;
  }
  /**
   * 设置是否可以被选择
   * @param {*} bSelect
   * @returns
   */
  setSelectable(bSelect) {
    //console.log('bSelect:', bSelect);
    if (bSelect) {
      // 添加事件监听
      this.rayCaster = new THREE.Raycaster();
      this.options.dom.addEventListener('mousedown', this.onSelectObject.bind(this), false);
      this.options.dom.addEventListener('touchstart', this.onSelectObject.bind(this), false);
    } else {
      // 不可选择，则取消事件监听
      this.options.dom.removeEventListener('mousedown', this.onSelectObject.bind(this), false);
      this.options.dom.removeEventListener('touchstart', this.onSelectObject.bind(this), false);
    }
    return this;
  }
  /**
   * 设置选中回调
   * @param {*} callback
   */
  setSelectListener(callback) {
    this.selectListener = callback;
    return this;
  }

  onSelectObject(event) {
    //console.log('event:', event);
    event.preventDefault();
    const mouse = new THREE.Vector2();
    // 判断是否鼠标点击还是手指触发
    if (event.type == 'touchstart') {
      mouse.x = (event.touches[0].clientX / this.canvasWidth) * 2 - 1;
      mouse.y = -(event.touches[0].clientY / this.canvasHeight) * 2 + 1;
    } else {
      mouse.x = (event.clientX / this.canvasWidth) * 2 - 1;
      mouse.y = -(event.clientY / this.canvasHeight) * 2 + 1;
    }
    // const vector = new THREE.Vector3(mouse.x, mouse.y, 1); // 创建一个指向远平面的向量，z=1 就表示远平面
    // vector.unproject(this.camera);

    // this.rayCaster.set(
    //   this.camera.position,
    //   new THREE.Vector3().subVectors(this.camera.position, vector).normalize()
    // );
    this.rayCaster.setFromCamera(mouse, this.camera);

    const floorObject = this.mall.getCurrentFloor();
    if (floorObject !== null) {
      const intersects = this.rayCaster.intersectObjects(floorObject.children);
      //console.log('intersects香蕉:', floorObject, intersects);
      if (intersects.length > _0_) {
        const firstObject = intersects[0].object;
        if (this.selectedObj != firstObject && !firstObject.name.includes(_plane_)) {
          // 判断是否是首次选择某个对象,是则恢复原来的颜色配置
          if (this.selectedObj != null) {
            this.selectedObj.material.color.setHex(this.selectedObj.userData.hex);
            this.selectedObj.scale.set(1, 1, 1);
          }

          // 可根据类型判断是否改变颜色
          firstObject.userData.hex = firstObject.material.color.getHex();
          firstObject.material.color = new THREE.Color(this.theme.selected);
          firstObject.scale.set(1, 2.5, 1);
          //console.log('firstObject:', firstObject);
          this.selectedObj = firstObject;

          if (this.selectListener) {
            this.selectListener(firstObject);
          }
        }
      } else {
        // 没有选中某个对象，判断原来是否有已经被选中的对象，存在则恢复原来的，并且清空+返回选中的对象回调
        if (this.selectedObj !== null) {
          this.selectedObj.material.color.setHex(this.selectedObj.userData.hex);
        }

        this.selectedObj = null;
        if (this.selectListener) {
          this.selectListener(null);
        }
      }
    }
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

      // 可视显示判断
      let visible = true;
      for (let j = 0; j < i; j++) {
        /**
         * - __避免重复检测__：
            - 只检查当前精灵（索引i）与之前已经处理过的精灵（索引0到i-1）
            - 如果精灵A和精灵B已经检测过碰撞，就不需要再检测B和A
            - 这减少了50%的检测次数，从O(n²)优化到O(n²/2)
          - __处理顺序依赖__：
            - 精灵按顺序处理，先处理的精灵有"优先显示权"
            - 如果后处理的精灵与先处理的精灵碰撞，后处理的精灵会被隐藏
            - 这确保了显示优先级的一致性
         */
        // 计算得到精灵的宽度
        const imgWidthHalf_i = sprite.width / _2_;
        const imgHeightHalf_i = sprite.height / _2_;
        // 创建矩形碰撞区域
        const rect_i = new Rect(
          sprite.position.x - imgWidthHalf_i,
          sprite.position.y - imgHeightHalf_i,
          sprite.position.x + imgWidthHalf_i,
          sprite.position.y + imgHeightHalf_i
        );

        // 与之前检测过的对象进行判断
        const sprite_j_prev = spriteList.children[j];
        const j_position = sprite_j_prev.position;
        const imgWidthHalf_j = sprite_j_prev.width / _2_;
        const imgHeightHalf_j = sprite_j_prev.height / _2_;
        const rect_j = new Rect(
          j_position.x - imgWidthHalf_j,
          j_position.y - imgHeightHalf_j,
          j_position.x + imgWidthHalf_j,
          j_position.y + imgHeightHalf_j
        );
        if (sprite_j_prev.visible && rect_i.isCollide(rect_j)) {
          // 如果前面检测过的对象是可视化的，现在两个矩形框相交
          visible = false;
          break;
        }
        //console.log(visibleMargin, rect_i);
      }
      sprite.visible = visible;
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
 * ✅ -图标遮挡
 * ✅ -切换楼层
 * ✅ -切换视图
 * ✅ -选择房间&图标&文字
 * ✅ -使用Three-bvh-csg 进行交叉并操作
 * [] -路线规划
 *
 *
 */
