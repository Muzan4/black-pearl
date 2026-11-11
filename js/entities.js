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
    this.spin = rand(0, Math.PI * 2);
    this.speedMult = ammoType === 'grape' ? rand(0.88, 1.12) : 1.0;
    this.vx = Math.cos(angle) * this.speed * this.speedMult;
    this.vy = Math.sin(angle) * this.speed * this.speedMult;
    this.trail = [{ x, y, z: 0, spin: this.spin }];
  }

  update(dt) {
    if (!this.alive) return;
    const step = dt / FRAME_MS;
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }

    this.x += this.vx * step;
    this.y += this.vy * step;
    this.spin += step * 0.38; // High-speed spin for whirling chain & shrapnel

    // Height arc for mortar bombs (ballistic curve over water)
    if (this.isMortar) {
      const progress = 1 - Math.max(0, this.life / this.maxLife);
      this.z = Math.sin(progress * Math.PI) * 65;
    } else {
      this.z = 0;
    }

    this.trail.push({ x: this.x, y: this.y, z: this.z, spin: this.spin });
    if (this.trail.length > (this.ammoType === 'chain' ? 20 : 16)) this.trail.shift();
  }
}

class Harpoon {
  constructor(startX, startY, angle, owner) {
    this.startX = startX;
    this.startY = startY;
    this.x = startX;
    this.y = startY;
    this.angle = angle;
    this.owner = owner;
    this.speed = 28;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.range = 550;
    this.traveled = 0;
    this.target = null; // Target hooked
    this.reeling = false;
    this.alive = true;
  }

  update(dt, player) {
    if (!this.alive) return;
    const step = dt / FRAME_MS;

    if (this.reeling && this.target) {
      // Reeling hooked object towards player
      const dx = player.x - this.target.x;
      const dy = player.y - this.target.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 40) {
        this.alive = false;
        return;
      }
      const reelSpeed = 16 * step;
      this.target.x += (dx / dist) * reelSpeed;
      this.target.y += (dy / dist) * reelSpeed;
      this.x = this.target.x;
      this.y = this.target.y;
    } else {
      // Flying forward
      this.x += this.vx * step;
      this.y += this.vy * step;
      this.traveled += this.speed * step;
      if (this.traveled >= this.range) {
        this.alive = false;
      }
    }
  }
}

class SinkingShip {
  constructor(ship, killer) {
    this.x = ship.x;
    this.y = ship.y;
    this.angle = ship.angle;
    this.def = ship.def || ship.shipDef;
    this.isPlayer = !!ship.shipDef;
    this.isBoss = ship.isBoss || false;
    this.isMiniBoss = ship.isMiniBoss || false;
    this.length = this.isPlayer ? (ship.shipDef?.size || 42) : ((ship.def?.size || 26) * 1.35);
    this.width = this.length * 0.44;
    this.hullColor = this.isPlayer ? (ship.shipDef?.color || '#1b120c') : ship.def.color;
    this.deckColor = this.isPlayer ? (ship.shipDef?.deckColor || '#452b1a') : '#8b5a2b';
    this.sailColor = this.isPlayer ? (ship.shipDef?.sailColor || '#e2d9cc') : ship.def.sailColor;
    this.trimColor = this.isPlayer ? (ship.shipDef?.trimColor || '#eab308') : '#334155';
    this.isGhost = this.isPlayer ? !!ship.shipDef?.isGhost : !!ship.def?.isGhost;

    this.life = 4500;
    this.maxLife = 4500;
    this.sinkProgress = 0; // 0 to 1
    this.roll = 0; // Roll sideways as water pours in
    this.rollTarget = (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.4);
    this.driftX = (Math.random() - 0.5) * 0.6;
    this.driftY = (Math.random() - 0.5) * 0.6;
    this.flameTimer = 0;
    this.alive = true;
  }

  update(dt, particles) {
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }

    this.sinkProgress = 1 - (this.life / this.maxLife);
    this.roll += (this.rollTarget - this.roll) * 0.02;
    this.x += this.driftX;
    this.y += this.driftY;

    // Erupt continuous fire and billowing black oily smoke while sinking
    this.flameTimer += dt;
    if (this.flameTimer > 90) {
      this.flameTimer = 0;
      const rx = (Math.random() - 0.5) * this.length * 0.6;
      const ry = (Math.random() - 0.5) * this.width * 0.6;
      const fx = this.x + Math.cos(this.angle) * rx - Math.sin(this.angle) * ry;
      const fy = this.y + Math.sin(this.angle) * rx + Math.cos(this.angle) * ry;

      particles.emit(fx, fy, {
        count: 4,
        speedMin: 0.5,
        speedMax: 2.0,
        life: 500,
        sizeMin: 4,
        sizeMax: 9,
        color: pick(['#ff4400', '#ff8800', '#ffcc00']),
        shrink: true,
      });

      particles.emit(fx, fy, {
        count: 3,
        speedMin: 0.5,
        speedMax: 1.8,
        life: 1400,
        sizeMin: 8,
        sizeMax: 22,
        color: 'rgba(35, 35, 40, 0.85)',
        type: 'smoke',
        grow: true,
      });

      // Bubbling sea foam around sinking hull
      if (Math.random() < 0.6) {
        particles.addRipple(fx, fy, 25, 'rgba(230, 248, 255, 0.7)', 600);
      }
    }
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
    this.ammoType = 'round';
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
    this.speedMag = 0;
    this.shieldActive = false;
    this.shieldDuration = 0;
    this.maxShieldDuration = 4000;
    this.shieldCooldown = 0;
    this.maxShieldCooldown = 10000;
    this.shieldHitPulse = 0;
    this.broadsideCooldown = 0;
    this.maxBroadsideCooldown = 3200;
    this.harpoonCooldown = 0;
    this.maxHarpoonCooldown = 2800;
    this.rumFrenzyTimer = 0;
    this.bobPhase = 0;
    this.wakeTimer = 0;
    this.broadsideRecoil = 0;
    this.chaserRecoil = 0;
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
    return true;
  }

  equipGun(id) {
    if (this.ownedGuns.includes(id)) {
      this.gunIndex = id;
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
    if (this.harpoonCooldown > 0) this.harpoonCooldown -= dt;
    if (this.rumFrenzyTimer > 0) this.rumFrenzyTimer -= dt;

    if (this.shieldCooldown > 0) this.shieldCooldown -= dt;
    if (this.shieldDuration > 0) {
      this.shieldDuration -= dt;
      if (this.shieldDuration <= 0) {
        this.shieldActive = false;
      }
    }
    if (this.shieldHitPulse > 0) {
      this.shieldHitPulse = Math.max(0, this.shieldHitPulse - dt * 0.005);
    }

    if (this.broadsideRecoil > 0) this.broadsideRecoil = Math.max(0, this.broadsideRecoil - dt * 0.005);
    if (this.chaserRecoil > 0) this.chaserRecoil = Math.max(0, this.chaserRecoil - dt * 0.006);

    this.bobPhase += dt * 0.0035;

    // Passive surgeon health and crew regeneration
    if (this.crewUpgrades?.surgeon > 1) {
      const regenRate = (this.crewUpgrades.surgeon - 1) * 0.35;
      this.hull = clamp(this.hull + regenRate * (dt / 1000), 0, this.maxHull);
      this.crew = clamp(this.crew + regenRate * (dt / 1000), 0, this.maxCrew);
    }

    if (this.repairing) {
      this.repairTimer -= dt;
      this.hull = clamp(this.hull + (this.repairAmount / PLAYER.repairDuration) * dt, 0, this.maxHull);
      if (this.repairTimer <= 0) {
        this.repairing = false;
        this.repairCooldown = this.repairCooldownMax || PLAYER.repairCooldown;
      }
      return;
    }

    // Direct WASD naval steering
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

      // Wind mechanic: tailwind boost
      const windLen = Math.hypot(wind.x, wind.y) || 1;
      const wx = wind.x / windLen;
      const wy = wind.y / windLen;
      const windDot = mx * wx + my * wy;
      if (windDot > 0.1) {
        moveSpeed *= (1 + windDot * 0.3);
      }

      this.x += mx * moveSpeed * step;
      this.y += my * moveSpeed * step;
      this.vx = mx * moveSpeed;
      this.vy = my * moveSpeed;
      this.speedMag = moveSpeed;
      this.targetAngle = Math.atan2(my, mx);
    } else {
      this.vx = 0;
      this.vy = 0;
      this.speedMag = 0;
    }

    // Aim steering blend when stopped
    if (input.targetX != null && input.targetY != null) {
      const aimAngle = Math.atan2(input.targetY - this.y, input.targetX - this.x);
      if (!isMoving) {
        this.targetAngle = aimAngle;
      }
    }

    const diff = angleDiff(this.angle, this.targetAngle);
    const turnRateBase = (this.shipDef?.turnRate ? this.shipDef.turnRate * 3.6 : 0.16);
    const navTurnBonus = 1 + (this.crewUpgrades?.navigator ? (this.crewUpgrades.navigator - 1) * 0.18 : 0);
    this.angle += diff * Math.min(1, turnRateBase * navTurnBonus * step);

    const wrapped = wrapWorld(this.x, this.y);
    this.x = wrapped.x;
    this.y = wrapped.y;

    this.smokeLevel = clamp((1 - this.hull / PLAYER.maxHull) * 3, 0, 3);
    this.fireLevel = this.hull < 30 ? 2 : this.hull < 50 ? 1 : 0;
  }

  canFire() {
    return this.alive && this.reloadTimer <= 0 && !this.repairing && this.crew > 5;
  }

  canBroadside() {
    return this.alive && this.broadsideCooldown <= 0 && !this.repairing && this.crew > 10;
  }

  canHarpoon() {
    return this.alive && this.harpoonCooldown <= 0 && !this.repairing;
  }

  fire(targetX, targetY) {
    if (!this.canFire()) return [];
    this.reloadTimer = this.reloadTime;
    this.chaserRecoil = 1.0;

    const baseAngle = Math.atan2(targetY - this.y, targetX - this.x);
    const ammo = AMMO[this.ammoType];
    const spread = ammo.spread * this.gun.spreadMod;
    const volley = this.ammoType === 'grape' ? 1 : (this.gun.volley || 1);
    const perp = baseAngle + Math.PI / 2;
    const projectiles = [];
    const gunnerMod = 1 + (this.crewUpgrades?.gunner ? (this.crewUpgrades.gunner - 1) * 0.15 : 0);

    for (let v = 0; v < volley; v++) {
      const along = (v - (volley - 1) / 2) * 12;
      const sx = this.x + Math.cos(baseAngle) * 32 + Math.cos(perp) * along;
      const sy = this.y + Math.sin(baseAngle) * 32 + Math.sin(perp) * along;
      for (let i = 0; i < ammo.pellets; i++) {
        const a = baseAngle + rand(-spread, spread);
        projectiles.push(new Projectile(sx, sy, a, this.ammoType, 'player', {
          ...this.gun,
          damage: (this.gun.damage || 1) * gunnerMod,
        }));
      }
    }

    return projectiles;
  }

  fireBroadside() {
    if (!this.canBroadside()) return [];
    this.broadsideCooldown = this.maxBroadsideCooldown;
    this.broadsideRecoil = 1.0;

    const projectiles = [];
    const sides = [-Math.PI / 2, Math.PI / 2]; // Port & Starboard
    const extraGuns = this.shipUpgrades?.broadside ? (this.shipUpgrades.broadside - 1) : 0;
    const shipBonus = this.shipDef?.broadsideBonus || 0;
    const gunsPerSide = 3 + Math.min(this.gunIndex, 3) + extraGuns + shipBonus;
    const gunnerMod = 1 + (this.crewUpgrades?.gunner ? (this.crewUpgrades.gunner - 1) * 0.15 : 0);
    const bsMod = 1.35 * (1 + extraGuns * 0.15) * gunnerMod;

    const isGrape = this.ammoType === 'grape';
    const isChain = this.ammoType === 'chain';
    const pelletsPerGun = isGrape ? 4 : 1;
    const baseSpread = isGrape ? 0.22 : (isChain ? 0.05 : 0.08);

    for (const sideOffset of sides) {
      const dirAngle = this.angle + sideOffset;
      for (let g = 0; g < gunsPerSide; g++) {
        const along = (g - (gunsPerSide - 1) / 2) * 14;
        const sx = this.x + Math.cos(this.angle) * along + Math.cos(dirAngle) * 22;
        const sy = this.y + Math.sin(this.angle) * along + Math.sin(dirAngle) * 22;
        for (let pIdx = 0; pIdx < pelletsPerGun; pIdx++) {
          const a = dirAngle + rand(-baseSpread, baseSpread);
          const p = new Projectile(sx, sy, a, this.ammoType, 'player', {
            ...this.gun,
            damage: (this.gun.damage || 1) * bsMod * (isGrape ? 0.65 : 1),
            range: (this.gun.range || 600) * 0.98,
          }, true);
          projectiles.push(p);
        }
      }
    }

    return projectiles;
  }

  fireHarpoon(targetX, targetY) {
    if (!this.canHarpoon()) return null;
    this.harpoonCooldown = this.maxHarpoonCooldown;
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    return new Harpoon(this.x, this.y, angle, 'player');
  }

  startRepair() {
    if (this.repairCooldown > 0 || this.repairing || this.hull >= this.maxHull) return false;
    this.repairing = true;
    this.repairTimer = PLAYER.repairDuration;
    return true;
  }

  canActivateShield() {
    return this.alive && this.shieldCooldown <= 0;
  }

  activateShield() {
    if (!this.canActivateShield()) return false;
    this.shieldActive = true;
    this.shieldDuration = this.maxShieldDuration;
    this.shieldCooldown = this.maxShieldCooldown;
    this.shieldHitPulse = 0.5;
    return true;
  }

  takeDamage(hullDmg, sailDmg, crewDmg) {
    if (this.invuln > 0) return { blocked: false, finalHullDmg: 0 };
    let blocked = false;
    if (this.shieldActive) {
      hullDmg *= 0.40; // Blocks 60% of damage!
      sailDmg *= 0.40;
      crewDmg *= 0.40;
      this.shieldHitPulse = 1.0;
      blocked = true;
    }
    this.hull = clamp(this.hull - hullDmg, 0, this.maxHull);
    this.sail = clamp(this.sail - sailDmg, 0, this.maxSail);
    this.crew = clamp(this.crew - crewDmg, 0, this.maxCrew);
    this.invuln = 280;
    if (this.hull <= 0) this.alive = false;
    return { blocked, finalHullDmg: hullDmg };
  }

  heal(hullAmt) {
    this.hull = clamp(this.hull + hullAmt, 0, this.maxHull);
  }

  repairSails(sailAmt) {
    this.sail = clamp(this.sail + sailAmt, 0, this.maxSail);
  }

  restoreCrew(crewAmt) {
    this.crew = clamp(this.crew + crewAmt, 0, this.maxCrew);
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
    this.recoil = 0;
    this.tentaclePhase = 0; // For Kraken Dreadnought
  }

  get effectiveSpeed() {
    const slow = this.slowTimer > 0 ? 0.5 : 1;
    const sailMod = 0.3 + 0.7 * (this.sail / this.def.sail);
    return this.speed * slow * sailMod;
  }

  update(player, dt, world) {
    if (!this.alive) return null;
    if (this.slowTimer > 0) this.slowTimer -= dt;
    this.wobble += dt * 0.002;
    this.bobPhase += dt * 0.003;
    this.tentaclePhase += dt * 0.004;
    this.behaviorTimer += dt;
    this.fireTimer -= dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 0.005);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);

    switch (this.def.behavior) {
      case 'swarm':
        this.targetAngle = targetAngle + Math.sin(this.wobble) * 0.8;
        break;
      case 'flank': {
        const flank = Math.sin(this.behaviorTimer * 0.001) > 0 ? 1.25 : -1.25;
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
        this.targetAngle = targetAngle + Math.sin(this.wobble * 0.5) * 0.35;
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
      this.recoil = 1.0;
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
      speed: this.def.mortar ? 8.5 : 12,
      color: this.def.mortar ? '#cc2200' : (this.def.isGhost ? '#2dd4bf' : '#882222'),
      glow: this.def.mortar ? '#ff4400' : (this.def.isGhost ? '#14b8a6' : '#ff2222'),
      trail: this.def.mortar ? '#ff6644' : (this.def.isGhost ? '#5eead4' : '#ff4444'),
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
    this.rot = rand(0, Math.PI * 2);
    this.radius = type === 'keg' ? 20 : 16;
    this.alive = true;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
    this.bobPhase += dt * 0.0035;
    this.rot += dt * 0.0008;
  }
}

class FloatingText {
  constructor(x, y, text, color = '#ffd700', size = 18) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 1350;
    this.maxLife = 1350;
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
    this.surfPhase = rand(0, Math.PI * 2);
  }
}
