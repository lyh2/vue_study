import * as YUKA from 'yuka';
import { CONFIG, FIELDPLAYER_STATES, MESSAGE, ROLE } from '../core/constants';

const _kickForce = new YUKA.Vector3();
const _shootTarget = new YUKA.Vector3();
const _facingDirection = new YUKA.Vector3();
const _goalDirection = new YUKA.Vector3();
const _rotation = new YUKA.Quaternion();
const _toBall = new YUKA.Vector3();

export default class GlobalState extends YUKA.State {
  execute(player) {
    //
    // 如果球员控球并且靠近球，则降低他的最大速度。
    if (player.isControllingPlayer() && player.isBallWithinReceivingRange()) {
      player.maxSpeed = CONFIG.PLAYER_MAX_SPEED_WITH_BALL;
    } else {
      player.maxSpeed = CONFIG.PLAYER_MAX_SPEED_WITHOUT_BALL;
    }
  }

  onMessage(player, telegram) {
    switch (telegram.message) {
      case MESSAGE.RETURN_HOME: // 回防
        {
          player.setDefaultHomeRegion();
          player.steeringTarget.copy(player.getHomeRegion().center);
          player.stateMachine.changeTo(FIELDPLAYER_STATES.RETURN_HOME);
        }
        return true;
      case MESSAGE.PASS_TO_ME: // 传球
        {
          // 如果已经有接球球员或者球不在踢球范围内，
          // 该球员不能将球传给提出请求的球员。
          if (player.team.receivingPlayer !== null || player.isBallWithinKickingRange() === false) {
            return true;
          }

          const requester = telegram.data.requester;
          const ball = player.team.ball;

          // Make pass
          _kickForce
            .subVectors(requester.position, ball.position)
            .normalize()
            .multiplyScalar(CONFIG.PLAYER_MAX_PASSING_FORCE);
          ball.kick(_kickForce);
          // 让接球者知道传球即将到来。
          player.team.sendMessage(requester, MESSAGE.RECEIVE_BALL, 0, {
            target: requester.position.clone(),
            msg: '接球',
          });
          player.stateMachine.changeTo(FIELDPLAYER_STATES.WAIT);
          //
          player.team.findSupport();
        }
        return true;
      case MESSAGE.RECEIVE_BALL: // 接球
        {
          player.steeringTarget.copy(telegram.data.target);
          player.stateMachine.changeTo(FIELDPLAYER_STATES.RECEIVE_BALL);
        }
        return true;
      case MESSAGE.SUPPORT_ATTACKER:
        {
          if (player.stateMachine.in(FIELDPLAYER_STATES.SUPPORT_ATTACKER)) return true;
          player.steeringTarget.copy(player.team.getSupportPosition());
          player.stateMachine.changeTo(FIELDPLAYER_STATES.SUPPORT_ATTACKER);
        }
        return true;
    }
    return false;
  }
}

/**
* In this state the field player will try to seek to the ball position.
在这种状态下，场上球员将尝试寻找球的位置。
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class ChaseBallState extends YUKA.State {
  entry(player) {
    // 开启搜索行为
    const seekBehavior = player.steering.behaviors[0];
    seekBehavior.target = player.steeringTarget;
    seekBehavior.active = true;
  }

  execute(player) {
    // If the ball is within kicking range the player changes state to KICK_BALL.
    // 在可射击的方位，切换射击状态
    if (player.isBallWithinKickingRange()) {
      player.stateMachine.changeTo(FIELDPLAYER_STATES.KICK_BALL);
      return;
    }
    // If the player is the closest player to the ball then he should keep chasing it.
    // 如果球员是距离球最近的球员，那么他应该继续追球
    if (player.isClosestTeamMemberToBall()) {
      const ball = player.team.ball;
      player.steeringTarget.copy(ball.position);
      return;
    }
    // If the player is not closest to the ball anymore, he should return back to his home region and wait for another opportunity.
    // 如果球员不再距离球最近，他应该返回自己的区域并等待另一个机会。
    player.stateMachine.changeTo(FIELDPLAYER_STATES.RETURN_HOME);
  }

  exit(player) {
    const seekBehavior = player.steering.behaviors[0];
    seekBehavior.target = null;
    seekBehavior.active = false;
  }
}

/**
 * In this state the ball controlling field player moves to the opposing goal.
 * 控球员移动到对方球门
 * @author {@link https://github.com/Mugen87|Mugen87}
 */
class DribbleState extends YUKA.State {
  entry(player) {
    player.team.setControl(player);
  }
  execute(player) {
    const ball = player.team.ball;
    player.getDirection(_facingDirection);
    player.team.homeGoal.getDirection(_goalDirection); // 球门方向
    const dot = _facingDirection.dot(_goalDirection);

    if (dot < 0) {
      const sign =
        _facingDirection.x * _goalDirection.z < _facingDirection.z * _goalDirection.x ? 1 : -1;
      _rotation.fromEuler(0, Math.PI * 0.25 * sign, 0);
      _facingDirection.applyRotation(_rotation).normalize();
      _kickForce.copy(_facingDirection).multiplyScalar(CONFIG.PLAYER_MAX_DRIBBLE_AND_TURN_FORCE);
      ball.kick(_kickForce);
    } else {
      _kickForce.copy(_goalDirection).multiplyScalar(CONFIG.PLAYER_MAX_DRIBBLE_FORCE);
      ball.kick(_kickForce);
    }
    player.stateMachine.changeTo(FIELDPLAYER_STATES.CHASE_BALL);
  }
}

/**
 * 在这种状态下，球员踢球。玩家可以射门或传球给队友。
 *
 * @author {@link https://github.com/Mugen87|Mugen87}
 */
class KickBallState extends YUKA.State {
  enter(player) {
    player.team.setControl(player);
    // 玩家每秒只能踢特定数量的球。
    // The player can only make a specific amount of kicks per second.
    if (player.isReadyForNextKick() === false) {
      player.stateMachine.changeTo(FIELDPLAYER_STATES.CHASE_BALL);
    }
  }

  execute(player) {
    const team = player.team;
    const ball = team.ball;
    const pitch = player.pitch;
    // Compute the dot product of the vector pointing to the ball and the player's heading.
    // 计算指向球的向量与球员航向的点积。
    _toBall.subVectors(ball.position, player.position);
    player.getDirection(_facingDirection);
    const dot = _toBall.dot(_facingDirection);

    // Cannot kick the ball if the goalkeeper is in possession or if it is behind the player
    // or if there is already an assigned receiver. So just continue chasing the ball.

    // 如果守门员控球或球在球员身后，则不能踢球
    // 或者如果已经有指定的接收者。所以就继续追球吧。
    if (pitch.isGoalKeeperInBallPossession || dot < 0 || team.receivingPlayer !== null) {
      player.stateMachine.changeTo(FIELDPLAYER_STATES.CHASE_BALL);
      return;
    }
    /* attempt a shot at the goal */

    // The dot product is used to adjust the shooting force. The more
    // directly the ball is ahead, the more forceful the kick.
    let power = CONFIG.PLAYER_MAX_SHOOTING_FORCE * dot;
    // If it is determined that the player could score a goal from this position OR if he should just kick the ball anyway,
    // the player will  attempt to make the shot.
    if (
      team.canShoot(ball.position, power, _shootTarget) ||
      Math.random() < CONFIG.PLAYER_CHANCE_ATTEMPT_POT_SHOT
    ) {
      // Add some noise to the kick. Avoid players who are too accurate.
      // 给踢球添加一些噪音。避免过于准确的玩家。
      player.addNoise(_shootTarget);
      // This is the direction the ball will be kicked in.
      _kickForce.subVectors(_shootTarget, ball.position).normalize().multiplyScalar(power);
      // kick
      ball.kick(_kickForce);
      // Change state
      player.stateMachine.changeTo(FIELDPLAYER_STATES.WAIT);
      // Update supporting attacker.

      team.findSupport();
      return;
    }
    /* attempt a pass to a player */
    power = CONFIG.PLAYER_MAX_PASSING_FORCE * dot;
    const pass = {
      receiver: null,
      target: new YUKA.Vector3(),
    };
    // Test if there are any potential candidates available to receive a pass.
    if (
      player.isThreatened() &&
      team.findPass(player, power, CONFIG.PLAYER_MIN_PASS_DISTANCE, pass)
    ) {
      player.addNoise(pass.target);
      _kickForce.subVectors(pass.target, ball.position).normalize().multiplyScalar(power);
      ball.kick(_kickForce);
      // Let the receiving player know the ball's coming at him.
      team.sendMessage(pass.receiver, MESSAGE.RECEIVE_BALL, 0, { target: pass.target });
      // The player should wait at his current position unless instructed otherwise.
      player.stateMachine.changeTo(FIELDPLAYER_STATES.WAIT);
      team.findSupport();
    } else {
      player.stateMachine.changeTo(FIELDPLAYER_STATES.DRIBBLE);
      team.findSupport();
    }
  }
}

/**
 * In this state the field player receives the ball.
 * 球员去接球
 * @author {@link https://github.com/Mugen87|Mugen87}
 */
class ReceiverBallState extends YUKA.State {
  enter(player) {
    const team = player.team;
    team.receivingPlayer = player;
    team.setControl(player);
    // There are two types of receive behavior. One uses arrive to direct the
    // receiver to the position sent by the passer in its message. The other
    // uses the pursuit behavior to pursue the ball. This statement selects
    // between them dependent on the probability
    // PLAYER_CHANCE_OF_USING_ARRIVE_TYPE_RECEIVE_BEHAVIOR, whether or not an opposing
    // player is close to the receiving player, and whether or not the receiving
    // player is in the opponents "hot region" (the third of the pitch closest
    // to the opponent's goal).

    if (
      (player.inHotRegion() ||
        Math.random() > CONFIG.PLAYER_CHANCE_OF_USING_ARRIVE_TYPE_RECEIVE_BEHAVIOR) &&
      player.team.isOpponentWithinRadius(player, CONFIG.PLAYER_PASS_THREAD_RADIUS)
    ) {
      //
      const pursuitBehavior = player.steering.behaviors[2];
      pursuitBehavior.evader = team.ball;
      pursuitBehavior.active = true;
    } else {
      const arriveBehavior = player.steering.behaviors[1];
      arriveBehavior.target = player.steeringTarget;
      arriveBehavior.active = true;
    }
  }

  execute(player) {
    // If the ball comes close enough to the player or if his team lose
    // control he should change state to chase the ball.
    // 如果球距离球员足够近或者他的球队输了
    // 控制他应该改变状态去追球。
    if (player.isBallWithInReceivingRange() || player.team.inControl() === false) {
      player.stateMachine.changeTo(FIELDPLAYER_STATES.CHASE_BALL);
      return;
    }
    // If "pursuit" is active, it's necessary to update the target position.
    const pursuitBehavior = player.steering.behaviors[2];
    const ball = player.team.ball;
    if (pursuitBehavior.active) {
      player.steeringTarget.copy(ball.position);
    }
    // If the player has "arrived" at the steering target, he should wait.
    if (player.atTarget()) {
      const arriveBehavior = player.steering.behaviors[1];
      arriveBehavior.target = null;
      arriveBehavior.active = false;

      const pursuitBehavior = player.steering.behaviors[2];
      pursuitBehavior.evader = null;
      pursuitBehavior.active = false;
      player.velocity.set(0, 0, 0);
    }
  }

  exit(player) {
    const arriveBehavior = player.steering.behaviors[1];
    arriveBehavior.target = null;
    arriveBehavior.active = false;

    const pursuitBehavior = player.steering.behaviors[2];
    pursuitBehavior.evader = null;
    pursuitBehavior.active = false;

    player.team.receivingPlayer = null;
  }
}

/**
 * In this state the field player will return to his home region.
 *
 * @author {@link https://github.com/Mugen87|Mugen87}
 */
class ReturnHomeState extends YUKA.State {
  enter(player) {
    const arriveBehavior = player.steering.behaviors[1];
    arriveBehavior.target = player.steeringTarget;
    arriveBehavior.active = true;
    // Ensure the player's steering target is within the home region.
    if (player.getHomeRegion().isInside(player.steeringTarget, true) === false) {
      player.steeringTarget.copy(player.getHomeRegion().center);
    }
  }

  execute(player) {
    const pitch = player.pitch;
    if (pitch.isPlaying) {
      // If the ball is nearer this player than any other team member &&
      // there is not an assigned receiver && the goalkeeper does not have the ball, go chase it.
      if (
        player.isClosestTeamMemberToBall() &&
        player.team.receivingPlayer === null &&
        pitch.isGoalKeeperInBallPossession === false
      ) {
        player.stateMachine.changeTo(FIELDPLAYER_STATES.CHASE_BALL);
        return;
      }
    }

    // If game is on and the player is close enough to home, change state to
    // wait and set the player target to his current position.
    if (pitch.isPlaying && player.inHomeRegion()) {
      player.steeringTarget.copy(player.position);
      player.stateMachine.changeTo(FIELDPLAYER_STATES.WAIT);
    } else if (pitch.isPlaying === false && player.atTarget()) {
      player.stateMachine.changeTo(FIELDPLAYER_STATES.WAIT);
    }
    player.rotateTo(player.steeringTarget, player.currentDelta);
  }

  exit(player) {
    const arriveBehavior = player.steering.behaviors[1];
    arriveBehavior.target = null;
    arriveBehavior.active = false;
  }
}

/**
 * In this state the field player will try to support to the attacker.
 * 支持进攻
 * @author {@link https://github.com/Mugen87|Mugen87}
 */
class SupportAttackerState extends YUKA.State {
  enter(player) {
    player.steeringTarget.copy(player.team.getSupportPosition());
    const arriveBehavior = player.steering.behaviors[1];
    arriveBehavior.target = player.steeringTarget;
    arriveBehavior.active = true;
  }

  execute(player) {
    const team = player.team;
    // 失去对球队的控制权，就回防
    if (team.inControl() === false) {
      player.stateMachine.changeTo(FIELDPLAYER_STATES.RETURN_HOME);
      return;
    }
    // If the player becomes suddenly the closest player to the ball AND there is no receiving player then chase the ball.

    // 如果球员突然成为距离球最近的球员并且没有接球球员，则追球。
    if (player.isClosestTeamMemberToBal() && player.receivingPlayer === null) {
      player.stateMachine.changeTo(FIELDPLAYER_STATES.CHASE_BALL);
      return;
    }
    // If the best supporting spot changes, change the steering target.
    //如果最佳支撑点发生变化，则改变转向目标
    if (team.getSupportPosition().equals(player.steeringTarget) === false) {
      player.steeringTarget.copy(team.getSupportPosition());
      const arriveBehavior = player.steering.behaviors[1];
      arriveBehavior.active = true;
    }

    // If this player has a shot at the goal AND the attacker can pass the ball to him the attacker should pass the ball to this player.

    // 如果该球员射门并且进攻者可以将球传给他，则进攻者应该将球传给该球员。
    if (team.canShoot(player.position, CONFIG.PLAYER_MAX_SHOOTING_FORCE, _shootTarget)) {
      team.requestPass(player);
    }
    // If this player is located at the support spot and his team still have
    // possession, he should remain still and turn to face the ball.

    if (player.atTarget()) {
      const arriveBehavior = player.steering.behaviors[1];
      arriveBehavior.active = false;
      // The player should keep his eyes on the ball.
      player.rotateTo(team.ball.position, player.currentDelta);
      player.velocity.set(0, 0, 0);
      // If not threatened by another player request a pass.
      // 如果没有受到其他球员的威胁，请请求传球
      if (player.isThreatened() === false) {
        team.requestPass(player);
      }
    } else {
      player.rotateTo(player.steeringTarget, player.currentDelta);
    }
  }

  exit(player) {
    player.team.supportingPlayer = null;
    const arriveBehavior = player.steering.behaviors[1];
    arriveBehavior.target = null;
    arriveBehavior.active = false;
  }
}

/**
 * In this state the field player will wait in his home region.
 *
 * @author {@link https://github.com/Mugen87|Mugen87}
 */
class WaitState extends YUKA.State {
  execute(player) {
    const team = player.team;
    const pitch = player.pitch;

    const arriveBehavior = player.steering.behaviors[1];
    // If players are in this state and the team strategy changes, it is necessary
    // that the players moves to an updated steering target.

    if (player.atTarget() === false) {
      arriveBehavior.target = player.steeringTarget;
      arriveBehavior.active = true;
    } else {
      arriveBehavior.target = null;
      arriveBehavior.active = false;

      player.velocity.set(0, 0, 0);
    }

    if (pitch.isPlaying) {
      // If the ball is nearer to this player than any other team member AND
      // there is not an assigned receiver AND neither goalkeeper has the
      // ball, go chase it.
      // 如果球比任何其他队员更靠近该球员并且
      // 没有指定的接球手并且守门员都没有
      // 球，去追吧。
      if (
        player.isClosestTeamMemberToBall() &&
        team.receivingPlayer === null &&
        pitch.isGoalKeeperInBallPossession === false
      ) {
        player.stateMachine.changeTo(FIELDPLAYER_STATES.CHASE_BALL);
        return;
      }
    }
    // If this player's team is controlling AND this player is not the
    // attacker AND is further up the field than the attacker AND if the controlling player
    // is not the goalkeeper he should request a pass

    if (
      team.inControl() &&
      player.isControllingPlayer === false &&
      player.isAheadOfAttacker() &&
      team.controllingPlayer.role !== ROLE.GOALKEEPER
    ) {
      team.requestPass(player);
    }
  }

  exit(player) {
    const arriveBehavior = player.steering.behaviors[1];
    arriveBehavior.target = null;
    arriveBehavior.active = false;
  }
}

export {
  ChaseBallState,
  DribbleState,
  GlobalState,
  KickBallState,
  ReceiverBallState,
  ReturnHomeState,
  SupportAttackerState,
  WaitState,
};
