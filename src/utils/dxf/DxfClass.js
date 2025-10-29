import { DXFViewer, UNITS } from 'three-dxf-viewer';

/**
 * Three-dxf-viewer 的源代码已经拷贝到当前项目中，
 * 所以可以直接使用源代码进行开发测试学习
 */

export default class DxfClass {
  constructor(options) {
    this.options = options;
  }

  init() {
    const font = './fonts/helvetiker_regular.typeface.json';
    const viewer = new DXFViewer();
    viewer.unit = UNITS.Millimeters;
    return new Promise((resolve, reject) => {
      try {
        viewer.getFromPath('./dxf/2.dxf', font).then(dxfMesh => {
          resolve(dxfMesh);
        });
      } catch (error) {
        reject(error); // 不要忘记错误处理
      }
    });
  }
}
