export default class Mall {
  constructor(options = {}) {
    this.options = options;

    this.floors = []; // 存储楼层数组
    this.building = null; // 建筑 对象
    this.root = null; // root scene
    this.is3d = options?.is3d ? options.is3d : true; // 是否是3D模式
    this.jsonData = null; // 原始的JSON数据
    this.currentFloorId = null; // 当前楼层ID
    this.name = 'Mall';
  }
  // 获取建筑ID
  getBuildingId() {
    let id = this.jsonData.building.id; // 商城ID
    return id ? id : -1;
  }
  /**
   * 获取默认楼层ID
   */
  getDefaultFloorId() {
    return this.jsonData.building.defaultFloorId;
  }
  /**
   *
   * @returns - 当前的楼层
   */
  getCurrentFloorId() {
    return this.currentFloorId;
  }
  /**
   *
   * @returns 楼层总数
   */
  getFloorsNum() {
    return this.jsonData.floors.length;
  }
  /**
   * 返回楼层对象
   * @param {*} floorId - 楼层ID
   */
  getFloorById(floorId) {
    for (let i = 0; i < this.floors.length; i++) {
      if (this.floors[i].userData.id == floorId) {
        return this.floors[i];
      }
    }
    return null;
  }
  /**
   * 通过名称查找楼层
   * @param {*} floorName - 楼层名称
   */
  getFloorByName(floorName) {
    for (let i = 0; i < this.floors.length; i++) {
      if (this.floors[i].name == floorName || this.floors[i].enName == floorName) {
        return this.floors[i];
      }
    }
    return null;
  }
  /**
   *
   * @returns - 获取当前楼层信息
   */
  getCurrentFloor() {
    return this.getFloorById(this.currentFloorId);
  }
  /**
   * 获取指定楼层ID的楼层JSON 数据
   * @param {*} floorId
   */
  getFloorJson(floorId) {
    let floorsJson = this.jsonData.floors;
    for (let i = 0; i < floorsJson.length; i++) {
      if (floorId === floorsJson[i].id) {
        return floorsJson[i];
      }
    }
    return null;
  }
  /**
   * 显示指定楼层ID的楼层
   * @param {*} floorId
   */
  showFloor(floorId) {
    if (this.is3d) {
      // 3D空间
      // 设置building outline to invisible
      this.building.visible = false;
      // 设置指定楼层可见
      this.floors.map(item => {
        if (item.userData.id == floorId) {
          item.visible = true;
          item.position.z = 0;
        } else {
          item.visible = false;
        }
      });
    }

    this.currentFloorId = floorId;
  }
  /**
   * 显示所有楼层
   */
  showAllFloors() {
    if (!this.is3d) {
      //only the 3d map can show all the floors
      return;
    }

    this.building.visible = true;
    this.floors.map(item => {
      item.visible = true;
      item.position.z = item.userData.id * item.userData.height;
    });

    this.currentFloorId = 0;
    return this.root;
  }
}

/**
JSON 格式数据:
json={
    'floors':[
        {
            id:// 楼层ID
            name:// 中文名称
            enName://英文名称
            area:// 面积

        },{
        
        }
    ],
    'building':{
        id:// 
    }
}
 */
