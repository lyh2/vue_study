/**
顶点着色器
*/

export default `
    uniform vec3 viewVector;// 相机位置
    varying float opacity;// 传递给片元着色器的透明度

    void main(){
        // 对顶点法向量归一化
        vec3 nNormal = normalize(normal);

        // 对相机位置归一化
        vec3 nViewVec = normalize(viewVector);

        // 点击作为透明度
        opacity = dot(nNormal,nViewVec);

        // 反转
        opacity = 1 - opacity;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
    }
`;