import * as THREE from "three";

import {createNoise2D} from "simplex-noise";

/**
 * 创建地形
 * @param {enableWireframe:false} params 
 * @param {width:false} params 
 * @param {height:false} params 
 * @param {widthSegments:false} params 
 * @param {heightSegments:false} params 
 */

export const createMountainousTerrain = (params={})=>{
    // 创建几何数据
    const buffer = new THREE.BufferGeometry();
    const width = params?.width || 200;
    const height = params?.height || 200;

    const widthSegments = params?.widthSegments || width * 10;
    const heightSegments = params?.heightSegments || height * 10;

    const numVertices = (widthSegments + 1) * (heightSegments + 1);// 得到点位个数
    const numIndices = widthSegments * heightSegments * 6;// 索引个数
    const positions = new Float32Array(numVertices * 3);
    const indices = new Uint16Array(numIndices);
    const colors = new Float32Array(numVertices * 3);


    let vertexIndex = 0;
    for(let i =0; i <= widthSegments;i++){
        for(let j =0; j < heightSegments;j++){
            const x = ( i / widthSegments) * width - width /2;
            const z = (j / heightSegments) * height - height /2;// 使值在-height/2 到 height/2 之间
            const y = getElevation(x,z);// 得到海拔高度值

            positions[vertexIndex * 3] = x;
            positions[vertexIndex * 3 + 1] = y;
            positions[vertexIndex * 3 + 2] = z;

            // 获取颜色
            const color = getColorByElevation();
            colors[vertexIndex * 3] = color.r;
            colors[vertexIndex * 3 + 1] = color.g;
            colors[vertexIndex * 3 + 2] = color.b;

            vertexIndex ++;
        }
    }
    /**
     * 段数+1 个顶点数据
     * 假设widthSegments=heightSegments = 10;
     * a = 0 * 11 + 0 = 0,b=0+ 10 + 1=11,c = 0 + 1=1,d=12;=>(a,b,c)=>(0,11,1)
     * a c
     * b d
     */
    let index = 0;
    for(let i = 0; i < widthSegments;i++){
        for(let j = 0; j < heightSegments;j++){
            const a = i * (heightSegments + 1) + j;
            const b = a + heightSegments + 1;
            const c = a + 1;
            const d = b + 1;

            indices[index ++] = a;
            indices[index ++] = b;
            indices[index ++] = c;

            indices[index ++] = c;
            indices[index ++] = b;
            indices[index ++] = d;
        }
    }

    const positionAttribute = new THREE.BufferAttribute(positions,3);
    const indexAttribute = new THREE.BufferAttribute(indices,1);// 这个索引数据可以不使用
    const colorAttribute = new THREE.BufferAttribute(colors,3);

    buffer.setAttribute("position",positionAttribute);
    buffer.setIndex(indexAttribute);
    buffer.setAttribute("color",colorAttribute);

    // 计算法线
    const normals = new Float32Array(numVertices * 3);
    const normalCounts = new Uint16Array(numVertices);
    const faceNormals = new Float32Array(numVertices * 3);// 一个面3个法线

    for(let i =0; i < indices.length;i+= 3){
        const a = indices[i];
        const b = indices[i + 1];
        const c = indices[i + 2];

        const vA = new THREE.Vector3().fromArray(positions,a + 3);
        const vB = new THREE.Vector3().fromArray(positions,b * 3);
        const vC = new THREE.Vector3().fromArray(positions,c * 3);

        const faceNormal = new THREE.Vector3().subVectors(vB,vA).cross(new THREE.Vector3().subVectors(vC,vA)).normalize();
        faceNormals[a * 3] += faceNormal.x;
        faceNormals[a * 3 + 1] += faceNormal.y;
        faceNormals[a * 3 + 1] += faceNormal.z;

        faceNormals[b * 3] += faceNormal.x;
        faceNormals[b * 3 + 1] += faceNormal.y;
        faceNormals[b * 3 + 2] += faceNormal.z;

        faceNormals[c * 3] += faceNormal.x;
        faceNormals[c * 3+ 1] += faceNormal.y;
        faceNormals[c * 3+ 2] += faceNormal.z;

        normalCounts[a] ++;
        normalCounts[b] ++;
        normalCounts[c] ++;
    }

    for(let i =0; i < normals.length;i+=3){
        const count = normalCounts[i /3];
        if(count > 0){
            normals[i] = faceNormals[i] / count;
            normals[i + 1] = faceNormals[i + 1] / count;
            normals[i + 2] = faceNormals[i + 2] / count;
        }
    }

    buffer.setAttribute("normal",new THREE.Float32BufferAttribute(normals,3));
    buffer.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
        vertexColors:true,
        side:THREE.DoubleSide,
        roughness:0.9,
        metalness:0.1,
        wireframe:params.enableWireframe
    });

    const mesh = new THREE.Mesh(buffer,material);
    return mesh;
}

/**
 * 得到Y值
 * @param {*} x 
 * @param {*} z 
 */
function getElevation(x=0,z=0){
    const scale = 0.1;
    const amplitude = 10;
    const noise2D = createNoise2D();

    let elevation = noise2D(x * scale,z * scale) * amplitude;

    const octaves = 4;
    let frequency = scale;
    let amplitudeSum = amplitude;
    for(let i =1;i < octaves;i++){
        frequency *= 2;
        amplitudeSum /=2;
        elevation += noise2D(x * frequency,z * frequency) * amplitudeSum;
    }

    return elevation;
}

/**
 * 根据高度值，获取颜色
 * @param {*} elevation 
 */
function getColorByElevation(elevation=0){
    const color = new THREE.Color(0xffffff);
    if(elevation < 0.5){
        color.set(0x000000);
    }else if(elevation < 2.0){
        color.set(0xFF3333);
    }else if(elevation < 4.0){
        color.set(0xFF6633);
    }else if(elevation < 6.0){
        color.set(0x9966CC);
    }else if(elevation < 8.0){
        color.set(0x6633FF);
    }else if(elevation < 10.0){
        color.set(0x66FFFF);
    }
    return color;
}