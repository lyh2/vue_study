export default `

precision lowp float;
varying vec2 vUv;
varying float vElevation;

uniform sampler2D uTexture;

void main(){

    // 根据UV 取出对应的颜色
    float height = vElevation + 0.05 * 20.;
    vec4 textureColor = texture2D(uTexture,vUv);
    textureColor.rgb *= height;

    gl_FragColor = textureColor;
}
`;