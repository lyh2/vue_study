import * as YUKA from 'yuka';
import World from './World.js';

const intersectionPoint = new YUKA.Vector3();
const normal = new YUKA.Vector3();
const ray =new YUKA.Ray(); // 用来控制子弹移动的起点和方向的

/**
 * 子弹实体
 */
export default class BulletMovingEntity extends YUKA.MovingEntity{
    constructor(owner=null/* PlayerGameEntity */,ray=new YUKA.Ray() /*从枪口到目标点的连线*/){
        super();

        this.owner = owner;
        this.ray = ray;
        this.maxSpeed = 400;// 400m/s 子弹的速度
        this.position.copy(ray.origin); // 子弹的位置
        this.velocity.copy(ray.direction).multiplyScalar(this.maxSpeed);// 设置速度

        const s = 1 + (Math.random() * 3);
        this.scale.set(s,s,s); // 设置实体的缩放

        this.leftTime = 1;// 定义子弹的生命周期为1秒
        this.currentTime = 0;
    }

    update(delta){
        
        this.currentTime += delta;
        if(this.currentTime >= this.leftTime){
            // 结束生命周期
            World.getInstance().remove(this);
        }else{
            ray.copy(this.ray);
            ray.origin.copy(this.position);
            super.update(delta);
            const entity =  World.getInstance().intersectRay(ray,intersectionPoint,normal);// 进行碰撞检测
            if(entity != null){ // 碰撞到了
                // calculate distance from origin to intersection point // 起点|——  |交点
                const distanceToIntersection = ray.origin.squaredDistanceTo(intersectionPoint);// 射线原点到碰撞交点的平方距离
                const validDistance = ray.origin.squaredDistanceTo(this.position);
                if(distanceToIntersection <= validDistance){
                    // hit 随机选择一种音频
                    const audio = World.getInstance().audioMaps.get('impact'+YUKA.MathUtils.randInt(1,5));
                    if(audio.isPlaying === true) audio.stop();
                    audio.play();
                    //发送消息
                    this.owner.sendMessage(entity /* 代表被击中的障碍物 */,'hit',0,{msg:'PlayerGmeEntity 模拟人向被击中的障碍物发送消息',intersectionPoint:intersectionPoint,normal:normal});
                    // add visual feedback 可视化的反馈效果就是子弹击中之后的效果
                    World.getInstance().addBulletHole(intersectionPoint,normal,audio);
                    // 移除子弹
                    World.getInstance().remove(this);
                }
            }
        }
        return this;
    }
}

