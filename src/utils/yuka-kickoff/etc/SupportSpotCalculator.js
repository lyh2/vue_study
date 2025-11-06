import * as YUKA from 'yuka';
import { CONFIG, TEAM } from '../core/constants';

const _target = new YUKA.Vector3();

/**
 *
 */
export default class SupportSpotCalculator {
  /**
   *
   * @param {*} team
   */
  constructor(team) {
    this.team = team;
    this.bestSupportSpot = null;
    this.regulator = new YUKA.Regulator(CONFIG.SUPPORT_SPOT_CALCULATOR_UPDATE_FREQUENCY);
    this.spots = []; // 存储可能进球的点
    this.computeSupportingSpots();
  }

  computeBestSupportingPosition() {
    let bestScore = 0;
    if (this.regulator.ready() === false && this.bestSupportSpot !== null) {
      // 自定义更新频率还未准备好，并且已经存在最优的位置，即返回存在的最优位置
      return this.bestSupportSpot.position;
    }

    this.bestSupportSpot = null;
    const spots = this.spots;
    const team = this.team;
    for (let i = 0, l = spots.length; i < l; i++) {
      const spot = spots[i];
      spot.beat = false;
      // 1、是否可以安全的把球从当前位置传递到下个为止
      if (
        team.inControl() &&
        team.isPassSafeFromAllOpponents(
          this.team.controllingPlayer.position,
          spot.position,
          null,
          CONFIG.PLAYER_MAX_PASSING_FORCE
        )
      ) {
        spot.score += CONFIG.SUPPORT_SPOT_CALCULATOR_SCORE_CAN_PASS;
      }

      // 2. 确定该位置是否可以进球
      if (team.canShoot(spot.position, CONFIG.PLAYER_MAX_SHOOTING_FORCE, _target)) {
        spot.score += CONFIG.SUPPORT_SPOT_CALCULATOR_SCORE_CAN_SCORE;
      }

      // 3. 测试：计算该点距离控制玩家有多远。
      // 距离越远，得分越高。常量“OPT_DISTANCE”描述了该分数的最佳距离。
      // 这个条件检查团队是否已经指定了支持球员。如果已指定，则计算控球球员到潜在支持点的距离，用于评估该点的得分。
      if (team.supportingPlayer !== null) {
        const distance = team.controllingPlayer.position.distanceTo(spot.position);
        if (distance < CONFIG.SUPPORT_SPOT_CALCULATOR_OPT_DISTANCE) {
          // 进入最佳传球距离
          const f =
            (CONFIG.SUPPORT_SPOT_CALCULATOR_OPT_DISTANCE - distance) /
            CONFIG.SUPPORT_SPOT_CALCULATOR_OPT_DISTANCE;
          spot.score += CONFIG.SUPPORT_SPOT_CALCULATOR_SCORE_DISTANCE * f;
        } else {
          // distances greater than "OPT_DISTANCE" get full score
          spot.score += CONFIG.SUPPORT_SPOT_CALCULATOR_SCORE_DISTANCE;
        }
      }

      if (spot.score > bestScore) {
        bestScore = spot.score;
        this.bestSupportSpot = spot;
      }
    }

    if (this.bestSupportSpot !== null) {
      this.bestSupportSpot.best = true;
      return this.bestSupportSpot.position;
    }

    return null;
  }
  /**
   * 该方法计算所有可能的支持点并将它们存储在内部数组中。
   * 仅由构造函数调用一次。
   */
  computeSupportingSpots() {
    const playingField = this.team.pitch.playingArea; // 一个自定义Region 对象
    //console.log('sss:', this, playingField);
    // 可运动的区域只占球场的80%，避免在边界附近生成点 20 x 15=> 16 * 12
    const widthOfSpotRegion = playingField.width * 0.8; // 把面积缩小，防止穿墙
    const heightOfSpotRegion = playingField.height * 0.8;

    const sliceX = widthOfSpotRegion / CONFIG.SUPPORT_SPOT_CALCULATOR_SLICE_X; // X轴分割成12分，得到每份的值1.3
    const sliceY = heightOfSpotRegion / CONFIG.SUPPORT_SPOT_CALCULATOR_SLICE_Y; // Y轴分成5份，每份的值2.4
    // -7.5 + 1.5 + 1.2 =
    const top = playingField.top + (playingField.height - heightOfSpotRegion) * 0.5 + sliceY * 0.5;
    const right =
      playingField.right - (playingField.width - widthOfSpotRegion) * 0.5 - sliceX * 0.5;
    const left = playingField.left + (playingField.width - widthOfSpotRegion) * 0.5 - sliceX * 0.5;

    for (let x = 0; x < CONFIG.SUPPORT_SPOT_CALCULATOR_SLICE_X * 0.5 - 1; x++) {
      for (let y = 0; y < CONFIG.SUPPORT_SPOT_CALCULATOR_SLICE_Y; y++) {
        // The spots are always located in the opposing part of the soccer pitch.
        // 支持的点位始终位于对手区域内
        if (TEAM.RED === this.team.color) {
          // 红队的支持点都在蓝队的区域内，在我的设计中就是在世界坐标左边，-x轴的位置
          this.spots.push({
            position: new YUKA.Vector3(left + x * sliceX, 0, top + y * sliceY),
            score: 0,
            best: false,
          });
        } else {
          // 蓝队的支持点都在红队的区域内，就是在右边
          this.spots.push({
            position: new YUKA.Vector3(right - x * sliceX, 0, top + y * sliceY),
            score: 0,
            best: false,
          });
        }
      }
    }
  }
  /**
   * Returns the best supporting spot if there is one. If one hasn't been
   * computed yet, this method calls computeBestSupportingPosition() and returns
   * the result.
   *
   * @returns {Vector3} The best supporting spot on the soccer pitch.
   */
  getBestSupportingPosition() {
    if (this.bestSupportSpot === null) {
      return this.computeBestSupportingPosition();
    } else {
      return this.bestSupportSpot.position;
    }
  }
}
