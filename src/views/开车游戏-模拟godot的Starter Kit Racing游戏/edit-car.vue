<template>
  <div class="container" ref="container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
//import * as THREE from 'three';
const container = ref(null);
//import { GLTFLoader } from 'three/examples/jsm/Addons';

onMounted(() => {
  console.log('div:', container.value);
});
</script>
