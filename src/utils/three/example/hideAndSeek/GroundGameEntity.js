import * as YUKA from 'yuka';

export default class GroundGameEntity extends YUKA.GameEntity{
    constructor(geometry=null){
        super();

        this.name = 'groundGameEntity';
        this.geometry = geometry;

    }


    handleMessage(telegram){
        console.log('GroundGameEntity:',telegram)
        return true;
    }
}