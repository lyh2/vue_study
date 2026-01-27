<template>
  <div class="container" ref="container">
    <canvas ref="canvasRef" style="width: 100vw; height: 100vh"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue';
import Application from '@/utils/pixi/Application';
import { Sprite } from '@/utils/pixi/Sprite';
import { Graphics } from '@/utils/pixi/Graphics';
import { Container } from '@/utils/pixi/Container';
import { Camera2D } from '@/utils/pixi/Camera2D';

defineOptions({ name: 'CustomPixi' });

const container = ref(null);
const canvasRef = ref(null);

let app = null;
let camera = null;

onMounted(() => {
  // 设置canvas实际尺寸
  const canvas = canvasRef.value;
  canvas.width = canvas.clientWidth; // 得到canvas 的尺寸(width,height)
  canvas.height = canvas.clientHeight;

  //console.log('Canvas尺寸:', canvas.width, canvas.height);

  // 创建应用
  app = new Application({ canvas });

  // 绿色可点击方块使用Sprite - 放在canvas中心

  const gSprite = new Sprite({ width: 100, height: 100, color: '#00cc66' });
  gSprite.x = 0;
  gSprite.y = 0;
  gSprite.anchorX = 0.5;
  gSprite.anchorY = 0.5;
  gSprite.pivotX = 50;
  gSprite.pivotY = 50;
  gSprite.on('pointerdown', () => {
    console.log('green sprite clicked');
    gSprite.color = gSprite.color === '#00cc66' ? '#ffaa00' : '#00cc66';
  });

  // 红色运动方块(Graphics) - 放在canvas中心偏右下方
  const r = new Graphics();
  r.x = 100;
  r.y = 100;
  r.beginFill('#cc3344').drawRect(0, 0, 80, 80);
  r.pivotX = 0;
  r.pivotY = 0;

  // 容器包含两个子Sprite - 放在canvas中心偏左上方
  const spriteContainer = new Container();
  spriteContainer.x = 100;
  spriteContainer.y = 100;
  const child1 = new Sprite({ width: 80, height: 80, color: '#de3' });
  child1.x = 0;
  child1.y = 0;
  child1.anchorX = 0.5;
  child1.anchorY = 0.5;
  child1.pivotX = 40;
  child1.pivotY = 40;
  const child2 = new Sprite({ width: 40, height: 40, color: '#eee333' });
  child2.x = 40;
  child2.y = 40;
  child2.anchorX = 0.5;
  child2.anchorY = 0.5;
  child2.pivotX = 20;
  child2.pivotY = 20;
  spriteContainer.addChild(child1);
  spriteContainer.addChild(child2);

  // 将所有对象添加到舞台（不使用相机）
  app.stage.addChild(gSprite);
  app.stage.addChild(r);
  app.stage.addChild(spriteContainer);

  // 创建透视相机并绑定到舞台
  camera = new Camera2D({
    viewportWidth: canvas.width,
    viewportHeight: canvas.height,
    zoom: 1,
    rotation: 0,
    x: 0, // 初始位置调整，让物体在视野中心
    y: 0,
  });

  app.setCamera(camera);
  // 动画循环
  let t = 0;
  app.ticker.add(dt => {
    t += dt;
    gSprite.y = Math.sin(t * 2) * 20;
    gSprite.rotation = Math.sin(t * 1.5) * 0.4;
    r.x = 100 + Math.sin(t * 1.2) * 50;
    r.rotation = t;
    spriteContainer.rotation = Math.sin(t * 0.8) * 0.5;

    camera.x += Math.cos(t * 2);
    camera.zoom = Math.abs(Math.sin(t * 1.5)) + 1;
  });

  // 启动应用
  app.start();
});

// 组件卸载时清理
onUnmounted(() => {
  if (camera) {
    camera.detachFromCanvas();
  }
  if (app) {
    app.stop();
  }
});
</script>

<style scoped>
.container {
  display: flex;
  width: 100%;
  height: 100%;
}
</style>
