/**
 * 这是最新完整版，在m.chisu.com 项目中实际使用过，请使用 three.js-nav-path-net 中的文件，完全优化的版本
 */
export const Dijkstras = (function () {

    let Dijkstras = function (nodes) {
        this.graph = {};
        this.queue = null;
        this.previous = {};
        this.setNodes(nodes); // 设置节点
    }

    /**
     * 计算两点之间的欧几里得距离
     * @param {Object} pos1 - 第一个点的坐标 { x, y, z }
     * @param {Object} pos2 - 第二个点的坐标 { x, y, z }
     * @return {number} - 计算出的权重
     */
    Dijkstras.prototype.calculateWeight = function (pos1, pos2) {
        return Math.sqrt(
            Math.pow(pos2.x - pos1.x, 2) +
            Math.pow(pos2.y - pos1.y, 2) +
            Math.pow(pos2.z - pos1.z, 2)
        );
    }

    /**
     * 设置节点
     * @param {Array} nodes - 节点数组 [{ name: 'A', position: { x, y, z } }, ...]
     */
    Dijkstras.prototype.setNodes = function (nodes) {
        if (!Array.isArray(nodes)) {
            throw "nodes isn't an array (" + typeof nodes + ")";
        }
        // 循环处理节点数据
        for (let i = 0; i < nodes.length; i++) {
            let node = nodes[i];
            if (typeof node.name !== 'string' || typeof node.position !== 'object') {
                throw "Invalid node format at index: " + i; // 名称 和位置格式不对
            }
            this.graph[node.name] = {
                edges: {}, // 该节点可以到的边
                position: node.position
            };
        }
    }

    /**
     * 设置节点的连通性
     * @param {Array} connections - 连通性数组 [ ['A', ['B', 'C']], ['B', ['C', 'D']], ... ]
     */
    Dijkstras.prototype.setGraph = function (connections) {
        if (!Array.isArray(connections)) {
            throw "connections isn't an array (" + typeof connections + ")";
        }

        for (let i = 0; i < connections.length; i++) {
            let connection = connections[i];
            // 每个数组不是2D数组，且第二个数组项不是数组=>['节点',['可到的节点','可到的节点2']]
            if (connection.length !== 2 || !Array.isArray(connection[1])) {
                throw "Each connection must have a node and an array of connected nodes at index: " + i;
            }

            let from = connection[0]; // 起点
            let neighbors = connection[1]; // 相邻的数据

            if (!this.graph[from]) {
                throw "Node does not exist in the graph: " + from;
            }

            for (let j = 0; j < neighbors.length; j++) {
                let to = neighbors[j];
                if (!this.graph[to]) {
                    throw "Connected node does not exist in the graph: " + to;
                }
                let weight = this.calculateWeight(this.graph[from].position, this.graph[to].position);
                this.graph[from].edges[to] = weight; // 记录连通性和权重
            }
        }
    }

    /**
     * 找到最短路径
     * @param {string} source - 起始节点
     * @param {string} target - 目标节点
     * @return {Array} - 到目标的路径
     */
    Dijkstras.prototype.getPath = function (source, target) {
       
        if (!this.graph[source] || !this.graph[target]) {
            return [];
        }
        if (source === target) {
            return [];
        }

        this.queue = new MinHeap();
        this.queue.add(source, 0);
        this.previous ={};
        this.previous[source] = null;

        let u = null;
        while ((u = this.queue.shift()) !== null) {
            if (u === target) {
                let path = [];
                while (this.previous[u] != null) {
                    path.unshift(u);
                    u = this.previous[u];
                }
                path.unshift(source); // 将起始节点添加到路径中

                // 返回完整的节点信息
                return path.map(nodeName => ({
                    name: nodeName,
                    position: this.graph[nodeName].position
                }));
            }
            
            //console.log(this.queue.roots,21)
            //console.log(this.queue.getDistance(u),22)
            if (this.queue.getDistance(u) === Infinity) {
                break;
            }
            //console.log(3,this.graph[u].edges);
            let uDistance = this.queue.getDistance(u);
            for (let neighbour in this.graph[u].edges) {
                let nDistance = this.queue.getDistance(neighbour);
                let aDistance = uDistance + this.graph[u].edges[neighbour];
                //console.log('update:',aDistance ,nDistance)
                if (aDistance < nDistance) {
                    //console.log('this.queue:',this.queue)

                    this.queue.update(neighbour, aDistance);
                    this.previous[neighbour] = u;
                }
            }
          
        }

        return [];
    }
  
    
    // 最小堆实现
    let MinHeap = (function() {
        let MinHeap = function () {
            this.min = null;
            this.roots = [];
            this.nodes = [];
        }

        MinHeap.prototype.shift = function() {
            let minNode = this.min;

            if (minNode == null || this.roots.length < 1) {
                this.min = null;
                return minNode;
            }

            this.remove(minNode);
            if (this.roots.length > 50) {
                this.consolidate();
            }

            let lowestDistance = Infinity;
            for (let i = 0; i < this.roots.length; i++) {
                let node = this.roots[i];
                let distance = this.getDistance(node);
                if (distance < lowestDistance) {
                    lowestDistance = distance;
                    this.min = node;
                }
            }

            return minNode;
        }

        MinHeap.prototype.consolidate = function() {
            let depths = [ [], [], [], [], [], [], [] ],
                maxDepth = depths.length - 1,
                removeFromRoots = [];

            for (let i = 0; i < this.roots.length; i++) {
                let node = this.roots[i];
                let depth = this.nodes[node].depth;
                if (depth < maxDepth) {
                    depths[depth].push(node);
                }
            }

            for (let depth = 0; depth <= maxDepth; depth++) {
                while (depths[depth].length > 1) {
                    let first = depths[depth].shift();
                    let second = depths[depth].shift();
                    let newDepth = depth + 1;

                    if (this.nodes[first].distance < this.nodes[second].distance) {
                        this.nodes[first].depth = newDepth;
                        this.nodes[first].children.push(second);
                        this.nodes[second].parent = first;
                        if (newDepth <= maxDepth) {
                            depths[newDepth].push(first);
                        }
                        removeFromRoots.push(second);
                    } else {
                        this.nodes[second].depth = newDepth;
                        this.nodes[second].children.push(first);
                        this.nodes[first].parent = second;
                        if (newDepth <= maxDepth) {
                            depths[newDepth].push(second);
                        }
                        removeFromRoots.push(first);
                    }
                }
            }
            this.roots = this.roots.filter(node => !removeFromRoots.includes(node));
        }

        MinHeap.prototype.add = function(node, distance) {
            this.nodes[node] = {
                node: node,
                distance: distance,
                depth: 0,
                parent: null,
                children: []
            };

            if (!this.min || distance < this.nodes[this.min].distance) {
                this.min = node;
            }
            this.roots.push(node);
        }

        MinHeap.prototype.update = function(node, distance) {
            this.remove(node);
            this.add(node, distance);
        }

        MinHeap.prototype.remove = function(node) {
            if (!this.nodes[node]) {
                return;
            }

            let numChildren = this.nodes[node].children.length;
            if (numChildren > 0) {
                for (let i = 0; i < numChildren; i++) {
                    let child = this.nodes[node].children[i];
                    this.nodes[child].parent = this.nodes[node].parent;
                    if (this.nodes[child].parent == null) {
                        this.roots.push(child);
                    }
                }
            }

            let parent = this.nodes[node].parent;
            if (parent == null) {
                let pos = this.roots.indexOf(node);
                if (pos > -1) {
                    this.roots.splice(pos, 1);
                }
            } else {
                 // `node` 不是根节点，从 `parent.children` 中移除
                this.nodes[parent].children = this.nodes[parent].children.filter(c => c !== node);

                let visited = {};// 记录已经访问的parent，避免循环依赖
                while (parent && !visited[parent]) {
                    visited[parent] = parent;
                    this.nodes[parent].depth--;
                    parent = this.nodes[parent].parent;
                }
            }

             // 清除节点数据
            //delete this.nodes[node];
        }

        MinHeap.prototype.getDistance = function(node) {
            if (!this.nodes[node]) {
                return Infinity;
            }
            return this.nodes[node].distance;
        }

        return MinHeap;
    })();

    return Dijkstras;
})();