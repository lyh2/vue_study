import * as THREE from 'three';
import * as CANNON from "cannon-es";
import * as _ from "lodash";
import { SimulationFrame } from '../physics/spring_simulation/SimulationFrame';
import { Side } from '../enums/Side';
import {Space} from "../enums/Space";
import { PID2, TWO_PI } from '../constant/constant';

export function applyVectorMatrixXZ(a,b){
    return new THREE.Vector3((a.x * b.z + a.z * b.x),b.y,(a.z*b.z + -a.x * b.x));
}

export function round(value,decimals=0){
    return Math.round(value * Math.pow(10,decimals)) / Math.pow(10,decimals);
}

export function roundVector(vector,decimals=0){
    return new THREE.Vector3(
        this.round(vector.x,decimals),
        this.round(vector.y,decimals),
        this.round(vector.z,decimals),
    )
}
/**
 * 得到两向量之间的夹角
 * @param {*} v1 
 * @param {*} v2 
 * @param {*} dotThreshold 
 */
export function getAngleBetweenVectors(v1,v2,dotThreshold=0.0005){
let angle = 0;
    let dot = v1.dot(v2);
    if(dot > 1 - dotThreshold){
        angle = 0;
    }else{
        if(dot < -1 + dotThreshold){
            angle = Math.PI;
        }else{
            angle = Math.acos(dot);
        }
    }
    return angle;
}
/**
 * 
 * @param {*} v1 
 * @param {*} v2 
 * @param {*} normal 
 * @param {*} dotThreshold 
 */
export function getSignedAngleBetweenVectors(v1,v2,normal=new THREE.Vector3(0,1,0),dotThreshold=0.0005){

}