<template>
  <div class="container" ref="container"></div>
</template>

<script setup lang="js">
import { testTheme } from '@/utils/indoor/theme/testTheme';
import ApplicationPixi from '@/utils/pixi/ApplicationPixi';
import { ref, onMounted } from 'vue';
let container = ref(null);
let app = null;
onMounted(() => {
  app = new ApplicationPixi({ dom: container.value });
  console.log('app:', app);
  app.instance.load('./IndoorMap/data/testMapData.json', () => {
    app.setTheme(testTheme);
  });
});
</script>

<style lang="css" scoped>
.container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
