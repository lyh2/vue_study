export default class Rect {
  constructor(minX, minY, maxX, maxY) {
    this.tl = [minX || 0, minY || 0]; // top left point
    this.br = [maxX || 0, maxY || 0]; // bottom right point
  }

  /**
   * 判断是否相交
   * @param {*} rt
   */
  isCollide(rt) {
    if (
      rt.br[0] < this.tl[0] ||
      rt.tl[0] > this.br[0] ||
      rt.br[1] < this.tl[1] ||
      rt.tl[1] > this.br[1]
    ) {
      return false;
    }
    return true;
  }
}
