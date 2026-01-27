import * as YUKA from 'yuka';
import { CONFIG, GOALKEEPER_STATES, MESSAGE } from '../core/constants';

const _target = new YUKA.Vector3();
const _displacement = new YUKA.Vector3();

class GlobalState extends YUKA.State {
  onMessage(goalkeeper, telegram) {
    switch (telegram.message) {
      case MESSAGE.RETURN_HOME:
        {
          // 回防
          goalkeeper.setDefaultHomeRegion();
          goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.RETURN_HOME);
        }
        return true;
      case MESSAGE.RECEIVE_BALL:
        {
          // 接球,就要求，扑上去，阻止对方进球，自己就要进行拦截
          goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.INTERCEPT_BALL);
        }
        return true;
    }
    return false;
  }
}
/**
 * 回防状态，
 */
class ReturnHomeState extends YUKA.State {
  enter(goalkeeper) {
    const region = goalkeeper.getHomeRegion(); // 得到需要回防到的区域对象Region
    goalkeeper.steeringTarget.copy(region.center); // 行为的目标点
    // 使用到达行为，到某处
    const arriveBehavior = goalkeeper.steering.behaviors[0];
    arriveBehavior.target = goalkeeper.steeringTarget;
    arriveBehavior.active = true; // 激活
  }
  execute(goalkeeper) {
    // If close enough to home or the opponents get control over the ball, change state to TEND_GOAL.
    //
    if (goalkeeper.inHomeRegion() || goalkeeper.team.inControl() === false) {
      // 守门员在自己的防守区域或者自己的团队未获得控制球权,则扑向足球
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.TEND_GOAL);
    }
  }
  /**
   * 退出当前状态
   * @param {*} goalkeeper
   */
  exit(goalkeeper) {
    const arriveBehavior = goalkeeper.steering.behaviors[0]; //
    arriveBehavior.target = null; // 去掉目标
    arriveBehavior.active = false; //
  }
}

/**
 * 趋向球的行为
 */
class TendGoalState extends YUKA.State {
  enter(goalkeeper) {
    // 扑向球的行为，首先要到达指定点
    const arriveBehavior = goalkeeper.steering.behaviors[0];
    arriveBehavior.target = goalkeeper.steeringTarget;
    arriveBehavior.active = true;
  }
  /**
   * 定义如何扑向球的行为
   * @param {*} goalkeeper
   * @returns
   */
  execute(goalkeeper) {
    const ball = goalkeeper.team.ball; // 得到球

    goalkeeper.getRearInterposeTarget(_target); // 获取足球在球门范围内的投影点

    _displacement
      .subVectors(ball.position, _target)
      .normalize()
      .multiplyScalar(CONFIG.GOALKEEPER_TENDING_DISTANCE); // 得到球到球门映射点的向量

    goalkeeper.steeringTarget.copy(_target).add(_displacement); // 得到扑倒点坐标
    // If the ball comes in range the keeper traps it and then changes state to put the ball back in play.
    // 在守门员方位内
    if (goalkeeper.isBallWithinKeeperRange()) {
      ball.trap(); // 挡住球，使得球体速度为0
      goalkeeper.pitch.isGoalKeeperInBallPossession = true;
      // 相当于守门员拦截成功了进球，现在把球扔回到球场，从新开始比赛
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.PUT_BALL_BACK_IN_PLAY);
      return;
    }
    // If the keeper has ventured too far away from the goalline and there is no threat from the
    // opponents he should move back towards it.
    // 守门员远离球到球门线的投影点，且球在队友的控制之中，这守门员进行回防
    if (goalkeeper.isTooFarFromGoalMouth() && goalkeeper.team.inControl()) {
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.RETURN_HOME);
      return;
    }
    // 球已经到守门员可以扑倒、拦截的范围内，并且球队未控制住球，则守门员进行打断拦截球
    // If ball is within a predefined distance, the keeper moves out from position to try to intercept it.
    if (goalkeeper.isBallWithinRangeForIntercept() && goalkeeper.team.inControl() === false) {
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.INTERCEPT_BALL);
      return;
    }
  }

  exit(goalkeeper) {
    // 扑向球的行为，就使用ArriveBehavior
    const arriveBehavior = goalkeeper.steering.behaviors[0];
    arriveBehavior.target = null;
    arriveBehavior.active = false;
  }
}

/**
 * 截断足球状态
 */
class InterceptBallState extends YUKA.State {
  enter(goalkeeper) {
    const pursuitBehavior = goalkeeper.steering.behaviors[1];
    pursuitBehavior.evader = goalkeeper.team.ball;
    pursuitBehavior.active = true;
  }

  execute(goalkeeper) {
    // If the goalkeeper moves too far away from the goal he should return to his home region
    // UNLESS he is the closest player to the ball, in which case, he should keep trying to intercept it.

    // 守门员远离球门并且队友都远离球，则守门员需要回防
    if (goalkeeper.isTooFarFromGoalMouth() && goalkeeper.isClosestPlayerOnPitchToBall() === false) {
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.RETURN_HOME); // 进行回防
      return;
    }
    // If the ball becomes in range of the goalkeeper's hands he traps the ball and puts it back in play.
    if (goalkeeper.isBallWithinKeeperRange()) {
      const ball = goalkeeper.team.ball;
      ball.trap();
      goalkeeper.pitch.isGoalKeeperInBallPossession = true;
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.PUT_BALL_BACK_IN_PLAY);
      return;
    }
  }

  exit(goalkeeper) {
    const pursuitBehavior = goalkeeper.steering.behaviors[1];
    pursuitBehavior.evader = null;
    pursuitBehavior.active = false;
  }
}
/**
 * In this state the goalkeeper will put the ball back in play.
 *
 * @author {@link https://github.com/Mugen87|Mugen87}
 */
class PutBallBackInPlayState extends YUKA.State {
  enter(goalkeeper) {
    goalkeeper.team.setControl(goalkeeper); // 守门员控球
    goalkeeper.team.returnAllFieldPlayersToHome(); // 队员回到初始化位置
    goalkeeper.team.opposingTeam.returnAllFieldPlayersToHome(); // 对方球员回到初始化位置
  }

  execute(goalkeeper) {
    const pass = {
      // 定义传球对象，
      receiver: null, // 接球者
      target: new YUKA.Vector3(),
    };

    const team = goalkeeper.team;
    // Test if there are players further forward on the field we might be able to pass to. If so, make a pass.
    // 判断是否可以传球
    if (
      team.findPass(
        goalkeeper,
        CONFIG.PLAYER_MAX_PASSING_FORCE,
        CONFIG.GOALKEEPER_MIN_PASS_DISTANCE,
        pass
      ) !== null
    ) {
      const ball = team.ball;
      const force = new YUKA.Vector3();
      force.subVectors(pass.target, ball.position);
      ball.kick(force); // 踢球
      goalkeeper.pitch.isGoalKeeperInBallPossession = false;
      // 给队友发送接球的消息----------------------------------------------------------------
      team.sendMessage(pass.receiver, MESSAGE.RECEIVE_BALL, 0, { target: pass.target });
      //-----------------以此触发队员的状态--------------------------------------------------
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.TEND_GOAL);
      return;
    }
    goalkeeper.velocity.set(0, 0, 0);
  }
}
export { GlobalState, ReturnHomeState, TendGoalState, InterceptBallState, PutBallBackInPlayState };
