import * as THREE from 'three';
import { rigidBody } from 'crashcat';
import { bearing } from '@turf/turf';

// 重用临时对象避免垃圾回收(性能优化)
const _tempVec = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _zAxis = new THREE.Vector3();
const _newZ = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

// 物理参数
const LINEAR_DAMP = 0.1; // 线性阻尼系数，模拟空气阻尼及地面摩擦

/**
 * 角度线性插值函数，处理角度环绕问题
 *
 * 设计思路：
 * 1. 角度插值需要考虑360°环绕，例如从350°到10°应该走20°而不是-340°
 * 2. 通过将差值限制在[-π, π]范围内解决环绕问题
 * 3. 使用while循环处理任意大的角度差
 *
 * 数学原理：
 * - 计算角度差 diff = b - a
 * - 将diff调整到[-π, π]区间：while (diff > π) diff -= 2π; while (diff < -π) diff += 2π
 * - 返回插值结果: a + diff * t
 *
 * @param {number} a - 起始角度（弧度）
 * @param {number} b - 目标角度（弧度）
 * @param {number} t - 插值系数（0-1）
 * @returns {number} 插值后的角度（弧度）
 */
function lerpAngle(a, b, t) {
  let diff = b - a; // 得到角度差值
  // 将角度限制在[-π, π]

  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  return a + diff * t; // 返回线性插值结果
}

export class Vehicle {
  public linearSpeed: number;
  public angularSpeed: number;
  public acceleration: number; // 角速度
  public spherePos: THREE.Vector3; // 球体物理位置
  public sphereVel: THREE.Vector3; // 球体物理速度
  public rigidBody: any; // 物理引擎
  public physicsWorld: any; // 物理世界
  public modelVelocity: THREE.Vector3; // 模型的速度
  public prevModelPos: THREE.Vector3; // 上一帧模型的位置，用于速度计算
  public container: THREE.Group; // 车辆模型容器，用于整体变换
  public bodyNode: THREE.Object3D; //车身节点引用，用于俯仰，侧倾动画
  public wheels: THREE.Object3D[]; // 所有车轮节点数组
  public wheelFL: THREE.Object3D; // 前轮节点引用,用于转向
  public wheelFR: THREE.Object3D; // 前轮节点引用,用于转向
  public wheelBR: THREE.Object3D; // 后轮节点引用,仅用于旋转
  public wheelBL: THREE.Object3D; // 后轮节点引用,仅用于旋转
  public inputX: number; // 左右方向输入,即水平输入(-1.左，0.停止，1.右)
  public inputZ: number; // 前后方向输入,即俯仰输入(-1倒车，0.停止，1前进)
  public driftIntensity: number; // 漂移强度，用于烟雾粒子效果
  constructor() {
    // 运动状态
    this.linearSpeed = 0; // 线性速度，-1.倒车，0.停止，1.前进
    this.angularSpeed = 0; // 角速度
    this.acceleration = 0; // 加速度

    // 物理状态
    this.spherePos = new THREE.Vector3(3.5, 0.5, 5); // 球体物理位置
    this.sphereVel = new THREE.Vector3();

    // 物理引擎使用
    this.rigidBody = null;
    this.physicsWorld = null;

    // 视觉状态
    this.modelVelocity = new THREE.Vector3(); // 模型的速度
    this.prevModelPos = new THREE.Vector3(3.5, 0.5, 5); // 上一帧模型的位置，用于速度计算

    // 模型节点
    this.container = new THREE.Group(); // 车辆模型容器，用于整体变换
    this.bodyNode = null; //车身节点引用，用于俯仰，侧倾动画
    this.wheels = []; // 所有车轮节点数组
    this.wheelFL = null; // 前轮节点引用,用于转向
    this.wheelFR = null; // 前轮节点引用,用于转向
    this.wheelBR = null; // 后轮节点引用,仅用于旋转
    this.wheelBL = null; // 后轮节点引用,仅用于旋转

    // 输入状态
    this.inputX = 0; // 左右方向输入,即水平输入(-1.左，0.停止，1.右)
    this.inputZ = 0; // 前后方向输入,即俯仰输入(-1倒车，0.停止，1前进)

    // 特效状态
    this.driftIntensity = 0; // 漂移强度，用于烟雾粒子效果
  }

  /**
   * 初始化车辆视觉模型
   *
   * 设计思路：
   * 1. 克隆原始模型避免修改共享资源
   * 2. 遍历模型树提取关键节点（车身、车轮）
   * 3. 设置旋转顺序为'YXZ'（Yaw-Pitch-Roll），适合车辆动画，注释：这里为啥顺序是YXZ就是和（Yaw-Pitch-Roll）对应
   * 4. 启用阴影投射和接收，增强视觉真实感
   *
   * 模型节点命名约定（从Godot项目继承）：
   * - 'body': 车身节点
   * - 'wheel_front_left': 前左轮
   * - 'wheel_front_right': 前右轮
   * - 'wheel_back_left': 后左轮
   * - 'wheel_back_right': 后右轮
   *
   * @param {THREE.Object3D} model - 车辆GLTF模型
   * @returns {THREE.Group} 车辆视觉容器
   */
  init(model) {
    // 克隆模型，避免修改原始资源
    const vehicleModel = model.clone(true);
    // 将模型添加到容器中，方便整体变换
    this.container.add(vehicleModel);

    // 遍历模型树，提取关键节点
    vehicleModel.traverse(child => {
      const name = child.name.toLowerCase();
      if (name === 'body') {
        // ------------------------------------------------
        // 设置旋转车身旋转顺序为’YXZ(偏航-俯仰-滚转)‘ 适合车辆控制
        // - __X 轴是车辆的横向轴__（穿过左右车门的方向）
        //- 绕 X 轴旋转 → 车头抬起/低下 = __俯仰（Pitch）__ ✅
        //- __Z 轴是车辆的前方向__（车头朝向）
        //- 绕 Z 轴旋转 → 车身左右翻转 = __侧倾/滚转（Roll）__ ✅

        // -------------------------------------------------
        // 查找车身节点
        child.rotation.order = 'YXZ';
        this.bodyNode = child; // 保持车身的引用
      } else if (name.includes('wheel')) {
        // 车轮也用YXZ旋转顺序
        child.rotation.order = 'YXZ';
        this.wheels.push(child);

        // 根据命名约定识别车轮位置
        if (name.includes('front') && name.includes('left')) this.wheelFL = child;
        if (name.includes('front') && name.includes('right')) this.wheelFR = child;
        if (name.includes('back') && name.includes('left')) this.wheelBL = child;
        if (name.includes('back') && name.includes('right')) this.wheelBR = child;
      }

      // 为所有的网格启用阴影
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return this.container;
  }

  /**
   * 更新车辆状态（每帧调用）
   *
   * 设计思路：
   * 1. 多平台输入处理：触摸、键盘、手柄的统一抽象
   * 2. 物理桥接：将游戏逻辑输入转换为物理引擎力
   * 3. 状态同步：更新视觉位置，计算模型速度
   * 4. 安全检查：防止车辆掉落，重置位置
   *
   * 更新流程：
   * 1. 处理输入 → 2. 计算速度 → 3. 应用物理 → 4. 更新视觉 → 5. 更新动画
   *
   * @param {number} dt - 时间增量（秒）
   * @param {Object} controlsInput - 输入对象 {x, z, touchActive}
   */
  update(dt, controlsInput) {
    // 保持当前帧输入状态
    this.inputX = controlsInput.x;
    this.inputZ = controlsInput.z;

    // -----多平台输入处理-------

    // 触摸控制模式：摇杆直接控制世界空间方向
    if (controlsInput.touchActive && (this.inputX !== 0 || this.inputZ !== 0)) {
      // 触摸输入处理：摇杆映射到世界空间方向
      // 触摸控制更直观，摇杆方向直接决定车辆朝向，自动油门

      // 计算摇杆方向对应产生的目标角度
      const targetAngle = Math.atan2(this.inputX, this.inputZ);

      // 创建目标旋转四元素(绕Y轴旋转targetAngle角度)
      _quat.setFromAxisAngle(_up, targetAngle);

      // 使用球形线性插值平滑转向
      // 1-exp(-3 * dt)
      this.container.quaternion.slerp(_quat, 1 - Math.exp(-3 * dt));

      // 计算当前前向向量
      _forward.set(0, 0, 1).applyQuaternion(this.container.quaternion);

      // 计算当前朝向与目标方向的叉积，得到转向输入
      const cross = _forward.x * this.inputZ - _forward.z * this.inputX;
      this.inputX = -cross * 2;

      //
      this.linearSpeed = THREE.MathUtils.lerp(this.linearSpeed, 1, dt * 6);
    } else {
      // 键盘、手柄控制模式：传统转向+ 油门

      // 确定当前行驶方向(用于正确处理倒车转向)
      let direction = Math.sign(this.linearSpeed);
      if (direction === 0) direction = Math.abs(this.inputZ) > 0.1 ? Math.sin(this.inputZ) : 1;

      // 速度相关转向抓地力：高速时转向更困难
      // 物理原理：真实车辆高速行驶时转向角度受限，防止过度转向
      const steeringGrip = THREE.MathUtils.clamp(Math.abs(this.linearSpeed), 0.2, 1.0);
      // 计算目标角速度
      // - inputX: 水平输入（-1左转，1右转）
      // - steeringGrip: 速度相关转向系数
      // - 4: 转向灵敏度系数
      // - direction: 方向因子（倒车时转向反向）
      const targetAngular = -this.inputX * steeringGrip * 4 * direction;
      // 平滑过渡到目标角速度
      this.angularSpeed = THREE.MathUtils.lerp(this.angularSpeed, targetAngular, dt * 4);

      // 应用角速度旋转车辆
      this.container.rotateY(this.angularSpeed * dt);

      // 速度控制逻辑
      const targetSpeed = this.inputZ;
      if (targetSpeed < 0 && this.linearSpeed > 0.01) {
        // 倒车，但是当前还是在前进，则快速减速到0
        this.linearSpeed = THREE.MathUtils.lerp(this.linearSpeed, 0, dt * 8);
      } else if (targetSpeed < 0) {
        // 倒车：以一半速度倒车
        this.linearSpeed = THREE.MathUtils.lerp(this.linearSpeed, targetSpeed / 2, dt * 2);
      } else {
        // 前进正常加速
        this.linearSpeed = THREE.MathUtils.lerp(this.linearSpeed, targetSpeed, dt * 6);
      }
    }

    // -------车身对齐，防止车辆过渡倾斜

    // 获取当前上方向向量，车辆局部Y轴在世界空间中的方向
    _tempVec.set(0, 1, 0).applyQuaternion(this.container.quaternion);
    // 如果车辆倾斜角度不大，(上方向Y分量> 0.5) 则逐渐对齐到世界Y轴
    if (_tempVec.y > 0.5) {
      // 计算对齐到世界Y轴的目标旋转
      const targetQuaternion = this.alignWithY(this.container.quaternion, _up);
      // 平滑过渡到目标旋转
      this.container.quaternion.slerp(targetQuaternion, 0.2);
    }
    // ---- 应用线性阻尼(模拟空气阻力和地面摩擦)
    this.linearSpeed *= Math.max(0, 1 - LINEAR_DAMP * dt);

    // -- 物理桥接---
    if (this.rigidBody) {
      // 计算当前前向向量，忽略Y分量，只关心水平方向
      _forward.set(0, 0, 1).applyQuaternion(this.container.quaternion);
      _forward.y = 0;
      _forward.normalize();

      // 计算当前右向向量
      _right.set(1, 0, 0).applyQuaternion(this.container.quaternion);
      _right.y = 0;
      _right.normalize();

      // 获取当前角速度
      const angularVelocity = this.rigidBody.motionProperties.angularVelocity;
      // 计算驱动扭矩：线性速度 x 100 x 时间增量
      const drive = this.linearSpeed * 100 * dt;

      //
      rigidBody.setAngularVelocity(this.physicsWorld, this.rigidBody, [
        angularVelocity[0] + _right.x * drive,
        angularVelocity[1],
        angularVelocity[2] + _right.z * drive,
      ]);

      //---同步物理状态到游戏逻辑-----
      const pos = this.rigidBody.position;
      this.spherePos.set(pos[0], pos[1], pos[2]);
      // 更新球体速度
      const vel = this.rigidBody.motionProperties.linearVelocity;
      this.sphereVel.set(vel[0], vel[1], vel[2]);
    }

    //-----计算加速度---
    this.acceleration = THREE.MathUtils.lerp(
      this.acceleration,
      this.linearSpeed + 0.25 * this.linearSpeed * Math.abs(this.linearSpeed),
      dt
    );

    if (this.spherePos.y < -10) {
      if (this.rigidBody) {
        // 重置物理体位置到默认出生点
        rigidBody.setPosition(this.physicsWorld, this.rigidBody, [3.5, 0.5, 5], false);
        // 去除所有的速度
        rigidBody.setLinearVelocity(this.physicsWorld, this.rigidBody, [0, 0, 0]);
        rigidBody.setAngularVelocity(this.physicsWorld, this.rigidBody, [0, 0, 0]);
      }

      // 重置游戏逻辑状态
      this.spherePos.set(3.5, 0.5, 5);
      this.sphereVel.set(0, 0, 0);
      this.linearSpeed = 0;
      this.angularSpeed = 0;
      this.acceleration = 0;

      // 重置模型旋转
      this.container.rotation.set(0, 0, 0);
      this.container.quaternion.identity();
    }

    // ----更新模型的位置----
    this.container.position.set(this.spherePos.x, this.spherePos.y - 0.5, this.spherePos.z);

    if (dt > 0) {
      // 速度 = (当前位置 - 上一帧位置) / 时间增量
      this.modelVelocity.subVectors(this.container.position, this.prevModelPos).divideScalar(dt);
      // 保存当前位置
      this.prevModelPos.copy(this.container.position);
    }

    // ----- 更新动画----
    this.updateBody(dt);

    this.updateWheels(dt);

    // --- 计算漂移强度，用于粒子效果
    this.driftIntensity =
      Math.abs(this.linearSpeed - this.acceleration) +
      (this.bodyNode ? Math.abs(this.bodyNode.rotation.z) * 2 : 0);
  }

  updateWheels(dt) {
    // ----所有车轮的转向动画
    for (const wheel of this.wheels) {
      wheel.rotation.x += this.acceleration;
    }

    // --- 前轮转向动画
    if (this.wheelFL) {
      this.wheelFL.rotation.y = lerpAngle(this.wheelFL.rotation.y, -this.inputX / 1.5, dt * 10);
    }

    if (this.wheelFR) {
      this.wheelFR.rotation.y = lerpAngle(this.wheelFR.rotation.y, -this.inputX / 1.5, dt * 10);
    }
  }
  /**
   * 更新车身动画（俯仰和侧倾）
   *
   * 设计思路：
   * 1. 俯仰动画（绕X轴旋转）：模拟加速/刹车时的车身前后倾斜
   * 2. 侧倾动画（绕Z轴旋转）：模拟转向时的车身左右倾斜
   * 3. 悬架动画（Y轴位置）：模拟悬挂系统的轻微浮动
   *
   * 物理原理：
   * - 加速时重心后移，车头上扬（正俯仰角）
   * - 刹车时重心前移，车头下沉（负俯仰角）
   * - 转向时离心力使车身向外侧倾斜（侧倾角）
   *
   * @param {number} dt - 时间增量（秒）
   */
  updateBody(dt) {
    // 安全检查：确保车身节点存在
    if (!this.bodyNode) return;

    // ------ 俯仰动画(绕X轴旋转) ------
    // 俯仰角度 = -(线性速度 - 加速度) / 6
    // 负号：
    this.bodyNode.rotation.x = lerpAngle(
      this.bodyNode.rotation.x,
      -(this.linearSpeed - this.acceleration) / 6,
      dt * 10
    );

    // ------ 侧倾动画(绕Z轴旋转) ------
    this.bodyNode.rotation.z = lerpAngle(
      this.bodyNode.rotation.z,
      -(this.inputX / 5) * this.linearSpeed,
      dt * 5
    );

    // -- 悬架动画(Y轴位置) --
    this.bodyNode.position.y = THREE.MathUtils.lerp(this.bodyNode.position.y, 0.2, dt * 5);
  }
  /**
   * 将车辆对齐到指定上方向，同时保持前向向量尽可能不变
   *
   * 设计思路：
   * 1. 给定当前旋转和新上方向，计算新的旋转
   * 2. 保持车辆局部Z轴（前向）在水平面的投影不变
   * 3. 通过正交化构建新的坐标系
   *
   * 数学原理：
   * 1. 提取当前局部Z轴（前向向量）
   * 2. 计算X轴 = -(Z轴 × 新Y轴)，确保与Y轴正交
   * 3. 重新计算Z轴 = X轴 × Y轴，确保右手坐标系
   * 4. 从正交基构建旋转矩阵，再转换为四元数
   *
   * 应用场景：防止车辆翻转后无法恢复，但允许漂移时的倾斜
   *
   * @param {THREE.Quaternion} quaternion - 当前旋转
   * @param {THREE.Vector3} newY - 目标上方向（通常为世界Y轴）
   * @returns {THREE.Quaternion} 对齐后的旋转
   */
  alignWithY(quaternion, up) {
    // 1. 提取当前局部Z轴(车辆前进方向)
    _zAxis.set(0, 0, 1).applyQuaternion(quaternion);

    // 计算新的X轴：垂直与新Y轴和当前Z轴，使用叉积获得垂直向量，取反使坐标系保持右手系
    const xAxis = _tempVec.crossVectors(_zAxis, up).negate().normalize();

    // 重新计算Z轴，确保与X轴和Y轴正交
    _newZ.crossVectors(xAxis, up).normalize();

    // 从正交基构建旋转矩阵
    _mat4.makeBasis(xAxis, up, _newZ);

    // 将旋转矩阵转换为四元素返回
    return _quat.setFromRotationMatrix(_mat4);
  }
}
