/**
入口灯光
*/

export default `
    varying vec2 vUv;

    void main(){
        vec4 modelPosition = modelMatrix * vec4(position,1.);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;

        vUv = uv;
        gl_Position = projectionPosition;

    }
`;