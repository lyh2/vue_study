/**
 * 生成图
 */
import * as THREE from "three";
/**
 * 节点代表Mesh对象分割独立的顶点
 */
export class Node{
    /**
     * 创建节点，就是mesh 对象中的vertices
     */
    constructor(index=0,value=new THREE.Vector3(),edges=[]){
        this.index = index;
        this.value = value; // 节点的3d 坐标
        this.edges = edges;// 边
    }
}

/**
 * 这个表示节点之间的连线
 */
export class Edge{
    constructor(node1,node2,weight=0){
        this.node1 = node1;
        this.node2 = node2;
        this.weight = weight;
    }
}

/**
 * obj:Mesh 对象
 * 管理图
 */
export class Graph{
    //adjacencyList// 临边
    constructor(obj){
        this.adjacencyList ={}; // 可以访问的列表 Map<number,number[]>
        this.nodes ={}; // Map<number,Node>
        this.obj = obj; // 需要用来创建网格图的Mesh 对象
        this.initGraph();
    }

    clear(){
        this.nodes = {};// 清空对象
        this.adjacencyList ={};
    }

    addNode(index,value){
        if(!this.nodes.index){
            this.nodes[index] = new Node(index,value);
            this.adjacencyList[index] = [];
            
        }
    }

    addEdge(index1,index2,weight=1){
        const node1 = this.nodes[index1];
        const node2 = this.nodes[index2];
        if(!node1 || !node2){
            throw new Error("节点未找到....");
        }
        // 在这里可以计算两点之间的距离 当作权重值
        const edge = new Edge(node1,node2,weight);
        node1.edges.push(edge);
        node2.edges.push(edge);

        if(!this.adjacencyList[index1]){
            // 不存在相邻边
            this.adjacencyList[index1] =[];
        }

        if(!this.adjacencyList[index2]){
            this.adjacencyList[index2] =[];
        }

        this.adjacencyList[index1].push(index2);
        this.adjacencyList[index2].push(index1);
    }
    /**
     * 初始化图
     * @returns 
     */
    initGraph(){
        if(!this.obj) return; // 不存在目标点
        const positions = this.obj.geometry.getAttribute("position");
        const indices = this.obj.geometry.getIndex();

        if(!indices){
            throw new Error(
                "Mesh geometry is not indexed. Can only compute indexed geometries."
              );
        }

        const vertex = new THREE.Vector3();
        const addedEdges = {};

        for(let i =0; i < positions.count;i++){
            vertex.fromBufferAttribute(positions,i);
            if(this.obj) vertex.applyMatrix4(this.obj.matrixWorld);
            this.addNode(i,vertex.clone());
        }

        // 添加边
        for(let i =0; i < indices.count;i+=3){
            const indexA = indices.getX(i);
            const indexB = indices.getX(i + 1);
            const indexC = indices.getX(i + 2);

            const edgeAB = [Math.min(indexA,indexB),Math.max(indexA,indexB)].join("->");
            const edgeBC = [Math.min(indexB,indexC),Math.max(indexB,indexC)].join("->");
            const edgeCA= [Math.min(indexC,indexA),Math.max(indexC,indexA)].join("->");
            //console.log(edgeAB,edgeBC,edgeCA)
            if(!addedEdges[edgeAB]){
                const weightAB = this.nodes[indexA].value.distanceTo(this.nodes[indexB].value);

                this.addEdge(indexA,indexB,weightAB);
                addedEdges[edgeAB] = weightAB;
            }

            if(!addedEdges[edgeBC]){
                const weightBC = this.nodes[indexB].value.distanceTo(this.nodes[indexC].value);
                this.addEdge(indexB,indexC,weightBC);
                addedEdges[edgeBC] = weightBC;
            }

            if(!addedEdges[edgeCA]){
                const weightCA = this.nodes[indexC].value.distanceTo(this.nodes[indexA].value);
                this.addEdge(indexC,indexA,weightCA);
                addedEdges[edgeCA] = weightCA;
            }
        }

        this.edges = addedEdges;
    }
}

/**
 * 按照 ../vue_study/src/utils/Dijkstras3D.js 需要的格式进行组合数据
 * 实现了路线查找
 */
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
        if(this.nodes.find(node => node.name === name) == undefined){
            // 没有找到对应的节点
            this.nodes.push({name:name,position:{x:value.x,y:value.y,z:value.z}});
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
            if(this.obj) vertex.applyMatrix4(this.obj.matrixWorld)

                this.addNode(i,vertex)
        }
        // 添加边，也就是点与点之间的关系
        if(indices){
            //console.log('indices:',indices)
            for(let i =0; i < indices.array.length;i+= 3){
                const v1 = indices.array[i];
                const v2 = indices.array[i+1];
                const v3 = indices.array[i+2];
                const index1 = this.edges.findIndex(itArr => itArr[0] === 'index_'+v1);
                const index2 = this.edges.findIndex(itArr => itArr[0] === 'index_'+v2);
                const index3 = this.edges.findIndex(itArr => itArr[0] === 'index_'+v3);
                
                if(index1 == -1){
                    this.edges.push(['index_'+v1,['index_'+v2,'index_'+v3]]) // 新增
                }else{
                    this.edges[index1][1].push('index_'+v2,'index_'+v3)
                }
                if(index2 == -1){
                    this.edges.push(['index_'+v2,['index_'+v1,'index_'+v3]])
                }else{
                    this.edges[index2][1].push('index_'+v1,'index_'+v3)
                }
                if(index3 == -1){
                    this.edges.push(['index_'+v3,['index_'+v1,'index_'+v2]])
                }else{
                    this.edges[index3][1].push('index_'+v1,'index_'+v2)
                }
            }
        }else{
            // 如果没有索引，逐顶点处理-还未验证
            for (let i = 0; i < positions.array.length / 3; i += 3) {
                const v1 = i;
                const v2 = i + 1;
                const v3 = i + 2;

                const index1 = this.edges.findIndex(itArr => itArr[0] === 'index_'+v1);
                const index2 = this.edges.findIndex(itArr => itArr[0] === 'index_'+v2);
                const index3 = this.edges.findIndex(itArr => itArr[0] === 'index_'+v3);
                
                if(index1 == -1){
                    this.edges.push(['index_'+v1,['index_'+v2,'index_'+v3]]) // 新增
                }else{
                    this.edges[index1][1].push('index_'+v2,'index_'+v3)
                }
                if(index2 == -1){
                    this.edges.push(['index_'+v2,['index_'+v1,'index_'+v3]])
                }else{
                    this.edges[index2][1].push('index_'+v1,'index_'+v3)
                }
                if(index3 == -1){
                    this.edges.push(['index_'+v3,['index_'+v1,'index_'+v2]])
                }else{
                    this.edges[index3][1].push('index_'+v1,'index_'+v2)
                }
            }
        }
    }
}
