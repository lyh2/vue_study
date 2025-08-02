<template>
    <div class="container" ref="container" id="container">
        <section class="tips" id="tipsId" ref="tips" v-if="isShowTips.value">
            <div class="start-section">
                <p class="title">Welcome to "Tic-Tac-Toe"</p>
                <p class="sub-title" ref="subTitle">谁先走第一步</p>
                <p class="btns">
                    <button class="btn" data-player="me" type="button" @click="onClickStart(1)">我先</button>
                    <button class="btn" data-player="ai" type="button" @click="onClickStart(2)">AI先</button>
                </p>

            </div>
            <div class="end-section" v-if="isRestart.value">
                <p class="result">
                    <button class="restart" type="button" @click="onClickRestart()">重新开始</button>
                </p>
            </div>
        </section>
        <section class="board" id="board" ref="board">
            <div class="board-box" ref="board_box">
                <div class="item" :id="item.value" v-for="(item, index) in boards" :key="index"
                    :ref="el => setItemRef(el, index)" @click="onClickCell(item.value)">
                </div>

            </div>
        </section>
    </div>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { TTTGraph } from '@/utils/three/example/tictactoe/TTTGraph.js';
import { reactive } from 'vue';


let graph = null;
const _AI_ = 2;// 表示AI
const _ME_ = 1;// 用户开始
console.log('_ME_',_ME_)
const _total_ = 3 * 3;// 盒子个数
const container = ref(null);
let isRestart = reactive({ value: false });
let isShowTips = reactive({ value: true });// 大区域
const board_box = ref("board_box");
const boards = reactive([]);
const itemRefs = [];
let fin = false;
let player = 0;


onMounted(() => {
    nextTick(() => {
        if (!container.value) {
            console.error("Container not found!");
            return;
        }
        initBoard(_total_);
    });
});
function initGame(who) {
    graph = new TTTGraph({ dom: container.value, player: who, total: _total_ });
    //console.log(222, who == _AI_)
    player = who;
    if (who == _AI_) {

        graph.aiTurn();
        updateUI();
    }
}
function onClickCell(value) {
    console.log('cell-value:', value)
    if (fin === false) {
        graph.turn(value, graph.currentPlayer);
        evaluate();
        if (fin === false) {
            graph.aiTurn();
            evaluate();
        }

        updateUI();
    }
}
function evaluate() {
    const board = graph.getNode(graph.currentNode);

    if (board.win === true || board.finished === true) fin = true;

}
function updateUI() {
    console.log(12, itemRefs);
    const node = graph.getNode(graph.currentNode);

    const board = node.board;

    for (let cell of itemRefs) {
        const cellId = cell.id;
        //console.log(cellId);
        const status = board[cellId];
        //console.log(status)
        switch (status) {
            case 1:
                cell.textContent = 'X';
                // 移除事件监听
                break;
            case 2:
                cell.textContent = '0';
                break;
            default:
                cell.textContent = '';
                break;
        }
    }

    if (fin === true) {
        isShowTips.value = true;
        isRestart.value = true;
        if (node.win === true) {
            if (node.winPlayer === player) {
                //subTitle.textContent = '你赢了游戏';
            } else {
                //subTitle.textContent = '你输了游戏';

            }
        } else {
            //subTitle.textContent = '重新开始';

        }
    }
}
/**
 * 
 * @param who me or ai
 */
function onClickStart(who) {
    isShowTips.value = false;
    console.log('who:', who)
    initGame(who);
}
function onClickRestart() {
    window.location.reload();
}
function initBoard(total) {
    for (let i = 0; i < total; i++) {
        boards.push({ id: i, name: 'index_' + i, value: i });
    }
}

function // 设置每个 div 的引用
    setItemRef(el, index) {
    if (el) {
        itemRefs[index] = el;
    }
}
</script>

<style scoped>
.container {
    width: 100%;
    height: 100%;
    background-color: aliceblue;
    display: flex;
    justify-content: center;
    align-items: center;
}

.tips {
    display: flex;
    position: fixed;
    z-index: 100;
    width: 35%;
    justify-content: center;
    align-items: flex-start;
    border-radius: 1rem;
    background: rgba(0, 0, 0, 0.5);
    padding: 1rem;
    flex-wrap: wrap;
}

.start-section {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
}

.title {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: center;
    font-size: 1.8rem;
    color: white;
}

.sub-title {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: center;
    font-size: 1.2rem;
    color: white;
}

.btns {
    display: flex;
    width: 100%;
    justify-content: center;
    padding: 1rem;
    align-items: center;
    flex-wrap: nowrap;
}

.btn {
    display: flex;
    padding: 0.5rem 1rem;
    font-size: 1.4rem;
    font-weight: bold;
    border-radius: 4px;
}

.end-section {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: center;
    flex-wrap: nowrap;
}

.result {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: center;
    padding: 1rem;
}

.restart {
    font-size: 1rem;
    padding: 0.2rem 1rem;
    border-radius: 4px;
}

.board {
    display: flex;
    width: 150rem;
    height: 150rem;
    justify-content: flex-start;
    align-items: flex-start;
}

.board-box {
    display: flex;

    justify-content: flex-start;
    align-items: flex-start;
    flex-wrap: wrap;

}

.item {
    margin: 10px;
    display: flex;
    width: 10rem;
    height: 10rem;
    justify-content: center;
    align-items: center;
    background-image: linear-gradient(to bottom,
            var(--fancy-button-gradient-0) 0%,
            var(--fancy-button-gradient-50) 50%,
            var(--fancy-button-gradient-100) 100%);
    box-shadow:
        0px 4px 12px rgba(9, 12, 60, 0.15),
        0px 2px 8px rgba(9, 12, 60, 0.15),
        0px 1px 3px var(--fancy-button-inner-shadow-top-lg),
        inset 0px 1px 1px var(--fancy-button-inner-shadow-top),
        inset 0px -1px 3px var(--fancy-button-inner-shadow-bottom);
    background-color: aqua;
    border-radius: 10px;
}
</style>