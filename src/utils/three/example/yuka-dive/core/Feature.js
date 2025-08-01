/**
* Class for calculating influencing factors in context of inference logic.
 * 
 */

import * as YUKA from 'yuka';
import { WEAPON_TYPES_ASSAULT_RIFLE, WEAPON_TYPES_BLASTER, WEAPON_TYPES_SHOTGUN } from './constants';
import GameConfig from './GameConfig';

const result = {distance:Infinity,item:null};

export default class Feature{


    /**
     *  计算自己武器背包中的所有的武器，子弹数得到一个平均值
     * @param {*} enemy 
     */
    static totalWeaponStrength(enemy /* 我自己*/){
        const weaponSystem = enemy.weaponSystem;
        // 从自己的武器系统中得到剩余子弹的平均数
        const ammoBlaster = weaponSystem.getRemainingAmmoForWeapon(WEAPON_TYPES_BLASTER);
        const ammoShotgun = weaponSystem.getRemainingAmmoForWeapon(WEAPON_TYPES_SHOTGUN);
        const ammoAssaultRifle = weaponSystem.getRemainingAmmoForWeapon(WEAPON_TYPES_ASSAULT_RIFLE);

        const f1 = ammoBlaster / GameConfig.BLASTER.MAX_AMMO;
        const f2 = ammoShotgun / GameConfig.SHOTGUN.MAX_AMMO;
        const f3 = ammoAssaultRifle / GameConfig.ASSAULT_RIFLE.MAX_AMMO;

        return (f1 + f2 + f3) / 3;
    }

    /**
     * 计算单个武器的得分
     * @param {*} enemy 
     * @param {*} weaponType 
     */
    static individualWeaponStrength(enemy,weaponType){
        const weapon = enemy.weaponSystem.getWeapon(weaponType);

        return (weapon) ? (weapon.ammo / weapon.maxAmmo) : 0;
    }

    /**
     * 计算健康值
     * @param {*} enemy 
     */
    static health(enemy){
        return enemy.health / enemy.maxHealth;
    }

    /**
     * 根据机器人与给定项目的亲密关系计算0到1之间的分数。
    *项目越远，评分越高。如果没有给定类型的项目
    *在此方法称为返回的值时，存在于游戏世界中。
    *
     * @param {*} enemy 
     * @param {*} itemType 
     */
    static distanceToItem(enemy,itemType){
        let score = 1;
        enemy.world.getClosestItem(enemy,itemType,result);
        if(result.item){
            let distance = result.distance;
            // 小于最小距离也当作最小距离值进行计算
            distance = YUKA.MathUtils.clamp(distance,GameConfig.BOT.MIN_ITEM_RANGE,GameConfig.BOT.MAX_ITEM_RANGE);
            score = distance / GameConfig.BOT.MAX_ITEM_RANGE ;
        }

        return score;
    }
}