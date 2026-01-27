/**
 * Camera2D.js - 透视相机类
 */

import { Mat2 } from './Mat2';

class Camera2D {
  constructor({
    x = 0,
    y = 0,
    zoom = 1,
    rotation = 0,
    viewportWidth = 800,
    viewportHeight = 600,
  } = {}) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
    this.rotation = rotation;

    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }
  /**
   * 获取投影矩阵
   * @returns
   */
  getViewProjectionMatrix() {
    const hw = this.viewportWidth / 2;
    const hh = this.viewportHeight / 2; // 得到屏幕中心坐标
    // 判断是否有旋转
    const cos = Math.cos(this.rotation || 0);
    const sin = Math.sin(this.rotation || 0);
    const z = this.zoom || 1;

    return new Mat2(
      cos * z,
      sin * z,
      -sin * z,
      cos * z,
      hw - this.x * cos * z + this.y * sin * z,
      hh - this.x * sin * z - this.y * cos * z
    );
  }

  screenToWorld(x, y) {
    const inv = this.getViewProjectionMatrix().invert();
    return inv.apply({ x, y });
  }

  worldToScreen(x, y) {
    return this.getViewProjectionMatrix().apply({ x, y });
  }
}

export { Camera2D };
