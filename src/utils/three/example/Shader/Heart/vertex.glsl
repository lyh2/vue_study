export default `

precision lowp float;

attribute float aScale;
attribute vec3 aRandom;

uniform float uTime;
uniform float uSize;

void main(){
    vec4 modelPosition = modelMatrix * vec4(position,1.);

    modelPosition.xyz +=  (aRandom.xyz ) * uTime * 10.;

    vec4 viewPosition = viewMatrix * modelPosition;

    gl_Position = projectionMatrix * viewPosition;

    // 设置定点大小
    gl_PointSize = uSize * aScale - (uTime * 20.);

}
`;