import * as THREE from 'three';
import {
  Capsule,
  EffectComposer,
  FXAAShader,
  GLTFLoader,
  Octree,
  OrbitControls,
  OutlinePass,
  RenderPass,
  ShaderPass,
  UnrealBloomPass,
} from 'three/examples/jsm/Addons';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min';

/**
 * 学习使用geometry.parameters 属性
 */
export class StudyGeometryParameters {
  constructor(options) {
    this.options = options;

    this.init();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.options.dom.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.perspectiveCamera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.perspectiveCamera.position.z = 5;
    this.perspectiveCamera.position.y = 5;

    const pointLight = new THREE.PointLight(0xffffff, 1.2);

    const boxGeometry = new THREE.BoxGeometry(1, 1, 1, 100, 100, 100);
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      visible: true, //Defines whether this material is visible. Default is true.
    });
    this.boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    this.boxMesh.name = 'box';

    this.scene.add(this.boxMesh);
    this.scene.add(pointLight);
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    pointLight.position.z = 5;
    pointLight.position.y = 10;

    this.scene.add(new THREE.AxesHelper(100));

    this.controls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);
    this.gui = new GUI();
    this.boxData = {};
    /**
     * this.boxMesh.geometry 创建对像几何数据时传递的参数就会在这里
     */
    console.log('this.boxMesh.geometry:', this.boxMesh.geometry);

    for (const x in this.boxMesh.geometry.parameters) {
      this.boxData[x] = this.boxMesh.geometry.parameters[x];
    }

    const boxFolder = this.gui.addFolder('Box');
    boxFolder
      .add(this.boxData, 'width', 1, 10)
      .name('Width')
      .onChange(this.modifyBoxGeometry.bind(this));
    boxFolder
      .add(this.boxData, 'height', 1, 10)
      .name('Height')
      .onChange(this.modifyBoxGeometry.bind(this));
    boxFolder
      .add(this.boxData, 'depth', 1, 10)
      .name('Depth')
      .onChange(this.modifyBoxGeometry.bind(this));
    boxFolder
      .add(this.boxData, 'widthSegments', 1, 20)
      .name('widthSegments')
      .step(1)
      .onChange(this.modifyBoxGeometry.bind(this));
    boxFolder
      .add(this.boxData, 'heightSegments', 1, 20)
      .name('heightSegments')
      .step(1)
      .onChange(this.modifyBoxGeometry.bind(this));
    boxFolder
      .add(this.boxData, 'depthSegments', 1, 20)
      .step(1)
      .name('depthSegments')
      .onChange(this.modifyBoxGeometry.bind(this));

    this.renderer.setAnimationLoop(this.animate.bind(this));
  }
  animate() {
    this.boxMesh.rotation.y += 0.01;

    this.controls.update();
    this.renderer.render(this.scene, this.perspectiveCamera);
  }
  modifyBoxGeometry() {
    const newBoxGeometry = new THREE.BoxGeometry(
      this.boxData.width,
      this.boxData.height,
      this.boxData.depth,
      this.boxData.widthSegments,
      this.boxData.heightSegments,
      this.boxData.depthSegments
    );
    this.boxMesh.geometry.dispose();
    this.boxMesh.geometry = newBoxGeometry;
  }
  _windowResizeFun() {
    this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

/**
 * 碰撞检测学习
 */
export class StudyOCtreeCollisions {
  constructor(options) {
    this.options = options;

    this.init();
  }

  init() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x88ccee);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // 是否可以不加下面两行代码，添加的作用是啥
    //this.camera.rotation.order = 'YXZ';
    //this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    this.renderer.dom.appendChild(this.renderer.domElement);

    // 创建渲染目标
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        colorSpace: THREE.SRGBColorSpace,
        /**
            wrapS - default is ClampToEdgeWrapping.
            wrapT - default is ClampToEdgeWrapping.
            magFilter - default is LinearFilter.
            minFilter - default is LinearFilter.
            generateMipmaps - default is false.
            format - default is RGBAFormat.
            type - default is UnsignedByteType.
            anisotropy - default is 1. See Texture.anisotropy
            colorSpace - default is NoColorSpace.
            internalFormat - default is null.
            depthBuffer - default is true.
            stencilBuffer - default is false.
            resolveDepthBuffer - default is true.
            resolveStencilBuffer - default is true.
            samples - default is 0.
            count - default is 1.
         */
      }
    );

    // 添加半球光
    const hemisphereLight = new THREE.HemisphereLight(0x999977, 0x442200, 2);
    hemisphereLight.position.set(2, 1, 1);
    this.scene.add(hemisphereLight);

    //
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer = new EffectComposer(this.renderer);
    this.outlineComposer = new EffectComposer(this.renderer, renderTarget);
    // 产生光晕效果
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1, // - 控制整体发光效果的强度- 值越大，Bloom 效果越明显和强烈
      0.2, //- 控制模糊的扩散范围- 值越大，光晕扩散范围越广
      0.1 // - 亮度阈值- 只有亮度高于此值的区域才会产生 Bloom 效果- 值越高，只有越亮的区域才会发光
    ); // 这个效果会让场景中的明亮区域产生光晕和发光效果
    this.outline = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.perspectiveCamera
    );
    this.outline.edgeThickness = 1.0;
    this.outline.edgeStrength = 3.0;
    this.outline.visibleEdgeColor.set(0xff00cc);

    // 加载纹理
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./tutorial/images/sprite0.png', texture => {
      outline.patternTexture = texture;
      outline.usePatternTexture = true;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    });
    /**
     * This pass can be used to create a post processing effect
     * with a raw GLSL shader object. Useful for implementing custom
     * effects.
     */
    this.fxaaShader = new ShaderPass(FXAAShader);
    this.fxaaShader.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);

    this.meshes = [];
    this.materials = [];
    this.group = new THREE.Group();
    this.group.name = 'group';

    const xGrid = 20;
    const yGrid = 10;
    let i, j, ox, oy, geometry, material, mesh;
    const ux = 1 / xGrid;
    const uy = 1 / yGrid;
    const xSize = 1920 / xGrid;
    const ySize = 1080 / yGrid;

    const videoTexture = new THREE.VideoTexture(this.options.videoDom);
    this.parameters = { map: videoTexture };
    this.scene.add(this.group);

    let cube_count = 0;
    let cubesAnimate = false;

    for (let i = 0; i < xGrid; i++) {
      for (let j = 0; j < yGrid; j++) {
        ox = i;
        oy = j;
        geometry = new THREE.BoxGeometry(xSize, ySize, xSize);
        this.changeUvs(geometry, ux, uy, ox, oy);
        this.materials[cube_count] = new THREE.MeshLambertMaterial(this.parameters);
        material = this.materials[cube_count];
        console.log('material:', material); // 没有hue 属性？
        material.color.setHSL(material.hue, 0.2, 1.0);
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = (i - xGrid / 2) * xSize;
        mesh.position.y = (j - yGrid / 2) * ySize;
        mesh.position.z = 0;
        this.group.add(mesh);
        mesh.dx = 0.001 * (0.5 - Math.random());
        mesh.dy = 0.001 * (0.5 - Math.random());
        this.meshes[cube_count] = mesh;
        cube_count += 1;
      }
    }

    this.group.scale.set(0.0015, 0.0015, 0.0015);

    this.composer.addPass(renderPass);
    this.composer.addPass(bloomPass);

    this.outlineComposer.addPass(renderPass);
    this.outlineComposer.addPass(this.outline);
    this.outlineComposer.addPass(this.fxaaShader);
    this.outlineComposer.addPass(bloomPass);

    this.gravity = 30;
    this.steps_per_frame = 5;
    this.intersect = null;
    this.spheres = [];
    this.worldOCtree = new Octree();

    // 创建一个胶囊体 半径radius=0.35，height=1.65
    this.playerCollider = new Capsule(
      new THREE.Vector3(-2, 0.35, 14),
      new THREE.Vector3(-2, 2, 14),
      0.35
    );
    this.playerVelocity = new THREE.Vector3();
    this.playerDirection = new THREE.Vector3();

    this.playerOnFloor = false;
    this.mouseTime = 0;

    this.keyStates = {};
    this.vector1 = new THREE.Vector3();
    this.vector2 = new THREE.Vector3();
    this.vector3 = new THREE.Vector3();
    this.colliderPos = null;
    this.aboutPlatformPos = null;
    this.aboutPlaying = false;
    this.distanceBetweenPlayerAndCollider = null;
    this.bookInteractable = false;
    this.raycaster = null;
    this.interactables = [];
    this.intersectedObject = null; // 相交的对象
    this.selectedObjects = [];
    this.hologramGroup = [];
    this.activeHologram = null;
    this.galleryProjectionSphere = null;
    this.initEventListener();

    // 加载纹理
    const texture = new THREE.TextureLoader().load('./tutorial/resources/images/lightmap_lite.jpg');
    const loader = new GLTFLoader();
    loader.load('./tutorial/resources/scenes/tutorial_scene.gltf', gltf => {
      console.log('加载之后的模型:', gltf);
    });
  }

  initEventListener() {
    document.addEventListener('keydown', event => {
      this.keyStates[event.code] = true;

      this.colliderPos = new THREE.Vector3(
        this.playerCollider.start.x,
        this.playerCollider.start.y,
        this.playerCollider.start.z
      );

      if (this.aboutPlatformPos) {
        this.distanceBetweenPlayerAndCollider = this.colliderPos.distanceTo(this.aboutPlatformPos);
      }
    });

    document.addEventListener('keyup', event => {
      this.keyStates[event.code] = false;
    });

    this.renderer.domElement.addEventListener(
      'mousedown',
      () => {
        if (!this.bookInteractable) {
          document.body.requestPointerLock();
        }
        this.mouseTime = performance.now();
      },
      false
    );

    document.addEventListener('mouseup', () => {}, false);
    document.body.addEventListener(
      'mousemove',
      event => {
        if (document.pointerLockElement === document.body) {
          // 鼠标左右移动相机绕Y轴旋转，鼠标上下移动，相机绕X轴旋转
          this.perspectiveCamera.rotation.y -= event.movementX / 500;
          this.perspectiveCamera.rotation.x -= event.movementY / 500;
          this.intersection();
        }
      },
      false
    );

    window.addEventListener('click', e => {
      if (
        this.intersectedObject &&
        this.intersectedObject.name.search('button_interactable') !== -1 &&
        this.aboutPlaying
      ) {
        const listener = new THREE.AudioListener();
        this.perspectiveCamera.add(listener);
        const aboutVoice = new THREE.PositionalAudio(listener);
        // load a sound and set it as the PositionalAudio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('./tutorial/sounds/ThrowOnions.ogg', function (buffer) {
          aboutVoice.setBuffer(buffer);
          aboutVoice.setRefDistance(20);
          aboutVoice.play();
        });

        this.galleryProjectionSphere.add(aboutVoice);
        this.aboutPlaying = !this.aboutPlaying;
      } else if (this.aboutPlaying) {
      }
    });
  }

  intersection() {
    this.raycaster = new THREE.Raycaster(
      this.perspectiveCamera.position,
      this.perspectiveCamera.getWorldDirection(this.playerDirection),
      0.1,
      10
    );

    if (this.interactables.length > 0) {
      const intersects = this.raycaster.intersectObjects(this.interactables, false);
      if (intersects.length > 0) {
        if (
          this.intersectedObject != intersects[0].object &&
          intersects[0].object.type === 'Mesh'
        ) {
          this.intersectedObject = intersects[0].object;
          this.intersect = intersects[0];
          this.addSelectedObjects(this.intersectedObject);
          this.outline.selectedObjects = this.selectedObjects;

          if (this.intersectedObject.name.search('interactable') !== -1) {
          }
          if (
            this.intersectedObject.name === 'book_interactable' ||
            this.intersectedObject.name === 'book2_interactable'
          ) {
            this.bookInteractable = true;
            document.exitPointerLock();
          }

          this.hologramInteraction(this.intersectedObject);
        }
      } else {
        this.intersectedObject = null;
      }
    }
  }
  // This checks which hologram is active/selected and then displays it the hologram interaction
  hologramInteraction(object) {
    let objName = /^\w+/.exec(obj.name.replace(/_/g, ' '))[0];
    this.hologramGroup.map(item => {
      if (objName === /^\w+/.exec(item.name.replace(/_/g, ' '))[0]) {
        if (this.activeHologram !== null) {
          this.activeHologram.visible = false;
          this.activeHologram = item;
          this.activeHologram.visible = true;
        } else {
          this.activeHologram = item;
          this.activeHologram.visible = true;
        }
        this.galleryProjectionSphere.visible = true;
        document.exitPointerLock();
      }
    });
  }
  addSelectedObjects(object) {
    if (this.selectedObjects.length > 0) {
      this.selectedObjects.pop();
    }
    this.selectedObjects.push(object);
  }
  changeUvs(geometry, unitX, unitY, offsetX, offsetY) {
    const uvs = geometry.attributes.uv.array;
    for (let i = 0; i < uvs.length; i += 2) {
      uvs[i] = (uvs[i] + offsetX) * unitX;
      uvs[i + 1] = (uvs[i + 1] + offsetY) * unitY;
    }
  }

  animate() {}

  _windowResizeFun() {
    this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.outlineComposer.setSize(window.innerWidth, window.innerHeight);
    this.fxaaShader.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
  }
}
