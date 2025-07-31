import * as YUKA from 'yuka';
import { WEAPON_STATUS_EQUIP, WEAPON_STATUS_HIDE, WEAPON_STATUS_READY, WEAPON_STATUS_UNREADY, WEAPON_TYPES_ASSAULT_RIFLE, WEAPON_TYPES_BLASTER, WEAPON_TYPES_SHOTGUN } from '../core/constants';
import GameConfig from '../core/GameConfig';
import { round } from 'face-api.js/build/commonjs/utils';

export default class BaseWeaponGameEntity extends YUKA.GameEntity{
    constructor(owner){
        super();

        this.owner = owner;

        this.canActivateTrigger = false;

        this.type = null;// 定义枪的类型
        this.status= WEAPON_STATUS_UNREADY;

        this.previousState = WEAPON_STATUS_READY; // 上一个状态

        this.currentAmmo = 0;// roundsLeft =0；表示当前弹夹的子弹数量
        this.perClipAmmo = 0;// 每个弹夹的子弹数量
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
        this.audioMaps = null; // 武器对应的音效
        this.mixer = null; // 动画播放混合器
        this.animationMaps = null;
    }

    /**
     * 添加指定数量的子弹-无作用
     * @param {*} rounds - 剩余子弹数
     */
    addRounds(rounds ){
        switch(this.type){
            case WEAPON_TYPES_SHOTGUN:
                this.maxAmmo = GameConfig.SHOTGUN.MAX_AMMO + rounds;// 子弹总数(捡到同类型武器，背包中不新增武器而是获取新武器的子弹总数量) + 自己当前同类型武器剩余子弹数
            break;
            case WEAPON_TYPES_ASSAULT_RIFLE:
                this.maxAmmo = GameConfig.ASSAULT_RIFLE.MAX_AMMO + rounds;
                break;
            case WEAPON_TYPES_BLASTER:
                this.maxAmmo = GameConfig.BLASTER.MAX_AMMO + rounds;
                break;
            default:
                break;
        }
        return this;
    }
    /**
     * 
     * @returns 获取剩余子弹数 
     */
    getRemainingRounds(){
        return  this.maxAmmo;//表示剩余子弹数 
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
        this.status = WEAPON_STATUS_EQUIP; // 设置武器为：装备 状态
        this.endTimeEquip = this.currentTime + this.equipTime; // 更换装备的时间

        if(this.mixer){
            let animation = this.animationMaps.get('hide'); // 先执行隐藏动画
            animation.stop();
            // 再执行装备动画
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
        this.previousState = this.status; // 保存当前武器的状态
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
        // 更换装备时间结束
        if(this.currentTime >= this.endTimeEquip){
            /**
             * - `WEAPON_STATUS_EQUIP` (装备中)
                - `WEAPON_STATUS_HIDE` (隐藏中)
                - `WEAPON_STATUS_READY` (就绪)
                - `WEAPON_STATUS_UNREADY` (未就绪)

             */
            this.status= this.previousState; // 这里可以直接设置为READY 状态，而不用管装备之前是什么状态
            this.endTimeEquip = Infinity;
        }
        // 隐藏武器时间结束 ，状态设置为未准备好状态
        if(this.currentTime >= this.endTimeHide){
            this.status = WEAPON_STATUS_UNREADY; // 隐藏结束之后设置为未准备好的状态
            this.endTimeHide = Infinity;
        }

        if(this.mixer){
            this.mixer.update(delta);
        }

        return this;
    }


}