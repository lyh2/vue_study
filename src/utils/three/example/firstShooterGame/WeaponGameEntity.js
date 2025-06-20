import * as YUKA from 'yuka';
import World from './World.js';

const intersectionPoint = new YUKA.Vector3();
const target = new YUKA.Vector3();

const STATUS = Object.freeze({
    READY:'ready',// 准备好下一个动作
    SHOOT:'shoot',//开枪
    RELOAD:'reload',//换弹夹
    EMPTY:'empty',//为空
});

/**
 * Weapon 武器
 */
export default class WeaponGameEntity extends YUKA.GameEntity{
    /**
     * 
     * @param {*} owner  传递进来的是this.player 
     */
    constructor(owner = null){
        super();

        this.owner = owner; // player

        this.status = STATUS.READY;

        this.roundsLeft = 12; // 当前子弹数量
        this.roundsPerClip = 12; // 每个弹夹可容纳的子弹的个数
        this.ammo = 48; // 用户子弹总数

        // times are in seconds 
        this.shootTime = 0.2; // 开枪的时间
        this.reloadTime = 1.5; // 换弹夹的时间
        this.muzzleFireTime = 0.1;// 枪口特效时间

        this.currentTime = 0;
        this.endTimeShoot = Infinity;
        this.endTimeReload = Infinity;
        this.endTimeMuzzleFire = Infinity;
        // 这是开枪时枪口的火焰效果，在shoot() 方法中设置visible，在update(delta)中根据火焰的生命周期事件判断是否继续显示还是被隐藏
        // 就是设置.visible = false
        this.muzzleSprite = World.getInstance().assetManager.modelMaps.get('muzzle');
        
        this.updateUI();
    }
    //Updates the internal state of this game entity. Normally called by EntityManager#update in each simulation step.
    update(delta){
        this.currentTime += delta;

        // check reload 判断当前时间是否超过对应操作的生命周期时间
        if(this.currentTime >= this.endTimeReload){
            // 预设计每个弹夹能够容纳的子弹个数=> roundsPerClip = 12
            const toReload = this.roundsPerClip - this.roundsLeft; // 表示还要插入的子弹个数
            if(this.ammo >= toReload){
                // 要插入的字单个数小于总数
                this.roundsLeft = this.roundsPerClip;
                this.ammo -= toReload;
            }else{
                // 只有几颗子弹可以被加载了
                this.roundsLeft += this.ammo;
                this.ammo = 0;
            }

            this.status = STATUS.READY;
            this.updateUI();
            this.endTimeReload = Infinity;
        }

        // check muzzle fire 开火之后隐藏开火特效
        if(this.currentTime >= this.endTimeMuzzleFire){
            this.muzzleSprite.visible = false;
            this.endTimeMuzzleFire = Infinity;
        }

        // check shoot
        if(this.currentTime >= this.endTimeShoot){
            if(this.roundsLeft === 0){
                // 没有子弹了，不能开枪了
                this.status = STATUS.EMPTY;
            }else{
                this.status = STATUS.READY;
            }

            this.endTimeShoot = Infinity;
        }

        return this;
    }
    // 换弹夹 只有在READY、EMPTY 并且还有剩余子弹的情况下才允许换弹夹
    // 在射击和换弹夹中，不能执行换弹夹操作
    reload(){
        if((this.status === STATUS.READY || this.status === STATUS.EMPTY) && this.ammo > 0){
            this.status = STATUS.RELOAD;

            // audio 执行换弹夹的声音
            const audio = World.getInstance().audioMaps.get('reload');
            if(audio.isPlaying === true) audio.stop();
            audio.play();

            // animation 播放换弹夹的动画
            const animation = World.getInstance().animationMaps.get('reload');
            animation.stop();
            animation.play();
            // 修改换弹夹结束的时间(换弹夹的生命周期)= 当前时间+预定设置换弹夹的时间
            this.endTimeReload = this.currentTime + this.reloadTime;
        }
        return this;
    }
    // 开枪
    shoot(){
        // 开枪只有在READY状态下可以执行
        if(this.status === STATUS.READY){
            this.status = STATUS.SHOOT; // 设置状态为开枪状态
            // audio 开枪的音频
            const audio = World.getInstance().audioMaps.get('shoot');
            if(audio.isPlaying === true) audio.stop();
            audio.play();
            //console.log(World.getInstance())
            // animation 开枪的动画
            const animation = World.getInstance().animationMaps.get('shoot');
            animation.stop();
            animation.play();
            // muzzle fire 枪口火焰🔥的效果
            this.muzzleSprite.visible = true;
            this.muzzleSprite.material.rotation = Math.random() * Math.PI;
            this.endTimeMuzzleFire = this.currentTime + this.muzzleFireTime;
            // create bullet 
            const owner = this.owner; // 代表是 playerMovingEntity
            const head = owner.head; // 绑定的是相机，就是人的眼睛
            ////////////////////////////////////////////////////////////////////////////////
            const ray =new YUKA.Ray(); // 创建射线
			// first calculate a ray that represents the actual look direction from the head position
            // Extracts the position portion of the given 4x4 matrix and stores it in this 3D vector. 从给定的矩阵中提取位置数据
            ray.origin.extractPositionFromMatrix(head.worldMatrix); // 设置射线的起点,从相机节点处获取
            owner.getDirection(ray.direction); // 获取模拟人的方向
            //////////////////////////////////////////////////////////////////////////////////
            const result = World.getInstance().intersectRay(ray,intersectionPoint);// 通过射线进行检测
            // 再加上，计算打中几环的数据-由靶子向枪发送消息
            // 计算距离，如果没有交点，就使用ray 很远的点
            const distance = (result === null) ? 1000 : ray.origin.distanceTo(intersectionPoint);
            // now let's change the origin to the weapon's position.////////////////////////////////////
            target.copy(ray.origin).add(ray.direction.multiplyScalar(distance));// 类似把射线绘制出来
            ray.origin.extractPositionFromMatrix(this.worldMatrix);// 修改射线起点为武器的位置
            ray.direction.subVectors(target,ray.origin).normalize();// 为什么要执行这三行代码，就是要使子弹从枪口射出，
            // 如果不改就会从head，代表从相机人眼那里射出，不符合实际的情况
            World.getInstance().addBullet(owner,ray);// 创建子弹，//////////////////////////////////////////////
            this.roundsLeft --; // 子弹数量减1
            this.endTimeShoot = this.currentTime + this.shootTime; // 修改开枪结束时间
            this.updateUI(); // 更新UI界面子弹数量
        }else if(this.status === STATUS.EMPTY){
            // 表示空弹夹的情况，播放开空腔的情况
            const audio = World.getInstance().audioMaps.get('empty');
            if(audio.isPlaying === true) audio.stop();
            audio.play();
        }
        return this;
    }
    /**
     * 更新界面上的数据
     */
    updateUI(){
        World.getInstance()._options.roundsLeft.value = this.roundsLeft;
        World.getInstance()._options.ammo.value = this.ammo;
    }
}

