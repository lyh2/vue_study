/**
 * tsl-texture 有案例需要学习
 // Important: Use `webgpu` version of Three.js
import * as THREE from 'three/webgpu';

// Import your desired texture
import { polkaDots } from 'tsl-textures/polka-dots';

// Create the renderer. Important: Use `WebGPURenderer`
renderer = new THREE.WebGPURenderer({antialias: true});

// ... Create your Three.js scene, camera, lights, etc.

// Create geometry
const objectGeometry = new THREE.IcosahedronGeometry(1, 12)

// Create material: Important: Use `Node` Material
objectMaterial = new THREE.MeshStandardNodeMaterial({
    color: 0xCCCCCC,
    roughness: 0.5,
    metalness: 0.0,
});

// Apply texture to the material's `colorNode` property
objectMaterial.colorNode = polkaDots ( {
    count: 2,
    size: 0.6,
    blur: 0.22,
    color: new THREE.Color(0),
    background: new THREE.Color(16777215)
} );

// Assign Geometry and Material to a Mesh
object = new THREE.Mesh(objectGeometry, objectMaterial);

// Render
renderer.render( scene, camera );
 */