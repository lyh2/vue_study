import * as YUKA from 'yuka';
import { CONFIG, ROLE } from '../core/constants';

const _quaternion = new YUKA.Quaternion();
const _displacement = new YUKA.Vector3();
const _direction = new YUKA.Vector3();
const _toPosition = new YUKA.Vector3();

export default class Player extends YUKA.Vehicle {
  /**
   * Constructs a new player.
   *
   * @param {Number} role - The role of the player.
   * @param {Team} team - A reference to its team.
   * @param {Pitch} pitch - A reference to the pitch.
   * @param {Number} defaultRegionId - The id of its default home region.
   */
  constructor(role, team, pitch, defaultRegionId) {
    super();
    this.accuracy = 0.99; // 踢球的准确性。必须在 [0,1] 范围内。值越低，玩家的表现就越差。
    this.boundingRadius = 0.2; // 半径

    this.currentDelta = 0;
    this.defaultRegionId = defaultRegionId; // 默认区域ID
    this.homeRegionId = defaultRegionId;
    this.pitch = pitch; // 球场
    this.role = role; // 角色

    this.stateMachine = new YUKA.StateMachine(this); // 状态机
    this.steeringTarget = new YUKA.Vector3(); // 行为目标点
    this.team = team;
    this.updateOrientation = false;
    this.position.copy(pitch.getRegionById(defaultRegionId).center); // 把玩家放在区域中心点位置
    this.steeringTarget.copy(this.position);
  }

  update(delta) {
    this.currentDelta = delta;
    this.stateMachine.update();
    super.update(delta);
    return this;
  }
  /**
   * Returns true if this player is at the position of its current steering target.
    如果该玩家位于其当前转向目标的位置，则返回 true。
   *
   * @return {Boolean} Whether this player is at the position of its current steering target or not.
   */
  atTarget() {
    return this.position.squaredDistanceTo(this.steeringTarget) < CONFIG.PLAYER_IN_TARGET_RANGE_SQ;
  }
  /**
   * Adds a random noice value to the given target position. This can be used to avoid
   * "perfect" kicks and introduce a natural randomness.
   *将随机噪声值添加到给定的目标位置。这可以用来避免
   * “完美”踢球并引入自然的随机性。
   *
   * @param {Vector3} target - The target position.
   * @return {Vector3} The target position.
   */
  addNoise(target) {
    const displacement = (Math.PI - Math.PI * this.accuracy) * YUKA.MathUtils.randFloat(-1, 1);
    _quaternion.fromEuler(0, displacement, 0);
    _displacement.subVectors(target, this.position).applyRotation(_quaternion);
    return target.addVectors(_displacement, this.position);
  }
  /**
   * 如果该玩家的舒适区内有对手，则返回 true。
   *
   * @return {Boolean} 该玩家是否在其所在区域。
   */
  isThreatened() {
    const opponents = this.team.opposingTeam.children;
    for (let i = 0, l = opponents.length; i < l; i++) {
      const opponent = opponents[i];
      // if opponent is in front of the player and the distance to the opponent is less than the comfort zone, return true
      if (
        this.isPositionInFrontOfPlayer(opponent.position) &&
        this.position.squaredDistanceTo(opponent.position) < CONFIG.PLAYER_COMFORT_ZONE_SQ
      ) {
        return true;
      }
    }

    return false;
  }
  /**
	* Returns true if this player is in the third of the pitch closest to the opponent’s goal.
	如果该球员位于距离对手球门最近的球场三分之一处，则返回 true。
    *
	* @return {Boolean} Whether this player is in the third of the pitch closest to the opponent’s goal or not.
	*/
  inHotRegion() {
    return this.getDistanceToOpposingGoal() < this.pitch.playingArea.width / 3;
  }
  /**
	* Returns the euclidean distance from the player's position to the opposing goal.
	 返回从玩家位置到对方球门的欧氏距离。
    *
	* @return {Number} The euclidean distance from the player's position to the opposing goal.
	*/
  getDistanceToOpposingGoal() {
    const goal = this.team.opposingTeam;
    return this.position.squaredDistanceTo(goal.position);
  }
  /**
   * Returns true if the given position is in front of the player.
   *
   * @return {Boolean} Whether the given position is in front of the player or not.
   */
  isPositionInFrontOfPlayer(position) {
    this.getDirection(_direction);
    _toPosition.subVectors(position, this.position);
    return _direction.dot(_toPosition) >= 0;
  }
  /**
   * Returns true if this player is the closes team member to the ball.
   *
   * @return {Boolean} Whether this player is the closes team member to the ball or not.
   */
  isClosestTeamMemberToBall() {
    return this === this.team.playerClosestToBall;
  }

  /**
   * Returns true if this player is close enough to the ball to kick it.
   如果该球员离球足够近，可以踢球，则返回 true。
   * @return {Boolean} Whether this player is close enough to the ball in order to kick it or not.
   */
  isBallWithinKickingRange() {
    const ball = this.team.ball;
    return this.position.squaredDistanceTo(ball.position) < CONFIG.PLAYER_RECEIVING_RANGE_SQ;
  }
  /**
   * 如果该玩家距离球足够近以开始追球，则返回 true。
   *
   * @return {Boolean} 该球员是否离球足够近以开始追球。
   */
  isBallWithinReceivingRange() {
    const ball = this.team.ball;
    return this.position.squaredDistanceTo(ball.position) < CONFIG.PLAYER_RECEIVING_RANGE_SQ;
  }
  /**
   * Returns true if this player is the closes player to the ball.
   * 判断我方球员是不是离球最近的人员
   * @return {Boolean} Whether this player is the closes player to the ball or not.
   */
  isClosestPlayerOnPitchToBall() {
    if (this.isClosestTeamMemberToBall()) {
      const ball = this.team.ball;
      const opponentClosestToBall = this.team.opposingTeam.playerClosestToBall; // 对方离球最近的球员
      return (
        this.position.squaredDistanceTo(ball.position) <
        opponentClosestToBall.position.squaredDistanceTo(ball.position)
      );
    } else {
      return false;
    }
  }
  /**
   * Returns true if this player is ahead of the team's controlling player. If the own
   * team does not possess the ball, false is returned.
   *
   * @return {Boolean} Whether this player is ahead of the team's controlling player or not.
   */
  isAheadOfAttacker() {
    const team = this.team;
    if (team.inControl()) {
      return this.getDistanceToOpposingGoal() < team.controllingPlayer.getDistanceToOpposingGoal();
    } else {
      return false;
    }
  }
  /**
   * Returns true if this player is the controlling player of the team.
   *
   * @return {Boolean} Whether this player is the controlling player of the team or not.
   */
  isControllingPlayer() {
    return this === this.team.controllingPlayer;
  }
  /**
   * 判断队员是否在自己的防守区域内
   */
  inHomeRegion() {
    const homeRegion = this.getHomeRegion();
    return homeRegion.isInside(this.position, this.role !== ROLE.GOALKEEPER);
  }
  /**
   *
   * @returns 得到指定的区域对象
   */
  getHomeRegion() {
    return this.pitch.getRegionById(this.homeRegionId);
  }

  /**
   * 设置每个队员回到自己的初始化位置
   */
  setDefaultHomeRegion() {
    this.homeRegionId = this.defaultRegionId;
  }
}
