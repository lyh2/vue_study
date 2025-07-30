import * as YUKA from 'yuka';
import Feature from '../core/Feature';
import ItemCompositeGoal from '../goal/ItemCompositeGoal';


/**
 * 武器的评估器
 */
export default class WeaponEvaluator extends YUKA.GoalEvaluator{
    constructor(characterBias=1,itemType = null){
        super(characterBias);

        this.itemType = itemType;
        this.tweaker = 0.15;//value used to tweak the desirability
    }

    calculateDesirability(owner){
        let desirability = 0;

        if(owner.isItemIgnored(this.itemType) === false){

            const distanceScore = Feature.distanceToItem(owner,this.itemType);
            const weaponScore = Feature.individualWeaponStrength(owner,this.itemType); // 剩余子弹数 / 子弹总数
            const healthScore = Feature.health(owner);

            desirability = this.tweaker * ( 1 - weaponScore) * healthScore / distanceScore;
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