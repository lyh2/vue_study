/**
 * 修改建筑颜色
 */

import * as Cesium from "cesium";

export default async function modifyBuild(viewer){
    // 添加3D建筑
    let tiles3d = await Cesium.createOsmBuildingsAsync();
    viewer.scene.primitives.add(tiles3d);

    tiles3d.style = new Cesium.Cesium3DTileStyle({
        show:"${feature['name']} !== '广州塔'",
    });

    // 监听当瓦片加载时候执行事件
    tiles3d.tileVisible.addEventListener(tile=>{
        console.log("加载瓦片并可显示:",tile);
        const cesium3DTileContent = tile.content;
        const featuresLength = cesium3DTileContent.featuresLength;

        for(let i = 0;i < featuresLength;i++){
            const model = cesium3DTileContent.getFeature(i).content._model;
            console.log("model=",model,model._rendererResources);
            // 修改着色器--找不到对应的属性，导致程序执行失败
            const fragmentShaderSource = (model._rendererResources.sourceShaders[1] = `
                    varying vec3 v_positionEC;

                    void main()
                    {
                      czm_materialInput materialInput;
                      vec4 position = czm_inverseModelView * vec4(v_positionEC,1.);
                      // 根据高度设置颜色
                      float strength = position.z / 200.0;
                      gl_FragColor = vec4(strength,0.3 * strength,strength,1.);


                      // 动态光环
                      //czm_frameNumber  获取当前帧数
                      // fract(x) 返回x的小数部分
                      float time = fract(czm_frameNumber / (60. * 10.0));
                      float time = fract(czm_frameNumber / 60.) * 6.28;
                      // 实现往返
                      time = abs(time - 0.5) * 2.0;
                      time = sin(time);
                      
                      float diff = abs(clamp(position.z / 500.,0.,1.)- time);
                      diff = step(0.01,diff);

                      gl_FragColor.rgb += vec3(0.5) * (1. - diff);
                    }
                `);

            model._shouldRegenerateShaders = true;// 片元着色器已经修改，需要进行更新
        }
    })
}