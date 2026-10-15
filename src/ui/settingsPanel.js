import { DEPTH, clamp, fitScale } from './layout.js';
import { addText } from './text.js';
import { CSS } from '../content/theme.js';
import { pressable } from './pressFeedback.js';

// Measured from settings-panel.webp (705×1100): the painted orange header runs from roughly
// y=20 to y=126. Keeping its text on this centre line makes the top/bottom spacing symmetrical
// at every responsive scale.
const HEADER_TOP = 20 / 1100;
const HEADER_BOTTOM = 126 / 1100;
const HEADER_CENTER = (HEADER_TOP + HEADER_BOTTOM) / 2 - 0.5;

export class SettingsPanel {
  constructor(scene, { onClose }) {
    this.scene = scene;
    this.onClose = onClose;
    this.open = false;
    this.veil = scene.add.graphics().setDepth(DEPTH.modal - 2).setVisible(false);
    this.blocker = scene.add.zone(0, 0, 1, 1).setOrigin(0).setDepth(DEPTH.modal - 1);
    this.root = scene.add.container(0, 0).setDepth(DEPTH.modal).setVisible(false);
    this.panel = scene.add.image(0, 0, 'settings-panel');
    this.title = addText(scene, 0, 0, 'SETTINGS', { size: 31, weight: '700', color: CSS.white, stroke: '#a8552a', strokeWidth: 5 });
    this.soundIcon = scene.add.image(0, 0, 'settings-sound');
    this.musicIcon = scene.add.image(0, 0, 'settings-music');
    this.soundTrack = scene.add.image(0, 0, 'settings-toggle');
    this.musicTrack = scene.add.image(0, 0, 'settings-toggle');
    this.soundKnob = scene.add.image(0, 0, 'settings-knob');
    this.musicKnob = scene.add.image(0, 0, 'settings-knob');
    this.home = scene.add.image(0, 0, 'settings-home');
    this.homeText = addText(scene, 0, 0, 'Back Home', { size: 25, weight: '700', color: CSS.white, stroke: '#a8552a', strokeWidth: 5 });
    this.soundZone = scene.add.zone(0, 0, 1, 1).setInteractive({ useHandCursor: true });
    this.musicZone = scene.add.zone(0, 0, 1, 1).setInteractive({ useHandCursor: true });
    this.homeZone = scene.add.zone(0, 0, 1, 1).setInteractive({ useHandCursor: true });
    this.root.add([
      this.panel, this.title,
      this.soundIcon, this.soundTrack, this.soundKnob, this.soundZone,
      this.musicIcon, this.musicTrack, this.musicKnob, this.musicZone,
      this.home, this.homeText, this.homeZone,
    ]);

    // Rows act on touch-down and play their own toggle/close sounds.
    pressable(this.soundZone, { target: this.soundIcon, trigger: 'down', sound: null });
    pressable(this.musicZone, { target: this.musicIcon, trigger: 'down', sound: null });
    pressable(this.homeZone, { target: this.home, trigger: 'down', sound: null });
    this.soundZone.on('pointerdown', () => this.toggleSfx());
    this.musicZone.on('pointerdown', () => this.toggleMusic());
    this.homeZone.on('pointerdown', () => {
      scene.services().audio.playSfx('close');
      this.hide();
      this.onClose?.();
    });
    this.disableInput();
  }

  disableInput() {
    this.blocker.disableInteractive();
    this.soundZone.disableInteractive();
    this.musicZone.disableInteractive();
    this.homeZone.disableInteractive();
  }

  enableInput() {
    this.blocker.setInteractive();
    this.soundZone.setInteractive({ useHandCursor: true });
    this.musicZone.setInteractive({ useHandCursor: true });
    this.homeZone.setInteractive({ useHandCursor: true });
  }

  show(frame) {
    this.open = true;
    this.veil.setVisible(true);
    this.root.setVisible(true).setScale(0.92).setAlpha(0);
    this.enableInput();
    this.layout(frame);
    this.scene.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: 170, ease: 'Back.Out' });
  }

  hide() {
    this.open = false;
    this.disableInput();
    this.veil.setVisible(false);
    this.root.setVisible(false);
  }

  toggleMusic() {
    const audio = this.scene.services().audio;
    audio.setMusicEnabled(!audio.musicEnabled);
    if (audio.musicEnabled) audio.playSfx('toggle');
    this.updateState();
  }

  toggleSfx() {
    const audio = this.scene.services().audio;
    if (audio.sfxEnabled) audio.playSfx('toggle');
    audio.setSfxEnabled(!audio.sfxEnabled);
    if (audio.sfxEnabled) audio.playSfx('toggle');
    this.updateState();
  }

  updateState() {
    const audio = this.scene.services().audio;
    const apply = (track, knob, enabled) => {
      track.setTint(enabled ? 0xffffff : 0xb9adb5);
      knob.setPosition(this.toggleX + (enabled ? this.trackW * 0.24 : -this.trackW * 0.24), knob.y);
    };
    apply(this.soundTrack, this.soundKnob, audio.sfxEnabled);
    apply(this.musicTrack, this.musicKnob, audio.musicEnabled);
  }

  layout(frame) {
    if (!this.open) return;
    this.veil.clear().fillStyle(0x5a4052, 0.58).fillRect(0, 0, frame.W, frame.H);
    this.blocker.setPosition(0, 0).setSize(frame.W, frame.H);

    const maxH = Math.min(frame.h - 20, frame.form === 'desktop' ? 650 : 700);
    const maxW = Math.min(frame.w - 20, 350);
    const scale = fitScale(this.panel.width, this.panel.height, maxW, maxH);
    const panelW = this.panel.width * scale;
    const panelH = this.panel.height * scale;
    this.root.setPosition(frame.cx, frame.top + frame.h / 2);
    this.panel.setScale(scale);
    const headerH = panelH * (HEADER_BOTTOM - HEADER_TOP);
    const titleSize = Math.min(clamp(panelW * 0.105, 22, 34), Math.max(20, headerH - 16));
    this.title.setFontSize(Math.round(titleSize)).setPosition(0, panelH * HEADER_CENTER);

    const iconSize = Math.round(clamp(panelW * 0.22, 48, 76));
    this.trackW = Math.round(clamp(panelW * 0.36, 82, 126));
    const trackScale = this.trackW / this.soundTrack.width;
    const knobSize = Math.round(this.trackW * 0.31);
    const knobScale = knobSize / Math.max(this.soundKnob.width, this.soundKnob.height);
    const iconX = -panelW * 0.24;
    this.toggleX = panelW * 0.17;
    const rows = [-panelH * 0.135, panelH * 0.095];
    this.soundIcon.setScale(iconSize / Math.max(this.soundIcon.width, this.soundIcon.height)).setPosition(iconX, rows[0]);
    this.musicIcon.setScale(iconSize / Math.max(this.musicIcon.width, this.musicIcon.height)).setPosition(iconX, rows[1]);
    this.soundTrack.setScale(trackScale).setPosition(this.toggleX, rows[0]);
    this.musicTrack.setScale(trackScale).setPosition(this.toggleX, rows[1]);
    this.soundKnob.setScale(knobScale).setPosition(this.toggleX, rows[0]);
    this.musicKnob.setScale(knobScale).setPosition(this.toggleX, rows[1]);
    const rowW = panelW * 0.78;
    const rowH = Math.max(64, panelH * 0.16);
    this.soundZone.setPosition(0, rows[0]).setSize(rowW, rowH);
    this.musicZone.setPosition(0, rows[1]).setSize(rowW, rowH);

    const homeW = panelW * 0.68;
    const homeScale = homeW / this.home.width;
    const homeY = panelH * 0.338;
    this.home.setScale(homeScale).setPosition(0, homeY);
    this.homeText.setFontSize(Math.round(clamp(panelW * 0.082, 19, 28))).setPosition(0, homeY - 1);
    this.homeZone.setPosition(0, homeY).setSize(homeW, Math.max(54, this.home.displayHeight));
    this.updateState();

    this.rect = { x: frame.cx - panelW / 2, y: frame.top + frame.h / 2 - panelH / 2, w: panelW, h: panelH };
    this.headerRect = {
      x: this.rect.x,
      y: this.rect.y + panelH * HEADER_TOP,
      w: panelW,
      h: panelH * (HEADER_BOTTOM - HEADER_TOP),
    };
  }

  geometry() {
    if (!this.rect || !this.headerRect) return { rect: this.rect ?? null, header: null, title: null };
    const scale = this.root.scaleX;
    const titleW = this.title.displayWidth * scale;
    const titleH = this.title.displayHeight * scale;
    const titleX = this.root.x + this.title.x * scale;
    const titleY = this.root.y + this.title.y * scale;
    return {
      rect: { ...this.rect },
      header: { ...this.headerRect },
      title: { x: titleX - titleW / 2, y: titleY - titleH / 2, w: titleW, h: titleH },
    };
  }

  targets() {
    const world = (zone) => ({ x: this.root.x + zone.x, y: this.root.y + zone.y });
    return { sound: world(this.soundZone), music: world(this.musicZone), backHome: world(this.homeZone) };
  }

  destroy() {
    this.veil.destroy();
    this.blocker.destroy();
    this.root.destroy(true);
  }
}
