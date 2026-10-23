// The logic without a browser: holiday rules, light phases, lamp colours, sun and moon, and deriving scenes.
import { expect, test } from '@playwright/test';
import { ageToPhase, moonAge, seasonOf, sunPosition } from '../src/astro';
import { derive, lampOf, lightPhase } from '../src/derive';
import { allSaints, easter, fathersDaySE, holidaysAt, midsummerEve, mothersDaySE } from '../src/holidays';
import { SCENES, TEST_CONFIG } from './scenes';

const iso = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('movable holidays', () => {
  expect(iso(easter(2025))).toBe('2025-04-20');
  expect(iso(easter(2026))).toBe('2026-04-05');
  expect(iso(midsummerEve(2026))).toBe('2026-06-19');
  expect(iso(allSaints(2026))).toBe('2026-10-31');
  expect(iso(mothersDaySE(2026))).toBe('2026-05-31');
  expect(iso(fathersDaySE(2026))).toBe('2026-11-08');
});

test("today's holiday and holiday periods (Sweden)", () => {
  expect(holidaysAt(new Date(2026, 11, 24, 18), false).today).toBe('christmas_eve');
  expect(holidaysAt(new Date(2026, 1, 17, 12), true).today).toBe('shrove_tuesday'); // 47 days before Easter
  expect(holidaysAt(new Date(2026, 3, 30, 16), true).today).toBe('none'); // Walpurgis starts at 17
  expect(holidaysAt(new Date(2026, 3, 30, 20), false).today).toBe('walpurgis');
  expect(holidaysAt(new Date(2026, 9, 28, 20), false).halloween).toBe(true);
  expect(holidaysAt(new Date(2026, 10, 29, 20), false).advent).toBe(true); // first Sunday of Advent 2026: 29 Nov
  expect(holidaysAt(new Date(2026, 10, 28, 20), false).advent).toBe(false);
  expect(holidaysAt(new Date(2026, 5, 6, 12), true).flagDay).toBe(true);
  expect(holidaysAt(new Date(2026, 5, 6, 12), false).flagDay).toBe(false); // the flag comes down at sunset
  expect(holidaysAt(new Date(2026, 11, 21, 12), true, 'se', ['12-21']).today).toBe('name_day');
  expect(holidaysAt(new Date(2026, 11, 24, 18), false, 'none').today).toBe('none');
});

test('light phases', () => {
  expect(lightPhase(-30, false, false)).toBe('night');
  expect(lightPhase(-8, true, false)).toBe('blue_hour_morning');
  expect(lightPhase(-8, true, true)).toBe('night');
  expect(lightPhase(0.5, true, false)).toBe('dawn');
  expect(lightPhase(-1, false, true)).toBe('grey_dusk');
  expect(lightPhase(6, false, false)).toBe('golden_evening');
  expect(lightPhase(40, true, false)).toBe('midday');
  expect(lightPhase(40, true, true)).toBe('day');
});

test('window colours', () => {
  expect(lampOf({ state: 'off', attributes: {} })).toBeNull();
  expect(lampOf({ state: 'on', attributes: { brightness: 200, color_mode: 'color_temp', color_temp_kelvin: 2700 } })).toEqual({ color: 'warm', strong: true });
  expect(lampOf({ state: 'on', attributes: { brightness: 40, color_mode: 'hs', hs_color: [220, 90] } })).toEqual({ color: 'blue', strong: false });
  expect(lampOf({ state: 'on', attributes: { brightness: 255, color_mode: 'hs', hs_color: [220, 10], color_temp_kelvin: 4500 } })).toEqual({ color: 'cool', strong: true });
});

test('sun, moon and seasons', () => {
  // southern Sweden at 13:10 local time on midsummer day: the sun high in the south
  const s = sunPosition(new Date(Date.UTC(2026, 5, 21, 11, 10)), 55.6, 13.0);
  expect(s.elevation).toBeGreaterThan(55);
  expect(s.elevation).toBeLessThan(59);
  expect(Math.abs(s.azimuth - 180)).toBeLessThan(8);
  expect(ageToPhase(moonAge(new Date(Date.UTC(2026, 0, 3, 10))))).toBe('full_moon'); // full moon 3 Jan 2026
  expect(seasonOf(new Date(2026, 6, 1), 55)).toBe('summer');
  expect(seasonOf(new Date(2026, 6, 1), -33)).toBe('winter');
});

test('units are converted to °C and m/s', () => {
  const sc = derive({ states: { 'weather.home': { state: 'sunny', attributes: { temperature: 86, temperature_unit: '°F', wind_speed: 22.37, wind_speed_unit: 'mph' } } } }, TEST_CONFIG);
  expect(sc.temp).toBeCloseTo(30, 0);
  expect(sc.wind).toBeCloseTo(10, 0);
  expect(sc.clothes).toBe('normal'); // no sun.sun: treated as night
});

test('scenes are derived as expected', () => {
  const sc = (name: string) => derive({ states: SCENES[name].states }, TEST_CONFIG, { now: SCENES[name].now });
  expect(sc('02_autumn_blue_hour').light).toBe('blue_hour_morning');
  expect(sc('09_overcast_day').clouds).toBe(5);
  expect(sc('15_winter_snow_day').look).toBe('winter');
  expect(sc('14_winter_bare_day').look).toBe('winterbar');
  expect(sc('17_rain_day').rain).toBe('light');
  expect(sc('17_rain_day').clothes).toBe('rain');
  expect(sc('18_storm').rain).toBe('heavy');
  expect(sc('18_storm').smoke).toBe(3);
  expect(sc('12_summer_midday_hot').clothes).toBe('warm');
  expect(sc('21_away_frozen').anim).toBe(false);
  expect(sc('05_autumn_day_partly_cloudy').anim).toBe(true);
  expect(sc('26_friday_rain_soon_minecraft').minecraft).toBe(3);
  expect(sc('26_friday_rain_soon_minecraft').fridayNight).toBe(true);
  expect(sc('23_christmas_eve').holiday).toBe('christmas_eve');
  expect(sc('28_night_silhouettes').nightDim).toBe(true);
  expect(sc('13_summer_night').music).toEqual(['side_left']);
  expect(sc('13_summer_night').tv).toEqual(['side_left']);
});
