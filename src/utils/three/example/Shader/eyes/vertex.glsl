/**
眼睛网格噪声
*/

export default `
precision mediump float;

varying vec2 vUv;

void main(){
    vUv = 0.5 * (position.xy + 1.);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.);
}
`;