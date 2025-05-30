/*
 * @Author: 412285349@qq.com
 * @Date: 2024-10-02 21:14:42
 * @LastEditors: 412285349@qq.com 412285349@qq.com
 * @LastEditTime: 2025-01-19 22:13:49
 * @FilePath: /www/vue_study/src/utils/three/example/Example7.js
 * @Description: 
 * 
 */

/**
 * 节点开发
 */

import { BiLuFire, DrawPolygonOfPoints3D, DrawPolygonUseEarcut, FireWork,Rain, PenEffect, SceneInScene, UseEffectComposer, UseGeometryUtils, WaterBubble, MoveBoxGame, ConvexBreakerGame, DeformationAnimate, UnlimitedRoadTree, PlaneWaterEffect, StarEffect, ShaderSmoke, ShortFirework, FireworkParticle, MouseNoise } from "./Fun/example";
import {  TslAngularSlicing ,TslCoffeeSmoke, TslComputeAttractorsParticles, TslEarth} from "./Fun/Fun7";
import {DijkstrasThreeNav, RoomNav} from "./Fun/fun8";
import { UseRecastThree } from "./Fun/recastNavigation";
import { FirstPerson, UseConvexObjectBreaker } from "./Fun/sbCode.net";
import { ClassGalaxy, HalftoneClass, InteroperabilityClass, ProceduralTerrainClass, RagingSeaClass, TslBaseLession, TslVfxLinkedParticles, TslVfxTornado, VfxFlamesClass } from "./Fun/Tsl";
import { TslCubeToSphere, TslCustomVertexAndGeometry, TslStudyFireBall, TslStudyLesson2, TslStudyTslTexture, TslUseNoise, TslUseVarying } from "./Fun/TslExample";
import { TslBakeAnimation, TslBakeMore, TslCreateFunRunGPU, TslMakeNoiseTexture, TslMakeNoiseTextureAddTime, TslMakeNoiseTextureOfTileable, TslMakeOutlineOfGLSL, TslMakeOutlineOfTsl, TslRaymarching } from "./Fun/TslStudyOfNiklever.com";
import { BaseGPU } from "./Fun/webgpu";
import { GoalDrivenAgentDesign, StateDriveAgentDesign } from "./Fun/yuka";


export default class Example7 {
    constructor(_options={}){
        this._options = _options;
        
    }

    _init(params={}){
        //this._obj = new NodesClass(this._options);

        //this._obj = new TslAngularSlicing(this._options);
        //this._obj = new TslCoffeeSmoke(this._options);

        /*****导航功能*****/
        //this._obj = new RoomNav(this._options); // 堆算法失败
        //this._obj  = new DijkstrasThreeNav(this._options); // 成功的导航功能(但是算法不算完整，完整可用的算法在m.chisu.com中之江测试demo),还有显示中文
        // tsl
        //this._obj = new TslComputeAttractorsParticles(this._options);

        //this._obj = new TslEarth(this._options);

        //this._obj = new ClassGalaxy(this._options);

        //this._obj = new HalftoneClass(this._options);

        //this._obj = new InteroperabilityClass(this._options);

        //this._obj = new ProceduralTerrainClass(this._options);

        //this._obj = new RagingSeaClass(this._options);

        //this._obj = new VfxFlamesClass(this._options);

        //this._obj =new TslVfxLinkedParticles(this._options);

        //this._obj = new TslVfxTornado(this._options);

        //this._obj = new TslBaseLession(this._options);
        
        //this._obj = new TslStudyTslTexture(this._options);
        
        //this._obj = new TslStudyLesson2(this._options);
        //this._obj = new BiLuFire(this._options);

        //this._obj = new TslStudyFireBall(this._options);

        //this._obj = new TslCubeToSphere(this._options);

        //this._obj = new TslUseNoise(this._options);

        //this._obj  = new TslUseVarying(this._options);

        //this._obj = new TslCustomVertexAndGeometry(this._options);

        //this._obj = new TslCreateFunRunGPU(this._options);

        //this._obj = new TslBakeAnimation(this._options);

        //this._obj = new TslBakeMore(this._options);

        //this._obj = new TslMakeNoiseTexture(this._options);

        //this._obj = new TslMakeNoiseTextureOfTileable(this._options);

        //this._obj  = new TslMakeNoiseTextureAddTime(this._options);

        //this._obj = new TslRaymarching(this._options);

        //this._obj = new TslMakeOutlineOfGLSL(this._options);

        //this._obj = new TslMakeOutlineOfTsl(this._options);

        //this._obj = new BaseGPU(this._options);
        // 点击绘制多边形且挖洞进行细分
        //this._obj = new DrawPolygonUseEarcut(this._options);
        // 理解创建多边形
        //this._obj = new DrawPolygonOfPoints3D(this._options);

        //this._obj = new SceneInScene(this._options);

        //this._obj = new UseGeometryUtils(this._options);

        // 炫酷的效果
        //this._obj = new UseEffectComposer(this._options);

        // 烟花效果
        //this._obj = new FireWork(this._options);

        // 有点类似拖尾效果
        //this._obj = new PenEffect(this._options);

        // 下雨效果
        //this._obj = new Rain(this._options);

        // 水泡效果
        //this._obj = new WaterBubble(this._options);
        // 移动Box游戏效果
        //this._obj = new MoveBoxGame(this._options);
        // 使用recastnavigation
        //this._obj = new UseRecastThree(this._options);
        // 使用cannon 进行破碎游戏
        //this._obj = new ConvexBreakerGame(this._options);
        // 噪声球体
        //this._obj = new DeformationAnimate(this._options);
        // 无限循环的路及树
        //this._obj = new UnlimitedRoadTree(this._options);
        // 在平面上实现水的效果
        //this._obj = new PlaneWaterEffect(this._options);
        // 星系空间效果
        //this._obj = new StarEffect(this._options);
        // 实现烟雾效果
        //this._obj = new ShaderSmoke(this._options);
        // 实现烟花效果，爆炸之后是多个小球
        //this._obj = new ShortFirework(this._options);
        //点击发射烟花效果
        //this._obj = new FireworkParticle(this._options);
        // 鼠标移动噪声
        //this._obj = new MouseNoise(this._options);
        // sbcode 案例
        //this._obj = new FirstPerson(this._options);
        // 破碎案例-借鉴别人的,很完美的，比上面更加好
        //this._obj = new UseConvexObjectBreaker(this._options);
        // yuka state 状态驱动
        //this._obj = new StateDriveAgentDesign(this._options);
        // yuka 全局状态驱动
        this._obj = new GoalDrivenAgentDesign(this._options);
    }

    _onWindowResizeEvent(params={}){
        this._obj._windowResizeFun();
    }
}


