/**
 * 实现攻击目标驱动评估器
 */

import * as YUKA from 'yuka';
import Feature from '../core/Feature';
import AttackCompositeGoal from '../goal/AttackCompositeGoal';

export default class AttackEvaluator extends YUKA.GoalEvaluator {
  constructor(charactorBias = 1) {
    super(charactorBias);

    this.tweaker = 1; // 调整值
  }
  /**
   * desirability:可取性
   * @param {*} owner - enemy NPC对象
   */
  calculateDesirability(owner) {
    let desirability = 0;
    // 从属主的目标系统中获取目标对象
    if (owner.targetSystem.hasTarget()) {
      // 找到目标对象enemy                owner 当前拥有的武器子弹总数的平均数             owner 当前拥有的血量百分比 => 得到一个可信值
      desirability =
        this.tweaker *
        Feature.totalWeaponStrength(owner /* 我自己*/) *
        Feature.health(owner /* 我自己*/);
    }
    // 自己武器弹药少 ，血量低返回一个低的可取值，也就是这个评估器不会去执行
    return desirability; // 可取值，可取性
  }
  /**
   * Executed if this goal evaluator produces the highest desirability.
   *
   * @param {*} owner
   */
  setGoal(owner /* enemy or player */) {
    const currentSubgoal = owner.brain.currentSubgoal();
    if (currentSubgoal instanceof AttackCompositeGoal === false) {
      // 不是攻击目标
      owner.brain.clearSubgoals();
      owner.brain.addSubgoal(new AttackCompositeGoal(owner));
    }
  }
}
