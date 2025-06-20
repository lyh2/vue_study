import * as THREE from "three/build/three.webgpu"


export class NodesClass {
    constructor(_options={}){
        this._options = _options;

        this._init();
    }

    _init(){
        this._scene = new THREE.Scene();
        this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.01,1000);
        this._perspectiveCamera.position.set(0,10,10);
        this._perspectiveCamera.lookAt(0,0,0);

        // 添加坐标轴
        const axesHelper = new THREE.AxesHelper(100);
        this._scene.add(axesHelper);

        // 创建渲染器
        //this._renderer = new THREE.WebGLRenderer({antialias:true});
        this._renderer = new WebGPURenderer({antialias:true});
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 2;

        this._options.dom.appendChild(this._renderer.domElement);

        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

        // 设置环境光
        const ambientLight = new THREE.AmbientLight(0xffff22,1);
        this._scene.add(ambientLight);

        this._clock = new THREE.Clock();

        this._loadTexture();

        // 创建节点材质
        this._useNodes();


        this._animate();
    }
    /**
     * 使用节点
     */
    _useNodes(){
        // 输出材质节点
        let material = new THREE.MeshPhysicalMaterial();
		//console.log("MeshPhysicalMaterial:",material);
        // 创建节点材质
        let nodeMaterial = NodeMaterial.fromMaterial(material);
		
        let carbonTexture = this._textureLoader.load("./textures/carbon/Carbon.png");
        carbonTexture.colorSpace = THREE.SRGBColorSpace;
        carbonTexture.wrapS = THREE.RepeatWrapping;
        carbonTexture.wrapT = THREE.RepeatWrapping;

        let carbonNormal = this._textureLoader.load("./textures/carbon/Carbon_Normal.png");
        carbonNormal.wrapS = THREE.RepeatWrapping;
        carbonNormal.wrapT = THREE.RepeatWrapping;


        let carbonUv = uv().mul(10);
		//console.log(texture(carbonTexture,carbonUv));

		nodeMaterial.colorNode = texture(carbonTexture,carbonUv);
		nodeMaterial.normalNode = normalMap(texture(carbonNormal,carbonUv)).mul(mx_noise_vec3(carbonUv));
		nodeMaterial.clearcoatNode = float(1);
		nodeMaterial.clearcoatRoughnessNode = float(0.01);
		nodeMaterial.roughnessNode = float(0.5);

		console.log('nodeMaterial=',nodeMaterial);

		// 创建几何体
		let geometry = new THREE.SphereGeometry(0.5,32,32);
		let sphere = new THREE.Mesh(geometry,nodeMaterial);
		sphere.position.set(2,0,0);
		this._scene.add(sphere);

		// 创建立方体
		let cubeGeometry = new THREE.BoxGeometry(1,1,1);
		let cube = new THREE.Mesh(cubeGeometry,nodeMaterial);
		cube.position.set(-2,0,0);
		this._scene.add(cube);
		
		// 创建平面
		let planeGeometry = new THREE.PlaneGeometry(1,1,10,10);
		let plane = new THREE.Mesh(planeGeometry,nodeMaterial);
		this._scene.add(plane);
    }
    /**
     * 加载纹理
     */
    _loadTexture(){
        this._textureLoader = new THREE.TextureLoader();
        this._rgbeLoader = new RGBELoader();
        this._rgbeLoader.load("./resouces/Noon_4k.hdr",envMap=>{
            envMap.mapping = THREE.EquirectangularReflectionMapping;
            this._scene.background = envMap;
            this._scene.environment = envMap;
        });

    }
    _animate(){
        this._renderer.render(this._scene,this._perspectiveCamera);
        this._orbitControls.update();
        requestAnimationFrame(this._animate.bind(this));
    }

    _windowResizeFun(params={}){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}