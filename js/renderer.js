class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeIntensity = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Generate school of tropical fish for coral zone
    this.fishSchool = [];
    for (let i = 0; i < 30; i++) {
      this.fishSchool.push({
        x: (Math.random() - 0.5) * 1400,
        y: (Math.random() - 0.5) * 1400,
        angle: Math.random() * Math.PI * 2,
        speed: rand(0.8, 1.8),
        size: rand(3, 5),
        color: pick(['#f59e0b', '#38bdf8', '#f43f5e', '#10b981']),
        wiggle: Math.random() * Math.PI * 2,
      });
    }

    // Raindrop tracks for stormy weather
    this.rainDrops = [];
    for (let i = 0; i < 70; i++) {
      this.rainDrops.push({
        x: Math.random(),
        y: Math.random(),
        speed: rand(18, 30),
        len: rand(15, 28),
      });
    }
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  shake(intensity = 5) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  updateShake() {
    if (this.shakeIntensity > 0.1) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.88;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeIntensity = 0;
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _worldToScreen(x, y, camera) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    return {
      x: x - camera.x + w / 2 + this.shakeX,
      y: y - camera.y + h / 2 + this.shakeY,
    };
  }

  /**
   * DYNAMIC CARIBBEAN OCEAN & ATMOSPHERE SIMULATION
   */
  drawBackground(level, camera, time, wind = { x: 0.8, y: -0.6 }) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = time * 0.001;

    // 1. Base deep ocean gradient
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h) * 0.9);
    bgGrad.addColorStop(0, level.waterMid || '#0ea5e9');
    bgGrad.addColorStop(0.55, level.waterDeep || '#0284c7');
    bgGrad.addColorStop(1, '#051329');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Realistic Gerstner-style ocean wave swells rolling downwind
    this._drawOceanSwells(ctx, camera, w, h, t, wind, level);

    // 3. Subsurface sun caustics and specular highlights
    this._drawCaustics(ctx, camera, w, h, t, level);

    // 4. Zone-specific weather atmosphere
    this._drawAtmosphere(ctx, camera, w, h, t, level, wind);

    // 5. Tactical lagoon perimeter rope & glowing buoy lanterns
    this._drawBoundary(ctx, camera, w, h, level, time);

    // 6. Subtle cinematic vignette
    this._drawVignette(ctx, w, h);
  }

  _drawOceanSwells(ctx, camera, w, h, t, wind, level) {
    const windAngle = Math.atan2(wind.y, wind.x);
    const cosW = Math.cos(windAngle);
    const sinW = Math.sin(windAngle);

    ctx.save();
    ctx.strokeStyle = level.foam || 'rgba(215, 245, 255, 0.28)';
    ctx.lineWidth = 1.8;

    // Grid spacing for swell crest lines
    const spacing = 110;
    const startX = Math.floor((camera.x - w / 2 - 150) / spacing) * spacing;
    const startY = Math.floor((camera.y - h / 2 - 150) / spacing) * spacing;
    const endX = camera.x + w / 2 + 150;
    const endY = camera.y + h / 2 + 150;

    for (let x = startX; x <= endX; x += spacing) {
      for (let y = startY; y <= endY; y += spacing) {
        // Multi-frequency directional ocean waves in world coordinates
        const phase1 = (x * cosW + y * sinW) * 0.015 - t * 2.2;
        const phase2 = (x * 0.008 + y * 0.012) + t * 1.5;
        const swell = Math.sin(phase1) + Math.cos(phase2) * 0.45;

        if (swell > 0.6) {
          const s = this._worldToScreen(x, y, camera);
          const alpha = (swell - 0.6) * 0.35;
          ctx.globalAlpha = alpha;

          // Wave crest crescent curve perpendicular to wind
          const perpAngle = windAngle + Math.PI / 2;
          const crestLen = 35 + (swell - 0.6) * 45;
          const cx1 = s.x - Math.cos(perpAngle) * crestLen * 0.5;
          const cy1 = s.y - Math.sin(perpAngle) * crestLen * 0.5;
          const cx2 = s.x + Math.cos(perpAngle) * crestLen * 0.5;
          const cy2 = s.y + Math.sin(perpAngle) * crestLen * 0.5;
          const midX = s.x + cosW * 8;
          const midY = s.y + sinW * 8;

          ctx.beginPath();
          ctx.moveTo(cx1, cy1);
          ctx.quadraticCurveTo(midX, midY, cx2, cy2);
          ctx.stroke();

          // Seafoam sparkles on wave peak
          if (swell > 1.0) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = alpha * 0.75;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }

  _drawCaustics(ctx, camera, w, h, t, level) {
    const count = 28;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const wx = (Math.sin(i * 8.3 + t * 0.12) * 0.5 + 0.5) * WORLD_SIZE - WORLD_SIZE / 2;
      const wy = (Math.cos(i * 6.7 + t * 0.15) * 0.5 + 0.5) * WORLD_SIZE - WORLD_SIZE / 2;
      const s = this._worldToScreen(wx, wy, camera);
      if (s.x < 0 || s.x > w || s.y < 0 || s.y > h) continue;

      const glint = 0.2 + Math.sin(t * 2.5 + i * 2.0) * 0.2;
      ctx.fillStyle = level.foam || 'rgba(255, 255, 255, 0.4)';
      ctx.globalAlpha = glint;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawAtmosphere(ctx, camera, w, h, t, level, wind) {
    ctx.save();
    if (level.name === 'Stormy Shoals') {
      // 1. Driving thunderstorm rain streaks
      ctx.strokeStyle = 'rgba(200, 225, 255, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const r of this.rainDrops) {
        const rx = (r.x * w + camera.x * 0.1) % w;
        const ry = (r.y * h + t * r.speed * 60) % h;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + wind.x * 4, ry + r.len);
      }
      ctx.stroke();

      // Atmospheric dark tempest tint
      ctx.fillStyle = 'rgba(10, 18, 35, 0.22)';
      ctx.fillRect(0, 0, w, h);

    } else if (level.name === 'Coral Reef Atolls') {
      // 2. Swimming schools of tropical reef fish
      for (const f of this.fishSchool) {
        f.x += Math.cos(f.angle) * f.speed;
        f.y += Math.sin(f.angle) * f.speed;
        f.wiggle += 0.15;
        if (f.x > WORLD_SIZE / 2) f.x = -WORLD_SIZE / 2;
        if (f.x < -WORLD_SIZE / 2) f.x = WORLD_SIZE / 2;
        if (f.y > WORLD_SIZE / 2) f.y = -WORLD_SIZE / 2;
        if (f.y < -WORLD_SIZE / 2) f.y = WORLD_SIZE / 2;

        const s = this._worldToScreen(f.x, f.y, camera);
        if (s.x < 0 || s.x > w || s.y < 0 || s.y > h) continue;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(f.angle);
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size, f.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail fin wagging
        const tailX = -f.size - 1;
        const tailY = Math.sin(f.wiggle) * 1.5;
        ctx.beginPath();
        ctx.moveTo(tailX, 0);
        ctx.lineTo(tailX - 2.5, tailY - 2);
        ctx.lineTo(tailX - 2.5, tailY + 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

    } else if (level.name === 'Inferno Cove') {
      // 3. Volcanic embers and rising steam
      ctx.fillStyle = '#ff7700';
      for (let i = 0; i < 24; i++) {
        const ex = ((i * 137 + t * 45) % w);
        const ey = ((i * 211 - t * 65) % h + h) % h;
        const glow = 0.3 + Math.sin(t * 3 + i) * 0.25;
        ctx.globalAlpha = glow;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(120, 15, 5, 0.18)';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  _drawBoundary(ctx, camera, w, h, level, time) {
    const half = WORLD_SIZE / 2;
    const corners = [
      [-half, -half], [half, -half], [half, half], [-half, half],
    ];

    ctx.save();
    // Floating braided rope perimeter
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = this._worldToScreen(corners[i][0], corners[i][1], camera);
      const b = this._worldToScreen(corners[(i + 1) % 4][0], corners[(i + 1) % 4][1], camera);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Warning buoys with warm amber lanterns
    const buoysPerSide = 8;
    for (let i = 0; i < 4; i++) {
      const p1 = corners[i];
      const p2 = corners[(i + 1) % 4];
      for (let b = 0; b < buoysPerSide; b++) {
        const frac = b / buoysPerSide;
        const bx = p1[0] + (p2[0] - p1[0]) * frac;
        const by = p1[1] + (p2[1] - p1[1]) * frac;
        const s = this._worldToScreen(bx, by, camera);
        if (s.x < -60 || s.x > w + 60 || s.y < -60 || s.y > h + 60) continue;

        // Lantern light halo on undulating water
        const glow = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 26);
        glow.addColorStop(0, 'rgba(255, 190, 60, 0.75)');
        glow.addColorStop(0.6, 'rgba(255, 120, 20, 0.25)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 26, 0, Math.PI * 2);
        ctx.fill();

        // Wooden buoy float & brass lantern top
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2b170e';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawVignette(ctx, w, h) {
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.38, w / 2, h / 2, Math.max(w, h) * 0.78);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(3, 10, 22, 0.58)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * TOP-DOWN TROPICAL ISLANDS & CORAL ATOLLS
   */
  drawObstacles(obstacles, camera) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = Date.now() * 0.002;

    for (const obs of obstacles) {
      const s = this._worldToScreen(obs.x, obs.y, camera);
      if (s.x < -140 || s.x > w + 140 || s.y < -140 || s.y > h + 140) continue;

      const r = obs.radius;
      ctx.save();

      if (obs.type === 'reef') {
        // --- SUBMERGED LIVING CORAL REEF ---
        // 1. Shoreline surf ring breaking on shallow rock
        const surfPulse = Math.sin(t + obs.seed) * 4;
        ctx.strokeStyle = 'rgba(235, 252, 255, 0.65)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 1.25 + surfPulse, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Translucent shallow emerald lagoon shelf
        ctx.fillStyle = 'rgba(20, 184, 166, 0.38)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // 3. Organic vibrant coral heads
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          const dist = r * (0.65 + Math.sin(i * 2.3 + obs.seed) * 0.32);
          const px = s.x + Math.cos(a) * dist;
          const py = s.y + Math.sin(a) * dist;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Coral texture spots
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(s.x - r * 0.2, s.y - r * 0.2, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(s.x + r * 0.25, s.y + r * 0.2, r * 0.3, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // --- TOP-DOWN TROPICAL CARIBBEAN ATOLL ---
        // 1. Concentric breaking surf waves washing up the beach
        const surfPulse = Math.sin(t * 1.5 + obs.seed) * 6;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 1.35 + surfPulse, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Turquoise shallow water reef halo
        const haloGrad = ctx.createRadialGradient(s.x, s.y, r * 0.9, s.x, s.y, r * 1.4);
        haloGrad.addColorStop(0, 'rgba(45, 212, 191, 0.55)');
        haloGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // 3. Golden sandbar beach with soft shoreline bevel
        const sandGrad = ctx.createRadialGradient(s.x, s.y, r * 0.3, s.x, s.y, r);
        sandGrad.addColorStop(0, '#fef08a');
        sandGrad.addColorStop(0.75, '#fde047');
        sandGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = sandGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 4. Lush central tropical jungle mound
        const jungleR = r * 0.65;
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(s.x, s.y, jungleR, 0, Math.PI * 2);
        ctx.fill();

        // Inner jungle canopy depth
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(s.x - 3, s.y - 3, jungleR * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // 5. Waving coconut palm trees with cast frond shadows on sand
        const palmCount = Math.max(3, Math.floor(r / 13));
        for (let p = 0; p < palmCount; p++) {
          const pa = (p / palmCount) * Math.PI * 2 + (obs.seed || 1);
          const pDist = jungleR * 0.58;
          const px = s.x + Math.cos(pa) * pDist;
          const py = s.y + Math.sin(pa) * pDist;

          // Frond shadow on sand
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.ellipse(px + 4, py + 4, 12, 9, pa, 0, Math.PI * 2);
          ctx.fill();

          // Palm trunk
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Star fronds radiating from trunk center
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2.4;
          for (let f = 0; f < 6; f++) {
            const fa = (f / 6) * Math.PI * 2 + p * 0.5 + Math.sin(t + f) * 0.08;
            const fx = px + Math.cos(fa) * 16;
            const fy = py + Math.sin(fa) * 16;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.quadraticCurveTo(px + Math.cos(fa) * 9, py + Math.sin(fa) * 9, fx, fy);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }
  }

  /**
   * INTRICATE HANDCRAFTED TOP-DOWN SHIP ARTWORK
   */
  drawShip(ship, camera, isPlayer = false) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const s = this._worldToScreen(ship.x, ship.y, camera);

    if (s.x < -160 || s.x > w + 160 || s.y < -160 || s.y > h + 160) return;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ship.angle);

    const length = isPlayer ? (ship.shipDef?.size || 42) : ((ship.def?.size || 26) * 1.35);
    const width = length * 0.44;
    const hullColor = isPlayer ? (ship.shipDef?.color || '#1b120c') : ship.def.color;
    const deckColor = isPlayer ? (ship.shipDef?.deckColor || '#452b1a') : '#8b5a2b';
    const sailColor = isPlayer ? (ship.shipDef?.sailColor || '#e2d9cc') : ship.def.sailColor;
    const trimColor = isPlayer ? (ship.shipDef?.trimColor || '#eab308') : '#334155';
    const isGhost = isPlayer ? !!ship.shipDef?.isGhost : !!ship.def?.isGhost;

    if (isPlayer && ship.invuln > 0 && Math.floor(ship.invuln / 70) % 2) {
      ctx.globalAlpha = 0.5;
    } else if (isGhost) {
      ctx.globalAlpha = 0.78;
      ctx.shadowColor = ship.shipDef?.trimColor || '#2dd4bf';
      ctx.shadowBlur = 22;
    }

    // 1. HYDRODYNAMIC SHIP WAKE & FOAM SPRAY
    const isMoving = isPlayer ? (ship.vx !== 0 || ship.vy !== 0) : ship.effectiveSpeed > 0.3;
    if (isMoving) {
      ctx.save();
      // Stern foam churn wash
      ctx.fillStyle = isGhost ? 'rgba(45, 212, 191, 0.4)' : 'rgba(235, 248, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-length * 0.58, 0, width * 0.8, width * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      // Twin expanding Kelvin wake trails streaming behind stern
      ctx.strokeStyle = isGhost ? 'rgba(45, 212, 191, 0.45)' : 'rgba(215, 240, 255, 0.6)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-length * 0.42, -width * 0.48);
      ctx.lineTo(-length * 1.7, -width * 1.45);
      ctx.moveTo(-length * 0.42, width * 0.48);
      ctx.lineTo(-length * 1.7, width * 1.45);
      ctx.stroke();
      ctx.restore();
    }

    // 2. OCEAN SWELL ROLL & PITCH
    const bob = Math.sin(ship.bobPhase || 0) * 1.3;
    ctx.translate(0, bob);

    // 3. UNDERWATER HULL DROP SHADOW
    ctx.fillStyle = 'rgba(2, 12, 26, 0.45)';
    ctx.beginPath();
    ctx.ellipse(3, 4, length * 0.56, width * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. BOWSPRIT OR RAM
    if (ship.type === 'ironclad') {
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(length * 0.4, -width * 0.32);
      ctx.lineTo(length * 0.78, 0);
      ctx.lineTo(length * 0.4, width * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Long tapered wooden bowsprit spar
      ctx.strokeStyle = '#5c381e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(length * 0.42, 0);
      ctx.lineTo(length * 0.82, 0);
      ctx.stroke();

      // Golden bow figurehead (Mermaid / Dragon / Lion crest)
      ctx.fillStyle = trimColor;
      ctx.beginPath();
      ctx.arc(length * 0.55, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. WOODEN TUMBLEHOME HULL
    ctx.fillStyle = hullColor;
    ctx.beginPath();
    ctx.moveTo(length * 0.54, 0); // Pointed bow
    ctx.quadraticCurveTo(length * 0.28, width * 0.54, -length * 0.26, width * 0.5); // Starboard flank
    ctx.lineTo(-length * 0.5, width * 0.38); // Starboard stern corner
    ctx.lineTo(-length * 0.54, 0); // Stern centerline
    ctx.lineTo(-length * 0.5, -width * 0.38); // Port stern corner
    ctx.lineTo(-length * 0.26, -width * 0.5); // Port flank
    ctx.quadraticCurveTo(length * 0.28, -width * 0.54, length * 0.54, 0);
    ctx.closePath();
    ctx.fill();

    // Hull border trim & gunwales
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = isPlayer ? 2.8 : 2.0;
    ctx.stroke();

    // 6. WOODEN DECK PLANKS & CAULKING
    ctx.fillStyle = deckColor;
    ctx.beginPath();
    ctx.moveTo(length * 0.44, 0);
    ctx.quadraticCurveTo(length * 0.22, width * 0.44, -length * 0.24, width * 0.42);
    ctx.lineTo(-length * 0.44, width * 0.32);
    ctx.lineTo(-length * 0.44, -width * 0.32);
    ctx.lineTo(-length * 0.24, -width * 0.42);
    ctx.quadraticCurveTo(length * 0.22, -width * 0.44, length * 0.44, 0);
    ctx.closePath();
    ctx.fill();

    // Deck planking lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.lineWidth = 1;
    for (let p = -2; p <= 2; p++) {
      if (p === 0) continue;
      const py = (p / 3) * width * 0.33;
      ctx.beginPath();
      ctx.moveTo(-length * 0.4, py);
      ctx.lineTo(length * 0.34, py);
      ctx.stroke();
    }

    // Timber cargo hatch with brass grill
    ctx.fillStyle = 'rgba(20, 12, 6, 0.8)';
    ctx.fillRect(-length * 0.06, -width * 0.18, length * 0.16, width * 0.36);
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-length * 0.06, -width * 0.18, length * 0.16, width * 0.36);

    // Captain's Quarterdeck Stern Cabin with stained-glass illuminated windows
    ctx.fillStyle = isPlayer ? '#2b170e' : hullColor;
    ctx.fillRect(-length * 0.48, -width * 0.32, length * 0.18, width * 0.64);
    ctx.strokeStyle = trimColor;
    ctx.strokeRect(-length * 0.48, -width * 0.32, length * 0.18, width * 0.64);

    // Glowing stern cabin windows
    ctx.fillStyle = '#fef08a';
    for (let win = -2; win <= 2; win++) {
      ctx.fillRect(-length * 0.49, win * width * 0.1, 2.5, width * 0.07);
    }

    // 7. BROADSIDE GUNPORTS & RECOILING CANNON BARRELS
    const gunsCount = isPlayer
      ? (3 + Math.min(ship.gunIndex, 3) + (ship.shipUpgrades?.broadside ? ship.shipUpgrades.broadside - 1 : 0) + (ship.shipDef?.broadsideBonus || 0))
      : (ship.isBoss ? 5 : ship.isMiniBoss ? 4 : 2);

    const recoilOffset = isPlayer ? (ship.broadsideRecoil * 3.5) : (ship.recoil ? ship.recoil * 3.5 : 0);
    ctx.fillStyle = isPlayer ? (ship.gun?.color || '#ffd700') : '#1e293b';

    for (let g = 0; g < gunsCount; g++) {
      const gx = -length * 0.24 + (g / (gunsCount - 1 || 1)) * (length * 0.48);
      // Starboard barrel (recoiling inward)
      ctx.fillRect(gx - 1.8, width * 0.44 - recoilOffset, 3.6, 6);
      // Port barrel (recoiling inward)
      ctx.fillRect(gx - 1.8, -width * 0.44 - 6 + recoilOffset, 3.6, 6);
    }

    // 8. MASTS, YARDARMS & BILLOWING CANVAS SAILS
    const mastCount = isPlayer
      ? (ship.shipDef?.masts || 2)
      : (ship.isBoss ? 4 : ship.isMiniBoss ? 3 : (ship.def?.name === 'Siege Bomb Ketch' ? 1 : 2));

    const sailHpRatio = isPlayer
      ? (ship.sail / (ship.maxSail || 100))
      : (ship.sail / (ship.def?.sail || 50));

    for (let m = 0; m < mastCount; m++) {
      const mx = -length * 0.28 + (m / (mastCount || 1)) * (length * 0.58);
      const sparSpan = width * (1.15 + (m === 1 ? 0.35 : 0));

      // Shrouds & Ratlines (Rigging ropes from mast to hull sides)
      ctx.strokeStyle = 'rgba(30, 20, 10, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx, 0); ctx.lineTo(mx - 4, -sparSpan * 0.55);
      ctx.moveTo(mx, 0); ctx.lineTo(mx + 4, -sparSpan * 0.55);
      ctx.moveTo(mx, 0); ctx.lineTo(mx - 4, sparSpan * 0.55);
      ctx.moveTo(mx, 0); ctx.lineTo(mx + 4, sparSpan * 0.55);
      ctx.stroke();

      // Horizontal Yardarm (Wood spar)
      ctx.strokeStyle = '#5c381e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(mx, -sparSpan * 0.5);
      ctx.lineTo(mx, sparSpan * 0.5);
      ctx.stroke();

      // Billowing Cloth Canvas Sail (Curving forward with wind)
      ctx.fillStyle = sailColor;
      ctx.globalAlpha = 0.45 + sailHpRatio * 0.55;
      ctx.beginPath();
      ctx.moveTo(mx, -sparSpan * 0.5);
      ctx.quadraticCurveTo(mx + 9, 0, mx, sparSpan * 0.5);
      ctx.quadraticCurveTo(mx + 3, 0, mx, -sparSpan * 0.5);
      ctx.fill();
      ctx.strokeStyle = '#c4b5a0';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Battle Damage: Torn canvas holes if damaged
      if (sailHpRatio < 0.6) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(mx + 3, -sparSpan * 0.2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mx + 4, sparSpan * 0.25, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Mast center & Crow's nest platform
      ctx.fillStyle = '#2b170e';
      ctx.beginPath();
      ctx.arc(mx, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 9. ANIMATED FLUTTERING JOLLY ROGER / ENSIGN AT STERN
    const flagLen = isPlayer ? 16 : 12;
    const flagW = 8;
    const flagColor = isPlayer ? (ship.shipDef?.flagColor || '#0f0505') : (ship.def?.flagColor || '#dc2626');
    const waveFlag = Math.sin(Date.now() * 0.008) * 2;

    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(-length * 0.5, 0);
    ctx.lineTo(-length * 0.5 - flagLen, -flagW * 0.5 + waveFlag);
    ctx.lineTo(-length * 0.5 - flagLen * 0.8, waveFlag);
    ctx.lineTo(-length * 0.5 - flagLen, flagW * 0.5 + waveFlag);
    ctx.closePath();
    ctx.fill();

    if (isPlayer) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px serif';
      ctx.textAlign = 'center';
      ctx.fillText(ship.shipDef?.flagEmblem || '☠', -length * 0.5 - 7, 3 + waveFlag);
    } else if (ship.isBoss) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 9px serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', -length * 0.5 - 7, 3 + waveFlag);
    }

    // 10. KRAKEN BOSS WRITHING TENTACLES (For Kraken-Bound Dreadnought)
    if (ship.def?.name === 'Kraken-Bound Dreadnought') {
      const tp = ship.tentaclePhase || 0;
      ctx.strokeStyle = '#7e22ce';
      ctx.lineWidth = 4;
      for (let tIdx = 0; tIdx < 4; tIdx++) {
        const tSide = (tIdx % 2 === 0 ? 1 : -1);
        const tOffset = (Math.floor(tIdx / 2) - 0.5) * length * 0.45;
        const tx1 = tOffset;
        const ty1 = tSide * width * 0.5;
        const tx2 = tOffset + Math.cos(tp + tIdx) * 22;
        const ty2 = ty1 + tSide * (26 + Math.sin(tp * 1.5 + tIdx) * 12);

        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.quadraticCurveTo(tx1 + Math.sin(tp + tIdx) * 15, ty1 + tSide * 15, tx2, ty2);
        ctx.stroke();

        // Tentacle tip suction cups
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(tx2, ty2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 11. RUM FRENZY AURA
    if (isPlayer && ship.rumFrenzyTimer > 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, length * 0.68, width * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 12. ANCHOR DRIFT FOAM SPRAY EFFECT
    if (isPlayer && ship.isDrifting) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, length * 0.6, -Math.PI * 0.7, Math.PI * 0.7);
      ctx.stroke();
    }

    ctx.restore();

    // 13. ENEMY OVERHEAD HEALTH BAR
    if (!isPlayer) {
      const barW = length * 1.25;
      const hp = Math.max(0, ship.hull / ship.maxHull);
      ctx.fillStyle = 'rgba(4, 10, 20, 0.85)';
      ctx.fillRect(s.x - barW / 2, s.y - length * 0.75 - 14, barW, 6.5);
      ctx.fillStyle = hp > 0.5 ? '#22c55e' : hp > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(s.x - barW / 2, s.y - length * 0.75 - 14, barW * hp, 6.5);
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(s.x - barW / 2, s.y - length * 0.75 - 14, barW, 6.5);

      if (ship.isBoss) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText(ship.def.name.toUpperCase(), s.x, s.y - length * 0.75 - 20);
      }
    }
  }

  /**
   * CINEMATIC SINKING SHIP SEQUENCE
   */
  drawSinkingShip(sinking, camera) {
    const ctx = this.ctx;
    const s = this._worldToScreen(sinking.x, sinking.y, camera);
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (s.x < -160 || s.x > w + 160 || s.y < -160 || s.y > h + 160) return;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(sinking.angle);

    // List sideways as water pours in
    ctx.rotate(sinking.roll * sinking.sinkProgress);

    const length = sinking.length;
    const width = sinking.width;
    const alpha = Math.max(0, 1 - sinking.sinkProgress);
    ctx.globalAlpha = alpha;

    // Sinking down into the water
    ctx.fillStyle = sinking.hullColor;
    ctx.beginPath();
    ctx.moveTo(length * 0.5, 0);
    ctx.quadraticCurveTo(length * 0.25, width * 0.5, -length * 0.25, width * 0.48);
    ctx.lineTo(-length * 0.48, width * 0.35);
    ctx.lineTo(-length * 0.5, 0);
    ctx.lineTo(-length * 0.48, -width * 0.35);
    ctx.lineTo(-length * 0.25, -width * 0.48);
    ctx.quadraticCurveTo(length * 0.25, -width * 0.5, length * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    // Toppled broken masts
    ctx.strokeStyle = '#5c381e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-length * 0.1, 0);
    ctx.lineTo(length * 0.15, width * 0.7);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * HARPOON ROPE CABLE RENDERING
   */
  drawHarpoon(harpoon, player, camera) {
    if (!harpoon.alive) return;
    const ctx = this.ctx;
    const s1 = this._worldToScreen(player.x, player.y, camera);
    const s2 = this._worldToScreen(harpoon.x, harpoon.y, camera);

    ctx.save();
    // Braided hemp cable
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Iron harpoon barb
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(s2.x, s2.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * 3D METALLIC SPHERICAL PROJECTILES
   */
  drawProjectile(p, camera) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const s = this._worldToScreen(p.x, p.y, camera);

    if (s.x < -50 || s.x > w + 50 || s.y < -50 || s.y > h + 50) return;

    const isPlayer = p.owner === 'player';
    const radius = p.ammoType === 'grape' ? 5 : (p.isBroadside ? 8.5 : 7);
    const glow = (isPlayer && p.gun?.color) ? p.gun.color : (p.ammo?.glow || (isPlayer ? '#ffaa00' : '#ff4444'));
    const trailColor = (isPlayer && p.gun?.color) ? p.gun.color : (p.ammo?.trail || glow);

    // 1. MORTAR HIGH BALLISTICS (Parabolic height with ground shadow)
    if (p.isMortar) {
      ctx.save();
      // Ground shadow on water
      ctx.fillStyle = 'rgba(2, 10, 20, 0.6)';
      const shadowR = Math.max(3, radius * (1 - p.z / 90));
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, shadowR * 1.4, shadowR * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Elevated bomb
      const ballY = s.y - p.z;
      const scale = 1 + p.z * 0.018;

      ctx.fillStyle = 'rgba(255, 70, 0, 0.45)';
      ctx.beginPath();
      ctx.arc(s.x, ballY, radius * scale * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#cc2200';
      ctx.beginPath();
      ctx.arc(s.x, ballY, radius * scale, 0, Math.PI * 2);
      ctx.fill();

      // Burning fuse spark
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(s.x + 3, ballY - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // 2. STANDARD CANNONBALL MOTION TRAIL
    if (p.trail && p.trail.length > 1) {
      ctx.save();
      for (let i = 1; i < p.trail.length; i++) {
        const a = this._worldToScreen(p.trail[i - 1].x, p.trail[i - 1].y, camera);
        const b = this._worldToScreen(p.trail[i].x, p.trail[i].y, camera);
        const alpha = (i / p.trail.length) * 0.75;
        ctx.strokeStyle = trailColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = radius * (0.35 + alpha * 0.7);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(s.x, s.y);

    // Glowing halo
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 2.3);
    halo.addColorStop(0, glow + 'cc');
    halo.addColorStop(0.5, glow + '33');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.3, 0, Math.PI * 2);
    ctx.fill();

    // 3D Metallic Shaded Cannonball
    const ball = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, 0, 0, 0, radius);
    ball.addColorStop(0, isPlayer ? '#e2e8f0' : '#fca5a5');
    ball.addColorStop(0.6, p.ammo?.color || '#334155');
    ball.addColorStop(1, '#020617');
    ctx.fillStyle = ball;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Whirling Chain Shot
    if (p.ammoType === 'chain') {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawAllProjectiles(projectiles, camera) {
    for (const p of projectiles) {
      this.drawProjectile(p, camera);
    }
  }

  /**
   * FLOATING SALVAGE, TREASURE CHESTS & POWDER KEGS
   */
  drawLoot(lootDrops, camera) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const loot of lootDrops) {
      if (!loot.alive) continue;
      const s = this._worldToScreen(loot.x, loot.y, camera);
      if (s.x < -60 || s.x > w + 60 || s.y < -60 || s.y > h + 60) continue;

      const bobY = Math.sin(loot.bobPhase) * 3.5;
      const ly = s.y + bobY;

      ctx.save();
      // Gentle ripple on water surface
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 5, 16, 7, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (loot.type === 'gold') {
        // Treasure Chest with golden glow
        const glow = ctx.createRadialGradient(s.x, ly, 2, s.x, ly, 26);
        glow.addColorStop(0, 'rgba(250, 204, 21, 0.85)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, ly, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#854d0e';
        ctx.fillRect(s.x - 11, ly - 9, 22, 17);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(s.x - 11, ly - 3, 22, 4.5);
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(s.x - 11, ly - 9, 22, 17);
        ctx.font = 'bold 12px serif';
        ctx.textAlign = 'center';
        ctx.fillText('💰', s.x, ly - 12);

      } else if (loot.type === 'wood') {
        // Timber planks (Hull HP)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(s.x - 13, ly - 7, 26, 5);
        ctx.fillRect(s.x - 10, ly, 20, 5);
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 12px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚓ +HP', s.x, ly - 12);

      } else if (loot.type === 'sail') {
        // Canvas Rigging Roll & Needle Spool (Sail Repair)
        const glow = ctx.createRadialGradient(s.x, ly, 2, s.x, ly, 24);
        glow.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, ly, 24, 0, Math.PI * 2);
        ctx.fill();

        // Rolled bolt of white canvas cloth
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(s.x, ly - 2, 12, 6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Hemp rope ties around canvas roll
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x - 5, ly - 7); ctx.lineTo(s.x - 5, ly + 3);
        ctx.moveTo(s.x + 5, ly - 7); ctx.lineTo(s.x + 5, ly + 3);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText('⛵ +SAILS', s.x, ly - 13);

      } else if (loot.type === 'crew') {
        // Castaway Dinghy & Rations (Crew Recruitment)
        const glow = ctx.createRadialGradient(s.x, ly, 2, s.x, ly, 24);
        glow.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, ly, 24, 0, Math.PI * 2);
        ctx.fill();

        // Small wooden rescue skiff hull
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(s.x, ly, 13, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Crossed wooden rescue oars
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x - 8, ly - 7); ctx.lineTo(s.x + 8, ly + 7);
        ctx.moveTo(s.x - 8, ly + 7); ctx.lineTo(s.x + 8, ly - 7);
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText('☠ +CREW', s.x, ly - 13);

      } else if (loot.type === 'rum') {
        // Rum Cask (Frenzy)
        const glow = ctx.createRadialGradient(s.x, ly, 2, s.x, ly, 26);
        glow.addColorStop(0, 'rgba(192, 132, 252, 0.85)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, ly, 26, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.arc(s.x, ly, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e9d5ff';
        ctx.font = 'bold 11px serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ RUM', s.x, ly - 14);

      } else if (loot.type === 'keg') {
        // Powder Keg
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(s.x, ly, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Burning spark fuse
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(s.x + 9, ly - 9, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px serif';
        ctx.textAlign = 'center';
        ctx.fillText('💣 KEG', s.x, ly - 16);
      }
      ctx.restore();
    }
  }

  /**
   * TACTICAL NAUTICAL RADAR MINIMAP
   */
  drawMinimap(player, enemies, obstacles, lootDrops, wind) {
    const ctx = this.ctx;
    const mapSize = 136;
    const padding = 18;
    const cx = this.canvas.width - mapSize / 2 - padding;
    const cy = mapSize / 2 + padding + 62;
    const radius = mapSize / 2;
    const scale = radius / (WORLD_SIZE * 0.5);

    ctx.save();

    // Brass compass bezel
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 18, 36, 0.9)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#c9a227';
    ctx.stroke();

    // Radar concentric range circles
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 10px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - radius + 12);

    // Wind direction arrow on compass rim
    const windAngle = Math.atan2(wind.y, wind.x);
    const wx = cx + Math.cos(windAngle) * (radius - 13);
    const wy = cy + Math.sin(windAngle) * (radius - 13);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('💨', wx, wy + 4);

    // Obstacles
    for (const obs of obstacles) {
      const mx = cx + obs.x * scale;
      const my = cy + obs.y * scale;
      ctx.fillStyle = obs.type === 'reef' ? '#f97316' : '#22c55e';
      ctx.beginPath();
      ctx.arc(mx, my, Math.max(2.5, obs.radius * scale), 0, Math.PI * 2);
      ctx.fill();
    }

    // Loot drops
    for (const loot of lootDrops) {
      if (!loot.alive) continue;
      const lx = cx + loot.x * scale;
      const ly = cy + loot.y * scale;
      ctx.fillStyle = loot.type === 'keg' ? '#ef4444' :
                     loot.type === 'wood' ? '#4ade80' :
                     loot.type === 'sail' ? '#38bdf8' :
                     loot.type === 'crew' ? '#fbbf24' :
                     loot.type === 'rum' ? '#c084fc' : '#facc15';
      ctx.fillRect(lx - 2, ly - 2, 4, 4);
    }

    // Enemy ships
    for (const e of enemies) {
      if (!e.alive) continue;
      const ex = cx + e.x * scale;
      const ey = cy + e.y * scale;
      ctx.fillStyle = e.isBoss ? '#ffd700' : (e.isMiniBoss ? '#f97316' : '#ef4444');
      ctx.beginPath();
      ctx.arc(ex, ey, e.isBoss ? 5 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player ship heading triangle
    if (player.alive) {
      const px = cx + player.x * scale;
      const py = cy + player.y * scale;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(player.angle);
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-5, -4.5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-5, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  drawFloatingTexts(texts, camera) {
    const ctx = this.ctx;
    for (const t of texts) {
      const alpha = t.life / t.maxLife;
      const s = this._worldToScreen(t.x, t.y, camera);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size || 18}px Cinzel, serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.strokeText(t.text, s.x, s.y);
      ctx.fillText(t.text, s.x, s.y);
      ctx.restore();
    }
  }

  drawAimIndicator(player, camera, targetX, targetY) {
    const ctx = this.ctx;
    const s = this._worldToScreen(player.x, player.y, camera);
    const t = this._worldToScreen(targetX, targetY, camera);
    const angle = Math.atan2(t.y - s.y, t.x - s.x);
    const range = Math.min(player.gun?.range || 600, 560);
    const spread = 0.07 * (player.gun?.spreadMod || 1);

    ctx.save();

    // Aim cone
    ctx.fillStyle = 'rgba(255, 200, 50, 0.08)';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.arc(s.x, s.y, range, angle - spread, angle + spread);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 200, 50, 0.4)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(angle) * range, s.y + Math.sin(angle) * range);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  drawCustomCursor(targetX, targetY, camera, player, time = 0) {
    const ctx = this.ctx;
    const t = this._worldToScreen(targetX, targetY, camera);
    const style = player?.gun?.cursorStyle || 'swivel';
    const tm = time * 0.002;

    ctx.save();
    ctx.translate(t.x, t.y);

    if (style === 'sniper') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 22, tm, tm + Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-32, 0); ctx.lineTo(-4, 0);
      ctx.moveTo(4, 0); ctx.lineTo(32, 0);
      ctx.moveTo(0, -32); ctx.lineTo(0, -4);
      ctx.moveTo(0, 4); ctx.lineTo(0, 32);
      ctx.stroke();
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

    } else {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-20, 0); ctx.lineTo(-6, 0);
      ctx.moveTo(6, 0); ctx.lineTo(20, 0);
      ctx.moveTo(0, -20); ctx.lineTo(0, -6);
      ctx.moveTo(0, 6); ctx.lineTo(0, 20);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
