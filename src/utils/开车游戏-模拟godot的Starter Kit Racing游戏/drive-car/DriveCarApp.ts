import * as THREE from 'three';
import {
  registerAll,
  createWorldSettings,
  addBroadphaseLayer,
  addObjectLayer,
  enableCollision,
  createWorld,
  MotionType,
  rigidBody,
  box,
  updateWorld,
} from 'crashcat';
import { loadModels } from './load-model';
import { buildTrack, computeSpawnPosition, computeTrackBounds, decodeCells } from './Track';
import { initRenderer, initScene, initLights, initWindowResize } from './common';
import { buildWallColliders, createSphereBody } from './Physics';
import { Vehicle } from './Vehicle';
import { Camera } from './Camera';
import { Controls } from './Controls';
import { SmokeTrails } from './Particles';
import { GameAudio } from './Audio';

class DriveCarApp {
  public options: any;
  public models: Object;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: Camera;
  public controls: any;
  public directionalLight: THREE.DirectionalLight;
  public clock: THREE.Clock;
  public world: any;
  public contactListener: any;
  public vehicle: Vehicle;
  public particles: SmokeTrails;
  public audio: GameAudio;

  constructor(options) {
    this.options = options;
    this.models = {};

    this.init();
  }

  async init() {
    registerAll(); // 注册crashcat
    this.camera = new Camera();
    this.initThree();

    await loadModels(this); // 加载模型
    // 解析URL参数，获取要加载的场景
    const mapParam = new URLSearchParams(window.location.search).get('map');
    let customCells = null;
    let spawn = null; // 生成的位置
    if (mapParam) {
      try {
        customCells = decodeCells(mapParam);
        spawn = computeSpawnPosition(customCells);
      } catch (e) {
        console.warn('Invalid map parameter,using default track');
      }
    }
    // compute track bounds and size physics/shadows to  fit
    const bounds = computeTrackBounds(customCells);
    const hw = bounds.halfWidth; // 得到轨道的半宽和半高，用于调整摄像机、灯光和雾效范围
    const hd = bounds.halfHeight;
    const groundSize = Math.max(hw, hd) * 2 + 20;

    const shadowExtent = Math.max(hw, hd) + 10;
    this.directionalLight.shadow.camera.left = -shadowExtent;
    this.directionalLight.shadow.camera.right = shadowExtent;
    this.directionalLight.shadow.camera.top = shadowExtent;
    this.directionalLight.shadow.camera.bottom = -shadowExtent;
    this.directionalLight.shadow.camera.updateProjectionMatrix();

    this.scene.fog.near = groundSize * 0.4;
    this.scene.fog.far = groundSize * 0.8;

    buildTrack(this.scene, this.models, customCells); // 构建场景

    // 创建物理世界
    const worldSettings = createWorldSettings();
    worldSettings.gravity = [0, -9.81, 0];

    // 创建碰撞检测层
    const BPL_MOVING = addBroadphaseLayer(worldSettings);
    const BPL_STATIC = addBroadphaseLayer(worldSettings);
    const OL_MOVING = addObjectLayer(worldSettings, BPL_MOVING);
    const OL_STATIC = addObjectLayer(worldSettings, BPL_STATIC);

    // 开启碰撞检测
    enableCollision(worldSettings, OL_MOVING, OL_STATIC);
    enableCollision(worldSettings, OL_MOVING, OL_MOVING);

    this.world = createWorld(worldSettings);
    this.world._OL_MOVING = OL_MOVING;
    this.world._OL_STATIC = OL_STATIC;
    const debugGroup = new THREE.Group();
    debugGroup.name = 'debugGroup';
    this.scene.add(debugGroup);
    // 创建墙体碰撞体
    buildWallColliders(this.world, debugGroup, customCells);
    // 创建道路
    const roadHalf = groundSize / 2;
    rigidBody.create(this.world, {
      shape: box.create({ halfExtents: [roadHalf, 0.01, roadHalf] }),
      motionType: MotionType.STATIC,
      objectLayer: OL_STATIC,
      position: [bounds.centerX, -0.125, bounds.centerX],
      friction: 5.0,
      restitution: 0.0,
    });
    const sphereBody = createSphereBody(this.world, spawn ? spawn.position : null);

    this.vehicle = new Vehicle();
    this.vehicle.rigidBody = sphereBody;
    this.vehicle.physicsWorld = this.world;

    if (spawn) {
      // 设置初始位置
      const [sx, sy, sz] = spawn.position;
      this.vehicle.spherePos.set(sx, sy, sz);
      this.vehicle.prevModelPos.set(sx, 0, sz);
      this.vehicle.container.rotation.y = spawn.angle;
    }
    //console.log('模型:', this.models);
    // vehicle.init
    const vehicleGroup = this.vehicle.init(this.models['vehicle-truck-yellow']);
    this.scene.add(vehicleGroup);

    this.directionalLight.target = vehicleGroup; // 灯光的目标为汽车模型
    // 创建相机
    this.camera.targetPosition.copy(this.vehicle.spherePos);

    // 控制器
    this.controls = new Controls({ dom: this.options.dom });

    // 粒子
    this.particles = new SmokeTrails(this.scene);

    this.audio = new GameAudio();
    this.audio.init(this.camera.camera);

    const _forward = new THREE.Vector3();
    let _this = this;
    this.contactListener = {
      onContactAdded(bodyA, bodyB) {
        if (bodyA !== sphereBody && bodyB !== sphereBody) return;

        //console.log('vehicle:', _this.vehicle);

        _forward.set(0, 0, 1).applyQuaternion(_this.vehicle.container.quaternion);
        _forward.y = 0;
        _forward.normalize();

        const impactVelocity = Math.abs(_this.vehicle.modelVelocity.dot(_forward));
        _this.audio.playImpact(impactVelocity);
      },
    };
    //console.log('particles:', THREE.HalfFloatType, this.scene);
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  animate() {
    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    const input = this.controls.update();

    updateWorld(this.world, this.contactListener, dt);

    this.vehicle.update(dt, input);
    this.directionalLight.position.set(
      this.vehicle.spherePos.x + 11.4,
      15,
      this.vehicle.spherePos.z - 5.3
    );

    this.camera.update(dt, this.vehicle.spherePos);
    this.particles.update(dt, this.vehicle);
    this.audio.update(dt, this.vehicle.linearSpeed, input.z, this.vehicle.driftIntensity);

    this.renderer.render(this.scene, this.camera.camera);
  }

  initThree() {
    this.renderer = initRenderer(this.options.dom);
    this.scene = initScene();
    this.directionalLight = initLights(this.scene);
    initWindowResize(this.renderer, this.camera);
  }
}

export default DriveCarApp;
