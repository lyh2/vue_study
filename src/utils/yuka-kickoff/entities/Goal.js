import * as YUKA from 'yuka';
import { TEAM } from '../core/constants';

/**
 * 球门对象
 */
export default class Goal extends YUKA.GameEntity {
  /**
   * Constructs a new goal.
   *
   * @param {Number} width - The width of the goal. - 球门宽度
   * @param {Number} height - The height of the goal. - 球门高度
   * @param {Number} color - The color of the team that owns this goal.
   */
  constructor(width, height, color) {
    super();

    this.width = width;
    this.height = height;
    this.color = color; // 球门的属于哪一对

    this.leftPost = null; // 左柱的位置
    this.rightPost = null; // 右柱的位置
  }
  /**
   * 返回球门的方向,覆盖基类的方法
   * @param {*} direction
   */
  getDirection(direction) {
    if (this.color === TEAM.RED) {
      direction.set(-1, 0, 0); // 左边
    } else {
      direction.set(1, 0, 0); // 右边
    }
    return direction;
  }
  /**
   *    计算球门两边柱子的位置
   */
  computePosts() {
    this.leftPost = new YUKA.Vector3();
    this.rightPost = new YUKA.Vector3();

    // 宽度一半
    const halfSize = this.width / 2;

    /**
     *   - left                             - right
     *  | 蓝队(1,0,0)              红队(-1,0,0)|
     *   _right                              _ left
     */
    if (this.color === TEAM.RED) {
      // 红队
      this.leftPost.x = this.position.x;
      this.leftPost.z = this.position.z + halfSize;

      this.rightPost.x = this.position.x;
      this.rightPost.z = this.position.z - halfSize;
    } else {
      // 蓝队
      this.leftPost.x = this.position.x;
      this.leftPost.z = this.position.z - halfSize;

      this.rightPost.x = this.position.x;
      this.rightPost.z = this.position.z + halfSize;
    }
  }
}
