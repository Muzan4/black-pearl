class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  play(type, opts = {}) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    switch (type) {
      case 'cannon': this._cannon(opts); break;
      case 'broadside': this._broadside(); break;
      case 'hit': this._hit(opts); break;
      case 'explosion': this._explosion(opts); break;
      case 'keg': this._keg(); break;
      case 'splash': this._splash(); break;
      case 'repair': this._repair(); break;
      case 'unlock': this._unlock(); break;
      case 'wave': this._wave(); break;
      case 'death': this._death(); break;
      case 'loot': this._loot(); break;
      case 'frenzy': this._frenzy(); break;
      case 'ui': this._ui(); break;
    }
  }

  _osc(freq, type, duration, gainVal = 0.3, ramp = true) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    if (ramp) gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _noise(duration, gainVal = 0.2) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  _cannon() {
    this._noise(0.4, 0.5);
    this._osc(60, 'sine', 0.3, 0.4);
    this._osc(30, 'square', 0.5, 0.2);
  }

  _broadside() {
    this._noise(0.7, 0.8);
    this._osc(45, 'sine', 0.6, 0.6);
    this._osc(75, 'sawtooth', 0.4, 0.3);
    setTimeout(() => {
      this._noise(0.5, 0.6);
      this._osc(50, 'sine', 0.4, 0.5);
    }, 70);
  }

  _hit() {
    this._noise(0.15, 0.3);
    this._osc(200, 'square', 0.1, 0.15);
  }

  _explosion() {
    this._noise(0.8, 0.6);
    this._osc(40, 'sine', 0.6, 0.5);
    this._osc(80, 'sawtooth', 0.4, 0.2);
  }

  _keg() {
    this._noise(1.2, 0.9);
    this._osc(35, 'sine', 0.9, 0.7);
    this._osc(70, 'sawtooth', 0.6, 0.4);
  }

  _splash() {
    this._noise(0.35, 0.3);
    this._osc(320, 'sine', 0.2, 0.15);
  }

  _repair() {
    this._osc(440, 'sine', 0.15, 0.15);
    setTimeout(() => this._osc(554, 'sine', 0.15, 0.15), 100);
    setTimeout(() => this._osc(659, 'sine', 0.2, 0.15), 200);
  }

  _loot() {
    this._osc(784, 'triangle', 0.12, 0.25);
    setTimeout(() => this._osc(1046, 'triangle', 0.18, 0.3), 80);
    setTimeout(() => this._osc(1318, 'sine', 0.25, 0.3), 160);
  }

  _frenzy() {
    this._osc(330, 'sawtooth', 0.2, 0.25);
    setTimeout(() => this._osc(493, 'sawtooth', 0.25, 0.3), 100);
    setTimeout(() => this._osc(659, 'sawtooth', 0.4, 0.35), 200);
  }

  _unlock() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this._osc(f, 'sine', 0.3, 0.2, true), i * 100);
    });
  }

  _wave() {
    this._osc(220, 'sawtooth', 0.5, 0.2);
    setTimeout(() => this._osc(330, 'sawtooth', 0.5, 0.25), 200);
    setTimeout(() => this._osc(440, 'sawtooth', 0.8, 0.3), 400);
  }

  _death() {
    this._osc(220, 'sine', 1.5, 0.3);
    setTimeout(() => this._osc(110, 'sine', 2, 0.4), 500);
    this._noise(1.5, 0.3);
  }

  _ui() {
    this._osc(660, 'sine', 0.08, 0.1);
  }
}
