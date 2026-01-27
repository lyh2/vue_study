/**
 * Sprite.js
 */
import { DisplayObject } from './DisplayObject';

class Sprite extends DisplayObject {
  constructor(options = {}) {
    super();
    this.texture = options.texture;
    this.anchorX = options.anchorX || 0;
    this.anchorY = options.anchorY || 0;
    this.color = options.color || 0xffffff;
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.tint = options.tint || 0xffffff;
  }

  getBounds() {
    const ox = this.anchorX * -this.width;
    const oy = this.anchorY * -this.height;
    return { x: ox, y: oy, width: this.width, height: this.height };
  }
}

export { Sprite };
