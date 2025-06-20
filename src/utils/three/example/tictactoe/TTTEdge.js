import * as YUKA from 'yuka';

export class TTTEdge extends YUKA.Edge{
    constructor(from,to,cell,player){
        super(from,to);
        this.cell = cell;

        this.player = player;
    }
}