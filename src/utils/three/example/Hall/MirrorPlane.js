/**
 * 镜面反射
 */

import {ReflectorMesh} from "./ReflectorMesh";
import * as THREE from "three";

export default class MirrorPlane{
    /**
     * 
     * @param {*} size 
     * @param {*} position 
     * @param {*} rotation 
     */
    constructor(size = new THREE.Vector2(100,100),position = new THREE.Vector3(0,0,0),rotation = new THREE.Euler(-Math.PI / 2,0,0)){
        this.geometry = new THREE.PlaneGeometry(size.x,size.y);
        this.groundMirror = new ReflectorMesh(this.geometry,{
            ClipBias:0.003,
            textureWidth:1980 * window.devicePixelRatio,
            textureHeight:1080 * window.devicePixelRatio,
            color:0x330000,
        });

        this.groundMirror.position.copy(position);
        this.groundMirror.rotation.copy(rotation);
        this.mesh = this.groundMirror;
    }
}