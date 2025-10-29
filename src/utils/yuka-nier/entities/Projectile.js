import * as YUKA from 'yuka';

/**
 * 子弹基类
 */
export default class Projectile extends YUKA.MovingEntity {
  constructor(owner = null) {
    super();

    this.owner = owner;
    this.projectile = true;
  }

  update(delta) {
    super.update(delta);

    // remove the projectile when it leaves the game area
    // 离开游戏区域之后就移除子弹

    const world = this.owner.world;
    const fieldXHalfSize = world.field.x / 2;
    const fieldZHalfSize = world.field.z / 2;

    if (
      this.position.x > fieldXHalfSize ||
      this.position.x < -fieldXHalfSize ||
      this.position.z > fieldZHalfSize ||
      this.position.z < -fieldZHalfSize
    ) {
      // 超出边界
      world.removeProjectile(this);
      return;
    }
  }
}
