/**
 * 球队状态
 */

import * as YUKA from 'yuka';
import { MESSAGE, TEAM_STATES } from '../core/constants';

class GlobalState extends YUKA.State {
  onMessage(team, telegram) {
    switch (telegram.message) {
      // 得分事件
      case MESSAGE.GOAL_SCORED: {
        if (telegram.data.team == team.color) team.goals++; // 球队得分
        team.stateMachine.changeTo(TEAM_STATES.PREPARE_FOR_KICKOFF); // 准备开球
        return true;
      }
    }
    return false;
  }
}
/**
 * - __入场时__：重新配置球员的站位区域，更新球员的移动目标
- __执行中__：
  - 持续计算最佳支持位置（为支持球员提供移动目标）
  - 监控控球状态，一旦失去控球立即切换到防守状态
- __退场时__：清理控球相关状态

 */
class AttackingState extends YUKA.State {
  enter(team) {
    // 给队员设置新的位置
    team.setupTeamPositions();
    team.updateSteeringTargetOfPlayers();
  }

  execute(team) {
    if (team.inControl() === false) {
      // 失去了对球的控制，转态转为防守
      team.stateMachine.changeTo(TEAM_STATES.DEFENDING);
    }
    //console.log('team:', team);
    team.computeBestSupportingPosition();
  }
  /**
   * 退出失去求全控制
   * @param {*} team
   */
  exit(team) {
    team.lostControl();
  }
}
/**
 * 防守
 */
class DefendingState extends YUKA.State {
  enter(team) {
    team.setupTeamPositions();
    team.updateSteeringTargetOfPlayers();
  }

  execute(team) {
    if (team.inControl()) {
      team.stateMachine.changeTo(TEAM_STATES.ATTACKING);
    }
  }
}
/**
 * 准备开球
 */
class PrepareForKickOffState extends YUKA.State {
  enter(team) {
    team.receivingPlayer = null;
    team.playerClosestToBall = null;
    team.controllingPlayer = null;
    team.supportingPlayer = null;

    team.returnAllFieldPlayersToHome(true);
  }

  execute(team) {
    if (team.areAllPlayersAtHome() && team.opposingTeam.areAllPlayersAtHome()) {
      team.stateMachine.changeTo(TEAM_STATES.DEFENDING);
    }
  }

  exit(team) {
    team.pitch.isPlaying = true;
  }
}
export { GlobalState, AttackingState, DefendingState, PrepareForKickOffState };
