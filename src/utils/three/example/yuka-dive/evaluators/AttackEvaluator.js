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
   * - __执行概率__：可取性值直接影响该评估器被选中的概率。Yuka的决策系统会对比所有评估器的可取性值，值越高越优先执行。因此低可取性会显著降低执行概率。
    - __执行时间__：不会直接导致执行时间延后。但低可取性会使该行为在决策队列中排到更低优先级，间接导致执行延迟（当更高优先级行为持续时）。
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
