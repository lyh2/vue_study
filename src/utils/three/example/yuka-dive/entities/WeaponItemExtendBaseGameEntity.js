import BaseGameEntity from "./BaseGameEntity";

/**
 * 武器实体类
 */
export default class WeaponItemExtendBaseGameEntity extends BaseGameEntity{
    
    /**
     * 
     * @param {*} type 
     * @param {*} respawnTime 
     * @param {*} ammo 
     */
    constructor(type,respawnTime,ammo){
        super(type,respawnTime);

        this.ammo = ammo;
    }

    addItemToEntity(entity){
        entity.addWeapon(this.type);
        return this;
    }
}