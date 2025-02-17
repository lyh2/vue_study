
export default `
  
    uniform sampler2D map;// 纹理数据
    uniform float opacity;// 透明度
    uniform float topRadius;// 外径
    uniform float bottomRadius;// 内径
    varying vec2 vUv;// uv坐标
    varying float radius;// 顶点位置到中心的距离
    const float PI = 3.1415926;

    void main(){
        // 从uv位置信息获取纹理颜色
        vec4 tColor = texture2D(map,vUv);
        // 环形边宽 = 圆柱顶半径 - 圆柱底半径
        float width = topRadius - bottomRadius;
        // 绘图位置占圆环宽度的百分比
        float ratio = (radius - bottomRadius) / width;
        float opacity = opacity * sin(PI * ratio);
        // 基础颜色
        vec4 baseColor = (tColor + vec4(0.,0.,0.3,1.) );
        // 反应透明度
        gl_FragColor = baseColor * vec4(1.,1.,1.,opacity);
    }
`;