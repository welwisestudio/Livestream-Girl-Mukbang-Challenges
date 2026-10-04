import Phaser from 'phaser';
import { getLevel } from '../content/levels.js';
import { COLORS } from '../content/theme.js';
import { addAtlasSprite, addHud, addPastelBackground, ATLAS, createButton, drawCharacter, drawJelly } from '../ui/art.js';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(data) {
    this.level = getLevel(data.levelId);
    this.runId = data.runId;
    this.phase = 'level-up';
    this.debugTargets = {};
  }

  create() {
    this.services = this.registry.get('services');
    addPastelBackground(this);
    const save = this.services.save.snapshot();
    this.hud = addHud(this, { level: save.highestLevel, coins: save.coins, title: 'Stream complete' });
    if (save.highestLevel < this.level.unlocksLevel) this.showLevelUp();
    else this.showReward();
  }

  clearPanel() {
    this.panel?.destroy(true);
    this.debugTargets = {};
  }

  createModal(title) {
    this.clearPanel();
    const root = this.add.container(195, 426).setDepth(20);
    const shadow = this.add.graphics().fillStyle(0x6f5365, 0.2).fillRoundedRect(-166, -267, 332, 550, 34);
    const bg = this.add.graphics().fillStyle(COLORS.paper, 0.98).fillRoundedRect(-166, -275, 332, 550, 34);
    bg.lineStyle(6, 0xffffff).strokeRoundedRect(-161, -270, 322, 540, 30);
    bg.lineStyle(4, COLORS.pinkDark).strokeRoundedRect(-166, -275, 332, 550, 34);
    const heading = this.add.text(0, -226, title, {
      fontFamily: 'Arial Rounded MT Bold, Trebuchet MS', fontSize: '34px', fontStyle: 'bold', color: '#d96f8b', stroke: '#ffffff', strokeThickness: 5,
    }).setOrigin(0.5);
    root.add([shadow, bg, heading]);
    this.panel = root;
    return root;
  }

  showLevelUp() {
    this.phase = 'level-up';
    const panel = this.createModal('Level up!');
    panel.add(addAtlasSprite(this, ATLAS.avatar, 0, -63, { width: 170, height: 170, depth: 22 }));
    const label = this.add.text(0, 82, 'Level 2', { fontFamily: 'Trebuchet MS', fontSize: '27px', fontStyle: 'bold', color: '#63475b' }).setOrigin(0.5);
    const unlock = this.add.text(0, 128, 'New items unlocked', { fontFamily: 'Trebuchet MS', fontSize: '17px', color: '#8b6d80' }).setOrigin(0.5);
    const bowl = addAtlasSprite(this, ATLAS.bowl, -78, 174, { width: 70, height: 70, depth: 22 });
    const berries = addAtlasSprite(this, ATLAS.berries, 0, 174, { width: 70, height: 70, depth: 22 });
    const jelly = addAtlasSprite(this, ATLAS.plainJelly, 78, 174, { width: 70, height: 70, depth: 22 });
    const next = createButton(this, { x: 0, y: 228, width: 190, height: 58, label: 'Next', onClick: () => this.showReward() });
    panel.add([label, unlock, bowl, berries, jelly, next]);
    this.debugTargets = { next: { x: 195, y: 654 } };
  }

  showReward() {
    this.phase = 'reward';
    const panel = this.createModal('Complete!!');
    panel.add(drawCharacter(this, 0, -82, { scale: 0.64 }));
    const jellyLeft = drawJelly(this, -92, 75, { scale: 0.32 });
    const jellyRight = drawJelly(this, 92, 75, { scale: 0.32 });
    const amount = this.add.text(0, 128, `+${this.level.rewardCoins}`, {
      fontFamily: 'Trebuchet MS', fontSize: '38px', fontStyle: 'bold', color: '#e49c36', stroke: '#fff7df', strokeThickness: 5,
    }).setOrigin(0.5);
    const note = this.add.text(0, 174, 'Base Level 1 reward', { fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#8b6d80' }).setOrigin(0.5);
    const claim = createButton(this, { x: 0, y: 230, width: 218, height: 62, label: `Claim ${this.level.rewardCoins}`, onClick: () => this.claimReward() });
    panel.add([jellyLeft, jellyRight, amount, note, claim]);
    this.debugTargets = { claim: { x: 195, y: 656 } };
  }

  async claimReward() {
    if (this.claiming) return;
    this.claiming = true;
    const result = await this.services.rewards.grantLevelCompletion({
      levelId: this.level.id,
      runId: this.runId,
      coins: this.level.rewardCoins,
      unlockLevel: this.level.unlocksLevel,
    });
    this.hud.getData('coinText').setText(String(result.state.coins));
    this.phase = 'returning';
    this.time.delayedCall(420, () => {
      this.cameras.main.fadeOut(280, 255, 247, 241);
      this.time.delayedCall(280, () => this.scene.start('Home'));
    });
  }

  getDebugSnapshot() {
    return { scene: 'Result', phase: this.phase, targets: this.debugTargets, save: this.services.save.snapshot() };
  }
}
