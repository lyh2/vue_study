/**
 * 火焰
 */

import * as THREE from 'three';

let MyFire3 = function () {

    let fireVertexShader = `
attribute vec4 orientation;
attribute vec3 offset;
attribute vec2 scale;
attribute float life;
attribute float random;

varying vec2 vUv;
varying float vRandom;
varying float vAlpha;

float range(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
    float oldRange = oldMax - oldMin;
    float newRange = newMax - newMin;
    return (((oldValue - oldMin) * newRange) / oldRange) + newMin;
}

// From Inigo Quilez http://www.iquilezles.org/www/articles/functions/functions.htm
float pcurve(float x, float a, float b) {
    float k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
    return k * pow(x, a) * pow(1.0 - x, b);
}

void main() {
    vUv = uv;
    vRandom = random;

    vAlpha = pcurve(life, 1.0, 2.0);

    vec3 pos = position;

    pos.xy *= scale * vec2(range(pow(life, 1.5), 0.0, 1.0, 1.0, 0.6), range(pow(life, 1.5), 0.0, 1.0, 0.6, 1.2));

    vec4 or = orientation;
    vec3 vcV = cross(or.xyz, pos);
    pos = vcV * (2.0 * or.w) + (cross(or.xyz, vcV) * 2.0 + pos);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

    let fireFragmentShader = `
uniform sampler2D uMap;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uTime;

varying vec2 vUv;
varying float vAlpha;
varying float vRandom;

void main() {
    vec2 uv = vUv;

    float spriteLength = 10.0;
    uv.x /= spriteLength;
    float spriteIndex = mod(uTime * 0.1 + vRandom * 2.0, 1.0);
    uv.x += floor(spriteIndex * spriteLength) / spriteLength;

    vec4 map = texture2D(uMap, uv);

    gl_FragColor.rgb = mix(uColor2, uColor1, map.r);
    gl_FragColor.a = vAlpha * map.a;
}
`;

    let embersVertexShader = `
attribute float size;
attribute float life;
attribute vec3 offset;

varying float vAlpha;

// From Inigo Quilez http://www.iquilezles.org/www/articles/functions/functions.htm
float impulse(float k, float x) {
    float h = k * x;
    return h * exp(1.0 - h);
}

void main() {
    vAlpha = impulse(6.28, life);

    vec3 pos = position;
    pos += offset * vec3(life * 0.7 + 0.3, life * 0.9 + 0.1, life * 0.7 + 0.3);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
}
`;

    let embersFragmentShader = `
uniform sampler2D uMap;
uniform vec3 uColor;

varying float vAlpha;

void main() {
    vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
    vec4 mask = texture2D(uMap, uv);

    gl_FragColor.rgb = uColor;
    gl_FragColor.a = mask.a * vAlpha * 0.8;
}
`;

    let hazeVertexShader = `
attribute vec3 base;
attribute vec3 offset;
attribute vec4 orientation;
attribute vec2 scale;
attribute float life;

varying float vAlpha;
varying vec2 vUv;

// From Inigo Quilez http://www.iquilezles.org/www/articles/functions/functions.htm
float impulse(float k, float x) {
    float h = k * x;
    return h * exp(1.0 - h);
}

float pcurve(float x, float a, float b) {
    float k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
    return k * pow(x, a) * pow(1.0 - x, b);
}

void main() {
    vUv = uv;
    vAlpha = pcurve(life, 1.0, 2.0);

    vec3 pos = position;

    pos.xy *= scale * (life * 0.7 + 0.3);

    vec4 or = orientation;
    vec3 vcV = cross(or.xyz, pos);
    pos = vcV * (2.0 * or.w) + (cross(or.xyz, vcV) * 2.0 + pos);

    pos += base;
    pos += offset * vec3(life * 0.7 + 0.3, life * 0.9 + 0.1, life * 0.7 + 0.3);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);;
}
`;

    let hazeFragmentShader = `
uniform sampler2D uMap;
uniform sampler2D uMask;
uniform vec2 uResolution;

varying float vAlpha;
varying vec2 vUv;

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    vec2 mask = texture2D(uMask, vUv).ra - vec2(0.5);
    uv -= mask * 0.1;
    vec4 tex = texture2D(uMap, uv);

    gl_FragColor.rgb = tex.rgb;
    gl_FragColor.a = vAlpha * 0.5;
}
`;

    function random(min, max, precision) {
        var p = Math.pow(10, precision);
        return Math.round((min + Math.random() * (max - min)) * p) / p;
    }


    let _scene;
    let _renderer;
    let _camera;
    let _controls;
    let _rtt;
    let _fire;
    let _width;
    let _height;

    this.objs = [];

    let _self = this;

    this._isShow = false;

    let _pos_x;
    let _pos_y;
    let _pos_z;

    this.config = function (scene_, renderer_, camera_, controls_) {
        _width = 1920;
        _height = 1040;

        _renderer = renderer_;
        _scene = scene_;
        _camera = camera_;
        _controls = controls_;

        var _parameters = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false
        };
        _rtt = new THREE.WebGLRenderTarget(_width * 0.5, _height * 0.5, _parameters);
    }

    this.setPosition = function name(x, y, z) {
        _pos_x = x;
        _pos_y = y;
        _pos_z = z;
    }

    this.showFire = function () {
        initFire();
        initEmbers();
        initHaze();
        this._isShow = true;
    }

    this.refresh = function () {
        _self.loop();
        _self.loop2();
        _self.loop3();
    }

    this.isShow = function () {
        return this._isShow;
    }

    this.hide = function () {
        _self.objs.map(obj => {
            _scene.remove(obj);
        });
        this._isShow = false;
    }

    this.show = function () {
        _self.objs.map(obj => {
            _scene.add(obj);
        });
        this._isShow = true;
    }

    //=====// Fire //========================================//     

    function initFire() {
        var _geometry, _shader, _mesh, _group;
        var _num = 50;

        var _x = new THREE.Vector3(1, 0, 0);
        var _y = new THREE.Vector3(0, 1, 0);
        var _z = new THREE.Vector3(0, 0, 1);

        var _tipTarget = new THREE.Vector3();
        var _tip = new THREE.Vector3();
        var _diff = new THREE.Vector3();

        var _quat = new THREE.Quaternion();
        var _quat2 = new THREE.Quaternion();

        (function () {
            initGeometry();
            initInstances();
            initShader();
            initMesh();
        })();

        function initGeometry() {
            _geometry = new THREE.InstancedBufferGeometry();
            _geometry.maxInstancedCount = _num;

            var shape = new THREE.PlaneGeometry(500, 500);
            shape.translate(0, 0.4, 0);
            var data = shape.attributes;

            _geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.position.array), 3));
            _geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(data.uv.array), 2));
            _geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.normal.array), 3));
            _geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(shape.index.array), 1));
            shape.dispose();
        }

        function initInstances() {
            var orientation = new THREE.InstancedBufferAttribute(new Float32Array(_num * 4), 4);
            var randoms = new THREE.InstancedBufferAttribute(new Float32Array(_num), 1);
            var scale = new THREE.InstancedBufferAttribute(new Float32Array(_num * 2), 2);
            var life = new THREE.InstancedBufferAttribute(new Float32Array(_num), 1);

            for (let i = 0; i < _num; i++) {
                orientation.setXYZW(i, 0, 0, 0, 1);
                life.setX(i, i / _num + 1);
            }

            _geometry.setAttribute('orientation', orientation);
            _geometry.setAttribute('scale', scale);
            _geometry.setAttribute('life', life);
            _geometry.setAttribute('random', randoms);
        }

        function initShader() {
            var uniforms = {
                uMap: {
                    type: 't',
                    value: null
                },
                uColor1: {
                    type: 'c',
                    value: new THREE.Color(0x961800)
                }, // red
                uColor2: {
                    type: 'c',
                    value: new THREE.Color(0x4b5828)
                }, // yellow
                uTime: {
                    type: 'f',
                    value: 0
                },
            };

            _shader = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: fireVertexShader,
                fragmentShader: fireFragmentShader,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthTest: false,
                side: THREE.DoubleSide,
            });

            var textureLoader = new THREE.TextureLoader();
            textureLoader.load('images/myFire3/flame.png', t => _shader.uniforms.uMap.value = t);
        }

        function initMesh() {
            _group = new THREE.Group();
            _mesh = new THREE.Mesh(_geometry, _shader);
            _mesh.frustumCulled = false;
            _group.add(_mesh);
            _scene.add(_group);
            _self.objs.push(_group);
            _fire = _group;
        }

        _self.loop = function () {
            let e = 100;
            _shader.uniforms.uTime.value = e * 0.001;

            var life = _geometry.attributes.life;
            var orientation = _geometry.attributes.orientation;
            var scale = _geometry.attributes.scale;
            var randoms = _geometry.attributes.random;

            for (let i = 0; i < _num; i++) {
                var value = life.array[i];
                value += 0.04;

                if (value > 1) {
                    value -= 1;

                    _quat.setFromAxisAngle(_y, random(0, 3.14, 3));
                    _quat2.setFromAxisAngle(_x, random(-1, 1, 2) * 0.1);
                    _quat.multiply(_quat2);
                    _quat2.setFromAxisAngle(_z, random(-1, 1, 2) * 0.3);
                    _quat.multiply(_quat2);
                    orientation.setXYZW(i, _quat.x, _quat.y, _quat.z, _quat.w);

                    scale.setXY(i, random(0.8, 1.2, 3), random(0.8, 1.2, 3));
                    randoms.setX(i, random(0, 1, 3));
                }

                life.setX(i, value);
            }
            life.needsUpdate = true;
            orientation.needsUpdate = true;
            scale.needsUpdate = true;
            randoms.needsUpdate = true;

            _group.position.x = _pos_x; //Math.sin(e * 0.002) * 1.4;
            _group.position.y = _pos_y + 150; //Math.cos(e * 0.0014) * 0.2;
            _group.position.z = _pos_z; //Math.cos(e * 0.0014) * 0.5;

            let tipOffset = 0.4;
            _tipTarget.copy(_group.position);
            _tipTarget.y += tipOffset;
            _tip.lerp(_tipTarget, 0.1);

            _diff.copy(_tip);
            _diff.sub(_group.position);
            //let length = _diff.length();
            //_group.scale.y = (length / tipOffset - 1) * 0.4 + 1;

            _group.quaternion.setFromUnitVectors(_y, _diff.normalize());
        }
    }

    //=====// Embers //========================================//     

    function initEmbers() {
        var _geometry, _shader, _points;
        var _num = 8;

        (function () {
            initGeometry();
            initShader();
            initMesh();
        })();

        function initGeometry() {
            _geometry = new THREE.BufferGeometry();
            _geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(_num * 3), 3));
            _geometry.setAttribute('offset', new THREE.BufferAttribute(new Float32Array(_num * 3), 3));
            _geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(_num), 1));
            _geometry.setAttribute('life', new THREE.BufferAttribute(new Float32Array(_num), 1));
            var scale = new THREE.InstancedBufferAttribute(new Float32Array(_num * 2), 2);
            _geometry.setAttribute('scale', scale);

            for (var i = 0; i < _num; i++) {
                _geometry.attributes.life.setX(i, random(0, 1, 3) + 1);
            }
        }

        function initShader() {
            var uniforms = {
                uMap: {
                    type: 't',
                    value: null
                },
                uColor: {
                    type: 'c',
                    value: new THREE.Color(0xffe61e)
                },
            };

            _shader = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: embersVertexShader,
                fragmentShader: embersFragmentShader,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthTest: false,
            });

            var textureLoader = new THREE.TextureLoader();
            textureLoader.load('images/myFire3/ember.png', t => _shader.uniforms.uMap.value = t);
        }

        function initMesh() {
            _points = new THREE.Points(_geometry, _shader);
            _points.frustumCulled = false;
            _scene.add(_points);
            _self.objs.push(_points);
        }

        _self.loop2 = function () {
            var life = _geometry.attributes.life;
            var position = _geometry.attributes.position;
            var size = _geometry.attributes.size;
            var offset = _geometry.attributes.offset;
            var scale = _geometry.attributes.scale;
            for (let i = 0; i < _num; i++) {
                var value = life.array[i];
                value += 0.02;

                if (value > 1) {
                    value -= 1;

                    position.setXYZ(i, _pos_x, _pos_y + 0.1, _pos_z);
                    offset.setXYZ(i,
                        random(-200, 200, 3),
                        random(200, 600, 3),
                        random(-100, 100, 3)
                    );
                    size.setX(i, random(20, 200, 3));

                    scale.setXY(i, 50, 50);
                }

                life.setX(i, value);
            }

            life.needsUpdate = true;
            position.needsUpdate = true;
            size.needsUpdate = true;
            offset.needsUpdate = true;
        }
    }

    //=====// Haze //========================================//     

    function initHaze() {
        var _geometry, _shader, _mesh;

        var _num = 4;

        var _z = new THREE.Vector3(0, 0, 1);
        var _quat = new THREE.Quaternion();
        var _quat2 = new THREE.Quaternion();

        (function () {
            initGeometry();
            initInstances();
            initShader();
            initMesh();
            window.addEventListener('resize', resizeHaze, false);
            resizeHaze();
        })();

        function initGeometry() {
            _geometry = new THREE.InstancedBufferGeometry();
            _geometry.maxInstancedCount = _num;

            var shape = new THREE.PlaneGeometry(0.1, 0.1);
            var data = shape.attributes;

            _geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(data.position.array), 3));
            _geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(data.uv.array), 2));
            _geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(data.normal.array), 3));
            _geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(shape.index.array), 1));
            shape.dispose();
        }

        function initInstances() {
            var base = new THREE.InstancedBufferAttribute(new Float32Array(_num * 3), 3);
            var offset = new THREE.InstancedBufferAttribute(new Float32Array(_num * 3), 3);
            var orientation = new THREE.InstancedBufferAttribute(new Float32Array(_num * 4), 4);
            var scale = new THREE.InstancedBufferAttribute(new Float32Array(_num * 2), 2);
            var rotation = new THREE.InstancedBufferAttribute(new Float32Array(_num), 1);
            var life = new THREE.InstancedBufferAttribute(new Float32Array(_num), 1);

            for (let i = 0; i < _num; i++) {
                orientation.setXYZW(i, 0, 0, 0, 1);
                life.setX(i, i / _num + 1);
            }

            _geometry.setAttribute('base', base);
            _geometry.setAttribute('offset', offset);
            _geometry.setAttribute('orientation', orientation);
            _geometry.setAttribute('scale', scale);
            _geometry.setAttribute('rotation', rotation);
            _geometry.setAttribute('life', life);
        }

        function initShader() {
            let dpr = _renderer.getPixelRatio();
            var uniforms = {
                uMap: {
                    type: 't',
                    value: null
                },
                uMask: {
                    type: 't',
                    value: null
                },
                uResolution: {
                    type: 'v2',
                    value: new THREE.Vector2(_width * dpr, _height * dpr)
                },
            };

            _shader = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: hazeVertexShader,
                fragmentShader: hazeFragmentShader,
                transparent: true,
                depthTest: false,
            });

            var textureLoader = new THREE.TextureLoader();
            textureLoader.load('images/myFire3/haze.png', t => _shader.uniforms.uMask.value = t);
        }

        function initMesh() {
            _mesh = new THREE.Mesh(_geometry, _shader);
            _mesh.frustumCulled = false;
            _scene.add(_mesh);
            _self.objs.push(_mesh);
        }

        function resizeHaze() {
            let dpr = _renderer.getPixelRatio();
            _shader.uniforms.uMap.value = _rtt.texture;
            _shader.uniforms.uResolution.value.set(_width * dpr, _height * dpr);
        }

        _self.loop3 = function () {

         
            _mesh.visible = false;
            //_renderer.render(_scene, _camera, _rtt);
            _mesh.visible = true;

            var life = _geometry.attributes.life;
            var base = _geometry.attributes.base;
            var offset = _geometry.attributes.offset;
            var scale = _geometry.attributes.scale;
            var orientation = _geometry.attributes.orientation;
            var rotation = _geometry.attributes.rotation;
            for (let i = 0; i < _num; i++) {
                var value = life.array[i];
                value += 0.008;

                if (value > 1) {
                    value -= 1;

                    rotation.setX(i, random(0, 3.14, 3));

                    base.setXYZ(i, _pos_x, _pos_y + 0.1, _pos_z);
                    offset.setXYZ(i,
                        random(-220, 220, 3),
                        random(300, 600, 3),
                        0
                    );
                    //scale.setXY(i, random(0.6, 1.2, 3), random(0.6, 1.2, 3));
                    scale.setXY(i, 50, 50);
                }

                _quat.copy(_camera.quaternion);
                _quat2.setFromAxisAngle(_z, rotation.array[i]);
                _quat.multiply(_quat2);
                orientation.setXYZW(i, _quat.x, _quat.y, _quat.z, _quat.w);

                life.setX(i, value);
            }

            life.needsUpdate = true;
            base.needsUpdate = true;
            scale.needsUpdate = true;
            offset.needsUpdate = true;
            orientation.needsUpdate = true;
        }
    }


}

MyFire3.prototype.constructor = MyFire3;


export { MyFire3 }

/**
 * 使用样例
import { createSmoke, updateParticle, particleEngine } from '../js.my/MySmoke.js'
import { MyFire3 } from '../js.my/MyFire3.js';

let showFire = function () {
    myFire3 = new MyFire3();
    myFire3.config(scene, renderer, camera, controls);
    myFire3.setPosition(417, 0, 1134);
    if (planSelect.getPosition()) {
        let pos = planSelect.getPosition();
        myFire3.setPosition(pos.x, pos.y, pos.z);
        createSmoke(scene, pos);
    }
    myFire3.showFire();
    planTypeSelect.setFire(myFire3);
    planTypeSelect.setSmoke(particleEngine);
}

if (!myFire3) {
    showFire();
} else {
    if (myFire3.isShow()) {
        myFire3.hide();
        particleEngine.hide();
    } else {
        showFire();
        particleEngine.show();
    }
} 

 */