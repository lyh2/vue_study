import * as THREE from 'three'
import * as CANNON from 'cannon-es'
class CannonUtils {
    static CreateTrimesh(geometry) {
        let vertices
        if (geometry.index === null) {
            vertices = geometry.attributes.position.array
        } else {
            vertices = geometry.clone().toNonIndexed().attributes.position.array
        }
        const indices = Object.keys(vertices).map(Number)
        return new CANNON.Trimesh(vertices, indices)
    }
    /**
     * 通过Mesh的geometry 数据创建CANNON形状
     * @param {*} geometry 
     * @returns 
     */
    static CreateConvexPolyhedron(geometry) {
        const position = geometry.attributes.position;//{count,array}
        const normal = geometry.attributes.normal;//{array,count}
        const vertices = [];
        // 把所有的点以THREE.Vector3() 放入数组中
        for (let i = 0; i < position.count; i++) {
            vertices.push(new THREE.Vector3().fromBufferAttribute(position, i));
        }
        const faces = [];// 组合face 数据-一个face 三个点(xyz)
        for (let i = 0; i < position.count; i += 3) {
            const vertexNormals =
                normal === undefined
                    ? []
                    : [
                          new THREE.Vector3().fromBufferAttribute(normal, i),
                          new THREE.Vector3().fromBufferAttribute(normal, i + 1),
                          new THREE.Vector3().fromBufferAttribute(normal, i + 2),
                      ];
            const face = {
                a: i,
                b: i + 1,
                c: i + 2,
                normals: vertexNormals,
            };
            faces.push(face);
        }
        const verticesMap = {};
        const points = [];
        const changes = [];
        // 减少点位
        for (let i = 0, il = vertices.length; i < il; i++) {
            const v = vertices[i];//THREE.Vector3()
            // Math.round(11.5) => 11.5 + 0.5 ,向上取整,这里的100，在其他项目中可能需要进行调整，要根据点位的具体值进行判断
            const key = Math.round(v.x * 100) + '_' + Math.round(v.y * 100) + '_' + Math.round(v.z * 100);
            if (verticesMap[key] === undefined) {
                verticesMap[key] = i;
                points.push(new CANNON.Vec3(vertices[i].x, vertices[i].y, vertices[i].z));
                changes[i] = points.length - 1;
            } else {
                // 已经存在相似的点
                changes[i] = changes[verticesMap[key]];
            }
        }
        //调整顶点索引为去重后的新索引，并检查是否有重复的顶点导致面无效。比如，如果一个面的三个顶点中有两个相同，就移除这个面。这一步是为了确保每个面都是有效的三角形，没有退化的面（如线段或点
        const faceIdsToRemove = [];
        for (let i = 0, il = faces.length; i < il; i++) {
            const face = faces[i];
            face.a = changes[face.a];
            face.b = changes[face.b];
            face.c = changes[face.c];
            const indices = [face.a, face.b, face.c];
            for (let n = 0; n < 3; n++) {
                if (indices[n] === indices[(n + 1) % 3]) {//[0]->[1],[1]->[2],[2]->[0]
                    faceIdsToRemove.push(i);
                    break;// 只要有一个点，就返回
                }
            }
        }
        // 移除共点的面，faceIdsToRemove 中的数据是顺序的，所以，我们反向操作，否在就会改变数据，导致数据会失败
        for (let i = faceIdsToRemove.length - 1; i >= 0; i--) {
            const idx = faceIdsToRemove[i];
            faces.splice(idx, 1);
        }
        const cannonFaces = faces.map(function (f) {
            return [f.a, f.b, f.c]
        })
        return new CANNON.ConvexPolyhedron({ vertices: points, faces: cannonFaces })
    }
    static offsetCenterOfMass(body, centreOfMass) {
        body.shapeOffsets.forEach(function (offset) {
            centreOfMass.vadd(offset, centreOfMass)
        })
        centreOfMass.scale(1 / body.shapes.length, centreOfMass)
        body.shapeOffsets.forEach(function (offset) {
            offset.vsub(centreOfMass, offset)
        })
        const worldCenterOfMass = new CANNON.Vec3()
        body.vectorToWorldFrame(centreOfMass, worldCenterOfMass)
        body.position.vadd(worldCenterOfMass, body.position)
    }
}
export default CannonUtils
