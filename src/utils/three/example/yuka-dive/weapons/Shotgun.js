import * as YUKA from 'yuka';

import * as THREE from 'three';
import BaseWeaponGameEntity from './BaseWeaponGameEntity';
import {
  WEAPON_STATUS_EMPTY,
  WEAPON_STATUS_OUT_OF_AMMO,
  WEAPON_STATUS_READY,
  WEAPON_STATUS_RELOAD,
  WEAPON_STATUS_SHOT,
  WEAPON_TYPES_SHOTGUN,
} from '../core/constants';
import GameConfig from '../core/GameConfig';

const spread = new YUKA.Vector3();

export default class Shotgun extends BaseWeaponGameEntity {
  /**
   *
   * @param {*} owner - 武器属于哪个对象
   */
  constructor(owner /* enemy */) {
    super(owner);

    this.type = WEAPON_TYPES_SHOTGUN;
    // 通用属性
    this.currentAmmo = GameConfig.SHOTGUN.ROUNDS_LEFT;
    this.perClipAmmo = GameConfig.SHOTGUN.ROUNDS_PER_CLIP;
    this.maxAmmo = GameConfig.SHOTGUN.MAX_AMMO;

    // 设置时间属性
    this.shotTime = GameConfig.SHOTGUN.SHOT_TIME;
    this.reloadTime = GameConfig.SHOTGUN.RELOAD_TIME;
    this.equipTime = GameConfig.SHOTGUN.EQUIP_TIME;
    this.hideTime = GameConfig.SHOTGUN.HIDE_TIME;
    this.muzzleFireTime = GameConfig.SHOTGUN.MUZZLE_TIME;

    // shotgun specific properties 特有的属性
    this.bulletsPerShot = GameConfig.SHOTGUN.BULLETS_PER_SHOT;
    this.spread = GameConfig.SHOTGUN.SPREAD;

    this.shotReloadTime = GameConfig.SHOTGUN.SHOT_RELOAD_TIME;
    this.endTimeShotReload = Infinity;

    this.mixer = null;
    this.animationMaps = new Map();
  }

  update(delta) {
    super.update(delta);
    // 每一次开枪之后的冷却时间
    if (this.currentTime >= this.endTimeShotReload) {
      const audio = this.audioMaps.get('shot_reload');
      if (audio.isPlaying === true) audio.stop();
      audio.play();

      this.endTimeShotReload = Infinity;
    }
    // 换弹夹
    if (this.currentTime >= this.endTimeReload) {
      const toReload = this.perClipAmmo - this.currentAmmo; // 当前弹夹还可以容纳的子弹数量
      if (this.maxAmmo >= toReload) {
        this.currentAmmo = this.perClipAmmo;
        this.maxAmmo -= toReload;
      } else {
        this.currentAmmo += this.maxAmmo;
        this.maxAmmo = 0;
      }

      // 更新UI界面数据
      if (this.owner.isPlayer) {
        this.owner.world.uiManager.updateAmmoStatus();
      }

      this.status = WEAPON_STATUS_READY;
      this.endTimeReload = Infinity;
    }

    // 检测开枪的火焰
    if (this.currentTime >= this.endTimeMuzzleFire) {
      this.muzzle.visible = false;
      this.endTimeMuzzleFire = Infinity;
    }

    // 检测开枪 check shoot
    if (this.currentTime >= this.endTimeShot) {
      if (this.currentAmmo === 0) {
        // 没有子弹不能开枪
        if (this.maxAmmo === 0) {
          // 总的子弹也没有了
          this.status = WEAPON_STATUS_OUT_OF_AMMO;
        } else {
          this.status = WEAPON_STATUS_EMPTY; // 当前弹夹为空，但还是总子弹还有
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

    const audio = this.audioMaps.get('reload');
    if (audio.isPlaying === true) audio.stop();
    audio.play();

    // animation
    if (this.mixer) {
      const animation = this.animationMaps.get('reload');
      animation.stop();
      animation.play();
    }
    this.endTimeReload = this.currentTime + this.reloadTime;
    return this;
  }
  /**
   * 开枪接口
   * @param {*} targetPosition
   * @returns
   */
  shoot(targetPosition) {
    this.status = WEAPON_STATUS_SHOT;
    // audio
    const audio = this.audioMaps.get('shot');
    if (audio.isPlaying === true) audio.stop();
    audio.play();

    // animation
    if (this.mixer) {
      const animation = this.animationMaps.get('shot');
      animation.stop();
      animation.play();
    }

    // 开枪的火焰🔥
    this.muzzle.visible = true;
    this.muzzle.material.rotation = Math.random() * Math.PI;

    this.endTimeMuzzleFire = this.currentTime + this.muzzleFireTime;

    // 创建子弹
    const ray = new YUKA.Ray();
    this.getWorldPosition(ray.origin);
    ray.direction.subVectors(targetPosition, ray.origin).normalize();

    for (let i = 0; i < this.bulletsPerShot; i++) {
      const tempRay = ray.clone();
      spread.x = (1 - Math.random() * 2) * this.spread;
      spread.y = (1 - Math.random() * 2) * this.spread;
      spread.z = (1 - Math.random() * 2) * this.spread; // 6 * (-1,1)
      tempRay.direction.add(spread).normalize();

      this.owner.world.addBullet(this.owner, tempRay);
    }

    // 减少子弹
    this.currentAmmo--;
    this.endTimeShotReload = this.currentTime + this.shotReloadTime;
    this.endTimeShot = this.currentTime + this.shotTime;

    return this;
  }
  /**
   * 获取使用这个武器的可信值
   * @param {*} distance
   */
  getDesirability(distance) {
    this.fuzzyModule.fuzzify('distanceToTarget', distance);
    this.fuzzyModule.fuzzify('ammoStatus', this.currentAmmo);

    return this.fuzzyModule.defuzzify('desirability') / 100;
  }
  /**
   * 初始化动画
   */
  initAnimationMaps() {
    const assetManager = this.owner.world.assetManager;
    this.mixer = new THREE.AnimationMixer(this);

    const shotClip = assetManager.animationMaps.get('shotgun_shot');
    const reloadClip = assetManager.animationMaps.get('shotgun_reload');
    const hideClip = assetManager.animationMaps.get('shotgun_hide');
    const equipClip = assetManager.animationMaps.get('shotgun_equip');

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
