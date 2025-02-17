export default `
    precision lowp float;

    attribute float aImgIndex;
    attribute float aScale;
    varying float vImgIndex;
    varying vec2 vUv;
    varying vec3 vColor;


    uniform float uTime;

    void main(){
        vec4 modelPosition = modelMatrix * vec4(position,1.);
        // 获取顶点的角度
        float angle = atan(modelPosition.x,modelPosition.z);
        // 获取顶点到中心的距离
        float distanceToCenter = length(modelPosition.xz);
        // 根据顶点到中心的距离，设置旋转偏移角度
        float angleOffset = 1. / distanceToCenter * uTime;

        angle += angleOffset;

        modelPosition.x = cos(angle) * distanceToCenter;
        modelPosition.z = sin(angle) * distanceToCenter;

        vec4 viewPosition = viewMatrix * modelPosition;

        gl_Position = projectionMatrix * viewPosition;

        // 设置点的大小
        gl_PointSize = 100.;
        // 根据ViewPosition.z 坐标值决定是否远离相机
        //gl_PointSize = 200. / - viewPosition.z * aScale;
        //gl_PointSize = viewPosition.z * aScale;
        // vUv = uv;
        // vImgIndex = aImgIndex;
        // vColor = color;
    }
`;