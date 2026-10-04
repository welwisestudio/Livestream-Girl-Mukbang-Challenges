// Pick one option from several. Wrong/locked options give feedback and never advance;
// once the correct option is chosen further taps are ignored (no double advance).
export class TapChoiceMechanic {
  constructor({ choices, correctId, onComplete, onInvalid }) {
    this.choices = choices;
    this.correctId = correctId;
    this.onComplete = onComplete;
    this.onInvalid = onInvalid;
    this.active = true;
    for (const choice of choices) {
      choice.handler = () => this.handleChoice(choice);
      choice.target.on('pointerdown', choice.handler);
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

  dispose() {
    this.active = false;
    for (const choice of this.choices) choice.target.off('pointerdown', choice.handler);
  }
}
