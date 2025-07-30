import * as THREE from 'three';

/**
 * three.js 中创建的可视化方法
 */
export default class SceneUtils{

    /**
     * 自己实现的复制THREE.SkinnedMesh 对象的方法
     * @param {THREE.SkinnedMesh} source - 要复制的skinned mesh 对象
     * ### 方法核心目标
        解决Three.js中`SkinnedMesh.clone()`方法的局限性：
        1. 标准`clone()`方法无法正确复制骨骼层级关系
        2. 蒙皮权重数据无法直接迁移
        3. 骨骼绑定矩阵需要重新计算

     */
    static cloneWithSkinning(source){
        const cloneLookup = new Map();// 
        const clone = source.clone(); // 克隆一份SkinnedMesh 对象
        /**
         * - __`cloneLookup`映射表__：存储原始场景节点到克隆节点的对应关系
            - __递归遍历函数`traverseFn`__：深度优先遍历整个场景图，确保所有节点都被映射
         */
        traverseFn(source,clone,(sourceNode,clonedNode)=>{
            cloneLookup.set(sourceNode,clonedNode);
        });
        /** 骨骼系统重建 核心
         * 
         */
        source.traverse(sourceMesh=>{
            if(!sourceMesh.isSkinnedMesh) return;
            // 得到原始对象中的骨骼数据
            const sourceBones = sourceMesh.skeleton.bones;// 但`bones`数组仍指向原始骨骼对象

            const clonedMesh = cloneLookup.get(sourceMesh);
            // 1、骨架克隆
            clonedMesh.skeleton = sourceMesh.skeleton.clone();// 复制骨架
            // 2、骨骼映射替换，循环原始的骨骼数组
            clonedMesh.skeleton.bones = sourceBones.map(sourceBone=>{
                if(! cloneLookup.has(sourceBone)){
					throw new Error( 'SceneUtils: Required bones are not descendants of the given object.' );
                }
                return cloneLookup.get(sourceBone);
            });
            // 3、重新绑定
            clonedMesh.bind(clonedMesh.skeleton,sourceMesh.bindMatrix);
        });
        return clone;
    }

    /**
     * 可视化绘制AABB 包围盒
     * @param {*} hitbox 
     */
    static createHitboxHelper(hitbox){

		let indices = [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ];// 24
		let positions = [ 
                1, 1, 1, // 右前 +X+Y+Z
                - 1, 1, 1, // 左前 -X+Y+Z
                - 1, - 1, 1, // 左前下 -X-Y+Z
                1, - 1, 1, // 右前下 +X-Y+Z
                1, 1, - 1, // 右后上 +X+Y-Z
                - 1, 1, - 1, // 左后上 -X+Y-Z
                - 1, - 1, - 1, // 左后下 -X-Y-Z
                1, - 1, - 1 // 右后下 +X-Y-Z
            ];
        let geometry = new THREE.BufferGeometry();
        geometry.setIndex(indices);
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        const lines = new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x3333CC}));
        lines.matrixAutoUpdate = false;

        hitbox.getCenter(lines.position);// 计算aabb盒子的中心点，并赋值给lines.position
        hitbox.getSize(lines.scale);// 得到AABB盒子的width,height,depth 值
        lines.scale.multiplyScalar(0.5);// 在缩小一半
        lines.updateMatrix();
        lines.name = 'hitboxLines';
        return lines;
    }
    /**
     * 绘制产生敌人的点位，进行可视化显示
     * @param {*} spawnPoints 
     */
    static createSpawnPointHelper(spawnPoints=[]){
        const group = new THREE.Group();
        group.name = 'spawns';
        group.visible = false;

        group.matrixAutoUpdate = false;

        const nodeColor = 0xCC33FF;
        const nodeMaterial = new THREE.MeshBasicMaterial({color:nodeColor});
        const nodeGeometry  = new THREE.CylinderGeometry(0.2,0.2,0.5);
        nodeGeometry.translate(0,0.25,0);

        for(let i = 0; i < spawnPoints.length;i ++){
            const nodeMesh = new THREE.Mesh(nodeGeometry,nodeMaterial);
            nodeMesh.position.copy(spawnPoints[i].position);

            nodeMesh.matrixAutoUpdate = false;
            nodeMesh.updateMatrix();

            group.add(nodeMesh);
        }

        return group;
    }

    /**
     * 用来可视化显示出发去的位置及范围,这里只创建球体触发器
     * @param {*} trigger 也是 YUKA.GameEntity 类型
     */
    static createTriggerHelper(trigger){
        const triggerGeometry = new THREE.SphereGeometry(trigger.region.radius,16,16);
        const triggerMaterial = new THREE.MeshBasicMaterial({color:0x6083c2,wireframe:true,side:THREE.DoubleSide});
        const triggerMesh = new THREE.Mesh(triggerGeometry,triggerMaterial);

        triggerMesh.matrixAutoUpdate = false;
        triggerMesh.visible = false;
        return triggerMesh;
    }

    /**
     * 创建一个label 可视化显示Enemy的uuid
     * @param {String} uuid 
     */
    static createUUIDLabel(uuid){
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 64; // 512 / 64 = 8 倍

        context.fillStyle = '#eec080';
        context.fillRect(0,0,canvas.width,canvas.height);

        context.fillStyle = '#ff0000';
        context.font = '32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(uuid,canvas.width /2,canvas.height / 2);
      
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = 16; // 提高抗锯齿效果
        texture.generateMipmaps = false; // 禁用 mipmaps，防止远处模糊
        texture.needsUpdate = true;

        const material = new THREE.SpriteMaterial({map:texture});
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(4,0.5,1);
        return sprite;
    }

    
}

/**
 * 递归调用
 * @param {*} a - 原始对象
 * @param {*} b - 克隆出来的对象
 * @param {*} callback 
 */
function traverseFn(a,b,callback){
    callback(a,b);// 设置map
    // 按照原始对象的层级关系把子对象赋值到新的对象中去
    for(let i = 0; i < a.children.length;i++){
        traverseFn(a.children[i],b.children[i],callback);
    }
}