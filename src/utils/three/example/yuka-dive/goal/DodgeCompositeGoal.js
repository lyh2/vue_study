/**
 * Dodge: 闪避；避开；躲开；
 */

import * as YUKA from 'yuka';
import SeekToPositionGoal from './SeekToPositionGoal';

const right = new YUKA.Vector3(1, 0, 0);
const left = new YUKA.Vector3(-1, 0, 0);
/**
 * DodgeCompositeGoal: 闪避组合目标
 */
export default class DodgeCompositeGoal extends YUKA.CompositeGoal {
  /**
   *
   * @param {*} owner - enemy
   * @param {*} right - 是否向右移动
   */
  constructor(owner, right) {
    super(owner);

    this.right = right;
    this.targetPosition = new YUKA.Vector3();
  }
  /**
   * Executed when this goal is activated.
   * 被激活时执行
   */
  activate() {
    this.clearSubgoals(); // 清除所有的子目标

    const owner = this.owner;
    if (this.right) {
      // 指示向右移动，首先判断是否能真的向右移动
      if (
        owner.canMoveInDirection(
          right /*定义向右的向量(0,0,1)*/,
          this.targetPosition /* 向👉🏻右移动之后的位置 */
        )
      ) {
        // 移动之后还在导航区域内，所以，执行搜索目标，搜索到新的位置处
        this.addSubgoal(new SeekToPositionGoal(owner, this.targetPosition /*移动之后的点位*/)); //
      } else {
        // 向右没有任何空间可以移动，则向左移动
        this.right = false;
        this.status = YUKA.Goal.STATUS.INACTIVE; // 设置状态为 “未激活状态”，因为，我们希望是向右躲避进行移动
        // 如果，不能向右，即此设置为未激活状态
      }
    } else {
      // 指示向左移动
      if (owner.canMoveInDirection(left, this.targetPosition /*向左移动之后的新位置*/)) {
        // 搜索到新的位置
        this.addSubgoal(new SeekToPositionGoal(owner, this.targetPosition));
      } else {
        // 没有任何可移动的空间，向右移动
        this.right = true;
        this.status = YUKA.Goal.STATUS.INACTIVE; // 逻辑同上
      }
    }
  }
  /**
   * 每帧都执行
   * Executed in each simulation step.
   */
  execute() {
    if (this.active()) {
      const owner = this.owner;

      if (owner.targetSystem.isTargetShootable() === false) {
        // 没有遇到敌人，躲避完成
        this.status = YUKA.Goal.STATUS.COMPLETED;
      } else {
        // 遇到敌人，继续执行其他目标
        this.status = this.executeSubgoals(); // 执行当前目标中的所有子目标
        this.replanIfFailed(); // 执行失败重新执行
        // if completed, set the status to inactive in order to repeat the goal

        if (this.completed()) this.status = YUKA.Goal.STATUS.INACTIVE;
      }
    }
  }
  /**
   * Executed when this goal is satisfied.
   */
  terminate() {
    this.clearSubgoals();
  }
}
