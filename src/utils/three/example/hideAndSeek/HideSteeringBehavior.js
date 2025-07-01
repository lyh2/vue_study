import * as YUKA from 'yuka';
import ObstacleGameEntity from './ObstacleGameEntity';

const hidingSpot = new YUKA.Vector3();
const offset = new YUKA.Vector3();
const obstaclesArray = new Array();// 存储障碍物的数组

const inverse = new YUKA.Matrix4();
const localPositionOfHidingSpot = new YUKA.Vector3();
const localPositionOfObstacle = new YUKA.Vector3();
const localPositionOfClosestObstacle = new YUKA.Vector3();
const intersectionPoint = new YUKA.Vector3();
const boundingSphere = new YUKA.BoundingSphere();

const ray = new YUKA.Ray(new YUKA.Vector3(0,0,0),new YUKA.Vector3(0,0,1));
//用于控制 AI 角色（vehicle）躲避玩家（追击者 player）并寻找遮挡物背后隐藏的逻辑。
export default class HideSteeringBehavior extends YUKA.SteeringBehavior{
    constructor(entityManager,player,distanceFromHidingSpot=2/* 距离隐藏点的距离,安全距离 */,deceleration=1.5 /* 减速度 */){
        super();

        this.entityManager = entityManager;// 自定义属性实体管理器
        this.player = player;// pursuer:追击者
        this.distanceFromHidingSpot = distanceFromHidingSpot; // AI 与障碍物保持的安全距离
        this.deceleration = deceleration;
        this.dBoxMinLength = 3;// 检测盒子长度值

        this._arrive = new YUKA.ArriveBehavior();//到达
        this._arrive.tolerance = 1.5;

        this._evade =new YUKA.EvadeBehavior(); // 逃避
        this._seek = new YUKA.SeekBehavior(); // 搜索

        this._waypoint = null;// 若路径被挡，绕开障碍物的临时目标点
        this._bestHidingSpot = new YUKA.Vector3();// 当前最近遮挡物后方的“隐藏点”
        this._dBoxLength = 0;// 探测距离盒子的长度，用于避障
    }
    // Calculates the steering force for a single simulation step.
    /**
    AI 想隐藏，需要：
        找到最近的遮挡物（障碍物）；
        计算从玩家方向看去时，该遮挡物的“背面”位置；
        让 AI 角色走向那个位置；
        如果该路径被别的障碍物挡住 → 绕开它（避障）；
        如果找不到合适遮挡物 → 直接逃跑（evade）。
     * @param {*} vehicle 
     * @param {*} force 
     * @returns 
     */
    calculate(vehicle,force/*,delta*/){
        let closestDistanceSquared = Infinity;
        const obstacles = this.entityManager.entities;
       
        obstaclesArray.length = 0;
        // 计算玩家的最近的障碍物的背面的隐藏点
        for(let obstacle of obstacles){
            if(obstacle instanceof ObstacleGameEntity){
                // 是障碍物
                obstaclesArray.push(obstacle);
                // 获取玩家与障碍物后面的隐藏点的位置
                this._getHidingPosition(obstacle,this.player,hidingSpot);
                // 隐藏点到AI敌人的距离平方值
                const squaredDistance = hidingSpot.squaredDistanceTo(vehicle.position);
                if(squaredDistance < closestDistanceSquared){
                    closestDistanceSquared = squaredDistance;
                    this._bestHidingSpot.copy(hidingSpot);// 存储最近的隐藏点
                }
            }
        }
        // 用户还未到敌人的感知范围，继续使用逃避行为
        if(closestDistanceSquared === Infinity){
            //if no suitable obstacles found then evade the pursuer(player)// 追击者
            // 如何AI敌人找不到任何的障碍物，就执行逃避行为远离玩家
            this._evade.pursuer = this.player;// 设置追击者
            this._evade.calculate(vehicle,force/*,delta*/);
        }else{
            // 找到障碍物，先进行避障，再执行逃避行为
            // check if the way to the hiding spot is blocked by an obstacle
            this._obstacleAvoidance(vehicle); // 判断是否需要进行避障处理？
            if(this._waypoint){
                // seek to an alternative waypoint 先到避障点
                this._seek.target = this._waypoint;
                this._seek.calculate(vehicle,force/*,delta*/);
            }else{
                // otherwise arrive at the hiding spot，直接到达隐藏点
                this._arrive .target = this._bestHidingSpot;
                this._arrive.deceleration = this.deceleration;
                this._arrive.calculate(vehicle,force/*,delta*/);
            }
        }
        return force;
    }
    //判断 AI 前往隐藏点的路径是否被障碍物阻挡，如果有，则计算一个新的绕开路径（waypoint）来绕过障碍
    _obstacleAvoidance(vehicle){
        let closestObstacle = null;
        let distanceToClosestObstacle = Infinity;
        const obstacles = obstaclesArray;// 障碍物数组
        // 计算“探测盒子”（Detection Box）的长度
        this._dBoxLength = this.dBoxMinLength + (vehicle.getSpeed() / vehicle.maxSpeed) * this.dBoxMinLength;
        vehicle.worldMatrix.getInverse(inverse);// 得到车辆自身的逆矩阵，用于将场景中其他对象的位置转换为“车辆的局部坐标系”；方便判断障碍物是在“自己前方还是后方”。
        for(let i =0; i < obstacles.length;i++){
            const obstacle = obstacles[i];
            if(obstacle === vehicle) continue;
			// calculate this obstacle's position in local space of the vehicle
            // 把障碍物的位置数据转换到AI敌人的局部坐标系中去
            localPositionOfObstacle.copy(obstacle.position).applyMatrix4(inverse);
            // 使用 z 值判断障碍物是否“在AI敌人的前方”，并在探测范围内 
            // 先进行在局部坐标系前后的判断，为什么只判断 .z > 0,因为 只需要考虑在AI敌人的前面障碍物，而不用关系在AI敌人后面的障碍物
            if(localPositionOfObstacle.z > 0 && Math.abs(localPositionOfObstacle.z ) < this._dBoxLength){
                // 障碍物半径+AI敌人的半径
                const expandedRadius = obstacle.boundingRadius + vehicle.boundingRadius;// 
                if(Math.abs(localPositionOfObstacle.x) < expandedRadius){//检查障碍物的横向 x值，判断是否会与车辆撞到
                    // 能发生碰撞
                    boundingSphere.center.copy(localPositionOfObstacle);
                    boundingSphere.radius = expandedRadius; // 新建碰撞球体且半径为=障碍物半径+AI敌人的半径
                    // 射线朝向正Z轴，返回的 intersectionPoint 一定在这条 +Z 方向的射线轨迹上。
                    ray.intersectBoundingSphere(boundingSphere,intersectionPoint);
                    if(intersectionPoint.z < distanceToClosestObstacle){
                        distanceToClosestObstacle = intersectionPoint.z;
                        closestObstacle = obstacle;
                        localPositionOfClosestObstacle.copy(localPositionOfObstacle);
                    }
                }
            }
        }
        // 找到最近的障碍物
        if(closestObstacle !== null){
            this._waypoint  = localPositionOfClosestObstacle.clone();//
            // 用于返回一个数字的符号，即判断该数字是正数、负数还是零。具体来说，它返回+1 表示正数，-1 表示负数，0 表示零
            // 确定障碍物在AI敌人的那个方向？
            const sign = Math.sign(localPositionOfClosestObstacle.x) || 1; // 0||1 => 0,-1||1=>-1,1||1=>1
            localPositionOfHidingSpot.copy(this._bestHidingSpot).applyMatrix4(inverse);
            if(localPositionOfHidingSpot.z < 0) this._waypoint.z *= -1; // 隐藏点在AI敌人的身后，则AI需要掉转方向
            // 修改绕路点的X轴坐标，偏移距离=障碍物半径+AI敌人的半径
            this._waypoint.x -= (closestObstacle.boundingRadius + vehicle.boundingRadius) * sign;
            this._waypoint.applyMatrix4(vehicle.worldMatrix); // 在把局部坐标点转成世界坐标点
        }
        // 绕路点已经非常接近，清除它,防止重复追踪同一个点；若 AI 已经接近绕行点，直接清除它。
        if(this._waypoint !== null){
            const distanceSq = this._waypoint.squaredDistanceTo(vehicle.position);
            if(distanceSq < 1){
                this._waypoint = null;
            }
        }
    }
    /**        
    计算得到障碍物后面的隐藏点的位置数据
     * @param {*} obstacle 
     * @param {*} player 
     * @param {*} hidingSpot 
     */
    _getHidingPosition(obstacle,player,hidingSpot){
        // calculate the ideal spacing of the vehicle to the hiding spot
        const spacing = obstacle.boundingRadius + this.distanceFromHidingSpot;
        // calculate the heading toward the object from the pursuer(player)
        offset.subVectors(obstacle.position,player.position).normalize();// 障碍物位置 - 用户的位置
        // scale it to size
        offset.multiplyScalar(spacing);
        // add the offset to the obstacles position to get the hiding spot
        hidingSpot.addVectors(obstacle.position,offset);
    }
}