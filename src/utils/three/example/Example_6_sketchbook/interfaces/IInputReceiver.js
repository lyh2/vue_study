import {KeyBinding} from "../core/KeyBinding";

export class IInputReceiver{
    constructor(){
        this.actions ={};
    }
    handleKeyboardEvent(event,code,pressed){}
    handleMouseButton(event,code,pressed){}
    handleMouseMove(event,deltaX,deltaY){}
    handleMouseWheel(event,value){}

    inputReceiverInit(){}
    inputReceiverUpdate(timeStep){}

}