let nextId = 0;
const FRAME_MS = 1000 / 60;

class Projectile {
  constructor(x, y, angle, ammoType, owner, gun = {}, isBroadside = false) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.ammoType = ammoType;
    this.ammo = AMMO[ammoType] || AMMO.round;
    this.owner = owner;
    this.gun = gun;
    const speedMult = gun.bulletType === 'sniper' ? 1.5 : (gun.bulletType === 'smasher' ? 0.92 : 1);
    this.speed = (this.ammo.speed || 20) * speedMult;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    const range = gun.range || 600;
    this.life = (range / this.speed) * FRAME_MS;
    this.maxLife = this.life;
    this.alive = true;
    this.isMortar = gun.bulletType === 'magma';
    this.isBroadside = isBroadside;
    this.z = 0;
    this.trail = [{ x, y, z: 0 }];
    this.pierceCount = 0;
    this.hitEnemies = [];
    this.special = 'standard';
    this.aoeRadius = 0;
  }

  update(dt) {
    if (!this.alive) return;
    const step = dt / FRAME_MS;
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }

    // Homing tracking for seeking void/abyssal projectiles
    if (this.special === 'homing' && this.owner === 'player' && window.game?.waves?.enemies) {
      let nearest = null;
      let nearD = 380;
      for (const enemy of window.game.waves.enemies) {
        if (!enemy.alive) continue;
        const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (d < nearD) {
          nearD = d;
          nearest = enemy;
        }
      }
      if (nearest) {
        const targetA = Math.atan2(nearest.y - this.y, nearest.x - this.x);
        const diff = angleDiff(this.angle, targetA);
        this.angle += diff * Math.min(1, 0.085 * step);
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
      }
    }

    this.x += this.vx * step;
    this.y += this.vy * step;

    // Height arc for mortar bombs (ballistic curve over water)
    if (this.isMortar) {
      const progress = 1 - Math.max(0, this.life / this.maxLife);
      this.z = Math.sin(progress * Math.PI) * 55;
    } else {
      this.z = 0;
    }

    this.trail.push({ x: this.x, y: this.y, z: this.z });
    if (this.trail.length > 14) this.trail.shift();
  }
}

class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.angle = -Math.PI / 2;
    this.targetAngle = -Math.PI / 2;
    this.hull = PLAYER.maxHull;
    this.sail = PLAYER.maxSail;
    this.crew = PLAYER.maxCrew;
    this.ammoModeIndex = 0;
    this.ammoType = 'standard';
    this.coins = parseInt(localStorage.getItem('blackpearl_coins') || '0', 10);
    this.ownedGuns = JSON.parse(localStorage.getItem('blackpearl_guns') || '[0]');
    if (!this.ownedGuns.includes(0)) this.ownedGuns.push(0);
    this.gunIndex = this.ownedGuns[this.ownedGuns.length - 1] || 0;
    this.ownedShips = JSON.parse(localStorage.getItem('blackpearl_owned_ships') || '["black_pearl"]');
    if (!this.ownedShips.includes('black_pearl')) this.ownedShips.push('black_pearl');
    this.currentShipId = localStorage.getItem('blackpearl_active_ship') || 'black_pearl';
    if (!this.ownedShips.includes(this.currentShipId)) this.currentShipId = 'black_pearl';
    this.reloadTimer = 0;
    this.repairCooldown = 0;
    this.repairing = false;
    this.repairTimer = 0;
    this.alive = true;
    this.invuln = 0;
    this.smokeLevel = 0;
    this.fireLevel = 0;
    this.vx = 0;
    this.vy = 0;
    this.broadsideCooldown = 0;
    this.maxBroadsideCooldown = 3200;
    this.rumFrenzyTimer = 0;
    this.bobPhase = 0;
    this.wakeTimer = 0;
    this.loadUpgrades();
  }

  get shipDef() {
    return PLAYABLE_SHIPS.find(s => s.id === this.currentShipId) || PLAYABLE_SHIPS[0];
  }

  loadUpgrades() {
    this.shipUpgrades = JSON.parse(localStorage.getItem('blackpearl_ship_upgrades') || '{"hull":1,"sails":1,"bunks":1,"repair":1,"broadside":1}');
    this.crewUpgrades = JSON.parse(localStorage.getItem('blackpearl_crew_upgrades') || '{"captain":1,"gunner":1,"navigator":1,"surgeon":1,"carpenter":1,"quartermaster":1}');
    const base = this.shipDef;
    this.maxHull = (base.hull || 100) + (this.shipUpgrades.hull - 1) * 25;
    this.hull = this.maxHull;
    this.maxSail = (base.sail || 100) + (this.shipUpgrades.sails - 1) * 15;
    this.sail = this.maxSail;
    this.maxCrew = (base.crew || 100) + (this.shipUpgrades.bunks - 1) * 20;
    this.crew = this.maxCrew;
    this.repairAmount = 25 + (this.shipUpgrades.repair - 1) * 10;
    this.repairCooldownMax = Math.max(3500, 8000 - (this.shipUpgrades.repair - 1) * 1000);
  }

  canBuyShip(id) {
    const def = PLAYABLE_SHIPS.find(s => s.id === id);
    if (!def) return false;
    return this.coins >= def.price && !this.ownedShips.includes(id);
  }

  buyShip(id) {
    const def = PLAYABLE_SHIPS.find(s => s.id === id);
    if (!def || !this.canBuyShip(id)) return false;
    this.coins -= def.price;
    localStorage.setItem('blackpearl_coins', this.coins.toString());
    this.ownedShips.push(id);
    localStorage.setItem('blackpearl_owned_ships', JSON.stringify(this.ownedShips));
    this.currentShipId = id;
    localStorage.setItem('blackpearl_active_ship', id);
    this.loadUpgrades();
    return true;
  }

  equipShip(id) {
    if (this.ownedShips.includes(id)) {
      this.currentShipId = id;
      localStorage.setItem('blackpearl_active_ship', id);
      this.loadUpgrades();
      return true;
    }
    return false;
  }

  get gun() { return GUNS[this.gunIndex] || GUNS[0]; }

  get activeAmmoMode() {
    const modes = this.gun?.ammoModes;
    if (modes && modes.length > 0) {
      return modes[this.ammoModeIndex] || modes[0];
    }
    return AMMO.round;
  }

  setAmmoModeIndex(index) {
    const maxIdx = (this.gun?.ammoModes?.length || 3) - 1;
    this.ammoModeIndex = clamp(index, 0, Math.max(0, maxIdx));
    this.ammoType = this.activeAmmoMode?.id || 'standard';
  }

  cycleAmmoMode(direction = 1) {
    const modes = this.gun?.ammoModes;
    const count = modes && modes.length > 0 ? modes.length : 3;
    const step = direction > 0 ? 1 : -1;
    this.ammoModeIndex = (this.ammoModeIndex + step + count) % count;
    this.ammoType = this.activeAmmoMode?.id || 'standard';
    return this.ammoModeIndex;
  }

  addCoins(amount) {
    const qmBonus = 1 + (this.crewUpgrades?.quartermaster ? (this.crewUpgrades.quartermaster - 1) * 0.25 : 0);
    const finalAmt = Math.round(amount * qmBonus);
    this.coins += finalAmt;
    localStorage.setItem('blackpearl_coins', this.coins.toString());
    return finalAmt;
  }

  canBuyGun(id) {
    const g = GUNS[id];
    if (!g) return false;
    return this.coins >= g.price && !this.ownedGuns.includes(id);
  }

  buyGun(id) {
    const g = GUNS[id];
    if (!g || !this.canBuyGun(id)) return false;
    this.coins -= g.price;
    localStorage.setItem('blackpearl_coins', this.coins.toString());
    this.ownedGuns.push(id);
    localStorage.setItem('blackpearl_guns', JSON.stringify(this.ownedGuns));
    this.gunIndex = id;
    this.ammoModeIndex = 0;
    this.ammoType = this.activeAmmoMode?.id || 'standard';
    return true;
  }

  equipGun(id) {
    if (this.ownedGuns.includes(id)) {
      this.gunIndex = id;
      this.ammoModeIndex = 0;
      this.ammoType = this.activeAmmoMode?.id || 'standard';
      return true;
    }
    return false;
  }

  getShipUpgradeLevel(id) { return this.shipUpgrades?.[id] || 1; }

  getShipUpgradePrice(id) {
    const def = SHIP_UPGRADES_DEF.find(u => u.id === id);
    if (!def) return 99999;
    const lvl = this.getShipUpgradeLevel(id);
    return Math.round(def.basePrice * Math.pow(def.priceScale, lvl - 1));
  }

  buyShipUpgrade(id) {
    const def = SHIP_UPGRADES_DEF.find(u => u.id === id);
    if (!def) return false;
    const lvl = this.getShipUpgradeLevel(id);
    if (lvl >= def.maxLevel) return false;
    const price = this.getShipUpgradePrice(id);
    if (this.coins < price) return false;
    this.coins -= price;
    this.shipUpgrades[id] = lvl + 1;
    localStorage.setItem('blackpearl_coins', this.coins.toString());
    localStorage.setItem('blackpearl_ship_upgrades', JSON.stringify(this.shipUpgrades));
    this.loadUpgrades();
    return true;
  }

  getCrewOfficerLevel(id) { return this.crewUpgrades?.[id] || 1; }

  getCrewOfficerPrice(id) {
    const def = CREW_OFFICERS_DEF.find(c => c.id === id);
    if (!def) return 99999;
    const lvl = this.getCrewOfficerLevel(id);
    return Math.round(def.basePrice * Math.pow(def.priceScale, lvl - 1));
  }

  promoteCrewOfficer(id) {
    const def = CREW_OFFICERS_DEF.find(c => c.id === id);
    if (!def) return false;
    const lvl = this.getCrewOfficerLevel(id);
    if (lvl >= def.maxLevel) return false;
    const price = this.getCrewOfficerPrice(id);
    if (this.coins < price) return false;
    this.coins -= price;
    this.crewUpgrades[id] = lvl + 1;
    localStorage.setItem('blackpearl_coins', this.coins.toString());
    localStorage.setItem('blackpearl_crew_upgrades', JSON.stringify(this.crewUpgrades));
    this.loadUpgrades();
    return true;
  }

  get effectiveSpeed() {
    const baseSpeed = this.shipDef?.speed || PLAYER.speed;
    let base = baseSpeed * (0.5 + 0.5 * (this.sail / this.maxSail));
    const sailsBonus = 1 + (this.shipUpgrades?.sails ? (this.shipUpgrades.sails - 1) * 0.12 : 0);
    const navBonus = 1 + (this.crewUpgrades?.navigator ? (this.crewUpgrades.navigator - 1) * 0.08 : 0);
    let spd = base * sailsBonus * navBonus;
    if (this.rumFrenzyTimer > 0) spd *= 1.45;
    return spd;
  }

  get reloadTime() {
    const crewMod = 0.5 + 0.5 * (this.crew / this.maxCrew);
    const bunksMod = 1 + (this.shipUpgrades?.bunks ? (this.shipUpgrades.bunks - 1) * 0.1 : 0);
    let t = (this.gun.reload / (crewMod * bunksMod));
    if (this.rumFrenzyTimer > 0) t *= 0.5;
    return t;
  }

  update(input, dt, wind = { x: 0.8, y: -0.6 }) {
    if (!this.alive) return;

    const step = dt / FRAME_MS;

    if (this.invuln > 0) this.invuln -= dt;
    if (this.reloadTimer > 0) this.reloadTimer -= dt;
    if (this.repairCooldown > 0) this.repairCooldown -= dt;
    if (this.broadsideCooldown > 0) this.broadsideCooldown -= dt;
    if (this.rumFrenzyTimer > 0) this.rumFrenzyTimer -= dt;

    this.bobPhase += dt * 0.0035;

    // Passive surgeon health and crew regeneration
    if (this.crewUpgrades?.surgeon > 1) {
      const regenRate = (this.crewUpgrades.surgeon - 1) * 0.35;
      this.hull = clamp(this.hull + regenRate * (dt / 1000), 0, this.maxHull);
      this.crew = clamp(this.crew + regenRate * (dt / 1000), 0, this.maxCrew);
    }

    if (this.repairing) {
      this.repairTimer -= dt;
      const repairRate = (this.repairAmount / PLAYER.repairDuration) * dt;
      this.hull = clamp(this.hull + repairRate, 0, this.maxHull);
      this.sail = clamp(this.sail + repairRate, 0, this.maxSail);
      if (this.repairTimer <= 0) {
        this.repairing = false;
        this.repairCooldown = this.repairCooldownMax || PLAYER.repairCooldown;
      }
    }

    // Direct WASD movement in top-down world
    let mx = 0;
    let my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;

    let moveSpeed = this.effectiveSpeed;
    const isMoving = mx !== 0 || my !== 0;

    if (isMoving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;

      // Wind mechanic: alignment with wind vector adds tailwind speed
      const windLen = Math.hypot(wind.x, wind.y) || 1;
      const wx = wind.x / windLen;
      const wy = wind.y / windLen;
      const windDot = mx * wx + my * wy;
      this.windDot = windDot;
      if (windDot > 0.1) {
        moveSpeed *= (1 + windDot * 0.25);
      }

      this.x += mx * moveSpeed * step;
      this.y += my * moveSpeed * step;
      this.vx = mx * moveSpeed;
      this.vy = my * moveSpeed;
      this.targetAngle = Math.atan2(my, mx);
    } else if (this.repairing) {
      // Ship should NOT stop when healing: maintain forward sailing momentum along current heading
      const hx = Math.cos(this.angle);
      const hy = Math.sin(this.angle);

      const windLen = Math.hypot(wind.x, wind.y) || 1;
      const wx = wind.x / windLen;
      const wy = wind.y / windLen;
      const windDot = hx * wx + hy * wy;
      this.windDot = windDot;
      if (windDot > 0.1) {
        moveSpeed *= (1 + windDot * 0.25);
      }

      this.x += hx * moveSpeed * step;
      this.y += hy * moveSpeed * step;
      this.vx = hx * moveSpeed;
      this.vy = hy * moveSpeed;
    } else {
      this.windDot = 0;
      this.vx = 0;
      this.vy = 0;
    }

    // If mouse is aiming, the ship steers towards target when stopped or blends
    if (input.targetX != null && input.targetY != null) {
      const aimAngle = Math.atan2(input.targetY - this.y, input.targetX - this.x);
      if (!isMoving && !this.repairing) {
        this.targetAngle = aimAngle;
      }
    }

    const diff = angleDiff(this.angle, this.targetAngle);
    const turnRateBase = (this.shipDef?.turnRate ? this.shipDef.turnRate * 3.5 : 0.16);
    const navTurnBonus = 1 + (this.crewUpgrades?.navigator ? (this.crewUpgrades.navigator - 1) * 0.18 : 0);
    this.angle += diff * Math.min(1, turnRateBase * navTurnBonus * step);

    const wrapped = wrapWorld(this.x, this.y);
    this.x = wrapped.x;
    this.y = wrapped.y;

    this.smokeLevel = clamp((1 - this.hull / PLAYER.maxHull) * 3, 0, 3);
    this.fireLevel = this.hull < 30 ? 2 : this.hull < 50 ? 1 : 0;
  }

  canFire() {
    return this.alive && this.reloadTimer <= 0 && this.crew > 5;
  }

  canBroadside() {
    return this.alive && this.broadsideCooldown <= 0 && this.crew > 10;
  }

  fire(targetX, targetY) {
    if (!this.canFire()) return [];
    this.reloadTimer = this.reloadTime;

    const baseAngle = Math.atan2(targetY - this.y, targetX - this.x);
    const mode = this.activeAmmoMode;
    const spread = (mode.spread || 0.04) * (this.gun.spreadMod || 1);
    const isShotgun = mode.special === 'shotgun' || (mode.pellets && mode.pellets > 2);
    const isPiercer = mode.special === 'pierce' || (mode.pierce && mode.pierce > 0);
    // Piercers fire single focused shot (lesser bullets); shotguns fire 1 wide-burst volley
    const volley = (isShotgun || isPiercer) ? 1 : (this.gun.volley || 1);
    const perp = baseAngle + Math.PI / 2;
    const projectiles = [];
    const gunnerMod = 1 + (this.crewUpgrades?.gunner ? (this.crewUpgrades.gunner - 1) * 0.15 : 0);

    for (let v = 0; v < volley; v++) {
      const along = (v - (volley - 1) / 2) * 12;
      const sx = this.x + Math.cos(baseAngle) * 30 + Math.cos(perp) * along;
      const sy = this.y + Math.sin(baseAngle) * 30 + Math.sin(perp) * along;
      // Piercers have lesser bullets: strictly 1 single high-velocity armor-piercing projectile!
      const pellets = isPiercer ? 1 : (mode.pellets || 1);
      for (let i = 0; i < pellets; i++) {
        const a = baseAngle + (isPiercer ? rand(-0.008, 0.008) : rand(-spread, spread));
        const p = new Projectile(sx, sy, a, mode.id, 'player', {
          ...this.gun,
          damage: (this.gun.damage || 1) * gunnerMod,
        });
        p.ammo = mode;
        const speedMult = this.gun.bulletType === 'sniper' ? 1.35 : 1;
        p.speed = (mode.speed || 22) * speedMult * (isPiercer ? 1.15 : 1);
        p.vx = Math.cos(a) * p.speed;
        p.vy = Math.sin(a) * p.speed;
        // Shotguns are closer ranged!
        const shotRange = mode.range || (isShotgun ? 285 : (this.gun.range || 600));
        p.life = (shotRange / p.speed) * FRAME_MS;
        p.maxLife = p.life;
        p.pierceCount = mode.pierce || 0;
        p.special = mode.special || 'standard';
        p.aoeRadius = mode.aoeRadius || 0;
        p.isMortar = this.gun.bulletType === 'magma' || mode.special === 'mortar';
        projectiles.push(p);
      }
    }

    return projectiles;
  }

  fireBroadside() {
    if (!this.canBroadside()) return [];
    this.broadsideCooldown = this.maxBroadsideCooldown;

    const projectiles = [];
    const sides = [-Math.PI / 2, Math.PI / 2]; // Port & Starboard
    const extraGuns = this.shipUpgrades?.broadside ? (this.shipUpgrades.broadside - 1) : 0;
    const shipBonus = this.shipDef?.broadsideBonus || 0;
    const gunsPerSide = 3 + Math.min(this.gunIndex, 3) + extraGuns + shipBonus;
    const gunnerMod = 1 + (this.crewUpgrades?.gunner ? (this.crewUpgrades.gunner - 1) * 0.15 : 0);
    const bsMod = 1.3 * (1 + extraGuns * 0.15) * gunnerMod;

    for (const sideOffset of sides) {
      const dirAngle = this.angle + sideOffset;
      for (let g = 0; g < gunsPerSide; g++) {
        const along = (g - (gunsPerSide - 1) / 2) * 14;
        const sx = this.x + Math.cos(this.angle) * along + Math.cos(dirAngle) * 20;
        const sy = this.y + Math.sin(this.angle) * along + Math.sin(dirAngle) * 20;
        const spread = 0.1;
        const a = dirAngle + rand(-spread, spread);
        const p = new Projectile(sx, sy, a, this.ammoType, 'player', {
          ...this.gun,
          damage: (this.gun.damage || 1) * bsMod,
          range: (this.gun.range || 600) * 0.95,
        }, true);
        projectiles.push(p);
      }
    }

    return projectiles;
  }

  startRepair() {
    if (this.repairCooldown > 0 || this.repairing || (this.hull >= this.maxHull && this.sail >= this.maxSail)) return false;
    this.repairing = true;
    this.repairTimer = PLAYER.repairDuration;
    return true;
  }

  takeDamage(hullDmg, sailDmg, crewDmg) {
    if (this.invuln > 0) return;
    this.hull = clamp(this.hull - hullDmg, 0, this.maxHull);
    this.sail = clamp(this.sail - sailDmg, 0, this.maxSail);
    this.crew = clamp(this.crew - crewDmg, 0, this.maxCrew);
    this.invuln = 300;
    if (this.hull <= 0) this.alive = false;
  }

  heal(hullAmt, sailAmt = hullAmt) {
    this.hull = clamp(this.hull + hullAmt, 0, this.maxHull);
    this.sail = clamp(this.sail + sailAmt, 0, this.maxSail);
  }

  restoreCrew(amount) {
    const before = this.crew;
    this.crew = clamp(this.crew + amount, 0, this.maxCrew);
    return Math.round(this.crew - before);
  }

  unlockGun(wave) {
    for (let i = GUNS.length - 1; i >= 0; i--) {
      if (wave >= GUNS[i].unlockWave) {
        if (i > this.gunIndex) {
          this.gunIndex = i;
          return GUNS[i];
        }
        break;
      }
    }
    return null;
  }
}

class Enemy {
  constructor(type, x, y, angle, waveMultiplier = 1) {
    const def = ENEMY_TYPES[type];
    this.id = nextId++;
    this.type = type;
    this.def = def;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.hull = def.hull * waveMultiplier;
    this.maxHull = this.hull;
    this.sail = def.sail;
    this.crew = def.crew;
    this.speed = def.speed;
    this.alive = true;
    this.fireTimer = rand(500, def.fireRate);
    this.slowTimer = 0;
    this.wobble = rand(0, Math.PI * 2);
    this.behaviorTimer = 0;
    this.targetAngle = angle;
    this.isBoss = def.isBoss || false;
    this.isMiniBoss = def.isMiniBoss || false;
    this.bobPhase = rand(0, Math.PI * 2);
  }

  get effectiveSpeed() {
    const slow = this.slowTimer > 0 ? 0.5 : 1;
    const sailMod = 0.3 + 0.7 * (this.sail / this.def.sail);
    return this.speed * slow * sailMod;
  }

  update(player, dt, world) {
    if (!this.alive) return;
    if (this.slowTimer > 0) this.slowTimer -= dt;
    this.wobble += dt * 0.002;
    this.bobPhase += dt * 0.003;
    this.behaviorTimer += dt;
    this.fireTimer -= dt;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);

    switch (this.def.behavior) {
      case 'swarm':
        this.targetAngle = targetAngle + Math.sin(this.wobble) * 0.8;
        break;
      case 'flank': {
        const flank = Math.sin(this.behaviorTimer * 0.001) > 0 ? 1.2 : -1.2;
        this.targetAngle = targetAngle + flank;
        break;
      }
      case 'siege':
        if (d > this.def.range * 0.8) {
          this.targetAngle = targetAngle;
        } else {
          this.targetAngle = targetAngle + Math.PI * 0.5;
        }
        break;
      case 'advance':
        this.targetAngle = targetAngle;
        break;
      case 'boss':
        this.targetAngle = targetAngle + Math.sin(this.wobble * 0.5) * 0.3;
        break;
    }

    const diff = angleDiff(this.angle, this.targetAngle);
    this.angle += clamp(diff, -this.def.turnRate, this.def.turnRate);

    const moveSpeed = this.def.behavior === 'siege' && d < this.def.range ? 0.3 : 1;
    const step = dt / FRAME_MS;
    this.x += Math.cos(this.angle) * this.effectiveSpeed * moveSpeed * step;
    this.y += Math.sin(this.angle) * this.effectiveSpeed * moveSpeed * step;

    if (this.fireTimer <= 0 && d < this.def.range && this.crew > 5) {
      this.fireTimer = this.def.fireRate;
      return this.createProjectile(player);
    }
    return null;
  }

  createProjectile(player) {
    const angle = angleBetween(this.x, this.y, player.x, player.y);
    const spread = this.def.mortar ? 0.15 : 0.08;
    const p = new Projectile(this.x, this.y, angle + rand(-spread, spread), 'round', 'enemy', {
      range: this.def.range,
      damage: this.def.damage,
    });
    p.ammo = {
      hullDmg: this.def.damage,
      sailDmg: this.def.damage * 0.5,
      crewDmg: this.def.damage * 0.3,
      speed: this.def.mortar ? 8 : 11,
      color: this.def.mortar ? '#cc2200' : '#882222',
      glow: this.def.mortar ? '#ff4400' : '#ff2222',
      trail: '#ff6644',
    };
    p.speed = p.ammo.speed;
    p.vx = Math.cos(p.angle) * p.speed;
    p.vy = Math.sin(p.angle) * p.speed;
    p.isMortar = Boolean(this.def.mortar);
    p.life = (this.def.range / p.speed) * FRAME_MS;
    p.maxLife = p.life;
    return p;
  }

  takeDamage(hullDmg, sailDmg, crewDmg, chainEffect) {
    this.hull -= hullDmg;
    this.sail = clamp(this.sail - sailDmg, 0, this.def.sail);
    this.crew = clamp(this.crew - crewDmg, 0, this.def.crew);
    if (chainEffect) {
      this.slowTimer = chainEffect.duration;
    }
    if (this.hull <= 0 || this.crew <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }
}

class LootDrop {
  constructor(x, y, type) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.type = type; // 'gold', 'wood', 'rum', 'keg'
    this.life = 25000;
    this.maxLife = 25000;
    this.bobPhase = rand(0, Math.PI * 2);
    this.radius = type === 'keg' ? 20 : 16;
    this.alive = true;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
    this.bobPhase += dt * 0.0035;
  }
}

class FloatingText {
  constructor(x, y, text, color = '#ffd700', size = 18) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 1300;
    this.maxLife = 1300;
    this.vy = -1.6;
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * (dt / FRAME_MS);
  }

  get alive() { return this.life > 0; }
}

class Obstacle {
  constructor(x, y, radius, type) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type; // 'island', 'reef', 'rock'
    this.seed = rand(0, 100);
  }
}
