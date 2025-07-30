/**
 * 实现攻击目标驱动评估器
 */

import * as YUKA from 'yuka';
import Feature from '../core/Feature';
import AttackCompositeGoal from '../goal/AttackCompositeGoal';

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
        if(owner.targetSystem.hasTarget()){ // 找到目标对象enemy
            desirability = this.tweaker * Feature.totalWeaponStrength(owner /* 我自己*/) * Feature.health(owner/* 我自己*/);
        }
        return desirability;// 可取值，可取性
    }
    /**
	 * Executed if this goal evaluator produces the highest desirability.
     * 
     * @param {*} owner 
     */
    setGoal(owner /* enemy or player */){
        const currentSubgoal = owner.brain.currentSubgoal();
        if((currentSubgoal instanceof AttackCompositeGoal) === false){
            // 不是攻击目标
            owner.brain.clearSubgoals();
            owner.brain.addSubgoal(new AttackCompositeGoal(owner));
        }
    }
}