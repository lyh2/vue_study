import * as YUKA from 'yuka';
import ExploreCompositeGoal from '../goal/ExploreCompositeGoal';

/**
 * ExploreEvaluator: 探索评估器
 */
export default class ExploreEvaluator extends YUKA.GoalEvaluator{
    constructor(characterBias = 1){
        super(characterBias);
    }

    /**
    	* Calculates the desirability. It's a score between 0 and 1 representing the desirability
	* of a goal.
     */
    calculateDesirability(){
        return 0.1;
    }

    setGoal(owner){
        const currentSubgoal = owner.brain.currentSubgoal();
        if((currentSubgoal instanceof ExploreCompositeGoal) === false){
            owner.brain.clearSubgoals();
            owner.brain.addSubgoal(new ExploreCompositeGoal(owner));
        }
    }
}
