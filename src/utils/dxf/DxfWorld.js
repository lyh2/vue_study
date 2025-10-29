/**
 * Three-dxf-viewer
 */

import * as THREE from 'three';
import DxfClass from './DxfClass';
import { OrbitControls } from 'three/examples/jsm/Addons';

export default class DxfWorld {
  constructor(options) {
    this.options = options;
    this.canvasHeight = window.innerHeight;
    this.canvasWidth = window.innerWidth;

    this.init();
    window.addEventListener(
      'resize',
      () => {
        this.onWindowResize();
      },
      false
    );
  }

  init() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.01,
      10000
    );
    this.camera.position.set(0, 100, 100);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfcfcfc);
    const ambientLight = new THREE.AmbientLight(0xffff, 1.2);

    this.scene.add(ambientLight);
    this.scene.add(new THREE.AxesHelper(200));
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setAnimationLoop(this.animate.bind(this));
    this.options.dom.appendChild(this.renderer.domElement);
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);

    const dxfClass = new DxfClass();
    dxfClass.init().then(res => {
      console.log(res, 21);
      this.scene.add(res);
      this.camera.lookAt(res.position);
    });
  }

  animate() {
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
