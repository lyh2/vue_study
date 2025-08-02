<template>
    <div id="cesiumContainer" ref="cesiumContainer"></div>
</template>

<script setup>
// Cesium3DTileset 与 Cesium3DTileStyle 还未学习入xmind
import { onMounted } from 'vue';
//import * as Cesium from "cesium";
import initViewer from "@/utils/cesium/initViewer";
//import MousePosition from "@/utils/cesium/MousePosition";
import modifyMap from "@/utils/cesium/modifyMap";
//import modifyBuild from "@/utils/cesium/modifyBuild";
// import LightCone from "@/utils/cesium/LightCone";
// import RectFlyLight from "@/utils/cesium/RectFlyLight";
// import RoadFlyLine from "@/utils/cesium/RoadFlyLine";
// import Radar from "@/utils/cesium/Radar";
// import LightSpread from "@/utils/cesium/LightSpread";
// import LightWall from "@/utils/cesium/LightWall";
// import ParticleLight from "@/utils/cesium/ParticleLight";
// import {createRadar} from "@/utils/cesium/StudyRadar";


onMounted(() => {
    let viewer = initViewer();
    // 根据鼠标位置生成经纬度
    //let mousePosition = new MousePosition(viewer);

    // 设置导航罗盘的配置
    // var options = {
    //     // 启动罗盘
    //     enableCompass: true,
    //     // 是否启用缩放
    //     enableZoomControls: false,
    //     // 是否开启指南针外环
    //     enableCompassOuterRing: true,
    //     // 是否启用距离的图例
    //     enableDistanceLegend: false,
    // };
    // 初始化罗盘
    //let navigation = new CesiumNavigaion(viewer, options);

    // 修改地图的底色
    modifyMap(viewer);

    //modifyBuild(viewer);

    // 添加动态的光锥效果
    // let lightCone = new LightCone(viewer);
    // let rectFlyLight = new RectFlyLight(viewer);
    // let roadFlyLine = new RoadFlyLine(viewer);
    // let radar = new Radar(viewer);

    // let lightSpread = new LightSpread(viewer);

    // let lightWall = new LightWall(viewer);

    // let particleLight = new ParticleLight(viewer,Cesium.Color.RED);

    // let studyRadar = createRadar(viewer);
});
</script>

<style></style>