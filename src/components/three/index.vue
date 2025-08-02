<template>
    <div class="container" ref="container" id="container"></div>
</template>
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { TslUseNoise } from '@/utils/three/example/Fun/TslExample.js';

let obj = null;
const container = ref(null);
onMounted(() => {
    nextTick(() => {
        if (!container.value) {
            console.error("Container not found!");
            return;
        }
        obj = new TslUseNoise({ dom: container.value });
        console.log('index.obj:',obj);
    });
})
</script>

<style scoped>
.container {
    width: 100%;
    height: 100%;
}
</style>