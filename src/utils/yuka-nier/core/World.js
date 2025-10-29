import * as THREE from 'three';
import * as YUKA from 'yuka';

import AssetManager from '@/utils/yuka-nier/core/AssetManager';
import PursuerGeometry from '../etc/PursuerGeometry';
import {
  _button_click_,
  _core_explode_,
  _core_shield_destroyed_,
  _core_shield_hit_,
  _enemy_explode_,
  _enemy_hit_,
  _enemy_shot_,
  _player_explode_,
  _player_hit_,
  _player_shot_,
} from '../etc/constant';
import VehicleControls from './VehicleControls';
import { AnimationSystem } from './AnimationSystem';
import Guard from '../entities/Guard';
import Pursuer from '../entities/Pursuer';
import StageManager from './StageManager';
import { ProtectionShaderStr, HitShaderStr } from '../etc/Shaders';
import Player from '../entities/Player';
const toVector = new YUKA.Vector3();
const displacement = new YUKA.Vector3();

export default class World {
  constructor(options) {
    this.options = options;
    this.active = false;
    this.gameOver = false;
    this.entityManager = new YUKA.EntityManager();

    this.time = new YUKA.Time();

    //console.log(this.options)
    this.currentStage = 1; // 当前选中的场景
    this.maxStage = 14; // 场景个数
    this.field = new YUKA.Vector3(15, 1, 15);
    this.fieldMesh = null;
    //----------玩家------------------
    this.playerMesh = null;
    this.playerProjectiles = []; // 子弹数组
    this.playerProjectileMesh = null;

    this.enemyProjectileMesh = null;
    this.enemyDestructibleProjectiles = [];
    this.enemyDestructibleProjectileMesh = null;
    this.enemyProjectiles = [];
    //-----障碍物-----------
    this.obstacleMesh = null; // 障碍物
    this.obstacles = [];
    //-------追击者敌人----------
    this.pursuerMesh = null; // 追击者
    this.pursuers = [];
    // ---------防御塔--------------
    this.towerMesh = null; //塔敌人
    this.towers = [];
    //-------守卫敌人--------------
    this.guardMesh = null; // 守卫
    this.guards = [];
    this.guardsProjected = false;
    this.protectionMesh = null; // 保护者
    this.hitMesh = null;
    this.assetManager = new AssetManager();
    this.animationSystem = new AnimationSystem();
    this.stageManager = new StageManager(this);
    this._onStartAnimation = onStartAnimation.bind(this);
    this._onStopAnimation = onStopAnimation.bind(this);
    this._onContinueButtonClick = onContinueButtonClick.bind(this);
    this._onRestart = onRestart.bind(this);
    this.init();
  }

  init() {
    this.assetManager.init().then(res => {
      console.log('加载完毕:...', res);
      // 创建场景
      this._initScene();

      this._initBackground();
      this._initPlayer();
      this._initControls();

      this._loadStage(this.currentStage);
      // 资源加载完毕创建场景
      if (typeof this.options.onReady === 'function') {
        this.options.onReady();
      }
    });
  }

  update() {
    const delta = this.time.update().getDelta();

    if (this.active) {
      this.animationSystem.update(delta);
      this.controls.update(delta);
      this.entityManager.update(delta);

      this._enforceNonPenetrationConstraint();

      this._checkPlayerCollision(); // 玩家与其他对象的碰撞检查
      this._checkPlayerProjectileCollisions(); // 玩家与子弹之间的碰撞检查
      this._checkEnemyProjectileCollisions();
      this._checkGameStatus();

      this._updateObstaclesMeshes();
      this._updateProjectileMeshes();
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateField(x, y, z) {
    this.field.set(x, y, z);
    this.fieldMesh.geometry.dispose();
    this.fieldMesh.geometry = new THREE.BoxGeometry(x, y, z);
  }

  _initScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    this.camera.add(this.assetManager.listener);

    // 创建灯光
    const ambientLight = new THREE.AmbientLight(0xccc, 0.4);
    ambientLight.matrixAutoUpdate = true;
    this.scene.add(ambientLight);

    // 创建平行光
    const directionalLight = new THREE.DirectionalLight(0xfff, 0.6);
    directionalLight.position.set(1, 10, -1);
    directionalLight.updateMatrix();
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.mapSize.x = 2048;
    directionalLight.shadow.mapSize.y = 2048;
    directionalLight.shadow.bias = 0.01;
    this.scene.add(directionalLight);

    // 阴影相机可视组件
    this.scene.add(new THREE.CameraHelper(directionalLight.shadow.camera));

    // 创建网格几何体
    const fieldGeometry = new THREE.BoxGeometry(this.field.x, this.field.y, this.field.z);
    const fieldMaterial = new THREE.MeshLambertMaterial({ color: 0xaca181 });
    this.fieldMesh = new THREE.Mesh(fieldGeometry, fieldMaterial);
    this.fieldMesh.matrixAutoUpdate = false;
    this.fieldMesh.position.set(0, -0.5, 0);
    this.fieldMesh.updateMatrix();
    this.fieldMesh.receiveShadow = true;
    this.scene.add(this.fieldMesh);

    // 创建玩家
    const playerGeometry = new THREE.ConeGeometry(0.2, 1, 8);
    playerGeometry.rotateX(Math.PI * 0.5);
    const playerMaterial = new THREE.MeshLambertMaterial({ color: 0xdedad3 });
    this.playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    this.playerMesh.matrixAutoUpdate = false;
    this.playerMesh.castShadow = true;
    this.scene.add(this.playerMesh);

    // 玩家子弹
    const playerProjectileGeometry = new THREE.PlaneGeometry(0.2, 1);
    playerProjectileGeometry.rotateX(Math.PI * -0.5);
    const playerProjectileMaterial = new THREE.MeshBasicMaterial({ color: 0xfff9c2 });

    this.playerProjectileMesh = new THREE.InstancedMesh(
      playerProjectileGeometry,
      playerProjectileMaterial
    );
    this.playerProjectileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.playerProjectileMesh.frustumCulled = false;
    this.scene.add(this.playerProjectileMesh);

    // 敌人发射的子弹
    const enemyProjectileGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const enemyProjectileMaterial = new THREE.MeshLambertMaterial({
      color: 0x43254d,
    });
    this.enemyProjectileMesh = new THREE.InstancedMesh(
      enemyProjectileGeometry,
      enemyProjectileMaterial
    );
    this.enemyProjectileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.enemyProjectileMesh.frustumCulled = false;
    this.scene.add(this.enemyProjectileMesh);

    // enemy destructible projectile

    const enemyDestructibleProjectileGeometry = new THREE.OctahedronGeometry(0.4, 0);
    const enemyDestructibleProjectileMaterial = new THREE.MeshLambertMaterial({ color: 0xf34d08 });
    this.enemyDestructibleProjectileMesh = new THREE.InstancedMesh(
      enemyDestructibleProjectileGeometry,
      enemyDestructibleProjectileMaterial
    );
    this.enemyDestructibleProjectileMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.enemyDestructibleProjectileMesh.frustumCulled = false;
    this.scene.add(this.enemyDestructibleProjectileMesh);

    // obstacle 障碍物
    const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
    const obstacleMaterial = new THREE.MeshLambertMaterial({ color: 0xdedad3 });
    this.obstacleMesh = new THREE.InstancedMesh(obstacleGeometry, obstacleMaterial);
    this.obstacleMesh.frustumCulled = false;
    this.obstacleMesh.castShadow = true;
    this.scene.add(this.obstacleMesh);

    // pursuer enemy 追击的敌人
    const pursuerGeometry = new PursuerGeometry();
    const pursuerMaterial = new THREE.MeshLambertMaterial({ color: 0x333132 });
    this.pursuerMesh = new THREE.Mesh(pursuerGeometry, pursuerMaterial);
    this.pursuerMesh.castShadow = true;

    //tower enemy 塔敌人
    const towerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    const towerMaterial = new THREE.MeshLambertMaterial({
      color: 0x333132,
    });
    this.towerMesh = new THREE.Mesh(towerGeometry, towerMaterial);
    this.towerMesh.matrixAutoUpdate = false;
    this.towerMesh.castShadow = true;

    // guard enemy 守护敌人
    const guardGeometry = new THREE.CapsuleGeometry(0.4, 1, 4, 4);
    const guardMaterial = new THREE.MeshLambertMaterial({ color: 0x3555 });
    this.guardMesh = new THREE.Mesh(guardGeometry, guardMaterial);
    this.guardMesh.matrixAutoUpdate = false;
    this.guardMesh.castShadow = true;

    //projection 保护者
    const protectionGeometry = new THREE.DodecahedronGeometry(0.4);
    const protectionMaterial = new THREE.ShaderMaterial(ProtectionShaderStr);
    protectionMaterial.transparent = true;

    this.protectionMesh = new THREE.Mesh(protectionGeometry, protectionMaterial);
    this.protectionMesh.matrixAutoUpdate = true;
    this.protectionMesh.visible = false;

    //
    const hitGeometry = new THREE.PlaneGeometry(2.5, 2.5);
    const hitMaterial = new THREE.ShaderMaterial(HitShaderStr);
    hitMaterial.transparent = true;
    this.hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
    this.hitMesh.matrixAutoUpdate = false;
    this.hitMesh.visible = false;

    // renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.options.dom.appendChild(this.renderer.domElement);
    window.addEventListener('resize', this._onWindowResize.bind(this), false);
  }

  _initBackground() {
    this.scene.background = new THREE.Color(0x6d685d);
    const count = 25;
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0xaca181 });
    const backgroundObjects = new THREE.InstancedMesh(geometry, material, count);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.x = THREE.MathUtils.randFloat(-75, 75);
      dummy.position.y = THREE.MathUtils.randFloat(-75, -50);
      dummy.position.z = THREE.MathUtils.randFloat(-75, 75);

      dummy.scale.set(1, 1, 1).multiplyScalar(Math.random());
      dummy.updateMatrix();

      backgroundObjects.setMatrixAt(i, dummy.matrix);
    }
    this.scene.add(backgroundObjects);
  }

  _initPlayer() {
    this.player = new Player(this);
    this.player.setRenderComponent(this.playerMesh, this._sync.bind(this));

    // 创建粒子系统
    this.scene.add(this.player.particleSystem._points);
    // 设置音频
    const playerShot = this.assetManager.audioMaps.get(_player_shot_);
    const playerHit = this.assetManager.audioMaps.get(_player_hit_);
    const playerExplode = this.assetManager.audioMaps.get(_player_explode_);

    this.player.audioMaps.set(_player_shot_, playerShot);
    this.player.audioMaps.set(_player_hit_, playerHit);
    this.player.audioMaps.set(_player_explode_, playerExplode);

    this.entityManager.add(this.player);
  }

  _initControls() {
    this.controls = new VehicleControls(this.player, this.camera);
    this.controls.setPosition(0, 0, 0);

    this.controls.addEventListener('lock', () => {
      this.time.reset();
      this._onStartAnimation();
    });

    this.controls.addEventListener('unlock', () => {
      if (this.gameOver === false) {
        //
        this._onStopAnimation();
      }
    });
  }

  _loadStage(id) {
    this._clearStage();
    // 更新UI菜单
    //
    this.stageManager.load(id);
    this.active = true;
  }

  _clearStage() {
    const guards = this.guards;
    const pursuers = this.pursuers;
    const towers = this.towers;
    const obstacles = this.obstacles;
    const enemyProjectiles = this.enemyProjectiles;
    const enemyDestructibleProjectiles = this.enemyDestructibleProjectiles;
    const playerProjectiles = this.playerProjectiles;

    this.guardsProjected = false;

    for (let i = guards.length - 1; i >= 0; i--) {
      this.removeGuard(guards[i]); // 移除一个守卫
    }
    for (let i = pursuers.length - 1; i >= 0; i--) {
      // 移除一个追击者
      this.removePursuer(pursuers[i]);
    }
    // 移除塔
    for (let i = towers.length - 1; i >= 0; i--) {
      this.removeTower(towers[i]);
    }
    // 移除障碍物
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.removeObstacle(obstacles[i]);
    }

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(enemyProjectiles[i]);
    }

    for (let i = enemyDestructibleProjectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(enemyDestructibleProjectiles[i]);
    }

    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
      this.removeProjectile(playerProjectiles[i]);
    }

    this._updateObstaclesMeshes(true);
    this.player.particleSystem.clear();
  }

  _updateObstaclesMeshes(force) {
    let needsUpdate = force || false;

    const obstacleCount = this.obstacles.length;

    for (let i = 0; i < obstacleCount; i++) {
      const obstacle = this.obstacles[i];
      if (obstacle.needsUpdate === true) {
        obstacle.updateBoundingVolumes();
        this.obstacleMesh.setMatrixAt(i, obstacle.worldMatrix);
        obstacle.needsUpdate = false;
        needsUpdate = true;
      }
    }

    if (needsUpdate === true) {
      this.obstacleMesh.count = obstacleCount;
      this.obstacleMesh.instanceMatrix.needsUpdate = true;
    }
  }
  /**
   * 创建警卫
   * @returns
   */
  _createGuard() {
    const guard = new Guard(this); // 警卫守卫
    const guardMesh = this.guardMesh.clone();
    const protectionMesh = this.protectionMesh.clone();
    protectionMesh.material = this.protectionMesh.material.clone(); // cloning a mesh does not clone its material (but we need unique uniforms!)
    const hitMesh = this.hitMesh.clone();
    hitMesh.material = this.hitMesh.material.clone();

    guardMesh.add(protectionMesh);
    guardMesh.add(hitMesh);
    this.scene.add(hitMesh);
    guard.setRenderComponent(guardMesh, this._sync.bind(this));
    guard.protectionMesh = protectionMesh;
    guard.hitMesh = hitMesh;

    const enemyShot = this.assetManager.cloneAudio(_enemy_shot_);
    const enemyHit = this.assetManager.cloneAudio(_enemy_hit_);
    const coreExplode = this.assetManager.cloneAudio(_core_explode_);
    const coreShieldHit = this.assetManager.cloneAudio(_core_shield_hit_);
    const coreShieldDestroyed = this.assetManager.cloneAudio(_core_shield_destroyed_);

    guardMesh.add(enemyShot);
    guardMesh.add(enemyHit);
    guardMesh.add(coreExplode);
    guardMesh.add(coreShieldHit);
    guardMesh.add(coreShieldDestroyed);

    guard.audioMaps.set(_enemy_shot_, enemyShot);
    guard.audioMaps.set(_enemy_hit_, enemyHit);
    guard.audioMaps.set(_core_explode_, coreExplode);
    guard.audioMaps.set(_core_shield_hit_, coreShieldHit);
    guard.audioMaps.set(_core_shield_destroyed_, coreShieldDestroyed);

    return guard;
  }
  addGuard(guard) {
    this.guards.push(guard);
    this.entityManager.add(guard);

    this.scene.add(guard._renderComponent);
  }
  _createPursuer() {
    const pursuer = new Pursuer(this);
    const pursuerMesh = this.pursuerMesh.clone();
    pursuer.setRenderComponent(pursuerMesh, this._sync.bind(this));

    const enemyShot = this.assetManager.cloneAudio(_enemy_shot_);
    const enemyExplode = this.assetManager.cloneAudio(_enemy_explode_);

    pursuer.audioMaps.set(_enemy_shot_, enemyShot);
    pursuer.audioMaps.set(_enemy_explode_, enemyExplode);
    pursuerMesh.add(enemyShot); // 添加音频
    pursuerMesh.add(enemyExplode);
    return pursuer;
  }
  addPursuer(pursuer) {
    this.pursuers.push(pursuer);
    this.entityManager.add(pursuer);
    this.scene.add(pursuer._renderComponent);
  }
  addObstacle(obstacle) {
    this.obstacles.push(obstacle);
    this.entityManager.add(obstacle);
  }
  addTower(tower) {
    this.towers.push(tower);
    this.entityManager.add(tower);
    this.scene.add(tower._renderComponent);
  }
  /**
   * 添加子弹
   * @param {*} projectile
   */
  addProjectile(projectile) {
    if (projectile.isPlayerProjectile) {
      this.playerProjectiles.push(projectile);
    } else {
      if (projectile.isDestructible) {
        this.enemyDestructibleProjectiles.push(projectile);
      } else {
        this.enemyProjectiles.push(projectile);
      }
    }
    this.entityManager.add(projectile);
  }
  removeProjectile(projectile) {
    if (projectile.isPlayerProjectile) {
      const index = this.playerProjectiles.indexOf(projectile);
      this.playerProjectiles.splice(index, 1);
    } else {
      if (projectile.isDestructible) {
        const index = this.enemyDestructibleProjectiles.indexOf(projectile);
        this.enemyDestructibleProjectiles.splice(index, 1);
      } else {
        const index = this.enemyProjectiles.indexOf(projectile);
        this.enemyProjectiles.splice(index, 1);
      }
    }

    this.entityManager.remove(projectile);
  }
  playAudio(audio) {
    if (audio.isPlaying === true) audio.stop();
    audio.play();
  }
  removeObstacle(obstacle) {
    const index = this.obstacles.indexOf(obstacle);
    this.obstacles.splice(index, 1);

    this._removeFromYukaThree(obstacle);
  }
  removeTower(tower) {
    const index = this.towers.indexOf(tower);
    this.towers.splice(index, 1);

    this._removeFromYukaThree(tower);
  }

  removePursuer(pursuer) {
    const index = this.pursuers.indexOf(pursuer);
    this.pursuers.splice(index, 1);
    this._removeFromYukaThree(pursuer);
  }

  removeGuard(guard) {
    const index = this.guards.indexOf(guard);
    this.guards.splice(index, 1);
    //
    this._removeFromYukaThree(guard);
  }
  _removeFromYukaThree(entity) {
    this.entityManager.remove(entity);
    entity._renderComponent.geometry.dispose();
    entity._renderComponent.material.dispose();
    if (entity._renderComponent) this.scene.remove(entity._renderComponent);
  }

  _checkGameStatus() {
    const player = this.player;
    const guards = this.guards;
    const pursuers = this.pursuers;
    const towers = this.towers;

    if (player.healthPoints === 0) {
      this.active = false;
      this.gameOver = true;
      // 显示UI
      this.controls.exit();
    } else {
      if (this.guardsProjected === true && pursuers.length === 0 && towers.length === 0) {
        this.guardsProjected = false;

        for (let i = 0; i < guards.length; i++) {
          guards[i].disableProtection();
        }
      }
      // all guards have been destroyed
      if (guards.length === 0) {
        this.currentStage++;
        this.active = false;
        this.player.heal();

        if (this.currentStage > this.maxStage) {
          // game completed
          this.gameOver = true;
          this.controls.exit();
          // 显示UI完毕信息
        } else {
          // load next stage
          this._loadStage(this.currentStage);
        }
      }
    }
  }
  _checkEnemyProjectileCollisions() {
    const enemyProjectiles = this.enemyProjectiles;
    const enemyDestructibleProjectiles = this.enemyDestructibleProjectiles;

    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      this._checkEnemyProjectileCollision(enemyProjectiles[i]);
    }

    for (let i = enemyDestructibleProjectiles.length - 1; i >= 0; i--) {
      this._checkEnemyProjectileCollision(enemyDestructibleProjectiles[i]);
    }
  }

  _checkEnemyProjectileCollision(projectile) {
    const obstacles = this.obstacles;
    const player = this.player;
    const playerProjectiles = this.playerProjectiles;

    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      const squaredDistance = projectile.position.squaredDistanceTo(obstacle.position);
      const range = projectile.boundingRadius + obstacle.boundingRadius;
      if (squaredDistance <= range * range) {
        if (obstacle.obb.intersectsBoundingSphere(projectile.boundingSphere) === true) {
          this.removeProjectile(projectile);
          return;
        }
      }
    }

    if (projectile.isDestructible === true) {
      for (let i = playerProjectiles.length; i >= 0; i--) {
        const playerProjectile = playerProjectiles[i];
        const squaredDistance = projectile.position.squaredDistanceTo(playerProjectile.position);
        const range = projectile.boundingRadius + playerProjectile.boundingRadius;
        if (squaredDistance <= range * range) {
          if (playerProjectile.obb.intersectsBoundingSphere(projectile.boundingSphere) === true) {
            this.removeProjectile(projectile);
            this.removeProjectile(playerProjectile);
            return;
          }
        }
      }
    }

    // perform intersection test with player
    const squaredDistance = projectile.position.squaredDistanceTo(player.position);
    const range = projectile.boundingRadius + player.boundingRadius;
    if (squaredDistance <= range * range) {
      projectile.sendMessage(player, 'hit');
      this.removeProjectile(projectile);
      return;
    }
  }
  _checkPlayerProjectileCollisions() {
    const playerProjectiles = this.playerProjectiles;
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
      this._checkPlayerProjectileCollision(playerProjectiles[i]);
    }
  }

  _checkPlayerProjectileCollision(playerProjectile) {
    const guards = this.guards;
    const pursuers = this.pursuers;
    const towers = this.towers;
    const obstacles = this.obstacles;
    // enemy

    // guards
    for (let i = 0; i < guards.length; i++) {
      const guard = guards[i];
      const squaredDistance = playerProjectile.position.squaredDistanceTo(guard.position);
      const range = playerProjectile.boundingRadius + guard.boundingRadius;
      if (squaredDistance <= range * range) {
        if (playerProjectile.obb.intersectsBoundingSphere(guard.boundingSphere) === true) {
          playerProjectile.sendMessage(guard, 'hit');
          this.removeProjectile(playerProjectile);
          return;
        }
      }
    }

    // pursuers
    for (let i = 0; i < pursuers.length; i++) {
      const pursuer = pursuers[i];
      const squaredDistance = playerProjectile.position.squaredDistanceTo(pursuer.position);
      const range = playerProjectile.boundingRadius + pursuer.boundingRadius;
      if (squaredDistance <= range * range) {
        if (playerProjectile.obb.intersectsBoundingSphere(pursuer.boundingSphere) === true) {
          playerProjectile.sendMessage(pursuer, 'hit');
          this.removeProjectile(playerProjectile);
          return;
        }
      }
    }

    // tower
    for (let i = 0; i < towers.length; i++) {
      const tower = towers[i];
      const squaredDistance = playerProjectile.position.squaredDistanceTo(tower.position);
      const range = playerProjectile.boundingRadius + tower.boundingRadius;
      if (squaredDistance <= range * range) {
        if (playerProjectile.obb.intersectsBoundingSphere(tower.boundingSphere) === true) {
          playerProjectile.sendMessage(tower, 'hit');
          this.removeProjectile(playerProjectile);
          return;
        }
      }
    }

    // obstacles
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      const squaredDistance = playerProjectile.position.squaredDistanceTo(obstacle.position);
      const range = playerProjectile.boundingRadius + obstacle.boundingRadius;

      if (squaredDistance <= range * range) {
        if (playerProjectile.obb.intersectsOBB(obstacle.obb) === true) {
          this.removeProjectile(playerProjectile);
          return;
        }
      }
    }
  }
  _updateProjectileMeshes() {
    const playerProjectileCount = this.playerProjectiles.length;
    for (let i = 0; i < playerProjectileCount; i++) {
      const projectile = this.playerProjectiles[i];
      this.playerProjectileMesh.setMatrixAt(i, projectile.worldMatrix);
    }

    this.playerProjectileMesh.count = playerProjectileCount;
    this.playerProjectileMesh.instanceMatrix.needsUpdate = true;

    const enemyProjectileCount = this.enemyProjectiles.length;
    for (let i = 0; i < enemyProjectileCount; i++) {
      const projectile = this.enemyProjectiles[i];
      this.enemyProjectileMesh.setMatrixAt(i, projectile.worldMatrix);
    }

    this.enemyProjectileMesh.count = enemyProjectileCount;
    this.enemyProjectileMesh.instanceMatrix.needsUpdate = true;

    const enemyDestructibleProjectileCount = this.enemyDestructibleProjectiles.length;
    for (let i = 0; i < enemyDestructibleProjectileCount; i++) {
      const projectile = this.enemyDestructibleProjectiles[i];
      this.enemyDestructibleProjectileMesh.setMatrixAt(i, projectile.worldMatrix);
    }

    this.enemyDestructibleProjectileMesh.count = enemyDestructibleProjectileCount;
    this.enemyDestructibleProjectileMesh.instanceMatrix.needsUpdate = true;
  }
  /**
   * 检查用户碰撞
   */
  _checkPlayerCollision() {
    const player = this.player;
    const guards = this.guards;
    const pursuers = this.pursuers;
    const towers = this.towers;

    // perform intersection test with guards // 与警卫进行交叉测试
    for (let i = 0; i < guards.length; i++) {
      const guard = guards[i];
      const squaredDistance = player.position.squaredDistanceTo(guard.position);
      const range = player.boundingRadius + guard.boundingRadius;
      if (squaredDistance <= range * range) {
        if (player.obb.intersectsBoundingSphere(guard.boundingSphere) === true) {
          // dead
          player.healthPoints = 0;
          const audio = player.audioMaps.get(_player_explode_);
          this.playAudio(audio);
          return;
        }
      }
    }
    // perform intersection test with pursuers // 与追踪者进行交叉测试
    for (let i = 0; i < pursuers.length; i++) {
      const pursuer = pursuers[i];
      const squaredDistance = player.position.squaredDistanceTo(pursuer.position);
      const range = player.boundingRadius + pursuer.boundingRadius;

      if (squaredDistance <= range * range) {
        if (player.obb.intersectsBoundingSphere(pursuer.boundingSphere) === true) {
          // dead
          player.healthPoints = 0;
          const audio = player.audioMaps.get(_player_explode_);
          this.playAudio(audio);
          return;
        }
      }
    }
    // perform intersection test with towers //与塔进行相交测试
    for (let i = 0; i < towers.length; i++) {
      const tower = towers[i];
      const squaredDistance = player.position.squaredDistanceTo(tower.position);
      const range = player.boundingRadius + tower.boundingRadius;

      if (squaredDistance <= range * range) {
        if (player.obb.intersectsBoundingSphere(tower.boundingSphere) === true) {
          // dead
          player.healthPoints = 0;
          const audio = player.audioMaps.get(_player_explode_);
          this.playAudio(audio);
          return;
        }
      }
    }
  }
  _enforceNonPenetrationConstraint() {
    const guards = this.guards;
    const pursuers = this.pursuers;
    const towers = this.towers;
    const obstacles = this.obstacles;

    // guards
    for (let i = 0; i < guards.length; i++) {
      const guard = guards[i];
      for (let j = 0; j < guards.length; j++) {
        const entity = guards[j];
        if (guard !== entity) {
          this._checkOverlappingEntities(guard, entity);
        }
      }

      for (let j = 0; j < pursuers.length; j++) {
        this._checkOverlappingEntities(guard, pursuers[j]);
      }

      for (let j = 0; j < towers.length; j++) {
        this._checkOverlappingEntities(guard, towers[j]);
      }

      for (let j = 0; j < obstacles.length; j++) {
        this._checkOverlappingEntities(guard, obstacles[j]);
      }
    }

    // pursuer
    for (let i = 0; i < pursuers.length; i++) {
      const pursuer = pursuers[i];
      for (let j = 0; j < guards.length; j++) {
        const entity = guards[j];
        this._checkOverlappingEntities(pursuer, entity);
      }

      for (let j = 0; j < pursuers.length; j++) {
        const entity = pursuers[j];
        if (pursuer !== entity) {
          this._checkOverlappingEntities(pursuer, entity);
        }
      }

      for (let j = 0; j < towers.length; j++) {
        this._checkOverlappingEntities(pursuer, towers[j]);
      }

      for (let j = 0; j < obstacles.length; j++) {
        this._checkOverlappingEntities(pursuer, obstacles[j]);
      }
    }
  }
  /**
   * 判断两个对象是否相交
   * @param {*} entity1
   * @param {*} entity2
   */
  _checkOverlappingEntities(entity1, entity2) {
    toVector.subVectors(entity1.position, entity2.position);
    const distance = toVector.length();
    const range = entity1.boundingRadius + entity2.boundingRadius;
    const overlap = range - distance;
    if (overlap >= 0) {
      // 相交
      toVector.divideScalar(distance || 1); // 归一化，可以使用normalize()
      displacement.copy(toVector).multiplyScalar(overlap);
      entity1.position.add(displacement);
    }
  }

  /**
   * 同步实体对象与3D对象
   * @param {*} entity
   * @param {*} renderComponent
   */
  _sync(entity, renderComponent) {
    renderComponent.matrix.copy(entity.worldMatrix);
    // mesh.matrixAutoUpdate = false;  不使用下面的解析代码就要开启当前代码
    /**
     * 🧠 一句话总结=> YUKA 并没有类似 Three.js 那种“父子层级矩阵计算”的系统。
      因为 Three.js 中 Object3D.matrix 表示局部变换矩阵（local matrix），
      而 YUKA 的 entity.worldMatrix 已经是世界空间矩阵（world transform）。
      所以要把它直接赋给 Three.js 对象的 局部矩阵，
      否则如果用 worldMatrix，Three.js 的层级系统会重复计算一次世界变换，导致错误的结果。
     */
    renderComponent.matrix.decompose(
      renderComponent.position,
      renderComponent.quaternion,
      renderComponent.scale
    ); // 这里为啥不使用renderComponent.worldMatrix？因为three.js 中的worldMatrix 包含父类的矩阵变换
    // 这里设置之后three.js系统自己也会更新，导致一个对象被设置两次，就会出现问题
  }

  _onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

function onRestart() {
  this._onStopAnimation();
  this.controls.connect();
  this.player.heal();
  this.gameOver = false;
  this.currentStage = 1;
  this._loadStage(this.currentStage);
  const audio = this.assetManager.audioMaps.get(_button_click_);
  this.playAudio(audio);
}

function onContinueButtonClick() {
  this.controls.connect();
  const audio = this.assetManager.audioMaps.get(_button_click_);
  this.playAudio(audio);
}

function onStartAnimation() {
  this._requestID = requestAnimationFrame(this._onStartAnimation);
  this.update();
}

/**
 * 停止帧动画
 */
function onStopAnimation() {
  cancelAnimationFrame(this._requestID);
}
