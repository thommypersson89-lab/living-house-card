// Records time-lapse frames from the demo page's time machine (for docs/timelapse.gif).
// Usage: npm run build && npm run serve, then: node scripts/record-frames.mjs <out-dir>
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const out = process.argv[2] ?? 'frames';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, reducedMotion: 'reduce' });
await page.goto('http://127.0.0.1:8765/demo/index.html');
const card = page.locator('#machine living-house-card');
await card.waitFor();

// an autumn day from before dawn to late evening, with a shower in the afternoon
const steps = [];
for (let m = 5 * 60; m <= 23 * 60; m += 20) steps.push(m);
let i = 0;
for (const minute of steps) {
  const weather = minute >= 14 * 60 && minute < 16 * 60 ? 'rainy' : minute >= 20 * 60 ? 'sunny' : 'partlycloudy';
  await page.locator('#day').fill('283');
  await page.locator('#weather').selectOption(weather);
  await page.locator('#minute').fill(String(minute));
  await page.waitForTimeout(60);
  await card.screenshot({ path: `${out}/${String(i++).padStart(3, '0')}.png` });
}
await browser.close();
console.log(`${i} frames in ${out}`);
