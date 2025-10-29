import * as YUKA from 'yuka';

export default class Obstacle extends YUKA.GameEntity {
  constructor() {
    super();

    this.boundingRadius = 0.75;
    this.aabb = new YUKA.AABB();
    this.obb = new YUKA.OBB();

    this.needsUpdate = true;

    this.size = new YUKA.Vector3(1, 1, 1);
  }
  /**
   *自定义方法
   */
  updateBoundingVolumes() {
    this.aabb.fromCenterAndSize(this.position, this.size);
    this.obb.center.copy(this.position);
    this.obb.halfSizes.copy(this.size).multiplyScalar(0.5);
  }
}
