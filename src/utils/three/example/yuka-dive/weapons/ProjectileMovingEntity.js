import * as YUKA from 'yuka';
import { MESSAGE_HIT } from '../core/constants';

const intersectionPoint  = new YUKA.Vector3();
const ray = new YUKA.Ray();

/**
 * 创建projectile：弹丸
 */
export default class ProjectileMovingEntity extends YUKA.MovingEntity{
    
    constructor(owner,ray=new YUKA.Ray()){
        super();

        this.canActivateTrigger = false;

        this.owner = owner;
        this.ray = ray;

        this.lifetime = 0;
        this.currentTime = 0;
        this.damage = 0;// 死亡
    }
    /**
     * Executed when this game entity is updated for the first time by its EntityManager.
     */
    start(){
        this._renderComponent.visible = true;
        return this;
    }

    update(delta){
        const world = this.owner.world;

        this.currentTime += delta;

        if(this.currentTime > this.lifetime){
            // 生命周期结束
            world.remove(this);
        }else{
			///////////////////////////////////////////////////////
            ray.copy(this.ray);
            ray.origin.copy(this.position);// 通过弹药的位置时刻更新射线的起点,方向不进行改变
	        // 【注意这里的代码：】是先赋值再更新数据，也就是说经过这几行代码，下面
			// const validDistance = ray.origin.squaredDistanceTo( this.position ); 这行代码在执行的时候，就不会出现错误
            super.update(delta);
			////////////////////////////////////////////////////////

            const entity = world.checkProjectileIntersection(this,intersectionPoint); // 得到相交的实体对象

            if(entity !== null){
                // calculate distance from origin to intersection point 计算原点到交点的距离
                const distanceToIntersection = ray.origin.squaredDistanceTo(intersectionPoint);
                const validDistance = ray.origin.squaredDistanceTo(this.position);
                if(distanceToIntersection <= validDistance){
                    // 子弹与实体相交了
                    this.owner.sendMessage(entity,MESSAGE_HIT,0,{damage:this.damage,direction:this.ray.direction});
                    // 移除弹丸 remove projectile from world
                    world.remove(this);
                }
            }
        }   
    }
}