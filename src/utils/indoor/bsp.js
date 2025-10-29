/**
 * 进行几何体交叉并操作
 */
import * as THREE from 'three';
import ThreeBSP from '../common/csg-交叉并操作/ThreeBSP';
import { _0_, _1_, _floor_, _plane_, _subtraction_, _union_ } from './constaint';
import { exportGLTF } from './common';
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg';

/**
 * 使用ThreeBSP 库
 */
export function unionFloor() {
  const ThreeBSPInstance = ThreeBSP(THREE);
  //console.log('THREEBSP', ThreeBSPInstance, this);
  // 获取当前显示的楼层
  const currentFloor = this.mall.getCurrentFloor();
  //console.log('currentFloor:', currentFloor);
  // 获取地面对象
  const planeName = _plane_ + this.currentFloorId;
  const plane = currentFloor.getObjectByName(planeName);
  const planeBSP = new ThreeBSPInstance(plane);
  let resultBSP = null; // 结果对象
  // 循环处理进行合并操作
  const childrenArray = currentFloor.children;
  for (let i = 0; i < childrenArray.length; i++) {
    if (childrenArray[i].name !== planeName) {
      const roomBSP = new ThreeBSPInstance(childrenArray[i]);
      if (resultBSP !== null) {
        resultBSP = resultBSP.union(roomBSP);
      } else {
        // 为空的时候
        resultBSP = planeBSP.union(roomBSP);
      }
    }
  }
  //console.log('resultBSP:', resultBSP.toMesh());
  exportGLTF(resultBSP.toMesh(), _floor_ + this.currentFloorId + '.glb');
}
/**
 * 使用ThreeBvhCsg 库，更高级更适合项目使用的库
 * @returns
 */
export function unionFloorByBvhCsg() {
  // 获取当前楼层
  const currentFloor = this.mall.getCurrentFloor();
  if (currentFloor == null) return;
  // 获取所有数据
  const meshArray = currentFloor.children;
  let result = new Brush(meshArray[0].geometry, meshArray[0].material);
  const evaluator = new Evaluator();
  if (meshArray.length == _0_) return;
  for (let i = _1_; i < meshArray.length; i++) {
    const csgMesh = new Brush(meshArray[i].geometry, meshArray[i].material);
    result = evaluator.evaluate(result, csgMesh, ADDITION);
  }
  //console.log('生成的结果Mesh:', result);
  exportGLTF(result, _floor_ + _union_ + '_' + this.currentFloorId + '.glb');
}
/** 使用ThreeBvhCsg 库
 * 进行差集操作
 */
export function subFloorByBvhCsg() {
  const currentFloor = this.mall.getCurrentFloor();
  if (currentFloor == null) return;
  const planeName = _plane_ + this.currentFloorId;
  const meshArray = currentFloor.children;
  const planeMesh = currentFloor.getObjectByName(planeName);
  if (planeMesh == undefined || planeMesh == '') return;
  let result = new Brush(planeMesh.geometry, planeMesh.material);
  if (meshArray.length == _0_) return;

  // 应用世界变换
  // currentFloor.updateMatrixWorld(true);
  // planeMesh.updateMatrixWorld();

  //console.log('meshArray', planeName, meshArray);
  const evaluator = new Evaluator();
  for (let i = 0; i < meshArray.length; i++) {
    if (meshArray[i].name != planeName) {
      const mesh = meshArray[i];
      const roomGeometry = mesh.geometry.clone();
      //roomGeometry.applyMatrix4(mesh.matrixWorld); // 这个可以不需要，因为下面直接修改的是原始数据
      // 让房间向下延伸，确保与地面相交
      const extendDownward = (geometry, extendDistance = 0.1) => {
        const positions = geometry.attributes.position;
        const newPositions = new Float32Array(positions.array.length);

        for (let j = 0; j < positions.count; j++) {
          const x = positions.getX(j);
          const y = positions.getY(j);
          const z = positions.getZ(j);
          // 将顶点的Y值向下移动指定距离
          newPositions[j * 3] = x;
          newPositions[j * 3 + 1] = y - extendDistance;
          newPositions[j * 3 + 2] = z;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
        return geometry;
      };
      const extendRoomGeometry = extendDownward(roomGeometry, 0.1);
      const brushMesh = new Brush(extendRoomGeometry, mesh.material);

      result = evaluator.evaluate(result, brushMesh, SUBTRACTION);
    }
  }

  exportGLTF(result, _floor_ + _subtraction_ + '_' + this.currentFloorId + '.glb');
}
