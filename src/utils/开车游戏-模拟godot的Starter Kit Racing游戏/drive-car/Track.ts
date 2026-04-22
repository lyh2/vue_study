import * as THREE from 'three';

export const ORIENT_DEG = { 0: 0, 10: 180, 16: 90, 22: 270 };

/**
 * 网格系统基础参数
 *
 * CELL_RAW:原始单元格大小，
 * GRID_SCALE:全局缩放比例，用于调整赛道整体大小
 */

export const CELL_RAW = 9.99; // 原始单元格大小
export const GRID_SCALE = 0.75; // 全局缩放比例，调整赛道整体大小

const TYPE_NAMES = [
  'track-straight', // 直线轨道,-> 0
  'track-corner', // 转角轨道,-> 1
  'track-bump', // -> 2
  'track-finish', // -> 3
];
const TYPE_INDEX = {};
for (let i = 0; i < TYPE_NAMES.length; i++) TYPE_INDEX[TYPE_NAMES[i]] = i;

/**
 * 方向编码映射关系表
 *
 * 设计思路：
 * 1. ORIENT_TO_GODOT : 将方向索引映射到godot的枚举值
 * 2. GODOT_TO_ORIENT: 将godot的枚举值映射到方向索引值
 * 3. 方向索引值0-3分别对应左，右，前，后四个方向，保持与godot的一致
 * 映射关系：
 * 0 -> Godot值 0 -> 0°
 * 1 -> Godot值 16 -> 90°
 * 2 -> Godot值 10 -> 180°
 * 3 -> Godot值 22 -> 270°
 */
const ORIENT_TO_GODOT = [0, 16, 10, 22];
const GODOT_TO_ORIENT = { 0: 0, 16: 1, 10: 2, 22: 3 };

export { TYPE_NAMES };
/**
 *
 * @param str
 * @returns
 */
function base64UrlToBytes(str: string) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/'); // 将base64字符串中的'-'替换为'+'和'/'
  const binary = atob(base64); // 将base64字符串转换为二进制字符串
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** 将字节数组转换为Base64URL编码
 * Base64URL 与 标准的Base64 的区别：
 * 1. '+' -> '-'
 * 2. '/' -> '_' 这样避免URL编码
 * 3. 移除末尾的'='填充字符，因为URL中不需要
 *
 *
 * @param bytes
 * @returns {string} Base64URL编码 字符串
 */
function bytesToBase64Url(bytes: Uint8Array) {
  // 将字节数组转换为二进制字符串
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
    return btoa(binary)
      .replace(/\+/g, '-') // 将'+'替换为'-'
      .replace(/\//g, '_') // 将'/'替换为'_'
      .replace(/=+$/, ''); // 移除末尾的'='填充字符
  }
}

/**
 * 将赛道数据编码为进奏的二进制格式
 * 每个赛道块占用3个字节：
 * 字节0：X坐标(gx + 128,支持-128到127的范围) => 将数据从0-> 255映射到-128->127
 * 字节1：Z坐标(gz + 128)
 * 字节2：高6位=类型索引(0-3)，低2位=方向索引(0-3)
 * --------------------------------------------
 * 一个字节（8位）能表示256个不同的值：
    - 无符号字节：0 到 255（256个值）
    - 有符号字节（补码）：-128 到 127（也是256个值）
    - 编码中 gx + 128 将坐标从有符号范围 [-128, 127] 映射到无符号范围 [0, 255]，避免负值存储问题。所以注释里的“支持-128到127的范围”指的是原始坐标范围，而不是字节的表示范围。

 * @param cells =[[gx,gz,name,godotOrient]]
 *  * 设计思路：
 * 1. 使用+128偏移将负坐标转换为无符号字节
 * 2. 位操作压缩类型和方向到一个字节
 * 3. Base64URL编码避免URL特殊字符问题
 * =========================================
 */
export function encodeCells(cells) {
  const bytes = new Uint8Array(cells.length * 3); // 每个赛道块占用3个字节
  for (let i = 0; i < cells.length; i++) {
    const [gx, gz, name, godotOrient] = cells[i]; // 解构赛道块信息
    const ti = TYPE_INDEX[name] ?? 0; // 赛道类型索引
    const oi = GODOT_TO_ORIENT[godotOrient] ?? 0; // 方向索引
    // 坐标编码： + 128 将范围从[-128,127] 映射到[0,255]
    bytes[i * 3] = gx + 128;
    bytes[i * 3 + 1] = gz + 128;
    // 类型和方向编码： 高6位=类型索引(0-3)，低2位=方向索引(0-3)
    // 例如：类型= 2(二进制10)，方向=1(二进制01) -> 1001 = 9；把类型向左移动了两位 1 * 2^3 + 1 * 2^ 0 = 8+1=9
    bytes[i * 3 + 2] = (ti << 2) | oi; // 类型索引左移2位，方向索引直接或到低2位
  }
  return bytesToBase64Url(bytes);
}

export function decodeCells(str: string) {
  const bytes = base64UrlToBytes(str);
  const cells = [];

  for (let i = 0; i + 2 < bytes.length; i += 3) {
    const gx = bytes[i] - 128;
    const gz = bytes[i + 1] - 128; //
    const packed = bytes[i + 2];
    const ti = (packed >> 2) & 0x03;
    const oi = packed & 0x03;

    cells.push([gx, gz, TYPE_NAMES[ti], ORIENT_TO_GODOT[oi]]);
  }
  return cells;
}

export function computeTrackBounds(cells: Array<any>) {
  // 如果没有赛道数据，返回默认的赛道边界
  if (!cells || cells.length === 0)
    return { centerX: 0, centerZ: 0, halfWidth: 30, halfHeight: 30 };
  // 计算赛道的最小，最大值坐标值
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [gx, gz, _, __] of cells) {
    minX = Math.min(minX, gx);
    maxX = Math.max(maxX, gx);
    minZ = Math.min(minZ, gz);
    maxZ = Math.max(maxZ, gz);
  }
  // 计算边界参数(考虑全局缩放)
  const S = CELL_RAW * GRID_SCALE; //
  const centerX = ((minX + maxX + 1) / 2) * S; //
  const centerZ = ((minZ + maxZ + 1) / 2) * S;
  const halfWidth = ((maxX - minX + 1) / 2) * S + S;
  const halfHeight = ((maxZ - minZ + 1) / 2) * S + S;
  return { centerX, centerZ, halfWidth, halfHeight };
}

/** 计算车辆在赛道中生成的位置
 * 1. 优先使用“finish” 类型的赛道块作为生成点，确保车辆从起点开始
 * 2. 如果没有“finish”类型的赛道块，则选择第一个赛道块作为生成点
 * 3. 考虑全局缩放因子(GRID_SCALE)
 * 4. 返回位置和角度，用于初始化车辆
 *
 * @param cells
 */
export function computeSpawnPosition(cells: Array<any>) {
  // 获取第一个元素
  let cell = cells[0];
  // 查找finish类型的赛道块，作为起点
  for (const c of cells) {
    if (c[2] === 'track-finish') {
      cell = c;
      break;
    }
  }

  // 如果没有找到有效的单元格，返回默认出生位置
  if (!cell) return { position: [3.5, 0.5, 5], angle: 0 };
  // 计算世界坐标位置，考虑全局缩放因子
  const gx = cell[0];
  const gz = cell[1];
  const x = (gx + 0.5) * CELL_RAW * GRID_SCALE; //
  const z = (gz + 0.5) * CELL_RAW * GRID_SCALE;

  // 计算出生的角度
  const orient = cell[3];
  const angle = THREE.MathUtils.degToRad(ORIENT_DEG[orient] || 0); // 将方向索引转换为角度，默认为0度
  return { position: [x, 0.5, z], angle: angle };
}

/** 构建赛道
 * 设计思路：
 * 1.分层构建：赛道块，装饰物，NPC车辆分开管理
 * 2.支持自定义赛道，此参数可以覆盖默认布局
 * 3.自动装饰填充，在赛道周围智能生成环境装饰
 * 4.性能优化：使用InstancedMesh 批量渲染相同模型
 *
 * @param scene
 * @param models
 * @param customCells - 可选自定义赛道数据，null时使用默认赛道
 */
export function buildTrack(scene: THREE.Scene, models: Object, customCells: Array<any> = null) {
  // 创建赛道组，整体下移0.5 单位
  const trackGroup = new THREE.Group();
  trackGroup.name = '赛道组';
  trackGroup.position.y = -0.5;

  // 分层管理，赛道块，装饰物，NPC车辆
  const trackPieceGroup = new THREE.Group();
  trackPieceGroup.name = '轨道组';
  const decoGroup = new THREE.Group();
  decoGroup.name = '装饰物组';

  // 使用自定义赛道数据或者默认赛道数据
  const cells = customCells || TRACK_CELLS;

  // 1. 放置所有赛道块
  for (const [gx, gz, name, orient] of cells) {
    const piece = placePiece(models, name, gx, gz, orient);
    if (piece) trackPieceGroup.add(piece);
  }
  // 2. 如果是默认赛道，放置手动布置的装饰物
  if (!customCells) {
    for (const [gx, gz, name, orient] of DECO_CELLS) {
      const piece = placePiece(models, name + '', Number(gx), Number(gz), Number(orient));
      if (piece) decoGroup.add(piece);
    }
  }

  // 3. 自动生成装饰物填充空白区域
  {
    // 计算已经占用的网格位置
    const occupied = new Set();
    let minX = Infinity,
      maxX = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;
    // 标记所有赛道块位置为已占用
    for (const [gx, gz] of cells) {
      occupied.add(gx + ',' + gz);
      minX = Math.min(minX, gx);
      maxX = Math.max(maxX, gx);
      minZ = Math.min(minZ, gz);
      maxZ = Math.max(maxZ, gz);
    }

    // 如果是默认赛道，也标记手动装饰物的位置
    if (!customCells) {
      for (const [gx, gz] of DECO_CELLS) {
        occupied.add(gx + ',' + gz);
        minX = Math.min(minX, gx);
        maxX = Math.max(maxX, gx);
        minZ = Math.min(minZ, gz);
        maxZ = Math.max(maxZ, gz);
      }
    }

    // 在赛道周围3格范围内填充装饰物
    const pad = 3;
    const emptyPositions = []; // 空地区域的位置
    const forestPositions = []; // 森林区域的位置
    const tentPositions = []; // 帐篷区域的位置
    /**
     * 自定义确定性哈希函数，用于伪随机但可重复的装饰物放置
     * 算法：
     * 1.相同输入总是产生相同的输出，确保每次生成的相同装饰布局
     * 2.使用质数乘法避免模式重复
     * 3.通过XOR和位移操作增加随机性
     * @param gx
     * @param gz
     */
    function customHash(gx, gz) {
      let h = gx * 374761393 + gz * 668265263; // 使用质数乘法
      h = (h ^ (h >> 13)) * 1274126177; // 增加随机性
      return (h ^ (h >> 16)) >>> 0; // 转为32位无符号整数
    }

    // 扫描赛道周围的区域，生成空地，森林，帐篷区域
    for (let gz = minZ - pad; gz <= maxZ + pad; gz++) {
      for (let gx = minX - pad; gx <= maxX + pad; gx++) {
        // 跳过已占用的位置
        if (occupied.has(gx + ',' + gz)) continue;
        // 计算到赛道边界的距离// gx=7,minX=-9,maxX=9,pad=3 =>distX = 0
        const distX = gx < minX ? minX - gx : gx > maxX ? gx - maxX : 0;
        const distZ = gz < minZ ? minZ - gz : gz > maxZ ? gz - maxZ : 0;
        const dist = Math.max(distX, distZ);

        // 转换为世界坐标
        const x = (gx + 0.5) * CELL_RAW;
        const z = (gz + 0.5) * CELL_RAW;

        if (dist <= 1) {
          // 距离赛道1格以内，空地区域，15%概率放置帐篷
          if (customHash(gx, gz) % 7 === 0) {
            tentPositions.push(x, z, customHash(gx, gz) % 4);
          } else {
            emptyPositions.push(x, z);
          }
        } else {
          // 距离赛道1格以外为森林区域
          forestPositions.push(x, z);
        }
      }
    }
  }

  // 4. 组合所有部分并设置缩放
  trackGroup.add(trackPieceGroup);
  trackGroup.add(decoGroup);
  trackGroup.scale.setScalar(0.75);
  scene.add(trackGroup);

  // 5.更新世界矩阵并启用阴影
  trackGroup.updateMatrixWorld(true);
  trackGroup.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // 6. 如果是默认赛道，添加NPC
  if (!customCells) {
    for (const [key, x, y, z, rotDeg] of NPC_TRUCKS) {
      const model = models[key];
      if (!model) continue;

      const npc = model.clone();
      npc.position.set(x, y, z);
      npc.rotation.y = THREE.MathUtils.degToRad(rotDeg + 180);
      npc.traverse(c => {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      scene.add(npc);
    }
  }
}

/**
 *
 * @param models - 模型字典
 * @param name -当前模型的名称
 * @param gx - 网格列坐标，表示场景的网格，非3D空间的，即逻辑的位置
 * @param gz - 网格行坐标
 * @param orient - 方向索引，0-3分别对应左，右，前，后四个方向
 * @returns {THREE.Object3D | null}
 */
export function placePiece(
  models: Map<string, THREE.Mesh>,
  name: string,
  gx: number,
  gz: number,
  orient: number
) {
  // 获取模型
  const model = models[name];
  if (!model) return null;
  // 克隆模型避免修改原始数据
  const piece = model.clone();
  // 网格坐标转换为世界坐标
  // +0.5 将网格坐标转换为单元格中心位置
  piece.position.set((gx + 0.5) * CELL_RAW, 0.5, (gz + 0.5) * CELL_RAW);
  // 方向转换为角度
  const deg = ORIENT_DEG[orient] ?? 0;
  piece.rotation.y = THREE.MathUtils.degToRad(deg);
  return piece;
}

/**
 * 默认赛道布局数据
 *
 * 数据结构：[网格X, 网格Z, 模型名称, Godot方向值]
 *
 * 设计思路：
 * 1. 使用网格坐标系统，便于编辑和计算
 * 2. 每个赛道块包含：位置(X,Z)、类型、方向
 * 3. 方向值使用Godot的枚举值，保持兼容性
 * 4. 这是一个简单的赛道示例，展示基本的赛道构建
 *
 * 赛道布局可视化：
 *   (-3,-3)拐角 ↗  (-2,-3)直道 →  (-1,-3)直道 →  (0,-3)拐角 ↘
 *        ↓                            ↓
 *   (-3,-2)直道                    (0,-2)直道
 *        ↓                            ↓
 *   (-3,-1)拐角 ← (-2,-1)拐角 ←    (0,-1)直道
 *                    ↓
 *              (-2,0)直道 →      (0,0)终点线
 *                    ↓                ↓
 *              (-2,1)直道 →      (0,1)直道
 *                    ↓                ↓
 *              (-2,2)拐角 ↗ (-1,2)直道 → (0,2)拐角 ↘
 */
export const TRACK_CELLS = [
  [-3, -3, 'track-corner', 16], // 左上角，90°旋转
  [-2, -3, 'track-straight', 22], // 上直道，270°旋转
  [-1, -3, 'track-straight', 22], // 上直道，270°旋转
  [0, -3, 'track-corner', 0], // 右上角，0°旋转
  [-3, -2, 'track-straight', 0], // 左直道，0°旋转
  [0, -2, 'track-straight', 0], // 右直道，0°旋转
  [-3, -1, 'track-corner', 10], // 左下角，180°旋转
  [-2, -1, 'track-corner', 0], // 中间拐角，0°旋转
  [0, -1, 'track-straight', 0], // 右直道，0°旋转
  [-2, 0, 'track-straight', 10], // 中间直道，180°旋转
  [0, 0, 'track-finish', 0], // 终点线，0°旋转
  [-2, 1, 'track-straight', 10], // 中间直道，180°旋转
  [0, 1, 'track-straight', 0], // 右直道，0°旋转
  [-2, 2, 'track-corner', 10], // 左下拐角，180°旋转
  [-1, 2, 'track-straight', 16], // 下直道，90°旋转
  [0, 2, 'track-corner', 22], // 右下拐角，270°旋转
];

/**
 * 手动布置的装饰物单元格数据
 *
 * 设计思路：
 * 1. 在赛道周围创建环境氛围
 * 2. 使用森林和帐篷装饰物填充空白区域
 * 3. 部分区域留空('decoration-empty')创建视觉变化
 * 4. 这些是基础装饰，后续会通过算法自动填充更多
 *
 * 布局模式：
 * - 赛道周围3-4格内：帐篷和空地区域
 * - 更远区域：密集森林
 * - 赛道内部区域：保持空旷
 */
const DECO_CELLS = [
  // 特定位置的帐篷装饰
  [-4, -2, 'decoration-tents', 10],
  [-1, -4, 'decoration-tents', 22],
  [-1, 1, 'decoration-tents', 22],

  // 外围森林区域（-9到4行，-8到4列）
  // 使用密集的网格数据创建连续的森林背景
  [-8, -9, 'decoration-forest', 0],
  [-7, -9, 'decoration-forest', 0],
  [-6, -9, 'decoration-forest', 0],
  [-5, -9, 'decoration-forest', 0],
  [-4, -9, 'decoration-forest', 0],
  [-3, -9, 'decoration-forest', 0],
  [-2, -9, 'decoration-forest', 0],
  [-1, -9, 'decoration-forest', 0],
  [0, -9, 'decoration-forest', 0],
  [1, -9, 'decoration-forest', 0],
  [2, -9, 'decoration-forest', 0],
  // ... 更多森林单元格（为了可读性，保持原格式）
  // 这些数据可能是从Godot编辑器导出的，或者是手动创建的背景填充
];

/**
 * NPC卡车位置数据
 *
 * 数据结构：[模型名称, X位置, Y位置, Z位置, 旋转角度(度)]
 *
 * 设计思路：
 * 1. 在赛道周围放置静态的NPC车辆，增加场景真实感
 * 2. 使用世界坐标而非网格坐标，可以精确控制位置
 * 3. 旋转角度已经调整(+180)，可能是为了匹配模型朝向
 * 4. 只在默认赛道中使用，自定义赛道不显示NPC
 */
const NPC_TRUCKS = [
  ['vehicle-truck-green', -3.51, -0.01, 12.7, 98.0], // 右上区域
  ['vehicle-truck-purple', -23.78, -0.14, -13.56, 0.0], // 左下区域
  ['vehicle-truck-red', -1.36, -0.15, -23.8, 155.9], // 右下区域
];
