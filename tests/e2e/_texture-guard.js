import { test, expect } from '@playwright/test';

// Imported by every spec: art is streamed after the first screen (AssetStreamer), so any test
// fails if a screen used an image before it was loaded.
test.afterEach(async ({ page }) => {
  const missing = await page.evaluate(() => window.__GAME_DEBUG__?.missingTextures?.() ?? []).catch(() => []);
  expect(missing, 'art used before it was loaded').toEqual([]);
});
