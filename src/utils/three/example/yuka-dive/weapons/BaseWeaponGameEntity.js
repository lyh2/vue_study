import * as YUKA from 'yuka';
import { WEAPON_STATUS_EQUIP, WEAPON_STATUS_HIDE, WEAPON_STATUS_READY, WEAPON_STATUS_UNREADY } from '../core/constants';

export default class BaseWeaponGameEntity extends YUKA.GameEntity{
    constructor(owner){
        super();

        this.owner = owner;

        this.canActivateTrigger = false;

        this.type = null;// 定义枪的类型
        this.status= WEAPON_STATUS_UNREADY;

        this.previousState = WEAPON_STATUS_READY;

        this.currentAmmo = 0;// roundsLeft =0；表示当前弹夹的子弹数量
        this.perClipAmmo = 0;// 每个弹夹的子弹数量
        this.addRoundAmmo = 0; // 这个字段没有作用
        this.maxAmmo = 0;

        this.currentTime = 0;

        this.shotTime = Infinity;// 开枪的时间
        this.reloadTime = Infinity;//换枪的时间
        this.equipTime = Infinity;// 装备时间
        this.hideTime = Infinity;


        this.endTimeShot = Infinity;
        this.endTimeReload  = Infinity;
        this.endTimeEquip = Infinity;
        this.endTimeHide = Infinity;
        this.endTimeMuzzleFire = Infinity;

        this.fuzzyModule = null;

        this.muzzle = null; // 子类继承，在创建对象时进行赋值
        this.audioMaps = null;
        this.mixer = null;
        this.animationMaps = null;
    }

    /**
     * 添加指定数量的子弹-无作用
     * @param {*} rounds 
     */
    addRounds(rounds){
        this.addRoundAmmo = YUKA.MathUtils.clamp(this.addRoundAmmo + rounds,0,this.maxAmmo);
        return this;
    }
    /**
     * 
     * @returns 获取剩余子弹数 - 无作用
     */
    getRemainingRounds(){
        return this.addRoundAmmo;
    }
    /**
     * 返回武器的可信度的值
     */
    getDesirability(){
        return 0;
    }
    /**
     * 装备这个武器
     * @returns 
     */
    equip(){
        this.status = WEAPON_STATUS_EQUIP;
        this.endTimeEquip = this.currentTime + this.equipTime;

        if(this.mixer){
            let animation = this.animationMaps.get('hide');
            animation.stop();

            animation = this.animationMaps.get('equip');
            animation.stop();
            animation.play();
        }
        // 更新UI界面子弹数据
        if(this.owner.isPlayer){
            this.owner.world.uiManager.updateAmmoStatus();
        }

        return this;
    }

    hide(){
        this.previousState = this.status;
        this.status = WEAPON_STATUS_HIDE;
        this.endTimeHide = this.currentTime + this.hideTime;

        if(this.mixer){
            const animation = this.animationMaps.get('hide');
            animation.stop();
            animation.play();
        }

        return this;
    }

    reload(){

    }
    /**
     * 开枪
     * @param {*} targetPosition 
     */
    shoot(targetPosition){

    }

    update(delta){
        this.currentTime += delta;

        if(this.currentTime >= this.endTimeEquip){
            this.status= this.previousState;
            this.endTimeEquip = Infinity;
        }

        if(this.currentTime >= this.endTimeHide){
            this.status = WEAPON_STATUS_UNREADY;
            this.endTimeHide = Infinity;
        }

        if(this.mixer){
            this.mixer.update(delta);
        }

        return this;
    }


}