import * as YUKA from 'yuka';
import { TTTNode } from "./TTTNode";
import { TTTEdge } from './TTTEdge';

export class TTTGraph extends YUKA.Graph{
    constructor(options={}){
        super();
        this._options = options;
        // 表示me or ai
        this.digraph = true;

        this.nodeMap = new Map();// [node.value,node.index]
        this.currentNode = -1;
        this.nextNode = 0;
        this.arrayTurn =[];

        this.currentPlayer = 1;
        this.aiPlayer = this.nextPlayer(options.player);
        console.log('this.aiPlayer:',this.aiPlayer)
        this.init();
    }
    init(){
        const node = new TTTNode({index:this.nextNode ++,total:this._options.total,board:''});
        //console.log('node:',node);
        this.addNode(node);
        this.currentNode = node.index;

        const weight = this.generate(node.index,this.currentPlayer);
        //console.log('weight:',weight);
    }

    adNode(node){
        this.nodeMap.set(node.value,node.index);
        return super.addNode(node);
    }
    generate(nodeIndex,activePlayer){
        const node = this.getNode(nodeIndex);
        const weights = [];
        // 循环检测每个值是不是9
        /**
         * board:[9,1,2....],
            finished:false,
            index:0,
            value:9,
            weight:0,
            win:false
            winPlayer:-1,
         */
        for(let i =0; i < this._options.total;i++){
            if(node.board[i] === 9){// 表示未占用
                const nextBoard = this.getNextBoard(node,i,activePlayer);
                let activeNodeIndex = this.findNode(nextBoard);// 在新的数据中查找
                if(activeNodeIndex === -1){
                    // 未被使用
                    const nextNode = new TTTNode({index:this.nextNode++,total:0,board:nextBoard});
                    this.addNode(nextNode);
                    activeNodeIndex = nextNode.index;

                    // 连接当前节点到下一个
                    const edge = new TTTEdge(nodeIndex,activeNodeIndex,i,activePlayer);
                    this.addEdge(edge);

                    if(nextNode.finished === true){
                        // 检测是否完成
                        //console.log(234,nextNode.weight);
                        this.computeWeight(nextNode);
                        //console.log(2343,nextNode.weight);

                        weights.push(nextNode.weight);
                    }else{
                        //console.log(21,this.generate(activeNodeIndex,this.nextPlayer(activePlayer)))
                        weights.push(this.generate(activeNodeIndex,this.nextPlayer(activePlayer)));
                    }
                }else{
                    const edge = new TTTEdge(nodeIndex,activeNodeIndex,i,activePlayer);
                    this.addEdge(edge);

                    const nextNode = this.getNode(activeNodeIndex);
                    weights.push(nextNode.weight);
                }
            }
        }

        if(activePlayer === this.aiPlayer){
            node.weight = Math.max(...weights);
            return node.weight;
        }else{
            node.weight = Math.min(...weights);
            return node.weight;
        }
        
    }
    aiTurn(){
        const currentWeight = this.getNode(this.currentNode).weight;
        const possibleMoves = [];
        this.getEdgesOfNode(this.currentNode,possibleMoves);
        let bestMove;

        for(let i =0 ;i < possibleMoves.length;i++){
            const move = possibleMoves[i];
            const node = this.getNode(move.to);

            if(node.weight === currentWeight){
                if(node.finished){
                    this.turn(move.cell,this.aiPlayer);
                    return;
                }else if(bestMove === undefined){
                    bestMove = move;
                }
            }
        }

        this.turn(bestMove.cell,this.aiPlayer);
    }
    turn(cell,player){
        this.arrayTurn.length = 0;
        this.getEdgesOfNode(this.currentNode,this.arrayTurn);

        for(let i =0;i < this.arrayTurn.length;i++){
            const edge  = this.arrayTurn[i];
            if(edge.cell == cell && edge.player === player){
                this.currentNode = edge.to;
                this.currentPlayer = this.nextPlayer(player);
                break;
            }
        }
    }
    computeWeight(node){
        if(node.win){
            if(node.winPlayer === this.aiPlayer){
                node.weight = 100;
            }else{
                node.weight = -100;
            }
        }else{
            node.weight = 0;
        }
    }
    nextPlayer(who){
        return (who % 2) + 1;// 1 % 2 = 1  ,2 % 2=0
    }
    findNode(board){
        const value = parseInt(board.join(''),10);
        const node = this.nodeMap.get(value);
        return node ? node : -1;
    }
    addNode(node){
        this.nodeMap.set(node.value,node.index);
        return super.addNode(node);
    }
    getNextBoard(node,cell,player){
        const board = node.board.slice();// 拷贝数组
        board[cell] = player;
        return board;
    }
}