/**
 * 火焰精灵
 */

import * as THREE from "three";
import {PositionalAudioHelper} from "three/examples/jsm/helpers/PositionalAudioHelper.js";
import fragmentShader from "./FireSprite/fragment.glsl";


export default class FireSprite{
    constructor(camera,position=new THREE.Vector3(-4.9,1.8,25.1),scale=1){
        this.camera = camera;
        // 创建着色器精灵
        this.spriteMaterial = new THREE.ShaderMaterial({
            uniforms:{
                uRotation:{value:0},
                uCenter:{value:new THREE.Vector2(0.5,0.5)},
                uTime:{value:0},
                uResolution:{value:new THREE.Vector2(1000,1000)},
                uMouse:{value:new THREE.Vector2(0,0)},
                uFrequency:{value:0},

            },
            vertexShader:`
                uniform float uRotation;
                uniform vec2 uCenter;
                varying vec2 vUv;
                void main(){
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4(0.,0.,0.,1.); // 得到在模型视图下的坐标值
                    vec2 scale;
                    // 进行放大
                    scale.x = length(vec3(modelMatrix[0].x,modelMatrix[0].y,modelMatrix[0].z));
                    scale.y = length(vec3(modelMatrix[1].x,modelMatrix[1].y,modelMatrix[1].z));
                    scale *= - mvPosition.z;

                    vec2 alignedPosition = - (position.xy - (uCenter - vec2(0.5))) * scale / mvPosition.z;
                    vec2 rotatedPosition ;
                    rotatedPosition.x = cos(uRotation) * alignedPosition.x - sin(uRotation) * alignedPosition.y;
                    rotatedPosition.y = sin(uRotation) * alignedPosition.x + cos(uRotation) * alignedPosition.y;
                    mvPosition.xy += rotatedPosition;
                    gl_Position = projectionMatrix * mvPosition;
                    gl_Position.z = - 5.0;
                }

            `,
            fragmentShader:fragmentShader,
            transparent:true,
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            side:THREE.DoubleSide,
            depthTest:false,
        });

        this.spriteMaterial = new THREE.SpriteMaterial({
            map:new THREE.TextureLoader().load("./texture/effect/ke123.png"),
            blending:THREE.AdditiveBlending,
            depthWrite:false,
            depthTest:false,
            side:THREE.DoubleSide,
        });

        this.spriteMaterial .onBeforeCompile = (shader)=>{

        };

        // 创建精灵
        this.sprite = new THREE.Sprite(this.spriteMaterial);
        this.sprite.renderOrder = 1;
        this.sprite.position.copy(position);

        this.sprite.scale.set(scale,scale,scale);
        this.mesh = this.sprite;

        // 创建音乐
        this.listener = new THREE.AudioListener();// 声音监听
        this.sound = new THREE.PositionalAudio(this.listener);// 声音源
        this.audioLoader = new THREE.AudioLoader();
        this.audioLoader.load("./audio/徐沛东 - 花开花落.mp3",(buffer)=>{
            this.sound.setBuffer(buffer);
            this.sound.setRefDistance(10);
            this.sound.setLoop(true);
            this.sound.play();
        });

        this.mesh.add(this.sound);

        this.analyser = new THREE.AudioAnalyser(this.sound,32);
    }

    update(deltaTime){
        let position = this.camera.localToWorld(new THREE.Vector3(0,0,0));
        let distanceSquared = position.distanceToSquared(this.mesh.position);
        this.sound.setVolume((1 / distanceSquared) * 200);

        let frequency = this.analyser.getAverageFrequency();
        this.spriteMaterial.uniforms.uFrequency.value = frequency;
        this.spriteMaterial.uniforms.uTime.value += deltaTime;
    }


}