export default `
    uniform float uTime;
    uniform float repeatX;
    varying vec2 vUv;
    uniform sampler2D map;
    uniform  sampler2D  fireMap;
    uniform vec3 uColor;

    void main(){
        float offset = 0.09;
        vec4 finalColor = texture2D(map,vUv);
        float left = texture2D(map,vec2(vUv.x - offset,vUv.y)).r; // 这个值计算感觉是错误的
        float right = texture2D(map,vec2(vUv.x + offset,vUv.y)).g;
        float top = texture2D(map,vec2(vUv.x , offset + vUv.y)).b;
        float bottom = texture2D(map,vec2(vUv.x ,vUv.y - offset)).a;
        float result = left + right + top + bottom;
        result = result * ( 1. - finalColor.r);

        vec4 fireColor = texture2D(fireMap,vec2(vUv.x + cos(uTime),vUv.y - sin(uTime * 1.))) * result;

        gl_FragColor = fireColor + finalColor;
    }
`;