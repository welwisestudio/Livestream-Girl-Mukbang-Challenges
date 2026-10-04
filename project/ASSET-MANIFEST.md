# Asset Manifest — Level 1 (CP1 polish, 2026-10-04)

Runtime files: `public/assets/level1/*.webp`, `public/assets/loading/*.webp`, `public/favicon.png`.
Masters (never shipped): `art-source/level1/`. Rebuild runtime files with `npm run assets` (`scripts/build-assets.mjs`): crop to solid alpha, cap size, WebP. Runtime total ≈ 0.94 MB (previously ≈ 18 MB of PNG).

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

## Code-drawn UI

HUD cards, pills, step dots, request card, comment bubbles, ribbon banner, modal panels and candy buttons are vector shapes drawn in code, in the palette sampled from the approved art. Labels and numbers are live text in the bundled Fredoka font (OFL, `@fontsource/fredoka`).

## Audio

None yet. `AudioService` is isolated and Phaser audio is disabled.
