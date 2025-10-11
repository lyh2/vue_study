import { BASEICONS } from '../constaint';

export const testTheme = {
  name: 'picGenTheme', //theme's name
  background: '#F2F2F2', //background color

  //building's style
  building: {
    color: '#000000',
    opacity: 0.1,
    transparent: true,
    depthTest: false,
  },

  //floor's style
  floor: {
    color: '#E0E0E0',
    opacity: 1,
    transparent: false,
  },

  //selected room's style
  selected: '#fffdb0',

  //rooms' style
  room: function (type, category) {
    var roomStyle;
    if (category == undefined) {
      switch (type) {
        case '100': //hollow. u needn't change this color. because i will make a hole on the model in the final version.
          return {
            color: '#F2F2F2',
            opacity: 0.8,
            transparent: true,
          };
        case '300': //closed area
          return {
            color: '#D3D3D3',
            opacity: 0.7,
            transparent: true,
          };
        case '400': //empty shop
          return {
            color: '#D3D3D3',
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
          color: '#D3D3D3',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 102: //retail
        roomStyle = {
          color: '#D3D3D3',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 103: //toiletry
        roomStyle = {
          color: '#D3D3D3',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 104: //parent-child
        roomStyle = {
          color: '#D3D3D3',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 105: //life services
        roomStyle = {
          color: '#D3D3D3',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 106: //education
        roomStyle = {
          color: '#D3D3D3',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 107: //life style
        roomStyle = {
          color: '#D3D3D3',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 108: //entertainment
        roomStyle = {
          color: '#D3D3D3',
          opacity: 0.7,
          transparent: true,
        };
        break;
      case 109: //others
        roomStyle = {
          color: '#D3D3D3',
          opacity: 0.7,
          transparent: true,
        };
        break;
      default:
        roomStyle = {
          color: '#D3D3D3',
          opacity: 0.7,
          transparent: true,
        };
        break;
    }
    return roomStyle;
  },

  //room wires' style
  strokeStyle: {
    color: '#5C4433',
    opacity: 0.5,
    transparent: true,
    linewidth: 1,
  },

  fontStyle: {
    color: '#231815',
    fontColor: '#231815',
    fontSize: 48,
    textBaseline: 'middle',
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
