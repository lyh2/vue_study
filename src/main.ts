import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import store from "./stores/vuex";

import App from './App.vue'
import router from './router'

// 1. 引入你需要的组件
//import { Button } from 'vant';
// 引入全部组件
import Vant from 'vant';

// 2. 引入组件样式
import 'vant/lib/index.css';

// 全局设置window.CESIUM_BASE_URL The URL on your server where CesiumJS's static files are hosted.
(window as any).CESIUM_BASE_URL = "./";
import "../public/Widgets/widgets.css"; // 引入cesium 样式

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(store)
app.use(Vant);
// Lazyload 指令需要单独进行注册
//app.use(vant.Lazyload);
app.mount('#app')
