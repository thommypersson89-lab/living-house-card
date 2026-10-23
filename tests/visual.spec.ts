// Visual regression tests: every test scene is rendered on the demo page and compared with a saved screenshot.
import { expect, test } from '@playwright/test';
import { SCENES } from './scenes';

for (const name of Object.keys(SCENES)) {
  test(`scene ${name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`/demo/index.html?scene=${name}`);
    await page.locator('body[data-ready="1"]').waitFor();
    const card = page.locator('living-house-card');
    // the labels are text (fonts differ between machines) and are masked; the scene itself is compared pixel by pixel
    await expect(card).toHaveScreenshot(`${name}.png`, { mask: [card.locator('.pill'), card.locator('.help')] });
    expect(errors).toEqual([]);
  });
}

test('the time machine draws and follows the sliders', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/demo/index.html');
  const machine = page.locator('#machine living-house-card');
  await expect(machine.locator('svg.layer[data-slot="base"]')).toHaveCount(1);
  // a winter night with snow
  await page.locator('#day').fill('15');
  await page.locator('#minute').fill('60');
  await page.locator('#weather').selectOption('snowy');
  await expect(machine.locator('svg.layer[data-slot="snow"]')).toHaveCount(1);
  await expect(machine.locator('svg.layer[data-slot="sun"]')).toHaveCount(0);
  // midday on a clear summer day: the sun is up
  await page.locator('#day').fill('180');
  await page.locator('#minute').fill('780');
  await page.locator('#weather').selectOption('sunny');
  await expect(machine.locator('svg.layer[data-slot="sun"]')).toHaveCount(1);
  await expect(page.locator('#gallery living-house-card')).toHaveCount(Object.keys(SCENES).length);
  expect(errors).toEqual([]);
});

test('the configurator writes YAML for the chosen house', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/demo/index.html');
  await page.locator('#house').selectOption('townhouse');
  await page.locator('#country').selectOption('us');
  await expect(page.locator('#yaml')).toContainText('house: townhouse');
  await expect(page.locator('#yaml')).toContainText('country: us');
  await expect(page.locator('#yaml')).toContainText('window: upstairs');
  await page.locator('#add_person').click();
  await expect(page.locator('#yaml')).toContainText('person.person_3');
  await page.locator('#c_roof').fill('#8a3324');
  await expect(page.locator('#yaml')).toContainText('roof: "#8a3324"');
  expect(errors).toEqual([]);
});
