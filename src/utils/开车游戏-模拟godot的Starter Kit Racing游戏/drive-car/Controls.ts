export class Controls {
  public keys: { [key: string]: boolean };
  public x: number;
  public z: number;
  public touchActive: boolean;
  public touchDirX: number;
  public touchDirY: number;
  public steerPointerId: any;
  public steerStartX: number;
  public steerStartY: number;
  public options: any;

  constructor(options: any) {
    this.options = options;

    this.keys = {};
    this.x = 0;
    this.z = 0;

    // 触摸状态
    this.touchActive = false;
    this.touchDirX = 0; // 触摸摇杆X方向
    this.touchDirY = 0; // 触摸摇杆Y方向
    this.steerPointerId = null;
    this.steerStartX = 0;
    this.steerStartY = 0;

    // 1.添加事件监听
    window.addEventListener('keydown', e => (this.keys[e.code] = true));
    window.addEventListener('keyup', e => (this.keys[e.code] = false));

    // 2.触摸UI初始化
    this.initTouchUI();
  }

  initTouchUI() {
    // 特性检测：仅当设备支持触摸时才创建UI
    // 注意：使用'ontouchstart' in window检测，而不是userAgent嗅探

    if (!('ontouchstart' in window)) return;
    const css = document.createElement('style');
    css.textContent = `
			.touch-controls { position: absolute; bottom: 0; left: 0; right: 0; height: 50%; pointer-events: none; z-index: 10; }
			.steer-zone { position: absolute; left: 0; top: 0; bottom: 0; width: 100%; pointer-events: auto; touch-action: none; }
			.steer-base { position: absolute; bottom: 32px; left: 32px; width: 140px; height: 140px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); }
			.steer-knob { position: absolute; top: 50%; left: 50%; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%; background: rgba(255,255,255,0.35); }
		`;
    document.head.appendChild(css); // 添加样式

    // 创建html
    const container = document.createElement('div');
    container.className = 'touch-controls';

    const steerZone = document.createElement('div');
    steerZone.className = 'steer-zone';

    //
    const base = document.createElement('div');
    base.className = 'steer-base';

    // 摇杆底座和旋转按钮
    const knob = document.createElement('div');
    knob.className = 'steer-knob';
    base.appendChild(knob);
    steerZone.appendChild(base);

    // 组装并添加到页面
    container.appendChild(steerZone);
    this.options.dom.appendChild(container);

    // 摇杆移动的范围：定义摇杆从中心到边缘的最大移动距离
    const steerRange = 40;

    steerZone.addEventListener('pointerdown', e => {
      // 单点触控限制：只处理第一个触摸点，忽略多点触控
      if (this.steerPointerId !== null) return;

      // ------------------------------------------
      steerZone.setPointerCapture(e.pointerId); // 捕获指针:确保后续事件即使离开元素也能触发
      //---------------------------------------------
      // 记录当前活动的指针ID
      this.steerPointerId = e.pointerId;
      this.steerStartX = e.clientX; // 记录触摸起始坐标(用于计算相对移动)
      this.steerStartY = e.clientY;
      this.touchActive = true;
      this.touchDirX = 0; //
      this.touchDirY = 0;
    });
    // 指针移动事件:更新摇杆位置
    steerZone.addEventListener('pointermove', e => {
      // 确保只处理当前活动指针的事件,多点触控安全
      if (e.pointerId !== this.steerPointerId) return;
      //计算相对偏移并归一化到[-1,1],(新位置-原始位置)/范围 = 偏移量
      let dx = (e.clientX - this.steerStartX) / steerRange;
      let dy = (e.clientY - this.steerStartY) / steerRange;
      const mag = Math.sqrt(dx * dx + dy * dy); // 计算偏移量的大小

      if (mag > 1) {
        dx /= mag; // 归一化到[-1,1]
        dy /= mag;
      }

      // 更新触摸方向的状态
      this.touchDirX = dx;
      this.touchDirY = dy;
      // 更新摇杆旋扭视觉位置(60px是旋扭最大移动距离)
      knob.style.transform = `translateX(${this.touchDirX * 60}px, ${this.touchDirY * 60}px)`;
    });

    //
    const endSteer = e => {
      if (e.pointerId !== this.steerPointerId) return;
      this.steerPointerId = null; // 清除指针ID
      this.touchActive = false; // 停用触摸
      this.touchDirX = 0; // 重置X方向
      this.touchDirY = 0; // 重置Y方向
      knob.style.transform = ''; // 重置摇杆旋扭到中心位置
    };

    // 绑定指针结束事件
    steerZone.addEventListener('pointerup', endSteer); // 松开手指,正常抬起
    steerZone.addEventListener('pointercancel', endSteer); // 系统取消(如弹出键盘，来电等)
  }

  /**
   * 更新输入状态（每帧调用）
   *
   * 设计思路：
   * 1. 输入源优先级：触摸 > 游戏手柄 > 键盘（后处理的覆盖先处理的）
   * 2. 死区处理：游戏手柄摇杆微小移动不产生输入，防止漂移
   * 3. 相机感知映射：触摸输入考虑相机45°方位角，正确映射到世界空间
   * 4. 统一输出：所有输入源映射到(x, z)向量，x∈[-1,1]，z∈[-1,1]
   *
   * 处理流程：
   * 1. 键盘输入（基础，最先处理）
   * 2. 游戏手柄输入（覆盖键盘）
   * 3. 触摸输入（最高优先级，最后处理）
   * 4. 状态保存和返回
   *
   * @returns {Object} 标准化输入对象 {x, z, touchActive}
   */
  update() {
    let x = 0,
      z = 0;

    // 1.keyboard
    /** 键盘输入处理
     * wasd和方向键，是累加逻辑，允许多建同时按下(W+D斜向)
     */
    if (this.keys['ArrowUp'] || this.keys['KeyW']) z += 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) z -= 1;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) x -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) x += 1;

    //  2.  Gamepad 手柄输入处理
    /**
     * 使用左摇杆转向，扳机键控制油门刹车
     */
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    // 遍历所有游戏手柄，通常4个
    for (const gp of gamepads) {
      if (!gp) continue;
      // 左摇杆控制方向
      // axes[0]:左摇杆水平轴，范围[-1,1]
      const stickX = gp.axes[0];
      // 死区处理：绝对值大于0.15才有效，防止摇杆的微信漂移
      if (Math.abs(stickX) > 0.15) x = stickX; // 覆盖上面键盘的输入

      // 扳机键处理：RT（右扳机）前进，LT（左扳机）后退
      // 标准Xbox手柄布局：buttons[6]=LT，buttons[7]=RT
      // value范围[0, 1]，0未按下，1完全按下（模拟输入）
      const rt = gp.buttons[7] ? gp.buttons[7].value : 0;
      const lt = gp.buttons[6] ? gp.buttons[6].value : 0;
      // 死区处理：扳机值 > 0.1 才产生输入
      if (rt > 0.1 || lt > 0.1) z = rt - lt;
      break;
    }

    // 3.Touch — joystick mapped to world space (camera is 45° azimuth)
    /**
     * --- 触摸输入处理（最高优先级，覆盖其他输入）---
		// 设计思路：摇杆方向直接映射到世界空间，考虑相机45°方位角
		// 数学原理：屏幕2D摇杆向量 → 世界3D方向向量，再投影到水平面
		// 触摸 — 摇杆映射到世界空间（相机是45°方位角）
		// 注释：相机在Godot中设置为45°方位角，需要补偿这个旋转
		
     */
    if (this.touchActive) {
      // 获取触摸摇杆向量
      const jx = this.touchDirX; // 屏幕X方向(左负右正)
      const jy = this.touchDirY; // 屏幕Y方向(上负下正)
      const mag = Math.sqrt(jx * jx + jy * jy); // 计算摇杆向量大小
      // 死区处理：摇杆大小大于0.15才有效，防止摇杆的微小移动
      // 数学原理：屏幕2D摇杆向量 → 世界3D方向向量，再投影到水平面
      /**
       * 相机角度补偿变换（45°方位角）
       *
       * 数学推导：
       * 1. 屏幕空间向量 (jx, jy)
       * 2. 相机旋转矩阵 R(45°) = [cos45° -sin45°; sin45° cos45°]
       * 3. 逆变换（屏幕到世界）：应用旋转矩阵的逆（转置）
       * 4. cos45° = sin45° = √2/2 ≈ 0.7071 (Math.SQRT1_2)
       *
       * 变换公式：
       * x' =  (jx * cos45° + jy * sin45°) = (jx + jy) * √2/2
       * z' = (-jx * sin45° + jy * cos45°) = (-jx + jy) * √2/2
       *
       * 归一化：除以mag确保输出在单位圆内
       */
      if (mag > 0.15) {
        x = ((jx + jy) * Math.SQRT1_2) / mag;
        z = ((-jx + jy) * Math.SQRT1_2) / mag;
        /**
         * 视觉理解：
         * 屏幕坐标系：         世界坐标系（相机俯视45°）：
         *      ↑ -Y                ↗ +X (东北)
         *      |                  /
         * -X ←   → +X        -Z ←   → +Z (西北↔东南)
         *      |                  \
         *      ↓ +Y                ↘ -X (西南)
         *
         * 当手指在屏幕上向右下移动(jx+, jy+)时：
         * - 屏幕：右下方
         * - 世界：东南方向（+X, +Z）
         */
      }
    }

    this.x = x;
    this.z = z;

    return { x, z, touchActive: this.touchActive };
  }
}
