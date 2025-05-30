<!--
 * @Author: 412285349@qq.com 412285349@qq.com
 * @Date: 2024-07-14 19:39:15
 * @LastEditors: 412285349@qq.com 412285349@qq.com
 * @LastEditTime: 2024-10-05 15:54:32
 * @FilePath: /www/vue_study/src/views/three/world.vue
 * @Description: 
 * 
 * Copyright (c) 2024 by ${git_name_email}, All Rights Reserved. 
-->
<template>
    <div class="container" ref="container"></div>
</template>


<script setup lang="ts">
import { ref, onMounted, shallowRef } from "vue";
import Application from "@/utils/three/Application";

let exampleId = ref(7);
let app = null, container = ref(null);
defineOptions({
    name: 'world',
})
onMounted(() => {
    app = new Application({ dom: container.value, exampleId: exampleId.value });

    window.onresize = () => {
        app.emit('_onWindowResizeEvent', { type: "_onWindowResizeEvent", msg: "窗口改变事件", data: {} });
    }

});
</script>

<style>
.container {
    display: flex;
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
}
</style>