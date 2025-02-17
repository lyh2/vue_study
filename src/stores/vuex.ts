/**
 * 使用vuex 实现状态管理器、在main.js 文件中导入
 */

import { createStore } from "vuex";
import User from "./modules/user";
import Goods from "./modules/goods";


export default createStore({
    state:{
        // 数据仓库、用来存储数据
        msg:"在vuex 中原始的Msg值...",
        total:0,
    },
    getters:{
        // 获取数据的、类似computed 的方法
        getMsg(state){
            return state.msg;
        },

      
    },
    mutations:{
        // 更改state 数据的方法都要写在这里Mutation 是修改 State 数据的唯一方法，这样 Vuex 才可以跟踪数据流向。
        // 在组件中通过 commit 调用即可。

        changeMsg(state,data){
            state.msg = data;
        }
    },
    actions:{
        // 异步方法都是放在 Actions 方法里写、然后在组件使用 dispatch 方法调用,内部最后还是需要通过 mutations 来修改
        fetchMsg(context){
            // 模拟ajax 请求，设置一个延迟
            setTimeout(() => {
                context.commit('changeMsg','从ajax 中获取到的数据');
            }, 1000);
        }
    },
    modules:{
        // 分包、项目如果很大、可以将业务拆散成独立模块、然后分文件管理和存放
        User,
        Goods
    }
})