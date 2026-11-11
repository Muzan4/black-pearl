class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
    this.ambientGain = null;
    this.seaNoiseNode = null;
    this.windNoiseNode = null;
    this.seaFilter = null;
    this.windFilter = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.45;
      this.masterGain.connect(this.ctx.destination);

      this._initAmbientSea();
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _initAmbientSea() {
    if (!this.ctx) return;
    try {
      // Gentle ocean swell generator using filtered noise
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pinkish noise filter
        lastOut = (lastOut * 0.94) + (white * 0.06);
        data[i] = lastOut * 3.0;
      }

      this.seaNoiseNode = this.ctx.createBufferSource();
      this.seaNoiseNode.buffer = buffer;
      this.seaNoiseNode.loop = true;

      this.seaFilter = this.ctx.createBiquadFilter();
      this.seaFilter.type = 'lowpass';
      this.seaFilter.frequency.value = 240;

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.08;

      this.seaNoiseNode.connect(this.seaFilter);
      this.seaFilter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);

      this.seaNoiseNode.start();
    } catch {
      // Audio node fallback
    }
  }

  updateAmbient(shipSpeed = 0, inTailwind = false) {
    if (!this.ambientGain || !this.seaFilter || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Modulate ocean filter with gentle 0.2Hz swell
    const swell = Math.sin(now * 1.2) * 60;
    const targetFreq = 220 + (shipSpeed * 35) + swell;
    this.seaFilter.frequency.setTargetAtTime(Math.max(120, targetFreq), now, 0.2);
    const targetGain = inTailwind ? 0.14 : 0.08;
    this.ambientGain.gain.setTargetAtTime(targetGain, now, 0.3);
  }

  play(type, opts = {}) {
    if (!this.enabled || !this.ctx) return;
    this.resume();

    switch (type) {
      case 'cannon': this._cannon(opts); break;
      case 'broadside': this._broadside(opts); break;
      case 'hit': this._hit(opts); break;
      case 'rake': this._rakeCritical(); break;
      case 'explosion': this._explosion(opts); break;
      case 'keg': this._keg(); break;
      case 'splash': this._splash(opts); break;
      case 'repair': this._repair(); break;
      case 'unlock': this._unlock(); break;
      case 'wave': this._wave(); break;
      case 'death': this._death(); break;
      case 'loot': this._loot(); break;
      case 'frenzy': this._frenzy(); break;
      case 'ui': this._ui(); break;
      case 'drift': this._drift(); break;
      case 'harpoon': this._harpoon(); break;
      case 'sink': this._sink(); break;
      case 'lightning': this._lightning(); break;
      case 'shield': this._shield(); break;
      case 'deflect': this._deflect(); break;
    }
  }

  // --- SOUND SYNTHESIS HELPERS ---

  _noiseBuffer(duration) {
    const size = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) {
      d[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  _cannon(opts = {}) {
    const t0 = this.ctx.currentTime;
    const pitch = opts.pitch || 1.0;

    // 1. Sub-bass punch (40Hz deep thump)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110 * pitch, t0);
    subOsc.frequency.exponentialRampToValueAtTime(28, t0 + 0.35);
    subGain.gain.setValueAtTime(0.7, t0);
    subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t0);
    subOsc.stop(t0 + 0.4);

    // 2. Powder explosion crackle & smoke whoosh
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.5);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, t0);
    filter.frequency.exponentialRampToValueAtTime(180, t0 + 0.4);
    filter.Q.value = 1.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t0);

    // 3. Cast iron barrel metallic reverberation
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bellOsc.type = 'triangle';
    bellOsc.frequency.setValueAtTime(180 * pitch, t0);
    bellOsc.frequency.exponentialRampToValueAtTime(60, t0 + 0.25);
    bellGain.gain.setValueAtTime(0.3, t0);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
    bellOsc.connect(bellGain);
    bellGain.connect(this.masterGain);
    bellOsc.start(t0);
    bellOsc.stop(t0 + 0.3);
  }

  _broadside(opts = {}) {
    // Staggered sequential naval broadside thunder (4-6 guns firing in a rapid rolling salvo)
    const guns = opts.guns || 5;
    for (let i = 0; i < guns; i++) {
      const delay = i * 0.045 + (Math.random() * 0.02);
      setTimeout(() => {
        this._cannon({ pitch: 0.85 + Math.random() * 0.3 });
      }, delay * 1000);
    }
  }

  _rakeCritical() {
    const t0 = this.ctx.currentTime;
    // Shattering wood crash + triumphant resonant gong
    this._cannon({ pitch: 0.7 });

    // Wood splinter tearing crack
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.6);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1400;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t0);

    // Deep brass bell ring (Golden critical chime)
    [330, 440, 660].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0 + idx * 0.04);
      g.gain.setValueAtTime(0.35, t0 + idx * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t0 + idx * 0.04);
      osc.stop(t0 + 1.25);
    });
  }

  _hit(opts = {}) {
    const t0 = this.ctx.currentTime;
    // Heavy wood hull impact thud
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t0);
    osc.frequency.exponentialRampToValueAtTime(35, t0 + 0.14);
    g.gain.setValueAtTime(0.45, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.18);

    // Wood crunch noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.18);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 450;
    filter.Q.value = 2.5;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.5, t0);
    ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
    noise.connect(filter);
    filter.connect(ng);
    ng.connect(this.masterGain);
    noise.start(t0);
  }

  _explosion(opts = {}) {
    const t0 = this.ctx.currentTime;
    // Sub-bass rumble
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t0);
    osc.frequency.exponentialRampToValueAtTime(20, t0 + 0.8);
    g.gain.setValueAtTime(0.8, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.85);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.9);

    // Explosive flame roar
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.9);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t0);
    filter.frequency.exponentialRampToValueAtTime(100, t0 + 0.85);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.9, t0);
    ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);
    noise.connect(filter);
    filter.connect(ng);
    ng.connect(this.masterGain);
    noise.start(t0);
  }

  _keg() {
    const t0 = this.ctx.currentTime;
    // Massive cataclysmic explosion (double blast)
    this._explosion();
    setTimeout(() => {
      this._explosion();
    }, 80);

    const sub = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(60, t0);
    sub.frequency.exponentialRampToValueAtTime(15, t0 + 1.2);
    g.gain.setValueAtTime(1.0, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.3);
    sub.connect(g);
    g.connect(this.masterGain);
    sub.start(t0);
    sub.stop(t0 + 1.35);
  }

  _drift() {
    const t0 = this.ctx.currentTime;
    // Anchor bite into seabed + huge foaming water surge
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.45);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, t0);
    filter.frequency.exponentialRampToValueAtTime(800, t0 + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start(t0);

    // Chain rattle
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t0);
    osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.3);
    og.gain.setValueAtTime(0.2, t0);
    og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.35);
  }

  _harpoon() {
    const t0 = this.ctx.currentTime;
    // Spring launch whoosh + steel cable whirr
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, t0);
    osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.22);
    g.gain.setValueAtTime(0.35, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.28);
  }

  _splash(opts = {}) {
    const t0 = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer(0.4);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, t0);
    filter.frequency.exponentialRampToValueAtTime(250, t0 + 0.35);
    filter.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.45, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38);
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start(t0);
  }

  _sink() {
    const t0 = this.ctx.currentTime;
    // Deep wooden groaning and water gurgling
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(75, t0);
    osc.frequency.exponentialRampToValueAtTime(32, t0 + 1.8);
    g.gain.setValueAtTime(0.35, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.9);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 2.0);
  }

  _lightning() {
    const t0 = this.ctx.currentTime;
    // Sharp crack followed by rolling thunder
    const crack = this.ctx.createBufferSource();
    crack.buffer = this._noiseBuffer(0.12);
    const cf = this.ctx.createBiquadFilter();
    cf.type = 'highpass';
    cf.frequency.value = 1200;
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.9, t0);
    cg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    crack.connect(cf);
    cf.connect(cg);
    cg.connect(this.masterGain);
    crack.start(t0);

    setTimeout(() => {
      this._explosion();
    }, 90);
  }

  _repair() {
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const t0 = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.2, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t0);
        osc.stop(t0 + 0.2);
      }, i * 75);
    });
  }

  _unlock() {
    const chord = [523.25, 659.25, 783.99, 1046.50];
    chord.forEach((freq, i) => {
      setTimeout(() => {
        const t0 = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.3, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t0);
        osc.stop(t0 + 0.5);
      }, i * 90);
    });
  }

  _wave() {
    // Triumphant pirate brass fanfare chord
    const brass = [220, 277.18, 329.63, 440];
    brass.forEach(freq => {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.18, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + 1.25);
    });
  }

  _death() {
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t0);
    osc.frequency.exponentialRampToValueAtTime(30, t0 + 1.5);
    g.gain.setValueAtTime(0.6, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.55);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 1.6);
  }

  _loot() {
    const t0 = this.ctx.currentTime;
    // Pleasant high doubloon bell chime
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, t0);
    osc.frequency.exponentialRampToValueAtTime(1318.51, t0 + 0.15);
    g.gain.setValueAtTime(0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.38);
  }

  _frenzy() {
    const t0 = this.ctx.currentTime;
    // Pirate grog frenzy surge
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t0);
    osc.frequency.exponentialRampToValueAtTime(450, t0 + 0.5);
    g.gain.setValueAtTime(0.4, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.6);
  }

  _ui() {
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t0);
    osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.05);
    g.gain.setValueAtTime(0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.07);
  }

  _shield() {
    const t0 = this.ctx.currentTime;
    // Resonant shimmering shield activation hum
    [261.63, 392.00, 523.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.8, t0 + idx * 0.03);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, t0 + idx * 0.03 + 0.4);
      g.gain.setValueAtTime(0.25, t0 + idx * 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.03 + 0.55);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t0 + idx * 0.03);
      osc.stop(t0 + idx * 0.03 + 0.6);
    });
  }

  _deflect() {
    const t0 = this.ctx.currentTime;
    // High-pitched crystal energy deflection ping
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t0);
    osc.frequency.exponentialRampToValueAtTime(400, t0 + 0.22);
    g.gain.setValueAtTime(0.4, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.28);
  }
}
