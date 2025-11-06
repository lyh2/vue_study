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
 * 回防状态
 */
class ReturnHomeState extends YUKA.State {
  enter(goalkeeper) {
    const region = goalkeeper.getHomeRegion();
    goalkeeper.steeringTarget.copy(region.center);
    // 使用到达行为，到某处
    const arriveBehavior = goalkeeper.steering.behaviors[0];
    arriveBehavior.target = goalkeeper.steeringTarget;
    arriveBehavior.active = true;
  }
  execute(goalkeeper) {
    // If close enough to home or the opponents get control over the ball, change state to TEND_GOAL.
    // 如果距离本垒足够近或对手控制了球，则将状态更改为 TEND_GOAL。

    if (goalkeeper.inHomeRegion() || goalkeeper.team.inControl() === false) {
      // 守门员在自己的防守区域或者自己的团队未控制球权,则扑向足球
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.TEND_GOAL);
    }
  }

  exit(goalkeeper) {
    const arriveBehavior = goalkeeper.steering.behaviors[0]; //
    arriveBehavior.target = null;
    arriveBehavior.active = false;
  }
}

/**
 * 扑向球的行为
 */
class TendGoalState extends YUKA.State {
  enter(goalkeeper) {
    // 扑向球的行为，首先要到达指定点
    const arriveBehavior = goalkeeper.steering.behaviors[0];
    arriveBehavior.target = goalkeeper.steeringTarget;
    arriveBehavior.active = true;
  }

  execute(goalkeeper) {
    const ball = goalkeeper.team.ball;

    goalkeeper.getRearInterposeTarget(_target); // 获取足球在球门范围内的投影点

    _displacement.subVectors(ball.position, _target);

    goalkeeper.steeringTarget.copy(_target).add(_displacement);
    // If the ball comes in range the keeper traps it and then changes state to put the ball back in play.

    if (goalkeeper.isBallWithinKeeperRange()) {
      ball.trap();
      goalkeeper.pitch.isGoalKeeperInBallPossession = true;
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.PUT_BALL_BACK_IN_PLAY);
      return;
    }
    // If the keeper has ventured too far away from the goalline and there is no threat from the
    // opponents he should move back towards it.

    if (goalkeeper.isTooFarFromGoalMouth() && goalkeeper.team.inControl()) {
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.RETURN_HOME);
      return;
    }

    // If ball is within a predefined distance, the keeper moves out from position to try to intercept it.
    if (goalkeeper.isBallWithinRangeForIntercept() && goalkeeper.team.inControl() === false) {
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.INTERCEPT_BALL);
      return;
    }
  }

  exit(goalkeeper) {
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
    // 如果守门员距离球门太远，他应该返回自己的区域
    // 除非他是距离球最近的球员，在这种情况下，他应该继续尝试拦截球

    if (goalkeeper.isTooFarFromGoalMouth() && goalkeeper.isClosestPlayerOnPitchToBall() === false) {
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.RETURN_HOME);
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
    goalkeeper.team.setControl(goalkeeper);
    goalkeeper.team.returnAllFieldPlayersToHome();
    goalkeeper.team.opposingTeam.returnAllFieldPlayersToHome();
  }

  execute(goalkeeper) {
    const pass = {
      receiver: null,
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
      ball.kick(force);

      goalkeeper.pitch.isGoalKeeperInBallPossession = false;
      team.sendMessage(pass.receiver, MESSAGE.RECEIVE_BALL, 0, { target: pass.target });
      goalkeeper.stateMachine.changeTo(GOALKEEPER_STATES.TEND_GOAL);
      return;
    }
    goalkeeper.velocity.set(0, 0, 0);
  }
}
export { GlobalState, ReturnHomeState, TendGoalState, InterceptBallState, PutBallBackInPlayState };
