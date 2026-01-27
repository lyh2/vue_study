import * as YUKA from 'yuka';
import Player from './Player';
import { CONFIG, GOALKEEPER_STATES, ROLE } from '../core/constants';
import {
  GlobalState,
  InterceptBallState,
  PutBallBackInPlayState,
  ReturnHomeState,
  TendGoalState,
} from '../states/GoalkeeperStates';

const _target = new YUKA.Vector3();

/**
 * 创建守门员基类
 */
export default class Goalkeeper extends Player {
  /**
   * Constructs a new goalkeeper.
   *
   * @param {Team} team - A reference to its team.
   * @param {Pitch} pitch - A reference to the pitch.
   * @param {Number} defaultRegionId - The id of its default home region.
   */
  constructor(team, pitch, defaultRegionId) {
    super(ROLE.GOALKEEPER, team, pitch, defaultRegionId);

    // 添加到达行为
    this.maxSpeed = 1.5;
    const arriveBehavior = new YUKA.ArriveBehavior();
    arriveBehavior.deceleration = 1;
    arriveBehavior.active = false;
    this.steering.add(arriveBehavior);

    // 追击行为
    const pursuitBehavior = new YUKA.PursuitBehavior();
    pursuitBehavior.active = false;
    this.steering.add(pursuitBehavior);

    // states
    this.stateMachine.globalState = new GlobalState();
    this.stateMachine.add(GOALKEEPER_STATES.RETURN_HOME, new ReturnHomeState());
    this.stateMachine.add(GOALKEEPER_STATES.TEND_GOAL, new TendGoalState());
    this.stateMachine.add(GOALKEEPER_STATES.INTERCEPT_BALL, new InterceptBallState());
    this.stateMachine.add(GOALKEEPER_STATES.PUT_BALL_BACK_IN_PLAY, new PutBallBackInPlayState());

    this.stateMachine.changeTo(GOALKEEPER_STATES.TEND_GOAL); // 初始化扑向球的状态
  }

  /**
   * 判断球是否在守门员范围内，计算球与守门员之间的距离，是否在某个阈值内
   */
  isBallWithinKeeperRange() {
    const ball = this.team.ball;
    return this.position.squaredDistanceTo(ball.position) < CONFIG.GOALKEEPER_IN_TARGET_RANGE_SQ;
  }
  /**
   * 球到离球门某个方位内
   * @returns
   */
  isBallWithinRangeForIntercept() {
    const ball = this.team.ball;
    const goal = this.team.homeGoal;
    return goal.position.squaredDistanceTo(ball.position) <= CONFIG.GOALKEEPER_INTERCEPT_RANGE_SQ;
  }

  /**
   * Returns true if the goalkeeper is too far away from the goalmouth.
   * 守门员远离球的投影点
   * @return {Boolean} Whether the goalkeeper is too far away from the goalmouth or not.
   */
  isTooFarFromGoalMouth() {
    this.getRearInterposeTarget(_target);
    return this.position.squaredDistanceTo(_target) > CONFIG.GOALKEEPER_INTERCEPT_RANGE_SQ;
  }
  /**
   * 把球的位置投影到球门线上的某点
   * @param {*} target
   */
  getRearInterposeTarget(target) {
    const pitch = this.pitch; // 获取球场
    const ball = this.team.ball; // 获得足球
    const goal = this.team.homeGoal; // 获得球门

    target.x = goal.position.x; // 球门的x轴位置
    target.y = 0;
    //这个公式将球在球场上的横向位置按比例映射到球门的宽度范围上：
    target.z = ball.position.z * (goal.width / pitch.playingArea.height);
    // 8 * 2 / 10= 1.6 ；球原来的位置 (0,0,8)=>(0,0,1.6)
    return target;
  }
}
