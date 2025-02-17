import * as THREE from "three";


export default function WallShaderMaterial(panorama){
    let point = panorama.point[0];
    let texture = new THREE.TextureLoader().load(point.panoramaUrl);
    texture.mapping = THREE.CubeReflectionMapping; // 立方体方式进行映射
    texture.flipY = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    let center = new THREE.Vector3(point.x / 100,point.z / 100,point.y / 100);
    return new THREE.ShaderMaterial({
        uniforms:{
            uPanorama:{value:texture},
            uCenter:{value:center}
        },
        vertexShader:`
        varying vec2 vUv;
        uniform vec3 uCenter;
        varying vec3 vPosition;
        void main(){
            vUv = uv;
            vec4 modelPosition = modelMatrix * vec4(position,1.);
            vPosition = modelPosition.xyz;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
        `,
        fragmentShader:`
            varying vec2 vUv;
            uniform samplerCube uPanorama;
            uniform vec3 uCenter;
            varying vec3 vPosition;
            const float PI = 3.14159265359;

            void main(){
                vec3 nPos = normalize(vPosition - uCenter);
                float theta = acos(nPos.y) / PI;
                float phi = 0.;
                phi = (atan(nPos.z ,nPos.x) + PI) / (2. * PI);
                phi += 0.75;
                vec4 pColor = textureCube(uPanorama,nPos);

                gl_FragColor = pColor;
                
            }
        `,
    })

}