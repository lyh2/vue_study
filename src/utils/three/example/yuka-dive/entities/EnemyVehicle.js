import * as YUKA from 'yuka';
import GameConfig from '../core/GameConfig';
import { HEALTH_PACK, MESSAGE_DEAD, STATUS_ALIVE, STATUS_DEAD, STATUS_DYING, WEAPON_TYPES_ASSAULT_RIFLE, WEAPON_TYPES_SHOTGUN } from '../core/constants';
import CharacterBounds from '../etc/CharacterBounds';
import AttackEvaluator from '../evaluators/AttackEvaluator';
import ExploreEvaluator from '../evaluators/ExploreEvaluator';
import HealthEvaluator from '../evaluators/HealthEvaluator';
import WeaponEvaluator from '../evaluators/WeaponEvaluator';
import WeaponSystem from '../core/WeaponSystem';
import TargetSystem from '../core/TargetSystem';
import { MESSAGE_HIT } from '../core/constants';


const positiveWeightings = new Array();
const weightings = [0,0,0,0]; // 权重值，下面四个方向与用户朝向的权重值
const directions = [
    {direction:new YUKA.Vector3(0,0,1),name:'soldier_forward'},//向前+Z
    {direction:new YUKA.Vector3(0,0,-1),name:'soldier_backward'},//向后-Z
    {direction:new YUKA.Vector3(-1,0,0),name:'soldier_left'},// 向左-X
    {direction:new YUKA.Vector3(1,0,0),name:'soldier_right'},// 向右+X
];

const lookDirection = new YUKA.Vector3();
const moveDirection = new YUKA.Vector3();
const quaternion = new YUKA.Quaternion(); // 定义一个四元素表示旋转
const transformedDirection = new YUKA.Vector3();
const worldPosition = new YUKA.Vector3();
const customTarget = new YUKA.Vector3();

/**
 * 代表(opponent:对手)机器人
 */
export default class EnemyVehicle extends YUKA.Vehicle{
    constructor(world){
        super();

        this.world = world;
        this.currentTime = 0;
        this.boundingRadius = GameConfig.BOT.BOUNDING_RADIUS;//The bounding radius of this game entity in world units.
        this.maxSpeed = GameConfig.BOT.MOVEMENT.MAX_SPEED;// 设置最大的速度
        this.updateOrientation = false;//Whether the orientation of this game entity will be updated based on the velocity or not. 此游戏实体对象的刚想是否更具速度进行更新
        this.health = GameConfig.BOT.MAX_HEALTH;// 血量，生命值
        this.maxHealth = GameConfig.BOT.MAX_HEALTH;
        this.status = STATUS_ALIVE;// 状态

        this.isPlayer = false;// 是否是玩家对象

        // 当前游戏实体对象所在的凸多边形区域
        this.currentRegion = null;
        this.currentPosition = new YUKA.Vector3();
        this.previousPosition = new YUKA.Vector3();

        //搜索攻击
        this.searchAttacker = false;
        this.attackDirection = new YUKA.Vector3();// 攻击方向
        this.endTimeSearch = Infinity;
        this.searchTime = GameConfig.BOT.SEARCH_FOR_ATTACKER_TIME;

        // ignore:忽略
        this.ignoreHealth = false; // 忽略血条包
        this.ignoreShotgun = false; // 忽略枪
        this.ignoreAssaultRifle = false;// 是否忽略 来福枪

        this.endTimeIgnoreHealth = Infinity;
        this.endTimeIgnoreShotgun = Infinity;
        this.endTimeIgnoreAssaultRifle = Infinity;
        this.ignoreItemsTimeout = GameConfig.BOT.IGNORE_ITEMS_TIMEOUT;// 忽略超时时间

        // 死亡动画
        this.endTimeDying = Infinity;
        this.dyingTime = GameConfig.BOT.DYING_TIME;// 死亡过程花费的时间
        
        // head
        this.head = new YUKA.GameEntity();
        this.head.position.y = GameConfig.BOT.HEAD_HEIGHT;
        this.add(this.head);

        //the weapons are attached to the following container entity 武器附着在下面的实体对象上
        this.weaponContainer = new YUKA.GameEntity();
        this.head.add(this.weaponContainer);

        // bounds 
        this.bounds = new CharacterBounds(this);

        // 动画
        this.mixer = null;
        this.animationMaps = new Map();

        // navigation path
        this.path = null;

        // goal -driven agent design
        this.brain = new YUKA.Think(this);
        this.brain.addEvaluator(new AttackEvaluator());// 添加攻击状态评估器
        this.brain.addEvaluator(new ExploreEvaluator()); // 在map上随机生成一个位置，规划路线
        this.brain.addEvaluator(new HealthEvaluator(1,HEALTH_PACK));// 血🩸包
        this.brain.addEvaluator(new WeaponEvaluator(1,WEAPON_TYPES_ASSAULT_RIFLE));// 来福枪
        this.brain.addEvaluator(new WeaponEvaluator(1,WEAPON_TYPES_SHOTGUN));// 普通枪

        // Arbitration
        this.goalArbitrationRegulator = new YUKA.Regulator(GameConfig.BOT.GOAL.UPDATE_FREQUENCY);

        this.memorySystem = new YUKA.MemorySystem(this);
        this.memorySystem.memorySpan = GameConfig.BOT.MEMORY.SPAN;// 表示游戏实体短期记忆的持续时间（秒）。当机器人请求所有最近感测到的游戏实体的列表时，此值用于确定机器人是否能够记住游戏实体
        this.memoryRecords = new Array();

        // steering
        const followPathBehavior = new YUKA.FollowPathBehavior();
        followPathBehavior.active = false;
        followPathBehavior.nextWaypointDistance = GameConfig.BOT.NAVIGATION.NEXT_WAYPOINT_DISTANCE;
        followPathBehavior._arrive.deceleration =  GameConfig.BOT.NAVIGATION.ARRIVE_DECELERATION;
        this.steering.add(followPathBehavior);

        const onPathBehavior = new YUKA.OnPathBehavior();
        onPathBehavior.active = false;
        onPathBehavior.path  = followPathBehavior.path;
        onPathBehavior.radius = GameConfig.BOT.NAVIGATION.PATH_RADIUS;
        onPathBehavior.weight = GameConfig.BOT.NAVIGATION.ONPATH_WEIGHT;
        this.steering.add(onPathBehavior);

        const seekBehavior = new YUKA.SeekBehavior();
        seekBehavior.active = false;
        this.steering.add(seekBehavior);

        // vision
        this.vision = new YUKA.Vision(this.head);
        this.visionRegulator = new YUKA.Regulator(GameConfig.BOT.VISION.UPDATE_FREQUENCY);


        // target system
        this.targetSystem = new TargetSystem(this);
        this.targetSystemRegulator = new YUKA.Regulator(GameConfig.BOT.TARGET_SYSTEM.UPDATE_FREQUENCY);
        
        // weapon system
        this.weaponSystem = new WeaponSystem(this /* 代表Enemy 对象，内有world 属性 */);//
        this.weaponSelectionRegulator = new YUKA.Regulator(GameConfig.BOT.WEAPON.UPDATE_FREQUENCY);

        // debug
        this.pathHelper = null; // 从World 中赋值的
        this.hitboxHelper  = null;
    }
    /**
	* Executed when this game entity is updated for the first time by its entity manager.
	*
	* @return {Enemy} A reference to this game entity.
	*/
    start(){
        //console.log(5,this.animationMaps)
        const run = this.animationMaps.get('soldier_forward');
        run.enabled = true;

        const level = this.world.entityManager.getEntityByName('level');
        this.vision.addObstacle(level);

        this.bounds.init();
        this.weaponSystem.init();
        return this;
    }

    update(delta){
        super.update(delta);
        this.currentTime += delta;
        //ensure the enemy never leaves the level
        this.stayInLevel();

        if(this.status === STATUS_ALIVE){
            // update hitbox
            this.bounds.update();
            // update perception
            if(this.visionRegulator.ready()){
                this.updateVision();
            }
            // update memory system
            this.memorySystem.getValidMemoryRecords(this.currentTime,this.memoryRecords);
            // update target system
            if(this.targetSystemRegulator.ready()){
                this.targetSystem.update();
            }

            // update goals 
            this.brain.execute();
            if(this.goalArbitrationRegulator.ready()){
                this.brain.arbitrate();
            }

            // update weapon selection 
            if(this.weaponSelectionRegulator.ready()){
                this.weaponSystem.selectBestWeapon();
            }
            //  stop search for attacker if necessary
            if(this.currentTime >= this.endTimeSearch){
                this.resetSearch();
            }
            // reset ignore flags if necessary
            if(this.currentTime >= this.endTimeIgnoreHealth){
                this.ignoreHealth = false;
            }
            if(this.currentTime >= this.endTimeIgnoreShotgun){
                this.ignoreShotgun = false;
            }
            if(this.currentTime >= this.endTimeIgnoreAssaultRifle){
                this.ignoreAssaultRifle = false;
            }
            
			// updating the weapon system means updating the aiming and shooting.
			// so this call will change the actual heading/orientation of the enemy

            this.weaponSystem.update(delta);
        }

        // handle dying 处理死亡
        if(this.status === STATUS_DYING){
            if(this.currentTime >= this.endTimeDying){
                this.status = STATUS_DEAD;
                this.endTimeDying = Infinity;
            }
        }

        // handle health
        if(this.status === STATUS_DEAD){
            if(this.world.debug){
                console.log('Enemy->Id: %s died.',this.uuid);
            }

            this.reset();
            this.world.spawningManager.respawnCompetitor(this);
        }

        // always update animations
        this.updateAnimationMaps(delta);
        return this;
    }
    /**
     * 更新当前实体对象的所有动画
     * @param {Nember} delta 
     */
    updateAnimationMaps(delta){
        // 判断当前游戏实体的状态，只更新或者的对象
        if(this.status == STATUS_ALIVE){
            // 活着才更新动画
            this.getDirection(lookDirection);// Computes the current direction (forward) vector of this game entity and stores the result in the given vector.
            moveDirection.copy(this.velocity).normalize();

            // rotation 
            quaternion.lookAt(this.forward,moveDirection,this.up);
            // calculate weightings for movement animations

            positiveWeightings.length = 0;
            let sum = 0;
            // 前后左右四个方向
            for(let i =0; i < directions.length;i ++){
                transformedDirection.copy(directions[i].direction).applyRotation(quaternion);
                const dot = transformedDirection.dot(lookDirection);
                weightings[i] = (dot < 0 ) ? 0 : dot;
                const animation = this.animationMaps.get(directions[i].name);
                if(weightings[i] > 0.001){
                    animation.enabled = true;
                    positiveWeightings.push(i);
                    sum += weightings[i];
                }else{
                    animation.enabled = false;
                    animation.weight = 0;
                }
            }

            for(let i =0; i < positiveWeightings.length;i++){
                const index = positiveWeightings[i];
                const animation = this.animationMaps.get(directions[index].name);
                animation.weight = weightings[index]/sum;

                animation.timeScale = this.getSpeed() / this.maxSpeed;
            }
        }
        this.mixer.update(delta);
        return this;
    }
    /**
     * 重新设置敌人，当敌人被击毙
     */
    reset(){
        this.health = this.maxHealth;
        this.status = STATUS_ALIVE;

        this.resetSearch();

        this.ignoreHealth = false;
        this.ignoreWeapons = false;

        this.brain.clearSubgoals();
        this.memoryRecords.length = 0;
        this.memorySystem.clear();
        // 重新设置目标系统及武器系统
        this.targetSystem.reset();
        this.weaponSystem.reset();
        // 重新设置所有的动画
        this.resetAnimationMaps();
        // 设置默认的动画
        const run = this.animationMaps.get('soldier_forward');
        run.enabled = true;
        return this;
    }
    /**
     * 设置动画
     * @param {THREE.AnimationMixer} mixer 
     * @param {Array} clips 动画数组 
     */
    setAnimationMaps(mixer,clips){
        this.mixer = mixer;// 从World 中传递进来的
        // actions 
        for(let clip of clips){
            const action = mixer.clipAction(clip);
            action.play();
            action.enabled = false;
            action.name = clip.name;
            this.animationMaps.set(action.name,action);
        }
        return this;
    }
    /**
     * 重新设置所有的动画
     */
    resetAnimationMaps(){
        for(let animation of this.animationMaps.values()){
            animation.enabled = false;
            animation.time = 0;
            animation.timescale = 1;
        }
        return this;
    }
    /**
     * Resets the search for an attacker.
     */
    resetSearch(){
        this.searchAttacker = false;
        this.attackDirection.set(0,0,0);
        this.endTimeSearch = Infinity;
        return this;
    }
    /**
     * Updates the vision component of this game entity and stores
	* the result in the respective memory system.
     */
    updateVision(){
        const memorySystem = this.memorySystem;
        const vision = this.vision;

        const competitors = this.world.competitors;// 数组存储的竞争对手

        for(let i =0; i < competitors.length;i++){
            const competitor = competitors[i];
            // ignore own entity and consider only living enemies
            if(competitor === this || competitor.status !== STATUS_ALIVE) continue;
            if(memorySystem.hasRecord(competitor) === false){
                // 写入记录里面
                memorySystem.createRecord(competitor);

            }
            const record = memorySystem.getRecord(competitor);
            competitor.head.getWorldPosition(worldPosition);
            if(vision.visible(worldPosition) === true && competitor.active){
                record.timeLastSensed = this.currentTime;// 最后感知的时间
                record.lastSensedPosition.copy(competitor.position);// 最后可感知的位置 it's intended to use the body's position here
                if(record.visible === false) record.timeBecameVisible = this.currentTime;
                record.visible = true;
            }else{
                // 不可见
                record.visible = false;
            }
        }
        return this;
    }
    /**
     * Ensures the enemy never leaves the level.
     */
    stayInLevel(){
        // "currentPosition" represents the final position after the movement for a single
		// simualation step. it's now necessary to check if this point is still on
		// the navMesh

        this.currentPosition.copy(this.position);

        this.currentRegion = this.world.navMesh.clampMovement(
            this.currentRegion,this.previousPosition,this.currentPosition,this.position// this is the result vector that gets clamped
        );
        this.previousPosition.copy(this.position);
        // adjust height of the entity according to the ground
        const distance = this.currentRegion.plane.distanceToPoint(this.position);
        this.position.y -= distance * GameConfig.NAVMESH.HEIGHT_CHANGE_FACTOR;
        return this;
    }
    /**
     * 当前对象(enemy:敌人)能够在给定的方向上移动一步，则返回true，否则离开这个关卡
     * @param {*} direction 
     * @param {*} position - 记录位置返回值
     */
    canMoveInDirection(direction,position){
        position.copy(direction).applyRotation(this.rotation).normalize();
        position.multiplyScalar(GameConfig.BOT.MOVEMENT.DODGE_SIZE).add(this.position);

        const navMesh = this.world.navMesh;
        const region = navMesh.getRegionForPoint(position,1);
        return region !== null;
    }

    /**
     * 如果敌人在给定的位置，返回true，这个结果的测试精度在给定的配置里面
     * @param {*} position 
     */
    atPosition(position){
        const tolerance = GameConfig.BOT.NAVIGATION.ARRIVE_TOLERANCE * GameConfig.BOT.NAVIGATION.ARRIVE_TOLERANCE;
        const distance = this.position.squaredDistanceTo(position);
        return distance <= tolerance;
    }

    resetSearch(){
        this.searchAttacker = false;
        this.attackDirection.set(0,0,0);
        this.endTimeSearch = Infinity;

        return this;
    }

    rotateTo(target,delta,tolerance){
        customTarget.copy(target);
        customTarget.y = this.position.y;

        return super.rotateTo(customTarget,delta,tolerance);
    }


	/**
	* Returns true if the given item type is currently ignored by the enemy.
	*
	* @param {Number} type - The item type.
	* @return {Boolean} Whether the given item type is ignored or not.
	*/
	isItemIgnored( type ) {

		let ignoreItem = false;

		switch ( type ) {

			case HEALTH_PACK:
				ignoreItem = this.ignoreHealth;
				break;

			case WEAPON_TYPES_SHOTGUN:
				ignoreItem = this.ignoreShotgun;
				break;

			case WEAPON_TYPES_ASSAULT_RIFLE:
				ignoreItem = this.ignoreAssaultRifle;
				break;

			default:
				console.error( 'DIVE.Enemy: Invalid item type:', type );
				break;

		}

		return ignoreItem;

	}
	/*
	* Adds the given weapon to the internal weapon system.
	*
	* @param {WEAPON_TYPES} type - The weapon type.
	* @return {Enemy} A reference to this game entity.
	*/
    addWeapon(type){
        this.weaponSystem.addWeapon(type);
        this.world.uiManager.updateAmmoStatus();

        if(this.targetSystem.hasTarget() === false){
            this.weaponSystem.setNextWeapon(type);
        }
        return this;
    }

    ignoreItem(type){
        switch(type){
            case HEALTH_PACK:
                this.ignoreHealth = true;
                this.endTimeIgnoreHealth = this.currentTime + this.ignoreItemsTimeout;
                break;
            case WEAPON_TYPES_SHOTGUN:
                this.ignoreShotgun = true;
                this.endTimeIgnoreShotgun = this.currentTime + this.ignoreItemsTimeout;
                break;
            case WEAPON_TYPES_ASSAULT_RIFLE:
                this.ignoreAssaultRifle = true;
                this.endTimeIgnoreAssaultRifle = this.currentTime + this.ignoreItemsTimeout;
                break;
            default:
                console.error('DIVE.Enemy 无效的类型:',type);
                break;
        }
        return this;
    }
    /**
     * 
     * @param {*} amount 
     */
    addHealth(amount){
        this.health += amount;
        this.health = Math.min(this.health,this.maxHealth);

        if(this.world.debug){
			console.log( 'DIVE.Enemy: Entity with ID %s receives %i health points.', this.uuid, amount );

        }
        return this;
    }
    /**
     * 处理消息
     * @param {*} telegram 
     */
    handleMessage(telegram){
        
        switch(telegram.message){
            // 减少血量
            case MESSAGE_HIT:
                this.health -= telegram.data.damage;
                //logging
                if(this.world.debug){
					console.log( 'DIVE.Enemy: Enemy with ID %s hit by Game Entity with ID %s receiving %i damage.', this.uuid, telegram.sender.uuid, telegram.data.damage );
                }
                // if the player is the sender and if the enemy still lives, change the style of the crosshairs
                if(telegram.sender.isPlayer && this.status === STATUS_ALIVE){
                    this.world.uiManager.showHitIndication();
                }
                // check if the enemy is death
                if(this.health <= 0 && this.status === STATUS_ALIVE){
                    this.initDeath();
					// inform all other competitors about its death

                    const competitors = this.world.competitors;// 获取所有的竞争对象(就是敌人)
                    for(let i =0;i < competitors.length;i++){
                        const competitor = competitors[i];
                        if(this !== competitor) this.sendMessage(competitor,MESSAGE_DEAD);
                    }
                    // 更新UI
                    this.world.uiManager.addToMessage(telegram.sender,this);
                }else{
					// if not, search for attacker if he is still alive
                    if(telegram.sender.status === STATUS_ALIVE){
                        this.searchAttacker = true;
                        this.endTimeSearch = this.currentTime + this.searchTime;
                        this.attackDirection.copy(telegram.data.direction).multiplyScalar(-1);
                    }
                }
                break;
            case MESSAGE_DEAD:
                const sender = telegram.sender;
                const memoryRecord = this.memorySystem.getRecord(sender);
                // delete the dead enemy from the memory system when it was visible.
				// also update the target system so the bot looks for a different target
                if(memoryRecord && memoryRecord.visible){
                    this.removeEntityFromMemory(sender);
                    this.targetSystem.update();
                }
            break;
        }
        return true;
    }
    /**
     * Inits the death of an entity.
     */
    initDeath(){
        this.status = STATUS_DYING;
        this.endTimeDying = this.currentTime + this.dyingTime;

        this.velocity.set(0,0,0);
        // reset all steering behaviors
        for(let behavior of this.steering.behaviors){
            behavior.active = false;
        }

        // 重设所有的动画
        this.resetAnimationMaps();

        // start death animation 开启死亡动画
        const index = YUKA.MathUtils.randInt(1,2);
        const dying = this.animationMaps.get('soldier_death'+index);
        dying.enabled = true;

        return this;
    }

    /**
    	* Returns the intesection point if a projectile intersects with this entity.
	* If no intersection is detected, null is returned.
     * @param {*} ray 
     * @param {*} intersectionPoint 
     */
    checkProjectileIntersection(ray,intersectionPoint){
        return this.bounds.intersectRay(ray,intersectionPoint);
    }
    /**
     * Removes the given entity from the memory system.
     * @param {*} entity 
     */
    removeEntityFromMemory(entity){
        this.memorySystem.deleteRecord(entity);
        this.memorySystem.getValidMemoryRecords(this.currentTime,this.memoryRecords);
    }
}