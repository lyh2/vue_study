
const visibleRecords = new Array();
const invisibleRecords = new Array();

/**
 * 主要是实现对 MemoryRecord 的简单封装
 */
export default class TargetSystem{

    constructor(owner){
        this.owner = owner;// enemy

        this._currentRecord = null;// represents the memory record of the current target

    }

    update(){
        const records = this.owner.memoryRecords;

        // 重新设置
        this._currentRecord = null;

        visibleRecords.length = 0;
        invisibleRecords.length = 0;

        // 通过可见性字段进行排序
        for(let i =0; i < records.length;i++){
            const record = records[i];

            if(record.visible){
                visibleRecords.push(record);
            }else{
                invisibleRecords.push(record);
            }
        }

        if(visibleRecords.length > 0){
            // 寻找最近的一个
            let minDistance = Infinity;

            for(let i =0; i < visibleRecords.length;i++){
                const record = visibleRecords[i];
                const distance = this.owner.position.squaredDistanceTo(record.lastSensedPosition);
                if(distance < minDistance){
                    minDistance = distance;
                    this._currentRecord = record;
                }
            }
        }else if( invisibleRecords.length > 0){
            // 找到最近感知的一个对象
            let maxTimeLastSensed = - Infinity;
            for(let i = 0; i < invisibleRecords.length;i++){
                const record = invisibleRecords[i];
                if(record.timeLastSensed > maxTimeLastSensed){
                    maxTimeLastSensed = record.timeLastSensed;
                    this._currentRecord = record;
                }
            }
        }
        return this;
    }

    reset(){
        this._currentRecord = null;
        return this;
    }

    /**
     *  Checks if the target is shootable/visible or not
     */
    isTargetShootable(){
        return (this._currentRecord !== null) ? this._currentRecord.visible : false;
    }

    /**
     * Returns the last sensed position of the target, or null if there is no target.
     */
    getLastSensedPosition(){
        return (this._currentRecord !== null) ? this._currentRecord.lastSensedPosition : null;
    }

    /**
     * Returns the time when the target was last sensed or -1 if there is none.
     */
    getTimeLastSensed(){
        return (this._currentRecord !== null) ? this._currentRecord.timeLastSensed : -1;
    }

    /**
     * Returns the time when the target became visible or -1 if there is none.
     */
    getTimeBecameVisible(){
        return (this._currentRecord !== null) ? this._currentRecord.timeBecameVisible : -1;
    }

    getTarget(){
        return (this._currentRecord !== null) ? this._currentRecord.entity : null;
    }

    /**
     * Returns true if the enemy has an active target.
     */
    hasTarget(){
        return this._currentRecord !== null;
    }
} 