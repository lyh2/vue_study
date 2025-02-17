export default `
precision lowp float;
uniform float uTime;
uniform float uScale;
varying vec2 vUv;

#define PI 3.14159265358436457899806452

// 随机函数
float random(vec2 st){
    return fract(sin(dot(st.xy,vec2(12.9898,78.233))) * 43758.5453123);
}

/**
旋转函数
*/
vec2 rotate(vec2 uv,float rotation,vec2 mid){
    return vec2(
        cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,
        cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y
    );
}
/**
噪声函数
*/
float noise(in vec2 _st){
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    float a = random(i);
    float b = random(i + vec2(1.,0.));
    float c = random(i + vec2(0.,1.));
    float d = random(i + vec2(1.,1.));

    vec2 u = f * f * (3. - 2. * f);

    return mix(a,b,u.x) + (c-a) * u.y * (1. - u.x) + (d - b) * u.x * u.y;
}

vec4 permute(vec4 x){
    return mod(((x * 34.) + 1.) * x,289.0);
}

vec2 fade(vec2 t){
    return t * t * t * (t * ( t * 6. - 15.) + 10.);
}

float cnoise(vec2 p){
    vec4 pi = floor(p.xyxy)+ vec4(0.,0.,1.,1.);
    vec4 pf = fract(p.xyxy) - vec4(0.,0.,1.,1.);

    pi = mod(pi, 289.);
    vec4 ix = pi.xzxz;
    vec4 iy = pi.yyww;
    vec4 fx = pf.xzxz;
    vec4 fy = pf.yyww;
    vec4 u = permute(permute(ix) + iy);
    vec4 gx = 2. + fract(ix * 0.0243902439) - 1.0;
    vec4 gy = abs(gx) - 0.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;

    vec2 g00 = vec2(gx.x,gy.x);
    vec2 g10 = vec2(gx.y,gy.y);
    vec2 g01 = vec2(gx.z,gy.z);
    vec2 g11 = vec2(gx.w,gy.w);
    vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00,g00),dot(g01,g01),dot(g10,g10),dot(g11,g11));
    g00 *= norm.x;
    g01 *= norm.y;
    g10 *= norm.z;
    g11 *= norm.w;

    float n00 = dot(g00,vec2(fx.x,fy.x));
    float n10 = dot(g10,vec2(fx.y,fy.y));
    float n01 = dot(g01,vec2(fx.z,fy.z));
    float n11 = dot(g11,vec2(fx.w,fy.w));

    vec2 fade_xy = fade(pf.xy);
    vec2 n_x = mix(vec2(n00,n01),vec2(n10,n11),fade_xy.x);
    float n_xy = mix(n_x.x,n_x.y,fade_xy.y);
    return 2.3 * n_xy;
}
void main(){
    // gl_FragColor = vec4(vUv,0.,1.);

    // gl_FragColor = vec4(vUv,1,1);

    // gl_FragColor = vec4(vUv.x,vUv.x,vUv.x,1.);

    // gl_FragColor = vec4(vUv.y,vUv.y,vUv.y,1.);

    // float strength  = 1. - vUv.y;

    // gl_FragColor = vec4(strength,strength,strength,1.);

    float strength = vUv.y * 10.;
    gl_FragColor = vec4(strength,strength,strength,1.);

    strength = mod(vUv.y * 10., 1.0);
    gl_FragColor = vec4(strength,strength,strength,1.);

    // 利用step(edge,x) 如果 x < dege 返回0.0， 否则返回1。
    strength = step(0.5,strength);
    gl_FragColor = vec4(strength,strength,strength,1.);

    // 条纹相加
    strength = step(0.8,mod(vUv.x * 10.,1.));
    strength += step(0.8,mod(vUv.y * 10.,1.));

    gl_FragColor = vec4(strength,strength,strength,1.);

    // 条纹相乘
    strength = step(0.5,mod(vUv.x * 10.,1.));
    strength *= step(0.8,mod(vUv.y * 10.,1.));

    gl_FragColor = vec4(strength,strength,strength,1.);

    // 相减
    float s = step(0.8,mod(vUv.x * 10.,1.0));
    s -= step(0.8,mod(vUv.y * 10.,1.0));
    gl_FragColor = vec4(s,s,s,1.);

    // 方块
    s = step(0.2,mod(vUv.x * 10.,1.0));
    s *= step(0.2,mod(vUv.y * 10.,1.0));
    gl_FragColor = vec4(s,s,s,1.);

    // T 型图
    float x = step(0.4,mod((vUv.x + uTime * 0.1) * 10.,1.0)) * step(0.8,mod(vUv.y * 10.,1.0));
    gl_FragColor = vec4(x,x,x,1.);

    float y = step(0.4,mod(vUv.x * 10.,1.0)) * step(0.8,mod(vUv.y * 10.0,1.0));
    s = x + y;
    gl_FragColor = vec4(s,s,s,1.);

    // 取绝对值
    s = abs(vUv.x - 0.5);
    gl_FragColor = vec4(s,s,s,1.);

    // 取2个值的最小值
    s = min(abs(vUv.x - 0.5),abs(vUv.y - 0.5));
    gl_FragColor = vec4(s,s,s,1.);

    // 取2个值的最大值
    s = max(abs(vUv.x - 0.5),abs(vUv.y - 0.5));
    gl_FragColor = vec4(s,s,s,1.);

    // step
    s = step(0.2,max(abs(vUv.x - 0.5),abs(vUv.y - 0.5)));
    gl_FragColor = vec4(s,s,s,1.);

    // 小正方
    s = 1. - step(0.2,max(abs(vUv.x - 0.5),abs(vUv.y - 0.5)));
    gl_FragColor = vec4(s,s,s,1.);

    // 取整
    s = floor(vUv.x * 10.) / 10.0;// x 轴扩大了10倍，
    gl_FragColor = vec4(s,s,s,1.);

    s = floor(vUv.y * 10.) / 10.0;
    gl_FragColor = vec4(s,s,s,1.);

    s = floor(vUv.x * 10.) / 10.0 * (floor(vUv.y * 10.0) / 10.0);
    gl_FragColor = vec4(s,s,s,1.);

    s = ceil(vUv.x * 10.) / 10. * ceil(vUv.y * 10.) / 10.0;
    gl_FragColor = vec4(s,s,s,1.);

    s = random(vUv * uTime);
    gl_FragColor = vec4(s,s,s,1.);

    s = ceil(vUv.x * 10.) / 10.0 * ceil(vUv.y * 10.0) / 10.0;
    s = random(vec2(s,s) );
    gl_FragColor = vec4(s,s,s,1.);

    // length
    s = length(vUv- vec2(0.5));
    gl_FragColor = vec4(s,s * s,s + s,1.);

    // distance 求两个向量的距离
    s = 1. - distance(vUv,vec2(0.5));
    gl_FragColor = vec4(s * s + s,s * s,s + s,1.);

    // 实现星星
    s = 0.35 / distance(vUv,vec2(0.5)) - 1.0;
    gl_FragColor = vec4(s,s,s,s);

    s = 0.35 / distance(vec2(vUv.x,(vUv.y - 0.5) * 5.0),vec2(0.5,0.5)) - 1.0;
    gl_FragColor = vec4(s,s,s,s);

    s = 0.35 / distance(vec2(vUv.x,(vUv.y - 0.5) * 5. + 0.5),vec2(0.5)) - 1.0;
    s += 0.15 / distance(vec2(vUv.y,(vUv.x - 0.5) * 5. + 0.5),vec2(0.5)) - 1.0;
    gl_FragColor = vec4(s * s + s,s * s ,s + s,s);

    // 旋转飞镖，旋转uv
    vec2 rotateUv = rotate(vUv,abs(sin(uTime * PI)),vec2(0.5));
    rotateUv = rotate(vUv,-uTime * 5.,vec2(0.5));
    s = 0.15 / distance(vec2(rotateUv.x,(rotateUv.y - 0.5) * 5. + 0.5),vec2(0.5)) - 1.0;
    s += 0.15 / distance(vec2(rotateUv.y,(rotateUv.x - 0.5) * 5. + 0.5),vec2(0.5)) - 1.0;

    gl_FragColor = vec4(s * s + s,s * s,s + s,s);

    // 30 小日本
    s = step(0.5,distance(vUv,vec2(0.5)) + 0.25);
    gl_FragColor = vec4(s * s + s,s,s,s);

    // 31 绘制圆
    s = 1. - step(0.5,distance(vUv,vec2(0.5)) + 0.25);
    gl_FragColor = vec4(s,s,s,s);

    // 32 圆环
    s = step(0.5,distance(vUv,vec2(0.5)) + 0.35);
    s *= (1. - step(0.5,distance(vUv,vec2(0.5))) + 0.25);
    gl_FragColor = vec4(s,s,s,1.);

    s = abs(distance(vUv,vec2(0.5)) -0.23);
    gl_FragColor = vec4(s,s,s,1.);

    // 35 打靶
    s = step(0.1,abs(distance(vUv ,vec2(0.5)) - 0.25));
    gl_FragColor = vec4(s,s,s,1.);


    s = 1. - step(0.1,abs(distance(vUv,vec2(0.5)) - 0.25));
    gl_FragColor = vec4(s,s,s,1.);

    // 37 波浪环
    vec2 wuv = vec2(vUv.x * uTime ,vUv.y + sin(vUv.x * 30.) * 0.1);
    s = 1. - step(0.01,abs(distance(wuv,vec2(0.5)) - 0.25));
    gl_FragColor = vec4(s * s + s,s * s,s + s,s);

    // 38 
    wuv = vec2(vUv.x + sin(vUv.y * 30.) * 0.1,vUv.y + sin(vUv.x * 30.) * 0.1);
    s = 1. - step(0.01,abs(distance(wuv,vec2(0.5)) - 0.25));
    gl_FragColor = vec4(s,s,s,1);

    // 39
    wuv = vec2(
        vUv.x + sin(vUv.y * 100.) * 0.1,
        vUv.y + sin(vUv.x * 100.) * 0.1
    );
    s = 1. - step(0.01, abs(distance(wuv,vec2(0.5)) - 0.25));
    gl_FragColor = vec4(s,s,s,1.);

    // 40 根据角度显示视图
    s = atan(vUv.x,vUv.y);
    gl_FragColor = vec4(s,s,s,1.);

    s = atan(vUv.x - 0.5, vUv.y - 0.5);
    s = (s + uTime)/ 6.28 ;
    gl_FragColor = vec4(s,s,s,1.);

    // 42 雷达扫描
    float alpha = 1. - step(0.5,distance(vUv,vec2(0.5)));
    float angle = atan(vUv.x - 0.5,vUv.y - 0.5);
    s = (angle * uTime) / 6.28;
    gl_FragColor = vec4(s,s,s,alpha);

    // 43 通过时间实现动态选择
    rotateUv = rotate(vUv,3.14 * 0.25,vec2(0.5));
    rotateUv = rotate(vUv,uTime * 5.,vec2(0.5));

    alpha = 1. - step(0.5,distance(vUv,vec2(0.5)));
    angle = atan(rotateUv.x - 0.5,rotateUv.y - 0.5);
    s = (angle + 3.14) / 6.28;
    gl_FragColor = vec4(s * s + s,s * s,s + s,alpha);

    // 44 万花筒
    angle = atan(vUv.x - 0.5,vUv.y - 0.5) / PI;
    s = mod(angle * 10. * uTime ,1.0);
    gl_FragColor = vec4(s,s,s,1.);

    // 45 光芒四射
    angle = atan(vUv.x - 0.5,vUv.y - 0.5) / ( 2. * PI) + uTime * 0.1;
    s = sin(angle * 100. );

    gl_FragColor = vec4(s,s,s,1.);

    // 46 噪声实现烟雾、波纹效果
    s = noise(vUv * 10. * sin(uTime));
    gl_FragColor = vec4(s * s * s,s + s,s * s ,1.);

    // 47 
    s = step(0.5,noise(vUv * 100.));
    gl_FragColor = vec4(s,s,s,1.);

    // 48 
    s = smoothstep(0.2,.8,noise(vUv * 100.));
    gl_FragColor = vec4(s ,s,s,1.);

    s = step(uScale * 0.1,cnoise(vUv * 10. + uTime));
    gl_FragColor = vec4(s,s,s,1.);

    s = abs(cnoise(vUv * 10.));
    gl_FragColor = vec4(s,s,s,1.);

    // 发光路径
    s = 1. - abs(cnoise(vUv * 10.));
    gl_FragColor = vec4(s,s,s,1.);


    // 波纹效果
    s = sin(cnoise(vUv * 10.) * 5. + uTime);
    gl_FragColor = vec4(s,s,s,1.);

    s = step(0.9,sin(cnoise(vUv * 10.) * 10. * uTime));
    gl_FragColor = vec4(s,s,s,1.);

    // 混合颜色
    vec3 purpleColor = vec3(1.,0.,1.);
    vec3 greenColor = vec3(0.,1.,0.);
    vec3 uvColor = vec3(vUv,1.);
    s = step(0.9,sin(cnoise(vUv * 10.)  * 10.* uTime));

    vec3 mixColor = mix(mix(greenColor,uvColor,1. - s),purpleColor,s);
    gl_FragColor = vec4(mixColor,1.);



































}
`;