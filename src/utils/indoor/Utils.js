import Mall from './Mall';
import Rect from './Rect';
import * as THREE from 'three';
import { default2dTheme } from './theme/default2dTheme';
import { default3dTheme } from './theme/default3dTheme';
import { _0_, _build_, _floor_, _plane_, _room_, _root_ } from './constaint';
import SpriteText from 'three-spritetext';
/**
 * 判断是否是移动设备
 * @returns boolen
 */
export function isMobile() {
  let flag = navigator.userAgent.match(
    /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i
  );
  return flag;
}

/**
 * 计算边界像素比
 * 保证返回值在 0 到 0.5 之间，防止边距比例过大或为负
 */
export function computePaddingRatio() {
  const ratio =
    ((isMobile() ? 1280 : 2000) / Math.max(window.innerWidth, window.innerHeight) - 1) / 2;
  return Math.max(0, Math.min(0.5, ratio));
}
/**从一组点位数组里面构造一个矩形，用数组里面的最小及最大值构造。
 * 包含给点所有点的最小矩形
 * @param {*} points - [0,1,2,3,4,5,6,7,8];
 * @returns
 */
export function getBoundingRect(points) {
  let rect = new Rect();
  if (points.length < 2) {
    // 点位数据小于2
    return rect;
  }

  let minX = 9999999,
    minY = 9999999,
    maxX = -9999999,
    maxY = -9999999;
  for (let i = 0; i < points.length - 1; i += 2) {
    // i = 0,i = 2
    if (points[i] > maxX) {
      maxX = points[i];
    }
    if (points[i] < minX) {
      minX = points[i];
    }

    // 0 + 1 , 2 + 1
    if (points[i + 1] > maxY) {
      maxY = points[i + 1];
    }
    if (points[i + 1] < minY) {
      minY = points[i + 1];
    }
  }

  rect.tl = [minX, minY];
  rect.br = [maxX, maxY];
  return rect;
}

/**
 * 解析数据
 * @param {*} json -需要解析的数据
 */
export function parseModel(json, is3d, theme = '') {
  //console.log('加载json数据开始解析:', json);
  const mall = new Mall();

  const parse = () => {
    mall.jsonData = json;
    mall.is3d = is3d; // 是否是3D模式

    // 设置默认主题
    if (theme !== '') {
      // 使用传递进来的主题
    } else {
      if (is3d) {
        theme = default3dTheme;
      } else {
        // 2d 环境
        theme = default2dTheme;
      }
    }
    // 解析处理数据
    let building, shape, extrudeSettings, geometry, material, plane, mesh, points;
    let scale = 0.1, // 楼层缩放系数，让楼层高度扩大10倍
      floorHeight = 0,
      roomHeight = 0, // 房间高度
      buildingHeight = 0; // 计算总楼层的高度
    // 1、创建根节点
    mall.root = new THREE.Object3D(); // 创建一个根节点
    mall.root.name = _root_;
    mall.root.position.set(0, 0, 0);
    // 2、创建楼层
    const floors = json.floors;
    for (let i = 0; i < floors.length; i++) {
      let floor = floors[i];
      const floorObj = new THREE.Object3D(); // 创建一个楼层对象
      floorObj.name = _floor_ + floors[i].id; // 指定楼层的名称
      mall.floors.push(floorObj);
      mall.root.add(floorObj);
      // 创建楼层
      floor.rect = getBoundingRect(floor.outline[0][0]);
      if (is3d) {
        // 计算楼层高度
        floorHeight = floor.high / scale; // 为啥除以0.1 ,扩大10倍

        buildingHeight = Math.abs(floorHeight * floor.id);
        points = parsePoints(floor.outline[0][0]);
        shape = new THREE.Shape(points);
        geometry = new THREE.ShapeGeometry(shape);
        // [1]直接在 geometry 生成后，映射 (x, y, 0) → (x, 0, y)
        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          pos.setXYZ(i, x, 0, -y);
        }
        // [2]使用矩阵改变数据
        // const matrix = new THREE.Matrix4();
        // matrix.makeRotationX(Math.PI / 2); // 或 makeBasis 自定义基变换
        // geometry.applyMatrix4(matrix);
        plane = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({ ...theme.floor, side: THREE.FrontSide })
        );
        plane.position.set(0, 0, 0);
        plane.name = _plane_ + floor.id;
        //console.log('plane:', plane);
        floorObj.add(plane);
        floorObj.position.set(0, floorHeight * floor.id, 0);
        floorObj.userData.height = floorHeight; // 设置楼层间隔高度
        floorObj.userData.points = []; // 存储房间的中心点数据，包含名称等
        floorObj.userData.id = floor.id; // 这个数据应该存储在userData 中
      } else {
        // 创建2D
        floor.strokeStyle = theme.strokeStyle; // 设置 描边样式或描边颜色
        floor.fillColor = theme.floor.color; // 填充颜色
        mall.floors.push(floor);
      }

      // 2、 功能区的几何形状区域
      const funcAreas = floor.funcAreas; //
      for (let j = 0; j < funcAreas.length; j++) {
        let funcArea = funcAreas[j];
        funcArea.rect = getBoundingRect(funcArea.outline[0][0]);
        if (is3d) {
          // 3D 功能区
          points = parsePoints(funcArea.outline[0][0]);
          shape = new THREE.Shape(points); // 创建形状

          floorObj.userData.points.push({
            name: funcArea.name,
            type: funcArea.type,
          });
          roomHeight = floor.high * 3.5;
          // solid model
          extrudeSettings = { depth: roomHeight, bevelEnabled: false /*是否启用斜角（倒角）*/ };
          geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          // 直接在 geometry 生成后，映射 (x, y, 0) → (x, 0, y)
          const pos = geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const z = pos.getZ(i);
            pos.setXYZ(i, x, z, -y);
          }
          material = new THREE.MeshLambertMaterial(
            theme.room(parseInt(funcArea.type), funcArea.category)
          );
          mesh = new THREE.Mesh(geometry, material);
          mesh.userData.type = _room_;
          mesh.userData.id = funcArea.id;
          mesh.userData.height = roomHeight;
          mesh.userData.name = funcArea.name;
          mesh.name = _room_ + funcArea.id;
          floorObj.add(mesh);
        } else {
          // 2D 功能区
          funcArea.fillColor = theme.room(
            parseInt(funcArea.type) /*得到功能区的类型*/,
            funcArea.category /*功能区的类型*/
          ).color;
          funcArea.strokeColor = theme.strokeStyle.color;
        }
      }

      // 3、创建名称
      if (is3d) {
        // pubPoints geometry
        const pubPoints = floor.pubPoints;
        for (let j = 0; j < pubPoints.length; j++) {
          let pubPoint = pubPoints[j];
          //console.log('pubPoint:', pubPoint);
          let point = parsePoints(pubPoint.outline[0][0])[0];
          //console.log(point);
          floorObj.userData.points.push({
            name: pubPoint.name,
            type: pubPoint.type,
            position: new THREE.Vector3(point.x, floorHeight, -point.y),
          });
          // 文字效果放在后面创建
          // const pubPointNameSprite = createSpriteText({
          //   text: pubPoint.name,
          //   x: point.x,
          //   z: roomHeight * 2,
          //   y: point.y,
          // });
          // pubPointNameSprite.name = 'pubPoint_' + j;
          // mesh.add(pubPointNameSprite);
        }
      }
    }
    /**
     * 创建最外层的楼层
     */
    if (is3d) {
      //building geometry // 创建
      building = json.building;
      points = parsePoints(building.outline[0][0]);
      mall.frontAngle = building.frontAngle;
      //mall.newOutline = points;
      //console.log('points:', points, buildingHeight);
      if (points.length > _0_) {
        shape = new THREE.Shape(points);
        extrudeSettings = { depth: buildingHeight, bevelSize: 1, bevelEnabled: true };

        geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(theme.building));
        mall.building = mesh;
        mesh.name = _build_;
        mesh.userData.name = '最外层轮廓';

        //mall.root.add(mesh);
      }
      //mall.root.scale.set(scale, scale, scale);// 暂时不缩放
      //mall.root.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    }

    return mall;
  };
  /**
   * 解析点位到THREE.Vector2,并且移除掉重复的点位
   * @param {*} points
   */
  function parsePoints(points) {
    let shapePoints = [];
    for (let i = 0; i < points.length; i += 2) {
      let point = new THREE.Vector2(points[i], points[i + 1]);
      if (i > _0_) {
        let lastPoint = shapePoints[shapePoints.length - 1]; // 获取最后一组数据
        // xy 两个值的任何一个值不相等就表示不同
        if (point.x != lastPoint.x || point.y != lastPoint.y) {
          shapePoints.push(point);
        }
      } else {
        shapePoints.push(point);
      }
    }
    return shapePoints;
  }

  return parse();
}
/**
 * 创建文本精灵
 */
export function createSpriteText(options = {}) {
  const myText = new SpriteText(options?.text);
  myText.position.x = options.x;
  myText.position.y = options.y;
  myText.position.z = options.z;
  myText.backgroundColor = 'rgba(0,0,0,0)';
  myText.color = '#000000';
  myText.renderOrder = 99; // 设置渲染层级，保证透明度
  return myText;
}
