/**
 * 实现攻击目标驱动评估器
 */

import * as YUKA from 'yuka';
import Feature from '../core/Feature';

export default class AttackEvaluator extends YUKA.GoalEvaluator{

    constructor(charactorBias=1){
        super(charactorBias);

        this.tweaker = 1;//
    }
    /**
     * desirability:可取性
     * @param {*} owner 
     */
    calculateDesirability(owner){
        let desirability = 0;
        if(owner.targetSystem.hasTarget()){
            desirability = this.tweaker * Feature.totalWeaponStrength(owner) * Feature.health(owner);
        }
        return desirability;// 可取值，可取性
    }
    /**
	 * Executed if this goal evaluator produces the highest desirability.
     * 
     * @param {*} owner 
     */
    setGoal(owner){
        const currentSubgoal = owner.brain.currentSubgoal();
        if((currentSubgoal instanceof AttackGoal) === false){
            // 不是攻击目标
            owner.brain.clearSubgoals();
            owner.brain.addSubgoal(new AttackGoal(owner));
        }
    }
}