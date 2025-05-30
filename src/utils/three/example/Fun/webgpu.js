
export class WebGPUBase{
    constructor(_options){
        this._options = _options;
        this._init();
    }
    _init(){
        // 创建canvas
        const canvas = document.createElement("canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this._webglStudyRenderer = new WebGPUStudyRenderer({canvas:canvas});
        this._webglStudyRenderer.start();
        this._options.dom.appendChild(canvas);
    }
}

class WebGPUStudyRenderer{
    // API Data Structures  
    constructor(_options={}){
        this._options=_options;
        this._initWGSL();
        this._initData();
    }

    _initWGSL(){

        // 🟦 Shaders
        this.vertWgsl = `
        struct VSOut {
            @builtin(position) Position: vec4<f32>,
            @location(0) color: vec3<f32>,
        };

        @vertex
        fn main(@location(0) inPos: vec3<f32>,
                @location(1) inColor: vec3<f32>) -> VSOut {
            var vsOut: VSOut;
            vsOut.Position = vec4<f32>(inPos, 1.0);
            vsOut.color = inColor;
            return vsOut;
        }`;

        this.fragWgsl = `
        @fragment
        fn main(@location(0) inColor: vec3<f32>) -> @location(0) vec4<f32> {
            return vec4<f32>(inColor, 1.0);
        }
        `;
    }


    _initData(){

        // 🌅 Renderer 创建位置缓冲区
        // 📈 Position Vertex Buffer Data
        this. positions = new Float32Array([
            1.0, -1.0, 0.0,
        -1.0, -1.0, 0.0,
            0.0,  1.0, 0.0
        ]);

        // 🎨 Color Vertex Buffer Data 颜色缓冲区
        this. colors = new Float32Array([
            1.0, 0.0, 0.0, // 🔴
            0.0, 1.0, 0.0, // 🟢
            0.0, 0.0, 1.0  // 🔵
        ]);

        // 📇 Index Buffer Data 索引缓冲区
        this.indices = new Uint16Array([ 0, 1, 2 ]);

    }

    /**
     * 开启渲染引擎
     */
    async start(){
        if(await this._initializeAPI()){
            this.resizeBackings();
            await this.initializeResources();
            this.render();
        }else{
            console.error("Try using any chromium browser's canary build and go to <code>about:flags</code> to <code>enable-unsafe-webgpu</code>.</p>");
        }
    }

    async _initializeAPI(){
        try{
            // WebGPU 入口
            const entry = navigator.gpu;
            if(!entry){
                return false;
            }
            // 物理设备适配器
            this.adapter = await entry.requestAdapter();
            // 逻辑设备
            this.device  = await this.adapter.requestDevice();
            // queue 队列
            this.queue = this.device.queue;

        }catch(e){
            console.error("异常:",e);
            return false;
        }
        return true;
    }

    /**
     * canvas 重新设置大小，帧缓存关联点
     */
    resizeBackings(){
        if(!this.context){
            this.context = this._options.canvas.getContext('webgpu');
            // 配置设备上下文信息
            const canvasConfig= {
                device:this.device,
                alphaMode:'opaque',
                format:'bgra8unorm',
                usage:GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
            };
            this.context.configure(canvasConfig);
        }

        const depthTextureSesc ={
            size:[this._options.canvas.width,this._options.canvas.height,1],
            dimension:'2d',
            format:'depth24plus-stencil8',
            usage:GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        };
        this.depthTexture = this.device.createTexture(depthTextureDesc);
        this.depthTextureView = this.depthTexture.createView();
    }
    /**
     * 初始化资源渲染三角形(缓冲区，shaders，pipeline)
     */
    async initializeResources(){
        // buffers 
        let createBuffer = (arr,usage)=>{
            // align to 4 bytes
            let desc = {
                size:(arr.byteLength + 3) & ~3, // 计算一个数组 arr 的字节长度，并将其向上对齐到最接近的 4 字节边界
                usage,
                mappedAtCreation:true,
            };
            let buffer = this.device.createBuffer(desc);
            const writeArray = arr instanceof Uint16Array ? new Uint16Array(buffer.getMappedRange()) : new Float32Array(buffer.getMappedRange());
            writeArray.set(arr);
            buffer.unmap();
            return buffer;
        };

        this.positionBuffer = createBuffer(positions,GPUBufferUsage.VERTEX);
        this.colorBuffer = createBuffer(colors,GPUBufferUsage.VERTEX);
        this.indexBuffer = createBuffer(indices,GPUBufferUsage.INDEX);

        // shaders 
        const vsmDesc ={
            code:this.vertWgsl
        };
        this.vertModule = this.device.createShaderModule(vsmDesc);

        const fsmDesc = {
            code:this.fragWgsl
        };
        this.fragModule = this.device.createShaderModule(fsmDesc);

        // Graphics Pipeline 

        /* Input Assembly
            dictionary GPUVertexAttribute {
                required GPUVertexFormat format;
                required GPUSize64 offset;

                required GPUIndex32 shaderLocation;
            };
            format, of type GPUVertexFormat
            The GPUVertexFormat of the attribute.

            offset, of type GPUSize64
            The offset, in bytes, from the beginning of the element to the data for the attribute.

            shaderLocation, of type GPUIndex32
            The numeric location associated with this attribute, which will correspond with a "@location" attribute declared in the vertex.module.
        */
        const positionAttributeDesc={
            shaderLocation:0,// [[attribute(0)]]
            offset:0,
            format:'float32x3'
        };

        const colorAttributeDesc={
            shaderLocation:1,// [[attribute(1)]]
            offset:0,
            format:'float32x3'
        };
        const positionBufferDesc = {
            attributes:[positionAttributeDesc],
            arrayStride:4 * 3,// sizeof(float) * 3
            stepMode:'vertex',
        };
        const colorBufferDesc ={
            attributes:[colorAttributeDesc],
            arrayStride:4 * 3,// sizeof(float) * 3,
            stepMode:'vertex',
        };

        // depth
        const depthStencil ={
            depthWriteEnabled:true,
            depthCompare:'less',
            format:'depth24plus-stencil8'
        };
        // uniform data
        const pipelineLayoutDesc ={bindGroupLayouts:[]};
        const layout = this.device.createPipelineLayout(pipelineLayoutDesc);

        // shader stages
        const vertex ={
            module:this.vertModule,
            entryPoint:'main',
            buffers:[positionBufferDesc,colorBufferDesc]
        };

        // color/blend state
        const colorState={
            format:'bgra8unorm',
            writeMask:GPUColorWrite.ALL,
        };

        const fragment={
            module:this.fragModule,
            entryPoint:'main',
            targets:[colorState]
        };
        // 光栅化 Rasterization
        const primitive ={
            frontFace:'cw',
            cullMode:'none',
            topology:'triangle-list',
        };
        const pipelineDesc={
            layout,
            vertex,
            fragment,
            primitive,
            depthStencil
        };
        this.pipeline = this.device.createRenderPipeline(pipelineDesc);
    }

    render=()=>{
        this.colorTexture = this.context.getCurrentTexture();
        this.colorTextureView = this.colorTexture.createView();
        this.encodeCommands();

        requestAnimationFrame(this.render);
    }

    encodeCommands(){
        let colorAttachment = {
            view:this.colorTextureView,
            clearValue:{r:0,g:0,b:0,a:1},
            loadOp:'clear',
            storeOp:'store'
        };

        const depthAttachment = {
            view:this.depthTextureView,
            depthClearValue:1,
            depthLoadOp:'clear',
            depthStoreOp:'store',
            stencilClearValue:0,
            stencilLoadOp:'clwar',
            stencilStoreOp:'store',
        };

        const renderPassDesc ={
            colorAttachments:[colorAttachment],
            depthStencilAttachment:depthAttachment,
        };

        this.commandEncoder = this.device.createCommandENcoder();
        this.passEncoder = this.commandEncoder.beginRenderPass(renderPassDesc);
        this.passEncoder.setPipeline(this.pipeline);
        this.passEncoder.setViewport(0,0,this._options.canvas.width,this._options.canvas.height,0,1);
        this.passEncoder.setScissorRect(0,0,this._options.canvas.width,this._options.canvas.height);
        this.passEncoder.setVertexBuffer(0,this.positionBuffer);
        this.passEncoder.setVertexBuffer(1,this.colorBuffer);
        this.passEncoder.setIndexBuffer(this.indexBuffer,'uint16');
        this.passEncoder.drawIndexed(3,1);
        this.passEncoder.end();

        this.queue.submit([this.commandEncoder.finish()]);

    }
}

export class BaseGPU{
    constructor(options={}){
        this.options = options;

        this.init();
    }

    init(){
        const gpu = navigator.gpu;
        console.log(gpu);
    }

    _windowResizeFun(){
        
    }
}


