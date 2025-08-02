import * as YUKA from 'yuka';
import { showToast ,closeToast} from 'vant';
import * as THREE from 'three';



export default class TargetGameEntity extends YUKA.GameEntity{
    constructor(geometry){
        super();

        this.endTime = Infinity;
        this.currentTime = 0;
        this.duration = 1;// 1 second
        this.geometry = geometry;
        const rotation = new YUKA.Quaternion();
        rotation.fromEuler(Math.PI * -0.5 , 0,0); // Yaw-Pitch-Roll 顺序：X-Y-Z
        this.rotation.copy(rotation);
        this.scale = new YUKA.Vector3(0.5,0.5,0.5);
    }

    update(delta){
        this.currentTime += delta;
        if(this.currentTime >= this.endTime){
            closeToast();
            this.endTime = Infinity;
        }
        return this;
    }
    /**
     * 如果要计算打中几环，需要把几何体的几何中心放置在靶心处----切记
     * @param {*} telegram 
     * @returns 
     */
    handleMessage(telegram){
        //console.log('子弹击中靶子之后，发来的消息',telegram);
        const intersectionPoint = new THREE.Vector3().copy(telegram.data.intersectionPoint);
        let originToBulletHoleDistance = Math.sqrt(Math.pow(intersectionPoint.x,2) + Math.pow(intersectionPoint.y,2));// 这种方式计算
        //new YUKA.Vector3(0,0,0).distanceTo(telegram.data.intersectionPoint);
        // 求receiver 的世界矩阵的逆矩阵
        const matrixArray = []
        telegram.receiver._worldMatrix.toArray(matrixArray);
        // 创建three.js 的矩阵
        const worldMatrix = new THREE.Matrix4().fromArray(matrixArray);
        //const localUp = new THREE.Vector3(0, 1, 0);
        //const worldUp = localUp.clone().applyMatrix4(worldMatrix);
        //console.log('靶子本地 Y 轴在世界坐标中的方向:', worldUp.normalize());

        // 计算得到逆矩阵
        const worldMatrixInverse = new THREE.Matrix4().copy(worldMatrix).invert();
        // 得到本地坐标
        const localIntersectionPoint = intersectionPoint.clone().applyMatrix4(worldMatrixInverse);
        originToBulletHoleDistance = Math.sqrt(localIntersectionPoint.x * localIntersectionPoint.x + localIntersectionPoint.z * localIntersectionPoint.z);
        //console.log(originToBulletHoleDistance,localIntersectionPoint);
        const score = Math.abs(Math.floor(originToBulletHoleDistance / 0.24) - 8);
        this.endTime = this.currentTime + this.duration;
        showToast({message:'Hit: '+score,position: 'top'});
        return true;
    }
}