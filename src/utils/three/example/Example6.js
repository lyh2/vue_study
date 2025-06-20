

export default class Example6{

    constructor(_options={}){
        this._options = _options;
        this._options.url = "./sketchbook/resouces/world.glb";
        this._init();
    }

    _init(){
        this._obj  = new SketchbookOfBase(this._options);
    }

    _onWindowResizeEvent(params={}){
        this._obj._windowResizeFun();
    }
}


