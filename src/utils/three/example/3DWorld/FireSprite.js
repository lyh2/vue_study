import * as THREE from "three";
import vertexShader from "./FireShader/vertexShader.glsl";
import fragmentShader from "./FireShader/fragmentShader.glsl";

export default class FireSprite{
    constructor(camera,position = new THREE.Vector3(-4.9,1.8,25.1),scale=1){
        this.camera = camera;

        this.spriteMaterial = new THREE.ShaderMaterial({
            uniforms:{
                uRotation:{value:0},
                uCenter:{value:new THREE.Vector2(0.5,0.5)},
                uTime:{value:0},
                uResolution:{value:new THREE.Vector2(1000,1000)},
                uMouse:{value:new THREE.Vector2(0,0)},
                uFrequency:{
                    value:0
                },
                
            },
            vertexShader:vertexShader,
                fragmentShader:fragmentShader,
                transparent:true,
                blending:THREE.AdditiveBlending,
                depthWrite:false,
                depthTest:false,
                side:THREE.DoubleSide
        });

        this.sprite = new THREE.Sprite(this.spriteMaterial);
        this.sprite.renderOrder = 1;
        this.sprite.position.copy(position);
        this.sprite.scale.set(scale,scale,scale);
        this.mesh = this.sprite;

        // 创建音频
        this.listener = new THREE.AudioListener();
        this.sound = new THREE.PositionalAudio(this.listener);
        this.audioLoader = new THREE.AudioLoader();
        this.audioLoader.load("./audio/gnzw.mp3",buffer=>{
            this.sound.setBuffer(buffer);
            this.sound.setRefDistance(10);
            this.sound.detLoop(true);
            this.sound.play();
        });

        this.mesh.add(this.sound);

        this.analyser = new THREE.AudioAnalyser(this.sound,32);
    }

    update(deltaTime){
        let position = this.camera.localToWorld(new THREE.Vector3(0,0,0));
        let distanceSquared = position.distanceSquared(this.mesh.position);
        this.sound.setVolume((1 / distanceSquared ) * 200);

        let frequency = this.analyser.getAverageFrequency();
        this.spriteMaterial.uniforms.uFrequency.value = frequency;
        this.spriteMaterial.uniforms.uTime .value += deltaTime;
    }
}