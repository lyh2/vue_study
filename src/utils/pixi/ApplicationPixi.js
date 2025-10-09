import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';

export default class ApplicationPixi {
  constructor(options) {
    this.options = options;

    this.init();
    this.initResize();
  }

  async init() {
    this.app = new PIXI.Application();

    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1099bb,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio,
    });

    this.options.dom.appendChild(this.app.canvas);

    this.viewport = new Viewport({
      worldWidth: 1000,
      worldHeigh: 1000,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      events: this.app.renderer.events,
    })
      .drag()
      .pinch({ percent: 2 })
      .wheel()
      .decelerate();

    this.app.stage.addChild(this.viewport);
    this.app.ticker.start();

    this.addText();
  }

  addText() {
    const text = this.viewport.addChild(
      new PIXI.Text('中文，Viewport', {
        fontsize: 24,
        fill: 0xf3f3d3,
        align: 'center',
      })
    );
    text.anchor.set(0.5);
    text.resolution = 8;
    text.x = this.viewport.screenWidth / 2;
    text.y = this.viewport.screenHeight / 2;
  }

  initResize() {
    window.addEventListener('resize', this.resize.bind(this));
  }

  resize() {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.viewport.resize(window.innerWidth, window.innerHeight);
  }
}
