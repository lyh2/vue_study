/**
 * 粒子效果
 */

import * as Cesium from "cesium";

export default class ParticleLight{
    constructor(viewer,color = Cesium.Color.WHITE){
        this.boxEntity = viewer.entities.add({
            name:"box",
            position:Cesium.Cartesian3.fromDegrees(113.3191,23.109,250),
            box:{
                dimensions:new Cesium.Cartesian3(100.0,100.,500),
                material:Cesium.Color.RED.withAlpha(0.),
            }
        });

        var particleSystem = new Cesium.ParticleSystem({
            image:"./cesium/smoke.png",
            imageSize:new Cesium.Cartesian2(20,20),
            minimumImageSize:new Cesium.Cartesian2(10,10),
            maximumImageSize:new Cesium.Cartesian2(30,30),
            startColor:color,
            endColor:Cesium.Color.WHITE.withAlpha(0),
            startScale:0.1,
            endScale:2.0,
            speed: Math.random() * 10,
            minimumSpeed:1.,
            maximumSpeed:10.,
            emitter:new Cesium.BoxEmitter(new Cesium.Cartesian3(250,250,800)),
            emissionRate:30,
            lifetime:5.,
            modelMatrix:this.boxEntity.computeModelMatrix(viewer.clock.currentTime,new Cesium.Matrix4)

        });
        viewer.scene.primitives.add(particleSystem);
    }
}