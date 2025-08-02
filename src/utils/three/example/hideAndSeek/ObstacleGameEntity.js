import * as YUKA from 'yuka';

// 障碍物，
export default class ObstacleGameEntity extends YUKA.GameEntity{
    constructor(geometry=null){
        super();
        this.geometry = geometry;
        this.name = 'ObstacleGameEntity';
  
     
    }
    
   
    handleMessage(){
        // 处理消息

        return true;
    }
}