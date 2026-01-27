/**
 * 自实现模拟 PIXI.Application 类
 */

import { Container } from './Container';
import { Mat2 } from './Mat2';
import { Renderer2D } from './Renderer2D';
import { Ticker } from './Ticker';

class Application {
  constructor(options) {
    this.canvas = options.canvas; // 当前的canvas 对象
    // 创建Render2D 对象主要用于绘制
    this.renderer = new Renderer2D(this.canvas);
    this.stage = new Container(); // 相当于场景
    this.ticker = new Ticker();
    this.ticker.add(() => {
      this.render();
    });
    this.setupInteraction();
  }
  setCamera(camera) {
    this.camera = camera;
  }
  setupInteraction() {
    this.canvas.addEventListener('pointerdown', e => {
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // traverse stage to from top-most to bottom :reverse order DFS
      const hit = this.hitTest(this.stage, px, py);
      if (hit) hit.emit('pointerdown', { x: px, y: py, originalEvent: e });
    });
  }

  hitTest(node, px, py) {
    console.log('hitTest', px, py);
    // traverse children in reverse draw order (topmost last added)
    // convert world point into local for each tested node: need inverse world matrix
    // For simplicity, we compute inverse by solving linear 2x2 + translation
    function inverseMatrix(matrix) {
      const det = matrix.a * matrix.d - matrix.b * matrix.c;
      if (Math.abs(det) < 1e-8) return null;
      const a = matrix.d / det,
        b = -matrix.b / det,
        c = -matrix.c / det,
        d = matrix.a / det;
      const tx = -(a * matrix.tx + b * matrix.ty);
      const ty = -(c * matrix.tx + d * matrix.ty);
      return new Mat2(a, b, c, d, tx, ty);
    }
    if (node.children.length > 0) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        const inv = inverseMatrix(child.worldMatrix); // 求矩阵的逆矩阵
        if (!inv) continue;
        const lp = inv.apply(px, py); // 转换到局部坐标系
        // test child itself
        if (child.visible && child.containsPoint(lp.x, lp.y)) return child;
        //test grandchildren recursively
        const deeper = this.hitTest(child, px, py);
        if (deeper) return deeper;
      }
    }
    return null;
  }

  render() {
    // update stage transform
    this.stage.updateTransform(null, 1);
    this.renderer.render(this.stage, this.camera);
  }
  start() {
    this.ticker.start();
  }
  stop() {
    this.ticker.stop();
  }
}

export default Application;
