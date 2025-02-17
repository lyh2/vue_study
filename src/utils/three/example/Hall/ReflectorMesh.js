
/**
 * reflector:反光玻璃
 */
import * as THREE from "three";

class ReflectorMesh extends THREE.Mesh{
    constructor(geometry,options={}){
        super(geometry);

        this.isReflector = true;
        this.type = "Reflector";
        this.camera = new THREE.PerspectiveCamera();
        const scope = this;
        const color = options.color !== undefined ? new THREE.Color(options.color) : new THREE.Color(0x7f7f7f);
        const textureWidth = options.textureWidth || 512;
        const textureHeight = options.textureHeight || 512;
        const clipBias = options.clipBias || 0;
        const shader = options.shader || ReflectorMesh.ReflectorShader;
        const multisample = options.multisample !== undefined ? options.multisample : 4;// 多个采样

        const reflectorPlane = new THREE.Plane();
        const normal = new THREE.Vector3();// 法线
        const reflectorWorldPosition = new THREE.Vector3();
        const cameraWorldPosition = new THREE.Vector3();
        const rotationMatrix = new THREE.Matrix4();
        const lookAtPosition = new THREE.Vector3(0,0,-1);
        const clipPlane = new THREE.Vector4();

        const view = new THREE.Vector3();
        const target = new THREE.Vector3();
        const q = new THREE.Vector4();

        const textureMatrix = new THREE.Matrix4();
        const virtualCamera = this.camera;

        /**
         * 渲染目标纹理
         */
        const renderTarget = new THREE.WebGLRenderTarget(textureWidth,textureHeight,{
            samples:multisample,// 4
            type:THREE.HalfFloatType,

        });
        const material = new ShaderMaterial({
            uniforms:THREE.UniformsUtils.clone(shader.uniforms),
            fragmentShader:shader.fragmentShader,
            vertexShader:shader.vertexShader,
        });
        material.uniforms['tDiffuse'].value = renderTarget.texture;
        material.uniforms['uColor'].value = color;
        material.uniforms['uTextureMatrix'].value = textureMatrix; 

        this.material = material;

        /**
         * 在渲染之前进行处理，这个回调函数有多个参数
         * @param {*} renderer 
         * @param {*} scene 
         * @param {*} camera 
         */
        this.onBeforeRender = function(renderer,scene,camera){
            reflectorWorldPosition.setFromMatrixPosition(scope.matrixWorld);
            cameraWorldPosition.setFromMatrixPosition(camera.materialWorld); // 得到相机的世界坐标位置
            rotationMatrix.extractRotation(scope.matrixWorld);

            normal.set(0,0,1);
            normal.applyMatrix4(rotationMatrix);

            view.subVectors(reflectorWorldPosition,cameraWorldPosition);
            if(view.dot(normal) > 0) return;

            view.reflect(normal).negate();
            view.add(reflectorWorldPosition);

            rotationMatrix.extractRotation(camera.matrixWorld);

            lookAtPosition.set(0,0,-1);
            lookAtPosition.applyMatrix4(rotationMatrix);
            lookAtPosition.add(cameraWorldPosition);

            target.subVectors(reflectorWorldPosition,lookAtPosition);
            target.reflect(normal).negate();
            target.add(reflectorWorldPosition);

            virtualCamera.position.copy(view);
            virtualCamera.up.set(0,1,0);
            virtualCamera.up.applyMatrix4(rotationMatrix);
            virtualCamera.up.reflect(normal);
            virtualCamera.lookAt(target);

            virtualCamera.far = camera.far;
            virtualCamera.updateMatrixWorld();
            virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

            // 更新纹理矩阵，因为前面给的全是0值
            textureMatrix.set(0.5,0.,0.,0.5,
                0.,0.5,0.,0.,
                0.,0.5,0.5,0.,
                0.,0.,0.,1.
            );
            textureMatrix.multiply(virtualCamera.projectionMatrix);
            textureMatrix.multiply(virtualCamera.matrixWorldInverse);
            textureMatrix.multiply(scope.matrixWorld);

            // 指定法线和一个点，创建一个平面
            reflectorPlane.setFromNormalAndCoplanarPoint(normal,reflectorWorldPosition);
            reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);

            clipPlane.set(reflectorPlane.normal.x,reflectorPlane.normal.y,reflectorPlane.normal.z,reflectorPlane.constant);

            const projectionMatrix = virtualCamera.projectionMatrix;
            q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[0]) / projectionMatrix.elements[0];
            q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
            q.z = -1.0;
            q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

            clipPlane.multiplyScalar(2. /clipPlane.dot(p));

            projectionMatrix.elements[2] = clipPlane.x;
            projectionMatrix.elements[6] = clipPlane.y;
            projectionMatrix.elements[10] = clipPlane.z + 1. - clipBias;
            projectionMatrix.elements[14] = clipPlane.w;

            scope.visible = false;

            const currentRenderTarget = renderer.getRenderTarget();
            const currentXrEnabled = renderer.xr.enabled;
            const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
            const currentOutputEncoding = renderer.outputEncoding;
            const currentToneMapping = renderer.toneMapping;

            renderer.xr.enabled = false;
            renderer.shadowMap.autoUpdate = false;
            renderer.toneMapping = THREE.NoToneMapping;

            renderer.setRenderTarget(renderTarget);

            renderer.state.buffers.depth.setMask(true);

            if(renderer.autoClear === false) renderer.clear();

            renderer.render(scene,virtualCamera);

            renderer.xr.enabled = currentXrEnabled;
            renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
            renderer.toneMapping = currentToneMapping;
            renderer.setRenderTarget(currentRenderTarget);

            const viewport = camera.viewport;

            if(viewport !== undefined){
                renderer.state.viewport(viewport);
            }
            scope.visible = true;

        }

        this.getRenderTarget = function(){
            return renderTarget;
        };

        this.dispose = function(){
            renderTarget.dispose();
            scope.material.dispose();
        }
    }
}

/**
 * 预定义shader
 */
ReflectorMesh.ReflectorShader ={
    unforms:{
        uColor:{value:null},
        tDiffuse:{value:null},
        textureMatrix:{value:null},

    },
    vertexShader:`
        uniform mat4 uTextureMatrix;
        varying vec4 vUv;

        #include <common>
        #include <logdepthbuf_pars_vertex>

        void main(){
            vUv = uTextureMatrix * vec4(position,1.);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);

            #include <logdepthbuf_vertex>

        }
    `,
    fragmentShader:`
        uniform vec3 uColor;
        uniform sampler2D tDiffuse;
        varying vec4 vUv;
        
        #include <logdepthbuf_pars_fragment>

        float blendOverlay(float base,float blend){
            return (base < 0.5 ? (2. * base * blend) : (1. - 2. * (1. - base) * ( 1. - blend)));
        }

        vec3 blendOverlay(vec3 base,vec3 blend){
            return vec3(blendOverlay(base.r,blend.r),blendOverlay(base.g,blend.g),blendOverlay(base.b,blend.b));
        }
        void main(){

            #include <logdepthbuf_fragment>

            vec4 base = textureProj(tDiffuse,vUv);// 这个texture2DProj方法已经没有了
            gl_FragColor = vec4(blendOverlay(base.rgb,uColor),1.0);
            gl_FragColor = mix(gl_FragColor,vec4(0.05,0.05,0.1,1.),0.5);

            #include <tonemapping_fragment>
            #include <encodings_fragment>
        }
    `,
};

export {ReflectorMesh};