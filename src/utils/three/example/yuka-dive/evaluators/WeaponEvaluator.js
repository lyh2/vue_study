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
    /**
     * 计算武器的期望值
     * @param {*} owner 
     * @returns 
     */
    calculateDesirability(owner){
        let desirability = 0;

        if(owner.isItemIgnored(this.itemType) === false){
            /**
             * 
                | 因子 | 计算方法 | 影响方向 |
                |---|---|---|
                | distanceScore | 到武器的距离 | 反比影响（距离↑→期望↓） |
                | weaponScore | 当前武器强度（子弹剩余比例） | 反比影响（强度↑→期望↓） |
                | healthScore | 角色健康状态 | 正比影响（健康↑→期望↑） |
             */
            const distanceScore = Feature.distanceToItem(owner,this.itemType);
            const weaponScore = Feature.individualWeaponStrength(owner,this.itemType); // 剩余子弹数 / 子弹总数
            const healthScore = Feature.health(owner);
            /**
             * - 健康角色更愿冒险获取武器（healthScore↑）
                - 弹药不足时武器价值更高（1-weaponScore↑）
                - 距离成本制约行动决策（distanceScore↓优先）
             */
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