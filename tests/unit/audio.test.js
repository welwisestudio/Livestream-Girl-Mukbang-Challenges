import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioService } from '../../src/services/AudioService.js';

class MemorySave {
  constructor(audio = { music: true, sfx: true }) {
    this.loaded = true;
    this.state = { audio };
  }
  snapshot() { return structuredClone(this.state); }
  async mutate(change) { change(this.state); }
}

test('music and sound switches are independent and persisted', async () => {
  const save = new MemorySave();
  const audio = new AudioService(save);
  audio.setMusicEnabled(false);
  assert.equal(audio.canPlayMusic, false);
  assert.equal(audio.canPlaySfx, true);
  audio.setSfxEnabled(false);
  assert.deepEqual(save.state.audio, { music: false, sfx: false });
});

test('saved audio preferences restore and platform mute stays independent', () => {
  const audio = new AudioService(new MemorySave({ music: false, sfx: true }));
  assert.deepEqual(audio.snapshot(), { music: false, sfx: true, platformMuted: false, paused: false });
  audio.setPlatformMuted(true);
  assert.equal(audio.canPlaySfx, false);
  audio.setPlatformMuted(false);
  assert.equal(audio.canPlaySfx, true);
  assert.equal(audio.musicEnabled, false);
});
