
import {SketchbookOfBase} from "../SketchbookOfBase";
import {IInputReceiver} from "../interfaces/IInputReceiver";
import { IUpdatable } from "../interfaces/IUpdatable";

export class InputManager extends IUpdatable{
    constructor(SketchbookOfBase,domElement){
        this.updateOrder = 3;
        this.world = SketchbookOfBase;
        this.domElement = domElement;
        this.pointerLock = this.world.params.Pointer_Lock;
        this.isLocked = false;
        this.inputReceiver = null;

        this.domElement.addEventListener("mousedown",this.onMouseDown,false);
        document.addEventListener('wheel',this.onMouseWheel,false);
        document.addEventListener("pointerlockchange",this.onPointerlockChange,false);
        document.addEventListener("pointerlockerror",this.onPointerlockError,false);

        document.addEventListener("keydown",this.onKeyDown,false);
        document.addEventListener("keyup",this.onKeyUp,false);

        this.world.registerUpdatable(this);
    }

    update(timeStep,unscaledTimeStep){
        if(this.inputReceiver === null && this.world !== null && this.world.cameraOperator !== null){
            this.setInputReceiver(this.world.cameraOperator);
        }

        this.inputReceiver?.inputReceiverUpdate(unscaledTimeStep);
    }

    setInputReceiver(receiver){
        this.inputReceiver = receiver;
        this.inputReceiver.inputReceiverInit();
    }
    setPointerLock(enabled){
        this.pointerLock = enabled;
    }
    onKeyUp(event){
        if(this.inputReceiver !== null){
            this.inputReceiver.handleKeyboardEvent(event,event.code,false);
        }
    }
    onKeyDown(event){
        if(this.inputReceiver !== null){
            this.inputReceiver.handleKeyboardEvent(event,event.code,true);
        }
    }

    onPointerlockError(){
        console.log("不能执行PointerLockControls API");
    }

    onPointerlockChange(event){
        if(document.pointerLockElement === this.domElement){
            this.domElement.addEventListener("mousemove",this.onMouseMove,false);
            this.domElement.addEventListener("mouseup",this.onMouseUp,false);
            this.isLocked = true;
        }else{
            this.domElement.addEventListener('mousemove',this.onMouseMove,false);
            this.domElement.addEventListener("mouseup",this.onMouseUp,false);
            this.isLocked = false;
        }
    }

    onMouseWheel(event){
        if(this.inputReceiver !== null){
            this.inputReceiver.handleMouseMove(event,event.deltaY);
        }
    }
    onMouseDown(event){
        if(this.pointerLock){
            this.domElement.requestPointerLock();
        }else{
            this.domElement.addEventListener("mousemove",this.onMouseMove,false);
            this.domElement.addEventListener("mouseup",this.onMouseUp,false);
        }

        if(this.inputReceiver !== null){
            this.inputReceiver.handleMouseButton(event,'mouse'+event.button,true);
        }
    }

    onMouseMove(event){
        if(this.inputReceiver !== null){
            this.inputReceiver.handleMouseMove(event,event.movementX,event.movementY);
        }
    }

    onMouseUp(event){
        if(!this.pointerLock){
            this.domElement.removeEvenetListener("mousemove",this.onMouseMove,false);
            this.domElement.removeEvenetListener("mouseup",this.onMouseUp,false);
        }

        if(this.inputReceiver !== null){
            this.inputReceiver.handleMouseButton(event,'mouse'+event.button,false);
        }
    }
}