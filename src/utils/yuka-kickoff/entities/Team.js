import * as YUKA from 'yuka';
import { CONFIG, FIELDPLAYER_STATES, MESSAGE, ROLE, TEAM, TEAM_STATES } from '../core/constants';
import SupportSpotCalculator from '../etc/SupportSpotCalculator';
import {
  AttackingState,
  DefendingState,
  GlobalState,
  PrepareForKickOffState,
} from '../states/TeamStates';
import Goalkeeper from './Goalkeeper';
import FieldPlayer from './FieldPlayer';

const _direction = new YUKA.Vector3();
const _rotation = new YUKA.Quaternion();
const _matrix = new YUKA.Matrix4();
const _inverseMatrix = new YUKA.Matrix4();

const _forward = new YUKA.Vector3(0, 0, 1);
const _up = new YUKA.Vector3(0, 1, 0);
const _scale = new YUKA.Vector3(1, 1, 1);

const _localPositionOfOpponent = new YUKA.Vector3();
const _startPosition = new YUKA.Vector3();
const _endPosition = new YUKA.Vector3();

const _blueDefendingRegions = [1, 6, 8, 3, 5];
const _blueAttackingRegions = [1, 12, 14, 4, 8];

const _redDefendingRegions = [16, 9, 11, 12, 14];
const _redAttackingRegions = [16, 3, 5, 10, 11];

const _passes = [];
const _toPoint = new YUKA.Vector3();
const _tangent1 = new YUKA.Vector3();
const _tangent2 = new YUKA.Vector3();
const _target = new YUKA.Vector3();

export default class Team extends YUKA.GameEntity {
  /**
   *
   * @param {*} color - 球队颜色
   * @param {*} ball 足球对象，释放一个entity
   * @param {*} pitch 足球场
   * @param {*} homeGoal 自己的球门
   * @param {*} opposingGoal -对手球门
   */
  constructor(color, ball, pitch, homeGoal, opposingGoal) {
    super();

    this.ball = ball; // 足球
    this.color = color; // 球队的颜色
    this.controllingPlayer = null; // 当前谁控制球队
    this.goals = 0; // 当前球队的得分数
    this.homeGoal = homeGoal; // 自己的球门
    this.opposingGoal = opposingGoal; // 对手的球门
    this.opposingTeam = null; // 对手球队

    this.playerClosestToBall = null; // 离球最近的队员
    this.pitch = pitch; // 球场
    this.receivingPlayer = null; // 准备接球的
    this.stateMachine = new YUKA.StateMachine(this /* team*/);
    this.supportingPlayer = null; // 支持球员
    this.supportSpotCalculator = new SupportSpotCalculator(this); // 用于计算队员应该如何支持其他队员

    // states
    // globalState :State
    // This state logic is called every time the state machine is updated.
    this.stateMachine.globalState = new GlobalState(); // 在状态机中没帧都会被执行的状态
    // 球队有进攻、防守、开球三种状态
    this.stateMachine.add(TEAM_STATES.ATTACKING, new AttackingState());
    this.stateMachine.add(TEAM_STATES.DEFENDING, new DefendingState());
    this.stateMachine.add(TEAM_STATES.PREPARE_FOR_KICKOFF, new PrepareForKickOffState());

    this.stateMachine.changeTo(TEAM_STATES.DEFENDING);

    this.createPlayers();
  }

  update(delta) {
    this._computePlayerClosestToBall();

    this.stateMachine.update(delta);
    return this;
  }
  /**
   * 创建球队的球员、还要确保球员朝着对方的目标前进。
   */
  createPlayers() {
    let rotation = Math.PI * 0.5;
    let regions;

    if (TEAM.RED === this.color) {
      // 红队，在+X轴处，需要朝向-X
      regions = _redDefendingRegions;
      rotation *= -1; // 朝向-x
    } else {
      // 蓝队
      regions = _blueDefendingRegions;
    }

    // 创建守门员
    const goalkeeper = new Goalkeeper(this, this.pitch, regions[0]);
    goalkeeper.rotation.fromEuler(0, rotation, 0);
    this.add(goalkeeper);

    const fieldPlayer1 = new FieldPlayer(ROLE.ATTACKER, this, this.pitch, regions[1]);
    fieldPlayer1.rotation.fromEuler(0, rotation, 0);
    this.add(fieldPlayer1);

    const fieldPlayer2 = new FieldPlayer(ROLE.ATTACKER, this, this.pitch, regions[2]);
    fieldPlayer2.rotation.fromEuler(0, rotation, 0);
    this.add(fieldPlayer2);

    const fieldPlayer3 = new FieldPlayer(ROLE.DEFENDER, this, this.pitch, regions[3]);
    fieldPlayer3.rotation.fromEuler(0, rotation, 0);
    this.add(fieldPlayer3);

    const fieldPlayer4 = new FieldPlayer(ROLE.DEFENDER, this, this.pitch, regions[4]);
    fieldPlayer4.rotation.fromEuler(0, rotation, 0);
    this.add(fieldPlayer4);
  }

  setupTeamPositions() {
    let regions;
    if (this.color === TEAM.RED) {
      if (this.stateMachine.in(TEAM_STATES.DEFENDING)) {
        // 是否是防守状态
        regions = _redDefendingRegions;
      } else {
        regions = _redAttackingRegions;
      }
    } else {
      if (this.stateMachine.in(TEAM_STATES.DEFENDING)) {
        regions = _blueDefendingRegions;
      } else {
        regions = _blueAttackingRegions;
      }
    }

    const players = this.children;
    for (let i = 0, l = players.length; i < l; i++) {
      const player = players[i];
      const regionId = regions[i];

      player.homeRegionId = regionId;
    }
  }

  updateSteeringTargetOfPlayers() {
    const players = this.children;
    for (let i = 0, l = players.length; i < l; i++) {
      const player = players[i];
      if (player.role !== ROLE.GOALKEEPER) {
        // 不等于守门员
        if (
          player.stateMachine.in(FIELDPLAYER_STATES.WAIT) ||
          player.stateMachine.in(FIELDPLAYER_STATES.RETURN_HOME)
        ) {
          player.steeringTarget.copy(player.getHomeRegion().center);
        }
      }
    }
  }
  /**
   * 判断当前球队是否控制球
   */
  inControl() {
    return this.controllingPlayer !== null;
  }
  setControl(player) {
    this.controllingPlayer = player;
    this.opposingTeam.lostControl();
  }
  lostControl() {
    this.controllingPlayer = null;
    this.receivingPlayer = null;
    this.supportingPlayer = null;
  }
  /**
   * 该方法应确保进攻球员始终得到支援球员的帮助。
   */
  findSupport() {
    if (this.supportingPlayer === null) {
      // 没有支援队友
      this.supportingPlayer = this.computeBestSupportingAttacker();
      if (this.supportingPlayer !== null) {
        // let the player know that he should support the attacker
        this.sendMessage(this.supportingPlayer, MESSAGE.SUPPORT_ATTACKER);
      }
      return;
    }

    const bestSupportPlayer = this.computeBestSupportingAttacker();
    // check if the best supporting player has changed over time
    if (bestSupportPlayer !== null && bestSupportPlayer !== this.supportingPlayer) {
      // if so, instruct the older supporting player to return home
      this.sendMessage(this.supportingPlayer, MESSAGE.RETURN_HOME);
      this.supportingPlayer = bestSupportPlayer;
      this.sendMessage(this.supportingPlayer, MESSAGE.SUPPORT_ATTACKER);
    }
  }
  /**
   * Returns the best supporting position for the supporting player.
   *
   * @return {Vector3} The best supporting position for the supporting player.
   */
  getSupportPosition() {
    return this.supportSpotCalculator.getBestSupportingPosition();
  }
  /**
   * Computes and returns the best supporting attacker. If no player is determined, null is returned.
   * 计算得到最佳的辅助进攻队友，否则返回null
   * @return {Player} The best supporting attacker.
   */
  computeBestSupportingAttacker() {
    let minDistance = Infinity;
    let bestPlayer = null;

    const players = this.children;

    for (let i = 0, l = players.length; i < l; i++) {
      const player = players[i];
      if (player.role === ROLE.ATTACKER && player !== this.controllingPlayer) {
        const distance = player.position.squaredDistanceTo(
          this.supportSpotCalculator.getBestSupportingPosition()
        );

        if (distance < minDistance) {
          minDistance = distance;
          bestPlayer = player;
        }
      }
    }
    return bestPlayer;
  }
  /**
   * 计算一个最佳的助攻位置
   */
  computeBestSupportingPosition() {
    //console.log('this.supportingPlayer:', this.supportingPlayer);
    this.supportSpotCalculator.computeBestSupportingPosition();
  }

  _computePlayerClosestToBall() {
    const ball = this.ball;
    const players = this.children;

    let closestDistance = Infinity;

    for (let i = 0, l = players.length; i < l; i++) {
      const player = players[i];
      const distance = player.position.squaredDistanceTo(ball.position);
      if (distance < closestDistance) {
        closestDistance = distance;
        this.playerClosestToBall = player;
      }
    }
  }
  /**
   *
   * @param {*} start -球的起始位置
   * @param {*} target -球要到达的目标位置
   * @param {*} receiver -接球者
   * @param {*} passingForce -传球的力度
   */
  isPassSafeFromAllOpponents(start, target, receiver, passingForce) {
    // Compute a matrix that will be used to transform opponent players into the
    // local coordinate system of the pass.
    _direction.subVectors(target, start).normalize();
    _rotation.lookAt(_forward, _direction, _up);
    _matrix.compose(start, _rotation, _scale);
    _matrix.getInverse(_inverseMatrix);

    //check all players of the opposing team 检查对方球队的所有队员，是否能与足球的行径路线相交
    const opponents = this.opposingTeam.children;
    for (let i = 0, l = opponents.length; i < l; i++) {
      const opponent = opponents[i];

      if (
        this._isPassSafeFromOpponent(
          start,
          target,
          receiver,
          opponent,
          passingForce,
          _inverseMatrix
        ) === false
      ) {
        return false;
      }
    }
    return true;
  }
  /**
   * Tests if a pass can be intercepted by an opposing player.
   *
   * @param {Vector3} start - The start position of the pass.
   * @param {Vector3} target - The target position of the pass.
   * @param {Player} receiver - The receiver of the pass.
   * @param {Player} opponent - The opposing player.
   * @param {Number} passingForce - The force of the pass.
   * @param {Matrix4} inverseMatrix - Used to transform the opponent into the pass's local coordinate system.
   * @returns {Boolean} Whether the pass can be intercepted by an opposing player or not.
   */
  _isPassSafeFromOpponent(start, target, receiver, opponent, passingForce, inverseMatrix) {
    //1、 把对方队员的位置转换到足球的坐标系下
    _localPositionOfOpponent.copy(opponent.position).applyMatrix4(inverseMatrix);
    // 我们定义的球的前景方向是+Z，如果对手的位置在-Z的位置，则不会阻断球的运动
    if (_localPositionOfOpponent.z < 0) {
      return true;
    }
    // 2. Test: If the opponent is further away than the target we need to consider
    // if the opponent can reach the position before the receiver.
    // 如果对手远离目标点，但是也要考虑对手达到接球者之前
    if (start.squaredDistanceTo(target) < start.squaredDistanceTo(opponent.position)) {
      if (receiver !== null) {
        // 敌人到目标点的距离 > 接球者到目标点的距离
        if (
          target.squaredDistanceTo(opponent.position) > target.squaredDistanceTo(receiver.position)
        ) {
          return true;
        } else {
          return false;
        }
      } else {
        return true; // 没有接球者
      }
    }

    // 3、Test: Compute how long it takes the ball to cover the distance to the position orthogonal to the opponents position.
    // 计算对手到球的路径的垂直交点的时间
    _endPosition.set(0, 0, _localPositionOfOpponent.z);
    const t = this.ball.timeToCoverDistance(_startPosition, _endPosition, passingForce);
    const reach = opponent.maxSpeed * t + this.ball.boundingRadius + opponent.boundingRadius;
    // If the range plus the radius of the opponent and the ball's bounding radius is lower than the opponent's x position, the pass is safe.
    if (reach < Math.abs(_localPositionOfOpponent.x)) {
      return true;
    }
    return false;
  }
  /**
   * Returns true if an opponent is within the given radius.
   * 判断敌人是否在圆内
   * @param {Player} player - The time delta value.
   * @param {Number} radius - The radius.
   * @return {Boolean} Whether an opponent is within the given radius or not.
   */
  isOpponentWithinRadius(player, radius) {
    const opponents = this.opposingTeam.children;
    const squaredRadius = radius * radius;

    for (let i = 0, l = opponents.length; i < l; i++) {
      const opponent = opponents[i];
      const distance = opponent.position.squaredDistanceTo(player.position);
      if (distance <= squaredRadius) return true;
    }
    return false;
  }
  /**
   * 给定球位置、踢球力量和目标矢量参考
   * 该方法将沿对手球门的随机位置进行采样，
   * 检查如果将球踢到该位置，是否可以进球
   * 给定功率的方向。如果发现可能的射击，该方法
   * 将立即返回 true，目标位置存储在 target 中
   * 矢量。
   *
   * @param {Vector3} ballPosition -球的位置。
   * @param {Number} kickingPower -射击的力量。
   * @param {Vector3} shootTarget -目标向量。
   * @returns {boolean} 是否有可能射向对方球门？
   */
  canShoot(ballPosition, kickingPower, shootTarget) {
    const halfWidth = this.opposingGoal.width / 2;
    for (let i = 0; i < CONFIG.PLAYER_NUM_ATTEMPTS_TO_FIND_VALID_STRIKE; i++) {
      const ball = this.ball;
      // 沿对手球门随机选择一个位置
      shootTarget.copy(this.opposingGoal.position);
      const minZ = this.opposingGoal.position.z - halfWidth + ball.boundingRadius;
      const maxZ = this.opposingGoal.position.z + halfWidth + ball.boundingRadius;

      shootTarget.z = YUKA.MathUtils.randFloat(minZ, maxZ);

      // 确保用给定的力量击球足以将球击过球门线
      const time = ball.timeToCoverDistance(ballPosition, shootTarget, kickingPower);
      if (time >= 0) {
        // 如果是，则测试该射门，看看是否有任何对手可以拦截它。
        if (this.isPassSafeFromAllOpponents(ballPosition, shootTarget, null, kickingPower)) {
          return true;
        }
      }
    }
    return false;
  }
  /**
   * 让所有的队员回防
   * @param {*} withGoalKeeper - 是否是守门员
   */
  returnAllFieldPlayersToHome(withGoalKeeper = false) {
    const players = this.children;
    for (let i = 0, l = players.length; i < l; i++) {
      const player = players[i];
      if (withGoalKeeper === true) {
        // 守门员回防
        this.sendMessage(player, MESSAGE.RETURN_HOME, { msg: '守门员回防' });
      } else {
        //
        if (player.role !== ROLE.GOALKEEPER) {
          // 不是守门员
          this.sendMessage(player, MESSAGE.RETURN_HOME, { msg: '队员回防' });
        }
      }
    }
  }
  /**
	* Returns true if all players are in their home region.
    判断球员是否在自己的防守区域内
   */
  areAllPlayersAtHome() {
    for (let i = 0, l = this.children.length; i < l; i++) {
      const player = this.children[i];
      if (player.inHomeRegion() === false) {
        return false;
      }
    }

    return true;
  }

  /**
   * The best pass is considered to be the pass that cannot be intercepted by an
   * opponent and that is as far forward of the receiver as possible. If no best pass
   * is found, null is returned.
   *
   * @param {Player} passer - The player who passes the ball.
   * @param {Number} passPower - The power of the pass.
   * @param {Number} minPassingDistance - The minimum distance of the pass.
   * @param {Object} pass - The pass object holding receiver and target. 自定义传球对象
   * @returns {Pass} The best possible pass.
   */
  findPass(passer, passPower, minPassingDistance, pass) {
    let minDistance = Infinity;
    const minDistanceSquaredDistance = minPassingDistance * minPassingDistance;
    pass.receiver = null;
    const players = this.children;
    // 传球给自己的队友，从所有的队友中选择一个
    for (let i = 0, l = players.length; i < l; i++) {
      const player = players[i];
      // 到接球 队员的距离
      const squaredDistanceToReceiver = passer.position.squaredDistanceTo(player.position);
      // Make sure the potential receiver is not this player and that it is further away than the minimum pass distance.
      // 确保潜在的接球者不是该球员，并且距离比最小传球距离更远。
      if (player !== passer && squaredDistanceToReceiver >= minDistanceSquaredDistance) {
        // 得到最佳的接球队员
        if (this.getBestPassToReceiver(passer, player, passPower, _target)) {
          const distanceToGoal = _target.squaredDistanceTo(this.opposingGoal.position);
          if (distanceToGoal < minDistance) {
            minDistance = distanceToGoal;
            pass.receiver = player;
            pass.target.copy(_target);
          }
        }
      }
    }

    if (pass.receiver !== null) {
      return pass;
    } else {
      return null;
    }
  }
  /**
   * This method tests to see if a pass is possible between the requester and the controlling player.
   * If it is possible a message is sent to the controlling player to pass the ball.
   * 判断是否可以传球
   * @param {Player} requester - The player who requests the pass.
   */
  requestPass(requester) {
    if (Math.random() > CONFIG.PLAYER_PASS_REQUEST_SUCCESS) return;

    // 检测是否安全
    if (
      this.inControl() &&
      this.isPassSafeFromAllOpponents(
        this.controllingPlayer.position,
        requester.position,
        requester,
        CONFIG.PLAYER_MAX_PASSING_FORCE
      )
    ) {
      this.sendMessage(this.controllingPlayer, MESSAGE.PASS_TO_ME, 0, { requester: requester });
    }
  }
  /**
   * Three potential passes are calculated. One directly toward the receiver's
   * current position and two that are the tangents from the ball position to the
   * circle of radius "range" from the receiver. These passes are then tested to
   * see if they can be intercepted by an opponent and to make sure they terminate
   * within the playing area. If all the passes are invalidated the method
   * returns false. Otherwise the method returns the pass that takes the ball
   * closest to the opponent's goal area.
   * 得到最佳的接球队员
   * @param {Player} passer - The player who passes the ball.
   * @param {Player} receiver - The player who receives the ball.
   * @param {Number} passPower - The power of the pass.
   * @param {Vector3} passTarget - The target of the pass.
   * @returns {Boolean} Whether a pass to the receiver is possible or not.
   */
  getBestPassToReceiver(passer, receiver, passPower, passTarget) {
    let result = false;
    let minDistance = Infinity;

    _passes.length = 0;

    const ball = this.ball;
    // 计算球到接球员的时间
    const t = ball.timeToCoverDistance(ball.position, receiver.position, passPower);
    if (t < 0) return false;

    const interceptRange = t * receiver.maxSpeed * 0.2;
    // 计算以接球者的可接球半径，得到球到圆上的两个切线点
    this.computeTangentPoints(
      receiver.position,
      interceptRange,
      ball.position,
      _tangent1,
      _tangent2
    );
    _passes.push(_tangent1, receiver.position, _tangent2);
    //
    for (let i = 0, l = _passes.length; i < l; i++) {
      const pass = _passes[i];
      // 取三个点中最近的且能安全的进行传球
      const distanceToGoal = pass.squaredDistanceTo(this.opposingGoal.position);
      if (
        distanceToGoal < minDistance &&
        this.pitch.playingArea.isInside(pass) &&
        this.isPassSafeFromAllOpponents(ball.position, pass, receiver, passPower)
      ) {
        minDistance = distanceToGoal;
        passTarget.copy(pass);
        result = true;
      }
    }
    return result;
  }
  /**
   * Given a point P and a circle of radius R centered at C this function
   * determines the two points on the circle that intersect with the tangents from
   * P to the circle. Returns false if P is within the circle.
   * 求圆外的一个点到圆的两条切线
   * @param {Vector3} C - The center of the circle. 圆中心点
   * @param {Number} R - The radius of the circle. 圆半径
   * @param {Vector3} P - The origin point.
   * @param {Vector3} T1 - The first tangent.
   * @param {Vector3} T2 - The second tangent.
   * @returns {Boolean} Whether point P lies inside the circle or not?
   */
  computeTangentPoints(C, R, P, T1, T2) {
    _toPoint.subVectors(P, C);
    const squaredlength = _toPoint.squaredLength(); // p点到原点的平方距离
    const RSq = R * R; // 半径的平方

    if (squaredlength <= RSq) {
      // 在圆内，或者在圆上
      return false;
    }

    const squaredLengthInverse = 1 / squaredlength;
    const root = Math.sqrt(squaredlength - RSq); // 得到点到圆边的距离
    //切点坐标推导公式：
    // 切点 T = C + R × [ (R/d²) × u ± (t/d²) × u⊥ ]
    // - 根据勾股定理：t² = d² - R²
    //- t 是切线 PT 的长度,d 是 p点到圆心的距离
    //- u = P - C（从圆心到点P的向量）
    //- u⊥ 是 u 的垂直向量（在2D中，如果 u = (x, z)，则 u⊥ = (-z, x)）

    T1.x = C.x + R * (R * _toPoint.x - _toPoint.z * root) * squaredLengthInverse;
    T1.z = C.z + R * (R * _toPoint.z + _toPoint.x * root) * squaredLengthInverse;
    T2.x = C.x + R * (R * _toPoint.x + _toPoint.z * root) * squaredLengthInverse;
    T2.z = C.z + R * (R * _toPoint.z - _toPoint.x * root) * squaredLengthInverse;

    return true;
  }
}
