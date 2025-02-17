/**
 * 雷达效果
 * 
 */

import * as Cesium from "cesium";
import RadarMaterialProperty from "./material/RadarMaterialProperty";

export default class Radar{
    constructor(viewer){
        this.radarMaterial = new RadarMaterialProperty("radarMaterial");
        this.entity = viewer.entities.add({
            rectangle:{
                coordinates:Cesium.Rectangle.fromDegrees(113.3291,23.119,113.3341,23.124),
                material:this.radarMaterial
            }
        });
    }
}