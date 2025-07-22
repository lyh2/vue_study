import * as YUKA from 'yuka';

export default class BaseTriggerExtendTrigger extends YUKA.Trigger{
    /**
     * 根据给定的值创建一个触发器
     * @param {*} region 
     * @param {*} entity 
     */
    constructor(region,entity){
        super(region);

        this.entity = entity;
    }
    /**
     * This method is called when the trigger should execute its action. Must be implemented by all concrete triggers.
     * 
     * @param {*} entity 
     */
    execute(entity){
        this.active = false;

        this.entity.addItemToEntity(entity);

        // 调用
        this.entity.prepareRespawn();

        return this;
    }
}