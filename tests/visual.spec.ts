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

test('a tap only toggles harmless things; a lock or a garage door opens its dialog instead', async ({ page }) => {
  await page.goto('/demo/index.html?scene=05_autumn_day_partly_cloudy');
  await page.locator('body[data-ready="1"]').waitFor();
  const result = await page.evaluate(async () => {
    const calls: string[] = [];
    const el = document.createElement('living-house-card') as HTMLElement & { setConfig(c: unknown): void; hass: unknown; updateComplete: Promise<unknown> };
    el.setConfig({
      weather: 'weather.home', labels: false,
      rooms: [{ window: 'front', light: 'lock.front_door', name: 'Lock' }, { window: 'gable', light: 'light.loft', name: 'Loft' }],
      tap: { street_lamp: 'cover.garage_door', mailbox: 'switch.porch' }, calendar: 'calendar.family',
    });
    el.hass = {
      states: { 'weather.home': { state: 'sunny', attributes: {} } }, config: { latitude: 59.33, longitude: 18.07 },
      callService: (d: string, s: string, data: { entity_id: string }) => calls.push(`${d}.${s} ${data.entity_id}`),
    };
    el.addEventListener('hass-more-info', (e) => calls.push(`more-info ${(e as CustomEvent).detail.entityId}`));
    document.body.append(el);
    await el.updateComplete;
    const hits = Array.from(el.shadowRoot!.querySelectorAll<SVGGElement>('g.hit'));
    const press = (label: string): void => {
      hits.find((h) => h.getAttribute('aria-label')?.startsWith(label))!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    };
    press('Lock'); press('Loft'); press('Street lamp'); press('Mailbox');
    return calls;
  });
  expect(result).toEqual(['more-info lock.front_door', 'homeassistant.toggle light.loft', 'more-info cover.garage_door', 'homeassistant.toggle switch.porch']);
});
