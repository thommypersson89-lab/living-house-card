import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  expect: {
    // small anti-aliasing differences between machines are tolerated, changed motifs are not
    toHaveScreenshot: { maxDiffPixelRatio: 0.004, threshold: 0.2 },
  },
  use: {
    baseURL: 'http://127.0.0.1:8765',
    viewport: { width: 800, height: 420 },
    deviceScaleFactor: 1,
    contextOptions: { reducedMotion: 'reduce' }, // the card freezes its animations and skips fades -> still pictures
  },
  webServer: {
    command: 'npx http-server . -p 8765 -c-1 -s',
    url: 'http://127.0.0.1:8765/demo/index.html',
    reuseExistingServer: !process.env.CI,
  },
});
