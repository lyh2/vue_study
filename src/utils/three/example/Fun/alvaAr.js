/**
 * 使用alvaAR.js SLAM
 */
import {AlvaAR} from '@/utils/alva/alva_ar';
import { Camera, onFrameFun, resize2cover } from "../../../alva/alvaUtils";
import { ARCameraView } from '../../../alva/view';

export class AlvaARCamera{
    constructor(options={}){
        this._options = options;
        this.config = {
            video:{
                facingMode:'environment',
                aspectRatio:16/9,
                width:{ideal:1280},
            },
            audio:false,
        };
        this.init();
    }

    init(){
        // 创建canvas
        this.$canvas = document.createElement('canvas');
        //this.$canvas.style.zIndex = 0;
        // 初始化Camera 类

        Camera.initialize(this.config).then(media=>{
            this._init(media);
        }).catch(error=>{
            //alert('Camera:'+error);
            console.log('Camera Error:',error);
        });
        this._options.dom.appendChild(this.$canvas);
    }
    async _init(media){
        // 拿到视频元素
        this.video = media.el;
        this._updateSize();

        const ctx = this.$canvas.getContext('2d',{alpha:true,desynchronized:true,willReadFrequently:true});//desynchronized 画布绘制周期与事件循环不同步来减少延迟
        // 加载alvaAR wasm 库
        const alvaWasm = await AlvaAR.Initialize(this.$canvas.width,this.$canvas.height);
        const view =new ARCameraView(this._options.dom,this.$canvas.width,this.$canvas.height);

        // 每30帧执行一次
        onFrameFun(()=>{
            ctx.drawImage(this.video,0,0,this.video.videoWidth,this.video.videoHeight,this.size.x,this.size.y,this.size.width,this.size.height);
            const frame = ctx.getImageData(0,0,this.$canvas.width,this.$canvas.height);
            // 获取姿势
            const pose = alvaWasm.findCameraPose(frame);
            //console.log('pose:',pose,view);
            if(pose !== null){
                view.updateCameraPose(pose);
            }else{
                view.lostCamera();
                // 绘制识别到的轮廓点
                const dots = alvaWasm.getFramePoints();
                for(const p of dots){
                    ctx.fillStyle = 'white';
                    ctx.fillRect(p.x,p.y,2,2);
                }
            }
        },60);
    }
    _windowResizeFun(){
        // 
        this._updateSize();
    }

    _updateSize(){
        this.size = resize2cover(this.video.videoWidth,this.video.videoHeight,window.innerWidth,window.innerHeight);
        
        this.$canvas.width = window.innerWidth;
        this.$canvas.height = window.innerHeight;
        this.video.style.width = this.size.width +'px';
        this.video.style.height = this.size.height +'px';
    }
}