import { _0_, _120_, _1_, _2_, _3_, _5_, _X_ } from './constaint';
import { getPos, getTranslateString, setPos } from './DomUtils';

export const STATE = { NONE: -1, ZOOM: 1, PAN: 2 };
export default class Controller2D {
  constructor(renderer) {
    this.renderer = renderer;
    this.domElement = renderer.domElement || document;

    this.viewChanged = true;
    this.enable = true;

    this.startPoint = [0, 0];
    this.endPoint = [0, 0];

    this.startPos = [];
    this.curPos = [];

    this.panVector = [0, 0];
    this.zoomDistStart = 0;
    this.zoomDistEnd = 0;
    this.zoomScale = 1;
    this.state = STATE.NONE;

    this.init();
  }
  /**
   * 添加事件监听
   */
  init() {
    // 添加事件监听
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), false);
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
    this.domElement.addEventListener('mousewheel', this.onMouseWheel.bind(this), false);
  }
  onMouseWheel(event) {
    if (this.enable === false) return;
    let delta = _0_;
    delta = event.wheelDelta ? event.wheelDelta / _120_ : -event.delta / _3_;
    delta > _0_ ? (delta *= 0.85) : (delta *= -1.2);
    this.renderer.setScale(delta);
  }

  onMouseDown(event) {
    event.preventDefault();
    this.startPoint[0] = event.clientX;
    this.startPoint[1] = event.clientY;

    if (this.enable === false) return;

    document.addEventListener('mouseup', this.onMouseUp.bind(this), false);
    document.addEventListener('mousemove', this.onMouseMove.bind(this), false);

    const point = getPos(this.domElement);
    this.startPos[0] = point[0];
    this.startPos[1] = point[1];
  }

  onMouseMove(event) {
    if (this.enable === false) return;
    event.preventDefault();
    event.stopPropagation();

    this.endPoint[0] = event.clientX;
    this.endPoint[1] = event.clientY;

    this.panVector = [this.endPoint[0] - this.startPoint[0], this.endPoint[1] - this.startPoint[1]];

    if (event.button === _0_) {
      this.translate();
      this.state = STATE.PAN;
    } else if (event.button === _1_) {
      this.zoomScale = (Math.abs(this.panVector[0]) + Math.abs(this.panVector[1])) / _X_;
      if (this.panVector[1] < _0_) {
        this.zoomScale = -this.zoomScale;
      }
      this.zoomScale += 1;
      this.zoom();
      this.state = STATE.ZOOM;
    }
  }

  onMouseUp() {
    if (this.enable === false) return;
    if (this.state == STATE.PAN) {
      this.panEnd();
    } else if (this.state == STATE.ZOOM) {
      this.zoomEnd();
    }
    this.state = STATE.NONE;
    document.removeEventListener('mouseup', this.onMouseUp.bind(this), false);
    document.removeEventListener('mousemove', this.onMouseMove.bind(this), false);
    this.enable = false;
  }

  onTouchStart(event) {
    event.preventDefault();

    const touches = event.touches;
    if (touches.length == _1_) {
      //pan 拖动
      this.startPoint[0] = touches[0].clientX;
      this.startPoint[1] = touches[0].clientY;
      const point = getPos(this.domElement);
      this.startPos[0] = point[0];
      this.startPos[1] = point[1];
    } else if (touches.length == _2_) {
      // zoom 缩放
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      this.zoomDistEnd = this.zoomDistStart = Math.sqrt(dx * dx + dy * dy);
    } else {
      this.state = STATE.NONE;
      return;
    }

    if (this.enable === false) return;

    document.addEventListener('touchend', this.onTouchEnd.bind(this), false);
    document.addEventListener('touchmove', this.onTouchMove.bind(this), false);
  }

  onTouchEnd() {
    if (this.enable === false) return;
    if (this.state == STATE.PAN) {
      this.panEnd();
    } else if (this.state == STATE.ZOOM) {
      // 放大缩小
      this.zoomEnd();
    }

    this.state = STATE.NONE;
    document.removeEventListener('touchend', this.onTouchEnd.bind(this), false);
    document.removeEventListener('touchmove', this.onTouchMove.bind(this), false);
  }

  onTouchMove(event) {
    if (this.enable === false) return;
    event.preventDefault();
    event.stopPropagation();

    const touches = event.touches;
    if (touches.length == _1_) {
      this.endPoint[0] = touches[0].clientX;
      this.endPoint[1] = touches[0].clientY;

      this.panVector = [
        this.endPoint[0] - this.startPoint[0],
        this.endPoint[1] - this.startPoint[1],
      ];
      this.translate();
      this.state = STATE.PAN;
    } else if (touches.length == _2_) {
      let dx = touches[1].clientX - touches[0].clientX;
      let dy = touches[1].clientY - touches[0].clientY;
      this.zoomDistEnd = Math.sqrt(dx * dx + dy * dy);
      this.zoomScale = this.zoomDistEnd / this.zoomDistStart;
      console.log('this.zoomScale:', this.zoomScale);
      this.zoom();
      this.state = STATE.ZOOM;
    }
  }
  zoom() {
    const pos = getPos(this.domElement);
    this.domElement.style['transform'] =
      getTranslateString(pos) + ' scale(' + this.zoomScale + ') ';
  }
  zoomEnd() {
    this.renderer.updateViewport(true);
    this.renderer.translate(this.panVector);
  }
  panEnd() {
    if (Math.abs(this.panVector[0] + this.panVector[1]) < _5_) return;
    this.renderer.updateViewport();
    //console.log('this.renderer:', this.renderer);
    this.renderer.translateFun(this.panVector);
  }
  translate() {
    this.curPos[0] = this.startPos[0] + this.panVector[0];
    this.curPos[1] = this.startPos[1] + this.panVector[1];
    setPos(this.domElement, [this.curPos[0], this.curPos[1]]);
  }
  reset() {
    this.startPoint = [0, 0];
    this.endPoint = [0, 0];
  }
}
