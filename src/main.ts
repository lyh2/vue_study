import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import store from "./stores/vuex";

import App from './App.vue'
import router from './router'


// 全局设置window.CESIUM_BASE_URL The URL on your server where CesiumJS's static files are hosted.
(window as any).CESIUM_BASE_URL = "./";
import "../public/Widgets/widgets.css"; // 引入cesium 样式

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(store)

app.mount('#app')
