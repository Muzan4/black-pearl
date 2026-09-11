const LEADERBOARD_KEY = 'blackpearl_scores';

class UIManager {
  constructor() {
    this.elements = {
      hud: document.getElementById('hud'),
      score: document.getElementById('score-display'),
      wave: document.getElementById('wave-display'),
      combo: document.getElementById('combo-display'),
      level: document.getElementById('level-display'),
      coinDisplay: document.getElementById('coin-display'),
      hullBar: document.getElementById('hull-bar'),
      sailBar: document.getElementById('sail-bar'),
      crewBar: document.getElementById('crew-bar'),
      repairBar: document.getElementById('repair-bar'),
      gunName: document.getElementById('gun-name'),
      reloadBar: document.getElementById('reload-bar'),
      waveAnnounce: document.getElementById('wave-announce'),
      waveTitle: document.getElementById('wave-title'),
      waveSubtitle: document.getElementById('wave-subtitle'),
      unlockToast: document.getElementById('unlock-toast'),
      unlockText: document.getElementById('unlock-text'),
      mainMenu: document.getElementById('main-menu'),
      armoryModal: document.getElementById('armory-modal'),
      armoryGrid: document.getElementById('armory-grid'),
      armoryCoinsDisplay: document.getElementById('armory-coins-display'),
      gameoverModal: document.getElementById('gameover-modal'),
      pauseModal: document.getElementById('pause-modal'),
      touchControls: document.getElementById('touch-controls'),
      finalScore: document.getElementById('final-score'),
      finalWave: document.getElementById('final-wave'),
      finalKills: document.getElementById('final-kills'),
      finalCombo: document.getElementById('final-combo'),
      newHighscore: document.getElementById('new-highscore'),
      leaderboardList: document.getElementById('leaderboard-list'),
      homeLeaderboardList: document.getElementById('home-leaderboard-list'),
      homeCoinsDisplay: document.getElementById('home-coins-display'),
      summaryHull: document.getElementById('summary-hull'),
      summarySpeed: document.getElementById('summary-speed'),
      summaryCrew: document.getElementById('summary-crew'),
      shipUpgradesGrid: document.getElementById('ship-upgrades-grid'),
      fleetShipyardGrid: document.getElementById('fleet-shipyard-grid'),
      flagshipCrest: document.getElementById('flagship-crest'),
      flagshipTitleName: document.getElementById('flagship-title-name'),
      flagshipSubtitleDesc: document.getElementById('flagship-subtitle-desc'),
      crewManifestGrid: document.getElementById('crew-manifest-grid'),
      homeArmoryGrid: document.getElementById('home-armory-grid'),
      weaponAmmoSelector: document.getElementById('weapon-ammo-selector'),
      touchAmmoContainer: document.getElementById('touch-ammo-container'),
    };

    this._bindButtons();
    this._bindTabs();
  }

  _bindButtons() {
    const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);

    bind('start-btn', () => this.onStart?.());
    bind('retry-btn', () => this.onRetry?.());
    bind('menu-btn', () => this.onMenu?.());
    bind('armory-toggle-btn', () => this.onToggleArmory?.());
    bind('armory-close', () => this.hideArmory());
    bind('resume-btn', () => this.onResume?.());
    bind('pause-menu-btn', () => this.onMenu?.());
  }

  updateWeaponAmmoSelector(player) {
    if (!player) return;
    const modes = player.gun?.ammoModes || [];
    const container = this.elements.weaponAmmoSelector;
    const touchContainer = this.elements.touchAmmoContainer;

    if (container) {
      container.innerHTML = '';
      modes.forEach((mode, idx) => {
        const btn = document.createElement('button');
        btn.className = `ammo-btn ammo-mode-btn ${player.ammoModeIndex === idx ? 'active' : ''}`;
        btn.dataset.index = idx.toString();
        btn.title = `${mode.name} — ${mode.desc}`;
        btn.innerHTML = `
          <div class="ammo-top-row">
            <span class="ammo-icon">${mode.icon || '●'}</span>
            <span class="ammo-key">[${idx + 1}]</span>
          </div>
          <span class="ammo-name">${mode.shortName.replace(/\s*\[\d\]/, '')}</span>
          <span class="ammo-type-tag ${mode.badgeClass || ''}">${mode.typeTag || 'STANDARD'}</span>
        `;
        btn.addEventListener('click', () => {
          this.onAmmoSwitch?.(idx);
        });
        container.appendChild(btn);
      });
    }

    if (touchContainer) {
      touchContainer.innerHTML = '';
      modes.forEach((mode, idx) => {
        const btn = document.createElement('button');
        btn.className = `touch-ammo-btn ${player.ammoModeIndex === idx ? 'active' : ''}`;
        btn.dataset.index = idx.toString();
        btn.innerHTML = `${mode.icon || '●'}`;
        btn.title = mode.name;
        btn.addEventListener('click', () => {
          this.onAmmoSwitch?.(idx);
        });
        touchContainer.appendChild(btn);
      });
    }
  }

  highlightActiveAmmo(index) {
    const idxStr = index.toString();
    document.querySelectorAll('.ammo-mode-btn, .ammo-btn, .touch-ammo-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.index === idxStr);
    });
  }

  _bindTabs() {
    const tabs = document.querySelectorAll('.qd-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabKey = tab.dataset.tab;
        tabs.forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.qd-pane').forEach(p => {
          p.classList.toggle('active', p.id === `tab-pane-${tabKey}`);
        });
      });
    });
  }

  showMenu(player) {
    this.elements.mainMenu.classList.remove('hidden');
    this.elements.hud.classList.add('hidden');
    this.elements.touchControls.classList.add('hidden');
    this.hideAllModals();
    if (player) this.renderQuarterdeck(player);
  }

  hideMenu() {
    this.elements.mainMenu.classList.add('hidden');
    this.elements.hud.classList.remove('hidden');
    if ('ontouchstart' in window && window.innerWidth < 768) {
      this.elements.touchControls.classList.remove('hidden');
    }
  }

  hideAllModals() {
    this.elements.armoryModal?.classList.add('hidden');
    this.elements.gameoverModal.classList.add('hidden');
    this.elements.pauseModal.classList.add('hidden');
  }

  showArmory(player) {
    this.elements.armoryModal?.classList.remove('hidden');
    if (player) {
      this.elements.armoryCoinsDisplay.textContent = `🪙 ${formatScore(player.coins)}`;
      this.renderWeaponsGrid(this.elements.armoryGrid, player);
    }
  }

  hideArmory() {
    this.elements.armoryModal?.classList.add('hidden');
  }

  showPause() {
    this.elements.pauseModal.classList.remove('hidden');
  }

  hidePause() {
    this.elements.pauseModal.classList.add('hidden');
  }

  showGameOver(stats, isHighScore) {
    this.elements.finalScore.textContent = formatScore(stats.score);
    this.elements.finalWave.textContent = stats.wave;
    this.elements.finalKills.textContent = stats.kills;
    this.elements.finalCombo.textContent = `×${stats.maxCombo}`;
    this.elements.newHighscore.classList.toggle('hidden', !isHighScore);
    this.elements.gameoverModal.classList.remove('hidden');
    this.elements.hud.classList.add('hidden');
    this.elements.touchControls.classList.add('hidden');
  }

  announceWave(waveInfo) {
    this.elements.waveTitle.textContent = waveInfo.isBoss ? '⚔ BOSS INCOMING ⚔' : `WAVE ${waveInfo.wave}`;
    this.elements.waveSubtitle.textContent = waveInfo.subtitle;
    this.elements.level.textContent = waveInfo.level.name;
    this.elements.wave.textContent = waveInfo.wave;

    this.elements.waveAnnounce.classList.remove('hidden');
    setTimeout(() => this.elements.waveAnnounce.classList.add('hidden'), 3200);
  }

  showUnlock(gun) {
    this.elements.unlockText.textContent = `${gun.name} Available in Armory!`;
    this.elements.gunName.textContent = gun.name;
    this.elements.unlockToast.classList.remove('hidden');
    setTimeout(() => this.elements.unlockToast.classList.add('hidden'), 2500);
  }

  updateHUD(player, score, combo, comboIndex) {
    this.elements.score.textContent = formatScore(score);
    this.elements.combo.textContent = `×${COMBO_MULTIPLIERS[comboIndex] || 1}`;
    if (this.elements.coinDisplay) {
      this.elements.coinDisplay.textContent = `🪙 ${formatScore(player.coins)}`;
    }

    this.elements.hullBar.style.width = `${Math.max(0, (player.hull / player.maxHull) * 100)}%`;
    this.elements.sailBar.style.width = `${Math.max(0, (player.sail / player.maxSail) * 100)}%`;
    this.elements.crewBar.style.width = `${Math.max(0, (player.crew / player.maxCrew) * 100)}%`;

    const repairPct = player.repairing
      ? (1 - player.repairTimer / 2000) * 100
      : player.repairCooldown > 0
        ? (1 - player.repairCooldown / (player.repairCooldownMax || 8000)) * 100
        : 100;
    this.elements.repairBar.style.width = `${Math.max(0, repairPct)}%`;

    const reloadPct = player.reloadTimer > 0
      ? (1 - player.reloadTimer / player.reloadTime) * 100
      : 100;
    this.elements.reloadBar.style.width = `${reloadPct}%`;

    const activeMode = player.activeAmmoMode;
    this.elements.gunName.innerHTML = `${player.gun.name} <span class="hud-mode-pill">${activeMode?.name || ''}</span>`;
  }

  renderQuarterdeck(player) {
    // 1. Header flagship details & summary chips
    const ship = player.shipDef;
    if (this.elements.flagshipCrest) {
      this.elements.flagshipCrest.textContent = ship.icon || '⚓';
    }
    if (this.elements.flagshipTitleName) {
      this.elements.flagshipTitleName.textContent = ship.name.toUpperCase();
    }
    if (this.elements.flagshipSubtitleDesc) {
      this.elements.flagshipSubtitleDesc.textContent = `${ship.title} · Quarterdeck Command Center`;
    }

    if (this.elements.homeCoinsDisplay) {
      this.elements.homeCoinsDisplay.textContent = `🪙 ${formatScore(player.coins)}`;
    }
    if (this.elements.summaryHull) {
      this.elements.summaryHull.textContent = `${player.maxHull} HP`;
    }
    if (this.elements.summarySpeed) {
      this.elements.summarySpeed.textContent = `${player.effectiveSpeed.toFixed(1)} kts`;
    }
    if (this.elements.summaryCrew) {
      this.elements.summaryCrew.textContent = `${player.maxCrew} / ${player.maxCrew}`;
    }

    // Refresh active weapon ammo mode selector
    this.updateWeaponAmmoSelector(player);

    // 2. Render Fleet Shipyard Grid
    this.renderFleetShipyard(player);

    // 3. Render Ship Keel Upgrades Grid
    this.renderShipUpgrades(player);

    // 4. Render Crew Manifest Grid
    this.renderCrewManifest(player);

    // 5. Render Weapons Armory
    if (this.elements.homeArmoryGrid) {
      this.renderWeaponsGrid(this.elements.homeArmoryGrid, player);
    }

    // 6. Render Leaderboard in menu
    this.renderHomeLeaderboard();
  }

  renderFleetShipyard(player) {
    const grid = this.elements.fleetShipyardGrid;
    if (!grid) return;
    grid.innerHTML = '';

    PLAYABLE_SHIPS.forEach(ship => {
      const isOwned = player.ownedShips.includes(ship.id);
      const isEquipped = player.currentShipId === ship.id;
      const canAfford = player.coins >= ship.price && !isOwned;

      const card = document.createElement('div');
      card.className = `ship-card ${isEquipped ? 'equipped' : ''} ${isOwned ? 'owned' : ''}`;
      card.innerHTML = `
        <div class="ship-card-header">
          <div class="ship-emblem-badge" style="border-color: ${ship.trimColor};">
            <span class="ship-icon">${ship.icon || '🚢'}</span>
            <span class="masts-count">${ship.masts} Mast${ship.masts > 1 ? 's' : ''}</span>
          </div>
          <div class="ship-identity">
            <h3 class="ship-name">${ship.name}</h3>
            <span class="ship-title">${ship.title}</span>
          </div>
          <div class="ship-tag-box">
            ${isEquipped
              ? '<span class="ship-badge equipped">ACTIVE FLAGSHIP</span>'
              : isOwned
                ? '<span class="ship-badge owned">IN FLEET</span>'
                : `<span class="ship-badge price">🪙 ${formatScore(ship.price)}</span>`}
          </div>
        </div>

        <p class="ship-desc">${ship.desc}</p>

        <div class="ship-stats-grid">
          <div class="ship-stat-col">
            <span class="stat-lbl">HULL</span>
            <span class="stat-val">${ship.hull} HP</span>
          </div>
          <div class="ship-stat-col">
            <span class="stat-lbl">SPEED</span>
            <span class="stat-val">${ship.speed.toFixed(1)} kts</span>
          </div>
          <div class="ship-stat-col">
            <span class="stat-lbl">CREW</span>
            <span class="stat-val">${ship.crew}</span>
          </div>
          <div class="ship-stat-col">
            <span class="stat-lbl">BROADSIDE</span>
            <span class="stat-val">${ship.broadsideBonus > 0 ? `+${ship.broadsideBonus} Gun${ship.broadsideBonus > 1 ? 's' : ''}` : 'Standard'}</span>
          </div>
        </div>

        <div class="ship-perk-box">
          <span class="perk-lbl">SPECIAL:</span>
          <span class="perk-val">${ship.special}</span>
        </div>

        <div class="ship-action-box">
          ${isEquipped
            ? `<button class="menu-btn ship-action-btn equipped-btn" disabled>COMMISSIONED FLAGSHIP</button>`
            : isOwned
              ? `<button class="menu-btn ship-action-btn equip-btn" data-ship="${ship.id}">COMMISSION FLAGSHIP</button>`
              : `<button class="menu-btn ship-action-btn ${canAfford ? 'primary' : ''}" data-ship="${ship.id}" ${canAfford ? '' : 'disabled'}>BUY SHIP · 🪙 ${formatScore(ship.price)}</button>`
          }
        </div>
      `;

      card.querySelector('.equip-btn')?.addEventListener('click', () => {
        if (player.equipShip(ship.id)) {
          this.renderQuarterdeck(player);
          if (window.game?.audio) window.game.audio.play('hit');
        }
      });

      card.querySelector('button[data-ship]:not(.equip-btn)')?.addEventListener('click', () => {
        if (player.buyShip(ship.id)) {
          this.renderQuarterdeck(player);
          if (window.game?.audio) window.game.audio.play('unlock');
        }
      });

      grid.appendChild(card);
    });
  }

  renderShipUpgrades(player) {
    const grid = this.elements.shipUpgradesGrid;
    if (!grid) return;
    grid.innerHTML = '';

    SHIP_UPGRADES_DEF.forEach(u => {
      const lvl = player.getShipUpgradeLevel(u.id);
      const isMax = lvl >= u.maxLevel;
      const price = player.getShipUpgradePrice(u.id);
      const canAfford = player.coins >= price && !isMax;

      const card = document.createElement('div');
      card.className = `upgrade-card ${isMax ? 'maxed' : ''}`;
      card.innerHTML = `
        <div class="upgrade-card-header">
          <div class="upgrade-icon">${u.icon}</div>
          <div class="upgrade-identity">
            <div class="upgrade-name-row">
              <h3 class="upgrade-name">${u.name}</h3>
              <span class="level-badge ${isMax ? 'maxed' : ''}">${isMax ? 'MAX KEEL' : `TIER ${lvl}/${u.maxLevel}`}</span>
            </div>
            <div class="upgrade-stat-perk">${u.statPerLevel}</div>
          </div>
        </div>

        <div class="upgrade-card-body">
          <p class="upgrade-desc">${u.desc}</p>
          <div class="upgrade-progress-row">
            <span class="progress-label">REINFORCEMENT TIER:</span>
            <div class="tier-pips">
              ${Array.from({ length: u.maxLevel }, (_, i) => `<div class="pip ${i < lvl ? 'active' : ''}"></div>`).join('')}
            </div>
          </div>
        </div>

        <div class="upgrade-action-box">
          <button class="menu-btn upgrade-btn ${canAfford ? 'primary' : ''}" ${isMax || !canAfford ? 'disabled' : ''}>
            ${isMax ? 'FULL KEEL REINFORCED' : `UPGRADE KEEL · 🪙 ${formatScore(price)}`}
          </button>
        </div>
      `;

      card.querySelector('.upgrade-btn')?.addEventListener('click', () => {
        if (player.buyShipUpgrade(u.id)) {
          this.renderQuarterdeck(player);
          if (window.game?.audio) window.game.audio.play('unlock');
        }
      });

      grid.appendChild(card);
    });
  }

  renderCrewManifest(player) {
    const grid = this.elements.crewManifestGrid;
    if (!grid) return;
    grid.innerHTML = '';

    CREW_OFFICERS_DEF.forEach(c => {
      const lvl = player.getCrewOfficerLevel(c.id);
      const isMax = lvl >= c.maxLevel;
      const price = player.getCrewOfficerPrice(c.id);
      const canAfford = player.coins >= price && !isMax;

      const card = document.createElement('div');
      card.className = `crew-card ${isMax ? 'maxed' : ''}`;
      card.innerHTML = `
        <div class="crew-card-header">
          <div class="crew-avatar-frame">
            <div class="crew-avatar">${c.avatar}</div>
            <div class="crew-rank-pip">${isMax ? '👑 MAX' : `★ RANK ${lvl}`}</div>
          </div>
          <div class="crew-identity">
            <h3 class="crew-name">${c.name}</h3>
            <div class="crew-meta-row">
              <span class="crew-role-badge">${c.icon} ${c.role}</span>
              <div class="crew-traits">
                ${c.traits.map(t => `<span class="trait-tag">${t}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="crew-card-body">
          <p class="crew-desc">${c.desc}</p>
          <div class="crew-perk-box">
            <div class="perk-header">
              <span class="perk-label">OFFICER PERK</span>
              <span class="perk-status ${lvl > 0 ? 'active' : ''}">${lvl > 0 ? (isMax ? 'MAX POWER' : `TIER ${lvl}`) : 'NOT COMMISSIONED'}</span>
            </div>
            <div class="perk-text">${c.perk}</div>
          </div>
          <div class="crew-progress-row">
            <span class="progress-label">OFFICER MASTERY:</span>
            <div class="tier-pips">
              ${Array.from({ length: c.maxLevel }, (_, i) => `<div class="pip ${i < lvl ? 'active' : ''}"></div>`).join('')}
            </div>
          </div>
        </div>

        <div class="crew-action-box">
          <button class="menu-btn crew-promote-btn ${canAfford ? 'primary' : ''}" ${isMax || !canAfford ? 'disabled' : ''}>
            ${isMax ? '★ LEGENDARY OFFICER' : `PROMOTE OFFICER · 🪙 ${formatScore(price)}`}
          </button>
        </div>
      `;

      card.querySelector('.crew-promote-btn')?.addEventListener('click', () => {
        if (player.promoteCrewOfficer(c.id)) {
          this.renderQuarterdeck(player);
          if (window.game?.audio) window.game.audio.play('unlock');
        }
      });

      grid.appendChild(card);
    });
  }

  renderWeaponsGrid(container, player) {
    if (!container) return;
    container.innerHTML = '';

    GUNS.forEach(g => {
      const isOwned = player.ownedGuns.includes(g.id);
      const isEquipped = player.gunIndex === g.id;
      const canAfford = player.coins >= g.price && !isOwned;

      const card = document.createElement('div');
      card.className = `weapon-card ${isEquipped ? 'equipped' : ''} ${isOwned ? 'owned' : ''}`;
      card.innerHTML = `
        <div class="weapon-header">
          <span class="weapon-icon" style="color:${g.color};">${g.icon}</span>
          <div class="weapon-title-group">
            <h3 class="weapon-title">${g.name}</h3>
            <span class="cursor-tag">RETICLE: ${g.cursorStyle.toUpperCase()}</span>
          </div>
        </div>
        <p class="weapon-desc">${g.desc}</p>
        <div class="weapon-stats-grid">
          <div class="stat-col"><span class="lbl">DAMAGE</span><span class="val">×${g.damage.toFixed(1)}</span></div>
          <div class="stat-col"><span class="lbl">RELOAD</span><span class="val">${g.reload}ms</span></div>
          <div class="stat-col"><span class="lbl">RANGE</span><span class="val">${g.range}</span></div>
          <div class="stat-col"><span class="lbl">VOLLEY</span><span class="val">${g.volley} balls</span></div>
        </div>
        <div class="weapon-modes-preview">
          <span class="modes-label">MODES:</span>
          ${g.ammoModes?.map(m => `<span class="mode-chip ${m.badgeClass || ''}">${m.icon} ${m.name}</span>`).join('') || ''}
        </div>
        <div class="weapon-footer">
          <button class="menu-btn weapon-action-btn ${isEquipped ? 'equipped-btn' : (isOwned ? 'equip-btn' : (canAfford ? 'primary' : ''))}" ${isEquipped ? 'disabled' : (!isOwned && !canAfford ? 'disabled' : '')}>
            ${isEquipped ? '✓ EQUIPPED' : (isOwned ? 'EQUIP' : `BUY FOR 🪙 ${formatScore(g.price)}`)}
          </button>
        </div>
      `;

      card.querySelector('.weapon-action-btn')?.addEventListener('click', () => {
        if (!isOwned) {
          if (player.buyGun(g.id)) {
            this.renderQuarterdeck(player);
            this.updateWeaponAmmoSelector(player);
            if (this.elements.armoryGrid) this.renderWeaponsGrid(this.elements.armoryGrid, player);
            if (window.game?.audio) window.game.audio.play('unlock');
          }
        } else {
          player.equipGun(g.id);
          this.renderQuarterdeck(player);
          this.updateWeaponAmmoSelector(player);
          if (this.elements.armoryGrid) this.renderWeaponsGrid(this.elements.armoryGrid, player);
          if (window.game?.audio) window.game.audio.play('ui');
        }
      });

      container.appendChild(card);
    });
  }

  getLeaderboard() {
    try {
      return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
    } catch {
      return [];
    }
  }

  saveScore(entry) {
    const board = this.getLeaderboard();
    board.push(entry);
    board.sort((a, b) => b.score - a.score);
    const trimmed = board.slice(0, 10);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
    return trimmed[0]?.score === entry.score && trimmed.indexOf(entry) === 0;
  }

  renderHomeLeaderboard() {
    const list = this.elements.homeLeaderboardList;
    if (!list) return;
    const board = this.getLeaderboard();
    list.innerHTML = board.length === 0
      ? '<li style="justify-content:center;color:#888;">No voyages recorded yet — set sail and forge your legend!</li>'
      : board.map((e, i) =>
          `<li><span>#${i + 1} Wave ${e.wave} · ${e.kills} ships sunk</span><span>${formatScore(e.score)} PTS</span></li>`
        ).join('');
  }
}
