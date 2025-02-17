/**
 * glsl 代码
 * czm_ 开头就是Cesium 内置的方法变量等
 */

export const sampleShader=`
    uniform vec4 color;

    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);

        material.diffuse = color.rgb;
        material.alpha = 0.5;// 创建一个半透明材质
        return material;
    }
`;

/**
 * 纹理沿X轴方向渐变
 */
export const samplerShaderXAxis=`
uniform vec4 color;

czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput); //得到默认材质
    vec2 st = materialInput.st;
    material.diffuse = color.rgb;
    material.alpha = st.s;

    return material;
}
`;

export const samplerShaderYAxis=`
    uniform vec4 color;

    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);

        vec2 st = materialInput.st;
        material.diffuse = color.rgb;
        material.alpha = st.t;

        return material;
    }
`;

/**
 * 在中心点求距离
 */
export const samplerShaderCenter = `
    uniform vec4 color;

    czm_material czm_getMaterial(materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st= materialInput.st;
        float dis = distance(st,vec2(0.5));
        material.diffuse = color.rgb;
        material.alpha = dis; // 中间的值为透明值
        return material;
    }
`;

/**
 * 2倍距离
 */
export const samplerShader2xDisOfCenter = `
    uniform vec4 color;

    czm_material czm_getMaterial(materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st= materialInput.st;
        float dis = distance(st,vec2(0.5));
        material.diffuse = color.rgb;
        material.alpha = dis * 2. ; // dis 的值在0-0.5 => 0.-1.
        return material;
    }
`;

/**
 * 1 减去2倍距离
 */
export const samplerShader1minus2xDisCenter = `
    uniform vec4 color;

    czm_material czm_getMaterial(materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st= materialInput.st;
        float dis = distance(st,vec2(0.5));
        material.diffuse = color.rgb;
        material.alpha = 1. - 2. * dis; // 
        return material;
    }
`;

/**
 * 1 减去2倍距离
 */
export const samplerShader1minus2xDisCenterV2 = `
    uniform vec4 color;

    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st= materialInput.st;
        float dis = distance(st,vec2(0.5));
        material.diffuse = color.rgb;
        material.alpha = clamp(1. - 2. * dis,0.,1.); // 正方形的对角线长度值约为0.707 ,即三角函数计算就可以得到 
        return material;
    }
`;

/**
 * 实现雷达效果
 */
export const  radarShaderSource = `
    uniform vec4 color; // 颜色值
    uniform vec4 selectColor; // 选中的颜色
    uniform float width; // 宽度
    uniform float radians; 
    uniform float offset; // 偏移值

    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st = materialInput.st;
        float dis = distance(st,vec2(0.5));

        float sp = 1. / 5. /2.; // 0.1
        float m = mod(dis,sp);
        float alpha = step(sp * (1. - width * 10.),m);// 
        alpha = clamp(alpha,0.2,1.);
        material.alpha = alpha;
        material.diffuse = color.rgb;

        // 绘制十字线
        if((st.s > 0.5 - width / 2. && st.s < 0.5 + width / 2.) || (st.x > 0.5 - width / 2. && st.t < 0.5 + width / 2.)){
        alpha = 1.0;
        material.diffuse = color.rgb;
        material.alpha = alpha;
        }

        // 绘制光晕
        float ma = mod(dis + offset,0.5);
        // if(ma < 0.25){
        //     alpha = ma * 3.0 + alpha; 
        // }else{
        //     alpha = 3.0 * (0.5 - ma) + alpha;
        // }
        //material.alpha = alpha;
        //material.diffuse = selectColor.rgb;

        // 绘制扇区
        // vec2 xy = materialInput.st;
        // float rx = xy.x - 0.5;
        // float ry = xy.y - 0.5;
        // float at = atan(ry,rx);

        // 半径
        // float radius = sqrt(rx * rx + ry * ry);

        // float currentRadians = at + radians;
        // xy = vec2(cos(currentRadians) * radius,sin(currentRadians) * radius);
        // xy = vec2(xy.x + 0.5 ,xy.y + 0.5);

        // if(xy.y - xy.x < 0. && xy.x > 0.5 && xy.y > 0.5){
        //     material.alpha = alpha + 0.2;
        //     material.diffuse = selectColor.rgb;
        // }
        return material;
    }
`;




























