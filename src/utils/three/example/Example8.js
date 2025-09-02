import { MorphAnimation } from './Base-Study/BaseStudymodule';

export default class Example8 {
  constructor(_options = {}) {
    this._options = _options;
  }

  _init(params = {}) {
    console.log('Example8._init:', params);

    // 制作变形动画
    this._obj = new MorphAnimation(this._options);
  }

  _onWindowResizeEvent() {
    this._obj._windowResizeFun();
  }
}
