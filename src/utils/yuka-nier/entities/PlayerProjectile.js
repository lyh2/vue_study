import * as YUKA from 'yuka';

/**
 * 玩家的子弹
 */

import Projectile from './Projectile';
const target = new YUKA.Vector3();

export default class PlayerProjectile extends Projectile {
  constructor(owner = null /* Player 玩家对象 */, direction) {
    super(owner);
    this.owner = owner;
    this.isPlayerProjectile = true;
    this.boundingRadius = 0.5;
    this.obb = new YUKA.OBB();
    this.maxSpeed = 20;
    //1、__初始位置定位__：子弹需要从发射者（玩家）的当前位置开始飞行。如果不设置，子弹可能会从默认位置（如世界原点）开始，这不符合游戏逻辑。
    //2、 __继承关系__：`PlayerProjectile` 继承自 `Projectile`，而 `Projectile` 继承自 Yuka 的 `MovingEntity`。在创建新实体时，位置属性默认可能是零向量，所以必须显式设置初始位置。
    //3、 __空间一致性__：确保子弹与发射者在同一空间位置开始，这样视觉效果和碰撞检测才能正确工作。
    this.position.copy(this.owner.position); //设置初始化的位置
    this.velocity.copy(direction).multiplyScalar(this.maxSpeed);
    this.position.y = 0.5;

    target.copy(this.position).add(this.velocity);
    this.lookAt(target);
    // 用于碰撞检测
    this.obb.halfSizes.set(0.1, 0.1, 0.5);
    this.obb.rotation.fromQuaternion(this.rotation);
  }

  update(delta) {
    super.update(delta);

    // update OBB
    this.obb.center.copy(this.position);
  }
}
