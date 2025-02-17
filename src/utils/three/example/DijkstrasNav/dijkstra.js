/*
 * @Author: 412285349@qq.com
 * @Date: 2024-11-03 19:09:00
 * @LastEditors: 412285349@qq.com 412285349@qq.com
 * @LastEditTime: 2024-11-17 18:15:12
 * @FilePath: /www/vue_study/src/utils/three/example/DijkstrasNav/dijkstra.js
 * @Description: 地克拉斯算法-理论一样，区别在于数据的结构，嵌套还是平铺
 * 
 */

import {Node} from "./graph";

/**
 * 使用二进制堆实现的优先级队列
 */
class PriorityQueue{
    constructor(){
        this.elements =[];//{node:节点,priority:优先级}
    }
    /**
     * 根据指定的优先级把节点添加到队列中
     * @param {*} node 
     * @param {*} priority 优先级
     */
    addNode(node,priority){
        this.elements.push({node,priority});

        this.bubbleUp(this.elements.length - 1);
    }
    /**
     * 移除并且返回高优先级的节点
     */
    removeNode(){
        const first = this.elements[0];
        //console.log(2121,first,this.elements);
        const last = this.elements.pop();// 删除并返回数组的最后一个元素
        if(this.elements.length > 0){
            // 还存在节点在数组中
            this.elements[0] = last;
            this.bubbleDown(0);
        }
        return first.node;
    }

    isEmpty(){
        return this.elements.length === 0;
    }
    /**
     * 向上冒泡
     * @param {*} index 
     */
    bubbleUp(index){
        while(index > 0){
            const parentIndex = Math.floor((index - 1) / 2);
            if(this.elements[parentIndex].priority <= this.elements[index].priority)
                break;
            [this.elements[parentIndex],this.elements[index]] = [
                this.elements[index],this.elements[parentIndex]
            ];
            index = parentIndex;
        }
    }
    /**
     * 向下移动节点
     * @param {*} index 
     */
    bubbleDown(index){
        const length = this.elements.length;
        const element = this.elements[index];
        let swapIndex = null;

        do{

            const leftChildIndex = 2 * index + 1;
            const rightChildIndex = 2 * index + 2;

            if(leftChildIndex < length){
                if(this.elements[leftChildIndex].priority < element.priority){
                    swapIndex = leftChildIndex;
                }
            }

            if(rightChildIndex < length){
                if((swapIndex === null && this.elements[rightChildIndex].priority < element.priority) || (swapIndex !== null && this.elements[rightChildIndex].priority < this.elements[leftChildIndex].priority)){
                    swapIndex = rightChildIndex;
                }
            }

            if(swapIndex !== null){
                this.elements[index] = this.elements[swapIndex];
                this.elements[swapIndex] = element;
                index = swapIndex;
            }
        } while(swapIndex !== null);
    }

}
/**
 * 使用dijkstra 算法计算得到一个最短的路径
 * nodes:graph.nodes 数据----------------- 算法内部还有无限循环
 */
export const getShortestPath=(startIndex,endIndex,nodes)=>{
    const startNode = nodes[startIndex]; // 得到起点节点
    const endNode = nodes[endIndex]; // 得到终点节点

    if(!startNode || !endNode){
        throw new Error("开始和结束两个节点不存在...");
        return null;
    }
    console.log('起点终点节点:',startNode,endNode)
    const distances ={};// Map<Node,number>
    const previousNodes = {};//Map<Node,Node>
    const queue = new PriorityQueue();
    distances[startNode.index]=0;
    queue.addNode(startNode,0); //把起点节点加入到队列中去
    //console.log(queue.elements[0])
    while(!queue.isEmpty()){
        const currentNode = queue.removeNode(); // 移除一个节点
        console.log('移除节点：',currentNode)
        if(currentNode === endNode){
            console.log(44444)
            const path =[];
            let node = currentNode;
            while(node){
                path.unshift(node);
                node = previousNodes[node.index];
            }
            return path;
        }
        // 遍历当前节点对应的边
        currentNode.edges.forEach(({node1,node2,weight})=>{
            const adjacentNode = node1 === currentNode ? node2 : node1; // 如果当前边的第一个点是起点，则取第二个点作为适配的点
            // 拿到第一个点的距离值，初始化的时候=0，及这条边的权重
            const currentDistance = distances[currentNode.index];
            console.log('currentDistance,weight=',currentDistance,weight,adjacentNode)
            if(currentDistance === undefined) return;

            const newDistance = currentDistance + weight; // 起点+下个点的距离
            const adjacentNodeDistance = distances[adjacentNode.index];
            console.log('距离newDistance , adjacentNodeDistance：',newDistance ,distances, adjacentNodeDistance)
            if(adjacentNodeDistance === undefined || newDistance < adjacentNodeDistance){
                distances[adjacentNode.index] = newDistance;
                previousNodes[adjacentNode.index] = currentNode;
                queue.addNode(adjacentNode,newDistance);
                console.log(1111)
            }
        });
    }
    console.log("查找路线失败...");
    return null;
}

/**
 * 
 ————————————————

                        
  在 Three.js 中，Mesh 的几何结构通常由三角形面构成，每个面由三个顶点（点）组成。要判断两个点是否相连，可以检查它们是否在同一个三角形面上。如果它们是同一三角形的两个顶点，就表示它们相连。

可以通过以下步骤来判断两个点是否相连：

获取几何体的顶点和索引：使用 geometry.getAttribute("position") 获取顶点位置，使用 geometry.getIndex() 获取索引信息。索引信息定义了三角形的连接方式。

遍历索引，检查顶点对：遍历索引数组，按每三个元素的分组（每个三角形有三个顶点）。对于每个三角形的三个顶点（例如，索引 A、B、C），可以得到以下三组连接对：

A 和 B
B 和 C
C 和 A
判断两个点是否在同一个三角形中：如果要检查的两个点出现在这三对之一中，那么它们在几何体中是相连的。

以下是实现代码的示例：

javascript
复制代码
import * as THREE from 'three';

function arePointsConnected(mesh, index1, index2) {
    const geometry = mesh.geometry;
    const indices = geometry.getIndex();
    
    if (!indices) {
        console.error("Mesh geometry is not indexed.");
        return false;
    }

    for (let i = 0; i < indices.count; i += 3) {
        const indexA = indices.getX(i);
        const indexB = indices.getX(i + 1);
        const indexC = indices.getX(i + 2);

        // 检查三角形的三对顶点组合
        if ((indexA === index1 && indexB === index2) || (indexA === index2 && indexB === index1)) return true;
        if ((indexB === index1 && indexC === index2) || (indexB === index2 && indexC === index1)) return true;
        if ((indexC === index1 && indexA === index2) || (indexC === index2 && indexA === index1)) return true;
    }

    // 没有找到连接
    return false;
}
解释：
arePointsConnected 函数接收一个 mesh 对象以及两个顶点的索引 index1 和 index2。
通过 indices.getX(i) 获取索引三元组中的每个顶点，判断它们是否与 index1 和 index2 匹配。
如果 index1 和 index2 在同一个三角形中，并且是相邻的两点，则返回 true，表示它们相连。
示例用法
javascript
复制代码
const isConnected = arePointsConnected(mesh, 0, 1);
console.log("Are points connected?", isConnected);
如果 isConnected 为 true，则表示索引为 0 和 1 的顶点在 mesh 中是相连的。
 */