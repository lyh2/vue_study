import * as YUKA from 'yuka';
import EnemyProjectile from '../entities/EnemyProjectile';
import { _enemy_shot_, _two_pi_ } from '../etc/constant';

const direction = new YUKA.Vector3();
const target = new YUKA.Vector3();

/**
 * 创建战斗状态
 */
class CombatPattern extends YUKA.State {
  constructor() {
    super();

    this.shotsPerSecond = 0.5; // 每秒射击次数
    this.projectilesPerShot = 3; // 每次射击的弹丸数
    // 有多少子弹可以被破坏
    this.destructibleProjectiles = 0; //amount of destructible projectiles per shot [0,1]
    this._lastShotTime = 0;
  }
  /**
   *
   * @param {*} enemy
   */
  enter(enemy) {
    this._lastShotTime = enemy.world.time.getElapsed(); // 获取全局时间
  }
}
/**
 * 默认战斗模式
 */
class DefaultCombatPattern extends CombatPattern {
  constructor() {
    super();
    this.angularStep = Math.PI * 0.167; // 30 degress;
  }

  execute(enemy) {
    const world = enemy.world;
    const elapsedTime = world.time.getElapsed(); // 得到当前运行时间
    // (角度增加的步骤 * (3-1))/2 => 30;(30 * (5-1)) /2=>60
    const halfAngle = (this.angularStep * (this.projectilesPerShot - 1)) / 2;
    // 1 / this.shotsPerSecond ，隔多长时间发射一个子弹
    if (elapsedTime - this._lastShotTime > 1 / this.shotsPerSecond) {
      this._lastShotTime = elapsedTime;
      // 超过时间之后，可以继续发射子弹；每次创建多个子弹
      for (let i = 0; i < this.projectilesPerShot; i++) {
        const s = halfAngle - this.angularStep * i; //3个子弹：30,0,-30;5个子弹：60,30,0，-30，-60
        target.copy(enemy.position);
        target.x += Math.sin(s);
        target.z += Math.cos(s);

        direction.subVectors(target, enemy.position).normalize();
        direction.applyRotation(enemy.rotation);
        // 创建子弹
        const projectile = new EnemyProjectile(enemy, direction);

        if (Math.random() <= this.destructibleProjectiles) projectile.isDestructible = true;

        world.addProjectile(projectile);
      }

      const audio = enemy.audioMaps.get(_enemy_shot_);
      world.playAudio(audio);
    }
  }
}

/**
 * 风扇作战模式
 */
class SpreadCombatPattern extends CombatPattern {
  constructor() {
    super();

    this.shotsPerSecond = 1;
    this.projectilesPerShot = 6;
    this.enableRotation = true;
    this.rotationSpeed = 1;
  }

  execute(enemy) {
    const world = enemy.world;
    const elapsedTime = world.time.getElapsed();

    if (elapsedTime - this._lastShotTime > 1 / this.shotsPerSecond) {
      this._lastShotTime = elapsedTime;
      for (let i = 0; i < this.projectilesPerShot; i++) {
        let s = _two_pi_ * (i / this.projectilesPerShot);
        if (this.enableRotation) s += elapsedTime * this.rotationSpeed;

        target.copy(enemy.position);
        target.x += Math.sin(s);
        target.z += Math.cos(s);

        direction.subVectors(target, enemy.position).normalize();
        direction.applyRotation(enemy.rotation);

        // 创建子弹
        const projectile = new EnemyProjectile(enemy, direction);
        if (Math.random() <= this.destructibleProjectiles) projectile.isDestructible = true;
        world.addProjectile(projectile);
      }
      const audio = enemy.audioMaps.get(_enemy_shot_);
      world.playAudio(audio);
    }
  }
}

/**
 * 集中作战模式
 */
class FocusCombatPattern extends CombatPattern {
  constructor() {
    super();
    this.shotsPerSecond = 10;
    this.shotDuration = 1;
    this.pauseDuration = 0.5;
    this.shooting = true;
    this._nextPauseTime = Infinity;
    this._nextShotTime = -Infinity;
  }

  execute(enemy) {
    const world = enemy.world;
    const elapsedTime = world.time.getElapsed();

    if (elapsedTime > this._nextPauseTime) {
      this.shooting = false;
      this._nextPauseTime = Infinity;
      this._nextShotTime = elapsedTime + this.pauseDuration;
    }

    if (elapsedTime > this._nextShotTime) {
      this.shooting = true;
      this._nextShotTime = Infinity;
      this._nextPauseTime = elapsedTime + this.shotDuration;
    }

    if (this.shooting === true && elapsedTime - this._lastShotTime > 1 / this.shotsPerSecond) {
      this._lastShotTime = elapsedTime;
      enemy.getDirection(direction);
      const projectile = new EnemyProjectile(enemy, direction);
      if (Math.random() < this.destructibleProjectiles) projectile.isDestructible = true;
      world.addProjectile(projectile);

      const audio = enemy.audioMaps.get(_enemy_shot_);
      world.playAudio(audio);
    }
  }
}

/**
 * 混战模式
 */
class RandomCombatPattern extends CombatPattern {
  constructor() {
    super();

    this.shotsPerSecond = 1;
    this.projectilesPerShot = 6;
  }

  execute(enemy) {
    const world = enemy.world;
    const elapsedTime = world.time.getElapsed();
    if (elapsedTime - this._lastShotTime > 1 / this.shotsPerSecond) {
      this._lastShotTime = elapsedTime;
      for (let i = 0; i < this.projectilesPerShot; i++) {
        let s = _two_pi_ * Math.random();

        target.copy(enemy.position);
        target.x += Math.sin(s);
        target.z += Math.cos(s);

        direction.subVectors(target, enemy.position).normalize();
        direction.applyRotation(enemy.rotation);

        const projectile = new EnemyProjectile(enemy, direction);
        if (Math.random() <= this.destructibleProjectiles) projectile.isDestructible = true;

        world.addProjectile(projectile);
      }
      const audio = enemy.audioMaps.get(_enemy_shot_);
      world.playAudio(audio);
    }
  }
}

export { DefaultCombatPattern, SpreadCombatPattern, FocusCombatPattern, RandomCombatPattern };
