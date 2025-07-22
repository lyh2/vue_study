import * as YUKA from 'yuka';
import BaseWeaponGameEntity from './BaseWeaponGameEntity';
import { WEAPON_STATUS_EMPTY, WEAPON_STATUS_OUT_OF_AMMO, WEAPON_STATUS_READY, WEAPON_STATUS_RELOAD, WEAPON_STATUS_SHOT, WEAPON_TYPES_BLASTER } from '../core/constants';
import GameConfig from '../core/GameConfig';
import * as THREE from 'three';


const spread = new YUKA.Vector3();

export default class Blaster extends BaseWeaponGameEntity{
    constructor(owner){
        super(owner);

        this.type = WEAPON_TYPES_BLASTER;

        // common weapon properties 通用属性
        this.currentAmmo = GameConfig.BLASTER.ROUNDS_LEFT;
        this.perClipAmmo = GameConfig.BLASTER.ROUNDS_PER_CLIP;
        this.maxAmmo = GameConfig.BLASTER.MAX_AMMO;


        this.shotTime = GameConfig.BLASTER.SHOT_TIME;// 开枪执行的时间
        this.reloadTime = GameConfig.BLASTER.RELOAD_TIME;// 换弹夹的执行的时间
        this.equipTime = GameConfig.BLASTER.EQUIP_TIME;// 换武器的时间
        this.hideTime = GameConfig.BLASTER.HIDE_TIME;// 隐藏的时间
        this.muzzleFireTime = GameConfig.BLASTER.MUZZLE_TIME;// 火焰🔥执行的时间

        this.audioMaps = null;
        this.animationMaps = null;
        this.mixer = null;
    }
    /**
     * 更新内部状态数据
     * @param {*} delta 
     */
    update(delta){
        super.update(delta);

        // 检测换弹夹
        if(this.currentTime >= this.endTimeReload){
            const toReload = this.perClipAmmo - this.currentAmmo;// 预定义子弹数 -减当前弹夹剩余子弹数= 还可以添加的子弹数

            if(this.maxAmmo >= toReload){
                // 有充足的子弹数量
                this.currentAmmo = this.perClipAmmo;
                this.maxAmmo -= toReload;
            }else{
                // 只有几个子弹，还不能万千填充满弹夹
                this.currentAmmo += this.maxAmmo;
                this.maxAmmo  = 0;
            }
            // 更新界面UI
            if(this.owner.isPlayer){
                this.owner.world.uiManager.updateAmmoStatus();
            }
    
            this.status = WEAPON_STATUS_READY;
            this.endTimeReload = Infinity;
        }

        // 检查开枪火焰🔥的显示
        if(this.currentTime >= this.endTimeMuzzleFire){
            this.muzzle.visible = false;
            this.endTimeMuzzleFire = Infinity;
        }

        // 检查开枪
        if(this.currentTime >= this.endTimeShot){
            if(this.currentAmmo === 0){
                // 没有子弹，不能进行开枪
                if(this.maxAmmo === 0){
                    // 也没有剩余的子弹
                    this.status = WEAPON_STATUS_OUT_OF_AMMO;
                }else{
                    // 当前弹夹是空的
                    this.status = WEAPON_STATUS_EMPTY;
                }
            }else{
                this.status = WEAPON_STATUS_READY;
            }
            this.endTimeShot = Infinity;
        }
        return this;
    }

    /**
     * 继承父类的换弹夹方法
     */
    reload(){
        this.status = WEAPON_STATUS_RELOAD;

        // audio
        const audio = this.audioMaps.get('reload');
        if(audio.isPlaying === true) audio.stop();
        audio.play();

        // 执行动画
        if(this.mixer){
            const animation = this.animationMaps.get('reload');
            animation.stop();
            animation.play();
        }

        this.endTimeReload = this.currentTime + this.reloadTime;

        return this;
    }
    /**
     * 开枪
     * @param {*} targetPosition 
     * @returns 
     */

    shoot(targetPosition){
        // 设置当前状态为开枪的状态
        this.status = WEAPON_STATUS_SHOT;

        // audio
        const audio = this.audioMaps.get('shot');
        if(audio.isPlaying === true) audio.stop();
        audio.play();

        // animation
        if(this.mixer){
            const animation = this.animationMaps.get('shot');
            animation.stop();
            animation.play();
        }
        // muzzle fire 开枪的🔥特效
        this.muzzle.visible = true;
        this.muzzle.material.rotation = Math.random() * Math.PI;
        this.endTimeMuzzleFire = this.currentTime + this.muzzleFireTime;

        // 创建子弹
        const ray = new YUKA.Ray();
        this.getWorldPosition(ray.origin);// 得到当前枪的世界坐标系位置
        ray.direction.subVectors(targetPosition,ray.origin).normalize();
        // add spread
        spread.x = (1 - Math.random() * 2) * 0.01; // (-1,1) * 0.01; 将值控制在正负0.01 间
        spread.y = (1 - Math.random() * 2) * 0.01;
        spread.z = (1 - Math.random() * 2) * 0.01;

        ray.direction.add(spread).normalize();// 让方向进行稍微的改变么？

        // 添加子弹到世界中
        this.owner.world.addBullet(this.owner /*  */,ray);

        // adjust ammo 修改子弹
        this.currentAmmo --;// 子弹数减1
        this.endTimeShot = this.currentTime + this.shotTime;
        
        return this;
    }
    /**
	* Returns a value representing the desirability of using the weapon.
	* 
	* @param {Number} distance - The distance to the target.
	* @return {Number} A score between 0 and 1 representing the desirability.
	*/
    getDesirability(distance){
        this.fuzzyModule.fuzzify('distanceToTarget',distance); // 距离值
        this.fuzzyModule.fuzzify('ammoStatus',this.currentAmmo); // 子弹数量

        return this.fuzzyModule.defuzzify('desirability') / 100;
    }
    /**
	* Inits animations for this weapon. Only used for the player.
	* 初始化武器的动画，只有用户使用
	* @return {Blaster} A reference to this weapon.
	*/
    initAnimationMaps(){
        const assetManager = this.owner.world.assetManager;

        const mixer = new THREE.AnimationMixer(this);
        const tempAnimationMaps = new Map();

        // 开枪动画
        const shotClip = assetManager.animationMaps.get('blaster_shot');
        const reloadClip = assetManager.animationMaps.get('blaster_reload');
        const hideClip = assetManager.animationMaps.get('blaster_hide');
        const equipClip = assetManager.animationMaps.get('blaster_equip');

        const shotAction = mixer.clipAction(shotClip);
        shotAction.loop = THREE.LoopOnce;

        const reloadAction = mixer.clipAction(reloadClip);
        reloadAction.loop = THREE.LoopOnce;

        const hideAction = mixer.clipAction(hideClip);
        hideAction.loop = THREE.LoopOnce;
        hideAction.clampWhenFinished = true;//
        /**
         * If clampWhenFinished is set to true the animation will automatically be paused on its last frame.
         * 设置为true 时，动画执行结束在最后一帧，直接暂停
        If clampWhenFinished is set to false, enabled will automatically be switched to false when the last loop of the action has finished,
        so that this action has no further impact.
        Default is false.
        Note: clampWhenFinished has no impact if the action is interrupted (it has only an effect if its last loop has really finished).
         */

        const equipAction = mixer.clipAction(equipClip);
        equipAction.loop = THREE.LoopOnce;

        tempAnimationMaps.set('shot',shotAction);
        tempAnimationMaps.set('reload',reloadAction);
        tempAnimationMaps.set('hide',hideAction);
        tempAnimationMaps.set('equip',equipAction);

        this.animationMaps = tempAnimationMaps;
        this.mixer = mixer;
        return this;
    }

}