import * as THREE from 'three';
import { Canvas2DRenderer } from './Canvas2DRenderer';
import Controller2D from './Controller2D';
import { default2dTheme } from './theme/default2dTheme';
import IndoorMapLoader from './IndoorMapLoader';
import { _1_, _5_ } from './constaint';
import { parseModel } from './Utils';
import { getElementLeft, getElementTop } from './DomUtils';

export default class IndoorMap2D {
  constructor(options) {
    this.options = options;
    this.is3D = false;
    this.renderer = null;
    this.controls = null;
    this.mall = null;
    this.currentFloorId = 0;
    // 地图控制参数
    this.mapOptions = {
      showNames: true, // 是否显示名称
      showPubPoints: true, // 是否显示公共点
      selectable: true, // 是否可以被选中
      movable: true, // 是否可以移动
    };
    this.containerSize = [0, 0]; // 外层容器的大小
    this.containerHalfSize = [0, 0]; // 外层容器大小的一半
    this.containerPos = [0, 0]; // 外层容器的位置
    this.mapCenter = [0, 0]; // 地图中心点
    this.selected = null;
    this.selectedOldColor = null; // 选中的对象
    this.selectionListener = null;
    this.init();
  }

  init() {
    console.log('THREE:', THREE);
    this.containerSize[0] = parseInt(window.innerWidth);
    this.containerSize[1] = parseInt(window.innerHeight);
    this.containerHalfSize[0] = this.containerSize[0] / 2;
    this.containerHalfSize[1] = this.containerSize[1] / 2;

    this.renderer = new Canvas2DRenderer(this);
    this.controls = new Controller2D(this.renderer);

    this.options.dom.appendChild(this.renderer.domElement);
  }
  /**
   * 加载JSON数据
   * @param {*} url
   * @param {*} callback
   */
  load(url, callback) {
    // 清除数据
    this.reset();
    this.theme = default2dTheme;
    const loader = new IndoorMapLoader(false);
    loader.loadMap(url, mall => {
      this.mall = mall;
      console.log('mall:', mall);
      this.showFloor(this.mall.getDefaultFloorId());
      if (callback) {
        callback();
      }
    });
  }
  /**
   * 显示指定楼层
   * @param {*} floorId
   */
  showFloor(floorId = _1_) {
    if (this.mall == null) {
      return;
    }

    this.currentFloorId = floorId;
    this.mall.showFloor(floorId);

    this.adjustCamera();
  }

  adjustCamera() {
    this.setDefaultView();
  }

  setDefaultView() {
    this.renderer.setDefaultView(this.mall.getCurrentFloor());
    this.controls.reset();
    this.controls.viewChanged = true;
  }

  getTheme() {
    return this.theme;
  }
  setTheme(theme) {
    if (theme == null) {
      this.theme = theme;
    } else if (this.theme !== theme) {
      this.theme = theme;

      // 解析数据
      this.parse(this.mall.jsonData);
      // 重新绘制
      this.reDraw();
    }
  }
  showNames(show = true) {
    this.mapOptions.showNames = show;
    this.reDraw();
    return this; // 添加了这个返回值，就能使用链式调用
  }

  setSelectable(selectable) {
    if (selectable) {
      this.options.dom.addEventListener('mouseup', this.onSelectObject.bind(this), false);
      this.options.dom.addEventListener('touchend', this.onSelectObject.bind(this), false);
    } else {
      this.options.dom.removeEventListener('mouseup', this.onSelectObject.bind(this), false);
      this.options.dom.removeEventListener('touched', this.onSelectObject.bind(this), false);
    }
    return this;
  }

  onSelectObject(event) {
    event.preventDefault();
    //console.log('event:', event);
    let pos = [0, 0];
    if (event.type == 'touched') {
      // 在手机端
      pos[0] = event.changedTouches[0].clientX;
      pos[1] = event.changedTouches[0].clientY;
    } else {
      // PC 端
      pos[0] = event.clientX;
      pos[1] = event.clientY;
    }
    console.log(
      'pos:',
      pos,
      pos[0] - this.controls.startPoint[0] + pos[1] - this.controls.startPoint[1]
    );
    if (
      Math.abs(pos[0] - this.controls.startPoint[0] + pos[1] - this.controls.startPoint[1]) < _5_
    ) {
      pos[0] -= getElementLeft(this.options.dom);
      pos[1] -= getElementTop(this.options.dom);

      this.deSelectAll();
      //
      this.selected = this.renderer.onSelect(pos);
      console.log('this.selected:', this.selected);
      if (this.selected != null) {
        this.onSelect();
        if (this.selectionListener != null) {
          this.selectionListener(this.getSelectedId());
        }
      } else {
        if (this.selectionListener != null) {
          this.selectionListener(-1);
        }
      }
    }
    this.reDraw();
  }

  getSelectedId() {
    let id;
    if (this.selected && this.selected.brandShop) {
      id = this.selected.brandShop;
    } else {
      id = -1;
    }
    return id;
  }

  onSelect() {
    if (this.selected != null) {
      this.selectedOldColor = this.selected.fillColor;
      this.selected.fillColor = this.theme.selected;
      this.reDraw();
    }
  }
  deSelectAll() {
    if (this.selected != null) {
      this.selected.fillColor = this.selectedOldColor;
      this.reDraw();
    }
  }
  translate(vec) {
    this.renderer.translate(vec);
  }
  /**
   * 解析数据
   * @param {*} json
   */
  parse(json) {
    this.reset();

    if (this.theme == null) {
      this.theme = default2dTheme;
    }

    this.mall = parseModel(json, this.is3D, this.theme);
    this.showFloor(this.mall.getDefaultFloorId());
    // 设置页面背景色
    this.options.dom.style.background = this.theme.background;
  }
  reDraw() {
    this.renderer.clearBg();
    this.renderer.render(this.mall);
  }
  reset() {
    this.controls.reset();
    this.renderer.reset();
  }
}
