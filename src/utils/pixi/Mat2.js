/**
 * 简单的2D矩阵类,
 * canvas 的矩阵是：
 * a,c
 * b,d
 *
 * mat2 的矩阵是：
 * a,b
 * c,d
 */

class Mat2 {
  constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.tx = tx;
    this.ty = ty;
  }

  static identity() {
    return new Mat2();
  }

  static fromTRS(x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return new Mat2(cos * scaleX, sin * scaleX, -sin * scaleY, cos * scaleY, x, y);
  }

  /**
   * 矩阵相乘
   * @param {Mat2} mat 要相乘的矩阵
   * [a, b,      [a,b
   *  c, d,    * c,d,
   * tx, ty]      tx,ty]
   */
  multiply(mat) {
    const a = this.a * mat.a + this.b * mat.c;
    const b = this.a * mat.b + this.b * mat.d;
    const c = this.c * mat.a + this.d * mat.c;
    const d = this.c * mat.b + this.d * mat.d;
    const tx = this.tx * mat.a + this.ty * mat.c + mat.tx;
    const ty = this.tx * mat.b + this.ty * mat.d + mat.ty;
    return new Mat2(a, b, c, d, tx, ty);
  }

  apply(x, y) {
    return { x: this.a * x + y * this.b + this.tx, y: x * this.c + y * this.d + this.ty };
  }
}

export { Mat2 };
