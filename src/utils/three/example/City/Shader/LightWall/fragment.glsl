export default `
varying vec3 vPosition;
uniform float uHeight;

void main(){
    float gradMix = (vPosition.y + uHeight / 2.) / uHeight;
    gl_FragColor = vec4(1.,1.,0.,1.- gradMix);
}`;