/**
 * 修改地图底色
 * 
 */

export default function modifyMap(viewer) {
    // 获取地图影像图层
    let baseLayer = viewer.imageryLayers.get(0);// 根据索引获取对应的图层
    baseLayer.invertColor = true;//设置颜色反转
    baseLayer.filterRGB = [0,50,100];//和过滤 [255,255,255]=>[0,50,100]
    // 更改底图着色器
    const baseFragmentShader = viewer.scene.globe._surfaceShaderSet.baseFragmentShaderSource.sources;
    console.log('着色器代码:',baseFragmentShader)
    for(let i = 0;i < baseFragmentShader.length;i++){

        const strS = "color = czm_saturation(color,textureSaturation);\n#endif\n";
        let strT = "color = czm_saturation(color,textureSaturation);\n#endif\n";
        if(baseLayer.invertColor){
            strT += `
                color.r = 1.0 - color.r;
                color.g = 1. - color.g;
                color.b = 1. - color.b;
            `;
        }

        if(baseLayer.filterRGB){
            strT += `
                color.r = color.r * ${baseLayer.filterRGB[0]}.0/255.0;
                color.g = color.g * ${baseLayer.filterRGB[1]}.0/255.0;
                color.b = color.b * ${baseLayer.filterRGB[2]}.0/255.0;

            `;
        }

        baseFragmentShader[i] = baseFragmentShader[i].replace(strS,strT);
    }


}