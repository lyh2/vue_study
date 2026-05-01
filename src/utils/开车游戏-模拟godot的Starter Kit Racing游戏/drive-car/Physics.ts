import { CELL_RAW, GRID_SCALE, ORIENT_DEG, TRACK_CELLS } from './Track';
import { box, MotionQuality, MotionType, rigidBody, sphere } from 'crashcat';

import * as THREE from 'three';

const _debugMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
});

/**
 * █ 赛道墙壁碰撞体系统
 *
 * 这个文件负责为赛道网格的每个单元格生成物理碰撞体（wall colliders），
 * 让车辆能够与赛道边界发生真实的物理碰撞，而不是穿模而过。
 *
 * █ 核心设计思路
 *
 * 赛道由单元格（cell）网格构成，每个单元格有类型（直道/弯道/起伏/终点）
 * 和朝向（0°/90°/180°/270°）。物理系统需要为每种单元格类型生成对应的
 * 碰撞体形状：
 *
 *   直道/终点 → 两条平行长条立方体（左右护栏）
 *   弯道       → 内外两段圆弧（由多个小立方体分段近似）
 *   起伏       → 跳过（碰撞体在地面层处理，或由地形自身处理）
 *
 * 所有碰撞体都是 STATIC（静态），意味着它们不受力的影响 ——
 * 墙壁不会因为被车撞了就飞出去。只有车辆（DYNAMIC）会与它们发生碰撞。
 *
 * █ 坐标系映射
 *
 * 赛道数据使用网格坐标 (gx, gz)，例如 (0,0)、(1,0)、(2,0)……需要
 * 转换为 Three.js 的世界坐标：
 *
 *   worldX = (gx + 0.5) * CELL_RAW * GRID_SCALE
 *   worldZ = (gz + 0.5) * CELL_RAW * GRID_SCALE
 *   加 0.5 是因为网格坐标原点在单元格左下角，+0.5 移到单元格中心
 *
 * █ 朝向旋转
 *
 * 每个单元格有朝向属性 orient（0/10/16/22 映射到 0°/180°/90°/270°），
 * 碰撞体的位置和旋转都要根据这个朝向做旋转。具体做法是用旋转矩阵：
 *
 *   wx = cx + lx * cos(rad) * S
 *   wz = cz - lx * sin(rad) * S
 *
 * 其中 lx 是局部 X 偏移（如 WALL_X），cos/sin 将局部坐标旋转到世界坐标。
 * 碰撞体本身也绕 Y 轴旋转 rad 角度，用四元数表示：
 *
 *   quat = [0, sin(rad/2), 0, cos(rad/2)]  （绕 Y 轴旋转）
 *
 * 为什么用四元数？因为物理引擎（crashcat/rapier）原生使用四元数，
 * THREE.Euler 需要额外转换。四元数 [x, y, z, w] 表示绕轴 (x,y,z) 旋转 2*acos(w) 角度。
 */
export function buildWallColliders(world, debugGroup, customCells) {
  // ────────────────────────────────────────────────────
  // 全局缩放系数与尺寸计算
  // ────────────────────────────────────────────────────
  const S = GRID_SCALE; // 全局缩放，整个赛道等比放大/缩小
  const CELL_HALF = CELL_RAW / 2; // 单元格半边长，用于居中计算

  // 墙壁几何参数（在「原始」坐标系中定义，再乘以 S 缩放到世界坐标系）
  const WALL_HALF_THICK = 0.25; // 墙壁半厚度 —— 越厚碰撞越「肉」，但太厚会挤占赛道空间
  const WALL_X = 4.75; // 墙壁距赛道中心线的横向偏移（相当于护栏离车道边沿的距离）
  const WALL_HALF_H = 1.25; // 墙壁半高度 —— 1.25 意味着总高 2.5 单位，足以拦住车辆飞跃

  // 缩放到世界坐标系后的实际碰撞体半尺寸
  const wallY = (0.5 + WALL_HALF_H) * S - 0.5; // Y 轴位置：地面 (0.5) + 墙半高，使墙底与地面平齐
  const hThick = WALL_HALF_THICK * S; // 缩放后的厚度
  const hHeight = WALL_HALF_H * S; // 缩放后的高度
  const hLen = CELL_HALF * S; // 缩放后的长度（直道墙壁贯穿整个单元格）

  // ────────────────────────────────────────────────────
  // 弯道圆弧参数
  // ────────────────────────────────────────────────────
  // 弯道单元格中，赛道轨迹是一个 90° 圆弧。内外两侧的墙壁分别沿着
  // 这个圆弧铺设。圆弧的圆心在单元格的某个角落，半径不同：
  //   外弧半径大（大约一个单元格大小），内弧半径小（墙壁厚度量级）。
  //
  // 物理引擎的碰撞体只支持基本几何体（立方体/球体/圆柱体），不支持
  // 真正的弧形碰撞体。所以需要用多个小立方体沿着圆弧排列，分段近似。
  const ARC_SPAN = -Math.PI / 2; // 90度，负号表示顺时针方向
  // 圆弧中心相对于单元格中心的偏移（默认在单元格的右上角区域）
  const ARC_CENTER_X = -CELL_HALF;
  const ARC_CENTER_Z = CELL_HALF;
  // 外弧半径 = 从圆心到赛道外侧边缘的距离
  const OUTER_R = 2 * CELL_HALF - WALL_HALF_THICK; // 外圆半径不能超过当前赛道块外侧边缘，因此，需要减少一点值
  // 外弧分段数 = 8 —— 8 段 90 度弧，每段约 11.25 度，足够平滑
  const OUTER_SEG = 8;
  // 每段弧的弦长的一半，用于设置碰撞体长度：数学原理=圆的周长=2*PI*R
  const OUTER_SEG_HALF_LEN = ((OUTER_R * (Math.PI / 2)) / OUTER_SEG / 2) * S;
  // 内弧半径 = 从圆心到赛道内侧边缘（基本就是墙厚）
  const INNER_R = WALL_HALF_THICK; //
  // 内弧分段数 = 3 —— 内弧半径小，曲率大，但分段少了也看不出来
  const INNER_SEG = 3;
  const INNER_SEG_HALF_LEN = ((INNER_R * (Math.PI / 2)) / INNER_SEG / 2) * S;

  /**
   * 添加一段圆弧墙壁碰撞体（分段近似算法）
   *
   * █ 算法原理
   *
   * 真实圆弧无法直接用盒子碰撞体表达，因此将 90° 圆弧切成 N 个小段，
   * 每段用一个旋转后的立方体碰撞体来近似：
   *
   *   1. 将 90° 弧等分为 numSeg 份
   *   2. 取每份的中间角度 aMid，计算该点在圆弧上的位置
   *   3. 在该位置放置一个立方体，使其朝向圆弧的切线方向
   *
   * 用数学语言描述：
   *   aMid = arcStart + ((i + 0.5) / numSeg) * ARC_SPAN
   *   position = (wcx + R*cos(aMid), wallY, wcz + R*sin(aMid))
   *   quaternion = 绕 Y 轴旋转 -aMid （使盒子朝向切线）
   *
   * 为什么用 i+0.5（分段中点）而不是 i（分段起点）？
   *   如果用起点角度，那么相邻分段会在端点处相接，但方向突变会形成折角。
   *   用中点角度时，每个盒子关于分段中点对称，相邻盒子之间会有重叠，
   *   这个重叠保证了碰撞体之间没有缝隙，车辆不会从分段间隙漏出去。
   *
   * █ 外弧 8 段 vs 内弧 3 段
   *
   *   外弧半径大（≈9.74 单位），弧长更长，需要更多分段才能平滑。
   *   内弧半径小（≈0.25 单位），弧长短，3 段已经足够。
   *   这是典型的「按需分配性能」策略 —— 对视觉/碰撞影响大的地方多投计算资源。
   *
   * @param wcx  圆弧中心世界 X
   * @param wcz  圆弧中心世界 Z
   * @param arcStart 起始角度（弧度）
   * @param radius   圆弧半径
   * @param numSeg   分段数量
   * @param segHalfLen 每段碰撞体的半长度
   */
  function addArcWall(wcx, wcz, arcStart, radius, numSeg, segHalfLen) {
    for (let i = 0; i < numSeg; i++) {
      // 分段中点角度 —— 为什么要 +0.5？
      // 如果每段覆盖 0°~45°、45°~90°……用起点角度会导致分段在端点处拼接，
      // 旋转方向突然变化产生折角。用中点角度让每个盒子居中对称，
      // 相邻盒子首尾重叠，消除缝隙。
      /**
       * - `i / numSeg` = 第 i 段的起点占比
        - `(i + 1) / numSeg` = 第 i 段的终点占比
        - `(i + 0.5) / numSeg` = 起点和终点的平均数 = 中点占比

       */
      const aMid = arcStart + ((i + 0.5) / numSeg) * ARC_SPAN;

      // 碰撞体尺寸：[半厚, 半高, 半长]
      const halfExtents = [hThick, hHeight, segHalfLen];

      // 位置 = 圆心 + 半径方向向量
      const position = [
        wcx + radius * Math.cos(aMid) * S,
        wallY,
        wcz + radius * Math.sin(aMid) * S,
      ];

      // 四元数：绕 Y 轴旋转 -aMid，使立方体朝向圆弧切线方向
      const quaternion = [0, Math.sin(-aMid / 2), 0, Math.cos(-aMid / 2)];

      rigidBody.create(world, {
        shape: box.create({ halfExtents }),
        motionType: MotionType.STATIC,
        objectLayer: world._OL_STATIC,
        position,
        quaternion,
        friction: 0.0,
        restitution: 0.1,
      });

      if (debugGroup) addDebugBox(debugGroup, halfExtents, position, quaternion);
    }
  }

  // ════════════════════════════════════════════════════
  // 主循环：单层遍历所有赛道单元格，生成碰撞体
  // ════════════════════════════════════════════════════
  //
  // 原来此处有两层嵌套循环，外层处理直道墙壁，内层再同一次迭代中又
  // 完整遍历所有 cells 一遍（包含直道+弯道），导致每个碰撞体被重复创建
  // N 次。在 60fps 下物理引擎虽然撑得住，但赛道如果有 100 个单元格，
  // 就会产生 10000 次碰撞体创建调用 —— 完全是浪费。
  //
  // 修正方案：合并为一层循环。每个单元格只处理一次，根据 type 分支：
  //   track-straight / track-finish → 两条平行墙壁
  //   track-corner                 → 内外圆弧墙壁
  //   track-bump                   → 跳过

  const cells = customCells || TRACK_CELLS;
  // 1.遍历所有赛道单元格
  for (const [gx, gz, name, orient] of cells) {
    // 起伏路段由地形/悬挂系统处理碰撞，跳过
    if (name === 'track-bump') continue;

    // ── 网格坐标 → 世界坐标 ──
    const cx = (gx + 0.5) * CELL_RAW * S;
    const cz = (gz + 0.5) * CELL_RAW * S;

    // ── 朝向：编码 → 弧度 → 三角函数（一次计算，多次复用） ──
    const deg = ORIENT_DEG[orient] ?? 0;
    const rad = (deg * Math.PI) / 180;
    const cr = Math.cos(rad), // x
      sr = Math.sin(rad); // z

    if (name === 'track-straight' || name === 'track-finish') {
      // ── 1.1 直道/终点：左右两侧各一堵长条形墙壁 ──
      // side = -1 左墙，side = 1 右墙，用 [-1, 1] 循环比写两遍代码更简洁
      for (const side of [-1, 1]) {
        // 墙壁在单元格局部坐标系中偏移 WALL_X，旋转到世界坐标
        const lx = side * WALL_X;
        const wx = cx + lx * cr * S;
        const wz = cz + -lx * sr * S; // 类似XY平面的Y轴的值，使用旋转矩阵计算，因此就有“负值”
        const halfExtents = [hThick, hHeight, hLen];
        const position = [wx, wallY, wz];
        // 四元数：绕 Y 轴旋转 rad
        const quaternion = [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)];

        rigidBody.create(world, {
          shape: box.create({ halfExtents }),
          motionType: MotionType.STATIC,
          objectLayer: world._OL_STATIC,
          position,
          quaternion,
          friction: 0.0,
          restitution: 0.1,
        });

        if (debugGroup) addDebugBox(debugGroup, halfExtents, position, quaternion);
      }
    } else if (name === 'track-corner') {
      // ── 弯道：内外两段圆弧墙壁 ──
      // 圆弧中心在单元格局部坐标中定义，需旋转到世界坐标：
      //   [x']   [cos -sin] [ARC_CENTER_X]
      //   [z'] = [sin  cos] [ARC_CENTER_Z]
      const wcx = cx + (ARC_CENTER_X * cr + ARC_CENTER_Z * sr) * S;
      const wcz = cz + (-ARC_CENTER_X * sr + ARC_CENTER_Z * cr) * S;
      const arcStart = -rad;

      // 外弧：大半径，8 段确保平滑；内弧：小半径，3 段够用
      addArcWall(wcx, wcz, arcStart, OUTER_R, OUTER_SEG, OUTER_SEG_HALF_LEN);
      addArcWall(wcx, wcz, arcStart, INNER_R, INNER_SEG, INNER_SEG_HALF_LEN);
    }
  }
}

/**
 * 创建车辆的球体物理体
 *
 * █ 为什么用球体而不是更精确的盒体/复杂形状？
 *
 *   1. 稳定性 —— 球体在任何朝向下的碰撞响应都是一致的，不会像立方体那样
 *      在侧翻时产生不可预测的扭矩。这对一个街机风格的赛车游戏至关重要。
 *
 *   2. 性能 —— 球体的碰撞检测是最便宜的（只需检测球心距离），
 *      允许物理引擎在 PC 和移动设备上都跑满帧率。
 *
 *   3. 容错 —— 赛道墙壁用盒子拼成，有棱有角。球体与盒子碰撞时，
 *      接触点计算平滑，车辆不会卡在墙壁的接缝处。
 *
 * █ 视觉-物理分离架构
 *
 *   物理体是球体（简单可靠），视觉模型是复杂的车身网格（在 Vehicle.ts 中）。
 *   每一帧将物理体的位置/旋转同步到视觉模型上，实现「物理驱动视觉」。
 *   这是游戏开发的经典模式，Godot、Unity、Unreal 都这样做。
 *
 * █ 物理参数调校思路
 *
 *   mass = 1000：较大的质量保证碰撞时车辆不会轻易被弹飞
 *   friction = 5：高摩擦，与地面交互时产生足够的抓地力
 *   linearDamping = 0.1：线性阻尼小，车辆在直道上能保持速度
 *   angularDamping = 4.0：角阻尼大，防止车辆在空中旋转失控
 *   gravityFactor = 1.5：重力倍率 > 1，让车辆更有「贴地感」
 *   motionQuality = LINEAR_CAST：连续碰撞检测（CCD），防止高速时穿模
 *
 * @param world crashcat 物理世界实例
 * @param spawnPos 车辆出生位置 [x, y, z]
 * @returns 物理体的引用，后续用于施加力/读取位置
 */
export function createSphereBody(world, spawnPos) {
  const body = rigidBody.create(world, {
    shape: sphere.create({ radius: 0.5 }),
    motionType: MotionType.DYNAMIC, // 动态：受重力/力/碰撞影响
    objectLayer: world._OL_MOVING,
    position: spawnPos || [3.5, 0.5, 5],
    mass: 1000.0,
    friction: 5,
    restitution: 0.1,
    linearDamping: 0.1,
    angularDamping: 4.0,
    gravityFactor: 1.5,
    motionQuality: MotionQuality.LINEAR_CAST,
  });

  return body;
}

/**
 * 添加调试用可视化方框
 *
 * 将物理碰撞体用绿色线框显示出来，方便调试时观察：
 *   - 碰撞体位置是否正确（是否对齐赛道）
 *   - 碰撞体大小是否合适（是否挡住预期区域）
 *   - 是否有不必要的重叠或缝隙
 *
 * 只应在开发/调试模式启用，发布时关闭 debugGroup 即可去除。
 *
 * @param group THREE.Group 调试组
 * @param halfExtents [半宽, 半高, 半长]
 * @param position [x, y, z]
 * @param quaternion [x, y, z, w]
 */
function addDebugBox(group, halfExtents, position, quaternion) {
  const geo = new THREE.BoxGeometry(halfExtents[0] * 2, halfExtents[1] * 2, halfExtents[2] * 2);
  const mesh = new THREE.Mesh(geo, _debugMaterial);
  mesh.position.set(position[0], position[1], position[2]);

  if (quaternion) mesh.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
  group.add(mesh);
}
