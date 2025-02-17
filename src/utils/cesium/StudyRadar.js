import * as Cesium from "cesium";
import StudyRadarMaterial from "./StudyRadarMaterial";
import {samplerShader1minus2xDisCenterV2,radarShaderSource} from "@/utils/cesium/StudyGlsl";

/**
 * 实现雷达效果
 * 
 */
export function createRadar(viewer){
    const position = new Cesium.Cartesian3.fromDegrees(113.3081,23.101,200);
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
    const radius  = 40000.0;

    viewer.scene.primitives.add(new Cesium.Primitive({
        geometryInstances:[new Cesium.GeometryInstance({geometry:new Cesium.EllipseGeometry({center:position,semiMajorAxis:radius,semiMinorAxis:radius})})],
        appearance:new Cesium.MaterialAppearance({
            material:new StudyRadarMaterial({
                color:new Cesium.Color(255,255,50,1),
                selectColor:new Cesium.Color(255,21,212,1),
                radians:Math.PI * 3 / 8,
                offset:0.2,
                width:0.2,
                shaderSource:radarShaderSource,
            }),
            flat:false,
            faceForward:false,
            translucent:true,
            closed:true,
        }),
        asynchronous:false,
        modelMatrix:modelMatrix
    }));
}