class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeIntensity = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = true;
  }

  shake(intensity = 5) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  updateShake() {
    if (this.shakeIntensity > 0.1) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.9;
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

  /** PURE TOP-DOWN OCEAN VIEW */
  drawBackground(level, camera, time, wind = { x: 0.8, y: -0.6 }) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = time * 0.001;

    // 1. Base deep ocean fill with radial depth from center
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.85);
    bgGrad.addColorStop(0, level.waterMid || '#0284c7');
    bgGrad.addColorStop(0.65, level.waterDeep || '#0369a1');
    bgGrad.addColorStop(1, '#07162c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Animated top-down caustic grid (moving with world coordinates)
    const gridSize = 140;
    const startX = Math.floor((camera.x - w / 2) / gridSize) * gridSize;
    const startY = Math.floor((camera.y - h / 2) / gridSize) * gridSize;

    ctx.save();
    for (let x = startX; x < camera.x + w / 2 + gridSize; x += gridSize) {
      for (let y = startY; y < camera.y + h / 2 + gridSize; y += gridSize) {
        const s = this._worldToScreen(x, y, camera);
        
        // Multi-frequency wave pattern in world space
        const wave1 = Math.sin(x * 0.01 + t * 1.2) * Math.cos(y * 0.01 + t * 0.9);
        const wave2 = Math.sin((x + y) * 0.015 + t * 1.5) * 0.5;
        const wave = wave1 + wave2;

        if (wave > 0.25) {
          const alpha = (wave - 0.25) * 0.16;
          ctx.fillStyle = level.foam || 'rgba(255, 255, 255, 0.2)';
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.ellipse(s.x + gridSize * 0.5, s.y + gridSize * 0.5, gridSize * 0.45 * wave, gridSize * 0.28 * wave, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // 3. Top-down wind streaks drifting across the sea
    this._drawWindStreaks(ctx, camera, w, h, time, wind);

    // 4. Floating water sparkles / sunlight glints
    this._drawSparkles(ctx, camera, w, h, time, level.foam);

    // 5. Lagoon boundary: floating rope perimeter & lantern buoys
    this._drawBoundary(ctx, camera, w, h, level, time);

    // 6. Subtle atmospheric top-down vignette
    this._drawVignette(ctx, w, h);
  }

  _drawWindStreaks(ctx, camera, w, h, time, wind) {
    const t = time * 0.001;
    const count = 28;
    const windAngle = Math.atan2(wind.y, wind.x);
    const speed = 120;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 18]);

    for (let i = 0; i < count; i++) {
      const px = ((i * 197 + t * speed * wind.x) % (w + 400)) - 200;
      const py = ((i * 311 + t * speed * wind.y) % (h + 400)) - 200;
      const len = 50 + (i % 5) * 15;

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(windAngle) * len, py + Math.sin(windAngle) * len);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  _drawSparkles(ctx, camera, w, h, time, foamColor) {
    const count = 35;
    for (let i = 0; i < count; i++) {
      const wx = (Math.sin(i * 9.1 + time * 0.0003) * 0.5 + 0.5) * WORLD_SIZE - WORLD_SIZE / 2;
      const wy = (Math.cos(i * 7.3 + time * 0.0004) * 0.5 + 0.5) * WORLD_SIZE - WORLD_SIZE / 2;
      const s = this._worldToScreen(wx, wy, camera);
      if (s.x < 0 || s.x > w || s.y < 0 || s.y > h) continue;

      const blink = 0.25 + Math.sin(time * 0.003 + i * 1.5) * 0.25;
      ctx.fillStyle = foamColor || '#bae6fd';
      ctx.globalAlpha = blink;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawBoundary(ctx, camera, w, h, level, time) {
    const half = WORLD_SIZE / 2;
    const corners = [
      [-half, -half], [half, -half], [half, half], [-half, half],
    ];

    // Floating rope perimeter
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = this._worldToScreen(corners[i][0], corners[i][1], camera);
      const b = this._worldToScreen(corners[(i + 1) % 4][0], corners[(i + 1) % 4][1], camera);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Warning buoys along boundary with glowing lanterns
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

        // Lantern light on water
        const glow = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 22);
        glow.addColorStop(0, 'rgba(255, 180, 50, 0.7)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 22, 0, Math.PI * 2);
        ctx.fill();

        // Wooden buoy ring & brass top
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawVignette(ctx, w, h) {
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(4, 12, 24, 0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  /** PURE TOP-DOWN ISLANDS & OBSTACLES */
  drawObstacles(obstacles, camera) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const obs of obstacles) {
      const s = this._worldToScreen(obs.x, obs.y, camera);
      if (s.x < -120 || s.x > w + 120 || s.y < -120 || s.y > h + 120) continue;

      const r = obs.radius;

      if (obs.type === 'reef') {
        // Submerged vibrant coral reef viewed through clear water
        // 1. Water ripple / breaking foam edge
        ctx.strokeStyle = 'rgba(200, 245, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 1.25, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Translucent shallow turquoise water ring
        ctx.fillStyle = 'rgba(20, 184, 166, 0.35)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // 3. Submerged organic coral mounds
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const dist = r * (0.6 + Math.sin(i * 2 + obs.seed) * 0.35);
          const px = s.x + Math.cos(a) * dist;
          const py = s.y + Math.sin(a) * dist;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Coral highlights
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(s.x - r * 0.2, s.y - r * 0.2, r * 0.45, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // TOP-DOWN TROPICAL ISLAND ATOLL
        // 1. Shallow turquoise lagoon halo
        ctx.fillStyle = 'rgba(45, 212, 191, 0.45)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 1.45, 0, Math.PI * 2);
        ctx.fill();

        // 2. White sandbar beach
        const sandGrad = ctx.createRadialGradient(s.x, s.y, r * 0.4, s.x, s.y, r * 1.05);
        sandGrad.addColorStop(0, '#fef08a');
        sandGrad.addColorStop(0.7, '#fde047');
        sandGrad.addColorStop(1, '#eab308');
        ctx.fillStyle = sandGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Sand shore outline
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. Central lush tropical jungle mound
        const jungleR = r * 0.65;
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(s.x, s.y, jungleR, 0, Math.PI * 2);
        ctx.fill();

        // 4. Top-Down Palm Trees (star fronds radiating from center)
        const palmCount = Math.max(2, Math.floor(r / 14));
        for (let p = 0; p < palmCount; p++) {
          const pa = (p / palmCount) * Math.PI * 2 + (obs.seed || 1);
          const pDist = jungleR * 0.55;
          const px = s.x + Math.cos(pa) * pDist;
          const py = s.y + Math.sin(pa) * pDist;

          // Palm trunk center
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Palm fronds radiating outwards (star shape)
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2.5;
          for (let f = 0; f < 6; f++) {
            const fa = (f / 6) * Math.PI * 2 + p;
            const fx = px + Math.cos(fa) * (14 + (p % 3) * 3);
            const fy = py + Math.sin(fa) * (14 + (p % 3) * 3);
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.quadraticCurveTo(px + Math.cos(fa) * 7, py + Math.sin(fa) * 7, fx, fy);
            ctx.stroke();
          }
        }
      }
    }
  }

  /** AUTHENTIC TOP-DOWN SHIP RENDERING */
  drawShip(ship, camera, isPlayer = false) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const s = this._worldToScreen(ship.x, ship.y, camera);

    if (s.x < -140 || s.x > w + 140 || s.y < -140 || s.y > h + 140) return;

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

    if (isPlayer && ship.invuln > 0 && Math.floor(ship.invuln / 80) % 2) {
      ctx.globalAlpha = 0.5;
    } else if (isGhost) {
      ctx.globalAlpha = 0.72;
      ctx.shadowColor = ship.shipDef?.trimColor || '#2dd4bf';
      ctx.shadowBlur = 18;
    }

    // 1. HYDRODYNAMIC V-WAKE (Top-Down foaming wake streaming behind ship)
    const isMoving = isPlayer ? (ship.vx !== 0 || ship.vy !== 0) : ship.effectiveSpeed > 0.3;
    if (isMoving) {
      ctx.save();
      // Foaming stern wash
      ctx.fillStyle = ship.def?.isGhost ? 'rgba(45, 212, 191, 0.35)' : 'rgba(230, 245, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-length * 0.55, 0, width * 0.75, width * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Twin V-wake lines streaming backwards
      ctx.strokeStyle = ship.def?.isGhost ? 'rgba(45, 212, 191, 0.45)' : 'rgba(220, 240, 255, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-length * 0.4, -width * 0.45);
      ctx.lineTo(-length * 1.6, -width * 1.4);
      ctx.moveTo(-length * 0.4, width * 0.45);
      ctx.lineTo(-length * 1.6, width * 1.4);
      ctx.stroke();
      ctx.restore();
    }

    // 2. SHIP ROLL / SWELL BOB
    const bob = Math.sin(ship.bobPhase || 0) * 1.2;
    ctx.translate(0, bob);

    // 3. UNDERWATER HULL SHADOW
    ctx.fillStyle = 'rgba(2, 15, 30, 0.4)';
    ctx.beginPath();
    ctx.ellipse(3, 4, length * 0.54, width * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. TOP-DOWN WOODEN HULL (Pointed bow forward at +X, square/round stern at -X)
    ctx.beginPath();
    // Bowsprit or Ram
    if (ship.type === 'ironclad') {
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(length * 0.4, -width * 0.3);
      ctx.lineTo(length * 0.75, 0);
      ctx.lineTo(length * 0.4, width * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#5c381e';
      ctx.lineWidth = 3;
      ctx.moveTo(length * 0.45, 0);
      ctx.lineTo(length * 0.78, 0);
      ctx.stroke();
    }

    // Outer hull perimeter
    ctx.fillStyle = hullColor;
    ctx.beginPath();
    ctx.moveTo(length * 0.52, 0); // Bow tip
    ctx.quadraticCurveTo(length * 0.25, width * 0.52, -length * 0.25, width * 0.5); // Starboard flank
    ctx.lineTo(-length * 0.48, width * 0.38); // Starboard stern corner
    ctx.lineTo(-length * 0.52, 0); // Stern center
    ctx.lineTo(-length * 0.48, -width * 0.38); // Port stern corner
    ctx.lineTo(-length * 0.25, -width * 0.5); // Port flank
    ctx.quadraticCurveTo(length * 0.25, -width * 0.52, length * 0.52, 0); // Bow
    ctx.closePath();
    ctx.fill();

    // Hull border trim / gunwale
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = isPlayer ? 2.5 : 1.8;
    ctx.stroke();

    // 5. WOODEN DECK PLANKS
    ctx.fillStyle = deckColor;
    ctx.beginPath();
    ctx.moveTo(length * 0.42, 0);
    ctx.quadraticCurveTo(length * 0.2, width * 0.42, -length * 0.22, width * 0.4);
    ctx.lineTo(-length * 0.42, width * 0.3);
    ctx.lineTo(-length * 0.42, -width * 0.3);
    ctx.lineTo(-length * 0.22, -width * 0.4);
    ctx.quadraticCurveTo(length * 0.2, -width * 0.42, length * 0.42, 0);
    ctx.closePath();
    ctx.fill();

    // Longitudinal planking lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    for (let p = -2; p <= 2; p++) {
      if (p === 0) continue;
      const py = (p / 3) * width * 0.32;
      ctx.beginPath();
      ctx.moveTo(-length * 0.38, py);
      ctx.lineTo(length * 0.32, py);
      ctx.stroke();
    }

    // Deck Hatch & Helm Wheel
    ctx.fillStyle = 'rgba(15, 10, 5, 0.7)';
    ctx.fillRect(-length * 0.05, -width * 0.16, length * 0.15, width * 0.32);
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(-length * 0.05, -width * 0.16, length * 0.15, width * 0.32);

    // Captain's Quarterdeck Stern Cabin
    ctx.fillStyle = isPlayer ? '#2b170e' : hullColor;
    ctx.fillRect(-length * 0.46, -width * 0.3, length * 0.16, width * 0.6);
    ctx.strokeRect(-length * 0.46, -width * 0.3, length * 0.16, width * 0.6);

    // 6. BROADSIDE CANNONS (Port & Starboard protruding barrels)
    const gunsCount = isPlayer
      ? (3 + Math.min(ship.gunIndex, 3) + (ship.shipUpgrades?.broadside ? ship.shipUpgrades.broadside - 1 : 0) + (ship.shipDef?.broadsideBonus || 0))
      : (ship.isBoss ? 5 : ship.isMiniBoss ? 4 : 2);
    ctx.fillStyle = isPlayer ? (ship.gun?.color || '#ffd700') : '#1e293b';
    for (let g = 0; g < gunsCount; g++) {
      const gx = -length * 0.22 + (g / (gunsCount - 1 || 1)) * (length * 0.44);
      // Starboard barrel
      ctx.fillRect(gx - 1.5, width * 0.44, 3, 5);
      // Port barrel
      ctx.fillRect(gx - 1.5, -width * 0.44 - 5, 3, 5);
    }

    // 7. MASTS, YARDARMS & BILLOWING CANVAS SAILS
    const mastCount = isPlayer
      ? (ship.shipDef?.masts || 2)
      : (ship.isBoss ? 4 : ship.isMiniBoss ? 3 : (ship.def?.name === 'Bomb Ketch' ? 1 : 2));
    const sailHpRatio = isPlayer
      ? (ship.sail / (ship.maxSail || 100))
      : (ship.sail / (ship.def?.sail || 50));

    for (let m = 0; m < mastCount; m++) {
      const mx = -length * 0.25 + (m / (mastCount || 1)) * (length * 0.55);
      const sparSpan = width * (1.1 + (m === 1 ? 0.3 : 0));

      // Horizontal Yardarm (Spar)
      ctx.strokeStyle = '#5c381e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(mx, -sparSpan * 0.5);
      ctx.lineTo(mx, sparSpan * 0.5);
      ctx.stroke();

      // Top-Down Canvas Sail (curving forward with wind)
      ctx.fillStyle = sailColor;
      ctx.globalAlpha = 0.4 + sailHpRatio * 0.6;
      ctx.beginPath();
      ctx.moveTo(mx, -sparSpan * 0.5);
      ctx.quadraticCurveTo(mx + 8, 0, mx, sparSpan * 0.5);
      ctx.quadraticCurveTo(mx + 3, 0, mx, -sparSpan * 0.5);
      ctx.fill();
      ctx.strokeStyle = '#c4b5a0';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Mast Center / Crow's nest circle
      ctx.fillStyle = '#2b170e';
      ctx.beginPath();
      ctx.arc(mx, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8. ENSIGN / PIRATE FLAG AT STERN
    const flagLen = isPlayer ? 14 : 10;
    const flagW = 7;
    const flagColor = isPlayer ? (ship.shipDef?.flagColor || '#0f0505') : (ship.def?.flagColor || '#dc2626');
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(-length * 0.48, 0);
    ctx.lineTo(-length * 0.48 - flagLen, -flagW * 0.5);
    ctx.lineTo(-length * 0.48 - flagLen * 0.8, 0);
    ctx.lineTo(-length * 0.48 - flagLen, flagW * 0.5);
    ctx.closePath();
    ctx.fill();

    if (isPlayer) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px serif';
      ctx.textAlign = 'center';
      ctx.fillText(ship.shipDef?.flagEmblem || '☠', -length * 0.48 - 6, 3);
    } else if (ship.isBoss) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 8px serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', -length * 0.48 - 6, 3);
    }

    // 9. RUM FRENZY AURA (if player active)
    if (isPlayer && ship.rumFrenzyTimer > 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, length * 0.65, width * 0.75, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // 10. ENEMY HEALTH BAR (in screen coordinates overhead)
    if (!isPlayer) {
      const barW = length * 1.2;
      const hp = Math.max(0, ship.hull / ship.maxHull);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(s.x - barW / 2, s.y - length * 0.75 - 12, barW, 6);
      ctx.fillStyle = hp > 0.5 ? '#22c55e' : hp > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(s.x - barW / 2, s.y - length * 0.75 - 12, barW * hp, 6);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x - barW / 2, s.y - length * 0.75 - 12, barW, 6);

      if (ship.isBoss) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 12px Cinzel, serif';
        ctx.textAlign = 'center';
        ctx.fillText(ship.def.name.toUpperCase(), s.x, s.y - length * 0.75 - 18);
      }
    }
  }

  /** TOP-DOWN PROJECTILES */
  drawProjectile(p, camera) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const s = this._worldToScreen(p.x, p.y, camera);

    if (s.x < -40 || s.x > w + 40 || s.y < -40 || s.y > h + 40) return;

    const isPlayer = p.owner === 'player';
    const radius = p.ammoType === 'grape' ? 5 : (p.isBroadside ? 8.5 : 7);
    const glow = (isPlayer && p.gun?.color) ? p.gun.color : (p.ammo?.glow || (isPlayer ? '#ffaa00' : '#ff4444'));
    const trailColor = (isPlayer && p.gun?.color) ? p.gun.color : (p.ammo?.trail || glow);

    // 1. MORTAR BALLISTICS (Height arc with ground shadow on water)
    if (p.isMortar) {
      // Ground shadow on water
      ctx.save();
      ctx.fillStyle = 'rgba(2, 10, 20, 0.55)';
      const shadowR = Math.max(3, radius * (1 - p.z / 90));
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, shadowR * 1.3, shadowR * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Flying mortar bomb (elevated by z)
      const ballY = s.y - p.z;
      const scale = 1 + p.z * 0.018;

      ctx.fillStyle = 'rgba(255, 60, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(s.x, ballY, radius * scale * 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#cc2200';
      ctx.beginPath();
      ctx.arc(s.x, ballY, radius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // 2. ARMOR-PIERCING LANCE / RAIL DART (Pierces multiple ships with shock trail)
    if (p.special === 'pierce' || p.pierceCount > 0) {
      // Motion trail
      if (p.trail && p.trail.length > 1) {
        ctx.save();
        for (let i = 1; i < p.trail.length; i++) {
          const a = this._worldToScreen(p.trail[i - 1].x, p.trail[i - 1].y, camera);
          const b = this._worldToScreen(p.trail[i].x, p.trail[i].y, camera);
          const alpha = (i / p.trail.length) * 0.85;
          ctx.strokeStyle = glow || '#38bdf8';
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 3.5 + alpha * 3;
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
      ctx.rotate(p.angle);

      // Supersonic glowing pierce needle
      const lanceLen = 26;
      const lanceGrad = ctx.createLinearGradient(-lanceLen, 0, lanceLen * 0.6, 0);
      lanceGrad.addColorStop(0, 'transparent');
      lanceGrad.addColorStop(0.4, glow || '#38bdf8');
      lanceGrad.addColorStop(0.85, '#ffffff');
      lanceGrad.addColorStop(1, '#ffffff');

      ctx.strokeStyle = lanceGrad;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-lanceLen, 0);
      ctx.lineTo(lanceLen * 0.6, 0);
      ctx.stroke();

      // Sharp white core needle
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-lanceLen * 0.5, 0);
      ctx.lineTo(lanceLen * 0.6 + 2, 0);
      ctx.stroke();

      // Piercing diamond shockwave
      const aura = ctx.createRadialGradient(lanceLen * 0.3, 0, 1, lanceLen * 0.3, 0, 18);
      aura.addColorStop(0, (glow || '#38bdf8') + 'dd');
      aura.addColorStop(0.6, (glow || '#38bdf8') + '44');
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(lanceLen * 0.3, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    // 3. STANDARD CANNONBALL / BROADSIDE / SHOTGUN
    // Motion trail
    if (p.trail && p.trail.length > 1) {
      ctx.save();
      for (let i = 1; i < p.trail.length; i++) {
        const a = this._worldToScreen(p.trail[i - 1].x, p.trail[i - 1].y, camera);
        const b = this._worldToScreen(p.trail[i].x, p.trail[i].y, camera);
        const alpha = (i / p.trail.length) * 0.7;
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
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 2.2);
    halo.addColorStop(0, glow + 'bb');
    halo.addColorStop(0.5, glow + '33');
    halo.addColorStop(1, 'transparent');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Metallic spherical body
    const ball = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
    ball.addColorStop(0, isPlayer ? '#777' : '#ff7777');
    ball.addColorStop(0.6, p.ammo?.color || '#222');
    ball.addColorStop(1, '#050505');
    ctx.fillStyle = ball;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Chain shot whirling ring
    if (p.ammoType === 'chain') {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawAllProjectiles(projectiles, camera) {
    for (const p of projectiles) {
      this.drawProjectile(p, camera);
    }
  }

  /** TOP-DOWN FLOATING LOOT & POWDER KEGS */
  drawLoot(lootDrops, camera) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const loot of lootDrops) {
      if (!loot.alive) continue;
      const s = this._worldToScreen(loot.x, loot.y, camera);
      if (s.x < -50 || s.x > w + 50 || s.y < -50 || s.y > h + 50) continue;

      const bobY = Math.sin(loot.bobPhase) * 3;
      const ly = s.y + bobY;

      ctx.save();

      // Water ripple beneath loot
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 4, 14, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (loot.type === 'gold') {
        // Treasure Chest
        const glow = ctx.createRadialGradient(s.x, ly, 2, s.x, ly, 24);
        glow.addColorStop(0, 'rgba(250, 204, 21, 0.8)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, ly, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#854d0e';
        ctx.fillRect(s.x - 10, ly - 8, 20, 16);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(s.x - 10, ly - 2, 20, 4);
        ctx.fillStyle = '#ca8a04';
        ctx.strokeRect(s.x - 10, ly - 8, 20, 16);
        ctx.font = 'bold 11px serif';
        ctx.textAlign = 'center';
        ctx.fillText('💰', s.x, ly - 11);

      } else if (loot.type === 'wood') {
        // Timber Planks (Hull & Sails Repair)
        ctx.fillStyle = '#78350f';
        ctx.fillRect(s.x - 12, ly - 6, 24, 5);
        ctx.fillRect(s.x - 10, ly, 20, 5);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.font = 'bold 11px serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#22c55e';
        ctx.fillText('⚓ REPAIR', s.x, ly - 10);

      } else if (loot.type === 'crew') {
        // Castaway Raft / Survivors (+Crew)
        const glow = ctx.createRadialGradient(s.x, ly, 2, s.x, ly, 24);
        glow.addColorStop(0, 'rgba(56, 189, 248, 0.75)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, ly, 24, 0, Math.PI * 2);
        ctx.fill();

        // Wooden Life Raft
        ctx.fillStyle = '#854d0e';
        ctx.beginPath();
        ctx.ellipse(s.x, ly, 13, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // White life ring on raft
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(s.x, ly, 4.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px serif';
        ctx.textAlign = 'center';
        ctx.fillText('🧑‍✈️ +CREW', s.x, ly - 11);

      } else if (loot.type === 'rum') {
        // Rum Cask (Frenzy)
        const glow = ctx.createRadialGradient(s.x, ly, 2, s.x, ly, 24);
        glow.addColorStop(0, 'rgba(192, 132, 252, 0.8)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, ly, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.arc(s.x, ly, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e9d5ff';
        ctx.font = 'bold 11px serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ RUM', s.x, ly - 12);

      } else if (loot.type === 'keg') {
        // Powder Keg (Explosive mine)
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(s.x, ly, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Burning spark fuse
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(s.x + 8, ly - 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px serif';
        ctx.textAlign = 'center';
        ctx.fillText('💣 KEG', s.x, ly - 14);
      }

      ctx.restore();
    }
  }

  /** TACTICAL NAUTICAL RADAR MINIMAP */
  drawMinimap(player, enemies, obstacles, lootDrops, wind) {
    const ctx = this.ctx;
    const mapSize = 130;
    const padding = 16;
    const cx = this.canvas.width - mapSize / 2 - padding;
    const cy = mapSize / 2 + padding + 60; // Below top HUD
    const radius = mapSize / 2;
    const scale = radius / (WORLD_SIZE * 0.5);

    ctx.save();

    // 1. Radar background & Brass bezel
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(6, 18, 36, 0.88)';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#c9a227';
    ctx.stroke();

    // Grid circles
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs & Cardinal N
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 9px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - radius + 11);

    // Wind indicator on compass rim and tactical HUD chip
    const windAngle = Math.atan2(wind.y, wind.x);
    const hasTailwind = player && player.alive && (player.windDot > 0.1);

    // 1. Aerodynamic wind vector arrow on the compass rim
    const arrowDist = radius - 10;
    const wx = cx + Math.cos(windAngle) * arrowDist;
    const wy = cy + Math.sin(windAngle) * arrowDist;

    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(windAngle);
    ctx.fillStyle = hasTailwind ? '#4ade80' : '#38bdf8';
    ctx.shadowColor = hasTailwind ? '#22c55e' : '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();

    // Streamer lines trailing behind the wind arrow
    ctx.strokeStyle = hasTailwind ? 'rgba(74, 222, 128, 0.7)' : 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -2); ctx.lineTo(-13, -2);
    ctx.moveTo(-5, 2); ctx.lineTo(-11, 2);
    ctx.stroke();
    ctx.restore();

    // 2. Tactical Wind Badge directly below the minimap
    const badgeW = 130;
    const badgeH = 22;
    const badgeX = cx - badgeW / 2;
    const badgeY = cy + radius + 8;

    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fillStyle = hasTailwind ? 'rgba(6, 36, 24, 0.94)' : 'rgba(6, 18, 36, 0.94)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = hasTailwind ? '#22c55e' : 'rgba(201, 162, 39, 0.55)';
    ctx.shadowColor = hasTailwind ? '#22c55e' : 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = hasTailwind ? 10 : 4;
    ctx.stroke();

    // Label: 💨 WIND
    ctx.font = 'bold 9px Cinzel, serif';
    ctx.fillStyle = hasTailwind ? '#86efac' : '#fde047';
    ctx.textAlign = 'left';
    ctx.fillText('💨 WIND', badgeX + 7, badgeY + 15);

    // Rotating Arrow in dial
    const dialX = badgeX + 57;
    const dialY = badgeY + badgeH / 2;
    ctx.save();
    ctx.translate(dialX, dialY);
    ctx.rotate(windAngle);
    ctx.fillStyle = hasTailwind ? '#4ade80' : '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -3.5);
    ctx.lineTo(-1.5, 0);
    ctx.lineTo(-4, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Tailwind Boost Indicator
    ctx.font = 'bold 8.5px Cinzel, serif';
    ctx.textAlign = 'right';
    if (hasTailwind) {
      ctx.fillStyle = '#4ade80';
      ctx.fillText('+25% BOOST', badgeX + badgeW - 6, badgeY + 15);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('STEER ➔ TAILWIND', badgeX + badgeW - 6, badgeY + 15);
    }
    ctx.restore();

    // 2. Obstacles / Islands
    for (const obs of obstacles) {
      const mx = cx + obs.x * scale;
      const my = cy + obs.y * scale;
      ctx.fillStyle = obs.type === 'reef' ? '#f97316' : '#22c55e';
      ctx.beginPath();
      ctx.arc(mx, my, Math.max(2, obs.radius * scale), 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Loot drops
    for (const loot of lootDrops) {
      if (!loot.alive) continue;
      const lx = cx + loot.x * scale;
      const ly = cy + loot.y * scale;
      ctx.fillStyle = loot.type === 'keg' ? '#ef4444' : loot.type === 'crew' ? '#38bdf8' : loot.type === 'wood' ? '#4ade80' : loot.type === 'rum' ? '#c084fc' : '#facc15';
      ctx.fillRect(lx - 2, ly - 2, 4, 4);
    }

    // 4. Enemy ships
    for (const e of enemies) {
      if (!e.alive) continue;
      const ex = cx + e.x * scale;
      const ey = cy + e.y * scale;
      ctx.fillStyle = e.isBoss ? '#ffd700' : (e.isMiniBoss ? '#f97316' : '#ef4444');
      ctx.beginPath();
      ctx.arc(ex, ey, e.isBoss ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Player ship arrow
    if (player.alive) {
      const px = cx + player.x * scale;
      const py = cy + player.y * scale;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(player.angle);
      ctx.fillStyle = hasTailwind ? '#4ade80' : '#22d3ee';
      if (hasTailwind) {
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 6;
      }
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-5, -4);
      ctx.lineTo(-2.5, 0);
      ctx.lineTo(-5, 4);
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
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
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
    const range = Math.min(player.gun?.range || 600, 550);
    const spread = 0.07 * (player.gun?.spreadMod || 1);

    ctx.save();

    // Aim cone
    ctx.fillStyle = 'rgba(255, 200, 50, 0.07)';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.arc(s.x, s.y, range, angle - spread, angle + spread);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 200, 50, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(angle) * range, s.y + Math.sin(angle) * range);
    ctx.stroke();
    ctx.setLineDash([]);

    // Skull crosshair
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2.5;
    const cs = 14;
    ctx.beginPath();
    ctx.moveTo(t.x - cs, t.y); ctx.lineTo(t.x - 4, t.y);
    ctx.moveTo(t.x + 4, t.y); ctx.lineTo(t.x + cs, t.y);
    ctx.moveTo(t.x, t.y - cs); ctx.lineTo(t.x, t.y - 4);
    ctx.moveTo(t.x, t.y + 4); ctx.lineTo(t.x, t.y + cs);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(t.x, t.y, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  /** BESPOKE ANIMATED WEAPON CURSORS */
  drawCustomCursor(targetX, targetY, camera, player, time = 0) {
    const ctx = this.ctx;
    const t = this._worldToScreen(targetX, targetY, camera);
    const style = player?.gun?.cursorStyle || 'swivel';
    const tm = time * 0.002;

    ctx.save();
    ctx.translate(t.x, t.y);

    if (style === 'sniper') {
      // High-tech Pirate Sniper Scope (Cyan Laser)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;

      // Rotating outer range ring
      ctx.beginPath();
      ctx.arc(0, 0, 22, tm, tm + Math.PI * 1.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Laser crosshairs with mil-dots
      ctx.beginPath();
      ctx.moveTo(-32, 0); ctx.lineTo(-4, 0);
      ctx.moveTo(4, 0); ctx.lineTo(32, 0);
      ctx.moveTo(0, -32); ctx.lineTo(0, -4);
      ctx.moveTo(0, 4); ctx.lineTo(0, 32);
      ctx.stroke();

      // Mil dots
      ctx.fillStyle = '#38bdf8';
      [-20, -10, 10, 20].forEach(d => {
        ctx.fillRect(d - 1, -1, 2, 2);
        ctx.fillRect(-1, d - 1, 2, 2);
      });

      // Center laser dot
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (style === 'naval') {
      // Heavy Bronze 12-Pounder Helm Reticle
      ctx.strokeStyle = '#cd7f32';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Helm spokes
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + tm * 0.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26);
        ctx.stroke();
      }

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (style === 'heavy') {
      // Smasher Shotgun Siege Spread Brackets
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.5;

      // 4 heavy quadrant brackets
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.arc(0, 0, 24, -0.3, 0.3);
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (style === 'mortar') {
      // Volcanic Magma Mortar Blast Ring
      const pulse = 22 + Math.sin(tm * 4) * 4;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fill();

      // Flame center
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (style === 'eldritch') {
      // Kraken Abyssal Rune Circle
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Spinning glyphs
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + tm * 1.2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 20, Math.sin(a) * 20, 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 6, tm, 0, Math.PI * 2);
      ctx.fill();

    } else if (style === 'storm') {
      // Poseidon Electric Lightning Reticle
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();

      // Lightning sparks
      ctx.beginPath();
      ctx.moveTo(-24, 0); ctx.lineTo(-12, 3); ctx.lineTo(-6, -2); ctx.lineTo(0, 0);
      ctx.moveTo(24, 0); ctx.lineTo(12, -3); ctx.lineTo(6, 2); ctx.lineTo(0, 0);
      ctx.moveTo(0, -24); ctx.lineTo(3, -12); ctx.lineTo(-2, -6); ctx.lineTo(0, 0);
      ctx.moveTo(0, 24); ctx.lineTo(-3, 12); ctx.lineTo(2, 6); ctx.lineTo(0, 0);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (style === 'infernal') {
      // Infernal Dread-Forge Demon Skull Crosshair
      const pulse = 24 + Math.sin(tm * 5) * 3;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fill();

      // Skull cross
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☠', 0, 0);

    } else {
      // Standard Iron Swivel Reticle
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-20, 0); ctx.lineTo(-6, 0);
      ctx.moveTo(6, 0); ctx.lineTo(20, 0);
      ctx.moveTo(0, -20); ctx.lineTo(0, -6);
      ctx.moveTo(0, 6); ctx.lineTo(0, 20);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
