<template>
    <div class="container">
        <span class="sp">子组件-->:{{ message }}</span>
    </div>

</template>

<script lang="ts" setup>
    import { ref } from 'vue';
    const message = ref("我是在子组件ExposeRef中的变量:message");

    const props = defineProps({
        msg:{
            type:String,
            default:'',
        }
    })
    console.log('props:',props);
    // 通过 defineExpose 向外暴露指定的数据和方法
    defineExpose({
        message,
        changeMessage
    })

    // 向外暴露的方法
    function changeMessage(data){
        message.value = data;
    }

 
 
</script>