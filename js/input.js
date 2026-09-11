class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.state = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      broadside: false,
      broadsidePressed: false,
      repairPressed: false,
      pausePressed: false,
      ammoSwitch: null,
      targetX: 0,
      targetY: 0,
    };

    this.joystick = { active: false, x: 0, y: 0 };
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, down: false, rightDown: false };
    this.isTouch = 'ontouchstart' in window;
    this._pauseWasDown = false;
    this.touchBroadside = false;

    // Prevent context menu on canvas for smooth right-click broadsides
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Track mouse globally so aim never breaks
    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) {
        e.preventDefault();
        this.mouse.down = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.mouse.rightDown = true;
        this.state.broadsidePressed = true;
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rightDown = false;
    });

    window.addEventListener('keydown', e => this._onKeyDown(e));
    window.addEventListener('keyup', e => this._onKeyUp(e));
    window.addEventListener('blur', () => this._clearAll());

    this._setupTouch();
  }

  _onKeyDown(e) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    this.keys[e.code] = true;
    if (e.code === 'Digit1') this.state.ammoSwitch = 0;
    if (e.code === 'Digit2') this.state.ammoSwitch = 1;
    if (e.code === 'Digit3') this.state.ammoSwitch = 2;
    if (e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'KeyQ') {
      this.state.broadsidePressed = true;
    }
    if (e.code === 'KeyB') {
      window.game?.toggleArmory?.();
    }
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  _clearAll() {
    this.keys = {};
    this.joystick = { active: false, x: 0, y: 0 };
    this.mouse.down = false;
    this.mouse.rightDown = false;
  }

  /** Convert screen mouse pos to world coordinates (handles DPI scaling) */
  getWorldTarget(camera) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const sx = (this.mouse.x - rect.left) * scaleX;
    const sy = (this.mouse.y - rect.top) * scaleY;
    return {
      x: sx - this.canvas.width / 2 + camera.x,
      y: sy - this.canvas.height / 2 + camera.y,
    };
  }

  _setupTouch() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    const fireBtn = document.getElementById('fire-btn');
    const repairBtn = document.getElementById('repair-btn');
    const broadsideBtn = document.getElementById('broadside-btn');
    if (!zone) return;

    let touchId = null;
    const maxDist = 50;

    zone.addEventListener('touchstart', e => {
      e.preventDefault();
      touchId = e.changedTouches[0].identifier;
      this.joystick.active = true;
    }, { passive: false });

    zone.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === touchId) {
          const rect = zone.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          let dx = t.clientX - cx;
          let dy = t.clientY - cy;
          const d = Math.hypot(dx, dy);
          if (d > maxDist) {
            dx = (dx / d) * maxDist;
            dy = (dy / d) * maxDist;
          }
          this.joystick.x = dx / maxDist;
          this.joystick.y = dy / maxDist;
          knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }
      }
    }, { passive: false });

    const endTouch = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === touchId) {
          this.joystick.active = false;
          this.joystick.x = 0;
          this.joystick.y = 0;
          knob.style.transform = 'translate(-50%, -50%)';
          touchId = null;
        }
      }
    };
    zone.addEventListener('touchend', endTouch);
    zone.addEventListener('touchcancel', endTouch);

    fireBtn?.addEventListener('touchstart', e => {
      e.preventDefault();
      this.mouse.down = true;
    }, { passive: false });

    fireBtn?.addEventListener('touchend', e => {
      e.preventDefault();
      this.mouse.down = false;
    }, { passive: false });

    broadsideBtn?.addEventListener('touchstart', e => {
      e.preventDefault();
      this.state.broadsidePressed = true;
    }, { passive: false });

    repairBtn?.addEventListener('touchstart', e => {
      e.preventDefault();
      this.state.repairPressed = true;
    }, { passive: false });

    repairBtn?.addEventListener('pointerdown', e => {
      this.state.repairPressed = true;
    });

    // Touch aim: touch on canvas sets aim direction
    this.canvas.addEventListener('touchmove', e => {
      if (e.touches.length > 0) {
        const t = e.touches[e.touches.length - 1];
        this.mouse.x = t.clientX;
        this.mouse.y = t.clientY;
      }
    }, { passive: true });
  }

  update(camera) {
    const s = this.state;
    s.repairPressed = false;
    s.pausePressed = false;

    // Movement — direct WASD / joystick
    if (this.joystick.active) {
      s.up = this.joystick.y < -0.2;
      s.down = this.joystick.y > 0.2;
      s.left = this.joystick.x < -0.2;
      s.right = this.joystick.x > 0.2;
    } else {
      s.up = !!(this.keys['KeyW'] || this.keys['ArrowUp']);
      s.down = !!(this.keys['KeyS'] || this.keys['ArrowDown']);
      s.left = !!(this.keys['KeyA'] || this.keys['ArrowLeft']);
      s.right = !!(this.keys['KeyD'] || this.keys['ArrowRight']);
    }

    const world = this.getWorldTarget(camera);
    s.targetX = world.x;
    s.targetY = world.y;

    // Fire chasers / swivels
    s.fire = !!(this.keys['Space'] || this.mouse.down);

    // Broadside trigger
    s.broadside = s.broadsidePressed || this.mouse.rightDown;
    s.broadsidePressed = false;

    if (this.keys['KeyR']) s.repairPressed = true;

    const escDown = !!this.keys['Escape'];
    if (escDown && !this._pauseWasDown) s.pausePressed = true;
    this._pauseWasDown = escDown;

    return s;
  }

  consumeAmmoSwitch() {
    const sw = this.state.ammoSwitch;
    this.state.ammoSwitch = null;
    return sw;
  }
}
