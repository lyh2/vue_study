import * as YUKA from 'yuka';

/**
 * 自定义Task 类，继承YUKA.Task
 * 实现路线规划任务
 */
export default class PathPlannerTask extends YUKA.Task {
  /**
   *  Construct a new PathPlannerTask with the given arguments.
   * @param {*} planner The path planner which created this task.
   * @param {*} vehicle - The vehicle for which the path is to be found.
   * @param {*} from - The start point of the path.
   * @param {*} to - The target point of the path.
   * @param {*} callback - The callback which is called after the task is finished.
   */
  constructor(planner, vehicle, from, to, callback) {
    super();

    this.callback = callback;
    this.planner = planner;
    this.vehicle = vehicle;
    this.from = from;
    this.to = to;
  }

  execute() {
    const path = this.planner.navMesh.findPath(this.from, this.to);
    this.callback(this.vehicle /*给谁规划的路线*/, path);
  }
}
