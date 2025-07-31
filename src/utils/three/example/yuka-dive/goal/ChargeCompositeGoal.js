
import * as YUKA from 'yuka';
import FindPathGoal from './FindPathGoal';
import FollowPathGoal from './FollowPathGoal';

/**
 * Sub-goal for seeking the enemy's target during a battle.
 * 在战斗中改变位置
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
        const target = owner.targetSystem.getTarget(); // 得到目标对象
        // 如果目标对象不存在呢？
        const from = new YUKA.Vector3().copy(owner.position);
        const to = new YUKA.Vector3().copy(target.position);
        // 先查找路线，再跟随路线
        this.addSubgoal(new FindPathGoal(owner,from,to)); // 查找路线目标
        this.addSubgoal(new FollowPathGoal(owner));// 跟随路线目标
    }

    execute(){
        if(this.owner.targetSystem.isTargetShootable() === false){
            // 没有找到对象，这此目标则设置为完成状态
            this.status = YUKA.Goal.STATUS.COMPLETED;
        }else{
            // 找到目标对象，这继续执行子目标
            this.status = this.executeSubgoals();
            this.replanIfFailed(); // 执行失败继续执行
        }
    }
    /**
     * 终止时。清空所有的子目标
     */
    terminate(){
        this.clearSubgoals();
    }
}