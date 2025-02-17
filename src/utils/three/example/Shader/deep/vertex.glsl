export default `
varying  vec2 vUv;
uniform float uTime;

precision lowp float;

void main(){
    gl_Position = projectionMatrix  * viewMatrix * modelMatrix * vec4(position ,1.);
    vUv = uv;
}
`;