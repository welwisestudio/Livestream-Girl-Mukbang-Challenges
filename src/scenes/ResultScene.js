import { BaseScene } from './BaseScene.js';
import { getLevel, nextLevel } from '../content/levels.js';
import { DEPTH, clamp } from '../ui/layout.js';
import { RoomBackground } from '../ui/background.js';
import { Hud } from '../ui/hud.js';
import { PillButton } from '../ui/controls.js';
import { ModalPanel } from '../ui/panels.js';
import { addText } from '../ui/text.js';
import { roundedBox, heartPath } from '../ui/draw.js';
import { burstHearts, sparkle } from '../ui/actors.js';
import { COLORS, CSS } from '../content/theme.js';

export class ResultScene extends BaseScene {
  constructor() { super('Result'); }

  init(data) {
    this.level = getLevel(data.levelId);
    this.runId = data.runId;
    this.phase = 'level-up';
    this.claiming = false;
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
    this.hud.layout(f);
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
    const avatar = this.add.image(0, 0, 'avatar');
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

  showReward() {
    if (this.phase === 'reward' || this.phase === 'returning') return;
    this.clearPanel();
    this.phase = 'reward';
    const reward = this.level.rewardCoins;
    this.panel = new ModalPanel(this, 'Complete!!');
    const photo = this.add.graphics();
    const pic = this.add.image(0, 0, 'character-happy');
    const dishL = this.add.image(0, 0, this.level.finalTexture);
    const dishR = this.add.image(0, 0, this.level.finalTexture);
    const stats = this.add.graphics();
    const likes = addText(this, 0, 0, '75.2K', { size: 17, weight: '700', color: CSS.ink, originX: 0 });
    const chats = addText(this, 0, 0, '7.1K', { size: 17, weight: '700', color: CSS.ink, originX: 0 });
    const rewardBox = this.add.graphics();
    const coin = this.add.image(0, 0, 'coin');
    const amount = addText(this, 0, 0, `+${reward}`, { size: 38, weight: '700', color: '#ffb238', stroke: CSS.orangeDark, strokeWidth: 6, originX: 0 });
    this.panel.add([photo, pic, dishL, dishR, stats, likes, chats, rewardBox, coin, amount]);
    this.button = new PillButton(this, { label: `Claim ${reward}`, variant: 'green', depth: DEPTH.modal + 2, onClick: () => this.claimReward() });
    this.layoutPanel = (f) => {
      const w = this.panelWidth(f);
      const photoW = Math.round(w * 0.74);
      const photoH = Math.round(photoW * 0.92);
      const h = Math.round(photoH + clamp(260 * f.ui, 250, 320));
      const size = this.panel.layout(f, { width: w, height: h });
      let y = size.top + photoH / 2;
      photo.clear();
      roundedBox(photo, -photoW / 2 - 8, y - photoH / 2 - 8, photoW + 16, photoH + 44, { fill: 0xffffff, stroke: 0xe6d5dd, strokeWidth: 2, radius: 10 });
      photo.fillStyle(0xd8ecff, 1).fillRect(-photoW / 2, y - photoH / 2, photoW, photoH);
      photo.fillStyle(0xfff0d6, 1).fillRect(-photoW / 2, y + photoH * 0.18, photoW, photoH * 0.32);
      pic.setScale((photoH * 0.78) / pic.height).setOrigin(0.5, 1).setPosition(0, y + photoH * 0.3);
      dishL.setScale((photoW * 0.34) / dishL.width).setPosition(-photoW * 0.3, y + photoH * 0.34);
      dishR.setScale((photoW * 0.34) / dishR.width).setPosition(photoW * 0.3, y + photoH * 0.34);
      const sy = y + photoH / 2 + 18;
      stats.clear();
      heartPath(stats, -photoW / 2 + 14, sy, 18, COLORS.rose);
      stats.fillStyle(COLORS.lavender, 1).fillCircle(8, sy, 9);
      likes.setFontSize(Math.round(clamp(16 * f.ui, 15, 19))).setPosition(-photoW / 2 + 28, sy);
      chats.setFontSize(Math.round(clamp(16 * f.ui, 15, 19))).setPosition(22, sy);
      y = sy + 26 + clamp(34 * f.ui, 32, 42);
      const amountSize = Math.round(clamp(38 * f.ui, 34, 46));
      amount.setFontSize(amountSize);
      const coinD = amountSize * 1.3;
      const rw = coinD + amount.width + 44;
      const rh = coinD + 10;
      rewardBox.clear();
      roundedBox(rewardBox, -rw / 2, y - rh / 2, rw, rh, { fill: COLORS.cream, stroke: COLORS.orange, strokeWidth: 3 });
      coin.setScale(coinD / coin.width).setPosition(-rw / 2 + 12 + coinD / 2, y);
      amount.setPosition(-rw / 2 + 20 + coinD, y);
      const btnY = this.panel.root.y + size.height / 2 - clamp(56 * f.ui, 52, 66);
      this.button.layout({ x: f.cx, y: btnY, frame: f, minWidth: 210, maxWidth: w - 40 });
    };
    this.layoutPanel(this.frame);
    this.panel.pop();
    burstHearts(this, this.frame.cx, this.panel.root.y - 40, { count: 8, size: 26 });
  }

  async claimReward() {
    if (this.claiming || this.phase !== 'reward') return;
    this.claiming = true;
    this.button.setEnabled(false);
    try {
      const result = await this.services().rewards.grantLevelCompletion({
        levelId: this.level.id,
        runId: this.runId,
        coins: this.level.rewardCoins,
        unlockLevel: this.next?.number ?? this.level.number,
      });
      this.hud.setCoins(result.state.coins);
      this.hud.bumpCoins();
      this.phase = 'returning';
      this.flyCoins();
      this.time.delayedCall(750, () => this.fadeTo('Home'));
    } catch (error) {
      // A failed save must not trap the player: re-enable Claim so they can retry.
      console.error(error);
      this.claiming = false;
      this.button.setEnabled(true, { variant: 'green' });
      this.button.setLabel('Retry claim');
    }
  }

  flyCoins() {
    const target = this.hud.coinPosition();
    const from = this.button.center();
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
    if (this.button && !this.claiming) {
      if (this.phase === 'level-up') targets.next = this.button.center();
      if (this.phase === 'reward') targets.claim = this.button.center();
    }
    return { scene: 'Result', phase: this.phase, targets, save: this.services().save.snapshot() };
  }
}
