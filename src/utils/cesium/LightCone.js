/**
 * 实现动态光锥效果
 */

import * as Cesium from "cesium";
import gsap from "gsap";

export default class LightCone{
    constructor(viewer){
        this.params = {
            height:700,
            degress:0,
        };

        // 设置模型的位置
        this.modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(Cesium.Cartesian3.fromDegrees(113.3191,23.109,this.params.height),new Cesium.HeadingPitchRoll(this.params.degress,0,0));

        // 添加模型
        try{
            Cesium.Model.fromGltfAsync({
                url:"./cesium/pyramid.glb",
                show:true,
                scale:200,
                minimumPixelSize:12,
                maximumScale:20000,
                debugShowBoundingVolume:true,
                debugWireframe:true,
                color:new Cesium.Color.YELLOW.withAlpha(0.5),
                // 设置颜色的混合方式
                colorBlendMode:Cesium.ColorBlendMode.MIX,
                // 设置模型的位置矩阵
                modelMatrix:this.modelMatrix,
            }).then(model=>{
                this.model =  viewer.scene.primitives.add(model);

            });
        }catch(error){
            console.log("模型加载异常:....");
        }
      

        this.animate();

    }

    animate(){
        gsap.to(this.params,{
            height:800,
            degress:Math.PI,
            yoyo:true,
            repeat:-1,
            duration:1,
            ease:"power1.inOut",
            onUpdate:()=>{
                if(this.model)
                 this.model.modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(Cesium.Cartesian3.fromDegrees(113.3191,23.109,this.params.height),new Cesium.HeadingPitchRoll(this.params.degress,0,0));
            }
        })
    }
}