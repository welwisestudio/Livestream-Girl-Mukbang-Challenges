import { LOBBY_DEPTH, clamp, computeLobbyRegions } from './layout.js';
import { addText } from './text.js';
import { roundedBox } from './draw.js';

const D = LOBBY_DEPTH.popup;

function formatLeft(ms) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Preview art for item rewards: the wardrobe body for outfits, a head for hairstyles.
function itemTexture(itemId) {
  if (itemId === 'outfit-berry-pop') return 'body-pink';
  if (itemId === 'hair-plum') return 'custom-head-plum-peach-happy';
  return 'custom-card';
}

class RewardTile {
  constructor(scene, reward, onTap) {
    this.scene = scene;
    this.reward = reward;
    this.root = scene.add.container(0, 0).setDepth(D + 3);
    this.card = scene.add.image(0, 0, 'playtime-tile');
    this.icon = scene.add.image(0, 0, reward.coins ? 'lobby-coins' : itemTexture(reward.item));
    this.amount = reward.coins
      ? addText(scene, 0, 0, String(reward.coins), { size: 22, weight: '700', color: '#ffffff', stroke: '#9a6a2c', strokeWidth: 5 })
      : null;
    this.timerBox = scene.add.graphics();
    this.timer = addText(scene, 0, 0, '', { size: 14, weight: '700', color: '#ffffff' });
    this.check = scene.add.image(0, 0, 'playtime-check');
    this.badge = scene.add.image(0, 0, 'new-badge');
    this.badgeText = addText(scene, 0, 0, 'NEW', { size: 12, weight: '700', color: '#ffffff', stroke: '#e0457f', strokeWidth: 3 }).setAngle(-8);
    this.label = addText(scene, 0, 0, `${reward.minutes} min`, { size: 20, weight: '700', color: '#6b4a3a' });
    this.root.add([this.card, this.icon, ...(this.amount ? [this.amount] : []), this.timerBox, this.timer, this.check, this.badge, this.badgeText, this.label]);
    this.zone = scene.add.zone(0, 0, 10, 10).setDepth(D + 4).setInteractive({ useHandCursor: true });
    this.zone.on('pointerup', () => onTap(reward.id));
  }

  layout(x, y, size) {
    this.size = size;
    this.root.setPosition(x, y);
    this.card.setScale(size / this.card.width);
    const iconBox = size * (this.reward.coins ? 0.62 : 0.7);
    this.icon.setScale(iconBox / Math.max(this.icon.width, this.icon.height)).setPosition(0, -size * 0.02);
    this.amount?.setFontSize(Math.round(size * 0.21)).setPosition(0, size * 0.17);
    this.check.setScale((size * 0.42) / this.check.width).setPosition(size * 0.36, size * 0.34);
    this.badge.setScale((size * 0.42) / this.badge.width).setPosition(size * 0.42, -size * 0.4);
    this.badgeText.setFontSize(Math.round(clamp(size * 0.12, 10, 16))).setPosition(size * 0.42, -size * 0.4);
    this.label.setFontSize(Math.round(clamp(size * 0.2, 15, 24))).setPosition(0, size / 2 + this.label.height / 2 + 2);
    // Countdown sits on the card's top edge so it never covers the reward amount.
    this.timer.setFontSize(Math.round(clamp(size * 0.15, 12, 18))).setPosition(0, -size * 0.5);
    this.zone.setPosition(x, y).setSize(size, size);
    this.zone.input.hitArea.setSize(size, size);
    this.applyState(this.state ?? this.reward);
  }

  applyState(reward) {
    this.state = reward;
    const claimable = reward.unlocked && !reward.claimed;
    this.card.setTexture(claimable ? 'playtime-tile-selected' : 'playtime-tile');
    if (this.size) this.card.setScale(this.size / this.card.width);
    this.check.setVisible(reward.claimed);
    this.badge.setVisible(!reward.claimed);
    this.badgeText.setVisible(!reward.claimed);
    const locked = !reward.unlocked && !reward.claimed;
    this.timer.setVisible(locked).setText(locked ? formatLeft(reward.msLeft) : '');
    this.timerBox.clear().setVisible(locked);
    if (locked && this.size) {
      const w = this.timer.width + 14;
      const h = this.timer.height + 2;
      roundedBox(this.timerBox, -w / 2, -this.size * 0.5 - h / 2, w, h, { fill: 0x7a4a3a, alpha: 0.9 });
    }
    this.icon.setAlpha(reward.claimed ? 0.55 : 1);
    this.amount?.setAlpha(reward.claimed ? 0.55 : 1);
    this.scene.tweens.killTweensOf(this.root);
    this.root.setScale(1);
    if (claimable) this.scene.tweens.add({ targets: this.root, scale: 1.05, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  destroy() { this.scene.tweens.killTweensOf(this.root); this.root.destroy(true); this.zone.destroy(); }
}

// Playtime Rewards window (PlaytimeRewards.png reference): title plate, 3 + 3 tiles and a
// large seventh tile, "Take All" rewarded button below. Purely presentational.
export class PlaytimeRewardsPanel {
  constructor(scene, { status, onClaim, onTakeAll, onClose }) {
    this.scene = scene;
    this.veil = scene.add.rectangle(0, 0, 10, 10, 0xfff4f8, 0.72).setOrigin(0).setDepth(D).setInteractive();
    // Nine-slice keeps the panel's rounded corners and border intact at any height.
    this.body = scene.add.nineslice(0, 0, 'playtime-panel', undefined, 693, 800, 90, 90, 90, 90).setDepth(D + 1);
    this.header = scene.add.image(0, 0, 'playtime-header').setDepth(D + 5);
    this.title = addText(scene, 0, 0, 'Playtime Rewards', { size: 30, weight: '700', color: '#ffffff', stroke: '#7a4a3a', strokeWidth: 6 }).setDepth(D + 6);
    this.close = scene.add.image(0, 0, 'custom-close').setDepth(D + 6).setInteractive({ useHandCursor: true });
    this.close.on('pointerup', () => onClose());
    this.tiles = status.rewards.map((reward) => new RewardTile(scene, reward, onClaim));
    this.take = scene.add.container(0, 0).setDepth(D + 5);
    this.takeSkin = scene.add.image(0, 0, 'reward-button');
    this.takeText = addText(scene, 0, 0, 'Take All', { size: 30, weight: '700', color: '#ffffff', stroke: '#3f8f2a', strokeWidth: 6 });
    this.takeBadge = scene.add.image(0, 0, 'reward-play');
    this.take.add([this.takeSkin, this.takeText, this.takeBadge]);
    this.takeZone = scene.add.zone(0, 0, 10, 10).setDepth(D + 6).setInteractive({ useHandCursor: true });
    this.takeZone.on('pointerdown', () => this.enabled && this.scene.tweens.add({ targets: this.take, scale: 0.95, duration: 70 }));
    this.takeZone.on('pointerup', () => { this.scene.tweens.add({ targets: this.take, scale: 1, duration: 90 }); if (this.enabled) onTakeAll(); });
    this.noticeBox = scene.add.graphics().setDepth(D + 7).setVisible(false);
    this.notice = addText(scene, 0, 0, '', { size: 16, weight: '600', color: '#6b4a5f', wrap: 300 }).setDepth(D + 8).setVisible(false);
    this.enabled = true;
    this.update(status);
  }

  update(status) {
    this.status = status;
    status.rewards.forEach((reward, i) => this.tiles[i].applyState(reward));
    const showTake = status.remaining > 0;
    this.take.setVisible(showTake);
    this.takeZone.setVisible(showTake);
    if (showTake) this.takeZone.setInteractive(); else this.takeZone.disableInteractive();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.take.setAlpha(enabled ? 1 : 0.6);
  }

  showNotice(message) {
    this.notice.setText(message).setVisible(true);
    this.noticeBox.setVisible(true);
    this.layoutNotice();
    this.scene.time.removeEvent(this.noticeTimer);
    this.noticeTimer = this.scene.time.delayedCall(3000, () => { this.notice.setVisible(false); this.noticeBox.setVisible(false); });
  }

  layout(f) {
    this.frame = f;
    this.veil.setPosition(f.left, f.top - 2).setSize(f.w, f.h + 4);
    this.veil.input.hitArea.setSize(f.w, f.h + 4);
    // Panel width from the column; height from the tile grid, shrunk to fit short screens.
    const takeH = clamp(f.colW * 0.16, 56, 78);
    let panelW = Math.min(f.colW * 0.9, 470);
    const fit = (w) => {
      const tile = (w * 0.84) / 3.18;
      const labelH = clamp(tile * 0.2, 15, 24) + 8;
      const big = tile * 1.4;
      const headerH = w * 0.2;
      return { tile, labelH, big, headerH, h: headerH * 0.62 + (tile + labelH + tile * 0.22) * 2 + big + labelH + w * 0.08 };
    };
    let g = fit(panelW);
    // Room for the HUD and the close button above the title plate.
    const hud = computeLobbyRegions(f).hud;
    const closeD = clamp(f.colW * 0.11, 44, 54);
    const minTop = hud.y + hud.h + closeD * 0.95 + panelW * 0.06;
    const maxH = f.bottom - minTop - takeH - clamp(f.h * 0.05, 24, 50);
    if (g.h > maxH) { panelW *= maxH / g.h; g = fit(panelW); }
    const panelH = g.h;
    const cx = f.cx;
    const top = Math.max(minTop, f.top + (f.h - panelH - takeH - 24) / 2);
    // Border drawn at ~60% of the art's native scale to match the reference's thin rim.
    const s = (panelW / 693) * 0.6;
    this.body.setSize(panelW / s, panelH / s).setScale(s).setPosition(cx, top + panelH / 2);
    // Header plate keeps its aspect, centred on the panel's top edge.
    const headerW = panelW * 1.04;
    this.header.setScale(headerW / this.header.width).setPosition(cx, top + 4);
    this.title.setFontSize(Math.round(clamp(headerW * 0.07, 22, 34))).setPosition(cx + headerW * 0.02, top + 2);
    // Close sits above the right end of the title plate, clear of tiles and badges.
    this.close.setScale(closeD / this.close.width).setPosition(cx + panelW / 2 - closeD * 0.35, top - this.header.displayHeight * 0.5 - closeD * 0.32);

    const gap = (panelW * 0.84 - g.tile * 3) / 2;
    let y = top + g.headerH * 0.62 + g.tile * 0.22 + g.tile / 2;
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 3; col += 1) this.tiles[row * 3 + col].layout(cx + (col - 1) * (g.tile + gap), y, g.tile);
      y += g.tile + g.labelH + g.tile * 0.22;
    }
    this.tiles[6].layout(cx, y - g.tile / 2 + g.big / 2 - g.tile * 0.05, g.big);

    const takeY = top + panelH + 18 + takeH / 2;
    this.takeSkin.setScale(takeH / this.takeSkin.height);
    this.takeText.setFontSize(Math.round(takeH * 0.42));
    const badge = takeH * 0.56;
    this.takeBadge.setScale(badge / this.takeBadge.height).setPosition(this.takeSkin.displayWidth / 2 - badge * 0.05, takeH / 2 - badge * 0.12);
    this.take.setPosition(cx, takeY);
    this.takeZone.setPosition(cx, takeY).setSize(this.takeSkin.displayWidth, takeH);
    this.layoutNotice();
  }

  layoutNotice() {
    if (!this.frame || !this.notice.visible) return;
    const f = this.frame;
    const w = Math.min(f.colW - 32, 340);
    this.notice.setWordWrapWidth(w - 24).setFontSize(Math.round(clamp(15 * f.ui, 14, 18)));
    const y = this.take.y - this.takeSkin.displayHeight / 2 - this.notice.height / 2 - 12;
    this.notice.setPosition(f.cx, y);
    this.noticeBox.clear();
    roundedBox(this.noticeBox, f.cx - w / 2, y - this.notice.height / 2 - 6, w, this.notice.height + 12, { fill: 0xfff8ec, stroke: 0xe7b9c9, strokeWidth: 2, radius: 14 });
  }

  targets() {
    const t = { playtimeClose: { x: this.close.x, y: this.close.y } };
    this.tiles.forEach((tile) => { t[`pt:${tile.reward.id}`] = { x: tile.zone.x, y: tile.zone.y }; });
    if (this.take.visible) t.takeAll = { x: this.takeZone.x, y: this.takeZone.y };
    return t;
  }

  rects() {
    const z = (o) => ({ x: o.x - o.width / 2, y: o.y - o.height / 2, w: o.width, h: o.height });
    const r = { 'playtime-panel': { x: this.body.x - this.body.displayWidth / 2, y: this.body.y - this.body.displayHeight / 2, w: this.body.displayWidth, h: this.body.displayHeight } };
    if (this.take.visible) r['playtime-take-all'] = z(this.takeZone);
    this.tiles.forEach((tile) => { r[`playtime-${tile.reward.id}`] = z(tile.zone); });
    return r;
  }

  destroy() {
    this.scene.time.removeEvent(this.noticeTimer);
    [this.veil, this.body, this.header, this.title, this.close, this.take, this.takeZone, this.noticeBox, this.notice].forEach((o) => o.destroy());
    this.tiles.forEach((t) => t.destroy());
  }
}
