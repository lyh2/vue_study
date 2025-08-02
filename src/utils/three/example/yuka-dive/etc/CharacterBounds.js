import * as YUKA from 'yuka';
import * as THREE from 'three';
import World from '../core/World';
import SceneUtils from './SceneUtils';

/**
 * Class for representing the bounds of an enemy. Its primary purpose is to avoid
* expensive operations on the actual geometry of an enemy. Hence, intersection test
* are perfomed with a simple hierarchy of AABBs.
*代表敌人边界的类。其主要(purpose:目的)是避免
*对敌人的实际几何形状进行昂贵的操作。因此，交叉口测试
*使用AABB的简单层次结构来执行
 */


const rayMeshSpace = new YUKA.Ray();

export default class CharacterBounds {
    /**
     * 
     * @param {EnemyVehicle} owner - 属于哪个对象 
     */
    constructor(owner){
        this.owner = owner; // EnemyVehicle 对象

        this._outerHitboxDefinition = new YUKA.AABB();// 预定义外AABB盒子
        // 预定义一个(1,1.8,1) 的AABB，需要把预定的_outerHitboxDefinition 变换到当前对象的参考系下
        this._outerHitboxDefinition.set(new YUKA.Vector3(-0.5,0,-0.5),new YUKA.Vector3(0.5,1.8,0.5));
        this._outerHitbox = new YUKA.AABB(); // 接收 _outerHitboxDefinition 经过变换之后的值，代表人体整体的AABB包围盒子
        
        this._innerHitBones =[];// 存储身体各个部分的AABB 包围盒子

        this._cache =new Map(); // 缓存Mesh每个部分(头，躯干，手，脚)的逆矩阵信息
    }
    /**
     * Inits the bounding volumes of this instance.
     */
    init(){
        
        const owner = this.owner;
        // 获得3DMesh 对象
        const renderComponent = owner._renderComponent;// 获得THREE.js 对象
        const hitboxes = this._innerHitBones; // 数组
        /**
         * 检查对象的 .matrixWorldNeedsUpdate 属性是否为 true；
            或者你传入了 force = true；
            然后根据当前对象的 .matrix 和父对象的 .matrixWorld 计算出新的 .matrixWorld；
            递归更新所有子对象的 .matrixWorld。
         */
        renderComponent.updateMatrixWorld(true);// 如果你只是改变了 position/rotation/scale，
        // Three.js 会在渲染时自动更新；但如果你提前需要使用精确的 .matrixWorld 计算结果，
        // 你就需要调用 updateMatrixWorld(true)
        
        // 头部 =(0.2,0.2,0.2) 
        const headBone = renderComponent.getObjectByName('Armature_mixamorigHead');
        const head = new YUKA.AABB(new YUKA.Vector3(-0.1,1.6,-0.1),new YUKA.Vector3(0.1,1.8,0.1));
        //---------------------------------------------------------------------------------------
        // 注意下面这行代码，此时的matrixWorld 表示TPose或者是初始状态下，模型经过世界变换之后的矩阵，任然是静态的，
        // 还未执行任何动画时，经过世界矩阵的变换，所形成的世界矩阵，(如：添加到场景去）
        let bindMatrix = new THREE.Matrix4().copy(headBone.matrixWorld);// 初始化绑定姿态下的世界变换
        //--------------------------------------------------------------------------------------
        let bindMatrixInverse = new THREE.Matrix4().invert(bindMatrix); // 逆矩阵,此时代表回到头部局部坐标系下
        hitboxes.push({name:'head',aabb:head,mesh:headBone,bindMatrix:bindMatrix,bindMatrixInverse:bindMatrixInverse});

        // torso 躯干 =(0.4,0.6,0.4)
        const spineBone = renderComponent.getObjectByName('Armature_mixamorigSpine1');
        const spine = new YUKA.AABB(new YUKA.Vector3(-0.2,1,-0.2),new YUKA.Vector3(0.2,1.6,0.2));
        bindMatrix = new THREE.Matrix4().copy(spineBone.matrixWorld);
        bindMatrixInverse = new THREE.Matrix4().invert(bindMatrix);
        hitboxes.push({name:'spine',aabb:spine,mesh:spineBone,bindMatrix:bindMatrix,bindMatrixInverse:bindMatrixInverse});

        // arms
        const rightArmBone = renderComponent.getObjectByName('Armature_mixamorigRightArm');// 得到右手模型对象
        const rightArmAABB = new YUKA.AABB(new YUKA.Vector3(-0.4,1.42,-0.15),new YUKA.Vector3(-0.2,1.58,0.1));
        bindMatrix = new THREE.Matrix4().copy(rightArmBone.matrixWorld);
        bindMatrixInverse = new THREE.Matrix4().invert(bindMatrix);
        hitboxes.push({name:'rightArm',aabb:rightArmAABB,mesh:rightArmBone,bindMatrix:bindMatrix,bindMatrixInverse:bindMatrixInverse});
        // 右前臂
        const rightForeArmBone = renderComponent.getObjectByName('Armature_mixamorigRightForeArm');
        const rightForeArmAABB = new YUKA.AABB(new YUKA.Vector3(-0.8,1.42,-0.15),new YUKA.Vector3(-0.4,1.55,0.05));
        bindMatrix = new THREE.Matrix4().copy(rightForeArmBone.matrixWorld);
        bindMatrixInverse = new THREE.Matrix4().invert(bindMatrix);
        hitboxes.push({name:'rightForeArm',aabb:rightForeArmAABB,mesh:rightForeArmBone,bindMatrix,bindMatrixInverse});

        // 左臂
        const leftArmBone = renderComponent.getObjectByName('Armature_mixamorigLeftArm');
        const leftArmBoneAABB = new YUKA.AABB(new YUKA.Vector3(0.2,1.42,-0.15),new YUKA.Vector3(0.4,1.58,0.1));
        bindMatrix = new THREE.Matrix4().copy(leftArmBone.matrixWorld);
        bindMatrixInverse = new THREE.Matrix4().invert(bindMatrix);
        hitboxes.push({name:'leftArm',aabb:leftArmBoneAABB,mesh:leftArmBone,bindMatrix,bindMatrixInverse});

        const leftForeArmBone = renderComponent.getObjectByName('Armature_mixamorigLeftForeArm');
        const leftForeArmBoneAABB = new YUKA.AABB(new YUKA.Vector3(0.4,1.42,-0.15),new YUKA.Vector3(0.8,1.55,0.05));
        bindMatrix = new THREE.Matrix4().copy(leftForeArmBone.matrixWorld);
        bindMatrixInverse = new THREE.Matrix4().invert(bindMatrix);
        hitboxes.push({name:'leftForeArm',aabb:leftForeArmBoneAABB,mesh:leftForeArmBone,bindMatrix,bindMatrixInverse});

        // legs 腿

		const rightUpLegBone = renderComponent.getObjectByName( 'Armature_mixamorigRightUpLeg' );
		const rightUpLeg = new YUKA.AABB( new  YUKA.Vector3( - 0.2, 0.6, - 0.15 ),  new YUKA.Vector3( 0, 1, 0.15 ) );
		bindMatrix = new THREE.Matrix4().copy( rightUpLegBone.matrixWorld );
		bindMatrixInverse = new THREE.Matrix4().invert( bindMatrix );
		hitboxes.push( { name:'rightUpLeg',aabb: rightUpLeg, mesh: rightUpLegBone, bindMatrix: bindMatrix, bindMatrixInverse: bindMatrixInverse } );

		const rightLegBone = renderComponent.getObjectByName( 'Armature_mixamorigRightLeg' );
		const rightLeg = new  YUKA.AABB( new  YUKA.Vector3( - 0.2, 0, - 0.15 ), new  YUKA.Vector3( 0, 0.6, 0.15 ) );
		bindMatrix = new THREE.Matrix4().copy( rightLegBone.matrixWorld );
		bindMatrixInverse = new THREE.Matrix4().invert( bindMatrix );
		hitboxes.push( { name:'rightLeg',aabb: rightLeg, mesh: rightLegBone, bindMatrix: bindMatrix, bindMatrixInverse: bindMatrixInverse } );

		const leftUpLegBone = renderComponent.getObjectByName( 'Armature_mixamorigLeftUpLeg' );
		const leftUpLeg = new  YUKA.AABB( new YUKA.Vector3( 0, 0.6, - 0.15 ), new  YUKA.Vector3( 0.2, 1, 0.15 ) );
		bindMatrix = new THREE.Matrix4().copy( leftUpLegBone.matrixWorld );
		bindMatrixInverse = new THREE.Matrix4().invert( bindMatrix );
		hitboxes.push( { name:'leftUpLeg',aabb: leftUpLeg, mesh: leftUpLegBone, bindMatrix: bindMatrix, bindMatrixInverse: bindMatrixInverse } );

		const leftLegBone = renderComponent.getObjectByName( 'Armature_mixamorigLeftLeg' );
		const leftLeg = new  YUKA.AABB( new  YUKA.Vector3( 0, 0, - 0.15 ), new YUKA. Vector3( 0.2, 0.6, 0.15 ) );
		bindMatrix = new THREE.Matrix4().copy( leftLegBone.matrixWorld );
		bindMatrixInverse = new THREE.Matrix4().invert( bindMatrix );
		hitboxes.push( { name:'leftLeg',aabb: leftLeg, mesh: leftLegBone, bindMatrix: bindMatrix, bindMatrixInverse: bindMatrixInverse } );

        // 开启调试，绘制AABB 盒子
        if(World._getInstance().debug){
            for(let i =0; i < hitboxes.length;i++){
                const hitbox = hitboxes[i];
                const hitboxHelper = SceneUtils.createHitboxHelper(hitbox.aabb);
                renderComponent.add(hitboxHelper);
                hitboxHelper.name = hitbox.name;
            }
        }
        return this;
    }
    /**
     * Updates the outer bounding volume of this instance. Deeper bounding volumes
	 * are only update if necessary.
     * @returns this
     */
    update(){
        // 将外层AABB 转到 enemy 的世界坐标系
        this._outerHitbox.copy(this._outerHitboxDefinition).applyMatrix4(this.owner.worldMatrix);
        return this;
    }

    /**
     * Computes the center point of this instance and stores it into the given vector.
     * @param {*} center - 获取包围盒的中心点
     * @returns 
     */
    getCenter(center){
        return this._outerHitbox.getCenter(center);
    }
    /**
     *      射线 world 空间
                    ↓
                    ↓            [apply inverse mesh matrix]
                    ↓
                mesh 局部空间
                    ↓
                    ↓           [apply bindMatrix]
                    ↓
            T-Pose 空间（检测）
                    ↓
                    ↓            [apply bindMatrixInverse]
                    ↓
            mesh 空间
                    ↓
                    ↓            [apply matrixWorld]
                    ↓
            世界空间中的命中点
     * @param {*} ray 
     * @param {*} intersectionPoint 
     * @returns 
     */
    intersectRay(ray,intersectionPoint){
        // 首先检测外层AABB盒子
        if(ray.intersectAABB(this._outerHitbox,intersectionPoint)){
            // 检测内部AABB盒子
            const hitboxes = this._innerHitBones;// 是一个数组
            for(let i = 0; i < hitboxes.length;i++){
                const hitbox = hitboxes[i];
                const mesh = hitbox.mesh;  //
                // 得到模型当前变换的世界矩阵的逆矩阵
                const inverseMeshMatrixWorld = this._getInverseMeshMatrixWorld(mesh);
                // transform the ray from world space to local space of the Mesh 
                //---------------------------------------------------------------------------------------
                /**
                 * 把射线 ray 从 世界坐标系 → 转换到当前骨骼（Bone） 的局部坐标系下。
                ⚠️ 这个局部坐标系是当前 动画状态下的骨骼局部坐标系，不是 T-Pose！
                 */
                // 把射线从世界坐标系 转到 Mesh 本地坐标下 //此时的 bone.matrixWorld 表示骨骼当前姿态
                // （可能是动画后的姿态）的世界矩阵，
                // 就是经过动画发生改变之后，当前这一刻的世界矩阵
                rayMeshSpace.copy(ray).applyMatrix4(inverseMeshMatrixWorld);// 变换到mesh 坐标系下
                // transform the ray from local space of the bone to its bind space (T-Pose)
                /**----------------------------------------------------------------------------
                 * hitbox.boneMatrix 是在init() 中首先获取并保存下来的世界矩阵。此时的世界矩阵是没有经过任何动画
                 * 初始的或者说是T-Pose 状态下的世界矩阵，因为上面定义的aabb 就是在这种变换下定义的值，所以，要
                 * 保证参考系统一致才能正确的射线检测
                 */
                rayMeshSpace.applyMatrix4(hitbox.bindMatrix);// hitbox.bindMatrix  mesh t-pose的世界矩阵
                // 进行射线检测
                if(rayMeshSpace.intersectAABB(hitbox.aabb,intersectionPoint)){
                    //since the intersection point is in bind space, it's necessary to convert back to world space
                    // 从mesh 空间转回到世界坐标系
                    intersectionPoint.applyMatrix4(hitbox.bindMatrixInverse).applyMatrix4(mesh.matrixWorld);

                    return intersectionPoint;
                }

            }
        }
        return null;
    }
    /**
     * 得到Mesh 对象的世界矩阵的逆矩阵
     * @param {*} mesh 
     * @returns 
     */
    _getInverseMeshMatrixWorld(mesh){
        const world = this.owner.world;
        const tick = world.tick;// 这个值没帧都在++

        let entry = this._cache.get(mesh); // 未找到mesh 对象
        if(entry === undefined){
            entry = {tick:tick,inverseMeshMatrixWorld:new THREE.Matrix4().invert(mesh.matrixWorld)};
            this._cache.set(mesh,entry);
        }else{
            //console.log('tick:',entry.tick,tick)
            if(entry.tick < tick){
                // 需要更新
                entry.tick = tick;
                entry.inverseMeshMatrixWorld.invert(mesh.matrixWorld);
            }else{
                if(world.debug){
                    //console.log('逆矩阵在缓冲中,暂时不用更新');
                }
            }
        }
        return entry.inverseMeshMatrixWorld;
    }
}