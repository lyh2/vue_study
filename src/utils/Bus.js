import { ref } from "vue";

/**
 * 用来控制数据和注册事件的
 * 
 * eventList 是必须项，用来存放事件列表的。constructor 里除了 eventList 外，其他都是自定义数据，公共数据就是存在这里的。$on 方法用来注册事件。$emit 方法可以调用 $on 里的事件。$off 方法可以注销 eventList 里的事件。

 需要用到总线的组件，导入Bus.ts 就可以共同操作一份数据了

 也可以使用mitt.js 轻量级的事件订阅、派发库，或者是自定义的事件处理
 npm install mitt
 */

 class Bus{
   

    constructor(){
  
        // 收集订阅消息、调度中心
        this.eventList=[];// 事件列表、必须的
        this.name = "Bus 总线信息";
        this.msg = "消息总线类";
    }


    // 订阅
    $on(name ,func){
        this.eventList[name] =  this.eventList[name] || [];
        this.eventList[name].push(func);
    }
    // 发布
    $emit(name,data){
        if(this.eventList[name]){
            this.eventList[name].forEach(fn => {
                fn(data);
            });
        }
    }

    // 取消订阅
    $off(name){
        if(this.eventList[name]){
            delete this.eventList[name];
        }
    }
 }

 export default new Bus();