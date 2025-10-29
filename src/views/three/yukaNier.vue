<template>
  <div
    class="container"
    ref="container"
    v-loading="isLoading"
    element-loading-text="加载之中...."
  ></div>
  <!-- 圆角弹窗（居中） -->
  <van-popup v-model:show="showCenter" round :style="{ padding: '64px' }" @close="onClose"
    >开始游戏...</van-popup
  >
</template>

<script setup lang="js">
import { ref, onMounted } from 'vue';
import World from '@/utils/yuka-nier/core/World';

let world = null,
  showCenter = ref(false),
  container = ref(null);

defineOptions({ name: 'YUKA.Nier' });
const isLoading = ref(true);

onMounted(async () => {
  world = new World({
    dom: container.value,
    onReady: () => {
      isLoading.value = false;

      showCenter.value = true;
    },
  });
});

function onClose() {
  //console.log(world);
  world._onContinueButtonClick();
}
</script>
