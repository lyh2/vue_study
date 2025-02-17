
export default `
attribute vec3 aStep; //终点 - 起点 的值
uniform float uTime;
uniform float uSize;

void main(){
    vec4 modelPosition = modelMatrix * vec4(position,1.);
    modelPosition.xyz += (aStep * uTime);// 不断的改变点的位置,这里的uTime 取值范围在0-1之间
    vec4 viewPosition = viewMatrix * modelPosition;

    gl_Position = projectionMatrix * viewPosition;

    // 设置点的大小
    gl_PointSize = uSize;
}


`;