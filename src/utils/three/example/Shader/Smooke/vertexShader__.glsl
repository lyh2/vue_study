
export default `
attribute float aImgIndex;
attribute float aScale;
varying vec2 vUv;
varying float vImgIndex; // 图片索引

uniform float uTime;
varying vec3 vColor;

void main(){
    // 得到模型的世界坐标值
    vec4 modelPosition = modelMatrix * vec4(position,1.);
    float angle = atan(modelPosition.x,modelPosition.z);
    float distanceToCenter = length(modelPosition.xz);

    float angleOffset = 1. / distanceToCenter * uTime;
    angle += angleOffset;

    modelPosition.x = cos(angle) * distanceToCenter;
    modelPosition.z = sin(angle) * distanceToCenter;

    vec4 viewPosition = viewMatrix * modelPosition;


    vUv = uv;
    vImgIndex = aImgIndex;
    vColor = color;
    gl_PointSize = 80.;
    gl_Position = projectionMatrix * viewPosition;


}
`;