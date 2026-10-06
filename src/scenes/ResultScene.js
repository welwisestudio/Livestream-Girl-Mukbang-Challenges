import { BaseScene } from './BaseScene.js';
import { getLevel, nextLevel } from '../content/levels.js';
import { DEPTH, clamp, computeLobbyRegions } from '../ui/layout.js';
import { RoomBackground } from '../ui/background.js';
import { Hud } from '../ui/hud.js';
import { PillButton } from '../ui/controls.js';
import { ModalPanel } from '../ui/panels.js';
import { addText } from '../ui/text.js';
import { roundedBox, heartPath } from '../ui/draw.js';
import { burstHearts, sparkle } from '../ui/actors.js';
import { appearanceTexture } from '../ui/appearanceTextures.js';
import { RewardOfferView } from '../ui/rewardOffer.js';
import { LEVEL_REWARD_OFFER } from '../content/economy.js';
import { COLORS, CSS } from '../content/theme.js';

export class ResultScene extends BaseScene {
  constructor() { super('Result'); }

  init(data) {
    this.level = getLevel(data.levelId);
    this.runId = data.runId;
    this.phase = 'level-up';
    this.offer = null;
    this.leaving = false;
    this.layoutPanel = null;
    this.panel = null;
    this.button = null;
    this.extra = [];
  }

  create() {
    const save = this.services().save.snapshot();
    this.room = new RoomBackground(this);
    this.room.setFrontVisible(false);
    this.hud = new Hud(this, { name: 'Player', level: save.highestLevel, coins: save.coins, xp: 0.9 });
    this.next = nextLevel(this.level.id);
    this.firstClear = !save.completedLevels[this.level.id];
    this.bindViewport();
    if (this.firstClear && this.next) this.showLevelUp(); else this.showReward();
    this.cameras.main.fadeIn(260, 255, 240, 245);
  }

  layout(f) {
    this.room.layout(f, f.top + f.h * 0.57);
    // The reward offer reuses the Lobby HUD composition from the reference.
    if (this.offer) this.hud.layoutLobby(f, computeLobbyRegions(f).hud, 0);
    else this.hud.layout(f);
    this.layoutPanel?.(f);
  }

  clearPanel() {
    this.panel?.destroy();
    this.button?.destroy();
    this.panel = null;
    this.button = null;
    this.layoutPanel = null;
    this.extra?.forEach((o) => o.destroy());
    this.extra = [];
  }

  panelWidth(f) {
    return Math.round(Math.min(f.colW - f.pad * 2, clamp(340 * f.ui, 300, 430)));
  }

  showLevelUp() {
    this.clearPanel();
    this.phase = 'level-up';
    const level = this.next.number;
    this.panel = new ModalPanel(this, 'New recipe!');
    const avatarRing = this.add.graphics();
    const avatar = this.add.image(0, 0, appearanceTexture(this, 'avatar', this.services().save.snapshot().appearance.equipped));
    const badge = this.add.graphics();
    const levelText = addText(this, 0, 0, `Level ${level}`, { size: 26, weight: '700', color: CSS.white, stroke: CSS.orangeDark, strokeWidth: 5 });
    const unlockText = addText(this, 0, 0, `${this.next.title} is available!`, { size: 19, weight: '700', color: CSS.pinkDark });
    const tiles = this.add.graphics();
    const icons = this.next.unlockPreview.map((key) => this.add.image(0, 0, key));
    this.panel.add([avatarRing, avatar, badge, levelText, unlockText, tiles, ...icons]);
    this.button = new PillButton(this, { label: 'Next', variant: 'primary', depth: DEPTH.modal + 2, onClick: () => this.showReward() });
    this.layoutPanel = (f) => {
      const w = this.panelWidth(f);
      const tile = Math.round(clamp((w - 70) / 3, 76, 112));
      const avatarD = Math.round(clamp(w * 0.42, 120, 170));
      const h = Math.round(avatarD + tile + clamp(240 * f.ui, 230, 290));
      const size = this.panel.layout(f, { width: w, height: h });
      let y = size.top + avatarD / 2;
      avatarRing.clear().fillStyle(COLORS.pinkSoft, 1).fillCircle(0, y, avatarD / 2).lineStyle(4, COLORS.pinkDark, 1).strokeCircle(0, y, avatarD / 2);
      avatar.setScale((avatarD - 14) / avatar.width).setPosition(0, y);
      y += avatarD / 2 + 4;
      levelText.setFontSize(Math.round(clamp(26 * f.ui, 24, 32)));
      const bw = levelText.width + 34;
      const bh = levelText.height + 6;
      badge.clear();
      roundedBox(badge, -bw / 2, y - bh / 2, bw, bh, { fill: COLORS.orange, stroke: COLORS.orangeDark, strokeWidth: 3 });
      levelText.setPosition(0, y);
      y += bh / 2 + 24;
      unlockText.setFontSize(Math.round(clamp(19 * f.ui, 18, 23))).setPosition(0, y);
      y += 20 + tile / 2;
      tiles.clear();
      icons.forEach((icon, i) => {
        const x = (i - 1) * (tile + 12);
        roundedBox(tiles, x - tile / 2, y - tile / 2, tile, tile, { fill: COLORS.paper, stroke: COLORS.pinkDark, strokeWidth: 3, radius: 18 });
        icon.setScale((tile * 0.74) / Math.max(icon.width, icon.height)).setPosition(x, y);
      });
      const btnY = this.panel.root.y + size.height / 2 - clamp(56 * f.ui, 52, 66);
      this.button.layout({ x: f.cx, y: btnY, frame: f, minWidth: 190, maxWidth: w - 40 });
    };
    this.layoutPanel(this.frame);
    this.panel.pop();
    sparkle(this, this.frame.cx, this.panel.root.y - 60, { count: 12, radius: 170 });
  }

  // Post-level reward offer (ClaimMoney.jpg). One completion → one claim, either:
  //   green button: base × multiplier under the pointer, locked at tap, paid only after
  //                 the rewarded ad reports `earned`;
  //   small button: base reward only, no ad.
  showReward() {
    if (this.phase !== 'level-up') return;
    this.clearPanel();
    this.phase = 'reward';
    this.hud.coin.setTexture('lobby-coins');
    this.hud.nameText.setText('User');
    this.baseReward = this.level.rewardCoins;
    this.lockedMultiplier = null;
    this.lastAdStatus = null;
    this.offer = new RewardOfferView(this, {
      level: this.level,
      baseReward: this.baseReward,
      multipliers: LEVEL_REWARD_OFFER.multipliers,
      sweepMs: LEVEL_REWARD_OFFER.pointerSweepMs,
      appearance: this.services().save.snapshot().appearance.equipped,
      onAdClaim: () => this.claimWithAd(),
      onBaseClaim: () => this.claimBase(),
    });
    this.hud.root.setDepth(DEPTH.modal + 6);
    this.layoutPanel = (f) => this.offer.layout(f);
    this.layout(this.frame);
  }

  update(time, delta) {
    if (this.offer && this.phase === 'reward') this.offer.update(delta);
  }

  claimArgs() {
    return {
      levelId: this.level.id,
      runId: this.runId,
      baseCoins: this.baseReward,
      unlockLevel: this.next?.number ?? this.level.number,
    };
  }

  async claimWithAd() {
    if (this.phase !== 'reward') return;
    // Freeze the pointer first: the multiplier under it is the one that will be paid.
    this.offer.lock();
    this.lockedMultiplier = this.offer.multiplier;
    this.phase = 'ad';
    this.offer.setEnabled(false);
    let result;
    try {
      result = await this.services().rewards.claimLevelWithAd({
        ...this.claimArgs(),
        multiplier: this.lockedMultiplier,
        placementId: LEVEL_REWARD_OFFER.placementId,
      });
    } catch (error) {
      console.error(error);
      result = { applied: false, status: 'save-error' };
    }
    this.lastAdStatus = result.status;
    if (result.applied) return this.finishClaim(result);
    if (result.status === 'already-claimed') return this.leave();
    // Nothing granted: stay here, let the player retry the ad or take the base reward.
    this.phase = 'reward';
    this.lockedMultiplier = null;
    this.offer.unlock();
    this.offer.setEnabled(true);
    const message = {
      'not-earned': 'Ad closed early — no bonus this time.',
      unavailable: 'No ad available right now.',
      'save-error': 'Could not save. Please try again.',
    }[result.status] ?? 'The ad did not finish.';
    this.offer.showNotice(`${message} Try again or take ${this.baseReward}.`);
  }

  async claimBase() {
    if (this.phase !== 'reward') return;
    this.phase = 'claiming';
    this.offer.setEnabled(false);
    try {
      const result = await this.services().rewards.claimLevelBase(this.claimArgs());
      if (result.applied) return this.finishClaim(result);
      if (result.status === 'already-claimed') return this.leave();
      this.phase = 'reward';
      this.offer.setEnabled(true);
    } catch (error) {
      // A failed save must not trap the player: keep both options available.
      console.error(error);
      this.phase = 'reward';
      this.offer.setEnabled(true);
      this.offer.showNotice('Could not save. Please try again.');
    }
  }

  finishClaim(result) {
    this.claimedCoins = result.coins;
    this.hud.setCoins(result.state.coins);
    this.hud.bumpCoins();
    this.phase = 'returning';
    this.flyCoins();
    this.time.delayedCall(750, () => this.fadeTo('Home'));
  }

  leave() {
    this.phase = 'returning';
    this.fadeTo('Home');
  }

  flyCoins() {
    const target = this.hud.coinPosition();
    const from = this.offer ? { x: this.frame.cx, y: this.offer.adButton.y } : this.button.center();
    for (let i = 0; i < 8; i += 1) {
      const c = this.add.image(from.x, from.y, 'coin').setDepth(DEPTH.banner).setScale(0.18);
      this.tweens.add({
        targets: c, x: target.x, y: target.y, scale: 0.12, delay: i * 45, duration: 520, ease: 'Sine.In',
        onComplete: () => c.destroy(),
      });
    }
  }

  getDebugSnapshot() {
    const targets = {};
    if (this.phase === 'level-up' && this.button) targets.next = this.button.center();
    if (this.phase === 'reward' && this.offer) Object.assign(targets, this.offer.centers());
    const offer = this.offer ? {
      baseReward: this.baseReward,
      multipliers: [...LEVEL_REWARD_OFFER.multipliers],
      pointer: this.offer.position,
      multiplierIndex: this.offer.multiplierIndex,
      multiplier: this.offer.multiplier,
      offerCoins: this.offer.offerCoins,
      lockedMultiplier: this.lockedMultiplier,
      lastAdStatus: this.lastAdStatus,
      claimedCoins: this.claimedCoins ?? null,
      hudCoins: Number(this.hud.coinText.text),
      rects: this.offer.rects(),
    } : null;
    return { scene: 'Result', phase: this.phase, levelId: this.level.id, runId: this.runId, targets, offer, save: this.services().save.snapshot() };
  }
}
