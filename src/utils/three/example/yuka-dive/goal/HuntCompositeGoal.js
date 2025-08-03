/**
 * Hunt:打猎；猎杀；追捕；搜寻；搜索；猎取；追踪；（英国）猎狐运动；打猎；寻找；搜寻；搜索；(英国)猎狐活动；猎狐队伍
 */

import * as YUKA from 'yuka';
import FindPathGoal from './FindPathGoal';
import FollowPathGoal from './FollowPathGoal';

export default class HuntCompositeGoal extends YUKA.CompositeGoal {
  constructor(owner) {
    super(owner);
  }

  // 进入激活状态执行下面的方法
  activate() {
    // 首先清除已有的全部子目标
    this.clearSubgoals();
    const owner = this.owner;

    //seek to the last sensed position,寻找最后一个感知的位置
    const targetPosition = owner.targetSystem.getLastSensedPosition();

    const from = new YUKA.Vector3().copy(owner.position);
    const to = new YUKA.Vector3().copy(targetPosition);

    // 添加子目标
    this.addSubgoal(new FindPathGoal(owner, from, to) /* type= The subgoal is YUKA.Goal to add.*/);
    this.addSubgoal(new FollowPathGoal(owner));
  }

  execute() {
    const owner = this.owner;

    if (owner.targetSystem.isTargetShootable()) {
      this.status = YUKA.Goal.STATUS.COMPLETED; // 找到可射击新目标就完成此目标
    } else {
      this.status = this.executeSubgoals(); // 执行其他子目标
      if (this.completed()) {
        // 表示完成了此目标，都没找到对象，则清除此记录，避免后期继续引用，追踪无效的目标
        /***
         * 1、设计意图：
            * - __清理无效目标__：当完成所有子目标（寻路+跟随路径）后仍未发现目标，说明目标已消失或不可达
                - __防止死循环__：避免NPC持续追踪不存在/不可达目标导致行为卡死
                - __资源优化__：释放内存中不再需要的目标对象引用
                - __状态重置__：为后续可能的新目标扫描做准备

        2、__场景模拟__：

                - NPC追踪敌人到其最后已知位置
                - 到达后未发现目标（敌人已转移）
                - 移除该目标防止重复追踪同一无效位置
                - 目标系统更新后可触发其他行为（如巡逻/探索）

         */
        const target = owner.targetSystem.getTarget();
        owner.removeEntityFromMemory(target); // 移除目标对象，清除内存引用
        owner.targetSystem.update();
      } else {
        this.replanIfFailed();
      }
    }
  }
  /**
   * 达到满意效果就执行此方法，退出结束
   */
  terminate() {
    this.clearSubgoals();
  }
}
