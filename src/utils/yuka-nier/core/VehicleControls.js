import * as YUKA from 'yuka';

const direction = new YUKA.Vector3();
const target = new YUKA.Vector3();
const currentGamepadValues = {
  buttonPressed: false,
  leftStickX: 0,
  leftStickY: 0,
  rightStickX: 0,
  rightStickY: 0,
};

export default class VehicleControls extends YUKA.EventDispatcher {
  constructor(owner = null /* Player */, camera = null) {
    super();

    this.owner = owner;
    this.camera = camera;

    this.cameraOffset = new YUKA.Vector3(0, 20, 10);
    this.cameraMovementSpeed = 2.5; // 相机移动的速度
    this.rotationSpeed = 5; // 旋转的速度
    this.brakingForce = 10; // 刹车力

    this.movementX = 0; // mouse left/right
    this.movementY = 0; // mouse up/down

    this.input = {
      forward: false,
      backward: false,
      right: false,
      left: false,
      mouseDown: false,
    };

    this.gamepadActive = false; // 游戏手柄是否激活

    this._onMouseUpHandler = onMouseUp.bind(this);
    this._onMouseDownHandler = onMouseDown.bind(this);
    this._onMouseMoveHandler = onMouseMove.bind(this);
    this._onPointerlockChangeHandler = onPointerlockChange.bind(this);
    this._onPointerlockErrorHandler = onPointerlockError.bind(this);
    this._onKeyDownHandler = onKeyDown.bind(this);
    this._onKeyUpHandler = onKeyUp.bind(this);
    this._onGamepadConnectedHandler = onGamepadConnected.bind(this);
    this._onGamepadDisconnectedHandler = onGamepadDisconnected.bind(this);

    window.addEventListener('gamepadconnected', this._onGamepadConnectedHandler);
    window.addEventListener('gamepaddisconnected', this._onGamepadDisconnectedHandler);
  }
  /**
   * 设置玩家的位置
   * @param {*} x
   * @param {*} y
   * @param {*} z
   */
  setPosition(x, y, z) {
    this.owner.position.set(x, y, z);
    this.camera.position.set(x, y, z).add(this.cameraOffset);
    this.camera.lookAt(x, y, z);
  }

  connect() {
    document.addEventListener('mouseup', this._onMouseUpHandler, false);
    document.addEventListener('mousedown', this._onMouseDownHandler, false);
    document.addEventListener('mousemove', this._onMouseMoveHandler, false);
    document.addEventListener('pointerlockchange', this._onPointerlockChangeHandler, false);
    document.addEventListener('pointerlockerror', this._onPointerlockErrorHandler, false);
    document.addEventListener('keydown', this._onKeyDownHandler, false);
    document.addEventListener('keyup', this._onKeyUpHandler, false);

    document.body.requestPointerLock();
  }

  disconnect() {
    document.removeEventListener('mouseup', this._onMouseUpHandler, false);
    document.removeEventListener('mousedown', this._onMouseDownHandler, false);
    document.removeEventListener('mousemove', this._onMouseMoveHandler, false);
    document.removeEventListener('pointerlockchange', this._onPointerlockChangeHandler, false);
    document.removeEventListener('pointerlockerror', this._onPointerlockErrorHandler, false);
    document.removeEventListener('keydown', this._onKeyDownHandler, false);
    document.removeEventListener('keyup', this._onKeyUpHandler, false);
  }

  pollGamepad() {
    const gamepad = getGamepad(); //assuming PS4 gamepad

    if (gamepad) {
      const axes = gamepad.axes;

      currentGamepadValues.leftStickX = Math.abs(axes[0]) < 0.2 ? 0 : axes[0];
      currentGamepadValues.leftStickY = Math.abs(axes[1]) < 0.2 ? 0 : axes[1];
      currentGamepadValues.rightStickX = Math.abs(axes[2]) < 0.2 ? 0 : axes[2];
      currentGamepadValues.rightStickY = Math.abs(axes[3]) < 0.2 ? 0 : axes[3];

      const buttons = gamepad.buttons;
      currentGamepadValues.buttonPressed = buttons[5].pressed;
    }
  }

  update(delta) {
    if (this.gamepadActive === true) {
      // 手柄输入
      this.pollGamepad();
      direction.x = currentGamepadValues.leftStickX;
      direction.z = currentGamepadValues.leftStickY;

      target.set(0, 0, 0);

      target.x = currentGamepadValues.rightStickX;
      target.z = currentGamepadValues.rightStickY;

      if (target.squaredLength() !== 0) {
        target.add(this.owner.position);
        this.owner.lookAt(target);
      }
    } else {
      // mouse input
      const input = this.input;

      direction.z = Number(input.backward) - Number(input.forward);
      direction.x = Number(input.right) - Number(input.left);
      direction.normalize();

      target.set(this.movementX, 0, this.movementY).normalize();
      target.add(this.owner.position);

      this.owner.lookAt(target);
    }

    // update player position
    if (direction.squaredLength() === 0) {
      // 刹车 brake
      this.owner.velocity.x -= this.owner.velocity.x * this.brakingForce * delta;
      this.owner.velocity.z -= this.owner.velocity.z * this.brakingForce * delta;
    } else {
      this.owner.velocity.add(direction);
    }

    // update shooting
    if (this.input.mouseDown || currentGamepadValues.buttonPressed === true) {
      this.owner.shoot();
    }

    // update camera
    const offsetX = this.camera.position.x - this.cameraOffset.x - this.owner.position.x;
    const offsetZ = this.camera.position.z - this.cameraOffset.z - this.camera.position.z;

    if (offsetX !== 0) this.camera.position.x -= offsetX * delta * this.cameraMovementSpeed;
    if (offsetZ !== 0) this.camera.position.z -= offsetZ * delta * this.cameraMovementSpeed;
  }

  exit() {
    document.exitPointerLock(); //
  }
  reset() {
    this.input.forward = false;
    this.input.backward = false;
    this.input.left = false;
    this.input.right = false;
    this.input.mouseDown = false;

    currentGamepadValues.leftStickX = 0;
    currentGamepadValues.leftStickY = 0;
    currentGamepadValues.rightStickX = 0;
    currentGamepadValues.rightStickY = 0;
    currentGamepadValues.button = 0;
  }

  resetRotation() {
    this.movementX = 0;
    this.movementY = -1;
    this.owner.rotation.fromEuler(0, Math.PI, 0);
  }
}

/**
 * 获取FPS 游戏手柄
 */
function getGamepad() {
  const gamepads = navigator.getGamepads && navigator.getGamepads();
  for (let i = 0; i < 4; i++) {
    const gamepad = gamepads[i];
    if (gamepad) return gamepad;
  }
  return null;
}

function onMouseDown(event) {
  if (event.which === 1) {
    this.input.mouseDown = true;
  }
}

function onMouseUp(event) {
  if (event.which === 1) {
    this.input.mouseDown = false;
  }
}
/**
 * 负责将鼠标移动转换为游戏角色的旋转控制
 */
function onMouseMove(event) {
  const x = event.movementX / window.screen.width;
  const y = event.movementY / window.screen.height;

  this.movementX += x * this.rotationSpeed;
  this.movementY += y * this.rotationSpeed;

  this.movementX = YUKA.MathUtils.clamp(this.movementX, -1, 1);
  this.movementY = YUKA.MathUtils.clamp(this.movementY, -1, 1);
}

function onPointerlockChange() {
  if (document.pointerLockElement === document.body) {
    this.dispatchEvent({ type: 'lock' });
  } else {
    this.disconnect();
    this.reset();
    this.dispatchEvent({ type: 'unlock' });
  }
}

function onPointerlockError() {
  YUKA.Logger.warn('VehicleControls:Unable to use Pointer Lock API.');
}

function onGamepadConnected() {
  this.gamepadActive = true;
}

function onGamepadDisconnected() {
  this.gamepadActive = false;
}

function onKeyDown(event) {
  switch (event.keyCode) {
    case 38: // up
    case 87: // w
      this.input.forward = true;
      break;
    case 37: // left
    case 65: // a
      this.input.left = true;
      break;
    case 40: // down
    case 83: // s
      this.input.backward = true;
      break;
    case 39: // right
    case 68: // d
      this.input.right = true;
      break;
  }
}

function onKeyUp(event) {
  switch (event.keyCode) {
    case 38: // up
    case 87: // w
      this.input.forward = false;
      break;
    case 37: // left
    case 65: // a
      this.input.left = false;
      break;
    case 40: // down
    case 83: // s
      this.input.backward = false;
      break;
    case 39: // right
    case 68: // d
      this.input.right = false;
      break;
  }
}
