import { BASEICONS } from '../constaint';

export const default3dTheme = {
  name: '测试3D主题', //theme's name
  background: 0xf2f2f2, //background color

  //building's style
  building: {
    color: 0x000000,
    opacity: 0.1,
    transparent: true,
    depthTest: false,
  },

  //floor's style
  floor: {
    color: 0xe0e0e0,
    opacity: 1,
    transparent: false,
  },

  //selected room's style
  selected: 0xffff55,

  //rooms' style
  room: function (type, category) {
    var roomStyle;
    if (!category) {
      switch (type) {
        case 100: //hollow. u needn't change this color. because i will make a hole on the model in the final version.
          return {
            color: 0xf2f2f2,
            opacity: 0.8,
            transparent: true,
          };
        case 300: //closed area
          return {
            color: 0xaaaaaa,
            opacity: 0.7,
            transparent: true,
          };
        case 400: //empty shop
          return {
            color: 0xd3d3d3,
            opacity: 0.7,
            transparent: true,
          };
        default:
          break;
      }
    }

    switch (category) {
      case 101: //food
        roomStyle = {
          color: 0x1f77b4,
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 102: //retail
        roomStyle = {
          color: 0xaec7e8,
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 103: //toiletry
        roomStyle = {
          color: 0xffbb78,
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 104: //parent-child
        roomStyle = {
          color: 0x98df8a,
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 105: //life services
        roomStyle = {
          color: 0xbcbd22,
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 106: //education
        roomStyle = {
          color: 0x2ca02c,
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 107: //life style
        roomStyle = {
          color: 0xdbdb8d,
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 108: //entertainment
        roomStyle = {
          color: 0x990099, //0xee8a31,
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 109: //others
        roomStyle = {
          color: 0x8c564b,
          opacity: 0.7,
          transparent: true,
        };
        break;
      default:
        roomStyle = {
          color: 0xc49c94,
          opacity: 0.7,
          transparent: true,
        };
        break;
    }
    return roomStyle;
  },

  //room wires' style
  strokeStyle: {
    color: 0x5c4433,
    opacity: 0.5,
    transparent: true,
    linewidth: 2,
  },

  fontStyle: {
    color: 0x231815,
    fontColor: 0x993399,
    fontSize: 40,
    fontFace: 'Helvetica, MicrosoftYaHei ',
  },

  pubPointImg: {
    11001: BASEICONS + '/toilet.png',
    11002: BASEICONS + '/ATM.png',
    11003: BASEICONS + '/water.png',
    11004: BASEICONS + '/muying.png',
    11005: BASEICONS + '/huazhuang.png',
    21001: BASEICONS + '/stair.png',
    22006: BASEICONS + '/entry.png',
    21002: BASEICONS + '/escalator.png',
    21003: BASEICONS + '/lift.png',
  },
};
