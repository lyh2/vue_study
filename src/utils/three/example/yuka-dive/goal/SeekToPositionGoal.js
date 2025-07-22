/**
 * 子目标-查找目标点
 */

import * as YUKA from 'yuka';

export default class SeekToPositionGoal extends YUKA.Goal{
    constructor(owner,target = new YUKA.Vector3()){
        super(owner);

        this.target = target;
    }

    activate(){
        const owner = this.owner;
        const seekBehavior = owner.steering.behaviors[2];// 获取seekBehavior 追击行为
        seekBehavior.target.copy(this.target);
        seekBehavior.active = true;
    }

    execute(){
        if(this.owner.atPosition(this.target)){
            this.status = YUKA.Goal.STATUS.COMPLETED;
        }
    }
    /**
     * Executed when this goal is satisfied. 准备完毕之后就执行
     */
    terminate(){
        const seekBehavior = this.owner.steering.behaviors[2];
        seekBehavior.active = false; // 准备完毕还不能被激活，需要在激活状态中被激活
    }
}