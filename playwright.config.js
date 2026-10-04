import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://127.0.0.1:5173/?debug=1',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    { name: 'mouse-390x844', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'touch-360x800', use: { browserName: 'chromium', viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true } },
    { name: 'tall-412x915', use: { browserName: 'chromium', viewport: { width: 412, height: 915 } } },
  ],
});
