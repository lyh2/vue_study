import IndoorMap3D from './IndoorMap3D';
import IndoorMap2D from './IndoorMap2D';

export class IndoorMap {
  constructor(options) {
    this.options = options;
    this.is3D = options?.is3D ?? false;
    this.options['is3D'] = this.is3D;
    this.instance = null; // 存储的是实例化对象
    this.init();
  }

  init() {
    // 创建实例化对象
    if (this.is3D) {
      // 创建3D对象
      this.instance = new IndoorMap3D(this.options);
    } else {
      // 创建2D对象
      this.instance = new IndoorMap2D(this.options);
    }
  }

  getInstance() {
    return this.instance;
  }
}
