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
        // 存在路线
        if(path !== null){
            // 开启调试
            if(owner.world.debug){
                // 开启调试
                const pathHelper = owner.pathHelper;
                pathHelper.geometry.dispose();
                pathHelper.geometry = new THREE.BufferGeometry().setFromPoints(path);
                //console.log(6,owner)
                pathHelper.visible = owner.world.uiManager.guiParameter.showPaths;
            }

            // 更新路线
            const followPathBehavior = owner.steering.behaviors[0];
            followPathBehavior.active = true; // 激活steering
            followPathBehavior.path.clear();

            const onPathBehavior = owner.steering.behaviors[1];
            onPathBehavior.active = true;
            // 添加点位到跟随路线行为的path 中
            for(let i = 0 ;i < path.length;i++){
                const waypoint = path[i];
                followPathBehavior.path.add(waypoint); // 添加点位到路径中
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
            if(owner.atPosition(this.to)){ // 是否到目标点
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
