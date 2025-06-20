import { ref, computed } from 'vue'
import { defineStore } from 'pinia' // 这个是和vuex 一样的状态管理器库

/** Pinia 是 Vue 3 的状态管理库，它允许您在跨组件/页面之间共享状态。它类似于 Vuex，但具有更轻量级和模块化的设计。Pinia 是 Vue 官方推荐的状态管理工具，适用于 Vue 3 项目。
 * 
 * 
 */

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
