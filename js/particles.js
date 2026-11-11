class ParticleSystem {
  constructor() {
    this.particles = [];
    this.ripples = [];
    this.debris = [];
    this.oilPatches = [];
    this.lightningFlash = 0;
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
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.15, 0.15),
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

  cannonFire(x, y, angle, color = '#ffcc00') {
    this.cannonFireRound(x, y, angle, color);
  }

  // --- 1. ROUND SHOT: HEAVY SHOCKWAVE & ROARING SMOKE PLUME ---
  cannonFireRound(x, y, angle, color = '#f97316') {
    this.addRipple(x, y, 48, 'rgba(249, 115, 22, 0.65)', 350);
    // Concentrated forward siege flame jet
    this.emit(x, y, {
      count: 22,
      angle,
      spread: 0.28,
      speedMin: 7,
      speedMax: 18,
      life: 250,
      sizeMin: 5,
      sizeMax: 12,
      color: color || '#f97316',
    });
    // Incandescent orange embers
    this.emit(x, y, {
      count: 16,
      angle,
      spread: 0.38,
      speedMin: 4,
      speedMax: 12,
      life: 450,
      sizeMin: 2.5,
      sizeMax: 5,
      color: '#fef08a',
    });
    // Billowing dark gunpowder smoke rolls
    this.emit(x, y, {
      count: 18,
      angle,
      spread: 0.55,
      speedMin: 1.5,
      speedMax: 5.5,
      life: 1100,
      sizeMin: 10,
      sizeMax: 26,
      color: 'rgba(100, 116, 139, 0.8)',
      type: 'smoke',
      grow: true,
      drag: 0.94,
    });
  }

  // --- 2. CHAIN SHOT: WHIRLING GOLDEN SPARKS & DUAL TANGENTIAL VAPOR ---
  cannonFireChain(x, y, angle, color = '#fbbf24') {
    this.addRipple(x, y, 36, 'rgba(250, 204, 21, 0.55)', 300);
    // Sharp yellow flash
    this.emit(x, y, {
      count: 14,
      angle,
      spread: 0.3,
      speedMin: 6,
      speedMax: 14,
      life: 200,
      sizeMin: 4,
      sizeMax: 8,
      color: '#fde047',
    });
    // Whirling golden chain sparks bursting laterally (tangential spin)
    this.emit(x, y, {
      count: 24,
      angle: angle + Math.PI / 2,
      spread: 0.7,
      speedMin: 4,
      speedMax: 11,
      life: 400,
      sizeMin: 2,
      sizeMax: 4.5,
      color: '#fbbf24',
    });
    this.emit(x, y, {
      count: 24,
      angle: angle - Math.PI / 2,
      spread: 0.7,
      speedMin: 4,
      speedMax: 11,
      life: 400,
      sizeMin: 2,
      sizeMax: 4.5,
      color: '#fbbf24',
    });
    // Wispy air streaks
    this.emit(x, y, {
      count: 10,
      angle,
      spread: 0.6,
      speedMin: 2,
      speedMax: 6,
      life: 600,
      sizeMin: 6,
      sizeMax: 16,
      color: 'rgba(240, 240, 245, 0.6)',
      type: 'smoke',
      grow: true,
    });
  }

  // --- 3. GRAPESHOT: EXPLOSIVE CONICAL BLUNDERBUSS FAN & SHRAPNEL SPRAY ---
  cannonFireGrape(x, y, angle, color = '#ef4444') {
    this.addRipple(x, y, 42, 'rgba(239, 68, 68, 0.5)', 300);
    // Wide conical blunderbuss flash (55-degree fan)
    this.emit(x, y, {
      count: 26,
      angle,
      spread: 0.85,
      speedMin: 6,
      speedMax: 17,
      life: 220,
      sizeMin: 4,
      sizeMax: 10,
      color: '#f97316',
    });
    // Swarm of 36+ incandescent red-hot and amber shrapnel embers
    this.emit(x, y, {
      count: 36,
      angle,
      spread: 0.88,
      speedMin: 5,
      speedMax: 15,
      life: 380,
      sizeMin: 2,
      sizeMax: 4,
      color: '#ef4444',
    });
    this.emit(x, y, {
      count: 18,
      angle,
      spread: 0.75,
      speedMin: 6,
      speedMax: 14,
      life: 320,
      sizeMin: 2,
      sizeMax: 3.5,
      color: '#fef08a',
    });
    // Sudden buckshot smoke puff blooming outward
    this.emit(x, y, {
      count: 16,
      angle,
      spread: 0.9,
      speedMin: 2,
      speedMax: 5,
      life: 750,
      sizeMin: 8,
      sizeMax: 20,
      color: 'rgba(220, 225, 230, 0.75)',
      type: 'smoke',
      grow: true,
    });
  }

  // --- AMMO IMPACT PARTICLES ---
  sailShred(x, y, angle) {
    // 14 fluttering white canvas rags drifting away on the wind
    this.emit(x, y, {
      count: 14,
      angle: angle + Math.PI,
      spread: 1.2,
      speedMin: 1.5,
      speedMax: 4.5,
      life: 1000,
      sizeMin: 4,
      sizeMax: 9,
      color: '#f8fafc',
      drag: 0.92,
    });
    // Snapped hemp rigging ropes
    this.emit(x, y, {
      count: 8,
      angle: angle + Math.PI,
      spread: 1.0,
      speedMin: 2,
      speedMax: 6,
      life: 700,
      sizeMin: 2,
      sizeMax: 4.5,
      color: '#ca8a04',
      drag: 0.94,
    });
    // Splinter debris
    this.woodSplinters(x, y, angle, 6);
  }

  crewDecimate(x, y, angle) {
    // Red blood/shrapnel splash droplets
    this.emit(x, y, {
      count: 16,
      angle: angle + Math.PI,
      spread: 1.2,
      speedMin: 2.5,
      speedMax: 7,
      life: 420,
      sizeMin: 3,
      sizeMax: 6,
      color: '#dc2626',
    });
    // Sizzling lead shrapnel sparks
    this.emit(x, y, {
      count: 12,
      angle: angle + Math.PI,
      spread: 0.9,
      speedMin: 3,
      speedMax: 8,
      life: 300,
      sizeMin: 2,
      sizeMax: 3.5,
      color: '#fef08a',
    });
    // Crimson suppression smoke puff
    this.emit(x, y, {
      count: 4,
      angle: angle + Math.PI,
      spread: 0.8,
      speedMin: 1,
      speedMax: 2.5,
      life: 600,
      sizeMin: 8,
      sizeMax: 18,
      color: 'rgba(185, 28, 28, 0.45)',
      type: 'smoke',
      grow: true,
    });
  }

  broadsideBlast(x, y, angle, ammoType = 'round') {
    const isChain = ammoType === 'chain';
    const isGrape = ammoType === 'grape';
    const rippleColor = isChain ? 'rgba(250, 204, 21, 0.55)' : (isGrape ? 'rgba(239, 68, 68, 0.55)' : 'rgba(255, 140, 20, 0.6)');
    this.addRipple(x, y, 75, rippleColor, 500);

    // Massive multi-barrel muzzle blast
    const blastColor = isChain ? '#fde047' : (isGrape ? '#f97316' : '#ffa500');
    this.emit(x, y, {
      count: 32,
      angle,
      spread: isGrape ? 0.95 : 0.65,
      speedMin: 6,
      speedMax: 17,
      life: 280,
      sizeMin: 5,
      sizeMax: 15,
      color: blastColor,
    });

    if (isChain) {
      // Golden chain sparks
      this.emit(x, y, {
        count: 35,
        angle,
        spread: 0.85,
        speedMin: 4,
        speedMax: 12,
        life: 450,
        sizeMin: 2,
        sizeMax: 4.5,
        color: '#fbbf24',
      });
    } else if (isGrape) {
      // Red-hot shrapnel pellets fan
      this.emit(x, y, {
        count: 50,
        angle,
        spread: 1.1,
        speedMin: 5,
        speedMax: 16,
        life: 400,
        sizeMin: 2,
        sizeMax: 4.5,
        color: '#ef4444',
      });
    }

    // Volumetric dense white smoke rolling across the water
    this.emit(x, y, {
      count: 28,
      angle,
      spread: 0.75,
      speedMin: 1.5,
      speedMax: 6,
      life: 1200,
      sizeMin: 10,
      sizeMax: 28,
      color: 'rgba(225, 230, 235, 0.82)',
      type: 'smoke',
      grow: true,
      drag: 0.94,
    });
  }

  woodSplinters(x, y, angle = null, count = 16) {
    for (let i = 0; i < count; i++) {
      const a = angle !== null ? angle + rand(-0.9, 0.9) : rand(0, Math.PI * 2);
      const spd = rand(3, 8);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        life: rand(700, 1300),
        maxLife: 1300,
        size: rand(4, 9),
        color: pick(['#78350f', '#92400e', '#b45309', '#d97706']),
        shrink: false,
        grow: false,
        type: 'splinter',
        drag: 0.94,
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.3, 0.3),
      });
    }
  }

  bowSpray(x, y, angle, speed) {
    if (speed < 1.5) return;
    const perp = angle + Math.PI / 2;
    [-1, 1].forEach(side => {
      const sprayAngle = angle + side * 1.1 + Math.PI;
      const spd = speed * rand(0.6, 1.2);
      this.particles.push({
        x: x + Math.cos(angle) * 16 + Math.cos(perp) * side * 6,
        y: y + Math.sin(angle) * 16 + Math.sin(perp) * side * 6,
        vx: Math.cos(sprayAngle) * spd * 0.4,
        vy: Math.sin(sprayAngle) * spd * 0.4,
        life: rand(250, 450),
        maxLife: 450,
        size: rand(2.5, 5),
        color: 'rgba(255, 255, 255, 0.8)',
        shrink: true,
        type: 'water',
        drag: 0.93,
      });
    });
  }

  wake(x, y, angle, speed = 3) {
    const perp = angle + Math.PI / 2;
    [-1, 1].forEach(side => {
      const spread = side * (8 + Math.random() * 4);
      const wx = x - Math.cos(angle) * 14 + Math.cos(perp) * spread;
      const wy = y - Math.sin(angle) * 14 + Math.sin(perp) * spread;
      this.particles.push({
        x: wx,
        y: wy,
        vx: Math.cos(angle + Math.PI + side * 0.4) * rand(0.3, 0.8),
        vy: Math.sin(angle + Math.PI + side * 0.4) * rand(0.3, 0.8),
        life: 1400,
        maxLife: 1400,
        size: rand(4, 9),
        color: 'rgba(235, 248, 255, 0.65)',
        shrink: true,
        type: 'wake',
        drag: 0.96,
      });
    });
  }

  explosion(x, y, size = 1) {
    this.addRipple(x, y, 75 * size, 'rgba(255, 180, 100, 0.8)', 800);
    this.addRipple(x, y, 120 * size, 'rgba(200, 240, 255, 0.6)', 1100);

    // Fiery blast sphere
    this.emit(x, y, {
      count: Math.round(36 * size),
      speedMin: 3,
      speedMax: 10 * size,
      life: 650,
      sizeMin: 5,
      sizeMax: 14 * size,
      color: '#ff5500',
    });

    // Blazing white/yellow core
    this.emit(x, y, {
      count: Math.round(20 * size),
      speedMin: 2,
      speedMax: 7 * size,
      life: 400,
      sizeMin: 6,
      sizeMax: 16 * size,
      color: '#fffae0',
    });

    // Flying wood splinters
    this.woodSplinters(x, y, null, Math.round(24 * size));

    // Heavy churning black oily smoke
    this.emit(x, y, {
      count: Math.round(30 * size),
      speedMin: 1.0,
      speedMax: 4 * size,
      life: 1800,
      sizeMin: 10,
      sizeMax: 26 * size,
      color: 'rgba(40, 40, 45, 0.85)',
      type: 'smoke',
      grow: true,
      drag: 0.94,
    });
  }

  powderKegBlast(x, y) {
    this.addRipple(x, y, 150, 'rgba(255, 235, 130, 0.95)', 900);
    this.addRipple(x, y, 90, 'rgba(255, 70, 0, 0.85)', 700);

    this.emit(x, y, {
      count: 55,
      speedMin: 4,
      speedMax: 16,
      life: 800,
      sizeMin: 7,
      sizeMax: 20,
      color: '#ff3700',
    });

    this.emit(x, y, {
      count: 35,
      speedMin: 2,
      speedMax: 8,
      life: 500,
      sizeMin: 8,
      sizeMax: 22,
      color: '#fff066',
    });

    this.woodSplinters(x, y, null, 32);

    this.emit(x, y, {
      count: 45,
      speedMin: 1.5,
      speedMax: 6,
      life: 2200,
      sizeMin: 14,
      sizeMax: 36,
      color: 'rgba(30, 30, 35, 0.9)',
      type: 'smoke',
      grow: true,
      drag: 0.93,
    });

    // Create a burning oil slick on the water
    this.addOilPatch(x, y, 55, 8000);
  }

  addOilPatch(x, y, radius = 50, duration = 8000) {
    this.oilPatches.push({
      x, y,
      radius,
      life: duration,
      maxLife: duration,
      flameTimer: 0,
    });
  }

  splash(x, y, size = 1) {
    this.addRipple(x, y, 36 * size, 'rgba(210, 245, 255, 0.85)', 650);
    this.emit(x, y, {
      count: Math.round(18 * size),
      speedMin: 2,
      speedMax: 6 * size,
      life: 550,
      sizeMin: 3,
      sizeMax: 6 * size,
      color: '#e0f4ff',
      type: 'water',
    });
  }

  damage(x, y) {
    this.woodSplinters(x, y, null, 8);
    this.emit(x, y, {
      count: 6,
      speedMin: 0.8,
      speedMax: 2.2,
      life: 900,
      sizeMin: 6,
      sizeMax: 14,
      color: 'rgba(60, 60, 60, 0.75)',
      type: 'smoke',
      grow: true,
    });
  }

  addSinkingDebris(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const dist = rand(5, 30);
      this.debris.push({
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        vx: Math.cos(a) * rand(0.2, 0.8),
        vy: Math.sin(a) * rand(0.2, 0.8),
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.02, 0.02),
        type: pick(['plank', 'barrel', 'spar']),
        life: rand(8000, 16000),
        maxLife: 16000,
        bobPhase: rand(0, Math.PI * 2),
      });
    }
  }

  triggerLightning() {
    this.lightningFlash = 1.0;
  }

  update(dt, wind = { x: 0.8, y: -0.6 }) {
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 0.005);
    }

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

    // Update floating debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.debris.splice(i, 1);
        continue;
      }
      d.x += d.vx + wind.x * 0.15;
      d.y += d.vy + wind.y * 0.15;
      d.vx *= 0.98;
      d.vy *= 0.98;
      d.rot += d.rotSpeed;
      d.bobPhase += dt * 0.003;
    }

    // Update burning oil patches
    for (let i = this.oilPatches.length - 1; i >= 0; i--) {
      const oil = this.oilPatches[i];
      oil.life -= dt;
      if (oil.life <= 0) {
        this.oilPatches.splice(i, 1);
        continue;
      }
      oil.flameTimer += dt;
      if (oil.flameTimer > 60) {
        oil.flameTimer = 0;
        const fa = rand(0, Math.PI * 2);
        const fd = rand(0, oil.radius * 0.8);
        this.particles.push({
          x: oil.x + Math.cos(fa) * fd,
          y: oil.y + Math.sin(fa) * fd,
          vx: (Math.random() - 0.5) * 0.8 + wind.x * 0.3,
          vy: -rand(1.5, 3.5),
          life: rand(300, 600),
          maxLife: 600,
          size: rand(4, 9),
          color: pick(['#ff4400', '#ff8800', '#ffcc00']),
          shrink: true,
          type: 'circle',
          drag: 0.96,
        });
        if (Math.random() < 0.4) {
          this.particles.push({
            x: oil.x + Math.cos(fa) * fd,
            y: oil.y + Math.sin(fa) * fd,
            vx: wind.x * 0.8,
            vy: wind.y * 0.8 - 0.8,
            life: rand(800, 1400),
            maxLife: 1400,
            size: rand(6, 14),
            color: 'rgba(40, 40, 40, 0.7)',
            type: 'smoke',
            grow: true,
            drag: 0.97,
          });
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Wind drifts smoke particles
      if (p.type === 'smoke') {
        p.vx += wind.x * 0.04;
        p.vy += wind.y * 0.04;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag || 0.98;
      p.vy *= p.drag || 0.98;
      if (p.rotSpeed) p.rot += p.rotSpeed;

      if (p.grow) {
        p.size += 0.18;
      } else if (p.shrink) {
        p.size = Math.max(0.5, p.size * 0.992);
      }
    }
  }

  draw(ctx, camera) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // 1. Draw burning oil patches on the water surface
    for (const oil of this.oilPatches) {
      const sx = oil.x - camera.x + w / 2;
      const sy = oil.y - camera.y + h / 2;
      if (sx < -100 || sx > w + 100 || sy < -100 || sy > h + 100) continue;

      const alpha = Math.min(1, oil.life / 1000) * 0.65;
      ctx.save();
      ctx.globalAlpha = alpha;
      // Dark burning slick
      const grad = ctx.createRadialGradient(sx, sy, 5, sx, sy, oil.radius);
      grad.addColorStop(0, '#1c1917');
      grad.addColorStop(0.5, 'rgba(67, 20, 7, 0.85)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, oil.radius, 0, Math.PI * 2);
      ctx.fill();

      // Flame glow rim
      ctx.strokeStyle = 'rgba(255, 100, 0, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw water ripples on sea surface
    for (const r of this.ripples) {
      const sx = r.x - camera.x + w / 2;
      const sy = r.y - camera.y + h / 2;
      if (sx < -100 || sx > w + 100 || sy < -100 || sy > h + 100) continue;

      const alpha = (r.life / r.maxLife) * 0.75;
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw floating shipwreck debris (barrels, timber planks, spar fragments)
    for (const d of this.debris) {
      const sx = d.x - camera.x + w / 2;
      const sy = d.y - camera.y + h / 2 + Math.sin(d.bobPhase) * 2;
      if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;

      const alpha = Math.min(1, d.life / 2000);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(sx, sy);
      ctx.rotate(d.rot);

      if (d.type === 'barrel') {
        ctx.fillStyle = '#5c381e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2b170e';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = '#c9a227';
        ctx.beginPath();
        ctx.moveTo(-7, -2); ctx.lineTo(7, -2);
        ctx.moveTo(-7, 2); ctx.lineTo(7, 2);
        ctx.stroke();
      } else if (d.type === 'spar') {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-12, -2, 24, 4);
        ctx.strokeStyle = '#451a03';
        ctx.strokeRect(-12, -2, 24, 4);
      } else {
        // Wooden plank
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(-8, -3, 16, 6);
        ctx.strokeStyle = '#451a03';
        ctx.strokeRect(-8, -3, 16, 6);
      }
      ctx.restore();
    }

    // 4. Draw particles (smoke, splinters, sparks, wake)
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const sx = p.x - camera.x + w / 2;
      const sy = p.y - camera.y + h / 2;
      if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;

      ctx.save();
      ctx.globalAlpha = alpha * (p.type === 'wake' ? 0.5 : 0.88);

      if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'splinter') {
        ctx.translate(sx, sy);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -1.5, p.size * 2, 3);
        ctx.strokeStyle = '#2b170e';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-p.size, -1.5, p.size * 2, 3);
      } else if (p.type === 'wake' || p.type === 'water') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Glowing sparks & fiery bursts
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Lightning flash illumination across the entire viewport
    if (this.lightningFlash > 0.02) {
      ctx.save();
      ctx.fillStyle = `rgba(220, 240, 255, ${this.lightningFlash * 0.65})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
}
