/**
 * 6变形光波特效
 */

import * as Cesium from "cesium";
import LightSpreadMaterialProperty from "./material/LightSpreadMaterialProperty";
import gsap from "gsap";

export default class LightSpread{
    constructor(viewer){
        // 设置雷达材质
        this.lightSpreadMaterial = new LightSpreadMaterialProperty("LightSpreadMaterial");
        this.params = {
            minLng:113.3091,
            minLat:23.119,
            maxLng:113.3141,
            maxLat:23.124
        };

        this.entity = viewer.entities.add({
            rectangle:{
                coordinates:Cesium.Rectangle.fromDegrees(113.3091,23.119,113.3141,23.124),
                material:this.lightSpreadMaterial,
            },
        });

        gsap.to(this.params,{
            minLng:113.1991,
            minLat:23.009,
            maxLng:113.4241,
            maxLat:23.234,
            duration:5,
            repeat:-1,
            ease:"linear",
            onUpdate:()=>{
                this.entity.rectangle.coordinates = Cesium.Rectangle.fromDegrees(this.params.minLng,this.params.minLat,this.maxLng,this.params.maxLat);
            }
        });
    }
}