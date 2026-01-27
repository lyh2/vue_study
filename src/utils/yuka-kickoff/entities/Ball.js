import * as YUKA from 'yuka';
import { MESSAGE, TEAM } from '../core/constants';

const _acceleration = new YUKA.Vector3(); // 加速度
const _brakingForce = new YUKA.Vector3(); // 刹车
const _ray = new YUKA.Ray();
const _intersectionPoint = new YUKA.Vector3(); // 交点

/**
 * 创建足球对象，足球是一个移动的对象
 */
export default class Ball extends YUKA.MovingEntity {
  constructor(pitch /* 球场*/) {
    super();
    this.boundingRadius = 0.1; // 包围球大小
    this.mass = 0.44; // 440g
    this.maxSpeed = 42; // 速度
    this.pitch = pitch; // 球场
    this.friction = -0.8; // 摩擦力
    this.previousPosition = new YUKA.Vector3(); // 上一次的位置
  }

  update(delta) {
    this.previousPosition.copy(this.position); // 计算之前先拷贝当前位置
    _brakingForce.copy(this.velocity).normalize().multiplyScalar(this.friction); // 因为设置了摩擦力为负值，就相当于使用取反操作
    _acceleration.copy(_brakingForce).divideScalar(this.mass);
    this.velocity.add(_acceleration.multiplyScalar(delta)); // 加速度*时间
    // getSpeedSquared():Returns the current speed in squared space of this game entity.
    if (this.getSpeedSquared() < 0.0001) {
      // 速度已经很小了，就表示停止运动了
      this.velocity.set(0, 0, 0);
    }
    super.update(delta); // 调用父类的更新方法，调用之后才会更新速度等内部值
    if (this._isScored() === false) {
      // 未进球,与墙体进行碰撞检测
      this._collisionDetection();
    }
    return this;
  }
  /**
   * Checks for collisions between the ball and the walls of the pitch. When a collision is detected,
   * the ball's velocity is adjusted accordingly.
    检查球与球场墙壁之间的碰撞。当检测到碰撞时，
   * 球的速度会相应调整
   * @return {Ball} A reference to this ball.
   */
  _collisionDetection() {
    const walls = this.pitch.walls;
    // 以球的当前位置和上一个位置得到运动方向,构造射线
    _ray.origin.copy(this.previousPosition);
    _ray.direction.subVectors(this.position, this.previousPosition).normalize();
    //计算两次位置之间的距离
    const d = this.previousPosition.squaredDistanceTo(this.position);
    let closestDistance = Infinity; // 最近的距离
    let closestWall = null; // 最近的墙体
    let intersectionPoint = new YUKA.Vector3(); // 交点

    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      // 存在碰撞
      if (_ray.intersectPlane(wall, _intersectionPoint) !== null) {
        // 交点与上一个点的距离
        const s = this.previousPosition.squaredDistanceTo(_intersectionPoint);
        if (s <= d && s < closestDistance) {
          // 与墙体相交了
          closestDistance = s;
          closestWall = wall;
          intersectionPoint.copy(_intersectionPoint);
        }
      }
    }
    // 与墙发生碰撞
    if (closestWall !== null) {
      this.position.copy(this.previousPosition); // 这个可以复制交点的值
      //console.log('交点:', intersectionPoint);
      //this.position.copy(intersectionPoint); // 以交点处开启反弹
      this.velocity.reflect(closestWall.normal); // 得到速度的反射值
    }
  }
  /**
   * 判断是否得分
   * Checks if the ball crosses both goal lines on the pitch.
   * If a goal is detected, the method returns
   * true and informs both teams and the pitch about the score.
   *
   * @return {Boolean} Whether a goal was detected or not.
   *
   */
  _isScored() {
    const teamBlue = this.pitch.teamBlue;
    const teamRed = this.pitch.teamRed;

    // 篮球的球门
    const goalBlue = teamBlue.homeGoal;
    const goalRed = teamRed.homeGoal;

    // 分别计算球门，两边的柱子位置
    if (goalRed.leftPost === null) goalRed.computePosts();
    if (goalBlue.leftPost === null) goalBlue.computePosts();

    let team = null;
    // 判断球是否进入红球门
    if (
      checkLineIntersection(
        this.previousPosition.x,
        this.previousPosition.z,
        this.position.x,
        this.position.z, // 球的于东速度
        goalRed.leftPost.x, // 球门柱子位置
        goalRed.leftPost.z,
        goalRed.rightPost.x,
        goalRed.rightPost.z
      )
    ) {
      // 进了就表示蓝队胜
      team = TEAM.BLUE;
    }
    // 判断是否进入蓝队球门
    if (
      checkLineIntersection(
        this.previousPosition.x,
        this.previousPosition.z,
        this.position.x,
        this.position.z,
        goalBlue.leftPost.x,
        goalBlue.leftPost.z,
        goalBlue.rightPost.x,
        goalBlue.rightPost.z
      )
    ) {
      // 进球则红队胜
      team = TEAM.RED;
    }
    // 有一个球队进球得分
    if (team !== null) {
      // 有一队进球了、
      // 重新把球体放置在原点
      this.placeAt(new YUKA.Vector3(0, 0, 0));
      // 发送消息
      this.sendMessage(teamBlue, MESSAGE.GOAL_SCORED, 0, { team: team });
      this.sendMessage(teamRed, MESSAGE.GOAL_SCORED, 0, { team: team });
      this.sendMessage(this.pitch, MESSAGE.GOAL_SCORED, 0, { team: team });
      return true;
    }
    // 没有得分
    return false;
  }
  /**
   * 把球放在指定的位置
   * @param {*} position
   */
  placeAt(position = new YUKA.Vector3(0, 0, 0)) {
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    return this;
  }
  /**
   * 设置速度为0，表示控制住球
   * * This is used by players and goalkeepers to "trap" a ball, to stop it dead.
   * That player is then assumed to be in possession of the ball.
   * @returns
   */
  trap() {
    this.velocity.set(0, 0, 0);
    return this;
  }

  /**
   * Applies the given force to the ball. For simplicity we do no use a physical correct model here:
   *
   * 1. The ball is assumed to have a zero velocity immediately prior to a kick.
   * 2. The force and the resulting acceleration of a kick is applied in a single simulation step.
   * Hence, the lenght of the acceleration represents the new speed (and consequently the velocity) of the ball.
   *
   * @param {Vector3} force - The force.
   * @return {Ball} A reference to this ball.
   */
  kick(force) {
    _acceleration.copy(force).divideScalar(this.mass);
    this.velocity.copy(_acceleration);
    return this;
  }
  /**
   * Given a distance to cover defined by two vectors and a force, this method calculates how
   * long it will take the ball to travel between the two points.
   *
   * @param {Vector3} startPosition - The start position of the ball.
   * @param {Vector3} endPosition - The end position of the ball.
   * @param {Number} force - The force of the ball.
   * @return {Ball} A time value in second that represents how long it will take the ball to travel between the two points.
   */
  timeToCoverDistance(startPosition, endPosition, force) {
    const speed = force / this.mass;
    // Calculate the velocity at the end position using the equation: v^2 = u^2 + 2as.

    const s = startPosition.distanceTo(endPosition);
    const term = speed * speed + 2 * this.friction * s;

    // If (u^2 + 2as) is negative it means the ball cannot reach the end position.
    if (term < 0.0) {
      return -1.0;
    }

    // It IS possible for the ball to reach its destination and we know its speed when it
    // gets there, so now it's easy to calculate the time using the equation.
    //
    // t = ( v-u ) / a
    //

    return (Math.sqrt(term) - speed) / this.friction;
  }
}
/**
 * 判断位置与两个球门是否发生碰撞，这里判断的球门的底部XZ值
 *  前面四个参数是 实时位置组成的线段
 * line1-----------
 * @param {*} prevX
 * @param {*} prevZ
 * @param {*} currX
 * @param {*} currZ
 * line2 ----------
 * @param {*} leftX
 * @param {*} leftZ
 * @param {*} rightX
 * @param {*} rightZ
 */
function checkLineIntersection(
  prevX, // 上一个点的X
  prevZ, // 上一个点的Z
  currX, // 当前点的X
  currZ, // 当前点的Z
  leftX, // leftX
  leftZ, // leftZ
  rightX, // rightX
  rightZ // rightZ
) {
  let a, b;
  // 二维向量的差积表示两个向量围城的四边形的面积，是一个具体的值
  // 三维向量的差积，得到一个垂直当前平面的向量，是一个向量
  // 向量1 = (currX - prevX,currZ - prevZ)  -球运动方向的向量
  // 向量2 = (rightX - leftX,rightZ - leftZ) - 球门线的方向向量
  const denominator = (rightZ - leftZ) * (currX - prevX) - (rightX - leftX) * (currZ - prevZ);
  if (denominator === 0) {
    /**
     * - 正值：向量1在向量2的逆时针方向
        - 负值：向量1在向量2的顺时针方向
        - 零值：两个向量平行
     */
    return false;
  }
  /**
   * 数学原理：
   * ### 参数方程表示
        两条线段可以用参数方程表示：
        - 线段1：`P(t) = A + t(B - A)`，其中 `t ∈ [0,1]`
        - A = (prevX, prevZ) - 球的上一个位置
        - B = (currX, currZ) - 球的当前位置
        - 线段2：`Q(s) = C + s(D - C)`，其中 `s ∈ [0,1]`
        - C = (leftX, leftZ) - 球门左柱
        - D = (rightX, rightZ) - 球门右柱
        ### 相交条件
        当 `P(t) = Q(s)` 时，两条线段相交。这可以写成矩阵方程：
        ```javascript
        t(B - A) - s(D - C) = C - A
        ```
   */
  a = prevZ - leftZ;
  b = prevX - leftX;

  const numerator1 = (rightX - leftX) * a - (rightZ - leftZ) * b;
  const numerator2 = (currX - prevX) * a - (currZ - prevZ) * b;
  a = numerator1 / denominator;
  b = numerator2 / denominator;

  if (a > 0 && a < 1 && b > 0 && b < 1) {
    return true;
  }
  return false;
}
