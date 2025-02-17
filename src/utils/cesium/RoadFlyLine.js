/**
 * 创建道路飞线
 * 
 */

import * as Cesium from "cesium";
import PolylineTrailMaterialProperty from "./material/PolylineTrailMaterialProperty";
import SpritelineMaterialProperty from "./SpritelineMaterialProperty";

export default class RoadFlyLine{
    constructor(viewer){
        // 加载json
        let geoJosnPromise = Cesium.GeoJsonDataSource.load("./cesium/roadline.geojson");
        geoJosnPromise.then(dataSource=>{
            viewer.dataSources.add(dataSource);
            // 得到实体
            let entities = dataSource.entities.values;
            let color = new Cesium.Color(Math.random() + 0.2, Math.random() + 0.3,Math.random()  + 0.5);
            let polylineTrailMaterialProperty = new PolylineTrailMaterialProperty(color);
            let spritelineMaterialProperty = new SpritelineMaterialProperty();
            entities.forEach((item,index)=>{
                let polyline = item.polyline;
                polyline.material =  spritelineMaterialProperty ;
            });
        });

    }
}