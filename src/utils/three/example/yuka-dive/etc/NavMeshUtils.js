/**
 * 导航Mesh的方法
 */

import * as THREE from 'three';


export default class NavMeshUtils{

    /**
     * 创建凸多边形区域可视化效果
     * @param {*} navMesh 
     */
    static createConvexRegionHelper(navMesh){
        const regions = navMesh.regions;
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.MeshBasicMaterial({vertexColors:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4});
        const mesh = new THREE.Mesh(geometry,material);
        mesh.matrixAutoUpdate = false;
        mesh.visible = false;

        const positions = [];
        const colors = [];
        const color = new THREE.Color();

        for(let region of regions){
            color.setHex(Math.random() * 0xffffff,THREE.SRGBColorSpace);

            // 统计边总数
            let edge = region.edge; // 是一个half-edge
            const edges = [];
            do{
                edges.push(edge);
                edge = edge.next;
            }while(edge !== region.edge);// 不是起点边

            // 构建三角形
            const triangleCount = (edges.length - 2);
            for(let i =1; i <= triangleCount ;i++){
                const v1 = edges[0].vertex;
                const v2 = edges[1].vertex;
                const v3 = edges[2].vertex;

                positions.push(v1.x,v1.y,v1.z);
                positions.push(v2.x,v2.y,v2.z);
                positions.push(v3.x,v3.y,v3.z);

                colors.push(color.r,color.g,color.b);
                colors.push(color.r,color.g,color.b);
                colors.push(color.r,color.g,color.b);
            }
        }
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));

        return mesh;
    }

    /**
     * 绘制导航路网
     * @param {*} graph 
     * @param {*} nodeSize 
     * @param {*} nodeColor 
     * @param {*} edgeColor 
     */
    static createGraphHelper(graph,nodeSize=1,nodeColor = 0x4e84c4,edgeColor=0xffdede){
        const group = new THREE.Group();
        group.name = 'graph';
        group.visible = false;

        // nodes
        const nodeMaterial = new THREE.MeshBasicMaterial({color:nodeColor});
        const nodeGeometry = new THREE.IcosahedronGeometry(nodeSize,4);

        const nodes = [];
        graph.getNodes(nodes);// index /position/userData

        for(let node of nodes){
            const nodeMesh = new THREE.Mesh(nodeGeometry,nodeMaterial);
            nodeMesh.position.copy(node.position);
            nodeMesh.userData.nodeIndex = node.index;// 存储节点的索引值

            nodeMesh.matrixAutoUpdate = false;
            nodeMesh.updateMatrix();

            group.add(nodeMesh);
        }

        // edges
        const edgesGeometry = new THREE.BufferGeometry();
        const positions = [];
        const edgesMaterial = new THREE.LineBasicMaterial({color:edgeColor});
        const edges = [];

        for(let node of nodes){
            graph.getEdgesOfNode(node.index,edges); // 得到当前节点的所有边
            for(let edge of edges){
                const fromNode = graph.getNode(edge.from);
                const toNode = graph.getNode(edge.to);// from ,to 是节点的索引值
                positions .push(fromNode.position.x,fromNode.position.y,fromNode.position.z);
                positions.push(toNode.position.x,toNode.position.y,toNode.position.z);
            }
        }

        edgesGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        const lines = new THREE.LineSegments(edgesGeometry,edgesMaterial);
        lines.name = 'graph-edges';
        lines.matrixAutoUpdate = false;
        group.add(lines);

        return group;
    }
    /**
     * Creates a helper that visualizes the spatial index of a navigation mesh.
     * @param {*} spatialIndex 
     */
    static createCellSpaceHelper(spatialIndex){
        const cells = spatialIndex.cells;//

        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({color:0xff0000});
        const lines = new THREE.LineSegments(geometry,material);
        lines.visible = false;
        lines.matrixAutoUpdate = false;

        // 获取数据
        const positions = [];
        for(let i =0; i < cells.length;i ++){
            const cell = cells[i];
            const min = cell.aabb.min;
            const max = cell.aabb.max;

            // bottom lines

			positions.push( min.x, min.y, min.z, 	max.x, min.y, min.z );
			positions.push( min.x, min.y, min.z, 	min.x, min.y, max.z );
			positions.push( max.x, min.y, max.z, 	max.x, min.y, min.z );
			positions.push( max.x, min.y, max.z, 	min.x, min.y, max.z );

			// top lines

			positions.push( min.x, max.y, min.z, 	max.x, max.y, min.z );
			positions.push( min.x, max.y, min.z, 	min.x, max.y, max.z );
			positions.push( max.x, max.y, max.z, 	max.x, max.y, min.z );
			positions.push( max.x, max.y, max.z, 	min.x, max.y, max.z );

			// torso lines

			positions.push( min.x, min.y, min.z, 	min.x, max.y, min.z );
			positions.push( max.x, min.y, min.z, 	max.x, max.y, min.z );
			positions.push( max.x, min.y, max.z, 	max.x, max.y, max.z );
			positions.push( min.x, min.y, max.z, 	min.x, max.y, max.z );
        }
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        return lines;
    }

    /**
     * 可视化显示路线
     */
    static createPathHelper(){
        const pathHelper = new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xff0000}));
        pathHelper.matrixAutoUpdate = false;
        pathHelper.visible = false;
        return pathHelper;
    }


}