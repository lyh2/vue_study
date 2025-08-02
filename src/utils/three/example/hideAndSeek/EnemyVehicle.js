import * as YUKA from 'yuka';
import World from './World';
import HideSteeringBehavior from './HideSteeringBehavior';

// bulletNum: 表示消灭当前敌人获得的子弹个数
// playingTime: 消灭当前敌人获得的游戏时间


export default class EnemyVehicle extends YUKA.Vehicle{
    constructor(geometry=null){
        super();

        this.bulletNum =  Math.ceil(Math.random() * 10);// 消灭当前敌人可以获取的子弹数量
        this.playingTime =  Math.ceil(Math.random() * 5);// 消灭敌人可以增加的游玩时间

        this.name = 'EnemyVehicle';
        this.geometry = geometry;
        this.maxSpeed = 5;// 移动的速度
        this.deathAnimationDuration = 0.5;// 死亡动画播放的时间
        this.currentTime = 0;
        this.dead = false; // 是否死亡
        this.notifiedWorld = false;
        this.spawningPointName = null; // 生成时的位置编号数据：'spawningIndex_x_y_z'
    }
    start(){
        // 获取player 实体
        const player = this.manager.getEntityByName('PlayerMovingEntity');
        // 添加自定义的行为类型
        const hideBehavior = new HideSteeringBehavior(this.manager,player);
        this.steering.add(hideBehavior);
        return this;
    }
    update(delta){
        super.update(delta);
        if(this.dead){
            if(this.notifiedWorld === false){
                this.notifiedWorld = true;
                // audio dead 播放死亡音频
                const audio = World.getInstance().assetManager.audioMaps.get('dead');
                if(audio.isPlaying) audio.stop();
                audio.play();
                this._renderComponent.add(audio);// 添加音频
            }

            this.currentTime += delta;// 还未死亡结束，修改模型材质的uniforms值
            if(this.currentTime <= this.deathAnimationDuration){
                const value = this.currentTime / this.deathAnimationDuration;
                const shader = this._renderComponent.material.userData.shader ;//
                shader.uniforms.alpha.value = (value <= 1) ? value : 1;
                this._renderComponent.material.opacity = 1 - shader.uniforms.alpha.value;
            }else{
                World.getInstance().remove(this);// 死亡之后，移除此敌人
            }
        }
        return this;
    }
    handleMessage(telegram){
        console.log('enemyVehicle.telegram:',telegram);
        this.dead = true;
        this._renderComponent.castShadow = false;
        return true;
    }
    getBulletNum(){
        return this.bulletNum;
    }

    getPlayingTime(){
        return this.playingTime;
    }

    
}