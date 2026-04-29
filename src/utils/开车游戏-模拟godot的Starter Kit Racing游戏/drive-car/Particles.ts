import * as THREE from 'three';

/**
 * 粒子对象池大小 —— 为什么是 64？
 * 这是一个经验值：每个车轮漂移时每秒约 emit 60 次，每个粒子存活 0.5 秒，
 * 所以单轮最多同时存在约 30 个粒子。两个后轮最多 60 个，64 留有裕量。
 * 对象池的核心思想是「预分配、循环复用」，避免每帧 new/delete 引发 GC 抖动。
 */
const POOL_SIZE = 64;

/**
 * 全局复用向量 —— 为什么放在外面而不是每次 new？
 * getWorldPosition() 每帧被调用多次，如果内部每次都 new Vector3()，
 * 会产生大量临时对象给 GC 增加压力。这个变量作为「暂存器」复用，
 * 每次调用前写入、调用后读取，不产生新分配。
 */
const _worldPos = new THREE.Vector3();

interface ParticleType {
  sprite: THREE.Sprite;       // 粒子精灵
  life: number;               // 当前剩余生命（秒），<= 0 表示死亡/空闲
  maxLife: number;            // 初始生命值，用于计算生命进度 t
  velocity: THREE.Vector3;    // 速度向量（米/秒），决定粒子飘散方向和速率
  initialScale: number;       // 初始缩放基数，每个粒子取随机值产生大小变化
}

/**
 * 烟雾拖尾粒子系统
 *
 * █ 核心设计思路
 *
 * 这个粒子系统模拟的是「漂移时轮胎与地面摩擦产生的烟雾」，它和
 * 游戏里常见的「爆炸粒子」「火焰粒子」本质上是一样的 —— 都是
 * 用大量小 Sprite 的「生老病死」来模拟连续视觉效果。
 *
 * 核心循环：emit → update → recycle
 *   1. emit（发射）：从对象池取一个「死亡」粒子，重置位置/速度/生命值
 *   2. update（更新）：每帧递减生命，按速度移动，随时间变化大小和透明度
 *   3. recycle（回收）：生命归零时隐藏，等待下次被 emit 复用
 *
 * █ 为什么用 Sprite 而不是 Mesh？
 *
 * Sprite 是 THREE.js 中始终面向摄像机的平面（Billboard），
 * 烟雾从任何角度观看都应该是一个二维圆片，不需要立体感。
 * 如果用 PlaneGeometry + Mesh，还需要额外写 billboard 逻辑让平面始终面向相机，
 * Sprite 把这个过程内置了，省事且高效。
 */
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
      color: 0x5e5f6b, // 灰蓝色，模拟轮胎烟尘的颜色
    });

    // 预创建对象池：一次性分配 POOL_SIZE 个粒子 Sprite
    for (let i = 0; i < POOL_SIZE; i++) {
      const sprite = new THREE.Sprite(this.material);
      sprite.visible = false; // 初始全部隐藏
      sprite.scale.setScalar(0.25);
      scene.add(sprite); // 预先加入场景，后续只需控制 visible

      this.particles.push({
        sprite: sprite,
        life: 0,           // life = 0 表示死亡/空闲
        maxLife: 0,
        velocity: new THREE.Vector3(),
        initialScale: 0,
      });
    }

    this.emitIndex = 0;
  }

  /**
   * 每帧更新 —— 由游戏主循环调用
   *
   * @param dt 距上一帧的时间差（秒）。这是所有「随时间变化」的量的基准。
   *           Godot 中用 delta，Three.js 游戏循环中通常用 clock.getDelta()。
   *           使用 dt 而非固定步长，可以保证不同帧率下运动速度一致。
   * @param vehicle 车辆对象，从这里读取漂移强度和车轮位置
   */
  update(dt, vehicle) {
    // 仅在漂移强度 > 0.25 时发射粒子，这是「漂移阈值」。
    // 低于这个值可能只是轻微打滑，不值得产生烟雾。
    const shouldEmit = vehicle.driftIntensity > 0.25;

    if (shouldEmit) {
      // 两个后轮各发射粒子 —— 漂移时后轮失去抓地力，是烟雾的主要来源
      if (vehicle.wheelBL) this.emitAtWheel(vehicle.wheelBL, vehicle);
      if (vehicle.wheelBR) this.emitAtWheel(vehicle.wheelBR, vehicle);
    }

    // 遍历整个对象池，更新所有存活粒子
    for (const p of this.particles) {
      if (p.life <= 0) {
        continue; // 死亡的粒子跳过更新
      }

      p.life -= dt;

      if (p.life <= 0) {
        // 生命耗尽：隐藏精灵，等待回收
        // 为什么不从场景移除？移除/添加 scene.add/remove 是昂贵操作，
        // visible = false 让渲染器直接跳过它，但保留它在场景图中。
        p.sprite.visible = false;
        continue;
      }

      // t = 生命进度，范围 0（刚出生）→ 1（即将死亡）
      // 这是一个归一化时间轴，后续所有动画（大小、透明度）都基于 t 插值
      const t = 1 - p.life / p.maxLife;

      // 速度阻尼：每帧速度乘以 (1 - dt)，实现「指数衰减」。
      // 烟雾应该越飘越慢，最终悬停消散，而不是一直匀速飞出去。
      // 为什么是 max(0, 1-dt)？因为如果帧率很低（dt 很大），1-dt 可能为负数，
      // 乘以负速度会导致粒子反向运动，显然不对。max(0, ·) 保证速度只减到 0 不再反向。
      const damping = Math.max(0, 1 - dt);
      p.velocity.multiplyScalar(damping);

      // 位置 += 速度 × 时间 —— 最简单的欧拉积分
      p.sprite.position.addScaledVector(p.velocity, dt);

      // █ 透明度动画：先增后减（三角波）
      //
      // 效果：烟雾刚产生时逐渐显现（从透明到不透明），然后慢慢淡出消失
      // 这符合真实烟雾的视觉效果：喷出时稀薄→聚集变浓→扩散消散。
      //
      // 公式拆解：
      //   t < 0.5 时（前半生）：alpha = t * 2，从 0 线性增加到 1
      //   t ≥ 0.5 时（后半生）：alpha = (1-t) * 2，从 1 线性减少到 0
      //
      // 为什么不用「先不变再淡出」或「一直淡出」？
      //   真实烟雾从轮胎缝隙喷出时是压缩状态，看起来颜色深；扩散开后变淡。
      //   先增后减模拟了这个「压缩→扩散」的视觉过程。
      const alpha = t < 0.5 ? t * 2 : (1 - t) * 2;
      p.sprite.material.opacity = alpha;

      // █ 大小动画：先膨胀再收缩
      //
      // 效果：烟雾粒子刚喷出时较小，然后膨胀到最大，最后收缩消失。
      // 这是「 puff（ puff 烟团）」效果 —— 模拟烟雾团从轮胎挤出后膨胀扩散。
      //
      // 公式拆解：
      //   前半生（t < 0.5）：scaleFactor = 0.5 + t * 1.0
      //     初始 0.5 倍 → 中途 0.5 + 0.5 = 1.0 倍
      //   后半生（t ≥ 0.5）：scaleFactor = 1 - (t - 0.5) * 1.6
      //     中途 1.0 倍 → 终点 1 - 0.5 * 1.6 = 0.2 倍
      //
      // 乘以 initialScale（每个粒子随机值 0.25~0.5）让粒子大小有自然差异
      //
      // 为什么和透明度都用「两段式」？
      //   如果只用一个线性变化（比如一直缩小），烟雾看起来像在收缩而不是扩散。
      //   先胀后缩 + 先显后隐，组合出「 puff  puff 」的蓬松感。
      let scaleFactor;
      if (t < 0.5) {
        scaleFactor = 0.5 + t * 1.0;
      } else {
        scaleFactor = 1 - (t - 0.5) * 1.6;
      }

      p.sprite.scale.setScalar(p.initialScale * scaleFactor);
    }
  }

  /**
   * 在指定车轮位置发射一个粒子
   *
   * @param wheel THREE.Object3D —— 车轮对象的引用
   * @param vehicle 车辆对象，用于获取车身高度
   *
   * █ 对象池发射策略（Ring Buffer 循环复用）
   *
   * emitIndex 像钟表的秒针一样在对象池中循环：
   * 每次发射取当前位置的粒子，然后 index 前进一位。
   * 由于粒子的生命周期（0.5 秒）远小于轮询一圈所需时间（64/2≈32 帧 ≈ 0.5 秒 @60fps），
   * 被复用的粒子此时已经死亡，因此不会出现「把一个存活粒子突然拽到新位置」的跳变。
   *
   * 但如果帧率降到 30fps，循环一圈需要约 1 秒，此时确实可能复用还在存活的粒子。
   * 不过这反而产生了一个「叠加」效果 —— 旧粒子还没消失就和新粒子叠在一起，
   * 看起来更浓密，反而更真实。这是一种幸运的 graceful degradation。
   */
  emitAtWheel(wheel, vehicle) {
    // 从对象池中取出当前索引的粒子
    const p = this.particles[this.emitIndex];
    // 环形索引：0,1,2,...,63,0,1,2,... —— 比 if(index++) 更简洁
    this.emitIndex = (this.emitIndex + 1) % POOL_SIZE;

    // 将 wheel 的局部坐标转换为世界坐标，确保粒子出现在车轮的实际位置
    wheel.getWorldPosition(_worldPos);
    // 将粒子高度对齐到车身高度 + 微小偏移（让烟雾从轮胎上方飘出，而不是地面以下）
    _worldPos.y = vehicle.container.position.y + 0.05;

    // 设置粒子的初始状态
    p.sprite.position.copy(_worldPos);
    p.sprite.visible = true;
    p.sprite.material.opacity = 0; // 刚发射时透明，由 update 中的透明度动画渐显

    // 随机初始大小（0.25~0.5），让烟雾有自然的层次感，而不是整齐划一的圆点
    p.initialScale = 0.25 + Math.random() * 0.25;
    p.sprite.scale.setScalar(p.initialScale * 0.5);

    // 随机速度 —— 为什么这样取值？
    // X/Z 方向：(random-0.5)*0.2 ⇒ -0.1~0.1 米/秒，轻微向两侧扩散
    // Y 方向：random*0.1 ⇒ 0~0.1 米/秒，烟雾上升（热空气）
    // 整体速度偏小，因为烟雾应该「飘散」而不是「喷射」
    p.velocity.set(
      (Math.random() - 0.5) * 0.2,
      Math.random() * 0.1,
      (Math.random() - 0.5) * 0.2
    );

    // 粒子存活 0.5 秒 —— 这是一个调优值。
    // 太短：烟雾来不及扩散就消失，看起来断断续续
    // 太长：粒子在空中堆积，场景变得浑浊
    p.maxLife = 0.5;
    p.life = p.maxLife;
  }
}
