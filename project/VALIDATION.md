# Validation — CP3 + Character Customization (2026-10-05)

Browser: installed Microsoft Edge. Playwright now uses `PLAYWRIGHT_EXECUTABLE_PATH` when supplied and otherwise detects the standard Windows Edge installation; a missing Playwright-downloaded Chromium no longer prevents local QA.

## Automated evidence

- `npm test`: **9/9 passed**.
  - versioned default save and load-before-write;
  - atomic one-payment-per-run reward;
  - exactly five permanent IDs in the confirmed order;
  - every texture referenced by every recipe exists;
  - unlock cannot skip progression, deducts once and does not dead-end;
  - failed reward save retries without a duplicate payout.
  - v1/v2/v3 saves migrate to schema v4 with seven-category appearance/environment defaults;
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
  - Real mouse input for every cooking/mukbang action. Wrong choice, wrong drop, incomplete stir, cross-axis directional drag, repeated tap and wrong feed do not advance or lock a level.
  - Touch-emulation complete Level 1 at 360×800.
  - Live resize 390×844 → 520×680 during the pour step; interaction remains usable.
  - Browser reload after Level 1 preserves 1200 coins, Jelly completion and Ramen availability.

## Visual comparison

- Source comparison: `LobbyScreen.jpg` was opened at original resolution beside fresh implementation captures in `qa/lobby/`; cooking/livestream screens were checked against the existing campaign captures, `GameplayVideo` keyframes and `Video2` 00:38–01:48.
- All eleven Skin references were opened at original resolution. `SkinChanging` governed the screen topology; Dress/Hair/Hat images governed modular character/accessory art; Background/Table images governed environment variants; Pet images were compared with the retained sprout companion.
- Home now matches the reference composition: one readable top HUD with a reserved Settings slot, large unboxed illustrated side features, reference-scale character/thought bubble, table beginning near the same vertical landmark, and three separate bottom actions with Start strongest.
- The formerly retained Lobby atlas was rejected by the designer and replaced with one 2K Nano Banana 2 job per visible asset. Raw and cutout contact sheets were visually inspected; the accepted heroine has no neck, every transparent result has zero-alpha corners, and the default 390×844 capture is `qa/lobby/mouse-390x844.png`.
- Cooking reuses the Video2 hierarchy: HUD, large step tracker, one dominant work object, real illustrated food/tool, animated hand and safe bottom choices.
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

## Still manual / out of scope

- Physical phone safe-area/notch and actual DPR 3.
- Low-end-device performance and subjective gesture feel.
- Audio.
- Real rewarded-ad and YouTube platform SDK behavior.
