/**
 * 进行几何体交叉并操作
 */
import * as THREE from 'three';
import ThreeBSP from '../common/ThreeBSP';
import { _0_, _1_, _floor_, _plane_ } from './constaint';
import { exportGLTF } from './common';
import { Brush, Evaluator, SUBTRACTION, ADDITION } from 'three-bvh-csg';

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
  exportGLTF(result, _floor_ + this.currentFloorId + '.glb');
}

export function subFloorByBvhCsg() {
  console.log(SUBTRACTION);
}
