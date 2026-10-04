# Asset Manifest — five-level CP3 candidate (2026-10-04)

Runtime files: `public/assets/level1/*.webp`, `public/assets/campaign/*.webp`, `public/assets/loading/*.webp`, `public/favicon.png`.
Masters (never shipped): `art-source/level1/` and `art-source/campaign/`. Rebuild runtime files with `npm run assets` (`scripts/build-assets.mjs`): crop to solid alpha, cap size, WebP. Current runtime art total is ≈3.0 MB; the original Level 1 subset remains ≈0.94 MB.

## Kept — approved CP1 art (sliced from the original atlas)

The approved direction from commit `4f7ac43`. The originals are in `art-source/level1/original/`. Their prompts, model and job IDs were **not recorded** when they were made; this is a known provenance gap. `scripts/slice-atlas.mjs` slices them into `art-source/level1/sprites/`.

| Key | Source | Use |
|---|---|---|
| room | original/kitchen-background.png | Room/counter, cover-scaled, never stretched |
| character-happy, character-eating | atlas cells 0, 1 | Streamer idle / mouth open |
| mascot, avatar | atlas cells 2, 3 | Home mascot, loading mascot, HUD/level-up avatar |
| bowl | atlas cell 4 | Mold (choice, empty bowl, upside-down for unmold) |
| orange-mix | atlas cell 5 | Pitcher (pour step) |
| jelly-plain, jelly-finished | atlas cells 8, 11 | Unmolded jelly, finished dish |
| berries, glaze | atlas cells 9, 10 | Topping cards / flying topping |
| check | atlas cell 15 | Confirm button |
| logo | crop of original/loading-screen.png | Loading logo, background removed (below) |

Retired from runtime: `hand-legacy` (pointing hand that was misused as the spoon), `circular-arrow`, `mixing-bowl-spoon`, `servings`, and the PNG atlas/background/loading files.

## New — Higgsfield Nano Banana 2

All requests used `model: nano_banana_2` at 1k resolution. The job API reports the internal model name `nano_banana_flash` for these jobs; it is recorded here as returned. References were uploaded sprites of the approved art: character `9a769629…`, jelly-finished `b44c3baa…`, bowl `24e8cd63…`, orange-mix `9e1df0e0…`, jelly-plain `6e7ae485…`. Each prompt asked for the same kawaii sticker style, warm brown outline and a flat mint background. Transparency was produced by a separate Higgsfield `remove_background` job (`image_background_remover`); alpha was checked on dark and pink backgrounds.

| Key | Generation job | Background-removal job | Prompt summary |
|---|---|---|---|
| whisk | e9bb29e2-0e3a-4f69-9826-ddf143188653 | c9e262c5-6a92-41eb-9a76-bb0fdd0256ed | Pink-handle balloon whisk, heart charm |
| bowl-filled (rejected) | 552a202d-a177-473a-9767-851b69baa399 | 5904fd1c-2829-46e6-b606-ce61413ec689 | Rejected: shallower silhouette than the approved bowl |
| bowl-filled | 5cc10f22-a47f-4485-ae7b-c3964bada8de (v2 of 2; v1 0436ae02… not used) | a0f4699f-ab67-40fa-bdfe-f2a323b40b10 | Same bowl, filled with glossy orange mixture |
| jelly-berries | f1183ea3-a191-4b22-82d8-ce13805800f8 | e939fc21-5882-44c1-93d8-3f06662805b2 | Jelly + blueberries, no glaze, on plate |
| plate-empty | 2cd2c3d3-3b89-4303-af26-7b03bc1d8a72 | 7f5c5a78-703d-4659-9de5-97331a0c4a31 | Empty glass plate with crumbs |
| piece-full | 4b18c191-f530-49a7-9bb7-922f1b18ef87 | 8f5f5aa1-e809-4d25-9398-6484cb2721d2 | Finished jelly without plate (portion) |
| piece-bitten | c0d29be7-cf90-44a2-9429-150260091454 | 2c4475eb-dbf5-4bc8-b886-061d16cf906c | Same, one bite taken |
| piece-last | 7d3d5056-7326-421a-989a-fc99f6d06798 | a398d25c-90f9-4aad-a5cd-15fc79761c0c | Last third of the portion |
| character-chewing | 2029d673-6c6f-4a02-afad-2ebd1ab118af | 41627a6a-b4e2-4490-b0f4-1c0871e10778 | Same streamer, puffed cheeks chewing |
| coin | cde6ae5d-8562-44ab-9735-fd4212db29ff | 655d3a20-7603-4e6c-8ee1-438d1ed01b7d | Gold heart coin |
| hint-hand | b0b907ba-3098-4698-a6c2-7c4c081b4f0d | 7cb87ad6-ce6a-41dc-bd81-98c49da137c6 | Pink pointing tutorial hand |
| padlock | 06f84394-d1d7-42a6-9412-210a5a1eb2c1 | 87ec3432-4242-461d-b676-8e6123cfffb5 | Lavender padlock for locked cards |
| viewer-bunny/bear/cat/chick | 254cd3f5-80db-498e-83b2-9f2532ee09f6 | 16481b2b-2546-4ca0-a2e0-b0f6c7e3ced5 | 2×2 sheet of viewer avatars, split by the build script |
| logo | — (uploaded crop a247a2fd-7f15-4d68-89cd-eb686cd7dce7) | 8454e8b4-a632-412a-a669-b9f7eb370236 | Background removed from the approved logo |

Raw generations: `art-source/level1/generated/raw/`. Cutouts: `art-source/level1/generated/cutout/`.
Cost: 13 Nano Banana 2 generations at 1.5 credits each, plus 13 background removals.

## Five-level campaign extension

Runtime files: `public/assets/campaign/*.webp`. Masters: `art-source/campaign/generated/raw/`; Background Remover outputs: `art-source/campaign/generated/cutout/`. `scripts/build-assets.mjs` divides each 2048×2048 source into an exact 4×4 grid (512×512 cells), removes a 2 px cell-edge inset, crops to alpha >150 with 5 px padding, preserves aspect ratio and exports WebP up to 700 px. Default Phaser origin is the visual centre; no non-default working-point anchor is used.

All five requests explicitly used model ID `nano_banana_2`, resolution `2k`, aspect `1:1`, with approved Level 1 atlas job `10ff1b21-5a57-4f51-bf34-bb3782b4edd5` as `image_references`. Completed job metadata reports backend alias `nano_banana_flash`. Total generation cost: 10 credits. Background removal was five separate MCP operations using model `image_background_remover`; transparent corner pixels were verified in all five 2048×2048 outputs.

| Sheet / runtime family | Nano Banana 2 job | Background Remover job | Ordered content summary |
|---|---|---|---|
| Ramen | `c1bff8c5-54d3-4cf7-9ea5-54cc81658c16` | `bb79b071-818d-4932-90b0-7f917572df97` | pot/noodles/broth/states, seasoning, egg/toppings, stove, finished bowl, chopsticks/bites, empty bowl |
| Pizza | `100e5f3f-16fa-48e6-8f2d-28a096eb341c` | `ee35b685-3eff-4fc7-9ead-4de9502a8192` | dough/sauce/cheese/toppings, raw/baked states, oven, cutter, slices, empty plate |
| Sushi | `974acac1-13a1-4520-9c8f-fcc2e62f83d3` | `81ce7a11-70a0-41b8-ab09-695653166ff0` | mat/nori/rice/filling/roll states, knife, cut/served sushi, chopsticks/bites, empty plate |
| Bubble Tea | `7a698c68-b5ed-45d0-801b-f2e5965a1501` | `0f0c899f-2f32-4641-9f2a-40d97d63b98e` | cup/pearls/syrup/milk/ice states, shaker, sealed drink, full/half/empty servings, sealer |
| Lobby | `cfb2aba3-eb52-407f-a231-ee4f84cc8441` | `eb9662b1-8d60-4816-ab4a-f29460d492ac` | settings and feature icons, plate/spoon/phone/mitts, sprout mascot, thought bubble and lock/badge surfaces |

Prompt invariant for every sheet: strict 4×4 isolated objects, approved pastel kawaii sticker style, warm-brown outline, soft cel shading, glossy highlights, consistent 3/4 tabletop view, complete silhouettes with padding, solid mint background, no text/logos/characters/shadows/checkerboard. The exact prompts are retained in Higgsfield job metadata and summarized by the table above.

Visual review: all foods are immediately recognizable and coherent with Level 1. The Bubble Tea master contains grid dividers at cell borders; the 2 px inset plus alpha crop excludes them from every runtime sprite. QA frames in `qa/campaign/` verify the runtime cutouts in cooking, mukbang and result compositions.

## Code-drawn UI

HUD cards, pills, step dots, request card, comment bubbles, ribbon banner, modal panels and candy buttons are vector shapes drawn in code, in the palette sampled from the approved art. Labels and numbers are live text in the bundled Fredoka font (OFL, `@fontsource/fredoka`).

## Audio

None yet. `AudioService` is isolated and Phaser audio is disabled.
