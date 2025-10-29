import * as THREE from 'three';
import {
  _button_click_,
  _core_explode_,
  _core_shield_destroyed_,
  _core_shield_hit_,
  _enemy_explode_,
  _enemy_hit_,
  _enemy_shot_,
  _player_explode_,
  _player_hit_,
  _player_shot_,
} from '../etc/constant';

export default class AssetManager {
  constructor() {
    // 加载管理器
    this.loadingManager = new THREE.LoadingManager();
    this.audioLoader = new THREE.AudioLoader(this.loadingManager);
    this.listener = new THREE.AudioListener();
    this.audioMaps = new Map();
  }
  /**
   * 返回一个Promise 对象
   */
  init() {
    // 加载资源
    this._loadAudios();
    const loadingManager = this.loadingManager;
    return new Promise((resolve, reject) => {
      loadingManager.onLoad = () => {
        resolve({ msg: '资源加载完毕...' });
      };

      loadingManager.onError = error => {
        reject(error);
      };
    });
  }

  /**
   * 音频资源不能简单的复制
   * @param {*} id
   */
  cloneAudio(mapKey) {
    const source = this.audioMaps.get(mapKey);

    const audio = new source.constructor(source.listener);
    audio.buffer = source.buffer;
    audio.setRefDistance(source.getRefDistance());
    audio.setVolume(source.getVolume());

    return audio;
  }

  _loadAudios() {
    const audioLoader = this.audioLoader;
    const audioMaps = this.audioMaps;
    const listener = this.listener;

    const refDistance = 20;

    // 玩家开枪
    const playerShot = new THREE.PositionalAudio(listener);
    playerShot.setRefDistance(refDistance);

    // 玩家命中
    const playerHit = new THREE.PositionalAudio(listener);
    playerHit.setRefDistance(refDistance);

    //玩家爆炸
    const playerExplode = new THREE.PositionalAudio(listener);
    playerExplode.setRefDistance(refDistance);

    // 敌人开枪
    const enemyShot = new THREE.PositionalAudio(listener);
    enemyShot.setRefDistance(refDistance);

    // 敌人击中
    const enemyHit = new THREE.PositionalAudio(listener);
    enemyHit.setRefDistance(refDistance);

    // 敌人爆炸
    const enemyExplode = new THREE.PositionalAudio(listener);
    enemyExplode.setRefDistance(refDistance);

    // 核心，
    const coreExplode = new THREE.PositionalAudio(listener);
    coreExplode.setRefDistance(refDistance);

    // 盾牌击中
    const coreShieldHit = new THREE.PositionalAudio(listener);
    coreShieldHit.setRefDistance(refDistance);

    // 盾牌销毁
    const coreShieldDestroyed = new THREE.PositionalAudio(listener);
    coreShieldDestroyed.setRefDistance(refDistance);

    const buttonClick = new THREE.Audio(listener);
    buttonClick.setVolume(1);

    audioLoader.load('./yuka-nier/audio/playerShot.ogg', buffer => playerShot.setBuffer(buffer));
    audioLoader.load('./yuka-nier/audio/playerHit.ogg', buffer => playerHit.setBuffer(buffer));
    audioLoader.load('./yuka-nier/audio/playerExplode.ogg', buffer =>
      playerExplode.setBuffer(buffer)
    );
    audioLoader.load('./yuka-nier/audio/enemyShot.ogg', buffer => enemyShot.setBuffer(buffer));
    audioLoader.load('./yuka-nier/audio/enemyHit.ogg', buffer => enemyHit.setBuffer(buffer));
    audioLoader.load('./yuka-nier/audio/enemyExplode.ogg', buffer =>
      enemyExplode.setBuffer(buffer)
    );
    audioLoader.load('./yuka-nier/audio/coreExplode.ogg', buffer => coreExplode.setBuffer(buffer));
    audioLoader.load('./yuka-nier/audio/coreShieldHit.ogg', buffer =>
      coreShieldHit.setBuffer(buffer)
    );
    audioLoader.load('./yuka-nier/audio/coreShieldDestroyed.ogg', buffer =>
      coreShieldDestroyed.setBuffer(buffer)
    );
    audioLoader.load('./yuka-nier/audio/buttonClick.ogg', buffer => buttonClick.setBuffer(buffer));

    audioMaps.set(_player_shot_, playerShot);
    audioMaps.set(_player_hit_, playerHit);
    audioMaps.set(_player_explode_, playerExplode);
    audioMaps.set(_enemy_shot_, enemyShot);
    audioMaps.set(_enemy_hit_, enemyHit);
    audioMaps.set(_enemy_explode_, enemyExplode);
    audioMaps.set(_core_explode_, coreExplode);
    audioMaps.set(_core_shield_hit_, coreShieldHit);
    audioMaps.set(_core_shield_destroyed_, coreShieldDestroyed);
    audioMaps.set(_button_click_, buttonClick);
  }
}
