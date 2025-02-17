export default `

varying vec2 vUv;
varying vec3 vColor;
varying float vImgIndex;

 uniform sampler2D  uTexture;
 uniform sampler2D uTexture1;
 uniform sampler2D uTexture2;

 void main(){
    // 设置渐变圆
    float strength = distance(gl_PointCoord,vec2(0.5));
    strength *= 2.;
    strength = 1. - strength;
    //gl_FragColor = vec4(strength);

    // 圆形点
    strength = 1. - distance(gl_PointCoord,vec2(0.5) );
    strength = step(0.5,strength);
    //gl_FragColor = vec4(strength);

    // 根据纹理进行绘制
    vec4 textureColor = texture2D(uTexture,gl_PointCoord);
    //gl_FragColor = textureColor;

    if(vImgIndex == 0.){
        textureColor = texture2D(uTexture,gl_PointCoord);
    }else if(vImgIndex == 1.){
        textureColor = texture2D(uTexture1,gl_PointCoord);
    }else{
        textureColor = texture2D(uTexture2,gl_PointCoord);
    }
    //gl_FragColor = vec4(vColor,1.);
    gl_FragColor = vec4(vColor,textureColor.r);
    //gl_FragColor = vec4(mix(vColor,textureColor.rgb,textureColor.r),1.);
 }
`;