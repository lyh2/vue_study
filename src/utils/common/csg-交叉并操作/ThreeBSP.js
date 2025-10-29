/**
 * 功能：基于 BSP（二叉空间分割）实现简单的 CSG（布尔）运算：subtract、union、intersect，并能在 Three.js 的 BufferGeometry / Mesh 之间转换。
核心思想：将几何体转换成多边形集合（Polygon），构建 BSP 树（Node），通过裁剪（clip）与合并（build）来计算布尔集合，最后把结果多边形重构为 BufferGeometry，再生成 Mesh。

- CSG操作在世界坐标系中完成
- 但最终结果需要转换回局部坐标系，以便Three.js正确渲染
- 没办法保存各自原始的材质信息
 * @param {*} THREE 
 * @returns 
 * 
 * 整体思路：
 * 1、构造ThreeBSP对象
 * 2、ThreeBSP 对象 之间进行交叉并操作
 * 
 */

export default function (THREE) {
  const EPSILON = 1e-5; // 误差值
  const COPLANAR = 0; // 二进制: 00 -共面
  const FRONT = 1; // 二进制: 01
  const BACK = 2; // 二进制: 10
  const SPANNING = 3; // 二进制: 11

  // Helper function to convert BufferGeometry to polygon data
  /**
   * 把一个几何体转成多个多边形(三角形)
   * @param {*} geometry
   * @param {*} matrix
   * @returns
   */
  function bufferGeometryToPolygons(geometry, matrix) {
    const polygons = []; // 存储了多个三角形
    // 1、 得到BufferAttribute 对象
    const positionAttribute = geometry.getAttribute('position');
    const normalAttribute = geometry.getAttribute('normal');
    const uvAttribute = geometry.getAttribute('uv');
    const index = geometry.getIndex();
    // 2、获取点位数据
    const vertices = [];
    // Extract vertices
    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(positionAttribute, i);
      /** 此时获取到vector 是Mesh 本身的数据。如一个单位Cube，就是[-0.5,0.5]之间的值
       * 但是咱们在做交叉并操作的时候，是需要在一个同一的基准上进行。
       * 为什么使用的matrix 而不是worldMatrix，就是因为，我们处理的是单个对象而不需要考虑
       * 他们的父级关系，否则就会变得复杂
       */
      vertex.applyMatrix4(matrix); //

      // 存在法线
      const normal = normalAttribute
        ? (() => {
            const n = new THREE.Vector3();
            n.fromBufferAttribute(normalAttribute, i);
            return n;
          })()
        : new THREE.Vector3(0, 1, 0);
      // 处理UV坐标
      const uv = uvAttribute
        ? (() => {
            const u = new THREE.Vector2();
            u.fromBufferAttribute(uvAttribute, i);
            return u;
          })()
        : new THREE.Vector2(0, 0);
      // 自定义的一个Vertex 对象存储每个点数据的=(x,y,z,normal,uv)
      vertices.push(new ThreeBSP.Vertex(vertex.x, vertex.y, vertex.z, normal, uv));
    }

    // Create polygons from indices 通过索引创建多边形
    /**
     * 一个多边形(三角形)包含下列属性
     * {
     * vertices:[],
     * normal:vertex,-法向量
     * w:-原点到平面的法向量的距离值
     * }
     */
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const polygon = new ThreeBSP.Polygon();
        polygon.vertices.push(
          vertices[index.getX(i)], // 得到自定义的Vertex 对象{x:,y:,z:,normal:,uv:}
          vertices[index.getX(i + 1)],
          vertices[index.getX(i + 2)]
        );
        polygons.push(polygon.calculateProperties());
      }
    } else {
      // If no index, assume triangles are sequential
      for (let i = 0; i < vertices.length; i += 3) {
        const polygon = new ThreeBSP.Polygon();
        polygon.vertices.push(vertices[i], vertices[i + 1], vertices[i + 2]);
        polygons.push(polygon.calculateProperties());
      }
    }

    return polygons;
  }

  // Helper function to convert polygons back to BufferGeometry
  function polygonsToBufferGeometry(polygons, matrix) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const inverseMatrix = new THREE.Matrix4().copy(matrix).invert();
    let vertexCount = 0;

    polygons.forEach(polygon => {
      // Triangulate polygon (assuming it's convex)
      const vertices = polygon.vertices;
      for (let i = 2; i < vertices.length; i++) {
        const v0 = vertices[0].clone().applyMatrix4(inverseMatrix);
        const v1 = vertices[i - 1].clone().applyMatrix4(inverseMatrix);
        const v2 = vertices[i].clone().applyMatrix4(inverseMatrix);

        // Positions
        positions.push(v0.x, v0.y, v0.z);
        positions.push(v1.x, v1.y, v1.z);
        positions.push(v2.x, v2.y, v2.z);

        // Normals
        const normal = polygon.normal.clone();
        normals.push(normal.x, normal.y, normal.z);
        normals.push(normal.x, normal.y, normal.z);
        normals.push(normal.x, normal.y, normal.z);

        // UVs
        const uv0 = vertices[0].uv || new THREE.Vector2(0, 0);
        const uv1 = vertices[i - 1].uv || new THREE.Vector2(0, 0);
        const uv2 = vertices[i].uv || new THREE.Vector2(0, 0);
        uvs.push(uv0.x, uv0.y);
        uvs.push(uv1.x, uv1.y);
        uvs.push(uv2.x, uv2.y);

        // Indices
        indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
        vertexCount += 3;
      }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return geometry;
  }
  /**
   * 初始化构造一个ThreeBSP 对象
   * @param {*} treeIsh - 需要被处理的Mesh对象
   * @param {*} matrix
   */
  function ThreeBSP(treeIsh, matrix) {
    this.matrix = matrix || new THREE.Matrix4();
    this.tree = this.toTree(treeIsh); // 构造一个 ThreeBSP.Node
  }
  /**
   * 把Mesh 对象分解成一个BSP Tree
   * @param {*} treeIsh - mesh 对象
   * @returns - 返回ThreeBSP.Node 对象
   */
  ThreeBSP.prototype.toTree = function (treeIsh) {
    if (treeIsh instanceof ThreeBSP.Node) {
      return treeIsh; // 传递已经是自定义的类型，直接返回，不用再转
    }

    let polygons = [];
    // 传递的是几何体Mesh 的网格数据
    if (treeIsh instanceof THREE.BufferGeometry) {
      // 传递的是BufferGeometry
      polygons = bufferGeometryToPolygons(treeIsh, this.matrix);
    } else if (treeIsh instanceof THREE.Mesh) {
      // 传递的是Mesh 对象--------------------------------------
      /**
       *  - ThreeBSP.js 设计为处理单个几何体的变换，不考虑其在场景图中的层级关系
          - 使用 `matrix` 可以保持几何体自身的变换信息，而不依赖于父级变换
       */
      treeIsh.updateMatrix(); //Updates the local transform.
      this.matrix.copy(treeIsh.matrix);
      //--------------------------------------------------------
      // 转成多边形
      polygons = bufferGeometryToPolygons(treeIsh.geometry, this.matrix);
    }

    return new ThreeBSP.Node(polygons);
  };

  ThreeBSP.prototype.toMesh = function (material) {
    if (!material) {
      // 使用 MeshStandardMaterial 替代 MeshNormalMaterial，确保 GLTF 导出兼容性
      material = new THREE.MeshStandardMaterial({
        color: 0x993366,
        metalness: 0.1,
        roughness: 0.8,
      });
    }

    const geometry = this.toGeometry();

    // 确保几何体有法线属性
    if (!geometry.getAttribute('normal') || geometry.getAttribute('normal').count === 0) {
      geometry.computeVertexNormals();
    }

    const mesh = new THREE.Mesh(geometry, material);

    // Extract position and rotation from matrix
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    this.matrix.decompose(position, quaternion, scale);

    mesh.position.copy(position);
    mesh.quaternion.copy(quaternion);
    mesh.scale.copy(scale);

    // 将生成的 mesh 对象保存到 ThreeBSP 实例中
    this.mesh = mesh;

    return mesh;
  };

  ThreeBSP.prototype.toGeometry = function () {
    const polygons = this.tree.allPolygons();
    return polygonsToBufferGeometry(polygons, this.matrix);
  };
  /**
   * 差集操作
   * @param {*} other - 另一个 ThreeBSP 对象
   * @returns
   */
  ThreeBSP.prototype.subtract = function (other) {
    // 一个Mesh的Geometry就会转换成一个ThreeBSP.Node节点
    const us = this.tree.clone(); // ThreeBSP.Node([Polygon,{vertex,normal,w},Polygon]) 节点对象。里面包含很多多边形(三角形)
    const them = other.tree.clone();

    us.invert().clipTo(them);
    them.clipTo(us).invert().clipTo(us).invert();

    return new ThreeBSP(us.build(them.allPolygons()).invert(), this.matrix);
  };

  ThreeBSP.prototype.union = function (other) {
    const us = this.tree.clone();
    const them = other.tree.clone();

    us.clipTo(them);
    them.clipTo(us).invert().clipTo(us).invert();

    return new ThreeBSP(us.build(them.allPolygons()), this.matrix);
  };

  ThreeBSP.prototype.intersect = function (other) {
    const us = this.tree.clone();
    const them = other.tree.clone();
    /**
     * 1、us.invert()
     * - __数学意义__：A → ¬A（A的补集）
       - __几何意义__：将几何体A的内外翻转
       - __效果__：原来A内部的空间变成外部，外部变成内部
      2、them.clipTo(us.invert())
      - __数学意义__：B ∩ ¬A
      - __几何意义__：保留B中不在A内的部分
      - __效果__：得到B减去A的部分
      3、them.clipTo(us.invert()).invert()
      - __数学意义__：¬(B ∩ ¬A) = ¬B ∪ A
      - __几何意义__：取上一步结果的补集
      - __效果__：得到A和B的并集减去B中不在A的部分
      4、us.clipTo(them)
      - __数学意义__：A ∩ B
      - __几何意义__：用B裁剪A，保留A中在B内的部分
      - __效果__：得到A和B的交集
      5、them.clipTo(us.invert()).invert().clipTo(us.clipTo(them))
      - __完整数学意义__：(¬B ∪ A) ∩ (A ∩ B) = A ∩ B
      - __最终效果__：得到A和B的交集

     */
    them.clipTo(us.invert()).invert().clipTo(us.clipTo(them));

    return new ThreeBSP(us.build(them.allPolygons()).invert(), this.matrix);
  };

  // Vertex class 自定义的类，继承THREE.Vector3
  ThreeBSP.Vertex = class extends THREE.Vector3 {
    constructor(x, y, z, normal, uv) {
      super(x, y, z);
      this.normal = normal || new THREE.Vector3();
      this.uv = uv || new THREE.Vector2();
    }

    clone() {
      return new ThreeBSP.Vertex(this.x, this.y, this.z, this.normal.clone(), this.uv.clone());
    }
    /**
     * 插值
     * @param {*} v
     * @param {*} alpha
     * @returns
     */
    lerp(v, alpha) {
      this.uv.lerp(v.uv, alpha);
      this.normal.lerp(v.normal, alpha);
      return super.lerp(v, alpha);
    }

    interpolate(v, alpha) {
      const clone = this.clone();
      return clone.lerp(v, alpha);
    }
  };

  // Polygon class -自定义的多边形
  /**
   * vertices -顶点
   * normal   -法向
   * w        -
   */
  ThreeBSP.Polygon = class {
    constructor(vertices, normal = null, w = 0) {
      this.vertices = vertices || []; // 数组里面存储了三个自定义的Vertex 对象，{x,y,z,normal,uv}
      this.normal = normal;
      this.w = w; // 原点到vertices三个点组成平面的法线距离

      if (this.vertices.length) {
        this.calculateProperties();
      }
    }
    /**
     * 法线 . 一个点 = 确定一个平面
     * @returns
     */
    calculateProperties() {
      const a = this.vertices[0]; // 获取顶点数据
      const b = this.vertices[1];
      const c = this.vertices[2];
      // 得到法向量ac x ab
      this.normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      /**
       *一个平面在三维空间中可以用两个东西完全确定：
        - __法线向量 (normal)__：指向平面"正面"方向的垂直箭头
        - __常数 (w)__：平面到原点的有符号距离
        平面方程：`法线 · 点 = w`
       */
      this.w = this.normal.clone().dot(a); //w 用于后面判断 点与平面的位置关系
      return this;
    }

    clone() {
      return new ThreeBSP.Polygon(
        this.vertices.map(v => v.clone()),
        this.normal.clone(),
        this.w
      );
    }
    /**
     * 取反
     * @returns
     */
    invert() {
      this.normal.multiplyScalar(-1);
      this.w *= -1;
      this.vertices.reverse(); // 数组取反，就是倒叙
      return this;
    }
    /**
     * 用于判断给定点与平面的位置关系
     * @param {*} vertex - 被检测的点
     * @returns - 平面上，平面下，平面内
     */
    classifyVertex(vertex) {
      const side = this.normal.dot(vertex) - this.w;

      if (side < -EPSILON) return BACK; // 点在平面的后面
      if (side > EPSILON) return FRONT; // 点在平面的后面
      return COPLANAR; // 点在平面上
    }
    /**
     * 判断两个Polygon多边形(三角形)的关系
     * @param {*} polygon
     * @returns
     */
    classifySide(polygon) {
      let front = 0;
      let back = 0;
      // 判断polygon多边形(三角形)中的每一个点 与 平面的位置关系
      for (const vertex of polygon.vertices) {
        const side = this.classifyVertex(vertex);
        if (side === FRONT) front++;
        if (side === BACK) back++;
      }

      if (front > 0 && back === 0) return FRONT; //所有顶点都在前面
      if (front === 0 && back > 0) return BACK; //所有顶点都在后面
      if (front === 0 && back === 0) return COPLANAR; //所有顶点都在平面上
      return SPANNING; // 顶点分布在平面两侧（跨越）,__几何意义__：多边形被分割面切成两部分
    }
    /**
     * 判断两个多边形
     * @param {*} poly - ThreeBSP.Polygon
     * @returns
     */
    tessellate(poly) {
      const f = [];
      const b = [];
      // 得到当前多边形顶点个数
      const count = poly.vertices.length;

      // 第一步：快速检查多边形是否被分割，也就是被跨越
      if (this.classifySide(poly) !== SPANNING) {
        return [poly]; //如果未被分割，直接返回原多边形
      }
      // 存在分割的情况，就是跨越分割面
      for (let i = 0; i < count; i++) {
        const vi = poly.vertices[i]; // 当前边的起点
        const vj = poly.vertices[(i + 1) % count]; // 当前边的终点
        // 分割面this 与 当前poly多边形(三角形)的每个点进行判断
        const ti = this.classifyVertex(vi); // 返回三种结果
        const tj = this.classifyVertex(vj);
        //---非常经典的一种写法---------------------------
        if (ti !== BACK) f.push(vi);
        if (ti !== FRONT) b.push(vi);
        //--------------------------------
        /**
          | ti | tj | ti | tj | 结果  | 含义  |
          |----|----|----|----|--------|------|
          | 0  | 0  | 00 | 00 | 00 (0) | 两个顶点都共面 |
          | 0  | 1  | 00 | 01 | 01 (1) | 一个共面，一个在前面 |
          | 0  | 2  | 00 | 10 | 10 (2) | 一个共面，一个在后面 |
          | 1  | 0  | 01 | 00 | 01 (1) | 一个在前面，一个共面 |
          | 1  | 1  | 01 | 01 | 01 (1) | 两个顶点都在前面 |
          | 1  | 2  | 01 | 10 | 11 (3) | 一个在前面，一个在后面 |
          | 2  | 0  | 10 | 00 | 10 (2) | 一个在后面，一个共面 |
          | 2  | 1  | 10 | 01 | 11 (3) | 一个在后面，一个在前面 |
          | 2  | 2  | 10 | 10 | 10 (2) | 两个顶点都在后面 |
         */
        // 得到共面的情况，或者使用 ^ 异或 也行
        if ((ti | tj) === SPANNING) {
          //计算直线与分割面的交点参数 t
          const t = (this.w - this.normal.dot(vi)) / this.normal.dot(vj.clone().sub(vi));
          const v = vi.interpolate(vj, t);
          f.push(v);
          b.push(v);
        }
      }

      const polys = [];
      if (f.length >= 3) polys.push(new ThreeBSP.Polygon(f));
      if (b.length >= 3) polys.push(new ThreeBSP.Polygon(b));

      return polys;
    }
    /**
     *
     * @param {*} polygon -自定义多边形{vertices:,normal:,w:}
     * @param {*} coplanar_front - 共面前面数组
     * @param {*} coplanar_back -共面后面数组
     * @param {*} front - 前面数组
     * @param {*} back - 后面数组
     */
    subdivide(polygon, coplanar_front, coplanar_back, front, back) {
      // 这里的this 就是 this.divider 多边形对象ThreeBSP.Polygon
      const polys = this.tessellate(polygon);

      for (const poly of polys) {
        const side = this.classifySide(poly);

        switch (side) {
          case FRONT:
            front.push(poly);
            break;
          case BACK:
            back.push(poly);
            break;
          case COPLANAR: // 共面
            if (this.normal.dot(poly.normal) > 0) {
              coplanar_front.push(poly);
            } else {
              coplanar_back.push(poly);
            }
            break;
          default:
            throw new Error('BUG: Polygon of classification ' + side + ' in subdivision');
        }
      }
    }
  };

  /** Node class
   *
   *  */
  ThreeBSP.Node = class {
    constructor(polygons) {
      this.polygons = []; // [polygon={vertices,normal,w},polygon={}]
      this.front = null;
      this.back = null;
      this.divider = null; // 分割面(Polygon={vertices:[THREE.Vector3,],normal:,w:})

      if (polygons && polygons.length) {
        this.build(polygons); // 初始化的时候就会构造一个Node对象
      }
    }
    /**
     * 克隆出一个新的ThreeBSP节点
     * @returns
     */
    clone() {
      const node = new ThreeBSP.Node();
      node.divider = this.divider ? this.divider.clone() : null;
      node.polygons = this.polygons.map(p => p.clone());
      node.front = this.front ? this.front.clone() : null;
      node.back = this.back ? this.back.clone() : null;
      return node;
    }
    /**
     * 这个方法会被多次调用，初始化构建ThreeBSP对象及后期创建对象的时候
     * 都会调用这个方法
     * @param {*} polygons
     * @returns
     */
    build(polygons) {
      // 多边形不存在直接返回
      if (!polygons.length) return this;

      if (!this.divider) {
        this.divider = polygons[0].clone(); // 克隆第一个多边形(三角形)
      }

      const front = [];
      const back = [];
      /**
       * 1、build(polygons) 在初始化构造ThreeBSP对象时调用
       * 此时：this.divider 是Mesh.geometry 中的第一个自定义多边形(三角形)，也就是ThreeBSP.Polygon 对象
       * 目地就是为了把自己解析构造成一个二叉树
       *
       */
      for (const poly of polygons) {
        this.divider.subdivide(poly, this.polygons, this.polygons, front, back);
      }

      if (front.length) {
        if (!this.front) this.front = new ThreeBSP.Node();
        this.front.build(front);
      }

      if (back.length) {
        if (!this.back) this.back = new ThreeBSP.Node();
        this.back.build(back);
      }

      return this;
    }

    isConvex(polys) {
      for (const inner of polys) {
        for (const outer of polys) {
          if (inner !== outer && outer.classifySide(inner) !== BACK) {
            return false;
          }
        }
      }
      return true;
    }

    allPolygons() {
      let polygons = this.polygons.slice();
      if (this.front) polygons = polygons.concat(this.front.allPolygons());
      if (this.back) polygons = polygons.concat(this.back.allPolygons());
      return polygons;
    }
    /**
     * 取反操作
     * @returns
     */
    invert() {
      // 对多边形(自定义Polygon对象)取反
      for (const poly of this.polygons) {
        poly.invert();
      }

      if (this.divider) this.divider.invert();
      if (this.front) this.front.invert();
      if (this.back) this.back.invert();

      const temp = this.front;
      this.front = this.back;
      this.back = temp;

      return this;
    }

    clipPolygons(polygons) {
      if (!this.divider) {
        return polygons.slice();
      }

      let front = [];
      let back = [];

      for (const poly of polygons) {
        this.divider.subdivide(poly, front, back, front, back);
      }

      if (this.front) front = this.front.clipPolygons(front);
      if (this.back) back = this.back.clipPolygons(back);

      return front.concat(this.back ? back : []);
    }

    clipTo(node) {
      this.polygons = node.clipPolygons(this.polygons);
      if (this.front) this.front.clipTo(node);
      if (this.back) this.back.clipTo(node);
      return this;
    }
  };

  return ThreeBSP;
}
