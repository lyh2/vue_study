import * as THREE from 'three';
import type { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import {
  createScene,
  createPerspectiveCamera,
  createRenderer,
  createPointLight,
  createPointerLockControls,
  windowResize,
  createLoadModel,
  addKeyDownUpListener,
} from './create-base-three';

type ShotGunOptions = {
  dom: HTMLElement;
  crosshair: HTMLElement;
};

type RunParams = {
  is_show_crosshair: {
    value: boolean;
  };
};

type BulletMesh = THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> & {
  direction: THREE.Vector3;
  distanceTraveled: number;
  trail: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  glow: THREE.Sprite;
  streak: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
};

type BulletHoleMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

// 子弹飞行轨迹线条
type TracerLine = THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> & {
  createdAt: number;
};

type ImpactFlash = THREE.Sprite & {
  createdAt: number;
};

export default class ShotGunApp {
  public options: ShotGunOptions;
  public tommyGun: THREE.Group | null = null;
  public abandonedBuilding: THREE.Group | null = null;
  public bulletHoles: BulletHoleMesh[] = [];
  public isFiring = false;
  public bulletCount = 0;

  public raycaster = new THREE.Raycaster();
  public mouse = new THREE.Vector2(0, 0);
  public bullets: BulletMesh[] = [];
  public tracers: TracerLine[] = [];
  public impactFlashes: ImpactFlash[] = [];

  public lastMeshAdditionTime = 0;
  public meshAdditionInterval = 100;

  public moveForward = false;
  public moveBackward = false;
  public moveLeft = false;
  public moveRight = false;

  public gravity = new THREE.Vector3(0, -0.01, 0);
  public maxGravityDistance = 2;

  public controls: PointerLockControls;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public tommyGunLight: THREE.PointLight;

  private moveSpeed = 0;
  private readonly acceleration = 0.003;
  private readonly maxSpeed = 0.1;
  private readonly gridHalfSize = 10;
  private readonly collisionMargin = 0.1;
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly bulletHoleTexture = this.textureLoader.load('./yuka/bulletHole.png');
  private readonly tracerLifetime = 90;
  private readonly impactFlashLifetime = 120;
  private audioContext: AudioContext | null = null;
  private machineGunSoundBuffer: AudioBuffer | null = null;
  private bulletRicochetSoundBuffer: AudioBuffer | null = null;
  private isLoadingMachineGunSound = false;
  private isLoadingRicochetSound = false;

  constructor(options: ShotGunOptions) {
    this.options = options;
    this.scene = createScene('Scene');
    this.camera = createPerspectiveCamera('Camera');
    this.renderer = createRenderer(this.options.dom);
    this.tommyGunLight = createPointLight(this.scene, '#9c3737', 100, 100, 'PointLight');
    this.controls = createPointerLockControls(this.camera, this.renderer.domElement);

    this.init();
  }

  init() {
    windowResize(this.renderer, this.camera);
    createLoadModel(this);
    addKeyDownUpListener(this);
    this.addMouseListeners(); // 监听鼠标事件
    this.addPointerLockReentryListener(); // 监听鼠标重新进入锁定状态
    this.updateRaycasterFromCrosshair();

    this.renderer.setAnimationLoop(() => {
      this.render();
    });
  }

  render() {
    this.updateMovement();
    this.updateGunPose();
    this.updateRaycaster();
    this.updateFiring();
    this.updateBullets();
    this.checkBulletCollision();
    this.faceBulletHolesToCamera();
    this.updateTracerEffects();
    this.renderer.render(this.scene, this.camera);
  }

  private updateMovement() {
    // 如果为未锁定状态，则不进行移动
    if (!this.controls.isLocked) {
      this.moveSpeed = 0;
      return;
    }
    // 判断是否进行了移动
    const hasMovementInput =
      this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;

    this.moveSpeed = hasMovementInput
      ? Math.min(this.moveSpeed + this.acceleration, this.maxSpeed)
      : 0;
    // 向前移动
    if (this.moveForward) {
      this.moveWithCollisionCheck('forward', this.moveSpeed);
    }

    if (this.moveBackward) {
      this.moveWithCollisionCheck('forward', -this.moveSpeed);
    }

    if (this.moveLeft) {
      this.moveWithCollisionCheck('right', -this.moveSpeed);
    }

    if (this.moveRight) {
      this.moveWithCollisionCheck('right', this.moveSpeed);
    }
  }

  private moveWithCollisionCheck(axis: 'forward' | 'right', distance: number) {
    // 得到相机的位置
    const previousPosition = this.camera.position.clone();

    if (axis === 'forward') {
      this.controls.moveForward(distance); // 控制前后
    } else {
      this.controls.moveRight(distance); // 控制左右
    }

    if (this.checkCollisions(this.camera.position)) {
      this.camera.position.copy(previousPosition);
    }
  }

  checkCollisions(position: THREE.Vector3) {
    return (
      position.x < -this.gridHalfSize + this.collisionMargin ||
      position.x > this.gridHalfSize - this.collisionMargin ||
      position.z < -this.gridHalfSize + this.collisionMargin ||
      position.z > this.gridHalfSize - this.collisionMargin
    );
  }
  /**
   * 把相机的位置和旋转应用到枪模型上，使其保持在相机前方并与相机方向一致
   * @returns
   */
  private updateGunPose() {
    if (!this.tommyGun) {
      return;
    }

    this.tommyGun.position.copy(this.camera.position);
    this.tommyGun.quaternion.copy(this.camera.quaternion);
    this.tommyGun.updateMatrix();
    this.tommyGun.translateZ(-0.05);
    this.tommyGun.translateY(-0.05);
    this.tommyGun.translateX(-0.025);
    this.tommyGun.rotateY(Math.PI / 2);
  }

  private updateRaycaster() {
    this.updateRaycasterFromCrosshair();
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  private updateFiring() {
    // 围在全屏状态下，或者未开火
    if (!this.isFiring || !this.controls.isLocked) {
      this.tommyGunLight.visible = false; // 隐藏开火的灯光
      return;
    }

    const currentTime = performance.now();
    if (currentTime - this.lastMeshAdditionTime < this.meshAdditionInterval) {
      return;
    }

    this.lastMeshAdditionTime = currentTime;

    const direction = this.raycaster.ray.direction.clone();

    const spawnPosition = this.getBulletSpawnPosition(); // 获取子弹生成的位置
    this.spawnTracer(spawnPosition, direction);
    this.createBullet(spawnPosition, direction);
    this.updateGunMuzzleFlash(spawnPosition);
  }
  /**
   * 获取子弹生成的位置
   * @returns
   */
  private getBulletSpawnPosition() {
    const spawnPosition = new THREE.Vector3();

    if (this.tommyGun) {
      let barrelLow: THREE.Object3D | null = null;

      this.tommyGun.traverse(object => {
        if (!barrelLow && object.name === 'barrel_low') {
          barrelLow = object;
        }
      });

      if (barrelLow) {
        barrelLow.getWorldPosition(spawnPosition);
        return spawnPosition;
      }
    }

    spawnPosition.copy(this.camera.position);
    spawnPosition.add(new THREE.Vector3(0, -0.05, 0));

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    spawnPosition.addScaledVector(forward, 0.4);

    return spawnPosition;
  }
  /**
   * 创建子弹
   * @param position 子弹产生的位置
   * @param direction 子弹飞翔的方向
   */
  private createBullet(position: THREE.Vector3, direction: THREE.Vector3) {
    this.playMachineGunSound(); // 开火音效

    const bulletGeometry = new THREE.SphereGeometry(1.0, 18, 18);
    const bulletMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff799,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial) as BulletMesh;

    bullet.position.copy(position);
    bullet.direction = direction.clone().normalize(); // 子弹飞行的方向
    bullet.distanceTraveled = 0;
    bullet.renderOrder = 999;

    // 给子弹添加灯光，实现发光特效
    const pointLight = new THREE.PointLight(0xffa43a, 30, 12);
    pointLight.position.copy(position);
    bullet.add(pointLight);
    // 子弹的尾迹
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0xff6a00,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });
    const trailGeometry = new THREE.BufferGeometry().setFromPoints([
      position.clone(),
      position.clone().addScaledVector(direction, -0.6),
    ]);
    const trail = new THREE.Line(trailGeometry, trailMaterial);
    trail.renderOrder = 998;
    bullet.trail = trail;

    const streakMaterial = new THREE.MeshBasicMaterial({
      color: 0x33ffcc,
      transparent: true,
      opacity: 0.92,
      depthTest: false,
    });
    const streakGeometry = new THREE.CylinderGeometry(0.018, 0.035, 1.2, 10);
    const streak = new THREE.Mesh(streakGeometry, streakMaterial);
    streak.renderOrder = 997;
    bullet.streak = streak;
    this.updateBulletStreak(bullet);

    const glowMaterial = new THREE.SpriteMaterial({
      color: 0xfff7b0,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.set(0.28, 0.28, 0.28);
    glow.renderOrder = 1000;
    bullet.glow = glow;
    bullet.add(glow);

    this.scene.add(bullet);
    this.scene.add(trail);
    this.scene.add(streak);
    this.bullets.push(bullet);
  }
  // 开火时，子弹飞行线条特效
  private spawnTracer(position: THREE.Vector3, direction: THREE.Vector3) {
    const tracerDistance = 6;
    const tracerRaycaster = new THREE.Raycaster(position, direction);
    const intersections = this.abandonedBuilding
      ? tracerRaycaster.intersectObject(this.abandonedBuilding, true)
      : [];
    const endPoint =
      intersections.length > 0
        ? intersections[0].point.clone()
        : position.clone().addScaledVector(direction, tracerDistance);

    const tracerMaterial = new THREE.LineBasicMaterial({
      color: 0xfff1a1,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });
    const tracerGeometry = new THREE.BufferGeometry().setFromPoints([position.clone(), endPoint]);
    const tracer = new THREE.Line(tracerGeometry, tracerMaterial) as TracerLine;
    tracer.createdAt = performance.now();
    tracer.renderOrder = 1200;

    this.scene.add(tracer);
    this.tracers.push(tracer);

    if (intersections.length > 0) {
      // 模拟子弹打在墙体上产生的效果
      this.spawnImpactFlash(intersections[0].point);
    }
  }
  /**
   * 模拟子弹打在墙体上的特效
   * @param position
   */
  private spawnImpactFlash(position: THREE.Vector3) {
    const flashMaterial = new THREE.SpriteMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 1,
      depthTest: false,
    });
    const flash = new THREE.Sprite(flashMaterial) as ImpactFlash;
    flash.position.copy(position);
    flash.scale.set(0.22, 0.22, 0.22);
    flash.createdAt = performance.now();
    flash.renderOrder = 1201;

    this.scene.add(flash);
    this.impactFlashes.push(flash);
  }

  private updateTracerEffects() {
    const now = performance.now();

    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const tracer = this.tracers[i];
      const progress = (now - tracer.createdAt) / this.tracerLifetime;

      if (progress >= 1) {
        this.scene.remove(tracer);
        this.tracers.splice(i, 1);
        continue;
      }

      tracer.material.opacity = 1 - progress;
    }

    for (let i = this.impactFlashes.length - 1; i >= 0; i -= 1) {
      const flash = this.impactFlashes[i];
      const progress = (now - flash.createdAt) / this.impactFlashLifetime;

      if (progress >= 1) {
        this.scene.remove(flash);
        this.impactFlashes.splice(i, 1);
        continue;
      }

      flash.material.opacity = 1 - progress;
      flash.scale.setScalar(0.22 + progress * 0.18);
    }
  }

  private updateBulletStreak(bullet: BulletMesh) {
    const streakOffset = 0.45;
    const streakPosition = bullet.position.clone().addScaledVector(bullet.direction, -streakOffset);
    bullet.streak.position.copy(streakPosition);
    bullet.streak.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      bullet.direction.clone().normalize()
    );
  }

  private checkBulletCollision() {
    if (!this.abandonedBuilding) {
      return;
    }

    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      const bulletRaycaster = new THREE.Raycaster(bullet.position, bullet.direction);
      const intersects = bulletRaycaster.intersectObject(this.abandonedBuilding, true);

      if (intersects.length === 0) {
        continue;
      }

      const intersect = intersects[0];
      if (this.bulletCount % 15 === 0) {
        this.playBulletRicochetSound();
      }
      this.bulletCount += 1;
      this.createBulletHole(intersect.point);
      this.scene.remove(bullet);
      this.scene.remove(bullet.trail);
      this.scene.remove(bullet.streak);
      this.bullets.splice(i, 1);
    }
  }

  private createBulletHole(point: THREE.Vector3) {
    const material = new THREE.MeshBasicMaterial({
      map: this.bulletHoleTexture,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: true,
    });
    const geometry = new THREE.PlaneGeometry(0.08, 0.08);
    const bulletHoleMesh = new THREE.Mesh(geometry, material) as BulletHoleMesh;

    const offset = new THREE.Vector3(0, 0, 0.01);
    const insertionOffset = new THREE.Vector3(0, 0.01, 0);
    const insertionPoint = new THREE.Vector3().copy(point).add(offset).add(insertionOffset);

    bulletHoleMesh.position.copy(insertionPoint);
    this.scene.add(bulletHoleMesh);
    this.bulletHoles.push(bulletHoleMesh);

    this.fadeOutBulletHole(bulletHoleMesh);
  }

  private fadeOutBulletHole(bulletHoleMesh: BulletHoleMesh) {
    let opacity = 1;
    const fadeOutDuration = 5000;
    const fadeOutInterval = 50;

    const fadeOutTimer = window.setInterval(() => {
      opacity -= fadeOutInterval / fadeOutDuration;

      if (opacity <= 0) {
        opacity = 0;
        window.clearInterval(fadeOutTimer);
        this.scene.remove(bulletHoleMesh);
        this.bulletHoles = this.bulletHoles.filter(item => item !== bulletHoleMesh);
      }

      bulletHoleMesh.material.opacity = opacity;
    }, fadeOutInterval);
  }

  private faceBulletHolesToCamera() {
    this.bulletHoles.forEach(bulletHole => {
      const direction = this.camera.position.clone().sub(bulletHole.position).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction
      );

      bulletHole.setRotationFromQuaternion(quaternion);
    });
  }

  private updateGunMuzzleFlash(position: THREE.Vector3) {
    this.tommyGunLight.visible = !this.tommyGunLight.visible;
    this.tommyGunLight.position.copy(this.camera.position);
  }
  /**
   * 添加鼠标点击、键盘按下事件
   */
  private addMouseListeners() {
    window.addEventListener('mousedown', this.onMouseDown, false);
    window.addEventListener('mouseup', this.onMouseUp, false);
    window.addEventListener('mousemove', this.onMouseMove, false);
    window.addEventListener('keydown', this.onActionKeyDown, false);
    window.addEventListener('keyup', this.onActionKeyUp, false);
  }

  private addPointerLockReentryListener() {
    this.renderer.domElement.addEventListener('click', this.onCanvasClick, false);
  }

  private onMouseDown = (event: MouseEvent) => {
    if (this.controls.isLocked && event.button === 0) {
      this.isFiring = true;
    }
  };

  private onMouseUp = (event: MouseEvent) => {
    if (event.button === 0) {
      this.tommyGunLight.visible = false;
      this.isFiring = false;
    }
  };

  private onMouseMove = (event: MouseEvent) => {
    event.preventDefault();
    this.updateRaycasterFromCrosshair();
  };
  /**
   * 监听鼠标点击画布以重新进入锁定状态
   */
  private onCanvasClick = () => {
    if (!this.controls.isLocked) {
      this.controls.lock();
    }
  };

  private onActionKeyDown = (event: KeyboardEvent) => {
    if (!this.controls.isLocked) {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();
      this.isFiring = true;
    }
  };

  private onActionKeyUp = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault();
      this.tommyGunLight.visible = false;
      this.isFiring = false;
    }
  };
  /**
   *
   * @returns
   */
  private updateRaycasterFromCrosshair() {
    // 获取crosshair HTMLElement 对象
    const imageElement = this.options.crosshair;
    if (!imageElement) {
      this.mouse.set(0, 0);
      return;
    }

    const imageRect = imageElement.getBoundingClientRect(); // 获取矩形大小
    const imageCenterX = imageRect.left + imageRect.width / 2;
    const imageCenterY = imageRect.top + imageRect.height / 2;
    // 得到瞄准点的标准化坐标数据
    this.mouse.x = (imageCenterX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(imageCenterY / window.innerHeight) * 2 + 1;
  }

  private getAudioContext() {
    if (!this.audioContext) {
      const AudioContextConstructor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      this.audioContext = new AudioContextConstructor();
    }

    return this.audioContext;
  }
  /**
   * 加载音频文件
   * @param url
   * @param onLoad
   */
  private loadAudioFile(url: string, onLoad: (buffer: AudioBuffer) => void) {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onload = () => {
      this.getAudioContext().decodeAudioData(request.response, buffer => {
        onLoad(buffer);
      });
    };

    request.send();
  }
  /**
   * 播放音频
   * @param buffer -音频数据
   * @param volume - 音量大小
   */
  private playSound(buffer: AudioBuffer, volume: number) {
    const audioContext = this.getAudioContext(); // 得到音频上下文对象
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.buffer = buffer;
    gainNode.gain.value = volume;
    source.start();
  }
  /**
   * 播放开火声音
   * @returns
   */
  private playMachineGunSound() {
    if (this.machineGunSoundBuffer) {
      this.playSound(this.machineGunSoundBuffer, 1);
      return;
    }

    if (this.isLoadingMachineGunSound) {
      return;
    }
    // 加载音频文件
    this.isLoadingMachineGunSound = true;
    this.loadAudioFile('./yuka-dive/audios/shotgun_shot.ogg', buffer => {
      this.machineGunSoundBuffer = buffer;
      this.isLoadingMachineGunSound = false;
      this.playSound(buffer, 1);
    });
  }

  private playBulletRicochetSound() {
    if (this.bulletRicochetSoundBuffer) {
      this.playSound(this.bulletRicochetSoundBuffer, 1);
      return;
    }

    if (this.isLoadingRicochetSound) {
      return;
    }

    this.isLoadingRicochetSound = true;
    this.loadAudioFile('./yuka-dive/audios/impact1.ogg', buffer => {
      this.bulletRicochetSoundBuffer = buffer;
      this.isLoadingRicochetSound = false;
      this.playSound(buffer, 1);
    });
  }

  updateBullets() {
    const maxDistance = 5;

    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      bullet.position.addScaledVector(bullet.direction, 0.32);
      bullet.distanceTraveled += 0.22;
      const trailPoints = [
        bullet.position.clone(),
        bullet.position.clone().addScaledVector(bullet.direction, -1.4),
      ];
      bullet.trail.geometry.setFromPoints(trailPoints);
      bullet.glow.scale.setScalar(0.28 + Math.random() * 0.06);
      this.updateBulletStreak(bullet);

      if (bullet.distanceTraveled > maxDistance) {
        this.scene.remove(bullet);
        this.scene.remove(bullet.trail);
        this.scene.remove(bullet.streak);
        this.bullets.splice(i, 1);
      }
    }
  }

  run(params: RunParams) {
    this.controls.lock();

    this.controls.addEventListener('lock', () => {
      params.is_show_crosshair.value = true;
    });

    this.controls.addEventListener('unlock', () => {
      params.is_show_crosshair.value = false;
      this.tommyGunLight.visible = false;
      this.isFiring = false;
    });
  }
}
