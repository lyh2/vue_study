
export function createCanvas(width,height){
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
} 

export class Camera{
    static async initialize(constraints =null){
        if('facingMode' in constraints && 'deviceId' in constraints){
            throw new Error(`Camera settings 'deviceId' and 'facingMode' are mutually exclusive互斥不能同时设置`);
        }
        if('facingMode' in constraints && ['environment','user'].indexOf(constraints.facingMode) === -1){
            throw new Error( `Camera settings 'facingMode' can only be 'environment' or 'user'.` );
        }

        const setupUserMediaStream = (permission)=>{
            return new Promise((resolve,reject)=>{
                const onSuccess = (stream)=>{
                    const track = stream.getVideoTracks()[0];
                    if(typeof track === 'undefined'){
                        reject(new Error('访问相机失败:没有权限(No Track)'));
                    }else{
                        const video = document.createElement('video');
                        video.setAttribute('autoplay','autoplay');
                        video.setAttribute('playsinline','playsinline');
                        video.setAttribute('webkit-playsinline','webkit-playsinline');
                        video.srcObject = stream;

                        video.onloadedmetadata=()=>{
                            const settings = track.getSettings();
                            const tw = settings.width;
                            const th = settings.height;
                            const vw = video.videoWidth;
                            const vh = video.videoHeight;

                            if(vw !== tw || vh !== th){
                                console.warn(`Video dimensions mismatch: width: ${ tw }/${ vw }, height: ${ th }/${ vh }`);
                            }

                            video.style.width = vw + 'px';
                            video.style.height = vh +'px';
                            video.width = vw;
                            video.height = vh;
                            video.play();

                            resolve(new Camera(video));
                        }
                    }
                };
                const onFailure = (error)=>{
                    switch( error.name )
                    {
                        case 'NotFoundError':
                        case 'DevicesNotFoundError':
                            reject( new Error( `Failed to access camera: Camera not found.` ) );
                            return;
                        case 'SourceUnavailableError':
                            reject( new Error( `Failed to access camera: Camera busy.` ) );
                            return;
                        case 'PermissionDeniedError':
                        case 'SecurityError':
                            reject( new Error( `Failed to access camera: Permission denied.` ) );
                            return;
                        default:
                            reject( new Error( `Failed to access camera: Rejected.` ) );
                            return;
                    }
                };

                if(permission && permission.state === 'denied'){
                    reject(new Error('访问相机失败,没有权限'));
                    return;
                }

                navigator.mediaDevices.getUserMedia(constraints).then(onSuccess).catch(onFailure);
            });
        };

        if(navigator.permissions && navigator.permissions.query){
            // 查询权限
            return  navigator.permissions.query({name:'camera'}).then(permission=>{
                return setupUserMediaStream(permission);
            }).catch(error=>{
                return setupUserMediaStream();
            });
        
        }else{
            return setupUserMediaStream();
        }
    }

    constructor(videoElement){
        this.el = videoElement;
        this.width = videoElement.videoWidth;
        this.height = videoElement.videoHeight;

        this._canvas = createCanvas(this.width,this.height);
        this._ctx = this._canvas.getContext('2d',{willReadFrequently:true});
    }

    getImageData(){
        this._ctx.clearRect(0,0,this.width,this.height);
        this._ctx.drawImage(this.el,0,0,this.width,this.height);
        return this._ctx.getImageData(0,0,this.width,this.height);
    }
}
/**
 * 进行转换
 * @param {*} srcW 
 * @param {*} srcH 
 * @param {*} dstW 
 * @param {*} dstH 
 * @returns 
 */
export function resize2cover(srcW,srcH,dstW,dstH){
    const rect = {};

    if(dstW / dstH > srcW / srcH){
        const scale = dstW / srcW;
        rect.width = ~~(scale * srcW);// 取整
        rect.height = ~~(scale * srcH);// ~~
        rect.x = 0;
        rect.y = ~~((dstH - rect.height) * 0.5);
    }else{
        const scale = dstH / srcH;
        rect.width = ~~(scale * srcW);
        rect.height = ~~(scale * srcH);
        rect.x = ~~((dstW - rect.width) * 0.5);
        rect.y = 0;
    }
    return rect;
}

export function onFrameFun(frameTickFn,fps=30){
    const fpsInterval = ~~(1000/fps);

    let t1 = performance.now();

    const onAnimationFrame = async()=>{
        const t2 = performance.now();
        const td = t2 - t1;
        if(td > fpsInterval){
            t1 = t2 - (td % fpsInterval);
            if((await frameTickFn(t2)) == false){
                return;
            }
        }

        requestAnimationFrame(onAnimationFrame);
    }
    onAnimationFrame();
}

export const rad2deg =180.0 /Math.PI;
export const deg2rad = Math.PI / 180;

export function isIOS() {
    const ua = navigator.userAgent;

    const isOldiOS = /iPhone|iPad|iPod/.test(ua);
    const isModernIPad = ua.includes("Mac") && typeof document !== "undefined" && "ontouchend" in document;

    return isOldiOS || isModernIPad;
}

export function getScreenOrientation() {
    let orientation = 'unknown';
    switch (screen.orientation.type) {
    case "landscape-primary":// 自然竖屏
        orientation= 'landscape_primary';
        break;
    case "landscape-secondary":
        orientation = 'landscape_secondary';//倒置竖屏
        break;
    case "portrait-secondary":
        orientation = 'portrait_secondary';//向右横屏
        break;
    case "portrait-primary":
        orientation = 'portrait_primary';//向左横屏
        break;
    default:
        console.log("The orientation API isn't supported in this browser :(");
        orientation = 'unknown';

    }
    return orientation;
}

export class Video
{
    /**
     * 
     * @param {*} url 视频地址
     * @param {*} timeout 
     * @returns 
     */
    static async Initialize( url, timeout = 8000 )
    {
        return new Promise( ( resolve, reject ) =>
        {
            let tid = -1;

            const video = document.createElement( 'video' );

            video.src = url;
            video.setAttribute( 'autoplay', 'autoplay' );
            video.setAttribute( 'playsinline', 'playsinline' );
            video.setAttribute( 'webkit-playsinline', 'webkit-playsinline' );
            video.autoplay = true;
            video.muted = true;
            video.loop = true; // note: if loop is true, ended event will not fire
            video.load();

            tid = setTimeout( () =>
            {
                //**超时处理**：定时器用于防止视频加载时间过长而阻塞程序，特别是在网络不佳或视频地址无效时。
                reject( new Error( `Failed to load video: Timed out after ${ timeout }ms.` ) );
            }, timeout );

            video.onerror = () =>
            {
                clearTimeout( tid );

                reject( new Error( `Failed to load video.` ) );
            };

            video.onabort = () =>
            {
                clearTimeout( tid );

                reject( new Error( `Failed to load video: Load aborted.` ) );
            };

            if( video.readyState >= 4 )
            {
                clearTimeout( tid );

                resolve( video );
            }
            else
            {
                video.oncanplaythrough = () =>
                {
                    clearTimeout( tid );

                    if( video.videoWidth === 0 || video.videoHeight === 0 )
                    {
                        reject( new Error( `Failed to load video: Invalid dimensions.` ) );
                    }
                    else
                    {
                        resolve( video );
                    }
                };
            }
        } ).then( video =>
        {
            video.onload = video.onabort = video.onerror = null;

            return new Video( video );
        } );
    }
    /**
     * 
     * @param {video 元素} videoElement 
     */
    constructor( videoElement )
    {
        this.el = videoElement;
        this.width = videoElement.videoWidth;
        this.height = videoElement.videoHeight;

        this._canvas = createCanvas( this.width, this.height );
        this._ctx = this._canvas.getContext( '2d', { willReadFrequently: true } );//HTML Canvas2D中的willReadFrequently属性是一个布尔值，用于控制是否将图像数据缓存在GPU内存中，当设置为true时，浏览器会尽量将图像数据缓存在GPU内存中，从而提高多个getImageData读取操作的速度

        this._lastTime = -1;
        this._imageData = null;
    }

    getImageData()
    {
        const t = this.el.currentTime;

        if( this._lastTime !== t )
        {
            this._lastTime = t;

            this._imageData = null;
        }

        if( this._imageData === null )
        {
            this._ctx.clearRect( 0, 0, this.width, this.height );
            this._ctx.drawImage( this.el, 0, 0, this.width, this.height );

            this._imageData = this._ctx.getImageData( 0, 0, this.width, this.height );
        }

        return this._imageData;
    }
}