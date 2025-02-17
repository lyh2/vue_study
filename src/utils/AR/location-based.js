import { SphMercProjection } from "./sphmerc-projection.js";

class LocationBased {
  constructor(scene, camera, options = {}) {
    this._scene = scene;
    this._camera = camera;
    this._proj = new SphMercProjection(); // 摩卡西投影
    this._eventHandlers = {}; // 事件处理
    this._lastCoords = null; // 最后一次移动的坐标
    this._gpsMinDistance = 0; // gps 移动的最小距离
    this._gpsMinAccuracy = 1000; // gps 最小的精度值
    this._watchPositionId = null; // 监听GPS位置更新的句柄
    this.setGpsOptions(options); // 设置GPS 参数
  }

  setProjection(proj) {
    this._proj = proj;
  }
  /**
   * 设置GPS 参数，就是gps 移动的最小距离及精度值，没有传递参数就使用默认值
   * @param {*} options 
   */
  setGpsOptions(options = {}) {
    if (options.gpsMinDistance !== undefined) {
      this._gpsMinDistance = options.gpsMinDistance;
    }
    if (options.gpsMinAccuracy !== undefined) {
      this._gpsMinAccuracy = options.gpsMinAccuracy;
    }
  }
  /**
   * 开启GPS
   * @param {*} maximumAge 
   * @returns 
   */
  startGps(maximumAge = 0) {
    if (this._watchPositionId === null) {
      this._watchPositionId = navigator.geolocation.watchPosition(
        (position) => {
          this._gpsReceived(position); // 传递给该方法，内部更新相机的位置
        },
        (error) => {
          // 获取位置失败
          if (this._eventHandlers["gpserror"]) {
            this._eventHandlers["gpserror"](error.code);
          } else {
            alert(`GPS error: code ${error.code}`);
          }
        },
        {
          enableHighAccuracy: true, // 表示是否启用高精确度模式，如果启用这种模式，浏览器在获取位置信息时可能需要耗费更多的时间。
          maximumAge: maximumAge, // 表示浏览器重新获取位置信息的时间间隔
          //timeout //— 整数： 表示浏览需要在指定的时间内获取位置信息，否则触发errorCallback
        }
      );
      return true;
    }
    return false;
  }
  /**
   * 停止GPS
   * @returns 
   */
  stopGps() {
    if (this._watchPositionId !== null) {
      navigator.geolocation.clearWatch(this._watchPositionId);
      this._watchPositionId = null;
      return true;
    }
    return false;
  }
  /**
   * 模拟gps 数据进行程序测试
   * @param {*} lon 
   * @param {*} lat 
   * @param {*} elev  海拔
   * @param {*} acc 加速精度
   */
  fakeGps(lon, lat, elev = null, acc = 0) {
    if (elev !== null) {
      this.setElevation(elev); // 设置海拔高度
    }
    /**
     * 收到gps 数据
     */
    this._gpsReceived({
      coords: {
        longitude: lon,
        latitude: lat,
        accuracy: acc,
      },
    });
  }
  /**
   * 经纬度转世界坐标值
   * @param {*} lon 
   * @param {*} lat 
   * @returns 
   */
  lonLatToWorldCoords(lon, lat) {
    const projectedPos = this._proj.project(lon, lat);
    return [projectedPos[0], -projectedPos[1]];
  }
  /**
   * 在指定的经纬度地方添加Mesh 3D对象
   * @param {*} object 
   * @param {*} lon 
   * @param {*} lat 
   * @param {*} elev 
   */
  add(object, lon, lat, elev) {
    this.setWorldPosition(object, lon, lat, elev);
    this._scene.add(object);
  }
  /**
   * 设置3D对象的位置数据
   * @param {*} object  THREE.Mesh 对象
   * @param {*} lon 
   * @param {*} lat 
   * @param {*} elev 
   */
  setWorldPosition(object, lon, lat, elev) {
    const worldCoords = this.lonLatToWorldCoords(lon, lat); // 把经纬度值 转成 世界坐标值
    [object.position.x, object.position.z] = worldCoords;
    if (elev !== undefined) {
      object.position.y = elev;
    }
  }
  /**
   * 设置相机的高度值
   * @param {*} elev 
   */
  setElevation(elev) {
    this._camera.position.y = elev;
  }

  on(eventName, eventHandler) {
    this._eventHandlers[eventName] = eventHandler;
  }
  /**
   * 接收到gps 数据
   * @param {*} position 
   */
  _gpsReceived(position) {
    let distMoved = Number.MAX_VALUE;
    // 判断当前得到的gps 数据加速值 是否小于设置的阈值
    if (position.coords.accuracy <= this._gpsMinAccuracy) {
      if (this._lastCoords === null) {
        this._lastCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } else {
        // 计算移动的距离
        distMoved = this._haversineDist(this._lastCoords, position.coords);
      }
      // 距离值  大于 阈值，说明用户也就是相机 进行了移动，更新最后的lastCoords 数据，同时更新相机的位置
      if (distMoved >= this._gpsMinDistance) {
        this._lastCoords.longitude = position.coords.longitude;
        this._lastCoords.latitude = position.coords.latitude;
        // 更新相机的位置
        this.setWorldPosition(
          this._camera,
          position.coords.longitude,
          position.coords.latitude
        );
        if (this._eventHandlers["gpsupdate"]) {
          this._eventHandlers["gpsupdate"](position, distMoved);
        }
      }
    }
  }

  /**
   * Calculate haversine distance between two lat/lon pairs.
   * 计算两组 经纬度坐标之间的距离值，1-cos
   * Taken from original A-Frame components
   */
  _haversineDist(src, dest) {
    const dlongitude = THREE.Math.degToRad(dest.longitude - src.longitude); // 经度值之差
    const dlatitude = THREE.Math.degToRad(dest.latitude - src.latitude); // 纬度值之差

    const a =
      Math.sin(dlatitude / 2) * Math.sin(dlatitude / 2) +
      Math.cos(THREE.Math.degToRad(src.latitude)) *
        Math.cos(THREE.Math.degToRad(dest.latitude)) *
        (Math.sin(dlongitude / 2) * Math.sin(dlongitude / 2));
    const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return angle * 6371000;
  }
}

export { LocationBased };
