# Level 1 — Orange Jelly Live

ID `orange-jelly-01`. Reference: `Video2.mp4` 00:36–01:50. Config: `src/content/levels.js`. Step views: `src/levels/cookingSteps.js`.

## Flow

1. **Home.** HUD, LIVE KITCHEN pill, the streamer, the dish thought-bubble, the mascot and **Start Live**.
2. **Pre-stream.** Comments scroll and Make Jelly is grey. After about 1.6 s the Viewer Request card arrives (Sofia, orange jelly, reward 200) and Make Jelly turns orange.
3. **Cooking.** Six step dots with a sub-bar.
   1. **Choose a mold.** Tap the Orange card (Lv.2/Lv.3 are locked and shake), then tap ✓.
   2. **Pour.** Drag the pitcher onto the bowl. It tilts and pours by itself, and the bowl fills. A miss springs back.
   3. **Stir.** Circle anywhere on or near the bowl (2 turns). The bar fills and the whisk follows your finger. Progress is never lost.
   4. **Unmold.** After a short chill, lift the upside-down mold straight up. A sideways or short drag springs back.
   5. **Topping.** Tap Berries; they fly onto the jelly. Tap ✓. Locked cards shake.
   6. **Glaze.** Tap Glaze; the jug drizzles over the jelly. Tap ✓.
4. **Request check.** The request card returns with a **Done!** stamp.
5. **Perfect!!** ribbon.
6. **Mukbang.** LIVE viewer counter and chat. Three servings sit on the counter. Drag one to her mouth, or just tap it. Each portion is eaten in 3 bites (open mouth → chew → hearts), leaving an empty plate. A drop away from the mouth puts the portion back.
7. **Level up!** (first clear only): Level 2 and three unlocked items → **Next**.
8. **Complete!!** Stream photo, likes/comments, +200 → **Claim 200**. Coins fly to the HUD → Home.

## Rules

- Wrong input never advances a step and never breaks the level; retrying is immediate.
- Each step completes exactly once; repeated taps are ignored.
- The reward is granted once per run, with a receipt. If the save fails, Claim turns into "Retry claim" and a retry saves without paying twice.
- Values: 6 steps, 3 servings, 3 bites, reward 200, unlocks Level 2. Timings are in `src/content/timings.js`.

## Current campaign context

Level 1 remains the reference-derived tutorial. The implemented campaign now continues with Ramen, Pizza, Sushi and Bubble Tea through the same shared scene and reusable mechanics. Rewarded multiplier, gift pop-up, audio, pause and full hub meta systems remain out of scope.
