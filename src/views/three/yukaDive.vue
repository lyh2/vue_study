<template>
  <div class="container" ref="container">
    <van-overlay :show="isShowOverlay">
      <section v-if="isLoading" class="section-container">
        <div class="loading">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </section>
    </van-overlay>
  </div>
  <!--右下角子弹显示=>当前弹夹中剩余子弹|总子弹-->
  <div v-if="isShowOverlay === false && isFPSControls === true " class="zidan">
    <div class="zidan-num">{{ currentBullet }}|{{ bulletTotal }} |血量:{{ hudHealth }}</div>
  </div>
  
  <section v-if="isShowOverlay === false && isFPSControls === true  " class="message-list">

      <ul class="msg-ls-ul">
        <li v-for="item in messages" :key="item.text">
          <span class="span-left">{{ item.winner }}</span>
          <span class="span-medium">{{ item.text }}</span>
          <span class="span-right">{{ item.loser }}</span>
        </li>
      </ul>

  </section>
</template>

<script setup lang="js">
import { ref, onMounted } from "vue";
import World from "@/utils/three/example/yuka-dive/core/World.js";
let world = null,
  container = ref(null);
defineOptions({
  name: "YUKA.Dive",
});
const isLoading = ref(true);
const isShowOverlay = ref(true);
const currentBullet = ref(0); // 当前弹夹中剩余子弹个数
const bulletTotal = ref(0); // 总子弹数
const hudHealth = ref(0);// 🩸 
const messages = ref([]);//
const isFPSControls = ref(false);// 是否进入第一人称模式

onMounted(() => {
  world = new World({
    dom: container.value,
    isShowOverlay: isShowOverlay,
    isLoading: isLoading,
    currentBullet,
    bulletTotal,
    messages,
    hudHealth,
    isFPSControls
  });
  console.log('world:',world);
});
</script>

<style lang="css" scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  overflow: hidden;
  line-height: 0;
}
.section-container {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
}
.loading {
  width: 80px;
  display: flex;
  flex-wrap: wrap;
  animation: rotate 3s linear infinite;
}
@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}
.loading span {
  width: 32px;
  height: 32px;
  background: red;
  margin: 4px;
  animation: scale 1.5s linear infinite;
}
@keyframes scale {
  50% {
    transform: scale(1.2);
  }
}
.loading span:nth-child(1) {
  border-radius: 50% 50% 0 50%;
  background: #e77f67;
  transform-origin: bottom right;
}
.loading span:nth-child(2) {
  border-radius: 50% 50% 50% 0;
  background: #778beb;
  transform-origin: bottom left;
  animation-delay: 0.5s;
}
.loading span:nth-child(3) {
  border-radius: 50% 0 50% 50%;
  background: #f8a5c2;
  transform-origin: top right;
  animation-delay: 1.5s;
}
.loading span:nth-child(4) {
  border-radius: 0 50% 50% 50%;
  background: #f5cd79;
  transform-origin: top left;
  animation: 1s;
}
.zidan {
  display: flex;
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
}
.zidan-num {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
  padding: 1rem 2rem;
}
.message-list{
  display: flex;
  position: fixed;
  left: 2rem;
  top: 3rem;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
}

.msg-ls-ul{
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
  padding: 10px;
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0.5);
}

.msg-ls-li{
  display: flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;

}
.span-left{
  display: flex;
  font-size: 1.2rem;
  color: yellow;
  line-height: 1.4rem;

}

.span-medium{
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px 6px;
  color: white;
  font-size: 1rem;
  line-height: 1.4rem;
}

.span-right{
  display: flex;
  justify-content: center;
  align-items: center;
  color: red;
  font-size: 1.2rem;
  line-height: 1.4rem;
  
}

</style>
