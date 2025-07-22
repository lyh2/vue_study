import * as YUKA from 'yuka';
import ProjectileMovingEntity from './ProjectileMovingEntity';
import GameConfig from '../core/GameConfig';

export default class BulletExtendsProjectile extends ProjectileMovingEntity{

    /**
     * 
     * @param {*} owner 
     * @param {*} ray 
     */
    constructor(owner = null/*  */,ray = new YUKA.Ray()){
        super(owner,ray);

        this.maxSpeed = GameConfig.BULLET.MAX_SPEED;

        this.position.copy(ray.origin);
        this.velocity.copy(ray.direction).multiplyScalar(this.maxSpeed);

        const s = 1 + (Math.random() * 1.5);// 缩放子弹
        this.scale.set(s,s,s);

        this.lifetime = GameConfig.BULLET.LIFETIME;

        this.damage = GameConfig.BULLET.DAMAGE;

    }
}