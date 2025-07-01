import * as YUKA from 'yuka';
import World from './World';


// 射线检测交点
const intersectionPoint = new YUKA.Vector3();
const targetV3= new YUKA.Vector3();
const muzzlePosition = new YUKA.Vector3();// 开枪特效火焰的位置
const scatter = new YUKA.Vector3();


const _STATUS_ = Object.freeze({
    READY:'ready',
    SHOT:'shot',
    RELOAD:'reload',
    EMPTY:'empty'
});
// 创建武器对象
export default class WeaponGameEntity extends YUKA.GameEntity{
    constructor(owner = null/*武器属于谁:Player*/){
        super();

        this.owner = owner;
        this.status = _STATUS_.READY;// 初始状态

        this.currentRemainingBulletNum = 12;// 当前弹夹剩余的子弹数
        this.preCartridgeClipBulletNum = 12;// 预定每个弹夹可容纳的子弹个数
        this.bulletTotal= 48;// 每个用户子弹总数，可以根据用户消灭的敌人数量获取子弹

        // 定义时间
        this.shotTime = 1;// 开枪时间1s
        this.shotReloadTime = 0.5;// 开枪准备时间
        this.reloadTime = 1.5;// 换弹夹时间
        this.muzzleFireTime = 0.1;// 火焰时间
        this.scatterFactor = 0.03;// 分散因子

        this.currentTime = 0;
        this.endTimeShot = Infinity;
        this.endTimeShotReload = Infinity;
        this.endTimeReload = Infinity;
        this.endTimeMuzzleFire = Infinity;

        this.muzzleSprite = World.getInstance().assetManager.modelMaps.get('muzzle');// 开枪特效一个THREE.Sprite 对象
       
        this.updateUI();
    }
    
    update(delta){
        this.currentTime += delta;
        // 开枪准备
        if(this.currentTime >= this.endTimeShotReload){
            // 子弹装填
            const audio = World.getInstance().assetManager.audioMaps.get('shotReload');
            if(audio.isPlaying === true) audio.stop();
            audio.play();
            this.endTimeShotReload = Infinity;
        }
        // 换弹夹
        if(this.currentTime >= this.endTimeReload){
            // 换弹夹,计算还需可追加的子弹个数
            const needToReloadBulletNumbers = this.preCartridgeClipBulletNum - this.currentRemainingBulletNum;
            if(this.bulletTotal >= needToReloadBulletNumbers){
                this.currentRemainingBulletNum = this.preCartridgeClipBulletNum;
                this.bulletTotal -= needToReloadBulletNumbers;
            }else{
                // 剩余的总子弹数小于 要加载的子弹数，则把所有剩余的子弹全部加入到弹夹中
                this.currentRemainingBulletNum += this.bulletTotal;
                this.bulletTotal = 0;
            }
            this.status = _STATUS_.READY;
            // 更新界面
            this.updateUI();
            this.endTimeReload = Infinity;
        }
        // check muzzle 火焰光效
        if(this.currentTime >= this.endTimeMuzzleFire){
            this.muzzleSprite.visible = false;
            this.endTimeMuzzleFire = Infinity;
        }
        // 开枪时间
        if(this.currentTime >= this.endTimeShot){
            if(this.currentRemainingBulletNum === 0){
                // 已经没有子弹了
                this.status = _STATUS_.EMPTY;
            }else{
                this.status = _STATUS_.READY;
            }

            this.endTimeShot = Infinity;
        }

        return this;
    }
    // 枪 有两个方法：开枪和换弹夹
    shoot(){
        if(this.status === _STATUS_.READY){
            this.status = _STATUS_.SHOT;// 设置成开枪状态
            // 播放开枪音频
            const audio = World.getInstance().assetManager.audioMaps.get('shot');
            if(audio.isPlaying) audio.stop();
            audio.play();

            // 播放开枪动画
            const animation = World.getInstance().animationMaps.get('shot');
            animation.stop();
            animation.play();

            // 显示开枪火焰光效
            this.muzzleSprite.visible = true;
            this.muzzleSprite.material.rotation = Math.random() * Math.PI;// 改变材质的旋转
            this.endTimeMuzzleFire = this.currentTime + this.muzzleFireTime;

            const owner = this.owner;// 武器属于第一人称用户:Player
            const head = owner.head;// 人的头部，也就是用户的行为-实际就是3D空间中的相机perspectiveCamera
            const ray = new YUKA.Ray();// 射线

            // 首先从头部(就是相机perspectiveCamera)发射射线进行检测
            ray.origin.extractPositionFromMatrix(head.worldMatrix); // 获取用户的朝向数据，就是perspectiveCamera 的位置数据
            owner.getDirection(ray.direction);// 获取用户的朝向

            // determine closest intersection point with world object 世界对象的交点
            const result = World.getInstance().intersectRay(ray,intersectionPoint);// 判断当前射线与障碍物之间是否存在交点
        	// now calculate the distance to the closest intersection point. if no point was found,
			// choose a point on the ray far away from the origin
            const distance = (result == null) ? 1000 : ray.origin.distanceTo(intersectionPoint);// 设置一个距离值
			// now let's change the origin to the weapon's position. 现在修改射线的原点到武器上
            targetV3.copy(ray.origin).add(ray.direction.multiplyScalar(distance));// 拷贝了一个指定长度与射线起点、方向完全一致的线段
            // 
            muzzlePosition.set(0.15,0.1,-0.45).applyMatrix4(this.worldMatrix);// 需要把muzzlePosition 的值转换到武器的坐标系统中

            ray.origin.copy(muzzlePosition);// 修改射线的起点到枪开枪特效的位置
            ray.direction.subVectors(targetV3,ray.origin).normalize();// 上面计算得到的(targetV3值 - 到新起点).normalize() 归一化

            // 创建6个子弹，进行散开，类似喷子枪的效果
            for(let i =0; i < 6; i ++){
                const tempRay = ray.clone();// 拷贝射线

                scatter.x = (1- Math.random() * 2) * this.scatterFactor;// (-1,1) * this.scatterFactor
                scatter.y = (1- Math.random() * 2) * this.scatterFactor;
                scatter.z = (1 - Math.random() * 2) * this.scatterFactor;

                tempRay.direction.add(scatter).normalize();// 给射线方向加上分散值，使得6条射线分开，而不是在一条直线上
                World.getInstance().addBullet(owner,tempRay);// 在指定射线方向上，发射子弹
            }
            -- this.currentRemainingBulletNum;// 开枪之后子弹数减 1
            this.endTimeShotReload = this.currentTime + this.shotReloadTime;// 下一次开枪的准备时间
            this.endTimeShot = this.currentTime + this.shotTime; // 开枪结束的时间

            this.updateUI();// 更新界面的数据
        }else if(this.status === _STATUS_.EMPTY){
            // 为空的状态
            const audio = World.getInstance().assetManager.audioMaps.get('empty');
            if(audio.isPlaying) audio.stop();
            audio.play();
        }
        return this;
    }
    // 换弹夹方法
    reload(){
        // 在准备中，或者为空的状态下，且还有剩余的子弹，才能进行换单
        if((this.status === _STATUS_.READY || this.status === _STATUS_.EMPTY) && this.bulletTotal > 0){
            this.status = _STATUS_.RELOAD;

            // 播放换弹夹的音频
            const audio = World.getInstance().assetManager.audioMaps.get('reload');
            if(audio.isPlaying) audio.stop();
            audio.play();

            // 执行换弹夹的动画
            const animation = World.getInstance().animationMaps.get('reload');
            animation.stop();
            animation.play();

            // 记录完成换弹夹的时间
            this.endTimeReload = this.currentTime + this.reloadTime;
        }
        return this;
    }

    updateUI(){
        World.getInstance().options.roundsLeft.value = this.currentRemainingBulletNum;
        World.getInstance().options.ammo.value = this.bulletTotal;
    }
}