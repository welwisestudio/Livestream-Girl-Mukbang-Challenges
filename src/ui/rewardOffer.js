import { DEPTH, clamp, computeLobbyRegions } from './layout.js';
import { addText } from './text.js';
import { roundedBox, heartPath } from './draw.js';
import { appearanceTexture } from './appearanceTextures.js';
import { APPEARANCE_ITEM_BY_ID, DEFAULT_EQUIPPED_APPEARANCE } from '../content/appearance.js';
import { pointerPosition, segmentAt } from '../content/economy.js';

// Segment boundaries of the generated `reward-bar` art, as fractions of its trimmed width
// (measured on the Background Remover cutout). The pointer's position is read against the
// same stops, so the multiplier the logic selects is always the one drawn under it.
const BAR_STOPS = Object.freeze([0, 0.207, 0.398, 0.603, 0.794, 1]);
const LABEL_STROKES = Object.freeze(['#3f8f2a', '#d39a1c', '#c9611a', '#d39a1c', '#3f8f2a']);

function equalStops(count) {
  return Array.from({ length: count + 1 }, (_, i) => i / count);
}

function formatCount(n) {
  return String(Math.min(9999, Math.round(n)));
}

// Post-level reward offer, composed after ClaimMoney.jpg: stacked photo card, multiplier
// bar with an endlessly moving pointer, a large rewarded-ad claim button and a small
// base-reward button. Purely presentational: it reports taps, the scene decides rewards.
export class RewardOfferView {
  constructor(scene, { level, baseReward, multipliers, sweepMs, appearance, onAdClaim, onBaseClaim }) {
    this.scene = scene;
    this.baseReward = baseReward;
    this.multipliers = multipliers;
    this.sweepMs = sweepMs;
    this.stops = multipliers.length === BAR_STOPS.length - 1 ? BAR_STOPS : equalStops(multipliers.length);
    this.clock = 0;
    this.locked = false;
    this.enabled = true;
    this.position = 0;

    const d = DEPTH.modal;
    this.backdrop = scene.add.graphics().setDepth(d - 2);
    // Photo stack.
    this.sheets = [scene.add.graphics().setDepth(d), scene.add.graphics().setDepth(d)];
    this.cardFrame = scene.add.graphics().setDepth(d + 1);
    // Default room/table use the Lobby's reference textures, like the Lobby itself.
    this.defaultWall = appearance.background === DEFAULT_EQUIPPED_APPEARANCE.background;
    this.defaultTable = appearance.tablecloth === DEFAULT_EQUIPPED_APPEARANCE.tablecloth;
    const bg = this.defaultWall ? 'lobby-wallpaper' : APPEARANCE_ITEM_BY_ID[appearance.background].texture;
    const cloth = this.defaultTable ? 'lobby-tablecloth' : APPEARANCE_ITEM_BY_ID[appearance.tablecloth].texture;
    this.wall = scene.add.tileSprite(0, 0, 16, 16, bg).setOrigin(0).setDepth(d + 2);
    this.heroine = scene.add.image(0, 0, appearanceTexture(scene, 'character-happy', appearance)).setOrigin(0.5, 1).setDepth(d + 3);
    this.mascot = scene.add.image(0, 0, 'sprout-mascot').setOrigin(0.5, 1).setDepth(d + 3);
    this.table = scene.add.tileSprite(0, 0, 16, 16, cloth).setOrigin(0).setDepth(d + 4);
    this.tableEdge = scene.add.graphics().setDepth(d + 4);
    this.dish = scene.add.image(0, 0, level.finalTexture).setDepth(d + 5);
    this.stats = scene.add.graphics().setDepth(d + 2);
    this.chats = addText(scene, 0, 0, formatCount(4200 + level.number * 1137), { size: 18, weight: '700', color: '#b7a3d6', originX: 0 }).setDepth(d + 2);
    this.likes = addText(scene, 0, 0, formatCount(5600 + level.number * 879), { size: 18, weight: '700', color: '#f0566a', originX: 0 }).setDepth(d + 2);

    // Multiplier bar + pointer.
    this.bar = scene.add.image(0, 0, 'reward-bar').setDepth(d + 1);
    this.labels = multipliers.map((m, i) => addText(scene, 0, 0, `x${m}`, {
      size: 24, weight: '700', color: '#ffffff', stroke: LABEL_STROKES[i % LABEL_STROKES.length], strokeWidth: 5,
    }).setDepth(d + 2));
    this.pointer = scene.add.image(0, 0, 'reward-pointer').setOrigin(0.5, 0).setDepth(d + 3);

    // Rewarded-ad button: base × current multiplier, with the video badge.
    this.adButton = scene.add.container(0, 0).setDepth(d + 3);
    this.adSkin = scene.add.image(0, 0, 'reward-button');
    this.adCoin = scene.add.image(0, 0, 'coin');
    this.adAmount = addText(scene, 0, 0, '0', { size: 34, weight: '700', color: '#ffffff', stroke: '#3f8f2a', strokeWidth: 6, originX: 0 });
    this.adBadge = scene.add.image(0, 0, 'reward-play');
    this.adButton.add([this.adSkin, this.adCoin, this.adAmount, this.adBadge]);
    this.adZone = scene.add.zone(0, 0, 10, 10).setDepth(d + 4).setInteractive({ useHandCursor: true });
    this.adZone.on('pointerdown', () => this.press(this.adButton));
    this.adZone.on('pointerout', () => this.release(this.adButton));
    this.adZone.on('pointerup', () => { this.release(this.adButton); if (this.enabled) onAdClaim(); });

    // Base-reward button: no ad, multiplier ignored.
    this.baseButton = scene.add.container(0, 0).setDepth(d + 3);
    this.baseSkin = scene.add.image(0, 0, 'reward-pill');
    this.baseCoin = scene.add.image(0, 0, 'coin');
    this.baseAmount = addText(scene, 0, 0, String(baseReward), { size: 22, weight: '700', color: '#b98a3e', originX: 0 });
    this.baseButton.add([this.baseSkin, this.baseCoin, this.baseAmount]);
    this.baseZone = scene.add.zone(0, 0, 10, 10).setDepth(d + 4).setInteractive({ useHandCursor: true });
    this.baseZone.on('pointerdown', () => this.press(this.baseButton));
    this.baseZone.on('pointerout', () => this.release(this.baseButton));
    this.baseZone.on('pointerup', () => { this.release(this.baseButton); if (this.enabled) onBaseClaim(); });

    // Short feedback line (ad cancelled / unavailable).
    this.noticeBox = scene.add.graphics().setDepth(d + 5).setVisible(false);
    this.notice = addText(scene, 0, 0, '', { size: 16, weight: '600', color: '#6b4a5f', wrap: 300 }).setDepth(d + 6).setVisible(false);

    this.objects = [this.backdrop, ...this.sheets, this.cardFrame, this.wall, this.heroine, this.mascot, this.table, this.tableEdge,
      this.dish, this.stats, this.chats, this.likes, this.bar, ...this.labels, this.pointer, this.adButton, this.adZone,
      this.baseButton, this.baseZone, this.noticeBox, this.notice];
    this.update(0);
  }

  press(button) { if (this.enabled) this.scene.tweens.add({ targets: button, scale: 0.95, duration: 70 }); }
  release(button) { this.scene.tweens.add({ targets: button, scale: 1, duration: 90 }); }

  get multiplierIndex() { return segmentAt(this.position, this.stops); }
  get multiplier() { return this.multipliers[this.multiplierIndex]; }
  get offerCoins() { return this.baseReward * this.multiplier; }

  // Advances the pointer. While locked (ad showing) it does not move, so the multiplier
  // chosen at the tap can never change.
  update(deltaMs) {
    if (!this.locked) this.clock += deltaMs;
    this.position = pointerPosition(this.clock, this.sweepMs);
    const index = this.multiplierIndex;
    if (index !== this.shownIndex) {
      this.shownIndex = index;
      this.adAmount.setText(String(this.offerCoins));
      this.labels.forEach((label, i) => label.setScale(i === index ? 1.18 : 1));
      if (this.frame) this.layoutAdButton();
    }
    if (this.barBox) this.pointer.setX(this.barBox.x + this.position * this.barBox.w);
  }

  lock() { this.locked = true; }
  unlock() { this.locked = false; }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.adButton.setAlpha(enabled ? 1 : 0.6);
    this.baseButton.setAlpha(enabled ? 1 : 0.6);
  }

  showNotice(message) {
    this.notice.setText(message).setVisible(true);
    this.noticeBox.setVisible(true);
    this.layoutNotice();
    this.scene.time.removeEvent(this.noticeTimer);
    this.noticeTimer = this.scene.time.delayedCall(3200, () => { this.notice.setVisible(false); this.noticeBox.setVisible(false); });
  }

  layout(f) {
    this.frame = f;
    const W = f.colW;
    const cx = f.cx;
    this.backdrop.clear().fillGradientStyle(0xf0b8e8, 0xc9eedf, 0xb4efd6, 0xf8f0c4, 1).fillRect(f.left, f.top - 2, f.w, f.h + 4);

    // Vertical budget (reference proportions): card, gap, bar, pointer, big button, small
    // button. The card shrinks first; the whole block is centred under the HUD.
    const hudBottom = computeLobbyRegions(f).hud.y + computeLobbyRegions(f).hud.h;
    const barAspect = this.bar.width / this.bar.height;
    const barW = Math.round(Math.min(W * 0.84, 520));
    const barH = barW / barAspect;
    const btnH = clamp(W * 0.17, 60, 84);
    const pillH = clamp(W * 0.085, 34, 44);
    const cardGap = clamp(f.h * 0.07, 26, 64);
    const below = cardGap + barH + barH * 0.62 + 4 + btnH + 18 + pillH;
    const space = f.bottom - hudBottom - clamp(f.h * 0.04, 14, 36);
    const cardMaxH = space - below - clamp(f.h * 0.06, 20, 60);
    const cardW = Math.round(Math.min(W * 0.76, cardMaxH / 1.04, 460));
    const pad = Math.round(cardW * 0.045);
    const photoW = cardW - pad * 2;
    const photoH = Math.round(photoW * 0.9);
    const cardH = photoH + pad + Math.round(cardW * 0.13);
    const cardX = cx - cardW / 2;
    const cardY = Math.round(hudBottom + Math.max(clamp(f.h * 0.03, 12, 30), (space - cardH - below) * 0.45));

    // Stacked sheets behind the front card (rotated paper, as in the reference).
    const sheet = (g, angle, dx, dy, color) => {
      g.clear().setPosition(cx + dx, cardY + cardH / 2 + dy).setAngle(angle);
      g.fillStyle(0x7d9a83, 0.18).fillRect(-cardW / 2 + 3, -cardH / 2 + 5, cardW, cardH);
      g.fillStyle(color, 1).fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
      g.lineStyle(2, 0xd6e2d8, 1).strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);
    };
    sheet(this.sheets[0], 3.2, cardW * 0.035, cardH * 0.02, 0xdfe9df);
    sheet(this.sheets[1], -2.4, -cardW * 0.02, cardH * 0.01, 0xf6f8f3);
    this.cardFrame.clear();
    this.cardFrame.fillStyle(0x6b8f74, 0.16).fillRect(cardX + 3, cardY + 5, cardW, cardH);
    this.cardFrame.fillStyle(0xffffff, 1).fillRect(cardX, cardY, cardW, cardH);

    // Photo: wall, heroine behind the table, mascot, finished dish.
    const px = cardX + pad;
    const py = cardY + pad;
    const tableY = py + Math.round(photoH * 0.56);
    this.wall.setPosition(px, py).setSize(photoW, tableY - py);
    this.wall.setTileScale(this.defaultWall ? photoW / 780 : photoW / this.scene.textures.get(this.wall.texture.key).getSourceImage().width);
    this.table.setPosition(px, tableY).setSize(photoW, py + photoH - tableY);
    this.table.setTileScale(this.defaultTable ? photoW / 980 : (photoW * 0.9) / this.scene.textures.get(this.table.texture.key).getSourceImage().width);
    this.tableEdge.clear().fillStyle(0xb79bd0, 0.55).fillRect(px, tableY, photoW, 3);
    const heroH = Math.round(photoH * 0.7);
    this.heroine.setScale(heroH / this.heroine.height).setPosition(px + photoW / 2, tableY + heroH * 0.2);
    const mascotW = photoW * 0.24;
    this.mascot.setScale(mascotW / this.mascot.width).setPosition(px + photoW * 0.8, tableY + 6);
    const dishW = photoW * 0.42;
    this.dish.setScale(dishW / Math.max(this.dish.width, this.dish.height)).setPosition(px + photoW / 2, tableY + (py + photoH - tableY) * 0.42);

    // Decorative livestream stats under the photo, right-aligned like the reference.
    const statY = py + photoH + (cardY + cardH - (py + photoH)) / 2;
    const statSize = Math.round(clamp(cardW * 0.06, 15, 21));
    this.chats.setFontSize(statSize);
    this.likes.setFontSize(statSize);
    const icon = statSize * 1.25;
    const likesX = cardX + cardW - pad - this.likes.width;
    const heartX = likesX - icon * 0.62;
    const chatsX = heartX - icon * 0.7 - 14 - this.chats.width;
    const bubbleX = chatsX - icon * 0.7;
    this.stats.clear();
    roundedBox(this.stats, bubbleX - icon * 0.62, statY - icon * 0.4, icon * 1.24, icon * 0.8, { fill: 0xffffff, stroke: 0xb7a3d6, strokeWidth: 2.5 });
    this.stats.fillStyle(0xb7a3d6, 1);
    [-0.3, 0, 0.3].forEach((k) => this.stats.fillCircle(bubbleX + k * icon, statY, icon * 0.07));
    this.stats.fillStyle(0xf0566a, 1).fillCircle(heartX, statY, icon * 0.5);
    heartPath(this.stats, heartX, statY + 1, icon * 0.55, 0xffffff);
    this.chats.setPosition(chatsX, statY);
    this.likes.setPosition(likesX, statY);

    // Multiplier bar.
    const barY = cardY + cardH + cardGap + barH / 2;
    this.bar.setScale(barW / this.bar.width).setPosition(cx, barY);
    this.barBox = { x: cx - barW / 2, y: barY - barH / 2, w: barW, h: barH };
    const labelSize = Math.round(barH * 0.46);
    this.labels.forEach((label, i) => {
      label.setFontSize(labelSize);
      label.setPosition(this.barBox.x + ((this.stops[i] + this.stops[i + 1]) / 2) * barW, barY);
    });
    const pointerH = barH * 0.62;
    this.pointer.setScale(pointerH / this.pointer.height).setY(barY + barH * 0.38);

    // Big rewarded button + small base button.
    this.btnH = btnH;
    this.adButton.setPosition(cx, barY + barH / 2 + pointerH + btnH / 2 + 4);
    this.layoutAdButton();
    const pillW = Math.round(pillH * (this.baseSkin.width / this.baseSkin.height));
    this.baseButton.setPosition(cx, this.adButton.y + btnH / 2 + 18 + pillH / 2);
    this.baseSkin.setScale(pillH / this.baseSkin.height);
    this.baseAmount.setFontSize(Math.round(pillH * 0.56));
    const pillCoin = pillH * 0.72;
    this.baseCoin.setScale(pillCoin / this.baseCoin.height);
    const pillContent = pillCoin + 6 + this.baseAmount.width;
    this.baseCoin.setPosition(-pillContent / 2 + pillCoin / 2, 0);
    this.baseAmount.setPosition(-pillContent / 2 + pillCoin + 6, 0);
    this.baseZone.setPosition(cx, this.baseButton.y).setSize(Math.max(pillW, 120), Math.max(pillH, 44));
    this.layoutNotice();
    this.update(0);
  }

  layoutAdButton() {
    const f = this.frame;
    const btnH = this.btnH;
    this.adAmount.setFontSize(Math.round(btnH * 0.48));
    const coinD = btnH * 0.68;
    this.adCoin.setScale(coinD / this.adCoin.height);
    // Native button aspect; the amount font shrinks if a large reward would not fit.
    const btnW = Math.round(btnH * (this.adSkin.width / this.adSkin.height));
    this.adSkin.setScale(btnH / this.adSkin.height);
    while (coinD + 8 + this.adAmount.width > btnW - btnH * 0.55 && this.adAmount.style.fontSize.replace('px', '') > 16) {
      this.adAmount.setFontSize(Number(this.adAmount.style.fontSize.replace('px', '')) - 1);
    }
    const content = coinD + 8 + this.adAmount.width;
    this.adCoin.setPosition(-content / 2 + coinD / 2, -2);
    this.adAmount.setPosition(-content / 2 + coinD + 8, -2);
    const badge = btnH * 0.56;
    this.adBadge.setScale(badge / this.adBadge.height).setPosition(btnW / 2 - badge * 0.05, btnH / 2 - badge * 0.12);
    this.adZone.setPosition(f.cx, this.adButton.y).setSize(btnW, btnH);
    this.adRect = { x: f.cx - btnW / 2, y: this.adButton.y - btnH / 2, w: btnW + badge * 0.5, h: btnH + badge * 0.4 };
  }

  layoutNotice() {
    if (!this.frame || !this.notice.visible) return;
    const f = this.frame;
    const w = Math.min(f.colW - 32, 340);
    this.notice.setWordWrapWidth(w - 24).setFontSize(Math.round(clamp(15 * f.ui, 14, 18)));
    const y = this.barBox.y - this.notice.height / 2 - 14;
    this.notice.setPosition(f.cx, y);
    this.noticeBox.clear();
    roundedBox(this.noticeBox, f.cx - w / 2, y - this.notice.height / 2 - 6, w, this.notice.height + 12, { fill: 0xfff8ec, stroke: 0xe7b9c9, strokeWidth: 2, radius: 14 });
  }

  centers() {
    return {
      rewardAd: { x: this.adZone.x, y: this.adZone.y },
      rewardBase: { x: this.baseZone.x, y: this.baseZone.y },
    };
  }

  rects() {
    const z = (zone) => ({ x: zone.x - zone.width / 2, y: zone.y - zone.height / 2, w: zone.width, h: zone.height });
    return { 'reward-bar': this.barBox, 'reward-ad': z(this.adZone), 'reward-base': z(this.baseZone) };
  }

  destroy() {
    this.scene.time.removeEvent(this.noticeTimer);
    this.objects.forEach((o) => o.destroy());
  }
}
