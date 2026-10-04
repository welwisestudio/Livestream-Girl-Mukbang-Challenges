# Validation — Level 1 polish (2026-10-04)

Browser: Chrome for Testing (`ms-playwright/manual-download/chrome-win64`), passed through `PLAYWRIGHT_EXECUTABLE_PATH`.

## Automated

- `npm test`: **5/5 passed**.
  - Load-before-write and the starting wallet.
  - Reward paid once per run.
  - The six-step config.
  - Every texture used by the config exists in the asset manifest.
  - A failed save rejects the claim, and a retry persists it without paying twice.
- `npx playwright test`: **14 passed, 6 skipped** (skips are by design: a mouse-only or touch-only test in the other projects). Five projects: mouse 390×844, touch 360×800, mouse 412×915, short 480×640, desktop 1280×720.
  - **Layout:** HUD, header and button rectangles are inside the viewport. Avatar ≥ 56 px, primary button ≥ 60 × 220 px, every touch target ≥ 44 px, smallest text ≥ 12 px, image distortion < 2 %.
  - **Full Level 1 with real mouse input,** plus a touch run. Negative cases:
    - tapping a locked card;
    - repeated taps on Make Jelly, ✓ and Claim;
    - dropping the pitcher away from the bowl;
    - too short a stir;
    - a sideways mold drag;
    - dropping a portion away from the mouth.
    
    Feeding by tap is also checked.
  - **Live resize** from 390×844 to 820×600 in the middle of the pour step. The level continues and completes. A replay pays exactly once more (1400).
- Visual capture (`scripts/qa-capture.mjs`): 22 screenshots per viewport at 390×844, 360×800, 412×915, 480×640, 768×1024 and 1280×720. All of them completed Level 1 (coins 1000 → 1200, Level 2).
- **Minified build** (`npm run build:qa`, the production build plus the test hook): full playthrough at 360×800, 390×844 and 412×915 with 0 errors.

## Production build

- `npm run build`: passed. dist is 2.3 MB: JS 1.3 MB (≈340 KB gzip, mostly Phaser), art 1.0 MB, Fredoka latin woff/woff2.
- The bundle contains none of `__GAME_DEBUG__`, `debug-overlay`, `layoutReport`, `ytgame`, `higgsfield` or the old `/assets/generated` paths.
- Production preview at `http://127.0.0.1:4173/` (build 2026-10-04 17:37 local time).
  - Every asset returns HTTP 200; no console errors.
  - The loading screen reaches 100 % and fades out.
  - A real click on Start Live opens the pre-stream.

## Bugs found and fixed during validation

- After any resize or rotation, input was mapped with the old canvas size (CSS size and Phaser `displayScale` were stale), so taps and drags missed. Now the CSS size is set and the scale manager refreshed on every viewport change.
- If saving failed, Claim stayed locked forever. Now it shows Retry, and a retry persists the reward without granting it twice.

## Not yet verified

- A real phone with touch and safe-area notches. Touch was tested through Chromium touch emulation.
- Actual DPR 3 devices (rendering is capped at DPR 2).
- Performance on low-end devices.
- Audio (there is none yet).
- The YouTube SDK (out of scope).
