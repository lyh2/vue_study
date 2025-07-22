import * as YUKA from 'yuka';
import * as THREE from 'three';

export default class FollowPathGoal extends YUKA.Goal{
    constructor(owner){
        super(owner);

        this.to = null;
    }

    activate(){
        const owner = this.owner;
        const path = owner.path;

        if(path !== null){
            // 存在路线
            if(owner.world.debug){
                // 开启调试
                const pathHelper = owner.pathHelper;
                pathHelper.geometry.dispose();
                pathHelper.geometry = new THREE.BufferGeometry().setFromPoints(path);
                pathHelper.visible = owner.world.uiManager.debugParameter.showPaths;
            }

            // 更新路线
            const followPathBehavior = owner.steering.behaviors[0];
            followPathBehavior.active = true;
            followPathBehavior.path.clear();

            const onPathBehavior = owner.steering.behaviors[1];
            onPathBehavior.active = true;

            for(let i = 0 ;i < path.length;i++){
                const waypoint = path[i];
                followPathBehavior.path.add(waypoint);
            }

            this.to = path[path.length - 1];
        }else{
            // 不存在路线，设置状态失败
            this.status = YUKA.Goal.STATUS.FAILED;
        }
    }

    execute(){
        if(this.active()){
            const owner = this.owner;
            if(owner.atPosition(this.to)){
                this.status = YUKA.Goal.STATUS.COMPLETED;
            }
        }
    }
    /**
     * Executed when this goal is satisfied(满意的).
     * 达到满意的效果就终止目标
     */
    terminate(){
        const owner = this.owner;
        const followPathBehavior = owner.steering.behaviors[0];
        followPathBehavior.active = false;

        const onPathBehavior = owner.steering.behaviors[1];
        onPathBehavior.active = false;
    }
}
