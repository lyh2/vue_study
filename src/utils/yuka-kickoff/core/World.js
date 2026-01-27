import * as THREE from 'three';
import * as YUKA from 'yuka';
import AssetManager from './AssetManager';
import Goal from '../entities/Goal';
import { _ball_, _goal_, _pitch_, _team_blue_, _team_red_, TEAM } from './constants';
import Pitch from '../entities/Pitch';
import Ball from '../entities/Ball';
import Team from '../entities/Team';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min';
import { OrbitControls } from 'three/examples/jsm/Addons';

export default class World {
  constructor(options) {
    this.options = options;
    this.assetManager = null; // 资源加载管理类
    this.camera = null;
    this.renderer = null;
    this.scene = null;
    this.time = new YUKA.Time();
    this.debug = true;
    this.debugParameter = {
      showAxes: false,
      showWalls: false,
      showRegions: false,
      showSupportSpotsBlue: false,
      showSupportSpotsRed: false,
      showPlayerBlue: false,
      showPlayerRed: false,
    };
    // helpers 对象
    this.axesHelper = null;
    this.regionHelpers = [];
    this.wallHelpers = [];
    this.supportingSpotsRedHelpers = [];
    this.supportingSpotsBlueHelpers = [];
    this.playerRedHelpers = []; // 红队的球员
    this.playerBlueHelpers = [];

    this.entityManager = new YUKA.EntityManager();
    this.goalDimensions = {
      // 球门的宽高设置，在XZ平面的值
      width: 2,
      height: 1,
    };

    this.pitch = null; // 球场对象
    this.pitchDimension = {
      width: 20, // 球场的宽高，在XZ平面的值
      height: 15,
    };
    this.onGoalScored = options.onGoalScored || null; // 进球回调
    this.requestID = null;

    this.onStartAnimation = startAnimationFun.bind(this);
    this.onStopAnimation = stopAnimationFun.bind(this);
    this.onWindowResize = windowResizeFun.bind(this);
    this.init();
  }

  init() {
    // 创建资源加载类
    this.assetManager = new AssetManager(this);
    this.assetManager.init().then(result => {
      if (this.options.onReady) {
        //console.log('result:', result);
        // 通过回调方法，通知UI界面加载完成
        this.options.onReady(result);
      }
      // 创建场景
      this._initScene();
      // 游戏主要对象
      this._initGame();

      if (this.debug) {
        this._initUI();
      }

      this.time.reset();
      this.onStartAnimation();
    });
  }
  // 帧循环中调用
  update() {
    const delta = this.time.update().getDelta();
    this.entityManager.update(delta);

    if (this.debug) {
      this._updateTeamHelpers(
        this.pitch.teamBlue,
        this.supportingSpotsBlueHelpers,
        this.playerBlueHelpers
      );
      this._updateTeamHelpers(
        this.pitch.teamRed,
        this.supportingSpotsRedHelpers,
        this.playerRedHelpers
      );
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  /**
   * 初始化游戏及AI逻辑
   */
  _initGame() {
    // 红队球门
    const goalRed = this._createGoal(
      this.goalDimensions.width,
      this.goalDimensions.height,
      TEAM.RED
    );
    goalRed.rotation.fromEuler(0, Math.PI, 0); // 绕Y轴旋转180
    goalRed.position.x = 10;
    this.entityManager.add(goalRed);

    // 蓝队球门
    const goalBlue = this._createGoal(
      this.goalDimensions.width,
      this.goalDimensions.height,
      TEAM.BLUE
    );
    goalBlue.position.x = -10;
    this.entityManager.add(goalBlue);

    // 创建球场
    const pitch = this._createPitch(this.pitchDimension.width, this.pitchDimension.height, this);
    this.entityManager.add(pitch);

    // 创建球
    const ball = this._createBall(pitch);
    this.entityManager.add(ball);

    // 创建球队
    const teamRed = this._createTeam(ball, pitch, goalRed, goalBlue, TEAM.RED);
    this.entityManager.add(teamRed);
    // 常见蓝球队
    const teamBlue = this._createTeam(ball, pitch, goalBlue, goalRed, TEAM.BLUE);
    this.entityManager.add(teamBlue);

    teamRed.opposingTeam = teamBlue;
    teamBlue.opposingTeam = teamRed;

    pitch.ball = ball;
    pitch.teamBlue = teamBlue;
    pitch.teamRed = teamRed;

    this.pitch = pitch;
  }
  _initScene() {
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 10, 20);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x94dbe2);
    this.scene.fog = new THREE.Fog(0xccff99);
    this.camera.lookAt(this.scene.position);

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xcccc, 0.4);
    ambientLight.matrixAutoUpdate = false;
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfff, 0.8);
    directionalLight.position.set(5, 20, -5);
    directionalLight.matrixAutoUpdate = false;
    directionalLight.updateMatrix();
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 25;
    directionalLight.shadow.mapSize.set(2048, 2048);
    directionalLight.shadow.bias = 0.01;
    this.scene.add(directionalLight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.options.dom.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onWindowResize, false);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(250, 250);
    groundGeometry.rotateX(Math.PI * -0.5); // 平面原来在XY平面，现在绕X轴旋转90°
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xdb8d6e).convertSRGBToLinear(),
      depthWrite: false,
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.matrixAutoUpdate = false;
    groundMesh.renderOrder = -Infinity; //This value allows the default rendering order of scene graph objects to be overridden although opaque and transparent objects remain sorted independently. When this property is set for an instance of Group, all descendants objects will be sorted and rendered together. Sorting is from lowest to highest renderOrder. Default value is 0.
    this.scene.add(groundMesh);
  }
  _initUI() {
    this._debugPitch();
    this._debugTeam(this.pitch.teamBlue, this.supportingSpotsBlueHelpers, this.playerBlueHelpers);
    this._debugTeam(this.pitch.teamRed, this.supportingSpotsRedHelpers, this.playerRedHelpers);

    // setup debugging UI
    const gui = new GUI({ width: 300 });
    const params = this.debugParameter;

    const folderPitch = gui.addFolder('Pitch');
    folderPitch
      .add(params, 'showAxes')
      .name('show axes')
      .onChange(value => {
        this.axesHelper.visible = value;
      });

    folderPitch
      .add(params, 'showRegions')
      .name('show regions')
      .onChange(value => {
        const helpers = this.regionHelpers;
        for (let i = 0, l = helpers.length; i < l; i++) {
          helpers[i].visible = value;
        }
      });

    folderPitch
      .add(params, 'showWalls')
      .name('show walls')
      .onChange(value => {
        const helpers = this.wallHelpers;
        for (let i = 0, l = helpers.length; i < l; i++) {
          helpers[i].visible = value;
        }
      });

    folderPitch.open();
    // 红队
    const folderTeamRed = gui.addFolder('Team Red');
    folderTeamRed
      .add(params, 'showPlayerRed')
      .name('show Player')
      .onChange(value => {
        const helpers = this.playerRedHelpers;
        for (let i = 0, l = helpers.length; i < l; i++) {
          helpers[i].visible = value;
        }
      });

    folderTeamRed
      .add(params, 'showSupportSpotsRed')
      .name('show support spots')
      .onChange(value => {
        const helpers = this.supportingSpotsRedHelpers;
        for (let i = 0, l = helpers.length; i < l; i++) {
          helpers[i].visible = value;
        }
      });

    folderTeamRed.open();

    const folderTeamBlue = gui.addFolder('Team Blue');

    folderTeamBlue
      .add(params, 'showPlayerBlue')
      .name('show player')
      .onChange(value => {
        const helpers = this.playerBlueHelpers;

        for (let i = 0, l = helpers.length; i < l; i++) {
          helpers[i].visible = value;
        }
      });

    folderTeamBlue
      .add(params, 'showSupportSpotsBlue')
      .name('show support spots')
      .onChange(value => {
        const helpers = this.supportingSpotsBlueHelpers;

        for (let i = 0, l = helpers.length; i < l; i++) {
          helpers[i].visible = value;
        }
      });

    folderTeamBlue.open();
  }
  _debugTeam(team, supportSpotsHelpers, playerHelpers) {
    // support spots
    const spots = team.supportSpotCalculator.spots;
    const spotGeometry = new THREE.SphereGeometry(0.1, 16, 12);
    spotGeometry.translate(0, 0.1, 0); // 把重心点移动到球体的底部
    for (let i = 0, l = spots.length; i < l; i++) {
      const spot = spots[i];

      const spotMaterial = new THREE.MeshBasicMaterial({
        color: 0x33cc00,
        transparent: true,
        opacity: 0.6,
      });
      const helper = new THREE.Mesh(spotGeometry, spotMaterial);
      helper.visible = false;
      helper.position.copy(spot.position);
      this.scene.add(helper);

      supportSpotsHelpers.push(helper);
    }
    //console.log('team:', team);
    // players
    const players = team.children;
    for (let i = 0, l = players.length; i < l; i++) {
      const player = players[i];

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = 256; // 长宽比=4:1
      canvas.height = 64;

      context.fillStyle = '#ffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#CC3366';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';

      context.fillText('null', canvas.width / 2, canvas.height / 2);
      const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) });

      const helper = new THREE.Sprite(material);
      helper.visible = false;
      helper.scale.set(2, 0.5, 1); // 设置的缩放比例=canvas的长宽比(4:1)
      helper.position.y = 2;

      player._renderComponent.add(helper);
      playerHelpers.push(helper);
    }
  }
  /**
   *
   * @param {*} team
   * @param {*} supportSpotsHelpers
   * @param {*} playerHelpers
   */
  _updateTeamHelpers(team, supportSpotsHelpers, playerHelpers) {
    const spots = team.supportSpotCalculator.spots;
    for (let i = 0, l = spots.length; i < l; i++) {
      const spot = spots[i];
      const helper = supportSpotsHelpers[i];

      if (helper.visible === true) {
        helper.scale.setScalar(spot.score || 0.5);
        helper.material.color.set(spot.best === true ? 0xff0000 : 0xfff);
      }
    }

    // players
    const players = team.children;
    for (let i = 0, l = players.length; i < l; i++) {
      const player = players[i];
      const helper = playerHelpers[i];

      if (helper.visible === true) {
        const currentState = player.stateMachine.currentState;
        const text = currentState !== null ? currentState.constructor.name : 'null';

        const canvas = helper.material.map.image;
        const context = canvas.getContext('2d');

        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        helper.material.map.needsUpdate = true;
      }
    }
  }
  /**
   * Creates visual helpers for debugging the pitch.
   */
  _debugPitch() {
    const pitch = this.pitch;
    const helper = new THREE.AxesHelper(10);
    helper.visible = false;
    helper.position.y = 0.01;
    this.scene.add(helper);

    this.axesHelper = helper;

    // regions
    const regions = pitch.regions;
    for (let i = 0, l = regions.length; i < l; i++) {
      const region = regions[i];
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = 128;
      canvas.height = 128;

      context.fillStyle = '#ffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#000';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(`ID:${i}`, canvas.width / 2, canvas.height / 2);

      const geometry = new THREE.PlaneGeometry(region.width, region.height);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff * Math.random(),
        map: new THREE.CanvasTexture(canvas),
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });

      const helper = new THREE.Mesh(geometry, material);
      helper.visible = false;
      helper.position.copy(region.center);
      helper.rotation.x = Math.PI * -0.5;
      this.scene.add(helper);

      this.regionHelpers.push(helper);
    }

    // walls
    const walls = pitch.walls;
    for (let i = 0, l = walls.length; i < l; i++) {
      const wall = walls[i];
      wall.normal.isVector3 = true;

      const helper = new THREE.PlaneHelper(wall, i < 2 ? 20 : 15);
      helper.visible = false;
      this.scene.add(helper);

      this.wallHelpers.push(helper);
    }
  }
  /**
   * Factory method to create a soccer team.
   * 创建球队
   * @param {Ball} ball - A reference to the ball. 足球
   * @param {Pitch} pitch - A reference to the pitch. 球场
   * @param {Goal} homeGoal - A reference to the home goal.自己球门
   * @param {Goal} opposingGoal - A reference to the opposing goal. 对方球门
   * @param {Number} color - The team's color (blue or red). 每个队 对应的颜色
   * @return {Team} The created team.
   */
  _createTeam(ball, pitch, homeGoal, opposingGoal, color) {
    const team = new Team(color, ball, pitch, homeGoal, opposingGoal);
    const baseMesh = this.assetManager.modelMaps.get(color === TEAM.RED ? _team_red_ : _team_blue_);
    // 创建球员
    for (let i = 0, l = team.children.length; i < l; i++) {
      const player = team.children[i];
      const playerMesh = baseMesh.clone();
      player.setRenderComponent(playerMesh, this.sync.bind(this));
      this.scene.add(playerMesh);
    }
    return team;
  }
  /**
   * 创建球门的方法
   * @param {*} width - 球门宽度
   * @param {*} height - 球门高度
   * @param {*} color  - 球门的颜色，The color of the team that owns this goal (blue or red).
   */
  _createGoal(width, height, color) {
    const goal = new Goal(width, height, color);

    const goalMesh = this.assetManager.modelMaps.get(_goal_).clone();
    goal.setRenderComponent(goalMesh, this.sync.bind(this));

    this.scene.add(goalMesh);
    return goal;
  }
  /**
   * 创建足球场
   * @param {*} width - 20
   * @param {*} height - 25
   * @param {*} world
   */
  _createPitch(width, height, world) {
    const pitch = new Pitch(width, height, world);
    const pitchMesh = this.assetManager.modelMaps.get(_pitch_);
    pitch.setRenderComponent(pitchMesh, this.sync.bind(this));
    //console.log('this.pitch:', pitch);
    this.scene.add(pitchMesh);
    return pitch;
  }
  /**
   * 创建足球
   * @param {*} pitch - 球场
   */
  _createBall(pitch /** 球场 */) {
    const ball = new Ball(pitch);
    const ballMesh = this.assetManager.modelMaps.get(_ball_);
    ball.setRenderComponent(ballMesh, this.sync.bind(this));
    this.scene.add(ballMesh);
    return ball;
  }
  /**
   * 同步yuka 与 three
   * @param {*} entity
   * @param {*} renderComponent
   */
  sync(entity, renderComponent) {
    renderComponent.matrix.copy(entity.worldMatrix);
    renderComponent.matrix.decompose(
      renderComponent.position,
      renderComponent.quaternion,
      renderComponent.scale
    );
  }
  /**
   * 刷新UI
   */
  refreshUI() {
    const teamBlue = this.pitch.teamBlue;
    const teamRed = this.pitch.teamRed;

    // 这里在UI界面弹出消息提示，那个队进球了
    if (this.onGoalScored !== null) {
      this.onGoalScored({
        msg: '通知界面，提示消息',
        data: { teamBlue: teamBlue, teamRed: teamRed },
      });
    }
  }
}

function startAnimationFun() {
  this.requestID = requestAnimationFrame(this.onStartAnimation.bind(this));
  this.update();
}

function stopAnimationFun() {
  cancelAnimationFrame(this.requestID);
}

function windowResizeFun() {
  this.camera.aspect = window.innerWidth / window.innerHeight;
  this.camera.updateProjectionMatrix();

  this.renderer.setSize(window.innerWidth, window.innerHeight);
}
