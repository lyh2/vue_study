import * as THREE from 'three';
import * as CANNON from "cannon";
import {Face} from "three/examples/jsm/math/ConvexHull.js"

export var CannonDebugRenderer = function(scene,world,options={}){
    this.scene  = scene;
    this.world = world;

    this._meshes =[];

    // 创建材质
    this._boxMaterial = new THREE.MeshBasicMaterial({color:0x0000ff,wireframe:true});
    this._triMaterial = new THREE.MeshBasicMaterial({color:0xff0000,wireframe:true});
    this._sphereMaterial = new THREE.MeshBasicMaterial({color:0x00ff00,wireframe:true});

    this._sphereGeometry = new THREE.SphereGeometry(1);
    this._boxGeometry = new THREE.BoxGeometry(1,1,1);
    this._planeGeometry = new THREE.PlaneGeometry(10,10,10,10);
    this._cylinderGeometry = new THREE.CylinderGeometry(1,1,10,10);


}

CannonDebugRenderer.prototype ={
    tempVec0:new CANNON.Vec3(),
    tempVec1:new CANNON.Vec3(),
    tempVec2:new CANNON.Vec3(),
    tempQuat0:new CANNON.Vec3(),

    update:function(){
        let bodies = this.world.bodies;
        let meshes = this._meshes;
        let shapeWorldPosition = this.tempVec0;
        let shapeWorldQuaternion = this.tempQuat0;

        let meshIndex = 0;
        for(let i = 0 ; i < bodies.length;i++){
            let body = bodies[i];

            for(let j =0; j< body.shapes.length;j++){
                let shape = body.shapes[j];

                this._updateMesh(meshIndex,body,shape);
                let mesh = meshes[meshIndex];
                if(mesh){
                    // 得到世界坐标
                    body.interpolatedQuaternion.vmult(body.shapeOffsets[j],shapeWorldPosition);
                    body.interpolatedPosition.vadd(shapeWorldPosition,shapeWorldPosition);

                    // 世界四元素
                    body.quaternion.mult(body.shapeOrientations[j],shapeWorldQuaternion);

                    // 拷贝到meshes 中
                    mesh.position.copy(shapeWorldPosition);
                    mesh.quaternion.copy(shapeWorldQuaternion);
                }
                meshIndex++;
            }
        }

        for(let i = meshIndex ; i < meshes.length;i++){
            let mesh = meshes[i];
            if(mesh){
                this.scene.remove(mesh);
            }
        }
        meshes.length = meshIndex;
    },

    _updateMesh:function(index,body,shape){
        let mesh = this._meshes[index];
        if(!this._typeMatch(mesh,shape)){
            if(mesh){
                this.scene.remove(mesh);
            }
            mesh = this._meshes[index] = this._createMesh(shape);
        }
        this._scaleMesh(mesh,shape);
    },

    _typeMatch:function(mesh,shape){
        if(!mesh){
            return false;
        }

        let geo = mesh.geometry;
        return (
            (geo instanceof THREE.SphereGeometry && shape instanceof CANNON.Shape) ||
            (geo instanceof THREE.BoxGeometry && shape instanceof CANNON.Box) ||
            (geo instanceof THREE.PlaneGeometry && shape instanceof CANNON.Plane) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.ConvexPolyhedron) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.Trimesh) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.Heightfield)
        );
    },

    _createMesh:function(shape){
        let mesh ;
        let yellow = this._shapeMaterial;
        let cyan = this._boxMaterial;
        let purple = this._triMaterial;

        switch(shape.type){
            case CANNON.Shape.types.SPHERE:
                mesh = new THREE.Mesh(this._sphereGeometry,yellow);
                break;
            case CANNON.Shape.types.BOX:
                mesh = new THREE.Mesh(this._boxGeometry,cyan);
                break;
            case CANNON.Shape.types.PLANE:
                mesh = new THREE.Mesh(this._planeGeometry,yellow);
                break;
            case CANNON.Shape.types.CONVEXPOLYHEDRON:
                let geo = new THREE.Geometry();
                for(let i =0; i < shape.vertices.length;i++){
                    let v = shape.vertices[i];
                    geo.vertices.push(new THREE.Vector3(v.x,v.y,v.z));
                }
                /**
                 * 这里的face 使用 new Face() 不对
                 */
                for(let i =0; i < shape.faces.length;i++){
                    let face = shape.faces[i];

                    let a = face[0];
                    for(let j = 1;j < face.length - 1; j ++){
                        let b = face[j];
                        let c = face[j + 1];
                        geo.faces.push((new Face()).create(a,b,c));
                    }
                }
                geo.computeBoundingSphere();
                geo.computeFaceNormals();
                mesh = new THREE.Mesh(geo,cyan);
                shape.geometryId = geo.id;
                break;
            case CANNON.Shape.types.TRIMESH:
                let geometry = new THREE.Geometry();
                let v0 = this.tempVec0;
                let v1 = this.tempVec1;
                let v2 = this.tempVec2;
                for(let i = 0 ; i < shape.indices.length / 3;i++){
                    shape.getTriangleVertices(i,v0,v1,v2);
                    geometry.vertices.push(new THREE.Vector3(v0.x,v0.y,v0.z),new THREE.Vector3(v1.x,v1.y,v1.z),new THREE.Vector3(v2.x,v2.y,v2.z));
                    let j = geometry.vertices.length - 3;
                    geometry.faces.push((new Face()).create(j,j +1,j+2));
                }
                geometry.computeBoundingSphere();
                geometry.computeFaceNormals();
                mesh = new THREE.Mesh(geometry,purple);
                shape.geometryId = geometry.id;
                break;
            case CANNON.Shape.types.HEIGHTFIELD:
                let geometry_ = new THREE.Geometry();
                let v0_ = this.tempVec0;
                let v1_ = this.tempVec1;
                let v2_ = this.tempVec2;
                for(let xi = 0;xi < shape.data.length - 1; xi++){
                    for(let yi = 0;yi < shape.data[xi].length - 1; yi++){
                        for(let k = 0; k < 2 ; k ++){
                            shape.getConvexTrianglePillar(xi,yi,k===0);
                            v0_.copy(shape.pillarConvex.vertices[0]);
                            v1_.copy(shape.pillarConvex.vertices[1]);
                            v2_.copy(shape.pillarConvex.vertices[2]);
                            v0_.vadd(shape.pillarOffset,v0_);
                            v1_.vadd(shape.pillarOffset,v1_);
                            v2_.vadd(shape.pillarOffset,v2_);
                            geometry.vertices.push(new THREE.Vector3(v0_.x,v0_.y,v0_.z),new THREE.Vector3(v1.x,v1.y,v1.z),new THREE.Vector3(v2_.x,v2_.y,v2_.z));
                            let i = geometry.vertices.length - 3;
                            geometry.faces.push((new Face()).create(i ,i + 1,i + 2));
                        }
                    }
                }
                geometry.computeBoundingSphere();
                geometry.computeFaceNormals();
                mesh  = new THREE.Mesh(geometry,purple);
                shape.geometryId = geometry.id;
                break;
        }
        if(mesh){
            this.scene.add(mesh);
        }
        return mesh;
    },

    _scaleMesh:function(mesh,shape){
        switch(shape.type){
            case CANNON.Shape.types.SPHERE:
            let radius  = shape.radius;
            mesh.scale.set(radius,radius,radius);
            break;
        case CANNON.Shape.types.BOX:
            mesh.scale.copy(shape.halfExtents);
            mesh.scale.multiplyScalar(2);
            break;
        case CANNON.Shape.types.CONVEXPOLYHEDRON:
            mesh.scale.set(1,1,1);
            break;
        case CANNON.Shape.types.HEIGHTFILED:
            mesh.scale.set(1,1,1);
            break;
        }
    },
    clearMeshes:function(){
        this._meshes.forEach(mesh=>{
            this.scene.remove(mesh);
        })
    }

}