/**
 * 边线效果
 */

export default class MeshEdges {
    constructor(geometry) {
        this.geometry = new THREE.EdgesGeometry(geometry);
        this.material = new THREE.LineBasicMaterial({
            color: 0xffdcde,
        });
        this.mesh = new THREE.LineSegments(this.geometry, this.material);

    }

    remove() {
        this.mesh.removeFromParent();
        // 移除材质
        this.material.dispose();
        // 移除几何体
        this.geometry.dispose();
    }
}