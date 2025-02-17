
export default `
precision lowp float;
uniform float uWaresFrequency;
uniform float uScale;
uniform float uNoiseFrequency;
uniform float uNoiseScale;
uniform float uXzScale;
uniform float uTime;
uniform float uXspeed;
uniform float uZspeed;
uniform float uNoiseSpeed;

varying float vElevation;// 高度值传递给片元着色器

float random(vec2 st){
    return fract(sin(dot(st.xy,vec2(12.9898,78.123))) * 43758.5453123);
}
vec2 rotate(vec2 uv,float rotation,vec2 mid){
    return vec2(
        cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,
        cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) +mid.y
    );
}

float noise(in vec2 _st){
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    float a = random(i);
    float b = random(i + vec2(1.,0.));
    float c = random(i + vec2(0.,1.));
    float d = random(i + vec2(1.,1.));

    vec2 u = f * f * (3. - 2. * f);

    return mix(a,b,u.x) + (c - a) * u.y * ( 1. - u.x) + (d - b) * u.x * u.y;
}

vec4 permute(vec4 x){
    return mod(((x * 34.) + 1.) * x,289.);
}

vec2 fade(vec2 t){
    return t * t * t * (t * (t * 6. - 15.) + 10.);
}

float cnoise(vec2 p){
    vec4 pi = floor(p.xyxy) + vec4(0.,0.,1.,1.);
    vec4 pf = fract(p.xyxy) - vec4(0.,0.,1.,1.);
    pi = mod(pi,289.);
    vec4 ix = pi.xzxz;
    vec4 iy = pi.yyww;
    vec4 fx = pf.xzxz;
    vec4 fy = pf.yyww;

    vec4 i = permute(permute(ix) + iy);
    vec4 gx = 2. * fract(i * 0.02439) - 1.;
    vec4 gy = abs(gx)  -.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;
    vec2 g00 = vec2(gx.x,gy.x);
    vec2 g10 = vec2(gx.y ,gy.y);
    vec2 g01 = vec2(gx.z,gy.z);
    vec2 g11 = vec2(gx.w,gy.w);

    vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
    g00 *= norm.x;
    g01 *= norm.y;
    g10 *= norm.z;
    g11 *= norm.w;
    float n00 = dot(g00 ,vec2(fx.x,fy.x));
    float n10 = dot(g10 ,vec2(fx.y,fy.y));
    float n01 = dot(g01,vec2(fx.z,fy.z));
    float n11 = dot(g11,vec2(fx.w,fy.w));

    vec2 fade_xy = fade(pf.xy);
    vec2 n_x = mix(vec2(n00,n01),vec2(n10,n11),fade_xy.x);
    float n_xy = mix(n_x.x,n_x.y,fade_xy.y);
    return 2.3 * n_xy;

    
}

void main(){
    vec4 modelPosition = modelMatrix * vec4(position,1.);
    float elevation = sin(modelPosition.x * uWaresFrequency + uTime * uXspeed) * sin(modelPosition.z * uWaresFrequency * uXzScale + uTime * uZspeed);

    elevation += -abs(cnoise(vec2(modelPosition.xz * uNoiseFrequency + uTime * uNoiseSpeed))) * uNoiseScale;

    vElevation = elevation;
    elevation *= uScale;
    modelPosition.y += elevation;

    gl_Position = projectionMatrix * viewMatrix * modelPosition;
}

`;