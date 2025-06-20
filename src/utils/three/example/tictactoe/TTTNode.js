import * as YUKA from 'yuka';
export class TTTNode extends YUKA.Node{
    /**
     * 
     * @param {index} options.index 
     * @param {total} options.total 
     */
    constructor(options={}){
        super(options.index);
        if(options?.board){
            this.board = options.board;
        }else{

            this.board = new Array(options.total).fill(9);
        }
	// the board is represented as a flat array
		// 1 = cell marked by player 1
		// 2 = cell marked by player 2
		// 9 = cell is empty
        this.value = parseInt(this.board.join(','),10);// 将棋盘数组转成一个数字，用于快速比较
        this.win = false;
        this.finished = false;
        this.winPlayer = -1;
        this.weight = 0;

        this.evaluate();
        
    }

    evaluate(){
        const size = Math.sqrt(this.board.length);
        const lines = [];
    
        // 生成行和列路径
        for (let i = 0; i < size; i++) {
            const row = [];
            const col = [];
            for (let j = 0; j < size; j++) {
                row.push(i * size + j);
                col.push(j * size + i);
            }
            lines.push(row, col);
        }
    
        // 生成对角线
        const diag1 = [];
        const diag2 = [];
        for (let i = 0; i < size; i++) {
            diag1.push(i * size + i);
            diag2.push(i * size + (size - 1 - i));
        }
        lines.push(diag1, diag2);
        
        // 检查获胜路径
        for (const line of lines) {
            const cells = line.map(idx => this.board[idx]);
            const firstVal = cells[0];
            if (firstVal !== 9 && cells.every(val => val === firstVal)) {
                this.finished = true;
                this.winPlayer = firstVal;
                this.win = true;
                break;
            }
        }
    
        // 检查平局
        if (!this.finished && this.board.every(cell => cell !== 9)) {
            this.finished = true;
        }
    }
}