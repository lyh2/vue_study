import * as YUKA from 'yuka';

export default class LevelGameEntity extends YUKA.GameEntity{
    /**
     * 
     * @param {YUKA.MeshGeometry 对象} yukaMeshGeometry 
     */
    constructor(yukaMeshGeometry){
        super();
        this.bvh = new YUKA.BVH().fromMeshGeometry(yukaMeshGeometry);
        this.canActivateTrigger = false;// 不能激活触发器
    }
    /**
     * 收到消息
     * @param {YUKA.Telegram} telegram 
     */
    handleMessage(telegram){
        // 处理消息
        return true;
    }
    /**
     * 自定义方法
     * Returns the intesection point if a projectile intersects with this entity. 存在交点，则返回交点
	* If no intersection is detected, null is returned. 不存在交点，则返回null
	* 子弹与当前实体对象相交判断
     * @param {*} ray 
     * @param {*} intersectionPoint 
     */
    checkProjectileIntersection(ray,intersectionPoint){
        return ray.intersectBVH(this.bvh,intersectionPoint);
    }

    /**
     * Holds the implementation for the line of sight test of this game entity.
     *  This method is used by Vision#visible in order to determine whether 
     * this game entity blocks the given line of sight or not. 
     * Implement this method when your game entity acts as an obstacle.
     * @param {*} ray 
     * @param {*} intersectionPoint 
     */
    lineOfSightTest(ray,intersectionPoint){
        return ray.intersectBVH(this.bvh,intersectionPoint);
    }
}