import { DEPTH, clamp } from './layout.js';
import { addText } from './text.js';
import { UI_OUTLINE, dropShadow, roundedBox } from './draw.js';
import { COLORS, CSS } from '../content/theme.js';

// Viewer names for the chat avatars (same order as VIEWER_AVATARS).
export const DONOR_NAMES = Object.freeze({ 'viewer-bunny': 'Bunny', 'viewer-bear': 'Bear', 'viewer-cat': 'Kitty', 'viewer-chick': 'Chick' });

const GOLD = 0xffcf3f;
const GOLD_DARK = 0xd98a1c;

// "Earned on this stream" pill beside the LIVE header: coin + running total. It only ever shows
// donations the save has already accepted; flying coins add their share as they land.
export class DonationCounter {
  constructor(scene, { value = 0 } = {}) {
    this.scene = scene;
    this.value = value;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.header);
    this.g = scene.add.graphics();
    this.coin = scene.add.image(0, 0, 'coin');
    this.text = addText(scene, 0, 0, `+${value}`, { size: 22, weight: '700', color: CSS.orangeDark, originX: 0 });
    this.root.add([this.g, this.coin, this.text]);
  }

  // Width the pill needs for a 4-digit total, so the header row never reflows while it grows.
  measure(frame) {
    const size = Math.round(clamp(22 * frame.ui, 20, 28));
    const h = Math.round(size * 2.15);
    return { width: Math.round(h * 0.95 + size * 3.2 + h * 0.45), height: h, size };
  }

  layout({ right, y, frame }) {
    this.box = { right, y, frame };
    const { width: w, height: h, size } = this.measure(frame);
    const x = right - w / 2;
    this.root.setPosition(x, y);
    this.g.clear();
    dropShadow(this.g, -w / 2, -h / 2, w, h);
    roundedBox(this.g, -w / 2, -h / 2, w, h, { fill: COLORS.paper, stroke: GOLD_DARK, strokeWidth: UI_OUTLINE });
    const coinD = h * 0.95;
    this.coin.setScale(coinD / Math.max(this.coin.width, this.coin.height)).setPosition(-w / 2 + coinD * 0.42, 0);
    this.baseCoinScale = this.coin.scale;
    this.text.setFontSize(size).setPosition(-w / 2 + coinD * 0.92, 0).setOrigin(0, 0.5);
    this.rect = { x: x - w / 2, y: y - h / 2, w, h };
    return { width: w, height: h };
  }

  target() {
    return { x: this.root.x + this.coin.x, y: this.root.y + this.coin.y };
  }

  add(amount) {
    this.setValue(this.value + amount);
    this.pulse();
  }

  setValue(value) {
    this.value = value;
    this.text.setText(`+${value}`);
  }

  pulse() {
    const { scene } = this;
    scene.tweens.killTweensOf(this.root);
    this.root.setScale(1);
    scene.tweens.add({ targets: this.root, scale: 1.12, duration: 90, yoyo: true, ease: 'Sine.Out' });
    if (this.baseCoinScale) {
      scene.tweens.killTweensOf(this.coin);
      this.coin.setScale(this.baseCoinScale).setAngle(0);
      scene.tweens.add({ targets: this.coin, scale: this.baseCoinScale * 1.25, angle: 12, duration: 110, yoyo: true, ease: 'Back.Out' });
    }
  }

  // "+40" that floats up from the counter when a donation has fully landed.
  floatAmount(amount) {
    const { scene } = this;
    const size = this.box ? Math.round(clamp(20 * this.box.frame.ui, 18, 26)) : 20;
    const label = addText(scene, this.root.x, this.root.y + (this.rect?.h ?? 40) * 0.7, `+${amount}`, {
      size, weight: '700', color: '#ffd23f', stroke: '#a8552a', strokeWidth: 5,
    }).setDepth(DEPTH.banner);
    scene.tweens.add({ targets: label, y: label.y + size * 1.6, alpha: 0, duration: 900, ease: 'Sine.Out', onComplete: () => label.destroy() });
  }

  destroy() { this.root.destroy(true); }
}

// Golden sparkle left behind a flying coin: a soft glow with a bright core.
function trailDot(scene, x, y, size) {
  const r = size * (0.7 + Math.random() * 0.5);
  const jitter = () => (Math.random() - 0.5) * size * 0.8;
  const glow = scene.add.circle(x + jitter(), y + jitter(), r, GOLD, 0.75).setDepth(DEPTH.banner - 1);
  const core = scene.add.circle(glow.x, glow.y, r * 0.45, 0xffffff, 0.95).setDepth(DEPTH.banner - 1);
  scene.tweens.add({ targets: [glow, core], alpha: 0, scale: 0.15, y: glow.y + size * 0.6, duration: 520, ease: 'Sine.Out', onComplete: () => { glow.destroy(); core.destroy(); } });
}

// Coins fly along a curve from `from` to `to`, each dropping a sparkle trail. The amount is split
// across the coins; onCoin(share) runs as each coin lands, onDone() after the last one.
export function flyCoins(scene, { from, to, amount, coinSize = 30, onCoin = () => {}, onDone = () => {} }) {
  const count = Math.max(3, Math.min(8, Math.round(amount / 12)));
  const shares = Array.from({ length: count }, (_, i) => Math.floor(amount / count) + (i < amount % count ? 1 : 0));
  let landed = 0;
  shares.forEach((share, i) => {
    const coin = scene.add.image(from.x, from.y, 'coin').setDepth(DEPTH.banner);
    const scale = coinSize / Math.max(coin.width, coin.height);
    coin.setScale(scale * 0.6).setAlpha(0);
    const spread = (i - (count - 1) / 2) * coinSize * 0.5;
    const ctrl = {
      x: (from.x + to.x) / 2 + spread - (to.x - from.x) * 0.15,
      y: Math.min(from.y, to.y) - Math.abs(to.x - from.x) * 0.18 - coinSize * (1 + Math.random()),
    };
    const p = { t: 0 };
    let lastTrail = 0;
    scene.tweens.add({
      targets: p,
      t: 1,
      delay: i * 70,
      duration: 620 + Math.random() * 120,
      ease: 'Sine.InOut',
      onStart: () => coin.setAlpha(1),
      onUpdate: (tween) => {
        const t = p.t;
        const u = 1 - t;
        coin.setPosition(u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x, u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y);
        coin.setScale(scale * (0.6 + 0.55 * Math.sin(Math.PI * t) + 0.25 * t));
        coin.setAngle(t * 360);
        if (tween.elapsed - lastTrail > 22) { lastTrail = tween.elapsed; trailDot(scene, coin.x, coin.y, coinSize * 0.22); }
      },
      onComplete: () => {
        coin.destroy();
        for (let k = 0; k < 4; k += 1) trailDot(scene, to.x + (Math.random() - 0.5) * coinSize, to.y + (Math.random() - 0.5) * coinSize, coinSize * 0.26);
        landed += 1;
        onCoin(share);
        if (landed === count) onDone();
      },
    });
  });
}
