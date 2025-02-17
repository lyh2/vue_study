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

import { BiLuFire } from "./Fun/example";
import {  TslAngularSlicing ,TslCoffeeSmoke, TslComputeAttractorsParticles, TslEarth} from "./Fun/Fun7";
import {DijkstrasThreeNav, RoomNav} from "./Fun/fun8";
import { ClassGalaxy, HalftoneClass, InteroperabilityClass, ProceduralTerrainClass, RagingSeaClass, TslBaseLession, TslVfxLinkedParticles, TslVfxTornado, VfxFlamesClass } from "./Fun/Tsl";
import { TslCubeToSphere, TslStudyFireBall, TslStudyLesson2, TslStudyTslTexture, TslUseNoise } from "./Fun/TslExample";


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
        // this._obj  = new DijkstrasThreeNav(this._options); // 成功的导航功能
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

        this._obj = new TslUseNoise(this._options);
    }

    _onWindowResizeEvent(params={}){
        this._obj._windowResizeFun();
    }
}

