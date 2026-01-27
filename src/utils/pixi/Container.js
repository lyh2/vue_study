/**
 * Container.js
 */
import { DisplayObject } from './DisplayObject';

class Container extends DisplayObject {
  constructor() {
    super();
    this.children = [];
  }
  addChild(child) {
    if (child.parent) {
      child.parent.removeChild(child);
    }
    child.parent = this;
    this.children.push(child);
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      child.parent = null;
      this.children.splice(index, 1);
    }
  }
  updateTransform(parentMatrix, parentAlpha) {
    super.updateTransform(parentMatrix, parentAlpha);
    this.displayObjectUpdateTransform();
  }
  displayObjectUpdateTransform() {
    for (let i = 0, j = this.children.length; i < j; ++i) {
      const child = this.children[i];
      child.updateTransform(this.worldMatrix, this.worldAlpha);
    }
  }
}

export { Container };
