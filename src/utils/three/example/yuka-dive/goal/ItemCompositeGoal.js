import * as YUKA from 'yuka';
import GameConfig from '../core/GameConfig';
import FindPathGoal from './FindPathGoal';
import FollowPathGoal from './FollowPathGoal';

const result = {distance:Infinity,item:null};

/**
 * 根据类型得到指定的对象:血包，武器等其他装备
 */
export default class ItemCompositeGoal extends YUKA.CompositeGoal{
    constructor(owner,itemType,item= null){
        super(owner);
        this.itemType = itemType;
        this.item = item;

        this.regulator = new YUKA.Regulator(GameConfig.BOT.GOAL.ITEM_VISIBILITY_UPDATE_FREQUENCY);
    }

    activate(){
        const owner = this.owner;
        this.clearSubgoals();

        // 得到最近的对象
        owner.world.getClosestItem(owner,this.itemType,result);
        this.item = result.item;

        if(this.item){
			// if an item was found, try to pick it up
            const from = new YUKA.Vector3().copy(owner.position);
            const to = new YUKA.Vector3().copy(this.item.position);

            this.addSubgoal(new FindPathGoal(owner,from,to));
            this.addSubgoal(new FollowPathGoal(owner));
        }else{
            // 没有获取到，设置目标失败
            this.status = YUKA.Goal.STATUS.FAILED;
			// ensure the bot does not look for this type of item for a while
            // 确保机器人一段时间内不寻找此类项目
            owner.ignoreItem(this.itemType);
        }
    }

    execute(){
        if(this.active()){
            // 只检测当前对象可见的项目
            if(this.regulator.ready() && this.owner.vision.visible(this.item.position)){
                if(this.item.active === false){
                    this.status = YUKA.Goal.STATUS.FAILED;

                }else{
                    this.status = this.executeSubgoals();
                }
            }else{
                this.status = this.executeSubgoals();
            }
            this.replanIfFailed();
        }
    }

    terminate(){
        this.clearSubgoals();
    }
}