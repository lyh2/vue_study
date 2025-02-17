// Modified version of THREE.DeviceOrientationControls from three.js
// will use the deviceorientationabsolute event if available

import {
  Euler,
  EventDispatcher,
  MathUtils,
  Quaternion,
  Vector3,
} from "three";

const _zee = new Vector3(0, 0, 1); // 表示空间中的 Z 轴方向，即 (0, 0, 1)。
const _euler = new Euler();
const _q0 = new Quaternion();
const _q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis

const _changeEvent = { type: "change" };

class DeviceOrientationControls extends EventDispatcher {
  constructor(object) {
    super();

    if (window.isSecureContext === false) {
      // 检查是否是安全模式，只有在安全模式下才有作用
      console.error(
        "THREE.DeviceOrientationControls: DeviceOrientationEvent is only available in secure contexts (https)"
      );
    }

    const scope = this;

    const EPS = 0.000001;
    const lastQuaternion = new Quaternion();

    this.object = object;
    this.object.rotation.reorder("YXZ");

    this.enabled = true;

    this.deviceOrientation = {};
    this.screenOrientation = 0;

    this.alphaOffset = 0; // radians

    // 绝对方向发生改变事件
    this.orientationChangeEventName =
      "ondeviceorientationabsolute" in window
        ? "deviceorientationabsolute"
        : "deviceorientation";

      // 设备方向发生改变事件
    const onDeviceOrientationChangeEvent = function (event) {
      scope.deviceOrientation = event;
    };
    // 屏幕方向改变事件，横屏还是竖屏
    const onScreenOrientationChangeEvent = function () {
      scope.screenOrientation = window.orientation || 0; // 判断横屏还是竖屏
    };

    // The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''
    // //α角、β角和γ角形成一组Z-X'-Y'型的固有Tait-Bryan角
    const setObjectQuaternion = function (
      quaternion,
      alpha,
      beta,
      gamma,
      orient
    ) {
      _euler.set(beta, alpha, -gamma, "YXZ"); // 'ZXY' for the device, but 'YXZ' for us

      quaternion.setFromEuler(_euler); // orient the device

      quaternion.multiply(_q1); // camera looks out the back of the device, not the top

      quaternion.multiply(_q0.setFromAxisAngle(_zee, -orient)); // adjust for screen orientation
    };

    // 连接设备变化数据
    this.connect = function () {
      onScreenOrientationChangeEvent(); // run once on load,加载的时候执行一次

      // iOS 13+ 
      if (
        window.DeviceOrientationEvent !== undefined &&
        typeof window.DeviceOrientationEvent.requestPermission === "function"
      ) {
        window.DeviceOrientationEvent.requestPermission()
          .then(function (response) {
            if (response == "granted") {
              window.addEventListener(
                "orientationchange", // 授权成功之后，添加设备方向改变事件
                onScreenOrientationChangeEvent
              );
              window.addEventListener(
                this.orientationChangeEventName,
                onDeviceOrientationChangeEvent
              );
            }
          })
          .catch(function (error) {
            console.error(
              "THREE.DeviceOrientationControls: Unable to use DeviceOrientation API:",
              error
            );
          });
      } else {
        // 不是苹果13+
        window.addEventListener(
          "orientationchange",
          onScreenOrientationChangeEvent
        );
        window.addEventListener(
          this.orientationChangeEventName,
          onDeviceOrientationChangeEvent
        );
      }

      scope.enabled = true;
    };
    // 取消连接
    this.disconnect = function () {
      window.removeEventListener(
        "orientationchange",
        onScreenOrientationChangeEvent
      );
      window.removeEventListener(
        this.orientationChangeEventName,
        onDeviceOrientationChangeEvent
      );

      scope.enabled = false;
    };
    // 更新数据
    this.update = function () {
      if (scope.enabled === false) return;

      const device = scope.deviceOrientation;

      if (device) {
        const alpha = device.alpha
          ? MathUtils.degToRad(device.alpha) + scope.alphaOffset
          : 0; // Z

        const beta = device.beta ? MathUtils.degToRad(device.beta) : 0; // X'

        const gamma = device.gamma ? MathUtils.degToRad(device.gamma) : 0; // Y''

        // 这里判断是横屏还是竖屏
        const orient = scope.screenOrientation
          ? MathUtils.degToRad(scope.screenOrientation)
          : 0; // O

        setObjectQuaternion(
          scope.object.quaternion,
          alpha,
          beta,
          gamma,
          orient
        );

        if (8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {
          lastQuaternion.copy(scope.object.quaternion);
          scope.dispatchEvent(_changeEvent);
        }
      }
    };

    this.dispose = function () {
      scope.disconnect();
    };

    this.connect();
  }
}

export { DeviceOrientationControls };
