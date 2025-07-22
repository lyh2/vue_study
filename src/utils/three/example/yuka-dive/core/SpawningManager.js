/**
 * spawning :产卵；引发；导致；造成；引起
 */

import * as YUKA from 'yuka';
import HealthPackExtendBaseGameEntity from '../entities/HealthPackExtendBaseGameEntity';
import GameConfig from './GameConfig';
import BaseTriggerExtendTrigger from '../triggers/BaseTriggerExtendTrigger';
import SceneUtils from '../etc/SceneUtils';
import WeaponItemExtendBaseGameEntity from '../entities/WeaponItemExtendBaseGameEntity';
import { HEALTH_PACK, WEAPON_TYPES_ASSAULT_RIFLE, WEAPON_TYPES_BLASTER, WEAPON_TYPES_SHOTGUN } from './constants';
import  World  from './World';

/**
 * spawning:产生，产卵,这个类用来实现对敌人，武器，血条的产生管理
 */
export default class SpawningManager{

    /**
     * 
     * @param {*} world 
     */
    constructor(world){
        this.world = world;

        this.spawningPoints = new Array();// 竞争对象的产生点

        this.itemTriggerMap = new Map(); // trigger

        // 血条
        this.healthPacks = new Array();
        this.healthPackSpawningPoints = new Array();


        // weapon：武器
        this.blasters = new Array();
        this.blasterSpawningPoints = new Array();

        this.shotguns = new Array();
        this.shotgunSpawningPoints  = new Array();

        this.assaultRilfles = new Array();
        this.assaultRilflesSpawningPoints = new Array();

    }

    /**
     * 初始化 spawning manager
     */
    init(){
        this.initSpawningPoints(); // 构造产生敌人，武器，血包的位置点
        // 创建血条包
        this.initHealthPacks();
        // 创建武器
        this.initWeapons();
        return this;
    }
    /**设置敌人出现在那个地方
     * Respawns the given competitor.
     * @param {GameEntity} competitor 
     */
    respawnCompetitor(competitor){
        
        const spawnPoint = this.getSpawnPoint(competitor);

        competitor.position.copy(spawnPoint.position);
        competitor.rotation.fromEuler(spawnPoint.rotation.x,spawnPoint.rotation.y,spawnPoint.rotation.z);
        if(competitor.isPlayer) competitor.head.rotation.set(0,0,0,1);
        return this;
    }
    /**
     * Gets a suitable respawn point for the given enemy. 给当前敌人生成一个可用的点(再次出现的点)
     * @param {*} enemy 
     */
    getSpawnPoint(enemy){
        const spawningPoints = this.spawningPoints;
        const competitors = this.world.competitors;// 敌人列表
        
        let maxDistance = - Infinity;
        let bestSpawningPoint = null;
        //console.log(this.world.competitors);
        // searching for the spawning point furthest away from an enemy
        for(let i =0 ; i < spawningPoints.length;i++){
            // 循环每一个预制的出生点
            const spawningPoint = spawningPoints[i];
            let closestDistance = Infinity;
            // 与敌人列表进行判断
            for(let j =0; j < competitors.length;j++){
                const competitor = competitors[j];
                //console.log(2,competitor)
                if(competitor !== enemy){
                    const distance = spawningPoint.position.squaredDistanceTo(competitor.position);
                    if(distance < closestDistance){
                        closestDistance = distance;
                    }
                }
            }

            if(closestDistance > maxDistance){
                maxDistance = closestDistance;
                bestSpawningPoint = spawningPoint;
            }
        }
        return bestSpawningPoint;
    }

    /**
     * 从配置文件中获取点位进行初始化
     * 
     */
    initSpawningPoints(){
        //console.log(this.world.assetManager)
        const levelConfig = this.world.assetManager.configMaps.get('level');
        // 生成竞争对手的点位，敌人
        for(const spawningPoint of levelConfig.competitorSpawningPoints){
            const position = spawningPoint.position;
            const rotation = spawningPoint.rotation;

            this.spawningPoints.push({
                position:new YUKA.Vector3().fromArray(position),
                rotation:{x:rotation[0],y:rotation[1],z:rotation[2]},
            });
        }

        // 创建血条包的点
        for(const spawningPoint of levelConfig.healthPackSpawningPoints){
            this.healthPackSpawningPoints.push(new YUKA.Vector3().fromArray(spawningPoint));
        }

        // 创建产生武器的点
        for(const spawningPoint of levelConfig.shotgunSpawningPoints){
            this.shotgunSpawningPoints.push(new YUKA.Vector3().fromArray(spawningPoint));
        }

        // 来福枪的点
        for(const spawningPoint of levelConfig.assaultRilflesSpawningPoints){
            this.assaultRilflesSpawningPoints.push(new YUKA.Vector3().fromArray(spawningPoint));
        }
        return this;
    }

    // Inits the collectable health packs.
    initHealthPacks(){
        const world = this.world;
        const assetManager = world.assetManager;

        for(let spawningPoint of this.healthPackSpawningPoints){
            // 创建血条实体对象
            const healthPack = new HealthPackExtendBaseGameEntity();
            healthPack.position.copy(spawningPoint);

            // 获取对应的模型
            const renderComponent = assetManager.modelMaps.get('healthPack').clone();
            renderComponent.position.copy(healthPack.position);
            healthPack.setRenderComponent(renderComponent,world.sync.bind(world));// 查看这里是否有问题

            this.healthPacks.push(healthPack);
            world.add(healthPack);

            // navigation
            healthPack.currentRegion = world.navMesh.getRegionForPoint(healthPack.position,1.0);

            // audio
            const audio = assetManager.cloneAudio(assetManager.audioMaps.get('health'));
            healthPack.audio = audio;
            renderComponent.add(audio);

            // trigger 
            this.createTrigger(healthPack,GameConfig.HEALTH_PACK.RADIUS);
        }

        return this;
    }

    /**
     * 创建武器
     */
    initWeapons(){
        const world = this.world;
        const assetManager = world.assetManager;
        
        // 创建能量枪
        for(let spawningPoint of this.blasterSpawningPoints){
            const blasterEntity = new WeaponItemExtendBaseGameEntity(WEAPON_TYPES_BLASTER,GameConfig.BLASTER.RESPAWN_TIME,GameConfig.BLASTER.AMMO);
            blasterEntity.position.copy(spawningPoint);

            const renderComponent = assetManager.modelMaps.get('blaster_low').clone();
            renderComponent.position.copy(blasterEntity.position);
            blasterEntity.setRenderComponent(renderComponent,world.sync.bind(world));

            this.blasters.push(blasterEntity);
            world.add(blasterEntity);

            // navigation
            blasterEntity.currentRegion = world.navMesh.getRegionForPoint(blasterEntity.position,1);

            // audio
            const audio = assetManager.cloneAudio(assetManager.audioMaps.get('ammo'));
            blasterEntity.audio = audio;
            audio.setVolume(GameConfig.AUDIO.VOLUME_BLASTER - 1);
            renderComponent.add(audio);

            // 创建触发器
            this.createTrigger(blasterEntity,GameConfig.BLASTER.RADIUS);
        }
        // 普通枪
        for(let spawningPoint of this.shotgunSpawningPoints){
            const shotgunEntity = new WeaponItemExtendBaseGameEntity(WEAPON_TYPES_SHOTGUN,GameConfig.SHOTGUN.RESPAWN_TIME,GameConfig.SHOTGUN.AMMO);
            shotgunEntity.position.copy(spawningPoint);

            const renderComponent = assetManager.modelMaps.get('shotgun_low').clone();
            renderComponent.position.copy(shotgunEntity.position);
            shotgunEntity.setRenderComponent(renderComponent,world.sync.bind(world));

            this.shotguns.push(shotgunEntity);
            world.add(shotgunEntity);

            // 获取武器放置的区域
            shotgunEntity.currentRegion = world.navMesh.getRegionForPoint(shotgunEntity.position,1.);

            // audio
            const audio = assetManager.cloneAudio(assetManager.audioMaps.get('ammo'));
            shotgunEntity.audio = audio;
            audio.setVolume(GameConfig.AUDIO.VOLUME_GUN - 0.5);
            renderComponent.add(audio);

            // trigger 添加触发器
            this.createTrigger(shotgunEntity,GameConfig.SHOTGUN.RADIUS);
        }
        //console.log(assetManager,World._getInstance())
        for(let spawningPoint of this.assaultRilflesSpawningPoints){
            // 创建枪的实体
            const assaultRilfleEntity = new WeaponItemExtendBaseGameEntity(WEAPON_TYPES_ASSAULT_RIFLE,GameConfig.ASSAULT_RIFLE.RESPAWN_TIME);
            assaultRilfleEntity.position.copy(spawningPoint);

            // 获取3D模型
            const renderComponent = assetManager.modelMaps.get('assaultRifle_low').clone();
            renderComponent.position.copy(assaultRilfleEntity.position);
            assaultRilfleEntity.setRenderComponent(renderComponent,world.sync.bind(world));

            this.assaultRilfles.push(assaultRilfleEntity);
            this.world.add(assaultRilfleEntity);

            // 添加武器属于那一块区域
            assaultRilfleEntity.currentRegion = world.navMesh.getRegionForPoint(assaultRilfleEntity.position,1.);

            // audio
            const audio = assetManager.cloneAudio(assetManager.audioMaps.get('ammo'));
            audio.setVolume(GameConfig.AUDIO.VOLUME_RIFLE_SHOT - 0.5);
            assaultRilfleEntity.audio = audio;
            renderComponent.add(audio);

            this.createTrigger(assaultRilfleEntity,GameConfig.ASSAULT_RIFLE.RADIUS);
        }
        return this;
    }

    /**
     * 为实体对象创建对应的触发器
     * @param {*} item 
     * @param {*} radius 
     */
    createTrigger(entity,radius){
        const sphericalTriggerRegion = new YUKA.SphericalTriggerRegion(radius); // 创建球体触发区域
        // 把区域添加触发器中
        const trigger = new BaseTriggerExtendTrigger(sphericalTriggerRegion,entity);
        entity.add(trigger); // trigger 也是 GameEntity 类型

        this.itemTriggerMap.set(entity,trigger);

        // 调试
        if(this.world.debug){
            const triggerHelper = SceneUtils.createTriggerHelper(trigger);
            trigger.setRenderComponent(triggerHelper,this.world.sync.bind(this.world));

            // 控制是否显示
            this.world.helpers.itemHelpers.push(triggerHelper);
            this.world.scene.add(triggerHelper);
        }

        return this;
    }

    update(delta){
        this.updateItemList(this.healthPacks,delta);
        this.updateItemList(this.blasters,delta);
        this.updateItemList(this.shotguns,delta);
        this.updateItemList(this.assaultRilfles,delta);
        return this;
    }

    updateItemList(itemsList,delta){
        for(let i =0; i < itemsList.length;i++){
            const item = itemsList[i];
            item.currentTime += delta;
            if(item.currentTime >= item.nextSpawnTime){
                this._respawnItem(item);
            }
        }
        return this;
    }

    _respawnItem(item){
        const trigger = this.itemTriggerMap.get(item);
        trigger.active = true;
        item.finishRespawn();
        return this;
    }
    /**
     * Returns an array with items of the given type.
     * @param {*} type 
     */
    getItemList(type){
        let itemList = null;
        switch(type){
            case HEALTH_PACK:
                itemList = this.healthPacks;
                break;
            case WEAPON_TYPES_BLASTER:
                itemList = this.blasters;
                break;
            case WEAPON_TYPES_SHOTGUN:
                itemList = this.shotguns;
                break;
            case WEAPON_TYPES_ASSAULT_RIFLE:
                itemList = this.assaultRilfles;
                break;
            default:
                console.error('SpawningManager:无效的类型->',type);
                break;
        }
        return itemList;
    }

}