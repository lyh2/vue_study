/**
 * 这是最新完整版代码，在m.chisu.com 项目中实际使用过
 */
import * as THREE from 'three';
export class GraphFromMesh{
    constructor(obj){
        this.obj = obj;
        this.nodes =[];
        this.edges =[];
        this.initGraph();
    }
    clear(){
        this.nodes =[];
        this.nodes.length = 0;
        this.edges =[];
        this.edges.length = 0;
    }
    addNode(index,value){
        const name = "index_"+index;
        for(let i = 0; i < this.nodes.length;i++){
            if(this.nodes[i].name === name) return;
        }
        // if(this.nodes.find(node => node.name === name) == undefined){
        //     // 没有找到对应的节点
        // }
        this.nodes.push({name:name,position:{x:value.x,y:value.y,z:value.z}});
    }
    addEdge(v1, v2) {
        var key1 = "index_" + v1;
        var key2 = "index_" + v2;

        var index1 = -1;
        var index2 = -1;

        // 找到 key1 和 key2 在 edges 里的索引
        for (var i = 0; i < this.edges.length; i++) {
            if (this.edges[i][0] === key1) index1 = i;
            if (this.edges[i][0] === key2) index2 = i;
        }

        if (index1 === -1) {
            this.edges.push([key1, [key2]]); // 新增 key1 关联 key2
        } else {
            var neighbors = this.edges[index1][1];
            var exists = false;
            for (var j = 0; j < neighbors.length; j++) {
                if (neighbors[j] === key2) {
                    exists = true;
                    break;
                }
            }
            if (!exists) neighbors.push(key2);
        }

        if (index2 === -1) {
            this.edges.push([key2, [key1]]); // 新增 key2 关联 key1
        } else {
            var neighbors2 = this.edges[index2][1];
            var exists2 = false;
            for (var j = 0; j < neighbors2.length; j++) {
                if (neighbors2[j] === key1) {
                    exists2 = true;
                    break;
                }
            }
            if (!exists2) neighbors2.push(key1);
        }
    }
    initGraph(){
        if(!this.obj) return ;// 生成路网的数据不存在
        const positions = this.obj.geometry.getAttribute('position');
        //console.log('positions:',positions)
        const indices = this.obj.geometry.getIndex();
        if(!indices){
            throw new Error("Mesh 几何体没有索引数据")
        }
        const vertex = new THREE.Vector3();
        for(let i =0; i < positions.count;i++){
            vertex.fromBufferAttribute(positions,i);
            vertex.applyMatrix4(this.obj.matrixWorld)
            this.addNode(i,vertex)
        }
        // 添加边，也就是点与点之间的关系
        if(indices){
            //console.log('indices:',indices)
            for(let i =0; i < indices.array.length;i+= 3){
                const v1 = indices.array[i];
                const v2 = indices.array[i+1];
                const v3 = indices.array[i+2];
                
                this.addEdge(v1,v2);
                this.addEdge(v2,v3);
                this.addEdge(v3,v1);
            }
        }else{
            // 如果没有索引，逐顶点处理-还未验证
            for (let i = 0; i < positions.array.length / 3; i += 3) {
                const v1 = i;
                const v2 = i + 1;
                const v3 = i + 2;

                this.addEdge(v1,v2);
                this.addEdge(v2,v3);
                this.addEdge(v3,v1);
            }
        }
    }
}
