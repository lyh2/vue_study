import * as THREE from 'three';

export function createNameSprites() {
  // 首先清除已经创建的名称
  this.clearChildren(this.pubPointNamesGroup);
  // 获取指定楼层的json数据
  const funcAreaJson = this.mall.getFloorJson(this.mall.getCurrentFloorId()).funcAreas;
  for (let i = 0; i < funcAreaJson.length; i++) {
    const sprite = makeTextSprite(funcAreaJson[i].name, this.theme.fontStyle);
    sprite.oriX = funcAreaJson[i].center[0];
    sprite.oriY = funcAreaJson[i].center[1];
    this.pubPointNamesGroup.add(sprite);
  }
}

/**
 * 创建文字精灵
 * @param {*} text
 * @param {*} parameters
 */
export function makeTextSprite(text, parameters) {
  if (parameters === undefined) parameters = {}; // 判断是否传递参数
  const fontFace = Object.hasOwn(parameters, 'fontFace') ? parameters['fontFace'] : 'Arial';
  const fontSize = Object.hasOwn(parameters, 'fontSize') ? parameters['fontSize'] : 18;
  const borderThickness = Object.hasOwn(parameters, 'borderThickness')
    ? parameters['borderThickness']
    : 2;
  const borderColor = Object.hasOwn(parameters, 'borderColor')
    ? parameters['borderColor']
    : { r: 0, g: 0, b: 0, a: 1.0 };
  const backgroundColor = Object.hasOwn(parameters, 'backgroundColor')
    ? parameters['backgroundColor']
    : { r: 255, g: 255, b: 255, 1: 1 };
  const fontColor = Object.hasOwn(parameters, 'fontColor') ? parameters['fontColor'] : '#000000';

  // 创建canvas 画布
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = 'Bold ' + fontSize + 'px ' + fontFace; // 设置字体类型及大小
  const metrics = context.measureText(text); // 获取字体的尺寸信息

  // 设置背景颜色
  context.fillStyle =
    'rgba(' +
    backgroundColor.r +
    ',' +
    backgroundColor.g +
    ',' +
    backgroundColor.b +
    ',' +
    backgroundColor.a +
    ')';
  context.strokeStyle =
    'rgba(' + borderColor.r + ',' + borderColor.g + ',' + borderColor.b + ',' + borderColor.a + ')';

  // 文字颜色
  context.fillStyle = fontColor;
  context.fillText(text, borderThickness, fontSize + borderThickness);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(100, 50, 1);
  sprite.width = metrics.width;
  sprite.height = fontSize * 1.4;
  sprite.name = text;
  return sprite;
}
