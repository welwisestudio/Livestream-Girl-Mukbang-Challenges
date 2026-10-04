# Current project status

Updated: 2026-10-04 — CP3 Lobby/layout correction candidate, waiting for game-designer review.

## Implemented

- Exactly five standard cooking levels in the confirmed order: Jelly → Ramen → Pizza → Sushi → Bubble Tea. No Level 6, placeholder campaign level or active Premium level exists.
- Reference-led loading, lobby, cooking, livestream/mukbang, new-recipe and completion/reward screens share one pastel hand-drawn visual system.
- Home was rebuilt directly against `LobbyScreen.jpg`: one full-width top HUD, illustrated side features without generic cards, reference-scaled central character/thought bubble, a separate checkered table region, and Super Market / dominant Start / Decor bottom navigation. Out-of-scope hub features show a compact `Soon` response and do not block the campaign.
- Lobby layout is structural: top HUD, left features, right features, center character, table and bottom navigation have recomputed bounds, safe margins and min/preferred/max sizes. A named z-order keeps background → environment → character → decor → features → HUD → feedback → popup.
- Five recipes are data-driven in `src/content/levels.js`; screens do not hardcode campaign progression.
- Reusable actions: choice + confirm, drag/transfer, pour, circular mix/spread, directed lift/roll/slice, tap-process, topping placement and feeding.
- Each recipe flows through Viewer Request → cooking → request fulfilled → Perfect → three-serving livestream/mukbang → reward.
- Coins, completed levels, available next level and purchased unlocks persist through the dev adapter. Configurable unlock prices are 120/160/200/240; rewards are 200/220/260/300/360. These are safe provisional values, not final balance.
- New campaign art was generated with requested Higgsfield model `nano_banana_2` (jobs report backend alias `nano_banana_flash`) and cut out with the separate Higgsfield Background Remover.

## Verification

- Unit tests: 6/6 pass.
- Real browser full route passes from a fresh save through all five levels; final state is five completed levels, Level 5 unlocked and 1620 coins.
- Real touch-emulation Level 1 passes; invalid choice/drop/stir/directional/feeding inputs do not advance or lock the game.
- Lobby collision/layout matrix passes at 360×800, 375×812, 390×844, 393×873, 412×915, 430×932, 480×640 and 1280×720; dynamic Lobby resize also passes.
- A complete Level 1 UI route passes at all eight sizes. The audit covers cooking, Viewer Request, mukbang and result, and rejects clipped text, off-screen targets, distorted art, chrome-to-chrome overlap and gameplay-target-to-HUD overlap.
- The full five-level route was repeated after the Lobby rebuild and passes with the expected final state.
- Reload persistence passes. Visual QA frames for every cooking step, each mukbang and each result are in `qa/campaign/`.
- Production build passes. The YouTube SDK, real ads and audio remain intentionally out of scope.

## Review / known limits

- Awaiting game-designer CP3 review of visual feel, recipes and provisional economy.
- Remaining deliberate visual difference from `LobbyScreen.jpg`: the already approved orange cat-hood heroine and existing illustrated feature/mascot assets are retained instead of copying the reference character and icons. No generation credits were spent on this layout correction.
- Real phone/safe-area notch, DPR 3 and low-end-device performance still require physical-device verification.
- Hub systems (Part-Time, Canteen, Store, Skin, Daily, Supermarket and Decor) are visible as future feature entrances only; their gameplay is not implemented.
- Viewer Request currently acts as the visible objective and is fulfilled by normal recipe completion; it does not grant a second separate bonus.
- Rewarded-ad and Premium architecture remain inactive; no real platform SDK is connected.
