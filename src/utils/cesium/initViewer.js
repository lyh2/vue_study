/**
 * 初始化cesium
 */

import * as Cesium from "cesium";

export default function initViewer() {
    // 设置token
    Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNjU4YmYyYS1hMTFiLTQ3ZWMtOGIzYi0wMmU3NGU2MzY5M2MiLCJpZCI6NDcxMjUsImlhdCI6MTYxNjk0MzU2OH0.DPOKu-XVNbD--yg24PCKJZDG3Q9Nl8ejATCa1Hkjys4";
    // 设置cesium 静态资源路径
    window.CESIUM_BASE_URL = "/";

    // 设置cesium 默认视角
    Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(89.5, 20.4, 110.4, 61.2);

    var viewer = new Cesium.Viewer("cesiumContainer", {
        // 是否显示信息窗口
        infoBox: false,
        // 是否显示查询按钮
        geocoder: false,
        homeButton: false,// 不显示home按钮
        // 控制查看器的显示模式
        sceneModePicker: false,
        baseLayerPicker: false,// 是否显示图层选择
        navigationHelpButton: false,//是否显示帮助按钮
        animation: false,// 是否播放动画
        timeline: false,// 显示时间轴
        fullscreenButton: false,// 是否显示全屏按钮
        shouldAnimate: true,// 是否显示动画

        // 显示地形
        terrain: Cesium.Terrain.fromWorldTerrain(),
    });

    // 设置沙箱允许使用js
    //var iframe = document.getElementsByClassName("cesium-infoBox-iframe")[0];
    //iframe.setAttribute("sandbox", "allow-same-origin allow-scripts allow-popups allow-forms");
    //iframe.setAttribute("src", "");

    // 隐藏logo
    viewer.cesiumWidget.creditContainer.style.display = "none";
    viewer.scene.globe.enableLighting = true;
    // 取消天空盒显示
    viewer.scene.skyBox.show = false;
    // 设置背景为黑色
    viewer.scene.backgroundColor = Cesium.Color.BLACK;
    // 设置抗锯齿
    viewer.scene.postProcessStages.fxaa.enabled = true;

    //广州塔
    var position = Cesium.Cartesian3.fromDegrees(113.3301, 23.0991, 1500);
    viewer.camera.flyTo({
        destination: position,
        orientation: {
            heading: Cesium.Math.toRadians(-45),
            pitch: Cesium.Math.toRadians(-30),
            roll: 0,
        },
        duration: 2,
    });

    return viewer;
}