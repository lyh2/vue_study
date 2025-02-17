import Example0 from "./example/Example0";
import Example1 from "./example/Example1";
import Example2 from "./example/Example2";
import Example3 from "./example/Example3";
import Example4 from "./example/Example4";
import Example5 from "./example/Example5";
import Example7 from "./example/Example7";


export default class Class3D
{
    constructor(_options={})
    {
        this.name = 'Class3D';
        this.text = 'Class3D 应用程序类，内部实例化不同的Example对象';
        this.type = 'Class3D';

        this._options = _options;

        this._example = null;
    }

    /**
     * 初始化场景类
     * @param {*} params 
     */
    _init(params={})
    {
        //console.log(params)
        switch(params.exampleId)
        {
            case 0://第一个案例
                this._example = new Example0(this._options);
                this._example._init(params);
                break;
            case 1:// 使用AR
                this._example = new Example1(this._options);
                this._example._init(params);
                break;
            case 2:// 开始学习
                this._example = new Example2(this._options);
                this._example._init(params);
                break; 
            case 3:// 灯光模块
                this._example = new Example3(this._options);
                this._example._init(params);
                break; 
            case 4:// 烟花效果
                this._example = new Example4(this._options);
                this._example._init(params);
                break;
            case 5:// 元宇宙项目
                this._example = new Example5(this._options);
                this._example._init(params);
                break;
            case 7:// 节点编程
                this._example = new Example7(this._options);
                this._example._init(params);
                break;
            default:
                // https://www.jianshu.com/p/cad673817c05 实现火球效果
                // https://wow.techbrood.com/fiddle/44877 实现草地效果
                console.log('传入参数有错误，没有找到指定的案例...');
                break;
        }
        //console.log('example:',this._example)
    }

    /**
     * 窗口改变事件
     * @param {*} params 
     */
    _onWindowResizeEvent(params={})
    {
        this._example._onWindowResizeEvent(params);
    }

    /**
     * 改变案例
     * @param {*} params 
     */
    _changeExample(params={})
    {
        //console.log(params)
        
    }

    
    /**
     * 初始化three.js
     * @param {*} params 
     */
    _destoryCanvas(params={})
    {
        //从DOM 节点中移除 canvas 
       
    }

    _initExample(params={}){
        console.log('到这里来了...',params);
    }




}