import * as YUKA from 'yuka';
import Feature from '../core/Feature';
import ItemCompositeGoal from '../goal/ItemCompositeGoal';

/**
 * 获取健康，就是血条的评估器
 */
export default class HealthEvaluator extends YUKA.GoalEvaluator{
    constructor(characterBias = 1,itemType = null){
        super(characterBias);

        this.itemType = itemType;
        this.tweaker = 0.2;
    }

    calculateDesirability(owner){
        let desirability = 0;
        if(owner.isItemIgnored(this.itemType) === false && owner.health < owner.maxHealth){
            const distanceScore = Feature.distanceToItem(owner,this.itemType);
            const healthScore = Feature.health(owner);

            desirability = this.tweaker * ( 1 - healthScore) / distanceScore;
            desirability = YUKA.MathUtils.clamp(desirability,0,1);
        }
        return desirability;
    }

    setGoal(owner){
        const currentSubgoal = owner.brain.currentSubgoal();
        if((currentSubgoal instanceof ItemCompositeGoal) === false){
            owner.brain.clearSubgoals();
            owner.brain.addSubgoal(new ItemCompositeGoal(owner,this.itemType));
        }
    }
}