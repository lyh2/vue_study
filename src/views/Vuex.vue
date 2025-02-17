<template>
    <div>
        <h1>使用Vuex技术：</h1>
        <div>{{ msg }}</div>
    </div>
</template>

<script setup>
import {useStore} from "vuex";

const store = useStore();
const msg = store.state.msg;
console.log(store.state.msg);
console.log(store.getters.getMsg) ;
console.log(store.getters.getUser) ;
store.commit('changeMsg','通过commit调用mutations里面的changeMsg方法，修改state 内种 的值');
store.dispatch('fetchMsg');
console.log(store.state.User.name)
</script>