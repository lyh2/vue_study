export default `
precision mediump float;

varying vec2 vUv;
uniform float uScale;
uniform float uTime;
uniform float uSpeed;
uniform float uRatio;
uniform float uSaturation;
uniform float uRedness;
uniform float uBlueRatio;
uniform vec2 uPointer;

#define TwoPI  6.28318530718

vec2 hash(vec2 p){
    p = vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));
    return fract(sin(p) * 18.5453);
}

float smin(float angle,float b,float k){
    float h = clamp(0.5 + 0.5 * (b - angle) / k,0.,1.);
    return mix(b,angle,h) - k * h * (1. - h);
}

float rand(vec2 n){
    return fract(cos(dot(n,vec2(12.9898,4.1414))) * 43758.5453);
}

float noise(vec2 n){
    const vec2 d = vec2(0.,1.);
    vec2 b = floor(n),f = smoothstep(vec2(0.),vec2(1.),fract(n));
    return mix(mix(rand(b),rand(b + d.yx),f.x),mix(rand(b + d.xy),rand(b + d.yy),f.x),f.y);
}

float fbm(vec2 n){
    float total = 0.,amplitude = 0.4;
    for(int i = 0; i < 4; i ++){
        total += noise(n) * amplitude;
        n += n;
        amplitude *= 0.6;
    }
    return total;
}

vec3 hsv2rgb(vec3 c){
    vec4 k = vec4(1.,2. / 3.,1. / 3.,3.);
    vec3 p = abs(fract(c.xxx + k.xyz) * 6.  - k.www);
    return c.z * mix(k.xxx,clamp(p - k.xxx,0.,1.),c.y);
}

vec3 eye_pattern(vec2 uv,float tile_time,float pointer_angle,float pointer_distance){
    vec2 i_uv = floor(uv);
    vec2 f_uv = fract(uv);

    vec2 randomizer = vec2(0.);
    vec3 distance = vec3(1.);
    float angle = 0.;

    for(int y = -1;y <= 1;y++){
        for(int x = -1; x <= 1 ; x++){
            vec2 tile_offset = vec2(float(x),float(y));
            vec2 blick_tile_offset = tile_offset;
            vec2 o = hash(i_uv + tile_offset);
            tile_offset +=  (.5 + (.25 + pointer_distance) * sin(tile_time + TwoPI * o)) - f_uv;
            //tile_offset +=  f_uv;
            blick_tile_offset += (0.9 - f_uv);

            float dist = dot(tile_offset ,tile_offset);
            float old_min_dist = distance.x;
            distance.z = max(distance.x,max(distance.y,min(distance.z,dist)));
            distance.y = max(distance.x ,min(distance.y,dist));
            distance.x = min(distance.x,dist);

            if(old_min_dist > distance.x){
                angle = atan(tile_offset.x,tile_offset.y);
                randomizer = o;
            }
        }
    }

    distance = sqrt(distance);
    distance = sqrt(distance);
    float cell_shape = min(smin(distance.z,distance.y,.1) - distance.x,1.);
    float cell_radius = distance.x;

    float eye_radius = 2. * cell_radius - 0.5 * cell_shape;


    float redness_angle = angle * 2. + randomizer.y;
    float eye_ball_redness = fbm(vec2(redness_angle,cell_shape * 3.));
    eye_ball_redness *= pow(cell_radius ,1. / uRedness);
    eye_ball_redness *= randomizer.y;
    eye_ball_redness *= (1. - smoothstep(5.,6.6,redness_angle) - smoothstep(-4.3,-5.7,redness_angle));
    vec3 eye_ball_color = vec3(1.,1. - eye_ball_redness,1. - eye_ball_redness);

    float iris_color_1_hue = (1. - uBlueRatio) * pow(randomizer.x,3. - 2. * uBlueRatio) + uBlueRatio * pow(randomizer.x,1.3 - uBlueRatio);
    iris_color_1_hue = mix(0.07,.59,iris_color_1_hue);
    vec3 iris_color_1 = hsv2rgb(vec3(iris_color_1_hue,uSaturation,0.5 + iris_color_1_hue));
    vec3 iris_color_2 = hsv2rgb(vec3(0.67 * randomizer.x - 0.1 * randomizer.y ,0.5 ,0.1 + 0.2 * randomizer.y));

    float outer_color_noise = fbm(vec2(angle * 2. ,cell_radius));
    vec3 color = iris_color_1;
    color = mix(color,iris_color_2,outer_color_noise);

    vec3 iris_center_color = hsv2rgb(vec3(0.2 - 0.1 * randomizer.y , uSaturation,0.5));
    color  = mix(iris_center_color,color,smoothstep(0.05 + randomizer.y * 0.25,0.45,cell_radius - 0.2 * pointer_distance));

    float white_incertion_noise = smoothstep(0.4,1.,fbm(vec2(8. * angle,10. * cell_shape)));
    white_incertion_noise *= (0.9 + 0.5 * randomizer.x);
    color = mix(color,vec3(1.) ,white_incertion_noise);

    float dark_incertion_noise = smoothstep(0.5,1.,fbm(vec2(3. * angle,11. * cell_shape)));
    color = mix(color,vec3(0.),dark_incertion_noise);

    float pupil_shape = smoothstep(0.35,0.45,1.2 * eye_radius - pointer_distance);
    color = mix(vec3(0.),color,pupil_shape);

    color *= pow(smoothstep(1.,0.6,eye_radius),0.3);

    float outer_shape = smoothstep(0.9,1.,eye_radius);
    color = mix(color,eye_ball_color,outer_shape);
    float blick = smoothstep(1.6,0.2,eye_radius + 0.1 * randomizer.y * sin(0.003 * uTime * randomizer.x));
    blick *= smoothstep(0.5 - pointer_distance,0.6,eye_radius - 0.2 * randomizer.y);
    blick *= (1. - sin(angle + pointer_angle));
    blick = step(1.,blick);
    blick *= step(0.5,fbm(2. * uv + vec2(0.,0.0005 * uTime)));

    color -= 0.1 * pow(1. - cell_shape,6.);
    color -= 0.4 * pow(1. - cell_shape,100.);

    float round_shadow = - sin(angle + pointer_angle);
    round_shadow *= smoothstep(0.4,0.5,cell_radius);
    round_shadow = 0.13 * mix(0.,round_shadow,1. - smoothstep(0.1,0.2,pointer_distance));
    color += round_shadow;
    color = mix(color,vec3(1.),blick);
    return color;
}

void main(){
    vec2 uv = vUv;
    uv.x *= uRatio;
    vec2 _uv = (vUv - 0.5) / uScale + 0.5;
    _uv.x *= uRatio;

    float tile_floating_speed = 0.001 * uSpeed * uTime;
    vec2 point = uPointer ;
    point.x *= uRatio;
    point -= uv;
    float pointer_angle = atan(point.y,point.x);
    float pointer_distance = pow(1. - 0.5 * length(point),2.);
    pointer_distance *= 0.2;

    vec3 color = eye_pattern(_uv,tile_floating_speed,pointer_angle,pointer_distance);
    gl_FragColor = vec4(color,1.);
}
`;