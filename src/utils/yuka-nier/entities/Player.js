import * as YUKA from 'yuka';
import PlayerProjectile from './PlayerProjectile';
import { _max_health_points_, _player_explode_, _player_hit_ } from '../etc/constant';
import { Particle, ParticleSystem } from '../core/ParticleSystem';

const aabb = new YUKA.AABB();
const direction = new YUKA.Vector3();
const intersectionPoint = new YUKA.Vector3();
const intersectionNormal = new YUKA.Vector3();
const ray = new YUKA.Ray();
const reflectionVector = new YUKA.Vector3();
const offset = new YUKA.Vector3();

export default class Player extends YUKA.MovingEntity {
  constructor(world /* World 对象*/) {
    super();

    this.world = world;

    this.maxSpeed = 6;
    this.updateOrientation = false; //是否更新方向

    this.max_health_points = 3; // 最大的血量
    this.healthPoints = this.max_health_points;

    this.boundingRadius = 0.5;

    this.shotsPerSecond = 10; // 每秒射击个数
    this.lastShotTime = 0;

    this.obb = new YUKA.OBB();
    this.obb.halfSizes.set(0.1, 0.1, 0.5); // 0.2,0.2,1

    this.audioMaps = new Map();

    // particles
    this.maxParticles = 20;
    this.particleSystem = new ParticleSystem();
    this.particleSystem.init(this.maxParticles);
    this.particlesPerSecond = 6; // 每秒产生的最大粒子个数

    this._particlesNextEmissionTime = 0; // 下次发射的时间
    this._particlesElapsedTime = 0; //
  }
  /**
   * 射击
   */
  shoot() {
    const world = this.world;
    const elapsedTime = world.time.getElapsed();
    // 每秒可进行10次射击，每次射击的时间就是 1 / this.shotsPerSecond
    if (elapsedTime - this.lastShotTime > 1 / this.shotsPerSecond) {
      this.lastShotTime = elapsedTime;
      this.getDirection(direction); // 获取对象的方向
      const projectile = new PlayerProjectile(this, direction);
      world.addProjectile(projectile);

      // 播放音频
      const audio = this.audioMaps.get('playerShot');
      world.playAudio(audio);
    }
    return this;
  }

  heal() {
    this.healthPoints = _max_health_points_;
    return this;
  }

  update(delta) {
    this.obb.center.copy(this.position);
    this.obb.rotation.fromQuaternion(this.rotation);
    this._restrictMovement();
    super.update(delta);
    this.updateParticles(delta);
    return this;
  }
  updateParticles(delta) {
    const timeScale = this.getSpeed() / this.maxSpeed; // [0-1]
    const effectiveDelta = delta * timeScale;

    this._particlesElapsedTime += effectiveDelta;
    if (this._particlesElapsedTime > this._particlesNextEmissionTime) {
      const t = 1 / this.particlesPerSecond;
      this._particlesNextEmissionTime =
        this._particlesElapsedTime + t / 2 + (t / 2) * Math.random();

      const particle = new Particle();
      offset.x = Math.random() * 0.3;
      offset.y = Math.random() * 0.3;
      offset.z = Math.random() * 0.3;
      particle.position.copy(this.position).add(offset);
      particle.lifetime = Math.random() * 0.7 + 0.3;
      particle.opacity = Math.random() * 0.5 + 0.5;
      particle.size = Math.floor(Math.random() * 10) + 10;
      particle.angle = Math.round(Math.random()) * Math.PI * Math.random();
      this.particleSystem.add(particle);
    }

    this.particleSystem.update(delta);
  }

  handleMessage(telegram) {
    switch (telegram.message) {
      case 'hit':
        {
          const world = this.world;
          const audio = this.audioMaps.get(_player_hit_);
          world.playAudio(audio);

          this.healthPoints--;
          if (this.healthPoints === 0) {
            const audio = this.audioMaps.get(_player_explode_);
            world.playAudio(audio);
          }
        }
        break;
      default:
        console.error('未知消息类型:', telegram.message);
    }

    return true;
  }

  _restrictMovement() {
    if (this.velocity.squaredLength() === 0) return; // 速度为0，直接返回
    //check obstacles
    const world = this.world;
    const obstacles = world.obstacles;
    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      // enhance the AABB 增强AABB
      aabb.copy(obstacle.aabb); // 获取障碍物的
      aabb.max.addScalar(this.boundingRadius * 0.5);
      aabb.min.subScalar(this.boundingRadius * 0.5);

      // 开启射线检测
      ray.origin.copy(this.position);
      ray.direction.copy(this.velocity).normalize();
      if (ray.intersectAABB(aabb, intersectionPoint) !== null) {
        const squaredDistance = this.position.squardDistanceTo(intersectionPoint);
        if (squaredDistance <= this.boundingRadius * this.boundingRadius) {
          // derive normal vector // 导出法向量
          aabb.getNormalFromSurfacePoint(intersectionPoint, intersectionNormal);
          // compute reflection vector // 计算反射向量
          reflectionVector.copy(ray.direction).reflect(intersectionNormal);
          //compute new velocity vector // 计算新的速度向量
          const speed = this.getSpeed(); // 数量值
          this.velocity.addVectors(ray.direction, reflectionVector).normalize();
          const f = 1 - Math.abs(intersectionNormal.dot(ray.direction));
          this.velocity.multiplyScalar(speed * f);
        }
      }
    }
    // ensure player does not leave the game area
    const fieldXHalfSize = world.field.x / 2;
    const fieldZHalfSize = world.field.z / 2;
    this.position.x = YUKA.MathUtils.clamp(
      this.position.x,
      -(fieldXHalfSize - this.boundingRadius),
      fieldXHalfSize - this.boundingRadius
    );
    this.position.z = YUKA.MathUtils.clamp(
      this.position.z,
      -(fieldZHalfSize - this.boundingRadius),
      fieldZHalfSize - this.boundingRadius
    );
    return this;
  }
}
