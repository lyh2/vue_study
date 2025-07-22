import * as THREE from 'three';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min'; 

import GameConfig from './GameConfig';
import { cross, PI2 } from 'three/src/nodes/TSL';

const PI25 = Math.PI * 0.25;
const PI75 = Math.PI * 0.75;

/**
 * 开启enabled fps controls 控制时，表示进入第一人称游戏模式，则打开isFpsControls = true,界面则显示子弹，血量，击中敌人等数据
 */

export default class UIManager {
    constructor(world){
        this.world = world;

        this.currentTime = 0;

        this.hitIndicationTime = GameConfig.UI.CROSSHAIRS.HIT_TIME;
        this.endTimeHitIndication = Infinity;

        this.damageIndicationTime = GameConfig.UI.DAMAGE_INDICATOR.TIME;
        this.endTimeDamageIndicationFront = Infinity;
        this.endTimeDamageIndicationRight = Infinity;
        this.endTimeDamageIndicationLeft = Infinity;
        this.endTimeDamageIndicationBack = Infinity;

        this.messages = new Array();

        this.sprites ={
            crosshairs:null,// 枪瞄准点
            frontIndicator:null,
            rightIndicator:null,
            leftIndicator:null,
            backIndicator:null,
        };

        // 创建HUD Sprites 
        
        this.camera = new THREE.OrthographicCamera(- window.innerWidth / 2,window.innerWidth/2,window.innerHeight/2,-window.innerHeight/2,1,10);
        this.camera.position.z = 10;

        this.scene = new THREE.Scene();

        this.gui = null;
        this.guiParameter = {
            showRegions:false,// 显示区域
            showAxes:false,
            showPaths:false,// 显示路线
            showGraph:false,//
            showSpawnPoints:false,
            showUUIDHelpers:false,
            showSkeletons:false,
            showItemRadius:false,
            showWireframe:false,
            showSpatialIndex:false,
            enableFPSControls:()=>{
                this.world.fpsControls.connect();
            }
        }

    }
    /**
     * 初始化构造器
     */
    init(){
        // 创建第一人称需要的HUD sprites
        this._buildFPSInterface();
        const world = this.world;
        if(world.debug){
            const gui = new GUI({width:300});
            const params = this.guiParameter;

			const folderNavMesh = gui.addFolder( 'Navigation Mesh' );
			folderNavMesh.open();

			folderNavMesh.add( params, 'showRegions' ).name( 'show convex regions' ).onChange( ( value ) => {

				world.helpers.convexRegionHelper.visible = value;

			} );

			folderNavMesh.add( params, 'showSpatialIndex', 1, 30 ).name( 'show spatial index' ).onChange( ( value ) => {

				world.helpers.spatialIndexHelper.visible = value;

			} );

			folderNavMesh.add( params, 'showPaths', 1, 30 ).name( 'show navigation paths' ).onChange( ( value ) => {

				for ( const pathHelper of world.helpers.pathHelpers ) {

					pathHelper.visible = value;

				}

			} );

			folderNavMesh.add( params, 'showGraph' ).name( 'show graph' ).onChange( ( value ) => {

				world.helpers.graphHelper.visible = value;

			} );

			// world folder

			const folderWorld = gui.addFolder( 'World' );
			folderWorld.open();

			folderWorld.add( params, 'showAxes' ).name( 'show axes helper' ).onChange( ( value ) => {

				world.helpers.axesHelper.visible = value;

			} );

			folderWorld.add( params, 'showSpawnPoints' ).name( 'show spawn points' ).onChange( ( value ) => {

				world.helpers.spawnHelpers.visible = value;

			} );

			folderWorld.add( params, 'showItemRadius' ).name( 'show item radius' ).onChange( ( value ) => {

				for ( const itemHelper of world.helpers.itemHelpers ) {

					itemHelper.visible = value;

				}

			} );

			folderWorld.add( params, 'showWireframe' ).name( 'show wireframe' ).onChange( ( value ) => {

				const levelMesh = this.world.scene.getObjectByName( 'level' );
				levelMesh.material.wireframe = value;

			} );

			folderWorld.add( params, 'enableFPSControls' ).name( 'enable FPS controls' );

			// enemy folder

			const folderEnemy = gui.addFolder( 'Enemy' );
			folderEnemy.open();

			folderEnemy.add( params, 'showUUIDHelpers', 1, 30 ).name( 'show UUID helpers' ).onChange( ( value ) => {

				for ( const uuidHelper of world.helpers.uuidHelpers ) {

					uuidHelper.visible = value;

				}

			} );

			folderEnemy.add( params, 'showSkeletons', 1, 30 ).name( 'show skeletons' ).onChange( ( value ) => {

				for ( const skeletonHelper of world.helpers.skeletonHelpers ) {

					skeletonHelper.visible = value;

				}

			} );

			gui.open();

			this.gui = gui;

        }
        return this;
    }

    /**
     * 更新
     * @param {*} delta 
     */
    update(delta){
        this.currentTime += delta;
        if(this.currentTime >= this.endTimeHitIndication){
            this._hideHitIndication();
        }

        // damage :损害 指示标
        if(this.currentTime >= this.endTimeDamageIndicationFront){
            this.sprites.frontIndicator.visible = false;
        }

        if(this.currentTime >= this.endTimeDamageIndicationRight){
            this.sprites.rightIndicator.visible = false;
        }

        if(this.currentTime >= this.endTimeDamageIndicationLeft){
            this.sprites.leftIndicator.visible = false;
        }

        if(this.currentTime >= this.endTimeDamageIndicationBack){
            this.sprites.backIndicator.visible = false;
        }

        // 更新消息
        this._updateMessageList();
        // 显示血条
        this.world.options.hudHealth.value = this.world.player.health;
        this._render();
        return this;
    }

    _render(){
        this.world.renderer.clearDepth();
        this.world.renderer.render(this.scene,this.camera);
        return this;
    }

    /**
     * 更新消息列表
     */
    _updateMessageList(){
        const messages = this.messages;
        for(let i = messages.length - 1;i >= 0; i --){
            const msg = messages[i];
            if(this.currentTime >= msg.endTime){
                messages.splice(i,1);
            }
        }

        // 更新数据到界面
        this.world.options.messages.value = messages;

        return this;
    }
    /**
     * 修改射击的十字准心精灵的颜色为白色
     */
    _hideHitIndication(){
        this.sprites.crosshairs.material.color.set(0xffffff);
        this.endTimeHitIndication = Infinity;
        return this;
    }
    /**
    * Changes the style of the crosshairs in order to show a
	* sucessfull hit.
     */
    showHitIndication(){
        this.sprites.crosshairs.material.color.set(0xff0000);
        this.endTimeHitIndication = this.currentTime + this.hitIndicationTime;
        return this;
    }
    /**
     * 
     */
    _buildFPSInterface(){
        // 创建十字瞄准镜 crosshairs
        const crosshairsTexture = this.world.assetManager.textureMaps.get('crosshairs');
        const crosshairsMaterial = new THREE.SpriteMaterial({
            map:crosshairsTexture,
            opacity:GameConfig.UI.CROSSHAIRS.OPACITY,
        });
        const crosshairs =new THREE.Sprite(crosshairsMaterial);
        crosshairs.matrixAutoUpdate = false;
        crosshairs.visible = false;
        crosshairs.position.set(0,0,1);
        crosshairs.scale.set(GameConfig.UI.CROSSHAIRS.SCALE,GameConfig.UI.CROSSHAIRS.SCALE,1);
        crosshairs.updateMatrix();
        this.scene.add(crosshairs);
        crosshairs.name = 'crosshair';

        this.sprites.crosshairs = crosshairs;

        // 创建指示方向
        this.sprites.frontIndicator = this.__createHUDSprite('damageIndicatorFront');
        this.sprites.rightIndicator = this.__createHUDSprite('damageIndicatorRight');
        this.sprites.leftIndicator = this.__createHUDSprite('damageIndicatorLeft');
        this.sprites.backIndicator = this.__createHUDSprite('damageIndicatorBack');

        return this;
    }
    /**
     * 创建HUD Sprite
     * @param {*} textureName 
     */
    __createHUDSprite(textureName){
        const material = new THREE.SpriteMaterial({
            map:this.world.assetManager.textureMaps.get(textureName),
            opacity:GameConfig.UI.DAMAGE_INDICATOR.OPACITY
        });
        const indicator = new THREE.Sprite(material);
        indicator.matrixAutoUpdate  = false;
        indicator.visible = false;
        indicator.position.set(0,0,1);
        indicator.scale.set(GameConfig.UI.DAMAGE_INDICATOR.SCALE,GameConfig.UI.DAMAGE_INDICATOR.SCALE,1);
        indicator.updateMatrix();
        this.scene.add(indicator);
        return indicator;
    }
    /**
     * 
     * @param {*} win 开枪者，赢家
     * @param {*} loser 被击败的游戏实体，输家
     */
    addToMessage(winner,loser){
        this.messages.push({
            winner:winner.name,
            loser:loser.name,
            text:'kill',
            endTime:this.currentTime + GameConfig.UI.FRAGS.TIME
        });
        return this;
    }
    /**
     * 更新子弹数据
     */
    updateAmmoStatus(){
        this.world.options.currentBullet.value = this.world.player.weaponSystem.currentWeapon.currentAmmo;
        this.world.options.bulletTotal.value = this.world.player.weaponSystem.currentWeapon.maxAmmo;
        return this;
    }
    /**
     * 更新血条🩸
     */
    updateHealthStatus(){
        this.world.options.hudHealth.value = this.world.player.health;
        return this;
    }
    /**
     * 显示被攻击的方向
     * @param {*} angle 
     */
    showDamageIndication(angle){
        if(angle >= - PI25 && angle <= PI25){
            this.sprites.frontIndicator.visible = true;
        }else if(angle >= PI25 && angle <= PI75){
            this.sprites.rightIndicator.visible = true;
        }else if(angle >= - PI75 && angle <= - PI25){
            this.sprites.leftIndicator.visible = true;
        }else{
            this.sprites.backIndicator.visible = true;
        }
        this.endTimeDamageIndicationFront = this.currentTime + this.damageIndicationTime;
        return this;
    }
    showFPSInterface(){
        this.sprites.crosshairs.visible = true;

        this.updateAmmoStatus();
        this.updateHealthStatus();
        return this;
    }
    
    hideFPSInterface(){
        // 隐藏UI 界面上的子弹、血条等数据
        this.sprites.crosshairs.visible = false;
        this.sprites.frontIndicator.visible = false;
        this.sprites.leftIndicator.visible = false;
        this.sprites.rightIndicator.visible = false;
        this.sprites.backIndicator.visible = false;

        return this;
    }

    setSize(width,height){
        this.camera.left = - width / 2;
        this.camera.right = width / 2;
        this.camera.top = height /2;
        this.camera.bottom = -height / 2;

        this.camera.updateProjectionMatrix();

        return this;
    }


    openDebugUI(){
        this.gui.open();
        return this;
    }
    closeDebugUI(){
        this.gui.close();
        return this;
    }

}