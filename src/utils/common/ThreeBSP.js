export default function (THREE) {
  const EPSILON = 1e-5;
  const COPLANAR = 0;
  const FRONT = 1;
  const BACK = 2;
  const SPANNING = 3;

  // Helper function to convert BufferGeometry to polygon data
  function bufferGeometryToPolygons(geometry, matrix) {
    const polygons = [];
    const positionAttribute = geometry.getAttribute('position');
    const normalAttribute = geometry.getAttribute('normal');
    const uvAttribute = geometry.getAttribute('uv');

    const index = geometry.getIndex();
    const vertices = [];

    // Extract vertices
    for (let i = 0; i < positionAttribute.count; i++) {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(positionAttribute, i);
      vertex.applyMatrix4(matrix);

      const normal = normalAttribute
        ? (() => {
            const n = new THREE.Vector3();
            n.fromBufferAttribute(normalAttribute, i);
            return n;
          })()
        : new THREE.Vector3(0, 1, 0);

      const uv = uvAttribute
        ? (() => {
            const u = new THREE.Vector2();
            u.fromBufferAttribute(uvAttribute, i);
            return u;
          })()
        : new THREE.Vector2(0, 0);

      vertices.push(new ThreeBSP.Vertex(vertex.x, vertex.y, vertex.z, normal, uv));
    }

    // Create polygons from indices
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const polygon = new ThreeBSP.Polygon();
        polygon.vertices.push(
          vertices[index.getX(i)],
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

  function ThreeBSP(treeIsh, matrix) {
    this.matrix = matrix || new THREE.Matrix4();
    this.tree = this.toTree(treeIsh);
  }

  ThreeBSP.prototype.toTree = function (treeIsh) {
    if (treeIsh instanceof ThreeBSP.Node) {
      return treeIsh;
    }

    let polygons = [];

    if (treeIsh instanceof THREE.BufferGeometry) {
      polygons = bufferGeometryToPolygons(treeIsh, this.matrix);
    } else if (treeIsh instanceof THREE.Mesh) {
      treeIsh.updateMatrix();
      this.matrix.copy(treeIsh.matrix);
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

  ThreeBSP.prototype.subtract = function (other) {
    const us = this.tree.clone();
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

    them.clipTo(us.invert()).invert().clipTo(us.clipTo(them));

    return new ThreeBSP(us.build(them.allPolygons()).invert(), this.matrix);
  };

  // Vertex class
  ThreeBSP.Vertex = class extends THREE.Vector3 {
    constructor(x, y, z, normal, uv) {
      super(x, y, z);
      this.normal = normal || new THREE.Vector3();
      this.uv = uv || new THREE.Vector2();
    }

    clone() {
      return new ThreeBSP.Vertex(this.x, this.y, this.z, this.normal.clone(), this.uv.clone());
    }

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

  // Polygon class
  ThreeBSP.Polygon = class {
    constructor(vertices, normal, w) {
      this.vertices = vertices || [];
      this.normal = normal;
      this.w = w;

      if (this.vertices.length) {
        this.calculateProperties();
      }
    }

    calculateProperties() {
      const a = this.vertices[0];
      const b = this.vertices[1];
      const c = this.vertices[2];

      this.normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      this.w = this.normal.clone().dot(a);
      return this;
    }

    clone() {
      return new ThreeBSP.Polygon(
        this.vertices.map(v => v.clone()),
        this.normal.clone(),
        this.w
      );
    }

    invert() {
      this.normal.multiplyScalar(-1);
      this.w *= -1;
      this.vertices.reverse();
      return this;
    }

    classifyVertex(vertex) {
      const side = this.normal.dot(vertex) - this.w;

      if (side < -EPSILON) return BACK;
      if (side > EPSILON) return FRONT;
      return COPLANAR;
    }

    classifySide(polygon) {
      let front = 0;
      let back = 0;

      for (const vertex of polygon.vertices) {
        const side = this.classifyVertex(vertex);
        if (side === FRONT) front++;
        if (side === BACK) back++;
      }

      if (front > 0 && back === 0) return FRONT;
      if (front === 0 && back > 0) return BACK;
      if (front === 0 && back === 0) return COPLANAR;
      return SPANNING;
    }

    tessellate(poly) {
      const f = [];
      const b = [];
      const count = poly.vertices.length;

      if (this.classifySide(poly) !== SPANNING) {
        return [poly];
      }

      for (let i = 0; i < count; i++) {
        const vi = poly.vertices[i];
        const vj = poly.vertices[(i + 1) % count];

        const ti = this.classifyVertex(vi);
        const tj = this.classifyVertex(vj);

        if (ti !== BACK) f.push(vi);
        if (ti !== FRONT) b.push(vi);

        if ((ti | tj) === SPANNING) {
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

    subdivide(polygon, coplanar_front, coplanar_back, front, back) {
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
          case COPLANAR:
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

  // Node class
  ThreeBSP.Node = class {
    constructor(polygons) {
      this.polygons = [];
      this.front = null;
      this.back = null;
      this.divider = null;

      if (polygons && polygons.length) {
        this.build(polygons);
      }
    }

    clone() {
      const node = new ThreeBSP.Node();
      node.divider = this.divider ? this.divider.clone() : null;
      node.polygons = this.polygons.map(p => p.clone());
      node.front = this.front ? this.front.clone() : null;
      node.back = this.back ? this.back.clone() : null;
      return node;
    }

    build(polygons) {
      if (!polygons.length) return this;

      if (!this.divider) {
        this.divider = polygons[0].clone();
      }

      const front = [];
      const back = [];

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

    invert() {
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
