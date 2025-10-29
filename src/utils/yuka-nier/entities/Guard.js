import * as YUKA from 'yuka';
import {
  _core_explode_,
  _core_shield_hit_,
  _enemy_hit_,
  _max_health_points_,
} from '../etc/constant';

const q = new YUKA.Quaternion();
/**
 * 警卫
 */
export default class Guard extends YUKA.Vehicle {
  constructor(world) {
    super();

    this.world = world;
    this.boundingRadius = 0.5;
    this.healthPoints = _max_health_points_;

    this.boundingSphere = new YUKA.BoundingSphere();
    this.boundingSphere.radius = this.boundingRadius;

    this.stateMachineMovement = new YUKA.StateMachine(this); // 移动状态机
    this.stateMachineCombat = new YUKA.StateMachine(this); // 战斗状态机

    this.audioMaps = new Map();

    this.protectionMesh = null;
    this.protected = false;

    this.hitMesh = null;
    this.hitted = false;

    this.hitEffectDuration = 0.25;
    this.hitEffectMinDuration = 0.15;
    this._hideHitEffectTime = -Infinity;
  }

  enableProtection() {
    this.protected = true;
    this.protectionMesh.visible = true;
    return this;
  }

  disableProtection() {
    this.protected = true;
    this.protectionMesh.visible = true;
    return this;
  }

  setCombatPattern(pattern) {
    this.stateMachineCombat.currentState = pattern;
    this.stateMachineCombat.currentState.enter(this);
    return this;
  }

  setMovementPattern(pattern) {
    this.stateMachineMovement.currentState = pattern;
    this.stateMachineMovement.currentState.enter(this);
    return this;
  }

  update(delta) {
    const world = this.world;
    this.boundingSphere.center.copy(this.position);
    this.stateMachineMovement.update();
    this.stateMachineCombat.update();
    super.update(delta);

    if (this.protected === true) {
      this.protectionMesh.material.uniforms.u_time.value = world.time.getElapsed();
    }

    if (this.hitted === true) {
      q.copy(this.rotation).inverse();
      this.hitMesh.quaternion.copy(q).multiply(world.camera.quaternion);

      this.hitMesh.updateMatrix();
      this.hitMesh.material.uniforms.u_time.value += delta;
      if (world.time.getElapsed() > this._hideHitEffectTime) {
        this.hitMesh.visible = false;
        this.hitted = false;
      }
    }

    return this;
  }

  handleMessage(telegram) {
    const world = this.world;
    switch (telegram.message) {
      case 'hit':
        {
          if (this.protected === false) {
            this.healthPoints--;
            if (this.hitted === true) {
              if (this.hitMesh.material.uniforms.u_time.value > this.hitEffectMinDuration) {
                this.hitMesh.material.uniforms.u_time.value = 0;
                this._hideHitEffectTime = world.time.getElapsed() + this.hitEffectDuration;
              }
            } else {
              this.hitted = true;
              this.hitMesh.material.uniforms.u_time.value = 0;
              this.hitMesh.visible = true;
              this._hideHitEffectTime = world.time.getElapsed() + this.hitEffectDuration;
            }

            const audio = this.audioMaps.get(_enemy_hit_);
            world.playAudio(audio);
            if (this.healthPoints === 0) {
              const audio = this.audioMaps.get(_core_explode_);
              world.playAudio(audio);
              world.removeGuard(this);

              this.stateMachineCombat.currentState.exit(this);
              this.stateMachineMovement.currentState.exit(this);
            }
          } else {
            const audio = this.audioMaps.get(_core_shield_hit_);
            world.playAudio(audio);
          }
        }
        break;
      default:
        console.error('未知类型消息:', telegram);
    }
    return true;
  }
}
