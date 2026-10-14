# YouTube Playables integration

Status: integrated and tested locally against a fake SDK under the official test-suite CSP (2026-10-14). **Not yet run inside the real YouTube environment** — see "Still to test on YouTube" below. Nothing has been uploaded or published.

SDK API checked against the official reference on 2026-10-14: [SDK reference](https://developers.google.com/youtube/gaming/playables/reference/sdk), [integration requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration), [monetization](https://developers.google.com/youtube/gaming/playables/reference/monetization), [test suite guide / CSP](https://developers.google.com/youtube/gaming/playables/reference/test_suite_guide). JavaScript SDK only; no Unity bridge.

## Build profiles

| Command | Output | Platform adapter | Notes |
|---|---|---|---|
| `npm run dev` / `npm run build` | `dist/` | `DevPlatformAdapter` (TEST MODE) | Local review on `http://127.0.0.1:4173/`; local test storage; mock ads |
| `npm run build:qa` | `dist-qa/` | dev adapter + QA hooks | `?debug=1` |
| `npm run build:youtube` | `dist-youtube/` | `YouTubePlatformAdapter` | **Release**: what goes into the ZIP |
| `npm run build:youtube-qa` | `dist-youtube-qa/` | YouTube adapter + QA hooks | Only for the automated suite |
| `npm run package:youtube` | `release/livestream-girl-mukbang-youtube-test.zip` | — | Zips and verifies `dist-youtube` |
| `npm run test:youtube` | — | — | Builds both YouTube profiles and runs `tests/youtube` |

The profile is chosen at build time (`__PLATFORM__` in `vite.config.js`), never from the host name. The unused adapter is not in the bundle. The YouTube profile also:
- injects `<script src="https://www.youtube.com/game_api/v1"></script>` as the first script in `<head>`;
- removes Phaser's `VisibilityHandler`, both the call and the body. The build fails if Phaser's code no longer has exactly one such call.

## Architecture

```
scenes / UI ──► services (Save, Reward, Playtime, Ad, Audio) ──► PlatformAdapter contract
                         ▲                                          ├─ youtube/YouTubePlatformAdapter.js  (only file that knows ytgame)
app/PlatformLifecycle ───┘ (host pause/resume/mute → game)          └─ dev/DevPlatformAdapter.js (+ MockRewardedAd, MockInterstitialAd)
```

- `src/platform/PlatformAdapter.js` defines the contract. Its methods are `init`, `firstFrameReady`, `gameReady`, `loadData`, `saveData`, `requestRewarded`, `requestInterstitial`, `sendScore`, `subscribe`, `reportWarning`/`reportError` and `dispose`. The base class keeps host state and sends each lifecycle notification at most once.
- `src/platform/createPlatform.js` picks the adapter by build profile.
- `src/app/PlatformLifecycle.js` applies host pause, resume and mute to Phaser, input, audio, playtime and the save.
- `src/services/AdService.js` is the single ad gate. Only one ad runs at a time, audio pauses during an ad, and the interstitial policy lives here.
- Scenes never call the SDK. They use services; the Part-Time screen subscribes to the lifecycle.

## Start order (lifecycle)

1. `index.html` loads the SDK before any game code. The HTML loading screen paints immediately.
2. `main.js` creates the adapter. After two animation frames of the loading screen it calls `firstFrameReady()`.
3. `platform.init()`:
   - the YouTube adapter reads `system.isAudioEnabled()`;
   - it registers `system.onAudioEnabledChange`, `system.onPause` and `system.onResume`;
   - it reads `IN_PLAYABLES_ENV` (ads are offered only inside Playables, because outside it the SDK's ad promises never settle).
4. Cloud load (see "Cloud save" below). Nothing can write before this succeeds.
5. Phaser boots and loads its assets. When the first screen exists, the loader fades out and is removed, and only then `gameReady()` is called (once).

## Pause / resume

- **Host pause** (`onPause`):
  - the Phaser loop sleeps, after `loop.pause()`: no update, tweens, timers or rendering;
  - `game.input.enabled = false`, so pointer and keyboard input are ignored;
  - audio gets the `platform` pause reason, so music stops and effects are cut;
  - the playtime clock stops;
  - pending playtime is flushed and unsaved progress is written once.
- **Host resume** (`onResume`): `loop.resume()` resets the frame delta, then `loop.wake()` runs, so nothing jumps forward. Input comes back and audio resumes where it stopped.
- **Independent reasons:** the player's own pause (Part-Time gear menu, dialogs) uses the `menu` reason and stays open after a host resume. Ads use the `ad` reason.
- **Ad result during a pause:** a result that arrives while the host is paused is applied only after resume.
- **No Page Visibility API** in the YouTube build. The dev adapter treats a hidden tab as a simulated host pause. That is dev-only behaviour.

## Mute priority

- The YouTube adapter starts muted when `isAudioEnabled()` is false and follows `onAudioEnabledChange`.
- `AudioService.platformMuted` silences everything, whatever the player's Music / Sounds switches say.
- Unmuting restores exactly the player's saved switches. Platform mute is never written to the save.
- There is no overall in-game mute button, only the granular Music and Sounds switches, which the requirements allow.

## Cloud save

The YouTube build uses only `ytgame.game.loadData()` / `saveData()`. It has no browser-storage fallback. The release package is scanned for storage calls and the suite runs with storage blocked.

**Load flow:** read → parse → validate → migrate → allow writes.
- **Fresh start:** an empty or whitespace string, `"null"` or `"{}"` starts a fresh game.
- **Load failure** never becomes an empty save. Any of these blocks all writes and shows **Retry** on the loading screen:
  - a reject;
  - a timeout after 15 s;
  - a non-string response;
  - invalid JSON;
  - no version;
  - a version newer than this build.

  The game does not start until a retry succeeds, and the cloud data stays untouched.

**Versioning:** `SAVE_VERSION = 11`.
- `migrateSave()` accepts versions 1–11 and keeps everything earned: coins, levels, completed levels, wardrobe owned/equipped, reward receipts, playtime, food orders, audio settings and the legacy default-character migration.
- Unknown future versions are refused, never reset.

**Writes:**
- One write at a time, coalesced: later changes merge into one follow-up write of the newest state, so an older snapshot can never land after a newer one.
- A failed write keeps the save dirty and is retried after 2 / 5 / 10 / 30 s, and also on the next change or host pause. The claim that triggered it still reports the failure, so the result screen's Retry works as before.
- Size guard before the SDK: both the UTF-16 and UTF-8 size must stay under 90 % of 3 MiB. Writes over 500 KiB report a warning. The string is checked with `String.isWellFormed()`.
- The current save is about 1–3 KB.

**What is saved:** coins, highest/available level, completed levels, wardrobe (owned and equipped), reward receipts (for de-duplication), playtime minutes and claimed rewards, bought food orders, Music/Sounds settings. Language is not saved.

## Rewarded ads

All placements go `RewardService` / `PlaytimeService` → `AdService.requestRewarded(placementId)` → adapter.

**How the YouTube SDK result maps:**

| SDK result | Status |
|---|---|
| `requestRewardedAd(rewardId)` resolves `true` | `earned` (the only paying result) |
| resolves `false` (or anything else) | `not-earned` |
| rejects with `SdkError.errorType === 'API_UNAVAILABLE'` | `unavailable` |
| any other reject | `error` |
| outside Playables | `unavailable` |

**Placements:**
- `lobby-free-coins` (Free Coins, +1000);
- `level-complete-multiplier` (post-level ×N);
- the wardrobe item unlock (every 3rd item, and coin items the player cannot afford);
- level-select play of levels not yet reached;
- the Playtime "Take All" reward.

All of these existed before; their reward logic is unchanged.

**Double rewards are prevented** by the one-ad-at-a-time gate (a second tap while an ad is open is refused) and by per-claim receipts in the save. A run, a Free Coins opening or an item can be paid only once, even after a retry.

**Unavailable or failed ads:** the game stays usable, the existing UI notes appear ("No video available right now.", toasts), and nothing is granted.

## Interstitial ads

- **Support is complete but switched off.** That was the designer's decision on 2026-10-14, in line with the 2026-10-04 decision "no forced interstitials". The policy is in `src/content/ads.js`: `INTERSTITIAL_POLICY.enabled = false`.
- **One natural break:** the Result screen calls `ads.interstitialBreak('level-break')` after the reward is claimed and before returning to the Lobby. While the policy is off this returns `skipped: disabled` immediately and the SDK is never called. The automated suite checks this.
- **Rules applied if it is ever turned on:**
  - the capability must be supported (inside Playables);
  - only allowed placements count;
  - no other ad in flight, and not during a host pause;
  - none in the first 3 minutes of a session;
  - at least 4 minutes after the last *completed* request;
  - at least 90 s after a rewarded ad.
- **The SDK cannot prove a view.** It only reports that the request completed. The cooldown counts from that (`lastInterstitialRequestCompleted`); a failed request does not start it.

## High score

**Deferred.** The project documents define no score metric: no leaderboard rules in `PROJECT-BRIEF.md` and none in the decision log. Accordingly:
- `capabilities.score = false`;
- `sendScore` refuses;
- nothing is sent to YouTube.

To enable it, the designer needs to choose one integer metric. The SDK displays the highest value sent, and that value must match the best score in the save. One candidate is "highest level reached", but campaign progress loops back to Level 1 after Level 50, so it would need its own non-decreasing save field.

## Production / host safety

- **CSP:** the official test-suite CSP passes with no violations. Scripts load only from `'self'` and the SDK; there is no inline script. Fonts are bundled (`@fontsource`). There are no external requests.
- **Paths:** relative only (`base: './'`). File names are alphanumeric plus `_ - .`. `index.html` is at the ZIP root.
- **Storage:** no `localStorage`, `sessionStorage` or IndexedDB use. Phaser's device probe `!!localStorage.getItem` stays; it is inside `try/catch` and never stores anything.
- **Lifecycle APIs:** no `visibilitychange`, `blur`/`focus`, `onblur`/`onfocus`, `navigator.language` or `pagehide` listeners. A probe in the suite records any registration.
- **Errors:** uncaught errors and unhandled rejections call `health.logError()` (best effort).
- **Sizes** (after the optimization pass of 2026-10-14):
  - **Total:** 626 files, 20.2 MiB unpacked (21,226,696 bytes), 19.2 MiB zipped (20,161,492 bytes). The limit is 250 MiB total and 30 MiB per file.
  - **Initial bundle**, measured in the browser as everything requested before `gameReady`: **4.73 MiB** with gzip on text (5.81 MiB raw, 122 requests). Before the pass it was 19.04 MiB (20.12 MiB raw, 623 requests). The target is under 15 MiB SHOULD and 30 MiB MUST. Re-measure with `node scripts/qa/initial-bundle.mjs`; the YouTube suite fails at ≥ 15 MiB.
  - **Large files:** two are over the recommended 512 KiB, the game JS (1.5 MiB, about 410 KiB gzip; mostly Phaser) and `music-main.ogg` (1.5 MiB). The music is now fetched only after `gameReady`.

## Deferred art (initial-bundle optimization)

- The loading screen downloads only the **start set** (`src/content/assetGroups.js` → `startKeys`): 93 images, about 3.7 MiB. It contains the Lobby and HUD art, its popups (settings, Playtime, Free Coins, dialogs), every wearable part except the 24 non-equipped head variants, the equipped character's three head poses plus the three plum-hair poses of the same skin (the compositor's jaw mask) and the dish the Lobby offers.
- After `gameReady`, `src/app/AssetStreamer.js` streams everything else in the background, the screens the player is most likely to open first:
  - one request per image, 6 at a time;
  - decoded off the main thread;
  - retried with backoff;
  - nothing starts while the host has the game paused.

  The music fetch also starts only after `gameReady`.
- Every screen change (`BaseScene.fadeTo`) waits for that screen's own art (`sceneKeys`): a level's recipe, dish and serving art, the next level's preview for Result, the 50 dish cards for Levels, and so on. That art is usually already there. On a slow connection the faded screen shows "Loading…" until it arrives.
- No image was removed, re-encoded or resized, so visual quality is unchanged. The YouTube profile drops 3 files that nothing references (asset-pipeline leftovers) and an empty folder.
- **Safety net:**
  - dev and QA builds record any texture used before it was loaded, and every e2e test fails on one (`tests/e2e/_texture-guard.js`);
  - `tests/e2e/lazy-assets.spec.js` delays all deferred art and opens every screen and Lobby popup right after start;
  - `tests/unit/asset-groups.test.js` checks the groups for all 50 levels.

## Localhost / mock controls

Dev adapter URL parameters (local build or dev server):
- `?ad=interactive|earned|not-earned|error|unavailable`
- `?interstitial=shown|completed|unavailable|error`
- `?save=ok|fail-load|fail-save`
- `?mute=1`
- `?reset=1`
- `?progress=N`

Hiding the browser tab is a host pause.

QA hook (`?debug=1`, dev server and QA builds only), `__GAME_DEBUG__.platform`:
- `pause()` / `resume()`
- `mute(true|false)`
- `setSaveMode()`, `setRewardedMode()`, `setInterstitialMode()`
- `interstitialBreak()`
- `events()` (adapter call log)
- `readSave()` / `writeSave()`
- `state()` (profile, capabilities, host state, loop/input state, save status, ad log)

## Automated tests

- **`tests/unit/platform.test.js`** (22 tests) covers:
  - the empty-save policy;
  - failed, corrupt, future-version and non-string loads blocking all writes;
  - retry after a load failure;
  - v1 → v11 migration;
  - coalesced writes;
  - write failure and retry;
  - the size guard;
  - YouTube adapter lifecycle order, initial mute, pause/resume/mute and unsubscribe;
  - rewarded mapping, unavailable outside Playables, concurrent requests refused, and results held until resume;
  - interstitial mapping;
  - load timeout;
  - no SDK means no fallback;
  - dev adapter controls;
  - interstitial policy (off, eligibility rules, failed requests);
  - one ad at a time;
  - rewarded only on `true` with no double grant;
  - lifecycle freeze/resume, the player pause surviving, and mute not rewriting settings.
- **`tests/youtube/youtube.spec.js`** (11 tests × desktop mouse 1280×720 and phone touch 390×844) runs with a fake lexical `ytgame` at the real SDK URL, the official CSP and blocked browser storage. It covers:
  - fresh launch, start order, and `gameReady` after the loader;
  - load failure → Retry → start;
  - corrupt and newer-version data never overwritten;
  - rendering frozen while paused;
  - returning player and v3 migration;
  - rewarded true/false/unavailable/error, double tap and the cloud write;
  - an ad result during a pause;
  - full pause semantics, including the player pause surviving;
  - mute priority;
  - Level 1 played with real input after a pause, saved, no interstitial, and relaunch.
- **Regression:** the existing local suites (`npm test`, `npm run test:e2e`).

## Still to test on YouTube (real environment)

1. Upload `release/livestream-girl-mukbang-youtube-test.zip` to the Playables Developer Portal as a test build. **Only with the designer's approval.**
2. Run the official SDK Test Suite (https://developers.google.com/youtube/gaming/playables/test_suite) and confirm:
   - firstFrameReady, gameReady, loadData before saveData;
   - pause/resume;
   - audio.
3. Check the real account:
   - **Fresh launch:** first play starts at Level 1 with 1000 coins.
   - **Returning player:** play, close, reopen; progress, coins and wardrobe are kept.
   - **Cross-device:** the same account on phone and PC.
4. Rewarded ads in an eligible region and with the monetization setting on in the portal:
   - **Earned path:** watch fully → reward;
   - **Not earned:** close early → nothing;
   - **No fill:** "No video" note.
5. Host pause and resume:
   - switch away from the Playable (YouTube app background, mini player, another tab);
   - nothing advances while away;
   - audio resumes correctly.
6. YouTube mute button: silent while muted. Unmute restores the player's Music/Sounds choices.
7. Measure the initial bundle size and load time in the portal (local measurement 4.73 MiB; target < 15 MiB, < 5 s).
8. If interstitials are ever enabled, confirm how they show in the portal and what they do to audio and pause.
