import * as YUKA from 'yuka';
import GameConfig from './GameConfig';
import { WEAPON_STATUS_EMPTY, WEAPON_STATUS_OUT_OF_AMMO, WEAPON_STATUS_READY, WEAPON_STATUS_UNREADY, WEAPON_TYPES_ASSAULT_RIFLE, WEAPON_TYPES_BLASTER, WEAPON_TYPES_SHOTGUN } from './constants';
import Blaster from '../weapons/Blaster';
import Shotgun from '../weapons/Shotgun';
import AssaultRifle from '../weapons/AssaultRifle';


const displacement = new YUKA.Vector3();
const targetPosition = new YUKA.Vector3();
const offset = new YUKA.Vector3();

export default class WeaponSystem {

    /**
     * 
     * @param {*} owner - enemy or player
     */
    constructor(owner /* enemy  or player */){
        this.owner = owner;

        this.reactionTime = GameConfig.BOT.WEAPON.REACTION_TIME;// 敌人反应的最短的时间

        this.aimAccuracy = GameConfig.BOT.WEAPON.AIM_ACCURACY;// 

        this.weapons = new Array();

        this.weaponMaps = new Map();

        this.weaponMaps.set(WEAPON_TYPES_BLASTER,null);
        this.weaponMaps.set(WEAPON_TYPES_SHOTGUN,null);
        this.weaponMaps.set(WEAPON_TYPES_ASSAULT_RIFLE,null);

        this.currentWeapon = null;

        this.nextWeaponType = null;

        this.renderComponents = {
            blaster:{
                mash:null,
                audioMaps:new Map(),
                muzzle:null,
            },
            shotgun:{
                mash:null,
                audioMaps:new Map(),
                muzzle:null,
            },
            assaultRifle:{
                mash:null,
                audioMaps:new Map(),
                muzzle:null,
            }
        };

        this.fuzzyModules = {
            blaster:null,
            shotgun:null,
            assaultRifle:null
        };
    }

    init(){
        this._initRenderComponents();

        // 给机器人初始化模糊模块
        if(this.owner.isPlayer === false){
            // 表示是机器人
            this._initFuzzyModules();
        }
        // reset the system to its initial state
        this.reset();
        return this;
    }
    /**
     * 重新设置武器系统
     * @returns 
     */
    reset(){
        // 移除已经存在的武器
        for(let i = this.weapons.length - 1; i >= 0;i-- ){
            const weapon = this.weapons[i];
            this.removeWeapon(weapon.type);
        }
        // 添加武器到库存中去 add weapons to inventory
        this.addWeapon(WEAPON_TYPES_BLASTER);
        // 改变初始化武器
        this.changeWeapon(WEAPON_TYPES_BLASTER);
        // reset next weapon
        this.nextWeaponType = null;
        this.currentWeapon.status  = WEAPON_STATUS_READY;
        return this;
    }

    /**
     * 获取最优的武器
     */
    selectBestWeapon(){
        const owner = this.owner;
        const target = owner.targetSystem.getTarget();
        if(target){
            let highestDesirability = 0;
            let bestWeaponType = WEAPON_TYPES_BLASTER;

            const distanceToTarget = this.owner.position.distanceTo(target.position);
            // for each weapon in the inventory calculate its desirability given the
			// current situation. The most desirable weapon is selected

            for(let i =0 ; i < this.weapons.length;i++){
                const weapon = this.weapons[i];
                // 当前枪里还有子弹就得到一个概率值，否则就是0
                let desirability = (weapon.currentAmmo === 0 ) ? 0 : weapon.getDesirability(distanceToTarget);
                // if weapon is different than currentWeapon, decrease the desirability in order to respect the
				// cost of changing a weapon
                if(this.currentWeapon !== weapon) desirability -= GameConfig.BOT.WEAPON.CHANGE_COST;

                if(desirability > highestDesirability){
                    highestDesirability = desirability;
                    bestWeaponType = weapon.type;
                }
            }
            // 选择最优的武器
            this.setNextWeapon(bestWeaponType);
        }
        return this;
    }
    /**
     * 根据类型改变当前武器
     * @param {*} type 
     */
    changeWeapon(type){
        const weapon = this.weaponMaps.get(type);
        if(weapon){
            this.currentWeapon = weapon;

            // 只有一个武器可见
            switch(weapon.type){
                case WEAPON_TYPES_BLASTER:
                    this.renderComponents.blaster.mesh.visible = true;
                    this.renderComponents.shotgun.mesh.visible = false;
                    this.renderComponents.assaultRifle.mesh.visible = false;
                    if(this.owner.isPlayer) weapon.setRenderComponent(this.renderComponents.blaster.mesh,this.owner.world.sync.bind(this.owner.world));
                    break;
                case WEAPON_TYPES_SHOTGUN:
                    this.renderComponents.blaster.mesh.visible = false;
                    this.renderComponents.shotgun.mesh.visible = true;
                    this.renderComponents.assaultRifle.mesh.visible = false;
                    if(this.owner.isPlayer) weapon.setRenderComponent(this.renderComponents.shotgun.mesh,this.owner.world.sync.bind(this.owner.world));
                    break;
                case WEAPON_TYPES_ASSAULT_RIFLE:
                    this.renderComponents.blaster.mesh.visible = false;
                    this.renderComponents.shotgun.mesh.visible = false;
                    this.renderComponents.assaultRifle.mesh.visible = true;
                    if(this.owner.isPlayer) weapon.setRenderComponent(this.renderComponents.assaultRifle.mesh,this.owner.world.sync.bind(this.owner.world));
                    break;
                default:
                    console.log('无效的武器类型：',type);
                    break;
            }
        }
        return this;
    }
    /**
     *  Adds a weapon of the specified type to the bot's inventory.
	* If the bot already has a weapon of this type only the ammo is added.
	* 已经存在指定类型枪，则添加子弹即可
     * @param {*} type 
     */
    addWeapon(type){
        const owner = this.owner;
        let weapon ;

        switch(type){
            case WEAPON_TYPES_BLASTER: // 散弹枪
                weapon = new Blaster(owner);//
                weapon.fuzzyModule = this.fuzzyModules.blaster;
                weapon.muzzle = this.renderComponents.blaster.muzzle;
                weapon.audioMaps = this.renderComponents.blaster.audioMaps;
                break;
            case WEAPON_TYPES_SHOTGUN:
                weapon = new Shotgun(owner);
                weapon.fuzzyModule = this.fuzzyModules.shotgun;
                weapon.muzzle = this.renderComponents.shotgun.muzzle;
                weapon.audioMaps = this.renderComponents.shotgun.audioMaps;
                break;
            case WEAPON_TYPES_ASSAULT_RIFLE: // 来福枪
                weapon = new AssaultRifle(owner);
                weapon.fuzzyModule = this.fuzzyModules.assaultRifle;
                weapon.muzzle = this.renderComponents.assaultRifle.muzzle;
                weapon.audioMaps = this.renderComponents.assaultRifle.audioMaps;
                break;
            default:
                console.log('DIVE.WeaponSystem :无效的类型');
                break;
        }

        // check inventory:存活
        const weaponInventory = this.weaponMaps.get(type);
        if(weaponInventory !== null){
            // 机器人对象已经有type类型的武器，就不用再增加，而是增加子弹即可
            weaponInventory.addRounds(weapon.getRemainingRounds());
        }else{
            //
            this.weaponMaps.set(type,weapon);
            this.weapons.push(weapon);

            owner.weaponContainer.add(weapon);
            if(owner.isPlayer){
                weapon.scale.set(2,2,2);
                weapon.position.set(0.3,-0.3,-1);
                weapon.rotation.fromEuler(0,Math.PI ,0);
                weapon.initAnimationMaps();
            }else{
                weapon.position.set(-0.1,-0.2,0.5);
            }
        }
        return this;
    }
    /**
     * 从机器人武器库存中移除指定类型的武器
     * @param {*} type 
     */
    removeWeapon(type){
        const weapon = this.weaponMaps.get(type);
        if(weapon ){
            this.weaponMaps.set(type,null);

            const index = this.weapons.indexOf(weapon);
            this.weapons.splice(index,1);

            this.owner.weaponContainer.remove(weapon);
        }
    }

    setNextWeapon(type){
        if(this.currentWeapon.type !== type){
            this.nextWeaponType = type;
        }

        return this;
    }

    getWeapon(type){
        return this.weaponMaps.get(type);
    }

    showCurrentWeapon(){
        const type = this.currentWeapon.type;
        switch(type){
            case WEAPON_TYPES_BLASTER:
                this.renderComponents.blaster.mesh.visible = true;
                break;
            case WEAPON_TYPES_SHOTGUN:
                this.renderComponents.shotgun.mesh.visible = true;
                break;
            case WEAPON_TYPES_ASSAULT_RIFLE:
                this.renderComponents.assaultRifle.mesh.visible = true;
                break;
            default:
                console.log('无效武器类型:',type);
                break;
        }
        return this;
    }

    hideCurrentWeapon(){
        const type = this.currentWeapon.type;
        switch(type){
            case WEAPON_TYPES_BLASTER:
                this.renderComponents.blaster.mesh.visible = false;
                break;
            case WEAPON_TYPES_SHOTGUN:
                this.renderComponents.shotgun.mesh.visible = false;
                break;
            case WEAPON_TYPES_ASSAULT_RIFLE:
                this.renderComponents.assaultRifle.mesh.visible = false;
                break;
            default:
                console.log('无效的武器类型:',type);
                break;
        }
        return this;
    }
    /**
     * 获取指定类型武器的(remain:剩余)子弹数量
     * @param {*} type 
     */
    getRemainingAmmoForWeapon(type){
        const weapon = this.weaponMaps.get(type);
        return weapon ? weapon.getRemainingRounds() : 0;
    }

    update(delta){
        this.updateWeaponChange();
        this.updateAimAndShot(delta);
        return this;
    }
    /**
     * 
     * @returns this
     */
    updateWeaponChange(){
        if(this.nextWeaponType !== null){
            // if the current weapon is in certain states, hide it in order to start the weapon change
            if(this.currentWeapon.status === WEAPON_STATUS_READY || 
                this.currentWeapon.status === WEAPON_STATUS_EMPTY ||
                this.currentWeapon.status === WEAPON_STATUS_OUT_OF_AMMO
            ){
                this.currentWeapon.hide();
            }

            if(this.currentWeapon.status === WEAPON_STATUS_UNREADY){
                this.changeWeapon(this.nextWeaponType);
                this.currentWeapon.equip();
                this.nextWeaponType = null;
            }
        }
        return this;
    }
    /**
     * 更新敌人及射击
     * @param {*} delta 
     */
    updateAimAndShot(delta){
        const owner = this.owner;
        const targetSystem = owner.targetSystem;
        const target       = targetSystem.getTarget();

        if(target){
            // 找到目标，
            // if the target is visible, directly rotate towards it and then
			// fire a round
            if(targetSystem.isTargetShootable()){
                owner.resetSearch();// 搜索并攻击
                // the bot can fire a round if it is headed towards its target
				// and after a certain reaction time
                const targeted = owner.rotateTo(target.position,delta,0.05);

                const timeBecameVisible = targetSystem.getTimeBecameVisible();
                const elapsedTime = owner.world.yukaTime.getElapsed();

                if(targeted === true && (elapsedTime - timeBecameVisible) >= this.reactionTime){
                    target.bounds.getCenter(targetPosition);
                    this.addNoiseToAim(targetPosition);
                    this.shoot(targetPosition);
                }
            }else{
                if(owner.searchAttacker){
                    targetPosition.copy(owner.position).add(owner.attackDirection);
                    owner.rotateTo(targetPosition,delta);
                }else{
                    owner.rotateTo(targetSystem.getLastSensedPosition(),delta);
                }
            }
        }else{
            if(owner.searchAttacker){
                targetPosition.copy(owner.position).add(owner.attackDirection);
                owner.rotateTo(targetPosition,delta);
            }else{
                // if the enemy has no target and is not being attacked, just look along
				// the movement direction
                displacement.copy(owner.velocity).normalize();
                targetPosition.copy(owner.position).add(displacement);
                
                owner.rotateTo(targetPosition,delta);
            }
        }
        return this;
    }

    addNoiseToAim(targetPosition){
        const distance = this.owner.position.distanceTo(targetPosition);

        offset.x = YUKA.MathUtils.randFloat(- this.aimAccuracy,this.aimAccuracy);
        offset.y = YUKA.MathUtils.randFloat(- this.aimAccuracy,this.aimAccuracy);
        offset.z = YUKA.MathUtils.randFloat(- this.aimAccuracy,this.aimAccuracy);

        const maxDistance = GameConfig.BOT.WEAPON.NOISE_MAX_DISTANCE;
        const f = Math.min(distance,maxDistance) / maxDistance;
        targetPosition.add(offset.multiplyScalar(f));
        return targetPosition;
    }
    /**
     * 开枪
     * @param {*} targetPosition 
     */
    shoot(targetPosition){
        const currentWeapon = this.currentWeapon;
        const status = currentWeapon.status;

        switch(status){
            case WEAPON_STATUS_EMPTY:
                currentWeapon.reload();
                break;
            case WEAPON_STATUS_READY:
                currentWeapon.shoot(targetPosition);
                break;
            default:
                break;
        }
        return this;
    }

    reload(){
        const currentWeapon = this.currentWeapon;
        if(currentWeapon.status === WEAPON_STATUS_READY ||
            currentWeapon.status === WEAPON_STATUS_EMPTY
        ){
            currentWeapon.reload();
        }
        return this;
    }
    /**
     * 在yuka.js中，fuzzyModules模块实现了模糊逻辑系统。模糊逻辑是一种处理近似推理的方法，与传统的布尔逻辑（true/false）不同，它允许变量具有0到1之间的部分真值。这在处理不确定性和主观性时非常有用，例如在游戏AI中模拟人类决策。
     * 隶属度函数（Membership Function）
     * 
     * ### `_initFuzzyModules` 方法的目标
        - __核心目的__：为敌人AI初始化模糊逻辑决策系统
        - __具体实现__：
        - 为三种武器类型（突击步枪/霰弹枪/爆破枪）分别创建模糊模块（`FuzzyModules`）
        - 定义两个核心模糊变量：
            - `distanceToTarget`：目标距离（近/中/远）
            - `desirability`：武器合意度（不合意/合意/非常合意）
        - 使用三种模糊集合描述变量：
            - `LeftShoulderFuzzySet`（左肩函数）
            - `TriangularFuzzySet`（三角函数）
            - `RightShoulderFuzzySet`（右肩函数）
        - __设计目标__：
        - 让AI能根据目标距离等模糊因素选择最佳武器
        - 实现人类式决策（非布尔逻辑的精确判断）
     * 
     * 给所有的武器初始化模糊模块
     *  */ 
    _initFuzzyModules(){
        // 创建模糊模块
        this.fuzzyModules.assaultRifle = new YUKA.FuzzyModules();
        this.fuzzyModules.blaster = new YUKA.FuzzyModules();
        this.fuzzyModules.shotgun = new YUKA.FuzzyModules();

        const fuzzyModuleAssaultRifle = this.fuzzyModules.assaultRifle;
        const fuzzyModuleBlaster = this.fuzzyModules.blaster;
        const fuzzyModuleShotgun = this.fuzzyModules.shotgun;

        // flv distance to target, 创建距离变量
        const distanceToTarget = new YUKA.FuzzyVariable();
        
        const targetClose = new YUKA.LeftShoulderFuzzySet(0,10,20);// 左边由低到高
        const targetMedium = new YUKA.TriangularFuzzySet(10,20,40);
        const targetFar = new YUKA.RightShoulderFuzzySet(20,40,1000);

        distanceToTarget.add(targetClose);
        distanceToTarget.add(targetMedium);
        distanceToTarget.add(targetFar);

        // flv desirability(愿望；合意；有利条件；值得向往的事物)
        const desirability = new YUKA.FuzzyVariable();

        const undesirable = new YUKA.LeftShoulderFuzzySet(0,25,50);
        const desirable = new YUKA.TriangularFuzzySet(25,50,75);
        const veryDesirable = new YUKA.RightShoulderFuzzySet(50,75,100);
        
        desirability.add(undesirable);
        desirability.add(desirable);
        desirability.add(veryDesirable);

        fuzzyModuleAssaultRifle.addFLV('desirability',desirability);
        fuzzyModuleAssaultRifle.addFLV('distanceToTarget',distanceToTarget);

        fuzzyModuleBlaster.addFLV('desirability',desirability);
        fuzzyModuleBlaster.addFLV('distanceToTarget',distanceToTarget);

        fuzzyModuleShotgun.addFLV('desirability',desirability);
        fuzzyModuleShotgun.addFLV('distanceToTarget',distanceToTarget);

        const fuzzySets = {
            targetClose:targetClose,
            targetMedium:targetMedium,
            targetFar:targetFar,
            undesirable:undesirable,
            desirable:desirable,
            veryDesirable:veryDesirable
        };

        // 初始化来福枪模块
        this._initAssaultRifleFuzzyModule(fuzzySets);
        this._initBlasterFuzzyModule(fuzzySets);
        this._initShotgunFuzzyModule(fuzzySets);

        return this;
    }

    _initShotgunFuzzyModule(fuzzySets){
        // FLV ammo status

		const fuzzyModuleShotGun = this.fuzzyModules.shotGun;
		const ammoStatusShotgun = new FuzzyVariable();

		const lowShot = new LeftShoulderFuzzySet( 0, 2, 4 );
		const okayShot = new TriangularFuzzySet( 2, 7, 10 );
		const LoadsShot = new RightShoulderFuzzySet( 7, 10, 12 );

		ammoStatusShotgun.add( lowShot );
		ammoStatusShotgun.add( okayShot );
		ammoStatusShotgun.add( LoadsShot );

		fuzzyModuleShotGun.addFLV( 'ammoStatus', ammoStatusShotgun );

		// rules

		fuzzyModuleShotGun.addRule( new FuzzyRule( new FuzzyAND( fuzzySets.targetClose, lowShot ), fuzzySets.desirable ) );
		fuzzyModuleShotGun.addRule( new FuzzyRule( new FuzzyAND( fuzzySets.targetClose, okayShot ), fuzzySets.veryDesirable ) );
		fuzzyModuleShotGun.addRule( new FuzzyRule( new FuzzyAND( fuzzySets.targetClose, LoadsShot ), fuzzySets.veryDesirable ) );

		fuzzyModuleShotGun.addRule( new FuzzyRule( new FuzzyAND( fuzzySets.targetMedium, lowShot ), fuzzySets.undesirable ) );
		fuzzyModuleShotGun.addRule( new FuzzyRule( new FuzzyAND( fuzzySets.targetMedium, okayShot ), fuzzySets.undesirable ) );
		fuzzyModuleShotGun.addRule( new FuzzyRule( new FuzzyAND( fuzzySets.targetMedium, LoadsShot ), fuzzySets.desirable ) );

		fuzzyModuleShotGun.addRule( new FuzzyRule( new FuzzyAND( fuzzySets.targetFar, lowShot ), fuzzySets.undesirable ) );
		fuzzyModuleShotGun.addRule( new FuzzyRule( new FuzzyAND( fuzzySets.targetFar, okayShot ), fuzzySets.undesirable ) );
		fuzzyModuleShotGun.addRule( new FuzzyRule( new FuzzyAND( fuzzySets.targetFar, LoadsShot ), fuzzySets.undesirable ) );

		return this;
    }
    _initBlasterFuzzyModule(fuzzySets){
        // 创建一个FLV ammo 弹药 的模糊变量

        const fuzzyModuleBlaster = this.fuzzyModules.blaster;
        // 定义FLV 变量
        const ammoStatusBlaster = new YUKA.FuzzyVariable();

        const lowBlaster = new YUKA.LeftShoulderFuzzySet(0,8,15);
        const okayBlaster  = new YUKA.TriangularFuzzySet(8,20,30);
        const loadsBlaster = new YUKA.RightShoulderFuzzySet(20,30,48);

        ammoStatusBlaster.add(lowBlaster);
        ammoStatusBlaster.add(okayBlaster);
        ammoStatusBlaster.add(loadsBlaster);

        fuzzyModuleBlaster.addFLV('ammoStatus',ammoStatusBlaster);

        // 添加规则
        fuzzyModuleBlaster.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetClose,lowBlaster),fuzzySets.undesirable));
        fuzzyModuleBlaster.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetClose,okayBlaster),fuzzySets.desirable));
        fuzzyModuleBlaster.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetClose,loadsBlaster),fuzzySets.desirable));

        fuzzyModuleBlaster.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetMedium,lowBlaster),fuzzySets.desirable));
        fuzzyModuleBlaster.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetMedium,okayBlaster),fuzzySets.desirable));
        fuzzyModuleBlaster.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetMedium,loadsBlaster),fuzzySets.desirable));

        fuzzyModuleBlaster.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetFar,lowBlaster),fuzzySets.desirable));
        fuzzyModuleBlaster.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetFar,okayBlaster),fuzzySets.desirable));
        fuzzyModuleBlaster.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetFar,loadsBlaster),fuzzySets.desirable));

        return this;
    }

    /**
     * - __核心目的__：为突击步枪定制模糊决策规则
        - __具体实现__：
        - 添加第三个关键变量：`ammoStatus`（弹药状态：少/中等/充足）
        - 创建9条决策规则，例如：
            ```js
            // 目标近 + 弹药少 → 不合意
            new FuzzyRule(new FuzzyAND(targetClose, lowAssault), undesirable)

            // 目标中距离 + 弹药充足 → 非常合意
            new FuzzyRule(new FuzzyAND(targetMedium, loadsAssault), veryDesirable)
            ```
        - __设计目标__：
        - 根据距离+弹药量动态评估武器价值
        - 实现突击步枪的专用决策逻辑：
            - 中远距离高价值
            - 近距离需充足弹药才有效
        ###

     * @param {*} fuzzySets 
     */
    _initAssaultRifleFuzzyModule(fuzzySets){
        const fuzzyModuleAssaultRifle = this.fuzzyModules.assaultRifle;
        const ammoStatusAssaultRifle = new YUKA.FuzzyVariable();// 定义一个模糊变量 ammo:弹药、军火

        const lowAssault = new YUKA.LeftShoulderFuzzySet(0,2,0);
        const okayAssault = new YUKA.TriangularFuzzySet(2,10,20);
        const loadsAssault = new YUKA.RightShoulderFuzzySet(10,20,30);

        ammoStatusAssaultRifle.add(lowAssault);
        ammoStatusAssaultRifle.add(okayAssault);
        ammoStatusAssaultRifle.add(loadsAssault);

        fuzzyModuleAssaultRifle.adFLV('ammoStatus',ammoStatusAssaultRifle);

        // rules
        fuzzyModuleAssaultRifle.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetClose,lowAssault),fuzzySets.undesirable));
        fuzzyModuleAssaultRifle.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetClose,okayAssault),fuzzySets.desirable));
        fuzzyModuleAssaultRifle.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetClose,loadsAssault),fuzzySets.desirable));

        fuzzyModuleAssaultRifle.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetMedium,lowAssault),fuzzySets.desirable));
        fuzzyModuleAssaultRifle.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetMedium,okayAssault),fuzzySets.veryDesirable));
        fuzzyModuleAssaultRifle.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetMedium,loadsAssault),fuzzySets.veryDesirable));

        fuzzyModuleAssaultRifle.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetFar,lowAssault),fuzzySets.desirable));
        fuzzyModuleAssaultRifle.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetFar,okayAssault),fuzzySets.veryDesirable));
        fuzzyModuleAssaultRifle.addRule(new YUKA.FuzzyRule(new YUKA.FuzzyAND(fuzzySets.targetFar,loadsAssault),fuzzySets.veryDesirable));

        return this;
    }   
    
    _initRenderComponents(){
        this._initBlasterRenderComponent();

        this._initShotgunRenderComponent();

        this._initAssaultRifleRenderComponent();

        return this;
    }

    _initBlasterRenderComponent(){
        const assetManager = this.owner.world.assetManager;

        let blasterMesh = null;
        if(this.owner.isPlayer === false){
            // 是玩家
            blasterMesh = assetManager.modelMaps.get('blaster_low').clone();
            blasterMesh.scale.set(100,100,100);
            blasterMesh.rotation.set(Math.PI * 0.5,Math.PI ,0);
            blasterMesh.position.set(0,15,5);
            blasterMesh.updateMatrix();

            const rightHand = this.owner._renderComponent.getObjectByName('Armature_mixamorigRightHand');
            rightHand.add(blasterMesh);
        }else{
            // 敌人用高精度模型
            blasterMesh = assetManager.modelMaps.get('blaster_low');
            this.owner.world.scene.add(blasterMesh);
        }

        // add muzzle sprite to the blaster mesh

        const muzzleSprite = assetManager.modelMaps.get('muzzle').clone();
        muzzleSprite.material = muzzleSprite.material.clone();
        muzzleSprite.position.set(0,0.05,0.2);
        muzzleSprite.scale.set(0.3,0.3,0.3);
        muzzleSprite.updateMatrix();
        blasterMesh.add(muzzleSprite);

        // add positional audios
        const shot = assetManager.cloneAudio(assetManager.audioMaps.get('blaster_shot'));
        /**
        PannerNode接口的rolloffFactor属性是一个双精
        度值，用于描述随着声源远离听者，音量减小的速
        度。所有距离模型都使用此值。rolloffFactor属性的
        默认值为1
         */
        shot.setRolloffFactor(0.5);
        shot.setVolume(0.5);
        blasterMesh.add(shot);
        const reload = assetManager.cloneAudio(assetManager.audioMaps.get('reload'));
        reload.setVolume(0.3);
        blasterMesh.add(reload);

        // 存储配置
        this.renderComponents.blaster.mesh = blasterMesh;
        this.renderComponents.blaster.audioMaps.set('shot',shot);
        this.renderComponents.blaster.audioMaps.set('reload',reload);
        this.renderComponents.blaster.muzzle = muzzleSprite;

        return this;
    }

    _initShotgunRenderComponent(){
        const assetManager = this.owner.world.assetManager;
        let shotgunMesh = null;
        if(this.owner.isPlayer === false){
            // 玩家
            shotgunMesh = assetManager.modelMaps.get('shotgun_low').clone();
            shotgunMesh.scale.set(100,100,100);
            shotgunMesh.rotation.set(Math.PI * 0.5,Math.PI * 1.05 ,0);
            shotgunMesh.position.set(-5,30,2);
            shotgunMesh.updateMatrix();

            // 把枪添加到右手
            const rightHand = this.owner._renderComponent.getObjectByName('Armature_mixamorigRightHand');
            rightHand.add(shotgunMesh);
        }else{
            // 敌人
            shotgunMesh = assetManager.modelMaps.get('shotgun_high');
            this.owner.world.scene.add(shotgunMesh);
        }

        const muzzleSprite = assetManager.modelMaps.get('muzzle').clone();
        muzzleSprite.material = muzzleSprite.material.clone();
        muzzleSprite.position.set(0,0.05,0.3);
        muzzleSprite.scale.set(0.4,0.4,0.4);
        muzzleSprite.updateMatrix();
        shotgunMesh.add(muzzleSprite);

        // 添加音频
        const shot = assetManager.cloneAudio(assetManager.audioMaps.get('shotgun_shot'));
        shot.setRolloffFactor(0.5);
        shot.setVolume(0.6);
        shotgunMesh.add(shot);
        const reload = assetManager.cloneAudio(assetManager.audioMaps.get('reload'));
        reload.setVolume(0.1);
        shotgunMesh.add(reload);
        const shotReload = assetManager.cloneAudio(assetManager.audioMaps.get('shotgun_shot_reload'));
        shotReload.setVolume(0.2);
        shotgunMesh.add(shotReload);

        this.renderComponents.shotgun.mesh = shotgunMesh;
        this.renderComponents.shotgun.audioMaps.set('shot',shot);
        this.renderComponents.shotgun.audioMaps.set('reload',reload);
        this.renderComponents.shotgun.audioMaps.set('shot_reload',shotReload);
        this.renderComponents.shotgun.muzzle = muzzleSprite;

        return this;
    }

    _initAssaultRifleRenderComponent(){
        const assetManager = this.owner.world.assetManager;
        //console.log(3,this.owner)
        let assaultRifleMesh = null;
        if(this.owner.isPlayer === false){
            // 敌人
            assaultRifleMesh = assetManager.modelMaps.get('assaultRifle_low').clone();
            assaultRifleMesh.scale.set(100,100,100);
            assaultRifleMesh.rotation.set(Math.PI * 0.5,Math.PI * 1,0);
            assaultRifleMesh.position.set(-5,20,7);
            assaultRifleMesh.updateMatrix();

            const rightHand = this.owner._renderComponent.getObjectByName('Armature_mixamorigRightHand');
            rightHand.add(assaultRifleMesh);
        }else
        {
            // 玩家
            assaultRifleMesh = assetManager.modelMaps.get('assaultRifle_high');
            this.owner.world.scene.add(assaultRifleMesh);
        }

        const muzzleSprite = assetManager.modelMaps.get('muzzle').clone();
        muzzleSprite.material = muzzleSprite.material.clone();
        muzzleSprite.position.set(0,0,0.5);
        muzzleSprite.scale.set(0.5,0.5,0.5);
        muzzleSprite.updateMatrix();
        assaultRifleMesh.add(muzzleSprite);

        const shot = assetManager.cloneAudio(assetManager.audioMaps.get('assault_rifle_shot'));
        shot.setRolloffFactor(0.5);
        shot.setVolume(0.8);
        assaultRifleMesh.add(shot);
        const reload = assetManager.cloneAudio(assetManager.audioMaps.get('reload'));
        reload.setVolume(0.2);
        assaultRifleMesh.add(reload);

        this.renderComponents.assaultRifle.mesh = assaultRifleMesh;
        this.renderComponents.assaultRifle.audioMaps.set('shot',shot);
        this.renderComponents.assaultRifle.audioMaps.set('reload',reload);
        this.renderComponents.assaultRifle.muzzle = muzzleSprite;

        return this;
    }
}