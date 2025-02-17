export default `
uniform vec3 uColor;
varying float vElevation;
precision highp float;
varying vec2 vUv;

uniform sampler2D uTexture;

void main(){
    float alpha = (vElevation + 0.1) + 0.8;

    gl_FragColor = vec4(uColor,alpha);
    gl_FragColor = vec4(uColor * alpha,1.);
    gl_FragColor = vec4(vUv,0.,1.);

    vec4 color = texture2D(uTexture,vUv);
    color.rgb *= alpha;

    gl_FragColor = color;
}

`;