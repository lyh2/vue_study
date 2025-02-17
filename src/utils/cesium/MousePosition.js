/**
 * 由鼠标生成经纬度
 * 
 */
import * as Cesium from "cesium";

export default class MousePosition {
    constructor(viewer) {
        this.divDom = document.createElement("div");
        this.divDom.style.cssText = `
            position:fixed;
            bottom:0;
            right:0;
            width:200px;
            height:40px;
            background-color:rgba(0,0,0,0.5);
            color:#fffff;
            font-size:40px;
            text-align:center;
            z-index:100;
        `;

        document.body.appendChild(this.divDom);

        // 开始监听鼠标的移动事件
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement) => {
            // 获取鼠标的坐标
            const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
            if (cartesian) {
                // 转换成经纬度
                const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                const longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
                const latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
                const heightString = cartographic.height;

                this.divDom.innerHTML = `经度:${longitudeString} 纬度:${latitudeString}`;

            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
}