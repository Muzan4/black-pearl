class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.input = new InputManager(this.canvas);
    this.ui = new UIManager();
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.waves = new WaveManager();
    this.player = new Player();

    this.state = 'menu';
    this.projectiles = [];
    this.floatingTexts = [];
    this.lootDrops = [];
    this.sinkingShips = [];
    this.harpoons = [];
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboIndex = 0;
    this.comboTimer = 0;
    this.maxCombo = 1;
    this.camera = { x: 0, y: 0 };
    this.time = 0;
    this.lastTime = 0;
    this.waveDelay = 0;
    this.wind = { x: 0.8, y: -0.6 };
    this.windAngle = -0.6;

    this._bindUI();
    this._initBurstHandler();
    this.ui.showMenu(this.player);
    requestAnimationFrame(t => this.loop(t));
  }

  _initBurstHandler() {
    this.player.onBurstFire = (targetX, targetY) => {
      if (this.state !== 'playing' || !this.player.alive) return;
      const p = this.player.fireSingleBurstShot(targetX, targetY);
      if (p) {
        this.projectiles.push(p);
        const fireAngle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
        this.particles.cannonFireChain(this.player.x, this.player.y, fireAngle, this.player.gun?.color);
        this.audio.play('cannon_chain');
        this.renderer.shake(2.0);
      }
    };
  }

  _bindUI() {
    this.ui.onStart = () => this.startGame();
    this.ui.onRetry = () => this.startGame();
    this.ui.onMenu = () => this.toMenu();
    this.ui.onResume = () => this.resume();
    this.ui.onToggleArmory = () => this.toggleArmory();
    this.ui.onAmmoSwitch = ammo => {
      if (this.state === 'playing') {
        this.player.ammoType = ammo;
        this.audio.play('ui');
      }
    };
  }

  toggleArmory() {
    const modal = document.getElementById('armory-modal');
    if (modal?.classList.contains('hidden')) {
      this.ui.showArmory(this.player);
    } else {
      this.ui.hideArmory();
    }
  }

  startGame() {
    this.audio.init();
    this.audio.resume();
    this.audio.play('ui');

    this.player.reset();
    this.waves.reset();
    this.projectiles = [];
    this.floatingTexts = [];
    this.lootDrops = [];
    this.sinkingShips = [];
    this.harpoons = [];
    this.particles = new ParticleSystem();
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboIndex = 0;
    this.comboTimer = 0;
    this.maxCombo = 1;
    this.camera = { x: 0, y: 0 };
    this.waveDelay = 1500;

    this.ui.hideAllModals();
    this.ui.hideMenu();
    this.state = 'playing';

    setTimeout(() => {
      const info = this.waves.startNextWave();
      this.ui.announceWave(info);
      this.audio.play('wave');
      this.waveDelay = 0;
    }, this.waveDelay);
  }

  toMenu() {
    this.state = 'menu';
    this.ui.hideAllModals();
    this.ui.showMenu(this.player);
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.ui.hidePause();
    }
  }

  loop(timestamp) {
    const dt = Math.min(timestamp - (this.lastTime || timestamp), 50);
    this.lastTime = timestamp;
    this.time = timestamp;

    if (this.state === 'playing') {
      this.update(dt);
    }

    this.render();
    requestAnimationFrame(t => this.loop(t));
  }

  _getFireTarget(input) {
    return { x: input.targetX, y: input.targetY };
  }

  update(dt) {
    const input = this.input.update(this.camera);

    if (input.pausePressed) {
      this.state = 'paused';
      this.ui.showPause();
      return;
    }

    // Dynamic wind gently shifts angle over time
    this.windAngle += dt * 0.00008;
    this.wind = {
      x: Math.cos(this.windAngle),
      y: Math.sin(this.windAngle),
    };

    const ammoSwitch = this.input.consumeAmmoSwitch();
    if (ammoSwitch && ammoSwitch !== this.player.ammoType) {
      this.player.ammoType = ammoSwitch;
      document.querySelectorAll('.ammo-btn, .touch-ammo-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.ammo === ammoSwitch);
      });
      this.audio.play('ammo_switch', { ammo: ammoSwitch });
      if (ammoSwitch === 'round') {
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 36, '● [1] HEAVY SINGLE SHOT (High Damage, Medium Range)', '#f97316', 18));
      } else if (ammoSwitch === 'chain') {
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 36, '⦾ [2] 3-ROUND BURST (Rapid Salvo, High Accuracy)', '#38bdf8', 18));
      } else if (ammoSwitch === 'grape') {
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 36, '✦ [3] SHOTGUN SPREAD (Massive Point-Blank Cone, Short Range)', '#ef4444', 18));
      }
    }

    if (input.repairPressed) {
      if (this.player.startRepair()) {
        this.audio.play('repair');
        this.particles.emit(this.player.x, this.player.y, {
          count: 14, color: '#a78bfa', life: 800, speedMin: 1, speedMax: 3,
        });
      }
    }

    // Update Player with wind vector and anchor drift
    this.player.update(input, dt, this.wind);

    // Continuous hydrodynamic wake
    if (this.player.alive && (this.player.vx !== 0 || this.player.vy !== 0)) {
      this.particles.wake(this.player.x, this.player.y, this.player.angle, this.player.speedMag);
      this.particles.bowSpray(this.player.x, this.player.y, this.player.angle, this.player.speedMag);
    }

    // Barrier Shield activation (Shift key)
    if (input.shield && this.player.canActivateShield()) {
      if (this.player.activateShield()) {
        this.audio.play('shield');
        this.renderer.shake(3);
        this.particles.emit(this.player.x, this.player.y, {
          count: 24, speedMin: 2, speedMax: 6, life: 500, sizeMin: 3, sizeMax: 7, color: '#38bdf8',
        });
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 35, '🛡️ BARRIER SHIELD (60% DEF)', '#38bdf8', 22));
      }
    }

    // Standard Chaser Cannons
    if (input.fire && this.player.canFire()) {
      const target = this._getFireTarget(input);
      const newProj = this.player.fire(target.x, target.y);
      if (newProj.length > 0) {
        this.projectiles.push(...newProj);
        const fireAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
        const ammoType = this.player.ammoType;

        if (ammoType === 'chain') {
          this.particles.cannonFireChain(this.player.x, this.player.y, fireAngle, this.player.gun?.color);
          this.audio.play('cannon_chain');
          this.renderer.shake(3.0);
        } else if (ammoType === 'grape') {
          this.particles.cannonFireGrape(this.player.x, this.player.y, fireAngle, this.player.gun?.color);
          this.audio.play('cannon_grape');
          this.renderer.shake(5.2);
        } else {
          this.particles.cannonFireRound(this.player.x, this.player.y, fireAngle, this.player.gun?.color);
          this.audio.play('cannon_round');
          this.renderer.shake(4.2);
        }
      }
    }

    // Broadsides (Right-Click / 'E' / 'Q')
    if (input.broadside && this.player.canBroadside()) {
      const bProj = this.player.fireBroadside();
      if (bProj.length > 0) {
        this.projectiles.push(...bProj);
        const ammoType = this.player.ammoType;
        this.particles.broadsideBlast(this.player.x, this.player.y, this.player.angle - Math.PI / 2, ammoType);
        this.particles.broadsideBlast(this.player.x, this.player.y, this.player.angle + Math.PI / 2, ammoType);

        if (ammoType === 'chain') {
          this.audio.play('cannon_chain');
          this.audio.play('broadside');
          this.renderer.shake(7.5);
          this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 30, '⦾ 3-BURST BROADSIDE SALVO!', '#38bdf8', 20));
        } else if (ammoType === 'grape') {
          this.audio.play('cannon_grape');
          this.audio.play('broadside');
          this.renderer.shake(9.5);
          this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 30, '✦ SHOTGUN FLAK BROADSIDE!', '#ef4444', 20));
        } else {
          this.audio.play('cannon_round');
          this.audio.play('broadside');
          this.renderer.shake(8.8);
          this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 30, '⚡ HEAVY DEMOLITION BROADSIDE!', '#facc15', 20));
        }
      }
    }

    // Harpoon Grapple (KeyF or Middle-Click)
    if (input.harpoon && this.player.canHarpoon()) {
      const target = this._getFireTarget(input);
      const h = this.player.fireHarpoon(target.x, target.y);
      if (h) {
        this.harpoons.push(h);
        this.audio.play('harpoon');
      }
    }

    // Update Harpoons
    for (let i = this.harpoons.length - 1; i >= 0; i--) {
      const h = this.harpoons[i];
      h.update(dt, this.player);
      if (!h.alive) {
        this.harpoons.splice(i, 1);
        continue;
      }
      if (!h.reeling) {
        // Hook floating salvage
        for (const loot of this.lootDrops) {
          if (loot.alive && Math.hypot(h.x - loot.x, h.y - loot.y) < loot.radius + 15) {
            h.target = loot;
            h.reeling = true;
            this.audio.play('harpoon');
            break;
          }
        }
        if (!h.reeling) {
          // Hook enemy ships
          for (const enemy of this.waves.enemies) {
            if (enemy.alive && Math.hypot(h.x - enemy.x, h.y - enemy.y) < (enemy.def?.size || 25)) {
              h.target = enemy;
              h.reeling = true;
              this.audio.play('harpoon');
              this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 25, '⚓ HARPOONED!', '#38bdf8', 18));
              break;
            }
          }
        }
      }
    }

    const enemyProj = this.waves.update(dt, this.player) || [];
    this.projectiles.push(...enemyProj);

    this._updateProjectiles(dt);
    this._updateLoot(dt);
    this._updateSinkingShips(dt);
    this._checkObstacleCollisions();

    // Ambient lightning in Stormy Shoals
    if (this.waves.currentLevel.name === 'Stormy Shoals' && Math.random() < 0.003) {
      this.particles.triggerLightning();
      this.audio.play('lightning');
      this.renderer.shake(4.5);
    }

    // Ambient ocean audio modulation
    const inTailwind = this.player.speedMag > this.player.effectiveSpeed * 1.05;
    this.audio.updateAmbient(this.player.speedMag, inTailwind);

    if (!this.player.alive) {
      this._gameOver();
      return;
    }

    if (this.waves.waveClear && this.waveDelay === 0) {
      this.waveDelay = -1;
      setTimeout(() => {
        if (this.state !== 'playing') return;
        const unlocked = this.player.unlockGun(this.waves.wave + 1);
        const info = this.waves.startNextWave();
        this.ui.announceWave(info);
        this.audio.play('wave');
        if (unlocked) {
          this.ui.showUnlock(unlocked);
          this.audio.play('unlock');
        }
        this.waveDelay = 0;
      }, 3000);
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboIndex = 0;
      }
    }

    this.particles.update(dt, this.wind);
    this.floatingTexts.forEach(t => t.update(dt));
    this.floatingTexts = this.floatingTexts.filter(t => t.alive);

    this.camera.x += (this.player.x - this.camera.x) * 0.08;
    this.camera.y += (this.player.y - this.camera.y) * 0.08;

    this.renderer.updateShake();
    this.ui.updateHUD(this.player, this.score, this.combo, this.comboIndex);

    // Update Broadside HUD
    const bsIndicator = document.getElementById('broadside-indicator');
    if (bsIndicator) {
      const ready = this.player.broadsideCooldown <= 0;
      bsIndicator.classList.toggle('ready', ready);
      const ratio = Math.max(0, 1 - this.player.broadsideCooldown / this.player.maxBroadsideCooldown);
      bsIndicator.style.setProperty('--cd', `${ratio * 100}%`);
    }

    // Update Shield HUD
    const shieldIndicator = document.getElementById('shield-indicator');
    if (shieldIndicator) {
      const ready = this.player.shieldCooldown <= 0;
      shieldIndicator.classList.toggle('ready', ready);
      shieldIndicator.classList.toggle('active', this.player.shieldActive);
      const ratio = this.player.shieldCooldown <= 0 ? 1 : Math.max(0, 1 - this.player.shieldCooldown / this.player.maxShieldCooldown);
      shieldIndicator.style.setProperty('--cd', `${ratio * 100}%`);
    }
  }

  _updateSinkingShips(dt) {
    for (let i = this.sinkingShips.length - 1; i >= 0; i--) {
      const s = this.sinkingShips[i];
      s.update(dt, this.particles);
      if (!s.alive) {
        this.sinkingShips.splice(i, 1);
      }
    }
  }

  _updateLoot(dt) {
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const loot = this.lootDrops[i];
      loot.update(dt);
      if (!loot.alive) {
        this.lootDrops.splice(i, 1);
        continue;
      }

      // Check pickup collision with player
      const d = Math.hypot(this.player.x - loot.x, this.player.y - loot.y);
      if (d < 38 && this.player.alive) {
        loot.alive = false;
        if (loot.type === 'gold') {
          const mult = COMBO_MULTIPLIERS[this.comboIndex] || 1;
          const pts = Math.round(500 * mult);
          this.score += pts;
          const coinsEarned = this.player.addCoins(100 * mult);
          this.floatingTexts.push(new FloatingText(loot.x, loot.y - 25, `+${pts} PTS · 🪙 +${coinsEarned}`, '#facc15', 20));
          this.audio.play('loot');
          this.particles.emit(loot.x, loot.y, { count: 12, color: '#facc15', life: 600, speedMin: 1, speedMax: 4 });
        } else if (loot.type === 'wood') {
          this.player.heal(30);
          this.floatingTexts.push(new FloatingText(loot.x, loot.y - 25, '+30 HULL REPAIR', '#4ade80', 20));
          this.audio.play('loot');
          this.particles.emit(loot.x, loot.y, { count: 12, color: '#4ade80', life: 600, speedMin: 1, speedMax: 3 });
        } else if (loot.type === 'sail') {
          this.player.repairSails(35);
          this.floatingTexts.push(new FloatingText(loot.x, loot.y - 25, '+35 SAIL REPAIR', '#38bdf8', 20));
          this.audio.play('loot');
          this.particles.emit(loot.x, loot.y, { count: 14, color: '#38bdf8', life: 600, speedMin: 1, speedMax: 3 });
        } else if (loot.type === 'crew') {
          this.player.restoreCrew(25);
          this.floatingTexts.push(new FloatingText(loot.x, loot.y - 25, '+25 CREW RECRUITS', '#fbbf24', 20));
          this.audio.play('loot');
          this.particles.emit(loot.x, loot.y, { count: 14, color: '#fbbf24', life: 600, speedMin: 1, speedMax: 3 });
        } else if (loot.type === 'rum') {
          this.player.rumFrenzyTimer = 8000;
          this.floatingTexts.push(new FloatingText(loot.x, loot.y - 25, '⚡ RUM FRENZY! (8s)', '#c084fc', 22));
          this.audio.play('frenzy');
          this.renderer.shake(4);
          this.particles.emit(loot.x, loot.y, { count: 18, color: '#c084fc', life: 700, speedMin: 2, speedMax: 5 });
        } else if (loot.type === 'keg') {
          this._detonateKeg(loot);
        }
      }
    }
  }

  _detonateKeg(keg) {
    if (!keg.alive) return;
    keg.alive = false;
    this.particles.powderKegBlast(keg.x, keg.y);
    this.audio.play('keg');
    this.renderer.shake(14);
    this.floatingTexts.push(new FloatingText(keg.x, keg.y - 30, '💥 BOOM! KEG BLAST', '#ef4444', 24));

    const blastRadius = 150;
    const blastDmg = 185;

    // Damage enemies in blast radius
    for (const enemy of this.waves.enemies) {
      if (!enemy.alive) continue;
      const d = Math.hypot(enemy.x - keg.x, enemy.y - keg.y);
      if (d < blastRadius) {
        const killed = enemy.takeDamage(blastDmg, blastDmg * 0.5, blastDmg * 0.5);
        this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, `-${blastDmg}`, '#ef4444'));
        if (killed) this._onKill(enemy);
      }
    }

    // Damage player if caught in blast
    if (this.player.alive) {
      const dp = Math.hypot(this.player.x - keg.x, this.player.y - keg.y);
      if (dp < blastRadius) {
        this.player.takeDamage(35, 20, 10);
      }
    }

    // Chain detonate nearby kegs
    for (const other of this.lootDrops) {
      if (other !== keg && other.type === 'keg' && other.alive) {
        if (Math.hypot(other.x - keg.x, other.y - keg.y) < blastRadius) {
          setTimeout(() => this._detonateKeg(other), 120);
        }
      }
    }
  }

  _updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      p.update(dt);

      // Check collision with floating Powder Kegs
      for (const loot of this.lootDrops) {
        if (loot.alive && loot.type === 'keg') {
          if (Math.hypot(p.x - loot.x, p.y - loot.y) < loot.radius + 6) {
            p.alive = false;
            this._detonateKeg(loot);
            break;
          }
        }
      }
      if (!p.alive) continue;

      if (p.owner === 'player') {
        for (const enemy of this.waves.enemies) {
          if (!enemy.alive) continue;
          const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
          if (d < (enemy.def?.size || 25) * 1.15) {
            // RAKING BROADSIDE CHECK ("Crossing the T")
            const hitAngle = Math.atan2(p.vy, p.vx);
            const angleDiffVal = Math.abs(angleDiff(hitAngle, enemy.angle));
            const isRake = angleDiffVal < 0.45 || Math.abs(angleDiffVal - Math.PI) < 0.45;
            const rakeMult = isRake ? 2.2 : 1.0;

            const dmg = (p.gun.damage || 1) * rakeMult;
            const killed = enemy.takeDamage(
              p.ammo.hullDmg * dmg,
              p.ammo.sailDmg * dmg,
              p.ammo.crewDmg * dmg,
              p.ammo.slowDuration ? { duration: p.ammo.slowDuration } : null
            );
            p.alive = false;

            if (isRake) {
              this.particles.woodSplinters(enemy.x, enemy.y, p.angle, 20);
              this.audio.play('rake');
              this.renderer.shake(7.5);
              this.floatingTexts.push(new FloatingText(
                enemy.x, enemy.y - 36,
                `☠ CRITICAL RAKE! -${Math.round(p.ammo.hullDmg * dmg)} ☠`,
                '#facc15',
                22
              ));
            } else {
              const totalHitDmg = Math.round(p.ammo.hullDmg * dmg);
              if (p.ammoType === 'chain') {
                this.particles.sailShred(p.x, p.y, p.angle);
                this.audio.play('impact_chain');
                this.renderer.shake(2.0);
                this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, `⦾ -${totalHitDmg}`, '#38bdf8', 16));
              } else if (p.ammoType === 'grape') {
                this.particles.crewDecimate(p.x, p.y, p.angle);
                this.audio.play('impact_grape');
                this.renderer.shake(2.2);
                this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, `✦ -${totalHitDmg}`, '#ef4444', 16));
              } else {
                this.particles.woodSplinters(p.x, p.y, p.angle, 14);
                this.particles.emit(p.x, p.y, { count: 8, color: '#f97316', life: 350, speedMin: 2, speedMax: 6 });
                this.audio.play('impact_round');
                this.renderer.shake(4.5);
                this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, `💥 -${totalHitDmg} HEAVY!`, '#f97316', 18));
              }
            }

            if (killed) {
              this._onKill(enemy);
            }
            break;
          }
        }
      } else if (p.owner === 'enemy') {
        const d = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        const hitDist = p.isMortar ? 48 : (PLAYER.size * 0.88);
        if (d < hitDist && (!p.isMortar || p.z < 8)) {
          const res = this.player.takeDamage(p.ammo.hullDmg, p.ammo.sailDmg, p.ammo.crewDmg);
          p.alive = false;
          if (res?.blocked) {
            this.audio.play('deflect');
            this.renderer.shake(3);
            this.particles.emit(this.player.x, this.player.y, {
              count: 14, speedMin: 2, speedMax: 5, life: 350, sizeMin: 2, sizeMax: 5, color: '#38bdf8',
            });
            this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 25, '🛡️ -60% DEFLECTED', '#38bdf8', 19));
          } else {
            this.particles.damage(this.player.x, this.player.y);
            this.audio.play('hit');
            this.renderer.shake(5);
          }
          if (!this.player.alive) {
            this.particles.explosion(this.player.x, this.player.y, 2.5);
            this.audio.play('death');
            this.renderer.shake(16);
          }
        }
      }

      // Check obstacle collisions
      const obs = this.waves.checkObstacleCollision(p.x, p.y, 6);
      if (obs) {
        p.alive = false;
        this.particles.splash(p.x, p.y, 1.2);
        this.audio.play('splash');
      }
    }

    this.projectiles = this.projectiles.filter(p => p.alive);
  }

  _checkObstacleCollisions() {
    const obs = this.waves.checkObstacleCollision(this.player.x, this.player.y, PLAYER.size * 0.6);
    if (obs) {
      this.player.takeDamage(4, 3, 0);
      const angle = Math.atan2(this.player.y - obs.y, this.player.x - obs.x);
      this.player.x += Math.cos(angle) * 6;
      this.player.y += Math.sin(angle) * 6;
      this.renderer.shake(3);
    }

    for (const enemy of this.waves.enemies) {
      const obsHit = this.waves.checkObstacleCollision(enemy.x, enemy.y, (enemy.def?.size || 25) * 0.55);
      if (obsHit) {
        const angle = Math.atan2(enemy.y - obsHit.y, enemy.x - obsHit.x);
        enemy.x += Math.cos(angle) * 4;
        enemy.y += Math.sin(angle) * 4;
      }
    }
  }

  _onKill(enemy) {
    this.kills++;
    this.combo++;
    this.comboTimer = COMBO_TIMEOUT;
    this.comboIndex = Math.min(Math.floor(this.combo / 3), COMBO_MULTIPLIERS.length - 1);
    this.maxCombo = Math.max(this.maxCombo, COMBO_MULTIPLIERS[this.comboIndex]);

    const mult = COMBO_MULTIPLIERS[this.comboIndex];
    const points = Math.round((enemy.def?.score || 100) * mult);
    this.score += points;

    const baseCoins = enemy.isBoss ? 450 : (enemy.isMiniBoss ? 160 : 35);
    const coinsEarned = this.player.addCoins(Math.round(baseCoins * mult));

    // Spawn authentic sinking ship sequence!
    this.sinkingShips.push(new SinkingShip(enemy, this.player));

    this.particles.explosion(enemy.x, enemy.y, enemy.isBoss ? 2.8 : enemy.isMiniBoss ? 1.8 : 1.2);
    this.particles.addSinkingDebris(enemy.x, enemy.y, enemy.isBoss ? 8 : 4);
    this.audio.play('sink');
    this.audio.play('explosion');
    this.renderer.shake(enemy.isBoss ? 14 : enemy.isMiniBoss ? 9 : 5.5);

    const color = mult > 1 ? '#ff6b35' : '#ffd700';
    this.floatingTexts.push(new FloatingText(
      enemy.x, enemy.y - 30,
      `+${points} · 🪙 +${coinsEarned}`,
      color,
      20
    ));

    // Spawn floating salvage loot drops
    const dropTypes = ['gold', 'gold', 'wood', 'sail', 'crew', 'rum', 'keg'];
    const dropCount = enemy.isBoss ? 5 : enemy.isMiniBoss ? 3 : 2;

    for (let i = 0; i < dropCount; i++) {
      const type = enemy.isBoss && i === 0 ? 'rum' : pick(dropTypes);
      const angle = rand(0, Math.PI * 2);
      const dist = rand(15, 45);
      this.lootDrops.push(new LootDrop(
        enemy.x + Math.cos(angle) * dist,
        enemy.y + Math.sin(angle) * dist,
        type
      ));
    }
  }

  _gameOver() {
    this.state = 'gameover';
    const stats = {
      score: this.score,
      wave: this.waves.wave,
      kills: this.kills,
      maxCombo: this.maxCombo,
    };
    const isHighScore = this.ui.saveScore({
      ...stats,
      date: new Date().toISOString(),
    });
    this.ui.showGameOver(stats, isHighScore);
  }

  render() {
    const level = this.waves.currentLevel;
    this.renderer.clear();

    // 1. Dynamic Ocean Water & Atmosphere
    this.renderer.drawBackground(level, this.camera, this.time, this.wind);

    // 2. Islands & Reef Atolls
    this.renderer.drawObstacles(this.waves.obstacles, this.camera);

    // 3. Sinking Ships (Listed & burning on the sea)
    for (const sinking of this.sinkingShips) {
      this.renderer.drawSinkingShip(sinking, this.camera);
    }

    // 4. Floating Salvage & Loot
    this.renderer.drawLoot(this.lootDrops, this.camera);

    // 5. Enemy Ships
    for (const enemy of this.waves.enemies) {
      this.renderer.drawShip(enemy, this.camera, false);
    }

    // 6. Player Ship
    if (this.player.alive && (this.state === 'playing' || this.state === 'paused')) {
      const target = this.input.getWorldTarget(this.camera);
      this.renderer.drawAimIndicator(this.player, this.camera, target.x, target.y);
      this.renderer.drawShip(this.player, this.camera, true);
    }

    // 7. Active Harpoon Cables
    for (const h of this.harpoons) {
      this.renderer.drawHarpoon(h, this.player, this.camera);
    }

    // 8. Projectiles (3D Cannonballs & Mortars)
    this.renderer.drawAllProjectiles(this.projectiles, this.camera);

    // 9. Dynamic Particles & VFX
    this.particles.draw(this.renderer.ctx, this.camera);

    // 10. Floating Combat & Loot Texts
    this.renderer.drawFloatingTexts(this.floatingTexts, this.camera);

    // 11. Nautical Radar Compass Minimap
    if (this.state === 'playing' || this.state === 'paused') {
      this.renderer.drawMinimap(this.player, this.waves.enemies, this.waves.obstacles, this.lootDrops, this.wind);
    }

    // 12. Custom Aim Reticle
    if (this.state === 'playing') {
      const target = this.input.getWorldTarget(this.camera);
      this.renderer.drawCustomCursor(target.x, target.y, this.camera, this.player, this.time);
    }
  }
}

function bootGame() {
  try {
    window.game = new Game();
  } catch (err) {
    console.error('Game failed to start:', err);
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;inset:0;background:#1a0505;color:#f44;display:flex;align-items:center;justify-content:center;z-index:9999;font-family:sans-serif;padding:2rem;text-align:center;';
    banner.innerHTML = '<div><h2>Game failed to load</h2><p>' + err.message + '</p><p style="margin-top:1rem;color:#aaa;font-size:0.9rem">Try refreshing the page.</p></div>';
    document.body.appendChild(banner);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}
