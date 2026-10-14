import { clamp } from './layout.js';
import { addText } from './text.js';
import { UI_OUTLINE, dropShadow, roundedBox } from './draw.js';
import { COLORS, CSS } from '../content/theme.js';

// Shared visuals of the supermarket screens (references: reference/input/Store-*.png).

export const STORE_DEPTH = Object.freeze({
  background: -60,
  shelf: 0,
  basketBack: 20,
  basketItems: 21,
  basketFront: 22,
  ui: 40,
  feedback: 90,
  dialog: 110,
});

// Fractions measured on the generated art (scripts/build-assets.mjs output).
export const STORE_ART = Object.freeze({
  shelfLeft: 0.165, // x where the shelf boards start (pink and matcha share the geometry)
  // Per shelf: y of the board surface where products stand, y of the price-tag band centre,
  // and the free height above the surface.
  shelves: [
    { stand: 0.372, tag: 0.413, room: 0.2 },
    { stand: 0.57, tag: 0.611, room: 0.13 },
    { stand: 0.768, tag: 0.808, room: 0.13 },
  ],
  basketRim: 0.36, // store-basket: front rim line (contents sit behind the part below it)
  scan: {
    anchorX: 0.48,
    glass: { x0: 0.25, x1: 0.736, y0: 0.265, y1: 0.563 },
    slot: { x: 0.49, y: 0.617 },
    base: 0.658, // bottom edge of the scanner body (the counter pill sits just below it)
    glassRadius: 0.2, // corner radius of the glass window, as a share of its width
    belt: { y0: 0.7, y1: 0.93, x0: 0.16, x1: 0.84 },
  },
  priceTagText: 0.6, // store-price-tag: x centre of the empty part
});

// Full-height backdrop; wide screens get mirrored copies at the sides so every seam matches.
export class ShopBackdrop {
  constructor(scene, texture) {
    this.scene = scene;
    this.texture = texture;
    this.tiles = [];
    this.addTile();
    // Mirrored side copies only extend the room on wide screens; a pale veil keeps their
    // repeated objects (scanner, sign lettering) from reading as part of the scene.
    this.veils = [0, 1].map(() => scene.add.rectangle(0, 0, 10, 10, 0xfff3f7, 0.3).setOrigin(0, 0).setDepth(STORE_DEPTH.background + 1).setVisible(false));
  }

  addTile() {
    this.tiles.push(this.scene.add.image(0, 0, this.texture).setOrigin(0, 0).setDepth(STORE_DEPTH.background));
  }

  setTexture(texture) {
    this.texture = texture;
    this.tiles.forEach((t) => t.setTexture(texture));
  }

  // left = screen x of the main copy's left edge.
  layout(f, left) {
    const main = this.tiles[0];
    const scale = f.H / main.height;
    const w = main.width * scale;
    this.scale = scale;
    this.left = left;
    this.width = w;
    const needLeft = Math.max(0, Math.ceil(left / w));
    const needRight = Math.max(0, Math.ceil((f.W - (left + w)) / w));
    const ks = [0];
    for (let k = 1; k <= needLeft; k += 1) ks.push(-k);
    for (let k = 1; k <= needRight; k += 1) ks.push(k);
    while (this.tiles.length < ks.length) this.addTile();
    this.tiles.forEach((tile, i) => {
      const k = ks[i];
      tile.setVisible(k !== undefined);
      if (k === undefined) return;
      tile.setScale(scale).setFlipX(Math.abs(k) % 2 === 1).setPosition(left + k * w, 0);
    });
    const [l, r] = this.veils;
    // Only outside the gameplay column: inside it the copies are just more shelf/counter.
    const lEdge = Math.min(left, f.colLeft);
    const rEdge = Math.max(left + w, f.colRight);
    l.setVisible(lEdge > 0).setPosition(0, 0).setSize(Math.max(0, lEdge), f.H);
    r.setVisible(rEdge < f.W).setPosition(rEdge, 0).setSize(Math.max(0, f.W - rEdge), f.H);
  }
}

// Coin balance pill at the top centre (reference: coin stack + white pill).
// Wallet of the Supermarket, checkout and Canteen screens: the same plate as the shared top HUD
// wallet (paper fill, grey 3 px outline, soft drop shadow, coin stack over its left end).
export class CoinPill {
  constructor(scene, coins) {
    this.g = scene.add.graphics().setDepth(STORE_DEPTH.ui);
    this.coin = scene.add.image(0, 0, 'lobby-coins').setDepth(STORE_DEPTH.ui + 1);
    this.text = addText(scene, 0, 0, String(coins), { size: 20, weight: '700', color: CSS.ink, originX: 0 }).setDepth(STORE_DEPTH.ui + 1);
    // Plate geometry for callers that align to it (x/y centre, display size).
    this.pill = { x: 0, y: 0, displayWidth: 0, displayHeight: 0 };
    this.scene = scene;
    this.value = coins;
  }

  layout(cx, cy, width) {
    this.box = { cx, cy, width };
    const h = Math.round(clamp(width / 2.84, 42, 56));
    const left = cx - width / 2;
    this.g.clear();
    dropShadow(this.g, left, cy - h / 2, width, h);
    roundedBox(this.g, left, cy - h / 2, width, h, { fill: COLORS.paper, stroke: COLORS.greyDark, strokeWidth: UI_OUTLINE });
    Object.assign(this.pill, { x: cx, y: cy, displayWidth: width, displayHeight: h });
    const coinSize = Math.round(clamp(h * 1.08, 44, 62));
    this.coinScale = coinSize / Math.max(this.coin.width, this.coin.height);
    this.coin.setScale(this.coinScale).setPosition(left + coinSize * 0.12, cy);
    this.text.setFontSize(Math.round(clamp(h * 0.47, 19, 25)));
    const textX = this.coin.x + this.coin.displayWidth / 2 + 8;
    this.text.setOrigin(0, 0.5).setPosition(Math.min(textX, left + width - this.text.width - 10), cy);
  }

  set(value) {
    this.value = value;
    this.text.setText(String(value));
    if (this.box) this.layout(this.box.cx, this.box.cy, this.box.width);
  }

  // Counts down/up to the new value (used after paying).
  animateTo(value, duration = 700) {
    const state = { v: this.value };
    this.scene.tweens.add({ targets: state, v: value, duration, ease: 'Sine.Out', onUpdate: () => this.text.setText(String(Math.round(state.v))), onComplete: () => this.set(value) });
    this.scene.tweens.killTweensOf(this.coin);
    this.coin.setScale(this.coinScale ?? this.coin.scale);
    this.scene.tweens.add({ targets: this.coin, scale: this.coin.scale * 1.2, duration: 120, yoyo: true });
  }

  rect() {
    const p = this.pill;
    const left = Math.min(p.x - p.displayWidth / 2, this.coin.x - this.coin.displayWidth / 2);
    return { x: left, y: Math.min(p.y - p.displayHeight / 2, this.coin.y - this.coin.displayHeight / 2), w: p.x + p.displayWidth / 2 - left, h: Math.max(p.displayHeight, this.coin.displayHeight) };
  }
}

// Short message bubble in the middle of the screen.
export class Toast {
  constructor(scene) {
    this.scene = scene;
    this.bg = scene.add.graphics().setDepth(STORE_DEPTH.feedback).setVisible(false);
    this.text = addText(scene, 0, 0, '', { size: 18, weight: '700', color: '#ffffff' }).setDepth(STORE_DEPTH.feedback + 1).setVisible(false);
    this.message = null;
  }

  show(message, f, y, color = 0x6a3f57) {
    this.message = message;
    this.text.setText(message).setFontSize(Math.round(clamp(17 * f.ui, 16, 21))).setPosition(f.cx, y).setVisible(true).setAlpha(1);
    const w = Math.min(this.text.width + 34, f.colW - 24);
    const h = this.text.height + 16;
    this.bg.clear().setVisible(true).setAlpha(1);
    roundedBox(this.bg, f.cx - w / 2, y - h / 2, w, h, { fill: color, alpha: 0.9 });
    this.scene.tweens.killTweensOf([this.text, this.bg]);
    this.scene.tweens.add({ targets: [this.text, this.bg], alpha: 0, delay: 1300, duration: 260, onComplete: () => { this.text.setVisible(false); this.bg.setVisible(false); this.message = null; } });
  }
}

export function imageRect(image) {
  return { x: image.x - image.displayWidth * image.originX, y: image.y - image.displayHeight * image.originY, w: image.displayWidth, h: image.displayHeight };
}
