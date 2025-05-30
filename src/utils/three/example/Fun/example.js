import * as THREE from "three";
import { CSS2DRenderer,CSS2DObject, EffectComposer, GLTFLoader, MTLLoader, OutputPass, RenderPass, UnrealBloomPass, OBJLoader } from "three/examples/jsm/Addons.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Earcut } from "../../../../../../three.js/src/extras/Earcut";
import Delaunator from 'delaunator';
import { SimplifyModifier ,GeometryUtils} from "three/examples/jsm/Addons.js";
import {LoopSubdivision} from 'three-subdivide';
import { ConvexGeometry } from "three/examples/jsm/Addons.js";
import EventEmitter from "../../../EventEmitter";
import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import * as CameraUtils from "three/examples/jsm/Addons.js";
import { ParametricGeometries} from "three/examples/jsm/geometries/ParametricGeometries.js";
import {  ParametricGeometry} from "three/examples/jsm/geometries/ParametricGeometry.js";
import gsap from "gsap";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import Stats from "three/examples/jsm/libs/stats.module.js"
import { RGBELoader } from "three/examples/jsm/Addons.js";
import * as CANNON from 'cannon-es';
import { ConvexObjectBreaker } from "three/examples/jsm/Addons.js";
import { threeToSoloNavMesh } from "@recast-navigation/three";
import CannonDebugger from "cannon-es-debugger";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { createCannonShapeFromGeometry, makeKey, removeDuplicateVertices } from "../../../common";
import { ConvexHull } from "three/examples/jsm/Addons.js";

import { SimplexNoise } from "three/examples/jsm/Addons.js";// 原生的噪声库
/**
 * 壁炉火焰效果
 */
export class BiLuFire {
	constructor(_options={}){
		this._options = _options;
		this._width = window.innerWidth;
		this._height = window.innerHeight;
		this._gltfFile = "./gltf/fireplace9.glb";
		this._noiseFile = "./texture/noise_1_.jpg";
		this.loadAssets();
	}

	loadModel(){
		const loaderModel = new GLTFLoader();
		return new Promise((resolve)=>{
			loaderModel.load(this._gltfFile,gltf=>{
				resolve(gltf.scene);
			});
		});
	}
	loadNoise(){
		const textureLoader = new THREE.TextureLoader();
		return new Promise((resolve)=>{
			textureLoader.load(this._noiseFile,texture=>{
				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
				resolve(texture);
			});
		});
	}
	async loadAssets(){
		this.model = await this.loadModel();
		this.noiseTexture = await this.loadNoise();
		this.loadShaderCode();
		this.init();
	}

	init(){
		this.clock = new THREE.Clock();
		this.time = 0;
		this.deltaTime = 0;

		this.fireSpeed = 1;
		this.stylize = false;

		this.createScene();
		this.createFireplace();
		this.createFire();
		this.createAshes();
		this.createRenderer();
		this.createControls();
		this.createPostProcessing();
		this.createGUI();
		this.draw();
	}
	createScene(){
		this.scene = new THREE.Scene();
		this.bgrColor = 0x000000;
		this.perspectiveCamera = new THREE.PerspectiveCamera(75,this._width / this._height,0.1,1000);
		this.perspectiveCamera.position.set(0,10,10);
		this.scene.add(this.perspectiveCamera);
	}

	createFireplace(){
		//fireplace
		this.fireplace = this.model.getObjectByName("fireplace");
		const fireplaceMap = this.fireplace.material.map;// 平面原来的材质使用的纹理
		this.fireplaceMaterial = new THREE.ShaderMaterial({
			uniforms:{
				map:{value:fireplaceMap},
				ratioR:{value:0.0},
				ratioG:{value:1.0},
				ratioB:{value:0.0},
				gamma:{value:1},
			},
			vertexShader:this.basicVert,
			fragmentShader:this.rgbLightmapFrag
		});
		this.fireplace.material = this.fireplaceMaterial;

		// floor
		this.floor = this.model.getObjectByName('floor');
		const floorMap = this.floor.material.map;
		this.floorMaterial = this.fireplaceMaterial.clone();
		this.floorMaterial.uniforms.map.value = floorMap;
		this.floor.material = this.floorMaterial;

		this.scene.add(this.fireplace);
		this.scene.add(this.floor);
	}

	createFire(){
		this.fireMaterial = new THREE.ShaderMaterial({
			uniforms:{
				noiseMap:{value:this.noiseTexture},
				time:{value:0},
				opacity:{value:1},
				intensity:{value:1},
				stylizeRatio:{value:0.5},
				stylizeThreshold:{value:0.5},
				grayscale:{type:'b',value:false},
				details:{value:0.5},
			},
			side:THREE.DoubleSide,
			transparent:false,
			blending:THREE.AdditiveBlending,
			vertexShader:this.fireVert,
			fragmentShader:this.fireFrag,
		});
		this.fireGeometry = new THREE.CylinderGeometry(0.03,0.2,0.35,15,15,true,-Math.PI / 2,Math.PI);
		this.fireGeometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0,0.1,0));
		this.fire = new THREE.Mesh(this.fireGeometry,this.fireMaterial);
		this.fire.position.set(0.1,-0.1,0);
		this.fire.rotation.y = - Math.PI / 2;
		this.fireplace.add(this.fire);
	}

	createAshes(){
		this.ashesMaterial = new THREE.ShaderMaterial({
			uniforms:{
				noiseMap:{value:this.noiseTexture},
				intensity:{value:1},
				time:{value:0},
			},
			side:THREE.DoubleSide,
			transparent:false,
			blending:THREE.MultiplyBlending,
			vertexShader:this.fireVert,
			fragmentShader:this.ashesFrag,
		});
		this.ashesGeometry = new THREE.CylinderGeometry(0.15,0.15,0.4,15,15,true,-Math.PI/2,Math.PI);
		this.ashes = new THREE.Mesh(this.ashesGeometry,this.ashesMaterial);
		this.ashes.position.set(0.1,0.1,0);
		this.ashes.rotation.y = - Math.PI / 2;
		this.fireplace.add(this.ashes);
	}
	createRenderer(){
		this.renderer = new THREE.WebGLRenderer({
			antialias:true,
			preserveDrawingBuffer:true,
		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.toneMapping = THREE.LinearToneMapping;
		this.renderer.toneMappingExposure = 1;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.VSMShadowMap;
		this.renderer.localClippingEnabled = true;
		this._options.dom.appendChild(this.renderer.domElement);
	}

	createControls(){
		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
		this.orbitControls.minDistance = 0;
		this.orbitControls.maxDistance = 2000;
		this.orbitControls.enabled = true;
		this.orbitControls.maxPolarAngle = Math.PI / 2 -0.1;
		this.orbitControls.target = new THREE.Vector3(0,0.3,0);

	}



	createGUI(){
		this.gui = new GUI();
		this.gui.add(this,'fireSpeed',0.1,3).name("Speed");
		this.gui.add(this.fireMaterial.uniforms.opacity,'value',0,1).name("Opacity");
		this.gui.add(this.fireMaterial.uniforms.intensity,'value',0.5,1.5).name("Intensity");
		this.gui.add(this.fireMaterial.uniforms.details,'value',0,2).name("Details");
		this.gui.add(this.fireMaterial.uniforms.stylizeRatio,'value',0,1).name("Stylize Ratio");
		this.gui.add(this.fireMaterial.uniforms.stylizeThreshold,'value',0,1).name("Stylise Threshold");
		this.gui.add(this.fireMaterial.uniforms.grayscale,'value').name("Grayscale");
		this.gui.add(this.bloomPass,"strength",0,2).name("bloom");
	}

	createPostProcessing(){
		this.renderScene = new RenderPass(this.scene,this.perspectiveCamera);
		this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1024,1024),0.25,0.1,0.8);
		this.outputPass = new OutputPass();
		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(this.renderScene);
		this.composer.addPass(this.bloomPass);
		this.composer.addPass(this.outputPass);
	}
	draw(){
		this.deltaTime = this.clock.getDelta();
		this.time += this.deltaTime;
		this.composer.render();
		this.orbitControls.update();
		this.updateFire();
		this.updateLight();
		requestAnimationFrame(this.draw.bind(this));
	}
	updateFire(){
		this.fireMaterial.uniforms.time.value = this.time * this.fireSpeed;
		this.ashesMaterial.uniforms.time.value = this.time * this.fireSpeed;
	}

	updateLight(){
		const r = Math.abs(Math.sin(this.time) + Math.cos(this.time * 4 + 0.1) * 0.5) * 0.2;
		const g = Math.abs(Math.sin(this.time + Math.PI / 2) + Math.cos(this.time * 4 + 1.4) * 0.5) * 0.2;
		const b = Math.abs(Math.sin(this.time + Math.PI)) * 0.2;

		this.floorMaterial.uniforms.ratioR.value = 0.1 + r * 3;
		this.floorMaterial.uniforms.ratioG.value = 0.1 + g * 3;
		this.floorMaterial.uniforms.ratioB.value = 0.1 + b * 3;

		this.fireplaceMaterial.uniforms.ratioR.value = 0.0 + r * 1.5;
		this.fireplaceMaterial.uniforms.ratioG.value = 0.0 + g * 1.5;
		this.fireplaceMaterial.uniforms.ratioB.value = 0.0 + b * 1.5;
	}

	_windowResizeFun(){
		this._width = window.innerWidth;
		this._height = window.innerHeight;
		this.renderer.setSize(this._width,this._height);
		this.composer.setSize(this._width,this._height);
		this.perspectiveCamera.aspect = this._width / this._height;
		this.perspectiveCamera.updateProjectionMatrix();

		if(this.gui){
			if(this._width < 600) this.gui.close();
			else this.gui.open();
		}
	}
	loadShaderCode(){
		this.rgbLightmapFrag = `
			uniform sampler2D map;
			uniform float ratioR;
			uniform float ratioG;
			uniform float ratioB;
			uniform float gamma;
			varying vec2 vUv;

			void main(){
				vec4 tex = texture2D(map,vUv);
				float col = tex.r * ratioR + tex.g * ratioG + tex.b * ratioB;
				col = pow(col,gamma);
				gl_FragColor = linearToOutputTexel(vec4(col,col,col,1.));
			}
		`;
		this.basicVert = `
			precision highp float;
			varying vec2 vUv;
			void main(){
				vUv = uv;
				vec4 modelViewPosition = modelViewMatrix * vec4(position,1.0);
				gl_Position = projectionMatrix * modelViewPosition;
			}
		`;
		this.fireVert = `
			precision highp float;
			uniform sampler2D noiseMap;
			uniform float time;
			uniform float intensity;
			varying vec2 vUv;

			void main(){
				vUv = uv;
				vec4 noise = texture2D(noiseMap,vUv * 0.3 + vec2(0.,-time * 0.2));
				vec3 pos = position;
				pos.y *= intensity;

				vec3 displacement = vec3(0.,0.,0.);
				displacement.z += (-0.5 + noise.g) * 0.1 * vUv.y;
				displacement.y += (-0.5 + noise.r) * 0.2 * vUv.y;

				vec4 modelViewPosition = modelViewMatrix * vec4(pos + displacement,1.);
				gl_Position = projectionMatrix * modelViewPosition;
			}
		`;
		this.fireFrag = `
			uniform sampler2D noiseMap;
			uniform float time;
			uniform float opacity;
			uniform float stylizeRatio;
			uniform float stylizeThreshold;
			uniform float details;
			uniform bool grayscale;
			varying vec2 vUv;
			
			float makeBorders(vec2 uv,float top,float left,float bottom,float right,float gradient){
				float t = 1. - smoothstep(top,top + gradient,uv.y);
				float b = smoothstep(bottom - gradient,bottom,uv.y);
				float r = 1. - smoothstep(right,right + gradient,uv.x);
				float l = smoothstep(left - gradient,left,uv.x);
				return t * b * l * r;
			}
			void main(){
				vec4 noiseCol1 = texture2D(noiseMap,vUv * vec2(2.,2.) + vec2(0.,-time * 3.));
				vec4 noiseCol2 = texture2D(noiseMap,vUv * vec2(3.,1.) + vec2(0.,-time));
				vec4 noiseCol3 = texture2D(noiseMap,vUv * vec2(1.,1.) + vec2(0.,-time * 1.5));

				float flameHoles = noiseCol3.r * noiseCol3.g;
				flameHoles += pow(1. - vUv.y ,2.);
				flameHoles = smoothstep(0.30,0.6,flameHoles);

				float red = noiseCol1.r + noiseCol1.g * 0.5 + noiseCol1.b * 0.25;
				float green = noiseCol1.r * makeBorders(vUv,0.8,0.4,0.1,0.6,0.1);
				float blue = noiseCol1.r * makeBorders(vUv,0.6,0.5,0.1,0.5,0.1);

				vec4 flame = vec4(red,green,blue,1.);
				flame.r += (noiseCol2.r * noiseCol2.g * noiseCol2.b) * details;
				flame.g += (noiseCol2.r * noiseCol2.g * noiseCol2.b) * details;
				flame.b += (noiseCol2.r * noiseCol2.g * noiseCol2.b) * details;

				vec3 stylizedFlame = vec3(0.);
				stylizedFlame.r = step(stylizeThreshold,flame.r);
				stylizedFlame.g = step(stylizeThreshold,flame.g);
				stylizedFlame.b = step(stylizeThreshold,flame.b);

				flame.rgb = mix(flame.rgb,stylizedFlame,stylizeRatio);

				flame.rgb *= makeBorders(vUv,0.7,0.3,0.4,0.7,0.25) * opacity * flameHoles;

				if(grayscale){
					float flameValue = dot(flame.rgb,vec3(0.2,0.3,0.2));
					flame = vec4(flameValue,flameValue,flameValue,1.);
				}
					gl_FragColor = vec4(flame.rgb,1.);
			}
		`;
		this.ashesFrag = `
			uniform sampler2D noiseMap;
			uniform float time;
			varying vec2 vUv;

			void main(){
				vec4 noiseCol1 = texture2D(noiseMap,vUv * 2.2 + vec2(time * 0.1 ,- time * 0.9));
				vec4 noiseCol2 = texture2D(noiseMap,vUv * 3. + vec2(0.,-time * 1.6));
				float ashes = 1. - (noiseCol1.r * noiseCol2.g * noiseCol2.b);
				ashes += pow(vUv.y ,2.);
				ashes = smoothstep(0.65,0.75,ashes);
				gl_FragColor = vec4(ashes,ashes,ashes,1.);
			
			}

		`;
	}
}

/**
 * 绘制多边形,使用Earcut 进行三角剖分，同时使用three-subdivide 进行细分
 */
export class DrawPolygonUseEarcut{
	constructor(options={}){
		this.options = options;
		this.scene = null;
		this.perspectiveCamera = null;
		this.renderer = null;
		this.orbitControls = null;
		this.isDrawingLine = false;
		this.isMaxWidthMode = false;
		this.measurementLabels = {};
		this.lineId = 0;
		this.line = null;
		this.points =[];
		this.lines =[];
		this.deleteIcons =[];
		this.planels =[];
		this.polygons = [];
		this.polygonLabelsArray=[];
		this.shapeMeshs=[];
		this.distanceObjects = [];
		this.linesGroup = new THREE.Group();// 线段组
		this.linesGroup.name = '线段组';
		this.sprite = new THREE.TextureLoader().load('./ploygon/whiteDot.png');
		this.sprite.colorSpace = THREE.SRGBColorSpace;
		this.initMenu();
		this.init();
	}

	init(){
		let object = null;

		const ambientLight = new THREE.AmbientLight(0xffffff,2);
		const pointLight = new THREE.PointLight(0xffffff,1);
		this.raycaster = new THREE.Raycaster();
		this.cssRenderer2D =new  CSS2DRenderer();
		const axesHelper = new THREE.AxesHelper(100);
		

		this.perspectiveCamera= new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.1,1000);
		//this.perspectiveCamera.position.set(0,100,100);

		this.scene = new THREE.Scene();
		this.scene.add(ambientLight);
		this.scene.add(pointLight);
		pointLight.position.set(0,30,20);
		this.scene.add(axesHelper);
		this.scene.background = new THREE.Color(0xffffff);

		this.scene.add(this.linesGroup);

		this.renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		//this.renderer.setClearColor(0xffffff);
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.options.dom.appendChild(this.renderer.domElement);

		this.cssRenderer2D.setSize(window.innerWidth,window.innerHeight);
		this.cssRenderer2D.domElement.style.position = 'absolute';
		this.cssRenderer2D.domElement.style.top = '0px';
		this.cssRenderer2D.domElement.style.pointerEvents = 'none';

		this.options.dom.appendChild(this.cssRenderer2D.domElement);
		// 创建控制器
		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
		this.orbitControls.enablePan = false;
		this.orbitControls.autoRotate = false;
		this.orbitControls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
		this.orbitControls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
		
		this.orbitControls.addEventListener('change',event=>{
			if(event.key === 'Shift'){
				this.isShiftPressed = true;
			}

			if(event.key === 'Escape'){
				this.onDoubleClick(event);
			}
		});

		// 加载模型
		this.manager = new THREE.LoadingManager(this.loadModel.bind(this));
		const mtlLoader = new MTLLoader(this.manager);
		mtlLoader.load('./ploygon/Umkirch_338.mtl',(materials)=>{
			materials.preload();
			// 需要把对应的纹理也放在同一个目录中
			//console.log(materials);
			const loader = new OBJLoader(this.manager);
			loader.setMaterials(materials).load('./ploygon/Umkirch_338.obj',obj=>{
				this.object = obj;
				this.FitCameraToCenteredObject(obj);// 调整相机到模型对象
			},this.onProcess.bind(this),this.onError.bind(this));
		});

		document.addEventListener('pointerdown',this.onHandlePaning);
		document.addEventListener('keyup',event=>{
			if(event.key === 'Shift') this.isShiftPressed = false;
		});
		document.addEventListener('keydown',event=>{
			if(event.key === 'Shift'){
				this.isShiftPressed = true;
			}

			if(event.key === 'Escape'){
				this.onDoubleClick(event);
			}
		});
	}

	loadModel(){
		//console.log('执行到这里:',this.object);
		this.scene.add(this.object);
		// 添加事件监听
		//this.scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0xfff000})));

		this.options.dom.addEventListener('mousedown',this.onClick.bind(this));
		this.options.dom.addEventListener('pointerdown',this.onHandleClick);
		this.options.dom.addEventListener('mousemove',this.onMouseMove,false);
		this.options.dom.addEventListener('mouseup',this.onMouseUp,false);
		this.animate();
	}
	onProcess(e){
		//console.log('加载进度:',e);
	}
	onError(e){
		console.log('执行失败:',e);
	}

	onDoubleClick(e){

	}

	onHandlePaning(){

	}
	onClick(e){
		//console.log('按下事件:',e,this);
		if(this.polygons?.flat(2).length > 0){
			const intersectPoint = this.raycaster.intersectObjects(this.polygons?.flat(2),true);
		}
		// 不加延迟定时器
		this.handleMouseDownOnDocument(e);
	}

	handleMouseDownOnDocument(event){
		this.scene.remove(this.measurementLabels[this.lineId]);
		if(this.line){
			this.scene.remove(this.line);
			// 销毁数据
		}

		if(this.clickOccurred){
			this.clickOccurred = false;
			return;
		}

		const intersect = this.raycaster.intersectObjects(this.shapeMeshs,true);
		const deleteIntersect = this.raycaster.intersectObjects(this.deleteIcons,true);
		const planelsIntersect = this.raycaster.intersectObjects(this.planels,true);
		
		const intersects = this.getIntersectionsOnModel(event);
		console.log('与模型相交:',intersects,this.isDrawingLine);
		if(intersects.length > 0 && this.isDrawingLine == true){
			// 绘制线的状态
			const clickPoint = intersects[0].point;
			const surfaceNormal = intersects[0].face.normal;
			const offsetDistance = 0.1;
			const adjustedPoint = clickPoint.clone().add(surfaceNormal.clone().multiplyScalar(offsetDistance));
			const intersect = this.raycaster.intersectObjects(this.points,true);
			// 与已知的点位相交
			if(intersect.length > 0){

			}
			// 绘制点
			this.createSpherePointWithStroke(adjustedPoint,0.2,0xffffff);

		}
	}
	pointerdown(e){
		
	}
	onMouseMove(e){

	}
	onMouseUp(){

	}
	createSpherePointWithStroke(position,size,color){
		const pointMaterial = new THREE.MeshBasicMaterial({
			color:color,
			depthTest:false,
			transparent:true,
			opacity:1,
		});
		const sphereGeometry = new THREE.SphereGeometry(size,32,32);
		const sphere  = new THREE.Mesh(sphereGeometry,pointMaterial);
		sphere.position.copy(position);
		sphere.rotateX(30);
		sphere.userData={
			visible:true,
		};

		this.points.push(sphere); // 存储的是网格对象Mesh
		this.scene.add(sphere);
		sphere.name = 'point';

		// 绘制线
		this.updateLineGeometry();
	}

	updateLineGeometry(){
		// 清除全部线段
		this.linesGroup.clear();
		this.lines.splice(0,this.lines.length);
		this.lines = [];
		// 如果是拖拽情况
		if(this.isDragging){
			// 更新
			this.updatePointBetweenPoints(this.polygons);
		}

		if(this.ploygons?.length > 0){
			// 存在多边形
		}
		//console.log('this.points:',this.points)
		if(this.points?.length > 0){
			const tempPositionArray = this.points.map(mesh=>mesh.position); // 得到位置数据
			// 绘制线段
			if(this.points.length > 1){
				for(let i = 0; i < tempPositionArray.length - 1;i++){
					this.createLine(tempPositionArray[i],tempPositionArray[i + 1],true,tempPositionArray,this.polygons.length,tempPositionArray[tempPositionArray.length - 1]);
				}
			}
		}
	}
	/**
	 * 绘制线
	 * @param {*} pointBegin 
	 * @param {*} pointEnd 
	 * @param {*} closedLoop 
	 * @param {*} points 
	 * @param {*} ploygonIndex 
	 * @param {*} index 
	 * @param {*} point 
	 */
	createLine(pointBegin,pointEnd,closedLoop=false,inputPositions,polygonIndex,point){
		// 创建label 标签显示距离文字
		const distanceLabelDiv = this.createDiv();

		const geometry = new THREE.BufferGeometry();
		const positionsArray = new Float32Array(inputPositions.length * 3);

		for(let i =0; i < inputPositions.length;i++){
			positionsArray[i * 3] = inputPositions[i].x;
			positionsArray[i * 3 + 1] = inputPositions[i].y;
			positionsArray[i * 3 + 2] = inputPositions[i].z;
		}

		geometry.setAttribute('position',new THREE.BufferAttribute(positionsArray,3));

		const indexArray = [];
		// 是否循环
		if(closedLoop && inputPositions.length > 2){
			for(let i = 0; i < inputPositions.length;i++){
				indexArray.push(i,(i + 1) % inputPositions.length);
			}
			geometry.setIndex(indexArray);
			//console.log('this.polygonLabelsArray[polygonIndex]:',this.polygonLabelsArray,polygonIndex)
			// 显示面积和长度
			if(!this.polygonLabelsArray[polygonIndex]){
				this.createLabels(polygonIndex,inputPositions);
			}else{
				// 已经存在，更新数据
				const labels = this.polygonLabelsArray[polygonIndex];
				labels.areaLabel.innerText = `Area:${this.calculatePolygonArea(inputPositions).toFixed(2)} m2`;
				labels.perimeterLabel.innerText = `Perimeter:${this.calculatePolygonPerimeter(inputPositions).toFixed(2)} m`;
			}
			// 删掉指定索引的数据
			const removedShapeMesh  = this.shapeMeshs.splice(polygonIndex,1)[0];
			this.scene.remove(removedShapeMesh);

			// 创建整个绘制区域的形状-这种方式会出现点位交叉的情况，
			const points2d = inputPositions.map(v3=>{
				return new THREE.Vector2(v3.x,v3.z)
			});

			const shapePositions = new THREE.Shape(points2d);
			shapePositions.autoClose = true;

			const geometryShape = new THREE.ShapeGeometry(shapePositions);
			const pos  = geometryShape.attributes.position;
			const pointMap=[];
			for(let i  = 0; i < pos.count;i++){
				const p = new THREE.Vector2(pos.getX(i),pos.getY(i));
				let nearestDist = Infinity;
				let nearestIndex = 0;
				for(let j = 0; j < points2d.length;j++){
					const d = points2d[j].distanceTo(p);
					if(d < nearestDist){
						nearestDist = d;
						nearestIndex = j;
					}
				}

				pointMap.push(nearestIndex);
			}

			for(let i =0; i < pos.count;i++){
				pos.setZ(i,-inputPositions[ pos.count - 1 - i].y);
			}

			for(let i =0; i < pos.count;i++){
				pos.setZ(i,-inputPositions[pointMap[i]].y);
			}
			pos.needsUpdate = true;
			geometryShape.computeVertexNormals();
			// 设置顶点和索引数据
			//const modifier = new SimplifyModifier(); // 细分两次
			//const smoothGeometry = modifier.modify(geometryShape,200);
			const materialShape = new THREE.MeshBasicMaterial({
				color:0x22d94a,
				side:THREE.DoubleSide,
				transparent:true,
				opacity:0.2,
				depthTest:false,
				wireframe:true,
			});

			// 细分操作
			const iterations = 3;

			const params = {
				split:          true,       // optional, default: true
				uvSmooth:       false,      // optional, default: false
				preserveEdges:  true,      // optional, default: false
				flatOnly:       false,      // optional, default: false
				maxTriangles:   5000,   // optional, default: Infinity
			};
		
			
			const subDivisionGeometry = LoopSubdivision.modify(geometryShape, iterations, params);

			
			const shape = new THREE.Mesh(subDivisionGeometry,materialShape);
			shape.userData = {index:this.polygons.length - 1};
			shape.rotation.x = Math.PI * 0.5;
			shape.name = '绘制的多边形';
			this.scene.add(shape);
			//console.log('shape:',shape,this.shapeMeshs)

			// 下面使用挖洞技术
			const filterPoints = inputPositions;//.filter((current,index)=>index % 2 === 0); // 去掉一半的数据
			//const flatVertices = filterPoints?.map(vertex=>[vertex.x,vertex.z]).flat();// 展开全部数据，变成一个一维数组
			const flatVertices =[-36,11, 1,32, 28,0.129, -0.16,-22, -0.5,0.5, 0.5,0.5, 0.5,-0.5, -0.5,-0.5];
			const flatVertices_ =[-36,0.1,11, 1,0.1,32, 28,0.1,0.129, -0.16,0.1,-22, -0.5,0.1,0.5, 0.5,0.1,0.5, 0.5,0.1,-0.5, -0.5,0.1,-0.5];// 3D 原始数据
			const triangles = Earcut.triangulate (flatVertices,[[4]],2); // 挖洞的索引是一对数据开始，而不是数组的下标开始
			//console.log('triangles::',triangles)

			const geometry_ = new THREE.BufferGeometry();

			const vertices_ = new Float32Array( flatVertices_);

			geometry_.setIndex( triangles );
			geometry_.setAttribute( 'position', new THREE.BufferAttribute( vertices_, 3 ) );
			const subDivisionGeometry_ = LoopSubdivision.modify(geometry_, iterations, params);

			const material = new THREE.MeshBasicMaterial( { color: 0xff0000,wireframe:true } );
			const mesh = new THREE.Mesh( subDivisionGeometry_, material );
			this.scene.add(mesh);
			// 原始数据
			const srcDataArray = inputPositions.map(v=>[v.x,v.y,v.z]).flat();
			console.log(srcDataArray)
			this.shapeMeshs.push(shape);
			this.shapeMeshs.splice(polygonIndex,0,shape);
		}else{
			// 非循环
			this.scene.remove(this.shapeMeshs[polygonIndex]);
			this.scene.remove(this.distanceObjects[polygonIndex]);
			this.scene.remove(this.polygonLabelsArray[polygonIndex]);

			this.shapeMeshs.splice(polygonIndex,1);
			this.distanceObjects.splice(polygonIndex,1);
			this.polygonLabelsArray.splice(polygonIndex,1);

		}
		// 起点和终点存在
		if(pointEnd && pointBegin){
			const distance = pointBegin.distanceTo(pointEnd);
			const textDistance = pointBegin.distanceTo(closedLoop ? point : pointEnd); // 两个点之间的距离
			const direction = new THREE.Vector3().copy(pointEnd).sub(pointBegin);
			const cylinderMiddlePoint = new THREE.Vector3().copy(pointBegin).lerp(pointEnd,0.5);
			// 圆柱体
			const cylinderGeometry = new THREE.CylinderGeometry(0.07,0.07,distance,32);
			cylinderGeometry.rotateZ(-Math.PI * 0.5);
			cylinderGeometry.rotateY(-Math.PI  * 0.5);
			const material = new THREE.MeshBasicMaterial({
				color:0x22d94a,
				depthTest:false,
			});

			const line = new THREE.Line(cylinderGeometry,material);
			line.position.copy(cylinderMiddlePoint);
			line.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
			line.lookAt(pointEnd);

			//this.linesGroup.add(line);
			this.lines.push(line);

			if(polygonIndex % 2 === 0){
				distanceLabelDiv .innerText = `${textDistance.toFixed(2)} m`;

				const distanceLabelObject = new CSS2DObject(distanceLabelDiv);
				const middlePoint = new THREE.Vector3().copy(pointBegin).lerp(pointEnd,0.5);
				distanceLabelObject.position.copy(middlePoint);

				this.linesGroup.add(distanceLabelObject);
			}
		}
	}
	/**
	 * 创建lable
	 * @param {*} index 
	 * @param {*} inputPositions 
	 */
	createLabels(index,inputPositions){
		const labelDiv = this.createDiv();

		// 创建面积div
		const areaLabelDiv = document.createElement('div');
		areaLabelDiv.className = 'measeurementLabel';
		areaLabelDiv.innerText = `Area:${this.calculatePolygonArea(inputPositions).toFixed(2)} m²`; 
		// 创建长度div
		const perimeterLabelDiv = document.createElement('div');
		perimeterLabelDiv.className = 'measurementLabel';
		perimeterLabelDiv.style.fontWeight = 'bold';
		perimeterLabelDiv.innerText = `Perimeter:${this.calculatePolygonPerimeter(inputPositions).toFixed(2)} m`;

		labelDiv.appendChild(areaLabelDiv);
		labelDiv.appendChild(perimeterLabelDiv);

		// 找到中间点位
		const middlePoint = this.findMiddlePoint(inputPositions);
		const labelDivObject = new CSS2DObject(labelDiv);
		labelDivObject.position.set(middlePoint.x,middlePoint.y,middlePoint.z);
		this.distanceObjects.push(labelDivObject);
		this.scene.add(labelDivObject);

		if(!this.polygonLabelsArray[index]){
			this.polygonLabelsArray[index]={};
		}

		this.polygonLabelsArray[index] = {
			areaLabel:areaLabelDiv,
			perimeterLabel:perimeterLabelDiv,
			object:labelDivObject
		}
	}
	/**
	 * 找到中间点
	 * @param {*} inputPositions 
	 */
	findMiddlePoint(inputPositions){
		if(inputPositions.length === 0){
			console.log('没有点位...');
			return;
		}

		const sum = inputPositions.reduce((preValue,currentValue)=>({
			x:preValue.x + currentValue.x,
			y:preValue.y + currentValue.y,
			z:preValue.z + currentValue.z,
		}),{x:0,y:0,z:0});

		const average = {
			x:sum.x / inputPositions.length,
			y:sum.y / inputPositions.length,
			z:sum.z / inputPositions.length,
		}

		return average;
	}
	/**
	 * 计算长度
	 * @param {*} inputPositions 
	 */
	calculatePolygonPerimeter(inputPositions){
		let perimeter = 0;
		const n = inputPositions.length;

		for(let i = 0; i < n ;i++){
			const j = ( i + 1) % n; // 1/n,10%10
			perimeter += this.calculateDistance(inputPositions[i],inputPositions[j])
		}
		return perimeter;
	}
	calculateDistance(p1,p2){
		return p1.distanceTo(p2);
	}
	/**
	 * 计算面积
	 * @param {*} inputPositions 
	 */
	calculatePolygonArea(inputPositions){
		console.log('原始数据:',inputPositions)
		const filterPoints = inputPositions//.filter((current,index)=>index % 2 === 0); // 去掉一半的数据
		const flatVertices = filterPoints?.map(vertex=>[vertex.x,vertex.z]).flat();// 展开全部数据，变成一个一维数组
		console.log('过滤数据:',filterPoints);
		const triangles = Earcut.triangulate (flatVertices); // three.js 中的分割，只是单纯的连接三角形，没有真正的细分
		console.log('数据平铺展开:',flatVertices);
		console.log('三角划分:',triangles,flatVertices);
		// 使用Delaunator
		const delaunay = new Delaunator(flatVertices);
		//console.log('delaunay:',delaunay.triangles);
		let totalArea = 0;
		for(let i = 0; i < triangles.length;i+=3){
			const v0 = new THREE.Vector3(filterPoints[triangles[i]].x,filterPoints[triangles[i]].y,filterPoints[triangles[i]].z);
			const v1 = new THREE.Vector3(filterPoints[triangles[i + 1]].x,filterPoints[triangles[i + 1]].y,filterPoints[triangles[i + 1]].z);
			const v2 = new THREE.Vector3(filterPoints[triangles[i + 2]].x,filterPoints[triangles[i + 2]].y,filterPoints[triangles[i + 2]].z);
			totalArea += this.computeTriangleArea(v0,v1,v2);
		}
		return totalArea;
	}

	/**
	 * 计算三角形面积
	 * @param {*} v0 
	 * @param {*} v1 
	 * @param {*} v2 
	 */
	computeTriangleArea(v0,v1,v2){
		const e1 = v1.clone().sub(v0);
		const e2 = v2.clone().sub(v0);
		const crossProduct = e1.cross(e2);
		return crossProduct.length() /2;
	}
	updatePointBetweenPoints(ploygons){

	}
	createDiv(className='measeurementLabel'){
		const distanceLabel = document.createElement('div');
		distanceLabel.className = className;
		distanceLabel.style.fontWeight = "bold";
		distanceLabel.style.color="#fff";
		distanceLabel.style.borderRadius = "10px";
		distanceLabel.style.padding = "3px 7px";
		distanceLabel.style.background = "rgba(0,0,0,0.6)";
		distanceLabel.style.zIndex = "1000";

		return distanceLabel;
	}
	/**
	 * 与模型的交点
	 * @param {*} event 
	 */
	getIntersectionsOnModel(event){
		const {x,y} = this.getMouseXY(event);
		const mouse = new THREE.Vector2(x,y);
		this.raycaster.setFromCamera(mouse,this.perspectiveCamera);

		const intersects = this.raycaster.intersectObjects(this.object.children,true);
		return intersects;
	}
	getMouseXY(event){
		const rect = this.options.dom.getBoundingClientRect();
		//console.log('矩形尺寸:',rect)
		const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		return {x,y};
	}
	FitCameraToCenteredObject(obj){
		const boundingBox = new THREE.Box3();
		boundingBox.setFromObject(obj);
		const center = new THREE.Vector3();
		boundingBox.getCenter(center);
		const size = new THREE.Vector3();
		boundingBox.getSize(size);
		const maxSize = Math.max(size.x,size.y,size.z);
		const fov = this.perspectiveCamera.fov * (Math.PI / 180);
		const cameraZ = Math.abs(maxSize / 2 / Math.tan(fov/2));

		this.perspectiveCamera.position.copy(center);
		this.perspectiveCamera.position.z += cameraZ;

		this.perspectiveCamera.near = maxSize / 100;
		this.perspectiveCamera.far = maxSize * 3;

		this.perspectiveCamera.updateProjectionMatrix();
	}
	animate(){
		this.cssRenderer2D.render(this.scene,this.perspectiveCamera);
		this.renderer.render(this.scene,this.perspectiveCamera);
	}

	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth/ window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.cssRenderer2D .setSize(window.innerWidth,window.innerHeight);
	}
	/**
	 * 初始化菜单
	 */
	initMenu(){
		this.gui = new GUI();
		this.optionsMenu = {
			createLine:false,
			editLine:false,
		};

		this.gui.add(this.optionsMenu,'createLine').onChange(value=>{
			//console.log('createLine:',value);
			// 编辑line
			this.isDrawingLine = value;
				this.clickOccurred = value;
				this.optionsMenu.createLine = value;
		});
		this.gui.add(this.optionsMenu,'editLine').onChange(value=>{
			// 编辑line
		})
	}
}

/**
 * 通过3D坐标点绘制多边形
 */
export class DrawPolygonOfPoints3D{
	constructor(options={}){
		this.options = options;
		this.init();
	}

	init(){
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xEDF2FA);
		this.scene.add(new THREE.AmbientLight(0xffffff,1.2));
		this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,100);

		this.perspectiveCamera.position.set(0,40,40);

		this.renderer = new THREE.WebGLRenderer({antialias:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this.options.dom.appendChild(this.renderer.domElement);

		this.scene.add(new THREE.AxesHelper(100));
		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

		// 输出入3D坐标
		this.points3D = [
			new THREE.Vector3(-10,5,-14),
			new THREE.Vector3(10,8,-44),
			new THREE.Vector3(10,6,10),
			new THREE.Vector3(-10,4,10),
			new THREE.Vector3(0,0,0),

		];
		// 1、选区投影平面(XZ平面) 生成2D形状
		const points2d = this.points3D.map(v3 =>new THREE.Vector2(v3.x,v3.z));
		const shape = new THREE.Shape(points2d);
		shape.autoClose = true;// 形状自动闭合

		// 2、生成ShapeGeometry 默认在xy平面,就相当于竖着的多边形，现在需要把竖着的放置为横着
		const geometry = new THREE.ShapeGeometry(shape);
		const pos = geometry.attributes.position;// 得到生成的形状点位坐标值
		//console.log('生成形状的pos:',pos);

		// 3、还原 Z 轴高度值，但是还要修改Y的值，因为原来之前使用的是Z轴的值
		for(let i = 0; i < pos.count;i++){
			// 用最近点的Y值 赋给Z，我们创建的2D多边形使用的是XZ，生成3D多边形中变成了XY值，所有需要对Y和Z值进行交换
			const nearest = this.points3D.reduce((prev,curr)=>{
				//console.log('prev:',prev,curr);
				const tempV3 = new THREE.Vector3(pos.getX(i),0,pos.getY(i));
				return curr.distanceTo(tempV3) < prev.distanceTo(tempV3) ? curr : prev;
			},this.points3D[0]);// 此方法没有给定第二个参数，也就是初始值，所以循环就会少一层，第一个元素为初始值。否则最好使用循环
			//console.log('nearest:',nearest,pos.getY(i))
			pos.setZ(i,pos.getY(i));
			pos.setY(i,nearest.y); // 上一步生成的3D坐标Z轴为0，需要获取对应的Y值作为Z的值，【其实际就是原来的Z值】
		}
		// 3.1、 还原Z的值，这是第二种方法
		// for(let i =0; i < pos.count;i++){
		// 	let nearestDist = Infinity;// 无穷大
		// 	let nearestY = 0;
		// 	const px = pos.getX(i);
		// 	const pz = pos.getY(i);// 这里的Y值其实是Z值

		// 	for(const v3 of this.points3D){
		// 		const dist = Math.hypot(v3.x -px,v3.z - pz);
		// 		if(dist < nearestDist){
		// 			nearestDist = dist;
		// 			nearestY = v3.y;// 原始数据中的真正Y值
		// 		}
		// 	}
		// 	// 修改position中的Z值
		// 	pos.setY(i,nearestY);
		// 	pos.setZ(i,pz);
		// }
		//console.log('修改之后的pos:',pos)
		
		pos.needsUpdate = true;

		// 4、计算法线
		geometry.computeVertexNormals();

		// 5、创建材质
		const material = new THREE.MeshStandardMaterial({color:0x00ff00,side:THREE.DoubleSide,wireframe:true});
		const mesh = new THREE.Mesh(geometry,material);
		this.scene.add(mesh);

		// 2、直接使用convexGeometry 利用3D坐标生成凸多面体
		const tempConvexGeometry = new ConvexGeometry(this.points3D);
		material.color = new THREE.Color(0xfdcded);
		const convexMesh = new THREE.Mesh(tempConvexGeometry,material);
		//this.scene.add(convexMesh);

		// 使用下面的方法创建凸多边形
		this.createPolygon();
	}
	animate(){
		this.renderer.render(this.scene,this.perspectiveCamera);

	}
	/**********第一种方式，还未测试*************/
	/**
	 * 计算2D投影
	 * @param {*} point 
	 * @param {*} axis 
	 */
	projectTo2D(point,axis = 'xy'){
		if(axis === 'xy') return new THREE.Vector2(point.x,point.y);
		else if(axis === 'xz') return new THREE.Vector2(point.x,point.z);
		else return new THREE.Vector2(point.y,point.z);
	}
	/**
	 * 计算凸包检测(Graham Scan 方法)，也可以使用convexGeometry
	 */
	convexHull(){
		if(this.points3D.length < 3) return this.points3D;// 点位个数不满足创建凸多边形
		// 存在投影平面
		let normal = new THREE.Vector3();
		normal.crossVectors(this.points3D[1].clone().sub(this.points3D[0]),this.points3D[2].clone().sub(this.points3D[0])).normalize();

		let axis = Math.abs(normal.z) > Math.abs(normal.x) ? 'xy' :'xz';
		// 2D 投影
		let projected = this.points3D.map(p => ({original:p,projected:this.projectTo2D(p,axis)}));
		// 按X轴坐标排序
		projected.sort((a,b)=>a.projected.x - b.projected.x);

		let hull =[];

		function cross(o,a,b){
			return (a.projected.x - o.projected.x) * (b.projected.y - o.projected.y) - (a.projected.y - o.projected.y) * ( b.projected.x - o.projected.x);
		}

		// 构造下凸包
		for(let p of projected){
			while(hull.length >= 2 && cross(hull[hull.length - 2],hull[hull.length - 1],p) <= 0){
				hull.pop();
			}
			hull.push(p);
		}
		// 构造上凸包
		let upperHull =[];
		for(let i = projected.length - 1;i >= 0;i--){
			let p = projected[i];
			while(upperHull.length >= 2 && cross(upperHull[upperHull.length - 2],upperHull[upperHull.length - 1],p) <= 0){
				upperHull.pop();
			}
			upperHull.push(p);
		}

		// 移除重复点
		upperHull.pop();
		hull.pop();

		return hull.map(p=> p.original);
	}

	// 创建多边形
	createPolygon() {
		// points 存储3D坐标点的数组
		// 计算凸包
		const convexPoints = this.convexHull();
		/**
		const point = intersects[0].point;
		points.push(new THREE.Vector3(point.x, point.y, point.z));

		*/
		// 将点投影到一个平面
		// const normal = new THREE.Vector3(); // 得到平面的法向量
		// normal.copy(this.points[0]).sub(this.points[1]).cross(this.points[1].clone().sub(this.points[2])).normalize();

		// 计算投影到 2D 平面
		// const plane = new THREE.Plane();
		// plane.setFromNormalAndCoplanarPoint(normal, this.points[0]);
		// 把点位投影到平面
		//const projectedPoints = this.points.map(p => plane.projectPoint(p, new THREE.Vector3()));

		// 2D 坐标转换（XY 平面）
		//const shape = new THREE.Shape();
		// projectedPoints.forEach((p, i) => {
		// 	if (i === 0) shape.moveTo(p.x, p.y);
		// 	else shape.lineTo(p.x, p.y);
		// });

		// 使用凸多边形
		const shape = new THREE.Shape(convexPoints.map(p=> new THREE.Vector2(p.x,p.z)));
		// 生成多边形几何体
		const extrudeSettings = { depth: 0.01, bevelEnabled: false };
		const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
		const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
		const polygonMesh = new THREE.Mesh(geometry, material);

		// 设置多边形位置
		polygonMesh.position.set(0,convexPoints[0].y,0);
		this.scene.add(polygonMesh);

		// 清空点列表
		this.points3D.length = 0;
	}
	/*******第二种*********/

	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
}

/**
 * 嵌套场景动画案例
 */
const FILES ={
	// 资源url
	desertFile:"./model/desert33.glb",
	forestFile:'./model/forest33.glb',
	noiseFile:'./noise_1.jpg'
};
const ASSETS ={
	desertScene:'',
	forestScene:'',
	noiseMap:''
};

class Portal{
	constructor(plane){
		this.plane = plane;
		this._tempEffectIntensity = 1;
		this._tempEffectMultiplier = 1;
		this.time = 0;

		this.initShader();
		// 渲染目标
		this.renderTarget = new THREE.WebGLRenderTarget(2048,2048,{
			type:THREE.HalfFloatType
		});

		this.plane.material = new THREE.ShaderMaterial({
			uniforms:{
				map:{value:this.renderTarget.texture},
				noiseMap:{value:ASSETS.noiseMap},
				time:{value:0},
				effectIntensity:{value:this.effectIntensity},
				effectMultiplier:{value:this.effectMultiplier}
			},
			vertexShader:this.vertexShader,
			fragmentShader:this.fragmentShader,
		});

		this.corners = {
			bottomLeft:new THREE.Vector3(),
			bottomRight:new THREE.Vector3(),
			topLeft:new THREE.Vector3(),
		};

	}

	updateCorners(){
		const {min,max} = this.plane.geometry.boundingBox;
		this.plane.localToWorld(this.corners.bottomLeft.set(min.x,min.y,0));
		this.plane.localToWorld(this.corners.bottomRight.set(max.x,min.y,0));
		this.plane.localToWorld(this.corners.topLeft.set(min.x,max.y,0));
	}
	set effectIntensity(v){
		this._tempEffectIntensity = v;
		this.plane.material.uniforms.effectIntensity.value = v;
	}
	get effectIntensity(){
		return this._tempEffectIntensity;
	}

	set effectMultiplier(v){
		if(v == this._tempEffectMultiplier) return;
		this._tempEffectMultiplier = v;

		new TWEEN.Tween(this.plane.material.uniforms.effectMultiplier).to(v,1).easing(TWEEN.Easing.Linear.InOut);
	}
	get effectMultiplier(){
		return this._tempEffectMultiplier;
	}
	loop(deltaTime){
		this.time += deltaTime * this.effectMultiplier;
		this.plane.material.uniforms.time.value = this.time;
	}
	initShader(){
		this.vertexShader = `
			precision highp float;
			varying vec2 vUv;
			void main(){
				vUv = uv;
				vec4 modelViewPosition = modelViewMatrix * vec4(position,1.0);
				gl_Position = projectionMatrix * modelViewPosition;
			}
		`;

		this.fragmentShader = `
			#define PI 3.1415
			#define TAU 6.2832
			uniform sampler2D map;
			uniform sampler2D noiseMap;
			uniform float time;
			uniform float effectIntensity;
			uniform float effectMultiplier;
			varying vec2 vUv;

			void main(){
				// 移动UV中心点
				vec2 vUv2 = vUv - 0.5;
				// 得到每个点的角度
				float angle = atan(vUv2.y,vUv2.x);
				// 得到到每个点的距离
				float l = length(vUv2);
				float l2 = pow(l,0.5);

				// create a radial moving noise
				float u = angle * 2. / TAU + time * 0.1;
				float v = fract(l + time * 0.2);
				vec4 noise = texture2D(noiseMap,vec2(u,v));

				// create waves 
				float noiseDisp = noise.r * noise.g * 4. * effectMultiplier;
				float radialMask = l;
				float wavesCount = 5.0;
				float wavesSpeed = time * 5.;
				float pnt = sin(2. * l * PI * wavesCount + noiseDisp + wavesSpeed) * radialMask;

				// calculate displacement according to waves
				float dx = pnt * cos(angle);

				// normalize
				float dy = pnt * sin(angle);

				// sample texture and apply wave displacement
				vec4 color = texture2D(map,vUv + vec2(dx,dy) * l * 0.3 * effectIntensity * effectMultiplier);
				// lighten according to waves
				color *= 1. + pnt * 0.5 * effectIntensity;
				// highlights
				float highlight = smoothstep(0.,0.2,dx * dy);
				color += highlight * effectIntensity;

				// gradient greyscale at the borders
				float grey = dot(color.rgb,vec3(0.299,0.587,0.114));
				color.rgb = mix(color.rgb,vec3(grey),effectIntensity * l * effectMultiplier);

				// add redish color at the borders
				color.r += smoothstep(0.1,0.7,l) * 0.5 * effectIntensity;

				gl_FragColor = linearToOutputTexel(color);
			}
		`;
	}

}

class World extends EventEmitter{
	constructor(scene,name){
		super();
		this.scene = scene;
		this.name = name;
		this.perspectiveCamera = new THREE.PerspectiveCamera(60,window.innerWidth / window.innerHeight,0.01,100);
		this.perspectiveCamera.position.set(0,0,30);
		this.scene.add(this.perspectiveCamera);

		// 移动的时间
		this.transitionDuration = 1.5;
		this.processModel();
	}

	processModel(){
		this.holder = this.scene.getObjectByName("holder");
		this.portalPlane = this.scene.getObjectByName("portal");
		this.portal = new Portal(this.portalPlane);

		this.portalWorldStart = this.scene.getObjectByName('portalWorldStart');
		this.portalWorldEnd = this.scene.getObjectByName('portalWorldEnd');

		this.cameraTarget = new THREE.Object3D();
	}

	setTransitionTransforms(startObject,endObject){
		this.startPosition = startObject.position.clone();
		this.startScale = startObject.scale.clone();
		this.startQuaternion = startObject.quaternion.clone();

		this.endPosition = endObject.position.clone();
		this.endScale = endObject.scale.clone();
		this.endQuaternion = endObject.quaternion.clone();
	}

	reset(){
		this.holder.position.set(0,0,0);
		this.holder.scale.set(1,1,1);
		this.holder.quaternion.identity();
	}

	placeToStart(){
		this.holder.position.copy(this.startPosition);
		this.holder.scale.copy(this.startScale);
		this.holder.quaternion.copy(this.startQuaternion);
	}

	moveWorldToEnd(){
		const duration = this.transitionDuration;
		new TWEEN.Tween(this.holder.position).to(this.endPosition,duration).easing(TWEEN.Easing.Linear.In);
		new TWEEN.Tween(this.holder.scale).to(this.holder.endScale,duration).easing(TWEEN.Easing.Quartic.In);
		new TWEEN.Tween(this.holder.quaternion).to(this.endQuaternion,duration).easing(TWEEN.Easing.Quadratic.In);
	}

	moveWorldAndCameraToOrigin(){
		const duration = this.transitionDuration;
		new TWEEN.Tween(this.holder.position).to(new THREE.Vector3(0,0,0),duration).easing(TWEEN.Easing.Quintic.In);
		new TWEEN.Tween(this.holder.scale).to(new THREE.Vector3(1,1,1),duration).easing(TWEEN.Easing.Quintic.In);
		new TWEEN.Tween(this.holder.quaternion).to(new THREE.Quaternion(0,0,0,1),duration).easing(TWEEN.Easing.Quintic.In);

		new TWEEN.Tween(this.cameraTarget.position).to(new THREE.Vector3(0,0,0),duration).easing(TWEEN.Easing.Cubic.In);
		new TWEEN.Tween(this.perspectiveCamera.position).to(new THREE.Vector3(0,0,40),duration).easing(TWEEN.Easing.Cubic.In).onUpdate(()=>{
			this.perspectiveCamera.lookAt(this.perspectiveCamera.position);
		}).onComplete(()=>{
			this.emit('moveToOriginComplete');
		});
	}

	moveCameraToPortal(){
		const duration = this.transitionDuration;
		const dir = new THREE.Vector3();
		this.portalPlane.getWorldDirection(dir);
		const pos = new THREE.Vector3().copy(this.portalPlane.position.clone().add(dir.multiplyScalar(3)));

		new TWEEN.Tween(this.cameraTarget.position).to(this.portalWorldEnd.position,duration).easing(TWEEN.Easing.Circular.In);
		new TWEEN.Tween(this.perspectiveCamera.position).to(pos,duration).easing(TWEEN.Easing.Circular.In).onUpdate(()=>{
			this.perspectiveCamera.lookAt(this.cameraTarget.position);
		}).onComplete(()=>{
			this.emit('moveToPortalComplete');
			this.portal.effectIntensity = 1;
		});

	}
}
class App {
	constructor(options={}){
		this.options = options;
		this.init();
	}
	init(){
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();
		this.clock = new THREE.Clock();
		this.time = 0;
		this.deltaTime = 0;
		this.isInTransition = false;
		this.portalHover = false;
		this.loadAssets();// 加载资源
	}

	async loadAssets(){
		ASSETS.desertScene = await this.loadModel(FILES.desertFile);
		ASSETS.forestScene = await this.loadModel(FILES.forestFile);
		ASSETS.noiseMap = await this.loadTexture(FILES.noiseFile);

		this.initApp();
	}
	/**
	 * 加载模型
	 * @param {*} file 
	 */
	loadModel(file){
		const loaderModel = new GLTFLoader();
		return new Promise((resolve,reject)=>{
			loaderModel.load(file,gltf=>{
				resolve(gltf.scene);
			});
		});
	}
	loadTexture(file){
		const textureLoader = new THREE.TextureLoader();
		return new Promise((resolve,reject)=>{
			textureLoader.load(file,texture=>{
				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
				resolve(texture);
			});
		});
	}
	initApp(){
		// 
		this.createWorlds();
		this.createRenderer();
		this.createControls();
		this.createListeners();
		this.loop();
	}

	createWorlds(){
		this.desertWorld = new World(ASSETS.desertScene,'desert');
		this.forestWorld = new World(ASSETS.forestScene,'forest');
		this.desertWorld.on('moveToPortalComplete',()=>{
			this.onMoveToPortalComplete();
		});

		this.forestWorld.on('moveToPortalComplete',()=>{
			this.onMoveToPortalComplete();
		});

		this.desertWorld.on('moveToOriginComplete',()=>{
			this.onMoveToOriginComplete();
		});

		this.forestWorld.on('moveToOriginComplete',()=>{
			this.onMoveToOriginComplete();
		});

		this.currentWorld = this.forestWorld;
		this.otherWorld = this.desertWorld;

		this.desertWorld.setTransitionTransforms(this.forestWorld.portalWorldStart,this.forestWorld.portalWorldEnd);
		this.forestWorld.setTransitionTransforms(this.desertWorld.portalWorldStart,this.desertWorld.portalWorldEnd);

		this.otherWorld.placeToStart();
		this.currentWorld.reset();
	}

	switchWorlds(){
		const w = this.otherWorld;
		this.otherWorld = this.currentWorld;
		this.currentWorld = w;

		this.otherWorld.placeToStart();
		this.currentWorld.reset();

		this.onWindowResize();
	}

	moveCameraToPortal(){
		this.isInTransition = true;
		this.controls.enabled = false;
		this.currentWorld.moveCameraToPortal();
		this.otherWorld.moveWorldToEnd();
	}

	onMoveToPortalComplete(){
		this.switchWorlds();
		this.currentWorld.moveWorldAndCameraToOrigin();
	}

	onMoveToOriginComplete(){
		this.controls.object = this.currentWorld.perspectiveCamera;
		this.controls.target = this.currentWorld.cameraTarget.position;
		this.isInTransition = false;
		this.controls.enabled = true;
	}
	createRenderer(){
		this.renderer = new THREE.WebGLRenderer({
			alpha:true,
			antialias:true,
			preserveDrawingBuffer:true,
		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.toneMapping = THREE.CineonToneMapping;
		this.renderer.localClippingEnabled = true;
		this.options.dom.appendChild(this.renderer.domElement);
	}

	createControls(){
		this.controls = new OrbitControls(this.currentWorld.perspectiveCamera,this.renderer.domElement);
		this.controls.minDistance = 0;
		this.controls.maxDistance = 50;
		this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
		this.controls.enabled = true;
	}

	createListeners(){
		this.onWindowResize();
		document.addEventListener('mousemove',this.onMouseMove.bind(this),false);
		document.addEventListener('touchmove',this.onTouchMove.bind(this),false);
		document.addEventListener('mousedown',this.onMouseDown.bind(this),false);
	}

	loop(){
		this.deltaTime = this.clock.getDelta();
		this.time += this.deltaTime;

		this.currentWorld.portal.loop(this.deltaTime);

		this.render();

		if(this.controls && this.controls.enabled) this.controls.update();

		this.syncCameras();
		window.requestAnimationFrame(this.loop.bind(this));
	}

	render(){
		this.currentWorld.portal.updateCorners();
		const {bottomLeft,bottomRight,topLeft} = this.currentWorld.portal.corners;
		CameraUtils.frameCorners(this.otherWorld.camera,bottomLeft,bottomRight,topLeft,false);
		const currentRenderTarget = this.renderer.getRenderTarget();
		this.renderer.setRenderTarget(this.currentWorld.portal.renderTarget);
		this.renderer.render(this.otherWorld.scene,this.otherWorld.camera);
		this.renderer.setRenderTarget(currentRenderTarget);
		this.renderer.render(this.currentWorld.scene,this.currentWorld.perspectiveCamera);
	}

	syncCameras(){
		this.otherWorld.camera.position.copy(this.currentWorld.perspectiveCamera.position);
		this.otherWorld.camera.quaternion.copy(this.currentWorld.perspectiveCamera.quaternion);
		this.otherWorld.cameraTarget.position.copy(this.currentWorld.cameraTarget.position);

	}

	raycast(){
		this.raycaster.setFromCamera(this.mouse,this.currentWorld.perspectiveCamera);
		let intersects = this.raycaster.intersectObjects([this.currentWorld.portalPlane]);
		if(intersects.length > 0){
			this.currentWorld.portal.effectMultiplier = 2;
			this.portalHover = true;
		}else{
			this.currentWorld.portal.effectMultiplier = 1;
			this.portalHover = false;
		}
	}

	onWindowResize(){
		this.currentWorld.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.currentWorld.perspectiveCamera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
	onMouseDown(event){
		if(this.portalHover && !this.isInTransition) this.moveCameraToPortal();
	}

	onMouseMove(event){
		const x = (event.clientX / window.innerWidth) * 2 - 1;
		const y = -((event.clientY / window.innerHeight) * 2 - 1);

		this.updateMouse(x,y);
		this.raycast();
	}

	onTouchMove(event){
		if(event.touches.length == 1){
			event.preventDefault();
			const x = (event.touches[0].pageX / window.innerWidth) * 2 - 1;
			const y = -((event.touches[0].pageY / window.innerHeight) * 2 - 1);

			this.updateMouse(x,y);
			this.raycast();
		}
	}

	updateMouse(x,y){
		this.mouse.x = x;
		this.mouse.y = y;
	}
}
export class SceneInScene{
	constructor(options={}){
		this.options = options;
		this.init();
	}

	init(){
		this._app = new App(this.options);
	}
	

	_windowResizeFun(){
		this._app.onWindowResize();
	}
	
}
/**
 * 使用GeometryUtils，内部有均匀细分生成点位的方法
 */
export class UseGeometryUtils{
	constructor(options={}){
		this.options = options;
		this.initShader();
		this.init();
	}
	init(){
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x262335);

		this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,100);
		this.perspectiveCamera.position.set(0,30,30);

		this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.gamma = 2.2;
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this.options.dom.appendChild(this.renderer.domElement);


		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

		const subdivisions = 6;
		const recursion = 1;//recursion: 递归次数，控制曲线的细分程度（越大，生成的点越密集）

		//const points = GeometryUtils.hilbert3D( new THREE.Vector3( 0, 0, 0 ), 25.0, recursion, 0, 1, 2, 3, 4, 5, 6, 7 );
		const points = GeometryUtils.hilbert3D( new THREE.Vector3( 0, 0, 0 ), 25.0, recursion );
		const spline = new THREE.CatmullRomCurve3( points );
		//console.log('points:',points);
		const samples = spline.getPoints( points.length * subdivisions );
		const geometrySpline = new THREE.BufferGeometry().setFromPoints( samples );

		const line = new THREE.Line( geometrySpline, new THREE.LineDashedMaterial( { color: 0xffffff, dashSize: 2, gapSize: 0.5 } ) );
		line.computeLineDistances();
		this.scene.add( line );

		// 直接创建线
		const material = new THREE.LineBasicMaterial({
			color: 0x0000ff
		});
		
		const geometry = new THREE.BufferGeometry().setFromPoints( points );
		const tempLine = new THREE.Line( geometry, material );
		this.scene.add( tempLine );

		// 使用ParametricGeometry
		const tempParametricGeometry = new ParametricGeometry(ParametricGeometries.klein,25,25);
		const tempParametricMaterial = new THREE.MeshBasicMaterial({
			color:0x00ff,
		});
		const klein = new THREE.Mesh(tempParametricGeometry,tempParametricMaterial);
		this.scene.add(klein);

		// 实现跳动的鸡蛋
		this.artWork = null;
		this.eggGroup = new THREE.Group();
		this.eyeGroup = new THREE.Group();
		this.eyeFront = null;
		this.orbMesh = null;
		this.mouseX = this.mouseY = 0;
		this.isMouseMoved = false;
		this.isWitch = false;
		this.masterTL = null;

		this.windowRatio = window.innerWidth / window.innerHeight;
		this.isLandScape = this.windowRatio > 1 ? true : false;

		this.guiParams ={
			radius:16,
			pointsNum:20000,
		};

		const ambientLight = new THREE.HemisphereLight(0xddeeff,0x202020,5);
		const mainLight = new THREE.DirectionalLight(0x8a0a8a,16);
		mainLight.position.set(10,20,7);
		this.scene.add(ambientLight,mainLight);

		// this.createGeometries();
		// this.createMaterials();
		this.createMeshes();
		this.createOuterBigBall();

		this.startTimeline();

		this.addListener();
	}
	
	eggLathePoints(){
		let points =[];
		for(let deg = 0; deg <= 180;deg += 6){
			let rad = Math.PI * (deg / 180);// 得到弧度值
			let point = new THREE.Vector2((0.72 + 0.08 * Math.cos(rad)) * Math.sin(rad),-Math.cos(rad));
			points.push(point);
		}
		return points;
	}
	createGeometries(){
		function wavySurfaceGeometryFun(u,v,target){
			let x = 20 * (u - 0.5);
			let z = 20 * (v - 0.5);
			let y = 1.5 * ( Math.sin(x) * Math.cos(z));
			target.set(x,y,z);
		}
		const sphereGeometry = new THREE.SphereGeometry(1.5,20,20);
		const wavySurfaceGeometry =new ParametricGeometry(wavySurfaceGeometryFun,64,64);
		const eggGeometry = new THREE.LatheGeometry(this.eggLathePoints(),32);

		return {
			sphereGeometry,
			wavySurfaceGeometry,
			eggGeometry
		};
	}
	createMaterials(){
		const beige = new THREE.MeshStandardMaterial({
			color:0xc2c2ae,
			roughness:0.1,
			metalness:0.6,
			flatShading:true,
		});

		beige.color.convertSRGBToLinear();
		beige.side = THREE.DoubleSide;

		/**
		 * 鸡蛋壳
		 */
		const eggShell = new THREE.MeshStandardMaterial({
			color:0xf1b168,
			roughness:0.2,
			metalness:0.7,
			flatShading:true,
		}) ;
		eggShell.color.convertSRGBToLinear();

		const texture = new THREE.TextureLoader().load('./texture/textureEyePurple_256_optimized.jpg');
		const uniforms ={
			uTexture:{type:'t',value:texture},
		};
		//console.log('texture:',texture)
		const matcapEye  = new THREE.ShaderMaterial({
			uniforms:uniforms,
			vertexShader:this.vsMatcap,
			fragmentShader:this.fsMatcap
		});

		return {
			beige,
			eggShell,
			matcapEye
		}
	}
	/**
	 * 创建外面的最大球
	 * @returns 
	 */
	createOuterBigBall(){
		let radius = this.guiParams.radius;
		let instanceCount  = this.guiParams.pointsNum;

		let baseGeometry = new THREE.PlaneGeometry(0.6,0.6);
		let instancedGeometry = new THREE.InstancedBufferGeometry().copy(baseGeometry);
		instancedGeometry.instanceCount = instanceCount;

		let aPosition =[];
		for(let i =0; i < instanceCount;i++){
			let theta = THREE.MathUtils.randFloatSpread(360);// -180 到 180
			let phi = THREE.MathUtils.randFloatSpread(360);

			let x = radius * Math.sin(theta) * Math.cos(phi);
			let y = radius * Math.sin(theta) * Math.sin(phi);
			let z = radius * Math.cos(theta);

			aPosition.push(x,y,z);

		}
		let aPositionFloat32 = new Float32Array(aPosition);
		instancedGeometry.setAttribute('aPosition',new THREE.InstancedBufferAttribute(aPositionFloat32,3));

		let aColor = [];
		let colors = [
			new THREE.Color(0.25, 0, 1.0),
			new THREE.Color(0.8, 0, 1.0),
			new THREE.Color(0.5, 0.2, 1.0),
			new THREE.Color(1.0, 0.35, 0)
		];

		for(let i =0; i < instanceCount;i++){
			let color = colors[Math.floor(Math.random() * colors.length)];
			aColor.push(color.r,color.g,color.b);

		}

		let aColorFloat32 = new Float32Array(aColor);
		instancedGeometry.setAttribute('aColor',new THREE.InstancedBufferAttribute(aColorFloat32,3));
		let material = new THREE.ShaderMaterial({
			vertexShader:this.vsOrb,
			fragmentShader:this.fsOrb
		});

		return new THREE.Mesh(instancedGeometry,material);
	}
	createMeshes(){
		const geometries = this.createGeometries();
		const materials = this.createMaterials();
		// 波浪的鸡蛋盒
		const wavySurface = new THREE.Mesh(geometries.wavySurfaceGeometry,materials.beige);
		wavySurface.position.set(0,-0.1,0);

		const coords = [

			{ x: -1.5, y: 1, z: -6.25 },
			{ x: 1.625, y: 1, z: -3.125 },
			{ x: 5, y: 1, z: 0 },
			{ x: -7.5, y: 1, z: -6.5 },
			{ x: -4.625, y: 1, z: -3.125 },
			{ x: -1.5, y: 1, z: 0 },
			{ x: 1.775, y: 1, z: 3.125 },
			{ x: 4.75, y: 1, z: 6.25 },
			{ x: -7.75, y: 1, z: 0 },
			{ x: -4.625, y: 1, z: 3.125 },
			{ x: -1.5, y: 1, z: 6.25 }
			
		  ];
		const eye = new THREE.Mesh(geometries.sphereGeometry,materials.matcapEye);
		eye.scale.setScalar(1.2);
		
		this.eyeFront = eye.clone();
		this.eyeFront.rotation.set(-0.35 * Math.PI ,1.5 * Math.PI / 2,0);
		this.eyeFront.scale.setScalar(1.15);
		this.eyeFront.position.set(-7.7,30,6.5);
		// 创建一个鸡蛋
		const egg = new THREE.Mesh(geometries.eggGeometry,materials.eggShell);
		egg.scale.set(2.25,2.25,2.25);
		const eggMesh =[];
		const eyeMesh =[];
		for(let i = 0; i < coords.length;i++){
			eggMesh[i] = egg.clone();
			eggMesh[i].position.set(coords[i].x,coords[i].y,coords[i].z);
			this.eggGroup.add(eggMesh[i]);

			eyeMesh[i] = eye.clone();
			eyeMesh[i].position.set(coords[i].x,coords[i].y + 35,coords[i].z);
			this.eyeGroup.add(eyeMesh[i]);
		}

		let orb = this.createOuterBigBall();
		this.artWork = new THREE.Group();
		this.artWork.add(wavySurface,this.eyeFront,this.eggGroup,this.eyeGroup,orb);
		this.scene.add(this.artWork);
	}
	/**
	 * 实现跳动的鸡蛋
	 */
	initShader(){
		this.vsMatcap = `
			varying vec3 vNormal;

			void main(){
				vNormal = normal;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
			}
		`;

		this.fsMatcap = `
			precision mediump float;
			uniform sampler2D uTexture;

			varying vec3 vNormal;
			void main(){
				vec2 uv = normalize(vNormal).xy * 0.24 + 0.5;
				vec3 color = texture2D(uTexture,uv).rgb;
				gl_FragColor = vec4(color,1.0);
			}
		`;
		this.vsOrb = `
			attribute vec3 aColor;
			attribute vec3 aPosition;

			varying vec3 vColor;

			void main(){
				vColor = aColor;
				vec3 transformed = 0.1 * position * aPosition;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed,1.);
			}
		`;
		this.fsOrb = `
			varying vec3 vColor;
			void main(){
				gl_FragColor = vec4(vec3(vColor),1.);
			}
		`;
	}
	animate(){
		let valueX = this.mouseX * 7.0;
		let valueY = this.mouseY * 5.0;

		if(this.eyeGroup && this.isWitch && this.isMouseMoved){
			this.eyeGroup.children.map(item=>{
				item.rotation.set(Math.random() * valueX,Math.random() * valueY,Math.random() * (valueX + valueY));
			});
			this.eyeFront.rotation.set(1.5 * valueX,Math.PI / 4,1.5 * valueY);
		}

		if(this.artWork){
			this.artWork.rotation.y += 0.1 * (- this.mouseX * 0.35 - this.artWork.rotation.y);
			this.artWork.rotation.x += 0.05 * (- this.mouseY * 0.15 - this.artWork.rotation.x);
		}
		this.renderer.render(this.scene,this.perspectiveCamera);
	}
	addListener(){
		document.addEventListener('mousemove',this.onMouseMove,false);
		document.addEventListener('touchmove',this.onTouchMove,false);

	}
	onMouseMove(e){
		e.preventDefault();
		this.isMouseMoved = true;

		this.mouseX = (e.clientX / window.innerWidth) * 2 -1;
		this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
	}
	onTouchMove(e){
		this.isMouseMoved = true;
		let x = e.changedTouches[0].clientX;
		let y = e.changedTouches[0].clientY;

		this.mouseX = ( x /window.innerWidth) * 2 - 1;
		this.mouseY = (y / window.innerHeight) * 2 -1;
	}
	startAnimation(){
		this.isWitch = !this.isWitch;

	}

	startTimeline(){
		let bg1 = "linear-gradient(#633b73, #211b20) padding-box, linear-gradient(#211b20, #633b73) border-box";
		let bg2 = "linear-gradient(#6e5b4f, #302313) padding-box, linear-gradient(#302313, #6e5b4f) border-box";
		
		let eggsPositions = [];
		//console.log('gsap:',gsap);
		
		let eyesPositions = [];
		
		// get x, y, z position of every egg mesh
		for ( let i = 0; i < this.eggGroup.children.length; i++ ) {
		  
		  eggsPositions[i] = this.eggGroup.children[i].position;
		  
		}
		
		// get x, y, z position of every eye mesh
		for ( let i = 0; i < this.eyeGroup.children.length; i++ ) {
		  
		  eyesPositions[i] = this.eyeGroup.children[i].position;
		  
		}
		
		let masterTL = gsap.timeline({ paused: true });
		
		masterTL
		  .add("eggs")
		  .to(eggsPositions, { duration: 1.3, stagger: 0.25, y: 10, ease: "elastic" })
		  .to(this.eggGroup.position, 1.75, { y: 25, ease: "elastic.inOut" }, "eggs+=2.5")
		  .to(this.eyeFront.position, 0.8, { y: 1.1, ease: "bounce" }, "eggs+=3.6")
		  .to(eyesPositions, { duration: 0.8, stagger: 0.15, y: 1.1, ease: "bounce" })
		;
		
		masterTL.play();
		masterTL.reversed(true);
		  
		return masterTL;
	}
	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
}

/**
 * 发光效果，十分炫酷
 */
export class UseEffectComposer{
	constructor(options={}){
		this.options = options;
		this.init();
	}

	init(){
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x070204);
		
		this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,1000);
		this.perspectiveCamera.position.set(0,30,300);

		this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.options.dom.appendChild(this.renderer.domElement);
		this.renderer.setAnimationLoop(this.animate.bind(this));

		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

		// 使用Post-processing
		this.composer = new EffectComposer(this.renderer);
		const renderPass  = new RenderPass(this.scene,this.perspectiveCamera);
		this.composer.addPass(renderPass);
		const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth,window.innerHeight),2.,0.8,0.05);
		this.composer.addPass(bloomPass);
		// 创建几何体
		const coreGeometry = new THREE.IcosahedronGeometry(50,3);
		this.coreMaterial = new THREE.ShaderMaterial({
			uniforms:{
				uTime:{value:0,type:'f'},
				pulse:{value:0,type:'f'}
			},
			vertexShader:`
				uniform float uTime;
				uniform float pulse;
				varying vec3 vNormal;
				varying vec3 vPosition;

				void main(){
					vNormal = normal;
					vPosition = position;
					vec3 pos = position;
					float distort = sin(pos.x * 0.1 + uTime) + cos(pos.y * 0.1 + uTime) + sin(pos.z * 0.1 + uTime);
					pos += normal * distort * 10. * ( 1. + pulse);
					pos *= (1.5 + sin(uTime * 1.5) * 0.5);

					gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
				}
			`,
			fragmentShader:`
				uniform float uTime;
				uniform float pulse;
				varying vec3 vNormal;
				varying vec3 vPosition;

				void main(){
					vec3 color = vec3(
					sin(uTime * 1.5 + vNormal.x) * 0.5 + 0.5,
					cos(uTime * 2. + vNormal.y) * 0.5 + 0.5,
					sin(uTime * 2.5 + vNormal.z) * 0.5 + 0.5
					);

					float glow = 1. + pulse * 2. + sin(length(vPosition) * 0.1 + uTime);
					gl_FragColor = vec4(color * glow,0.9);
				}
			`,
			transparent:true,
			side:THREE.DoubleSide,
		});

		const core = new THREE.Mesh(coreGeometry,this.coreMaterial);
		this.scene.add(core);

		// Tentacle system
		const tentacleCount = 12;
		this.segments = 50;
		this.tentacles = [];

		for(let i =0; i < tentacleCount;i++){
			const radius = 2 - (i % 3) * 0.5;
			const tentacleGeometry = new THREE.TubeGeometry(
				new THREE.CatmullRomCurve3(
					Array.from({length:this.segments},(_,j)=>{
						const t = j / (this.segments - 1);
						const theta = (i / tentacleCount) * Math.PI * 2;
						const r = 60 + t * 100;
						return new THREE.Vector3(Math.cos(theta) * r,t * 200 - 100,Math.sin(theta) * r);
					})
				),
				this.segments,radius,8,false
			);

			const tentacleMaterial = new THREE.ShaderMaterial({
				uniforms:{
					uTime:{value:0},
					index:{value:i}
				},
				vertexShader:`
					uniform float uTime;
					uniform float index;
					varying vec3 vPosition;
					void main(){
						vec3 pos = position;
						float t = uTime + index * 0.3;
						pos.x += sin(pos.y * 0.05 + t) * 1.0;
						pos.z += cos(pos.y * 0.05 + t) * 10.;
						pos.y += sin(pos.x *0.1 + t * 1.5) * 5.;

						vPosition = pos;
						gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.);
					}
				`,
				fragmentShader:`
					uniform float uTime;
					uniform float index;
					varying vec3 vPosition;

					void main(){
						float glow = sin(time * 2. + index + vPosition.y * 0.05) * 0.5 + 0.5;
						vec3 color = vec3(0.2 + glow * 0.5,glow ,1. - glow * 0.8);
						gl_FragColor = vec4(color,0.85);
					}
				`,
				transparent:true,
				side:THREE.DoubleSide,
			});

			const tentacle  = new THREE.Mesh(tentacleGeometry,tentacleMaterial);
			this.scene.add(tentacle);
			this.tentacles.push(tentacle);
		}
		//console.log(this.tentacles,'查看几何体数据');
		const fieldGeometry = new THREE.TorusGeometry(150,30,16,64);
		this.fieldMaterial = new THREE.ShaderMaterial({
			uniforms:{uTime:{value:0}},
			vertexShader:`
				uniform float uTime;
				varying vec3 vPosition;

				void main(){
					vec3 pos = position;
					float wrap = sin(pos.x * 0.05 + uTime) + cos(pos.y * 0.05 + uTime);
					pos += normal * wrap * 20.;
					vPosition = pos;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
				}
			`,
			fragmentShader:`
				uniform float uTime;
				varying vec3 vPosition;
				void main(){
					float pulse = sin(uTime * 3. + length(vPosition) * 0.02) * 0.5 + 0.5; 
					gl_FragColor  = vec4(0.8,0.2,pulse,0.5);
				}
			`,
			transparent:true,
			side:THREE.DoubleSide,
		});
		const field = new THREE.Mesh(fieldGeometry,this.fieldMaterial);
		this.scene.add(field);

		this.time = 0;
		this.pulseTimer = 0;

	}
	animate(){
		this.time += 0.02;
		this.pulseTimer += 0.02;

		this.coreMaterial.uniforms.uTime.value = this.time;
		
		if(this.pulseTimer > 1.5){
			this.coreMaterial.uniforms.pulse.value = 1;
			this.pulseTimer = 0;
		}else{
			this.coreMaterial.uniforms.pulse.value *= 0.9;
		}
		this.tentacles.forEach(tentacle=>{
			tentacle.material.uniforms.uTime.value = this.time;
			const positions = tentacle.geometry.attributes.position.array;
			const curve = tentacle.geometry.parameters.path;
			const points = curve.getPoints(this.segments - 1);
			for(let j = 0; j < this.segments;j++){
				const t = this.time + tentacle.material.uniforms.index.value * 0.3;
				const base = points[j];
				const offsetX = Math.sin(base.y * 0.05 + t) * 10;
				const offsetZ = Math.cos(base.y * 0.05 + t) * 10;
				const offsetY = Math.sin(base.x + 0.1 + t * 1.5) * 5;
				positions[j * 3] = base.x + offsetX;
				positions[j * 3 + 1] = base.y + offsetY;
				positions[j * 3 + 2] = base.z + offsetZ;
			}

			tentacle.geometry.attributes.position.needsUpdate = true;
		});

		this.fieldMaterial.uniforms.uTime.value = this.time;
		this.composer.render();

	}

	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth , window.innerHeight);
	}
}

/**
 * 实现烟花效果
 * 
 */
export class FireWork{
	constructor(options={}){
		this.options = options;
		this.init();
	}
	init(){
		this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,100);
		this.perspectiveCamera.position.set(0,30,30);

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x262335);

		const ambientLight = new THREE.AmbientLight(0xffffff);
		this.scene.add(ambientLight);

		this.renderer = new THREE.WebGLRenderer({antialias:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this.options.dom.appendChild(this.renderer.domElement);

		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

		// 创建曲线
		const tempCurve3 = new THREE.CubicBezierCurve3(new THREE.Vector3(-30,0,0),new THREE.Vector3(-15,30,-20),new THREE.Vector3(15,45,25),new THREE.Vector3(35,0,0));
		const tempPoints = tempCurve3.getPoints(50);

		const tempGeometry = new THREE.BufferGeometry().setFromPoints(tempPoints);
		const tempMaterial = new THREE.LineBasicMaterial({color:0xff0000});
		const tempCurveObject = new THREE.Mesh(tempGeometry,tempMaterial);
		this.scene.add(tempCurveObject);

		//Create a closed wavey loop
		const curve = new THREE.CatmullRomCurve3( [
			new THREE.Vector3( -10, 0, 10 ),
			new THREE.Vector3( -5, 5, 5 ),
			new THREE.Vector3( 0, 0, 0 ),
			new THREE.Vector3( 5, -5, 5 ),
			new THREE.Vector3( 10, 0, 10 )
		] );

		const points = curve.getPoints( 50 );
		const geometry = new THREE.BufferGeometry().setFromPoints( points );

		const material = new THREE.LineBasicMaterial( { color: 0xff0 ,linewidth:4} );

		// Create the final object to add to the scene
		const curveObject = new THREE.Line( geometry, material );

		this.scene.add(curveObject)
	}

	animate(){
		this.renderer.render(this.scene,this.perspectiveCamera);
	}

	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
}

class BufferSim{
	constructor(renderer,width,height,material){
		this.renderer = renderer;
		this.width = width;
		this.height = height;
		this.material = material;

		// 创建一个场景
		this.orthoScene = new THREE.Scene();
		let fbo = new THREE.WebGLRenderTarget(width,height,{
			wrapS:THREE.ClampToEdgeWrapping,
			wrapT:THREE.ClampToEdgeWrapping,
			minFilter:THREE.LinearFilter,
			magFilter:THREE.LinearFilter,
			format:THREE.RGBAFormat,
			type:THREE.FloatType,
			stencilBuffer:false,
			depthBuffer:false,
		});
		fbo.texture.generateMipmaps = false;

		this.fbos = [fbo,fbo.clone()];
		this.current = 0;
		this.output = this.fbos[0];
		this.orthoCamera = new THREE.OrthographicCamera(width / -2,width/2,height / 2,height / -2,0.00001,1000);
		this.orthoQuad = new THREE.Mesh(new THREE.PlaneGeometry(width,height),this.material);
		this.orthoScene.add(this.orthoQuad);
	}

	render(){
		this.material.uniforms.inputTexture.value = this.fbos[this.current].texture;
		this.input = this.fbos[this.current];
		this.current = 1 - this.current;
		this.output = this.fbos[this.current];
		this.renderer.setRenderTarget(this.output);
		this.renderer.render(this.orthoScene,this.orthoCamera);
		this.renderer.setRenderTarget(null);
	}
}
/**
 * 实现画笔拖尾效果
 */
export class PenEffect{
	constructor(options={}){
		this.options = options;
		this.loadTexture();
	}
	loadTexture(){
		// 加载纹理
		const textureLoader =new THREE.TextureLoader();
		textureLoader.load('./texture/noise_1.jpg',texture=>{
			this.noiseTexture = texture;
			this.noiseTexture.wrapS = this.noiseTexture.wrapT = THREE.RepeatWrapping;
			this.init();
		});
	}
	init(){
		this.scene = new THREE.Scene();
		this.bgrColor = 0x332e2e;
		this.inkColor = 0x7beeff;
		this.fog = new THREE.Fog(this.bgrColor,13,20);
		this.scene.fog = this.fog;
		this.perspectiveCamera = new THREE.PerspectiveCamera(60,window.innerWidth / window.innerHeight,0.1,1000);
		this.perspectiveCamera.position.set(0,10,10);

		// hero param
		this.targetHeroUVPos = new THREE.Vector2(0.5,0.5);
		this.targetHeroAbsMousePos = new THREE.Vector2();
		this.targetHeroRotation = new THREE.Vector2();
		this.heroOldUVPos = new THREE.Vector2(0.5,0.5);
		this.heroNewUVPos = new THREE.Vector2(0.5,0.5);
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();
		this.isMouseDown = false;

		this.thickness = 0.004;
		this.pressure = 0;
		this.persistence = 0.98;
		this.gravity = 0.5;

		this.clock = new THREE.Clock();
		this.time = 0;
		this.deltaTime = 0;
		this.scene.add(new THREE.AxesHelper(100));
		// 创建渲染器
		this.createRenderer();
		this.createSim();
		this.createListeners();

		this.floorSize = 300;
		this.createHero();
		this.createFloor();

		this.createLight();

		this.createGUI();

		this.draw();
	}

	updateGame(){
		this.dt = this.clock .getDelta();
		this.time += this.dt;

		this.heroNewUVPos.lerp(this.targetHeroUVPos,this.dt * 5);
		this.hero.position.x = (this.heroNewUVPos.x - 0.5) * this.floorSize;
		this.hero.position.z = (0.5 - this.heroNewUVPos.y) * this.floorSize;

		this.heroSpeed = new THREE.Vector2().subVectors(this.heroNewUVPos,this.heroOldUVPos);
		this.targetHeroRotation.lerp(this.heroSpeed.clone().multiplyScalar(90),this.dt * 30);

		this.hero.rotation.z = this.targetHeroRotation.x;
		this.hero.rotation.x = this.targetHeroRotation.y;

		this.floorSimMaterial.uTime += this.dt;
		this.floorSimMaterial.uniforms.tipPosNew.value = this.heroNewUVPos;
		this.floorSimMaterial.uniforms.tipPosOld.value = this.heroOldUVPos;
		this.floorSimMaterial.uniforms.speed.value = this.heroSpeed.length();
		const r = Math.abs(Math.sin(this.time * 8.61 + 0.));
		const g = Math.abs(Math.sin(this.time * 0.43 + 2.09));
		const b = Math.abs(Math.sin(this.time * 0.36 + 4.18));
		const newCol = new THREE.Color(r,g,b);
		this.floorSimMaterial.uniforms.inkColor.value = newCol;
		this.floorSimMaterial.uniforms.uTime.value = this.time;
		this.floorSimMaterial.uniforms.persistence.value  = Math.pow(this.persistence,this.dt * 10);
		this.floorSimMaterial.uniforms.gravity.value = this.gravity * this.dt;

		if(this.isMouseDown && this.pressure < 0.02){
			this.pressure += this.dt * 0.02;
		}else if(!this.isMouseDown){
			this.pressure *= Math.pow(0.9,this.dt * 30);
		}

		this.floorSimMaterial.uniforms.thickness.value = this.thickness + this.pressure;

		this.hero.scale.y = 1. - this.pressure * 10;
		this.hero.scale.x = 1 + this.pressure * 40;
		this.hero.scale.z = 1. + this.pressure * 40;
		this.bufferSim.render();
		this.renderer.setRenderTarget(null);

		this.floor.material.uniforms.tScratches.value = this.bufferSim.output.texture;
		this.hero.material.color = newCol;
		this.heroOldUVPos = this.heroNewUVPos.clone();
	}
	draw(){
		this.updateGame();
		this.renderer.render(this.scene,this.perspectiveCamera);
		if(this.orbitControls) this.orbitControls.update();
		requestAnimationFrame(this.draw.bind(this));
	}
	createGUI(){
		const floorSimMatUniforms = this.floorSimMaterial.uniforms;
		this.gui = new GUI();
		this.gui.add(this,'persistence',0.8,0.999).name('Persistence');
		this.gui.add(this,'thickness',0.0003,1.).name('Thickness');
		this.gui.add(floorSimMatUniforms.waterQuantity,'value',.0,1.).name("Water Quantity");
		this.gui.add(floorSimMatUniforms.waterDiffusion,'value',0.01,1.).name('water diffusion');
		this.gui.add(this,'gravity',0,1).name('gravity');
	}
	createLight(){
		this.ambientLight = new THREE.AmbientLight(0xffffff);
		this.scene.add(this.ambientLight);

		this.light = new THREE.DirectionalLight(0xffffff,1);
		this.light.position.set(2,3,1);
		this.light.castShadow = true;
		this.light.shadow.mapSize.width = 512;
		this.light.shadow.mapSize.height = 512;
		this.light.shadow.camera.far = 12;
		this.light.shadow.camera.near  = 0.5;
		this.light.shadow.camera.left = -12;
		this.light.shadow.camera.right = 12;
		this.light.shadow.camera.bottom = -12;
		this.light.shadow.camera.top =12;
		this.scene.add(this.light);
	}
	createFloor(){
		this.floorVertexShader = `
			varying vec2 vUv;

			#include <common>
			#include <shadowmap_pars_vertex>
			#include <logdepthbuf_pars_vertex>

			void main(){
				#include <beginnormal_vertex>
				#include <defaultnormal_vertex>
				#include <begin_vertex>

				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);

				#include <logdepthbuf_vertex>
				#include <worldpos_vertex>
				#include <shadowmap_vertex>

			}
		`;

		this.floorFragmentShader = `
			uniform vec3 color;
			uniform sampler2D tScratches;
			varying vec2 vUv;

			#include <common>
			#include <packing>
			#include <lights_pars_begin>
			#include <shadowmap_pars_fragment>
			#include <shadowmask_pars_fragment>
			#include <logdepthbuf_pars_fragment>

			void main(){
				#include <logdepthbuf_fragment>
				vec3 col = color;
				vec4 scratchesCol = texture2D(tScratches,vUv);
				float inkValue = max(max(scratchesCol.r,scratchesCol.g),scratchesCol.b);
				col = mix(col,scratchesCol.rgb,inkValue);
				col.r = min(col.r,1.0);
				col.g = min(col.g,1.0);
				col.b = min(col.b,1.0);

				col.gb -= (1. - getShadowMask()) * 0.1;
				gl_FragColor = vec4(col,1.0);
				#include <tonemapping_fragment>
				#include <colorspace_fragment>
			}
		`;

		const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib['common'],THREE.UniformsLib['shadowmap'],THREE.UniformsLib['lights'],{
			color:{value:new THREE.Color(this.bgrColor)},
		}]);

		const geometry = new THREE.PlaneGeometry(this.floorSize,this.floorSize);
		const material = new THREE.ShaderMaterial({
			uniforms:{...uniforms,tScratches:{value:this.bufferSim.output.texture}},
			fragmentShader:this.floorFragmentShader,
			vertexShader:this.floorVertexShader,
			lights:true,
		});
		this.floor = new THREE.Mesh(geometry,material);
		this.floor.rotation.x = - Math.PI / 2;
		this.floor.receiveShadow = true;
		this.scene.add(this.floor);

	}
	createHero(){
		const geometry = new THREE.CylinderGeometry(0.05,0.2,1,16,1);
		geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
		geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0,0.5,0));// 向Y轴移动
		const material = new THREE.MeshStandardMaterial({
			color:this.inkColor,
			roughness:1
		});
		this.hero = new THREE.Mesh(geometry,material);
		this.hero.position.y = 0.2;
		this.hero.castShadow = true;
		this.scene.add(this.hero);
	}
	/**
	 * 创建事件监听
	 */
	createListeners(){
		document.addEventListener('mousemove',this.onMouseMove.bind(this),false);// 
		document.addEventListener('mousedown',this.onMouseDown.bind(this),false);
		document.addEventListener('mouseup',this.onMouseUp.bind(this),this);
		document.addEventListener('touchmove',this.onTouchMove.bind(this),false);
	}
	createSim(){
		this.simulationVertexShader = `
			precision highp float;

			uniform float uTime;
			varying vec2 vUv;

			void main(){
				vUv = uv;
				vec4 modelViewPosition = modelViewMatrix * vec4(position,1.0);
				gl_Position = projectionMatrix * modelViewPosition;
			}
		`;

		this.simulationFragmentShader=`
			uniform sampler2D inputTexture;
			uniform sampler2D noiseTexture;
			uniform vec2 tipPosOld;
			uniform vec2 tipPosNew;
			uniform float speed;
			uniform float persistence;
			uniform float thickness;
			uniform float uTime;
			uniform float waterQuantity;
			uniform float waterDiffusion;
			uniform float gravity;
			uniform vec3 inkColor;
			varying vec2 vUv;

			float lineSegment(vec2 p,vec2 a,vec2 b,float thickness){
			    vec2 pa = p - a;
				vec2 ba = b - a;
				float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
				float idk = length(pa - ba*h);
				idk = smoothstep(thickness, thickness * .5, idk);
				return idk;
			}
			vec4 blur(sampler2D image,vec2 uv,vec2 resolution,vec2 direction){
				vec4 color = vec4(0.);
				vec2 off1 = vec2(0.13846153846) * direction;
				vec2 off2 = vec2(0.032307692308) * direction;

				color += texture2D(image,uv) * 0.2270270270;
				color += texture2D(image,uv + vec2(off1 * resolution)) * 0.316;
				color += texture2D(image,uv - vec2(off1 * resolution)) * 0.316;
				color += texture2D(image,uv + vec2(off2 * resolution)) * 0.0702;
				color += texture2D(image,uv - vec2(off2 * resolution)) * 0.0702;

				return color;
			}
			void main(){
				vec4 noise1 = texture2D(noiseTexture,vUv * 4. + vec2(uTime * 0.1,0.));
				vec4 noise2 = texture2D(noiseTexture,vUv * 8. + vec2(0.,uTime * 0.1) + noise1.rg * 0.5);
				vec4 noise3 = texture2D(noiseTexture,vUv * 16. + vec2(-uTime * 0.2,0.) + noise2.rg * 0.5);
				vec4 noise = (noise1 + noise2 * 0.5 + noise3* 0.25) / 1.75;
				float dirX = (-0.5 + noise.g) * noise.r * 10.;
				float dirY = (-0.5 + noise.b) * noise.r * 10.;

				vec4 oldTexture = texture2D(inputTexture,vUv);
				float br = 1. + (oldTexture.r + oldTexture.g + oldTexture.b) / 3.0;
				vec4 col = oldTexture * ( 1.0 - waterDiffusion);
				float p2 = waterDiffusion / 4.;
				vec2 stretchUv = vUv * vec2(1.,1. + gravity);
				col += blur(inputTexture,stretchUv,vec2(waterQuantity * br),vec2(dirX,dirY)) * p2;
				col += blur(inputTexture,stretchUv,vec2(waterQuantity * br),vec2(dirY,dirX)) * p2;
				col += blur(inputTexture,stretchUv,vec2(waterQuantity * br),vec2(-dirX,-dirY)) * p2;
				col += blur(inputTexture,stretchUv,vec2(waterQuantity * br),vec2(-dirX,-dirY)) * p2;

				col.rgb *= persistence;

				if(speed > 0.){
					float lineValue = 0.;
					float th = clamp(thickness + speed * 0.3 ,0.0001,0.1);
					lineValue = lineSegment(vUv,tipPosOld,tipPosNew,th);
					col.rgb = mix(col.rgb,inkColor,lineValue);
					col.rgb  = clamp(col.rgb,vec3(0.),vec3(1.));
				}
				gl_FragColor = col;
			}
		`;

		this.floorSimMaterial = new THREE.ShaderMaterial({
			uniforms:{
				inputTexture:{value:null,type:'t'},
				noiseTexture:{value:this.noiseTexture,type:'t'},
				persistence:{value:this.persistence},
				thickness:{value:this.thickness},
				waterDiffusion:{value:1},
				waterQuantity:{value:0.3},
				gravity:{value:this.gravity},
				uTime:{value:0},
				tipPosOld:{value:new THREE.Vector2(0.5,0.5)},
				tipPosNew:{value:new THREE.Vector2(0.5,0.5)},
				speed:{value:0},
				inkColor:{value:new THREE.Color(this.inkColor)},

			},
			vertexShader:this.simulationVertexShader,
			fragmentShader:this.simulationFragmentShader
		});
		this.bufferSim = new BufferSim(this.renderer,1024,1024,this.floorSimMaterial);
	}
	createRenderer(){
		this.renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
		this.renderer.setClearColor(new THREE.Color(this.bgrColor));
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.toneMapping = THREE.LinearToneMapping;
		this.renderer.toneMappingExposure = 1;
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.VSMShadowMap;
		this.renderer.localClippingEnabled = true;
		this.options.dom.appendChild(this.renderer.domElement);
	}
	onMouseDown(event){
		this.isMouseDown = true;
	}
	onMouseUp(event){
		this.isMouseDown = false;
	}
	onMouseMove(event){
		const x = event.clientX / window.innerWidth * 2 - 1;
		const y = - (event.clientY / window.innerHeight * 2 - 1);
		this.mouse.x = x;
		this.mouse.y = y;

		if(this.floor) this.raycast();
	}
	onTouchMove(event){
		if(event.touches.length == 1){
			event.preventDefault();
			const x = event.touches[0].pageX / window.innerWidth * 2 - 1;
			const y = -(event.touches[0].pageY / window.innerHeight * 2 -1);
			this.mouse.x = x;
			this.mouse.y = y;
			if(this.floor) this.raycast();
		}
	}
	raycast(){
		this.raycaster.setFromCamera(this.mouse,this.perspectiveCamera);
		let intersects = this.raycaster.intersectObjects([this.floor]);

		if(intersects.length > 0){
			this.targetHeroUVPos.x = intersects[0].uv.x;
			this.targetHeroUVPos.y = intersects[0].uv.y;
		}
	}
	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
}

/**
 * 实现下雨到平面的效果
 */
export class Rain{
	constructor(options={}){
		this.options = options;
		this.init();
	}
	init(){
		this.stats = new Stats();
		this.stats.showPanel();
		this.options.dom.appendChild(this.stats.dom);

		this.gui = new GUI();
		this.backgroundColor = 0xfaff06;
		this.gutter = {size:0};
		this.meshs =[];
		this.grid = {cols:30,rows:30};
		this.velocity = -0.1;
		this.angle = 0;
		this.waveLength = 200;
		this.ripple = {};
		this.interval = 0;
		this.waterDropPositions = [];
		this.ripples =[];

		const gui = this.gui.addFolder('背景颜色');
		gui.addColor(this,'backgroundColor').onChange(color=>{
			this.options.dom.style.backgroundColor = color;
		});
		/**
		 * 页面切换事件
		 */
		window.addEventListener('visibilitychange',evt=>{
			//this.pause = evt.target.hidden;
		});
		this.createScene();
		this.createGrid();
		this.addFloor();
		this.animateWaterDropPosition();
	}

	animateWaterDropPosition(){
		const meshParams ={color:0x6ad2ff};
		const geometry = new THREE.BoxGeometry(0.5,2,0.5);
		const material = new THREE.MeshLambertMaterial(meshParams);
		const gui = this.gui.addFolder('雨滴颜色');
		gui.addColor(meshParams,'color').onChange(value=>{
			material.color = new THREE.Color(value);
		});

		// 开启定时器
		this.interval = setInterval(()=>{
			const waterDrop = this.addWaterDrop(geometry,material);
			const {x,z} = this.getRandomWaterDropPosition();
			waterDrop.position.set(x,50,z);
			this.scene.add(waterDrop);

			if(this.pause){
				this.scene.remove(waterDrop);
				TWEEN.removeAll();
			}else{
				new TWEEN.Tween(waterDrop.position).to(new THREE.Vector3(x,0,z),1).onUpdate((val)=>{
					if(waterDrop.position.y < 1){
						this.ripples.push({x,z,velocity:-1,angle:0,amplitude:0.1,radius:1,motion:-0.7});
					}
					
				}).onComplete(()=>{
					waterDrop.position.set(0,50,0);
					this.scene.remove(waterDrop);
				}).start();
			}
		},100);
	}

	addFloor(){
		const geometry = new THREE.PlaneGeometry(100,100);
		const material = new THREE.ShadowMaterial({opacity:0.3});
		this.floor = new THREE.Mesh(geometry,material);
		this.floor.name = 'floor';
		this.floor.position.y = -1;
		this.floor.rotateX(-Math.PI / 2);
		this.floor.receiveShadow = true;

		this.scene.add(this.floor);
	}

	addWaterDrop(geometry,material){
		const waterDrop = new THREE.Mesh(geometry,material);
		return waterDrop;
	}

	getRandomWaterDropPosition(){
		return this.waterDropPositions[Math.floor(Math.random() * Math.floor(this.waterDropPositions.length))];

	}
	createGrid(){
		this.groupMesh = new THREE.Object3D();
		const meshParams = {color:'#00229a'};
		const material = new THREE.MeshLambertMaterial(meshParams);

		const gui = this.gui.addFolder('水的颜色');
		gui.addColor(meshParams,'color').onChange(value=>{
			console.log(value)
			material.color = new THREE.Color(value);
		});
		// 创建了很多小box
		const geometry = new THREE.BoxGeometry(1,1,1);
		this.mesh = this.getMesh(geometry,material);
		this.scene.add(this.mesh);

		// 计算得到中点坐标
		this.centerX = (this.grid.cols + this.grid.cols * this.gutter.size ) * 0.4;
		this.centerZ = (this.grid.rows + this.grid.rows * this.gutter.size) * 0.6;

		let ii = 0;
		for(let row = 0; row < this.grid.rows;row ++){
			this.meshs[row] = [];
			for(let col = 0; col < this.grid.cols;col++){
				const pivot = new THREE.Object3D();
				const x = col + (col * this.gutter.size);
				const z = row + (row * this.gutter.size);
				pivot.scale.set(1,1,1);
				pivot.position.set(x - this.centerX,0, z - this.centerZ);

				this.meshs[row][col] = pivot;
				pivot.updateMatrix();
				this.mesh.setMatrixAt(ii ++,pivot.matrix);
			}
		}

		this.mesh.instanceMatrix.needsUpdate = true;

		for(let row =0; row < this.grid.rows;row++){
			for(let col = 0; col < this.grid.cols;col++){
				const x = col + (col * this.gutter.size);
				const z = row + (row * this.gutter.size);

				this.waterDropPositions.push({x:x - this.centerX,z:z - this.centerZ});
			}
		}
	}
	getMesh(geometry,material){
		const mesh = new THREE.InstancedMesh(geometry,material,this.grid.cols * this.grid.rows);
		mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		return mesh;
	}
	createScene(){
		this.scene = new THREE.Scene();

		this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this.options.dom.appendChild(this.renderer.domElement);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.001,1000);
		this.perspectiveCamera.position.set(-180,180,180);


		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

		this.scene.add(new THREE.AmbientLight(0xfff,1));

		// 添加一个平行光
		this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		this.directionalLight.castShadow = true;
		this.directionalLight.position.set(0, 1, 0);
	
		this.directionalLight.shadow.camera.far = 1000;
		this.directionalLight.shadow.camera.near = -100;
	
		this.directionalLight.shadow.camera.left = -40;
		this.directionalLight.shadow.camera.right = 40;
		this.directionalLight.shadow.camera.top = 20;
		this.directionalLight.shadow.camera.bottom = -20;
		this.directionalLight.shadow.camera.zoom = 1;
		this.directionalLight.shadow.camera.needsUpdate = true;


		const targetObject = new THREE.Object3D();
		targetObject.position.set(-50, -82, 40);
		this.directionalLight.target = targetObject;
	
		this.scene.add(this.directionalLight);
		this.scene.add(this.directionalLight.target);
	}
	/**
	 * 实现波浪效果
	 */
	draw(){
		let ii = 0;
		for(let row = 0; row < this.grid.rows;row ++){
			for(let col =0; col < this.grid.cols;col++){
				const pivot = this.meshs[row][col];

				for(let r = 0; r < this.ripples.length;r++){
					const ripple = this.ripples[r];
					const dist  = this.distance(col,row,ripple.x + this.centerX,ripple.z + this.centerZ);
					//console.log(dist,col,row,ripple.x + this.centerX,ripple.z + this.centerZ)
					if(dist < ripple.radius){
						const offset = this.reDefineMap(dist,0,-this.waveLength,-100,100);
						const angle = ripple.angle + offset;

						const y = this.reDefineMap(Math.sin(angle),-1,0,ripple.motion > 0 ? 0 : ripple.motion,0);
						pivot.position.y = y;
					}
				}

				pivot.updateMatrix();
				this.mesh.setMatrixAt(ii++,pivot.matrix);
			}
		}

		for(let ripple = 0; ripple < this.ripples.length;ripple++){
			const r = this.ripples[ripple];
			r.angle -= this.velocity *2;
			r.radius -= this.velocity *3;
			r.motion -= this.velocity /5;

			if(r.radius > 50){
				this.ripples.shift();
			}
		}
		this.mesh.instanceMatrix.needsUpdate = true;
	}
	animate(){
		this.stats.update();
		TWEEN.update();
		this.renderer.render(this.scene,this.perspectiveCamera);
		this.draw();
		this.stats.end();
	}
	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth , window.innerHeight);
	}

	reDefineMap(value,istart,istop,ostart,ostop){
		return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
	}
	distance(x1,y1,x2,y2){
		return Math.sqrt(Math.pow(x1 - x2,2) + Math.pow(y1 - y2,2));
	}
}

/**
 * 卡通炫酷的水泡求效果
 */
export class WaterBubble{
	constructor(options={}){
		this.options = options;
		this.params={
			color:0x21024f,
			transmission:0.9,
			envMapIntensity:10,
			lightIntensity:1,
			exposure:0.5
		};
		this.meshes =[];
		this.init();
	}

	init(){
		// 加载RGBE
		this.hdrEquirect = new RGBELoader().setDataType(THREE.UnsignedByteType).load('./waterBubble/env.hdr');
		// 加载模型
		new GLTFLoader().load('./waterBubble/model.gltf',gltf=>{
			this.tinky = gltf.scene;
			this.tinky.castShadow = true;
			this.tinky.receiveShadow = true;
			this.tinky.scale.set(80,80,80);
			//console.log(gltf)
			this.tinky.children.forEach(el=>{
				el.receiveShadow = true;
				this.meshes[el.name] = el;
			});
			this.positionElements();
			this.createScene();

			this.createLights();
			this.createBubbles();
			this.createParticles();
			this.addEventListener();
			this.clock = new THREE.Clock();

			this.setInterval();
		});
	
	}
	setInterval(){
		const bubbleGeometry5 = new THREE.SphereGeometry(10,64,32);
		const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
		this.hdrCubeRenderTarget = pmremGenerator.fromEquirectangular(this.hdrEquirect);
		this.hdrEquirect.dispose();
		pmremGenerator.dispose();

		const bubbleTexture = new THREE.CanvasTexture(this.generateTexture());
		bubbleTexture.repeat.set(1);
		const bubbleMaterial = new THREE.MeshPhysicalMaterial({
			color:this.params.color,
			metalness:0,
			roughness:0,
			alphaMap:bubbleTexture,
			alphaTest:0.5,
			envMap:this.hdrCubeRenderTarget.texture,
			envMapIntensity:this.params.envMapIntensity,
			depthWrite:false,
			transmission:this.params.transmission,
			opacity:1,
			transparent:true,
			side:THREE.BackSide,
		});


		setInterval(()=>{
			if(this.spheres.length > 40) return;

			const mesh = new THREE.Mesh(bubbleGeometry5,bubbleMaterial);
			mesh.position.set(Math.random() * 1350 - 725,Math.random() * 1350 - 725,Math.random() * 1350 - 725);
			mesh.scale.set(Math.random() * 3 + 1);
			this.spheres.push(mesh);
			this.scene.add(mesh);
		},2000);
	}
	addEventListener(){
		window.addEventListener('click',evt=>{
			this.raycaster.setFromCamera(new THREE.Vector2(
				(evt.clientX / window.innerWidth) * 2 -1, - (evt.clientY / window.innerHeight) * 2 + 1
			),this.perspectiveCamera);

			const intersects = this.raycaster.intersectObjects(this.spheres);
			for(let i =0; i < intersects.length;i++){
				const sphere = intersects[i].object;
				this.scene.remove(sphere);

				this.spheres.splice(this.spheres.indexOf(sphere),1);
			}
		},false);

	}
	createParticles(){
		const particlesGeometry = new THREE.BufferGeometry();
		const color = new THREE.Color();
		let components =[];

		const count = 400;
		const positions = new Float32Array(count * 3);
		const colors = new Float32Array(count * 3);
		for(let i =0; i < count;i++){
			if(i % 3 === 0){
				color.setHSL(Math.random(),1,0.5);
				components= [color.r,color.g,color.b];
			}
			positions[i] = (Math.random() - 0.5) * 1000;
			colors[i] = components[i % 3];
		}

		particlesGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
		particlesGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
		const textureLoader = new THREE.TextureLoader();
		const particlesTexture= textureLoader.load("./texture/Image_1.png");
		const particlesMaterial = new THREE.PointsMaterial({
			size:17,
			alphaMap:particlesTexture,
			transparent:true,
			depthWrite:false,
			blending:THREE.AdditiveBlending,
			vertexColors:true,
		});
		this.particles = new THREE.Points(particlesGeometry,particlesMaterial);
		this.scene.add(this.particles);
	}

	createBubbles(){
		const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
		this.hdrCubeRenderTarget = pmremGenerator.fromEquirectangular(this.hdrEquirect);
		this.hdrEquirect.dispose();
		pmremGenerator.dispose();

		const bubbleTexture = new THREE.CanvasTexture(this.generateTexture());
		bubbleTexture.repeat.set(1);
		const bubbleMaterial = new THREE.MeshPhysicalMaterial({
			color:this.params.color,
			metalness:0,
			roughness:0,
			alphaMap:bubbleTexture,
			alphaTest:0.5,
			envMap:this.hdrCubeRenderTarget.texture,
			envMapIntensity:this.params.envMapIntensity,
			depthWrite:false,
			transmission:this.params.transmission,
			opacity:1,
			transparent:true,
		});

		const bubbleMaterial1b = bubbleMaterial.clone();
		bubbleMaterial1b.side = THREE.DoubleSide;

		const bubbleGeometry1 = new THREE.SphereGeometry(170,64,32);
		const bubbleGeometry2 = new THREE.SphereGeometry(55,64,32);
		const bubbleGeometry3 = new THREE.SphereGeometry(30,64,32);
		const bubbleGeometry4 = new THREE.SphereGeometry(70,64,32);

		let bubble1 = new THREE.Mesh(bubbleGeometry1,bubbleMaterial1b);
		bubble1.position.z = 15;

		let bubble2 = new THREE.Mesh(bubbleGeometry2,bubbleMaterial1b);
		bubble2.position.y = -135;
		bubble2.position.x = -175;
		bubble2.position.z = 75;
		
		let bubble3 = new THREE.Mesh(bubbleGeometry3,bubbleMaterial1b);
		bubble3.position.set(-136,127,50);

		let bubble4 = new THREE.Mesh(bubbleGeometry4,bubbleMaterial1b);
		bubble4.position.set(210,100,70);

		this.scene.add(bubble1,bubble2,bubble3,bubble4);
	}
	generateTexture(){
		const canvas =document.createElement('canvas');
		canvas.width = 2;
		canvas.height = 2;
		const context = canvas.getContext('2d');
		context.fillStyle = 'white';
		context.fillRect(0,1,2,1);
		return context;
	}
	createLights(){
		const ambientLight = new THREE.AmbientLight(0xaa54f0,1);
		const directionalLight1 = new THREE.DirectionalLight(0xfff,1);
		directionalLight1.position.set(-2,2,5);

		const directionalLight2 = new THREE.DirectionalLight(0xfff000,1);
		directionalLight2.position.set(-2,4,4);
		directionalLight2.castShadow = true;
		this.scene.add(ambientLight,directionalLight1,directionalLight2);
	}
	createScene(){
		this.scene = new THREE.Scene();
		this.raycaster = new THREE.Raycaster();

		this.perspectiveCamera = new THREE.PerspectiveCamera(60,window.innerWidth / window.innerHeight,0.1,10000);
		this.perspectiveCamera.position.set(0,-10,500);

		this.renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 2;

		this.options.dom.appendChild(this.renderer.domElement);
		this.renderer.setAnimationLoop(this.animate.bind(this));

		this.scene.add(this.tinky);
		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);

	}
	positionElements(){
		this.meshes.bigStar.position.y = -1.7;
		this.meshes.bigStar.position.x = -2.2;
		this.meshes.bigStar.position.z = 0.8;
		this.meshes.bigStar.rotation.z = -0.5;

		this.meshes.littleStar.position.y = -1.75;
		this.meshes.littleStar.position.x = 1.75;
		this.meshes.littleStar.position.z = 0.6;
		this.meshes.littleStar.rotation.z = 0.5;

		this.meshes.planet.position.y = 1.3;// 行星
		this.meshes.planet.position.x = 2.6;
		this.meshes.planet.position.z = 1;

		this.meshes.ClosedLeftEye.visible = false;
		this.meshes.ClosedRightEye.visible = false;
	}
	animate(){
		this.renderer.render(this.scene,this.perspectiveCamera);
	}

	_windowResizeFun(){

	}
}

/**
 * 移动Box 游戏
 */
class CustomBox extends THREE.Mesh{
	constructor({width,height,depth,color='red',velocity={
		x:0,y:0,z:0
	},position={x:0,y:0,z:0},zAcceleration=false}){
		super(new THREE.BoxGeometry(width,height,depth),new THREE.MeshStandardMaterial({
			color:color
		}));

		this.width = width;
		this.height = height;
		this.depth = depth;
		this.position.set(position.x,position.y,position.z);

		this.right = this.position.x + this.width /2;
		this.left = this.position.x - this.width / 2;

		this.bottom = this.position.y - this.height /2;
		this.top = this.position.y + this.height / 2;

		this.front = this.position.z + this.depth / 2;
		this.back = this.position.z - this.depth / 2;

		this.velocity = velocity;
		this.gravity = -0.002;
		this.zAcceleration = zAcceleration;
	}

	updateSides(){
		this.right = this.position.x + this.width / 2;
		this.left = this.position.x - this.width / 2;
		this.bottom = this.position.y - this.height /2;
		this.top = this.position.y + this.height / 2;
		this.front = this.position.z + this.depth / 2;
		this.back = this.position.z - this.depth/2;
	}

	update(ground){
		this.updateSides();

		if(this.zAcceleration) this.velocity.z += 0.0003;

		this.position.x += this.velocity.x;
		this.position.z += this.velocity.z;

		this.applyGravity(ground);
	}

	applyGravity(ground){
		this.velocity.y += this.gravity;

		if(boxCollision({box1:this,box2:ground})){
			const friction = 0.5;
			this.velocity.y *= friction;
			this.velocity.y = - this.velocity.y;
		}else{
			this.position.y += this.velocity.y;
		}
	}
}
function boxCollision({box1,box2}){
	const xCollision = box1.right >= box2.left && box1.left <= box2.right;
	const yCollision = box2.bottom + box1.velocity.y <= box2.top && box1.top >= box2.bottom;
	const zCollision = box1.front >= box2.back && box1.back <= box2.front;

	return xCollision && yCollision && zCollision;
}
export class MoveBoxGame{
	constructor(options={}){
		this.options = options;
		this.initPhysical();
		this.init();
	}
	/**
	 * 初始化物理环境
	 */
	initPhysical(){
		
	}
	init(){
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xbff1e5);

		this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.001,1000);
		this.perspectiveCamera.position.set(8,5,8);

		this.renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true,alpha:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.options.dom.appendChild(this.renderer.domElement);
		this.renderer.setAnimationLoop(this.animate.bind(this));

		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
		// 添加Cube
		this.cube = new CustomBox({
			width:1,
			height:1,
			depth:1,
			velocity:{
				x:0,y:-0.01,z:0
			}
		});
		this.cube.castShadow = true;
		this.scene.add(this.cube);

		this.ground = new CustomBox({
			width:10,
			height:0.5,
			depth:50,
			color:0x0369a1,
			position:{
				x:0,
				y:-2,
				z:0
			}
		});
		this.ground.receiveShadow = true;
		this.scene.add(this.ground);
		// 添加平行光
		const directionalLight = new THREE.DirectionalLight(0xf3f,1);
		directionalLight.position.y = 18;
		directionalLight.position.z = 5;

		directionalLight.castShadow = true;
		// 添加阴影
		directionalLight.shadow.camera.left = -14;
		directionalLight.shadow.camera.right = 14;
		directionalLight.shadow.camera.top = 14;
		directionalLight.shadow.camera.bottom = -14;
		directionalLight.shadow.camera.near = 2;
		directionalLight.shadow.camera.far = 50;
		directionalLight.shadow.mapSize.x = 1024;
		directionalLight.shadow.mapSize.y = 1024;

		this.scene.add(directionalLight);

		this.scene.add(new THREE.AmbientLight(0xffefef,2));
		this.createListener();

		this.enemies = [];
		this.frames = 0;
		this.spawnRate = 200;
		this.clock = new THREE.Clock();
	}

	createListener(){
		this.keys ={
			a:{
				pressed:false,
			},
			d:{
				pressed:false,
			},
			s:{
				pressed:false,
			},
			w:{
				pressed:false,
			}
		};

		window.addEventListener('keydown',(evt)=>{
			
			switch(evt.code){
				case 'KeyA':
					this.keys.a.pressed = true;
					break;
				case 'KeyD':
					this.keys.d.pressed = true;
					break;
				case 'KeyS':
					this.keys.s.pressed = true;
					break;
				case 'KeyW':
					this.keys.w.pressed= true;
					break;
				case 'Space':
					this.cube.velocity.y = 0.8;
					break;
			}
		},false);

		window.addEventListener('keyup',evt=>{
			switch(evt.code){
				case 'KeyA':
					this.keys.a.pressed = false;
					break;
				case 'KeyD':
					this.keys.d.pressed = false;
					break;
				case 'KeyW':
					this.keys.w.pressed = false;
					break;
				case 'KeyS':
					this.keys.s.pressed = false;
					break;
			}
		},false);
	}
	animate(){
		this.renderer.render(this.scene,this.perspectiveCamera);

		this.cube.velocity.x = 0;
		this.cube.velocity.z = 0;
		if(this.keys.a.pressed) this.cube.velocity.x = -0.05;
		else if(this.keys.d.pressed) this.cube.velocity.x = 0.05;

		if(this.keys.s.pressed) this.cube.velocity.z = 0.05;
		else if(this.keys.w.pressed) this.cube.velocity.z = 0.05;

		this.cube.update(this.ground);
		this.enemies.forEach(enemy=>{
			enemy.update(this.ground);

			if(boxCollision({box1:this.cube,box2:enemy})){
				// 取消循环
				this.renderer.setAnimationLoop(null);
			}
		});

		if(this.frames % this.spawnRate === 0){
			if(this.spawnRate > 20) this.spawnRate -= 20;

			const enemy = new CustomBox({
				width:1,height:1,depth:1,position:{
					x:(Math.random() - 0.5) * 10,
					y:0,
					z:-20
				},
				velocity:{
					x:0,
					y:0,
					z:0.005,
				},
				color:'red',
				zAcceleration:true
			});
			enemy.castShadow = true;
			this.scene.add(enemy);
			this.enemies.push(enemy);
		}
		++ this.frames;
		this.cube.rotation.x += 0.01;
		this.cube.rotation.y += 0.01;
	}
	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
}
/**
 * 凸多边形破碎游戏，cannon-es
 */
export class ConvexBreakerGame{
	constructor(options = {}){
		this.options = options;
		this.initCannon();
	}
	/**
	 * 初始化物理引擎
	 */
	initCannon(){
		this.world = new CANNON.World();
		this.world.gravity.set(0,-9.82,0);
		this.world.broadphase = new CANNON.SAPBroadphase(this.world);
		this.world.allowSleep = true;
      // Max solver iterations: Use more for better force propagation, but keep in mind that it's not very computationally cheap!
	  //this.world.solver.iterations = 20

	  // Tweak contact properties.
	  // Contact stiffness - use to make softer/harder contacts
	  //this.world.defaultContactMaterial.contactEquationStiffness = 1e10
	  //this.world.defaultContactMaterial.contactEquationRelaxation = 10

		// 创建地面材质
		this.groundMaterial = new CANNON.Material("ground");
		this.defaultMaterial = new CANNON.Material('default');// 默认材质
		// 设置两种材质接触时的效果
		this.groundWithDefaultContactMaterial = new CANNON.ContactMaterial(
			this.groundMaterial,this.defaultMaterial,{
				friction:0.5,
				restitution:0.3
			}
		);
		// 添加到物理世界中
		this.world.addContactMaterial(this.groundWithDefaultContactMaterial);

		this.rigidBodies = [];// 刚体数组
		this.objectsToRemove =[];// 被破碎的对象，就需要被移除
		this.init();

	}
	init(){
		this.perspectiveCamera = new THREE.PerspectiveCamera(60,window.innerWidth / window.innerHeight,0.001,1000);
		this.perspectiveCamera.position .set(-14,8,16);

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0xbfd1e5);

		this.clock = new THREE.Clock();

		this.renderer = new THREE.WebGLRenderer({antialias:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.options.dom.appendChild(this.renderer.domElement);
		this.renderer.setAnimationLoop(this.animate.bind(this));

		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
		//this.orbitControls.target.set(0,2,0);
		this.orbitControls.update();

		this.scene.add(new THREE.AmbientLight(0xbbbbbb));
		this.cannonDebugger = new CannonDebugger(this.scene, this.world, {
			// options...
		  })
		const directionalLight = new THREE.DirectionalLight(0xf33fff,2.);
		directionalLight.position.set(-10,18,5);
		directionalLight.castShadow = true;

		directionalLight.shadow.camera.left = -14;
		directionalLight.shadow.camera.right = 14;
		directionalLight.shadow.camera.top = 14;
		directionalLight.shadow.camera.bottom  = -14;
		directionalLight.shadow.camera.near = 2;
		directionalLight.shadow.camera.far = 50;
		directionalLight.shadow.mapSize.x = 1024;
		directionalLight.shadow.mapSize.y = 1024;

		this.scene.add(directionalLight);
		this.convexBreaker = new ConvexObjectBreaker();

		// Stats
		this.stats = new Stats();
		this.stats.domElement.style.position = 'absolute';
		this.stats.domElement.style.top = '0px';
		this.options.dom.appendChild(this.stats.domElement);
		
		this.ballMaterial = new THREE.MeshPhongMaterial({color:0x202020});
		// 创建几何体
		this.createObjects();

		// 监听输入
		this.initInput();
	}

	createObjects(){
		// 创建地面
		const groundShape = new CANNON.Plane();
		const groundBody = new CANNON.Body({
			mass:0,// 设置质量为0 ，不用再设置其他形状
		});
		groundBody.addShape(groundShape);
		groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI /2);
		//groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
		this.world.addBody(groundBody);

		const size = 1000;
		// 创建地面几何体
		const groundGeometry = new THREE.PlaneGeometry(size,size,1,1);
		const groundMaterial = new THREE.MeshPhongMaterial({
			color:0xffff,
		});
		const groundMesh = new THREE.Mesh(groundGeometry,groundMaterial);
		groundMesh.rotation.x= - Math.PI / 2;
		groundMesh.receiveShadow = true;
		this.scene.add(groundMesh);

		// 加载纹理
		new THREE.TextureLoader().load('./textures/checkerboard-8x8.png',texture=>{
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.repeat.set(size,size);
			groundMesh.material.map  = texture;
			groundMesh.material.needsUpdate = true;
		});
		// 创建盒子
		this.createBox(2,5,2,new THREE.Vector3(-8,5,0)/*位置*/,1000/*质量*/,0xb03014/*颜色*/);
		this.createBox(2,5,3,new THREE.Vector3(8,5,0),1000,0xb04314);
		this.createBox(7,0.2,1.5,new THREE.Vector3(0,10.2,0),100,0xb3b865);

		// 创建石头
		for(let i =0; i < 200;i++){
			this.createBox(1 + Math.random() * 4,2 + Math.random() * 4,  Math.random() + 1 ,new THREE.Vector3((0.5-Math.random()) * 50,5,50 *(0.5 -  Math.random())),120,0xb0b0b0);
		}

		// 创建山
		const mountainHalfExtents = new THREE.Vector3(4,5,4);
		const mountainPoints = [
			new THREE.Vector3(mountainHalfExtents.x,-mountainHalfExtents.y,mountainHalfExtents.z),
			new THREE.Vector3(-mountainHalfExtents.x,-mountainHalfExtents.y,mountainHalfExtents.z),
			new THREE.Vector3(mountainHalfExtents.x,-mountainHalfExtents.y,-mountainHalfExtents.z),
			new THREE.Vector3(-mountainHalfExtents.x,-mountainHalfExtents.y,-mountainHalfExtents.z),
			new THREE.Vector3(0,mountainHalfExtents.y,0)
		];
		const mountainPos = new THREE.Vector3(5,mountainHalfExtents.y * 0.5,-7);
		// 创建破碎对象-山
		this.createConvexObject(mountainPoints,mountainPos,860,0xb03814);

	}
	/**
	 * 创建BOX
	 * @param {*} sx  
	 * @param {*} sy 
	 * @param {*} sz 
	 * @param {*} position 
	 * @param {*} mass 
	 * @param {*} color 
	 */
	createBox(sx,sy,sz,position,mass,color){
		// 首先创建物理世界中的BOX
		const halfExtents = new CANNON.Vec3(sx * 0.5,sy * 0.5,sz * 0.5);
		const boxShape = new CANNON.Box(halfExtents);
		const boxBody = new CANNON.Body({
			mass:mass,
			shape:boxShape,
			position:new CANNON.Vec3(position.x,position.y,position.z),
			material:this.defaultMaterial,
		});
		this.world.addBody(boxBody);

		// 创建three.js 中的BOX
		const boxGeometry = new THREE.BoxGeometry(sx,sy,sz);
		const boxMesh = new THREE.Mesh(boxGeometry,new THREE.MeshPhongMaterial({color:color}));
		boxMesh.position.copy(position);
		boxMesh.castShadow = true;
		boxMesh.receiveShadow = true;
		this.scene.add(boxMesh);

		// 预处理破碎对象
		this.convexBreaker.prepareBreakableObject(boxMesh,mass,new THREE.Vector3(Math.random() ,Math.random(),Math.random()),new THREE.Vector3(Math.random(),Math.random(),Math.random()),true);

		// 物理世界与three.js 世界中，各对象存储彼此的数据
		boxBody.userData = {mesh:boxMesh,mass:mass};
		boxMesh.userData = {body:boxBody,mass:mass,velocity:new THREE.Vector3(Math.random(),Math.random() ,Math.random()),angularVelocity:new THREE.Vector3(Math.random(),Math.random(),Math.random()),breakable:true};

		this.rigidBodies.push({mesh:boxMesh,body:boxBody});
	}
	findPointIndex(p, points) {
		for (let i = 0; i < points.length; i++) {
		  if (p.distanceToSquared(points[i]) < 1e-8) return i;
		}
		return -1; // 没找到
	  }
	/**
	 * 创建凸多边形-山
	 * @param {*} points 
	 * @param {*} position 
	 * @param {*} mass 
	 * @param {*} color 
	 */
	createConvexObject(points,position,mass,color){
		const geometry = new ConvexGeometry(points);
		const mesh = new THREE.Mesh(geometry,new THREE.MeshPhongMaterial({
			color:color
		}));
		mesh.position.copy(position);
		mesh.castShaodw = true;
		mesh.receiveShaodw = true;
		mesh.geometry.computeBoundingBox();
		const faces = [],cannonFaces =[];
		for (let i = 0; i < mesh.geometry.attributes.position.count; i += 3) {
			const vA = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i);
			const vB = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i + 1);
			const vC = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i + 2);
		
			// 获取原始索引，ConvexGeometry生成的多边体存在多余的点位，而这些点实际是不需要的
			const iA = this.findPointIndex(vA, points);
			const iB = this.findPointIndex(vB, points);
			const iC = this.findPointIndex(vC, points);

			// 存储 face 顶点对象
			faces.push({ a: vA, b: vB, c: vC });
			
			// 存储 cannon faces（点的索引）
			cannonFaces.push([iA, iB, iC]);
		  }
		this.scene.add(mesh);
		//console.log('山:',mesh,faces,cannonFaces)
		// 预破碎
		this.convexBreaker.prepareBreakableObject(mesh,mass,new THREE.Vector3(Math.random(),Math.random(),Math.random()),new THREE.Vector3(4,5,4),true);

		// 构建物理世界中的凸多边形
		const cannonPoints = points.map(p=>new CANNON.Vec3(p.x,p.y,p.z));
		const convexShape = new CANNON.ConvexPolyhedron({
			vertices:cannonPoints,
			faces:cannonFaces,// 自定义多边体，必须要设置faces，才行 
		});
		const body = new CANNON.Body({
			mass:mass,
			shape:convexShape,
			position:new CANNON.Vec3(position.x,position.y,position.z),
			material:this.defaultMaterial,
		});
		this.world.addBody(body);

		body.userData = {mesh:mesh,mass:mass};
		mesh.userData = {body:body,breakable:true,mass:mass,velocity:new THREE.Vector3(1,1,1),angularVelocity:new THREE.Vector3(2,2,2)};

		this.rigidBodies.push({mesh:mesh,body:body});
	}

	initInput(){
		this.raycaster = new THREE.Raycaster();
		const mouseCoords = new THREE.Vector2();
		this.renderer.domElement.addEventListener('pointerdown',evt=>{
			//console.log(evt)//offset.x,offset.y
			mouseCoords.set(
				(evt.offsetX / window.innerWidth) * 2 - 1,
				-(evt.offsetY / window.innerHeight) * 2 + 1
			);

			this.raycaster.setFromCamera(mouseCoords,this.perspectiveCamera);

			// 创建球体，及扔出去
			const ballMass = 35;
			const ballRadius = 0.4;
			//console.log(this.raycaster)
			// 创建物理世界中的球体
			const ballShape = new CANNON.Sphere(ballRadius);
			const ballBody = new CANNON.Body({
				mass:ballMass,
				shape:ballShape,
				position:new CANNON.Vec3(
					this.raycaster.ray.origin.x + this.raycaster.ray.direction.x,
					this.raycaster.ray.origin.y + this.raycaster.ray.direction.y,
					this.raycaster.ray.origin.z + this.raycaster.ray.direction.z
				),
				material:this.defaultMaterial,
			});

			ballBody.velocity.set(this.raycaster.ray.direction.x * 24,
				this.raycaster.ray.direction.y * 24,
				this.raycaster.ray.direction.z * 24
			);
			this.world.addBody(ballBody);

			// three.js 对象的
			const ballMesh = new THREE.Mesh(
				new THREE.SphereGeometry(ballRadius,14,10),
				this.ballMaterial
			);
			ballMesh.position.copy(ballBody.position);
			ballMesh.castShadow = true;
			ballMesh.receiveShadow = true;
			this.scene.add(ballMesh);

			// 存储数据
			ballBody.userData = {mesh:ballMesh};
			ballMesh.userData = {body:ballBody};

			this.rigidBodies.push({mesh:ballMesh,body:ballBody});
		});
	}
	animate(){
		//const deltaTime = Math.min(this.clock.getDelta(),0.1);// 限制间隔时间
		//console.log(this.world)
		this.world.step(1/40);
		this.renderer.render(this.scene,this.perspectiveCamera);
		this.updatePhysics();
		this.stats.update();
		this.cannonDebugger.update();
	}
	/**
	 * 更新
	 */
	updatePhysics(){
		
		// 更新three.js  的对象
		if(this.rigidBodies.length > 0)
		for(const item of this.rigidBodies){
			if(item.body && item.mesh){
				item.mesh.position.copy(item.body.position);
				item.mesh.quaternion.copy(item.body.quaternion);
			}
		}
		
		// 检测碰撞及破碎对象
		for(const contact of this.world.contacts){
			if(contact.bi && contact.bj){
				const bodyA = contact.bi;
				const bodyB = contact.bj;

				const meshA = bodyA.userData?.mesh;
				const meshB = bodyB.userData?.mesh;

				if(!meshA || !meshB) continue;

				const breakableA = meshA.userData?.breakable;
				const breakableB = meshB.userData?.breakable;

				if(!breakableA && !breakableB) continue;

				const collidedA= meshA.userData?.collided;
				const collidedB= meshB.userData?.collided;
				if(collidedA && collidedB) continue;

				// 获取冲量信息
				const impactVelocity = contact.getImpactVelocityAlongNormal();
				const fractureImpulse = 0.25;
				
				if(breakableA && ! collidedA && impactVelocity > fractureImpulse){
					//console.log(meshA,bodyA)
					// 计算得到碰撞的点
					const contactPointA = new CANNON.Vec3();
					bodyA.pointToWorldFrame(contact.ri,contactPointA);
					const impactNormal = new THREE.Vector3(contact.ni.x,contact.ni.y,contact.ni.z);
				
					const tempMesh = this.breakeObject(meshA,bodyA,contactPointA,impactNormal);
					
				}

				if(breakableB && !collidedB && impactVelocity > fractureImpulse){
					// 计算得到碰撞的点
					const contactPointB = new CANNON.Vec3();
					bodyA.pointToWorldFrame(contact.ri,contactPointB);
					const impactNormal = new THREE.Vector3(-contact.ni.x,-contact.ni.y,-contact.ni.z);
				
					this.breakeObject(meshB,bodyB,contactPointB,impactNormal);
				}
			}
			//console.log('查看contact:',contact);
		}

		// 移除破碎的对象
		for(let i =0; i < this.objectsToRemove.length && this.objectsToRemove.length > 0;i++){
			const obj = this.objectsToRemove[i];
			if(obj){
				const body= obj.userData?.body;
				if(body){
					this.world.removeBody(body);
				}

				this.scene.remove(obj);
			}
		}

	}
	breakeObject(mesh,body,impactPoint,impactNormal){
	
		// 获取速度及角速度
		const velocity = new THREE.Vector3(body.velocity.x,body.velocity.y,body.velocity.z);
		const angularVelocity = new THREE.Vector3(
			body.angularVelocity.x,
			body.angularVelocity.y,
			body.angularVelocity.z
		);
		// 打碎对象
		const debris = this.convexBreaker.subdivideByImpact(mesh,impactPoint,impactNormal,1,3);
		//console.log(11,debris)
		let index = 0;
		for(const fragment of debris){
			if(index < debris.length ){
				const fragmentMass = mesh.userData.mass / debris.length;
				//console.log(fragmentMass)
				// 创建凸多边形,生成的凸多边体存在重复点
				// 合并之后的geometry
				const merged = BufferGeometryUtils.mergeVertices(fragment.geometry);
				const noIndexedMerged = merged.toNonIndexed(); // 取消索引以避免错误连接，靠自己创建索引
				noIndexedMerged.computeVertexNormals(); // 可选：计算法线以保证几何一致性
			 
				
				const {convexShape,newGeometry} =createCannonShapeFromGeometry(noIndexedMerged);
				if(convexShape == null){

					this.objectsToRemove.push(fragment) ;
					fragment.userData.collided = true;
					continue;
				}
				//创建刚体
				const fragmentBody = new CANNON.Body({
					mass:fragmentMass,
					shape:convexShape,
					position:new CANNON.Vec3(fragment.position.x,fragment.position.y,fragment.position.z),
					quaternion:new CANNON.Quaternion(fragment.quaternion.x,fragment.quaternion.y,fragment.quaternion.z,fragment.quaternion.w),
					material:this.defaultMaterial,
				});
				//console.log(fragmentBody)
				fragmentBody.velocity.set(velocity.x ,velocity.y ,velocity.z );
				fragmentBody.angularVelocity.set(angularVelocity.x,angularVelocity.y,angularVelocity.z);
				this.world.addBody(fragmentBody);
				
				// 添加到场景中
				fragment.castShadow = true;
				fragment.receiveShadow = true;
				fragment.geometry = newGeometry;// 减少数据量
				fragment.needsUpdate = true;
				this.scene.add(fragment);
				fragmentBody.userData={mesh:fragment,mass:fragmentMass};
				fragment.userData = {body:fragmentBody,breakable:true,mass:fragmentMass,velocity:velocity,angularVelocity:angularVelocity}
	
				this.rigidBodies.push({mesh:fragment,body:fragmentBody});
			}else if(index < 0){
				// 过多导致卡死
				console.log('原始数据:',fragment)
				fragment.material.color = new THREE.Color(0xfff000);
				fragment.material.wireframe = true;
				this.scene.add(fragment);
				fragment.position.set(
					Math.random() * 50 ,
					Math.random() * 5,
					Math.random() * 50
				);
				const merged = BufferGeometryUtils.mergeVertices(fragment.geometry);
				console.log('合并之后的:',merged)
			}
			++ index;
		}

		this.objectsToRemove.push(mesh) ;
		mesh.userData.collided = true;
		return mesh;
	}
	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth/ window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}

	
}
/**
 * 变形球效果
 */
export class DeformationAnimate{
	constructor(options={}){
		this.options = options;
		this.init();
	}

	init(){
		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({antialias:true});
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this.options.dom.appendChild(this.renderer.domElement);
		// 给球体的材质
		this.material = new THREE.ShaderMaterial({
			vertexShader:`
				varying vec2 vUv;
				varying vec3 v_color;
				varying vec3 v_normal;

				uniform float u_time;
				uniform float u_progress;

				vec3 hsv2rgb(vec3 c){
					vec4 K = vec4(1.,2./3.,1./3.,3.);
					vec3 p = abs(fract(c.xxx + K.xyz) * 6. - K.www);
					return c.z * mix(K.xxx,clamp(p - K.xxx,0.,1.),c.y);
				}
				// 求与289.0 的模
				vec4 permute(vec4 x){
					return mod(((x * 34.0) + 1.) * x,289.0);
				}
				vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r; }
				// 由位置得到一个随机值，输入是一个扩大+偏移的值
				float snoise(vec3 v){
					const vec2 C = vec2(1.0 / 6.0 ,1.0 / 3.0);
					const vec4 D = vec4(0.,0.5,1.,2.);

					vec3 i = floor(v + dot(v ,C.yyy));// 向下取整
					vec3 x0 = v - i + dot(i,C.xxx);// 得到小数部分

					vec3 g = step(x0.yzx,x0.xyz);// 0 或者是  x0.xyz
					vec3 l = 1. - g;
					vec3 i1 = min(g.xyz,l.zxy);
					vec3 i2 = max(g.xyz,l.zxy);

					vec3 x1 = x0 - i1 + 1. * C.xxx;
					vec3 x2 = x0 - i2 + 2. * C.xxx;
					vec3 x3 = x0 - 1. + 3. * C.xxx;

					i = mod(i ,289.0);
					vec4 p = permute(permute(permute(i.z +vec4(0.,i1.z,i2.z,1.)) + i.y + vec4(0.,i1.y,i2.y,1.)) + i.x + vec4(0.,i1.x,i2.x,1.));

					float n_ = 1. /7.0;
					vec3 ns = n_ * D.wyz - D.xzx;

					vec4 j = p - 49. * floor(p * ns.z);

					vec4 x_ = floor(j * ns.z);
					vec4 y_ = floor(j - 7.0 * x_);

					vec4 x = x_ * ns.x + ns.yyyy;
					vec4 y = y_ * ns.x + ns.yyyy;
					vec4 h = 1. - abs(x) - abs(y);

					vec4 b0 = vec4(x.xy,y.xy);
					vec4 b1 = vec4(x.zw,y.zw);

					vec4 s0 = floor(b0) * 2. + 1.;
					vec4 s1 = floor(b1) * 2. + 1.;
					vec4 sh = - step(h,vec4(0.));

					vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
					vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;


					vec3 p0 = vec3(a0.xy,h.x);
					vec3 p1  = vec3(a0.zw,h.y);
					vec3 p2  = vec3(a1.xy,h.z);
					vec3 p3 = vec3(a1.zw,h.w);

					vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
					p0 *= norm.x;
					p1 *= norm.y;
					p2 *= norm.z;
					p3 *= norm.w;

					vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
					m = m * m;
					return 42. * dot(m* m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
				}

				void main(){
					vUv = uv;
					// position 动态的扩大5倍 or 1倍+ 偏移值
					float noise = snoise(position * u_progress + u_time / 10.0);// 得到随机值

					vec3 newPos = position * (noise + 0.7);

					v_color = hsv2rgb(vec3(noise * 0.1 + 0.03,0.7,0.7));

					v_normal = normal;

					gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos,1.);
				}
			`,
			fragmentShader:`
				varying vec2 vUv;
				varying vec3 v_color;
				varying vec3 v_normal;

				void main(){
					vec3 light = vec3(0.);
					vec3 skyColor = vec3(1.,1.,0.547);
					vec3 groundColor = vec3(0.562,0.275,0.111);

					vec3 lightDirection = normalize(vec3(0.,-1.,-1.));
					light += dot(lightDirection,v_normal);

					light = mix(skyColor,groundColor,dot(lightDirection,v_normal));
					gl_FragColor = vec4(light * v_color,1.);
				}
			`,
			wireframe:false,
			uniforms:{
				u_time:{value:0},
				u_progress:{value:0},
			}
		});

		this.pointsMaterial = new THREE.ShaderMaterial({
			vertexShader:`
			uniform float u_time;

			void main(){
				vec3 p = position;

				p.y += 0.25 * (sin(p.y * 5. + u_time) * 0.5+0.5);
				p.z += 0.05 * (sin(p.y * 10.0 + u_time) * 0.5 + 0.5);
				
				vec4 mvPosition = modelViewMatrix * vec4(p,1.);
				gl_PointSize = 10. * (1. / - mvPosition.z);
				gl_Position = projectionMatrix * mvPosition;
			}

			`,
			fragmentShader:`
				uniform float u_progress;

				void main(){
					gl_FragColor = vec4(0.4,0.4,0.4,u_progress);
				}
			`,
			wireframe:false,
			side:THREE.DoubleSide,
			transparent:true,
			uniforms:{
				u_time:{value:0},
				u_progress:{value:0}
			}
		});

		this.clock = new THREE.Clock();
		// 创建相机
		this.perspectiveCamera = new THREE.PerspectiveCamera(40,window.innerWidth / window.innerHeight,0.0001,1000);
		this.perspectiveCamera.position.set(0,0,10);

		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
		this.orbitControls.update();

		// 添加一个球体
		this.geometry = new THREE.SphereGeometry(1,162,162);
		const sphere = new THREE.Mesh(this.geometry,this.material);
		this.scene.add(sphere);
		sphere.name = 'sphere';

		// 创建背景
		const geometry = new THREE.PlaneGeometry(100,15,16);
		this.backgroundMaterial = new THREE.ShaderMaterial({
			vertexShader:`
				varying vec2 vUv;
				uniform float u_time;

				void main(){
					vec3 p = position;

					vec4 mvPosition = modelViewMatrix * vec4(p,1.0);
					gl_PointSize = 10. * (1. / - mvPosition.z);
					gl_Position = projectionMatrix * mvPosition;
					vUv = uv;
				}
			`,
			fragmentShader:`
				uniform float u_progress;

				void main(){
					gl_FragColor = vec4(0.4,0.4,0.4,u_progress);
				}
			`,
			wireframe:false,
			uniforms:{
				u_time:{value:0},
				u_progress:{value:0}
			}
		});

		const mesh = new THREE.Mesh(geometry,this.backgroundMaterial);
		mesh.position.z = -2;
		this.scene.add(mesh);
		mesh.name = 'plane';

		this.createParticles();
		this.addGsap();
	}
	addGsap(){
		console.log('gsap:',gsap);
		gsap.timeline({
			repeat:-1,
			yoyo:true
		}).to(this.material.uniforms.u_progress,{
			value:5,// 值从0-到5
			duration:5,// 执行5秒钟，
			ease:"power3.inOut"
		}).to(this.material.uniforms.u_progress,{
			value:1,// 5-1
			duration:5,
			ease:"power3.inOut"
		});

		gsap.to(this.pointsMaterial.uniforms.u_progress,{
			value:0.4,
			duration:5,
			ease:"power3.inOut"
		});
	}
	/**
	 * 创建粒子
	 */
	createParticles(){
		const N = 30000;
		const position = new Float32Array(N * 3);
		this.particlesGeometry = new THREE.BufferGeometry();

		/**
		 *  let inc = Math.PI * ( 3 - Math.sqrt(5));
			这个增量值 inc 通常用于 均匀分布点 的算法，例如：
			Fibonacci 球面采样（用于在球面上均匀分布点）
			黄金螺旋布局（常用于数据可视化或图形学）
			const points = [];
			const inc = Math.PI * (3 - Math.sqrt(5)); // ~2.39996
			const numPoints = 1000;

			for (let i = 0; i < numPoints; i++) {
				const y = 1 - (i / (numPoints - 1)) * 2;  // y ∈ [-1, 1]
				const radius = Math.sqrt(1 - y * y);       // 半径（在 x-z 平面）
				const angle = inc * i;                    // 每次增加 ~2.39996 弧度
				
				const x = Math.cos(angle) * radius;
				const z = Math.sin(angle) * radius;
				
				points.push({ x, y, z });
			}
		 */
		let inc = Math.PI * ( 3 - Math.sqrt(5));//π × (3 - √5) = 2.399963229728653
		let offset = 2 / N; // 15000
		let radius = 2;

		for(let i =0; i < N ; i ++){
			let y = i * offset  - 1 + offset /2;//7499,15000  - 1 + 6500,
			let r = Math.sqrt(1 - y * y);
			let phi = i * inc;

			position[3 * i ] = radius * Math.cos(phi) * r;
			position[3 * i + 1] = radius * y;
			position[3 * i + 2] = radius * Math.sin(phi) * r;

		}

		this.particlesGeometry.setAttribute('position',new THREE.BufferAttribute(position,3));

		this.points = new THREE.Points(this.particlesGeometry,this.pointsMaterial);
		this.scene.add(this.points);
		this.points.name = 'points';
	}

	animate(){
		this.renderer.render(this.scene,this.perspectiveCamera);

		this.material.uniforms.u_time.value = this.clock.getElapsedTime();// 到当前执行的时间秒值
		this.pointsMaterial.uniforms.u_time.value = this.clock.getElapsedTime();
		this.backgroundMaterial.uniforms.u_time.value = this.clock.getElapsedTime();
		this.points.rotation.y += 0.005;
	}

	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
}
/**
 * 无限循环的道路和树
 */
export class UnlimitedRoadTree{
	constructor(_options={}){
		this.options = _options;
		this.init();
	}

	init(){
		this.materialShaders = [];
		this.speed = 10;

		this.scene =new THREE.Scene();
		this.perspectiveCamera = new THREE.PerspectiveCamera(60,window.innerWidth / window.innerHeight,0.001,1000);
		this.perspectiveCamera.position.set(0,10,7);
	
		this.renderer = new THREE.WebGLRenderer({antialias:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this.options.dom.appendChild(this.renderer.domElement);

		// 添加背景颜色
		this.scene.background = new THREE.Color(0xffaa44);
		this.scene.fog = new THREE.Fog(this.scene.background,42.5,50);

		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
		this.orbitControls.update();

		// 创建地面和道路
		let planeGeometry = new THREE.PlaneGeometry(100,100,200,200);
		planeGeometry.rotateX(-Math.PI / 2);
		let planeMaterial = new THREE.MeshBasicMaterial({
			color:0xff00ee,
		});
		planeMaterial.onBeforeCompile = shader=>{
			shader.uniforms.u_time = {value:0};
			shader.vertexShader=`
				uniform float u_time;
				varying vec3 vPos;

				
				vec3 mod289(vec3 x) {
				return x - floor(x * (1.0 / 289.0)) * 289.0;
				}

				vec4 mod289(vec4 x) {
				return x - floor(x * (1.0 / 289.0)) * 289.0;
				}

				vec4 permute(vec4 x) {
					return mod289(((x*34.0)+1.0)*x);
				}

				vec4 taylorInvSqrt(vec4 r)
				{
				return 1.79284291400159 - 0.85373472095314 * r;
				}

				float snoise(vec3 v)
				{ 
				const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
				const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

				// First corner
				vec3 i  = floor(v + dot(v, C.yyy) );
				vec3 x0 =   v - i + dot(i, C.xxx) ;

				// Other corners
				vec3 g = step(x0.yzx, x0.xyz);
				vec3 l = 1.0 - g;
				vec3 i1 = min( g.xyz, l.zxy );
				vec3 i2 = max( g.xyz, l.zxy );

				//   x0 = x0 - 0.0 + 0.0 * C.xxx;
				//   x1 = x0 - i1  + 1.0 * C.xxx;
				//   x2 = x0 - i2  + 2.0 * C.xxx;
				//   x3 = x0 - 1.0 + 3.0 * C.xxx;
				vec3 x1 = x0 - i1 + C.xxx;
				vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
				vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

				// Permutations
				i = mod289(i); 
				vec4 p = permute( permute( permute( 
							i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
						+ i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
						+ i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

				// Gradients: 7x7 points over a square, mapped onto an octahedron.
				// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
				float n_ = 0.142857142857; // 1.0/7.0
				vec3  ns = n_ * D.wyz - D.xzx;

				vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

				vec4 x_ = floor(j * ns.z);
				vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

				vec4 x = x_ *ns.x + ns.yyyy;
				vec4 y = y_ *ns.x + ns.yyyy;
				vec4 h = 1.0 - abs(x) - abs(y);

				vec4 b0 = vec4( x.xy, y.xy );
				vec4 b1 = vec4( x.zw, y.zw );

				//vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
				//vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
				vec4 s0 = floor(b0)*2.0 + 1.0;
				vec4 s1 = floor(b1)*2.0 + 1.0;
				vec4 sh = -step(h, vec4(0.0));

				vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
				vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

				vec3 p0 = vec3(a0.xy,h.x);
				vec3 p1 = vec3(a0.zw,h.y);
				vec3 p2 = vec3(a1.xy,h.z);
				vec3 p3 = vec3(a1.zw,h.w);

				//Normalise gradients
				vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
				p0 *= norm.x;
				p1 *= norm.y;
				p2 *= norm.z;
				p3 *= norm.w;

				// Mix final noise value
				vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
				m = m * m;
				return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
												dot(p2,x2), dot(p3,x3) ) );
				}
			` + shader.vertexShader;

			shader.vertexShader = shader.vertexShader.replace(
				`#include <begin_vertex>`,`#include <begin_vertex>
				vec2 tuv = uv;
				float t = u_time * 0.01 * ${this.speed}.;
				tuv.y += t;
				transformed.y = snoise(vec3(tuv * 5.,0.)) * 5.;
				transformed.y *= smoothstep(5.,15.,abs(transformed.x));
				vPos = transformed;

				`
			);

			shader.fragmentShader = `

			//#extension GL_OES_standard_derivatives : enable

			uniform float u_time;
			varying vec3 vPos;

			float line(vec3 position,float width,vec3 step){
				vec3 tempCoord = position / step;

				vec2 coord = tempCoord.xz;
				coord.y -= u_time * ${this.speed}./2.;

				vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord * width);
				float line = min(grid.x,grid.y);

				return min(line,1.0);
			}
			`+ shader.fragmentShader;

			shader.fragmentShader = shader.fragmentShader.replace(`gl_FragColor = vec4( outgoingLight,diffuseColor.a);`,
				`
					float l = line(vPos,2.,vec3(2.));
					vec3 base = mix(vec3(0,0.75,1),vec3(0.),smoothstep(5.,7.5,abs(vPos.x)));
					vec3 c = mix(outgoingLight,base,l);
					gl_FragColor = vec4(c,diffuseColor.a);
				`
			);
			this.materialShaders.push(shader);
		};

		let plane = new THREE.Mesh(planeGeometry,planeMaterial);
		this.scene.add(plane);

		// 
		let palmGeometrys =[];
		let logGeometry = new THREE.CylinderGeometry(0.125,0.25,10,4,5,true);
		logGeometry.translate(0,5,0);
		palmGeometrys.push(logGeometry);

		for(let i =0; i < 20;i++){
			let leafGeometry = new THREE.CircleGeometry(1.25,4);
			leafGeometry.translate(0,1.25,0);
			leafGeometry.rotateX(-Math.PI / 2);
			leafGeometry.scale(0.25,1,THREE.MathUtils.randFloat(1,1.5));
			leafGeometry.attributes.position.setY(0,0.25);
			leafGeometry.rotateX(THREE.MathUtils.randFloatSpread(Math.PI /2));
			leafGeometry.rotateY(THREE.MathUtils.randFloat(0,Math.PI * 2));
			leafGeometry.translate(0,10,0);
			palmGeometrys.push(leafGeometry);
		}

		// 合并
		let palmGeometry = BufferGeometryUtils.mergeGeometries(palmGeometrys,false);
		palmGeometry.rotateZ(THREE.MathUtils.degToRad(-1.5));

		let instGeometry = new THREE.InstancedBufferGeometry();
		instGeometry.attributes.position = palmGeometry.attributes.position;
		instGeometry.attributes.uv = palmGeometry.attributes.uv;
		instGeometry.index = palmGeometry.index;

		this.palmPos =[];
		for(let i =0; i < 5;i++){
			this.palmPos.push(-5,0,i * 20 - 10 - 50);
			this.palmPos.push(5,0,i * 20 - 50);
		}

		instGeometry.setAttribute("instPosition",new THREE.InstancedBufferAttribute(new Float32Array(this.palmPos),3));

		let palmMaterial = new THREE.MeshBasicMaterial({
			color:0x00ff88,side:THREE.DoubleSide,
		});
		palmMaterial.onBeforeCompile = shader=>{
			shader.uniforms.u_time = {value:0};

			shader.vertexShader = `
				uniform float u_time ;
				attribute vec3 instPosition;

			`+ shader.vertexShader;
			shader.fragmentShader = shader.fragmentShader.replace(
				`#include <begin_vertex>`,`#include <begin_vertex> 
				
					transformed.x *= sign(instPosition.x);
					vec3 ip = instPosition;
					ip.z = mod(50. + ip.z + u_time * ${this.speed}.,100.) - 50.;
					transformed *= 0.4 + smoothstep(50.,45.,abs(ip.z)) * 0.6;
					transformed += ip;
				`
			);
			this.materialShaders.push(shader);
		}

		let palms = new THREE.Mesh(instGeometry,palmMaterial);
		this.scene.add(palms);
		palms.position.set(0,4,0);

		// sun
		let sunGeometry = new THREE.CircleGeometry(200,64);
		let sunMaterial = new THREE.MeshBasicMaterial({
			color:0xff8800,
			fog:false,
			transparent:true,
		});

		sunMaterial.onBeforeCompile = shader=>{
			shader.uniforms.u_time = {value:0};

			shader.vertexShader = `
			varying vec2 vUv;
			` + shader.vertexShader;
			shader.vertexShader = shader.vertexShader.replace(`#include <begin_vertex>`,`#include <begin_vertex>
					vUv = uv;
				`);
			
			shader.fragmentShader = `
			varying vec2 vUv;
			`+shader.fragmentShader;
			shader.fragmentShader = shader.fragmentShader.replace(`gl_FragColor = vec4( outgoingLight,diffuseColor.a);`,`gl_FragColor = vec4(outgoingLight,diffuseColor.a * smoothstep(0.5,0.7,vUv.y));`);
			this.materialShaders.push(shader);
		}

		let sun = new THREE.Mesh(sunGeometry,sunMaterial);
		this.scene.add(sun);
		sun.position.set(0,0,-500);

		this.clock = new THREE.Clock();
		this.time = 0;
	}

	animate(){
		this.renderer.render(this.scene,this.perspectiveCamera);

		this.time = this.clock.getElapsedTime();
		this.materialShaders.forEach(m =>{
			m.uniforms.u_time.value = this.time;
		});


	}
	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
}

export class PlaneWaterEffect{
	constructor(_options={}){
		this.options = _options;
		this.init();
	}

	init(){
		// Set up scene
	this.scene = new THREE.Scene();
	this.perspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	this.perspectiveCamera.position.set(0,40,40);
	this.renderer = new THREE.WebGLRenderer({antialias:true});
	this.renderer.setSize(window.innerWidth, window.innerHeight);
	this.renderer.setPixelRatio(window.devicePixelRatio);
	this.renderer.setAnimationLoop(this.animate.bind(this));

	this.options.dom.appendChild(this.renderer.domElement);

	this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
	this.orbitControls.update();

	const width = 100;
	const height = 50;
	// Create plane geometry
	const geometry = new THREE.PlaneGeometry(width, height);

	// Load textures
	const textureLoader = new THREE.TextureLoader();
	const noiseTexture = textureLoader.load('./textures/wood.jpg');//textureEyePurple_256_optimized.jpg
	const backgroundTexture = textureLoader.load('./texture/uv_grid.jpg');
	

	// Create shader material
	this.material = new THREE.ShaderMaterial({
		vertexShader: `
		
		varying vec2 vUv;
		void main() {
		  vUv = uv;
		  gl_Position = projectionMatrix * modelViewMatrix * vec4(position , 1.0);
		}
	  `,
	
	  fragmentShader: `
		uniform float time;
		uniform vec2 resolution;
		uniform sampler2D noiseTexture;
		uniform sampler2D backgroundTexture;
		
		varying vec2 vUv;
		
		vec3 screen_blend(vec3 s, vec3 d) {
		  return s+d - s*d;
		}
		
		float get_mask(vec2 uv) {
		  uv.x *= resolution.x / resolution.y;
		  uv.x += sign(uv.x)*uv.y*.2;
		  uv.x = abs(uv.x);
		  return clamp(1.-(smoothstep(0.2, .6, uv.x)), 0., 1.);
		}
		
		vec2 flow(vec2 uv, vec2 flowmap, float phase, float t, out float weight) {
		  float progress = fract(t + phase);
		  vec2 displacement = flowmap * progress;
		  weight = 1. - abs(progress*2.-1.);
		  return uv + displacement;
		}
		// 分形噪声
		float fbm(sampler2D sampler, vec2 p) {
		  float value = 0.;
		  float amplitude = .5;
		  float frequency = 1.;
		  for (int i = 0; i < 5; i++) {
			value += amplitude * (texture(sampler, p*frequency).r);
			frequency *= 2.;
			amplitude *= .5;
		  }
		  return value;
		}
		
		void main() {
		  vec2 uv = vUv;// 0-1
		  uv.x = uv.x*2.-1.;// 由 0-2 - 1 变成=> -1,-1
		  
		  vec2 flowuv = uv*.03 + vec2(0., time*0.01);
		  float noise = fbm(noiseTexture, flowuv);
		  vec2 flowmap = vec2(0., smoothstep(0.2, 1., noise)) * .006;
		  float weightA, weightB;
		  float t = time * .8;
		  vec2 uvA = flow(flowuv, flowmap, 0.0, t, weightA);
		  vec2 uvB = flow(flowuv, flowmap, 0.5, t, weightB);
		  float flowA = fbm(noiseTexture, uvA) * weightA;
		  float flowB = fbm(noiseTexture, uvB) * weightB;
		  float flow = (flowA + flowB);
		  
		  float waterfall_mask = get_mask(uv);
		  float spray_mask = 1.-length(vec2(uv.x*.8, pow(uv.y, .5))*1.7);
		  uv.y += .5;
		  vec2 radial_uv = 0.01*vec2(atan(uv.x, uv.y), length(uv)) + vec2(0., -time*0.002);
		  float spray = fbm(noiseTexture, radial_uv);
		
		  vec3 background = texture(backgroundTexture, vUv).rgb;
		  
		  vec3 blue = vec3(0.6, .6, .9);
		  vec3 waterfall = ((1.-flow)*blue + smoothstep(0., 1.,flow)) * waterfall_mask;
		  vec3 col = mix(background, waterfall, waterfall_mask);
		  col += vec3(spray_mask*spray*(1.-waterfall_mask));
		  spray_mask = clamp(spray_mask, 0., 1.);
		  col = screen_blend(vec3(spray*spray_mask*2.5), col);
		
		  gl_FragColor = vec4(col,1.0);
		}
	  `,
	uniforms: {
		time: { value: 0 },
		resolution: { value: new THREE.Vector2(width, height) },
		noiseTexture: { value: noiseTexture },
		backgroundTexture: { value: backgroundTexture }
	}
	});

	// Create mesh
	const plane = new THREE.Mesh(geometry, this.material);
	this.scene.add(plane);
	this.clock = new THREE.Clock();
	}


	animate(){
		
		// Update time uniform
		this.material.uniforms.time.value += this.clock.getDelta();
		this.renderer.render(this.scene, this.perspectiveCamera);
	}

	_windowResizeFun(){

		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

}
/**
 * 星系效果
 */
export class StarEffect{
	constructor(_options={}){
		this.options = _options;
		this.init();
	}

	init(){
		this.gui = new GUI({closed:true,width:350});
		this.parameters = {
			count:250000,
			radius:5,
			branches:5,// 分支
			spin:1,//
			randomness:0.8,
			randomnessPower:4,
			insideColor:"#ec5300",
			outsideColor:"#2fb4fc"
		};

		this.scene = new THREE.Scene();
		// 加载纹理
		const textureLoader = new THREE.TextureLoader();
		this.starTexture = textureLoader.load("./star-bg.jpg");
		this.clock = new THREE.Clock();

		this.geometry = null;
		this.material = null;
		this.points = null;

		this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.0001,1000);
		this.perspectiveCamera.position.set(0,3,3);

		this.renderer = new THREE.WebGLRenderer({antialias:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this.options.dom.appendChild(this.renderer.domElement);

		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
		this.orbitControls.update();

		this.scene.add(new THREE.AxesHelper(100));

		// 创建星空
		this.generateGalaxy();
		this.initGUI();
	}
	/**
	 * 创建星空
	 */
	generateGalaxy(){
		if(this.points != null){
			this.geometry.dispose();
			this.material.dispose();
			this.scene.remove(this.points);
		}
		// 创建Buffergeometry
		this.geometry = new THREE.BufferGeometry();
		// 创建属性
		const positions = new Float32Array(this.parameters.count * 3);
		const colors =new Float32Array(this.parameters.count * 3);
		const scales =new Float32Array(this.parameters.count);
		const randomness = new Float32Array(this.parameters.count * 3);
		const insideColor = new THREE.Color(this.parameters.insideColor);
		const outsideColor = new THREE.Color(this.parameters.outsideColor);

		for(let i = 0; i < this.parameters.count;i++){
			const i3 = i * 3;

			// position 
			const radius = Math.random() * this.parameters.radius;
			// 分支的角度
			const branchAngle = ((i % this.parameters.branches) / this.parameters.branches) * Math.PI * 2;
			// Math.pow(x,y) = x的y次方
			const randomX = Math.pow(Math.random(),this.parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * this.parameters.randomness * radius;
			const randomY = Math.pow(Math.random(),this.parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * this.parameters.randomness * radius;
			const randomZ = Math.pow(Math.random(),this.parameters.randomnessPower) * (Math.random()< 0.5 ? 1 : -1) * this.parameters.randomness * radius;

			positions[i3] = Math.cos(branchAngle) * radius;
			positions[i3 + 1] = 0;
			positions[i3 + 2]= Math.sin(branchAngle) * radius;

			randomness[i3] = randomX;
			randomness[i3 + 1] = randomY;
			randomness[i3 + 2] = randomZ;

			const mixedColor = insideColor.clone();
			mixedColor.lerp(outsideColor,radius /this.parameters.radius);

			colors[i3 ] = mixedColor.r;
			colors[i3 +1] = mixedColor.g;
			colors[i3 +2] = mixedColor.b;

			scales[i] = Math.random();
		}

		this.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
		this.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
		this.geometry.setAttribute('scale',new THREE.BufferAttribute(scales,1));
		this.geometry.setAttribute('randomness',new THREE.BufferAttribute(randomness,3));

		this.material = new THREE.ShaderMaterial({
			depthWrite:false,
			blending:THREE.AdditiveBlending,
			vertexColors:true,
			vertexShader:`
				uniform float uSize;
				uniform float uTime;
				uniform float uHoleSize;

				attribute float scale;
				attribute vec3 randomness;

				varying vec3 vColor;

				void main(){
					vec4 modelPosition = modelMatrix * vec4(position,1.);

					float angle = atan(modelPosition.x,modelPosition.z);
					float distanceToCenter = length(modelPosition.xz) + uHoleSize;
					float timeOffset = uTime + (uHoleSize * 30.);
					float angleOffset = (1. / distanceToCenter) * timeOffset * 0.2;
					angle += angleOffset;

					modelPosition.x = cos(angle) * distanceToCenter;
					modelPosition.z = sin(angle) * distanceToCenter;
					modelPosition.xyz += randomness;

					vec4 viewPosition = viewMatrix * modelPosition;
					vec4 projectionPosition = projectionMatrix * viewPosition;

					gl_Position = projectionPosition;
					float tempScale = uSize * scale;

					gl_PointSize = tempScale;
					gl_PointSize *= (1. / - viewPosition.z);//视图空间(即相机的空间，右手坐标系)
					vColor = color;
				}
			`,
			fragmentShader:`
				varying vec3 vColor;
				uniform sampler2D uTexture;

				void main(){
					gl_FragColor = vec4(vColor,1.);
					gl_FragColor = gl_FragColor * texture2D(uTexture,vec2(gl_PointCoord.x,gl_PointCoord.y));
					//gl_FragColor = gl_FragColor * vec4(vColor,1.0);
				}
			`,
			transparent:true,
			uniforms:{
				uTime:{value:0},
				uSize:{value:30 * this.renderer.getPixelRatio()},
				uHoleSize:{value:0.2},// 黑洞大小
				uTexture:{value:this.starTexture},

			}
		});
		const tempMaterial = new THREE.MeshBasicMaterial({color:0xffdd});
		this.points = new THREE.Points(this.geometry,this.material);
		this.scene.add(this.points);
		//console.log(this.scene)
	}
	initGUI(){
		this.gui
		.add(this.material.uniforms.uSize, "value")
		.min(1)
		.max(100)
		.step(0.001)
		.name("Point size")
		.onChange(() => {
			this.material.uniforms.uSize.value =
			this.material.uniforms.uSize.value * this.renderer.getPixelRatio();
		});

		this.gui
		.add(this.material.uniforms.uHoleSize, "value")
		.min(0)
		.max(1)
		.step(0.001)
		.name("Black hole size(黑洞大小)");

		this.gui
		.add(this.parameters, "count")
		.min(100)
		.max(1000000)
		.step(100)
		.onFinishChange(this.generateGalaxy.bind(this))
		.name("Star count(粒子个数)");

		this.gui
		.add(this.parameters, "radius")
		.min(0.01)
		.max(20)
		.step(0.01)
		.onFinishChange(this.generateGalaxy.bind(this))
		.name("Galaxy radius(星系半径)");

		this.gui
		.add(this.parameters, "branches")
		.min(2)
		.max(20)
		.step(1)
		.onFinishChange(this.generateGalaxy.bind(this))
		.name("Galaxy branches(星系分支)");
		this.gui
		.add(this.parameters, "randomness")
		.min(0)
		.max(20)
		.step(0.001)
		.onFinishChange(this.generateGalaxy.bind(this))
		.name("Randomness position");
		this.gui
		.add(this.parameters, "randomnessPower")
		.min(1)
		.max(10)
		.step(0.001)
		.onFinishChange(this.generateGalaxy.bind(this))
		.name("Randomness power(随机的能量)");
		this.gui
		.addColor(this.parameters, "insideColor")
		.onFinishChange(this.generateGalaxy.bind(this))
		.name("Galaxy inside color");
		this.gui
		.addColor(this.parameters, "outsideColor")
		.onFinishChange(this.generateGalaxy.bind(this))
		.name("Galaxy outside color");
	}
	animate(){
		const elapsedTime = this.clock.getElapsedTime();
		//if(this.material !== null)
		this.material.uniforms.uTime.value = elapsedTime;

		this.renderer.render(this.scene,this.perspectiveCamera);
	}
	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize (window.innerWidth,window.innerHeight);
	}
}

/**
 * 烟雾效果不对
 */
export class ShaderSmoke{
	constructor(_options={}){
		this.options = _options;
		this.init();
	}
	init(){
		this.renderer = new THREE.WebGLRenderer({antialias:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this.options.dom.appendChild(this.renderer.domElement);

		this.scene = new THREE.Scene();
		this.clock = new THREE.Clock();

		this.perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.001,10000);
		this.perspectiveCamera.position.set(0,800,800);

		const light = new THREE.DirectionalLight(0xffff,1.);
		light.position.set(-1,0,1);
		this.scene.add(light);
		this.count = 5000;
		this.addShaderParticles();
	}

	addShaderParticles(){

		const geometry = new THREE.BufferGeometry();
		const positions = new Float32Array(this.count * 3);
		const scales = new Float32Array(this.count);
		const opacities = new Float32Array(this.count);
		const angles = new Float32Array(this.count);
		const speeds = new Float32Array(this.count);

		for(let i =0; i < this.count;i++){
			positions[i * 3 ] = (Math.random() - 0.5) * 1000;
			positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
			positions[i * 3 + 2] = Math.random() * 1000 - 500;

			scales[i] = 0.5 + Math.random() * 20;// 0.5 + 0->2
			opacities[i] = 0.1 + Math.random() * 0.3;// 0.1 + 0->0.3
			angles[i] = Math.random() * Math.PI * 2;// (0->1)* 360
			speeds[i] = 0.1 + Math.random() * 0.3;// 0.1 + 0->0.3

		}
		geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
		geometry.setAttribute('scale',new THREE.BufferAttribute(scales,1));
		geometry.setAttribute('opacity',new THREE.BufferAttribute(opacities,1));
		geometry.setAttribute('angle',new THREE.BufferAttribute(angles,1));
		geometry.setAttribute('speed',new THREE.BufferAttribute(speeds,1));

		const loader = new THREE.TextureLoader();
		const smokeTexture = loader.load('./clouds.png');
		
		const material = new THREE.ShaderMaterial({
			uniforms:{
				uTime:{value:0},
				uTexture:{value:smokeTexture},
				uFade:{value:1.},
			},
			vertexShader:`
				uniform float uTime;
				attribute float scale;
				attribute float opacity;
				attribute float angle;
				attribute float speed;

				varying float vOpacity;
				float random() {
					return fract(sin(uTime * 12.9898) * 43758.5453);
				}
				void main(){
					vec3 newPosition = position;

					newPosition.x += sin(uTime * speed + angle) * 10.;
					newPosition.y += cos(uTime * speed * 0.7 + angle) * 10.;
					newPosition.z -= uTime * speed * 50.;

					if(newPosition.z < -500.){
						// 重新设置粒子
						newPosition.z = 500.;
						newPosition.x = (random() - 0.5) * 1000.0;
						newPosition.y = (random() - 0.5) * 1000.;
					}

					vec4 mvPosition = modelViewMatrix * vec4(newPosition,1.);
					gl_Position = projectionMatrix * mvPosition;
					gl_PointSize = scale * (300. / - mvPosition.z);

					vOpacity = opacity;
				}
			`,
			fragmentShader:`
				uniform sampler2D uTexture;

				varying float vOpacity;

				void main(){
					vec2 uv = vec2(gl_PointCoord.x,gl_PointCoord.y);
					vec4 texColor = texture2D(uTexture,uv);

					gl_FragColor = vec4(1.,0.,0.,1.);//vec4(texColor.rgb ,texColor.a * vOpacity);
				}
			`,
			transparent:true,
			depthWrite:false,
			blending:THREE.AdditiveBlending
		});

		this.particles = new THREE.Points(geometry,material);
		this.scene.add(this.particles);
	}
	animate(){
		this.renderer.render(this.scene,this.perspectiveCamera);
		if(this.particles)
			this.particles.material.uniforms.uTime.value += this.clock.getDelta();
	}
	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
}

/**
 * 发射烟花效果
 */

class Rocket {
	constructor(options={}){
		this.scene = options.scene;
		this.color = options.color
		this.targetPos = new THREE.Vector3(options.position.x, options.position.y, options.position.z)
		this.currentPos = new THREE.Vector3(0, 0, 0)
		this.particleCount = options.particleCount;

		this.init();
	}
   init() {
		const _envMap = new THREE.TextureLoader().load('./texture.abstract.64.jpg');
		_envMap.mapping = THREE.EquirectangularReflectionMapping
		_envMap.encoding = THREE.sRGBEncoding;
		
		const geometry = new THREE.SphereGeometry(0.1, 32, 32)
		const material = new THREE.MeshStandardMaterial({
			color: this.color,
			metalness: 1,
			roughness: 0.1,
			envMap:_envMap,
			envMapIntensity: 1
		});
		this.mesh = new THREE.Mesh(geometry, material)
		this.mesh.frustumCulled = false
		this.mesh.castShadow = true;
		this.scene.add(this.mesh)
  }
 isCompleted() {
	return this.currentPos.distanceTo(this.targetPos) < 0.25
  }
  update(delta) {
	this.currentPos.lerp(this.targetPos, delta * 0.0027)
	this.mesh.position.copy(this.currentPos)
  }
  remove  () {
	this.scene.remove(this.mesh)
  }
}

class Firework{
 
	constructor(_options={}){
		this.color = _options.color;
		this.targetPos = _options.targetPos;
		this.particleCount = _options.particleCount;
		this.scene = _options.scene;
		this.startTime = 0;
		this.init();
	}
	init() {
		const _envMap = new THREE.TextureLoader().load('./texture.abstract.64.jpg');
		_envMap.mapping = THREE.EquirectangularReflectionMapping
		_envMap.encoding = THREE.sRGBEncoding;
		
		const particleGeo = new THREE.SphereGeometry(0.2, 32);
		const geometry = new THREE.InstancedBufferGeometry().copy(particleGeo);
		
		geometry.index = particleGeo.index;
		geometry.instanceCount = this.particleCount;

		const pos = []
		const rot = []
		const scl = []
		const delay = []
		let dummy = new THREE.Object3D();

		for (let i = 0; i < this.particleCount; i++) {
			const angle1 = i / this.particleCount * Math.PI;
			const angle2 = i / this.particleCount * 90;
			const x = Math.sin(angle1) * Math.cos(angle2);
			const y = Math.sin(angle1) * Math.sin(angle2);
			const z = Math.cos(angle1);
			pos.push(x, y, z);

			dummy.rotation.set(
				THREE.MathUtils.randFloat(0, Math.PI * 2),
				THREE.MathUtils.randFloat(0, Math.PI * 2),
				THREE.MathUtils.randFloat(0, Math.PI * 2)
			);
			dummy.updateMatrix();

			rot.push(dummy.quaternion.x, dummy.quaternion.y, dummy.quaternion.z, dummy.quaternion.w);
			scl.push(1, 1, 1);

			delay.push(THREE.MathUtils.randFloat(0, 1));
		}

		geometry.setAttribute('instT', new THREE.InstancedBufferAttribute(new Float32Array(pos), 3, false))
		geometry.setAttribute('instR', new THREE.InstancedBufferAttribute(new Float32Array(rot), 4, false))
		geometry.setAttribute('instS', new THREE.InstancedBufferAttribute(new Float32Array(scl), 3, false))
		geometry.setAttribute('instDelay', new THREE.InstancedBufferAttribute(new Float32Array(delay), 1, false))

		const insertVertexAttributes = (shader) => {
		shader.vertexShader = `
			uniform float uTime;
			uniform float uProgress;
			varying vec2 vUv;
			varying float vInstDelay;
	
			attribute vec3 instT;
			attribute vec4 instR;
			attribute vec3 instS;
			attribute float instDelay;
			
			// http://barradeau.com/blog/?p=1109
			vec3 trs( inout vec3 position, vec3 T, vec4 R, vec3 S ) {
				position *= S;
				position += 2.0 * cross( R.xyz, cross( R.xyz, position ) + R.w * position );
				position += T;
				return position;
			}
			vec3 transformedNormal(vec3 normal, vec4 R) {
				return normalize(normal + 2.0 * cross(R.xyz, cross(R.xyz, normal) + R.w * normal));
			}
			${shader.vertexShader}
		`
		}
		const overideVertexShader = (shader) => {
		shader.vertexShader = shader.vertexShader.replace(
			`#include <begin_vertex>`,
			`#include <begin_vertex>
			float time = uTime;
			vInstDelay = instDelay;
			vUv = uv;
	
			transformed = trs(transformed, instT, instR, instS);
	
			vec3 vel_out = (log(time) + 1.5) * normalize(instT);
			vec3 pos_out = instT + vel_out;
	
			transformed += pos_out; `
		)
		}
		const insertFragmentAttributes = (shader) => {
		shader.fragmentShader = `
			uniform float uTime;
			uniform float uProgress;
			varying vec2 vUv;
			varying float vInstDelay;
	
			float Hash(vec2 p) {
			vec3 p2 = vec3(p.xy, 1.0);
			return fract(sin(dot(p2, vec3(37.1, 61.7, 12.4))) * 3758.5453123);
			}
	
			float noise(in vec2 p) {
			vec2 i = floor(p);
			vec2 f = fract(p);
			f *= f * (3.0 - 2.0 * f);
	
			return mix(mix(Hash(i + vec2(0., 0.)), Hash(i + vec2(1., 0.)), f.x),
					mix(Hash(i + vec2(0., 1.)), Hash(i + vec2(1., 1.)), f.x), f.y);
			}
	
			float fbm(vec2 p) {
			float v = 0.0;
			v += noise(p * 1.) * .5;
			v += noise(p * 2.) * .25;
			v += noise(p * 4.) * .125;
			return v;
			}
	
			${shader.fragmentShader}
		`
		}
		const overideFragmentShader = (shader) => {
		shader.fragmentShader = shader.fragmentShader.replace(
			`#include <dithering_fragment>`,
			`#include <dithering_fragment>
			float time = uProgress - 1.1 - 0.8 * vInstDelay;
				
			vec2 uv = vUv;
			uv.x -= 1.5;
	
			vec3 origin = gl_FragColor.rgb;
			vec3 tgt = vec3(0.);
			vec3 col = origin;
			// burn
			float d = uv.x + uv.y * 0.5 + 0.5 * fbm(uv * 15.1) + time * 1.3;
			if (d > 0.35) col = clamp(col - (d - 0.35) * 10., 0.0, 1.0);
			if (d > 0.47) {
				if (d < 0.5) col += (d - 0.4) * 33.0 * 0.5 * (0.0 + noise(100. * uv + vec2(-time * 2., 0.))) * vec3(1.5, 0.5, 0.0);
				else col += tgt;
			};
			gl_FragColor = vec4(col, col.g);
			`
		)
		}

		const mainMaterial = new THREE.MeshStandardMaterial({
		metalness: 1,
		roughness: 0.5,
		transparent: true,
		depthWrite: false,
		envMap:_envMap,
		envMapIntensity: 1,
		onBeforeCompile: function (shader) {
			shader.uniforms.uTime = { value: 0 }
			shader.uniforms.uProgress = { value: 0 }

			insertVertexAttributes(shader)
			overideVertexShader(shader)

			shader.vertexShader = shader.vertexShader.replace(
			`#include <defaultnormal_vertex>`,
			`objectNormal = transformedNormal(objectNormal, instR);
				#include <defaultnormal_vertex>`
			);

			insertFragmentAttributes(shader)
			overideFragmentShader(shader)

			this.userData.shader = shader
		}
		})

		const depthMaterial = new THREE.MeshDepthMaterial({
		depthPacking: THREE.RGBADepthPacking,
		onBeforeCompile: function (shader) {
			shader.uniforms.uTime = { value: 0 }
			shader.uniforms.uProgress = { value: 0 }

			insertVertexAttributes(shader)
			overideVertexShader(shader)

			insertFragmentAttributes(shader)
			shader.fragmentShader = shader.fragmentShader.replace(
			`gl_FragColor = packDepthToRGBA( fragCoordZ );`,
			`gl_FragColor = packDepthToRGBA( fragCoordZ );
			float time = uProgress - 1. - 0.8 * vInstDelay;
				
			vec2 uv = vUv;
			uv.x -= 1.5;
	
			vec3 origin = gl_FragColor.rgb;
			vec3 tgt = vec3(0.);
			vec3 col = origin;
			// burn
			float d = uv.x + uv.y * 0.5 + 0.5 * fbm(uv * 15.1) + time * 1.3;
			if (d > 0.47) col = tgt;
			gl_FragColor.a = origin.g - col.g;
			`
			)
			this.userData.shader = shader
		}
		})

		depthMaterial.customProgramCacheKey = () => Math.random().toString();
		this.mesh = new THREE.Mesh(geometry, mainMaterial);
		this.mesh.position.copy(this.targetPos);
		this.mesh.rotation.set(THREE.MathUtils.randFloat(-0.1, 0.1), THREE.MathUtils.randFloat(-0.1, 0.1), THREE.MathUtils.randFloat(-0.1, 0.1))
		this.mesh.scale.setScalar(0.7);
		this.mesh.customDepthMaterial = depthMaterial
		this.mesh.frustumCulled = false
		this.mesh.castShadow = true;
		this.mesh.receiveShadow = true;
		this.scene.add(this.mesh);
  }
  isCompleted  () {
	const { shader } = this.mesh.material.userData
	if (!shader) return false
	return shader.uniforms.uTime.value > 5
  }
	update  (time) {
	if (!this.startTime) this.startTime = time
	const t = time - this.startTime
	const { shader } = this.mesh.material.userData
	const { shader: shader2 } = this.mesh.customDepthMaterial.userData
	if (shader && shader2) {
	  shader.uniforms.uTime.value = t;
	  shader.uniforms.uProgress.value = t;
	  shader2.uniforms.uTime.value = t;
	  shader2.uniforms.uProgress.value = t;
	}
  }
  remove  () {
	this.scene.remove(this.mesh)
  }
}
export class ShortFirework{
	constructor(_options={}){
		this.options = _options;

		this.init();
	}

	init(){
		this.renderer = new THREE.WebGLRenderer({  antialias: true });
		this.renderer.setClearColor('#EF9595');
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.options.dom.appendChild(this.renderer.domElement);
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.setAnimationLoop(this.animate.bind(this));

		/** Camera */
		this.perspectiveCamera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.01, 100);
		this.perspectiveCamera.position.set(0, 29, 36);
		/** Orbit Controls */
		this.orbitControls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);

		/** Scene */
		this.scene = new THREE.Scene();
		/** Light */
		const light1 = new THREE.DirectionalLight('#ffffff', 1);
		light1.position.set(0, 10, 0);
		light1.castShadow = true;
		light1.shadow.camera.left = -15;
		light1.shadow.camera.right = 15;
		light1.shadow.camera.top = 15;
		light1.shadow.camera.bottom = -15;
		this.scene.add(light1);
		/** Fog */
		this.scene.fog = new THREE.Fog('#EF9595', 45, 70);

		const ground = new THREE.Mesh(
		  new THREE.PlaneGeometry(1000, 1000),
		  new THREE.MeshStandardMaterial({
			color: '#FFC5C5',
			emissive: '#FFC5C5',
			emissiveIntensity: 0.8,
		  })
		);
		ground.rotation.x = -Math.PI / 2;
		ground.receiveShadow = true;
		this.scene.add(ground);
		/** Group */
		this.group = new THREE.Group();
		this.group.position.y = 0.5;
		this.scene.add(this.group);

		

		this.clock = new THREE.Clock();
		this.lastTime = 0;
		this.now = 0;
		this.delta = 0;
		this.then = Date.now();
		this.interval = 1000 / 60;// 1秒60帧，没帧多长时间
		this.rocket_gasp = 0.5;// 秒
		this.max_rockets = 20;
		this.colors = ['#e76161'];
		this.p_counts =[85, 100, 102, 113, 120, 129, 140];
		this.rockets =[];
		this.fireworks =[];
	}

	animate(){
		this.renderer.render(this.scene,this.perspectiveCamera);

		this.now = Date.now();
		this.delta = this.now  - this.then;
		if(this.delta < this.interval){
			return;
		}

		this.then = this.now - (this.delta % this.interval);
		const t = this.clock.getElapsedTime();
		if(t > this.lastTime + this.rocket_gasp){
			this.lastTime = t;
			// 添加一个火箭
			this.addRocket();
		}
		for(let i = this.rockets.length - 1 ; i >= 0;i--){
			const rocket = this.rockets[i]
			rocket.update(this.delta)
			if (rocket.isCompleted()) {
			  this.addFirework(rocket.color, rocket.targetPos, rocket.particleCount)
			  rocket.remove()
			  this.rockets.splice(i, 1)
			}
		}

		for (let i = this.fireworks.length - 1; i >= 0; i--) {
			const firework = this.fireworks[i]
			firework.update(t)
			if (firework.isCompleted()) {
			  firework.remove()
			  this.fireworks.splice(i, 1)
			}
		  }
	}

	addRocket(){
		if(this.rockets.length === this.max_rockets) return;
		const rocket = new Rocket({
			scene:this.scene,
			color:this.colors[THREE.MathUtils.randInt(0,this.colors.length-1)],
			position:{x:THREE.MathUtils.randFloat(-10,10),y:THREE.MathUtils.randFloat(6,15),z:THREE.MathUtils.randFloat(-10,10)},
			particleCount:this.p_counts[THREE.MathUtils.randInt(0,this.p_counts.length - 1)]
		});
		this.rockets.push(rocket);
	}

	addFirework(color,targetPos,particleCount){
		const firework =new Firework({color,targetPos,particleCount,scene:this.scene});
		this.fireworks.push(firework);
	}
	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
}

const 	friction = 0.998;
const   textureSize = 128.0;
const guiParams = {
			particleSize: 300,
		 	autoLaunch : true,
			fireworkNum:10,// 烟花个数
			fireworkType:'Basic' // Basic or Rich 烟花类型
		};
/**
 * 绘制梯度圆形
 * @param {*} ctx 
 * @param {*} canvasRadius 
 * @param {*} canvasW 
 * @param {*} canvasH 
 */
const drawRadialGradation=(ctx,canvasRadius,canvasW,canvasH)=>{
	ctx.save();
	const gradient = ctx.createRadialGradient(canvasRadius,canvasRadius,0,canvasRadius,canvasRadius,canvasRadius);
	gradient.addColorStop(0.,'rgba(255,255,255,1.0)');
	gradient.addColorStop(0.5,'rgba(255,255,255,0.5)');
	gradient.addColorStop(1.0,'rgba(255,255,255,0.0)');
	ctx.fillStyle = gradient;
	ctx.fillRect(0,0,canvasW,canvasH);
	ctx.restore();
}
/**
 * 创建canvas 纹理
 */
const getTexture = ()=>{
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	const diameter = textureSize;
	canvas.width = diameter;
	canvas.height = diameter;
	const canvasRadius = diameter/2;

	drawRadialGradation(ctx,canvasRadius,canvas.width,canvas.height);
	const texture = new THREE.CanvasTexture(canvas);
	texture.type = THREE.FloatType;
	texture.needsTexture = true;
	return texture;
}
const canvasTexture = getTexture();
/**
 * 创建点
 * @param {*} num 
 * @param {*} vels 
 * @param {*} type 
 */
const getPointMesh=(num,vels,type)=>{
	const bufferGeometry = new THREE.BufferGeometry();
	const vertices = [];
	const velocities = [];
	const colors  =[];
	const adjustSizes  =[];
	const masses = [];
	const colorType = Math.random() > 0.3 ? 'single' : 'multiple';
	const singleColor = THREE.MathUtils.randInt(20,100) * 0.01;
	const multipleColor = ()=> THREE.MathUtils.randInt(1,100) * 0.01;
	let rgbType ;
	const rgbTypeDice = Math.random();
	if(rgbTypeDice > 0.066){
		rgbType = 'red';
	}else if(rgbTypeDice > 0.33){
		rgbType = 'green';
	}else{
		rgbType = 'blue';
	}

	for(let i =0; i < num;i++){
		const pos = new THREE.Vector3(0,0,0);
		vertices.push(pos.x,pos.y,pos.z);
		velocities.push(vels[i].x,vels[i].y,vels[i].z);
		if(type === 'seed' || type === 'trail'){
			let size = 0;
			if(type === 'trail'){
				size = Math.random() * 0.1 + 0.1;
			}else{
				size = Math.pow(vels[i].y ,2) * 0.04;
			}

			if(i == 0) size *= 1.1;
			adjustSizes.push(size);
			masses.push(size * 0.017);
			colors.push(1.,1.,1.,1.);
		}else{
			const size = THREE.MathUtils.randInt(10,guiParams.particleSize) * 0.001;
			adjustSizes.push(size);
			masses.push(size * 0.017);
			if(colorType == 'multiple'){
				colors.push(multipleColor(),multipleColor(),multipleColor(),1.);
			}else{
				switch(rgbType){
					case 'red':
						colors.push(singleColor,0.1,0.1,1.);
						break;
					case 'green':
						colors.push(0.1,singleColor,0.1,1.);
						break;
					case 'blue':
						colors.push(0.1,0.1,singleColor,1.);
						break;
					default:
						colors.push(singleColor,0.1,0.1,1.);
				}
			}
		}
	}

	bufferGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vertices),3));
	bufferGeometry.setAttribute('velocity',new THREE.BufferAttribute(new Float32Array(velocities),3));
	bufferGeometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(colors),4));
	bufferGeometry.setAttribute('adjustSize',new THREE.BufferAttribute(new Float32Array(adjustSizes),1));
	bufferGeometry.setAttribute('mass',new THREE.BufferAttribute(new Float32Array(masses),1));

	const shaderMaterial = new THREE.RawShaderMaterial({
		uniforms:{
			size:{type:'f',value:textureSize},
			texture:{type:'t',value:canvasTexture},
		},
		transparent:true,
		depthWrite:false,
		blending:THREE.AdditiveBlending,
		vertexShader:`
			precision mediump float;
			attribute vec3 position;
			uniform mat4 projectionMatrix;
			uniform mat4 modelViewMatrix;
			uniform float size;
			attribute float adjustSize;
			uniform vec3 cameraPosition;
			varying float distanceCamera;
			attribute vec3 velocity;
			attribute vec4 color;
			varying vec4 vColor;

			void main(){
				vColor = color;
				vec4 modelViewPosition = modelViewMatrix * vec4(position,1.);
				gl_PointSize = size * adjustSize * (100./length(modelViewPosition.xyz));
				gl_Position = projectionMatrix * modelViewPosition;
			}

		`,
		fragmentShader:`
			precision mediump float;
			uniform sampler2D texture;
			varying vec4 vColor;
			void main(){
				vec4 color = vec4(texture2D(texture,gl_PointCoord));
				gl_FragColor = color * vColor;
			}
		`,
	});
	return new THREE.Points(bufferGeometry,shaderMaterial);
}
class ParticleMesh{
	constructor(num,vels,type){
		this.particleNum = num;
		this.timerStartFading = 10;
		this.mesh = getPointMesh(num,vels,type);
	}

	update(gravity){
		if(this.timerStartFading > 0) this.timerStartFading -= 0.3;

		const {position,velocity,color,mass} = this.mesh.geometry.attributes;
		const decrementRandom = ()=>(Math.random() > 0.5 ? 0.98 : 0.96);
		const decrementByVel = v =>(Math.random() > 0.5 ? 0 : (1 - v) * 0.1);

		for(let i =0 ; i < this.particleNum;i++){
			const {x,y,z} = getOffsetXYZ(i);
			velocity.array[y] += gravity.y - mass.array[i];
			velocity.array[x] *= friction;
			velocity.array[z] *= friction;
			velocity.array[y] *= friction;

			position.array[x] += velocity.array[x];
			position.array[y] += velocity.array[y];
			position.array[z] += velocity.array[z];

			const {a} = getOffsetRGBA(i);

			if(this.timerStartFading <= 0){
				color.array[a] *= decrementRandom() - decrementByVel(color.array[a]);
				if(color.array[a] < 0.001) color.array[a] = 0;
			}
		}

		position.needsUpdate  = true;
		velocity.needsUpdate = true;
		color.needsUpdate = true;
	}

	disposeAll(){
		this.mesh.geometry.dispose();
		this.mesh.material.dispose();
	}
}
/**
 * 
 */
class ParticleSeedMesh extends ParticleMesh{
	constructor(num,vels){
		super(num,vels,'seed');
	}

	update(gravity){
		const {position,velocity,color,mass} = this.mesh.geometry.attributes;
		const decrementRandom = ()=>(Math.random() > 0.3 ? 0.99  : 0.96);
		const decrementByVel = v =>(Math.random() > 0.3 ? 0 : (1 - v) * 0.1);
		const shake = ()=>(Math.random() > 0.5 ? 0.05 : -0.05);
		const dice = ()=>Math.random() > 0.1;
		const _f = friction * 0.98;
		for(let i =0 ; i < this.particleNum;i++){
			const {x,y,z} = getOffsetXYZ(i);
			velocity.array[y] += gravity.y - mass.array[i];
			velocity.array[x] *= _f;
			velocity.array[z] *= _f;
			velocity.array[y] *= _f;
			position.array[x] *= velocity.array[x];
			position.array[y] += velocity.array[y];
			position.array[x] += velocity.array[z];

			if(dice()) position.array[x] += shake();
			if(dice()) position.array[z] += shake();

			const {a} = getOffsetRGBA();
			color.array[a] *= decrementRandom() - decrementByVel(color.array[a]);
			if(color.array[a] < 0.001) color.array[a] = 0;

		}

		position.needsUpdate = true;
		velocity.needsUpdate = true;
		color.needsUpdate = true;
	}
}
class BasicFireworks{
	constructor(){
		this.group = new THREE.Group();
		this.group.name = 'BasicGroup';
		this.ixExplode = true;
		this.max = 400;
		this.min = 150;
		this.petalsNum = THREE.MathUtils.randInt(this.min,this.max);
		this.life = 150;// 生命时间
		this.seed = this.getSeed();
		this.group.add(this.seed.mesh);
		this.flowerSizeRate = THREE.MathUtils.mapLinear(this.petalsNum,this.min,this.max,0.4,0.7);
		this.flower = null;
	}
	/**
	 * 获取种子
	 */
	getSeed(){
		const num = 40;
		const vels = [];// 存储速度
		for(let i =0; i < num;i++){
			const vx = 0;
			const vy = i === 0  ? Math.random() * 0.25 + 0.9 : Math.random() * 2. + 0.4;
			const vz = 0;
			vels.push(new THREE.Vector3(vx,vy,vz));
		}

		const pm = new ParticleSeedMesh(num,vels);
		const x = Math.random() * 80 - 40;
		const y = -50;
		const z = Math.random() * 80 - 40;
		pm.mesh.position.set(x,y,z);
		return pm;
	}

	explode(pos){
		this.isExplode = true;
		this.flower = this.getFlower(pos);
		this.group.add(this.flower.mesh);
		this.group.remove(this.seed.mesh);
		this.seed.disposeAll();
	}

	getFlower(pos){
		const num = this.petalsNum;
		const vels = [];
		let radius ;
		const dice = Math.random();

		if(dice > 0.5){
			for(let i = 0; i < num;i++){
				radius = THREE.MathUtils.randFloat(60,120) * 0.01;
				const theta  = THREE.MathUtils.degToRad(Math.random() * 180);
				const phi = THREE.MathUtils.degToRad(Math.random() * 360);
				const vx = Math.sin(theta) * Math.cos(phi) * radius;
				const vy = Math.sin(theta) * Math.sin(phi) * radius;
				const vz = Math.cos(theta) * radius;
				const vel = new THREE.Vector3(vx,vy,vz);
				vel.multiplyScalar(this.flowerSizeRate);
				vels.push(vel);
			}
		}else{
			const zStep = 180 / num;
			const trad = (360 * (Math.random() * 20 + 1)) / num;
			const xStep = trad;
			const yStep = trad;
			radius = THREE.MathUtils.randFloat(60,120) * 0.01;
			for(let i =0; i < num;i++){
				const sphereRate = Math.sin(THREE.MathUtils.degToRad(zStep * i));
				const vz = Math.cos(THREE.MathUtils.degToRad(zStep * i)) * radius;
				const vx = Math.cos(THREE.MathUtils.degToRad(xStep * i)) * sphereRate* radius;
				const vy = Math.sin(THREE.MathUtils.degToRad(yStep * i)) * sphereRate *radius;
				const vel = new THREE.Vector3(vx,vy,vz);
				vel.multiplyScalar(this.flowerSizeRate);
				vels.push(vel);
			}
		}

		const particleMesh = new ParticleMesh(num,vels);
		particleMesh.mesh.position.set(pos.x,pos.y,pos.z);
		return particleMesh;
	}

	update(gravity){
		if(!this.isExplode){
			this.drawTail(gravity);
		}else{
			this.flower.update(gravity);
			if(this.life > 0) this.life -= 1;
		}
	}

	drawTail(gravity){
		this.seed.update(gravity);
		const {position,velocity} = this.seed.mesh.geometry.attributes;
		let count = 0;
		let isComplete = true;
		for(let i =0; i < velocity.array.length;i++){
			const v = velocity.array[i];
			const index = i % 3;
			if(index === 1 && v > 0){
				count ++;
			}
		}
		isComplete = count == 0;
		if(!isComplete)  return;
		const {x,y,z} = this.seed.mesh.position;
		const flowerPos = new THREE.Vector3(x,y,z);
		let highestPos = 0;
		let offsetPos;
		for(let i =0; i < position.array.length;i++){
			const p = position.array[i];
			const index = i % 3;
			if(index === 1 && p > highestPos){
				highestPos = p;
				offsetPos = new THREE.Vector3(position.array[i - 1],p,position.array[i + 2]);
			}
		}
		flowerPos.add(offsetPos);
		this.explode(flowerPos);
	}
}

const getOffsetXYZ = i=>{
	const offset = 3;
	const index = i * offset;
	const x = index;
	const y = index + 1;
	const z = index + 2;
	return {x,y,z}
}

const getOffsetRGBA = i =>{
	const offset = 4;
	const index = i * offset;
	const r = index;
	const g = index + 1;
	const b = index + 2;
	const a = index + 3;
	return {r,g,b,a};
}

class ParticleTailMesh extends ParticleMesh{
	constructor(num,vels){
		super(num,vels,'trail');
	}

	update(gravity){
		const {position,velocity,color,mass} = this.mesh.geometry.attributes;
		const decrementRandom = ()=>(Math.random() > 0.3 ? 0.98 : 0.95);
		const shake = ()=> (Math.random() > 0.5 ? 0.05 : -0.05);
		const dice =() => Math.random() > 0.2;

		for(let i =0; i < this.particleNum;i++){
			const {x,y,z} = getOffsetXYZ(i);
			velocity.array[x] += gravity.y - mass.array[i];
			velocity.array[x] *= friction;
			velocity.array[z] *= friction;
			velocity.array[y] *= friction;

			position.array[x] += velocity.array[x];
			position.array[y] += velocity.array[y];
			position.array[z] += velocity.array[z];

			if(dice()) position.array[x] += shake();
			if(dice()) position.array[z] += shake();

			const {a } = getOffsetRGBA(i);
			color.array[a] *= decrementRandom();
			if(color.array[a] < 0.001) color.array[a] = 0;
		}

		position.needsUpdate = true;
		velocity.needsUpdate = true;
		color.needsUpdate = true;
	}
}

class RichFireworks extends BasicFireworks{
	constructor(){
		super();
		this.max = 150;
		this.min = 100;
		this.petalsNum = THREE.MathUtils.randInt(this.min,this.max);
		this.flowerSizeRate = THREE.MathUtils.mapLinear(this.petalsNum,this.min,this.max,0.4,0.8);
		this.tailMeshGroup = new THREE.Group();
		this.tails = [];

	}
	explode(pos){
		this.isExplode = true;
		this.flower = this.getFlower(pos);
		this.tails = this.getTail();
		this.group.add(this.flower.mesh);
		this.group.add(this.tailMeshGroup);
	}

	getTail(){
		const tails = [];
		const num = 20;
		const {color:petalColor} = this.flower.mesh.geometry.attributes;

		for(let i =0; i < this.petalsNum;i++){
			const vels = [];

			for(let j = 0; j < num;j++){
				const vx = 0;
				const vy = 0;
				const vz = 0;
				vels.push(new THREE.Vector3(vx,vy,vz));
			}

			const tail = new ParticleTailMesh(num,vels);

			const {r,g,b,a} = getOffsetRGBA(i);
			const petalR = petalColor.array[r];
			const petalG = petalColor.array[g];
			const petalB = petalColor.array[b];
			const petalA = petalColor.array[a];

			const {position,color} = tail.mesh.geometry.attributes;

			for(let k =0; k < position.count;k++){
				const {r,g,b,a}  = getOffsetRGBA(k);
				color.array[r] = petalR;
				color.array[g] = petalG;
				color.array[b] = petalB;
				color.array[a] = petalA;
			}

			const {x,y,z} = this.flower.mesh.position;
			tail.mesh.position.set(x,y,z);
			tails.push(tail);
			this.tailMeshGroup.add(tail.mesh);
		}
		return tails;
	}

	update(gravity){
		if(!this.isExplode){
			this.drawTail(gravity);
		}else{
			this.flower.update(gravity);

			const {position:flowerGeometory} = this.flower.mesh.geometry.attributes;
			for(let i =0; i < this.tails.length;i++){
				const tail = this.tails[i];
				tail.update(gravity);
				const {x,y,z} = getOffsetXYZ(i);
				const flowerPos = new THREE.Vector3(flowerGeometory.array[x],flowerGeometory.array[y],flowerGeometory.array[z]);
				const {position,velocity} = tail.mesh.geometry.attributes;
				for(let k =0; k < position.count;k++){
					const {x,y,z} = getOffsetXYZ(k);
					const desiredVelocity = new THREE.Vector3();
					const tailPos = new THREE.Vector3(position.array[x],position.array[y],position.array[z]);
					const tailVel = new THREE.Vector3(velocity.array[x],velocity.array[y],velocity.array[z]);
					desiredVelocity.subVectors(flowerPos,tailPos);
					const steer = desiredVelocity.sub(tailVel);
					steer.normalize();
					steer.multiplyScalar(Math.random() * 0.0003 * this.life);
					velocity.array[x] += steer.x;
					velocity.array[y] += steer.y;
					velocity.array[z] += steer.z;
				}

				velocity.needsUpdate = true;
			}

			if(this.life > 0) this.life -= 1.2;
		}
	}
}

/**
 * 烟花粒子效果
 */
export class FireworkParticle{
	constructor(_options={}){
		this.options = _options;

		this.init();
	}

	init(){
		this.gravity = new THREE.Vector3(0,-0.005,0);
	
		this.noise = new SimplexNoise();
	
		this.fireworksInstances =[];
	

		this.scene = new THREE.Scene();
		this.perspectiveCamera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,0.001,1000);
		this.perspectiveCamera.position.set(0,-40,170);

		this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
		this.renderer.setClearColor(new THREE.Color(0x000),0);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.setClearAlpha(0);
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this.options.dom.appendChild(this.renderer.domElement);

		this.orbitControls = new OrbitControls(this.perspectiveCamera,this.renderer.domElement);
		this.orbitControls.update();

		const ambientLight = new THREE.AmbientLight(0x666666);
		this.scene.add(ambientLight);

		const spotLight = new THREE.SpotLight(0xfff,1.2);
		spotLight.distance = 2000;
		spotLight.position.set(-500,1000,0);
		spotLight.castShadow = true;
		this.scene.add(spotLight);

		const planeGeometry = new THREE.PlaneGeometry(200,200,10,10);
		const planeMaterial = new THREE.MeshLambertMaterial({
			side:THREE.DoubleSide,
			wireframe:true,
		});
		this.plane = new THREE.Mesh(planeGeometry,planeMaterial);
		this.plane.receiveShadow = true;
		this.plane.rotation.x = -0.5 * Math.PI;
		this.plane.position.set(0,-50,0);
		this.scene.add(this.plane);
		
		this.autoLaunch();
		this.options.dom.addEventListener('click',this.onClick.bind(this));
	}
	onClick(evt){
		//console.log('点击事件:',evt)
		//if(guiParams.autoLaunch) return;
		this.launchFireworks();
	}
	autoLaunch(){
		if(Math.random() > 0.7) this.launchFireworks();
	}
	launchFireworks(){
		// if(this.fireworksInstances.length > guiParams.fireworkNum) return;
		// Basic
		const fw = guiParams.fireworkType == 'Rich' ? new BasicFireworks() : new RichFireworks();
		this.fireworksInstances.push(fw);
		this.scene.add(fw.group);
		console.log(this.scene,this.fireworksInstances.length , guiParams.fireworkNum)
	}
	animate(){
		this.renderer.render(this.scene,this.perspectiveCamera);
		this.makeRoughGround();
		
		const exploadedIndexList =[];// 展开的列表

		for(let i = this.fireworksInstances.length - 1;i >= 0;i--){
			const instance = this.fireworksInstances[i];
			instance.update(this.gravity);
			if(instance.isExplode) exploadedIndexList.push(i);
		}

		for(let i = 0; i < exploadedIndexList.length;i++){
			const index = exploadedIndexList[i];
			const instance = this.fireworksInstances[index];
			if(!instance) return;

			instance.group.remove(instance.seed.mesh);
			instance.seed.disposeAll();
			if(instance.left <= 0){
				this.scene.remove(instance.group);
				if(instance.tailMeshGroup){
					instance.tails.forEach(v=>v.disposeAll())
				}

				instance.flower.disposeAll();
				this.fireworksInstances.splice(index,1);
			}
		}
	}
	/**
	 * 创建粗糙的地面
	 */
	makeRoughGround(){
		const time = Date.now();// 至1970 以来的毫秒值
		const {geometry} = this.plane;
		const position= geometry.attributes.position; 
		//console.log('this.plane:',this.plane);
		
		for(let i =0; i < position.count;i++){
			const noise1 = this.noise.noise3d(position.array[i].x * 0.01 + time * 0.0002,position.array[i + 1].y * 0.01 + time * 0.0002,position.array[i + 2].z * 0.01 + time * 0.0002) * 5;
			const noise2 = this.noise.noise3d(position.array[i].x * 0.02 + time * 0.00002,position.array[i + 1].y * 0.02 + time * 0.00004,position.array[i + 2].z * 0.02 + time * 0.00002) * 2;
			const noise3 = this.noise.noise3d(position.array[i].x * 0.015 + time * 0.00003,position.array[i + 1].y * 0.012 + time * 0.00003,position.array[i + 2].z * 0.015 + time * 0.00003) * 2;
			const distance = noise1 + noise2 + noise3;
			position.setZ(i,distance);
		}

		geometry.needsUpdate = true;
		geometry.computeVertexNormals();

	}

	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth,window.innerHeight);
	}
}

/**
 * 鼠标拖动噪声
 */
export class MouseNoise{
	constructor(options={}){
		this._options = options;
		this.loadTexture();
	}
	loadTexture(){
		const loader = new THREE.TextureLoader();
		loader.setCrossOrigin('anonymous');
		loader.load('./noises/noise.png',(texture)=>{
			this.texture = texture;
			this.texture.wrapS = THREE.RepeatWrapping;
			this.texture.wrapT = THREE.RepeatWrapping;
			this.texture.minFilter = THREE.LinearFilter;
			this.init();
		});
	}
	init(){
		this.perspectiveCamera = new THREE.PerspectiveCamera(65,window.innerWidth / window.innerHeight,0.0001,1000);
		this.perspectiveCamera.position.set(0,80,80);

		this.scene = new THREE.Scene();

		this.scene.add(new THREE.AmbientLight(0xffff,2.));
		const geometry  = new THREE.PlaneGeometry(100,100);

		this.rtTexture = new THREE.WebGLRenderTarget(window.innerWidth * 0.2,window.innerHeight * 0.2);
		this.rtTexture_2 = new THREE.WebGLRenderTarget(window.innerWidth * 0.2,window.innerHeight * 0.2);

		this.uniforms ={
			u_time:{type:'f',value:1.0},
			u_resolution:{type:'v2',value:new THREE.Vector2()},
			u_noise:{type:'t',value:this.texture},
			u_buffer:{type:'t',value:this.rtTexture.texture},
			u_mouse:{type:'v2',value:new THREE.Vector2()},
			u_renderPass:{type:'b',value:false}
		};
		this.material = new THREE.ShaderMaterial({
			uniforms:this.uniforms,
			vertexShader:`
				void main(){
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
				}
			`,
			fragmentShader:`
				uniform vec2 u_resolution;
				uniform vec2 u_mouse;
				uniform float u_time;
				uniform sampler2D u_noise;
				uniform sampler2D u_buffer;
				uniform bool u_renderPass;
					
				const float blurMultiplier = 0.98;
				const float circleSize = .25;
				const float blurStrength = .6;
				const float threshold = .5;
				const float scale = 3.;
				
				#define PI 3.141592653589793
				#define TAU 6.283185307179586

				vec2 hash2(vec2 p)
				{
					vec2 o = texture2D( u_noise, (p+0.5)/256.0, -100.0 ).xy;
					return o;
				}
				
				vec3 hsb2rgb( in vec3 c ){
					vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),
											6.0)-3.0)-1.0,
									0.0,
									1.0 );
					rgb = rgb*rgb*(3.0-2.0*rgb);
					return c.z * mix( vec3(1.0), rgb, c.y);
				}
				
				vec3 domain(vec2 z){
					return vec3(hsb2rgb(vec3(atan(z.y,z.x)/TAU,1.,1.)));
				}
				vec3 colour(vec2 z) {
					return domain(z);
				}

				
				#define pow2(x) (x * x)

				const int samples = 8;
				const float sigma = float(samples) * 0.25;

				float gaussian(vec2 i) {
					return 1.0 / (2.0 * PI * pow2(sigma)) * exp(-((pow2(i.x) + pow2(i.y)) / (2.0 * pow2(sigma))));
				}

				vec3 blur(sampler2D sp, vec2 uv, vec2 scale) {
					vec3 col = vec3(0.0);
					float accum = 0.0;
					float weight;
					vec2 offset;
					
					for (int x = -samples / 2; x < samples / 2; ++x) {
						for (int y = -samples / 2; y < samples / 2; ++y) {
							offset = vec2(x, y);
							weight = gaussian(offset);
							col += texture2D(sp, uv + scale * offset).rgb * weight;
							accum += weight;
						}
					}
					
					return col / accum;
				}
				void main() {
					vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
					uv *= scale;
					vec2 mouse = u_mouse * scale;
					
					vec2 ps = vec2(1.0) / u_resolution.xy;
					vec2 samples = gl_FragCoord.xy / u_resolution.xy;
					// vec2 o = vec2(.5);
					// float d = 1.05;
					// samples = d * (samples - o);
					// samples += o;
					samples += vec2(sin((u_time+uv.y)*10.)*.002, -.008);
					
					vec3 fragcolour;
					vec4 tex;
					if(u_renderPass) {
					tex = vec4(blur(u_buffer, samples, ps*blurStrength) * blurMultiplier, 1.);
					float df = length(mouse - uv);
					fragcolour = vec3( smoothstep( circleSize, 0., df ) );
					} else {
					tex = texture2D(u_buffer, samples, 2.) * .98;
					tex = smoothstep(threshold - fwidth(tex.x), threshold, tex);
					}
					// vec4 tex = texture2D(u_buffer, samples, 2.) * .98;
					
					

					gl_FragColor = vec4(fragcolour,1.0);
					gl_FragColor += tex;
					
				}
			`,
		});
		const mesh = new THREE.Mesh(geometry,this.material);
		this.scene.add(mesh);
		mesh.rotateX(-Math.PI * 0.5);

		this.clock = new THREE.Clock();

		this.renderer = new THREE.WebGLRenderer({antialias:true});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth,window.innerHeight);
		this.renderer.setAnimationLoop(this.animate.bind(this));
		this._options.dom.appendChild(this.renderer.domElement);

		this.renderer.domElement.addEventListener('pointermove',e=>{
			//console.log('dom：',e);
			let ratio = window.innerWidth / window.innerHeight;
			this.uniforms.u_mouse.x = (e.clientX - window.innerWidth / 2) / window.innerHeight / ratio;
			this.uniforms.u_mouse.y = (e.clientY - window.innerHeight / 2) / window.innerHeight * -1;

			e.preventDefault();
		},false);
	}


	animate(){
		this.uniforms.u_time.value += this.clock.getDelta();
		this.renderer.render(this.scene,this.perspectiveCamera);
		
		this.renderTexture();
	}
	renderTexture(){
		// 获取原始的分辨率
		let odims = this.uniforms.u_resolution.value.clone();// 
		this.uniforms.u_resolution.value.x = window.innerWidth * 0.2;
		this.uniforms.u_resolution.value.y = window.innerHeight * 0.2;

		this.uniforms.u_buffer.value = this.rtTexture_2.texture;
		this.uniforms.u_renderPass.value = true;
		this.renderer.setRenderTarget(this.rtTexture);
		this.renderer.render(this.scene,this.perspectiveCamera);

		let buffer = this.rtTexture;
		this.rtTexture = this.rtTexture_2;
		this.rtTexture_2 = buffer;

		this.uniforms.u_buffer.value = this.rtTexture.texture;
		this.uniforms.u_resolution.value = odims;
		this.uniforms.u_renderPass.value = false;
	}
	_windowResizeFun(){
		this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
		this.perspectiveCamera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth,window.innerHeight);

		this.rtTexture = new THREE.WebGLRenderTarget(window.innerWidth * 0.2,window.innerHeight * .2);
		this.rtTexture_2 = new THREE.WebGLRenderTarget(window.innerWidth * 0.2,window.innerHeight * 0.2);
	}
}


// three.js课程 -> 3D|layaair  -> shader -> cesium -> pixi.js



/**
 * 引言：
在一些智慧城市的项目中我们经常看到一些酷炫的扫光效果、各个方向的流动光线、半透明发光的电子围栏等等，给人一种赛博朋克的感觉。那这种酷炫的是怎么实现的呢？本篇文章主要讲一下扫光效果的实现；很明显这种扫光没有办法通过three.js自带的灯光实现，因为没有这些奇形怪状的灯啊，那就只能通过着色器材质实现了。

我们先看实现效果

这里直截了两张图，不过扫光全过程也可以想得到，就是光从中心点向外扩散一个具有宽度的圆环，被圆环光扫到的box和地板会被光照亮，我这里为了效果明显一些把光的颜色和强度调的很显眼，实际可以自己的审美调节一下。

实现思路：
问题一：什么东西需要参与扫光效果
我们可以看到主要是场景中的建筑物和地板参与了扫光效果，那就确定了这些物体需要单独写着色器材质

问题二：如何做到灯光同步
我们可以看到扫光的时候，扫光的圆半径不断扩大，到一定的半径后就变成消失了；那这两种材质要如何保持同步呢？

问题三：如何确定那些片元被灯光照到了？
我们在shadertoy等网站看到的一些demo都是通过uv坐标去着色的，我们是否可以通过uv坐标照到被灯光照到的片元或者顶点？如果不行还有没有别的办法

如果把这些疑问都解决了，那答案就会浮出水面了

我们边看代码边分析，场景初始化什么的就不给出来了，都是一样的，先随机生成一些box用来模拟智慧城市里面的建筑物和生成地板

	const getRandom = () => {
		return (-Math.random() * 1500 + 1500) - (Math.random() * 1500)
	}
 
	// 随机生成box
	for (let i = 0; i < 800; i++) {
		const height = Math.floor(Math.random() * 70 + 30)
		const boxGeo = new THREE.BoxGeometry(Math.floor(Math.random() * 30 + 10),height , Math.floor(Math.random() * 30 + 10))
		const boxMesh = new THREE.Mesh(boxGeo, shaderMat)
		boxMesh.position.copy(new THREE.Vector3(getRandom(), height / 2, getRandom()))
		scene.add(boxMesh)
	}
    // 添加地板
	const goundGeo = new THREE.PlaneGeometry(5000, 5000)
	const ground = new THREE.Mesh(goundGeo, planeMat)
	ground.rotateX(-Math.PI / 2)
	scene.add(ground)
我们先看看这里面的planeMat和shaderMat要如何实现

planeMat

 
			varying vec2 vUv;
			varying vec4 v_position;
			varying vec3 v_normal;
	
			uniform float innerCircleWidth;
			uniform float circleWidth;
			uniform vec3 center;
			uniform vec3 color;
 
            uniform sampler2D texture1;
	
			void main() {
 
				float dis = length(v_position.xyz - center);
				vec4 buildingColor = vec4(0.2,0.3,0.4,0.6);
                vec4 textureColor = texture(texture1,vUv);
 
				vec4 lightColor = vec4(0.2);
				vec3 lightDir = vec3(1.0,1.0,0.5);
				float c = dot(lightDir,v_normal);
                float r = 1.0- smoothstep(50.0,800.0,dis);
 
				float col = smoothstep(innerCircleWidth-circleWidth,innerCircleWidth,dis) - smoothstep(innerCircleWidth,innerCircleWidth+circleWidth,dis);
				vec4 scanColor = mix(buildingColor * r,vec4(color, 1.0),col);
				scanColor += lightColor*c + vec4(0.05);
 
				gl_FragColor = scanColor + vec4(textureColor.xyz * 2.5, 1.0);
			}
在代码中我们得到了问题三答案；首先我们在片元着色器接收了来自顶点着色器的v_position，然后通过glsl的length得到了场景中对象片元的世界坐标到中点（可以自定义）的距离。这个是整个过程中最关键，有了这个之后我们就可以用距离方程做很多有趣的东西，比如雷达扩散效果或者结合perlin噪音的随机制作一些波纹等等效果；这里我们主要是做扫光效果；那如果我不想从要这种圆的扩散效果，我想要矩形的从左到右或再从右到左再或者各种奇葩的效果怎么办呢？别怕，只需要通过距离照到要着色的片元，然后进行着色就可以了，一点也不慌

由于纯颜色看起来太单调，我加了一点纹理，也就是夜景夜景效果可以把材质用在box的除了顶部和底部的各个面看起来会更加好看，但由于不是这篇文章的重点就不说了，具体怎么实现，可以去看看文档；如何给不同的面指定不同的材质

里面还模拟了一下，聚光灯（从上往下，距离方程实现）、环境光、和平行光（点乘顶点法线和光的方向，注意向量归一化和点乘后的取值范围，因为背面是照不到的）的效果，环境光让整体有一点亮度，平行光让对象表面不同的明暗对比，更加有立体感，最后是聚光灯主要是突出我们强调的对象，这里就是我们的中心点啦，当然这些都不是我们的重点就展开说了，如果感兴趣后面再出一篇文章单独展开说明

顺便提一点，我为什么用mix而不像写前端代码那样用if else 那些执行代码，那是因为这些自带的glsl函数被称为魔法函数，是具有硬件加速效果的；运行的速度会更快、执行效率更高

shaderMat

			varying vec2 vUv;
			varying vec3 v_position;
	
			uniform float innerCircleWidth;
			uniform float circleWidth;
			uniform float opacity;
			uniform vec3 center;
		
			uniform vec3 color;
			uniform vec3 diff;
 
			bool hex(vec2 p) {
				p.x *= 0.57735*2.0;
				p.y += mod(floor(p.x), 2.0)*0.5;
				p = abs((mod(p, 1.0) - 0.5));
				return abs(max(p.x*1.5 + p.y, p.y*2.0) - 1.0) > 0.05;
		    }
 
			void main() {
 
				float dis = length(v_position - center);
 
				bool h = hex(vUv*100.0);
				float col = smoothstep(innerCircleWidth-circleWidth,innerCircleWidth,dis) - smoothstep(innerCircleWidth,innerCircleWidth+circleWidth,dis);
				vec4 finalColor = 1.0- mix(vec4(0.9),vec4(color, opacity),col);
				float r = 1.0- smoothstep(50.0,1000.0,dis);
		
				float hh;
				if(h){
					hh = float(h);
					gl_FragColor = finalColor + vec4(hh) * r * 0.6 + (1.0-r) * vec4(vec3(0.001),1.0);
				}else{
					gl_FragColor = vec4(0.0);     
				}
			}
地板的材质扫光效果的核心上面一样，也是通过距离方程实现的，上面主要是叠加了扫光、聚光灯和六边形，因为只有扫光的效果看起来有点单调，本来想找一点地板的纹理，但想了一下，我们要的是科技风！柯基峰！科技疯。我就加了六边形的效果，一看就很柯基疯，这不是重点就不展开说了

那说完了我好像没有回到问题二啊，如何同步，别急，别急，我知道你很急，但是你先别急啊

看完完整代码就会明白了，直接上代码

class ScanMat {
  shaderMat: THREE.ShaderMaterial;
  planeMat: THREE.ShaderMaterial;
  updateScan: () => void;
 
  radius: number;
  width: number;
  constructor(width: number, radius: number) {
    this.radius = radius;
    this.width = width;
    const texture = new THREE.TextureLoader().load('2.png')
    this.shaderMat = new THREE.ShaderMaterial({
      uniforms: {
        innerCircleWidth: {
          value: 0,
        },
        circleWidth: {
          value: width,
        },
        color: {
          value: new THREE.Color(0.8, 0.85, 0.9),
        },
        center: {
          value: new THREE.Vector3(0, 0, 0),
        },
        texture1: {
          value: texture,
        },
      },
      vertexShader: `
			varying vec2 vUv;
			varying vec4 v_position;
			varying vec3 v_normal;
			void main() {
				vUv = uv;
				v_position = modelMatrix * vec4(position, 1.0);
				v_normal = normal;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
			`,
      fragmentShader: `
			varying vec2 vUv;
			varying vec4 v_position;
			varying vec3 v_normal;
	
			uniform float innerCircleWidth;
			uniform float circleWidth;
			uniform vec3 center;
			uniform vec3 color;
      uniform sampler2D texture1;
	
			void main() {
				float dis = length(v_position.xyz - center);
				vec4 buildingColor = vec4(0.2,0.3,0.4,0.6);
        vec4 textureColor = texture(texture1,vUv);
				vec4 lightColor = vec4(0.2);
				vec3 lightDir = vec3(1.0,1.0,0.5);
				float c = dot(lightDir,v_normal);
        float r = 1.0- smoothstep(50.0,800.0,dis);
				float col = smoothstep(innerCircleWidth-circleWidth,innerCircleWidth,dis) - smoothstep(innerCircleWidth,innerCircleWidth+circleWidth,dis);
				vec4 scanColor = mix(buildingColor * r,vec4(color, 1.0),col);
				scanColor += lightColor*c + vec4(0.05);
				gl_FragColor = scanColor + vec4(textureColor.xyz * 2.5, 1.0);
			}
			`
    });
 
    this.planeMat = new THREE.ShaderMaterial({
      uniforms: {
        innerCircleWidth: {
          value: 0,
        },
        circleWidth: {
          value: width,
        },
        diff: {
          value: new THREE.Color(0.2, 0.2, 0.2),
        },
        color: {
          value: new THREE.Color(0.8),
        },
        opacity: {
          value: 0.9,
        },
        center: {
          value: new THREE.Vector3(0, 0, 0),
        },
      },
      vertexShader: `
			varying vec2 vUv;
			varying vec3 v_position;
			void main() {
				vUv = uv;
				v_position = position;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
			`,
      fragmentShader: `
			varying vec2 vUv;
			varying vec3 v_position;
	
			uniform float innerCircleWidth;
			uniform float circleWidth;
			uniform float opacity;
			uniform vec3 center;
		
			uniform vec3 color;
			uniform vec3 diff;
			bool hex(vec2 p) {
				p.x *= 0.57735*2.0;
				p.y += mod(floor(p.x), 2.0)*0.5;
				p = abs((mod(p, 1.0) - 0.5));
				return abs(max(p.x*1.5 + p.y, p.y*2.0) - 1.0) > 0.05;
		    }
			void main() {
				float dis = length(v_position - center);
				bool h = hex(vUv*100.0);
				float col = smoothstep(innerCircleWidth-circleWidth,innerCircleWidth,dis) - smoothstep(innerCircleWidth,innerCircleWidth+circleWidth,dis);
				vec4 finalColor = 1.0- mix(vec4(0.9),vec4(color, opacity),col);
				float r = 1.0- smoothstep(50.0,1000.0,dis);
		
				float hh;
				if(h){
					hh = float(h);
					gl_FragColor = finalColor + vec4(hh) * r * 0.6 + (1.0-r) * vec4(vec3(0.001),1.0);
				}else{
					gl_FragColor = vec4(0.0);     
				}
			}
			`,
      transparent: true,
    });
 
    this.updateScan = () => {
      this.shaderMat.uniforms.innerCircleWidth.value += 5;
      if (this.shaderMat.uniforms.innerCircleWidth.value > 2000) {
        this.shaderMat.uniforms.innerCircleWidth.value = -this.radius;
      }
      this.planeMat.uniforms.innerCircleWidth.value += 5;
      if (this.planeMat.uniforms.innerCircleWidth.value > 2000) {
        this.planeMat.uniforms.innerCircleWidth.value = -this.radius;
      }
    };
  }
}


 */