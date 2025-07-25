import GameConfig from "../core/GameConfig";
import BaseGameEntity from "./BaseGameEntity";

import { HEALTH_PACK } from "../core/constants";


/**
 * 血条包 实体类
 */
export default class HealthPackExtendBaseGameEntity extends BaseGameEntity{
    constructor(){
        // 调用父类的方法
        super(HEALTH_PACK,GameConfig.HEALTH_PACK.RESPAWN_TIME /* 第二个参数表示再次产生的时间间隔值*/);// 类型，时间

        this.health = GameConfig.HEALTH_PACK.HEALTH;// 血条量

        this.name = 'HealthPackExtendBaseGameEntity';
    }
    /**
     * 把当前血条数据 添加到 entity 实体对象中去
     * @param {*} entity 
     * @returns 
     */
    addItemToEntity(entity){
        entity.addHealth(this.health);
        return this;
    }
}

