import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue';// 第一种方式先导入，在下面再进行配置
import ThreeIndexView from "../views/three/index.vue";// 学习three.js
import HallView from "../views/three/hall.vue";// 展馆页面
import CesiumIndex from "../views/cesium/index.vue";//Cesium
import CesiumProject from "../views/cesium/indexProject.vue";// Cesium 工程项目
import world from "../views/three/world.vue";// 元宇宙项目
import TslCom from "@/components/three/index.vue";
import ttt from "../views/three/tictactoe.vue";// 类似排雷游戏
import first from '@/views/three/first.vue';// yuka 第一人射击游戏，模拟子弹及碰撞


const router = createRouter({
  
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/tindex',
      name: 'tindex',
      component: ThreeIndexView
    },
    {
      path: "/hall",
      name: "hall",
      component: HallView
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue') // 第二种：直接导入进行配置
    }, {
      path: "/cesiumIndex",
      name: "cesiumIndex",
      component: CesiumIndex,
    },
    {
      path: "/cesiumProject",
      name: "cesiumProject",
      component: CesiumProject
    },{
      path:"/world",
      name:"world",
      component:()=>import('../views/three/world.vue'),
    },{
      path:"/school",
      name:"school",
      component:()=>import('../views/three/school.vue'),
    },
    {
      path:'/tsl',
      name:'tsl',
      component:TslCom,
    },
    {
      path:'/ttt',
      name:'ttt',
      component:ttt
    },
    {
      path:'/first',
      name:'first',
      component:first
    }
  ]
})

export default router
