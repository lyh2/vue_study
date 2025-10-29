<template>
  <div class="container" ref="container"></div>
</template>
<script setup lang="js">
import { ref, onMounted } from 'vue';
import { IndoorMap } from '@/utils/indoor/IndoorMap';
import { testTheme } from '@/utils/indoor/theme/testTheme';
import { default3dTheme } from '@/utils/indoor/theme/default3dTheme';
let app,
  container = ref(null);

onMounted(() => {
  app = new IndoorMap({ dom: container.value, is3D: true });
  //console.log('IndoorMap:', app);
  // 加载数据
  app.instance.load('/IndoorMap/data/testMapData.json', () => {
    app.instance.setTheme(testTheme).setTheme(default3dTheme).setGui();
    app.instance
      .showNames(true)
      .showIcons(true)
      .setSelectable(false)
      .setSelectListener(selectObject => {
        console.log('选中的对象:', selectObject);
      });
  });
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
