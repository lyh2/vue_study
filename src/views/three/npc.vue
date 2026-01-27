<template>
  <div class="container" ref="container"></div>
</template>

<script setup lang="js">
import { ref, onMounted } from 'vue';

const container = ref(null);
onMounted(() => {});
</script>

<style lang="css" scoped>
.container {
  display: flex;
  width: 100%;
  height: 100%;
}
</style>
