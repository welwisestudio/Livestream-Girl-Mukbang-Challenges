# Current project status

Updated: 2026-10-04 — CP1/CP2 Level 1 polish, waiting for the game designer's visual and gameplay review.

## Where we are

- The visual direction of the original Level 1 prototype (`4f7ac43`) is **approved**. This pass fixes and polishes it.
- One playable level, `orange-jelly-01`. **Level 2 has not been started**, as instructed.
- Done in this pass:
  - a responsive layout for any aspect ratio;
  - a reworked UI scale and hierarchy;
  - 12 new or re-made assets (Nano Banana 2 plus background removal), with 4 extra splits from one sheet;
  - a real loading screen;
  - the Level 1 flow rebuilt from the Video2 reference;
  - gameplay and resize bugs fixed;
  - full automated playthroughs.

## Architecture (current)

- Phaser 3.90 + Vite 8, ES modules.
  - Scale mode `NONE` + DPR zoom (`src/app/createGame.js`, `src/app/viewport.js`).
  - Scenes lay out in CSS px through `BaseScene.layout(frame)`.
- Layout rules: `src/ui/layout.js`.
- Components: `src/ui/{hud,controls,panels,actors,background,text,draw}.js`.
- Level data is in `src/content/levels.js`; step kinds (`choice`, `pour`, `stir`, `unmold`, `topping`) are in `src/levels/cookingSteps.js`; gestures are in `src/mechanics/`. Future levels reuse the step kinds through config.
- Save, rewards and the platform layer are unchanged in shape:
  - the dev adapter uses localStorage;
  - a failed save can now be retried without a double grant.
- The test hook (`?debug=1`) exists only in the dev server and the separate `build:qa`, never in the production build.

## How to check

- Production preview: `http://127.0.0.1:4173/` (rebuild: `npm run build`, serve: `npm run preview`).
- Tests: `npm test`; `npx playwright test` (set `PLAYWRIGHT_EXECUTABLE_PATH` to Chrome).

## Open after review

- The designer reviews visuals and feel on a real phone.
- The Viewer Request "200" and the base reward "200" are currently the same payout. Whether the request should be a separate bonus is still undecided.
- Provenance of the original approved art (prompts and job IDs) is unknown.
