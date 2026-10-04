# Validation — CP3 Lobby/layout correction (2026-10-04)

Browser: installed Microsoft Edge. Playwright now uses `PLAYWRIGHT_EXECUTABLE_PATH` when supplied and otherwise detects the standard Windows Edge installation; a missing Playwright-downloaded Chromium no longer prevents local QA.

## Automated evidence

- `npm test`: **6/6 passed**.
  - versioned default save and load-before-write;
  - atomic one-payment-per-run reward;
  - exactly five permanent IDs in the confirmed order;
  - every texture referenced by every recipe exists;
  - unlock cannot skip progression, deducts once and does not dead-end;
  - failed reward save retries without a duplicate payout.
- Lobby geometry/collision matrix after the rebuild: **8/8 passed**.
  - Layout at 360×800 touch, 375×812, 390×844, 393×873, 412×915, 430×932, 480×640 short/wide and 1280×720 desktop.
  - Profile, wallet and Settings do not intersect. Side feature groups are mutually separated and do not intersect the character, mascot, thought bubble, HUD or bottom navigation. Super Market, Start and Decor remain disjoint.
  - Every visible text bound and hit target stays inside the viewport; touch targets remain at least 44 px; image X/Y distortion remains below 2%.
- Dynamic Lobby resize sequence 390×844 → 430×932 → 480×640 → 360×800 → 390×844: **passed**.
- Full Level 1 player-facing UI route at all eight viewport profiles: **8/8 passed**.
  - Checks prestream/Viewer Request, every cooking step, mukbang, result and return to Lobby.
  - Rejects overlap between interaction targets and HUD/header/progress/request rectangles in addition to clipping and viewport overflow.
- Full five-level campaign route after the Lobby rebuild: **passed in 2.5 minutes**.
  - Full fresh-save route at 390×844: Loading → Lobby → Jelly → mukbang → result → Ramen unlock/play → Pizza unlock/play → Sushi unlock/play → Bubble Tea unlock/play → final result.
  - Final state: coins 1620, `highestLevel=5`, `availableLevel=5`, one completion receipt per level.
  - Real mouse input for every cooking/mukbang action. Wrong choice, wrong drop, incomplete stir, cross-axis directional drag, repeated tap and wrong feed do not advance or lock a level.
  - Touch-emulation complete Level 1 at 360×800.
  - Live resize 390×844 → 520×680 during the pour step; interaction remains usable.
  - Browser reload after Level 1 preserves 1200 coins, Jelly completion and Ramen availability.

## Visual comparison

- Source comparison: `LobbyScreen.jpg` was opened at original resolution beside fresh implementation captures in `qa/lobby/`; cooking/livestream screens were checked against the existing campaign captures, `GameplayVideo` keyframes and `Video2` 00:38–01:48.
- Home now matches the reference composition: one readable top HUD with a reserved Settings slot, large unboxed illustrated side features, reference-scale character/thought bubble, table beginning near the same vertical landmark, and three separate bottom actions with Start strongest.
- Cooking reuses the Video2 hierarchy: HUD, large step tracker, one dominant work object, real illustrated food/tool, animated hand and safe bottom choices.
- Livestream reuses the confirmed large character, LIVE badge, three servings and atmospheric comments without covering the food.
- Completion uses the reference-like centered photo/reward modal and large claim CTA.
- Final Lobby frames for every tested size: `qa/lobby/`. Runtime frames for every cooking step, all five mukbang screens and all five results: `qa/campaign/`.
- No known overlap or clipping was visible in the inspected frames; geometry checks confirm player-facing rectangles and hit targets remain within every tested viewport. Images remain uniformly scaled (no X/Y stretching).

## Production

- `npm run build`: pass; final unpacked `dist` is 4,506,702 bytes (≈4.30 MiB). Build time: 2026-10-04 23:36:44 +05:00.
- Production bundle excludes the dev-only test hook and does not contain `ytgame` or runtime Higgsfield calls.
- Fresh clean-browser production check at `http://127.0.0.1:4173/`: HTTP 200, loader removed after real asset progress, final 390×844 Lobby captured at `qa/lobby/production-390x844.png`, and bundle scan contains no `__GAME_DEBUG__`, debug overlay, `ytgame`, Higgsfield or MCP runtime string. Preview process remains running.

## Bugs found and fixed in this checkpoint

- The previous character used most of the center width and forced side features toward it; its scale is now bounded by the center-character region and matches the reference proportion.
- Side features used generic rounded cards whose visual and hit rectangles invaded adjacent zones; they now use unboxed reference-like icon/label stacks inside dedicated left/right regions.
- The coin overhang originally intersected the profile rectangle; the wallet now owns a separate measured group and reserved Settings slot.
- The thought bubble and mascot initially intersected Skin/Daily bounds during the new collision test; their anchors and maximum sizes were corrected for every portrait profile.
- Bottom hit zones exceeded short/desktop viewports by less than 2 px; compact-layout navigation is now vertically clamped.
- Feature hit areas extended 2.8 px outside the left edge at 390×844; side anchors and bottom spacing were corrected.
- Re-entering the reused ResultScene called a stale layout closure after its previous modal was destroyed; scene-owned modal/layout state is now reset in `init` and `clearPanel`.
- The existing full-campaign test exposed both issues before acceptance.

## Still manual / out of scope

- Physical phone safe-area/notch and actual DPR 3.
- Low-end-device performance and subjective gesture feel.
- Audio.
- Real rewarded-ad and YouTube platform SDK behavior.
