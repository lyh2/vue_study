import GameConfig from "../core/GameConfig";
import BaseGameEntity from "./BaseGameEntity";

import { HEALTH_PACK } from "../core/constants";


/**
 * 血条包 实体类
 */
export default class HealthPackExtendBaseGameEntity extends BaseGameEntity{
    constructor(){
        super(HEALTH_PACK,GameConfig.HEALTH_PACK.RESPAWN_TIME);// 类型，时间

        this.health = GameConfig.HEALTH_PACK.HEALTH;// 当前血条
    }

    addItemToEntity(entity){
        entity.addHealth(this.health);
        return this;
    }
}

