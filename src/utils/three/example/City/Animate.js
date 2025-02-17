/**
 * 动画
 * 
 */

import * as THREE from "three";
import perspectiveCamera from "./Camera";
import renderer from "./Renderer";
import orbitControls from "./Controls";
import scene from "./Scene";

const clock = new THREE.Clock();

function animate(t) {
    orbitControls.update();
    const time = clock.getElapsedTime();

    requestAnimationFrame(animate);

    renderer.render(scene, perspectiveCamera);
}

export default animate;