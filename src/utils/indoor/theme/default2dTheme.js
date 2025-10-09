import { BASEICONS } from '../constaint';

export const default2dTheme = {
  name: 'test', //theme's name
  background: '#F2F2F2', //background color

  //building's style
  building: {
    color: '#000000',
    opacity: 0.1,
    transparent: true,
    depthTest: false,
  },

  //floor's style 楼层的演示
  floor: {
    color: '#E0E0E0',
    opacity: 1,
    transparent: false,
  },

  //selected room's style
  selected: '#ffff55',

  //rooms' style 房间设置
  room: function (type /*结构分类*/, category /*功能类型*/) {
    var roomStyle;
    if (!category) {
      // 不存在功能分区
      switch (type) {
        case 100: //hollow. u needn't change this color. because i will make a hole on the model in the final version.
          return {
            color: '#F2F2F2',
            opacity: 0.8,
            transparent: true,
          };
        case 300: //closed area
          return {
            color: '#AAAAAA',
            opacity: 0.7,
            transparent: true,
          };
        case 400: //empty shop
          return {
            color: '#D3D3D3',
            opacity: 0.7,
            transparent: true,
          };
        default:
          break;
      }
    }
    // category：分类，类型
    switch (category) {
      case 101: //food
        roomStyle = {
          color: '#1f77b4',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 102: //retail 零售
        roomStyle = {
          color: '#aec7e8',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 103: //toiletry 厕所
        roomStyle = {
          color: '#ffbb78',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 104: //parent-child
        roomStyle = {
          color: '#98df8a',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 105: //life services 生活服务
        roomStyle = {
          color: '#bcbd22',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 106: //education 教育
        roomStyle = {
          color: '#2ca02c',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 107: //life style 生活方式
        roomStyle = {
          color: '#dbdb8d',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 108: //entertainment 娱乐
        roomStyle = {
          color: '#EE8A31',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 109: //others
        roomStyle = {
          color: '#8c564b',
          opacity: 0.7,
          transparent: true,
        };
        break;
      default:
        roomStyle = {
          color: '#c49c94',
          opacity: 0.7,
          transparent: true,
        };
        break;
    }
    return roomStyle;
  },

  //room wires' style
  strokeStyle: {
    color: '#666666',
    opacity: 0.5,
    transparent: true,
    linewidth: 1,
  },

  fontStyle: {
    opacity: 1,
    textAlign: 'center',
    textBaseline: 'middle',
    color: '#333333',
    fontSize: 13,
    fontFace:
      "'Lantinghei SC', 'Microsoft YaHei', 'Hiragino Sans GB', 'Helvetica Neue', Helvetica, STHeiTi, Arial, sans-serif  ",
  },

  pubPointImg: {
    11001: BASEICONS + '/toilet.png',
    11002: BASEICONS + '/ATM.png',
    21001: BASEICONS + '/stair.png',
    22006: BASEICONS + '/entry.png',
    21002: BASEICONS + '/escalator.png',
    21003: BASEICONS + '/lift.png',
  },
};
