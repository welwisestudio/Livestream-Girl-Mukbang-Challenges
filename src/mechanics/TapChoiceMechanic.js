export class TapChoiceMechanic {
  constructor({ choices, correctId, onComplete, onInvalid }) {
    this.choices = choices;
    this.correctId = correctId;
    this.onComplete = onComplete;
    this.onInvalid = onInvalid;
    this.active = true;
    for (const choice of choices) {
      choice.gameObject.setInteractive({ useHandCursor: true });
      choice.handler = () => this.handleChoice(choice);
      choice.gameObject.on('pointerdown', choice.handler);
    }
  }

  handleChoice(choice) {
    if (!this.active) return;
    if (choice.id === this.correctId) {
      this.active = false;
      this.onComplete?.(choice);
    } else {
      this.onInvalid?.(choice);
    }
  }

  pause() { this.active = false; }
  resume() { this.active = true; }
  getProgress() { return 0; }
  dispose() {
    for (const choice of this.choices) {
      choice.gameObject.off('pointerdown', choice.handler);
      choice.gameObject.disableInteractive();
    }
  }
}
