import * as THREE from 'three';

import { ParticleShaderStr } from '../etc/Shaders';

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 0;

    this._needsUpdate = false;

    this._points = null;
  }
  /**
   * 初始化粒子个数
   * @param {*} maxParticles
   */
  init(maxParticles) {
    this.maxParticles = maxParticles;
    // 加载纹理
    const loader = new THREE.TextureLoader();
    const map = loader.load('./yuka-nier/texture/quad.png');

    const material = new THREE.ShaderMaterial(ParticleShaderStr);
    material.uniforms.map.value = map;
    material.transparent = true;
    material.depthWrite = false;

    // 创建几何体数据
    const geometry = new THREE.BufferGeometry();
    const positionAttribute = new THREE.BufferAttribute(new Float32Array(3 * maxParticles), 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positionAttribute);

    // 透明度
    const opacityAttribute = new THREE.BufferAttribute(new Float32Array(maxParticles), 1);
    opacityAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('opacity', opacityAttribute);

    // 大小
    const sizeAttribute = new THREE.BufferAttribute(new Uint8Array(maxParticles), 1);
    sizeAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('size', sizeAttribute);

    // 角度
    const angleAttribute = new THREE.BufferAttribute(new Float32Array(maxParticles), 1);
    angleAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('angle', angleAttribute);

    //
    const tAttribute = new THREE.BufferAttribute(new Float32Array(maxParticles), 1);
    tAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('t', tAttribute);

    this._points = new THREE.Points(geometry, material);

    return this;
  }

  add(particle) {
    this.particles.push(particle);
    this._needsUpdate = true;

    return this;
  }

  remove(particle) {
    const index = this.particles.indexOf(particle);
    this.particles.splice(index, 1);
    this._needsUpdate = true;

    return this;
  }

  clear() {
    this.particles.length = 0;
  }

  update(delta) {
    const particles = this.particles;
    const geometry = this._points.geometry; // 包含所有粒子的数据

    // 更新
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle._elapsedTime += delta;

      if (particle._elapsedTime >= particle.lifetime) {
        // 大于粒子的生命值
        this.remove(particle);
      }
    }
    // update buffer data for rendering
    // rebuild position and opacity buffer if necessary

    if (this._needsUpdate == true) {
      // 获取数据
      const positionAttribute = geometry.getAttribute('position');
      const opacityAttribute = geometry.getAttribute('opacity');
      const sizeAttribute = geometry.getAttribute('size');
      const angleAttribute = geometry.getAttribute('angle');

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];

        const position = particle.position;
        const opacity = particle.opacity;
        const size = particle.size;
        const angle = particle.angle;

        positionAttribute.setXYZ(i, position.x, position.y, position.z);
        opacityAttribute.setX(i, opacity);
        sizeAttribute.setX(i, size);
        angleAttribute.setX(i, angle);
      }

      positionAttribute.needsUpdate = true;
      opacityAttribute.needsUpdate = true;
      sizeAttribute.needsUpdate = true;
      angleAttribute.needsUpdate = true;
    }

    // always rebuild 't' attribute which is used for animation
    const tAttribute = geometry.getAttribute('t');
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      tAttribute.setX(i, particle._elapsedTime / particle.lifetime);
    }
    tAttribute.needsUpdate = true;

    // 更新draw range
    geometry.setDrawRange(0, particles.length);

    return this;
  }
}

class Particle {
  constructor(position = new THREE.Vector3(), lifetime = 1, opacity = 1, size = 10, angle = 0) {
    this.position = position;
    this.lifetime = lifetime;
    this.opacity = opacity;
    this.size = size;
    this.angle = angle;

    this._elapsedTime = 0;
  }
}

export { Particle, ParticleSystem };
