import { BaseScene } from './BaseScene.js';
import { CAMPAIGN_ORDER } from '../content/levels.js';
import { DEPTH, actionBand, clamp } from '../ui/layout.js';
import { RoomBackground } from '../ui/background.js';
import { Hud } from '../ui/hud.js';
import { PillButton } from '../ui/controls.js';
import { HeaderPill } from '../ui/panels.js';
import { HintHand, Streamer } from '../ui/actors.js';

export class HomeScene extends BaseScene {
  constructor() { super('Home'); }

  create() {
    this.leaving = false;
    const services = this.services();
    const save = services.save.snapshot();
    this.room = new RoomBackground(this);
    this.hud = new Hud(this, { name: 'Player', level: save.highestLevel, coins: save.coins, xp: save.highestLevel > 1 ? 0.05 : 0.15 });
    this.header = new HeaderPill(this, { label: 'LIVE KITCHEN' });
    this.streamer = new Streamer(this);
    this.streamer.idle();
    this.mascot = this.add.image(0, 0, 'mascot').setDepth(DEPTH.food);
    this.dish = this.add.image(0, 0, 'jelly-finished').setDepth(DEPTH.food);
    this.bubble = this.add.graphics().setDepth(DEPTH.feed);
    this.bubbleDish = this.add.image(0, 0, 'jelly-finished').setDepth(DEPTH.feed + 1);
    this.start = new PillButton(this, { label: 'Start Live', live: true, onClick: () => this.startLevel() });
    this.hint = new HintHand(this);
    this.bindViewport();
    this.cameras.main.fadeIn(260, 255, 240, 245);
    services.platform.gameReady();
  }

  layout(f) {
    const gap = Math.round(clamp(f.h * 0.016, 8, 16));
    const headerSize = Math.round(clamp(22 * f.ui, 20, 28));
    const headerY = f.hud.bottom + gap + (headerSize * 2.15) / 2;
    const headerBottom = headerY + (headerSize * 2.15) / 2;
    const btnH = Math.round(clamp(66 * f.ui, 60, 80));
    const band = actionBand(f, btnH * 1.09);
    const tableY = Math.round(f.top + f.h * (f.short ? 0.6 : 0.57));
    const charH = clamp(Math.min((tableY - headerBottom - gap) / 0.8, f.colW * 0.88), 210, 480);
    this.room.layout(f, tableY);
    this.hud.layout(f);
    this.header.layout({ x: f.cx, y: headerY, frame: f });
    this.streamer.layout({ x: f.cx, bottom: tableY + charH * 0.2, height: charH });

    // Counter props: today's dish in front, the jelly mascot to the side.
    const counterH = band.top - tableY;
    const dishW = clamp(f.colW * 0.38, 130, 230);
    this.dish.setScale(dishW / this.dish.width).setPosition(f.cx - Math.min(f.colW * 0.2, 120), tableY + Math.min(counterH * 0.42, dishW * 0.5));
    const mascotW = clamp(f.colW * 0.24, 86, 150);
    this.tweens.killTweensOf(this.mascot);
    const my = tableY + Math.min(counterH * 0.32, mascotW * 0.5);
    this.mascot.setScale(mascotW / this.mascot.width).setPosition(f.cx + Math.min(f.colW * 0.26, 150), my);
    this.tweens.add({ targets: this.mascot, y: my - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Thought bubble with the dish she wants to make, beside her head.
    const r = clamp(40 * f.art, 34, 58);
    const head = this.streamer.image;
    const bx = Math.max(f.colLeft + r + f.pad, head.x - head.displayWidth * 0.52);
    const by = head.y - head.displayHeight * 0.62;
    this.bubble.clear();
    this.bubble.fillStyle(0xfffaf4, 0.96).fillCircle(bx, by, r);
    this.bubble.lineStyle(3, 0xe0789a, 1).strokeCircle(bx, by, r);
    this.bubble.fillStyle(0xfffaf4, 0.96).fillCircle(bx + r * 0.75, by + r * 1.05, r * 0.24).fillCircle(bx + r * 1.1, by + r * 1.45, r * 0.14);
    this.bubble.lineStyle(2, 0xe0789a, 1).strokeCircle(bx + r * 0.75, by + r * 1.05, r * 0.24).strokeCircle(bx + r * 1.1, by + r * 1.45, r * 0.14);
    this.bubbleDish.setScale((r * 1.45) / this.bubbleDish.width).setPosition(bx, by + 2);

    this.start.layout({ x: f.cx, y: band.centerY, frame: f, minWidth: 260, scale: 1.08 });
    this.hint.tap(f, { x: f.cx + this.start.box.width * 0.28, y: band.centerY + 6 });
  }

  startLevel() {
    if (this.leaving) return;
    this.hint.hide();
    this.fadeTo('Level', { levelId: CAMPAIGN_ORDER[0] });
  }

  getDebugSnapshot() {
    return { scene: 'Home', phase: 'home', targets: { start: this.start.center() }, save: this.services().save.snapshot() };
  }
}
