import ProjectileMovingEntity from './ProjectileMovingEntity';
import GameConfig from '../core/GameConfig';

export default class BulletExtendsProjectile extends ProjectileMovingEntity{

    /**
     * 
     * @param {*} owner 
     * @param {*} ray 
     */
    constructor(owner /*enemy or player  */,ray /*子弹行进的弹道*/){
        super(owner,ray);

        this.maxSpeed = GameConfig.BULLET.MAX_SPEED; // 设置速度

        this.position.copy(ray.origin);
        this.velocity.copy(ray.direction).multiplyScalar(this.maxSpeed);

        const s = 1 + (Math.random() * 1.5);// 缩放子弹
        this.scale.set(s,s,s);

        this.lifetime = GameConfig.BULLET.LIFETIME;

        this.damage = GameConfig.BULLET.DAMAGE;
        this.name = 'bullet:子弹';
    }
}