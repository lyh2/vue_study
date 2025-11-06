export const _ball_ = 'ball';
export const _goal_ = 'goal';
export const _pitch_texture_ = 'pitch_texture';
export const _pitch_ = 'pitch';
export const _team_red_ = 'teamRed';
export const _team_blue_ = 'teamBlue';
export const TEAM = {
  RED: 0,
  BLUE: 1,
};
export const MESSAGE = {
  RETURN_HOME: 'RETURN_HOME', // 回防
  PASS_TO_ME: 'PASS_TO_ME', // 传球
  RECEIVE_BALL: 'RECEIVE_BALL', // 接球
  SUPPORT_ATTACKER: 'SUPPORT_ATTACKER', // 进攻
  GOAL_SCORED: 'GOAL_SCORED', // 得分
};
export const TEAM_STATES = {
  ATTACKING: 'ATTACKING', // 进攻
  DEFENDING: 'DEFENDING', // 防守
  PREPARE_FOR_KICKOFF: 'PREPARE_FOR_KICKOFF', // 准备开球
};
/**
 *
 */
export const FIELDPLAYER_STATES = {
  CHASE_BALL: 'CHASE_BALL', // 追球
  DRIBBLE: 'DRIBBLE', //运球
  KICK_BALL: 'KICK_BALL', //踢球
  RECEIVE_BALL: 'RECEIVE_BALL', //接球
  RETURN_HOME: 'RETURN_HOME', // 回防
  SUPPORT_ATTACKER: 'SUPPORT_ATTACKER', // 辅助进攻
  WAIT: 'WAIT', // 等待
};
export const ROLE = {
  GOALKEEPER: 0, //守门员
  ATTACKER: 1, // 进攻
  DEFENDER: 2, // 防守
};
/**
 * 守门员状态枚举
 */
export const GOALKEEPER_STATES = {
  RETURN_HOME: 'RETURN_HOME', // 回防
  TEND_GOAL: 'TEND_GOAL', // 扑向目标
  PUT_BALL_BACK_IN_PLAY: 'PUT_BALL_BACK_IN_PLAY', // 将球放回球场
  INTERCEPT_BALL: 'INTERCEPT_BALL', //拦截球
};

export const CONFIG = {
  GOALKEEPER_IN_TARGET_RANGE: 0.5, //the goalkeeper has to be this close to the ball to be able to interact with it
  GOALKEEPER_INTERCEPT_RANGE: 4, //when the ball becomes within this distance of the goalkeeper he changes state to intercept the ball 在这个距离内，守门员打断球的运行轨迹
  GOALKEEPER_MIN_PASS_DISTANCE: 2, //the minimum distance a player must be from the goalkeeper before it will pass the ball
  GOALKEEPER_TENDING_DISTANCE: 2, //this is the distance the keeper puts between the back of the net and the ball when using the interpose steering behavior
  GOALKEEPER_INTERCEPT_RANGE_SQ: 0,
  GOALKEEPER_IN_TARGET_RANGE_SQ: 0,
  PLAYER_RECEIVING_RANGE_SQ: 0,
  PLAYER_KICKING_RANGE_SQ: 0,
  PLAYER_COMFORT_ZONE_SQ: 0,
  PLAYER_IN_TARGET_RANGE_SQ: 0,
  PLAYER_COMFORT_ZONE: 2.5, //when an opponents comes within this range the player will attempt to pass the ball. Players tend to pass more often, the higher the value
  PLAYER_IN_TARGET_RANGE: 0.25, // the player has to be this close to its steering target to be considered as arrived

  PLAYER_PASS_REQUEST_SUCCESS: 0.1, //请求成功的可能性 the likelihood that a pass request is successful
  PLAYER_PASS_THREAD_RADIUS: 3, //the radius in which a pass in dangerous
  PLAYER_CHANCE_OF_USING_ARRIVE_TYPE_RECEIVE_BEHAVIOR: 0.5, //this is the chance that a player will receive a pass using the "arrive" steering behavior, rather than "pursuit"
  PLAYER_MIN_PASS_DISTANCE: 5, //the minimum distance a receiving player must be from the passing player
  PLAYER_CHANCE_ATTEMPT_POT_SHOT: 0.005, //the chance a player might take a random pot shot at the goal
  PLAYER_MAX_DRIBBLE_AND_TURN_FORCE: 0.4, //the force used for dribbling while turning around
  PLAYER_MAX_DRIBBLE_FORCE: 0.6, //the force used for dribbling
  PLAYER_MAX_SPEED_WITH_BALL: 0.8, //max speed with ball
  PLAYER_MAX_SPEED_WITHOUT_BALL: 1, //max speed without ball
  PLAYER_RECEIVING_RANGE: 1, //在接球手开始追球之前，球必须离接球手有多近how close the ball must be to a receiver before he starts chasing it
  PLAYER_KICK_FREQUENCY: 1, //球员每秒可以踢球的次数 the number of times a player can kick the ball per second
  PLAYER_NUM_ATTEMPTS_TO_FIND_VALID_STRIKE: 5, // the number of times the player attempts to find a valid shot 查找5个随机进球的点
  PLAYER_MAX_SHOOTING_FORCE: 4, //the force used for shooting at the goal
  PLAYER_MAX_PASSING_FORCE: 3, //the force used for passing 传球的力
  SUPPORT_SPOT_CALCULATOR_SLICE_X: 12, //x dimension of spot
  SUPPORT_SPOT_CALCULATOR_SLICE_Y: 5, // y dimension of spot
  SUPPORT_SPOT_CALCULATOR_SCORE_CAN_PASS: 2, //score when pass is possible ,有可能通过时得2分
  SUPPORT_SPOT_CALCULATOR_UPDATE_FREQUENCY: 1, //updates per second 每秒更新的频率
  SUPPORT_SPOT_CALCULATOR_SCORE_CAN_SCORE: 1, //score when a goal is possible 有可能进球时得 1分
  SUPPORT_SPOT_CALCULATOR_OPT_DISTANCE: 5, // optimal distance for a pass最佳传球距离
  SUPPORT_SPOT_CALCULATOR_SCORE_DISTANCE: 2, //score for pass distance 传球距离得分
};

CONFIG.GOALKEEPER_IN_TARGET_RANGE_SQ =
  CONFIG.GOALKEEPER_IN_TARGET_RANGE * CONFIG.GOALKEEPER_IN_TARGET_RANGE;
CONFIG.GOALKEEPER_INTERCEPT_RANGE_SQ =
  CONFIG.GOALKEEPER_INTERCEPT_RANGE * CONFIG.GOALKEEPER_INTERCEPT_RANGE;
CONFIG.PLAYER_RECEIVING_RANGE_SQ = CONFIG.PLAYER_RECEIVING_RANGE * CONFIG.PLAYER_RECEIVING_RANGE;
CONFIG.PLAYER_COMFORT_ZONE_SQ = CONFIG.PLAYER_COMFORT_ZONE * CONFIG.PLAYER_COMFORT_ZONE;
CONFIG.PLAYER_IN_TARGET_RANGE_SQ = CONFIG.PLAYER_IN_TARGET_RANGE * CONFIG.PLAYER_IN_TARGET_RANGE;
