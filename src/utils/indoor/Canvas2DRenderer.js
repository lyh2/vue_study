/**
 * 自定义实现一个canvasRenderer
 */
import * as THREE from 'three';
import { _0_, _6_ } from './constaint';
import { setPos } from './DomUtils';
import Rect from './Rect';
import { computePaddingRatio, getBoundingRect } from './Utils';

export class Canvas2DRenderer {
  constructor(indoorMap2D) {
    this.indoorMap2D = indoorMap2D; /**
    dom: 代表外层的div，也就是container 容器
    */
    this.padding = 0.2; //padding between map bounding box and the div boundary

    this.canvasPos = [0, 0];
    this.canvasSize = [0, 0];
    this.canvasHalfSize = [0, 0];
    this.bounds = null;
    this.nameTexts = [];
    this.sprites = [];
    this.scale = 1;
    this.currentFloor = null;
    this.objSize = [0, 0];
    this.translate = [0, 0];

    this.domElement = document.createElement('canvas');
    this.ctx = null;
    this.mapCenter = [];
    this.devicePixelRatio = window.devicePixelRatio || 1; // 设别像素比

    this.init();
  }

  init() {
    this.domElement.style.position = 'absolution';
    this.ctx = this.domElement.getContext('2d');
    this.updateViewport();
  }
  /**
   * 更新视口
   */
  updateViewport(isZoom = false) {
    // 通过宽高值得到一个边界比例值
    const tempRatio = computePaddingRatio();
    // 具体的边界像素值
    const paddingSize = [
      (this.indoorMap2D.containerSize[0] * tempRatio) >> 0,
      (this.indoorMap2D.containerSize[1] * tempRatio) >> 0,
    ];
    this.canvasPos[0] = this.indoorMap2D.containerPos[0] - paddingSize[0];
    this.canvasPos[1] = this.indoorMap2D.containerPos[1] - paddingSize[1];

    const realRatio = 1 + 2 * tempRatio;
    // 得到canvas的大小
    this.canvasSize[0] = (realRatio * this.indoorMap2D.containerSize[0]) >> 0;
    this.canvasSize[1] = (realRatio * this.indoorMap2D.containerSize[1]) >> 0;

    // 得到canvas的一半
    this.canvasHalfSize[0] = this.canvasSize[0] * 0.5;
    this.canvasHalfSize[1] = this.canvasSize[1] * 0.5;

    // 得到一个矩形
    this.bounds = new Rect(
      -this.canvasHalfSize[0],
      -this.canvasHalfSize[1],
      this.canvasHalfSize[0],
      this.canvasHalfSize[1]
    );
    //
    this.canvasPos[0] = -paddingSize[0];
    this.canvasPos[1] = -paddingSize[1];

    // 更新canvas的变换值
    setPos(this.domElement, this.canvasPos);

    this.domElement.width = this.canvasSize[0] * this.devicePixelRatio;
    this.domElement.height = this.canvasSize[1] * this.devicePixelRatio;
    this.domElement.style.width = this.canvasSize[0] + 'px'; // 显示宽度
    this.domElement.style.height = this.canvasSize[1] + 'px';
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
    this.ctx.translate(this.canvasHalfSize[0], this.canvasHalfSize[1]); // 移动原点到中心位置处
    if (isZoom) {
      // 是否是滚轮
      this.ctx.translate(this.translate[0], this.translate[1]);
    }
    //console.log('Canvas2DRenderer:', this);
  }
  /**
   *
   * @param {*} floorId
   * @param {*} mall
   */
  createNameTexts(mall) {
    if (this.nameTexts.length !== _0_) {
      this.nameTexts.length = _0_;
    }
    // 获取功能区数据
    const funcAreasJson = mall.getFloorJson(mall.getCurrentFloorId()).funcAreas;
    //console.log('funcAreaJson:', mall.getCurrentFloorId(), funcAreaJson);
    const fontStyle = this.indoorMap2D.getTheme().fontStyle;
    this.ctx.font = fontStyle.fontSize + 'px' + fontStyle.fontFace;
    //console.log('funcAreasJson:', funcAreasJson);
    for (let i = 0; i < funcAreasJson.length; i++) {
      let name = {};
      let funcArea = funcAreasJson[i];

      name.text = funcArea.name;
      name.halfWidth = this.ctx.measureText(name.text).width / 2;
      name.halfHeight = fontStyle.fontSize / 2;
      name.visible = true;
      //console.log('name:', name);
      this.nameTexts.push(name);
    }
  }

  /**
   * 清除背景
   */
  clearBg() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = this.indoorMap2D.getTheme().background;
    this.ctx.fillRect(
      0,
      0,
      this.canvasSize[0] * this.devicePixelRatio,
      this.canvasSize[1] * this.devicePixelRatio
    );
    this.ctx.restore();
  }
  /**
   * 渲染
   */
  render() {
    if (this.indoorMap2D.mall === undefined) {
      return;
    }
    const theme = this.indoorMap2D.getTheme();
    // 获取渲染数据
    this.currentFloor = this.indoorMap2D.mall.getCurrentFloor();

    this.ctx.save();
    //console.log('this.currentFloor:', this.currentFloor);
    //console.log('theme:', theme);
    // 绘制楼层
    let poly = this.currentFloor.newOutline;
    //console.log('poly:', poly);
    //
    this.ctx.beginPath();
    this.ctx.moveTo(poly[0], -poly[1]);
    for (let i = 2; i < poly.length - 1; i += 2) {
      this.ctx.lineTo(poly[i], -poly[i + 1]);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = this.currentFloor.fillColor;
    this.ctx.fill();
    this.ctx.strokeStyle = theme.strokeStyle.color;
    this.ctx.linewidth = theme.strokeStyle.linewidth;
    this.ctx.stroke();

    // 绘制功能区
    const funcAreas = this.currentFloor.funcAreas;
    for (let i = 0; i < funcAreas.length; i++) {
      const funcArea = funcAreas[i];
      const poly = funcArea.newOutline;
      if (poly.length < 6) {
        continue;
      }
      this.ctx.beginPath();
      this.ctx.moveTo(poly[0], -poly[1]);
      for (let j = 2; j < poly.length - 1; j += 2) {
        this.ctx.lineTo(poly[j], -poly[j + 1]);
      }

      this.ctx.closePath();
      this.ctx.fillStyle = funcArea.fillColor;
      this.ctx.fill();
      this.ctx.stroke();
    }
    // test for selection
    this.ctx.restore();

    if (this.indoorMap2D.mapOptions.showNames) {
      const fontStyle = theme.fontStyle;
      this.ctx.textBaseline = fontStyle.textBaseline;
      this.ctx.fillStyle = theme.fontStyle.color;
      this.ctx.font = fontStyle.fontSize + 'px/ 1.4 ' + fontStyle.fontFace;
      var textRects = [];
      for (let i = 0; i < funcAreas.length; i++) {
        const nameText = this.nameTexts[i];
        const center = funcAreas[i].center;
        const rect = new Rect(
          center[0] - nameText.halfWidth,
          -center[1] - nameText.halfHeight,
          center[0] + nameText.halfWidth,
          -center[1] + nameText.halfHeight
        );
        textRects.push(rect);
        nameText.visible = true;

        for (let j = 0; j < i; j++) {
          if (this.nameTexts[j].visible && textRects[j].isCollide(rect)) {
            nameText.visible = false;
            break;
          }
        }

        if ((funcAreas[i].rect.br[0] - funcAreas[i].rect.tl[0]) * 0.9 < nameText.halfWidth * 2) {
          nameText.visible = false;
        }
        if (nameText.visible) {
          this.ctx.fillText(
            nameText.text,
            (center[0] - nameText.halfWidth) >> _0_,
            -center[1] >> _0_
          );
          this.ctx.beginPath();
          this.ctx.arc(center[0], center[1], 3, 0, Math.PI * 2, true);
          this.ctx.closePath();
          this.ctx.fill();
          // 给文本绘制矩形边框
          // this.ctx.strokeRect(
          //   rect.tl[0],
          //   rect.tl[1],
          //   rect.br[0] - rect.tl[0],
          //   rect.br[1] - rect.tl[1]
          // );
        }
      }
    }

    if (this.indoorMap2D.mapOptions.showPubPoints) {
      const pubPoints = this.currentFloor.pubPoints;
      const imgWidth = 20,
        imgHeight = 20;

      const imgWidthHalf = imgWidth / 2;
      const imgHeightHalf = imgHeight / 2;
      let pubPointRects = [];
      for (let i = 0; i < pubPoints.length; i++) {
        const pubPoint = pubPoints[i];
        const center = pubPoint.newOutline;
        const rect = new Rect(
          center[0] - imgWidthHalf,
          -center[1] - imgHeightHalf,
          center[0] + imgWidthHalf,
          -center[1] + imgHeightHalf
        );
        pubPointRects.push(rect);
        pubPoint.visible = true;
        for (let j = 0; j < i; j++) {
          if (pubPoints[j].visible && pubPointRects[j].isCollide(rect)) {
            pubPoint.visible = false;
            break;
          }
        }

        if (pubPoint.visible) {
          const image = this.sprites[pubPoints[i].type];
          if (image !== undefined) {
            this.ctx.drawImage(
              image,
              (center[0] - imgWidthHalf) >> _0_,
              (-center[1] - imgHeightHalf) >> _0_,
              imgWidth,
              imgHeight
            );
          }
        }
      }
    }
  }
  loadSprites(mall) {
    if (mall == null) {
      return;
    }
    const images = this.indoorMap2D.getTheme().pubPointImg;
    const loader = new THREE.ImageLoader();
    for (let key in images) {
      const image = loader.load(images[key], () => {
        this.render(mall);
      });
      this.sprites[key] = image;
    }
    this.sprites.isLoaded = true;
  }
  /**
   * 设置选中
   * @param {*} pos
   */
  onSelect(pos) {
    // 首先进行坐标转换
    const tempPos = this.worldToLocal(pos);
    //
    return this.hitTest(tempPos);
  }
  /**
   * 点击测试
   * @param {*} point
   */
  hitTest(point) {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < this.currentFloor.funcAreas.length; i++) {
      const funcArea = this.currentFloor.funcAreas[i];

      const rect = funcArea.rect;
      if (
        (point[0] < rect.tl[0] && point[0] < -rect.br[1]) ||
        (point[0] > rect.br[0] && point[0] > -rect.tl[1])
      )
        continue;

      const poly = funcArea.newOutline;
      if (poly.length < _6_) {
        continue;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(poly[0], -poly[1]);
      for (let j = 2; j < poly.length - 1; j += 2) {
        this.ctx.lineTo(poly[j], -poly[j + 1]);
      }
      this.ctx.closePath();
      if (this.ctx.isPointInPath(point[0], point[1])) {
        this.ctx.restore();
        return funcArea;
      }
    }
    this.ctx.restore();
    return null;
  }

  translateFun(vec) {
    this.translate[0] += vec[0];
    this.translate[1] += vec[1];
    this.ctx.translate(this.translate[0], this.translate[1]);
    this.clearBg();
    this.render();
  }

  worldToLocal(pos) {
    let localPoint = [0, 0];
    localPoint[0] = (pos[0] - this.translate[0] - this.indoorMap2D.containerHalfSize[0]) >> _0_;
    localPoint[1] = (pos[1] - this.translate[1] - this.indoorMap2D.containerHalfSize[1]) >> _0_;
    return localPoint;
  }
  setDefaultView(floor) {
    floor.rect = getBoundingRect(floor.outline[0][0]);
    let floorSize = [0, 0];
    floorSize[0] = floor.rect.br[0] - floor.rect.tl[0];
    floorSize[1] = floor.rect.br[1] - floor.rect.tl[1];
    let scaleX = (this.indoorMap2D.containerSize[0] * (1 - this.padding)) / floorSize[0];
    let scaleY = (this.indoorMap2D.containerSize[1] * (1 - this.padding)) / floorSize[1];
    // 楼层的中心点位置
    this.mapCenter[0] = (floor.rect.br[0] + floor.rect.tl[0]) / 2;
    this.mapCenter[1] = (floor.rect.br[1] + floor.rect.tl[1]) / 2;
    this.ctx.translate(-this.translate[0], -this.translate[1]);
    this.scale = 1;
    this.translate = [0, 0];
    this.setScale(Math.min(scaleX, scaleY));
  }
  /**
   * 设置缩放
   * @param {*} scale
   */
  setScale(scale) {
    this.scale *= scale;
    this.currentFloor = this.indoorMap2D.mall.getCurrentFloor();
    this.updateOutline(this.currentFloor);
    // 得到功能区
    var funcAreas = this.currentFloor.funcAreas;
    for (let i = 0; i < funcAreas.length; i++) {
      this.updateOutline(funcAreas[i]);
    }
    // 公共点
    var pubPoints = this.currentFloor.pubPoints;
    for (let i = 0; i < pubPoints.length; i++) {
      this.updateOutline(pubPoints[i]);
    }

    this.ctx.translate(-this.translate[0], -this.translate[1]);
    this.translate[0] *= scale;
    this.translate[1] *= scale;
    this.ctx.translate(this.translate[0], this.translate[1]);
    this.clearBg();
    if (this.indoorMap2D.mapOptions.showNames) {
      this.createNameTexts(this.indoorMap2D.mall);
    }
    //
    if (this.indoorMap2D.mapOptions.showPubPoints) {
      this.loadSprites(this.indoorMap2D.mall);
    }
    this.render();
  }

  updateOutline(obj) {
    let outline = obj.outline[0][0];
    // 给当前楼层新增一个数据
    obj.newOutline = [];
    for (let i = 0; i < outline.length - 1; i += 2) {
      let newPoint = this.updatePoint([outline[i], outline[i + 1]]);
      obj.newOutline.push(newPoint[0]);
      obj.newOutline.push(newPoint[1]);
    }
    obj.rect = getBoundingRect(obj.newOutline);

    if (obj.center) {
      obj.center = [
        ((obj.rect.br[0] + obj.rect.tl[0]) / 2) >> _0_,
        ((obj.rect.br[1] + obj.rect.tl[1]) / 2) >> _0_,
      ];
    }
    return obj;
  }

  updatePoint(point) {
    return [
      ((point[0] - this.mapCenter[0]) * this.scale) >> _0_,
      ((point[1] - this.mapCenter[1]) * this.scale) >> _0_,
    ];
  }

  reset() {
    this.nameTexts.length = 0;
    this.nameTexts = [];
  }
}
