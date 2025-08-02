import * as YUKA from 'yuka';

import * as THREE from 'three';
import BaseWeaponGameEntity from './BaseWeaponGameEntity';
import {
  WEAPON_STATUS_EMPTY,
  WEAPON_STATUS_OUT_OF_AMMO,
  WEAPON_STATUS_READY,
  WEAPON_STATUS_RELOAD,
  WEAPON_STATUS_SHOT,
  WEAPON_TYPES_ASSAULT_RIFLE,
} from '../core/constants';
import GameConfig from '../core/GameConfig';

const spread = new YUKA.Vector3();

export default class AssaultRifle extends BaseWeaponGameEntity {
  constructor(owner /* 代表的是enemy */) {
    super(owner);

    this.type = WEAPON_TYPES_ASSAULT_RIFLE;

    // 通用属性
    this.currentAmmo = GameConfig.ASSAULT_RIFLE.ROUNDS_LEFT;
    this.perClipAmmo = GameConfig.ASSAULT_RIFLE.ROUNDS_PER_CLIP;
    this.maxAmmo = GameConfig.ASSAULT_RIFLE.MAX_AMMO;

    this.shotTime = GameConfig.ASSAULT_RIFLE.SHOT_TIME; // 开枪执行时间
    this.reloadTime = GameConfig.ASSAULT_RIFLE.RELOAD_TIME; // 换弹夹执行时间
    this.equipTime = GameConfig.ASSAULT_RIFLE.EQUIP_TIME; // 装备时间
    this.hideTime = GameConfig.ASSAULT_RIFLE.EQUIP_TIME; // 隐藏时间
    this.muzzleFireTime = GameConfig.ASSAULT_RIFLE.MUZZLE_TIME; // 开枪🔥火焰执行时间

    this.audioMaps = null;
    this.animationMaps = new Map();
  }

  update(delta) {
    super.update(delta);

    // 换弹夹
    if (this.currentTime >= this.endTimeReload) {
      const toReload = this.perClipAmmo - this.currentAmmo;
      if (this.maxAmmo >= toReload) {
        this.currentAmmo = this.perClipAmmo;
        this.maxAmmo -= toReload;
      } else {
        this.currentAmmo += this.maxAmmo;
        this.maxAmmo = 0;
      }

      // 更新UI界面上的数据
      if (this.owner.isPlayer) {
        this.owner.world.uiManager.updateAmmoStatus();
      }

      this.status = WEAPON_STATUS_READY;
      this.endTimeReload = Infinity;
    }

    // 检测火焰🔥
    if (this.currentTime >= this.endTimeMuzzleFire) {
      this.muzzle.visible = false;
      this.endTimeMuzzleFire = Infinity;
    }

    // 开枪check shoot
    if (this.currentTime >= this.endTimeShot) {
      if (this.currentAmmo === 0) {
        // 当前弹夹中没有子弹，判断是否还有剩余的子弹
        if (this.maxAmmo === 0) {
          // 没有剩余子弹
          this.status = WEAPON_STATUS_OUT_OF_AMMO;
        } else {
          this.status = WEAPON_STATUS_EMPTY;
        }
      } else {
        this.status = WEAPON_STATUS_READY;
      }

      this.endTimeShot = Infinity;
    }
    return this;
  }

  reload() {
    this.status = WEAPON_STATUS_RELOAD;
    //console.log('来福枪:',this)
    const audio = this.audioMaps.get('reload');
    if (audio.isPlaying === true) audio.stop();
    audio.play();

    if (this.mixer) {
      const animation = this.animationMaps.get('reload');
      animation.stop();
      animation.play();
    }

    this.endTimeReload = this.currentTime + this.reloadTime;
    return this;
  }

  shoot(targetPosition) {
    this.status = WEAPON_STATUS_SHOT;

    const audio = this.audioMaps.get('shot');
    if (audio.isPlaying === true) audio.stop();
    audio.play();

    if (this.mixer) {
      const animation = this.animationMaps.get('shot');
      animation.stop();
      animation.play();
    }

    this.muzzle.visible = true;
    this.muzzle.material.rotation = Math.random() * Math.PI;
    this.endTimeMuzzleFire = this.currentTime + this.muzzleFireTime;

    // 创建子弹
    const tempRay = new YUKA.Ray();
    this.getWorldPosition(tempRay.origin);
    tempRay.direction.subVectors(targetPosition, tempRay.origin).normalize();
    // add spread
    spread.x = (1 - Math.random() * 2) * 0.01;
    spread.y = (1 - Math.random() * 2) * 0.01;
    spread.z = (1 - Math.random() * 2) * 0.01;

    tempRay.direction.add(spread).normalize();

    // 添加子弹
    this.owner.world.addBullet(this.owner /* enemy 对象 */, tempRay);

    // 子弹减少
    this.currentAmmo--;
    this.endTimeShot = this.currentTime + this.shotTime;
    return this;
  }

  getDesirability(distance) {
    this.fuzzyModule.fuzzify('distanceToTarget', distance);
    this.fuzzyModule.fuzzify('ammoStatus', this.currentAmmo);
    return this.fuzzyModule.defuzzify('desirability') / 100;
  }

  initAnimationMaps() {
    const assetManager = this.owner.world.assetManager;

    this.mixer = new THREE.AnimationMixer(this);

    const shotClip = assetManager.animationMaps.get('assaultRifle_shot');
    const reloadClip = assetManager.animationMaps.get('assaultRifle_reload');
    const hideClip = assetManager.animationMaps.get('assaultRifle_hide');
    const equipClip = assetManager.animationMaps.get('assaultRifle_equip');

    const shotAction = this.mixer.clipAction(shotClip);
    shotAction.loop = THREE.LoopOnce;

    const reloadAction = this.mixer.clipAction(reloadClip);
    reloadAction.loop = THREE.LoopOnce;

    const hideAction = this.mixer.clipAction(hideClip);
    hideAction.loop = THREE.LoopOnce;
    hideAction.clampWhenFinished = true;

    const equipAction = this.mixer.clipAction(equipClip);
    equipAction.loop = THREE.LoopOnce;

    this.animationMaps.set('shot', shotAction);
    this.animationMaps.set('reload', reloadAction);
    this.animationMaps.set('hide', hideAction);
    this.animationMaps.set('equip', equipAction);

    return this;
  }
}
