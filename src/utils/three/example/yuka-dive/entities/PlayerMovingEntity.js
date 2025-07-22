import * as YUKA from 'yuka';
import * as THREE from 'three';
import GameConfig from '../core/GameConfig';
import { MESSAGE_DEAD, MESSAGE_HIT, STATUS_ALIVE, STATUS_DEAD, STATUS_DYING, WEAPON_TYPES_ASSAULT_RIFLE } from '../core/constants';
import WeaponSystem from '../core/WeaponSystem';
import ProjectileMovingEntity from '../weapons/ProjectileMovingEntity';

const intersectionPoint = new YUKA.Vector3();
const targetPosition= new YUKA.Vector3();
const projectile = new ProjectileMovingEntity();
const attackDirection = new YUKA.Vector3();
const lookDirection = new YUKA.Vector3();
const cross = new YUKA.Vector3();


export default class PlayerMovingEntity extends YUKA.MovingEntity{

    constructor(world){
        super();

        this.world = world;

        this.currentTime = 0;
        this.boundingRadius = GameConfig.PLAYER.BOUNDING_RADIUS;
        this.height = GameConfig.PLAYER.HEAD_HEIGHT;// 1.7 单位
        this.updateOrientation = false;// 原点不会更随速度发生改变
        this.maxSpeed = GameConfig.PLAYER.MAX_SPEED;// 最大的速度
        this.health = GameConfig.PLAYER.MAX_HEALTH;

        this.isPlayer = true;// 代表玩家
        this.status = STATUS_ALIVE;

        // the camera is attached to the player's head
        this.head = new YUKA.GameEntity(); // 挂载相机
        this.head.name = 'head';
        this.head.forward.set(0,0,-1);// 看向-Z轴
        this.add(this.head);

        // death animation
        this.endTimeDying = Infinity;
        this.dyingTime = GameConfig.PLAYER.DYING_TIME;

        // the weapons are attached to the following container entity
        this.weaponContainer = new YUKA.GameEntity();
        this.weaponContainer.name = 'weaponContainer';
        this.head.add(this.weaponContainer);
        
        // 使用武器系统
        this.weaponSystem = new WeaponSystem(this);
        this.weaponSystem.init();
        
		// the player's bounds (using a single AABB is sufficient for now)
        this.bounds = new YUKA.AABB();
        this.boundsDefinition = new YUKA.AABB(new YUKA.Vector3(-0.25,0,-0.25),new YUKA.Vector3(0.25,1.8,0.25));// 预定义个AABB盒子(0.5,1.8,0.5)

        // current convex region of the navmesh the entity is in
        this.currentRegion = null;
        this.currentPosition = new YUKA.Vector3(); // 当前位置数据
        this.previousPosition = new YUKA.Vector3(); // 上一个位置数据

        // audio 
        this.audioMaps = new Map();
        // animation 
        this.mixer = null;
        this.animationMaps = new Map();

        this.name = 'player';
    }

    update(delta){
        super.update(delta);
        this.currentTime += delta;
        this.stayInLevel();// ensure the enemy never leaves the level 确定不离开关卡

        if(this.status === STATUS_ALIVE){
            // 更新武器系统
            this.weaponSystem.updateWeaponChange();
            // 更新Bounds
            this.bounds.copy(this.boundsDefinition).applyMatrix4(this.worldMatrix);
        }

        if(this.status === STATUS_DYING){
            if(this.currentTime >= this.endTimeDying){
                this.status = STATUS_DEAD;
                this.endTimeDying = Infinity;
            }
        }

        if(this.status === STATUS_DEAD){
            if(this.world.debug) console.log('用户死亡!');
            this.reset();

            this.world.spawningManager.respawnCompetitor(this);
            this.world.fpsControls.sync();
        }
        if(this.mixer){

            this.mixer.update(delta);
        }
        return this;
    }
    
    /**
     * 用户角色死亡之后，重新开启
     */
    reset(){
        this.health = GameConfig.PLAYER.MAX_HEALTH;
        this.status = STATUS_ALIVE;

        this.weaponSystem.reset();
        this.world.fpsControls.reset();
        this.world.uiManager.showFPSInterface();

        const animation = this.animationMaps.get('player_death');
        animation.stop();
        return this;
    }
    /**
     * Ensures the player never leaves the level.
     */
    stayInLevel(){
        		// "currentPosition" represents the final position after the movement for a single
		// simualation step. it's now necessary to check if this point is still on
		// the navMesh
        this.currentPosition.copy(this.position);
        this.currentRegion = this.world.navMesh.clampMovement(
            this.currentRegion,
            this.previousPosition,
            this.currentPosition,
            this.position//this is the result vector that gets clamped
        );
		// save this position for the next method invocation
        this.previousPosition.copy(this.position);
        // adjust height of the entity according to the ground
        const distance = this.currentRegion.plane.distanceToPoint(this.position);
        this.position.y -= distance * GameConfig.NAVMESH.HEIGHT_CHANGE_FACTOR;
        
        
        return this;
    }
    /**
     * 设置玩家为死亡状态
     * @returns 
     */
    initDeath(){
        this.status = STATUS_DYING;
        this.endTimeDying = this.currentTime + this.dyingTime;
        this.velocity.set(0,0,0);

        const animation = this.animationMaps.get('player_death');
        animation.play();

        this.weaponSystem.hideCurrentWeapon();
        this.world.fpsControls.active = false;
        this.world.uiManager.hideFPSInterface();
        return this;
    }

    shoot(){
        const head = this.head;
        const world = this.world;
        
        const ray = projectile.ray;
        head.getWorldPosition(ray.origin);
        head.getWorldDirection(ray.direction);

        projectile.owner = this;

        const result = world.checkProjectileIntersection(projectile,intersectionPoint);
        	// now calculate the distance to the closest intersection point. if no point was found,
		// choose a point on the ray far away from the origin

        const distance = (result === null) ? 1000 : ray.origin.distanceTo(intersectionPoint);
        targetPosition.copy(ray.origin).add(ray.direction.multiplyScalar(distance));

        this.weaponSystem.shoot(targetPosition);
        world.uiManager.updateAmmoStatus();
        return this;
    }

    reload(){
        this.weaponSystem.reload();
        return this;
    }

    changeWeapon(type){
        this.weaponSystem.setNextWeapon(type);
        return this;
    }

    hasWeapon(type){
        return this.weaponSystem.getWeapon(type) !== null;
    }

    isAutomaticWeaponUsed(){
        return (this.weaponSystem.currentWeapon.type === WEAPON_TYPES_ASSAULT_RIFLE)
    }

    activate(){
        this.active = true;
        this.weaponSystem.currentWeapon._renderComponent.visible = true;
        return this;
    }

    deactivate(){
        this.active = false;

        this.weaponSystem.currentWeapon._renderComponent.visible = false;
        return this;
    }

    /**
	* Returns the intesection point if a projectile intersects with this entity.
	* If no intersection is detected, null is returned.
	*
	* @param {Ray} ray - The ray that defines the trajectory of this bullet.
	* @param {Vector3} intersectionPoint - The intersection point.
	* @return {Vector3} The intersection point.
	*/
    checkProjectileIntersection(ray,intersectionPoint){
        return ray.intersectAABB(this.bounds,intersectionPoint);
    }

    addHealth(amount){
        this.health += amount;
        this.health = Math.min(this.health,GameConfig.PLAYER.MAX_HEALTH);
        this.world.uiManager.updateHealthStatus();

        if(this.world.debug){
			console.log( 'DIVE.Player: Entity with ID %s receives %i health points.', this.uuid, amount );

        }
        return this;
    }

    addWeapon(type){
        this.weaponSystem.addWeapon(type);

        this.world.uiManager.updateAmmoStatus();
        return this;
    }

    setAnimationMaps(mixer,clips){
        this.mixer = mixer;

        for(const clip of clips){
            const action = mixer.clipAction(clip);
            action.loop = THREE.LoopOnce;
            action.name = clip.name;
            this.animationMaps.set(clip.name,action);
        }
        return this;
    }

    handleMessage(telegram){
        switch(telegram.message){
            case MESSAGE_HIT:
                const audio = this.audioMaps.get('impact'+YUKA.MathUtils.randInt(1,7));
                if(audio.isPlaying === true) audio.stop();
                audio.play();
                // 减少🩸量
                this.health -= telegram.data.damage;

                this.world.uiManager.updateHealthStatus();
                if(this.world.debug){
                	console.log( 'DIVE.Player: Player hit by Game Entity with ID %s receiving %i damage.', telegram.sender.uuid, telegram.data.damage );

                }

                // 检测玩家是否死亡
                if(this.health <= 0 && this.status === STATUS_ALIVE){
                    this.initDeath();

                    const competitors = this.world.competitors;
                    for(let i =0; i < competitors.length;i++){
                        const competitor = competitors[i];
                        if(this !== competitor) this.sendMessage(competitor,MESSAGE_DEAD);
                    }
                    this.world.uiManager.addToMessage(telegram.sender,this);
                }else{
                    const angle = this.computeAngleToAttacker(telegram.data.direction);
                    this.world.uiManager.showDamageIndication(angle);
                }
            break;
        }

        return true;
    }
    /**
    * Computes the angle between the current look direction and the attack direction in
	* the range of [-π, π].
     * @param {*} projectileDirection 
     */
    computeAngleToAttacker(projectileDirection){
        attackDirection.copy(projectileDirection).multiplyScalar(-1);
        attackDirection.y = 0;
        attackDirection.normalize();

        this.head.getWorldDirection(lookDirection);
        lookDirection.y =0;
        lookDirection.normalize();

        		// since both direction vectors lie in the same plane, use the following formula
		//
		// dot = a * b
		// det = n * (a x b)
		// angle = atan2(det, dot)
		//
		// Note: We can't use Vector3.angleTo() since the result is always in the range [0,π]

        const dot = attackDirection.dot(lookDirection);
        const det = this.up.dot(cross.crossVectors(attackDirection,lookDirection));
        return Math.atan2(det,dot);
    }


}