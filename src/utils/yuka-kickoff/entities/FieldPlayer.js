import * as YUKA from 'yuka';
import Player from './Player';
import { CONFIG, FIELDPLAYER_STATES } from '../core/constants';
import GlobalState, {
  ChaseBallState,
  DribbleState,
  KickBallState,
  ReceiverBallState,
  ReturnHomeState,
  SupportAttackerState,
  WaitState,
} from '../states/FieldplayerStates';

export default class FieldPlayer extends Player {
  /**
   * Constructs a new field player.
   *
   * @param {Number} role - The role of the player.
   * @param {Team} team - A reference to its team.
   * @param {Pitch} pitch - A reference to the pitch.
   * @param {Number} defaultRegionId - The id of its default home region.
   */
  constructor(role, team, pitch, defaultRegionId) {
    super(role, team, pitch, defaultRegionId);

    this.kickRegulator = new YUKA.Regulator(CONFIG.PLAYER_KICK_FREQUENCY);
    // 添加行为
    const seekBehavior = new YUKA.SeekBehavior();
    seekBehavior.active = false;
    this.steering.add(seekBehavior);

    const arriveBehavior = new YUKA.ArriveBehavior();
    arriveBehavior.active = false;
    arriveBehavior.deceleration = 1.5;
    this.steering.add(arriveBehavior);

    const pursuitBehavior = new YUKA.PursuitBehavior();
    pursuitBehavior.active = false;
    this.steering.add(pursuitBehavior);

    // states
    this.stateMachine.globalState = new GlobalState(); // 没帧都会执行的状态
    this.stateMachine.add(FIELDPLAYER_STATES.CHASE_BALL, new ChaseBallState()); //追球
    this.stateMachine.add(FIELDPLAYER_STATES.DRIBBLE, new DribbleState()); //运球
    this.stateMachine.add(FIELDPLAYER_STATES.KICK_BALL, new KickBallState()); //踢球
    this.stateMachine.add(FIELDPLAYER_STATES.RECEIVE_BALL, new ReceiverBallState()); //接球
    this.stateMachine.add(FIELDPLAYER_STATES.RETURN_HOME, new ReturnHomeState()); // 回防
    this.stateMachine.add(FIELDPLAYER_STATES.SUPPORT_ATTACKER, new SupportAttackerState()); // 辅助进攻
    this.stateMachine.add(FIELDPLAYER_STATES.WAIT, new WaitState()); // 等待
    this.stateMachine.changeTo(FIELDPLAYER_STATES.WAIT);
  }

  update(delta) {
    super.update(delta);

    // In most states field players should always focus the ball. In other states (RETURN_HOME and SUPPORT_ATTACKER) the focus point
    // depends on the current situation. It might be the ball or the current steering target.

    if (
      this.stateMachine.in(FIELDPLAYER_STATES.RETURN_HOME) === false &&
      this.stateMachine.in(FIELDPLAYER_STATES.SUPPORT_ATTACKER) === false
    ) {
      this.rotateTo(this.team.ball.position, delta);
    }
  }
  /**
   * Returns true if the field player is able to kick the ball again.
   * 球员是否准备好下一次踢球
   * @return {Boolean} Whether the field player is able to kick the ball again or not.
   */
  isReadyForNextKick() {
    return this.kickRegulator.ready();
  }
}
