
export default class EventEmitter
{
    constructor()
    {
        this._events ={};
    }

    on(name,callback)
    {
        if(this._events[name])
        {
            this._events[name].push(callback);
        }
        else
        {
            this._events[name] = [callback];
        }
    }
    /**
     * 触发事件
     * @param {*} name 
     * @param {*} args 
     */
    emit(name,args)
    {
        if(this._events[name])
        {
            this._events[name].forEach(cb=>{
               
                cb(args);
            });
        }
    }

    remove(name,callback)
    {
        if(this._events[name])
        {
            this._events[name] = this._events[name].filter(cb=>cb !== callback);
        }
    }

    once(name,callback)
    {
        const fn = (args)=>{
            callback(args);
            this.remove(name,fn);
        };
        this.on(name,fn);
    }





}