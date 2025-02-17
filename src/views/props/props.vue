<template>
    <div class="container">
        <div class="example" ref="example">
            <span class="text1" ref="text1">组件之间传递消息的方式之一：使用props</span>
            <div class="msg" ref="msgDiv" @click="changeMsg">{{ msg }}</div>
        </div>
    </div>
   
</template>
<script setup lang="ts">
import { onMounted ,ref} from 'vue';
//在 <script setup> 中必须使用 defineProps API 来声明 props，它具备完整的推断并且在 <script setup> 中是直接可用的。
const props = defineProps({
    msg:{
        type:String,
        default:'',// 在js 中 props.msg 的方式使用
    }
});
const example = ref(null);

onMounted(()=>{
    //example.value.appendChild('<span>增加文字</span>');
    console.log(example,example.value)
   
});
// 注册一个自定义事件名、向上传递时告诉父组件要触发的事件
const emit = defineEmits(['receiveMsg']);

function changeMsg(){
    console.log('PropsView获得父组件数据:',props.msg);
    //props.msg = "修改啊"
    emit('receiveMsg',{msg:"子组件给父组件传递数据",value:props.msg});
}

</script>

<style>
.container {
    display: flex;
    width: 100%;
    justify-content: flex-start;
    align-items: flex-start;
    flex-wrap: wrap;
    background-color: #dcdcdc;
    margin: 0;
}
.container .example{
    display: flex;
    width: 100%;
    background-color: #e5e5e5;
    flex-wrap: wrap;
    padding: 10px;
}
.container .example .text1{
    display: flex;
    width: 100%;
    justify-content: flex-start;
}
.container .example .msg {
    display:flex;
    justify-content: flex-start;
    align-items: flex-start;
    width: 100%;
    font-size:20px;
    font-weight:  bold;

}
</style>