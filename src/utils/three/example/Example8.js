//import { CADDraw } from './Base-Study/BaseStudyModule';
//import {  MorphAnimation } from './Base-Study/BaseStudymodule';
//import { StudyPoly2tri } from "./Base-Study/BaseStudyModule";
import { MoveBoxGame } from './Base-Study/BaseStudyModule';
export default class Example8 {
  constructor(_options = {}) {
    this._options = _options;
  }

  _init(params = {}) {
    console.log('Example8._init:', params);

    // 制作变形动画
    //this._obj = new MorphAnimation(this._options);
    // 模拟CAD
    //this._obj = new CADDraw(this._options);
    //
    //this._obj = new StudyPoly2tri(this._options);
    //
    this._obj = new MoveBoxGame(this._options);
  }

  _onWindowResizeEvent() {
    this._obj._windowResizeFun();
  }
}
