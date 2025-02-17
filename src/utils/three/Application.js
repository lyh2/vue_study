/**
 * 应用程序类
 */
import EventEmitter from '../EventEmitter';
import Class3D from './Class3D';

export default class Application extends EventEmitter
{
    
    constructor(_options={})
    {
        super(_options);

        this.name = "应用程序";
        this.type="Application";
        this.text="Application 应用程序入口";
        
        this._class3D = new Class3D(_options);

        this._class3D._init(_options);
        //处理事件监听
        this._initEventListener();
    }

    _initEventListener()
    {
        this.on('_initExample',this._class3D._initExample.bind(this._class3D));
        this.on('_onWindowResizeEvent',this._class3D._onWindowResizeEvent.bind(this._class3D));
        
    }
}