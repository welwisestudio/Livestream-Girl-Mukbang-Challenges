import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const installedEdge = process.platform === 'win32'
  ? join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  : null;
const browserExecutable = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ?? (installedEdge && existsSync(installedEdge) ? installedEdge : undefined);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    launchOptions: browserExecutable
      ? { executablePath: browserExecutable }
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
    { name: 'mouse-375x812', use: { browserName: 'chromium', viewport: { width: 375, height: 812 } } },
    { name: 'mouse-412x915', use: { browserName: 'chromium', viewport: { width: 412, height: 915 } } },
    { name: 'mouse-393x873', use: { browserName: 'chromium', viewport: { width: 393, height: 873 } } },
    { name: 'mouse-430x932', use: { browserName: 'chromium', viewport: { width: 430, height: 932 } } },
    { name: 'mouse-short-480x640', use: { browserName: 'chromium', viewport: { width: 480, height: 640 } } },
    { name: 'mouse-desktop-1280x720', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } } },
    { name: 'touch-landscape-844x390', use: { browserName: 'chromium', viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true } },
    { name: 'mouse-tablet-768x1024', use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'mouse-square-876x876', use: { browserName: 'chromium', viewport: { width: 876, height: 876 } } },
    { name: 'mouse-desktop-1440x900', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'mouse-desktop-1920x1080', use: { browserName: 'chromium', viewport: { width: 1920, height: 1080 } } },
    { name: 'mouse-ultrawide-2560x1080', use: { browserName: 'chromium', viewport: { width: 2560, height: 1080 } } },
    { name: 'mouse-desktop-1366x768', use: { browserName: 'chromium', viewport: { width: 1366, height: 768 } } },
    { name: 'mouse-desktop-2560x1440', use: { browserName: 'chromium', viewport: { width: 2560, height: 1440 } } },
    { name: 'mouse-tablet-landscape-1024x768', use: { browserName: 'chromium', viewport: { width: 1024, height: 768 } } },
    { name: 'mouse-dpr2-390x844', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } },
  ],
});
