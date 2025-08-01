import { Vector3, Object3D } from 'three';

const PI_2 = Math.PI / 2;

const MOVE_UP = 81; // e
const MOVE_DOWN = 69; // q
const PITCH_UP = 73; // i
const PITCH_DOWN = 75; // k
const YAW_LEFT = 74; // j
const YAW_RIGHT = 76; // l

/**
 * Chunks taken from PointerLockControls and PointerLockControls demo.
 *
 * @see https://github.com/mrdoob/three.js/blob/master/examples/js/controls/PointerLockControls.js
 * @see https://threejs.org/examples/#misc_controls_pointerlock
 */
export default class SimpleFPSControls {
  constructor(object) {
    this.object = object;
    this.enabled = true;
    this.movementSpeed = 50.0;
    this.lookSpeedX = 30.0;
    this.lookSpeedY = 30.0;
    this.minY = Number.NEGATIVE_INFINITY;
    this.maxY = Number.POSITIVE_INFINITY;

    this.pitch = new Object3D();
    this.yaw = new Object3D();
    this.yaw.add(this.pitch);
    this.pitch.add(this.object);

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    this.pitchUp = false;
    this.pitchDown = false;
    this.yawLeft = false;
    this.yawRight = false;

    this.velocity = new Vector3();
    this.direction = new Vector3();

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    document.addEventListener('mousemove', this.onMouseMove, false);
    document.addEventListener('keyup', this.onKeyUp, false);
    document.addEventListener('keydown', this.onKeyDown, false);
  }

  getObject() {
    return this.yaw;
  }

  dispose() {
    document.removeEventListener('mousemove', this.onMouseMove, false);
    document.removeEventListener('keyup', this.onKeyUp, false);
    document.removeEventListener('keydown', this.onKeyDown, false);
  }

  onMouseMove(e) {
    if (!this.enabled || !this.shiftKey) {
      return false;
    }

    let movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    let movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

    this.yaw.rotation.y -= movementX * this.lookSpeedX / 10000;
    this.pitch.rotation.x -= movementY * this.lookSpeedY / 10000;
    this.pitch.rotation.x = Math.max(-PI_2, Math.min(PI_2, this.pitch.rotation.x));
  }

  onKeyDown(e) {
    switch (e.keyCode) {
      case 16: /*shift*/ this.shiftKey = true; break;

      case 38: /*up*/
      case 87: /*W*/ this.moveForward = true; break;

      case 37: /*left*/
      case 65: /*A*/ this.moveLeft = true; break;

      case 40: /*down*/
      case 83: /*S*/ this.moveBackward = true; break;

      case 39: /*right*/
      case 68: /*D*/ this.moveRight = true; break;

      case MOVE_UP: this.moveUp = true; break;
      case MOVE_DOWN: this.moveDown = true; break;

      case PITCH_UP: this.pitchUp = true; break;
      case PITCH_DOWN: this.pitchDown = true; break;

      case YAW_LEFT: this.yawLeft = true; break;
      case YAW_RIGHT: this.yawRight = true; break;
    }
  }

  onKeyUp(e) {
    switch (event.keyCode) {
      case 16: /*ctrl*/ this.shiftKey = false; break;

      case 38: /*up*/
      case 87: /*W*/ this.moveForward = false; break;

      case 37: /*left*/
      case 65: /*A*/ this.moveLeft = false; break;

      case 40: /*down*/
      case 83: /*S*/ this.moveBackward = false; break;

      case 39: /*right*/
      case 68: /*D*/ this.moveRight = false; break;

      case MOVE_UP: this.moveUp = false; break;
      case MOVE_DOWN: this.moveDown = false; break;

      case PITCH_UP: this.pitchUp = false; break;
      case PITCH_DOWN: this.pitchDown = false; break;

      case YAW_LEFT: this.yawLeft = false; break;
      case YAW_RIGHT: this.yawRight = false; break;
    }
  }

  update(delta) {
    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveLeft) - Number(this.moveRight);
    this.direction.normalize(); // this ensures consistent movements in all directions

    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * this.movementSpeed * delta;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * this.movementSpeed * delta;
    }

    if (this.pitchUp || this.pitchDown) {
      this.pitch.rotation.x -= (Number(this.pitchDown) - Number(this.pitchUp)) * this.lookSpeedY / 1000;
      this.pitch.rotation.x = Math.max(-PI_2, Math.min(PI_2, this.pitch.rotation.x));
    }

    if (this.yawLeft || this.yawRight) {
      this.yaw.rotation.y -= (Number(this.yawRight) - Number(this.yawLeft)) * this.lookSpeedX / 1000;
    }

    this.yaw.translateX(this.velocity.x * delta);
    this.yaw.translateZ(this.velocity.z * delta);

    if (this.moveUp || this.moveDown) {
      const y_contrib =  (Number(this.moveUp) - Number(this.moveDown)) / 25;
      this.object.position.y = Math.max(this.minY, Math.min(this.maxY, this.object.position.y - y_contrib));
    }
  }
}