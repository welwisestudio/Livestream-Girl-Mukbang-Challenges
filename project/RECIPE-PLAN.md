# Recipe plan — Levels 1–50 (logic-first redesign)

Updated 2026-10-08. The per-level tables below are **generated from the game data**
(`src/content/recipeCatalog.js`) by `node scripts/recipe-plan.mjs`, so this plan always matches what
the player actually does. To change a recipe, edit the catalog and regenerate this file.

## Why the redesign

Audit of the previous build (all 50 levels):

- Every interaction was mapped to one generic shared tool regardless of recipe. Every SQUEEZE and
  POUR used the Bubble Tea **syrup pitcher**, so the corn dog got "orange juice" poured over it.
  Slice/peel/grate/chop all used the sushi knife, roll/fold/wrap used the sushi mat, and
  fry/boil/bake used one stove icon.
- Place/scoop/dip/stack dragged **a miniature copy of the dish onto itself** and left yellow dots.
- Each recipe had only five sprites (raw → prep → cooked → final → bite). Many steps went
  `raw → raw` or `prep → prep`, so the action happened and nothing visibly changed.

## Interaction vocabulary (engine step kinds)

| Interaction | Player does | Visible result |
|---|---|---|
| PLACE / ASSEMBLE / STACK / SCOOP / CRACK / DRAIN / SERVE / CUT_OUT | drags a real ingredient or tool onto the food (1–5×). ASSEMBLE takes an ordered list, e.g. the burger | the piece stays where it was dropped, the stack grows, a scoop leaves a dollop, a cutter leaves a ring |
| DIP / COAT | drags the food into a bowl; it dunks and comes out | new coated sprite, splash |
| CUT / CHOP / PEEL / GRATE | strokes with a knife, pizza cutter, peeler or grater | cut lines, peel strips or falling shreds, then a new sprite |
| WHISK / STIR / SPREAD / TOSS / BRUSH | circles with a whisk, spoon or ladle | swirl, then a new sprite |
| POUR | drags a jug, ladle, broth or syrup over the food; it tilts | liquid stream, then a new sprite or a pool of liquid on top |
| SQUEEZE / PIPE | moves a sauce bottle or piping bag over the food | the sauce line is drawn exactly where the finger went; strokes outside the food draw nothing |
| SPRINKLE | moves a shaker or a pinch of an ingredient over the food | particles fall and stay on the food |
| COOK / FRY / BOIL / BAKE / BLEND | drops the food into the fryer, pan, pot or oven (or taps the heat), watches bubbles, steam or sizzle, then **taps when it is ready** | cooking sprite, effects, ready sprite. Tapping too early shows "Not yet!" and nothing advances |
| ROLL / FLIP / SHAKE / PRESS / KNEAD / FOLD | directional gesture with the right tool (or a hand grab-handle) | flatten, real flip in the air, shake, squash and flour puff, then a new sprite |
| SEAL | taps the sealing machine | sealed cup |

Code-drawn sauce lines, particles, placed pieces and cut marks stay on the food across steps. They
fade only when the food sprite changes (the new sprite already contains them) or when the food moves
into another container.

Art legend: ✅ existing sprite · 🆕 new this pass (kitchen tools `k-*`, Levels 6–10 states `s-*`) ·
✨ code-drawn change · ⏳ the nearest existing sprite is used until a dedicated sprite is generated.

## Quality checklist (applied to every level)

1. **Culinary sense.** No unrelated pitchers, bowls or utensils; each tool matches its action. This is enforced by `tests/unit/recipes.test.js`.
2. **Understandable.** Every instruction is a verb plus an object, in recipe order.
3. **Visible change.** Every step swaps the food sprite or leaves a drawn or placed change. Also enforced by the unit test.
4. **Interaction count.** Levels 2–50 have 4–7 actions each (unit test).
5. **Variety.** Neighbouring levels differ in their signature moment: dip and coat → flip and stack → ordered build → stamp and glaze → peel and cut.
6. **No mechanic-driven filler.** Removed: shake the fries basket, a passive "wait for chocolate" tap, kneading with no visual result, washing potatoes, stirring after boiling, the circular "stir" of a cocktail shaker, the sushi knife used for peeling and grating, and the syrup pitcher used for sauces.

## Art budget

This pass generated a kitchen tools atlas and a Levels 6–10 states atlas: 2 Nano Banana 2 jobs (2 credits each) plus 2 Background Remover jobs. One failed generation was not charged.
The ⏳ steps below need about 30 more state sprites, roughly two 5×5 atlases, or about 6 credits.

<!-- generated:start -->

## 1 — Jelly (approved checkpoint, unchanged)
Choose mold → pour the orange jelly mix → stir → chill and lift the mold → add berries → glaze. The pitcher here holds the jelly mix, so it is the correct tool.

## 2 — Ramen
| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Put the noodles in the pot | PLACE | `noodles` | `pot-empty` → `pot-noodles` | ✅ |
| 2 | Pour in the broth | POUR | `broth` | `pot-noodles` → `ramen-boiling` | ✅ |
| 3 | Turn on the heat, lift when soft | COOK | `stove` | `ramen-boiling` → `ramen-boiling` → `ramen-boiling` | ✨ |
| 4 | Season the broth | SPRINKLE | `seasoning` | `ramen-boiling` → same sprite + drawn change | ✨ |
| 5 | Add the egg | PLACE | `egg` | `ramen-boiling` → same sprite + drawn change | ⏳ plain ramen in a serving bowl (cooking and serving are the same pot today) |
| 6 | Add the toppings | PLACE | `ramen-toppings` | `ramen-boiling` → `ramen-finished` | ✅ |

## 3 — Pizza
| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Roll the dough flat | ROLL | `k-rolling-pin` | `s-dough-ball` → `food-24-mini-pepperoni-pizza-prep` | 🆕 |
| 2 | Spread the tomato sauce | SPREAD | `k-ladle` | `food-24-mini-pepperoni-pizza-prep` → `dough-sauced` | 🆕 |
| 3 | Sprinkle the cheese | SPRINKLE | `s-shredded-cheese` | `dough-sauced` → same sprite + drawn change | 🆕 ✨ |
| 4 | Place the toppings | PLACE | `pizza-toppings` | `dough-sauced` → `pizza-raw` | ✅ |
| 5 | Bake it in the oven | BAKE | `pizza-raw` | `oven` → `oven-baking` → `pizza-finished` | ✨ |
| 6 | Slice the pizza | CUT | `pizza-cutter` | `pizza-finished` → same sprite + drawn change | ✨ |

## 4 — Sushi
| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Put rice on the nori | PLACE | `rice` | `nori` → `nori-rice` | ✅ |
| 2 | Line up the fillings | PLACE | `sushi-fillings` | `nori-rice` → `sushi-open` | ✅ |
| 3 | Roll it up with the mat | ROLL | `sushi-mat` | `sushi-open` → `sushi-roll` | ✅ |
| 4 | Slice the roll | CUT | `sushi-knife` | `sushi-roll` → `sushi-cut` | ✨ |
| 5 | Arrange it on the plate | SERVE | `sushi-cut` | `lobby-plate` → `sushi-finished` | ✅ |

## 5 — Bubble Tea
| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Add tapioca pearls | PLACE | `pearls` | `tea-cup` → `cup-pearls` | ✅ |
| 2 | Pour the syrup | POUR | `syrup` | `cup-pearls` → `cup-syrup` | ✅ |
| 3 | Pour the milk tea | POUR | `milk-tea` | `cup-syrup` → `cup-tea` | ✅ |
| 4 | Add ice | PLACE | `ice` | `cup-tea` → `cup-ice` | ✅ |
| 5 | Shake it well | SHAKE | `shaker` | `cup-ice` → `bubble-tea-full` | ✅ |
| 6 | Seal the cup | SEAL | `sealer` | `bubble-tea-full` → `bubble-tea-finished` | ✅ |

## 6 — Corn Dogs
Signature moment: Dunk twice to build the coat, fry, then draw your own sauce. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Push the stick into the sausage | PLACE | `k-skewers` | `s-sausage` → `@raw` | 🆕 |
| 2 | Whisk the batter | WHISK | `k-whisk` | `k-bowl-unmixed` → `k-bowl-batter` | 🆕 |
| 3 | Dip it in the batter | DIP | `@raw` | `@raw` into `k-bowl-batter` → `s-cd-battered` | 🆕 |
| 4 | Roll it in breadcrumbs | COAT | `s-cd-battered` | `s-cd-battered` into `k-bowl-crumbs` → `s-cd-crumbed` | 🆕 |
| 5 | Fry until golden, then lift it out | FRY | `s-cd-crumbed` | `k-fryer` → `s-cd-frying` → `s-cd-golden` | 🆕 ✨ |
| 6 | Zigzag the ketchup | SQUEEZE | `k-ketchup` | `s-cd-golden` → same sprite + drawn change | 🆕 ✨ |
| 7 | Zigzag the mustard | SQUEEZE | `k-mustard` | `s-cd-golden` → `@final` | 🆕 ✨ |

## 7 — Pancakes
Signature moment: Wait for the bubbles, flip, stack and top. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Whisk the batter | WHISK | `k-whisk` | `k-bowl-unmixed` → `k-bowl-batter` | 🆕 |
| 2 | Ladle batter into the pan | POUR | `k-ladle` | `k-pan` → `@prep` | ⏳ pancake states use a pink pan; the empty pan is black |
| 3 | Cook until bubbles appear, then tap | COOK | `stove` | `@prep` → `@prep` → `s-pancake-bubbly` → `s-pancake-bubbly` | 🆕 ✨ |
| 4 | Flip it with the spatula | FLIP | `k-spatula` | `s-pancake-bubbly` → `@cooked` | 🆕 |
| 5 | Slide the pancakes onto the plate | STACK | `@cooked` | `lobby-plate` → `s-pancake-stack` | 🆕 |
| 6 | Pour the syrup | POUR | `syrup` | `s-pancake-stack` → same sprite + drawn change | 🆕 ✨ |
| 7 | Add blueberries | PLACE | `s-blueberries` | `s-pancake-stack` → `@final` | 🆕 |

## 8 — Burger
Signature moment: Build the stack piece by piece in the right order. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Season the patty | SPRINKLE | `k-salt` | `@raw` → same sprite + drawn change | 🆕 ✨ |
| 2 | Put the patty in the pan | PLACE | `@raw` | `k-pan` → `s-patty-pan` | 🆕 |
| 3 | Cook it, lift when browned | COOK | `stove` | `s-patty-pan` → `s-patty-pan` → `s-patty-pan` | 🆕 ✨ |
| 4 | Flip the patty | FLIP | `k-spatula` | `s-patty-pan` → `@prep` | 🆕 |
| 5 | Melt a cheese slice on top | PLACE | `s-cheese-slice` | `@prep` → same sprite + drawn change | 🆕 ✨ |
| 6 | Build it: patty, tomato, top bun | ASSEMBLE | `@prep` → `s-tomato-slices` → `s-top-bun` | `s-bun-lettuce` → `s-burger-cheese` → +`s-tomato-slices` → `@final` | ⏳ patty-with-cheese without the pan for the drag item |

## 9 — Donuts
Signature moment: Roll, stamp out rings and decorate. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Mix the dough | STIR | `k-spoon` | `k-bowl-unmixed` → `s-dough-ball` | 🆕 |
| 2 | Roll the dough flat | ROLL | `k-rolling-pin` | `s-dough-ball` → `s-dough-sheet` | ⏳ plain dough sheet (current sheet already shows ring marks) |
| 3 | Cut out the rings | CUT_OUT | `k-ring-cutter` | `s-dough-sheet` → `@raw` | 🆕 |
| 4 | Fry, then lift them out | FRY | `@raw` | `k-fryer` → `@prep` → `@cooked` | 🆕 ✨ |
| 5 | Drizzle the pink glaze | PIPE | `k-piping-bag` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 6 | Shake on sprinkles | SPRINKLE | `k-salt` | `@cooked` → `@final` | 🆕 ✨ |

## 10 — French Fries
Signature moment: Whole potato → peeled → strips → fried → salted. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Peel the potato | PEEL | `k-peeler` | `@raw` → `s-potato-peeled` | 🆕 ✨ |
| 2 | Cut it into strips | CUT | `sushi-knife` | `s-potato-peeled` → `@prep` | 🆕 ✨ |
| 3 | Fry, then lift the basket | FRY | `@prep` | `k-fryer` → `s-fries-basket` → `@cooked` | 🆕 ✨ |
| 4 | Salt the fries | SPRINKLE | `k-salt` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 5 | Pour them into the box | SERVE | `@cooked` | `lobby-plate` → `@final` | ✅ |

## 11 — Tacos
Signature moment: Fill, top and fold soft tacos. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Chop the tomato | CHOP | `sushi-knife` | `tomato` → `@prep` | ✨ |
| 2 | Cook the meat, lift when browned | COOK | `@prep` | `k-pan` → `@cooked` → `@cooked` | 🆕 ✨ |
| 3 | Spoon meat onto the tortillas | SCOOP | `k-spoon` | `@raw` → same sprite + drawn change | ⏳ open taco shells |
| 4 | Add lettuce and tomato | ASSEMBLE | `s-lettuce` → `s-tomato-slices` | `@raw` → +`s-lettuce` → +`s-tomato-slices` | 🆕 ✨ |
| 5 | Sprinkle cheese | SPRINKLE | `s-shredded-cheese` | `@raw` → same sprite + drawn change | 🆕 ✨ |
| 6 | Fold the tacos | FOLD | `k-spatula` | `@raw` → `@final` | 🆕 |

## 12 — Pasta with Tomato Sauce
Signature moment: Boil, drain, sauce and grate cheese on top. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Boil the pasta, lift when soft | BOIL | `@raw` | `k-pot` → `@prep` → `@prep` | 🆕 ✨ |
| 2 | Drain it in the colander | DRAIN | `@prep` | `k-colander` → `@cooked` | 🆕 |
| 3 | Ladle on the tomato sauce | POUR | `k-ladle` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Toss until coated | TOSS | `k-spoon` | `@cooked` → `@final` | 🆕 |
| 5 | Grate cheese on top | GRATE | `k-grater` | `@final` → same sprite + drawn change | 🆕 ✨ |

## 13 — Mochi
Signature moment: Pound the dough, fill it and pinch it closed. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Mix the rice flour dough | STIR | `k-spoon` | `@raw` → `@prep` | 🆕 |
| 2 | Pound the dough | KNEAD | `hand` | `@prep` → same sprite + drawn change | ✅ |
| 3 | Add strawberry filling | PLACE | `s-strawberry-slices` | `@prep` → `@cooked` | 🆕 |
| 4 | Pinch them closed | FOLD | `hand` | `@cooked` → `@final` | ✅ |

## 14 — Onigiri
Signature moment: Fill and press rice into triangles. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Salt the rice | SPRINKLE | `k-salt` | `@raw` → same sprite + drawn change | 🆕 ✨ |
| 2 | Add the salmon filling | PLACE | `sushi-fillings` | `@raw` → `@prep` | ✅ |
| 3 | Press into a triangle | PRESS | `hand` | `@prep` → `@cooked` | ✅ |
| 4 | Wrap with nori | PLACE | `nori` | `@cooked` → `@final` | ✅ |

## 15 — Chicken Nuggets
Signature moment: Egg wash and breadcrumbs before frying. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Dip the chicken in egg | DIP | `@raw` | `@raw` into `k-egg-bowl` → `@raw` | 🆕 |
| 2 | Coat with breadcrumbs | COAT | `@raw` | `@raw` into `k-bowl-crumbs` → `@prep` | 🆕 |
| 3 | Fry, then lift them out | FRY | `@prep` | `k-fryer` → `@cooked` → `@cooked` | 🆕 ✨ |
| 4 | Salt them | SPRINKLE | `k-salt` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 5 | Plate with dipping sauce | SERVE | `@cooked` | `lobby-plate` → `@final` | ✅ |

## 16 — Waffles with Ice Cream
Signature moment: Bake in the iron and build a dessert plate. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Whisk the batter | WHISK | `k-whisk` | `k-bowl-unmixed` → `@raw` | 🆕 |
| 2 | Close the iron, open when crisp | COOK | hand | `@prep` → `@prep` → `@cooked` | ✨ |
| 3 | Put two waffles on the plate | PLACE | `@cooked` | `lobby-plate` → same sprite + drawn change | ✨ |
| 4 | Scoop ice cream on top | SCOOP | `k-scoop` | `lobby-plate` → same sprite + drawn change | ⏳ ice-cream scoop sprite |
| 5 | Add blueberries | PLACE | `s-blueberries` | `lobby-plate` → `@final` | 🆕 |
| 6 | Drizzle chocolate | PIPE | `k-piping-bag` | `@final` → same sprite + drawn change | 🆕 ✨ |

## 17 — Mini Hot Dogs
Signature moment: Cook a batch and sauce every one. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Cook the sausages, lift when browned | COOK | `@raw` | `k-pan` → `@prep` → `@prep` | 🆕 ✨ |
| 2 | Tuck the sausages into the buns | SERVE | `@prep` | `lobby-plate` → `@cooked` | ⏳ open mini buns |
| 3 | Zigzag the ketchup | SQUEEZE | `k-ketchup` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Zigzag the mustard | SQUEEZE | `k-mustard` | `@cooked` → `@final` | 🆕 ✨ |

## 18 — Mac and Cheese
Signature moment: Boil, drain, then build a creamy cheese sauce. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Boil the macaroni, lift when soft | BOIL | `@raw` | `k-pot` → `@prep` → `@prep` | 🆕 ✨ |
| 2 | Drain it in the colander | DRAIN | `@prep` | `k-colander` → `@cooked` | 🆕 |
| 3 | Pour in the milk | POUR | `k-milk-jug` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Grate in the cheese | GRATE | `k-grater` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 5 | Stir until creamy | STIR | `k-spoon` | `@cooked` → `@final` | 🆕 |

## 19 — Chocolate-Covered Strawberries
Signature moment: Melt, dip and stripe each berry. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Melt the chocolate, tap when smooth | COOK | `stove` | `@prep` → `@prep` → `@prep` | ⏳ chopped chocolate bowl before melting |
| 2 | Stir until glossy | STIR | `k-spoon` | `@prep` → same sprite + drawn change | 🆕 |
| 3 | Dip the strawberries | DIP | `berries` | `@prep` → `@cooked` | ⏳ single whole strawberry |
| 4 | Pipe white stripes | PIPE | `k-piping-bag` | `@cooked` → `@final` | 🆕 ✨ |

## 20 — Cake Pops
Signature moment: Crumble, stick, ice and sprinkle. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Crumble the cake | PRESS | `hand` | `@raw` → `@prep` | ✅ |
| 2 | Push in the sticks | PLACE | `k-skewers` | `@prep` → `@cooked` | ⏳ rolled cake balls before the sticks |
| 3 | Pipe pink icing | PIPE | `k-piping-bag` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Shake on sprinkles | SPRINKLE | `k-salt` | `@cooked` → `@final` | 🆕 ✨ |

## 21 — Skewers
Signature moment: Thread the pieces, brush and grill. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Chop the vegetables | CHOP | `sushi-knife` | `@raw` → same sprite + drawn change | ✨ |
| 2 | Thread them onto sticks | PLACE | `k-skewers` | `@raw` → `@prep` | 🆕 |
| 3 | Brush on the sauce | BRUSH | `k-spoon` | `@prep` → `@cooked` | 🆕 |
| 4 | Grill them, lift when charred | COOK | `stove` | `@cooked` → `@cooked` → `@final` | ✨ |

## 22 — Eggs and Bacon
Signature moment: Crisp the bacon and crack eggs beside it. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Fry the bacon, lift when crispy | COOK | `@raw` | `k-pan` → `@prep` → `@prep` | ⏳ bacon only (raw art includes the egg carton) |
| 2 | Flip the bacon | FLIP | `k-spatula` | `@prep` → same sprite + drawn change | 🆕 |
| 3 | Crack two eggs into the pan | CRACK | `k-egg` | `@prep` → `@cooked` | 🆕 |
| 4 | Cook the eggs, tap when set | COOK | `stove` | `@cooked` → `@cooked` → `@cooked` | ✨ |
| 5 | Plate the breakfast | SERVE | `@cooked` | `lobby-plate` → `@final` | ✅ |

## 23 — Sandwich
Signature moment: Layer the fillings and cut it diagonally. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Slice the tomato | CUT | `sushi-knife` | `tomato` → `s-tomato-slices` | 🆕 ✨ |
| 2 | Spread the mayo | SPREAD | `k-spoon` | `@raw` → `@prep` | 🆕 |
| 3 | Layer lettuce, tomato and cheese | ASSEMBLE | `s-lettuce` → `s-tomato-slices` → `s-cheese-slice` | `@prep` → +`s-lettuce` → +`s-tomato-slices` → `@cooked` | 🆕 ✨ |
| 4 | Cut it diagonally | CUT | `sushi-knife` | `@cooked` → `@final` | ✨ |

## 24 — Mini Pepperoni Pizza
Signature moment: Knead, roll, top and bake a small pizza. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Knead the dough | KNEAD | `hand` | `@raw` → same sprite + drawn change | ✅ |
| 2 | Roll it flat | ROLL | `k-rolling-pin` | `@raw` → `@prep` | 🆕 |
| 3 | Ladle on the tomato sauce | POUR | `k-ladle` | `@prep` → same sprite + drawn change | 🆕 ✨ |
| 4 | Sprinkle the cheese | SPRINKLE | `s-shredded-cheese` | `@prep` → `@cooked` | 🆕 ✨ |
| 5 | Bake it in the oven | BAKE | `@cooked` | `oven` → `oven-baking` → `@final` | ✨ |

## 25 — Egg Fried Rice
Signature moment: Scramble egg in the pan, then fry the rice. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Beat the egg | WHISK | `k-whisk` | `@prep` → same sprite + drawn change | 🆕 |
| 2 | Pour the egg into the pan | SCOOP | `@prep` | `k-pan` → same sprite + drawn change | 🆕 ✨ |
| 3 | Add the rice | PLACE | `@raw` | `k-pan` → `@cooked` | 🆕 |
| 4 | Stir-fry, tap when steaming | COOK | `stove` | `@cooked` → `@cooked` → `@cooked` | ✨ |
| 5 | Add green onion | PLACE | `s-green-onion` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 6 | Season with soy sauce | SQUEEZE | `soy-sauce` | `@cooked` → `@final` | ✨ |

## 26 — Udon
Signature moment: Knead, roll and cut thick noodles by hand. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Knead the noodle dough | KNEAD | `hand` | `@raw` → same sprite + drawn change | ✅ |
| 2 | Roll the dough flat | ROLL | `k-rolling-pin` | `@raw` → `@prep` | 🆕 |
| 3 | Cut thick noodles | CUT | `sushi-knife` | `@prep` → `@cooked` | ✨ |
| 4 | Boil the noodles, lift when soft | BOIL | `@cooked` | `k-pot` → `k-pot` → `@cooked` | 🆕 ✨ |
| 5 | Pour the broth | POUR | `broth` | `@cooked` → same sprite + drawn change | ⏳ noodles in an empty serving bowl |
| 6 | Add the toppings | PLACE | `s-green-onion` | `@cooked` → `@final` | 🆕 |

## 27 — Kimbap
Signature moment: Line up the fillings, roll tight and slice. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Put rice on the seaweed | PLACE | `rice` | `nori` → `@raw` | ✅ |
| 2 | Line up the fillings | PLACE | `sushi-fillings` | `@raw` → `@prep` | ✅ |
| 3 | Roll it tightly | ROLL | `sushi-mat` | `@prep` → `@cooked` | ✅ |
| 4 | Slice even pieces | CUT | `sushi-knife` | `@cooked` → `@final` | ✨ |
| 5 | Sprinkle sesame seeds | SPRINKLE | `k-salt` | `@final` → same sprite + drawn change | 🆕 ✨ |

## 28 — Fruit Salad
Signature moment: Peel and chop mixed fruit, then toss. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Peel the fruit | PEEL | `k-peeler` | `@raw` → `@prep` | 🆕 ✨ |
| 2 | Chop bite-size pieces | CHOP | `sushi-knife` | `@prep` → `@cooked` | ✨ |
| 3 | Add strawberries | PLACE | `s-strawberry-slices` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Toss it in the bowl | TOSS | `k-spoon` | `@cooked` → `@final` | ⏳ empty glass bowl to tip the fruit into |
| 5 | Drizzle honey | SQUEEZE | `syrup` | `@final` → same sprite + drawn change | ✨ |

## 29 — Chocolate Banana
Signature moment: Peel, stick and dunk a whole banana. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Peel the banana | PEEL | `k-peeler` | `@raw` → same sprite + drawn change | ⏳ peeled whole banana |
| 2 | Push in the stick | PLACE | `k-skewers` | `@raw` → same sprite + drawn change | 🆕 ✨ |
| 3 | Dunk it in chocolate | DIP | `@raw` | `@raw` into `@cooked` → `@final` | ⏳ chocolate banana without sprinkles |
| 4 | Shake on sprinkles | SPRINKLE | `k-salt` | `@final` → same sprite + drawn change | 🆕 ✨ |

## 30 — Cupcakes
Signature moment: Bake, then pipe tall frosting swirls. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Whisk the batter | WHISK | `k-whisk` | `k-bowl-unmixed` → `@raw` | 🆕 |
| 2 | Bake the cupcakes | BAKE | `@prep` | `oven` → `oven` → `@cooked` | ✨ |
| 3 | Pipe the frosting | PIPE | `k-piping-bag` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Shake on sprinkles | SPRINKLE | `k-salt` | `@cooked` → `@final` | 🆕 ✨ |

## 31 — Churros
Signature moment: Pipe long strips, cut, fry and sugar them. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Mix the churro dough | WHISK | `k-spoon` | `k-bowl-unmixed` → `@raw` | 🆕 |
| 2 | Pipe long strips | PIPE | `k-piping-bag` | `k-board` → `@prep` | 🆕 ✨ |
| 3 | Cut equal lengths | CUT | `sushi-knife` | `@prep` → `@cooked` | ✨ |
| 4 | Fry, then lift them out | FRY | `@cooked` | `k-fryer` → `k-fryer` → `@final` | ⏳ fried churros before sugar |
| 5 | Shake on cinnamon sugar | SPRINKLE | `k-salt` | `@final` → same sprite + drawn change | 🆕 ✨ |

## 32 — Caramel Popcorn
Signature moment: Pop the corn, then coat it in caramel. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Pour the kernels into the pot | PLACE | `@raw` | `k-pot` → `@prep` | 🆕 |
| 2 | Heat until it pops | COOK | `stove` | `@prep` → `@prep` → `@cooked` | ✨ |
| 3 | Pour the caramel | POUR | `k-ladle` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Toss to coat every piece | TOSS | `k-spoon` | `@cooked` → `@final` | 🆕 |

## 33 — Chicken Wings
Signature moment: Season, fry and toss in sticky sauce. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Season the wings | SPRINKLE | `k-salt` | `@raw` → `@prep` | 🆕 ✨ |
| 2 | Fry, then lift them out | FRY | `@prep` | `k-fryer` → `@cooked` → `@cooked` | ⏳ golden wings in the basket |
| 3 | Add the sauce | SQUEEZE | `k-ketchup` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Toss until glazed | TOSS | `k-spoon` | `@cooked` → `@final` | 🆕 |

## 34 — Cheese Sticks
Signature moment: Cut, bread and fry cheese batons. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Cut the cheese into sticks | CUT | `sushi-knife` | `@raw` → same sprite + drawn change | ✨ |
| 2 | Dip in egg | DIP | `@raw` | `@raw` into `k-egg-bowl` → `@prep` | 🆕 |
| 3 | Coat with breadcrumbs | COAT | `@prep` | `@prep` into `k-bowl-crumbs` → `@cooked` | 🆕 |
| 4 | Fry, then lift them out | FRY | `@cooked` | `k-fryer` → `k-fryer` → `@cooked` | 🆕 ✨ |
| 5 | Plate with dipping sauce | SERVE | `@cooked` | `lobby-plate` → `@final` | ✅ |

## 35 — Potato Wedges
Signature moment: Cut thick wedges, season and fry. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Cut thick wedges | CUT | `sushi-knife` | `@raw` → `@prep` | ✨ |
| 2 | Season the wedges | SPRINKLE | `k-salt` | `@prep` → `@cooked` | 🆕 ✨ |
| 3 | Fry, then lift the basket | FRY | `@cooked` | `k-fryer` → `k-fryer` → `@final` | 🆕 ✨ |
| 4 | Add a dollop of sour cream | PIPE | `k-piping-bag` | `@final` → same sprite + drawn change | 🆕 ✨ |

## 36 — Omurice
Signature moment: Fry the rice, wrap it in omelette and draw on it. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Chop the vegetables | CHOP | `sushi-knife` | `@raw` → same sprite + drawn change | ✨ |
| 2 | Fry the rice, lift when hot | COOK | `@raw` | `k-pan` → `@prep` → `@prep` | 🆕 ✨ |
| 3 | Whisk the eggs | WHISK | `k-whisk` | `k-egg-bowl` → same sprite + drawn change | 🆕 |
| 4 | Cook the omelette, tap when set | COOK | `k-egg-bowl` | `k-pan` → `@cooked` → `@cooked` | 🆕 ✨ |
| 5 | Fold it over the rice | FOLD | `k-spatula` | `@cooked` → `@final` | ⏳ omurice without the ketchup face |
| 6 | Draw with ketchup | SQUEEZE | `k-ketchup` | `@final` → same sprite + drawn change | 🆕 ✨ |

## 37 — Fried Dumplings / Gyoza
Signature moment: Fill, pleat and pan-steam dumplings. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Chop the filling | CHOP | `sushi-knife` | `@raw` → `@prep` | ✨ |
| 2 | Spoon filling onto a wrapper | PLACE | `k-spoon` | `@prep` → `@cooked` | 🆕 |
| 3 | Pinch the pleats | PRESS | `hand` | `@cooked` → same sprite + drawn change | ✅ |
| 4 | Pan-fry and steam, lift when crisp | COOK | `@cooked` | `k-pan` → `k-pan` → `@final` | 🆕 ✨ |

## 38 — Croquettes
Signature moment: Mash, crumb and fry potato patties. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Boil the potatoes, lift when soft | BOIL | `@raw` | `k-pot` → `k-pot` → `@raw` | 🆕 ✨ |
| 2 | Mash them | PRESS | `hand` | `@raw` → `@prep` | ✅ |
| 3 | Shape and coat in breadcrumbs | SPRINKLE | `k-bowl-crumbs` | `@prep` → `@cooked` | 🆕 ✨ |
| 4 | Fry, then lift them out | FRY | `@cooked` | `k-fryer` → `k-fryer` → `@final` | 🆕 ✨ |

## 39 — Taiyaki
Signature moment: Fill the fish mold and close it. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Whisk the batter | WHISK | `k-whisk` | `k-bowl-unmixed` → `@raw` | 🆕 |
| 2 | Ladle batter into the fish mold | POUR | `k-ladle` | `@prep` → same sprite + drawn change | ⏳ empty open fish mold |
| 3 | Close the mold | FOLD | `k-spatula` | `@prep` → `@cooked` | 🆕 |
| 4 | Cook it, open when golden | COOK | hand | `@cooked` → `@cooked` → `@final` | ✨ |

## 40 — Egg and Cheese Toast
Signature moment: Toast, crack an egg on top and melt cheese. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Put the bread in the pan | PLACE | `@raw` | `k-pan` → `@prep` | 🆕 |
| 2 | Crack an egg on the toast | CRACK | `k-egg` | `@prep` → `@cooked` | 🆕 |
| 3 | Add a cheese slice | PLACE | `s-cheese-slice` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Cook it, tap when the cheese melts | COOK | `stove` | `@cooked` → `@cooked` → `@cooked` | ✨ |
| 5 | Fold it onto the plate | SERVE | `@cooked` | `lobby-plate` → `@final` | ✅ |

## 41 — Fruit Sandwich
Signature moment: Arrange fruit in cream and wrap it tight. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Slice the fruit | CUT | `sushi-knife` | `@raw` → same sprite + drawn change | ✨ |
| 2 | Spread the cream | SPREAD | `k-spoon` | `@raw` → `@prep` | 🆕 |
| 3 | Arrange the fruit | PLACE | `s-strawberry-slices` | `@prep` → `@cooked` | 🆕 |
| 4 | Close and wrap it tightly | FOLD | `hand` | `@cooked` → `@final` | ✅ |

## 42 — Mini Strawberry Pancakes
Signature moment: Pipe tiny pancakes and stack them up. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Pipe small circles into the pan | PIPE | `k-piping-bag` | `k-pan` → `@prep` | 🆕 ✨ |
| 2 | Cook them, tap when bubbly | COOK | `stove` | `@prep` → `@prep` → `@cooked` | ✨ |
| 3 | Stack them on the plate | PLACE | `@cooked` | `lobby-plate` → same sprite + drawn change | ✨ |
| 4 | Add berries | PLACE | `s-blueberries` | `lobby-plate` → same sprite + drawn change | 🆕 ✨ |
| 5 | Pour strawberry syrup | POUR | `syrup` | `lobby-plate` → `@final` | ✅ |

## 43 — French Toast
Signature moment: Soak bread in custard, fry and top. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Pour milk onto the eggs | POUR | `k-milk-jug` | `@raw` → same sprite + drawn change | 🆕 ✨ |
| 2 | Whisk the custard | WHISK | `k-whisk` | `@raw` → same sprite + drawn change | 🆕 |
| 3 | Press the bread into the custard | PRESS | `hand` | `@raw` → `@prep` | ✅ |
| 4 | Fry it, lift when golden | COOK | `@prep` | `k-pan` → `@cooked` → `@cooked` | 🆕 ✨ |
| 5 | Flip the toast | FLIP | `k-spatula` | `@cooked` → same sprite + drawn change | 🆕 |
| 6 | Pour syrup and serve | POUR | `syrup` | `@cooked` → `@final` | ✅ |

## 44 — Chicken Wrap
Signature moment: Cook seasoned chicken and roll a tight wrap. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Slice the chicken | CUT | `sushi-knife` | `@raw` → same sprite + drawn change | ✨ |
| 2 | Season the chicken | SPRINKLE | `k-salt` | `@raw` → `@prep` | 🆕 ✨ |
| 3 | Cook it, lift when golden | COOK | `@prep` | `k-pan` → `@cooked` → `@cooked` | 🆕 ✨ |
| 4 | Add lettuce and tomato | ASSEMBLE | `s-lettuce` → `s-tomato-slices` | `@cooked` → +`s-lettuce` → +`s-tomato-slices` | ⏳ flat tortilla to fill |
| 5 | Roll it tightly | FOLD | `hand` | `@cooked` → `@final` | ✅ |

## 45 — Nachos with Cheese
Signature moment: Load the chips, melt the cheese and finish with cream. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Grate cheese over the chips | GRATE | `k-grater` | `@raw` → same sprite + drawn change | 🆕 ✨ |
| 2 | Add tomato and green onion | ASSEMBLE | `s-tomato-slices` → `s-green-onion` | `@raw` → +`s-tomato-slices` → `@cooked` | 🆕 ✨ |
| 3 | Melt it in the oven | BAKE | `@cooked` | `oven` → `oven` → `@final` | ✨ |
| 4 | Add sour cream | PIPE | `k-piping-bag` | `@final` → same sprite + drawn change | 🆕 ✨ |

## 46 — Mini Chicken Tacos
Signature moment: Fill and fold a batch of tiny tacos. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Season the chicken | SPRINKLE | `k-salt` | `@raw` → `@prep` | 🆕 ✨ |
| 2 | Cook it, lift when golden | COOK | `@prep` | `k-pan` → `@cooked` → `@cooked` | 🆕 ✨ |
| 3 | Spoon chicken into the shells | SCOOP | `k-spoon` | `@raw` → same sprite + drawn change | ⏳ empty mini shells |
| 4 | Add lettuce and tomato | ASSEMBLE | `s-lettuce` → `s-tomato-slices` | `@raw` → +`s-lettuce` → +`s-tomato-slices` | 🆕 ✨ |
| 5 | Fold the tacos | FOLD | `k-spatula` | `@raw` → `@final` | 🆕 |

## 47 — Chocolate Chip Cookies
Signature moment: Scoop even balls and bake them golden. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Mix the cookie dough | STIR | `k-spoon` | `@raw` → same sprite + drawn change | 🆕 |
| 2 | Scoop balls onto the tray | SCOOP | `k-scoop` | `lobby-plate` → `@cooked` | 🆕 |
| 3 | Press in extra chocolate chips | SCOOP | `k-spoon` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Bake until golden | BAKE | `@cooked` | `oven` → `oven` → `@final` | ✨ |

## 48 — Blueberry Muffins
Signature moment: Fold in berries, fill the tin and bake. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Mix the batter | STIR | `k-spoon` | `@raw` → same sprite + drawn change | 🆕 |
| 2 | Add blueberries | PLACE | `s-blueberries` | `@raw` → `@prep` | 🆕 |
| 3 | Scoop batter into the tin | SCOOP | `k-scoop` | `@cooked` → same sprite + drawn change | ⏳ empty muffin tin |
| 4 | Bake until risen | BAKE | `@cooked` | `oven` → `oven` → `@final` | ✨ |
| 5 | Dust with sugar | SPRINKLE | `k-salt` | `@final` → same sprite + drawn change | 🆕 ✨ |

## 49 — Strawberry Milkshake
Signature moment: Blend berries, milk and ice cream, then top. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Cut the strawberries | CUT | `sushi-knife` | `@raw` → `@prep` | ✨ |
| 2 | Add them to the blender | PLACE | `@prep` | `@cooked` → same sprite + drawn change | ⏳ empty blender |
| 3 | Pour in the milk | POUR | `k-milk-jug` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 4 | Add a scoop of ice cream | SCOOP | `k-scoop` | `@cooked` → same sprite + drawn change | 🆕 ✨ |
| 5 | Blend it, tap when smooth | BLEND | hand | `@cooked` → `@cooked` → `@bite` | ✨ |
| 6 | Top with whipped cream | PIPE | `k-piping-bag` | `@bite` → `@final` | 🆕 ✨ |

## 50 — Matcha Bubble Tea
Signature moment: Whisk matcha, build the drink and shake it. `@stage` = this recipe's own atlas sprite.

| # | Player action | Interaction | Tool / ingredient | Before → after | Art |
|---|---|---|---|---|---|
| 1 | Whisk the matcha | WHISK | `k-whisk` | `@prep` → same sprite + drawn change | 🆕 |
| 2 | Add tapioca pearls | PLACE | `pearls` | `tea-cup` → `cup-pearls` | ✅ |
| 3 | Add ice | PLACE | `ice` | `cup-pearls` → `@cooked` | ✅ |
| 4 | Pour in the matcha | POUR | `@prep` | `@cooked` → `@bite` | ✅ |
| 5 | Add milk | POUR | `k-milk-jug` | `@bite` → same sprite + drawn change | 🆕 ✨ |
| 6 | Shake it well | SHAKE | `shaker` | `@bite` → same sprite + drawn change | ✅ |
| 7 | Seal the cup | SEAL | `sealer` | `@bite` → `@final` | ✅ |

<!-- generated:end -->
