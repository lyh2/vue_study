<template>
    <div class="container" ref="container" >
    </div>
    <canvas id="number" width="64" height="64" ref="number"></canvas>
    <div class="annotation" ref="annotation" v-on:click="bindClickAnnotation">
        <p><strong>立方体</strong></p>
        <p>这是弹出对话框，给立方体或者是几何体对象添加弹框信息，是非常有用的一个功能。做智慧旅游、智慧乡村必备的技能</p>
    </div>
</template>

<script setup lang="ts">
    import {ref,onMounted} from 'vue';
    import Application from "@/utils/three/Application.js";
    
    let exampleId = ref(4);
        
    let app = null, container = ref(null),annotation = ref(null),number = ref(null);
    onMounted(()=>{
        app = new Application({dom:container.value,exampleId:exampleId.value,annotation:annotation.value,canvas:number.value});

        // 触发一个事件
        //app.emit('_initExample',{type:"_initExample",msg:"触发一个事件",data:{exampleId:0,annotation:annotation.value,canvas:number.value}});

        
        window.onresize = ()=>{
            app.emit('_onWindowResizeEvent',{type:"_onWindowResizeEvent",msg:"窗口发射改变事件",data:{}})
        }
    });

    function bindClickAnnotation(){
        console.log('点击Annotation 事件...');
    }
    
  
</script>

<style scoped>
.container{
    display:flex;
    margin:0;
    padding:0;
    width:100vw;
    height:100vh;
    
}
#number{
    position: absolute;
    z-index: -1;
}
.annotation{
    position:absolute;
    top: 40px;
    left: 40px;
    z-index: 1;
    margin-left: 15px;
    margin-top: 15px;
    padding: 1rem;
    width: 200px;
    color: #fff;
    background: rgb(142 59 156);
    border-radius: 0.5rem;
    font-size: 12px;
    line-height: 1.2;
    transition: opacity 0.5s;
    &::before{
        content: '1';
        position: absolute;
        top: -30px;
        left: -30px;
        width: 32px;
        height: 32px;
        border: 4px solid #F44336;
        border-radius: 50%;
        font-size: 16px;
        line-height: 22px;
        text-align: center;
        background: rgba(1, 0, 0, 0.8);
    }
}

/**
实现过渡效果
*/

canvas{
    background: -webkit-linear-gradient(0deg,rgb(0,12,91),rgb(0,0,0));
    background: linear-gradient(0deg,rgb(0,12,91),rgb(0,0,0));
}

.label{
  color: #4f0ad8;
  font-size: 1rem;

  box-sizing: border-box;
    background: #dcdcdc;
    padding: 5px 10px 5px 10px;
    border-radius: 10px;
    font-weight: bold;
}

.label1{
  color: #23e10e;

  font-size: 1rem;
}

</style>