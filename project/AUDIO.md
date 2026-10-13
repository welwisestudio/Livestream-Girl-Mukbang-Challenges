# Audio (2026-10-13)

Sources supplied by the designer: `reference/input/BackgroundMusic.ogg` and `reference/input/Sounds.zip` (22 OGG clips, mono 44.1 kHz). Nothing was generated or synthesized; the procedural placeholder melody and tones are gone. Runtime copies are in `public/assets/audio/` (20 files, 1.9 MB). The code table is `src/content/audio.js` and the manager is `src/services/AudioService.js`.

## How it works

- There is one `AudioService`, using one Web Audio context with three buses (music, ui, sfx) under a master gain and a soft limiter. Phaser audio stays off (`audio.noAudio`). Scenes only call `playSfx(id)`, `sustain(id)`, `startLoop(id)` or `stopLoop(id)`.
- Playback is allowed only when the player setting is on, there is no platform mute, and there is no platform, ad, tab-hidden or Part Time pause-menu pause. A pause or mute stops every effect and loop immediately and suspends the context. Nothing is queued for after resume. One exception: a sound asked for in the ≤400 ms while the context is resuming after an ad (the reward chime) is played once the context is running.
- Loading:
  - SFX are loaded by the Boot loader as binary, so they count in the loading bar. A missing sound is logged and the game still starts.
  - The music is fetched in the background after Boot.
  - Everything is decoded on an OfflineAudioContext. The live context is created on the first gesture (pointerdown, pointerup, touchend or keydown).
- Music:
  - It is a single looping `AudioBufferSourceNode`, which gives a gapless sample-accurate loop and a 0.9 s fade-in.
  - It is never touched by scene changes.
  - After a pause, mute or the Music switch it continues from the stored position.
  - Measured: one start across 14 levels of scene changes, and one instance at all times.
- Anti-spam:
  - Each id has a `gap` (minimum ms between plays) and a `voices` cap (the oldest copy is cut).
  - Multi-hit clips are cut into single hits (`slices`), and the same hit is never used twice in a row.
  - The playback rate varies by a few percent.
  - Held sounds (stir, squeeze, sprinkle) are kept alive only while the finger moves: `sustain` has a 200–260 ms hold, and the sound fades out when the finger stops.
  - Loops end with their step, and all loops stop on scene shutdown.
- Settings:
  - The existing Music and Sounds switches.
  - `setMusicVolume` and `setSfxVolume` (0–1, saved as `audio.musicVolume` and `audio.sfxVolume`) exist in the service and save. There is no slider UI yet, because that needs new generated art.

## Volume defaults

| Bus / group | Value | Measured loudness as played |
|---|---|---|
| Music | gain 0.30 × music volume 1.0 | −27 dB RMS, peak −11.7 dB |
| UI bus | 0.8 × sound volume 1.0 | taps and selections −17…−18 dB |
| Gameplay bus | 0.9 × sound volume 1.0 | short hits −16…−22 dB, chimes −19…−23, held loops −21…−25 |

Values were set from measured loudness of each slice (not by ear): frequent short sounds (tap, place, bite) were lowered 3–6 dB. Listening on real speakers or headphones is still needed.

## Sound map

| Source clip (Sounds.zip) | Runtime file | What it is (measured) | Sound id → where it plays |
|---|---|---|---|
| Bubble.ogg | bubble.ogg | single tonal pop (0.5 s silence before it is skipped) | `tap` every button (press feedback, default); `close` (lower) close/back buttons; `ready` food is cooked; `unmold` jelly mould lifted |
| put.ogg | put.ogg | 0.15 s soft thud | `place` ingredient dropped on food, food into pan, store item into basket; `select` pick up food (mukbang, checkout, canteen scoop), wardrobe tabs, order check; `serve` part-time correct item, canteen portion, empty cup put down; `toggle` settings switches, heat button, sealer; `equip-item` hats, glasses, Apply; `wrong` (slowed to 0.55, dull bump) wrong drop/stroke, "Not yet!", full basket, wrong part-time item, failed ad, not enough coins |
| Right.ogg | right.ogg | rising tonal chime | `perfect` Perfect!!, Shift complete; `step` (short, softer) each finished cooking step and each served customer; `purchase` paid checkout and coin purchase in wardrobe; `reward` reward claimed, earned ad, Delicious! card, Free Coins and Playtime grant; `unlock` New recipe! card; `coin` (first 0.2 s, pitched up) each coin landing in the wallet or counter |
| GlassWipe.ogg | glass-wipe.ogg | short two-tone squeak | `scan` checkout scanner beep |
| card-friction.ogg | card-friction.ogg | rising card swipe | `card` checkout "Processing…" (card payment); `roll` rolling pin and sushi mat strokes |
| cut.ogg | cut.ogg | knife hit and ring | `cut` cut / chop strokes |
| peeling.ogg | peeling.ogg | crinkly peel | `peel` peeler strokes; `tip` a bowl or basket tipped over the food |
| Nail-File.ogg | nail-file.ogg | rhythmic rasp | `grate` grater strokes |
| FaceMassage.ogg | face-massage.ogg | soft squishy pats | `press` press, mash, knead, fold, ring cutter |
| MakeupTap.ogg | makeup-tap.ogg | 5 separate taps | `shake` each shake of a closed container |
| Towel.ogg | towel.ogg | cloth flap | `flip` spatula flip; `equip-outfit` outfits, tablecloth, room |
| BrushingHair.ogg | brushing-hair.ogg | brush strokes | `equip-hair` hair and skin choices |
| WaterPoor.ogg | water-pour.ogg | liquid pouring | `pour` pitcher pour (cut to the pour time); `dip` dunk into a bowl; `sip` each drink sip |
| ShampooWash.ogg | shampoo-wash.ogg | wet lather | `stir` loop for whisk / stir / toss while circling; `blend` (faster) blender |
| MakeupBrush.ogg | makeup-brush.ogg | soft brush | `brush` loop for brush / spread |
| xitkem.ogg | xitkem.ogg | cream squirt | `sauce` loop while squeezing sauce or piping |
| spray.ogg | spray.ogg | short spray bursts | `sprinkle` loop while sprinkling |
| FireCrack.ogg | fire-crack.ogg | steady crackle | `fry` loop while frying or cooking; `boil` (slower, quieter) pot; `bake` (quietest) oven |
| Cotton.ogg | cotton.ogg | soft crunchy bursts | `bite` each bite in the mukbang and the snack stream |

There is no dedicated coin, chewing or error sound in the pack. The closest clips were used: the start of `Right` for coins, `Cotton` for bites and a slowed `put` for mistakes. These are the ones to replace if better clips arrive.

## Unused on purpose

| Clip | Reason |
|---|---|
| lipstick.ogg | −51 dB RMS, nearly silent cap clicks |
| pencil.ogg | −39 dB faint hiss, no matching action |
| wipescrub.ogg | same scrub texture as makeup-brush and shampoo-wash, which are already used for brush and stir |

## Music loop seam

`BackgroundMusic.ogg`: 111.36 s, stereo, 1.5 MB. The sample jump at the seam is 0.006 / 0.027 per channel, which is below the track's typical sample step of 0.022 / 0.030, so there is no click. The last 50 ms are about 10 dB quieter than the first 50 ms, because a note decays just before the downbeat. This should sound like a bar boundary, but it still needs a listening check.

## Checks

- Unit tests (`tests/unit/audio.test.js`):
  - Every id points to a shipped file, and every shipped file is used.
  - Gap and voice limits.
  - One loop per held sound.
  - Pause stops everything without a queue.
  - Single music instance that resumes from its position.
  - Volume persistence.
- E2E (`campaign.spec.js` "audio: …", mouse 390×844):
  - Nothing plays before the first gesture.
  - 14 levels covering every cooking action are played with real mouse input, followed by the mukbang.
  - All 29 expected ids played, `music:start` = 1, all loops ended with their steps, missing = [].
  - Pause, platform mute and the Music switch were checked.
- Real-click pass of Store → Checkout → Meal, Part Time (including the pause menu), Wardrobe buy plus a failed and an earned ad: the expected sounds played with no console errors.
- Production preview: 20 audio files return 200, there is no context before the first click, and after the click there is one context with one music start.
