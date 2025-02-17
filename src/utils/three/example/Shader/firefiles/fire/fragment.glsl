/**
火焰效果
*/

export default `
    void main(){
        float distanceToCenter = distance(gl_PointCoord,vec2(0.5)); // 计算每个火焰中心点到边缘的距离
        float strength = 0.05 / distanceToCenter - 0.1;
        gl_FragColor = vec4(1.,1.,1.,strength);
    }
`;