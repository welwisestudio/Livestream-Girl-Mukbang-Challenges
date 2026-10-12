# Current project status

## Rewarded customization items (2026-10-12 23:46 +05) — implemented

- Every 3rd item inside each customization category (3, 6, 9…) is now a permanent Rewarded Ad unlock. The current rewarded items are Plum hair, Deep skin, Pink Plush outfit, Cocoa Beret, Heart Pop glasses, Pink Daisy table and Soft Garden room.
- Rewarded cards replace the coin price with a compact illustrated video/`AD` badge. The badge and the existing price/owned labels were raised to keep a safe gap above Apply on tablet layouts; all 18 configured viewport profiles pass containment and no-overlap checks.
- The action changes to `Watch to unlock`. `RewardService.unlockAppearanceWithAd` uses placement `customization-item-unlock`; only confirmed `earned` adds the item and receipt in the same save mutation. Cancel, failure, unavailable, thrown SDK errors and parallel requests grant nothing and spend no coins. Coin purchase rejects rewarded items.
- Existing saves keep already-owned items; fresh saves lock the third Skin item so the rule is consistent in every category. Normal item 1–2 ownership/coin behavior is unchanged. External earned item rewards remain valid alternative grants.
- Verified: unit suite 66/66; rewarded behavior on mouse and touch; seven-category catalog audit; layout across 18/18 viewports; existing purchase/apply/reload/Level 1 customization route. Production bundle `index-DdYv-K_S.js` is served with HTTP 200 at `http://127.0.0.1:4173/`; a 390×844 production-browser smoke test loaded the full canvas with no console or page errors.

## Lobby Free Coins rewarded offer (2026-10-12 23:20 +05) — implemented

- The Lobby wallet now has a compact circular green `+` fully contained inside the white wallet pill. It opens a reference-style popup that shows the exact `+1000` reward, a rewarded-video icon, an optionality note and a close button before any ad starts.
- `RewardService.claimFreeCoinsWithAd` uses placement `lobby-free-coins`, grants only on confirmed `earned`, saves one receipt per popup opening, and grants nothing for close/cancel, unavailable, error, parallel or repeated requests.
- The reward is saved before the coin flight and HUD count-up. Responsive checks cover all 18 configured viewports, balances `1000`, `17930` and `999999`, and mouse/touch input.
- Verified: unit suite 62/62; layout 18/18 viewports; Free Coins cancellation/error/unavailable/earned/reload and TEST-ad close/finish passed; production bundle `index-9Bor3nbh.js` is served with HTTP 200 at `http://127.0.0.1:4173/`.

## One HUD on every screen (2026-10-12 22:26 +05) — implemented, awaiting designer review

- Designer request: use one UI style everywhere (the second, better version), centre the nickname in the profile panel and lower it slightly, keep avatar, level badge and coin bar aligned, and make the top HUD consistent on all screens. The designer chose the Lobby HUD as the standard.
- Before: three HUD variants.
  - Lobby: grey outline, orange ring, level badge under the avatar, coin stack, "User".
  - Wardrobe: the same with a heart coin and "Player".
  - Gameplay (level, stream, result): pink outline and ring, "Lv. 1" plus a fixed decorative XP bar inside the card, heart coin, smaller and higher.
  - Supermarket, checkout and canteen also had their own lilac art wallet.
- Now:
  - `Hud.layout()` builds the Lobby HUD in the Lobby's own region (`computeLobbyRegions(frame).hud`), without the settings-gear slot;
  - the HUD band (top offset and height) is computed once in `computeFrame` and read by `computeLobbyRegions`; `frame.hud.bottom` includes the level badge under the avatar (`hudMetrics().overhang`), so content below the HUD clears it;
  - every screen shows the coin stack and the nickname "Player"; the decorative XP bar and the forced "User" on the reward screen are gone;
  - the nickname is centred in the visible part of the card, set slightly below its middle, and shrinks to fit long names;
  - the Supermarket/Checkout/Canteen wallet (`CoinPill`) is the same plate: paper fill, grey 3 px outline, drop shadow, coin stack.
- Captures: `qa/responsive/390x844/` and `qa/responsive/1920x1080/` (`node scripts/qa/responsive-shots.mjs`).
- Production `dist/` rebuilt 2026-10-12 22:26 +05 (bundle `index-Cf2yy2U5.js`), served at http://127.0.0.1:4173/ with HTTP 200.

## Supermarket bottom bar, readable on short screens (2026-10-12 22:10 +05) — implemented, awaiting designer review

- Follow-up report (phone screenshot): the column was tiny and the `0/5` text stuck out of its pill. Cause: on a short bar the art pills (fixed proportions) made the whole column scale down, while the text kept a minimum size.
- The count and total pills are now drawn in code, with the same white fill and lilac 3 px outline, so their height follows the bar independently of their width. Minimum sizes: 30 px pill and a 40 px Buy, which sets the column width when the bar is very short.
- When there is no room for two pills they merge into one "cart 3/5 · coin 370" pill. One font size is fitted to every pill row, so text always stays inside.
- The layout e2e checks, on all 18 profiles, that the text sits inside its pill, its height is at least 14 px, the column is at least 100 px wide and the pills are at least 30 px tall. Close-ups from 360×560 to 1920×1080 are in `qa/store-bar/` (`node scripts/qa/store-bar-shots.mjs`).
- Production `dist/` rebuilt 2026-10-12 22:10 +05 (bundle `index-CYyyxSTd.js`), served at http://127.0.0.1:4173/ with HTTP 200.

## Supermarket bottom bar, first pass (2026-10-12 21:52 +05)

- Designer report: the bar under the shelves (live card, basket, Buy, 0/5, Total) looked ragged, and pieces must not overlap.
- Cause: each piece was scaled by its own formula. The Buy button was small, the two pills had different widths and offsets, and the cart icon stuck out of its pill.
- New layout (`StoreScene.layout`):
  - one right-hand column of equal width — count pill, Total pill, Buy button — on one centre line;
  - the live card (left), basket (centred) and Buy share one bottom line;
  - pill contents are centred groups, and Total shrinks its text to fit;
  - when the bar is short the whole column scales down together;
  - on wide screens the column and the live card stand in the empty areas beside the shelves.
- The Store layout e2e now also checks equal column width, one centre line and one bottom line, besides the existing no-overlap checks against each other and the price tags. 18/18 viewport profiles pass; captures are in `qa/store-bar/`.
- Production `dist/` rebuilt 2026-10-12 21:52 +05 (bundle `index-CknlTxfL.js`), served at http://127.0.0.1:4173/ with HTTP 200.

## Supermarket stream: viewer donations (2026-10-12 21:12 +05) — implemented, awaiting designer review

- Designer request: buy food → spend coins → eat it on stream → viewers donate coins → earn the money back or a profit; the "Delicious!" screen shows the total, which is added to the balance once.
- Rules (`STREAM_DONATIONS` in `src/content/food.js`, tunable):
  - each eaten snack earns 110–140 % of its price, rounded to 5;
  - the rate is fixed per order item by a hash, so it can never be re-rolled;
  - the amount is paid as three donations: one per bite (2) plus a cheer when the snack is finished.
- Canteen streams have no donations (not requested).
- Save and anti-double-claim (`FoodOrderService`):
  - orders now store `cost`, `earned` and a per-item `donated` flag;
  - `startServing` records an item's donations once, before the scene animates them;
  - the `consume` call that eats the last item removes the order and adds `earned` to coins in the same save step, guarded by the receipt `stream:<orderId>`;
  - an order left half-eaten keeps its earned coins (also across a reload) and pays them when finished;
  - older saved orders get `cost` from their remaining items and `earned: 0`.
- Stream UI (`src/ui/donations.js`):
  - an earned-coins pill on the LIVE row (LIVE shifts left when both don't fit centred);
  - each donation is a gold chat bubble ("Bunny donated 40!"), and coins fly from that viewer's avatar to the pill along a curve with a sparkle trail;
  - the pill counts up per landed coin with a scale and coin-spin pulse, a floating "+amount" and a short procedural coin tone.
- "Delicious!" card shows "They donated: +N" with the coin stack and "Snacks cost X · Profit +Y". The wallet is raised above the card's veil; coins fly from the card into it and it counts up to the saved balance.
- Also fixed: repeated HUD coin bumps compounded into an oversized wallet coin.
- Verified:
  - unit tests 60/60, including once-only donations, exactly-once payout, resume after reload, plan determinism and no donations for the canteen;
  - Store e2e: the full mouse and touch route checks counter growth during the stream, an unchanged balance until the end, payout = earned = shown, balance = 480 + earned, wallet = save and one `stream:` receipt;
  - new e2e: the LIVE pill and counter stay on screen and clear of the HUD on all 18 viewport profiles, with the flight captured (`qa/store/*-donation-flight.png`, `*-donations-result.png`).
- Production `dist/` rebuilt 2026-10-12 21:12 +05 (bundle `index-yIAfVjSV.js`), served at http://127.0.0.1:4173/ with HTTP 200.

## Even outlines and clean edges (2026-10-12 20:43 +05) — implemented, awaiting designer review

- Designer report (phone screenshot of the wardrobe): outlines of uneven thickness and a strange coloured glow behind elements.
- Causes found:
  - the wardrobe card and tab frames were generated images with a mint halo from their generation background and a painted outline that scaled with the frame (about 5 px on item cards, about 2 px on tabs);
  - the HUD pills and shared panels had a brown shadow offset 2 px sideways, so one edge looked thicker;
  - code-drawn outlines used 1.5, 2, 2.5, 3, 4 or 5 px in different places.
- Fixes:
  - one outline token `UI_OUTLINE = 3` (`src/ui/draw.js`) for every code-drawn frame: HUD pills, avatar rings, level badges, panels, progress bar, quest dots, notices, result tiles and the catalog panel;
  - one straight-down `dropShadow` helper replaces every sideways-offset shadow;
  - wardrobe cards and tabs are now vector frames in the art's own cream/peach and cyan colours, so their outline is the same 3 px at every size and the halo is gone;
  - the asset build recolours the mint rim on the close button, price pill, five tab icons and NEW badge from the neighbouring art (RGB only, alpha untouched; mint pixels per image fell from 1,600–4,500 to under 80).
- Text strokes, the thin inner white highlights and the generated button artwork keep their own designs.
- Verified: wardrobe and Lobby e2e on all 18 viewport profiles (39 passed); Playtime, Reward and Settings at 390×844 and 1920×1080 (18 passed); Levels screen and Level 1 (4 passed); unit tests 57/57. Captures are in `qa/outlines/` (`node scripts/qa/outline-shots.mjs`).
- Production `dist/` rebuilt 2026-10-12 20:43 +05 (bundle `index-BdbxzqnY.js`), served at http://127.0.0.1:4173/ with HTTP 200 and no console errors.
- Known and unchanged: on wide screens the wardrobe price pills sit tight against the Apply/Buy button. This already showed in the committed desktop capture.

## Lobby proportions (2026-10-12 16:09 +05) — implemented, awaiting designer review

- Designer request: the table took far too much height. The tabletop between the table edge and the Start row is now a compact strip, `clamp(13 % of height, 84 px (52 px low landscape), 170 px)`, and the Start row sits near the bottom edge. At 390×844 the tabletop strip went from 270 to 110 px (2.45× shorter) and the cloth from 47 % to 26 % of the screen; at 1920×1080 the strip went from 403 to 140 px (2.9×).
- The heroine takes the largest size whose visible silhouette clears the side columns. The head band may sit between the columns and the shoulders below them; she stays under the HUD with room for the thought cloud, capped at 46 % of screen height (62 % in low landscape). Heights: 390×844 186 → 258 px (1.39×), 360×640 162 → 290 px, 768×1024 240 → 471 px, 1920×1080 292 → 497 px (1.7×), 844×390 123 → 182 px.
- The sprout sits in its basket on the table edge beside her right shoulder, as in the reference. The props form one row (cutlery tray + phone | placemat with plate | spoon + mitts). Side buttons, HUD, nav tiles, art and tablecloth are unchanged. The layout change is only in `HomeScene.layout`; the shared `computeLobbyRegions` that other screens use is untouched.
- The e2e Lobby overlap check now uses the heroine's visible head and shoulder rectangles (`character-head`, `character-body`) instead of the transparent rig canvas. It also checks that the props and the sprout basket don't collide.
- A stale e2e step (tapping the gear expected to stay on the bare Lobby; it now opens Settings) now closes Settings with Back Home.
- Verified: Lobby layout and live resize e2e on all 18 viewport profiles; Lobby controls; Settings, Playtime, Store, Canteen, Part-Time and Reward specs (30/30 at 390×844); Level 1 entry, touch completion, reload persistence, the Levels screen and customization purchase at 390×844, touch 360×800 and 1920×1080 (9 passed, 6 skipped by design); unit tests 57/57. The proportion audit (`node scripts/qa/lobby-proportions.mjs`) at 16 sizes is in `qa/lobby-proportions/` with no page errors.
- Production `dist/` rebuilt 2026-10-12 16:09 +05 (bundle `index-F8miIw4d.js`), served at http://127.0.0.1:4173/ with HTTP 200 and no console errors.

## Loading screen background (2026-10-12 15:26 +05) — implemented, awaiting designer review

- The loader had no background artwork, only a CSS checkerboard. The visible "crop" was the logo itself: Background Remover had kept opaque cream chunks of the old argyle backdrop between the letters, so the logo showed as a lighter hard-edged box.
- New full-bleed wallpapers from Nano Banana Pro (portrait 3:4 and landscape 16:9, 4K masters). They are cream/peach argyle with small food doodles, with no frame, card, text or focal object, so CSS `cover` can crop them at any aspect. Portrait art is used below a 1:1 aspect and landscape art from 1:1 upward. A soft cream radial glow keeps the doodles behind the logo, mascot and bar.
- The logo was regenerated on a flat blue key from the approved logo crop and cut out by Higgsfield Background Remover. Two tiny enclosed key islands and the blue edge spill are repainted reproducibly in `scripts/build-assets.mjs` (RGB only, alpha untouched).
- Verified with `node scripts/qa/loading-viewports.mjs` across 14 viewports from 320×568 to 2560×1080, including the 640×360 embed. All passed: the loader covers the full viewport, the correct variant and `cover` are applied, all four edge strips are textured (no flat or empty band), and the logo, mascot, bar and label stay on screen without overlapping. Screenshots and `report.json` are in `qa/loading/`. A real JS boot at 390×844 and 1920×1080 hides the loader with no console errors. Unit suite 57/57.
- Production `dist/` rebuilt 2026-10-12 15:25 +05 (bundle `index-dpk8YX3T.js`; only `index.html` and loading art changed) and served at http://127.0.0.1:4173/ with HTTP 200.
- Known pipeline quirk, not changed here: `npm run assets` still overwrites the six Settings images from an older atlas block. Run `npm run assets:settings` afterwards to restore the committed versions.

## Production preview recovery (2026-10-12 15:05 +05) — online

- The reported `Failed to Load Page` was caused by no local Vite server listening on ports 4173, 4180 or 5173; it was not a game runtime failure.
- Rebuilt the production `dist/` with Vite 8.3.2 and started the canonical preview at `http://127.0.0.1:4173/` (bundle `index-dpk8YX3T.js`).
- Verified HTTP 200, the 390×844 Phaser canvas, page title and a clean browser console/page-error log. Unit suite remains 57/57.
- Port 4180 in the older Settings entry was a temporary preview address. The project command and current handoff address use 4173.

## Fresh local build package (2026-10-12 04:04 +05) — ready

- Rebuilt the accepted local/dev game and packaged the contents of `dist/` as `release/livestream-girl-mukbang-challenges-latest.zip`.
- Packaging verification checks `index.html` at the ZIP root, the complete path list, portable filenames and SHA-256 equality for every packed file.
- Verified package: 606 files; 19,271,159 bytes unpacked; 18,273,744-byte ZIP; SHA-256 `27c47f00f56ad1b6dac4c6ba8ff41cb44265c44d4ec13402b7ff5e78df222913`.
- This is the current local/dev build with the explicit mock platform adapter; it is not a passed YouTube SDK release.

## Settings and audio controls (2026-10-12) — implemented

- The Lobby gear now opens a reference-led Settings window with separate Music and Sounds switches and a Back Home button. Both choices persist in save schema v11.
- Audio starts only after the first player gesture. User music/sound choices, platform mute and pause reasons remain independent; the current local build uses a quiet procedural melody and UI tones, so no runtime network audio is needed.
- The six UI pieces were generated from `reference/input/Settings.jpg` with Nano Banana 2 and separately processed by Higgsfield Background Remover. Runtime assets are reproducible with `npm run assets:settings` or the full `npm run assets`.
- Verified: unit suite 57/57; settings e2e 3/3 at 390×844, 1280×720 and touch 844×390, including persistence after reload. Screenshots: `qa/settings/`. Production build `index-dpk8YX3T.js` is served with HTTP 200 at http://127.0.0.1:4180/.

## Character head alignment follow-up (2026-10-11) - implemented

- The shared appearance rig lowers the complete head layer by 0.065 head cells so the chin meets and slightly overlaps the collar instead of floating above the torso.
- Hats, glasses, mouth/feed anchor and the front-hair cut move with the head. The generated runtime texture cache advanced to v17.
- Visual checks passed for all three outfits, both hats and both glasses at 390x844; Lobby and Customization geometry passed at 1440x900 and 1920x1080. Unit suite: 54/54.
- Production bundle `index-CeE-CSMG.js` is served with HTTP 200 at http://127.0.0.1:4173/.

## Responsive wardrobe follow-up (2026-10-11) - implemented

- Character Customization now uses a wider 620-760 px desktop catalog instead of the narrow portrait column. Cards, tabs, plate and preview scale with it; the desktop heroine preview is about one third larger.
- The selected tablecloth now fills the complete foreground from the table edge to the bottom of every viewport, including the space behind and beside the catalog panel.
- Low landscape screens use a dedicated two-column composition: heroine and table objects on the left, HUD and wardrobe on the right. Sprites and controls no longer cover one another at 844x390.
- Verification: Customization layout 15/15 at phone, short phone, landscape, tablet, square, 1280x720, 1440x900, 1920x1080, ultrawide and DPR 2; unit suite 54/54. Production bundle `index-D2D56bAz.js` is served with HTTP 200 at http://127.0.0.1:4173/.

## Level-fix pass (2026-10-08, latest) — awaiting designer review

- Full logical and visual audit of all 50 levels: every step was captured before and after with real mouse input (`scripts/qa/recipe-audit.mjs`, contact sheets via `scripts/qa/level-sheet.mjs`).
- Level 5 Bubble Tea: the lid step is fixed. The cup already showed a lid and straw before "Seal the cup", and sealing was a tap on an unrelated machine. New flow: pearls → syrup → milk tea → ice cubes → drag the lid on → shake the closed cup (any side-to-side wiggle counts) → push in the straw.
- Whisk: the shared batter bowl had an upside-down whisk painted in, and the stir step held `k-whisk` by its wires. Replaced by `k-bowl-mix` (no utensil) plus per-tool grips. Affected Levels 6, 7, 9, 16, 30, 31 and 39; the bowl is now used only by Pancakes.
- Containers are tipped over the food (`tipIn`) instead of being dropped onto it as pieces. Pieces that stay on the food use single-piece sprites: pepperoni, pepper, ice cube, jalapeño, salmon, egg/carrot/spinach strips and others.
- Missing intermediate states now have art: plain omurice, peeled banana / banana on a stick / plain chocolate banana, plain churros and wings, empty bowls, moulds, tins, blender and glass, open buns, tortillas, taco shells, a plain dough sheet, a sliced pizza, a lidded cup and a matcha bowl. 63 new sprites from 7 Nano Banana Pro images, each through Background Remover (`project/ASSET-MANIFEST.md`).
- Variety: Levels 6–10 no longer all open with "whisk the batter". Levels 24, 27, 46 and 50 were made distinct from their earlier look-alikes (3, 4, 11 and 5); see DECISIONS.
- Eating reactions (`src/ui/reactions.js`): spicy fire breath (Levels 11, 21, 24, 33, 45), cold icicles and frost (5, 16, 49, 50) and hot steam (2, 26). Each plays after the first and the last serving.
- Verification: unit tests 49/49; `npm run assets` rebuilds every committed asset byte-for-byte. A real-mouse capture run (`scripts/qa/recipe-audit.mjs`) completed all 50 levels at 390×844 through mukbang with no console errors. Campaign e2e on mouse-390×844 and touch-360×800: the Lobby/Level 1 layout and resize tests pass; Levels 2–10 step capture passes; the sequential mouse 1→50 route passed (14.3 min) and the full touch 50-level route passed (20.7 min). Earlier runs of both 50-level routes timed out once each while waiting for the next mukbang serving. A targeted probe and the re-runs did not reproduce it. Another process was editing the repo at the same time (dev-server reloads), which is a possible cause, but this is not confirmed. Production build `index-D07MyvNd.js` (2026-10-08 18:49 +05) is served at http://127.0.0.1:4173/ and boots with no console errors.

Updated: 2026-10-08 — the cooking gameplay of Levels 2–50 was redesigned logic-first (the recipe determines the action). Steps now use real tools and ingredients, new dip/trace/cook-and-lift/gesture interactions, and a visible change on every step, with new Nano Banana 2 kitchen-tools and Levels 6–10 state art. Corn Dog (Level 6) is the sample awaiting designer approval before more art is generated.

## Recipe redesign (2026-10-08) — awaiting sample approval

- Plan: `project/RECIPE-PLAN.md`. Its per-level tables are generated from the current level data. Levels 1–50 now use direct recipe actions so that each step names its real tool or ingredient and its before/after food sprite.
- Root causes fixed:
  - one generic tool per action: the syrup pitcher was used for every pour and squeeze, the sushi knife for peeling and grating, and one stove for frying, boiling and baking;
  - place steps that dragged a copy of the dish onto itself;
  - steps that changed nothing visible.
- New engine kinds (`src/levels/recipeSteps.js`):
  - PLACE: drag a real ingredient; pieces stay where dropped. Also covers ordered builds, ring-cutter stamps and spoon dollops.
  - DIP/COAT: the food dunks into a bowl and comes out coated.
  - TRACE: sauce lines and sprinkles are drawn exactly where the finger moves, and only on the food.
  - COOK: drop the food into the fryer, pan, pot or oven (or tap the heat), watch bubbles, steam or sizzle, and tap when ready. An early tap shows "Not yet!".
  - GESTURE: cut, peel, grate, roll, a real flip, shake, press/knead and fold.
- A persistent decor layer (`src/levels/stepKit.js`) keeps sauces, particles and placed pieces on the food until the sprite changes.
- Art: a kitchen tools atlas (25 tools) and a Levels 6–10 states atlas (24 accepted cells), made with Nano Banana 2 plus Background Remover; provenance is in ASSET-MANIFEST. Corn Dog and Levels 7–10 have full dedicated art. 23 steps in other levels are marked ⏳ and still use the nearest existing sprite.
- Guards: `tests/unit/recipes.test.js` checks that every tool matches its action (the syrup pitcher only for syrup or honey, knives for cutting, the spatula for flipping, and so on), that every step changes the food visibly, and that Levels 2–50 have 4–7 actions.
- Wrong input never advances a step. The real-input route exercises each case: a drop outside the target, strokes off the food, a partial stir, a wrong-direction gesture and an early lift.
- Known polish items: the pancake pan turns from black to pink between steps 2 and 3 (the atlas pancake states use a pink pan); the Donut dough sheet already shows ring marks before cutting; Ramen cooks and serves in the same pot. All 23 ⏳ items are listed per step in the plan.

## Implemented

- Exactly 50 standard cooking levels in the confirmed order, from Jelly through Matcha Bubble Tea. Levels 6–50 use permanent string IDs and there is no placeholder Level 51 or active Premium level.
- Campaign loop: claiming the reward after Level 50 returns recipe progression to Level 1. Coins, wardrobe/customization ownership, store orders and the rest of the meta save are preserved; only `highestLevel`, `availableLevel` and per-recipe completion marks restart.
- Reference-led loading, lobby, cooking, livestream/mukbang, new-recipe and completion/reward screens share one pastel hand-drawn visual system.
- Home was rebuilt directly against `LobbyScreen.jpg`: one full-width top HUD, illustrated side features without generic cards, reference-scaled central character/thought bubble, a separate checkered table region, and Super Market / dominant Start / Decor bottom navigation. Out-of-scope hub features show a compact `Soon` response and do not block the campaign.
- The main character is the silver-haired girl from the designer's 2026-10-06 crop: silver bob with pointed bangs, thick brown brows, coral nose, blush, green turtleneck with a frog-face pocket. She was regenerated in Nano Banana 2 and is the free default (Silver hair + Peach + Frog Sweater, no glasses). Lobby, HUD avatar, cooking, mukbang, result screen, Skin tab and outfit cards all render the same live saved appearance.
- Save schema v11 retains all v1–v10 migrations, the 50-level campaign boundary, appearance ownership, orders, playtime rewards and previous progress, and adds independent persisted music/sound preferences.
- Lobby layout is structural: top HUD, left features, right features, center character, table and bottom navigation have recomputed bounds, shared spacing tokens and controlled min/preferred/max sizes. The reference-led z-order is background → character/accessories → foreground table → table objects → feature buttons → HUD → feedback → popup.
- The character is now physically masked by the foreground table instead of rendering over it. The thought bubble, mascot, plate and props have independent reference-led anchors; left/right features share one three-row rhythm; wide-screen HUD content remains in the centred gameplay column instead of stretching into a banner.
- Lobby controls have restrained hover/press feedback. All still-deferred secondary entrances respond with a safe `Soon` state; Start remains the dominant action and Skin opens Character Customization.
- The five Lobby side controls now render at 140% of the original unified size on portrait screens and both columns sit lower in the composition. Compact/short layouts use a safe 116% fallback. Their shared height remains equal; the heroine is centred, the thought bubble moves further left and the mascot sits lower on the tabletop so the larger Store and Daily Reward controls remain visually separate.
- The existing Skin entrance now opens a reference-led Character Customization wardrobe embedded in the Lobby composition. Seven categories (hairstyle, skin tone, outfit, hats/accessories, glasses, tablecloth and background) each have three options, live preview, cancel/X and Apply. Purchased, owned and equipped states use the shared coin balance and persist in save schema v5; older v1/v2/v3/v4 saves migrate safely.
- Customization polish now uses head-only Hair/Skin art with no neck at all; the old outfit neck is removed and the selected outfit's own painted fabric closes the space below the chin. Hair/Skin cards remain combination-aware, while Hair and Skin now have deliberately different category covers. Outfit-specific masks prevent the baked source hair from surviving under the selected head (including Pink Plush and the default hood), glasses derive their vertical anchor from the actual replacement-head eye line, hats stay fully inside the character canvas, and the catalog palette follows the selected tablecloth theme.
- The Skin catalog now follows the supplied close-up reference: icon-only cream tabs overlap the table/catalog seam, the large orange Close sits in the same row, the category title no longer consumes a competing row, cards are tall cream tiles with a cyan selected frame, the featured second hairstyle carries a readable pink `NEW` badge, and paid items use glossy green coin pills below the cards. Existing accepted art was sufficient, so this correction created no new Higgsfield jobs.
- The saved look uses aligned full-outfit happy/eating/chewing poses plus generated headwear/glasses. It is rendered in Lobby, HUD/avatar, cooking and livestream/mukbang. Selected tablecloth/background variants also persist and render in Customization and Lobby.
- Eleven accepted Nano Banana 2 jobs use the actual Skin references: the original outfit/accessory/environment atlases, corrected chewing sprite, corrected open eyewear, and three final 2K head-only hairstyle × skin-tone atlases for happy/eating/chewing. Three intermediate no-neck attempts were visually rejected and are not consumed. Ten separate Higgsfield Background Remover jobs produced the accepted transparent masters. Runtime WebP assets are rebuilt deterministically by `npm run assets`.
- All 50 recipes are data-driven: the 45 new definitions live in `src/content/recipeCatalog.js`, normalize into runtime steps in `src/content/levels.js`, and share scene/mechanic code.
- Reusable actions now cover drag/transfer/dip/scoop, repeated stack/assemble/topping placement, pour/fill-to-level, circular mix/spread/coat, repeated slice/chop/peel/grate/knead/shape/fold/wrap/flip/shake gestures, timed fry/boil/wait states and feeding. Invalid input does not advance a step.
- Lobby Start opens the level directly in its first cooking step (no pre-stream screen, no "Make …" button; 2026-10-11). Each recipe flows through cooking → Viewer Request card shown as fulfilled → Perfect → three-serving livestream/mukbang → (New recipe card on a first clear) → post-level reward offer → Lobby. The reward offer follows `ClaimMoney.jpg`: photo stack, multiplier bar x2|x3|x5|x3|x2 with an endlessly moving pointer, green rewarded-ad button (base × locked multiplier, paid only after an earned ad) and a small base-reward button (no ad). Base reward comes from level data; multipliers from `src/content/economy.js`.
- Coins, completed levels and the next open level persist through the dev adapter. Paid level unlocks were removed (2026-10-11): completing a level opens the next one for free, Start always plays, and older saves waiting on an unpaid unlock open the earned level on load. Base rewards are unchanged (Levels 6–50: `370…1690`); with no unlock spending, coins now only accumulate from the campaign, so the economy needs designer review.
- Levels 6–50 use 225 local WebP sprites cut from nine accepted 5×5 atlases. Every atlas requested Higgsfield `nano_banana_2` at 2K (completed jobs report `nano_banana_flash`) and every accepted atlas passed a separate Higgsfield Background Remover job. No runtime Higgsfield call or local chroma key is used.

- Playtime Rewards (former Daily Reward) open from the lobby: one-time track of seven rewards by minutes of active play (1/2/4/6/9/12/15 min → 200, 300, Pink Plush, 500, 1000, 2000, Plum hair), reference-matched window with NEW badges, cyan claimable tiles, checks and live countdowns, and a rewarded "Take All" that pays every remaining reward after an earned ad. Save schema v7.
- Part Time Job minigame (PartTimeJob.png reference) opens from the lobby: 6 customers per shift, 3 product cards, ordered silhouette requests (2–4 items), 15 s per customer on the left timer, wrong item = shake and −3 s, timeout = immediate fail screen, success = 300 coins once per run. Intro, pause (gear) and result dialogs.
- Supermarket (Store-Shelf/Matcha/Scan references): New Arrivals + Matcha shelves with price tags and page arrows, basket up to 5 with live count/total, checkout with drag-or-tap scanning, Pay with "not enough coins" handling, then a snack mukbang stream that serves exactly the paid snacks (save v8 pantry).
- Canteen (Canteen.png reference): six dishes on two counter shelves, spoon/ladle serving by tap or drag into a 5-compartment purple tray (replace, take back), live count and Pay total, "not enough coins" handling, then the meal stream eats exactly that tray, portion by portion. Paid food of both shops lives in save v9 `orders`.

## Verification

- Lobby bottom buttons resized (designer follow-up, 2026-10-08): Super Market and Decor now use 68% of their reserved navigation slots. This is slightly smaller than the rejected 75% pass while remaining clearly larger than the original 50% size. Fresh 390×844 capture confirms equal sizing and clear gaps from Start/screen edges. Lobby geometry passed all 8 supported viewports; unit tests pass 54/54.
- Level-gated cooking add-ons removed (designer request, 2026-10-08): the Level 1 mold/berries/glaze row no longer contains selectable cards, `Lv. 2`/`Lv. 3` locks or a separate ✓ confirmation. Those recipe actions are now direct drag/place/pour gestures. The unused `choice`/`topping` renderers, card/check UI and `TapChoiceMechanic` were removed from runtime code. A regression guard rejects `choice`, `topping` and step `options` across all 50 recipes. Unit suite passes 54/54; the complete Level 1 mouse route passes cooking, mukbang, result and return to Lobby, and refreshed `qa/campaign/orange-jelly-01-cooking-choose-mold.png` visually confirms the lock cards are gone.
- 50→1 campaign-loop follow-up (designer request, 2026-10-08): Level 50 completion now grants its reward atomically and resets only recipe progression to Level 1. Unit regression passes and preserves coins/meta ownership; a dedicated real-mouse browser run completed Matcha Bubble Tea, claimed the base reward and returned to an unlocked Jelly Level 1 lobby. Latest unit suite: 53/53.
- Taiyaki Level 39 follow-up (designer report, 2026-10-08): the supplied upside-down-whisk image was an orphaned capture from the pre-audit recipe. The current Level 39 has no whisk: ladle batter into the fish mold → spoon red-bean paste → close → cook. The dedicated real-mouse full-level rerun passed and refreshed all current captures, including `qa/recipes/taiyaki-39-cooking-fill-taiyaki-mold.png`; the obsolete `taiyaki-39-cooking-mix-taiyaki-batter.png` was removed. The first run completed gameplay but hit an OneDrive `ENOENT` while Playwright closed its trace; the immediate identical rerun passed cleanly.
- Omurice Level 36 cache follow-up (designer report, 2026-10-08): the fresh source and browser capture already show the wires in the egg and the handle above, while the reported frame is the pre-fix orientation. Direct local review now accepts `?level=N` for any campaign level (normal launches still enter Home), allowing a cache-busting Level 36 URL without modifying progress. Production HTML references the current hashed bundle; the corrected Omurice capture SHA-256 is `2c7ea3d53693481b0e9bca90fd8807bb80e3741c5cab072ebff926fc3d6a57d1`.
- Cupcakes Level 30 follow-up (designer report, 2026-10-08): the supplied upside-down-whisk image was an orphaned capture from the pre-audit recipe. The current Level 30 has no whisk step: fill four liners with the scoop → bake → pipe frosting → add sprinkles. A dedicated real-mouse full-level run passed and wrote the current `qa/recipes/cupcakes-30-cooking-fill-cupcake-liners.png`; the obsolete `cupcakes-30-cooking-mix-cupcake-batter.png` was removed so the QA folder no longer contradicts the live recipe.
- Sandwich Level 23 follow-up (designer report, 2026-10-08): `spread-sandwich-sauce` (circular spoon/stir) was replaced by `mayo-sandwich`, which traces white mayo from `k-piping-bag` across the bread before assembly. `project/RECIPE-PLAN.md` was regenerated. The dedicated real-mouse Level 23 route completed cooking and mukbang successfully; entry capture: `qa/recipes/sandwich-23-cooking-mayo-sandwich.png`. A regression test forbids any stir step in this recipe.
- Skewers Level 21 follow-up (designer report, 2026-10-08): the spoon/brush stir step was replaced by `season-skewers`, a spice-sprinkling trace using the red seasoning packet and chili particles. `project/RECIPE-PLAN.md` was regenerated. The dedicated real-mouse Level 21 route completed every cooking step and mukbang successfully; entry capture: `qa/recipes/skewers-21-cooking-season-skewers.png`. A regression test forbids any stir step in this recipe.
- Whisk orientation follow-up (designer reports, 2026-10-08): every metal-whisk recipe now explicitly carries `toolAngle: 180`, in addition to the shared `STIR_GRIP`, so the wire head enters the bowl and the handle points upward; bamboo matcha whisk explicitly stays at 0°. Real-mouse full-level runs passed for Omurice 36 and French Toast 43, replacing their stale upside-down captures at `qa/recipes/omurice-36-cooking-whisk-omurice-eggs.png` and `qa/recipes/french-toast-43-cooking-whisk-french-toast.png`. A unit guard checks every metal and bamboo whisk angle. Level 16's current redesigned sequence no longer contains a whisk step.
- French Toast follow-up (designer report labelled Level 39, 2026-10-08): the supplied frame is the old Level 43 egg-whisk step (three eggs and six stages), not the current Level 39 Taiyaki recipe. The live Level 43 capture was visually rechecked: whisk wires are in the bowl and the handle points upward. A full ID-to-recipe audit removed 18 tracked `qa/recipes` screenshots whose step IDs no longer exist, so obsolete pre-redesign frames are no longer presented beside current captures. The deletions remain recoverable through Git history.
- A dev-only fresh-start route is available at `/?reset=1&level=1`: it clears the browser's development save once, removes the destructive reset flag from the URL, and starts the first campaign level directly. Reloading the resulting `?level=1` URL does not clear newly earned progress.
- At the designer's explicit request, the active local development save slot was advanced from `livestream-mukbang-dev-save-v1` to `livestream-mukbang-dev-save-v2`. This guarantees a clean Level 1 campaign in existing browser profiles while allowing all progress earned from this build onward to persist normally; the old slot remains untouched but is no longer read.

- Recipe redesign (2026-10-08): unit tests 46/46, including the new `recipes.test.js` guards. The campaign e2e spec passed 34, with 77 viewport-specific skips. One Lobby layout test failed only on an OneDrive `EBUSY` trace-file lock and passed on a rerun. The pass includes the 50-level sequential mouse route with real unlocks and rewards, all 50 levels on real touch at 360×800, and Levels 2–10 step-by-step with captures in `qa/recipes/`.
- A separate real-mouse capture run covered Levels 11–50, every step. Every interaction type was first tried with a wrong input that must not advance (a drop outside, a stroke off the food, a partial stir, a wrong-direction gesture, an early lift). Frames are in `qa/recipes/` for the designer review.

- Unit tests: 43/43 pass, including exact 50-level order, 4–8 steps for every new recipe, all referenced texture keys, save v10 migration, economy safety and reward idempotency.
- Real browser mouse route passes all 50 levels sequentially from a fresh save in 14.9 minutes under QA-only ×6 animation time: real unlock purchases, every cooking step, three-serving mukbang, Result/base reward and 50 completion receipts. Its assertion now requires the final Level 50 claim to return `highestLevel=1`, `availableLevel=1` and select Level 1; there is no Level 51.
- Real touch route passes all 50 levels at 360×800 in 24.2 minutes under the same QA-only ×6 animation time. It uses actual touchStart/touchMove/touchEnd input through cooking and all three mukbang servings. A focused mouse regression for Levels 6, 7 and 10 passes the expanded primitives in 50.9 seconds.
- Lobby collision/layout matrix passes at 360×800, 375×812, 390×844, 393×873, 412×915, 430×932, 480×640 and 1280×720; dynamic Lobby resize also passes. The dedicated Lobby suite reports 10 passed / 14 intentionally skipped across the viewport matrix, including response checks for Settings, Part-Time, Canteen, Store, Daily, Super Market and Decor; Skin is covered by the separate customization route.
- The latest rejected-UI correction passes the dedicated 390×844 Lobby interaction/layout/resize run 3/3, the full eight-viewport Lobby matrix 10 passed / 14 intentionally skipped, unit tests 9/9 and the four-test Customization purchase/layer/persistence route 4/4. The post-Apply QA frame confirms that the Lobby shelf changes from lavender to the selected winter-blue tablecloth palette.
- The unified side-button pass repeats those checks after asset replacement: 390×844 Lobby 3/3, full Lobby matrix 10 passed / 14 intentionally skipped, unit tests 9/9 and Customization 4/4. The captured 390×844 frame confirms readable Part-Time/Canteen/Store/Skin/Daily labels, equal visual height and no overlap with the character or mascot.
- The latest larger/lower side-button layout passes all 8 supported Lobby viewport profiles plus the dedicated 390×844 interaction and live-resize routes (2/2). The captured 390×844 frame confirms the increased visual size and lower placement without overlap with the heroine, thought bubble, mascot, table props or bottom navigation.
- The corrected Orange Cat default passes the complete 8/8 Lobby viewport matrix and the 390×844 live-resize regression. A narrow-portrait 160 px minimum and 44% column-width cap keep the cat ears clear of both enlarged side-button columns.
- Character Customization layout passes the same eight viewport profiles. The full real-input flow covers all seven categories and passes purchase → preview → Apply → Lobby → reload → cooking → mukbang; Back/cancel preserves the equipped appearance. A separate visual-regression route exercises both hats and both eyewear choices, while assertions verify dynamic Hair/Skin thumbnails/tab icons and the tablecloth-linked panel theme.
- Latest Skin regression after the catalog/compositor correction: 8/8 supported viewport layouts pass, the dedicated real-input Customization suite passes 4/4, the hat/eyewear visual route passes, and unit tests pass 9/9. Captured 390×844 frames verify one hair silhouette for Orange Cat/Frog/Pink Plush, round and heart glasses on the eye line, distinct Hair/Skin covers, readable `NEW`, and the reference-shaped catalog hierarchy.
- Latest reference-Lobby regression: 24/24 layout routes passed across the eight supported viewports (Lobby, Customization and full Level 1 UI at each size), dynamic resize passed, and the dedicated four-test customization behavior flow passed 4/4.
- A complete Level 1 UI route passes at all eight sizes. The audit covers cooking, Viewer Request, mukbang and result, and rejects clipped text, off-screen targets, distorted art, chrome-to-chrome overlap and gameplay-target-to-HUD overlap.
- The historical five-level route remains covered as the first segment of the new full 50-level mouse traversal.
- Reload persistence passes. `qa/campaign/` retains the historical complete five-level frames plus representative new campaign captures for Levels 6, 25 and 50; automated input coverage spans all 50, while subjective frame-by-frame art review of every new recipe remains for the designer.
- Production build passes. The YouTube SDK, real ads and audio remain intentionally out of scope.
- Fresh production preview build: 2026-10-12 00:28 +05, bundle `index-BO_Dr5PU.js` (responsive layout system; full e2e regression 200 passed / 0 failed / 574 intentionally skipped across 18 viewport profiles; 50-level mouse route passes in 13.5 min; unit 55/55; Levels screen: passed + next level free, future levels behind a rewarded video; Level select: LEVELS button + scrolling 50-level screen; Lobby matrix 17/17 incl. the new button, Levels layout 15/15 viewports, Levels behaviour route passes; emoji reactions 15% smaller; clipped-sprite audit: whole-object atlas cutting + 6 redrawn sprites; dev `?progress=N` link; Level 5 drink flow: cup lifted, drained in three sips, put back empty; emoji reactions rise along both edges during mukbang; toppings stack above cheese/sauce in add order, larger pizza pepperoni; opaque redrawn pizza cheese + longer, denser cheese sprinkle; Levels 3 and 12–24 real-mouse step runs pass; free level unlocks, Start goes straight into cooking; plus the earlier collar/head/tablecloth changes). Unit 55/55. Real browser: all 50 levels sequentially with free unlocks (mouse 390×844), Lobby layout/controls and full Level 1 UI at 390×844 and 360×800, reload persistence, Level 50→1 loop, Levels 2–10 step captures, real-touch Level 1, live resize and the Customization purchase route all pass (the latter after a OneDrive EBUSY trace-lock rerun with traces off).

## Review / known limits

- Awaiting game-designer review of the 45 new recipe sequences, visual variety and provisional 50-level economy before adding any Level 51+ content.
- Character rig (`src/content/characterRig.js`): head cell = unit; bodies, hats and glasses follow one fit rule each on a fixed 1 × 1.39 cell canvas. Layering: back hair → body (turtleneck collar top at 0.70 cells, fully visible) → front head layer clipped to "above the collar line + half-ellipse chin" (no straight seam through the hair) → hat → glasses (2026-10-11 collar fix). Silver heads are straightened at build time by `scripts/level-head.mjs`. `node scripts/qa/appearance-matrix.mjs` (with the dev server) renders 108 combinations into `qa/appearance/`. The silver heroine pass used 11 + 6 Nano Banana 2 jobs and 5 + 3 Background Remover jobs; provenance in `project/ASSET-MANIFEST.md`.
- Remaining intentional differences from `LobbyScreen.jpg` are data-driven rather than visual drift: the wallet and level show real save state instead of hard-coded `300` / `2`, and a customized appearance replaces the default reference heroine after Apply.
- Real phone/safe-area notch, DPR 3 and low-end-device performance still require physical-device verification.
- Responsive layout system (2026-10-12): screen UI anchors to viewport edges on wide screens (desktop/laptop/tablet landscape/phone landscape) while world content stays centred; layout zoom for >1000 px tall windows; see DECISIONS 2026-10-12 and `scripts/qa/responsive-shots.mjs` (captures every screen at 10 sizes into `qa/responsive/`). Playwright now covers 18 viewport profiles incl. 1366×768, 1440×900, 1920×1080, 2560×1440, 2560×1080, 1024×768, 768×1024, 876×876, 844×390; the Lobby layout test asserts edge anchoring (≥1200 px wide) and live resize phone ↔ desktop.
- Level select (LEVELS, left Lobby column) is implemented: scrolling grid of all 50 levels. Passed levels and the next level are free; levels not reached yet start after an earned rewarded video (dev TEST AD simulator until the YouTube SDK).
- Hub system Decor remains a future feature entrance only. Skin/Customization, Playtime Rewards (former Daily Reward), the Part Time Job minigame, the Supermarket (Store / Super Market) and the Canteen are implemented.
- Hair options: Silver (free), Honey side-part bob (100) and Plum braids (140); every Hair × Skin × pose head is drawn in the heroine's face style. Outfits: Frog Sweater (free), Orange Cat hoodie with cat-ear hood down (180) and Pink Plush (220). All bodies share one template silhouette with sleeve cuffs (no painted hands). Prices remain provisional until economy review.
- Viewer Request is no longer shown before cooking (direct start); its card appears only at the end of cooking as "fulfilled". It does not grant a separate bonus.
- Rewarded ads run through `RewardService.claimLevelWithAd` and the platform contract; in development the DevPlatformAdapter shows a TEST AD simulator (`?ad=interactive|earned|not-earned|error|unavailable`). No real platform SDK is connected; the simulator must be excluded from the release build. Premium remains inactive.
