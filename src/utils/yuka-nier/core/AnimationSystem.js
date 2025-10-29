class AnimationSystem {
  constructor() {
    this.animations = [];
  }

  add(animation) {
    this.animations.push(animation);
  }

  remove(animation) {
    const index = this.animations.indexOf(animation);
    this.animations.splice(index, 1);
    return this;
  }

  update(delta) {
    const animations = this.animations;
    for (let i = animations.length - 1; i >= 0; i--) {
      const animation = animations[i];
      animation._elapsedTime += delta;

      // 检测是否完成 动画时间 + 动画延迟时间
      if (animation._elapsedTime >= animation.duration + animation.delay) {
        this.remove(animation);
      }
      // 执行动画
      const t = Math.min(
        1,
        Math.max(0, animation._elapsedTime - animation.delay) / animation.duration
      ); // `animation._elapsedTime`：动画已经运行的总时间

      if (t > 0) {
        const object = animation.object;
        const property = animation.property;
        const targetValue = animation.targetValue;

        object[property] = targetValue;
      }
    }

    return this;
  }
}
/**
 * 自定义动画属性
 */
class CustomAnimationProperty {
  constructor() {
    this.object = null;
    this.property = null;
    this.targetValue = 0; // number
    this.duration = 0; // seconds
    this.delay = 0; // seconds

    this._elapsedTime = 0; // 动画已执行总时长
  }
}

export { AnimationSystem, CustomAnimationProperty };
