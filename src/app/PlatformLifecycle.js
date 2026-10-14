// Applies the host lifecycle (from whichever platform adapter is active) to the game:
//
// Host pause  → the Phaser loop sleeps (no update, tweens, timers or rendering), pointer and
//               keyboard input is ignored, audio gets the 'platform' pause reason, the playtime
//               clock stops and unsaved progress is flushed once. Nothing advances while paused.
// Host resume → only the host pause is lifted: the loop wakes without a time jump (Phaser
//               resets its delta on wake), input returns, audio resumes where it stopped.
//               A pause the player opened (Part-Time menu, dialogs) stays open; its own reason
//               ('menu') is separate.
// Host mute   → AudioService.platformMuted: no sound at all, whatever the player's Music / Sounds
//               switches say; unmute restores exactly those saved switches (never rewritten).
export class PlatformLifecycle {
  constructor({ platform, audio, save, playtime }) {
    this.platform = platform;
    this.audio = audio;
    this.save = save;
    this.playtime = playtime;
    this.game = null;
    this.state = { paused: false, audioMuted: false };
    this.pauses = 0;
    this.listeners = new Set();
    this.unsubscribe = platform.subscribe((state) => this.apply(state));
  }

  attachGame(game) {
    this.game = game;
    // Phaser starts its loop right after READY; a pause that arrived during boot applies then.
    if (game.isRunning) this.applyToGame();
    else game.events?.once?.('ready', () => queueMicrotask(() => this.applyToGame()));
  }

  get paused() { return this.state.paused; }

  apply(next) {
    const wasPaused = this.state.paused;
    this.state = { paused: Boolean(next.paused), audioMuted: Boolean(next.audioMuted) };
    this.audio?.setPlatformMuted(this.state.audioMuted);
    this.audio?.setPaused('platform', this.state.paused);
    if (this.state.paused && !wasPaused) {
      this.pauses += 1;
      // Save on pause (the host may evict the game shortly after).
      this.playtime?.flush()?.catch?.(() => {});
      this.save?.flush()?.catch?.(() => {});
    }
    this.save?.setPaused?.(this.state.paused);
    this.applyToGame();
    for (const listener of [...this.listeners]) listener({ ...this.state });
  }

  applyToGame() {
    const game = this.game;
    if (!game?.loop || !game.isRunning) return;
    // TimeStep.pause() records the pause time and resume() resets the delta, so the first
    // frame after resume does not see the paused time (wake() alone keeps the old delta).
    if (this.state.paused) {
      if (!this.loopAsleep) {
        game.loop.pause();
        game.loop.sleep();
        this.loopAsleep = true;
      }
      if (game.input) game.input.enabled = false;
    } else {
      if (this.loopAsleep) {
        game.loop.resume();
        game.loop.wake();
        this.loopAsleep = false;
      }
      if (game.input) game.input.enabled = true;
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  dispose() {
    this.unsubscribe?.();
    this.listeners.clear();
  }
}
