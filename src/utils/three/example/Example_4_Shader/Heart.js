/**
 * 实现心形烟花效果
 * 
 */

import * as THREE from "three";

import startPointVertex from "../Shader/StartPoint/vertex.glsl";
import startPointFragment from "../Shader/StartPoint/fragment.glsl";


import fireworkVertex from "../Shader/Fireworks/vertex.glsl";
import fireworkFragment from "../Shader/Fireworks/fragment.glsl";


export default class Heart {
    /**
     * 
     * @param {颜色} color 
     * @param {目标点} to 
     * @param {起点} from 
     */
    constructor(color = `hsl(${Math.random() * 360},${Math.random() * 255},${Math.random() * 360})`, to, from = { x: 0, y: 0, z: 0 }) {
        this.color = new THREE.Color(color);

        // 上升的点
        this.startGeometry = new THREE.BufferGeometry();
        const startPositionArray = new Float32Array(3);
        startPositionArray[0] = from.x;
        startPositionArray[1] = from.y;
        startPositionArray[2] = from.z;

        this.startGeometry.setAttribute("position", new THREE.BufferAttribute(startPositionArray, 3));
        // 得到终点 - 起点的差值
        const stepArray = new Float32Array(3);
        stepArray[0] = to.x - from.x;
        stepArray[1] = to.y - from.y;
        stepArray[2] = to.z - from.z;

        this.startGeometry.setAttribute("aStep", new THREE.BufferAttribute(stepArray, 3));

        // 创建材质
        this.startMaterial = new THREE.ShaderMaterial({
            vertexShader: startPointVertex,
            fragmentShader: startPointFragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            uniforms: {
                uTime: {
                    value: 0,
                },
                uSize: {
                    value: 40
                },
                uColor: {
                    value: this.color,
                }
            }
        });

        // 创建点
        this.startPoint = new THREE.Points(this.startGeometry, this.startMaterial);
        this.clock = new THREE.Clock();

        // 绘制心形
        this.fireworkGeometry = new THREE.BufferGeometry();
        this.fireworkCount = 180 + Math.floor(Math.random() * 180);
        const positionFireworksArray = new Float32Array(this.fireworkCount * 3);
        const scaleFireworksArray = new Float32Array(this.fireworkCount * 1);// 表示等比缩放
        const directionFireworksArray = new Float32Array(this.fireworkCount * 3); // 方向

        /// 把一个圆根据角度分成若干份扇形
        const unit = (360. / this.fireworkCount);
        // 循环创建多个粒子
        for (let i = 0; i < this.fireworkCount; i++) {
            const ang = Math.PI / 180 * (i * unit);

            // 一开始烟花的位置，应该在点 粒子结束的位置处，也就是 参数中的 to 值. 所有的例子初始位置都在这里
            positionFireworksArray[i * 3 + 0] = to.x;
            positionFireworksArray[i * 3 + 1] = to.y;
            positionFireworksArray[i * 3 + 2] = to.z;

            // 所有粒子初始化大小
            scaleFireworksArray[i] = Math.random() * 2;// 0-1 的区间值
            // 设置向四周发射的角度--这里多想想

            const radius = Math.random();// 心形的半径

            const x = Math.cos(ang) ;
            let y = Math.sin(ang) ;
            /// 心形公式
            y = y + Math.abs(x) * Math.sqrt((8. - Math.abs(x)) / 50.0);
            //console.log(x,y)
            directionFireworksArray[i * 3 + 0] =   x;
            directionFireworksArray[i * 3 + 1] =  y;
            directionFireworksArray[i * 3 + 2] = 0;


        }

        this.fireworkGeometry.setAttribute("position", new THREE.BufferAttribute(positionFireworksArray, 3));
        this.fireworkGeometry.setAttribute("aScale", new THREE.BufferAttribute(scaleFireworksArray, 1));
        this.fireworkGeometry.setAttribute("aRandom", new THREE.BufferAttribute(directionFireworksArray, 3));

        // 创建材质
        this.fireworkMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                uSize: {
                    value: 40
                },
                uColor: {
                    value: this.color
                }
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexShader: fireworkVertex,
            fragmentShader: fireworkFragment
        });

        this.fireworks = new THREE.Points(this.fireworkGeometry, this.fireworkMaterial);

        // 创建音频
        this.listener = new THREE.AudioListener();
        this.listener_1 = new THREE.AudioListener();
        this.sound = new THREE.Audio(this.listener);
        this.sendSound = new THREE.Audio(this.listener_1);

        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(`./audio/pow${Math.floor(Math.random() * 4) + 1}.ogg`, (buffer) => {
            this.sound.setBuffer(buffer);
            this.sound.setLoop(false);
            this.sound.setVolume(10);
        });

        audioLoader.load(`./audio/send.mp3`, (buffer) => {
            this.sendSound.setBuffer(buffer);
            this.sendSound.setLoop(false);
            this.sendSound.setVolume(2);
        })

    }

    addScene(scene) {
        this.scene = scene;
        scene.add(this.startPoint);
        scene.add(this.fireworks);
    }

    update() {
        const elapsedTime = this.clock.getElapsedTime();
        if (elapsedTime > 0.2 && elapsedTime < 1) {
            this.startMaterial.uniforms.uTime.value += elapsedTime;
            this.startMaterial.uniforms.uSize.value += 40;

            // 只播放发射的音频文件
            if (!this.sendSound.isPlaying && !this.sendSoundPlay) {
                this.sendSound.play();
                this.sendSoundPlay = true;
            }
        } else if (elapsedTime > 0.82) {
            const time = elapsedTime - 1;
            // 让元素点 消失
            this.startMaterial.uniforms.uSize.value = 0;
            this.startPoint.clear();
            this.startGeometry.dispose();
            this.startMaterial.dispose();

            if (!this.sound.isPlaying && !this.play) {
                this.sound.play();
                this.play = true;
            }
            // 烟花显示
            this.fireworkMaterial.uniforms.uSize.value = 40;
            this.fireworkMaterial.uniforms.uTime.value = time;


            if (time > 5) {
                this.fireworkMaterial.uniforms.uSize.value = 0;
                this.fireworks.clear();
                this.fireworkGeometry.dispose();
                this.fireworkMaterial.dispose();
                this.scene.remove(this.fireworks);
                this.scene.remove(this.startPoint);

                return "remove";
            }
        }
    }
}