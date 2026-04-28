// ═══════════════════════════════════════════════════════════
//  输入处理(Input) - 核心交互设计
//  设计思路: 使用 Pointer Events API 统一处理鼠标和触屏。
//  支持三种操作模式:
//    1. 绘画(Drawing): 左键拖拽连续放置道路
//    2. 擦除(Erasing): 右键或擦除模式下左键拖拽
//    3. 平移(Panning): 中键/空格+左键/双指拖拽
//  缩放: 触屏双指 pinch 或 Ctrl+滚轮
//
//  触屏兼容设计:
//  - 用 pointers Map 追踪多指触控,双指时自动切换为 pan/pinch
//  - pointerup 时如果没有任何 pointermove(即 tap),触发单次放置
//  - touch-action: none 防止浏览器默认手势干扰
//  - 键盘快捷键: 1=道路, 2=擦除, 空格=临时平移
// ═══════════════════════════════════════════════════════════
import { useInputStore } from '@/stores/edit-car/input';
import * as THREE from 'three';
import { cellKey } from './common';
import { CELL_RAW, encodeCells, ORIENT_DEG } from '../drive-car/Track';
import { _E_2_, _N_8_, _S_4_, _W_1_, AUTOTILE, DIR_INFO, ORIENT_FLIP } from './constant';
let isPanning = false;
let isDrawing = false;
let isErasing = false;
let panStart = { x: 0, y: 0 };
let cameraStart = { x: 0, z: 0 };
let lastDrawCellXZ = null;
let spaceDown = false;

const pointers = new Map();
let pinchStartDistance = 0;
let pinchStartZoom = 1;
let el = null;
const ghostNeighborBackups = []; // 用于恢复原有格子的邻居信息

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/**
 * 添加事件监听
 * @param threeRef
 */
export function initInput(threeRef) {
  const inputState = useInputStore();
  //
  el = threeRef.value.renderer.domElement;

  //
  el.addEventListener('contextmenu', e => e.preventDefault()); // 禁用右键菜单
  // 鼠标按下
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });
    //console.log('pointerdown.......');
    // 双指触控 -> 平移+ 缩放
    if (pointers.size === 2) {
      isDrawing = false;
      isErasing = false;
      isPanning = true;
      //console.log('pointers.size === 2');
      const mid = getPinchMid();
      panStart.x = mid.x;
      panStart.y = mid.y;

      cameraStart.x = threeRef.value.cameraTarget.x;
      cameraStart.z = threeRef.value.cameraTarget.z;

      pinchStartDistance = getPinchDistance();
      pinchStartZoom = threeRef.value.camera.zoom;
      return;
    }

    if (pointers.size > 2) return;

    // 单指操作：中键，ctrl+左键，空格+左键->平移
    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey || spaceDown))) {
      isPanning = true; // 临时平移
      panStart.x = e.clientX;
      panStart.y = e.clientY;
      cameraStart.x = threeRef.value.cameraTarget.x;
      cameraStart.z = threeRef.value.cameraTarget.z;
      //console.log('e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey || spaceDown))');
      el.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 0) {
      if (inputState.getTool() === 'erase') {
        isErasing = true; // 清除
      } else {
        isDrawing = true; // 绘画
      }

      lastDrawCellXZ = null;
      //console.log('e.button===0');
      // 触屏：延迟到pointermove 确认是单指手势再绘制(防止双指误触)
      if (e.pointerType !== 'touch') handleDraw(threeRef, e.clientX, e.clientY);
    } else if (e.button === 2) {
      //console.log('e.button===2 ');
      isErasing = true; // 右键擦除
      lastDrawCellXZ = null;
      handleDraw(threeRef, e.clientX, e.clientY);
    }
  });
  //鼠标移动
  el.addEventListener('pointermove', e => {
    console.log('pointermove....');
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // 双指触控 -> 平移+ 缩放
    if (pointers.size === 2 && isPanning) {
      const mid = getPinchMid();
      const scale = (threeRef.value.frustum * 2) / window.innerHeight / threeRef.value.camera.zoom;

      threeRef.value.cameraTarget.x = cameraStart.x - (mid.x - panStart.x) * scale;
      threeRef.value.cameraTarget.z = cameraStart.z - (mid.y - panStart.y) * scale;

      threeRef.value.camera.position.x = threeRef.value.cameraTarget.x;
      threeRef.value.camera.position.z = threeRef.value.cameraTarget.z;

      threeRef.value.camera.lookAt(threeRef.value.cameraTarget.x, 0, threeRef.value.cameraTarget.z);

      const dist = getPinchDistance();
      threeRef.value.camera.zoom = Math.max(
        0.1,
        Math.min(10, pinchStartZoom * (dist / pinchStartDistance))
      );
      threeRef.value.camera.updateProjectionMatrix();
      return;
    }

    // 单指平移
    if (isPanning) {
      const zoom = threeRef.value.camera.zoom;
      const dx =
        (((e.clientX - panStart.x) / window.innerWidth) *
          threeRef.value.frustum *
          2 *
          (window.innerWidth / window.innerHeight)) /
        zoom;
      const dz =
        (((e.clientY - panStart.y) / window.innerHeight) * threeRef.value.frustum * 2) / zoom;

      threeRef.value.cameraTarget.x = cameraStart.x - dx;
      threeRef.value.cameraTarget.z = cameraStart.z - dz;
      threeRef.value.camera.lookAt(threeRef.value.cameraTarget.x, 0, threeRef.value.cameraTarget.z);
      return;
    }

    if (isDrawing || isErasing) {
      handleDraw(threeRef, e.clientX, e.clientY);
      return;
    }

    // 鼠标悬停时显示 ghost 预览(触屏不显示 ghost 节省性能)
    if (e.pointerType === 'mouse') {
      const cell = screenToGrid(threeRef, e.clientX, e.clientY);
      if (cell) {
        updateGhost(threeRef, cell.gx, cell.gz);
      } else {
        clearGhost(threeRef);
      }
    }
  });
  //鼠标抬起
  window.addEventListener('pointerup', e => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      // 触屏 tap: 如果之前延迟了绘制且没有 move,现在执行单次放置

      if ((isDrawing || isErasing) && lastDrawCellXZ === null && !isPanning) {
        handleDraw(threeRef, e.clientX, e.clientY);
      }
      isPanning = false;
      isDrawing = false;
      isErasing = false;
      lastDrawCellXZ = null;
      el.style.cursor = spaceDown ? 'grab' : '';
    }
  });

  window.addEventListener('pointercancel', e => {
    pointers.delete(e.pointerId);
  });

  //
  el.addEventListener(
    'wheel',
    e => {
      e.preventDefault();

      if (e.ctrlKey) {
        const zoomSpeed = 1.02;
        threeRef.value.camera.zoom *= e.deltaY > 0 ? 1 / zoomSpeed : zoomSpeed;
        threeRef.value.camera.zoom = Math.max(0.1, Math.min(10, threeRef.value.camera.zoom));
        threeRef.value.camera.updateProjectionMatrix();
      } else {
        const scale =
          (threeRef.value.frustum * 2) / window.innerHeight / threeRef.value.camera.zoom;
        threeRef.value.cameraTarget.x += e.deltaX * scale;
        threeRef.value.cameraTarget.z += e.deltaY * scale;
        threeRef.value.camera.position.x = threeRef.value.cameraTarget.x;
        threeRef.value.camera.position.z = threeRef.value.cameraTarget.z;

        threeRef.value.camera.lookAt(
          threeRef.value.cameraTarget.x,
          0,
          threeRef.value.cameraTarget.z
        );
      }
    },
    { passive: false }
  );

  window.addEventListener('keydown', e => {
    if (e.key === ' ') {
      if (!spaceDown) {
        spaceDown = true;
        el.style.cursor = 'grab';
      }
      e.preventDefault();
    } else if (e.key === '1') {
      selectTool;
    }
  });
  window.addEventListener('keyup', e => {
    if (e.key === ' ') {
      spaceDown = false;
      if (!isPanning) el.style.cursor = '';
    }
  });
}

export function selectTool(threeRef, tool) {
  const inputState = useInputStore();
  inputState.setTool(tool);
}

function updateGhost(threeRef, gx, gz) {
  clearGhost(threeRef);

  if (threeRef.value.tool === 'erase') {
    return;
  }

  const key = cellKey(gx, gz);
  if (threeRef.value.grid.has(key)) return;

  // 临时插入虚拟格子到grid 运行auto-tile 解析
  const ghostCell = { type: 'track-straight', orient: 0, isfinish: false, mesh: null };
  threeRef.value.grid.set(key, ghostCell);

  const [type, orient] = resolveNewTile(threeRef, gx, gz);
  ghostCell.type = type + '';
  ghostCell.orient = Number(orient);

  addGhostPiece(threeRef, type, orient, gx, gz, 0.4);

  // 预览邻居的变化
  const neighbors = [
    [gx, gz - 1],
    [gx, gz + 1],
    [gx + 1, gz],
    [gx - 1, gz],
  ];

  for (const [nx, nz] of neighbors) {
    const nKey = cellKey(nx, nz);
    const nCell = threeRef.value.grid.get(nKey);
    if (!nCell) continue;

    const nExits = getCellExits(nCell);
    const nConn = getConnectivityMask(threeRef, nx, nz);
    const nConnected = nExits & nConn;

    const [newType, newOrient] = resolveTile(threeRef, nx, nz);
    const proposedExits = getCellExits({ type: newType, orient: newOrient });
    if ((proposedExits & nConnected) !== nConnected) {
      continue;
    }

    const finialType = nCell.isFinish && newType === 'track-straight' ? 'track-finish' : newType;

    if (finialType !== nCell.type || newOrient !== nCell.orient) {
      if (nCell.mesh) {
        nCell.mesh.visible = false;
        ghostNeighborBackups.push({ cell: nCell });
      }

      addGhostPiece(threeRef, finialType, newOrient, nx, nz, 0.7);
    }
  }

  threeRef.value.grid.delete(key);
}

function addGhostPiece(threeRef, type, orient, gx, gz, opacity) {
  const model = threeRef.value.models[type];

  if (!model) return;

  const mesh = model.clone();
  mesh.position.set((gx + 0.5) * CELL_RAW, 0.5, (gz + 0.5) * CELL_RAW);

  const deg = ORIENT_DEG[orient] || 0;
  mesh.rotation.y = THREE.MathUtils.degToRad(deg);

  mesh.traverse(c => {
    if (c.isMesh) {
      c.material = c.material.clone();
      c.material.transparent = true;
      c.material.opacity = opacity;
    }
  });

  threeRef.value.ghostGroup.add(mesh);
}

function clearGhost(threeRef) {
  for (const { cell } of ghostNeighborBackups) {
    if (cell.mesh) cell.mesh.visible = true;
  }

  ghostNeighborBackups.length = 0;

  while (threeRef.value.ghostGroup.children.length > 0) {
    threeRef.value.ghostGroup.remove(threeRef.value.ghostGroup.children[0]);
  }
}

/**
 *  3D 空间中的坐标值转到网格坐标之中
 * @param threeRef
 * @param clientX
 * @param clientY
 */
function screenToGrid(threeRef, clientX, clientY) {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  //
  raycaster.setFromCamera(mouse, threeRef.value.camera);
  // 与y = 0.51 的水平面求交点(略高于地面，确保射线不会穿过模型)
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.51);
  const hit = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, hit);
  if (!hit) return null;

  const gx = Math.floor(hit.x / threeRef.value.cellWorld);
  const gz = Math.floor(hit.z / threeRef.value.cellWorld);
  return { gx: gx, gz: gz };
}
/**
 * 在鼠标点击处放置模型
 * 1. 需要把点击点转换到网格坐标系下
 * 2.放置模型需要计算模型的变换(什么模型？及旋转角度与已知的模型进行匹配)
 * @param threeRef
 * @param x
 * @param y
 * @returns
 */
function handleDraw(threeRef, x, y) {
  const cellXZ = screenToGrid(threeRef, x, y);
  if (!cellXZ) return;
  // 判断是否在同一个位置
  if (lastDrawCellXZ && lastDrawCellXZ.gx === cellXZ.gx && lastDrawCellXZ.gz === cellXZ.gz) {
    //console.log('点击同一个位置:.....');
    return;
  }

  lastDrawCellXZ = cellXZ;

  if (isErasing) {
    eraseRoad(threeRef, cellXZ.gx, cellXZ.gz);
  } else if (isDrawing) {
    placeRoad(threeRef, cellXZ.gx, cellXZ.gz);
  }
}

// ═══════════════════════════════════════════════════════════
//  格子操作(放置/擦除/清空)
//  设计思路:
//  - 点击已有格子时,如果是终点线则翻转方向(方便调整终点朝向)
//  - 新格子默认用直道,然后通过 resolveCellAndNeighbors 触发 auto-tile
//  - 擦除时先移除模型,然后重新解析邻居(邻居可能需要从弯道变回直道)
//  - 终点线不可擦除,保证赛道始终有终点
//  - clearAll 重置一切,但重新放置终点线
//  - 每次操作后自动 save() 到 localStorage,实现即时持久化
// ═══════════════════════════════════════════════════════════

function placeRoad(threeRef, gx, gz) {
  const key = cellKey(gx, gz);
  if (threeRef.value.grid.has(key)) {
    const cell = threeRef.value.grid.get(key);

    // 点击终点线 -> 翻转朝向(旋转180) 方便调整终点反向
    if (cell.isFinish) {
      cell.orient = ORIENT_FLIP[cell.orient] ?? cell.orient;
      placeMesh(threeRef, gx, gz, cell);
      save(threeRef);
    }

    return;
  }
  threeRef.value.grid.set(key, { type: 'track-straight', orient: 0, isFinish: false, mesh: null });
  resolveCellAndNeighbors(threeRef, gx, gz);
  save(threeRef);
}

function resolveCellAndNeighbors(threeRef, gx, gz) {
  resolveCell(threeRef, gx, gz);
  resolveCell(threeRef, gx, gz - 1);
  resolveCell(threeRef, gx, gz + 1);
  resolveCell(threeRef, gx + 1, gz);
  resolveCell(threeRef, gx - 1, gz);
}

/**
 * 擦除道路
 * @param threeRef
 * @param gx
 * @param gz
 */
function eraseRoad(threeRef, gx, gz) {
  // 1.获取指定的key
  const key = cellKey(gx, gz);
  if (!threeRef.value.grid.has(key)) return;

  const cell = threeRef.value.grid.get(key);
  if (cell.isFinish) return; // 终点线或者只有一个时，不可擦除

  if (cell.mesh) {
    threeRef.value.trackGroup.remove(cell.mesh);
  }
  threeRef.value.grid.delete(key);

  /**-------------------------------------
   * [1.优化点]计算当前位置四个方向的数据,最好的实现是获取四个方向上的类型和朝向之后，再
   * 从这个四个里面选择最优或者是最合适类型和朝向
   * 
   ------------------------------------------*/
  resolveCell(threeRef, gx, gz - 1); // 北方向
  resolveCell(threeRef, gx, gz + 1); // 南方向
  resolveCell(threeRef, gx + 1, gz); // 东
  resolveCell(threeRef, gx - 1, gz); // 西
  // 保存数据
  save(threeRef);
}

// ═══════════════════════════════════════════════════════════
//  持久化(Persistence) - 保存/加载/分享赛道
//  设计思路:
//  - save(): 将 grid 序列化为数组,通过 encodeCells 压缩编码后存到 localStorage
//  - loadSaved(): 优先从 URL 参数 ?map= 加载(分享链接),其次从 localStorage 加载
//  - 分享功能: 将赛道编码到 URL 中,无需后端服务器,纯前端实现赛道分享
//  - Play 按钮: 用相同的编码打开游戏页面,编辑器即游戏的数据入口
//  - encodeCells/decodeCells 由 Track.js 提供,使用高效的字符串编码
// ═══════════════════════════════════════════════════════════
function save(threeRef) {
  const arr = [];
  // Map 可以直接进行循环
  for (const [key, cell] of threeRef.value.grid) {
    const [gx, gz] = key.split(',').map(Number);

    arr.push([gx, gz, cell.type, cell.orient]);
  }
  const encoded = encodeCells(arr);

  localStorage.setItem('racing-editor-cells', encoded);
}

/** 解析并放置一个格子(自动选择模型和朝向)
 * 新格子使用：resolveNewTile,已用格子使用:resolveTile
 * @param threeRef
 * @param gx 东南西北
 * @param gz 东南西北 四个方向
 *
 */
function resolveCell(threeRef, gx, gz) {
  const key = cellKey(gx, gz);
  const cell = threeRef.value.grid.get(key);
  if (!cell) return;

  let baseType, orient; // 得到类型和方向
  if (!cell.mesh) {
    // 如果当前方向上，还是空的，没有放置模型，则计算当前位置的类型和朝向
    [baseType, orient] = resolveNewTile(threeRef, gx, gz);
  } else {
    // 已经存在模型了，则计算连接行，需要调整角度以便进行匹配
    const cMask = getConnectivityMask(threeRef, gx, gz);
    const currentExits = getCellExits(cell);
    const currentConnected = currentExits & cMask;

    [baseType, orient] = resolveTile(threeRef, gx, gz);

    const proposedExits = getCellExits({ type: baseType, orient: orient });
    if ((proposedExits & currentConnected) !== currentConnected) {
      return;
    }
  }

  const type = cell.isFinish && baseType === 'track-straight' ? 'track-finish' : baseType;

  if (cell.type === type && cell.orient === orient && cell.mesh) return;
  cell.type = type;
  cell.orient = orient;

  placeMesh(threeRef, gx, gz, cell);
}

/**
 *
 * @param threeRef
 * @param gx
 * @param gz
 */
function resolveTile(threeRef, gx, gz) {
  const cMask = getConnectivityMask(threeRef, gx, gz);
  if (cMask !== 0) return AUTOTILE[cMask];

  // ，没有实际连接
  const pMask = getPresenceMask(threeRef, gx, gz);
  if (pMask !== 0) {
    const dirs = [
      [0, -1, 8], // 北
      [0, 1, 4], // 南
      [1, 0, 2], // 东
      [-1, 0, 1], // 西
    ];

    for (const [dx, dz, bit] of dirs) {
      if (!(pMask & bit)) continue;

      const neighbor = threeRef.value.grid.get(cellKey(gx + dx, gx + dz));

      if (!neighbor) continue;

      const exits = getCellExits(neighbor);

      if (exits & 12) return ['track-straight', 0];
      if (exits & 3) return ['track-straight', 16];
    }
  }

  return AUTOTILE[0];
}

function getPresenceMask(threeRef, gx, gz) {
  let mask = 0;
  if (threeRef.value.grid.has(cellKey(gx, gz - 1))) mask |= _N_8_;
  if (threeRef.value.grid.has(cellKey(gx, gz + 1))) mask |= _S_4_;
  if (threeRef.value.grid.has(cellKey(gx + 1, gz))) mask |= _E_2_;
  if (threeRef.value.grid.has(cellKey(gx - 1, gz))) mask |= _W_1_;

  return mask;
}
/**
 * 在当前位置处，原来没有放置模型，现在则新计算得到当前块的类型和朝向
 * @param threeRef
 * @param gx
 * @param gz
 * @returns
 */
function resolveNewTile(threeRef, gx, gz) {
  // 1.获取“可用连接掩码”，如果没有则旋转方向
  const pMask = getAvailableMask(threeRef, gx, gz);

  if (bitCount(pMask) >= 3) {
    return AUTOTILE[pickBestPair(threeRef, pMask, gx, gz)];
  }

  return AUTOTILE[pMask];
}

/**
 *  当新格子有3+ 个邻居时，选出最佳的两个方向连接
 * 1.优先选择弯道 > 直道  ，在相同优先级下，选邻居已有的连接更多的组合
 * 2.这样可以产生更自然的赛道
 * @param mask
 * @param gx
 * @param gz
 */
function pickBestPair(threeRef, mask, gx, gz) {
  // 循环遍历所有的方向，找到对应的mask
  const active = DIR_INFO.filter(d => mask & d.bit);
  if (active.length <= 2) return mask; // 只有两个方向可用，不用考虑

  let bestMask = active[0].bit | active[1].bit; // 最佳组合
  let bestScore = -1;
  let bestIsCorner = false;

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const pairMask = active[i].bit | active[j].bit;
      const isCorner = pairMask !== 3 && pairMask !== 12;

      const s1 = connectedExitCount(threeRef, gx + active[i].dx, gz + active[i].dz);
      const s2 = connectedExitCount(threeRef, gx + active[j].dx, gz + active[j].dz);

      const score = s1 + s2;

      if ((isCorner && !bestIsCorner) || (isCorner == bestIsCorner && score > bestScore)) {
        bestMask = pairMask;
        bestScore = score;
        bestIsCorner = isCorner;
      }
    }
  }

  return bestMask;
}

/**
 * 计算一个格子当前有多少个出口确实连接到了邻居
 * @param gx
 * @param gz
 */
function connectedExitCount(threeRef, gx, gz) {
  const cell = threeRef.value.grid.get(cellKey(gx, gz));

  if (!cell) return 0;

  return bitCount(getCellExits(cell) & getConnectivityMask(threeRef, gx, gz));
}

/**
 * 计算“可用连接掩码”，邻居要么有出口朝向自己，要么有未连接的出口可以改变朝向
 * @param threeRef
 * @param gx
 * @param gz
 * @returns
 */
function getAvailableMask(threeRef, gx, gz) {
  let mask = 0;
  const dirs = [
    //[dx, dz, bit, oppBit] ：dx,dz表示当前的gx,gz的偏移值,
    // bit: 表示当前格子有向北的出口
    // oppBit: 检查邻居格子是否有向南的出口
    [0, -1, 8, 4], // 北(8)-> 可连接的是南方(4)
    [0, 1, 4, 8], // 南(4)->可连接的是北方(8)
    [1, 0, 2, 1], // 东(2)->可连接的是西方(1)
    [-1, 0, 1, 2], // 西(1)->可连接的是东方(2)
  ]; // 这是用来定义规则的
  // 循环判断四个方向上的格子
  for (const [dx, dz, bit, oppBit] of dirs) {
    // 当前方向上没有找到数据，说明当前方向上还未放置赛道
    const neighborCell = threeRef.value.grid.get(cellKey(gx + dx, gz + dz));
    if (!neighborCell) continue;
    // 获取邻居格子的出口位掩码
    const exits = getCellExits(neighborCell);

    // 邻居有出口朝向自己，肯定可以使用
    if (exits && oppBit) {
      mask |= bit; // 执行：按位或操作，将当前方向的出口位添加到掩码中
      continue;
    }
    // 邻居还有未连接的出口(连接数< 2),可以改变邻居朝向，让他连过来
    const conn = getConnectivityMask(threeRef, gx + dx, gz + dz);
    if (bitCount(exits & conn) < 2) mask |= bit;
  }
  return mask;
}

/**
 * 计算4-bit 掩码中“1” 的个数
 * @param mask
 *
 * (mask >> 3 & 1) 的值就是 1，它提取了原来的最高位（第 3 位，从 0 开始计数）
 */
function bitCount(mask) {
  //        把最高位的 1 移动到最低位 ，把左边第二位移动2位到右边第一位，把左边第2位移动1位到右边第一位
  return ((mask >> 3) & 1) + ((mask >> 2) & 1) + ((mask >> 1) & 1) + (mask & 1);
}

/**
 * 检查邻居的四个方向是否有出口朝向当前格子-> 返回“实际连接掩码”
 * @param ngx
 * @param ngz
 */
function getConnectivityMask(threeRef, ngx, ngz) {
  let mask = 0;
  // 1.查询邻居的北方位置出的对象
  const n = threeRef.value.grid.get(cellKey(ngx, ngz - 1)); // 北
  // 如果存在，则判断其南方位置是否能连接,接着与北方出口进行或运行
  if (n && getCellExits(n) && _S_4_) mask |= _N_8_;

  // 2.查询邻居的南方位置出的对象
  const s = threeRef.value.grid.get(cellKey(ngx, ngz + 1)); // 南
  if (s && getCellExits(s) && _N_8_) mask |= _S_4_;

  // 3.查询邻居的东方位置出的对象
  const e = threeRef.value.grid.get(cellKey(ngx + 1, ngz)); // 东
  if (e && getCellExits(e) && _W_1_) mask |= _E_2_;

  // 4.查询邻居的西方位置出的对象
  const w = threeRef.value.grid.get(cellKey(ngx - 1, ngz)); // 西
  if (w && getCellExits(w) && _E_2_) mask |= _W_1_;

  return mask;
}
/**
 *  根据格子的类型和朝向，返回出口位掩码
 * @param cell
 */
function getCellExits(cell) {
  const t = cell.type;
  const o = cell.orient;
  // 判断转弯赛道在四个方向上的对应入口+出口的掩码
  // 默认track-corner 是一个向左出口的弯道，也就是指初始情况(未做任何旋转时：入口在南方，出口在西方)
  // 旋转按照Three.js 的正角度旋转 = 逆时针（CCW）旋转：ORIENT_DEG = { 0: 0, 10: 180, 16: 90, 22: 270 };
  if (t === 'track-corner') {
    // 如果是转弯赛道
    if (o === 0) return 5; // 旋转0°之后，南(4)+西(1) 表示未做任何旋转时
    if (o === 16) return 6; // 旋转90°之后，入口在东方，出口在南方 = 东(2) + 南(4) = 6
    if (o === 10) return 10; // 旋转180°之后，入口在北方，出口在东方=北(8)+东(2) = 10
    if (o === 22) return 9; // 旋转270°之后，入口在西方，出口在北方=西(1)+北(8) = 9
  }

  // 其他类型赛道的出口位掩码
  if (o === 0 || o === 10) return 12; // 旋转0°或180°之后，方向相反=南北朝向
  return 3; // 东西朝向
}
/**
 * 计算两个点的距离
 */
function getPinchDistance() {
  const pts = [...pointers.values()];
  const dx = pts[1].x - pts[0].x;
  const dy = pts[1].y - pts[0].y;
  return Math.sqrt(dx * dx + dy * dy);
}
/**
 * 获取当前指针中间位置
 */
function getPinchMid() {
  const pts = [...pointers.values()];
  return {
    x: (pts[0].x + pts[1].x) / 2,
    y: (pts[0].y + pts[1].y) / 2,
  };
}

/** 在场景指定位置处，放置or更新的3D模型
 * 位置 = (gx + 0.5) * CELL_RAW , (gz + 0.5) * CELL_RAW ,使位置在格子的中心点位置，旋转根据ORIENT_DEG映射朝向
 *
 * @param gx
 * @param gz
 * @param cell -{type, orient, isFinish, mesh: null}
 */
export function placeMesh(threeRef, gx, gz, cell) {
  if (cell.mesh) {
    // 存在3D模型，存在模型表示更新替换之前的模型
    threeRef.value.trackGroup.remove(cell.mesh);
  }
  // 找到指定名称的模型
  const model = threeRef.value.models[cell.type];
  if (!model) return;
  // 克隆模型，避免直接操作原始模型
  const mesh = model.clone();
  // 把位置设置到格子到中心点处
  mesh.position.set((gx + 0.5) * CELL_RAW, 0.5, (gz + 0.5) * CELL_RAW);
  // 根据朝向旋转模型
  mesh.rotation.y = THREE.MathUtils.degToRad(ORIENT_DEG[cell.orient] || 0);
  mesh.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  threeRef.value.trackGroup.add(mesh);
  cell.mesh = mesh;
}

export function getCellsArray(threeRef) {
  const arr = [];
  for (const [key, cell] of threeRef.value.grid.entries()) {
    const [gx, gz] = key.split(',').map(Number);
    arr.push([gx, gz, cell.type, cell.orient]);
  }
  return arr;
}

export function clearAll(threeRef) {
  for (const [, cell] of threeRef.value.grid.entries()) {
    if (cell.mesh) threeRef.value.trackGroup.remove(cell.mesh);
  }

  threeRef.value.grid.clear();
  placeFinishOrStart(threeRef);
  save(threeRef);
}
/**
 * 完成或者初始化的时候，在(0,0)位置处，放置一个元素
 * @param threeRef
 */
export function placeFinishOrStart(threeRef) {
  const cell = { type: 'track-finish', orient: 0, isFinish: true, mesh: null };
  threeRef.value.grid.set(cellKey(0, 0), cell);
  placeMesh(threeRef, 0, 0, cell);
}
