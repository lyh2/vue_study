/*
 * @Author: 412285349@qq.com
 * @Date: 2024-10-14 17:15:05
 * @LastEditors: 412285349@qq.com 412285349@qq.com
 * @LastEditTime: 2024-11-18 09:08:09
 * @FilePath: /www/vue_study/src/utils/three/example/Fun/fun8.js
 * @Description: 非TSL 代码
 * 
 */
//import * as AStar from "astar";


import * as THREE from "three";
import { GLTFLoader, Wireframe } from "three/examples/jsm/Addons.js";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { createMountainousTerrain } from "../DijkstrasNav/terrain";
import {  GraphFromMesh } from "../DijkstrasNav/GraphFromMesh";
import {Dijkstras} from '../DijkstrasNav/Dijkstras3D'
import { CreateTextCanvasElement, TextSprite } from 'threejs-text-sprite-creator';


/**
 * 实现室内导航功能
 */
export class RoomNav{
    constructor(_options={}){
        this._options = _options;
        this._width = 0;
        this._height = 0;
        this._gridSize  = 0.2;// 单位长度
        this._wall = null;// 墙体
        this._startPoint =[62,87];// 起点
        //console.log("AStar:",astar);
        this._texture = null;
        this._init();
    }

    _init(){
        // camera
        this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,100);
        this._perspectiveCamera.position.set(0,50,20);
        
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0xffffff);

        const axesHelper = new THREE.AxesHelper(100);
        this._scene.add(axesHelper);
        this._renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._options.dom.appendChild(this._renderer.domElement);

        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

        // 添加环境光
        const ambientLight = new THREE.AmbientLight(0xffffff,1);
        this._scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff,1.1);
        directionalLight.position.set(0,-20,-20);
        this._scene.add(directionalLight);

        this._raycaster = new THREE.Raycaster();
        
        // 加载模型
        const gltfLoader = new GLTFLoader();
        gltfLoader.load("./room/lm2m6.glb",gltf=>{
            //console.log(gltf);
            this._scene.add(gltf.scene);
            const wallMaterial = new THREE.MeshBasicMaterial({
                color:0x4B0082
            });
            // 给地面添加材质
            this._scene.traverse(item=>{
                if(item.name == "Line007" && false){
                    const basicMaterial = new THREE.MeshBasicMaterial({
                        color:0xFF8C00,
                    });
                    //item.material = basicMaterial;
                    // 得到平面的范围
                    item.geometry.computeBoundingBox();
                    //console.log(item.geometry.boundingBox);
                    // 对网格进行整数话
                    const box = item.geometry.boundingBox.max.sub(item.geometry.boundingBox.min);
                    //console.log(box,Math.ceil(box.x),Math.ceil(box.z));

                    //this._width = Math.ceil(box.x);
                    //this._height = Math.ceil(box.z);

                }
                if(item.name == "Rectangle001" && false){
                    
                    //item.material = wallMaterial;
                    // 墙体
                    item.geometry.computeBoundingBox();
                    console.log('item.geometry.boundingBox:',item.geometry.boundingBox);
                    // 对网格进行整数话
                    //const box = item.geometry.boundingBox.max.sub(item.geometry.boundingBox.min);
                    this._areaBox = item.geometry.boundingBox.clone();
                    //console.log(box,Math.ceil(box.x),Math.ceil(box.z));
                    this._min = item.geometry.boundingBox.min.clone();
                    this._max = item.geometry.boundingBox.max.clone();
                    // 测试立方体
                    const cube_1 = new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0xCC00CC}));
                    const cube_2 = cube_1.clone();
                    cube_1.position.copy(this._min.clone());
                    cube_2.position.copy(this._max.clone());
                    this._scene.add(cube_1);
                    this._scene.add(cube_2);
                    const cube_3 = cube_1.clone();
                    const temp = this._min.clone();
                    cube_3.position.set(temp.x,temp.y,this._max.clone().z);
                    this._scene.add(cube_3);


                    let vec = new THREE.Vector3();
                    vec.subVectors(this._max,this._min);
                    this._width = Math.ceil(vec.x / this._gridSize );// 范围不向上取整，也是可以的
                    this._height = Math.ceil(vec.z  / this._gridSize);
                    // 创建一个平面
                    const planeGeometry = new THREE.PlaneGeometry(this._width,this._height,this._width,this._height);
                    const planeMaterial = new THREE.MeshBasicMaterial({color:0x00000,side:THREE.DoubleSide});
                    this._plane = new THREE.Mesh(planeGeometry,planeMaterial);
                    //this._scene.add(this._plane);
                    this._plane.rotateX(Math.PI /2);
                    this._plane.position.y = -5.5;
                    //console.log(vec,this._width,this._height);
                    // 初始化二维地图矩阵
                    this._map = Array.from({ length: this._height }, () => Array(this._width ).fill(1));
                    this._mapXyz = Array.from({ length: this._height }, () => Array(this._width ).fill(0));
                   
                    //console.log('this._map数组：',this._map,this._width,this._height);

                    // 组建二维矩阵
                    for (let i = 0; i < this._height ; i++) {
                        for (let j = 0; j < this._width; j++) {
                            const x = j * this._gridSize  + this._min.x - this._gridSize/2;//j - this._width/2;  //this._width/2 + j * this._gridSize + this._gridSize / 2; // 栅格中心 x 坐标
                            const z = i * this._gridSize + this._min.z - this._gridSize/2;//this._height/2 + i * this._gridSize + this._gridSize / 2; // 栅格中心 z 坐标
                            
                            // 设置光线从上向下发射
                            this._raycaster.set(new THREE.Vector3(x, 10, z), new THREE.Vector3(0, -1, 0));
                            // 检测模型中的所有对象
                            const intersects = this._raycaster.intersectObject(item);
                            if (intersects.length > 0) {
                                //const intersect = intersects[0];
                                //console.log(intersect,'接触对象');
                                // 表示墙体
                                this._map[i][j] = 0; // 1 表示可通行区域
                            }
                            //this._mapXyz[i][j] = x+','+z;
                        }
                    }
                    // 第二种： // 通过墙体进行构建二维数组-中间存在空档的地方
                    // const positions = item.geometry.attributes.position.array;
                    // //console.log("positions=",positions);
                    // for (let i = 0; i < positions.length; i += 3) {
                    //     const x = positions[i];
                    //     const z = positions[i + 2];  // XZ 平面投影

                    //     // 这里将顶点位置转换为网格中的坐标
                    //     const gridX = Math.floor((x - this._min.x) / this._gridSize);
                    //     const gridZ = Math.floor((z - this._min.z) / this._gridSize);

                    //     // 将此坐标标记为障碍物
                    //     this._map[gridZ][gridX] = 0;  // 0表示障碍物   
                    // }
                }
                if(item.name == "shineidimian3"){
                    // 室内地面与路网连在一起,这个模型的坐标系进行了改变，不像上面的
                    item.material = wallMaterial;
                    item.geometry.computeBoundingBox();
                    console.log('item.geometry.boundingBox:',item.geometry.boundingBox);
                    // 对网格进行整数话
                    //console.log(box,Math.ceil(box.x),Math.ceil(box.z));
                    this._min = item.geometry.boundingBox.min.clone();
                    this._max = item.geometry.boundingBox.max.clone();
                    // 测试立方体
                    const cube_1 = new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0xCC00CC}));
                    const cube_2 = cube_1.clone();
                    cube_1.position.copy(this._min.clone());
                    cube_2.position.copy(this._max.clone());
                    this._scene.add(cube_1);
                    this._scene.add(cube_2);
                    const cube_3 = cube_1.clone();
                    const temp = this._min.clone();
                    cube_3.position.set(temp.x,temp.y,this._max.clone().z);
                    this._scene.add(cube_3);


                    let vec = new THREE.Vector3();
                    vec.subVectors(this._max,this._min);
                    this._width = Math.ceil(vec.x / this._gridSize );// 范围不向上取整，也是可以的
                    this._height = Math.ceil(vec.z  / this._gridSize);
                    // 初始化二维地图矩阵
                    this._map = Array.from({ length: this._height }, () => Array(this._width ).fill(0));
                    //console.log('this._map数组：',this._map,this._width,this._height);
                    
                    // 组建二维矩阵
                    for (let i = 0; i < this._height ; i++) {
                        for (let j = 0; j < this._width; j++) {
                            const x = j * this._gridSize  + this._min.x - this._gridSize/2;//j - this._width/2;  //this._width/2 + j * this._gridSize + this._gridSize / 2; // 栅格中心 x 坐标
                            const z = i * this._gridSize + this._min.z - this._gridSize/2;//this._height/2 + i * this._gridSize + this._gridSize / 2; // 栅格中心 z 坐标
                            
                            // 设置光线从上向下发射
                            this._raycaster.set(new THREE.Vector3(x, -10, z), new THREE.Vector3(0, 3, 0));
                            // 检测模型中的所有对象
                            const intersects = this._raycaster.intersectObject(item);
                            if (intersects.length > 0) {
                                //const intersect = intersects[0];
                                //console.log(intersects,'接触对象');
                                // 表示墙体
                                this._map[i][j] = 1; // 1 表示可通行区域
                            }
                        }
                    }
                }
            });

            // 构建AStar 算法
            this._graph = new Graph(this._map);
            // 绘制测试数据
            const cube_4 = new THREE.Mesh(
                new THREE.BoxGeometry(1,0.4,1),
                new THREE.MeshBasicMaterial({color:0xFF8C00})
            );
            const cube_5 = new THREE.Mesh(
                new THREE.BoxGeometry(1,0.4,1),
                new THREE.MeshBasicMaterial({color:0x00FF7F})
            );
            for(let i =0; i < this._map.length && i < 0;i++){
                for(let j = 0; j < this._map[i].length;j++){
                    const temp = {
                        z:i * this._gridSize + this._min.z,
                            y:0,
                            x:j * this._gridSize + this._min.x
                    };
                    if(this._map[i][j] == 0 ){
                        // 表示墙体，使用cube_4
                        let cube_4_clone = cube_4.clone();
                        this._scene.add(cube_4_clone);
                        cube_4_clone.position.set(temp.x,temp.y,temp.z);
                    }else{
                        // 使用cube_5
                        let cube_5_clone = cube_5.clone();
                        //this._scene.add(cube_5_clone);
                        cube_5_clone.position.set(temp.x,temp.y,temp.z);
                    }
                }
            }
        });
        this._pointer = new THREE.Vector2();
        this._addEvent();

        const curve = new THREE.ArcCurve(
            0,  0,            // ax, aY
            20,           // xRadius, yRadius
            0,  2 * Math.PI,  // aStartAngle, aEndAngle
            false,            // aClockwise
            0                 // aRotation
        );

        
        const points = curve.getPoints( 50 );
        const geometry = new THREE.BufferGeometry().setFromPoints( points );
        
        const material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
        
        // Create the final object to add to the scene
        const ellipse = new THREE.Line( geometry, material );
        this._scene.add(ellipse);
        ellipse.position.y = 3;
        ellipse.rotateX(Math.PI /2);

        this._renderer.setAnimationLoop(this._animate.bind(this));
    }
    /**
     * 添加点击事件
     */
    _addEvent(){
        document.addEventListener('click',(e)=>{
            //console.log('点击事件:',e);
            this._pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
	        this._pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

            this._raycaster.setFromCamera( this._pointer, this._perspectiveCamera );

            // calculate objects intersecting the picking ray
            const intersects = this._raycaster.intersectObjects(this._scene.children  );
            console.log('香蕉:',intersects,this._map);
            if(intersects.length > 0){
                if(this._addCube){
                }else{
                    this._addCube = new THREE.Mesh(
                        new THREE.BoxGeometry(this._gridSize,0.2,this._gridSize),
                        new THREE.MeshBasicMaterial({
                            color:0xff0000
                        })
                    );
                    this._scene.add(this._addCube);
                }
                this._addCube.position.copy(intersects[0].point);
                this._addCube.position.y = 0;
                // 把世界坐标点转对象空间坐标点-对象空间Z向上，Y向前，X向右
                const tempV3 = this._addCube.position.clone();// 世界坐标系下的位置
                //let v3 = this._plane.worldToLocal(tempV3);
                //const i = Math.floor((v3.y + this._height/2)/this._gridSize);
                //const  j = Math.floor((v3.x + this._width/2)/this._gridSize);
                // 世界坐标转ij
                const i = Math.floor((tempV3.z - this._min.z)/ this._gridSize); // 2D数组的行
                const j = Math.floor((tempV3.x - this._min.x)/this._gridSize); // 2D 数组的列
                console.log('局部坐标:',tempV3.x,tempV3.z,i,j);
                //console.log('this._mapXyz=',this._mapXyz);
                //console.log(this._graph)
                // 设置起点
                let start = this._graph.grid[this._startPoint[0]][this._startPoint[1]];
                let end = this._graph.grid[i][j];
                let result = astar.search(this._graph,start,end);
                //let result = this._graph.path(10,27,i,j);
                console.log("寻路结果:",result);
                //console.log('45,66=',45 * this._gridSize + this._min.x,66 * this._gridSize + this._min.z);
                // 需要对结果进行处理绘制成线条
                let point3DArr =[];
                if(result.length > 0){
                    for(let i =0; i < result.length;i+=4){
                        let xyz = {
                            // x 代表行也就是3D空间中的z值，y 代表列，也就是3D空间中的x值
                            z:result[i].x * this._gridSize + this._min.z,
                            y:0.1,
                            x:result[i].y * this._gridSize + this._min.x
                        }
                        point3DArr.push(xyz);
                    }

                    //this._drawLine(point3DArr);
                    this._drawTubeLine(this._createCurve(point3DArr));
                }
                //console.log(point3DArr);

            }
            
        },false);
    }
    /**
     * 绘制线条
     * @param {*} pArr 
     */
    _drawLine(pArr){
        let points =[];
        //let geometry = new THREE.BufferGeometry();
        //let vertices = new Float32Array(pArr.length * 3);
        
        for(let i =0; i < pArr.length;i++){
            let x = pArr[i].x;
            let y = pArr[i].y;
            let z = pArr[i].z;


            // vertices[i + 0] = x;
            // vertices[i + 1] = y;
            // vertices[i + 2] = z;
            //const strArr = (this._mapXyz[pArr[i].x][pArr[i].y]).split(",");
            //points.push(new THREE.Vector3(strArr[0] * 1,0.1,strArr[1] * 1));
            
            points.push(new THREE.Vector3(x,y,z));

        }
        //let geometry = new THREE.BufferGeometry().setFromPoints( points );

        //Create a closed wavey loop
        const curve = new THREE.CatmullRomCurve3( points);

        const totalPoints = curve.getPoints( pArr.length * 0.5   );
        const geometry_1 = new THREE.BufferGeometry().setFromPoints( totalPoints );

        const material_1 = new THREE.LineBasicMaterial( { color: 0xff0000 } );

        // Create the final object to add to the scene
        //const curveObject = new THREE.Line( geometry_1, material_1 );
        //geometry.setAttribute("position",new THREE.BufferAttribute( vertices, 3 ));
        const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
        if(this._line){
            this._scene.remove(this._line);
            this._line.geometry.dispose();
            this._line.material.dispose();
            //this._scene.remove(curveObject);
        }
        this._line = new THREE.Line( geometry_1, material_1 );
        this._line.name = "line_"+pArr.length;
        this._scene.add(this._line);
        //this._scene.add(curveObject);
    }

    _drawTubeLine(_options={}){
        // 2. 创建管道体
        const tubeGeometry = new THREE.TubeGeometry(_options.curve, _options.number , 0.3, 8, false);
        // 纹理贴图：一定要使用透明背景的图片，否则贴图会全部叠在一起，看不出来效果
        const texLoader = new THREE.TextureLoader();
        // 图片可以用这张：http://pic.yupoo.com/mazhenghjj/e546038d/9610773f.jpg
        this._texture = texLoader.load('./icons/nav-icon.jpeg'); 
        // 允许横纵设置矩阵
        this._texture.wrapS = THREE.ClampToEdgeWrapping;
        this._texture.wrapT = THREE.RepeatWrapping;
        this._texture.repeat.x = _options.number/2;
        this._texture.repeat.y = 1;
     
        //this._texture.rotation=(Math.PI/2);

        // 3. 创建管道材质
        const tubeMaterial = new THREE.MeshPhongMaterial({
        map: this._texture, // 颜色贴图
        transparent: true,
        color: 0x47d8fa,
        side: THREE.DoubleSide,
        });
        if(this._lineMesh)
        {
            this._scene.remove(this._lineMesh);
            this._lineMesh.geometry.dispose();
            this._lineMesh.material.dispose();
        }
        this._lineMesh = new THREE.Mesh( tubeGeometry, tubeMaterial );
        this._lineMesh.position.y = 0.1;
        // 4. 把几何体（管道）和 材质 生成的网格物体添加到场景中
        this._scene.add( this._lineMesh );
        
        
    }
    _createPath(pointsArr) {
        // 将参数数组转换成点数组的形式
        pointsArr = pointsArr.map((point) => new THREE.Vector3(point.x,point.y,point.z));
        // 自定义三维路径 curvePath
        const path = new THREE.CurvePath();
        for (let i = 0; i < pointsArr.length - 1; i++) {
          // 每两个点之间形成一条三维直线
          const lineCurve = new THREE.LineCurve3(pointsArr[i], pointsArr[i + 1]); 
          // curvePath有一个curves属性，里面存放组成该三维路径的各个子路径
          path.curves.push(lineCurve); 
        }
        return {curve:path,number:pointsArr.length};
       
    }
    /**
     * 绘制流动路线
     * @param {*} pointsArr 
     */
    _createCurve(pointsArr){
        // 将参数数组转换成点数组的形式
        pointsArr = pointsArr.map((point) => new THREE.Vector3(point.x,point.y,point.z));
        // 自定义三维路径 curvePath
        //console.log(pointsArr,2121)
        let curve = new THREE.CatmullRomCurve3(pointsArr,false);
        return {curve:curve,number:pointsArr.length};
    }
    _animate(){
        this._orbitControls.update();
        if(this._texture)
        this._texture.offset.x -= 0.04;
        this._renderer.render(this._scene,this._perspectiveCamera);
    }
    _windowResizeFun(params={}){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}
import { Text } from "troika-three-text";
/**
 * 自定义导航Mesh，并使用Dijkstra算法实现导航
 */
export class DijkstrasThreeNav{
    constructor(_options={}){
        this._options = _options;

        this._init();
    }

    _init(){
        // 创建相机
        this._perspectiveCamera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight,0.1,1000);
        this._perspectiveCamera.position.set(0,100,100);

        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0xf5f5f5);
 // Create:
        this._myText = new Text()
        this._scene.add(this._myText)

        // Set properties to configure:
        this._myText.font = './HarmonyOS_Sans_Light.ttf';
        this._myText.text = 'Hello world!,我是中文,很牛逼的显示中文'
        this._myText.fontSize = 0.2
        this._myText.position.z = -2
        this._myText.color = 0x9966FF

        // 添加文字精灵 1
        const text1 = new TextSprite('第一行文本\n测试\n第三行', {
            fontSize: 100,
            textHeight: 10,
            padding: 3,
            backgroundColor: 'rgba(255,0,0,0.4)',
            borderRadius: [3, 0, 3, 0],
            borderWidth: 0.1,
            offsetY: 10,
            strokeColor: 'green',
            strokeWidth: 1,
        });
        text1.scaleFactor = 0.01;
        text1.lineSpacing = 30;
        this._scene.add(text1);
        
        // 添加文字精灵 2 ，样式复制文字精灵 1 的
        const text2 = new TextSprite('复制', { color: 'yellow' });
        text2.copy(text1);
        text2.position.set(4, 0, 0);
        this._scene.add(text2);
        
        this._renderer = new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setSize(window.innerWidth,window.innerHeight);
        this._options.dom.appendChild(this._renderer.domElement);
        this._renderer.setAnimationLoop(this._animate.bind(this));

        this._orbitControls = new OrbitControls(this._perspectiveCamera,this._renderer.domElement);

        // 辅助
        const axesHelper = new THREE.AxesHelper(100);
        this._scene.add(axesHelper);

        // 创建地形
        //const terrain = createMountainousTerrain({enableWireframe:false,width:20,height:20});
        //this._scene.add(terrain);
        this._raycaster = new THREE.Raycaster();
        this._pointer = new THREE.Vector2();

        // 创建一个平面
        const planeGeometry = new THREE.PlaneGeometry(10,10,10,10);
        const planeMaterial = new THREE.MeshBasicMaterial({
            color:0x996699,
            side:THREE.DoubleSide,
            wireframe:true
        });
        const plane = new THREE.Mesh(planeGeometry,planeMaterial);
        this._scene.add(plane);
        plane.rotateX(Math.PI / 2);

        // 使用平面生成节点
        //this._graph = new Graph(plane);
        //console.log(this._graph);
        //const paths = getShortestPath(0,12,this._graph.nodes);
        //console.log('paths=',paths);
        // 下面是成功的代码，直接通过Mesh 获取路网信息----------------------------
        //plane.geometry.toNonIndexed();
        const graph = new GraphFromMesh(plane);
        console.log('graph',graph)
        const dijkstras = new Dijkstras(graph.nodes);
        //console.log('显示权重：',dijkstras.graph)
        dijkstras.setGraph(graph.edges);
        let path = dijkstras.getPath('index_21','index_110');
        console.log(path)

        this._initIntersect(plane);

        const material = new THREE.LineBasicMaterial({
            color: 0x0000ff,
            linewidth:2
        });
        
        const points = [];
        for(let i = 0; i < path.length;i++){
            points.push( new THREE.Vector3(path[i].position.x,path[i].position.y,path[i].position.z ) );
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints( points );
        
        const line = new THREE.Line( geometry, material );
        plane.add( line );
        line.position.z = -0.1
       
    }
    _initIntersect(plane){
     
        document.addEventListener( 'click',(event)=>{
            this._pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
            this._pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
            
                // update the picking ray with the camera and pointer position
                this._raycaster.setFromCamera( this._pointer, this._perspectiveCamera );

                // calculate objects intersecting the picking ray
                const intersects = this._raycaster.intersectObject( plane ,false);
                console.log('橡胶垫：',intersects)
        } ,false);

    }
    _animate(){
        this._renderer.render(this._scene,this._perspectiveCamera);
        this._orbitControls.update();
        this._myText.sync();// //this._myText.sync()
    }

    _windowResizeFun(params={}){
        this._perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this._perspectiveCamera.updateProjectionMatrix();

        this._renderer.setSize(window.innerWidth,window.innerHeight);
    }
}

