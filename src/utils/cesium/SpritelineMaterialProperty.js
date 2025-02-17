/**
 * 
 * 
 */

import * as Cesium from "cesium";
import gsap from "gsap";

export default class SpritelineMaterialProperty{
    constructor(name){
        this.name = name;
        this.definitionChanged = new Cesium.Event();// 材质的属性发生改变的时候执行的回调事件

        Cesium.Material._materialCache.addMaterial("SpritelineMaterial",{
            fabric:{
                type:"SpritelineMaterial",
                uniforms:{
                    uTime:0,
                    image:"./cesium/spriteline1.png",
                },
                source:`
                    czm_material czm_getMaterial(czm_materialInput materialInput){
                    czm_material material = czm_getDefaultMaterial(materialInput);
                    // 获取st 
                    vec2 st = materialInput.st;
                    // 根据UV坐标进行采样-- 如果是使用webgl2，则修改texture2D 为 texture
                    vec4 color = texture(image,vec2(fract(st.s - uTime),st.t));
                    material.alpha = color.a;
                    material.diffuse = color.rgb;
                    return material;
                    }
                `
            }
        });

        this.params = {
            uTime:0,
        };
        gsap.to(this.params,{
            uTime:1,
            duration:1,
            repeat:-1,
            ease:"linear",
        });
    }

    getType(){
        return "SpritelineMaterial";
    }

    getValue(time,result){
        //console.log("getValue(time,result)=",time,result);
        result.uTime = this.params.uTime;
        return result;
    }

    equals(other){
        return (other instanceof SpritelineMaterialProperty && this.name === other.name);
    }
}