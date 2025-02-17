import * as Cesium from "cesium";
import gsap from "gsap";

/**
 * 雷达效果
 * 
 */
export default class RadarMaterialProperty{
    constructor(name){
        this.name = name;

        this.definitionChanged = new Cesium.Event();
        Cesium.Material._materialCache.addMaterial("RadarMaterial",{
            fabric:{
                type:"RadarMaterial",
                uniforms:{
                    uTime:0,
                },
                source:`
                    czm_material czm_getMaterial(czm_materialInput materialInput){
                        czm_material material = czm_getDefaultMaterial(materialInput);

                        vec2 newSt = mat2(
                        cos(uTime),-sin(uTime),sin(uTime),cos(uTime)) * (materialInput.st - 0.5);

                        newSt = newSt + 0.5;

                        vec2 st = newSt;

                        float alpha = 1. - step(0.5,distance(st,vec2(0.5)));

                        // 按照角度设置强弱
                        float angle = atan(st.x - 0.5,st.y - 0.5);
                        /***
                         * angle 取值从-pi 到 pi ，所以如果要设置取值范围从0-1的转变，需要加上pi
                         * 
                         * ***/

                        float strength = (angle + 3.1415) / 6.2830;
                        alpha = alpha * strength;
                        material.alpha = alpha;
                        material.diffuse = vec3(st.x,st.y,1.);

                        return material;
                    }
                `
            }
        });

        this.params={
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
        return "RadarMaterial";
    }

    getValue(time,result){
        result.uTime = this.params.uTime;
        return result;
    }

    equals(other){
        return (other instanceof RadarMaterialProperty && this.name === other.name);
    }
}