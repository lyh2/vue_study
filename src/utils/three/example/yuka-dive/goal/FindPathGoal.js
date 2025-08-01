import * as YUKA from 'yuka';
/**
 * FindPathGoal: 查找到目标点的路径
 */
export default class FindPathGoal extends YUKA.Goal {
  /**
   * 查找路线
   * @param {*} owner
   * @param {*} from
   * @param {*} to
   */
  constructor(owner, from, to) {
    super(owner);

    this.from = from;
    this.to = to;
  }

  activate() {
    const owner = this.owner; // enemy or player 对象
    const pathPlanner = owner.world.pathPlanner; // 路线规划
    owner.path = null; // 清除之前的路径

    pathPlanner.findPath(owner, this.from, this.to, onPathFound);
  }

  execute() {
    const owner = this.owner;
    if (owner.path) {
      // 找到路线，标记此目标状态为completed
      this.status = YUKA.Goal.STATUS.COMPLETED;
    }
  }
}
/**
 * 给当前owner.path 属性赋值 路线数据
 */
function onPathFound(owner, path) {
  owner.path = path;
}
