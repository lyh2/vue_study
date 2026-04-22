import { CELL_RAW, GRID_SCALE, ORIENT_DEG, TRACK_CELLS } from './Track';
import { box, MotionQuality, MotionType, rigidBody, sphere } from 'crashcat';

import * as THREE from 'three';

const _debugMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
});

export function buildWallColliders(world, debugGroup, customCells) {
  // 缩放系数
  const S = GRID_SCALE;
  const CELL_HALF = CELL_RAW / 2;

  // 墙壁参数
  const WALL_HALF_THICK = 0.25; // 墙壁半厚度
  const WALL_X = 4.75; // X 轴偏移
  const WALL_HALF_H = 1.25;

  // 计算实际世界坐标参数
  const wallY = (0.5 + WALL_HALF_H) * S - 0.5;
  const hThick = WALL_HALF_THICK * S;
  const hHeight = WALL_HALF_H * S;
  const hLen = CELL_HALF * S;

  // 弯道圆弧参数
  const ARC_SPAN = -Math.PI / 2; // 弧度范围
  const ARC_CENTER_X = -CELL_HALF;
  const ARC_CENTER_Z = CELL_HALF;
  const OUTER_R = 2 * CELL_HALF - WALL_HALF_THICK;
  const OUTER_SEG = 8;
  const OUTER_SEG_HALF_LEN = ((OUTER_R * (Math.PI / 2)) / OUTER_SEG / 2) * S;
  const INNER_R = WALL_HALF_THICK;
  const INNER_SEG = 3;
  const INNER_SEG_HALF_LEN = ((INNER_R * (Math.PI / 2)) / INNER_SEG / 2) * S;

  /**
   * 添加圆弧墙壁碰撞体（分段近似算法）
   *
   * 设计思路：
   * 1. 将90度圆弧分为多个小段，每段用一个立方体碰撞体近似
   * 2. 每个立方体沿着圆弧切线方向旋转，形成连续的弧形墙壁
   * 3. 外圆弧使用更多分段(8段)提高精度，内圆弧使用较少分段(3段)优化性能
   *
   * 数学原理：
   * - aMid: 当前分段的中间角度（确保分段之间无缝连接）
   * - position: 沿圆弧半径方向的位置计算
   * - quaternion: 立方体旋转，使其朝向圆弧切线方向
   *
   * @param {number} wcx - 圆弧中心的世界X坐标
   * @param {number} wcz - 圆弧中心的世界Z坐标
   * @param {number} arcStart - 圆弧起始角度（弧度）
   * @param {number} radius - 圆弧半径
   * @param {number} numSeg - 分段数量
   * @param {number} segHalfLen - 每个分段的半长度
   */
  function addArcWall(wcx, wcz, arcStart, radius, numSeg, segHalfLen) {
    // 为每个分段创建碰撞体
    for (let i = 0; i < numSeg; i++) {
      // 计算当前每个分段的中间角度，确保分段之间无缝连接
      const aMid = arcStart + ((i + 0.5) / numSeg) * ARC_SPAN; //
      // 碰撞体尺寸：厚度x高度x分段长度
      const halfExtents = [hThick, hHeight, segHalfLen];
      // 计算碰撞位置：沿圆弧半径方向
      const position = [
        wcx + radius * Math.cos(aMid) * S,
        wallY,
        wcz + radius * Math.sin(aMid) * S,
      ];

      // 计算碰撞体旋转：使立方体朝向圆弧切线方向
      // 四元素表示绕Y轴旋转-aMid角度
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

  const cells = customCells || TRACK_CELLS;

  for (const [gx, gz, name, orient] of cells) {
    if (name === 'track-bump') continue;

    const cx = (gx + 0.5) * CELL_RAW * S;
    const cz = (gz + 0.5) * CELL_RAW * S;

    const deg = ORIENT_DEG[orient] ?? 0;
    const rad = (deg * Math.PI) / 180;
    const cr = Math.cos(rad),
      sr = Math.sin(rad);

    if (name === 'track-straight' || name === 'track-finish') {
      for (const side of [-1, 1]) {
        const lx = side * WALL_X;
        const wx = cx + lx * cr * S;
        const wz = cz + -lx * sr * S;
        const halfExtents = [hThick, hHeight, hLen];
        const position = [wx, wallY, wz];
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
    }

    // 使用自定义赛道数据或者默认赛道数据
    const cells = customCells || TRACK_CELLS;

    // 遍历所有赛道单元格，为每个单元格构建碰撞体
    for (const [gx, gz, name, orient] of cells) {
      // 跳过bump 类型的赛道块
      if (name === 'track-bump') continue;

      // 计算单元格中心的世界坐标(考虑全局缩放)
      // gx + 0.5:从网格坐标转换为单元格中心坐标
      const cx = (gx + 0.5) * CELL_RAW * S;
      const cz = (gz + 0.5) * CELL_RAW * S;

      // 获取方向角度并转换为弧度
      const deg = ORIENT_DEG[orient] ?? 0;
      const rad = (deg * Math.PI) / 180;
      const cr = Math.cos(rad),
        sr = Math.sin(rad);

      // 直道或终点线，创建两个平行的墙壁碰撞体
      if (name === 'track-straight' || name === 'track-finish') {
        // 为左右两侧创建墙壁，side = -1表示左侧，side = 1表示右侧
        for (const side of [-1, 1]) {
          // 计算墙壁在局部坐标系中的X偏移
          const lx = side * WALL_X;
          // 应用旋转矩阵将局部坐标系转换为世界坐标
          const wx = cx + lx * cr * S;
          const wz = cz + -lx * sr * S;
          // 碰撞体尺寸：厚度x高度x长度，直道墙壁贯穿整个单元
          const halfExtents = [hThick, hHeight, hLen];
          const position = [wx, wallY, wz];

          // 四元素表示绕Y轴旋转rad弧度
          const quaternion = [0, Math.sin(rad / 2), 0, Math.cos(rad / 2)];

          // 创建静态墙壁碰撞体
          rigidBody.create(world, {
            shape: box.create({ halfExtents }),
            motionType: MotionType.STATIC,
            objectLayer: world._OL_STATIC,
            position,
            quaternion,
            friction: 0.0,
            restitution: 0.1,
          });

          // 若开启调试模式，则创建调试方框
          if (debugGroup) addDebugBox(debugGroup, halfExtents, position, quaternion);
        }
      } else if (name === 'track-corner') {
        // 弯道，创建内外圆弧墙壁
        const wcx = cx + (ARC_CENTER_X * cr + ARC_CENTER_Z * sr) * S;
        const wcz = cz + (-ARC_CENTER_X * sr + ARC_CENTER_Z * cr) * S;

        const arcStart = -rad;
        // 创建外圆弧墙壁(半径较大，使用8段提高精度)
        addArcWall(wcx, wcz, arcStart, OUTER_R, OUTER_SEG, OUTER_SEG_HALF_LEN);
        // 内圆弧，半径较小，使用3段优化性能
        addArcWall(wcx, wcz, arcStart, INNER_R, INNER_SEG, INNER_SEG_HALF_LEN);
      }
    }
  }
}

/** 创建车辆球体物理体
 * 设计思路：
 *     1. 使用球体作为车辆的物理表示，简化碰撞检测
 * 2.视觉-物理分离，球体物理+ 视觉模型(在Vehicle.ts中桥接)
 * @param world
 * @param spawnPos
 */
export function createSphereBody(world, spawnPos) {
  // 创建一个半径为0.5的球体碰撞体，作为车辆的物理表示
  const body = rigidBody.create(world, {
    shape: sphere.create({ radius: 0.5 }),
    motionType: MotionType.DYNAMIC,
    objectLayer: world._OL_MOVING,
    position: spawnPos || [3.5, 0.5, 5],
    // 下面是物理参数
    mass: 1000.0,
    friction: 5,
    restitution: 0.1,
    linearDamping: 0.1,
    angularDamping: 4.0,
    gravityFactor: 1.5,
    motionQuality: MotionQuality.LINEAR_CAST, //运动质量
  });

  return body;
}

/** 添加调试方框，用于可视化物理碰撞
 *
 *
 * @param group
 * @param halfExtents - 半尺寸数组[半宽，半高，半长]
 * @param position - 位置数组[x, y, z]
 * @param quaternion - 四元数数组[x, y, z, w]
 */
function addDebugBox(group, halfExtents, position, quaternion) {
  //console.log('position:', position);
  // 根据半尺寸创建完整尺寸的几何体
  const geo = new THREE.BoxGeometry(halfExtents[0] * 2, halfExtents[1] * 2, halfExtents[2] * 2);
  const mesh = new THREE.Mesh(geo, _debugMaterial);
  mesh.position.set(position[0], position[1], position[2]);

  // 应用旋转
  if (quaternion) mesh.quaternion.set(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
  group.add(mesh);
}
