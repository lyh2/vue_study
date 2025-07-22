import * as YUKA from 'yuka';

export default class FindPathGoal extends YUKA.Goal{
    /**
     * 
     * @param {*} owner 
     * @param {*} from 
     * @param {*} to 
     */
    constructor(owner,from,to){
        super(owner);

        this.from = from;
        this.to = to ;
    }

    activate(){
        const owner = this.owner;
        const pathPlanner = owner.world.pathPlanner;
        owner.path = null;
        pathPlanner.findPath(owner,this.from,this.to,onPathFound);

    }

    execute(){
        const owner = this.owner;
        if(owner.path){
            // 找到路线，标记此目标状态为completed 
            this.status = YUKA.Goal.STATUS.COMPLETED;
        }
    }
}

function onPathFound(owner,path){
    owner.path = path;
}