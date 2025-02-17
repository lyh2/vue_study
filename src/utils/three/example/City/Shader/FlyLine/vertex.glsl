export default `attribute float aSize; 
uniform float uTime;
uniform vec3 uColor;
uniform float uLength;

varying float vSize;

void main(){
    vec4 viewPosition = viewMatrix * modelMatrix * vec4(position,1.);
    gl_Position = projectionMatrix * viewPosition;

    vSize = (aSize - uTime); // gpu中每一个像素值返回都是
    if(vSize < 0.){
        vSize = vSize + uLength;
    }

    vSize = (vSize - 500.) * 0.1;
    gl_PointSize = - vSize / viewPosition.z;
}`;