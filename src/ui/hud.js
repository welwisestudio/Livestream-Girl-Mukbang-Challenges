import { DEPTH, clamp } from './layout.js';
import { addText } from './text.js';
import { roundedBox } from './draw.js';
import { COLORS, CSS } from '../content/theme.js';

// Top HUD: avatar + name/level card on the left, coin wallet on the right.
// Sized from the HUD band height (58–76 px) so it never collapses on small phones.
export class Hud {
  constructor(scene, { name, level, coins, xp = 0 }) {
    this.scene = scene;
    this.state = { name, level, coins, xp };
    this.root = scene.add.container(0, 0).setDepth(DEPTH.hud);
    this.cardShadow = scene.add.graphics();
    this.card = scene.add.graphics();
    this.ring = scene.add.graphics();
    this.avatar = scene.add.image(0, 0, 'avatar');
    this.nameText = addText(scene, 0, 0, name, { size: 18, weight: '700', color: CSS.ink, originX: 0 });
    this.levelBadge = scene.add.graphics();
    this.levelText = addText(scene, 0, 0, `Lv. ${level}`, { size: 14, weight: '700', color: CSS.white, stroke: CSS.orangeDark, strokeWidth: 3 });
    this.wallet = scene.add.graphics();
    this.coin = scene.add.image(0, 0, 'coin');
    this.coinText = addText(scene, 0, 0, String(coins), { size: 20, weight: '700', color: CSS.ink, originX: 0 });
    this.root.add([this.cardShadow, this.card, this.levelBadge, this.levelText, this.nameText, this.ring, this.avatar, this.wallet, this.coin, this.coinText]);
  }

  setCoins(value) {
    this.state.coins = value;
    this.coinText.setText(String(value));
    if (this.frame) this.layout(this.frame);
  }

  bumpCoins() {
    this.scene.tweens.add({ targets: [this.coin], scale: this.coin.scale * 1.25, duration: 120, yoyo: true });
  }

  coinPosition() {
    return { x: this.coin.x, y: this.coin.y };
  }

  layout(frame) {
    this.frame = frame;
    const { height: h, top, left, right } = frame.hud;
    const cy = top + h / 2;

    // Avatar circle.
    const d = h;
    const ax = left + d / 2;
    this.ring.clear();
    this.ring.fillStyle(COLORS.pinkDark, 1).fillCircle(ax, cy, d / 2);
    this.ring.fillStyle(COLORS.paper, 1).fillCircle(ax, cy, d / 2 - 4);
    this.avatar.setPosition(ax, cy).setScale((d - 10) / Math.max(this.avatar.width, this.avatar.height));

    // Name + level card, tucked behind the avatar.
    const cardH = Math.round(h * 0.78);
    const nameSize = Math.round(clamp(h * 0.3, 17, 22));
    this.nameText.setFontSize(nameSize);
    const badgeSize = Math.round(clamp(h * 0.24, 14, 17));
    this.levelText.setFontSize(badgeSize);
    const textLeft = ax + d / 2 + 10;
    const cardW = Math.round(clamp(Math.max(this.nameText.width, 92) + (textLeft - ax) + 22, h * 2.5, h * 3.6));
    const cardX = ax;
    const cardY = cy - cardH / 2;
    this.cardShadow.clear();
    roundedBox(this.cardShadow, cardX + 2, cardY + 4, cardW, cardH, { fill: 0x8a4b3a, alpha: 0.12 });
    this.card.clear();
    roundedBox(this.card, cardX, cardY, cardW, cardH, { fill: COLORS.paper, stroke: COLORS.pinkDark, strokeWidth: 3 });
    this.nameText.setPosition(textLeft, cardY + cardH * 0.31);

    const badgeH = Math.round(badgeSize + 9);
    const badgeW = Math.round(this.levelText.width + 16);
    const badgeX = textLeft - 2;
    const badgeY = cardY + cardH * 0.73 - badgeH / 2;
    this.levelBadge.clear();
    roundedBox(this.levelBadge, badgeX, badgeY, badgeW, badgeH, { fill: COLORS.orange, stroke: COLORS.orangeDark, strokeWidth: 2 });
    const barX = badgeX + badgeW + 6;
    const barW = Math.max(18, cardX + cardW - 14 - barX);
    roundedBox(this.levelBadge, barX, badgeY + badgeH * 0.28, barW, badgeH * 0.44, { fill: COLORS.pinkSoft, stroke: COLORS.pinkDark, strokeWidth: 1.5 });
    if (this.state.xp > 0) roundedBox(this.levelBadge, barX, badgeY + badgeH * 0.28, Math.max(badgeH * 0.44, barW * this.state.xp), badgeH * 0.44, { fill: COLORS.rose });
    this.levelText.setPosition(badgeX + badgeW / 2, badgeY + badgeH / 2);

    // Wallet.
    const walletH = Math.round(h * 0.66);
    const coinSize = Math.round(walletH * 1.12);
    this.coinText.setFontSize(Math.round(clamp(h * 0.33, 19, 25)));
    const walletW = Math.round(Math.max(h * 1.9, coinSize * 0.6 + this.coinText.width + 30));
    const walletX = right - walletW;
    this.wallet.clear();
    roundedBox(this.wallet, walletX + 2, cy - walletH / 2 + 4, walletW, walletH, { fill: 0x8a4b3a, alpha: 0.12 });
    roundedBox(this.wallet, walletX, cy - walletH / 2, walletW, walletH, { fill: COLORS.paper, stroke: COLORS.pinkDark, strokeWidth: 3 });
    this.coin.setPosition(walletX + 4, cy).setScale(coinSize / Math.max(this.coin.width, this.coin.height));
    this.coinText.setPosition(walletX + coinSize * 0.62, cy);
    this.rects = {
      'hud-avatar': { x: ax - d / 2, y: cy - d / 2, w: d, h: d },
      'hud-profile': { x: cardX, y: cardY, w: cardW, h: cardH },
      'hud-wallet': { x: walletX - coinSize / 2 + 4, y: cy - Math.max(walletH, coinSize) / 2, w: walletW + coinSize / 2 - 4, h: Math.max(walletH, coinSize) },
    };
  }

  // Home-screen HUD follows the reference: profile on the left, a large centred wallet,
  // and a reserved gear slot on the right. It deliberately does not share the gameplay
  // HUD's right-aligned wallet geometry.
  layoutLobby(frame, region, settingsSize) {
    this.frame = frame;
    const cy = region.y + region.h / 2;
    const gap = Math.round(clamp(region.w * 0.025, 8, 14));
    const avatarD = Math.round(clamp(region.h * 0.92, 58, 76));
    const gearSlot = Math.round(settingsSize + gap);
    const usable = region.w - gearSlot - gap;
    const profileW = Math.round(clamp(usable * 0.46, 142, 218));
    const cardH = Math.round(clamp(region.h * 0.62, 42, 56));
    const profileX = region.x + avatarD * 0.42;

    this.ring.clear();
    this.ring.fillStyle(COLORS.orange, 1).fillCircle(region.x + avatarD / 2, cy, avatarD / 2);
    this.ring.fillStyle(COLORS.paper, 1).fillCircle(region.x + avatarD / 2, cy, avatarD / 2 - 4);
    this.avatar.setPosition(region.x + avatarD / 2, cy).setScale((avatarD - 10) / Math.max(this.avatar.width, this.avatar.height));

    this.cardShadow.clear();
    roundedBox(this.cardShadow, profileX + 2, cy - cardH / 2 + 4, profileW - avatarD * 0.28, cardH, { fill: 0x8a4b3a, alpha: 0.12 });
    this.card.clear();
    roundedBox(this.card, profileX, cy - cardH / 2, profileW - avatarD * 0.28, cardH, { fill: COLORS.paper, stroke: COLORS.pinkDark, strokeWidth: 3 });
    const textLeft = region.x + avatarD + Math.round(clamp(region.w * 0.015, 5, 9));
    this.nameText.setFontSize(Math.round(clamp(region.h * 0.25, 16, 21))).setPosition(textLeft, cy - cardH * 0.18);
    const badgeH = Math.round(clamp(cardH * 0.43, 20, 25));
    this.levelText.setFontSize(Math.round(clamp(badgeH * 0.58, 13, 16)));
    const badgeW = Math.round(this.levelText.width + 16);
    const badgeX = textLeft - 2;
    const badgeY = cy + cardH * 0.12;
    this.levelBadge.clear();
    roundedBox(this.levelBadge, badgeX, badgeY, badgeW, badgeH, { fill: COLORS.orange, stroke: COLORS.orangeDark, strokeWidth: 2 });
    this.levelText.setPosition(badgeX + badgeW / 2, badgeY + badgeH / 2);

    const walletH = Math.round(clamp(region.h * 0.62, 42, 56));
    const coinSize = Math.round(clamp(walletH * 1.08, 44, 62));
    const walletGroupX = region.x + profileW + gap;
    const walletX = walletGroupX + coinSize * 0.36;
    const walletW = Math.round(region.x + usable - walletX);
    this.wallet.clear();
    roundedBox(this.wallet, walletX + 2, cy - walletH / 2 + 4, walletW, walletH, { fill: 0x8a4b3a, alpha: 0.12 });
    roundedBox(this.wallet, walletX, cy - walletH / 2, walletW, walletH, { fill: COLORS.paper, stroke: COLORS.pinkDark, strokeWidth: 3 });
    this.coin.setPosition(walletGroupX + coinSize * 0.52, cy).setScale(coinSize / Math.max(this.coin.width, this.coin.height));
    this.coinText.setFontSize(Math.round(clamp(region.h * 0.29, 19, 25))).setPosition(walletX + coinSize * 0.58, cy);

    this.rects = {
      'hud-profile': { x: region.x, y: cy - avatarD / 2, w: profileW, h: avatarD },
      'hud-wallet': { x: walletGroupX, y: cy - coinSize / 2, w: region.x + usable - walletGroupX, h: coinSize },
    };
  }

  destroy() {
    this.root.destroy(true);
  }
}
