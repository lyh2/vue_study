import * as YUKA from 'yuka';
import EnemyVehicle from './EnemyVehicle';
import World from './World';

const intersectionPoint = new YUKA.Vector3();
const normal = new YUKA.Vector3();
const ray  = new YUKA.Ray();

// 子弹需要进行碰撞检测
export default class BulletMovingEntity extends YUKA.MovingEntity{
    constructor(owner=null/* player */,ray=new YUKA.Ray()/* 射线已经归一化了 */){
        super();

        this.owner = owner;// Player 第一人称对象
        this.ray = ray;
        this.name = 'BulletMovingEntity';
        this.maxSpeed = 400;// m/s 子弹的速度
        // 设置子弹的位置及速度，这两个值必须从参数中的射线中来
        this.position.copy(ray.origin);
        this.velocity.copy(ray.direction).multiplyScalar(this.maxSpeed);

        const s = 1 + (Math.random() * 3);//
        this.scale.set(s,s,s);

        // 子弹的生命周期
        this.lifeTime = 1;
        this.currentTime = 0;
    }

    update(delta){
        this.currentTime += delta;
        if(this.currentTime >= this.lifeTime){
            // 子弹生命周期结束,移除子弹
            World.getInstance().remove(this);
        }else{
            // 还未结束，继续运动，不断改变起点，但是方向不变
            ray.copy(this.ray);// ray 已经归一化
            ray.origin.copy(this.position);// this.position 会不断的更新改变
            /////////////////////////////////////////////////////////////
            super.update(delta);// 这行代码必须在ray.origin.copy(this.position);赋值语句的后面，否则下面的validDistance计算就是错的
            /////////////////////////////////////////////////////////////
            // 检测子弹与障碍物发生碰撞检测
            const obstacle = World.getInstance().intersectRay(ray,intersectionPoint,normal);
            if(obstacle !== null){
                // 碰到障碍物 calculate distance from origin to intersection point
                const distanceToIntersection = ray.origin.squaredDistanceTo(intersectionPoint);// 射线到交点的距离
                const validDistance = ray.origin.squaredDistanceTo(this.position);// 射线两帧之间的距离
                if(distanceToIntersection <= validDistance){ // 说明已经碰撞到了
                    // hit ! 击中，播放击中的随机音频
                    const audio = World.getInstance().assetManager.audioMaps.get('impact'+YUKA.MathUtils.randInt(1,5));
                    if(audio.isPlaying === true) audio.stop();
                    audio.play();

                    this.owner.sendMessage(obstacle,'hit',0,{msg:'击中障碍物',data:{intersectionPoint,normal}});
                    // add visual feedback,添加子弹的孔洞,只有击中物体的时候才有子弹孔洞，击中敌人的时候，敌人已经破碎了，就不用增加子弹孔洞效果
                    if((obstacle instanceof EnemyVehicle) === false){// 击中的不是敌人而是障碍物，则添加孔洞效果
                        World.getInstance().addBulletHole(intersectionPoint,normal);
                    } 
                    if((obstacle instanceof EnemyVehicle) === true){
                        // 1、同时向敌人发送数据，被击中的敌人再向Player 发送数据(如：消灭每个敌人获得的积分或者子弹个数不相同)
                        // 2、在这里已经获取到敌人的数据了，直接可以向Player 发送数据
                        // 3、可以通过方法直接更新数据，或者通过sendMessage发送数据到对应的对象进行更新
                        this.owner.sendMessage(this.parent/* WeaponGameEntity武器对象 */,'update',{msg:'更新武器的子弹数量',data:{bulletNum:obstacle.getBulletNum()}});
                        this.owner.updatePlayingTime(obstacle.getPlayingTime());
                        this.owner.updateHits();
                    }
                    // 移除子弹
                    World.getInstance().remove(this);
                }
            }
        }
        return this;
    }


}