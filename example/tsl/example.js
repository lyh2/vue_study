
import * as THREE from 'three/webgpu';
import * as THREEWEBGL from 'three';
import {  uniform, uv ,Fn,positionGeometry,positionLocal,mix,normalGeometry,select,normalLocal,time,mul,varying,float,vec3,Loop,pow,abs,mx_noise_float} from 'three/tsl';

import { OrbitControls } from '../../../three.js/examples/jsm/Addons.js';
import GUI from '../../../three.js/examples/jsm/libs/lil-gui.module.min.js';


export class TslUseNoise{
	constructor(_options={}){
		this._options = _options;

		this._init();
	}

	_init(){

        this._renderer = new THREE.WebGPURenderer({antialias:true});
		this._renderer.setPixelRatio(window.devicePixelRatio);
		this._renderer.setSize(window.innerWidth,window.innerHeight);
		//this._renderer.setAnimationLoop(this._animate.bind(this));
		this._options.dom.appendChild(this._renderer.domElement);

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
		let material = new THREE.MeshStandardNodeMaterial({
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

		const vNoise = varying(float());
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
		const noise_Func =  Fn(([p_immutable]) => {
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
			name: "noise_Func",
			type: "float",
			inputs: [{ name: "p", type: "vec3" }],
            outputs:[{name:'t',type:'float'}]
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
		
		material.positionNode = Fn(() => {
			const temp = noise_Func(positionLocal);
            
			vNoise.assign(temp); // 
		
			// const b = mx_noise_float(
			//   positionLocal.mul(noiseScale).add(vec3(2).mul(time.mul(noiseSpeed)))
			// ).toVar();
		
			//const displacement = vNoise.add(b).toVar();
		
			//vPosition.assign(positionLocal);
		
			//const pos = positionLocal.add(normalLocal.mul(2)).toVar();
		
			//vNoise.assign(vNoise.mul(noiseStrength));
		
			return positionLocal;//mix(positionLocal, pos, noiseStrength);
		  })();
		
		//material.positionNode = posFunc();
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


		
		this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

        this._animate();
	}



	_animate(){
        requestAnimationFrame(this._animate.bind(this));
		this._renderer.renderAsync(this._scene,this._perspectiveCamera);
	}

	_windowResizeFun(){
		this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this._perspectiveCamera.updateProjectionMatrix();
		this._renderer.setSize(window.innerWidth,window.innerHeight);
	}
}