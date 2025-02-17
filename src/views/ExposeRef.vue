<template>
    <div class="container">
        <span class="sp">子组件-->:{{ message }}</span>
    </div>

</template>

<script lang="ts" setup>
    import { onMounted,ref } from 'vue';
    const message = ref("我是在子组件ExposeRef中的变量:message");

    const props = defineProps({
        msg:{
            type:String,
            default:'',
        }
    })
    // 通过 defineExpose 向外暴露指定的数据和方法
    defineExpose({
        message,
        changeMessage
    })

    // 向外暴露的方法
    function changeMessage(data:any){
        message.value = data;
    }

 
 
</script>