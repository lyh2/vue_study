<template>
    <div class="container">
        <slot @click="clickHandl"></slot>
    </div>

</template>

<script setup lang="ts">
    function slotClick(){
        console.log("响应slot 中html 的事件...");
    }

    function clickHandl(){
        console.log('Slot 插槽上面的点击事件....');
    }
</script>