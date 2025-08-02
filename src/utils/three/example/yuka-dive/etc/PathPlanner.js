import * as YUKA from 'yuka';
import PathPlannerTask from './PathPlannerTask';
/**
 * 路线规划
 */
export default class PathPlanner {
  /**
   *
   * @param {YUKA.NavMesh 对象} navMesh
   */
  constructor(navMesh) {
    this.navMesh = navMesh; // 导航的网格
    this.taskQueue = new YUKA.TaskQueue(); // 创建一个任务队列
  }
  /**
   * Creates a new task for pathfinding and adds the task to the queue
   * @param {*} vehicle
   * @param {*} from
   * @param {*} to
   * @param {*} callback
   */
  findPath(vehicle, from, to, callback) {
    // 床架路线规划任务
    const task = new PathPlannerTask(this, vehicle, from, to, callback);
    this.taskQueue.enqueue(task); // 把任务加入到队列中
  }

  update() {
    this.taskQueue.update();
  }
}
