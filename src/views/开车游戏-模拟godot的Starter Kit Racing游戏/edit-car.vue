<template>
  <div class="container" ref="container"></div>
  <div id="toolbar">
    <button id="btn-road" class="{{threeRef.tool == 'road' ? 'active':''" @click="onRoad">
      Road
    </button>
    <button id="btn-erase" @click="onErase">Erase</button>
    <div class="separator"></div>
    <button id="btn-play" class="{{threeRef.tool =='play' ? 'action' :'' }}" @click="onPlay">
      Play
    </button>
    <button id="btn-share" class="{{threeRef.tool == 'share' ? 'action' :''}}" @click="onShare">
      Share
    </button>
    <div class="separator"></div>
    <button id="btn-clear" class="danger" @click="onClear">Clear</button>
  </div>

  <div id="toast"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, shallowRef } from 'vue';
import * as THREE from 'three';
import {
  CELL_RAW,
  decodeCells,
  GRID_SCALE,
  encodeCells,
} from '@/utils/开车游戏-模拟godot的Starter Kit Racing游戏/drive-car/Track';
const container = ref(null);
import { GLTFLoader } from 'three/examples/jsm/Addons';
import {
  initInput,
  placeMesh,
  selectTool,
  getCellsArray,
  clearAll,
  placeFinishOrStart,
} from '@/utils/开车游戏-模拟godot的Starter Kit Racing游戏/edit-car/core';
import { cellKey } from '@/utils/开车游戏-模拟godot的Starter Kit Racing游戏/edit-car/common';
// -------------全局状态------------------
// grid:用gx,gz 字符串做key的map，存每个格子的类型/朝向/是否是终点/对应的three.js Mesh
// 当前工具类型：road，erase，clear，share
const trackGroup = new THREE.Group(); // 赛道组
const ghostGroup = new THREE.Group(); // 透明赛道组
const threeRef = shallowRef({
  camera: null,
  renderer: null,
  scene: null,
  cameraTarget: null,
  cellWorld: 0,
  trackGroup: null,
  ghostGroup: null,
  models: {},
  grid: new Map(),
  frustum: 30,
});
// // ------ toast 提示

onMounted(() => {
  /* -- 自动拼接系统--------------------------
  采用4-bit 位掩码表示4个方向的连通性：
  N=8(1000),S=4(0100),E=2(0010),W=1(0001)
  每个格子根据相邻的连接情况，自动选择合适的模型(直道、弯道)和朝向
  0-15，供16种情况覆盖了所有可能的邻居组合
  */

  init();
});

async function init() {
  // 终点线方向翻转映射(点击终点线可旋转 180°)
  //const ORIENT_FLIP = { 0: 10, 10: 0, 16: 22, 22: 16 };

  // 使用俯视正交相机便于精确的网格对齐操作

  //---------renderer-----------------------
  threeRef.value.renderer = new THREE.WebGLRenderer({ antialias: true });
  threeRef.value.renderer.setSize(window.innerWidth, window.innerHeight);
  threeRef.value.renderer.setPixelRatio(window.devicePixelRatio);
  threeRef.value.renderer.shadowMap.enabled = true;
  threeRef.value.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeRef.value.renderer.toneMappingExposure = 1;
  container.value.appendChild(threeRef.value.renderer.domElement);

  //-----------------------------scene----

  threeRef.value.scene = new THREE.Scene();
  threeRef.value.scene.background = new THREE.Color(0xadb2ba);
  threeRef.value.scene.fog = new THREE.Fog(0xadb2ba, 80, 160);

  // 主方向光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(11.4, 15, -5.3);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.setScalar(4096);
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.left = -60;
  directionalLight.shadow.camera.right = 60;
  directionalLight.shadow.camera.top = 60;
  directionalLight.shadow.camera.bottom = -60;
  threeRef.value.scene.add(directionalLight);

  //----- 半球光源-----
  const hemisphereLight = new THREE.HemisphereLight(0xc8d8e8, 0x7a8a5a, 1.5);
  threeRef.value.scene.add(hemisphereLight);

  //-----ground 绿色草地平面，接受阴影---
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x369069,
    metalness: 0.0,
    roughness: 0.0,
    shadowSide: THREE.DoubleSide,
  });
  const gridSize = 30; // 表示整个场地中行列格子的数
  threeRef.value.cellWorld = CELL_RAW * GRID_SCALE; // 每个格子的尺寸:定义的大小*缩放系数
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(
      threeRef.value.cellWorld * gridSize,
      threeRef.value.cellWorld * gridSize
    ),
    groundMaterial
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.14;
  ground.receiveShadow = true;
  threeRef.value.scene.add(ground);

  //-----grid 网格平面，不接受阴影---
  // 用于辅助对齐：gridSize = 30,每隔= CELL_RAW * GRID_SCALE

  const gridHelper = new THREE.GridHelper(
    gridSize * threeRef.value.cellWorld,
    gridSize,
    0x4a7a2a,
    0x4a7a2a
  );
  gridHelper.position.y = -0.49;
  gridHelper.material.opacity = 0.3;
  gridHelper.material.transparent = true;
  gridHelper.position.y = 0.1;
  threeRef.value.scene.add(gridHelper);

  // -------Track Group - 与游戏相同的轨道容器结构(position.y = -0.5,scale=GRID_SCALE)
  trackGroup.name = 'trackGroup';
  trackGroup.position.y = -0.5;
  trackGroup.scale.setScalar(GRID_SCALE);
  threeRef.value.scene.add(trackGroup);
  threeRef.value.trackGroup = trackGroup;

  // Ghost preview group - 用于预览Ghost车辆的容器,独立容器放置预览半透明模型，方便整体清理
  ghostGroup.name = 'ghostGroup';
  ghostGroup.position.y = -0.5;
  ghostGroup.scale.setScalar(GRID_SCALE);
  threeRef.value.scene.add(ghostGroup);
  threeRef.value.ghostGroup = ghostGroup;
  //let ghostMesh = null;

  //------正交俯视相机
  const aspect = window.innerWidth / window.innerHeight;
  threeRef.value.camera = new THREE.OrthographicCamera(
    -threeRef.value.frustum * aspect,
    threeRef.value.frustum * aspect,
    threeRef.value.frustum,
    -threeRef.value.frustum,
    0.1,
    200
  );

  const cellCenter = 0.5 * CELL_RAW * GRID_SCALE; // 格子中心位置
  threeRef.value.camera.position.set(cellCenter, 50, cellCenter); // 设置相机的位置
  threeRef.value.camera.lookAt(cellCenter, 0, cellCenter);

  // cameraTarget 用于平移，缩放时的平滑控制：先改目标点，再更新相机位置
  threeRef.value.cameraTarget = new THREE.Vector3(cellCenter, 0, cellCenter);

  //---------------------- Auto-tile 核心算法---

  // ═══════════════════════════════════════════════════════════
  //  Auto-tile 核心算法
  //  这套算法是整个编辑器的技术核心,分为 3 层:
  //
  //  1. getCellExits(cell) → 返回格子在 4 个方向上"伸出去"的出口位掩码
  //     直道: N+S(12) 或 E+W(3); 弯道: 根据朝向返回相邻的两个方向
  //
  //  2. getConnectivityMask(gx, gz) → 检查邻居是否有出口朝向自己
  //     比如北边邻居如果有 S 出口(bit 4),就给自己设 N 位(bit 8)
  //     这是"实际连接"的掩码
  //
  //  3. getPresenceMask(gx, gz) → 只是检查邻居是否存在(有路),不管朝向
  //     这是"近似连接"的掩码,用于引导孤立格子的朝向
  //
  //  算法流程: 新格子放下去时,先用 getAvailableMask 检查可连接方向,
  //  如果 >= 3 个方向有路,用 pickBestPair 选出"最佳配对"(优先弯道,优先连接已有更多连接的邻居),
  //  然后用 AUTOTILE 查找表决定模型和朝向。
  //  已有格子被邻居影响时,用 resolveTile 重新计算,但会保护已有的连接不被断开。
  // ═══════════════════════════════════════════════════════════

  //-------

  // ═══════════════════════════════════════════════════════════
  //  射线检测(Raycasting) - 屏幕坐标 → 网格坐标
  //  设计思路: 用 Raycaster 从相机向鼠标位置发射射线,与一个水平面(地面)求交。
  //  然后通过 floor 除法将世界坐标映射到网格坐标(gx, gz)。
  //  使用正交相机时,射线是平行的,求交更简单直接。
  // ═══════════════════════════════════════════════════════════

  // toolbar 按钮事件

  await loadModels();
  //console.log('models loaded', models);

  loadSaved();

  // 在原点处放置一个默认的起点
  if (threeRef.value.grid.size === 0) {
    placeFinishOrStart(threeRef);
  }
  // 添加事件监听处理
  initInput(threeRef);
  threeRef.value.renderer.setAnimationLoop(animate);
}

function loadSaved() {
  // 解析参数
  const params = new URLSearchParams(window.location.search);
  const mapParam = params.get('map');

  const encoded = mapParam || localStorage.getItem('racing-editor-cells');

  if (!encoded) return;

  try {
    const arr = decodeCells(encoded);
    for (const [gx, gz, type, orient] of arr) {
      const isFinish = type === 'track-finish';
      const cell = { type, orient, isFinish, mesh: null };
      threeRef.value.grid.set(cellKey(gx, gz), cell);

      // 放置模型
      placeMesh(threeRef, gx, gz, cell);
    }
  } catch (e) {
    console.warn('Failed to load saved map:', e);
  }
}

async function loadModels() {
  // ---加载模型---，异步加载4个模型，并将材质设置为frontSide，避免双面渲染问题
  const loader = new GLTFLoader();
  const modelNames = ['track-straight', 'track-corner', 'track-bump', 'track-finish'];
  const promises = modelNames.map(name => {
    return new Promise((resolve, reject) => {
      // 加载模型
      loader.load(
        `./开车游戏-模拟godot的Starter Kit Racing游戏/models/${name}.glb`,
        gltf => {
          gltf.scene.traverse(child => {
            if (child.isMesh) child.material.side = THREE.FrontSide;
          });

          threeRef.value.models[name] = gltf.scene;
          resolve();
        },
        undefined,
        reject
      );
    });
  });

  await Promise.all(promises);
}

function animate() {
  threeRef.value.renderer.render(threeRef.value.scene, threeRef.value.camera);
}
//--------window resize
window.onresize = () => {
  threeRef.value.renderer.setSize(window.innerWidth, window.innerHeight);

  const aspect = window.innerWidth / window.innerHeight;
  threeRef.value.camera.left = -threeRef.value.frustum * aspect;
  threeRef.value.camera.right = threeRef.value.frustum * aspect;

  threeRef.value.camera.updateProjectionMatrix();
};
function onRoad() {
  console.log('onRoad.....');
  selectTool(threeRef, 'road');
}
function onErase() {
  selectTool(threeRef, 'erase');
}
function onClear() {
  clearAll(threeRef);
}
function onShare() {}
function onPlay() {
  if (threeRef.value.grid.size === 0) {
    console.log('no map');
    return;
  }

  const encoded = encodeCells(getCellsArray(threeRef));
  window.open('index.html?map=' + encoded, '_black');
}
</script>

<style scoped lang="css">
canvas {
  display: block;
  touch-action: none;
}

#toolbar {
  position: fixed;
  bottom: 1rem;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(20, 20, 30, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 10;
  left: 40%;
}

#toolbar button {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
#toolbar button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
#toolbar button.active {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.separator {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.15);
  margin: 0 2px;
  flex-shrink: 0;
}

#toolbar button.action {
  background: rgba(80, 180, 80, 0.25);
  color: rgba(140, 255, 140, 0.9);
}
#toolbar button.action:hover {
  background: rgba(80, 180, 80, 0.4);
  color: #fff;
}

#toolbar button.danger {
  color: rgba(255, 255, 255, 0.45);
}
#toolbar button.danger:hover {
  background: rgba(220, 80, 80, 0.25);
  color: rgba(255, 140, 140, 0.9);
}

#toast {
  position: absolute;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  background: rgba(20, 20, 30, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #fff;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  z-index: 20;
}
#toast.show {
  opacity: 1;
}
</style>
