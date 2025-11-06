export default class Region {
  /**
   *
   * @param {*} center - 区域的中心点
   * @param {*} width - 区域的宽度
   * @param {*} height - 区域的高度
   * @param {*} id - 唯一的标识
   */
  constructor(center, width, height, id = 0) {
    this.center = center;
    this.width = width;
    this.height = height;
    this.id = id;
    // 这里完全使用的右手坐标系
    this.left = center.x - width / 2; // 区域左边的位置
    this.right = center.x + width / 2; // 区域右边的位置
    this.top = center.z - height / 2; // 区域上边，在-Z的位置
    this.bottom = center.z + height / 2; //区域bottom下边在+Z的位置
  }
  /**
   * 判断是否在区域内
   * @param {*} position - 测试的位置
   * @param {*} isHalfSize  -该区域是否具有一半大小，这使得测试更加严格（可选）。
   */
  isInside(position, isHalfSize = false) {
    let marginX, marginY;

    if (isHalfSize === true) {
      marginX = this.width * 0.25; // 1/4 的位置
      marginY = this.height * 0.25;

      return (
        position.x > this.left + marginX &&
        position.x < this.right - marginX &&
        position.z > this.top + marginY &&
        position.z < this.top - marginY
      );
    } else {
      return (
        position.x > this.left &&
        position.x < this.right &&
        position.z > this.top &&
        position.z < this.bottom
      );
    }
  }
}
