import * as YUKA from 'yuka';

export default class BaseTriggerExtendTrigger extends YUKA.Trigger{
    /**
     * 根据给定的值创建一个触发器
     * @param {*} region - 触发区域,有YUKA.RectangularTriggerRegion or YUKA.SphericalTriggerRegion
     * @param {*} entity - 是血条包，武器类等实体对象，就是指放在触发区域内的游戏实体对象
     */
    constructor(region /*触发区域 TriggerRegion */,entity){
        super(region);

        this.entity = entity;
    }
    /**
     * This method is called when the trigger should execute its action. 
     * Must be implemented by all concrete triggers.
     * 自动执行
     * @param {*} entity - 那个游戏实体对象，触发了这个触发区域
     */
    execute(entity){
        // deactivate trigger since it's only executed once，
        this.active = false;// 设置为false，就是要停用此触发器，每次只会被触发一次
        // 调用(血条包，三种武器等资源实体)的addItemToEntity(entity:谁触发这个资源)，把这这个资源对象给触发的对象实体
        this.entity.addItemToEntity(entity);
        // 调用(血条包，三种武器等资源实体)的prepareRespawn() 设置下次出现这些资源的具体时间
        this.entity.prepareRespawn();

        return this;
    }
}