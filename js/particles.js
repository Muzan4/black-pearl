class ParticleSystem {
  constructor() {
    this.particles = [];
    this.ripples = [];
  }

  emit(x, y, config) {
    const count = config.count || 10;
    for (let i = 0; i < count; i++) {
      const angle = config.angle !== undefined
        ? config.angle + rand(-config.spread || 0.5, config.spread || 0.5)
        : rand(0, Math.PI * 2);
      const speed = rand(config.speedMin || 1, config.speedMax || 4);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: config.life || rand(300, 800),
        maxLife: config.life || 600,
        size: rand(config.sizeMin || 2, config.sizeMax || 6),
        color: config.color || '#fff',
        shrink: config.shrink !== false,
        grow: config.grow || false,
        type: config.type || 'circle',
        drag: config.drag || 0.98,
      });
    }
  }

  addRipple(x, y, maxRadius = 35, color = 'rgba(200, 240, 255, 0.6)', life = 600) {
    this.ripples.push({
      x, y,
      radius: 4,
      maxRadius,
      life,
      maxLife: life,
      color,
    });
  }

  cannonFire(x, y, angle) {
    // Muzzle flash
    this.emit(x, y, {
      count: 14,
      angle,
      spread: 0.35,
      speedMin: 3,
      speedMax: 8,
      life: 250,
      sizeMin: 4,
      sizeMax: 10,
      color: '#ffcc00',
    });
    // Fireball
    this.emit(x, y, {
      count: 10,
      angle,
      spread: 0.25,
      speedMin: 2,
      speedMax: 6,
      life: 350,
      sizeMin: 5,
      sizeMax: 12,
      color: '#ff5500',
    });
    // Billowing powder smoke drifting
    this.emit(x, y, {
      count: 12,
      angle,
      spread: 0.5,
      speedMin: 1,
      speedMax: 3.5,
      life: 700,
      sizeMin: 6,
      sizeMax: 16,
      color: 'rgba(180, 180, 180, 0.7)',
      type: 'smoke',
      grow: true,
    });
  }

  broadsideBlast(x, y, angle) {
    // Heavy dual-battery muzzle blast
    this.emit(x, y, {
      count: 22,
      angle,
      spread: 0.6,
      speedMin: 4,
      speedMax: 11,
      life: 300,
      sizeMin: 5,
      sizeMax: 14,
      color: '#ffaa00',
    });
    this.emit(x, y, {
      count: 20,
      angle,
      spread: 0.7,
      speedMin: 1.5,
      speedMax: 5,
      life: 800,
      sizeMin: 8,
      sizeMax: 22,
      color: 'rgba(210, 210, 210, 0.8)',
      type: 'smoke',
      grow: true,
    });
  }

  explosion(x, y, size = 1) {
    this.addRipple(x, y, 60 * size, 'rgba(255, 180, 100, 0.7)', 700);
    // Fiery core
    this.emit(x, y, {
      count: 32 * size,
      speedMin: 2,
      speedMax: 8 * size,
      life: 700,
      sizeMin: 4,
      sizeMax: 11 * size,
      color: '#ff6600',
    });
    // Wood splinters
    this.emit(x, y, {
      count: 18 * size,
      speedMin: 3,
      speedMax: 7 * size,
      life: 900,
      sizeMin: 2,
      sizeMax: 5 * size,
      color: '#8b5a2b',
      type: 'splinter',
    });
    // Dark drifting smoke cloud
    this.emit(x, y, {
      count: 24 * size,
      speedMin: 0.8,
      speedMax: 3 * size,
      life: 1400,
      sizeMin: 8,
      sizeMax: 20 * size,
      color: 'rgba(50, 50, 50, 0.8)',
      type: 'smoke',
      grow: true,
    });
  }

  powderKegBlast(x, y) {
    this.addRipple(x, y, 120, 'rgba(255, 230, 120, 0.9)', 800);
    this.addRipple(x, y, 70, 'rgba(255, 80, 0, 0.8)', 600);
    this.emit(x, y, {
      count: 45,
      speedMin: 3,
      speedMax: 12,
      life: 800,
      sizeMin: 6,
      sizeMax: 18,
      color: '#ff4400',
    });
    this.emit(x, y, {
      count: 35,
      speedMin: 2,
      speedMax: 6,
      life: 1600,
      sizeMin: 12,
      sizeMax: 30,
      color: 'rgba(40, 40, 40, 0.85)',
      type: 'smoke',
      grow: true,
    });
  }

  splash(x, y, size = 1) {
    this.addRipple(x, y, 32 * size, 'rgba(180, 230, 255, 0.8)', 600);
    this.emit(x, y, {
      count: 14 * size,
      speedMin: 1.5,
      speedMax: 4.5 * size,
      life: 500,
      sizeMin: 2,
      sizeMax: 5 * size,
      color: '#cceeff',
      type: 'water',
    });
  }

  wake(x, y, angle) {
    if (Math.random() > 0.45) return;
    const perp = angle + Math.PI / 2;
    [-1, 1].forEach(side => {
      const wx = x + Math.cos(perp) * side * 8 + rand(-2, 2);
      const wy = y + Math.sin(perp) * side * 8 + rand(-2, 2);
      this.particles.push({
        x: wx,
        y: wy,
        vx: Math.cos(angle + Math.PI + side * 0.3) * rand(0.4, 1.2),
        vy: Math.sin(angle + Math.PI + side * 0.3) * rand(0.4, 1.2),
        life: 800,
        maxLife: 800,
        size: rand(3, 7),
        color: 'rgba(230, 248, 255, 0.55)',
        shrink: true,
        type: 'wake',
        drag: 0.95,
      });
    });
  }

  damage(x, y) {
    this.emit(x, y, {
      count: 6,
      speedMin: 0.8,
      speedMax: 2.5,
      life: 800,
      sizeMin: 4,
      sizeMax: 10,
      color: '#8b4513',
      type: 'splinter',
    });
    this.emit(x, y, {
      count: 4,
      speedMin: 0.5,
      speedMax: 1.5,
      life: 1000,
      sizeMin: 5,
      sizeMax: 12,
      color: 'rgba(60,60,60,0.7)',
      type: 'smoke',
      grow: true,
    });
  }

  update(dt) {
    // Update ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }
      const progress = 1 - r.life / r.maxLife;
      r.radius = progress * r.maxRadius;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag || 0.98;
      p.vy *= p.drag || 0.98;

      if (p.grow) {
        p.size += 0.15;
      } else if (p.shrink) {
        p.size = Math.max(0.5, p.size * 0.992);
      }
    }
  }

  draw(ctx, camera) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Draw ripples on the water surface first
    for (const r of this.ripples) {
      const sx = r.x - camera.x + w / 2;
      const sy = r.y - camera.y + h / 2;
      if (sx < -100 || sx > w + 100 || sy < -100 || sy > h + 100) continue;

      const alpha = (r.life / r.maxLife) * 0.7;
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const sx = p.x - camera.x + w / 2;
      const sy = p.y - camera.y + h / 2;

      if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;

      ctx.save();
      ctx.globalAlpha = alpha * (p.type === 'wake' ? 0.45 : 0.85);

      if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'splinter') {
        ctx.fillStyle = p.color;
        ctx.fillRect(sx - p.size, sy - 1, p.size * 2, 2.5);
      } else if (p.type === 'wake') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
