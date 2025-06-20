<template>
    <div id="cesiumContainer" ref="cesiumContainer"></div>
</template>

<script setup >
import { onMounted, ref } from "vue";
import * as Cesium from "cesium";
import gsap from "gsap";

// 设置cesium token
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNjU4YmYyYS1hMTFiLTQ3ZWMtOGIzYi0wMmU3NGU2MzY5M2MiLCJpZCI6NDcxMjUsImlhdCI6MTYxNjk0MzU2OH0.DPOKu-XVNbD--yg24PCKJZDG3Q9Nl8ejATCa1Hkjys4";
var viewer = null;

/**
 * 自定义个材质,表示创建给entity
 * 
 */
class CustomMaterialProperty {
    //this.definitionChanged = null;
    constructor() {
        this.definitionChanged = new Cesium.Event();// 定义事件
        // 向材质缓存中添加材质
        Cesium.Material._materialCache.addMaterial("CustomMaterial", {
            fabric: {
                type: "CustomMaterial",
                uniforms: {
                    uTime: 0,
                },

                source: `
                    czm_material czm_getMaterial(czm_materialInput materilInput){
                        // 生成默认的基础材质
                        czm_material material = czm_getDefaultMaterial(materialInput);
                        material.diffuse = vec3(materialInput.st,uTime);
                        return material;
                    }
                `,
            }
        });

        this.params = {
            uTime: 0
        };

        gsap.to(this.params, {
            uTime: 1,
            duration: 2,
            repeat: -1,
            yoyo: true,
        });
    }

    getType() {
        return "CustomMaterial";// 返回材质类型
    }

    getValue(time, result) {
        result.uTime = this.params.uTime;
        // 返回材质值
        return result;
    }
}

onMounted(() => {
    viewer = new Cesium.Viewer("cesiumContainer", {
        // 是否显示信息窗口
        infoBox: true,
        shouldAnimate: true,
        terrain: Cesium.Terrain.fromWorldTerrain({
            requestVertexNormals: true,
            requestWaterMask: true,
        }),
        skyBox: new Cesium.SkyBox({
            sources: {
                positiveX: "./cesium/sky/px.jpg",
                negativeX: "./cesium/sky/nx.jpg",
                positiveY: "./cesium/sky/ny.jpg",
                negativeY: "./cesium/sky/py.jpg",
                positiveZ: "./cesium/sky/pz.jpg",
                negativeZ: "./cesium/sky/nz.jpg",

            },
            show: true,// 是否显示天空盒子
        }),

    });
    //viewer.scene.globe.enableLighting = true;
    console.log('viewer:', viewer, Cesium);
    // 设置沙箱允许使用js
    // var iframe = document.getElementsByClassName("cesium-infoBox-iframe")[0];
    // iframe.setAttribute("sandbox", "allow-same-orign allow-scripts allow-popups allow-forms");
    // iframe.setAttribute("src", "");

    // 隐藏logo 
    viewer.cesiumWidget.creditContainer.style.display = "none";// 不显示logo
    // 设置一个默认视角
    Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(104.059322, 30.542164, 104.064096, 30.544878);
    //initCesium();
    //initStudy();

    // 加载json 数据
    //initLoadJson();

    // 加载KML 数据
    //initKml();

    // 记载czml 数据
    //initCzml();

    // 追踪飞机垮洋飞行
    initAir();

    // 加载3D瓦片数据
    const tileset = Cesium.Cesium3DTileset.fromUrl("./cesium/tileset.json");
    tileset.then(res => {
        //console.log('加载成功之后的瓦片数据，瓦片数据也可能是3D的', res);
        viewer.scene.primitives.add(res);
        //viewer.zoomTo(res);
    });


});
import planeData from "@/assets/plane.json";
/**
 * 追踪飞机垮洋飞行
 */
function initAir() {
    // 位置采样
    const positionProperty = new Cesium.SampledPositionProperty();
    // 设置时间间隔
    const timeStepInSeconds = 30;
    // 整个飞行花费的事件
    const totalSeconds = (planeData.length - 1) * timeStepInSeconds;

    // 设置起点时间
    const time = new Date("2024-06-26T23:10:00Z");
    // cesium 默认使用的是儒略日的时间
    const startJulianDate = Cesium.JulianDate.fromDate(time);
    // 设置终点时间
    const stopJulianDate = Cesium.JulianDate.addSeconds(startJulianDate, totalSeconds, new Cesium.JulianDate());
    // 将查看器的时间调整到起点和结束点的范围
    viewer.clock.startTime = startJulianDate.clone();
    viewer.clock.stopTime = stopJulianDate.clone();
    viewer.clock.currentTime = startJulianDate.clone();
    viewer.timeline.zoomTo(startJulianDate, stopJulianDate);

    planeData.forEach((dataPoint, i) => {
        // 当前点的时间,给每个点都设置时间
        const time = Cesium.JulianDate.addSeconds(startJulianDate, i * timeStepInSeconds, new Cesium.JulianDate());
        // 设置当前点的位置
        const position = Cesium.Cartesian3.fromDegrees(dataPoint.longitude, dataPoint.latitude, dataPoint.height);
        // 添加轨迹采样点
        positionProperty.addSample(time, position);

        // 添加点
        viewer.entities.add({
            position: position,
            point: {
                pixelSize: 10,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
            }
        });
    });

    // 创建飞机
    const planeEntity = viewer.entities.add({
        availability: new Cesium.TimeIntervalCollection([new Cesium.TimeInterval({ start: startJulianDate, stop: stopJulianDate })]),
        name: "飞机",
        position: positionProperty,
        model: {
            uri: "./cesium/Air.glb",
            minimumPixelSize: 128,// 最小的像素大小
            maximumScale: 20000,
        },
        // 绘制轨迹线
        path: new Cesium.PathGraphics({
            width: 5,
            // 修改颜色
            material: Cesium.Color.YELLOW,
        }),
    });

    // 相机追踪运动问题
    viewer.trackedEntity = planeEntity;
    // 设置时间速率
    viewer.clock.multiplier = 60;

}

function initCzml() {
    // 加载kml数据
    let czml = "./cesium/resouces/box.czml";
    czml = [
        {
            id: "document",
            name: "CZML Point - Time Dynamic",
            version: "1.0",
        },
        {
            id: "point",
            // 物体在什么时间范围可用
            availability: "2012-08-04T16:00:00Z/2012-08-04T16:05:00Z",
            position: {
                // 设置物体的起始时间
                epoch: "2012-08-04T16:00:00Z",
                // 设置了四个维度，1维是时间，2维是经度，3维是纬度，4维是高度
                cartographicDegrees: [
                    0, -70, 20, 150000, 100, -80, 44, 150000, 200, -90, 18, 150000, 300,
                    -98, 52, 150000,
                ],
            },
            point: {
                color: {
                    rgba: [255, 255, 255, 128],
                },
                outlineColor: {
                    rgba: [255, 0, 0, 128],
                },
                outlineWidth: 3,
                pixelSize: 15,
            },
        },
    ];

    Cesium.CzmlDataSource.load(czml).then(dataSource => {
        viewer.dataSources.add(dataSource);
        viewer.flyTo(dataSource);
    });
}
/**
 * 加载KML数据
 */
function initKml() {
    let kmlDataPriomise = Cesium.KmlDataSource.load("./cesium/resouces/gdpPerCapita2008.kmz", {
        camera: viewer.scene.camera,
        canvas: viewer.scene.canvas,
        screenOverlayContainer: viewer.container,
    }).then(dataSource => {
        viewer.dataSources.add(dataSource);
    });
}

/**
 * 加载json 数据
 */
function initLoadJson() {
    let dataGeo = Cesium.GeoJsonDataSource.load("https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json", {
        stroke: Cesium.Color.RED,
        fill: Cesium.Color.SKYBLUE.withAlpha(0.5),
        strokeWidth: 4,
    });

    dataGeo.then(dataSource => {
        viewer.dataSources.add(dataSource); // 把数据加载到数据集中
        let entities = dataSource.entities.values;
        entities.forEach((entity, index) => {
            entity.polygon.material = new Cesium.ColorMaterialProperty(Cesium.Color.fromRandom({ alpha: 1 }));
            entity.polygon.outline = true;

            let randomHeight = parseInt(Math.random() * 5 + "");
            entity.polygon.extrudedHeight = 100000 * randomHeight;
        });

    })
}

function initStudy() {
    // 角度转弧度
    var radians = Cesium.Math.toRadians(90); // 把90°转成弧度
    console.log('90°转弧度=', radians, Cesium.Math.DEGREES_PER_RADIAN);
    var degrees = Cesium.Math.toDegrees(Math.PI / 2);
    console.log("Math.PI / 2 弧度转角度=", degrees);

    // 直接在实体entity创建几何体，是一种更加抽象高级的创建方式
    viewer.entities.add({
        id: "rectangle_0",
        rectangle: {
            coordinates: Cesium.Rectangle.fromDegrees(90, 20, 110, 20),
            material: Cesium.Color.RED.withAlpha(0.5),
        }
    });
    /*******使用primitive ，是一种更低级也就是更接近底层的代码，可以用来创建大批量的静态几何体对象*/
    // 第一步：先创建几何体
    let rectGeometry = new Cesium.RectangleGeometry({
        rectangle: Cesium.Rectangle.fromDegrees(115, 20, 135, 30),
        height: 0,
        vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
    });
    // 02-创建几何体实例
    let instance = new Cesium.GeometryInstance({
        geometry: rectGeometry,
        id: 'rectId_0',
        attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED.withAlpha(0.5)),
        }
    });
    // 第三步：设置外观 
    let appearance = new Cesium.PerInstanceColorAppearance({
        flat: true,
    });
    // 为entity 设置材质
    let material = new Cesium.ColorMaterialProperty(new Cesium.Color(1., 1.0, 1., 1.));
    // 棋盘纹理
    let CheckerboardMaterial = new Cesium.CheckerboardMaterialProperty({
        evenColor: Cesium.Color.RED,
        oddColor: Cesium.Color.YELLOW,
        repeat: new Cesium.Cartesian2(2, 2),
    });

    let stripeMaterial = new Cesium.StripeMaterialProperty({
        evenColor: Cesium.Color.WHITE,
        oddColor: Cesium.Color.BLACK,
        repeat: 8,
    });

    let gridMaterial = new Cesium.GridMaterialProperty({
        color: Cesium.Color.YELLOW,
        cellAlpha: Cesium.Math.randomBetween(0.1, 0.8),
        lineCount: new Cesium.Cartesian2(4, 4),
        lineThickness: new Cesium.Cartesian2(4., 4.),
    });
    let appearanceMaterial = new Cesium.Material({
        fabric: {
            uniforms: {
                uTime: 0,
            },
            source: `
            czm_material czm_getMaterial(czm_materialInput materialInput){
                // 生成默认的基础材质
                czm_material material = czm_getDefaultMaterial(materialInput);
                float strength = mod((materialInput.s - uTime) * 10.0 ,1.0);
                material.diffuse = vec3(strength,uTime,0.);
                return material;
            }
            `
        }
    });
    appearance.material = appearanceMaterial;

    gsap.to(appearanceMaterial.uniforms, {
        uTime: 1,
        duration: 2,
        repeat: -1,
        ease: "linear",
    });

    console.log('appearanceMaterial源代码：', appearanceMaterial.shaderSource)
    // 第四步：添加到图元集合中
    let primitive = new Cesium.Primitive({
        geometryInstances: instance,// 实例数组或者是单个实例
        appearance: appearance,// 外观
    });

    // 第五步：添加viewer 
    viewer.scene.primitives.add(primitive);
    viewer.camera.setView({
        destination: new Cesium.Rectangle(115 * Math.PI / 180, 20 * Math.PI / 180, 135 * Math.PI / 180, 30 * Math.PI / 180),// Rectangle 需要的是弧度值
    });

    // 添加拾取选择功能
    let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement) => {
        let pickedObject = viewer.scene.pick(movement.position);
        if (Cesium.defined(pickedObject) && typeof pickedObject.id == "string") {
            let attributes = primitive.getGeometryInstanceAttributes(pickedObject.id);
            attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.BLUE.withAlpha(0.5));
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);// 监听鼠标左键点击事件

    // 设置发光飞线效果
    let flylineMaterial = new Cesium.PolylineGlowMaterialProperty({
        color: Cesium.Color.RED,
        glowPower: 0.8,
        taperPower: 0.5,// 尾椎缩小程度
    });

    viewer.entities.add({
        polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([-75, 35, -125, 35]),
            width: 20,
            material: flylineMaterial
        }
    });

    // 测试自定义材质
    let customMaterialProperty = new CustomMaterialProperty();

    let rectangleEntity = viewer.entities.add({
        id: "entityRect",
        rectangle: {
            coordinates: Cesium.Rectangle.fromDegrees(90, 20, 110, 30),
        },
        material: customMaterialProperty
    });




}

async function initCesium() {
    try {
        // 添加3D建筑
        let tile3D = await Cesium.createOsmBuildingsAsync(); // a global 3D buildings layer.
        console.log("瓦片:", tile3D);
        // 修改万片数据
        // tile3D.style = new Cesium.Cesium3DTileStyle({
        //     //color: "rgba(255,255,0,0.9)",// color('yellow')
        //     //show: true,
        //     defines: {
        //         // 自定义变量
        //         distance: "distance(vec2(${feature['cesium#longitude']},${feature['cesium#latitude']}),vec2(108.193932, 31.565115))",

        //     },
        //     color: {
        //         conditions: [
        //             ["${distance} < 0.01", "color('rgba(0,0,50,0.7)')"],
        //             ["${distance} < 0.02", "color(rgba(0,0,100,0.5))"],
        //             ["${distance} < 0.04", "color(rgba(0,0,150,0.2))"],
        //             ["true", "color('yellow')"],
        //         ]
        //     },
        //     show: "${distance} < 0.04 && ${feature['building']} === 'buildName'",// 这个值：buildName 在3D 数据中查看
        // });

        const osmBuilding = viewer.scene.primitives.add(tile3D);
        let terrainProvider = await Cesium.createWorldTerrainAsync({
            requestWaterMask: true,
            requestVertexNormals: true
        });

        //viewer.terrainProvider = terrainProvider;
    } catch (error) {
        console.log(`Error creating tileset: ${error}`);
    }


    // 达州市螺丝村放牛场
    let position = Cesium.Cartesian3.fromDegrees(108.193932, 31.565115, 1000);
    // 设置北京天安门位置
    //position = Cesium.Cartesian3.fromDegrees(116.393428, 39.90923, 500);
    // 成都
    position = Cesium.Cartesian3.fromDegrees(104.071503, 30.663795, 2000);
    // viewer.camera.flyTo({
    //     destination: position, durtaion: 2, orientation: {
    //         heading: Cesium.Math.toRadians(90), // 弧度制
    //         pitch: Cesium.Math.toRadians(5),
    //         roll: Cesium.Math.toRadians(0),
    //     },
    // });

    // Example 1. Sensor on the ground pointing straight up
    // var sensor = viewer.scene.primitives.add(new IonSdkSensors.ConicSensor({
    //     modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706)),
    //     radius: 1000000.0,
    //     innerHalfAngle: Cesium.Math.toRadians(5.0),
    //     outerHalfAngle: Cesium.Math.toRadians(85.0)
    // }));
}
</script>

<style>
* {
    padding: 0;
    padding: 0;
}

#cesiumContainer {
    width: 100wh;
    height: 100vh;
}
</style>