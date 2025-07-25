import BaseGameEntity from "./BaseGameEntity";

/**
 * 武器实体类
 */
export default class WeaponItemExtendBaseGameEntity extends BaseGameEntity{
    
    /**
     * 
     * @param {*} type 
     * @param {*} respawnTime 
     * @param {*} ammo 子弹个数
     */
    constructor(type,respawnTime,ammo){
        super(type,respawnTime);

        this.ammo = ammo;// 设置子弹数量
        this.name = 'WeaponItemExtendBaseGameEntity';
    }
    /**
     * 表示把当前的子弹数量添加到武器实体对象中去
     * @param {*} entity 
     * @returns 
     */
    addItemToEntity(entity){
        //console.log(8,entity)
        entity.addWeapon(this.type);
        return this;
    }
}