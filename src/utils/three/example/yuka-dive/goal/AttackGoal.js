/**
 * 攻击目标是一个组合目标
 */

import * as YUKA from 'yuka';
import DodgeGoal from './DodgeCompositeGoal';
import ChargeCompositeGoal from './ChargeCompositeGoal';
import HuntCompositeGoal from './HuntCompositeGoal';
import DodgeCompositeGoal from './DodgeCompositeGoal';

const left = new YUKA.Vector3(-1,0,0);
const right = new YUKA.Vector3(1,0,0);
const targetPosition = new YUKA.Vector3();

export default class AttackGoal extends YUKA.CompositeGoal{
    /**
     * 目标是属于那个主体的
     * @param {*} owner 
     */
    constructor(owner){
        super(owner);
    }

    /**
     * Executed when this goal is activated. 被激活时执行
     */
    activate(){
        // 首先移除子目标
        this.clearSubgoals();

        const owner = this.owner;
        // 敌人有空间进行扫射
        if(owner.targetSystem.isTargetShootable() === true){
            // 我需要进行移动
            if(owner.canMoveInDirection(left,targetPosition)){
                this.addSubgoal(new DodgeGoal(owner,false));
            }else if(owner.canMoveInDirection(right,targetPosition)){
                this.addSubgoal(new DodgeGoal(owner,true));
            }else{
                // 左右都不能移动，改变目标的位置
                this.addSubgoal(new ChargeCompositeGoal(owner));
            }
        }else{
            // if the target is not visible, go hunt it,目标不可见就去狩猎目标
            this.addSubgoal(new HuntCompositeGoal(owner));
        }
    }

    execute(){
        const owner = this.owner;
        if(owner.targetSystem.hasTarget() === false){
            this.status = YUKA.Goal.STATUS.COMPLETED;
        }else{
            const currentSubgoal = this.currentSubgoal;
            const status = this.executeSubgoals();

            if(currentSubgoal instanceof DodgeCompositeGoal && currentSubgoal.inactive()){
				// inactive dogde goals should be reactivated but without reactivating the enire attack goal
                this.status = YUKA.Goal.STATUS.ACTIVE;
            }else{
                this.status = status;
                this.replacIfFailed();
            }
        }
    }

    terminate(){
        this.clearSubgoals();
    }
}