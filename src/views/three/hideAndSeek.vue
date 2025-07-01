<template>
    <div class="container" ref="container">
        <van-overlay :show="isShowOverlay" >
            <section v-if="isLoading " class="section-container">
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
    <div v-if="isShowOverlay === false || true" class="zidan">
        <div class="zidan-num">{{ roundsLeft }}|{{ammo}}</div>
    </div>
    <!--显示倒计时时间-->
    <div class="clock" >
        剩余时间:{{ playingTime }} s
    </div>
    <!--获得多少分-->
    <div class="hits">
        成绩:{{ hits }}
    </div>
    <!--crosshairs准星，为啥不动态改变位置
    在 FPS 游戏中：
        你不是控制一个 3D 模型转来转去；
        而是固定摄像机的位置和朝向，然后通过旋转摄像机视角来决定“我在看哪里”。
        这时，屏幕正中心所看到的方向，就是你镜头中心线方向，也就是你真正“射击”的方向。


    -->
    <section v-if="isShowOverlay === false" class="crosshairs">
        <div></div>
    </section>
</template>

<script setup lang="js">
    import {ref,onMounted} from 'vue';
    import World from '@/utils/three/example/hideAndSeek/World.js';
    let world = null,container = ref(null);
    defineOptions({
        name:'YUKA.hideAndSeek'
    });
    const isLoading = ref(true);
    const isShowOverlay = ref(true);
    const roundsLeft = ref(0);// 当前弹夹中剩余子弹个数
    const ammo = ref(0);// 总子弹数
    const playingTime = ref(0);// 游玩剩余时间
    const hits = ref(0);// 获得多少分

    onMounted(()=>{
        world = new World({dom:container.value,isShowOverlay:isShowOverlay,isLoading:isLoading,roundsLeft,ammo,playingTime,hits});
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
.section-container{
    display: flex;
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
}
.loading{
            width: 80px;
            display: flex;
            flex-wrap: wrap;
            animation: rotate 3s linear infinite;
        }
        @keyframes rotate{
            to{
                transform: rotate(360deg);
            }
        }
        .loading span{
            width: 32px;
            height: 32px;
            background: red;
            margin: 4px;
            animation: scale 1.5s linear infinite;
        }
        @keyframes scale{
            50%{
                transform: scale(1.2);
            }
        }
        .loading span:nth-child(1){
            border-radius: 50% 50% 0 50%;
            background: #e77f67;
            transform-origin: bottom right;
        }
        .loading span:nth-child(2){
            border-radius: 50% 50% 50% 0;
            background: #778beb;
            transform-origin: bottom left;
            animation-delay: 0.5s;
        }
        .loading span:nth-child(3){
            border-radius: 50% 0 50% 50%;
            background: #f8a5c2;
            transform-origin: top right;
            animation-delay: 1.5s;
        }
        .loading span:nth-child(4){
            border-radius:  0 50% 50% 50%;
            background: #f5cd79;
            transform-origin: top left;
            animation: 1s;
        }
.zidan{
    display: flex;
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background-color: rgba(0,0,0,0.5);
    border-radius: 10px;
}
.zidan-num{
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.2rem;
    font-weight: bold;
    color: white;
    padding: 1rem 2rem;
}
.crosshairs {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  margin-top: -5px;
  border: 1px solid white;
  border-radius: 50%;
  pointer-events: none;
}
.crosshairs>div {
				width: 10px;
				height: 10px;
				border-radius: 66px;
				border: 2px solid #992129;
				opacity: 0.5;
			}
.clock{
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 1rem;
    background-color: rgba(0,0,0,0.5);
    color: white;
    font-size: 1.2rem;
    padding: 0.4rem 1.6rem;
    border-radius: 10px;
    font-weight: bold;
    left: 1rem;
}

.hits{
    display: flex;
    position: fixed;
    left: 1rem;
    bottom:2rem;
    font-size: 1.2rem;
    font-weight: bold;
    background-color: rgba(0,0,0,0.6);
    border-radius: 10px;
    padding: 0.4rem 1.6rem;
    color: white;
}
</style>