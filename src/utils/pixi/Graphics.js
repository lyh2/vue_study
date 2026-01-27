/**
 * Graphics 简单的形状绘制
 */
import { DisplayObject } from './DisplayObject';
class Graphics extends DisplayObject {
  constructor() {
    super();
    this.type = 'Graphics';
    this.shapes = []; //{type:'rect', x:0, y:0, width:100, height:100, color:0xffffff, alpha:1, rotation:0, ...}
  }

  beginFill(color, alpha) {
    this._fill = color;
    this._fillAlpha = alpha;
    return this;
  }
  drawRect(x, y, width, height) {
    this.shapes.push({
      type: 'rect', // 指定绘制的类型
      x,
      y,
      width,
      height,
      _fill: this._fill,
      _fillAlpha: this._fillAlpha,
      rotation: 0,
    });
    return this;
  }
  drawCircle(x, y, radius) {
    this.shapes.push({
      type: 'circle',
      x,
      y,
      radius,
      _fill: this._fill,
      _fillAlpha: this._fillAlpha,
      rotation: 0,
    });
    return this;
  }
  drawEllipse(x, y, width, height) {
    this.shapes.push({
      type: 'ellipse',
      x,
      y,
      width,
      height,
      _fill: this._fill,
      _fillAlpha: this._fillAlpha,
      rotation: 0,
    });
    return this;
  }
  drawPolygon(path) {
    this.shapes.push({
      type: 'polygon',
      path,
      _fill: this._fill,
      _fillAlpha: this._fillAlpha,
      rotation: 0,
    });
    return this;
  }
  endFill() {
    this._fill = null;
    this._fillAlpha = 1;
    return this;
  }
  lineStyle(lineWidth, color, alpha, lineCap, lineJoin, miterLimit) {
    this._lineWidth = lineWidth;
    this._lineColor = color;
    this._lineAlpha = alpha;
    this._lineCap = lineCap;
    this._lineJoin = lineJoin;
    this._miterLimit = miterLimit;
    return this;
  }
  moveTo(x, y) {
    this.currentPath = [{ x, y }];
    return this;
  }
  lineTo(x, y) {
    this.currentPath.push({ x, y });
    return this;
  }
  closePath() {
    this.shapes.push({
      type: 'path',
      path: this.currentPath,
      _fill: this._fill,
      _fillAlpha: this._fillAlpha,
      rotation: 0,
      _lineWidth: this._lineWidth,
      _lineColor: this._lineColor,
      _lineAlpha: this._lineAlpha,
      _lineCap: this._lineCap,
      _lineJoin: this._lineJoin,
      _miterLimit: this._miterLimit,
    });
    this.currentPath = null;
    return this;
  }
  clear() {
    this.shapes = [];
    this.shapes.length = 0;
    return this;
  }

  getBounds() {
    if (this.shapes.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      if (shape.type === 'rect') {
        const x = shape.x;
        const y = shape.y;
        const width = shape.width;
        const height = shape.height;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      } else if (shape.type === 'circle') {
        const x = shape.x - shape.radius;
        const y = shape.y - shape.radius;
        const width = shape.radius * 2;
        const height = shape.radius * 2;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      } else if (shape.type === 'ellipse') {
        const x = shape.x - shape.width / 2;
        const y = shape.y - shape.height / 2;
        const width = shape.width;
        const height = shape.height;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      } else if (shape.type === 'polygon') {
        const path = shape.path;
        for (let j = 0; j < path.length; j++) {
          const point = path[j];
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      }
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
}

export { Graphics };
