class WaveManager {
  constructor() {
    this.wave = 0;
    this.enemies = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveActive = false;
    this.waveClear = false;
    this.obstacles = [];
    this.bossSpawned = false;
    this._generateObstacles();
  }

  reset() {
    this.wave = 0;
    this.enemies = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveActive = false;
    this.waveClear = false;
    this.bossSpawned = false;
    this._generateObstacles();
  }

  get currentLevel() {
    let level = LEVELS[0];
    for (const l of LEVELS) {
      if (this.wave >= l.startWave) level = l;
    }
    return level;
  }

  get waveMultiplier() {
    return 1 + (this.wave - 1) * 0.12;
  }

  startNextWave() {
    this.wave++;
    this.waveActive = true;
    this.waveClear = false;
    this.bossSpawned = false;
    this.spawnQueue = this._generateWave(this.wave);
    this.spawnTimer = 500;

    // Refresh obstacles periodically or on zone transitions
    if (this.wave === 1 || this.wave % 5 === 1) {
      this._generateObstacles();
    }

    return {
      wave: this.wave,
      isBoss: this.wave % 5 === 0,
      level: this.currentLevel,
      subtitle: this._getWaveSubtitle(),
    };
  }

  _getWaveSubtitle() {
    if (this.wave === 5) return 'BOSS INCOMING — HMS Sovereign (Imperial Flagship)!';
    if (this.wave === 10) return 'LEGENDARY BOSS — The Flying Dutchman Rises!';
    if (this.wave === 15) return 'MYTHICAL BOSS — The Kraken-Bound Dreadnought!';
    if (this.wave === 20) return 'APOCALYPTIC BOSS — The Infernal Leviathan!';
    if (this.wave % 5 === 0) return 'COLOSSAL ARMADA COMMANDER APPROACHING!';
    if (this.wave % 5 === 4) return 'Heavy Warfleet Escorts Detected!';
    const subs = [
      'Royal Scout Squadrons Inbound!',
      'Corsair Raiders Flanking Portside!',
      'Greek Fire Galleys Advancing with Flamethrowers!',
      'Siege Ketches Launching Long-Range Mortars!',
      'Cursed Phantom Brigs Emerging from the Mist!',
      'Armored Ironclads Gaining Ramming Speed!',
      'The King\'s Main Armada Closes In!',
    ];
    return subs[(this.wave - 1) % subs.length];
  }

  _generateWave(wave) {
    const queue = [];

    // Boss Waves every 5 waves
    if (wave % 5 === 0) {
      let bossType = 'flagship';
      if (wave === 10) bossType = 'dutchman';
      else if (wave === 15) bossType = 'leviathan';
      else if (wave >= 20) bossType = 'infernoBehemoth';

      queue.push({ type: bossType, delay: 1800 });
      const escortCount = Math.min(2 + Math.floor(wave / 5), 7);
      const escortTypes = ['manOWar', 'ironclad', 'phantomBrig', 'fireGalley'];
      for (let i = 0; i < escortCount; i++) {
        queue.push({
          type: escortTypes[i % escortTypes.length],
          delay: 3000 + i * 1400,
        });
      }
      return queue;
    }

    const baseCount = 3 + Math.floor(wave * 1.6);
    const types = this._getEnemyMix(wave);

    for (let i = 0; i < baseCount; i++) {
      const type = types[i % types.length];
      queue.push({
        type,
        delay: 700 + i * (1100 - Math.min(wave * 25, 550)),
      });
    }

    // Mini-bosses periodically
    if (wave >= 3 && wave % 2 === 1) {
      const miniBossType = wave >= 12 ? 'ironclad' : (wave >= 7 ? 'phantomBrig' : 'fireGalley');
      queue.push({ type: miniBossType, delay: baseCount * 800 + 1500 });
    }

    return queue;
  }

  _getEnemyMix(wave) {
    if (wave <= 2) return ['sloop', 'sloop', 'corsair'];
    if (wave <= 4) return ['sloop', 'corsair', 'sloopOfWar'];
    if (wave <= 7) return ['corsair', 'sloopOfWar', 'fireGalley', 'bombKetch'];
    if (wave <= 11) return ['sloopOfWar', 'fireGalley', 'bombKetch', 'phantomBrig'];
    if (wave <= 16) return ['fireGalley', 'phantomBrig', 'bombKetch', 'ironclad', 'manOWar'];
    return ['corsair', 'phantomBrig', 'ironclad', 'bombKetch', 'manOWar', 'fireGalley'];
  }

  _generateObstacles() {
    this.obstacles = [];
    const level = this.currentLevel;
    const count = level.hazard === 'reef' ? 14 : 9;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
      const r = rand(320, WORLD_SIZE * 0.38); // Keep center clear for player spawn
      const obsType = i % 3 === 0 ? 'island' : (i % 3 === 1 ? 'reef' : 'rock');
      const radius = obsType === 'island' ? rand(38, 65) : rand(24, 40);

      this.obstacles.push(new Obstacle(
        Math.cos(angle) * r,
        Math.sin(angle) * r,
        radius,
        obsType
      ));
    }
  }

  _spawnPosition() {
    const angle = rand(0, Math.PI * 2);
    const dist = WORLD_SIZE * 0.42;
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      angle: angle + Math.PI,
    };
  }

  update(dt, player) {
    if (!this.waveActive) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
      const spawn = this.spawnQueue.shift();
      const pos = this._spawnPosition();
      const typeKey = spawn.type === 'manOWar' ? 'manOWar' : spawn.type;
      this.enemies.push(new Enemy(typeKey, pos.x, pos.y, pos.angle, this.waveMultiplier));
      this.spawnTimer = spawn.delay || 1000;
    }

    const enemyProjectiles = [];
    for (const enemy of this.enemies) {
      const proj = enemy.update(player, dt, this);
      if (proj) enemyProjectiles.push(proj);
    }

    this.enemies = this.enemies.filter(e => e.alive);

    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      this.waveClear = true;
      this.waveActive = false;
    }

    return enemyProjectiles;
  }

  checkObstacleCollision(x, y, radius = 10) {
    for (const obs of this.obstacles) {
      const dx = x - obs.x;
      const dy = y - obs.y;
      if (Math.hypot(dx, dy) < obs.radius + radius) {
        return obs;
      }
    }
    return null;
  }
}
