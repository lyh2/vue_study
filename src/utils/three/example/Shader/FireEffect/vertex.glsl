/**
实现火焰效果
*/

export default `
precision mediump float;
varying vec2 vUv;

void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
}
`;