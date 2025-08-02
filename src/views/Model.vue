<template>
    <div class="container">
        <div @click="handleClick">子组件：-->{{ modelValue.msg }} --> {{  modelValue.value }}</div>
    </div>

</template>


<script setup lang="ts">
//import {ref} from "vue";

// 接收父组件附送过来的数据
const props = defineProps(['modelValue']);// 接收父组件使用v-model 传递进来的值，必须用modelValue 这个名字来接收
const emit = defineEmits(['update:modelValue']);//必须用update:modelValue 这个名字来通知父组件修改值

function handleClick(){
    // 参数1：通知父组件修改值的方法名
    // 参数2：要修改的值
    emit('update:modelValue',{msg:"修改数据.....",value: 1 + props.modelValue.value});
}
</script>