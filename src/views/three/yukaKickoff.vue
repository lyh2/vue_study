<template>
  <div
    class="container"
    ref="container"
    v-loading="isLoading"
    element-loading-text="加载之中...."
  ></div>
</template>

<script setup lang="js">
import { ref, onMounted } from 'vue';
import World from '@/utils/yuka-kickoff/core/World';
import { ElMessage } from 'element-plus';
import { TEAM } from '@/utils/yuka-kickoff/core/constants';
let world = null,
  container = ref(null);

defineOptions({ name: 'YUKA.kickoff' });
const isLoading = ref(true);

onMounted(async () => {
  world = new World({
    dom: container.value,
    onReady: () => {
      isLoading.value = false;
    },
    onGoalScored: handleGoalScored,
  });
  console.log('world:', world);
  //handleGoalScored({ msg: 'sss' });
});

function handleGoalScored(result) {
  console.log('收到消息:', result);
  ElMessage({
    message: result.msg,
    type: result.owner === TEAM.RED ? 'error' : 'success',
    plain: true,
  });
}
</script>
