<template>
  <div class="container" ref="container"></div>
</template>
<script setup lang="js">
import Application from '@/utils/pindou/Application';
import { ref, onMounted } from 'vue';

const container = ref(null);
let app = null;
onMounted(() => {
  app = new Application({ dom: container.value });
  console.log('app:', app);
});
</script>
<style lang="css" scoped></style>
