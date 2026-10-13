import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { AudioService } from '../../src/services/AudioService.js';
import { AUDIO_PATH, MUSIC, SFX, SOUND_FILES, MOTION_SFX, STIR_LOOP, cookLoop } from '../../src/content/audio.js';

class MemorySave {
  constructor(audio = { music: true, sfx: true }) {
    this.loaded = true;
    this.state = { audio };
  }
  snapshot() { return structuredClone(this.state); }
  async mutate(change) { change(this.state); }
}

// Minimal Web Audio stand-in: records started / stopped sources.
function fakeContext() {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const ctx = {
    state: 'running', currentTime: 0, started: [], stopped: [],
    createGain: () => ({ gain: param(), connect: (n) => n }),
    createBufferSource: () => {
      const source = {
        playbackRate: param(), loop: false,
        connect: (n) => n,
        start: (...args) => ctx.started.push({ source, args }),
        stop: () => ctx.stopped.push(source),
        addEventListener() {},
      };
      return source;
    },
    suspend: async () => { ctx.state = 'suspended'; },
    resume: async () => { ctx.state = 'running'; },
  };
  return ctx;
}

function liveService(save = new MemorySave()) {
  const audio = new AudioService(save);
  audio.context = fakeContext();
  audio.bus = { master: {}, music: {}, ui: {}, sfx: {} };
  for (const key of [...SOUND_FILES, MUSIC.file]) audio.buffers.set(key, { duration: key === MUSIC.file ? 111.36 : 6 });
  return audio;
}

test('music and sound switches are independent and persisted', async () => {
  const save = new MemorySave();
  const audio = new AudioService(save);
  audio.setMusicEnabled(false);
  assert.equal(audio.canPlayMusic, false);
  assert.equal(audio.canPlaySfx, true);
  audio.setSfxEnabled(false);
  assert.deepEqual(save.state.audio, { music: false, sfx: false, musicVolume: 1, sfxVolume: 1 });
  audio.setMusicVolume(0.4);
  audio.setSfxVolume(7);
  assert.deepEqual(save.state.audio, { music: false, sfx: false, musicVolume: 0.4, sfxVolume: 1 });
});

test('saved audio preferences restore and platform mute stays independent', () => {
  const audio = new AudioService(new MemorySave({ music: false, sfx: true, musicVolume: 0.5 }));
  assert.deepEqual(audio.snapshot(), { music: false, sfx: true, platformMuted: false, paused: false });
  assert.equal(audio.musicVolume, 0.5);
  audio.setPlatformMuted(true);
  assert.equal(audio.canPlaySfx, false);
  audio.setPlatformMuted(false);
  assert.equal(audio.canPlaySfx, true);
  assert.equal(audio.musicEnabled, false);
});

test('every sound id points to a shipped file and every shipped file is used', () => {
  const used = new Set(Object.values(SFX).map((def) => def.file));
  for (const [id, def] of Object.entries(SFX)) {
    assert.ok(SOUND_FILES.includes(def.file), `${id} uses unknown file ${def.file}`);
    assert.ok(['ui', 'sfx'].includes(def.bus), `${id} bus`);
    assert.ok(def.volume > 0 && def.volume <= 1, `${id} volume`);
    for (const [start, length] of def.slices ?? []) assert.ok(start >= 0 && length > 0, `${id} slice`);
    if (def.loop) assert.ok(def.loop[1] > def.loop[0], `${id} loop`);
  }
  for (const file of SOUND_FILES) {
    assert.ok(used.has(file), `${file} is shipped but unused`);
    const path = `public/${AUDIO_PATH}${file}.ogg`;
    assert.ok(existsSync(path) && statSync(path).size > 1000, `${path} missing`);
  }
  assert.ok(existsSync(`public/${AUDIO_PATH}${MUSIC.file}.ogg`));
  for (const id of [...Object.values(MOTION_SFX), ...Object.values(STIR_LOOP), cookLoop({ action: 'FRY' }), cookLoop({ action: 'BOIL' }), cookLoop({ action: 'BAKE' })]) {
    assert.ok(SFX[id], `mapped id ${id} exists`);
  }
});

test('rapid repeats are dropped and overlapping copies are capped', () => {
  const audio = liveService();
  let t = 1000;
  const realNow = performance.now;
  performance.now = () => t;
  try {
    assert.equal(audio.playSfx('cut'), true);
    t += 20;
    assert.equal(audio.playSfx('cut'), false, 'inside the gap');
    for (let i = 0; i < 6; i += 1) { t += SFX.cut.gap + 1; audio.playSfx('cut'); }
    assert.ok(audio.voices.get('cut').length <= SFX.cut.voices);
  } finally {
    performance.now = realNow;
  }
});

test('held sounds keep one loop alive and pause stops everything without a queue', async () => {
  const audio = liveService();
  for (let i = 0; i < 20; i += 1) audio.sustain('stir', 200);
  assert.deepEqual([...audio.loops.keys()], ['stir']);
  audio.startLoop('fry');
  assert.equal(audio.loops.size, 2);
  audio.setPaused('ad', true);
  assert.equal(audio.loops.size, 0);
  assert.equal(audio.playSfx('tap'), false, 'no effect while paused');
  audio.setPaused('ad', false);
  assert.equal(audio.loops.size, 0, 'loops are not restarted after resume');
});

test('music runs as one looping instance and resumes from where it stopped', async () => {
  const audio = liveService();
  audio.syncMusic();
  audio.syncMusic();
  const musicStarts = () => audio.context.started.filter((s) => s.source.loop && s.source.buffer?.duration === 111.36);
  assert.equal(musicStarts().length, 1);
  audio.context.currentTime = 30;
  audio.setMusicEnabled(false);
  assert.equal(audio.music, null);
  assert.equal(Math.round(audio.musicOffset), 30);
  audio.setMusicEnabled(true);
  assert.equal(musicStarts().length, 2);
  assert.equal(Math.round(musicStarts()[1].args[1]), 30, 'second start continues at 30 s');
});
