<template>
    <div>
        <div>msg:{{ msg }}</div>
        <div>name:{{ name }}</div>
        <div @click="handleClick">子组件修改</div>
    </div>
</template>

<script setup>
import {inject} from "vue";

const name = inject('name',"name:使用默认值");
const msg = inject("msg");

const changeNameMethod = inject("changeNameMethod");

function handleClick(){
    // name.value = "雷猴";// 这样写不合适、因为vue 里推荐使用单向数据流、当父级使用readonly 后、这行代码是不会生效的，没有使用之前才会生效。

    changeNameMethod("修改readonly 的字段...的值");// 正确的方式
    msg.value = "在子组件中修改msg的值...";// 因为msg 没有 readonly 修饰过，所以可以直接修改值
}
</script>