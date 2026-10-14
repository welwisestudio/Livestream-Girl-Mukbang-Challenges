import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// YouTube Playables integration suite (tests/youtube). Runs the real YouTube builds under the
// official test-suite CSP with a fake `ytgame` SDK served at the SDK URL:
//   release → dist-youtube     (the bundle that goes into the ZIP; no test hooks)
//   qa      → dist-youtube-qa  (same profile + QA hooks for state-level checks)
// Build both first: `npm run test:youtube` does it.
const edge = join(process.env['ProgramFiles(x86)'] ?? 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe');
const browserExecutable = process.env.PLAYWRIGHT_EXECUTABLE_PATH || (existsSync(edge) ? edge : undefined);

export default defineConfig({
  testDir: './tests/youtube',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    launchOptions: browserExecutable ? { executablePath: browserExecutable } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    { command: 'npx vite preview --host 127.0.0.1 --port 4175 --strictPort --outDir dist-youtube', url: 'http://127.0.0.1:4175/', reuseExistingServer: false, timeout: 30_000 },
    { command: 'npx vite preview --host 127.0.0.1 --port 4176 --strictPort --outDir dist-youtube-qa --mode youtube-qa', url: 'http://127.0.0.1:4176/', reuseExistingServer: false, timeout: 30_000 },
  ],
  projects: [
    { name: 'yt-mouse-1280x720', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } } },
    { name: 'yt-touch-390x844', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
