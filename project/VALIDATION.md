# Validation — CP3 + Character Customization (2026-10-05)

## YouTube Playables integration — 2026-10-14

- **Unit tests** (`npm test`): 99/99, including 22 new tests in `tests/unit/platform.test.js` covering save safety and migration, the YouTube adapter contract, the dev adapter, the ad gate and interstitial policy, and the lifecycle.
- **YouTube suite** (`npm run test:youtube`): 22/22, i.e. 11 tests × `yt-mouse-1280x720` and `yt-touch-390x844`.
  - Release bundle `dist-youtube` and QA twin `dist-youtube-qa`.
  - Run under the official test-suite CSP with a fake lexical `ytgame` at the SDK URL and with browser storage blocked.
  - No CSP violations, external requests, page-lifecycle listeners, storage access or page errors. Phaser's guarded device probe is the one allowed `localStorage` read.
  - The probe was validated against the previous local build, where it detects 2 `visibilitychange` listeners plus `onblur` and `onfocus`.
- **Local regression** (`npm run test:e2e`, `mouse-390x844`, dev adapter): 54 passed, 2 skipped, 1 failed. The failure was a stale `appearance:v19` expectation (the code has been at `v23`, unrelated to the SDK). It now matches any version, and the rerun passed.
  - The suite includes all 50 levels with mouse, audio across 14 levels, Levels screen ads, store, canteen, part-time, playtime, settings and customization.
  - Extra on desktop 1280×720 and touch 844×390: free coins, settings, reward and playtime, 8 passed (the rest are limited to other projects by design).
- **Dev adapter smoke** (localhost):
  - `?save=fail-load` shows Retry;
  - the order is `firstFrameReady → loadData → gameReady`, with the loader removed;
  - simulated pause gives 0 frames, loop asleep, input off;
  - resume, mute, and the interstitial break (`skipped: disabled`) all work.
- **Release package:** `release/livestream-girl-mukbang-youtube-test.zip`
  - 629 files; 21,401,448 bytes unpacked; 20,340,614 bytes zipped; SHA-256 `a8404b3b98a329964f0059ad67980a077225d740f7f8ccfeb4ea9ff5b73484b2`.
  - Checks passed: index at root, SDK tag first, no dev/test strings, portable `/` entry names, per-file SHA-256 after extraction.
  - Two files are over the recommended 512 KiB: the music (1.5 MiB) and the game JS (1.5 MiB). The initial bundle is about 19 MiB, under 30 MiB but over the recommended 15 MiB.
- **Local production preview:** `http://127.0.0.1:4173/` serves `index-oLwQI-C-.js` (dev adapter, built 2026-10-14 20:31). It boots to the Lobby with no errors.
- **Not yet verified:** the real YouTube environment, i.e. the official SDK Test Suite, a real account and real ads. See `project/YOUTUBE-INTEGRATION.md`.

## Persistent local preview — 2026-10-14

- Replaced the chat-session preview with a hidden Windows process started by `scripts/start-preview.ps1`; stdout/stderr are redirected to `preview.log` and `preview-error.log`.
- Fresh `npm run build` passed: `index-B830vfDQ.js`, 1,531.86 kB (gzip 417.37 kB).
- Canonical VS Code/preview URL is `http://127.0.0.1:4173/`; the launcher and server now use the same port. Both loading backgrounds are intentionally runtime-resolved despite Vite's build-time warning.

## Production preview recovery — 2026-10-13 16:28 +05

- `npm run build` passed with Vite 8.3.2; fresh bundle: `index-D1dVK8BL.js` (1,509.93 kB; gzip 409.95 kB).
- The old verified Vite listener on port 4173 was stopped and replaced with the new preview process. `http://127.0.0.1:4173/` and `assets/index-D1dVK8BL.js` both return HTTP 200.
- A real Edge browser at 390×844 loaded title `Livestream Girl Mukbang` and a full 390×844 Phaser canvas with zero console or page errors.

## Rewarded customization items — 2026-10-12 23:46 +05

- `npm test`: **66/66 passed**. Coverage includes the repeating 3/6/9 catalog rule, refusal of coin purchases for rewarded items, all seven current unlocks, unchanged coins, atomic ownership/receipt persistence, repeat refusal, cancel, unavailable, error and thrown-SDK outcomes.
- `tests/e2e/customization-ads.spec.js`: the rewarded card is visually contained on **18/18** configured phone/touch/tablet/landscape/desktop/ultrawide/DPR2 profiles. The complete seven-category audit passed at 390×844; the former coin price is absent and the video/`AD` badge is present. Evidence: `qa/customization-ads/rewarded-card-390x844.png`.
- Real-input rewarded behavior passed at 390×844 mouse and 360×800 touch: not-earned/error/unavailable keep Heart Pop locked and coins at 1000; `earned` unlocks it, keeps coins at 1000 and survives reload. The existing customization purchase/apply/persist/Level 1 route also passed after changing its owned skin selection to Warm.
- The first responsive run exposed a real near-contact with Apply at 768×1024 and a QA-only coordinate-scale mismatch on zoomed desktops. Labels were raised and debug geometry now scales `cardStates`; the four affected profiles then passed, including 1920×1080, 2560×1080 and 2560×1440.
- `npm run build` passed with Vite 8.3.2: `index-DdYv-K_S.js` (1,509.22 kB; gzip 409.75 kB). Fresh production preview and bundle return HTTP 200 at `http://127.0.0.1:4173/`; a real browser loaded the 390×844 production canvas with the correct title and zero console/page errors. Real YouTube rewarded behavior remains for final SDK integration.

## Lobby Free Coins — 2026-10-12 23:20 +05

- `npm test`: **62/62 passed**, including exact `+1000`, stable `lobby-free-coins` placement, `earned`-only payment, no payment on cancel/error/unavailable/throw, receipt idempotency and parallel-request refusal.
- Final layout evidence passes all 18 configured mouse/touch/desktop/tablet/landscape/DPR2 viewports. Balances `1000`, `17930` and `999999` stay clear of the green `+`; popup text, close and Watch controls remain in bounds. Screenshots: `qa/free-coins/`.
- Real-input behavior passed at 390×844 mouse and 360×800 touch: close/cancel/error/unavailable pay nothing; `earned` changes 1000 to 2000 and survives reload without a duplicate. The interactive TEST overlay passed close-ad = no reward and finish-ad = reward.
- Visual review of `qa/free-coins/mouse-390x844.png` confirms the exact reward, ad icon and optionality note appear before the ad, in the current illustrated UI style without overlap.
- Production build passed: `index-9Bor3nbh.js` (1,506.03 kB; gzip 409.06 kB). The fresh preview and bundle return HTTP 200 at `http://127.0.0.1:4173/`. Real YouTube rewarded behavior remains for final SDK integration.

## Fresh ZIP package — 2026-10-12 04:04 +05

- `npm run build` passed; production bundle: `index-dpk8YX3T.js`.
- `npm run package` extracts the resulting ZIP to an isolated temporary directory and verifies root `index.html`, exact file-list parity with `dist/`, portable paths and SHA-256 equality of every file.
- Result: 606 files, 19,271,159 bytes unpacked, 18,273,744 bytes zipped. SHA-256: `27c47f00f56ad1b6dac4c6ba8ff41cb44265c44d4ec13402b7ff5e78df222913`.
- Package remains a local/dev handoff, not a YouTube-approved release; the real platform SDK/Test Suite is still outstanding.

## Settings and audio — 2026-10-12

- `npm test`: **57/57 passed**, including independent Music/Sounds persistence and platform-mute separation.
- `tests/e2e/settings.spec.js`: **3/3 passed** at 390×844 mouse, 1280×720 desktop and 844×390 touch landscape. The test opens the real gear, checks the modal stays inside the viewport, disables Music and Sounds independently, verifies the save, reloads and verifies both choices restore.
- Visual review of `qa/settings/` confirms the generated panel, speaker/music icons, green switches and Back Home button are complete with no atlas fragments, clipping or overlap in all three layouts. The first QA pass caught incorrect atlas crop bounds; those bounds were corrected before this accepted pass.
- `npm run build`: production bundle `index-dpk8YX3T.js`, 1,490.93 kB (gzip 404.32 kB). Fresh preview http://127.0.0.1:4180/ returns HTTP 200.

## Supermarket + Part Time Job — 2026-10-06 20:56 +05

- `npm test`: **39/39 passed**. New `tests/unit/part-time.test.js` (6 customers, 3 options, requests only from options, ordered serving, wrong item = −3 s and no progress, 15 s timeout incl. a penalty that empties the clock, clock frozen between customers, win after 6, reward once per run) and `tests/unit/store.test.js` (content/textures, basket add/remove/toggle/capacity 5/totals, atomic checkout + receipt, already-paid, insufficient = nothing charged, pantry consume, v7→v8 migration).
- Full Playwright suite (`--trace off`): **87 passed / 201 intentionally skipped / 0 failed** in 29.7 min.
  - `part-time.spec.js`: layout at all 8 viewports (qa/part-time/), 6 customers in order with real taps (mouse and touch) → +300 once, wrong item → shake/−3 s/order kept, real 15 s timeout → "Time's up!", no reward, Try again; gear pause freezes the clock, Quit pays nothing.
  - `store.spec.js`: shelf + checkout layout at all 8 viewports (no overlaps between products, tags, sign, bottom bar; qa/store/), add/remove from shelf and from basket with live "n/5" and Total, capacity refusal, empty-basket hint, category arrows; drag-to-scanner and tap scanning, nothing charged before Pay, Pay 520 → coins 480, pantry = bought snacks = stream menu, all eaten by drag (mouse) / tap (touch), pantry empty after; 1150 > 1000 → "Not enough coins", nothing charged, basket kept, smaller basket pays; leaving checkout keeps the basket.
- Bug found and fixed: basket tap areas were recreated on every change and Phaser only hit-tests new interactive objects from the next frame, so a remove tap within ~100 ms of adding was lost (8/12 in a stress script, 0/12 after switching to a fixed pool of 5 tap areas). Dialog-button taps in tests now wait 250 ms after the dialog appears for the same reason.
- An earlier full run overlapped with live code edits (dev-server reloads) and was discarded.
- Production build `index-HJtV1Xcd.js`; `http://127.0.0.1:4173/` serves it and `assets/store/*`, `assets/part-time/*` (HTTP 200); Store and Part Time Job opened in the production preview without page errors; the dev debug hook and mock ad are not in the bundle.

## Playtime Rewards — 2026-10-06 18:46 +05

- `npm test`: **27/27 passed** (new `tests/unit/playtime.test.js`: minute thresholds, capped ticks, clock frozen during ads, persistence, owned item pays its price, single claim locked/once, Take All only after earned ad, nothing on not-earned/error/unavailable, single claims refused while the Take All ad is open).
- Full Playwright suite (`--trace off`): **61 passed / 147 intentionally skipped / 0 failed** in 19.6 min. New `tests/e2e/playtime.spec.js`: window layout safe at all 8 viewports (screenshots in `qa/playtime/`), real clock counts active time, locked tile refuses, unlocked pays once with check and HUD update, item reward persists over reload, Take All pays 0 on not-earned/error/unavailable and +3800 coins + both items after an earned ad; NEW badge hides when nothing is claimable.
- Production build `index-Dnh3zMK1.js`; `http://127.0.0.1:4173/` serves it and `assets/playtime/*` (HTTP 200).

## Post-level reward offer — 2026-10-06 17:58 +05

- `npm test`: **21/21 passed** (new `tests/unit/reward-offer.test.js`: data-driven base rewards, default multipliers, ping-pong pointer and segment selection, earned × 2/3/5, not-earned/unavailable/error/throwing SDK grant nothing, retry, base claim without ad, no double payment in any order, base refused while the run's ad is open, invalid multiplier rejected, dev simulator outcomes and parallel-ad refusal).
- Full Playwright suite (`--trace off`): **49 passed / 119 intentionally skipped / 0 failed** in 17.3 min. New `tests/e2e/reward.spec.js` (staged Result state, real input): layout safe at all 8 viewports (screenshots in `qa/reward/`); pointer moves both ways and never stalls; x2/x3/x5 lock and pay 440/660/1100 after earned ad, HUD coins match the save, Ramen completed and Level 3 offered; pointer frozen during the ad, cancelled ad pays nothing, retry pays; error/unavailable pay nothing and keep both buttons; small button pays 220 even on x5 with no ad overlay; double claiming impossible (both buttons, rapid taps, replayed completion). The five-level campaign route passes through the new screen with real play and base claims (final 1620 coins).
- Production build `index-DiNoHyyO.js`; `http://127.0.0.1:4173/` serves it and `assets/reward/*` (HTTP 200).

## Head seating fix — 2026-10-06 17:35 +05

- `npm test` 10/10; full Playwright suite (`--trace off`) **33 passed / 63 skipped / 0 failed** (13.5 min).
- `qa/appearance/` regenerated (108 combinations): head rests on the collar, back hair behind the shoulders for all hair × skin × outfit × hat × glasses × pose.
- Production `index-9FY5xfCB.js`, `dist/` 7,700,448 bytes, preview HTTP 200, no page errors.

## Character rig / proportions — 2026-10-06 17:12 +05

- `npm test`: **10/10 passed**.
- Full Playwright suite (`--trace off`, avoiding the OneDrive trace-file lock): **33 passed / 63 intentionally skipped / 0 failed** in 13.4 min — all eight viewports, five-level route, touch Level 1, reload persistence, customization purchase/apply/persist, hats/glasses, live resize.
- Appearance matrix (`scripts/qa/appearance-matrix.mjs`, real compositor): 108 combinations in `qa/appearance/` — outfit × hair × skin, hair × hat × glasses, outfit × hat × glasses, hair × outfit × pose (deep skin, bonnet, heart glasses). Visually checked: every body narrower than the hair silhouette, collar under the chin, hats seated on the head, glasses on the eye line, no painted hands, identical scale across all items.
- Production build `index-B1zBZxjT.js`, `dist/` 7,700,338 bytes; `http://127.0.0.1:4173/` HTTP 200, no page errors; debug render hook absent from the production bundle.

## Silver heroine replacement — 2026-10-06 16:42 +05

- `npm test`: **10/10 passed** (incl. v4/v5 old-default → v6 silver heroine migration, retired-ID fallback, owned items kept).
- Full Playwright suite: **32 passed / 63 intentionally skipped / 1 failed** in 14.7 min. The single failure (touch-360x800 Lobby layout) was `EBUSY` while closing a trace file in the OneDrive folder, not an assertion; rerun with `--trace off`: **passed**. The customization Back test failed once in an isolated run and passed on rerun and in the full suite (timing flake).
- Visual frames checked: Lobby 390×844 (dev and production), Frog Sweater / Orange Cat / Pink Plush, both hats, both glasses, Level 5 mukbang and result card — all show the new heroine; feeding uses the per-outfit mouth anchor.
- Production build `index-8trxtICv.js`, `dist/` 7,973,395 bytes; `http://127.0.0.1:4173/` HTTP 200, no page errors.

Browser: installed Microsoft Edge. Playwright now uses `PLAYWRIGHT_EXECUTABLE_PATH` when supplied and otherwise detects the standard Windows Edge installation; a missing Playwright-downloaded Chromium no longer prevents local QA.

## Automated evidence

- `npm test`: **9/9 passed**.
  - versioned default save and load-before-write;
  - atomic one-payment-per-run reward;
  - exactly five permanent IDs in the confirmed order;
  - every texture referenced by every recipe exists;
  - unlock cannot skip progression, deducts once and does not dead-end;
  - failed reward save retries without a duplicate payout.
  - v1/v2/v3/v4 saves migrate to schema v5 with seven-category appearance/environment defaults and the corrected Heart Pop reference look;
  - cosmetic purchase is atomic, unowned equip is rejected and insufficient balance cannot overdraw.
- Lobby geometry/collision matrix after the rebuild: **8/8 passed**.
  - Layout at 360×800 touch, 375×812, 390×844, 393×873, 412×915, 430×932, 480×640 short/wide and 1280×720 desktop.
  - Profile, wallet and Settings do not intersect. Side feature groups are mutually separated and do not intersect the character, mascot, thought bubble, HUD or bottom navigation. Super Market, Start and Decor remain disjoint.
  - Every visible text bound and hit target stays inside the viewport; touch targets remain at least 44 px; image X/Y distortion remains below 2%.
- Dynamic Lobby resize sequence 390×844 → 430×932 → 480×640 → 360×800 → 390×844: **passed**.
- All seven still-deferred secondary Lobby controls were clicked with real mouse input at 390×844: **passed**. Each provides press feedback and remains safely in Home with the non-blocking `Soon` response; Skin is covered by its own navigation/flow tests.
- Dedicated final Lobby run: **10 passed / 14 intentionally skipped in 1.5 minutes, exit code 0**. The skips are the single-run control/resize tests repeated by Playwright across other viewport projects.
- Full Level 1 player-facing UI route at all eight viewport profiles: **8/8 passed**.
  - Checks prestream/Viewer Request, every cooking step, mukbang, result and return to Lobby.
  - Rejects overlap between interaction targets and HUD/header/progress/request rectangles in addition to clipping and viewport overflow.
- Full five-level campaign route after the Lobby rebuild: **passed in 2.5 minutes**.
  - Full fresh-save route at 390×844: Loading → Lobby → Jelly → mukbang → result → Ramen unlock/play → Pizza unlock/play → Sushi unlock/play → Bubble Tea unlock/play → final result.
  - Final state: coins 1620, `highestLevel=5`, `availableLevel=5`, one completion receipt per level.
  - Real mouse input for every cooking/mukbang action. Wrong drop, incomplete stir, cross-axis directional drag, repeated tap and wrong feed do not advance or lock a level.
  - Touch-emulation complete Level 1 at 360×800.
  - Live resize 390×844 → 520×680 during the pour step; interaction remains usable.
  - Browser reload after Level 1 preserves 1200 coins, Jelly completion and Ramen availability.

## Visual comparison

- Source comparison: `LobbyScreen.jpg` was opened at original resolution beside fresh implementation captures in `qa/lobby/`; cooking/livestream screens were checked against the existing campaign captures, `GameplayVideo` keyframes and `Video2` 00:38–01:48.
- All eleven Skin references were opened at original resolution. `SkinChanging` governed the screen topology; Dress/Hair/Hat images governed modular character/accessory art; Background/Table images governed environment variants; Pet images were compared with the retained sprout companion.
- Home now matches the reference composition: one readable top HUD with a reserved Settings slot, large unboxed illustrated side features, reference-scale character/thought bubble, table beginning near the same vertical landmark, and three separate bottom actions with Start strongest.
- The formerly retained Lobby atlas was rejected by the designer and replaced with one 2K Nano Banana 2 job per visible asset. Raw and cutout contact sheets were visually inspected; the accepted heroine has no neck, every transparent result has zero-alpha corners, and the default 390×844 capture is `qa/lobby/mouse-390x844.png`.
- Cooking reuses the Video2 hierarchy: HUD, large step tracker, one dominant work object, real illustrated food/tool and animated hand; level-gated bottom choice cards were intentionally removed.
- Livestream reuses the confirmed large character, LIVE badge, three servings and atmospheric comments without covering the food.
- Completion uses the reference-like centered photo/reward modal and large claim CTA.
- Final Lobby frames for every tested size: `qa/lobby/`. Runtime frames for every cooking step, all five mukbang screens and all five results: `qa/campaign/`.
- No known overlap or clipping was visible in the inspected frames; geometry checks confirm player-facing rectangles and hit targets remain within every tested viewport. Images remain uniformly scaled (no X/Y stretching).

## Production

- `npm run build`: pass with Vite 8.3.2 (48 modules); final unpacked `dist` is 7,961,214 bytes (≈7.59 MiB). Main bundle: `index-BFoea8v4.js`, 1,312,541 bytes (gzip 352.59 kB). Build time: 2026-10-05 22:57 +05:00.
- Production bundle excludes the dev-only test hook and does not contain `ytgame` or runtime Higgsfield/MCP calls.
- Fresh production preview at `http://127.0.0.1:4173/`: HTTP 200 after the 22:57 rebuild. The JavaScript bundle contains no `__GAME_DEBUG__`, `ytgame`, `higgsfield` or `mcp` string. Preview process remains running.

## Character Customization

- Unit suite: **9/9 passed**, including v1/v2/v3 → v4 appearance migration, atomic single-charge purchase, owned/equipped persistence, unowned-equip rejection and insufficient-funds no-overdraft behavior.
- Dedicated final Customization run: **11 passed / 21 intentionally skipped in 2.6 minutes, exit code 0**. Layout runs across all eight viewport projects; cancel, complete purchase/persistence and outfit/head-only plus all-hat/all-eyewear checks intentionally run once at 390×844.
- Dedicated layout matrix: **8/8 passed** at 360×800 touch, 375×812, 390×844, 393×873, 412×915, 430×932, 480×640 and 1280×720. The screen stays centred, text/touch targets remain in bounds, every Hair/Skin card has an image texture, and the dedicated category-title rectangle does not overlap any item card.
- Dedicated mouse behavior checks pass. Back/cancel is safe; the full flow buys/equips Honey hair, Deep skin, Frog Hoodie, Sunny Bow, Rose Round glasses, Snow Blue tablecloth and Bunny Cream background for a total of 810 coins, then verifies Lobby and reload persistence. A separate real-input visual-regression route previews Sunny Bow, Cocoa Beret, Rose Round and Heart Pop and checks layout safety for every state.
- Dynamic-preview assertions confirm that switching to Deep skin changes every Hair card to a `*-deep-happy` texture and that both Hair/Skin tab portraits resolve to `custom-head-honey-deep-happy`. Selecting Snow Blue changes the catalog's live theme ID to `winter`.
- The same custom look was verified during real Level 1 cooking and after entering mukbang/feeding. Evidence: `qa/customization/selected-390x844.png`, `lobby-updated-390x844.png`, `level-updated-390x844.png` and `mukbang-updated-390x844.png`.
- Regression checks after integration: dedicated Lobby run **10 passed / 14 intentionally skipped**; complete Level 1 route **1/1 passed** at 390×844 mouse and **1/1 passed** at 360×800 touch.
- Visual inspection of the Hair, Skin and selected 390×844 states confirms: Cocoa/Honey/Plum are distinct readable silhouettes; Peach/Warm/Deep are illustrated faces rather than flat swatches; no opaque recolour square or legacy face edge remains; no skin neck is visible; the chin/hair transitions directly to painted outfit fabric in Orange Cat, Frog Hoodie and Pink Plush; both hats remain uncropped; both open eyewear variants sit level across the eyes; Snow Blue tablecloth and the lower panel use a coordinated blue palette. Evidence includes `qa/customization/mouse-390x844.png`, `skin-390x844.png`, `selected-390x844.png`, `head-only-outfit-orange-cat-390x844.png`, `head-only-outfit-mint-cafe-390x844.png`, `head-only-outfit-berry-pop-390x844.png`, `accessory-bow-390x844.png`, `accessory-daisy-390x844.png`, `glasses-round-390x844.png` and `glasses-heart-390x844.png`.

## Bugs found and fixed in this checkpoint

- The designer rejected the former Lobby character/icons and the decision to retain them. Twenty-four accepted default-Lobby assets now come from separate Nano Banana 2 jobs; the old 4×4 Lobby atlas is overwritten at runtime by individually built WebP assets.
- The first reference heroine correction still contained a visible skin neck. It was rejected before integration; the accepted targeted correction joins the chin/hair directly to green sweatshirt fabric and then passed a separate Background Remover operation.
- The first integration left the cutlery tray outside the right viewport, placed Daily Reward over the pet hit area and caused the compact 480×640 Skin target to intersect the pet. Reference-led anchors and a dedicated compact pet scale/position resolved all three while preserving the 390×844 composition.
- Latest responsive regression: 24/24 routes pass across eight viewports (Lobby, Customization and full Level 1 UI), dynamic resize passes, and the four customization behavior tests pass.
- The previous character used most of the center width and forced side features toward it; its scale is now bounded by the center-character region and matches the reference proportion.
- Side features used generic rounded cards whose visual and hit rectangles invaded adjacent zones; they now use unboxed reference-like icon/label stacks inside dedicated left/right regions.
- The coin overhang originally intersected the profile rectangle; the wallet now owns a separate measured group and reserved Settings slot.
- The thought bubble and mascot initially intersected Skin/Daily bounds during the new collision test; their anchors and maximum sizes were corrected for every portrait profile.
- Bottom hit zones exceeded short/desktop viewports by less than 2 px; compact-layout navigation is now vertically clamped.
- Feature hit areas extended 2.8 px outside the left edge at 390×844; side anchors and bottom spacing were corrected.
- The character previously rendered in front of the table and appeared to float; the table now masks the lower torso while plate/props retain their own foreground layer.
- The thought bubble previously overlapped the character's head; it now occupies the clean upper-right reference position with its tail leading toward the character.
- Side buttons previously used five unrelated Y fractions; both sides now share a three-row grid and aligned label baselines.
- At 480×640 and 1280×720 the two-line `SUPER MARKET` label exceeded the viewport by 5.18 px; compact navigation typography now stays inside the bottom band.
- At 1280×720 the wallet pill expanded into an accidental full-width banner; the HUD now stays in the centred gameplay column while extra width reveals background.
- Re-entering the reused ResultScene called a stale layout closure after its previous modal was destroyed; scene-owned modal/layout state is now reset in `init` and `clearPanel`.
- The existing full-campaign test exposed both issues before acceptance.
- The intermediate recolour classifier still produced awkward Hair/Skin intersections and only flat swatch cards. It was removed. Runtime now uses 27 Higgsfield-removed, fixed-canvas, one-piece head sprites (3 hairstyles × 3 skin tones × 3 expressions), while Hair/Skin cards show generated previews.
- Clothing used to be recoloured/decorated on one base pose. Each outfit now has its own aligned happy/eating/chewing sprites, eliminating independent torso placement and clipping.
- The first generated Orange Cat chewing atlas cell had the wrong expression. It was rejected and replaced by a targeted Nano Banana 2 correction plus its own Background Remover job.
- The new close button initially exceeded the 390 px viewport by 1.24 px; its anchor was clamped and the full eight-viewport matrix passed afterward.
- The catalog title previously occupied the top edge of the cards. The panel now reserves a 32 px title row, and an automated rectangle check rejects any title/card overlap at all eight viewport profiles.
- Early whole-head composition iterations left the old ears visible or cleared white wedges beside the neck. The head scale and fixed clear opening were recalibrated; final inspected happy/eating/chewing frames contain neither defect.
- Generated heads and base outfits both contained visible neck pixels. Three final head-only Nano Banana 2 atlases now end at the jaw/hair; the compositor removes the baked outfit neck and extends the same outfit's painted fabric underneath. No skin neck is drawn in any of the three outfits or expressions.
- Hair cards were fixed to Peach, Skin cards were fixed to Cocoa and both related tab icons were static. They now resolve their textures from the complete current Hair × Skin pair.
- Both hats used anchors above the top of the character canvas and glasses rendered below them. Hats now use safe lower anchors and corrected scale; layer order is head → hat → glasses.
- The original round-glasses bitmap contained folded diagonal temples. A targeted Nano Banana 2 atlas was generated and separately background-removed; only verified open-front round/heart cells are exported to runtime.
- The catalog shelf/panel stayed cream for every tablecloth. Each tablecloth now supplies a coordinated pastel shelf, panel and outline palette, refreshed immediately on selection.

## Canteen + lobby thought cloud — 2026-10-06 23:58 +05

- Unit: `node --test tests/unit/*.test.js` — 43/43 pass (canteen content/tray/payment, orders model, v8 pantry → v9 orders migration).
- Canteen e2e: 12/12 (layout at all 8 viewport profiles; serving by tap and drag, replace, take back, live total; pay → Meal eats exactly that tray with each portion in its compartment, mouse and touch; not enough coins refused with nothing charged, smaller tray then pays).
- Full Playwright suite on the canteen build (before the cloud change): 99 passed, 0 failed, 221 project-skipped (32.6 min).
- Thought cloud: lobby layout, live-resize and the full five-level campaign tests re-run after the change — 10 passed; the campaign test asserts the cloud shows jelly → ramen → pizza → sushi → bubble tea in order. Screenshots checked at 390×844, 360×800, 480×640, 1280×720.
- Production `index-DHK5MB5Z.js` built and served at http://127.0.0.1:4173/ (HTTP 200); the bundle contains no `__GAME_DEBUG__` hook.

## Lobby bottom buttons — 2026-10-07 00:33 +05

- New SUPER MARKET / DECOR tiles (aspect 1.271 / 1.264) checked on screenshots at 390×844, 360×800, 480×640, 1280×720 (dev) and 390×844 (production): inside the screen, no overlap with Start.
- Lobby layout, secondary controls and live-resize e2e: 10 passed (all 8 viewport profiles). Store e2e (SUPER MARKET entry) on mouse-390 and touch-360: 7 passed.
- Production `index-DsOHwHKF.js` at http://127.0.0.1:4173/ (HTTP 200; both tile textures HTTP 200); no `__GAME_DEBUG__` in the bundle.

## Lobby bottom buttons at half size — 2026-10-07 01:25 +05

- Tiles: 51×40 px at 390×844, 43×34 px at 360×800, 66×52 px at 1280×720; tap zones ≥ 48×48 px.
- Lobby layout / secondary controls / live resize e2e: 10 passed (8 viewport profiles); store entry via SUPER MARKET: 2 passed.
- Production `index-D-p_k2aO.js` at http://127.0.0.1:4173/ (HTTP 200), no `__GAME_DEBUG__` in the bundle.

## DECOR → Skin — 2026-10-07 01:30 +05

- e2e: lobby secondary controls (DECOR tap opens Customization) and customization Back: 2 passed. Production `index-Bzuvaa3o.js` HTTP 200, no debug hook.

## Store Buy button — 2026-10-07 01:42 +05

- Store e2e 15/15 (all 8 viewport layouts with the Buy button in the bottom bar; scan-and-pay; not enough coins; leave checkout; new: Buy right away auto-scans and pays, mouse + touch).
- Screenshots 390×844, 360×800, 1280×720: Buy on shelves and Buy N at checkout visible, no overlap.
- Production `index-BzEYrgpx.js` at http://127.0.0.1:4173/ (HTTP 200), no `__GAME_DEBUG__`.

## Responsive wardrobe follow-up - 2026-10-11

- `npm test`: 54/54 passed.
- Customization responsive matrix: 15/15 passed at 360x800 touch, 375x812, 390x844, 393x873, 412x915, 430x932, 480x640, 844x390 touch landscape, 768x1024, 876x876, 1280x720, 1440x900, 1920x1080, 2560x1080 and 390x844 DPR 2.
- Visual review completed for 390x844, 844x390, 1440x900 and 1920x1080. The desktop catalog and heroine are larger; landscape uses two columns; the tablecloth reaches the bottom without revealing wallpaper.
- Production build: `index-D2D56bAz.js`, 1,466.68 kB (gzip 397.15 kB). Local preview returns HTTP 200 and references this exact bundle.

## Character head alignment follow-up - 2026-10-11

- The shared head layer was lowered by 0.065 head cells; the mouth, front-hair clip, hats and glasses use the same offset. This supersedes the insufficient 0.025 pass.
- Visual regression passed for Frog Sweater, Orange Cat and Pink Plush plus both hats and both glasses at 390x844.
- Desktop Lobby and Customization checks passed 4/4 at 1440x900 and 1920x1080. Unit suite passed 54/54.
- Production bundle: `index-CeE-CSMG.js` (1,466.76 kB, gzip 397.18 kB); localhost returns HTTP 200 and references this exact bundle.

## Still manual / out of scope

- Physical phone safe-area/notch and actual DPR 3.
- Low-end-device performance and subjective gesture feel.
- Subjective audio volume and timbre on physical devices; real platform mute/pause/ad lifecycle remains for the final YouTube SDK pass.
- Real rewarded-ad and YouTube platform SDK behavior.
