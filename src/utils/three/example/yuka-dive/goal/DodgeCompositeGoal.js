/**
 * Dodge: 闪避；避开；躲开；
 */

import * as YUKA from 'yuka';
import SeekToPositionGoal from './SeekToPositionGoal';

const right = new YUKA.Vector3(1,0,0);
const left = new YUKA.Vector3(-1,0,0);

export default class DodgeCompositeGoal extends YUKA.CompositeGoal{
    
    /**
     * 
     * @param {*} owner - enemy
     * @param {*} right - 向右
     */
    constructor(owner,right){
        super(owner);

        this.right = right;
        this.targetPosition = new YUKA.Vector3();
    }
    /**
     * 被激活时执行
     */
    activate(){
        this.clearSubgoals();// 清除所有的子目标

        const owner = this.owner;

        if(this.right){
            // 可以向右移动足够的空间
            if(owner.canMoveInDirection(right,this.targetPosition)){
                this.addSubgoal(new SeekToPositionGoal(owner,this.targetPosition));
            }else{
                // 没有任何空间可以移动的空间，向左移动
                this.right = false;
                this.status = YUKA.Goal.STATUS.INACTIVE;// 设置状态为 “未激活状态”
            }
        }else{
            // 向左移动
            if(owner.canMoveInDirection(left,this.targetPosition)){
                this.addSubgoal(new SeekToPositionGoal(owner,this.targetPosition));
            }else{
                // 没有任何可移动的空间，向右移动
                this.right = true;
                this.status = YUKA.Goal.STATUS.INACTIVE;
            }
        }
    }

    execute(){
        if(this.active()){
            const owner = this.owner;

            if(owner.targetSystem.isTargetShootable() === false){
                // 没有遇到敌人
                this.statuc = YUKA.Goal.STATUS.COMPLETED;
            }else{
                // 遇到敌人
                this.status = this.executeSubgoals();// 执行当前目标中的所有子目标
                this.replanIfFailed();// 执行失败重新执行
                if(this.completed()) this.status = YUKA.Goal.STATUS.INACTIVE;
            }
        }
    }
    /**
     * Executed when this goal is satisfied.
     */
    terminate(){
        this.clearSubgoals();
    }
}