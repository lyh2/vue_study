/**
 * Hunt:打猎；猎杀；追捕；搜寻；搜索；猎取；追踪；（英国）猎狐运动；打猎；寻找；搜寻；搜索；(英国)猎狐活动；猎狐队伍
 */

import * as YUKA from 'yuka';
import FindPathGoal from './FindPathGoal';

export default class HuntCompositeGoal extends YUKA.CompositeGoal{
    constructor(owner){
        super(owner);
    }

    // 进入激活状态执行下面的方法
    activate(){
        // 首先清除已有的全部子目标
        this.clearSubgoals();
        //seek to the last sensed position,寻找最后一个感知的位置
        const targetPosition = owner.targetSystem.getLastSensedPosition();

        const from = new YUKA.Vector3().copy(owner.position);
        const to = new YUKA.Vector3().copy(targetPosition);

        // 添加子目标
        this.addSubgoal(new FindPathGoal(owner,from,to));
        this.addSubgoal(new FollowPathGoal(owner));
    }

    execute(){
        const owner = this.owner;

        if(owner.targetSystem.isTargetShootable()){
            this.status = YUKA.Goal.STATUS.COMPLETED;
        }else{
            this.status = this.executeSubgoals();
            if(this.completed()){
                const target = owner.targetSystem.getTarget();
                owner.removeEntityFromMemory(target); // 移除目标对象
                owner.targetSystem.update();
            }else{
                this.replanIfFailed();
            }
        }
    }
    /**
     * 达到满意效果就执行此方法，退出结束
     */
    terminate(){
        this.clearSubgoals();
    }
}