import { Reflector } from "three/examples/jsm/objects/Reflector.js";


export default class MirrorMesh{
    constructor(mesh,color=0xffffff){
        this.geometry = mesh.geometry;
        this.meshMirror = new Reflector(this.geometry,{
            clipBias:0,
            textureWidth:1980 * window.devicePixelRatio,
            textureHeight:1980 * window.devicePixelRatio,
            color:color,
        });

        this.meshMirror.position.copy(mesh.position);
        this.meshMirror.rotation.copy(mesh.rotation);
        this.mesh = this.meshMirror;
    }
}