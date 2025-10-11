import GUI from 'three/examples/jsm/libs/lil-gui.module.min';
import { _0_ } from './constaint';
import { unionFloorByBvhCsg } from './bsp';

export class UIManager {
  constructor(_this) {
    this.owner = _this;

    this.gui = new GUI();
    this.options = {
      floorId: this.currentFloorId,
      floors: { all: this.currentFloorId },
      union: () => {
        // 获取并集
        //console.log('并集', this);
        //unionFloor.bind(this.owner)();
        unionFloorByBvhCsg.bind(this.owner)();
      },
      diff: () => {
        // 差集
      },
      selectable: false, // 是否可以选择
    };
    this.unionBtn = null; // 导出合并几何体
    this.diffBtn = null; // 导出差集几何体
    this.init();
  }
  init() {
    // 先处理楼层数据
    const floorsJson = this.owner.mall.jsonData.floors;
    floorsJson.map(item => {
      this.options.floors[item.name] = item.id;
    });
    this.gui.add(this.options, 'floorId', this.options.floors).onChange(value => {
      //console.log('选中的漏乘:', value, this.owner);
      this.owner.showFloorById(value);
      this._update_union_diff_();
    });
    this.unionBtn = this.gui.add(this.options, 'union').name('并集对象');
    this.diffBtn = this.gui.add(this.options, 'diff').name('差集对象');
    this._update_union_diff_();
    // 开启可选功能
    this.gui
      .add(this.options, 'selectable')
      .name('开启Marker可选择:')
      .onChange(value => {
        console.log('可选择:', value);
        this.owner.setSelectable(value);
      });
  }

  _update_union_diff_() {
    if (this.owner.currentFloorId == _0_) {
      // 表示显示的整个楼层，则不能使用导出功能
      this.unionBtn.disable();
      this.diffBtn.disable();
    } else {
      this.unionBtn.enable();
      this.diffBtn.enable();
    }
  }
}
