import * as THREE from "three";
import { EffectComposer, GLTFLoader, OutputPass, RenderPass, UnrealBloomPass } from "three/examples/jsm/Addons.js";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
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




// three.js课程 -> 3D|layaair  -> shader -> cesium -> pixi.js

// 烟花效果：https://mp.weixin.qq.com/s/8cIQEULc7bll4x4uy8XV4g
// 炫酷的shader 效果 https://codepen.io/timseverien/pen/rWdJZY
// 鼠标移动拖尾效果： https://codepen.io/Yakudoo/pen/bGOMJPw
// 实现老鼠向前行走的效果:https://codepen.io/elliezen/details/JNjgwy
// 雨滴落在水面效果：https://codepen.io/iondrimba/details/EMwvgE
// 水球包含的效果：https://codepen.io/stivaliserna/details/GRNxGrR
// 卡通飞机飞行的效果：https://codepen.io/seanfree/pen/gwpmPJ
// 卡通飞机飞行的效果：https://codepen.io/Zultan/details/mwGZBP
// 卡通长树地球：https://codepen.io/soju22/pen/OYvjMp
// 变形球：https://codepen.io/daniel-hult/pen/QWqvxvp
// 变形球：https://codepen.io/tksiiii/pen/jwdvGG
// 不断前进不断生长树：https://codepen.io/prisoner849/pen/PvdEMP
// 星系空间：https://codepen.io/aderaaij/pen/oNBWEWv
// 立方体带上噪声：https://codepen.io/aderaaij/details/gOmrYKx
// 有点像冰与火的效果：https://codepen.io/timseverien/pen/rWdJZY
// 模拟掉下去水的效果:https://codepen.io/yitliu/pen/bJoQLw?editors=0010
// 烟花爆竹: https://codepen.io/rudtjd2548/pen/gOEgGPb?editors=1010
// 烟花效果：https://codepen.io/tksiiii/pen/VOEKLQ?editors=1010
// 烟雾粒子：https://codepen.io/marcobiedermann/pen/jympXQ?editors=0010
// fbm:https://codepen.io/aderaaij/pen/XWpMONO?editors=1010
// 粒子效果：https://codepen.io/enesser/pen/NWeQzP?editors=0010
// shader 球：https://codepen.io/isladjan/pen/bGpjZwN
// 鼠标shader效果：https://codepen.io/shubniggurath/details/LrXQBe
// 字体纹理：https://codepen.io/ksenia-k/pen/WNyxXpO?editors=0010
// 球体效果：https://codepen.io/Thibka/pen/XpmbKa?editors=0010
// 音频：https://codepen.io/sdras/pen/PVjPKa
// 动画：https://codepen.io/pehaa/pen/KKXMKMN
// wasd: https://codepen.io/codypearce/details/MWYoJgL
// 分割球：https://codepen.io/shshaw/pen/dmNoRz?editors=0010
// 绘制线：https://codepen.io/jackrugile/pen/LeJowx
// shader 天空云：https://codepen.io/shubniggurath/pen/BVKgJK
// 3D 城市：https://codepen.io/b29/pen/yLzJbzy?editors=0010
// 鼠标移动到上面放大特效：https://codepen.io/devildrey33/pen/PWVPag?editors=0010
// shader :https://codepen.io/shubniggurath/pen/NXGbBo
// 画字： https://codepen.io/bradarnett/pen/XyZKaG?editors=0010
// shader 球：https://codepen.io/tksiiii/details/deVrPR
// shader火焰：https://codepen.io/shubniggurath/details/XPNrbB
// 无限循环门：https://codepen.io/mathijspb/pen/mXGNBm
// shader 粒子：https://codepen.io/gnauhca/pen/VzJXGG?editors=0110
// 上下串动盒子： https://codepen.io/iondrimba/pen/rqVaKp
// 好看的球：https://codepen.io/birjolaxew/pen/kGByyb
// 飞机：https://codepen.io/aleksnc/pen/dmdzYo
// 噪声：https://codepen.io/shubniggurath/pen/gvvVvY
// 变形的球体：https://codepen.io/ya7gisa0/pen/vGJvWw
// 游戏球：https://codepen.io/iondrimba/pen/YzpwNLo?editors=0010
// audio 分析：https://codepen.io/code_dependant/details/jOmPjr
// shader:https://codepen.io/shubniggurath/pen/NYeQpM
// 布料：https://codepen.io/Nuwen/details/jWOemK
// 小球包大球：https://codepen.io/soju22/pen/MWyorNd
// 球里包鸡蛋：https://codepen.io/ScavengerFrontend/pen/KKKjvZE
// 水滴：https://www.shadertoy.com/view/4dfGzM
// 水流：https://www.shadertoy.com/view/wldcW2
// 水流2：https://www.shadertoy.com/view/wlsXDM
// 粒子：https://www.shadertoy.com/view/4ss3DM
// 喷水：https://www.shadertoy.com/view/4lBGzt
// 烟花效果：https://codepen.io/jackrugile/pen/nExVvo
// 火焰效果：https://codepen.io/Chiku-Piku/pen/KKqKaOv
// 穿越之门：https://codepen.io/bbx/pen/WMVaxq
// webgl shader 星空：https://codepen.io/darrylhuffman/pen/gRZrpv
// webgl 鬼脸带粒子拖尾效果：https://codepen.io/ksenia-k/pen/yLGxEKb
// 不断前进的山：https://codepen.io/ykob/pen/aBrjaR?editors=1010
// 噪声使用在plane：https://codepen.io/ykob/pen/BzwQGb
// shader 实现下雪效果：https://codepen.io/bsehovac/pen/GPwXxq
// 创建房间：https://codepen.io/aperesso/pen/KyMzzp
// webgl 甲壳虫：https://codepen.io/pjkarlik/pen/dyzGxRE
// 绘制心形：https://codepen.io/pehaa/pen/wvPgboY
// 图片变灰变量放大缩小效果：https://codepen.io/doublejump/pen/OZmQLw
// 绘制卡通地球：https://codepen.io/s___/details/DvgKWP
// three.js 球体动画：https://codepen.io/soju22/pen/MWyorNd
// 点击长出花：https://codepen.io/ksenia-k/details/RwqrxBG
// 模拟下雪：https://codepen.io/tksiiii/details/MRjWzv
// shader 鼠标特效：https://codepen.io/robin-dela/pen/ZLdOPN
// shader 球体放大缩小：https://codepen.io/yoanngueny/pen/AWoYxQ
// shader 网格噪声：https://codepen.io/tksiiii/pen/qQXWVb
// shader 代码：https://codepen.io/shubniggurath/pen/ZZBBKP
// 立方体盒子包含球体：https://codepen.io/hisamikurita/pen/JjYQEzY
// 噪声效果：https://codepen.io/vcomics/pen/jeWpgX
// shader 烟花：https://codepen.io/strangerintheq/pen/abNvxrz?editors=1010
// shader 动画：https://codepen.io/perbyhring/pen/jOLVVGw
// webgl 点击 发射粒子效果：https://codepen.io/towc/details/LbozVW
// 音乐+前进地形：https://codepen.io/jhnsnc/pen/GRJeOWZ
// 隧道效果：https://codepen.io/b29/pen/gOLpMWw
// 跑动的人：https://codepen.io/b29/pen/yQXQrg
// 3D 数学：https://codepen.io/Thibka/details/XpmbKa
// 变形的球体：https://codepen.io/lila1984/pen/zYBLVKb
// 学习material:https://codepen.io/ksenia-k/details/NWJaBZb
// 不停旋转且向前传递的效果：https://codepen.io/iondrimba/pen/PoGMeaq
// 方框Cannon游戏自动截取mesh：https://codepen.io/HunorMarton/pen/MWjBRWp
// 类似跳一跳：https://codepen.io/HunorMarton/pen/JwWLJo

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