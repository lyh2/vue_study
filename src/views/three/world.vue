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
import Application from "@/utils/three/Application.js";

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
    position: relative;
            width: 100%;
            height: 100%;
            display: block;
            overflow: hidden;
            line-height: 0;
}
.container > *{
   position: absolute;
            display: block;
            user-select: none;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
 
}
    canvas {
            display: block;
            position: absolute;
            top: 0;
            left: 0;
        }
</style>