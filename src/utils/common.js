import * as THREE from 'three';
import { ConvexHull } from 'three/examples/jsm/Addons.js';
import * as CANNON from 'cannon-es';
/**
 * 去掉重复的顶点
 * @param {*} positions 
 * @param {*} epsilon 
 */
export  function removeDuplicateVertices(positions,epsilon=1e-6){
    const unique = [];
    const map = new Map();

    // Step 1: 去重
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        const key = `${Math.round(x/epsilon)}-${Math.round(y/epsilon)}-${Math.round(z/epsilon)}`;

        if (!map.has(key)) {
            map.set(key, unique.length);
            unique.push(new THREE.Vector3(x, y, z));
        }
    }

    // Step 2: 去掉一条线上的中间点
    const filtered = [];
    if (unique.length <= 2) {
        return { points: unique, indexMap: map }; // 少于3个点直接返回
    }

    filtered.push(unique[0]); // 保留第一个点

    for (let i = 1; i < unique.length - 1; i++) {
        const prev = filtered[filtered.length - 1];
        const current = unique[i];
        const next = unique[i + 1];

        const dir1 = new THREE.Vector3().subVectors(current, prev).normalize();
        const dir2 = new THREE.Vector3().subVectors(next, current).normalize();

        if (dir1.distanceTo(dir2) > epsilon) {
            filtered.push(current); // 方向不一致，保留
        }
        // 方向一致就跳过 current
    }

    filtered.push(unique[unique.length - 1]); // 保留最后一个点

    return { points: filtered, indexMap: map };
}
/**
 * 获取removeDuplicateVertices 方法中是否存在key
 * @param {*} x 
 * @param {*} y 
 * @param {*} z 
 * @param {*} tolerance 
 */
export function makeKey(x,y,z,tolerance=1e-6){
    return `${Math.round(x/tolerance)}-${Math.round(y/tolerance)}-${Math.round(z/tolerance)}`;
}

/**
 * 通过geometry 创建cannon-es 形状
 * @param {*} geometry 
 */
export function createCannonShapeFromGeometry(geometry){
    const {points} = removeDuplicateVertices(geometry.attributes.position);
    
    if (points.length < 4) {
        console.warn('createCannonShapeFromGeometry: Not enough unique points to form a hull.');
        return {convexShape:null,newGeometry:null};
        // 直接返回，不能继续了
    }

    // **检查是否共面**
    if (arePointsCoplanar(points)) {
        console.warn('createCannonShapeFromGeometry: Points are coplanar(共面).');
        return {convexShape:null,newGeometry:null};
    }

    if (isGeometryDegenerate(points)) {
        console.warn('createCannonShapeFromGeometry: Geometry is degenerate退化 (very small volume).');
        return {convexShape:null,newGeometry:null};

    }
    const hull = new ConvexHull().setFromPoints(points);

    const cannonVertices = [];
    const cannonFaces = [];
    const threeVertices = [];
    const threeIndices = [];
    const vertexMap = new Map();

    hull.faces.forEach(face => {
        let edge = face.edge;
        const faceIndices = [];

        do {
            const vertex = edge.head().point;
            const key = `${vertex.x}_${vertex.y}_${vertex.z}`;

            let idx;
            if (vertexMap.has(key)) {
                idx = vertexMap.get(key);
            } else {
                idx = threeVertices.length / 3;
                threeVertices.push(vertex.x, vertex.y, vertex.z);
                cannonVertices.push(new CANNON.Vec3(vertex.x, vertex.y, vertex.z));
                vertexMap.set(key, idx);
            }

            faceIndices.push(idx);
            edge = edge.next;
        } while (edge !== face.edge);

        // 3个点就是一个三角面
        if (faceIndices.length === 3) {
            threeIndices.push(...faceIndices);
        } else if (faceIndices.length > 3) {
            // 超过3个点简单扇形剖分
            for (let i = 1; i < faceIndices.length - 1; i++) {
                threeIndices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
            }
        }

        cannonFaces.push(faceIndices);
    });

    // 同步创建 Three.js 的 geometry
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(threeVertices, 3));
    newGeometry.setIndex(threeIndices);
    newGeometry.computeVertexNormals();
    newGeometry.computeBoundingSphere();

    const cannonShape = new CANNON.ConvexPolyhedron({
        vertices: cannonVertices,
        faces: cannonFaces,
    });

    return { convexShape:cannonShape, newGeometry };
}

export function arePointsCoplanar(points, tolerance = 1e-6) {
    if (points.length < 4) return true; // 少于4个点自然是共面的

    const normal = new THREE.Vector3()
        .subVectors(points[1], points[0])
        .cross(new THREE.Vector3().subVectors(points[2], points[0]))
        .normalize();

    for (let i = 3; i < points.length; i++) {
        const v = new THREE.Vector3().subVectors(points[i], points[0]);
        if (Math.abs(normal.dot(v)) > tolerance) {
            return false; // 有一点不共面
        }
    }

    return true; // 全部共面
}

function isGeometryDegenerate(points, minVolumeThreshold = 1e-6) {
    const box = new THREE.Box3();
    for (const p of points) {
        box.expandByPoint(p);
    }
    const size = new THREE.Vector3();
    box.getSize(size);

    const volume = size.x * size.y * size.z;
    return volume < minVolumeThreshold;
}
