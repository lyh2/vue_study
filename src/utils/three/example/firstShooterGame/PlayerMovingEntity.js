import * as YUKA from 'yuka';
import WeaponGameEntity from './WeaponGameEntity';

const q =new YUKA.Quaternion();

/**
 * 模拟一个人的游戏实体对象
 * */

export default class PlayerMovingEntity extends YUKA.MovingEntity{
    constructor(){
        super();

        this.headContainer = new YUKA.GameEntity();
        this.add(this.headContainer);

        this.head = new YUKA.GameEntity(); // 与 相机进行绑定
        this.head.position.set(0,2,0);
        this.headContainer.add(this.head);

        this.weaponContainer = new YUKA.GameEntity();
        this.head.add(this.weaponContainer);

        this.weapon = new WeaponGameEntity(this);
        this.weapon.position.set(0.3,-0.3,-1);
        this.weaponContainer.add(this.weapon);

        this.forward.set(0,0,-1); // 看向 -Z 轴
        this.maxSpeed = 10;
        this.updateOrientation = false;
    }
    /**
     * 获取 玩家当前真正朝向的世界坐标向量, 所以这里的方向就是 人的方向与视线 的组合方向
     * Player（整体旋转）
        └── headContainer
            └── head（模拟头部上下旋转）
                └── weaponContainer
                    └── weapon = new WeaponGameEntity
     * @param {*} result 
     * @returns 
     */
    getDirection(result){
        q.multiplyQuaternions(this.rotation,this.head.rotation);
        return result.copy(this.forward).applyRotation(q).normalize();
    }
}
