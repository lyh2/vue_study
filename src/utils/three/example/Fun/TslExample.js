/**
 * 学习tsl 案例文件
 * tsl-texture 有案例案例需要学习
 * 
 */


import * as THREE from 'three/webgpu';
import * as THREEWEBGL from 'three';
import {  uniform, uv ,Fn,positionGeometry,positionLocal,mix,normalGeometry,select,normalLocal,time,mul,varying,float,vec3,Loop,pow,abs} from 'three/tsl';

import {BasePerspectiveCamera} from './Base';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SimplexNoise } from 'three/examples/jsm/Addons.js';

import {protozoa} from '../tsl-textures/protozoa';
import {dysonSphere} from '../tsl-textures/dyson-sphere';

import { OrbitControls } from 'three/examples/jsm/Addons.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { mx_noise_float } from 'three/src/nodes/TSL.js';

export class TslStudyTslTexture extends BasePerspectiveCamera{
    constructor(_options={}){
        super(_options); 
              
    }
    _init(){
        // js 父中已经调用，子类实现就行
        this._simplex = new SimplexNoise();
        this._tempV3 = new THREE.Vector3();
        this._initLights();
        this._createTsl(); 
    }
    _initLights(){
        const innerPointLight = new THREE.PointLight("#ffdefd",20);
        this._scene.add(innerPointLight);

        // 外部灯光
        const outLight = new THREE.SpotLight("#fffaaa",10,10,1.5,1,0.001);
        outLight.position.set(0,0,7);
        this._scene.add(outLight);


    }
    _createTsl(){
        let stationParams = {
            ... dysonSphere.defaults,
            scale:1,
            color:new THREE.Color("#ededed"),
            background:new THREE.Color("black"),
        }
        this.station = new THREE.Mesh(new THREE.TorusGeometry(2,0.2,20,100).scale(1,1,1.5),new THREE.MeshPhysicalNodeMaterial({
            colorNode:dysonSphere(stationParams)
        }));
        this._scene.add(this.station);

        // 克隆
        let station_1 = this.station.clone();
        station_1.rotation.x = Math.PI / 2;
        this.station.add(station_1);

        let station_2 = this.station.clone();
        station_2.rotation.y = Math.PI /2;
        this.station.add(station_2);

        this.blobParams = {
            ...protozoa.defaults,
            scale:1,
            fat:0.3,
            amount:0.5,
            background:new THREE.Color('azure'),
            seed:uniform(0)
        }

        let blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1,20),
        new THREE.MeshPhysicalNodeMaterial({colorNode:protozoa(this.blobParams).mul(2),roughness:0.6,
            metalness:3,
            transmission:1,
            thickness:5
        }));

        this._scene.add(blob);
        this.blobGeometry = blob.geometry;
        this.blopPosition = this.blobGeometry.getAttribute('position');
        this.blobGeometry.deleteAttribute('uv');
        this.blobGeometry=mergeVertices(this.blobGeometry);
        
        this.blobGeometry.computeVertexNormals();


    }
    _childAnimate(){
        const t = this._clock.getDelta();
        this.station.rotation.set(t,t,t);
        /**
         * 下面代码循环大多，太卡
         */
        for(let i =0;i < this.blopPosition.count;i++){
            this._tempV3.setLength(1);
            let length = 1 + 0.1 * this._simplex.noise(this._tempV3.x - this._tempV3.z + Math.sin(t / 1000),
        this._tempV3.y + this._tempV3.z + Math.cos(t ));
        this._tempV3.setLength(length);
        this.blopPosition.setXYZ(i,this._tempV3.x,this._tempV3.y,this._tempV3.z);
        this.blopPosition.needsUpdate = true;
        this.blobGeometry.computeVertexNormals();

        this.blobParams.seed.value = t;

        }
    }
    
}

/**
 * 噪声火球
 */
export class TslStudyFireBall{
    constructor(_options={}){
        this._options = _options;
        this._initShader();
        this._init();
    }

    _init(){
        this._scene = new THREE.Scene();
        this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,10000);
        this._perspectiveCamera.position.set(0,100,100);

        this._renderer = new THREEWEBGL.WebGLRenderer({antialias:true});
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._renderer.setAnimationLoop(this._animate.bind(this));
        this._options.dom.appendChild(this._renderer.domElement);

        this._clock = new THREE.Clock();

        // 创建几何体
        const geometry = new THREE.IcosahedronGeometry(50,4);
        this._uniforms ={
            uTime:{value:0},
            uTexture:{value:new THREE.TextureLoader().load('./texture/explosion.png')}
        };

        const material = new THREE.ShaderMaterial({
            uniforms:this._uniforms,
            vertexShader:this._vsShader,
            fragmentShader:this._fsShader,
        });
        const ball = new THREE.Mesh(geometry,material);
        this._scene.add(ball);

        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

    }

    _animate(){
        this._uniforms.uTime.value += this._clock.getDelta();
        this._renderer.render(this._scene,this._perspectiveCamera);
    }
    _windowResizeFun(params={}){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
    _initShader(){
        this._vsShader = `

            uniform float uTime;
            varying float vNoise;

            // 伪随机梯度函数
vec3 randomGradient(int hash) {
    int h = hash & 15;
    vec3 grad = vec3(
        (h < 8) ? 1.0 : -1.0,
        (h < 4 || (h == 12) || (h == 14)) ? 1.0 : -1.0,
        (h < 2 || h == 4 || h == 6 || h == 8 || h == 10 || h == 12 || h == 14) ? 1.0 : -1.0
    );
    return normalize(grad);
}

// 线性插值
float lerp(float a, float b, float t) {
    return a + t * (b - a);
}

// 平滑插值函数
float fade(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

	float turbulence( vec3 p ) {
		float t = -.5;

		for (float f = 1.0 ; f <= 10.0 ; f++ ){
		float power = pow( 2.0, f );
		t += abs( pnoise( vec3( power * p ), vec3(1.0) ) / power );
		}

		return t;
	}
// 3D 柏林噪声函数
float perlinNoise3D(vec3 p) {
    // 计算网格点
    vec3 i = floor(p);
    vec3 f = fract(p);

    // 获取随机梯度
    vec3 g000 = randomGradient(int(i.x) + int(i.y) * 57 + int(i.z) * 131);
    vec3 g001 = randomGradient(int(i.x) + int(i.y) * 57 + int(i.z + 1.0) * 131);
    vec3 g010 = randomGradient(int(i.x) + int(i.y + 1.0) * 57 + int(i.z) * 131);
    vec3 g011 = randomGradient(int(i.x) + int(i.y + 1.0) * 57 + int(i.z + 1.0) * 131);
    vec3 g100 = randomGradient(int(i.x + 1.0) + int(i.y) * 57 + int(i.z) * 131);
    vec3 g101 = randomGradient(int(i.x + 1.0) + int(i.y) * 57 + int(i.z + 1.0) * 131);
    vec3 g110 = randomGradient(int(i.x + 1.0) + int(i.y + 1.0) * 57 + int(i.z) * 131);
    vec3 g111 = randomGradient(int(i.x + 1.0) + int(i.y + 1.0) * 57 + int(i.z + 1.0) * 131);

    // 计算插值权重
    float u = fade(f.x);
    float v = fade(f.y);
    float w = fade(f.z);

    // 计算点积
    float n000 = dot(g000, f);
    float n100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
    float n010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
    float n110 = dot(g110, f - vec3(1.0, 1.0, 0.0));

    float n001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
    float n101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
    float n011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
    float n111 = dot(g111, f - vec3(1.0, 1.0, 1.0));

    // 三次插值
    float nx00 = lerp(n000, n100, u);
    float nx01 = lerp(n001, n101, u);
    float nx10 = lerp(n010, n110, u);
    float nx11 = lerp(n011, n111, u);

    float nxy0 = lerp(nx00, nx10, v);
    float nxy1 = lerp(nx01, nx11, v);

    return lerp(nxy0, nxy1, w);
}


            void main(){
                vNoise = 10. * -0.1 * (0.5 *  uTime);
                float b = 5. * perlinNoise3D(0.05 * position + vec3(200. * uTime));
                float displacement = -10. * vNoise + b;

                vec3 pos = position + normal * displacement;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
            }
        `;

        this._fsShader = `
            uniform sampler2D uTexture;

            varying float vNoise;

            float random(vec3 pt,float seed){
                vec3 scale = vec3(12.9898,78.233,151.7182);
                return fract(sin(dot(pt + seed,scale)) * 43758.5453 + seed);
            }

            void main(){
                float r = 0.01 * random(gl_FragCoord.xyz,0.0);
                vec2 uv = vec2(0,1.3 * vNoise + r);
                vec3 color = texture2D(uTexture,uv).rgb;
                gl_FragColor = vec4(color,1.);
            }
        `;
    }
}

/**
 * cube 变成 sphere
 */
export class TslCubeToSphere {
	constructor(_options={}){
		this._options = _options;

		this._init();
	}

	_init(){
		this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,2500);
		this._perspectiveCamera.position.set(0,1,4);

		this._scene = new THREE.Scene();
		this._scene.background = new THREE.Color(0x444488);

		const ambientLight = new THREE.AmbientLight(0xaaaaaa,0x333333);
		const light = new THREE.DirectionalLight(0xfffdcc,3);
		light.position.set(3,3,1);
		this._scene.add(ambientLight);
		this._scene.add(light);


		this._renderer = new THREE.WebGPURenderer({antialias:true});
		this._renderer.setPixelRatio(window.devicePixelRatio);
		this._renderer.setSize(window.innerWidth,window.innerHeight);
		this._renderer.setAnimationLoop(this._animate.bind(this));
		this._options.dom.appendChild(this._renderer.domElement);

		this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

		const geometry = new THREE.BoxGeometry(1,1,1,16,16,16);
		const material = new THREE.MeshStandardNodeMaterial({
			color:0xff0000,
			wireframe:false,
		});
		const mesh = new THREE.Mesh(geometry,material);
		this._scene.add(mesh);
		this._guiOptions = {
			delta:0
		};

		const deltaUniform = uniform(0);
		const toSpherize = Fn(({bOutputNormal})=>{
			const sphereNormal = positionGeometry.normalize();// positionGeometry 表示从attribute 中获取的几何体网格数据
			const pos = mix(positionGeometry,sphereNormal.mul(0.6),deltaUniform);
			const norm = mix(normalGeometry,sphereNormal,deltaUniform);
			return select(bOutputNormal,norm,pos);
		});

		material.positionNode = toSpherize({bOutputNormal:false});
		material.normalNode = toSpherize({bOutputNormal:true});

		this._gui = new GUI();
		this._gui.add(this._guiOptions,'delta',0,1).onChange(value=>{
			deltaUniform.value = value;
		});

		this._gui.add(material,'wireframe');
	}

	_animate(){
		this._renderer.render(this._scene,this._perspectiveCamera);
	}

	_windowResizeFun(){
		this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this._perspectiveCamera.updateProjectionMatrix();
		this._renderer.setSize(window.innerWidth, window.innerHeight);
	}
}
/**
 * 使用噪声
 */
export class TslUseNoise{
	constructor(_options={}){
		this._options = _options;

		this._init();
	}

	_init(){
		this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,200);
		this._perspectiveCamera.position.set(0,10,-4);

		this._scene = new THREE.Scene();
		this._scene.background = new THREE.Color(0x444488);

		
		const ambientLight = new THREE.AmbientLight(0xaaaaaa,0x333333);
		const light = new THREE.DirectionalLight(0xffccff,3);
		light.position.set(3,3,-10);
		this._scene.add(ambientLight);
		this._scene.add(light);

		const geometry = new THREE.IcosahedronGeometry(10,100);
		const material = new THREE.MeshStandardNodeMaterial({
			color:0xff0000,
		});
		const texture = new THREE.TextureLoader().load('./texture/explosion.png');
		

		this._guiOptions = {
			strength:0.361,
			scale:1.852,
			speed:1
		};

		const noiseStrength = uniform(this._guiOptions.strength);
		const noiseScale = uniform(this._guiOptions.scale);
		const noiseSpeed = uniform(this._guiOptions.speed);

		const vNoise = varying(float(10.0),'vNoise');
		const vPosition = varying(vec3());

		/**
		 * glsl 
		float turbulence(vec3 p){
			float t = -0.5;
			for(float f = 1.0; f <= 10.0;f++){
				float power = pow(2.0,f);
				t += abs(pnoise(vec3(power * p),vec3(1.0)) / power);
			}
				return t;
		}
		 */
		const turbulenceFunc = /*#__PURE__*/ Fn(([p_immutable]) => {
			const p = vec3(p_immutable).toVar();
			const t = float(-0.5).toVar();
		
			Loop(
			  { start: 1.0, end: 10.0, name: "f", type: "float", condition: "<=" },
			  ({ f }) => {
				const power = float(pow(2.0, f)).toVar();
				t.addAssign(
				  abs(mx_noise_float(vec3(power.mul(p)), vec3(1.0)).div(power))
				);
			  }
			);
		
			return t;
		  }).setLayout({
			name: "turbulenceFunc",
			type: "float",
			inputs: [{ name: "p", type: "vec3" }]
		  });
		
		
		/**
		 glsl 
		 void main(){ 
		 // add time to the noise parameters so it's animated
		   vNoise = 10.0 *  -.10 * turbulence( .5 * normal + uTime );
		   float b = 5.0 * pnoise( 0.05 * position + vec3( 2.0 * uTime ), vec3( 100.0 ) );
		   float displacement = - 10. * vNoise + b;

		   // move the position along the normal and transform it
		   vec3 pos = position + normal * displacement;

		   gl_Position = projectionMatrix * modelViewMatrix * vec4( pos, 1.0 );
		 }
		 */
		// 
		const modifyVNoise = Fn(()=>{
			vNoise.assign(turbulenceFunc(normalLocal.mul(0.5).add(time))); // there is error
		
		});
		const posFunc = Fn(() => {
			//modifyVNoise();
			vNoise.assign(turbulenceFunc(normalLocal.mul(0.5).add(time))); // there is error
		
			const b = mx_noise_float(
			  positionLocal.mul(noiseScale).add(vec3(2).mul(time.mul(noiseSpeed)))
			).toVar();
		
			//const displacement = vNoise.add(b).toVar();
		
			vPosition.assign(positionLocal);
		
			const pos = positionLocal.add(normalLocal.mul(2)).toVar();
		
			vNoise.assign(vNoise.mul(noiseStrength));
		
			return mix(positionLocal, pos, noiseStrength);
		  });
		
		material.positionNode = posFunc();
		console.log(material)
		const mesh = new THREE.Mesh(geometry,material);
		this._scene.add(mesh);
		 this._gui = new GUI();
		 this._gui.add(this._guiOptions,'strength',0,100).onChange(value=>{
			noiseStrength.value = value;
		 });
		 this._gui.add(this._guiOptions,'scale',1,20).onChange(value=>{
			noiseScale.value = value;
		 });
		 this._gui.add(this._guiOptions,'speed',0.3,30).onChange(value=>{
			noiseSpeed.value = value;
		 });


		this._renderer = new THREE.WebGPURenderer({antialias:true});
		this._renderer.setPixelRatio(window.devicePixelRatio);
		this._renderer.setSize(window.innerWidth,window.innerHeight);
		this._renderer.setAnimationLoop(this._animate.bind(this));
		this._options.dom.appendChild(this._renderer.domElement);

		this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

	}



	_animate(){
		this._renderer.render(this._scene,this._perspectiveCamera);
	}

	_windowResizeFun(){
		this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this._perspectiveCamera.updateProjectionMatrix();
		this._renderer.setSize(window.innerWidth,window.innerHeight);
	}
}

export class TslStudyLesson2 extends BasePerspectiveCamera{
    constructor(_options={}){
        super(_options);
    }

    _init(){
        //console.log("写代码");
    }

    _childAnimate(){
        //console.log('调用子类中的循环代码...');
    }
}

// 先看这个：https://niklever.com/getting-to-grips-with-threejs-shading-language-tsl/
