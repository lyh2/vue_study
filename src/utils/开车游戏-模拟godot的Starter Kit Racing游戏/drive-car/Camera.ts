import * as THREE from 'three';

export class Camera {
  public camera: THREE.PerspectiveCamera;
  public offset: THREE.Vector3;
  public targetPosition: THREE.Vector3;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 60);
    // Matches Godot View: 45° azimuth, 35° elevation, distance 16
    //---------------------------------------------------
    /**
     * 1. 球坐标参数
        - 距离 (distance): 16 单位（相机到目标点的直线距离）
        - 方位角 (azimuth): 45°（在XZ水平面上，从Z轴正向逆时针旋转的角度）
        - 仰角 (elevation): 35°（从水平面向上仰望的角度）
        2. 数学转换公式
        x = distance × cos(elevation) × sin(azimuth)
        y = distance × sin(elevation)
        z = distance × cos(elevation) × cos(azimuth)
     */
    this.offset = new THREE.Vector3(9.27, 9.18, 9.27);
    //---------------------------------------------------
    this.targetPosition = new THREE.Vector3();

    this.camera.position.copy(this.offset);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
  }

  update(dt, target) {
    this.targetPosition.lerp(target, dt * 0.4);
    this.camera.position.copy(this.targetPosition).add(this.offset);
    this.camera.lookAt(this.targetPosition);
  }
}
