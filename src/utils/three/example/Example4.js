
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import GUI from "three/examples/jsm/libs/lil-gui.module.min";
import { initUseAnnotation, initUseEyes, initUseScene, initUseShaderSpriteFireyAuraeffect, initUseLighting, updateAnnotation, initUseFireflies, initUseFireworks, initUseDealShader, initUseBaseMaterial, initStudyShader, initUseEffectComposer, initUseCSS2DRenderer, initUseMorphTarget, initUseVRRoom, initUseSmartCity, initBoneAnimation } from "./Fun/Fun4";
import TWEEN from "three/examples/jsm/libs/tween.module";
import ThreePlus from "./Hall/ThreePlus";


export default class Example4 {
    constructor(options = {}) {
        this._options = options;

    }

    _init(params = {}) {
        //console.log('传递过来的参数:',params);
        // 创建相机
        this._scene = new THREE.Scene();

        this._renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, alpha: true });
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderer.outputColorSpace = THREE.SRGBColorSpace;
        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 0.1;


        this._options.dom.appendChild(this._renderer.domElement);

        this._perspectiveCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

        this._perspectiveCamera.position.set(0, 20, 20);


        const axesHelper = new THREE.AxesHelper(100);
        this._scene.add(axesHelper);

        this._clock = new THREE.Clock();

        //this._scene.add(new THREE.AmbientLight(0xffffff,1));

        //this._fireworks = initUseScene({scene:this._scene,renderer:this._renderer,perspectiveCamera:this._perspectiveCamera});

        //this._sprite = initUseShaderSpriteFireyAuraeffect({scene:this._scene});
        //this._sprite = initUseEyes({scene:this._scene,dom:this._renderer.domElement});

        // 给几何体对象添加 消息提示框
        let obj = null;//initUseAnnotation({scene:this._scene,annotation:params.annotation,canvas:params.canvas});
        if (obj) {
            this._moreObjects = {
                cube: obj.cube,
                sprite: obj.sprite,
                dom: this._renderer.domElement,
                camera: this._perspectiveCamera,
                annotation: params.annotation
            };
        }

        // 旋转球
        // let retObjs = initUseLighting({scene:this._scene});
        // this._mesh_1 = retObjs.mesh_1;
        // this._mesh_2 = retObjs.mesh_2;

        // 鬼屋
        //this._fireObjects = initUseFireflies({scene:this._scene,renderer:this._renderer});
        //console.log(this._fireObjects)

        //initUseFireworks({scene:this._scene,renderer:this._renderer});
        // this._customUniforms = initUseDealShader({scene:this._scene});

        // this._basicUniforms = initUseBaseMaterial({scene:this._scene});

        // this._uniforms = initStudyShader({scene:this._scene});

        //this._effectObject= initUseEffectComposer({scene:this._scene,renderer:this._renderer,camera:this._perspectiveCamera});

        //this._cssRenderer = initUseCSS2DRenderer({scene:this._scene,renderer:this._renderer,orbitControls:this._orbitControls,dom:this._options.dom});
        if (this._cssRenderer != null) {
            this._orbitControls = new OrbitControls(this._perspectiveCamera, this._cssRenderer.labelRenderer.domElement);

        } else {
            this._orbitControls = new OrbitControls(this._perspectiveCamera, this._renderer.domElement);

        }

        //initUseMorphTarget({scene:this._scene});

        //this._vrRoom = initUseVRRoom({scene:this._scene});

        this._boneObj = initBoneAnimation({ scene: this._scene });


        this._renderer.setAnimationLoop(this._animate.bind(this));
    }

    /**
     * 智慧城市
     * @param {*} params 
     */
    _init_(params = {}) {
        initUseSmartCity(params);
    }

    __init(params = {}) {
        this._threePlus = new ThreePlus(params.dom);
        this._threePlus.setBackgroundUseJpg("./hall/bl.jpg");
        //console.log(this._threePlus)

        this._threePlus.gltfLoader("./model/exhibition-min1.glb").then(gltf => {
            let floorArr = [];
            gltf.scene.traverse(child => {
                if (child.isLight) {
                    child.intensity = 1;
                }

                if (child.isMesh && child.material.name.indexOf("Glass") !== -1 && false) {
                    child.geometry.computeVertexNormals();
                    const cubeMaterial3 = new THREE.MeshPhongMaterial({
                        color: 0xffcdcd,
                        envMap: this.
                            _threePlus.scene.environment,
                        refractionRatio: 0.98,
                        reflectivity: 0.98,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.6,
                    });

                    child.material = cubeMaterial3;

                    const geometry = new THREE.TorusKnotGeometry(0.5, 0.15, 50, 8);
                    const material = new THREE.MeshBasicMaterial({
                        color: 0xffdd00,
                    });
                    const torusKnot = new THREE.Mesh(geometry, material);
                    torusKnot.position.set(0, 4, 0);
                    torusKnot.scale.set(1, 3, 1);
                    child.add(torusKnot);
                }

                if (child.isMesh && child.material.name.indexOf("floor") !== -1 && false) {
                    child.material = new THREE.MeshBasicMaterial({
                        map: child.material.map,
                    });
                    floorArr.push(child);
                }
            });

            this._threePlus.scene.add(gltf.scene);
            // this._threePlus.mouseRay(floorArr,(intersects)=>{
            //     console.log("香蕉:",intersects);
            // });
        });

        this._threePlus.setLight();
    }

    _animate() {
        //requestAnimationFrame(this._animate.bind(this));
        if (this._fireworks != null) {
            this._fireworks.forEach((item, i) => {
                const type = item.update();
                if (type == "remove") {
                    this._fireworks.splice(i, 1);
                }
            })
        }

        if (this._sprite != null) {
            //console.log(this._clock.getDelta(),performance.now())
            this._sprite.material.uniforms.uTime.value = performance.now();
        }

        if (this._moreObjects) {
            updateAnnotation(this._moreObjects);
        }

        if (this._mesh_1 != null) {
            this._mesh_1.material.map.offset.x = performance.now() / 1000 / 2;
            this._mesh_1.material.map.offset.y = performance.now() / 1000 / 2.5;
        }
        if (this._mesh_2 != null) {
            this._mesh_2.position.y -= 0.5;
            this._mesh_2.material.opacity -= 0.05;
            // 如果透明度小于0 ，则初始化位置和透明度
            if (this._mesh_2.material.opacity <= 0) {
                this._mesh_2.position.y = 5;
                this._mesh_2.material.opacity = 1;
            }
        }

        if (this._fireObjects != null) {
            this._fireObjects.firefilesMaterial.uniforms.uTime.value = this._clock.getElapsedTime();
            this._fireObjects.portalLightMaterial.uniforms.uTime.value = this._clock.getElapsedTime();
        }

        if (this._customUniforms != null) {
            this._customUniforms.uTime.value = this._clock.getElapsedTime();
        }

        if (this._basicUniforms != null) {
            this._basicUniforms.uTime.value += this._clock.getElapsedTime();
        }

        if (this._uniforms != null) {
            this._uniforms.uTime.value = this._clock.getElapsedTime();

        }
        if (this._effectObject != null) {

            this._effectObject.effectComposer.render();
            this._effectObject.techPass.material.uniforms.uTime.value += this._clock.getDelta();
        } else if (this._cssRenderer != null) {
            this._cssRenderer.labelRenderer.render(this._scene, this._perspectiveCamera);
            this._renderer.render(this._scene, this._perspectiveCamera);

            const point = this._cssRenderer.curve.getPoint(this._clock.getElapsedTime() / 10 % 1);
            this._cssRenderer.moon.position.copy(point);
            //this._perspectiveCamera.lookAt()
        }
        else {
            this._renderer.render(this._scene, this._perspectiveCamera);

        }

        if (this._boneObj != null) {
            this._boneObj.mixer.update(this._clock.getDelta());
        }
        TWEEN.update();

    }

    _onWindowResizeEvent(params = {}) {
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderer.setPixelRatio(window.devicePixelRatio);

        if (this._effectComposer != null) {
            this._effectComposer.setSize(window.innerWidth, window.innerHeight);
            this._effectComposer.setPixelRatio(window.devicePixelRatio);
        }
    }
}