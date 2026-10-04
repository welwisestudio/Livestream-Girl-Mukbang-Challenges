import Phaser from 'phaser';
import { COLORS } from '../content/theme.js';

export const ATLAS = Object.freeze({
  characterHappy: 0,
  characterEating: 1,
  mascot: 2,
  avatar: 3,
  bowl: 4,
  orangeMix: 5,
  mixingBowl: 6,
  mold: 7,
  plainJelly: 8,
  berries: 9,
  glaze: 10,
  finishedJelly: 11,
  servings: 12,
  hand: 13,
  circularArrow: 14,
  check: 15,
});

const css = (value) => `#${value.toString(16).padStart(6, '0')}`;

export function addAtlasSprite(scene, frame, x, y, { width = 160, height = width, depth = 10 } = {}) {
  return scene.add.image(x, y, 'level1-atlas', frame).setDisplaySize(width, height).setDepth(depth);
}

export function addPastelBackground(scene) {
  return scene.add.image(195, 422, 'kitchen-background').setDisplaySize(390, 844).setDepth(-20);
}

export function addHud(scene, { level = 1, coins = 1000, title = 'ELpam' } = {}) {
  const root = scene.add.container(0, 0).setDepth(70);
  const avatarRing = scene.add.graphics();
  avatarRing.fillStyle(COLORS.paper, 0.97).fillCircle(43, 42, 31);
  avatarRing.lineStyle(3, COLORS.orangeDark).strokeCircle(43, 42, 31);
  const avatar = addAtlasSprite(scene, ATLAS.avatar, 43, 42, { width: 58, height: 58, depth: 71 });

  const profile = scene.add.graphics();
  profile.fillStyle(COLORS.paper, 0.97).fillRoundedRect(69, 17, 142, 52, 18);
  profile.lineStyle(3, COLORS.pinkDark).strokeRoundedRect(69, 17, 142, 52, 18);
  profile.fillStyle(COLORS.orange).fillRoundedRect(72, 49, 69, 17, 8);
  const name = scene.add.text(86, 25, title, {
    fontFamily: 'Arial Rounded MT Bold, Trebuchet MS', fontSize: '14px', fontStyle: 'bold', color: css(COLORS.ink),
  });
  const levelText = scene.add.text(86, 47, `Level ${level}`, {
    fontFamily: 'Arial Rounded MT Bold, Trebuchet MS', fontSize: '11px', fontStyle: 'bold', color: '#ffffff',
  });

  const wallet = scene.add.graphics();
  wallet.fillStyle(COLORS.paper, 0.97).fillRoundedRect(276, 22, 96, 40, 18);
  wallet.lineStyle(3, COLORS.pinkDark).strokeRoundedRect(276, 22, 96, 40, 18);
  wallet.fillStyle(COLORS.lemon).fillCircle(297, 42, 13);
  wallet.lineStyle(3, COLORS.orangeDark).strokeCircle(297, 42, 12);
  wallet.fillStyle(0xffffff, 0.65).fillCircle(293, 38, 4);
  const coinText = scene.add.text(319, 42, String(coins), {
    fontFamily: 'Arial Rounded MT Bold, Trebuchet MS', fontSize: '16px', fontStyle: 'bold', color: css(COLORS.ink),
  }).setOrigin(0, 0.5);

  root.add([avatarRing, avatar, profile, name, levelText, wallet, coinText]);
  root.setData('coinText', coinText);
  return root;
}

export function createButton(scene, { x, y, width = 220, height = 62, label, color = COLORS.orange, onClick, depth = 30 }) {
  const root = scene.add.container(x, y).setDepth(depth);
  const shadow = scene.add.graphics().fillStyle(0x9d5638, 0.28).fillRoundedRect(-width / 2, -height / 2 + 7, width, height, 24);
  const surface = scene.add.graphics();
  surface.fillStyle(color).fillRoundedRect(-width / 2, -height / 2, width, height, 24);
  surface.lineStyle(4, 0xffffff, 0.9).strokeRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8, 20);
  surface.lineStyle(3, COLORS.orangeDark).strokeRoundedRect(-width / 2, -height / 2, width, height, 24);
  surface.fillStyle(0xffffff, 0.3).fillRoundedRect(-width / 2 + 18, -height / 2 + 9, width - 36, 12, 6);
  const text = scene.add.text(0, -1, label, {
    fontFamily: 'Arial Rounded MT Bold, Trebuchet MS', fontSize: '23px', fontStyle: 'bold', color: '#78442f',
    stroke: '#fff7e9', strokeThickness: 5,
  }).setOrigin(0.5);
  root.add([shadow, surface, text]);
  root.setSize(width, height).setInteractive({ useHandCursor: true });
  root.on('pointerdown', () => root.setScale(0.96));
  root.on('pointerout', () => root.setScale(1));
  root.on('pointerup', () => { root.setScale(1); onClick?.(); });
  return root;
}

export function drawCharacter(scene, x, y, { mouthOpen = false, scale = 1 } = {}) {
  const image = addAtlasSprite(scene, mouthOpen ? ATLAS.characterEating : ATLAS.characterHappy, x, y, {
    width: 260 * scale, height: 260 * scale, depth: 10,
  });
  image.setData('mouth', { x, y: y + 5 * scale, radius: 42 * scale });
  return image;
}

export function drawBowl(scene, x, y, { liquid = null, inverted = false } = {}) {
  const frame = inverted ? ATLAS.mold : liquid === null ? ATLAS.bowl : ATLAS.mixingBowl;
  return addAtlasSprite(scene, frame, x, y, { width: 225, height: 225 });
}

export function drawJelly(scene, x, y, { scale = 1, berries = true, glaze = true } = {}) {
  const frame = berries || glaze ? ATLAS.finishedJelly : ATLAS.plainJelly;
  const image = addAtlasSprite(scene, frame, x, y, { width: 205 * scale, height: 205 * scale });
  image.setData('kind', 'jelly');
  return image;
}

export function drawPitcher(scene, x, y, { small = false } = {}) {
  return addAtlasSprite(scene, small ? ATLAS.glaze : ATLAS.orangeMix, x, y, {
    width: small ? 124 : 155, height: small ? 124 : 155,
  });
}

export function drawBerryCluster(scene, x, y) {
  return addAtlasSprite(scene, ATLAS.berries, x, y, { width: 135, height: 135 });
}

export function addStepProgress(scene, current, total = 6) {
  const root = scene.add.container(195, 96).setDepth(65);
  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.paper, 0.96).fillRoundedRect(-115, -18, 230, 36, 17);
  bg.lineStyle(3, COLORS.pinkDark).strokeRoundedRect(-115, -18, 230, 36, 17);
  root.add(bg);
  for (let i = 0; i < total; i += 1) {
    const x = -78 + i * 31;
    const dot = scene.add.graphics();
    dot.fillStyle(i <= current ? COLORS.orange : 0xf6dce4).fillRoundedRect(x - 11, -10, 22, 20, 8);
    dot.lineStyle(2, i <= current ? COLORS.orangeDark : COLORS.pinkDark).strokeRoundedRect(x - 11, -10, 22, 20, 8);
    if (i < current) dot.fillStyle(0xffffff).fillCircle(x, 0, 4);
    root.add(dot);
  }
  return root;
}

export function addInstruction(scene, text) {
  const root = scene.add.container(195, 137).setDepth(64);
  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.paper, 0.9).fillRoundedRect(-133, -17, 266, 34, 16);
  bg.lineStyle(2, COLORS.pink).strokeRoundedRect(-133, -17, 266, 34, 16);
  const label = scene.add.text(0, 0, text, {
    fontFamily: 'Arial Rounded MT Bold, Trebuchet MS', fontSize: '13px', fontStyle: 'bold', color: css(COLORS.ink),
  }).setOrigin(0.5);
  root.add([bg, label]);
  return root;
}

export function addCommentBubble(scene, x, y, text, width = 270) {
  const root = scene.add.container(x, y).setDepth(25);
  const label = scene.add.text(0, 0, text, {
    fontFamily: 'Arial Rounded MT Bold, Trebuchet MS', fontSize: '13px', fontStyle: 'bold', color: '#654b5c',
    align: 'center', wordWrap: { width: width - 32 },
  }).setOrigin(0.5);
  const bg = scene.add.graphics();
  bg.fillStyle(COLORS.paper, 0.97).fillRoundedRect(-width / 2, -label.height / 2 - 9, width, label.height + 18, 13);
  bg.lineStyle(2, 0xa89be2).strokeRoundedRect(-width / 2, -label.height / 2 - 9, width, label.height + 18, 13);
  root.add([bg, label]);
  return root;
}

export function pulseInvalid(scene, gameObject) {
  gameObject.setAngle(0);
  scene.tweens.add({ targets: gameObject, angle: -7, duration: 55, yoyo: true, repeat: 3, onComplete: () => gameObject.setAngle(0) });
}

export function addDragHint(scene, { from, to, circular = false }) {
  if (circular) {
    const arrow = addAtlasSprite(scene, ATLAS.circularArrow, to.x, to.y, { width: 125, height: 125, depth: 80 }).setAlpha(0.88);
    scene.tweens.add({ targets: arrow, angle: 360, duration: 1500, repeat: -1, ease: 'Linear' });
    return arrow;
  }
  const hand = addAtlasSprite(scene, ATLAS.hand, from.x, from.y, { width: 76, height: 76, depth: 80 }).setAlpha(0.9);
  scene.tweens.add({ targets: hand, x: to.x, y: to.y, duration: 1050, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  return hand;
}

export function addCheck(scene, x, y, onClick) {
  const check = addAtlasSprite(scene, ATLAS.check, x, y, { width: 78, height: 78, depth: 50 });
  check.setInteractive({ useHandCursor: true });
  check.on('pointerup', onClick);
  scene.tweens.add({ targets: check, scaleX: check.scaleX * 1.06, scaleY: check.scaleY * 1.06, duration: 600, yoyo: true, repeat: -1 });
  return check;
}
