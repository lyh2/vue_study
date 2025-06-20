import * as YUKA from 'yuka';

/**
 * ground 继承 YUKA.GameEntity
 */
export default class GroundGameEntity extends YUKA.GameEntity{
    constructor(geometry){
        super();
        this.geometry = geometry;
    }

    handleMessage(telegram){
        console.log('电报消息:',telegram);
        return true;
    }
}