<template>
  <main class="ma">
    <PropsView :msg="message" @receiveMsg="receiveMsgFun"/>
    <hr>
    <div class="exposeRef">父组件：拿到子组件的message 数据:----------->{{ exposeRefMsg }}</div>
    <ExposeRef :msg="exposeRefMsg" ref="exposeRefCom"/>
    <button @click="callChildFunc" class="btn">调用子组件ExposeRef 中的方法</button>
    <hr>
    <ModelView v-model="modelMsg"/>{{ modelMsg.value }}
    <hr>
    <SlotView>
      <div @click="slotClick" class="slot">{{ slotMsg }}
        <span >html 模块</span>
      </div>
    </SlotView>

    <hr>
    <ProvideInjectView ></ProvideInjectView>

    <hr>
    {{ busMsg }}
    <BusView></BusView>

    <hr>
    <div>{{ counterStore.count }},{{counterStore.doubleCount}}</div>
    <div @click="handleCountOfPina"> 点击块</div>

    <hr>
    <VuexView></VuexView>
  </main>
</template>


<script setup lang="ts">
// 组件之间传递消息的方式
import PropsView from "../views/props/props.vue";
import ExposeRef from "../views/ExposeRef.vue";
import ModelView from "../views/Model.vue";
import SlotView from "../views/Slot.vue";
import ProvideInjectView from "../views/ProvideInject.vue";
import BusView from "../views/Bus.vue";
import VuexView from "../views/Vuex.vue";


import Bus from "../utils/Bus";
import {useCounterStore } from "../stores/counter";
const counterStore = useCounterStore();

import { onMounted, ref ,provide,readonly} from 'vue'
// 传递数据给 PropsView  组件
let message:string = "雷猴啊"; 
let exposeRefMsg = ref("通过Expose 、 ref 进行组件通信，子组件可以通过 expose 暴露自身的方法和数据。父组件通过 ref 获取到子组件并调用其方法或访问数据。");
let modelMsg=ref({msg:"使用v-model传递数据给子组件....",value:0});
let slotMsg = ref("slot 插槽使用....");
let busMsg = ref("使用Bus消息总线的...原始数据");
// 获取ExposeRef 组件
const exposeRefCom = ref(["exposeRefCom"]);

//console.log(1,useCounterStore().count)
onMounted(()=>{
  // 在加载完成之后、将子组件的message 赋值给msg，这里的message 在子组件中 直接暴露出来了的
  //exposeRefMsg.value = exposeRefCom.value.message;


});

/**
 * 接收子组件传递过来的数据
 */
function receiveMsgFun(data:any){
  console.log(data);
}

function callChildFunc(){
   exposeRefCom.value.changeMessage("--> 在父组件中调用子组件暴露的方法，修改子组件的内容");
   //exposeRefMsg.value = exposeRefCom.value.message;
}



// slot: 插槽可以理解为传一段 HTML 片段给子组件。子组件将 <slot> 元素作为承载分发内容的出口。
// 插槽的基础用法非常简单，只需在 子组件 中使用 <slot> 标签，就会将父组件传进来的 HTML 内容渲染出来。

  /**
   * 7、provide / inject遇到多层传值时，使用 props 和 emit 的方式会显得比较笨拙。这时就可以用 provide 和 inject 了。provide 是在父组件里使用的，可以往下传值。inject 是在子(后代)组件里使用的，可以网上取值。无论组件层次结构有多深，父组件都可以作为其所有子组件的依赖提供者。
   */

   const name = ref("我是name：传给子组件...原始数据");
   const msg = ref("msg:发送给子组件的消息...原始数据");

   // 使用readonly 可以让子组件无法直接修改、需要调用provide 往下传的方法来修改
   provide('name',readonly(name));

   provide('msg',msg);

   provide('changeNameMethod',(value: string)=>{
    name.value = value;
   })

   //使用Bus 消息总线
   Bus.$on('changeMsg',data=>{
    busMsg.value = data;
    console.log(Bus);
   })

   // 使用pina 与 vuex 类似的状态管理器
   function handleCountOfPina(){
    counterStore.increment();
   }


</script>



<style scoped>
.ma{
  width: 100vw;
}

.slot{
  background-color:aquamarine;
  font-size: 30px;
  padding: 10px;
}
</style>