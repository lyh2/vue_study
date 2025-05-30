import {init} from 'recast-navigation';
import {threeToSoloNavMesh, threeToTiledNavMesh, threeToTileCache } from '@recast-navigation/three'


export class UseRecastThree{
    constructor(options={}){
        this.options = options;
        this._init();
    }

    async _init(){
        await init();
        
    }
}