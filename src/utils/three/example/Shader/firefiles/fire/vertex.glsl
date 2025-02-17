/**
火焰着色器
*/

export default `
    uniform float uPixelRatio;
    uniform float uSize;
    uniform float uTime;
    attribute float aScale;

    void main(){
        vec4 modelPosition = modelMatrix * vec4(position,1.);
        modelPosition.y += sin(uTime + modelPosition.x * 100.) * aScale * 0.2;
        modelPosition.z += cos(uTime + modelPosition.x * 100.) * aScale * 0.2;
        modelPosition.x += cos(uTime + modelPosition.x * 100.) * aScale * 0.2;

        // 计算得到视图坐标
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;

        gl_Position = projectionPosition;

        gl_PointSize = uSize * aScale * uPixelRatio;
        gl_PointSize *= (1. / - viewPosition.z); // -Z 的地方，该值越大得到值越小，就实现了近大远小的效果
    }
`;