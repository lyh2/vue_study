/*
 * @Author: 412285349@qq.com
 * @Date: 2024-01-31 11:16:37
 * @LastEditors: 412285349@qq.com 412285349@qq.com
 * @LastEditTime: 2024-10-14 17:54:01
 * @FilePath: /www/vue_study/vite.config.ts
 * @Description: 
 * 
 */
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import topLevelAwait from 'vite-plugin-top-level-await';
import vuePlugin from '@vitejs/plugin-vue';
import mkcert from 'vite-plugin-mkcert'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    topLevelAwait(),
    //vuePlugin(),
    //mkcert()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
       //'threeGpu': 'three/build/three.webgpu.js', // 确保指向模块化版本
      // 'threeTsl':'three/build/three.webgpu.nodes.js'
    }
  },
  server: {
    // host: '0.0.0.0',
    // port: 443,
    // https:true
  },
})
