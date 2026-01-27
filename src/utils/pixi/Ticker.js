class Ticker {
  constructor() {
    this.listeners = [];
    this.runing = false;
    this._last = performance.now();
    this._tick = this._tick.bind(this);
  }
  add(cb) {
    this.listeners.push(cb);
  }
  remove(cb) {
    const i = this.listeners.indexOf(cb);
    if (i >= 0) this.listeners.splice(i, 1);
  }

  start() {
    this.runing = true;
    this._last = performance.now();
    requestAnimationFrame(this._tick);
  }
  stop() {
    this.runing = false;
  }
  _tick(now) {
    const dt = (now - this._last) / 1000;
    this._last = now;
    for (const l of this.listeners) l(dt);
    if (this.runing) requestAnimationFrame(this._tick);
  }
}

export { Ticker };
