import { DEPTH, clamp, computeLobbyRegions, hudMetrics } from './layout.js';
import { addText } from './text.js';
import { UI_OUTLINE, dropShadow, roundedBox } from './draw.js';
import { COLORS, CSS } from '../content/theme.js';
import { appearanceTexture } from './appearanceTextures.js';

// The one top HUD used on every screen (the approved Lobby version): avatar in an orange ring
// with the level badge under it, the nickname centred in its card, and the coin-stack wallet.
// Sizes come from hudMetrics() so the frame and every scene agree on its geometry.
export class Hud {
  constructor(scene, { name = 'Player', level, coins, appearance = null }) {
    this.scene = scene;
    this.state = { name, level, coins };
    this.root = scene.add.container(0, 0).setDepth(DEPTH.hud);
    this.cardShadow = scene.add.graphics();
    this.card = scene.add.graphics();
    this.ring = scene.add.graphics();
    const equipped = appearance ?? scene.services().save.snapshot().appearance.equipped;
    this.avatar = scene.add.image(0, 0, appearanceTexture(scene, 'avatar', equipped));
    this.nameText = addText(scene, 0, 0, name, { size: 18, weight: '700', color: CSS.ink });
    this.levelBadge = scene.add.graphics();
    this.levelText = addText(scene, 0, 0, String(level), { size: 14, weight: '700', color: CSS.white, stroke: CSS.orangeDark, strokeWidth: 3 });
    this.wallet = scene.add.graphics();
    this.coin = scene.add.image(0, 0, 'lobby-coins');
    this.coinText = addText(scene, 0, 0, String(coins), { size: 20, weight: '700', color: CSS.ink, originX: 0 });
    this.root.add([this.cardShadow, this.card, this.nameText, this.ring, this.avatar, this.levelBadge, this.levelText, this.wallet, this.coin, this.coinText]);
  }

  setCoins(value) {
    this.state.coins = value;
    this.coinText.setText(String(value));
    if (this.lastLayout) this.layoutLobby(...this.lastLayout);
  }

  setAppearance(appearance) {
    this.avatar.setTexture(appearanceTexture(this.scene, 'avatar', appearance));
  }

  // Always bumps from the laid-out size, so rapid repeated bumps (coins landing one after
  // another) never compound into an ever-larger coin.
  bumpCoins() {
    const base = this.coinScale ?? this.coin.scale;
    this.scene.tweens.killTweensOf(this.coin);
    this.coin.setScale(base);
    this.scene.tweens.add({ targets: this.coin, scale: base * 1.25, duration: 120, yoyo: true });
  }

  // Lobby: a green "+" inside the right end of the wallet (free coins). The coin count keeps
  // clear of it; the tap area is at least 44 px.
  enablePlus(onTap) {
    if (this.plusRoot) return;
    this.plusRoot = this.scene.add.container(0, 0);
    this.plusG = this.scene.add.graphics();
    this.plusRoot.add(this.plusG);
    this.root.add(this.plusRoot);
    this.plusZone = this.scene.add.zone(0, 0, 10, 10).setDepth(DEPTH.hud + 2).setInteractive({ useHandCursor: true });
    this.plusZone.on('pointerdown', () => this.scene.tweens.add({ targets: this.plusRoot, scale: 0.9, duration: 70 }));
    this.plusZone.on('pointerout', () => this.plusRoot.setScale(1));
    this.plusZone.on('pointerup', () => {
      this.scene.tweens.add({ targets: this.plusRoot, scale: 1, duration: 110, ease: 'Back.Out' });
      onTap();
    });
    if (this.lastLayout) this.layoutLobby(...this.lastLayout);
  }

  plusCenter() {
    return this.plusZone ? { x: this.plusZone.x, y: this.plusZone.y } : null;
  }

  drawPlus(size) {
    const g = this.plusG;
    g.clear();
    const radius = size / 2;
    g.fillStyle(0x2f8a34, 1).fillCircle(0, 1, radius);
    g.fillStyle(0x6fd44f, 1).fillCircle(0, 0, radius - 1);
    g.lineStyle(UI_OUTLINE, 0x2f7d38, 1).strokeCircle(0, 0, radius - UI_OUTLINE / 2);
    g.fillStyle(0xffffff, 0.34).fillEllipse(-size * 0.1, -size * 0.22, size * 0.42, size * 0.18);
    const arm = size * 0.5;
    const bar = Math.max(4, size * 0.16);
    g.fillStyle(0x2f7d38, 1).fillRoundedRect(-arm / 2 - 1, -bar / 2 + 1, arm + 2, bar + 2, bar / 2);
    g.fillStyle(0x2f7d38, 1).fillRoundedRect(-bar / 2 - 1, -arm / 2 + 1, bar + 2, arm + 2, bar / 2);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-arm / 2, -bar / 2, arm, bar, bar / 2);
    g.fillStyle(0xffffff, 1).fillRoundedRect(-bar / 2, -arm / 2, bar, arm, bar / 2);
  }

  coinPosition() {
    return { x: this.coin.x, y: this.coin.y };
  }

  // Gameplay screens: exactly the Lobby HUD region, with no settings-gear slot.
  layout(frame) {
    this.layoutLobby(frame, computeLobbyRegions(frame).hud, 0);
  }

  // Profile on the left, the wallet filling the space up to the (optional) settings gear on
  // phones and keeping its natural size at the top-right edge on wide screens.
  layoutLobby(frame, region, settingsSize) {
    this.frame = frame;
    this.lastLayout = [frame, region, settingsSize];
    this.levelText.setText(String(this.state.level));
    const m = hudMetrics(region.h);
    const cy = region.y + region.h / 2;
    // Very narrow phones need a slightly tighter separation so a six-digit balance and the
    // rewarded + both remain inside the wallet without touching the Settings gear.
    const gap = frame.W < 380 ? 5 : Math.round(clamp(region.w * 0.025, 8, 14));
    const { avatarD, cardH, badgeH } = m;
    const gearSlot = Math.round(settingsSize + gap);
    const usable = region.w - gearSlot - gap;
    const profileW = Math.round(clamp(usable * 0.46, 142, 218));
    const profileX = region.x + avatarD * 0.42;
    const cardW = profileW - avatarD * 0.28;

    const ax = region.x + avatarD / 2;
    this.ring.clear();
    this.ring.fillStyle(COLORS.orange, 1).fillCircle(ax, cy, avatarD / 2);
    this.ring.fillStyle(COLORS.paper, 1).fillCircle(ax, cy, avatarD / 2 - UI_OUTLINE);
    this.avatar.setPosition(ax, cy).setScale((avatarD - 10) / Math.max(this.avatar.width, this.avatar.height));

    this.cardShadow.clear();
    dropShadow(this.cardShadow, profileX, cy - cardH / 2, cardW, cardH);
    this.card.clear();
    roundedBox(this.card, profileX, cy - cardH / 2, cardW, cardH, { fill: COLORS.paper, stroke: COLORS.greyDark, strokeWidth: UI_OUTLINE });
    // Nickname: centred in the visible part of the card (right of the avatar ring), a touch
    // below the card's middle so it reads balanced next to the ring; long names shrink to fit.
    const textL = ax + avatarD / 2 + 4;
    const textR = profileX + cardW - Math.max(10, cardH * 0.3);
    let nameSize = Math.round(clamp(region.h * 0.27, 16, 22));
    this.nameText.setFontSize(nameSize);
    while (this.nameText.width > textR - textL && nameSize > 12) this.nameText.setFontSize(--nameSize);
    this.nameText.setOrigin(0.5, 0.5).setPosition((textL + textR) / 2, cy + cardH * 0.05);

    this.levelText.setFontSize(Math.round(clamp(badgeH * 0.58, 13, 16)));
    const badgeW = Math.round(clamp(avatarD * 0.86, 48, 64));
    const badgeX = ax - badgeW / 2;
    const badgeY = cy + m.badgeOffset;
    this.levelBadge.clear();
    roundedBox(this.levelBadge, badgeX, badgeY, badgeW, badgeH, { fill: COLORS.orange, stroke: COLORS.orangeDark, strokeWidth: UI_OUTLINE });
    this.levelText.setPosition(ax, badgeY + badgeH / 2);

    const walletH = cardH;
    const coinSize = Math.round(clamp(walletH * 1.08, 44, 62));
    const walletMax = Math.round(clamp(region.h * 3.4, 200, 280));
    const walletFree = region.x + usable - (region.x + profileW + gap + coinSize * 0.36);
    const walletW = Math.round(Math.min(walletFree, walletMax));
    const walletX = region.x + usable - walletW;
    const walletGroupX = walletX - coinSize * 0.36;
    this.wallet.clear();
    dropShadow(this.wallet, walletX, cy - walletH / 2, walletW, walletH);
    roundedBox(this.wallet, walletX, cy - walletH / 2, walletW, walletH, { fill: COLORS.paper, stroke: COLORS.greyDark, strokeWidth: UI_OUTLINE });
    const coinX = walletGroupX + coinSize * 0.48;
    this.coinScale = coinSize / Math.max(this.coin.width, this.coin.height);
    this.coin.setPosition(coinX, cy).setScale(this.coinScale);
    this.coinText.setFontSize(Math.round(clamp(region.h * 0.29, 19, 25)));
    const coinRight = coinX + this.coin.displayWidth / 2;
    const narrowWallet = frame.W < 400;
    const textLeft = coinRight + (narrowWallet ? 2 : 6);
    let textRight = walletX + walletW - 10;
    let plusRect = null;
    if (this.plusRoot) {
      const size = Math.round(clamp(walletH * 0.64, 30, 38));
      const px = walletX + walletW - (walletH - size) / 2 - size / 2 - 1;
      this.drawPlus(size);
      this.plusRoot.setPosition(px, cy);
      const hit = Math.max(44, size + 8);
      this.plusZone.setPosition(px, cy).setSize(hit, hit);
      this.plusZone.input.hitArea.setSize(hit, hit);
      textRight = px - size / 2 - (narrowWallet ? 4 : 8);
      plusRect = { x: px - size / 2, y: cy - size / 2, w: size, h: size };
    }
    // The count sits between the coin stack and the "+"; large balances shrink to fit there.
    let coinFont = this.coinText.style.fontSize ? parseFloat(this.coinText.style.fontSize) : 20;
    while (this.coinText.width > textRight - textLeft && coinFont > 11) this.coinText.setFontSize(--coinFont);
    this.coinText.setPosition(textLeft, cy);

    const profileBottom = Math.max(cy + avatarD / 2, badgeY + badgeH);
    this.rects = {
      'hud-profile': { x: region.x, y: cy - avatarD / 2, w: profileX + cardW - region.x, h: profileBottom - (cy - avatarD / 2) },
      'hud-wallet': { x: walletGroupX, y: cy - coinSize / 2, w: region.x + usable - walletGroupX, h: coinSize },
      ...(plusRect ? { 'hud-plus': plusRect } : {}),
    };
  }

  destroy() {
    this.plusZone?.destroy();
    this.root.destroy(true);
  }
}
