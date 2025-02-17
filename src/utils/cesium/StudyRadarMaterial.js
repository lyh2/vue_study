/**
 * 学习材质实现雷达效果
 */

import * as Cesium from "cesium";

export default class StudyRadarMaterial extends Cesium.Material{
    /****
     * 构造雷达扫描材质
     * */

    constructor(options={}){
        
        const newOptions = {
            fabric:{
                type:options.type ?? "RadarMaterial",
                uniforms:options.uniforms || {
                    radians:options.radians ?? 0.0,
                    color:options.color || new Cesium.Color(0,1,1,1),
                    selectColor:options.selectColor || new Cesium.Color(1,0,1,1),
                    time:options.time ?? 0.0,
                    count:options.count ?? 5.0,// 空值合并操作符（??）只有当左侧为null和undefined时，才会返回右侧的数
                    gradient:options.gradient ?? 0.01,
                    width:options.width ?? 0.2,
                },
                source:options.shaderSource ?? "这里是写GLSL代码的地方",
            },
            translucent:options.translucent ?? true,// 是否开启透明
        };
        super(newOptions);
    }


}


