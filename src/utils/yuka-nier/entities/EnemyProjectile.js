import * as YUKA from 'yuka';

import Projectile from './Projectile';

const target = new YUKA.Vector3();

export default class EnemyProjectile extends Projectile {
  constructor(owner = null, direction) {
    super(owner);
    this.expiryTime = owner.world.time.getElapsed() + 5;
    this.boundingRadius = 0.4;
    this.boundingSphere = new YUKA.BoundingSphere();
    this.boundingSphere.radius = this.boundingRadius;

    this.maxSpeed = 10;
    this.velocity.copy(direction).multiplyScalar(this.maxSpeed);
    this.position.copy(this.owner.position);
    this.position.y = 0.4;
    target.copy(this.position).add(this.velocity);
    this.lookAt(target);

    this.isEnemyProjectile = true;
    this.isDestructible = false;
  }

  update(delta) {
    super.update(delta);
    // 更新bounding Sphere
    this.boundingSphere.center.copy(this.position);
  }
}
