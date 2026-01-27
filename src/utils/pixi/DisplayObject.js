/**
 * 基本的DisplayObject类，所有显示对象都继承自此类,
 * ❌ DisplayObject 中不应该定义 anchorX / anchorY
✅ anchor 应该只存在于「有尺寸、有内容」的对象上（如 Sprite）
1、DisplayObject 可能是：
    Container
    Graphics
    Camera
    空节点
    它们 可能根本没有 width / height
2、而 anchor 的定义是：
    相对于内容尺寸的比例点（0~1）
    没有尺寸，anchor 就是没有意义的概念。
3、 pivot 是“数学概念”，anchor 是“布局概念”
 */

import { Mat2 } from './Mat2';

class DisplayObject {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.rotation = 0; // 旋转
    this.scaleX = 1; // 缩放
    this.scaleY = 1;
    this.alpha = 1; // 透明度
    this.visible = true;
    this.parent = null;
    this.children = [];

    /**
     * pivot 决定的是：
        👉 围绕哪里旋转
        👉 从哪里缩放
        👉 所有矩阵计算的中心点
        👉 pivot 是坐标系层面的东西，决定了坐标系的原点，但是在 pixi 中，pivot 并不是坐标系的原点，而是矩阵计算的中心点。
    */
    this.pivotX = 0;
    this.pivotY = 0;

    /**
     * anchor：
        👉 “这张图的哪个点贴到坐标系原点”
        pivot：
        👉  “我希望围绕哪个点做数学变换”
     */
    this.worldAlpha = 1;
    this.localWorld = Mat2.identity(); // 代表当前对象自身的矩阵
    this.worldMatrix = Mat2.identity(); // 代表当前对象自身的矩阵和所有父级的矩阵的乘积
    this.eventHandlers = {};
  }
  /**
   * 移动到 pivot原点 -> 旋转缩放 -> 平移回位置
   */
  updateLocalMatrix() {
    const t = Mat2.fromTRS(-this.pivotX, -this.pivotY, this.rotation, this.scaleX, this.scaleY);
    // 平移回位置
    t.tx += this.x + this.pivotX;
    t.ty += this.y + this.pivotY;
    this.localWorld = t;
  }

  updateWorldTransform(parentMatrix, parentAlpha) {
    this.updateLocalMatrix();
    if (parentMatrix) {
      this.worldMatrix = parentMatrix.multiply(this.localWorld);
    } else {
      this.worldMatrix = this.localWorld;
    }

    this.worldAlpha = (parentAlpha === undefined ? 1 : parentAlpha) * this.alpha;
  }

  updateTransform(parentMatrix, parentAlpha) {
    this.updateWorldTransform(parentMatrix, parentAlpha);
  }

  on(type, fn) {
    if (!this.eventHandlers[type]) {
      this.eventHandlers[type] = [];
    }
    this.eventHandlers[type].push(fn);
  }

  off(type, fn) {
    if (!this.eventHandlers[type]) {
      return;
    }
    const index = this.eventHandlers[type].indexOf(fn);
    if (index !== -1) {
      this.eventHandlers[type].splice(index, 1);
    }
  }

  emit(type, event) {
    if (!this.eventHandlers[type]) {
      return;
    }
    this.eventHandlers[type].forEach(fn => {
      fn(event);
    });
  }
  /**
   * 简单的边界框用于碰撞检测、由子类实现具体的边界计算
   */
  getBounds() {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  containsPoint(localX, localY) {
    const b = this.getBounds();
    return localX >= b.x && localX <= b.x + b.width && localY >= b.y && localY <= b.y + b.height;
  }
}

export { DisplayObject };
