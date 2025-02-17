<template>
    <div class="container" ref="container" id="container"></div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { TslUseNoise } from '@/utils/three/example/Fun/TslExample.js';

let obj = null;
const container = ref(null);
onMounted(() => {
    obj = new TslUseNoise({ dom: container.value });
})
</script>

<style scoped>
.container {
    width: 100%;
    height: 100%;
}
</style>