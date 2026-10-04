export class AudioService {
  constructor() {
    this.userMuted = false;
    this.platformMuted = false;
    this.pauseReasons = new Set();
  }

  setUserMuted(value) { this.userMuted = Boolean(value); }
  setPlatformMuted(value) { this.platformMuted = Boolean(value); }
  setPaused(reason, value) {
    if (value) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);
  }
  get canPlay() {
    return !this.userMuted && !this.platformMuted && this.pauseReasons.size === 0;
  }
}
