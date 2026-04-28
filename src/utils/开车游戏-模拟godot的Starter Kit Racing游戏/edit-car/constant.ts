const _N_8_ = 8; // 北
const _S_4_ = 4; // 南
const _E_2_ = 2; // 东
const _W_1_ = 1; // 西

// Auto-tile 查找表: bitmask → [modelType, orientation]
// 0=孤立  1=仅W  2=仅E  3=EW直道  4=仅S  5=SW弯角  6=SE弯角
// 7=SEW  8=仅N  9=NW弯角  10=NE弯角  11=N+EW  12=NS直道
// 13=N+S+W  14=N+S+E  15=十字(用直道)
// 注意: 3个及以上连接时统一用直道,因为编辑器不处理复杂路口
const AUTOTILE = [
  ['track-straight', 0], //  0: isolated
  ['track-straight', 16], //  1: W
  ['track-straight', 16], //  2: E
  ['track-straight', 16], //  3: E+W
  ['track-straight', 0], //  4: S
  ['track-corner', 0], //  5: S+W
  ['track-corner', 16], //  6: S+E
  ['track-straight', 16], //  7: S+E+W
  ['track-straight', 0], //  8: N
  ['track-corner', 22], //  9: N+W
  ['track-corner', 10], // 10: N+E
  ['track-straight', 16], // 11: N+E+W
  ['track-straight', 0], // 12: N+S
  ['track-straight', 0], // 13: N+S+W
  ['track-straight', 0], // 14: N+S+E
  ['track-straight', 0], // 15: N+S+E+W
];

// ═══════════════════════════════════════════════════════════
//  核心设计: Auto-tile 自动拼接系统
//  这是编辑器的灵魂。采用 4-bit 位掩码表示 4 个方向的连通性:
//    N=8(1000), S=4(0100), E=2(0010), W=1(0001)
//  每个格子根据邻居的连接情况,自动选择合适的模型(直道/弯道)和朝向。
//  0-15 共 16 种情况覆盖了所有可能的邻居组合。
//  灵感来自 Godot 的 TileMap 和 Minecraft 的连接纹理系统。
// ═══════════════════════════════════════════════════════════

// 终点线方向翻转映射(点击终点线可旋转 180°)
const ORIENT_FLIP = { 0: 10, 10: 0, 16: 22, 22: 16 };

//-------方向信息常量表
const DIR_INFO = [
  { bit: 8, dx: 0, dz: -1 }, // N-北
  { bit: 4, dx: 0, dz: 1 }, //S-南
  { bit: 2, dx: 1, dz: 0 }, // E-东
  { bit: 1, dx: -1, dz: 0 }, // W-西
];

export { _N_8_, _S_4_, _E_2_, _W_1_, AUTOTILE, ORIENT_FLIP, DIR_INFO };
