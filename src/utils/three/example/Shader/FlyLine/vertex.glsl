export default `
precision lowp float;

varying vec4 vPosition;
varying vec4 vSrcPosition;

void main(){
    vec4 modelPosition = modelMatrix * vec4(position,1.0);

    vPosition = modelPosition;
    vSrcPosition = vec4(position,1.);

    gl_Position = projectionMatrix * viewMatrix * modelPosition;
}
`;