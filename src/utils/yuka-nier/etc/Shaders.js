const ProtectionShaderStr = {
  uniforms: {
    u_time: {
      value: 0.0,
    },
  },
  vertexShader: `
        varying vec2 vUv;
        void main(){
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `,
  fragmentShader: `
        varying vec2 vUv;
        uniform float u_time;

        const float lines = 10.0;
        const float linewidth = 0.25;
        const speed = 6.0;

        void main(){
            float p = abs(fract(speed * u_time - lines * uVu.y) * 2.0 - 1.0);
            float c = smoothstep(p,p + 0.01 ,linewidth);
            gl_FragColor = vec4(vec3(c),c);
        }

    `,
};

const HitShaderStr = {
  uniforms: {
    u_time: { value: 0.0 },
  },

  vertexShader: `
    varying vec2 vUv;

    void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);

    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform float u_time;

    const float speed = 3.;
    const float width = 0.05;
    const float border = 0.01;

    void main(){
        vec2 dist = vUv - vec2(0.5);// -0.5到0.5
        float l = length(dist);

        float f = fract(u_time * speed);
        float y = 0.1 + (f * 0.4);
        float w = sin(f) * width;

        float c = smoothstep(y - border,y,l) * (1. - smoothstep(y + w,y + w + border,l));
        gl_FragColor = vec4(c);
    }
  `,
};

const ParticleShaderStr = {
  uniforms: {
    map: { value: null },
  },

  vertexShader: `
    attribute float opacity;
    attribute float size;
    attribute float angle;
    attribute float t;

    varying float vAlpha;
    varying float vAngle;

    void main(){
        vAlpha = opacity * ( 1. - t);
        vAngle = angle * t;
        
        vec3 pos = position;
        pos.y += size * t * 0.03;// 高度值不断的增加

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
        gl_PointSize = size;
        
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    varying float vAngle;
    uniform sampler2D map;

    void main(){
        vec2 uv = gl_PointCoord;

        float c = cos(vAngle); // [-1,1]
        float s = sin(vAngle);// [-1,1]
        // c * (uv.x - 0.5) // [-0.5,0.5] * [-1,1]=>[-0.5,0.5] => x轴变换
        // + s * (uv.y - 0.5) // Y轴变换 [-0.5,0.5]
        // 两个值相交得=>[-1.,1]
        //  + 0.5 => [-0.5,1.5]
        uv = vec2(c * (uv.x - 0.5) + s * (uv.y - 0.5) + 0.5,c * (uv.y - 0.5) - s * (uv.x - 0.5) + 0.5);
        vec4 color = texture2D(map,uv);
        color.a *= vAlpha;

        gl_FragColor  = vec4(color);
    }
  `,
};

export { ParticleShaderStr, HitShaderStr, ProtectionShaderStr };
