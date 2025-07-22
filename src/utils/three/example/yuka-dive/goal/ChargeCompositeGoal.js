/**
 * 
 */

import * as YUKA from 'yuka';
import FindPathGoal from './FindPathGoal';
import FollowPathGoal from './FollowPathGoal';

/**
 * Sub-goal for seeking the enemy's target during a battle.
 * 在战斗中寻找敌人目标的子目标。
 */
export default class ChargeCompositeGoal extends YUKA.CompositeGoal{
    constructor(owner){
        super(owner);
    }
    /**
     * 从inactive 状态到 active 状态
     */
    activate(){
        // 清除所有的子目标
        this.clearSubgoals();

        const owner = this.owner;

        const target = owner.targetSystem.getTarget();

        const from = new YUKA.Vector3().copy(owner.position);
        const to = new YUKA.Vector3().copy(target.position);

        this.addSubgoals(new FindPathGoal(owner,from,to)); // 查找路线目标
        this.addSubgoals(new FollowPathGoal(owner));// 跟随路线目标
    }

    execute(){
        if(this.owner.targetSystem.isTargetShootable() === false){
            this.status = YUKA.Goal.STATUS.COMPLETED;
        }else{
            this.status = this.executeSubgoals();
            this.replanIfFailed();
        }
    }

    terminate(){
        this.clearSubgoals();
    }
}