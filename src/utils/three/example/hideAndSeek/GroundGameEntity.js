import * as YUKA from 'yuka';
import World from './World';
export default class GroundGameEntity extends YUKA.GameEntity{
    constructor(geometry=null){
        super();

        this.name = 'groundGameEntity';
        this.geometry = geometry;

    }


    handleMessage(telegram){
        return true;
    }
}