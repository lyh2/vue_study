/**
 * 攻击目标是一个组合目标
 */

import * as YUKA from 'yuka';
import ChargeCompositeGoal from './ChargeCompositeGoal';
import HuntCompositeGoal from './HuntCompositeGoal'; // 猎杀
import DodgeCompositeGoal from './DodgeCompositeGoal'; // 躲闪

const left = new YUKA.Vector3(-1,0,0);
const right = new YUKA.Vector3(1,0,0);
const targetPosition = new YUKA.Vector3();

export default class AttackCompositeGoal extends YUKA.CompositeGoal{
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
        this.clearSubgoals();// Removes all subgoals and ensures Goal#terminate is called for each subgoal.
        //console.log(this.owner.name,this.owner.targetSystem.hasTarget());
        
        const owner = this.owner;
        // 敌人有空间进行扫射
        if(owner.targetSystem.isTargetShootable() === true){
            // owner NPC角色需要进行移动，以便躲避敌人射击
            if(owner.canMoveInDirection(left,targetPosition)){
                this.addSubgoal(new DodgeCompositeGoal(owner,false));  // 进行左右躲闪
            }else if(owner.canMoveInDirection(right,targetPosition)){
                this.addSubgoal(new DodgeCompositeGoal(owner,true));
            }else{
                // 左右都不能移动，改变自己的位置
                this.addSubgoal(new ChargeCompositeGoal(owner));
            }
        }else{
            // if the target is not visible, go hunt it,
            // 目标不可见就去狩猎目标一个新目标
            this.addSubgoal(new HuntCompositeGoal(owner));
          
        }
    }
    // Executed in each simulation step. 
    execute(){
        const owner = this.owner;
        if(owner.targetSystem.hasTarget() === false){
            this.status = YUKA.Goal.STATUS.COMPLETED; // 没有找到目标，则当前目标设置完成状态
        }else{
            const currentSubgoal = this.currentSubgoal;
            const status = this.executeSubgoals();
            // 存在目标对象。就要开启“躲闪”
            if(currentSubgoal instanceof DodgeCompositeGoal && currentSubgoal.inactive()){
				// inactive dogde goals should be reactivated but without reactivating the enire attack goal
                this.status = YUKA.Goal.STATUS.ACTIVE;
            }else{
                this.status = status;
                this.replanIfFailed();
            }
        }
    }
    // Executed when this goal is satisfied. terminate:终止
    terminate(){
        // 终止时清除所有子目标
        // Clears all subgoals and ensures Goal#terminate is called for each subgoal.
        this.clearSubgoals();
    }
}