export default `
uniform vec3 uColor;

void main(){
    float distanceToCenter = distance(gl_PointCoord,vec2(0.5) );
    float strength = distanceToCenter * 2.;
    strength = 1. - strength;// -1 到  1
    strength = pow (strength,1.5);
    gl_FragColor = vec4(uColor,strength);
}


`;