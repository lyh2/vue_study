/**
 * Renderer2D.js、在这里面实现最终的绘制
 * 目前使用的canvas 进行绘制，其webgl 绘制原理一致，只是api不一样而已
 */
import { Sprite } from './Sprite';
import { Graphics } from './Graphics';

class Renderer2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d'); // 得到canvas的上下文
    this.clearColor = '#222'; // 背景色
  }

  clear() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.clearColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }
  /**
   *
   * @param {*} stage = THREE.Scene，相当于THREE.Scene 中的场景，最顶层的级别，不再有任何父级
   * @param {*} camera
   */
  render(stage, camera = null) {
    this.clear();
    // stage 已经更新好worldMatrix & worldMatrix
    if (camera) {
      // 获取相机的投影矩阵
      const m = camera.getViewProjectionMatrix();
      //console.log('相机矩阵:', m);
      // 使用单位矩阵重新设置（覆盖）当前的变换并调用变换
      this.ctx.setTransform(m.a, m.c, m.b, m.d, m.tx, m.ty); // canvas 的transform(a,c,b,d,e,f)
    }
    // ① 先应用 Camera（全局一次）
    else {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this._renderRecursive(stage);
  }
  // 递归渲染，render 是没有父级的，自己就是最顶层
  _renderRecursive(node) {
    if (!node.visible) return; // 隐藏的不渲染
    const ctx = this.ctx;
    // apply world matrix
    const m = node.worldMatrix;
    ctx.save(); // 保存当前的状态
    ctx.globalAlpha = node.worldAlpha;
    // 根据每个对象自己的世界矩阵进行绘制
    ctx.transform(m.a, m.c, m.b, m.d, m.tx, m.ty); // canvas 的transform(a,c,b,d,e,f)
    // draw
    if (node.isSprite || node instanceof Sprite) {
      const b = node.getBounds(); // 得到对象的边界
      // 绘制图片
      if (node.texture && node.texture.img && node.texture.img.complete) {
        // 绘制图片
        try {
          ctx.drawImage(node.texture.img, b.x, b.y, node.width, node.height);
        } catch (e) {
          console.error(e);
          // fallback fill rect
          ctx.fillStyle = node.color;
          ctx.fillRect(b.x, b.y, node.width, node.height);
        }
      } else {
        // 没有图片,将数字颜色转换为CSS颜色字符串
        const colorStr =
          typeof node.color === 'number'
            ? '#' + node.color.toString(16).padStart(6, '0')
            : node.color;
        ctx.fillStyle = colorStr;
        ctx.fillRect(b.x, b.y, node.width, node.height);
      }
    } else if (node instanceof Graphics) {
      for (const s of node.shapes) {
        if (s.type === 'rect') {
          if (s._fill) {
            ctx.fillStyle = s._fill;
            ctx.fillRect(s.x, s.y, s.width, s.height);
          }
        } else if (s.type === 'circle') {
          // 绘制圆
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2, true);
          if (s._fill) {
            ctx.fillStyle = s._fill;
            ctx.fill();
          }
        } else if (s.type === 'ellipse') {
          // 绘制椭圆
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.width / 2, s.height / 2, 0, 0, Math.PI * 2);
          if (s._fill) {
            ctx.fillStyle = s._fill;
            ctx.fill();
          }
        } else if (s.type === 'polygon' || s.type === 'path') {
          // 绘制多边形/路径
          if (s.path && s.path.length > 0) {
            ctx.beginPath();
            ctx.moveTo(s.path[0].x, s.path[0].y);
            for (let i = 1; i < s.path.length; i++) {
              ctx.lineTo(s.path[i].x, s.path[i].y);
            }
            if (s.type === 'polygon') ctx.closePath();
            if (s._fill) {
              ctx.fillStyle = s._fill;
              ctx.fill();
            }
          }
        }
      }
    }
    // restore context before drawing children
    ctx.restore();
    // draw children (each child will apply its own world matrix from scratch)
    if (node.children) {
      // 递归渲染子节点
      for (const c of node.children) this._renderRecursive(c);
    }
  }
}

export { Renderer2D };
