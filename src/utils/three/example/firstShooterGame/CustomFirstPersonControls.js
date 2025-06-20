import * as YUKA from 'yuka';
import World from './World.js';

const _half_PI_ = Math.PI * 0.5;// -90 , +90
const direction = new YUKA.Vector3(); // 方向
const velocity = new YUKA.Vector3(); // 速度

let currentSign = 1;
let elapsedTime = 0;

export default class CustomFirstPersonControls extends YUKA.EventDispatcher{
    constructor(owner = null){
        super();

        this.owner = owner; // 代表 this.player

        this.movementX = 0;// mouse left/right
        this.movementY = 0;// mouse up/down

        this.acceleration = 100;
        this.brakingPower = 10;
        this.lookingSpeed = 1;
        this.headMovement = 0.75;

        this.input ={
            forward:false,
            backward:false,
            right:false,
            left:false,
        };

        this._mouseDownHandler = onMouseDown.bind(this);
        this._mouseMoveHandler = _onMouseMove.bind(this);
        this._pointerlockChangeHandler = onPointerlockChange.bind(this);
        this._pointerlockErrorHandler = onPointerlockError.bind(this);
        this._keyDownHandler = onKeyDown.bind(this);
        this._keyUpHandler = onKeyUp.bind(this);

    }
    // 开启事件监听
    connect(){
        document.addEventListener('mousedown',this._mouseDownHandler,false);
        document.addEventListener('mousemove',this._mouseMoveHandler,false);
        document.addEventListener('pointerlockchange',this._pointerlockChangeHandler,false);
        document.addEventListener('pointerlockerror',this._pointerlockErrorHandler,false);
        document.addEventListener('keydown',this._keyDownHandler,false);
        document.addEventListener('keyup',this._keyUpHandler,false);

        document.body.requestPointerLock();
    }

    disconnect(){
        document.removeEventListener( 'mousedown', this._mouseDownHandler, false );
		document.removeEventListener( 'mousemove', this._mouseMoveHandler, false );
		document.removeEventListener( 'pointerlockchange', this._pointerlockChangeHandler, false );
		document.removeEventListener( 'pointerlockerror', this._pointerlockErrorHandler, false );
		document.removeEventListener( 'keydown', this._keyDownHandler, false );
		document.removeEventListener( 'keyup', this._keyUpHandler, false );

    }

    update(delta){
        const input = this.input;
        const owner = this.owner;

        velocity.x -= velocity.x * this.brakingPower * delta;
        velocity.z -= velocity.z * this.brakingPower * delta;

        direction.z = Number(input.forward) - Number(input.backward);
        direction.x = Number(input.left) - Number(input.right);
        direction.normalize();

        if(input.forward || input.backward) velocity.z -= direction.z * this.acceleration * delta;
        if(input.left || input.right) velocity.x -= direction.x * this.acceleration * delta;

        owner.velocity.copy(velocity).applyRotation(owner.rotation);

        const speed = owner.getSpeed();
        elapsedTime += delta * speed;
        // 模拟行走过程中晃动的感觉
        const motion = Math.sin(elapsedTime * this.headMovement);

        this._updateHead(motion);
        this._updateWeapon(motion);
    }

    _updateHead(motion){
        const owner = this.owner;
        const headContainer = owner.headContainer;

        headContainer.position.x = motion * 0.14;
        headContainer.position.y = Math.abs(motion) * 0.12;

        const sign = Math.sign(Math.cos(elapsedTime * this.headMovement)); // -1 到 1 之间的值
        if(sign < currentSign){
            currentSign = sign;
            const audio = World.getInstance().audioMaps.get('step1');
            if(audio.isPlaying === true) audio.stop();
            audio.play();
        }

        if(sign > currentSign){
            currentSign = sign;
            const audio = World.getInstance().audioMaps.get('step2');
            if(audio.isPlaying === true) audio.stop();
            audio.play();
        }
    }

    _updateWeapon(motion){
        const owner = this.owner;
        const weaponContainer = owner.weaponContainer;
        weaponContainer.position.x = motion * 0.005;
        weaponContainer.position.y = Math.abs(motion) * 0.002;
    }
    /**
     * 
     * @param {*} yaw 偏航、
     * @param {*} pitch 俯仰
     * @param {*} roll 
     */
    setRotation(yaw,pitch){
        this.movementX = yaw;
        this.movementY = pitch;

        this.owner.rotation.fromEuler(0,this.movementX,0);
        this.owner.head.rotation.fromEuler(this.movementY,0,0);
    }
}
/**
 * event.which 的值表示鼠标按下的是哪个按钮：
1：表示左键被按下。
2：表示中键（滚轮键）被按下。
3：表示右键被按下。
 * @param {*} event 
 */
function onMouseDown(event){
    
    if(event.which === 1){
        this.owner.weapon.shoot(); // 开枪
    }
}

function _onMouseMove(event){
    this.movementX -= event.movementX * 0.001 * this.lookingSpeed;
    this.movementY -= event.movementY * 0.001 * this.lookingSpeed;

    this.movementY = Math.max(-_half_PI_,Math.min(_half_PI_,this.movementY));

    this.owner.rotation.fromEuler(0,this.movementX,0);//yaw
    this.owner.head.rotation.fromEuler(this.movementY,0,0);//pitch
}

function onPointerlockChange(){
    if(document.pointerLockElement === document.body){
        this.dispatchEvent({type:'lock'});
    }else{
        this.disconnect();
        this.dispatchEvent({type:'unlock'});
    }
}

function onPointerlockError(){
    YUKA.Logger.warn('不能使用Pointer Lock API...');
}

function onKeyDown(event){
    switch(event.keyCode){
        case 38://up
        case 87://w
            this.input.forward = true;
            break;
        case 37:// left
        case 65:// a
            this.input.left = true;
            break;
        case 40:// down
        case 83:// s
            this.input.backward = true;
            break;
        case 39:// right
        case 68:// d
            this.input.right = true;
            break;
        case 82:// r
            this.owner.weapon.reload();
            break;
    }
}

function onKeyUp(event){
    switch(event.keyCode){
        case 38:// up
        case 87:// w
            this.input.forward = false;
            break;
        case 37:// left
        case 65:// a
            this.input.left = false;
            break;
        case 40:// down
        case 83:// s
            this.input.backward = false;
            break;
        case 39:// right 
        case 68:// d
            this.input.right = false;
            break;
    }
}