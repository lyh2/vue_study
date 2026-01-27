import * as YUKA from 'yuka';
import Region from '../etc/Region';
import { MESSAGE } from '../core/constants';

/**
 * 创建球场
 */
export default class Pitch extends YUKA.GameEntity {
  constructor(width, height, world) {
    super();
    this.world = world;
    /**
     * 代表足球场的墙壁。球将
     * 与这些墙壁碰撞，以便它可以离开游戏区域。
     *
     * Represents the walls of the soccer pitch. The ball will
     * collide against these walls so it can leave the playing area.
     * @type {Array<Plane>}
     */
    this.walls = [
      new YUKA.Plane(new YUKA.Vector3(0, 0, -1), 7.5), // top  在-Z轴的位置
      new YUKA.Plane(new YUKA.Vector3(0, 0, 1), 7.5), // bottom 在Z轴的位置
      new YUKA.Plane(new YUKA.Vector3(1, 0, 0), 10), // right 在-X轴的位置
      new YUKA.Plane(new YUKA.Vector3(-1, 0, 0), 10), // left 在+X轴的位置
    ];
    // 是否开始比赛
    this.isPlaying = true;

    // 守门员是否控球，Possession：拥有
    this.isGoalKeeperInBallPossession = false;

    //
    this.ball = null;

    //
    this.teamRed = null;

    //
    this.teamBlue = null;

    // 设置足球场的区域
    this.playingArea = new Region(this.position.clone(), width, height);
    this.regionCountWidth = 6; // 在X轴的分段数
    this.regionCountHeight = 3; // 在Z轴的分段数
    this.regions = [];

    this._createRegions();
  }
  /**
   * 分割大区域生成小区域格子。所有区域都位于原点的 XZ 中。
   * Generates the regions of this pitch. All regions lie in a XZ at the origin.
   */
  _createRegions() {
    const playingArea = this.playingArea;
    let id = 0;
    // width = 3.3,height = 5 // 得到每段的宽高值
    const width = playingArea.width / this.regionCountWidth; // 20 / 6 = 3.3;
    const height = playingArea.height / this.regionCountHeight; // 15 / 3 = 5
    // 列
    for (let col = 0; col < this.regionCountWidth; col++) {
      // 行
      for (let row = 0; row < this.regionCountHeight; row++) {
        // i=0: 1.7 - 10 = -8.3;  i=1: 3.3 + 1.7 - 10= -5; i=2: 2 * 3.3 + 1.7 - 10= -1.7
        const x = col * width + width / 2 - playingArea.width / 2;
        const y = 0;
        const z = row * height + height / 2 - playingArea.height / 2;
        // 创建小区域
        this.regions[id] = new Region(new YUKA.Vector3(x, y, z), width, height, id);
        id++;
      }
    }
  }
  /**
   * 改写消息方法
   * @param {*} telegram
   */
  handleMessage(telegram) {
    switch (telegram.message) {
      case MESSAGE.GOAL_SCORED:
        {
          this.isPlaying = false;
          this.world.refreshUI(); // 刷新UI
        }
        return true;
    }
    return false;
  }
  /**
   * 通过ID 获取区域
   * @param {*} id
   */
  getRegionById(id) {
    return this.regions[id];
  }
}
