import * as YUKA from 'yuka';

/**
 * 自定义实现的 游戏实体对象类
 */
export default class BaseGameEntity extends YUKA.GameEntity{
    /**
     * 
     * @param {*} itemType 
     * @param {*} respawnTime // 重新产生的时间
     */
    constructor(itemType,respawnTime){
        super();

        this.canActivateTrigger = false;// 不会自动触发

        this.currentTime = 0;// 自定义属性
        this.nextSpawnTime = Infinity;// 下一次产生的时间
        this.respawnTime = respawnTime;

        this.type = itemType; // 自定义属性，类型
        this.currentRegion = null; // 自定义的属性

        this.audio =  null;
    }

    /**
     * prepare:准备
     */
    prepareRespawn(){
        this.active = false;
        this._renderComponent.visible = false;

        if(this.audio.isPlaying === true) this.audio.stop();
        this.audio.play();

        // 计算下一次生成的时间
        this.nextSpawnTime = this.currentTime + this.respawnTime;

        return this;
    }

    /**
     * Finishes the respawn of this item. 完成生成点位的方法
     */
    finishRespawn(){
        this.active = true;
        this._renderComponent.visible = true;
        this.nextSpawnTime = Infinity;

        return this;
    }

    /**
     * 抽象方法，在子类中实现
     */
    addItemToEntity(/* entity*/){

    }
}
