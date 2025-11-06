import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons';
import { _ball_, _goal_, _pitch_, _pitch_texture_, _team_blue_, _team_red_ } from './constants';

export default class AssetManager {
  constructor(world) {
    this.world = world;
    this.loadingManager = new THREE.LoadingManager();
    this.modelMaps = new Map();
    this.textureMaps = new Map();
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
  }

  async init() {
    this._loadGLTFAssets();
    this._loadTextures();
    this._generateMeshes();

    return new Promise((resolve, reject) => {
      this.loadingManager.onLoad = () => {
        resolve({ msg: '加载完毕', data: '' });
      };
      this.loadingManager.onError = () => {
        reject({ msg: '加载失败', data: '' });
      };
    });
  }

  _generateMeshes() {
    const world = this.world;

    const pitchGeometry = new THREE.PlaneGeometry(
      world.pitchDimension.width,
      world.pitchDimension.height
    );
    pitchGeometry.rotateX(Math.PI * -0.5); // 绕X轴旋转
    const pitchTexture = this.textureMaps.get(_pitch_texture_);
    const pitchMaterial = new THREE.MeshPhongMaterial({
      map: pitchTexture,
    });

    const pitchMesh = new THREE.Mesh(pitchGeometry, pitchMaterial);
    pitchMesh.receiveShadow = true;
    pitchMesh.matrixAutoUpdate = false;
    // 球场
    this.modelMaps.set(_pitch_, pitchMesh);
    // 创建玩家
    const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16);
    /**
     *  - 现在圆柱体的底部在 Y = 0
        - 顶部在 Y = 0.5
        - __原点移动到圆柱体的底部__
     */
    bodyGeometry.translate(0, 0.25, 0); // 改变原点的位置
    const headGeometry = new THREE.ConeGeometry(0.2, 0.2, 16);
    headGeometry.rotateX(Math.PI * 0.5);
    headGeometry.translate(0, 0.3, 0.3); //

    const teamRedMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const teamBlueMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });

    const teamRedMesh = new THREE.Mesh(bodyGeometry, teamRedMaterial);
    teamRedMesh.matrixAutoUpdate = false;
    teamRedMesh.receiveShadow = true;

    const teamBlueMesh = new THREE.Mesh(bodyGeometry, teamBlueMaterial);
    teamBlueMesh.receiveShadow = true;
    teamBlueMesh.matrixAutoUpdate = false;

    const coneRed = new THREE.Mesh(headGeometry, teamRedMaterial);
    coneRed.castShadow = true;
    coneRed.matrixAutoUpdate = false;

    const coneBlue = new THREE.Mesh(headGeometry, teamBlueMaterial);
    coneBlue.receiveShadow = true;
    coneBlue.matrixAutoUpdate = false;

    teamRedMesh.add(coneRed);
    teamBlueMesh.add(coneBlue);
    // 球员
    this.modelMaps.set(_team_blue_, teamBlueMesh);
    this.modelMaps.set(_team_red_, teamRedMesh);

    return this;
  }

  _loadTextures() {
    const pitchTexture = this.textureLoader.load('./yuka-kickoff/textures/pitch_texture.jpg');
    pitchTexture.colorSpace = THREE.SRGBColorSpace;
    this.textureMaps.set(_pitch_texture_, pitchTexture);
    return this;
  }

  _loadGLTFAssets() {
    this.gltfLoader.load('./yuka-kickoff/assets/ball.glb', gltf => {
      const renderComponent = gltf.scene;
      renderComponent.traverse(object => {
        if (object.isMesh) object.position.y = 0.1;
        object.castShadow = true;
        object.matrixAutoUpdate = false;
        object.updateMatrix();
      });

      this.modelMaps.set(_ball_, renderComponent);
    });

    this.gltfLoader.load('./yuka-kickoff/assets/goal.glb', gltf => {
      const renderComponent = gltf.scene;
      renderComponent.traverse(object => {
        object.matrixAutoUpdate = false;
        object.updateMatrix();
      });

      this.modelMaps.set(_goal_, renderComponent);
    });

    return this;
  }
}
