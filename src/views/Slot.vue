<template>
    <div class="container">
        <slot @click="clickHandl"></slot>
    </div>

</template>

<script setup lang="ts">
    

    function clickHandl(){
        console.log('Slot 插槽上面的点击事件....');
    }
</script>