import * as YUKA from 'yuka';
import FindPathGoal from './FindPathGoal';
import FollowPathGoal from './FollowPathGoal';

/**
 * 探索，随机生成一个位置
 */
export default class ExploreCompositeGoal extends YUKA.CompositeGoal{
    constructor(owner){
        super(owner);
    }

    activate(){
        const owner = this.owner;
        // 首先清除可能已经存在的子目标
        this.clearSubgoals();
        // 在map 上计算一个随机的位置
        const region = owner.world.navMesh.getRandomRegion(); // 得到一个随机区域
        const from = new YUKA.Vector3().copy(owner.position);
        const to = new YUKA.Vector3().copy(region.centroid);// 区域的中心点

        this.addSubgoal(new FindPathGoal(owner,from,to));
        this.addSubgoal(new FollowPathGoal(owner));
    }

    execute(){
        this.status = this.executeSubgoals();
        this.replanIfFailed();
    }

    terminate(){
        this.clearSubgoals();
    }
}