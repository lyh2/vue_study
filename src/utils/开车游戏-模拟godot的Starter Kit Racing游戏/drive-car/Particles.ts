import * as THREE from 'three';

const POOL_SIZE = 64;
const _worldPos = new THREE.Vector3();

interface ParticleType {
  sprite: THREE.Sprite;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
  initialScale: number;
}

export class SmokeTrails {
  public particles: Array<ParticleType>;
  public material: THREE.SpriteMaterial;
  public emitIndex: number;

  constructor(scene: THREE.Scene) {
    this.particles = [];

    const map = new THREE.TextureLoader().load(
      './开车游戏-模拟godot的Starter Kit Racing游戏/sprites/smoke.png'
    );
    this.material = new THREE.SpriteMaterial({
      map: map,
      transparent: true,
      opacity: 0,
      color: 0x5e5f6b,
    });

    // Create the particle pool
    for (let i = 0; i < POOL_SIZE; i++) {
      const sprite = new THREE.Sprite(this.material);
      sprite.visible = false;
      sprite.scale.setScalar(0.25);
      scene.add(sprite);

      this.particles.push({
        sprite: sprite,
        life: 0,
        maxLife: 0,
        velocity: new THREE.Vector3(),
        initialScale: 0,
      });
    }

    this.emitIndex = 0;
  }

  update(dt, vehicle) {
    const shouldEmit = vehicle.driftIntensity > 0.25; // 根据汽车的漂移强度决定是否发射粒子

    if (shouldEmit) {
      if (vehicle.wheelBL) this.emitAtWheel(vehicle.wheelBL, vehicle);
      if (vehicle.wheelBR) this.emitAtWheel(vehicle.wheelBR, vehicle);
    }
    // 更新
    for (const p of this.particles) {
      if (p.life <= 0) {
        continue;
      }

      p.life -= dt;

      if (p.life <= 0) {
        p.sprite.visible = false;
        continue;
      }

      const t = 1 - p.life / p.maxLife;
      const damping = Math.max(0, 1 - dt);
      p.velocity.multiplyScalar(damping);

      p.sprite.position.addScaledVector(p.velocity, dt);

      const alpha = t < 0.5 ? t * 2 : (1 - t) * 2;
      p.sprite.material.opacity = alpha;

      let scaleFactor;
      if (t < 0.5) {
        scaleFactor = 0.5 + t * 1.0;
      } else {
        scaleFactor = 1 - (t - 0.5) * 1.6;
      }

      p.sprite.scale.setScalar(p.initialScale * scaleFactor);
    }
  }
  emitAtWheel(wheel, vehicle) {
    //
    const p = this.particles[this.emitIndex];
    this.emitIndex = (this.emitIndex + 1) % POOL_SIZE;

    //
    wheel.getWorldPosition(_worldPos);
    _worldPos.y = vehicle.container.position.y + 0.05;

    //
    p.sprite.position.copy(_worldPos);
    p.sprite.visible = true;
    p.sprite.material.opacity = 0;

    p.initialScale = 0.25 + Math.random() * 0.25;
    p.sprite.scale.setScalar(p.initialScale * 0.5);

    p.velocity.set((Math.random() - 0.5) * 0.2, Math.random() * 0.1, (Math.random() - 0.5) * 0.2);

    p.maxLife = 0.5;
    p.life = p.maxLife;
  }
}
