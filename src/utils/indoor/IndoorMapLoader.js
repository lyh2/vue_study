import * as THREE from 'three';
import { parseModel } from './Utils';
export default class IndoorMapLoader extends THREE.FileLoader {
  constructor(is3d) {
    super();
    this.is3d = is3d;
    this.withCredentials = false; //
    this.setResponseType('json');
  }
  /**
     * 使用方式：
     * 用 Promise：loader.load(url).then(mall => {...})
        用回调：loader.load(url, mall => {...})
     * @param {*} url - 加载的数据
     * @param {*} callback - 可选回调函数
     */
  loadMap(url, callback) {
    return new Promise((resolve, reject) => {
      this.load(
        url,
        json => {
          // 解析数据
          const mall = parseModel(json, this.is3d);
          if (callback) {
            callback(mall);
          }
          resolve(mall);
        },
        evt => {
          console.log('加载进度条:', evt);
        },
        err => reject(err)
      );
    });
  }
}

/**
 * .load () : undefined
This method needs to be implemented by all concrete loaders. It holds the logic for loading the asset from the backend.

.loadAsync ( url : String, onProgress : Function ) : Promise
url — A string containing the path/URL of the file to be loaded.
onProgress (optional) — A function to be called while the loading is in progress. The argument will be the ProgressEvent instance, which contains .lengthComputable, .total and .loaded. If the server does not set the Content-Length header; .total will be 0.

This method is equivalent to .load, but returns a Promise.

onLoad is handled by Promise.resolve and onError is handled by Promise.reject.

.parse () : undefined
This method needs to be implemented by all concrete loaders. It holds the logic for parsing the asset into three.js entities.

.setCrossOrigin ( crossOrigin : String ) : this
crossOrigin — The crossOrigin string to implement CORS for loading the url from a different domain that allows CORS.

.setWithCredentials ( value : Boolean ) : this
Whether the XMLHttpRequest uses credentials such as cookies, authorization headers or TLS client certificates. See XMLHttpRequest.withCredentials.
Note that this has no effect if you are loading files locally or from the same domain.

.setPath ( path : String ) : this
path — Set the base path for the asset.

.setResourcePath ( resourcePath : String ) : this
resourcePath — Set the base path for dependent resources like textures.

.setRequestHeader ( requestHeader : Object ) : this
requestHeader - key: The name of the header whose value is to be set. value: The value to set as the body of the header.

 */
