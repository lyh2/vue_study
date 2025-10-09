import GUI from 'three/examples/jsm/libs/lil-gui.module.min';
import { _0_ } from './constaint';

export class UIManager {
  constructor(_this) {
    this.owner = _this;

    this.gui = new GUI();
    this.options = {
      floorId: _0_,
      floors: { all: _0_ },
    };
    this.init();
  }
  init() {
    // 先处理楼层数据
    const floorsJson = this.owner.mall.jsonData.floors;
    floorsJson.map(item => {
      this.options.floors[item.name] = item.id;
    });
    this.gui.add(this.options, 'floorId', this.options.floors).onChange(value => {
      //console.log('选中的漏乘:', value);
      this.owner.showFloorById(value);
    });
  }
}
