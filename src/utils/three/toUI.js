/**
 * 应用程序向UI界面发送消息通信
 * 
 */
// @ts-ignore

import EventEmitter from "../EventEmitter";


export default class toUI extends EventEmitter
{
    constructor(_options={})
    {
        super();

        this._initEventToUI();
    }

    _initEventToUI()
    {
        this.on('onOpenDivExample0',onOpenDivExample0);
        
    }
}