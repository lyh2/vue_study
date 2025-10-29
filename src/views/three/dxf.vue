<template>
  <div class="container" ref="container"></div>
</template>

<script setup lang="js">
import DxfWorld from '@/utils/dxf/DxfWorld';
import { ref, onMounted } from 'vue';

let app,
  container = ref(null);

onMounted(() => {
  //
  app = new DxfWorld({ dom: container.value });
  console.log('app', app);
});
</script>

<style lang="css" scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  overflow: hidden;
}
</style>
