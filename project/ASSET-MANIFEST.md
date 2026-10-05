# Asset Manifest — five-level CP3 + Character Customization (2026-10-05)

Runtime files: `public/assets/level1/*.webp`, `public/assets/campaign/*.webp`, `public/assets/customization/*.webp`, `public/assets/loading/*.webp`, `public/favicon.png`.
Masters (never shipped): `art-source/level1/`, `art-source/campaign/` and `art-source/customization/`. Rebuild runtime files with `npm run assets` (`scripts/build-assets.mjs`): crop to solid alpha, cap size, WebP. Current runtime art total is 5,271,610 bytes (≈5.03 MiB); the current Level 1 subset is 767,162 bytes (≈0.73 MiB).

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

## Reference-led Character Customization assets (2026-10-05)

Runtime: `public/assets/customization/*.webp`. Masters: `art-source/customization/generated/raw/`; separate Background Remover outputs: `art-source/customization/generated/cutout/`. `scripts/build-assets.mjs` slices the exact grids, removes seam insets, crops only by alpha and exports runtime WebP. No local chroma key is used.

Every generation used model ID `nano_banana_2`, resolution `2k`, aspect `1:1` and actual repository images as `image_references`. Completed metadata reports backend alias `nano_banana_flash`. Across the retained work and the documented rejected no-neck pass, image-generation cost is 37 credits. Transparency was produced by ten independent Higgsfield `image_background_remover` jobs at 1 credit each; total Character Customization art cost is 47 credits. Corner alpha was measured before slicing. Verified account balance after completion: 757 credits.

| Master / runtime family | Nano Banana 2 job | Background Remover job | Repository references and use |
|---|---|---|---|
| 3×3 aligned outfit/pose atlas | `39187a7c-f705-404c-877a-cf2bcbb8cf66` | `b17de13f-77e1-4717-8992-92918476c31c` | `SkinDressReference1`, `SkinHairReference1`, approved happy/eating/chewing heroine poses; Orange Cat, Frog Hoodie and Pink Plush × happy/eating/chewing |
| 4×4 accessory/UI atlas | `62a17005-4f6a-4b65-8937-168737f11222` | `e129d589-330b-4160-8964-cd83752237da` | `SkinChanging`, `SkinHatReference1/2`, `SkinHairReference1`, approved heroine; hats, clips, glasses, cards, tab icons, price pill and close button |
| 3×3 environment atlas | `e764473a-f251-442c-9b98-af18edc86c18` | not required (opaque surfaces) | `SkinBackgroundReference1/2`, `SkinTablePicture1/2`, `SkinChanging`; three backgrounds and three tablecloths, with the unused middle row discarded |
| Corrected Orange Cat chewing pose | `249b114c-49c6-4a94-924e-89f0d68990ef` | `5439230b-2e93-4b63-b17e-c364510f6240` | generated character atlas, approved chewing pose and `SkinDressReference1`; replaces the one atlas cell whose expression was not acceptable |
| Superseded 3×3 Hair/Skin heads — happy | `b694db93-73ad-474b-818c-e645bff4ad4d` | `5a8d23ef-be97-4311-ae8a-f39aa419795e` | Previous one-piece heads with neck; retained only as generation reference, not consumed by runtime |
| Superseded 3×3 Hair/Skin heads — eating | `787143d8-c20e-4ca4-96ec-6fbb2bb50b81` | `225055ea-94fb-40a2-8124-8044cc7e2d10` | Previous open-mouth heads with neck; retained only as generation reference |
| Superseded 3×3 Hair/Skin heads — chewing | `8b8e6727-a827-4127-a751-aa69b25d6842` | `9a629c6b-9114-4eaf-889d-aa267ab039bb` | Previous puffed-cheek heads with neck; retained only as generation reference |
| Corrected open-eyewear atlas | `51fa8d74-4ffd-4e4f-852f-7bb5fa37b553` | `22e06260-edec-4761-a6e8-b73850de49b9` | accessory atlas, `SkinChanging` and approved heroine; the model returned a 2×4 sheet, accepted cells are index 2 (open round) and index 5 (open heart); all folded-temple cells are rejected |
| Final head-only Hair/Skin — happy | `0320d68a-ff89-4cb9-a2ae-748406b9c9c2` | `81f14c75-431b-472e-8c49-20ebee1b50a6` | exact Cocoa/Honey/Plum × Peach/Warm/Deep happy grid; every silhouette ends at jaw/hair with no neck |
| Final head-only Hair/Skin — eating | `d4de667d-01ad-4c11-956c-69439dfe824a` | `a4730418-1f6c-4afb-9d61-b7d3ad90f526` | same fixed grid and anchors, open-mouth eating expression, no neck |
| Final head-only Hair/Skin — chewing | `a0081bf2-4e38-49ec-8d1f-4c62b651a81a` | `76d0ec5c-1e99-4fef-bc93-c9e6374271c9` | same fixed grid and anchors, puffed-cheek chewing expression, no neck |

`SkinPetRefrrence1/2` were inspected against the existing sprout mascot. The current small rounded yellow companion already matches their scale and role closely, so it was retained and no unrelated pet system or extra pet generation was added.

The first no-neck generation pass (`a7e3b3cc…`, `c614cde3…`, `8a9b5e0e…`) was rejected because Cocoa/Honey cells still contained short neck stumps. Its raw files are retained for provenance but have no Background Remover jobs and are not referenced by `scripts/build-assets.mjs`.

`src/ui/appearanceTextures.js` creates cached Phaser textures from the generated full-outfit pose and a complete head-only asset selected by hairstyle, skin tone and expression. The old baked head and neck are cleared together; a centre patch sampled from the same outfit's painted fabric closes the space below the chin before the head-only sprite is placed. No skin neck layer is drawn. Hats use safe in-canvas normalized anchors and render below open-front glasses. There is no runtime Hair/Skin recolour classifier. Structured ownership/equipped state remains separate from presentation.

## Reference-locked individual Lobby assets (2026-10-05)

Runtime: `public/assets/campaign/*.webp`. Masters: `art-source/lobby/generated/raw/`; accepted transparent outputs: `art-source/lobby/generated/cutout/`. The source reference `reference/input/LobbyScreen.jpg` was uploaded as Higgsfield media `0fd1df71-a75b-43f0-a61d-2e75c8df9c97`.

Every image was submitted independently with requested model ID `nano_banana_2`, resolution `2k`, aspect `1:1` and the Lobby screenshot as `image_references`. Completed metadata reports backend alias `nano_banana_flash`. The common prompt invariant requests exactly one isolated reference-matched kawaii game asset, complete silhouette, generous padding, no labels/watermarks/extras and a plain white background. Wallpaper and tablecloth instead request one opaque seamless texture. Text and changing values remain live Phaser/Fredoka content.

The first heroine job `15af446e-3842-4e72-8fda-422ba0e89536` was rejected because a small skin neck remained. Targeted correction `6f60db8c-4520-4ffc-a18f-87ee7d87633d` raised the green sweatshirt fabric to the chin and was consumed by the next pass, but it is now superseded by the simpler accepted 4K heroine in the correction section below.

| Runtime asset | Nano Banana 2 job | Background Remover job |
|---|---|---|
| settings | `9e203960-3ac7-4a0f-906c-08370efc402b` | `4322db5c-0875-407e-8374-7c84051fe73c` |
| part-time | `c6e8d772-0fed-4956-a3ab-3b3422ce6e00` | `718e64b6-83d1-41b3-9132-48bc255a356e` |
| canteen | `0c9417af-7365-4213-8101-50e7dfc31dfa` | `1d5cec72-0ecb-4bde-92ab-ee18a1cfe073` |
| store | `92a0e6fc-c4ae-46ec-ab36-00c9356bc5f8` | `81e5449c-dea3-4ba5-96d0-44800f7363e1` |
| skin | `037e5df6-726b-4cb9-82ad-0d2bd15bc2fd` | `e5258987-6791-43ff-b009-72d7c50323b8` |
| daily | `2be24a03-f4c5-4e28-871a-c95fa3cf63ec` | `f45ff373-e0a9-49f4-8a55-83a5c638f81c` |
| supermarket | `73b86248-445f-4828-9b79-4a2f0d299669` | `d7a8abcf-4148-4e7b-9bfa-1d6c6b289189` |
| decor | `ccf70beb-34ce-430e-bb21-220114ec80e1` | `d58eedb5-bc06-4b12-ba44-73a91f767893` |
| sprout pet + basket | `1fd347e4-fbbc-4e27-af76-3fff43677ad8` | `4d2d5887-77f9-41b7-8240-d33dce9dd534` |
| thought bubble | `3ff7e6db-3b85-415d-9d70-c7d478c3f129` | `192b7484-a6d3-49e5-8092-cb1f7620010b` |
| heart placemat | `2fcf3d10-8532-40b7-a8be-23b9d4432303` | `13f1a605-7d87-495f-a44e-b35d525a1968` |
| silver plate | `96856635-d2d6-410a-b89c-824791f54dd8` | `fd3aa03c-a63f-49d0-a4f4-2019841221a9` |
| spoon | `d4613b38-e03f-4fdc-8e6b-27611205057b` | `76450bcf-9a2e-42e8-8e63-84dc164d447a` |
| phone | `7045badc-3811-401a-832f-496ebd85cf58` | `8b69fdd0-cde7-4653-8a3b-e53c3d88240e` |
| mitts | `43fbb83c-040a-48bb-aef3-0c9c7e871cca` | `f220a8c3-e9e6-4fc1-8375-0ef1bb60359a` |
| cutlery tray | `e881c35f-c16c-4f4b-876b-233d8c6e34fd` | `a161e945-a937-49b7-919e-17bed7d8c54c` |
| coin stack | `a22ed87c-bdf7-4b69-802e-20b232b3a572` | `f7f65979-e8c1-465c-a363-1725a12a2503` |
| NEW badge | `c2889345-b5f3-4f3b-b46b-c32ce9857ca1` | `20ac2a1b-be56-42a8-957f-7d05baa4c0a0` |
| Start surface | `6d183207-e234-4ff1-b853-45953f1a61e2` | `0af18eaf-57d3-4b37-9534-55d7ff29ede4` |
| fried-chicken request icon | `705b77a3-9c3f-4e91-8528-18d8fdd4b8ca` | `51cf4d57-bd46-45a8-8ed9-4af01be8e948` |
| default Lobby avatar | `c66dc807-1d36-41e9-8412-bb1dd9e6dfee` | `57bb2f28-f8a7-4d3a-b064-194ba9dd0ea7` |
| previous no-neck default heroine (superseded) | `6f60db8c-4520-4ffc-a18f-87ee7d87633d` | `36e95159-45a0-471c-92fc-4375abb79c0b` |
| mint-heart wallpaper | `92005b8f-372d-4902-8a8a-389fb3711fcb` | not required — opaque |
| lavender gingham tablecloth | `8d675b6b-827f-4cfe-a4c1-a1a97f2e6113` | not required — opaque |

Cost: 25 Nano Banana 2 image jobs × 2 credits plus 22 Background Remover jobs × 1 credit = 72 credits. Verified balance after completion: 685 credits. All 22 accepted cutouts are 2048×2048 PNGs with measured zero alpha at every corner; no local chroma key is used. Contact sheets: `qa/lobby/nano-banana-separate-assets-contact.png` and `qa/lobby/nano-banana-cutouts-contact.png`.

### Bright-button and heroine correction (2026-10-05)

The designer rejected the first accepted Lobby for low button saturation, overlapping NEW layers, the heroine, wallet spacing and an exposed wallpaper strip below the navigation shelf. New masters live in `art-source/lobby/generated/refresh/raw/`; accepted cutouts live in `art-source/lobby/generated/refresh/cutout/`. Runtime files are rebuilt by `npm run assets`.

All image jobs used requested model `nano_banana_2` with `LobbyScreen.jpg` media `0fd1df71-a75b-43f0-a61d-2e75c8df9c97`; completed metadata reports `nano_banana_flash`. Buttons request one complete saturated kawaii sticker control with exact English lettering, white outline and pink shadow. The Start surface requests the same glossy orange capsule without text so its changing CTA stays live. Heroine candidates request the reference's simple chibi proportions, silver bob, green sweater and explicitly no neck. Eight button jobs are 2K; the two heroine candidates are 4K. Transparency was produced only by the separate Higgsfield Background Remover.

| Runtime asset | Nano Banana 2 job | Background Remover job | Outcome |
|---|---|---|---|
| part-time | `4e67eb51-faf1-40d2-a2f6-5d7f72dc66ac` | `0dd7968b-1915-44b1-80f8-cf7ad06e1ac6` | accepted illustration; exact label remains live because the remover dropped its disconnected text |
| canteen + NEW | `e8f9d16c-4ba3-483d-ae0a-771757de747a` | `667f66ae-34a4-444b-8a8b-c5eb3cc7734d` | accepted |
| store | `f96b56fe-5b08-4ad2-8afa-9d23dac0443e` | `7bf7487f-f25b-4848-a75a-8ccffb635601` | accepted |
| skin + NEW | `d804b961-01d4-43db-8e6e-c06ead6db664` | `1b224e78-5974-4135-8411-17568d741bdb` | accepted |
| daily reward | `d0a9e341-91d2-47f5-9176-b1aab4b2c049` | `93cfac1f-9df2-41bf-829a-6884c5f37309` | accepted |
| supermarket | `7d7257a8-3d80-49b4-82bb-b7e46d79e024` | `5bfabf53-4e90-4de5-b328-f151a981b73c` | accepted |
| decor | `62ff09dd-cd49-4a02-a1f0-1f6e79b46288` | `494d420a-78a0-4965-99d6-c9ea07604560` | accepted |
| blank Start surface | `0b3930cf-121a-4851-97ce-cc16df86549d` | `41f40e32-cc31-487d-8f0c-e00be6eb11f5` | accepted |
| heroine candidate A | `13b2ef03-789e-4d52-b4a5-4b2ad57a14c6` | not run | rejected: more detailed face and raised collar drift from the source |
| accepted heroine B | `7dce0c23-af2b-4427-92c0-4d9cde63adfc` | `01704055-7bc5-4883-88bb-b64775917fa7` | accepted; no visible skin neck |

This correction consumed 39 credits (10 image jobs plus 9 remover jobs). Verified remaining balance: 646 credits. The selected files are independent assets rather than a generated grid, and no local chroma key was used.

### Unified side-button correction (2026-10-06)

The five side controls were regenerated as one coordinated family after the designer reported inconsistent scale, unreadable lettering and reference drift. Source candidates are in `art-source/lobby/generated/buttons-v2/raw/`; accepted transparent masters are in `art-source/lobby/generated/buttons-v2/cutout/`. Every candidate used requested model `nano_banana_2`, 2K, 1:1, with `LobbyScreen.jpg` media `0fd1df71-a75b-43f0-a61d-2e75c8df9c97`; completed jobs report backend alias `nano_banana_flash`. Runtime exports use a shared 900-pixel source height, and Phaser scales all five by height rather than longest side.

| Runtime asset | Accepted Nano Banana 2 job | Background Remover job | Alternate / outcome |
|---|---|---|---|
| part-time | `50f2a287-b4c5-43a6-9efb-617b2ee04498` | `51fc8800-5da2-4919-b0ff-79a464571235` | `0d943c12-b311-4a55-8015-e9c5ef449448` rejected: weaker reference match |
| canteen + NEW | `bca446cc-efb1-4030-a0ae-58bb412494a0` | `d1d56a95-4b3b-4145-bc8a-00c01383e9a9` | `2557921b-e546-4325-95ba-8a027decfd67` rejected: disconnected label composition |
| store | `e754e86b-66a3-432c-b33f-46fdb8c3a6f8` | `4287b85d-3306-423e-823a-dfa093fa8804` | `471ead26-c8d6-4e6a-9783-995ed9c25890` rejected: technical annotations rendered into the art |
| skin + NEW | `e83d9867-68ce-46ce-aca5-a218646461b8` | `dca5feb2-c33f-4a76-801d-aae218b5e356` | `34e3ba54-3585-44ba-9cdc-a13f20343bd1` rejected: technical annotations rendered into the art |
| daily reward, first visual | `d0b5e60a-ff6f-4333-a2ef-db8f59a06bf0` | `a59f0ab3-1f3c-498a-8581-1cf37b27af5c` | superseded: remover discarded the disconnected label; alternate `ebd4d69e-f43d-46d9-ac06-1774627e15b4` also rejected for annotations |
| daily reward, final | `dd5ff284-9e3d-4fd5-a917-c01d94062798` | `fba97fe6-523f-402b-aaff-03005b39768e` | accepted: gift and exact two-line label form one retained sticker silhouette |

This pass records 11 Nano Banana 2 image jobs and 6 separate Background Remover jobs. Verified remaining balance: 612 credits. No local chroma key or alternate image model was used.

## Audio

None yet. `AudioService` is isolated and Phaser audio is disabled.
