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
    this.ui.showMenu(this.player);
    requestAnimationFrame(t => this.loop(t));
  }

  _bindUI() {
    this.ui.onStart = () => this.startGame();
    this.ui.onRetry = () => this.startGame();
    this.ui.onMenu = () => this.toMenu();
    this.ui.onResume = () => this.resume();
    this.ui.onToggleArmory = () => this.toggleArmory();
    this.ui.onAmmoSwitch = index => {
      if (this.state === 'playing') {
        const modeIdx = typeof index === 'number' ? index : (index === 'round' ? 0 : index === 'chain' ? 1 : index === 'grape' ? 2 : parseInt(index, 10) || 0);
        this.player.setAmmoModeIndex(modeIdx);
        this.ui.highlightActiveAmmo(this.player.ammoModeIndex);
        this.audio.play('ui');
        const activeMode = this.player.activeAmmoMode;
        if (activeMode) {
          this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 38, `${activeMode.icon || '●'} ${activeMode.name}`, activeMode.glow || '#facc15', 18));
        }
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
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboIndex = 0;
    this.comboTimer = 0;
    this.maxCombo = 1;
    this.projectiles = [];
    this.lootDrops = [];
    this.floatingTexts = [];
    this.particles = new ParticleSystem();
    this.camera = { x: 0, y: 0 };
    this.waveDelay = 1500;

    this.ui.hideAllModals();
    this.ui.elements.mainMenu.classList.add('hidden');
    this.ui.elements.hud.classList.remove('hidden');
    this.ui.elements.touchControls.classList.toggle('hidden', !this.isMobile);
    this.ui.updateWeaponAmmoSelector(this.player);
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
    const ammoRotate = this.input.consumeAmmoRotate();
    if (ammoSwitch != null || ammoRotate !== 0) {
      if (ammoSwitch != null) {
        const modeIdx = typeof ammoSwitch === 'number' ? ammoSwitch : (ammoSwitch === 'round' ? 0 : ammoSwitch === 'chain' ? 1 : ammoSwitch === 'grape' ? 2 : parseInt(ammoSwitch, 10) || 0);
        this.player.setAmmoModeIndex(modeIdx);
      } else if (ammoRotate !== 0) {
        this.player.cycleAmmoMode(ammoRotate);
      }
      this.ui.highlightActiveAmmo(this.player.ammoModeIndex);
      this.audio.play('ui');

      const activeMode = this.player.activeAmmoMode;
      if (activeMode) {
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 38, `${activeMode.icon || '●'} ${activeMode.name}`, activeMode.glow || '#facc15', 18));
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

    // Update Player with wind vector
    this.player.update(input, dt, this.wind);

    // Continuous hydrodynamic wake
    if (this.player.alive && (this.player.vx !== 0 || this.player.vy !== 0)) {
      this.particles.wake(this.player.x, this.player.y, this.player.angle);
    }

    // Standard Chaser / Swivel Cannons (Mouse / Space)
    if (input.fire && this.player.canFire()) {
      const target = this._getFireTarget(input);
      const newProj = this.player.fire(target.x, target.y);
      if (newProj.length > 0) {
        this.projectiles.push(...newProj);
        const fireAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
        this.particles.cannonFire(this.player.x, this.player.y, fireAngle);
        this.audio.play('cannon');
        this.renderer.shake(3.5);
      }
    }

    // Devastating Port & Starboard Broadsides (Right-Click / 'E')
    if (input.broadside && this.player.canBroadside()) {
      const bProj = this.player.fireBroadside();
      if (bProj.length > 0) {
        this.projectiles.push(...bProj);
        this.particles.broadsideBlast(this.player.x, this.player.y, this.player.angle - Math.PI / 2);
        this.particles.broadsideBlast(this.player.x, this.player.y, this.player.angle + Math.PI / 2);
        this.audio.play('broadside');
        this.renderer.shake(8);
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 30, '⚡ BROADSIDE SALVO!', '#facc15', 20));
      }
    }

    const enemyProj = this.waves.update(dt, this.player) || [];
    this.projectiles.push(...enemyProj);

    this._updateProjectiles(dt);
    this._updateLoot(dt);
    this._checkObstacleCollisions();

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

    this.particles.update(dt);
    this.floatingTexts.forEach(t => t.update(dt));
    this.floatingTexts = this.floatingTexts.filter(t => t.alive);

    this.camera.x += (this.player.x - this.camera.x) * 0.08;
    this.camera.y += (this.player.y - this.camera.y) * 0.08;

    this.renderer.updateShake();
    this.ui.updateHUD(this.player, this.score, this.combo, this.comboIndex);

    // Update Broadside button / cooldown indicator in HUD if element exists
    const bsIndicator = document.getElementById('broadside-indicator');
    if (bsIndicator) {
      const ready = this.player.broadsideCooldown <= 0;
      bsIndicator.classList.toggle('ready', ready);
      const ratio = Math.max(0, 1 - this.player.broadsideCooldown / this.player.maxBroadsideCooldown);
      bsIndicator.style.setProperty('--cd', `${ratio * 100}%`);
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
      if (d < 36 && this.player.alive) {
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
        } else if (loot.type === 'rum') {
          this.player.rumFrenzyTimer = 8000;
          this.floatingTexts.push(new FloatingText(loot.x, loot.y - 25, '⚡ RUM FRENZY! (8s)', '#c084fc', 22));
          this.audio.play('frenzy');
          this.renderer.shake(4);
          this.particles.emit(loot.x, loot.y, { count: 18, color: '#c084fc', life: 700, speedMin: 2, speedMax: 5 });
        } else if (loot.type === 'keg') {
          // Touching a keg detonates it directly!
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

    const blastRadius = 140;
    const blastDmg = 175;

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
          if (p.hitEnemies && p.hitEnemies.includes(enemy.id)) continue;
          const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
          if (d < (enemy.def?.size || 25) * 1.15) {
            const dmg = p.gun?.damage || 1;
            const killed = enemy.takeDamage(
              p.ammo.hullDmg * dmg,
              p.ammo.sailDmg * dmg,
              p.ammo.crewDmg * dmg,
              p.ammo.slowDuration ? { duration: p.ammo.slowDuration } : null
            );

            if (p.hitEnemies) p.hitEnemies.push(enemy.id);

            // Life-steal perk (e.g. Kraken Abyssal Tendrils)
            if (p.ammo.lifeSteal && this.player.alive) {
              const healAmt = Math.max(1, Math.round(p.ammo.hullDmg * dmg * 0.18));
              this.player.heal(healAmt);
              this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 20, `+${healAmt} Siphon`, '#a855f7', 18));
            }

            // Chain Lightning perk (e.g. Poseidon Tempest Arc)
            if (p.ammo.chainLightning) {
              this._triggerChainLightning(enemy, p.ammo.hullDmg * dmg * 0.6);
            }

            // AOE explosive shockwave (e.g. Magma Mortar, Cluster, Cataclysm)
            if (p.aoeRadius > 0) {
              this._triggerAOEBlast(p.x, p.y, p.aoeRadius, p.ammo.hullDmg * dmg * 0.75, p.ammo.color || '#f97316');
            }

            // Check piercing
            if (p.pierceCount > 0) {
              p.pierceCount--;
              this.particles.emit(p.x, p.y, { count: 14, color: p.ammo.color || '#38bdf8', life: 400, speedMin: 3, speedMax: 7 });
              this.audio.play('hit');
              this.renderer.shake(2.2);
              this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 22, `-${Math.round(p.ammo.hullDmg * dmg)} ⚡PIERCED!`, p.ammo.color || '#38bdf8', 22));
            } else {
              p.alive = false;
              this.particles.emit(p.x, p.y, { count: 6, color: p.ammo.color || '#ffd700', life: 300, speedMin: 2, speedMax: 4 });
              this.audio.play('hit');
              if (!killed) {
                this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, `-${Math.round(p.ammo.hullDmg * dmg)}`, '#ff6666'));
              }
            }

            if (killed) {
              this._onKill(enemy);
            }
            if (!p.alive) break;
          }
        }
      } else if (p.owner === 'enemy') {
        const d = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        // If mortar, only damages near impact landing
        const hitDist = p.isMortar ? 45 : (PLAYER.size * 0.85);
        if (d < hitDist && (!p.isMortar || p.z < 8)) {
          this.player.takeDamage(p.ammo.hullDmg, p.ammo.sailDmg, p.ammo.crewDmg);
          p.alive = false;
          this.particles.damage(this.player.x, this.player.y);
          this.audio.play('hit');
          this.renderer.shake(5);
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
        this.particles.splash(p.x, p.y, 1);
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

    this.particles.explosion(enemy.x, enemy.y, enemy.isBoss ? 2.8 : enemy.isMiniBoss ? 1.8 : 1.2);
    this.audio.play('explosion');
    this.renderer.shake(enemy.isBoss ? 14 : enemy.isMiniBoss ? 9 : 5.5);

    const color = mult > 1 ? '#ff6b35' : '#ffd700';
    this.floatingTexts.push(new FloatingText(
      enemy.x, enemy.y - 30,
      `+${points} · 🪙 +${coinsEarned}`,
      color,
      20
    ));

    // Spawn floating salvage loot drops!
    const dropTypes = ['gold', 'gold', 'wood', 'rum', 'keg'];
    const dropCount = enemy.isBoss ? 4 : enemy.isMiniBoss ? 2 : 1;

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

  _triggerChainLightning(sourceEnemy, dmg) {
    let chains = 0;
    const maxChains = 3;
    for (const other of this.waves.enemies) {
      if (other !== sourceEnemy && other.alive) {
        const d = Math.hypot(other.x - sourceEnemy.x, other.y - sourceEnemy.y);
        if (d < 240) {
          const killed = other.takeDamage(dmg, dmg * 0.5, dmg * 0.5);
          this.floatingTexts.push(new FloatingText(other.x, other.y - 20, `⚡ -${Math.round(dmg)}`, '#06b6d4', 18));
          this.particles.emit((sourceEnemy.x + other.x) / 2, (sourceEnemy.y + other.y) / 2, {
            count: 8,
            color: '#06b6d4',
            life: 300,
            speedMin: 3,
            speedMax: 6,
          });
          if (killed) this._onKill(other);
          chains++;
          if (chains >= maxChains) break;
        }
      }
    }
  }

  _triggerAOEBlast(x, y, radius, dmg, color) {
    this.particles.explosion(x, y, 1.4);
    this.renderer.shake(5);
    for (const enemy of this.waves.enemies) {
      if (!enemy.alive) continue;
      const d = Math.hypot(enemy.x - x, enemy.y - y);
      if (d < radius) {
        const killed = enemy.takeDamage(dmg, dmg * 0.4, dmg * 0.4);
        this.floatingTexts.push(new FloatingText(enemy.x, enemy.y - 20, `💥 -${Math.round(dmg)}`, color, 18));
        if (killed) this._onKill(enemy);
      }
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

    // 1. Pure Top-Down Ocean & Atmosphere
    this.renderer.drawBackground(level, this.camera, this.time, this.wind);

    // 2. Top-Down Islands & Obstacles
    this.renderer.drawObstacles(this.waves.obstacles, this.camera);

    // 3. Floating Salvage & Loot
    this.renderer.drawLoot(this.lootDrops, this.camera);

    // 4. Enemy Ships (Top-Down)
    for (const enemy of this.waves.enemies) {
      this.renderer.drawShip(enemy, this.camera, false);
    }

    // 5. Player Ship (Top-Down)
    if (this.player.alive && (this.state === 'playing' || this.state === 'paused')) {
      const target = this.input.getWorldTarget(this.camera);
      this.renderer.drawAimIndicator(this.player, this.camera, target.x, target.y);
      this.renderer.drawShip(this.player, this.camera, true);
    }

    // 6. Projectiles
    this.renderer.drawAllProjectiles(this.projectiles, this.camera);

    // 7. Dynamic Particles & Ripples
    this.particles.draw(this.renderer.ctx, this.camera);

    // 8. Floating Combat & Loot Texts
    this.renderer.drawFloatingTexts(this.floatingTexts, this.camera);

    // 9. Tactical Nautical Radar Minimap
    if (this.state === 'playing' || this.state === 'paused') {
      this.renderer.drawMinimap(this.player, this.waves.enemies, this.waves.obstacles, this.lootDrops, this.wind);
    }

    // 10. Custom Aim Crosshair
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
