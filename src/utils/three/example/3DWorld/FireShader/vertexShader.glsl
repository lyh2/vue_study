export default `
uniform float uRotation;
uniform vec2 uCenter;
varying vec2 vUv;
void main(){
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(0.,0.,0.,1.);
    vec2 scale;
    scale.x = length(vec3(modelMatrix[0].x,modelMatrix[0].y,modelMatrix[0].z));
    scale.y = length(vec3(modelMatrix[1].x,modelMatrix[1].y,modelMatrix[1].z));
    scale *= - mvPosition.z;

    vec2 alignedPosition = -(position.xy - (center - vec2(0.5))) * scale/mvPosition.z;
    vec2 rotatedPosition ;
    rotatedPosition.x = cos(uRotation) * alignedPosition.x - sin(uRotation) * alignedPosition.y;
    rotatedPosition,y = sin(uRotation) * alignedPosition.x + cos(uRotation) * alignedPosition.y;
    mvPosition.xy += rotatedPosition;
    gl_Position = projectionMatrix * mvPosition;
    gl_Position.z = -5.0;
}
`;