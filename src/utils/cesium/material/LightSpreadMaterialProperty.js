/**
 * 6变形光效
 * 
 */
import * as Cesium from "cesium";
import gsap from "gsap";

export default class LightSpreadMaterialProperty{
    constructor(name){
        this.name = name;
        this.definitionChanged = new Cesium.Event();
        Cesium.Material._materialCache.addMaterial("LightSpreadMaterial",{
            fabric:{
                type:"LightSpreadMaterial",
                uniforms:{
                    uTime:0,
                    image:"./cesium/hexagon.png"
                },
                source:`
                    czm_material czm_getMaterial(czm_materialInput materialInput){
                    czm_material material = czm_getDefaultMaterial(materialInput);
                    vec2 st = materialInput.st;

                    vec4 color = texture(image,st);
                    material.diffuse = color.rgb;
                    material.alpha = color.a;
                    return material;
                    }
                `
            }
        });

        this.params = {
            uTime:0,
        };
        gsap.to(this.params,{
            uTime:6.28,
            duration:1,
            repeat:-1,
            ease:"linear",
        });
    }

    getType(){
        return "LightSpreadMaterial";
    }

    getValue(time,result){
        result.uTime = this.params.uTime;
        return result;
    }

    equals(other){
        return other instanceof LightSpreadMaterialProperty && this.name === other.name;
    }
}