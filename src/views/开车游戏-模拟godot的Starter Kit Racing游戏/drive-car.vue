<template>
  <div class="container" ref="container"></div>
</template>
<script setup lang="ts">
import DriveCarApp from '@/utils/开车游戏-模拟godot的Starter Kit Racing游戏/drive-car/DriveCarApp';
import { onMounted, ref } from 'vue';
const container = ref(null);
let app = null;
onMounted(() => {
  app = new DriveCarApp({ dom: container.value });
  console.log('app:', app);
});
</script>

<style lang="css" scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #fcfcfc;
  line-height: 0;
}
</style>
