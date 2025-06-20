<template>
    <div >
        <button @click="handleBusEmit"> 触发Bus.$emit</button>
        <button @click="changeMsg">修改总线里的Msg</button>
    </div>
</template>

<script setup>
import Bus from "../utils/Bus.js";

function handleBusEmit(){
    Bus.$emit('changeMsg',"修改Msg 的值>>>>");
}

function changeMsg(){
    Bus.msg = "在子组件里面修改Bus 消息总线的msg 值";
}
</script>