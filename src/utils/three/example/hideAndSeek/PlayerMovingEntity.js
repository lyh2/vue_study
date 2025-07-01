import * as YUKA from 'yuka';
import WeaponGameEntity from './WeaponGameEntity';
import World from './World';
import ObstacleGameEntity from './ObstacleGameEntity';

const q = new YUKA.Quaternion();
const aabb = new YUKA.AABB();
const ray = new YUKA.Ray();
const intersectionPoint = new YUKA.Vector3();
const intersectionNormal = new YUKA.Vector3();
const reflectionVector = new YUKA.Vector3();

export default class PlayerMovingEntity extends YUKA.MovingEntity{
    constructor(){
        super();

        this.hits = 0;// 每个用户的初始积分
        this.playingTime =  5 * 60;// 5分
        this.name = 'PlayerMovingEntity';
        this.boundingRadius = 1;

        this.headContainer = new YUKA.GameEntity();
        this.headContainer.name = 'headContainer';
        this.add(this.headContainer);

        this.head = new YUKA.GameEntity();
        this.head.position.set(0,2,0);
        this.head.name = 'head';
        this.headContainer.add(this.head);

        this.weaponContainer = new YUKA.GameEntity();
        this.head.add(this.weaponContainer);
        this.weaponContainer.name = 'weaponContainer';

        this.weapon = new WeaponGameEntity(this);
        this.weapon.name = 'weapon';
        this.weapon.position.set(0.25,-0.3,-1);
        this.weaponContainer.add(this.weapon);

        // 设置向前的方向
        this.forward.set(0,0,-1);
        this.maxSpeed = 8;
        //////////////////////////////////////////////
        this.updateOrientation = false;// 防止实体根据速度自动旋转
        //////////////////////////////////////////////
    }

   
    // 判断用户与障碍物之间的可视关系
    update(delta){
        const obstacles = World.getInstance().obstacles;
        // 得到所有的障碍物
        for(let i =0; i < obstacles.length;i++){
            // 获取障碍物
            const obstacle = obstacles[i];
            // 判断是不是障碍物类型,一个自定义的障碍物实体类型，判断的依据就是内部自定义属性.geometry
            if(obstacle instanceof ObstacleGameEntity){
                // first check bounding volumes for intersection 检查当前用户的位置与障碍物之间的距离
                const squaredDistance = this.position.squaredDistanceTo(obstacle.position);
                const range = this.boundingRadius + obstacle.boundingRadius;// 用户的绑定半斤+障碍物半径
                // 如果距离小于两个的半径和值，说明在障碍物范围之内
                if(squaredDistance <= (range * range)){
                    // compute AABB in world space for obstacle
                    aabb.copy(obstacle.geometry.aabb).applyMatrix4(obstacle.worldMatrix);// 需要把aabb转换到障碍物的世界空间中去
                    // enhance the AABB with the bounding radius of the player// 用玩家的半径改变障碍物的aabb 数据，最终的效果就是让aabb空间变大了，加上了玩家的半径值
                    aabb.max.addScalar(this.boundingRadius);// 
                    aabb.min.subScalar(this.boundingRadius);
                    // setup ray 设置射线起点为用户的位置，方向为用户速度的方法
                    ray.origin.copy(this.position);
                    ray.direction.copy(this.velocity).normalize();

                    //perform ray/AABB intersection test 检测到结果
                    if(ray.intersectAABB(aabb,intersectionPoint) !== null){
                        // derive normal vector 推导得到当前点的法向量
                        aabb.getNormalFromSurfacePoint(intersectionPoint,intersectionNormal);//Returns the normal for a given point on this AABB's surface.
                        // compute reflection vector 计算射线的反射向量
                        reflectionVector.copy(ray.direction).reflect(intersectionNormal);
                        // compute new velocity vector 计算新的速度向量
                        const speed = this.getSpeed();
                        //---------------------------------------------------------
                        this.velocity.addVectors(ray.direction,reflectionVector).normalize();
                        const f = 1 - Math.abs(intersectionNormal.dot(ray.direction));
                        /**
                            判断向量方向:如果点乘结果大于0，则两个向量的夹角小于90度，方向相似；如果小于0，则夹角大于90度，方向相反；如果等于0，则两个向量正交（垂直）
                         */
                        this.velocity.multiplyScalar(speed * f);
                    }
                }
            }

        }
        
        return super.update(delta);
    }
    getDirection(result){
        q.multiplyQuaternions(this.rotation,this.head.rotation);
        return result.copy(this.forward).applyRotation(q).normalize();
    }
    /**
     * 更新玩家游玩时间
     * @param {*} playingTime 
     */
    updatePlayingTime(playingTime=0){
        
        this.playingTime += playingTime;
        this._updateUI();
    }
    // + 1 就行，表示消灭的敌人个数
    updateHits(){
        ++this.hits;
        this._updateUI();
    }
    getPlayingTime(){
        return this.playingTime;
    }
    getHits(){
        return this.hits;
    }
    _updateUI(){
        World.getInstance().options.playingTime.value = this.playingTime;
        World.getInstance().options.hits.value = this.hits;
    }
}