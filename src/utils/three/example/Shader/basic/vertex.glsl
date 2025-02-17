export default `
precision highp float;
uniform vec3 uColor;
uniform float uFrequency;
uniform float uScale;
uniform float uTime;

varying float vElevation;
varying vec2 vUv;


// highp -2^16-2^16
// mediump = -2^10-2^10
// lowp -2^8-2^8

void main(){
    vec4 modelPosition = modelMatrix * vec4(position,1.);
    modelPosition.z += sin((modelPosition.x + uTime) * uFrequency) * uScale;
    modelPosition.z += cos((modelPosition.y + uTime) * uFrequency) * uScale;

    modelPosition.y += sin((modelPosition.z + uTime) * uFrequency ) * uScale;
    vElevation = modelPosition.z;

    gl_Position = projectionMatrix * viewMatrix * modelPosition;
    vUv = uv;
}
`;