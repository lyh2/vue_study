export default `
varying vec2 vUv;

uniform sampler2D uTexture;
uniform sampler2D uTexture_1;
uniform sampler2D uTexture_2;

varying float vImgIndex;
varying vec3 vColor;

void main(){
    vec4 color = texture2D(uTexture,gl_PointCoord);
    gl_FragColor = color;//vec4(gl_PointCoord,.6,1.);

}
`;