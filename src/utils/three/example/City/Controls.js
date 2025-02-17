/**
 * 控制器
 * 
 */
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import perspectiveCamera from "./Camera";

import renderer from "./Renderer";

// 初始化控制器
const orbitControls = new OrbitControls(perspectiveCamera,renderer.domElement);
// 开启阻尼
orbitControls.enableDamping = true;

export default orbitControls;