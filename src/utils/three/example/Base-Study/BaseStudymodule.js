import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons';

export class MorphAnimation {
  constructor(options) {
    this.options = options;
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x262336);

    const ambientLight = new THREE.AmbientLight(0xffff);
    this.scene.add(ambientLight);
    this.perspectiveCamera = new THREE.PerspectiveCamera(
      74,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );
    this.perspectiveCamera.position.set(0, 20, 20);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setAnimationLoop(this.animate.bind(this));

    this.clock = new THREE.Clock();
    // 添加控制器
    this.orbitControls = new OrbitControls(this.perspectiveCamera, this.renderer.domElement);
    this.createAnimate();

    this.options.dom.appendChild(this.renderer.domElement);
  }
  createAnimate() {
    // 创建box
    const geometry = new THREE.BoxGeometry(5, 5, 5);
    geometry.name = 'box1';

    const targetGeometry = new THREE.BoxGeometry(10, 20, 10);

    const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

    // 设置geometry变形数据
    console.log('geometry:', geometry);
    geometry.morphAttributes.position = [
      targetGeometry.attributes.position,
      boxGeometry.attributes.position,
    ];
    geometry.morphAttributes.position[0].name = 'box2';
    geometry.morphAttributes.position[1].name = 'box3';

    const material = new THREE.MeshLambertMaterial({
      color: 0x00dede,
      flatShading: true,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    mesh.name = '制作变形动画';
    this.scene.add(this.mesh);
    console.log('mesh:', mesh);
    mesh.updateMorphTargets();

    mesh.morphTargetInfluences[0] = 0.5; // 让第 0 个 target 50% 生效
    mesh.morphTargetInfluences[1] = 0.8; // 让第 1 个 target 80% 生效
    const track = new THREE.KeyframeTrack('.morphTargetInfluences[0]', [0, 10, 20], [0, 1, 0]);
    const track2 = new THREE.KeyframeTrack('.morphTargetInfluences[1]', [30, 40, 50], [0, 1, 0]);
    const clip = new THREE.AnimationClip('default', 50, [track, track2]);

    this.mixer = new THREE.AnimationMixer(mesh);
    let action = this.mixer.clipAction(clip);
    action.timeScale = 2; // 设置播放速度

    action.play();
  }
  animate() {
    if (this.mixer) this.mixer.update(this.clock.getDelta());
    this.orbitControls.update();
    if (mesh) console.log(mesh.morphTargetInfluences);
    this.renderer.render(this.scene, this.perspectiveCamera);
  }

  _windowResizeFun() {
    this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    this.perspectiveCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
