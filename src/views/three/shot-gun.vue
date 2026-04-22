<template>
  <div class="crosshair" v-if="is_show_crosshair">
    <img
      id="crosshair"
      ref="crosshair"
      src="../../../public/shotgun/crosshair_0.png"
      class="crosshair-img"
    />
  </div>
  <div class="container" ref="container"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import ShotGunApp from '@/utils/shot-gun/ShotGunApp';

const is_show_crosshair = ref(false);
const container = ref<HTMLDivElement | null>(null);
const crosshair = ref<HTMLImageElement | null>(null);
let app = null;

onMounted(() => {
  //console.log(container.value);
  app = new ShotGunApp({ dom: container.value, crosshair: crosshair.value });

  ElMessageBox.alert('Start Play', 'Welcome to the game!', {
    confirmButtonText: 'Start',
    callback: action => {
      //console.log('ss:', action, app);
      if (action === 'confirm') {
        app.run({ is_show_crosshair: is_show_crosshair });
      }
    },
  });
});
</script>

<style lang="css" scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #eae5e5;
  line-height: 0;
}
.crosshair {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.crosshair-img {
  width: 26px;
  height: 26px;
}
</style>
