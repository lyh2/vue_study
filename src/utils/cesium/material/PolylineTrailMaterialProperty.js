/**
 * 创建线条材质
 * 
 */

import * as Cesium from "cesium";
import gsap from "gsap";

let typeNum = 0;

export default class PolylineTrailMaterialProperty{
    constructor(color = new Cesium.Color(Math.random(),Math.random(),Math.random(),1.0)){
        this.color = color;
        typeNum ++;

        this.num = typeNum;
        this.definitionChanged = new Cesium.Event(); // 创建事件
        // 向材质缓冲区中添加材质
        Cesium.Material._materialCache.addMaterial("PolylineTrailMaterial"+this.num,{
            fabric:{
                type:"PolylineTrailMaterial"+typeNum,
                uniforms:{
                    uTime:0,
                    color:this.color,
                },
                source:`
                    czm_material czm_getMaterial(czm_materialInput materialInput){
                    // 生成默认的基础材质
                    czm_material material = czm_getDefaultMaterial(materialInput);
                    // 获取st
                    vec2 st = materialInput.st;
                    // 获取当前的帧数，10秒内变化0-1
                    float time = fract(czm_frameNumber / (60.0 * 10.0));
                    time = time * (1. + 0.1);
                    float alpha = smoothstep(time - 0.1,time,st.s) * step(-time,-st.s);
                    alpha += 0.5;

                    material.alpha = alpha;
                    material.diffuse = color.rgb;

                    return material;
                    }
                `,
            }
        });

        this.params ={
            uTime:0,
        };

        gsap.to(this.params,{
            uTime:1,
            duration:2,
            repeat:-1,
            yoyo:true,
        });

    }

    getType(){
        return "PolylineTrailMaterial"+this.num;
    }

    getValue(time,result){
        result.uTime = this.params.uTime;
        return result;
    }

    equals(other){
        return (other instanceof PolylineTrailMaterialProperty && this.color === other.color);
    }
}