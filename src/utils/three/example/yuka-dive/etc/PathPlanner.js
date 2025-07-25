import * as YUKA from 'yuka';
import PathPlannerTask from './PathPlannerTask';
/**
 * 路线规划
 */
export default class PathPlanner{

    /**
     * 
     * @param {YUKA.NavMesh 对象} navMesh 
     */
    constructor(navMesh){
        this.navMesh = navMesh;
        this.taskQueue = new YUKA.TaskQueue();

    }
    /**
     * Creates a new task for pathfinding and adds the task to the queue
     * @param {*} vehicle 
     * @param {*} from 
     * @param {*} to 
     * @param {*} callback 
     */
    findPath(vehicle,from,to,callback){
        const task = new PathPlannerTask(this,vehicle,from,to,callback);
        this.taskQueue.enqueue(task);
    }

    update(){
        this.taskQueue.update();
    }
}