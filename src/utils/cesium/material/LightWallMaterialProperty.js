/**
 * 光墙材质
 */

import * as Cesium from "cesium";
import gsap from "gsap";

export default class LightWallMaterialProperty{
    constructor(name){
        this.name = name;
        this.definitionChanged = new Cesium.Event();
        Cesium.Material._materialCache.addMaterial("LightWallMaterial",{
            fabric:{
                type:"LightWallMaterial",
                uniforms:{
                    uTime:0,
                    image:"./cesium/spriteline2.png",
                },
                source:`
                    czm_material czm_getMaterial(czm_materialInput materialInput){
                    czm_material material = czm_getDefaultMaterial(materialInput);
                    vec2 st = materialInput.st;
                    vec4 color = texture(image,vec2(fract(st.y + uTime),st.x));
                    material.diffuse = color.rgb;
                    material.alpha = color.a;
                    return material;
                    }
                `,
            }
        });

        this.params={
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
        return "LightWallMaterial";
    }

    getValue(time,result){
        result.uTime = this.params.uTime;
        return result;
    }

    equals(other){
        return other instanceof LightWallMaterialProperty && this.name === other.name;
    }
}