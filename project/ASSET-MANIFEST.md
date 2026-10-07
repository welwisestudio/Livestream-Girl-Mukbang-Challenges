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

### Rejected silver-haired heroine rebuild v3 (2026-10-06)

The designer rejected this entire pass because it continued the wrong silver-haired identity instead of the newly supplied brown-haired Orange Cat reference. The full source screenshot used by the pass was Higgsfield media `0fd1df71-a75b-43f0-a61d-2e75c8df9c97`; it is no longer the character source of truth. All six image jobs requested `nano_banana_2`; completed metadata reports backend alias `nano_banana_flash`. Raw candidates and cutouts are retained under `art-source/lobby/generated/character-v3/` only for provenance and are not consumed by the runtime asset manifest or build script.

| Purpose | Nano Banana 2 job | Background Remover job | Outcome |
|---|---|---|---|
| heroine candidate 01 | `abb3a89a-d86b-495b-8bda-76047ed59eb0` | not run | rejected: symmetrical centre part and visible collar/neck gap |
| heroine candidate 02 | `98d4adb8-a7e7-4ef7-8267-6e4c11ab7417` | not run | rejected: longer torso and visible neck |
| corrected heroine candidate 03 | `561cab3a-2a01-4533-af70-786c9fd21a94` | not run | rejected: fringe too extreme and one eyebrow lost |
| corrected heroine candidate 04 | `ff5ab3f6-2678-46d3-84f7-49eb6d937289` | `fd1e2137-17e0-463b-a98e-2199071a1715` | rejected after integration: wrong silver-haired identity and green outfit |
| HUD avatar draft | `7f8d5121-8850-4124-ae31-7473bc4c6d95` | not run | rejected: missing reference blush |
| corrected HUD avatar draft | `560eadce-a1d4-44c3-82aa-5849c247e38c` | `60689df7-52f7-4a8c-9ae9-b699da883764` | rejected with the silver-haired identity; remover also erased nose/mouth/blush pixels |

The active default character now uses the already accepted Character Customization assets from jobs `39187a7c-f705-404c-877a-cf2bcbb8cf66`, `62a17005-4f6a-4b65-8937-168737f11222`, and corrected open-eyewear job `51fa8d74-4ffd-4e4f-852f-7bb5fa37b553`: Cocoa brown bob + Peach skin + Orange Cat outfit + Heart Pop glasses. The Lobby and HUD both render that same saved modular appearance. No new image or remover job was run for this correction, and no generation credits were spent.

> Superseded the same day by the silver Frog Sweater heroine below.

### Silver Frog Sweater heroine — full character replacement (2026-10-06)

The designer supplied a new character crop (`reference/input/heroine-silver-2026-10-06.png`, Higgsfield media `1832deaa-eed2-4b74-87b9-30b657051541`) and explicitly asked to replace the current character completely and regenerate it with Nano Banana 2; the scope "full replacement including every wardrobe head" was confirmed. `LobbyScreen.jpg` was re-uploaded as media `e16d82d5-c31e-40b1-abf7-fd243033a9c1`. Every image job requested `nano_banana_2` at `4k`, `1:1`; completed metadata reports backend alias `nano_banana_flash`. Transparency comes only from separate Higgsfield `image_background_remover` jobs. Files: `art-source/customization/generated/heroine-silver/{raw,cutout,preview}`.

| Purpose | Nano Banana 2 job | Background Remover job | Outcome |
|---|---|---|---|
| identity master, 2×2 poses (A) | `ec9527b0-b68f-418e-9162-7fefd56f4232` | `4d70f97f-9aec-4557-9536-91979253595f` | accepted as identity/style reference for all heads and the sweater (not shipped directly) |
| identity master (B) | `34926649-fe4a-44a2-b7c7-262eeacb3b52` | not run | rejected: tighter framing cut off the hands |
| head grid happy v1 | `85eef5d0-be9f-4fcd-a3a5-bb0310e68183` | not run | rejected: broken 3×3 grid (missing cell, cropped heads) |
| head grid eating v1 | `92586013-c208-447a-8e28-b812f7c099d7` | not run | rejected: broken 3×3 grid |
| head grid chewing | `0775b0e5-433c-41e8-9b0a-5db09ba85c31` | `cdfc8a7c-4705-4fef-bda1-8a28258e01f4` | accepted; layout master for the other two poses |
| head grid happy v2 (edit of chewing grid) | `28edf87b-ef14-4725-ac48-745dc2e33971` | `1bdc1ebd-2af8-4c94-8064-3a3370d38384` | accepted; identical cell anchors |
| head grid eating v2 (edit of chewing grid) | `777957c3-5229-437e-b0b7-15c373129ac8` | `3b26666d-71b5-49ea-a3f8-1a715ae4e98d` | accepted; identical cell anchors |
| headless sweater a / b (transparent reference) | `243ddcd7-db0f-4373-bc78-f155b46b59dd`, `7aae30d3-a838-4a14-a23c-703d84977408` | not run | rejected: faded ghost copies of the reference grid |
| headless sweater c | `f8c8c8ff-9d18-46c9-aaad-7ca378cd2f18` | not run | rejected: ghost copies overlap the subject |
| headless sweater d | `1770b103-3d79-4967-992c-b794e49784a3` | `431854fe-1b27-4fa3-b043-524631b6d3ce` | accepted after cleanup below |

Head grids: rows Silver / Honey / Plum, columns Peach / Warm / Deep; sliced by `scripts/build-assets.mjs` into `custom-head-{silver,honey,plum}-{peach,warm,deep}-{happy,eating,chewing}` (inset 12 px, 512×512). Cell anchors: hair top ≈8%, chin ≈78%, mouth ≈69% of the cell.

Sweater cleanup (deterministic, no colour keying): `scripts/isolate-largest-component.mjs` keeps only the largest alpha-connected subject of the remover result (16 detached ghost fragments cleared), then a fixed crop mask clears everything above the collar (y < 21.8%) and beside it (y < 30% and x < 35.2% or > 64.8%). Result: `cutout/sweater-final.png` → runtime `character-sweater`.

Retired from runtime: Cocoa hair heads (`custom-head-cocoa-*`) and Frog Hoodie (`character-frog-*`); their sources stay in `generated/cutout/` for provenance. The Orange Cat and Pink Plush outfit atlases are still the earlier accepted assets; the new heads are composited into them.

This pass: **11 Nano Banana 2 image jobs + 5 Background Remover jobs**. Preflight cost was 3 credits per 4K image. Balance: 562 credits before, 522 after (40 credits).

### Character rig — unified head/body proportions (2026-10-06)

Problem: Orange Cat and Pink Plush still used the old atlas bodies with a different head/body ratio and per-outfit head scaling; hoods and plush read larger than the head, and painted peach hands ignored the chosen skin tone. Fix: one rig (`src/content/characterRig.js`) where the head cell is the unit and every wearable has one fit rule.

Body template: the accepted Frog Sweater layer placed on a flat `#7FA6E6` 2048² canvas (`art-source/customization/generated/rig/template/body-template.png`, Higgsfield media `76aba983-049b-48f2-9659-fd5a064bb2b9`). Every outfit body is a Nano Banana 2 (`4k`, `1:1`, backend alias `nano_banana_flash`) edit of that template, so all garments share one silhouette and position; sleeves cover the hands so no skin is baked into clothing.

| Purpose | Nano Banana 2 job | Background Remover job | Outcome |
|---|---|---|---|
| Frog Sweater body, sleeve cuffs | `2a5ada91-0b0b-44cc-b85f-09449ddcee0b` | `4526701e-94ad-496a-8ce1-73a1c3636bf9` | accepted → `body-sweater` |
| Frog Sweater body, alternate | `c38d5776-90d5-4f91-977e-e4d63aec9d45` | not run | equivalent duplicate |
| Orange Cat hoodie (hood down, no ears) | `71f275ad-86f8-4ba0-866a-52262aa62925` | not run | rejected: lost the cat identity |
| Orange Cat hoodie (hood down with cat ears) | `dbb1e753-125f-468c-a3ab-cf311bb709af` | `2d2afb03-387a-4638-96d6-96556eb0e0dd` | accepted → `body-cat`; no separate hood layer needed |
| Pink Plush, scalloped fluffy | `777620d9-3bbc-463f-b1b7-1e5664e6e16d` | `6098fb4e-f0ab-46cf-bb87-b7940fb1ba2d` | accepted → `body-pink` |
| Pink Plush, mitten cuffs | `61b43561-a8d0-4c38-8cbd-c8a2ff41d207` | not run | rejected: oversized mitten cuffs |

Alignment measured on the cutouts (4096² space, template garment box 548,910–3548,3184): sweater 478,908–3613,3200; cat 513,854–3578,3194 (ears); pink 533,910–3561,3190. All bodies are cut with the same fixed `BODY_FRAME` (348,710, 3400×2674) — never trimmed per asset — and resized to 900 px wide.

Retired from runtime: `character-{cat,pink}-{happy,eating,chewing}`, `character-sweater` (hands), and the per-outfit head clearing/clipping code. Pass: 6 Nano Banana 2 jobs + 3 Background Remover jobs; balance 522 → 488.5 credits.

QA: `scripts/qa/appearance-matrix.mjs` renders combinations with the real compositor through the dev-only `__GAME_DEBUG__.renderAppearance` hook into `qa/appearance/` (108 combinations across four sheets).

### Post-level reward screen (2026-10-06)

Reference: `reference/input/ClaimMoney.jpg` (Higgsfield media `8b16f3b3-f827-44f7-aed5-32b1cfa2cd35`) passed as `image_references` to every job; model `nano_banana_2`, `4k` (backend alias `nano_banana_flash`). Labels, amounts and coins stay live text/existing sprites so values remain configurable.

| Purpose | Nano Banana 2 job | Background Remover job | Outcome |
|---|---|---|---|
| multiplier bar, blank segments (21:9) A | `5f493ecd-4781-45e8-b0bf-2e420bf7b78e` | `4db83828-f98a-4cf0-bac0-e9978beb4914` | accepted → `reward-bar` |
| multiplier bar B | `13137a53-b92c-4802-aa87-2b8846df0a16` | not run | rejected: blurred orange segment and stray shadow band |
| UI atlas A (button, pill, pointer, badge) | `a326fdfe-d24f-4995-b8f6-79a875b278bf` | `6b8543b5-1f06-48f6-aba2-68eb091aed8d` | quadrants 0–1 accepted → `reward-button`, `reward-pill`; bottom half rejected (ghosted reference echo) |
| UI atlas B | `11b0e3d3-537d-4b58-949d-5e174b5fad0f` | `25cb6bf3-7adf-4d60-a0ff-69f88c9c8a1a` | quadrants 2–3 accepted → `reward-pointer`, `reward-play`; button had edge specks |

Bar segment stops measured on the cutout centre line (fractions of the trimmed width): 0 · 0.207 · 0.398 · 0.603 · 0.794 · 1 — used by `src/ui/rewardOffer.js` for pointer selection. Built by `npm run assets` into `public/assets/reward/`. Photo card, stacked sheets, stats icons and the pastel gradient are drawn shapes matching the flat reference. Balance 488.5 → 410.5 credits.

### Playtime Rewards window (2026-10-06)

Reference: `reference/input/PlaytimeRewards.png` (Higgsfield media `92c2df0a-5483-455e-8523-bb1d87a977d4`); the renamed lobby button used the accepted Daily button on a flat background (`art-source/playtime/template/daily-button.png`, media `a53bc178-46ef-4fb2-ae66-995220c0d43e`). Model `nano_banana_2`, `4k` (alias `nano_banana_flash`). Titles, minutes, amounts, timers and the NEW text are live text.

| Purpose | Nano Banana 2 job | Background Remover job | Outcome |
|---|---|---|---|
| title plate A | `74df818f-8f25-459b-b4b9-ab31fb531823` | not run | rejected: purple gift less faithful |
| title plate B | `8669211f-059a-499a-ac22-59bde790f349` | `cb56d89a-c21a-4fd3-a092-81a35c30c099` | accepted → `playtime-header` |
| panel/tile/selected/check atlas A | `d2e8c07a-5b93-43e3-a376-e3c1ec38d47b` | not run | rejected: panel border too faint |
| panel/tile/selected/check atlas B | `f96ed87f-ed33-4a23-a9e3-abbde0d6bbcf` | `3dc63f25-b604-47be-8c96-a2a25a7d9e1b` | accepted → `playtime-panel` (nine-slice), `playtime-tile`, `playtime-tile-selected`, `playtime-check` |
| lobby button "PLAYTIME REWARD" A | `2c274938-332a-48b4-a407-cc8ce27b67d8` | `4c638d70-5870-4355-af7f-090d1e1883d2` | accepted → `daily` texture (art-source/lobby/generated/buttons-v2/cutout/05-playtime-4c638d70.png) |
| lobby button B | `5b511b43-b031-4d1d-baf7-456415c04c23` | not run | equivalent alternate |

Reused: `lobby-coins`, `new-badge`, `custom-close`, `reward-button`, `reward-play`, `body-pink`, `custom-head-plum-peach-happy`. Balance 410.5 → 366.5 credits.

### Part Time Job minigame (2026-10-06)

Reference: `reference/input/PartTimeJob.png` (Higgsfield media `4da96558-648f-418b-8c0d-793a866de496`), passed to every generation. Model `nano_banana_2`, `4k` (alias `nano_banana_flash`). Sources in `art-source/part-time/`; slicing in `scripts/build-assets.mjs` (3×2 grids for customers/products, per-element boxes for the UI sheet). Silhouettes are the product sprites tint-filled at runtime; timer fill, counters and all text are live.

| Purpose | Nano Banana 2 job | Background Remover job | Outcome |
|---|---|---|---|
| shop background (no people/UI, empty counter centre) | `5f1f4c23-fa21-4d0e-b998-ff2f4f113b95` | not needed (opaque) | accepted → `ptj-background`; counter back edge at 0.672 of height (measured) |
| 6 customers sheet A | `30266ce2-0e86-43cf-aedc-cadbd59435ca` | `85f9d844-c399-4462-9b76-227f6c4a9e15` | accepted → `ptj-customer-1…6` (one common scale) |
| 6 customers sheet B | `6763e120-c070-4bbb-bb19-e279853b8502` | `3f1df309-c305-4a3e-b3b5-fcbf032060fc` | rejected: white sticker outline not in the reference |
| 6 products sheet | `c2f2e0a6-2a86-48a2-94fe-3aea6a88b4d3` | `419eb6d0-129f-49b5-b032-e99b9073cfe2` | accepted → `ptj-corn-dog`, `ptj-snack`, `ptj-milk`, `ptj-donut`, `ptj-ice-cream`, `ptj-onigiri` |
| UI sheet (bubble, timer tube, card, bear progress pill, arrow) | `034c5fe7-8251-48a8-be67-415bf1d958a9` | `8b47b3ba-5dbc-444f-8941-2750bf2fee83` | accepted → `ptj-bubble`, `ptj-timer`, `ptj-card`, `ptj-progress`, `ptj-arrow` |

Reused: HUD, `settings`, `lobby-coins`, `playtime-panel` (dialogs), `playtime-check`, `reward-button`, `reward-pill`. Balance 354.5 → 335.5 credits.

### Supermarket: shelves, checkout, snacks (2026-10-06)

References: `reference/input/Store-Shelf.png` (media `9d051ded-9260-45db-bf9d-598ea208ea41`), `Store-Matcha.png` (`9ad645ce-6d50-4bb0-a220-93efb7567eca`), `Store-Scan.png` (`0628cf1d-90af-4207-b229-d00cac82b25c`), passed to every generation. Model `nano_banana_2`, `4k` (alias `nano_banana_flash`). Sources in `art-source/store/`; slicing in `scripts/build-assets.mjs`. Prices, counters, category titles, "Scan Here" and receipt are live text. Shelf geometry (board surfaces 0.372/0.570/0.768, tag bands 0.413/0.611/0.808, shelf left edge 0.165) measured on the pink master; the matcha edit keeps it within 0.008.

| Purpose | Nano Banana 2 job | Background Remover job | Outcome |
|---|---|---|---|
| empty pink shelves background | `7e8bd689-0f19-4b30-bbd2-d965cf21cce5` | not needed (opaque) | accepted → `store-shelf-pink` |
| matcha shelves (edit of the pink master + matcha reference) | `b5a5e397-2a59-493b-bf27-d289f5059c04` | not needed | accepted → `store-shelf-matcha` |
| checkout: scanner with capybara + empty belt | `a12141ca-e8d5-41f8-b86c-92e9b083e09d` | not needed | accepted → `store-scan` |
| New Arrivals snacks (6) | `7631d3d0-0b0f-494b-8f85-1ddd89aa2465` | `4754e7b6-4f1a-4e8d-b344-9823a796e8de` | accepted → cookie jar, Orez, green tea, swirl soda, strawberry milk, potato chips |
| Matcha snacks (6) | `a9c59c3f-2912-4ed3-8aeb-e03e15d89cd6` | `b46b3a6c-f197-46ca-84d0-0a1eb24c970f` | accepted → matcha sticks, biscuits, latte, tokboki, cookies, wafer |
| UI sheet 3×3 (close, arrow, check, basket, price tag, pill, cart, live card, sign) | `54c7affc-280e-467d-80ad-450b53b872b2` | `47bf7857-2d29-417c-a085-f25f61fa3c9e` | accepted → `store-close` … `store-sign` |

Reused: `lobby-coins`, `coin`, `playtime-check`, `playtime-panel` (dialogs), `reward-button`, `reward-pill`, the Level room/heroine for the snack stream. Credits: 335.5 before this set; the Supermarket and Canteen sets together brought the balance to 296.5.

### Canteen: counter, tray, portions (2026-10-06)

Reference: `reference/input/Canteen.png` (media `533b34a0-f935-4e89-aaf2-f5cc46889fcc`), passed to every generation. Model `nano_banana_2`, `4k` (alias `nano_banana_flash`). Sources in `art-source/canteen/`; slicing in `scripts/build-assets.mjs`. Shelf stands (0.438 / 0.598), tray centre (0.742) and the five compartment boxes (measured on the outlines of the trimmed tray) live in `src/ui/canteenViews.js`.

| Purpose | Nano Banana 2 job | Background Remover job | Outcome |
|---|---|---|---|
| empty canteen background (awning, menu board, two empty counter shelves, lilac rail, floor) | `22291b2e-11bc-45f8-922b-bf04ab8650b0` | not needed (opaque) | accepted → `canteen-background` |
| 6 dish containers | `bc5aa32b-2e35-4a6d-b8e2-683428bdc37b` | `efe86803-a517-47e5-a724-7aa8af035d21` | accepted → rice pot, corn soup bowl, veggie bowl, jelly tray, cookie box, chicken basket |
| 6 portions + serving spoon + ladle | `da07699f-38aa-4bb9-9732-e9aa825f2717` | `56af97fd-9b02-47f4-91fe-292e9d3df111` | accepted → `canteen-rice` … `canteen-chicken`, `canteen-spoon`, `canteen-ladle` |
| purple 5-compartment tray | `8faf486b-3f37-4260-b13b-333830725f3c` | not run | rejected: copied the reference's embossed "cat studio" label (third-party branding) |
| tray edit without the label | `ec2b55f0-a980-444d-8290-c696d8da23e6` | `5b091454-a27a-4258-a25a-5da48b17caa6` | accepted → `canteen-tray` |

Reused: `store-close`, `store-live`, `store-pill`, `store-price-tag`, `lobby-coins`, `reward-button`, `playtime-panel` dialogs. Balance after: 296.5 credits.

## Lobby bottom buttons v3 (2026-10-07)

Reference: `reference/input/LobbyBottomButtons.png` (designer screenshot), plus 4× crops in `art-source/lobby/generated/nav-v3/ref/` (uploaded as media 97b0fc55…, d6cab527…, 8ffb414c…). Model: Nano Banana 2 (`nano_banana_2`, reported as nano_banana_flash), 4k. Transparency only via the Higgsfield Background Remover.

| Runtime key | Job | Remover job | Notes |
|---|---|---|---|
| `supermarket` | c6971c69-5000-488b-ad63-e8e8e46fdbf4 (edit of 0c7005da-cf9e-46e8-a358-a6af40766f5f) | 73d4740c-9233-4c3b-a79f-145e8cf8213b | Wide orange tile, pink basket with chocolate bar, donut and blue bottle, pink "SUPER MARKET". 0c7005da re-used the Decor tile so both match (1.27:1). |
| `decor` | b306f40f-9630-4a78-8b8b-fe00c9b47358 | 22fe2641-66ba-439e-ae91-3751471bab58 | House with red roof + blue paint roller, coral "DECOR". The old "Lv.3" label is gone. |

Rejected: 89c9d88e… (square tile, wrong contents), 648b08a7… (square tile), 7dccd48d… (too wide, 1.54:1; its remover job a1e7734f… is kept as `cutout/supermarket-v2-rejected-wide.png`). Sources: `art-source/lobby/generated/nav-v3/{raw,cutout,preview}`; built to `public/assets/campaign/{supermarket,decor}.webp` by `scripts/build-assets.mjs`.

## Audio

None yet. `AudioService` is isolated and Phaser audio is disabled.

## Levels 6–50 cooking atlases (2026-10-07)

Purpose: 225 local food-state sprites for the confirmed campaign expansion. Nine 5×5 atlases contain five recipes per sheet; each row is `raw → prep → cooked → final plated dish → mukbang bite`. Reference media: accepted Pizza final `bfdacfd1-1576-4b63-8a13-96ff59d4c92d` and Jelly final `5dca3aca-ab7d-4781-a4b5-bf26c4fab5c9`. Every generation requested model `nano_banana_2`, 2K, 1:1; completed metadata reports backend alias `nano_banana_flash`. Every accepted sheet was processed by a separate Higgsfield `image_background_remover` job.

| Levels | Nano Banana 2 job | Background Remover job | Runtime output |
|---|---|---|---|
| 6–10 | `845b951f-6cf3-4f1c-ac34-2355f6306d49` | `43868a52-5183-4c28-b6ec-88311c5267d4` | Corn Dogs, Pancakes, Burger, Donuts, French Fries |
| 11–15 | `46496be0-86db-4a28-bfa2-f3b14ea4e198` | `06e8c3a2-4fbb-45f4-a57a-08dbcb5b7f0d` | Tacos through Chicken Nuggets |
| 16–20 | `140f62ec-0667-4118-93c2-31b74351ae97` | `a1e049aa-db94-4c84-8377-b1fe7a92bff9` | Waffles with Ice Cream through Cake Pops |
| 21–25 | `79d5795a-d4c9-47b8-a7db-46b870dde646` | `97379a1b-0f21-4810-9e46-ba08408577fa` | Skewers through Egg Fried Rice |
| 26–30 | `fc9f4712-7e24-4cbc-bfc7-3fab5276a117` | `dc9272d7-4ddf-452a-a258-c9a9edd71533` | Udon through Cupcakes |
| 31–35 | `806442eb-134d-49a3-856f-6764c57cc2f5` | `8efd66ef-9ec1-4f2d-b609-83808c448014` | Churros through Potato Wedges |
| 36–40 | `b6634d20-2a34-4073-9194-bfa8d693f315` | `65b5eb02-2dbc-4aa8-a2e0-b53d0be92c44` | Omurice through Egg and Cheese Toast |
| 41–45 | `9fba3dca-768d-47e1-8bea-ec1cc1e79ea6` | `44c8ad60-dc51-4f63-9593-19be57dec829` | Fruit Sandwich through Nachos with Cheese |
| 46–50 | `60263e9c-db4f-49b7-96c4-89091af6e2d4` | `49296227-4bbd-4567-9f69-b7a1c0aecaea` | Mini Chicken Tacos through Matcha Bubble Tea |

The first 46–50 attempt `9b5326fb-905f-43a0-9a2a-8c9035c4b5c8` was automatically rejected (`nsfw` false positive), produced no asset and was not sent to the remover. The neutral food-only retry above is accepted. Raw masters are in `art-source/campaign-50/generated/raw/`; transparent masters are in `art-source/campaign-50/generated/cutout/`. `scripts/build-assets.mjs` slices them deterministically (5 px cell inset, alpha-aware trim, max 700 px) into `public/assets/campaign50/food-{NN}-{slug}-{stage}.webp`. No local chroma key is used. Visual QA checked all nine transparent grids; final balance was 22 credits on Plus (49 before this pass).

## Recipe redesign: kitchen tools + Levels 6–10 states (2026-10-08)

Purpose: correct utensils for every recipe (no reused syrup pitcher / sushi knife / stove for unrelated actions) and the missing intermediate food states of the Corn Dog sample and Levels 7–10. Both requests used model `nano_banana_2`, 2K, 1:1, with the accepted 6–10 atlas job `845b951f-6cf3-4f1c-ac34-2355f6306d49` as `image_references`; completed metadata reports backend alias `nano_banana_flash`. Cell order, keys and slicing live in `src/content/kitchenArt.js` and `scripts/build-assets.mjs` (5 px inset, alpha trim, max 600 px) → `public/assets/kitchen/*.webp`.

| Sheet | Nano Banana 2 job | Background Remover job | Notes |
|---|---|---|---|
| Kitchen tools (25) | `f6c659cc-ecbb-4a5c-9d46-0feccf40580b` | `af11cd63-173f-47ba-ac8d-902e7bc80ec5` | accepted, all 25 cells. First attempt `82b6e7ff-c573-418b-aca9-abe63d329d14` failed (likely a moderation false positive on "kitchen knife"); it was not charged and the existing `sushi-knife` is reused for cutting. |
| Levels 6–10 states (25) | `e39084fe-1aa4-4bea-b4e2-e0716f8989c1` | `81d83c64-c1e8-4ad5-b518-888f2de58ee0` | 24 accepted. Cell 20 (sprinkles) rejected: the remover erased the tiny particles (max alpha 47); sprinkles are code-drawn instead. Cell 0 (sausage) came back with a stick tip; `build-assets.mjs` erases that polygon (`ERASE['s-sausage']`, cell-pixel coordinates) because the stick is a separate tool in the recipe. |

Cost: 4 generation credits + 2 background-removal credits; balance 22 → 16. Prompts are recorded verbatim in the Higgsfield job metadata; they ask for a 5×5 grid in the reference style with isolated items on a white background, listing the items row by row in the key order above.
