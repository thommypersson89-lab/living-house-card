// Test scenes: made-up Home Assistant states, each with its own clock. The card works out the light phase,
// clouds, rain, clothes, holidays and so on by itself, so the tests cover that logic as well as the drawing.
import type { LivingHouseConfig } from '../src/config';
import type { HassEntity } from '../src/derive';

type States = Record<string, HassEntity>;
export interface TestScene {
  states: States;
  now: Date;
  config?: Partial<LivingHouseConfig>;
}

/** The configuration every test scene is rendered with. */
export const TEST_CONFIG: LivingHouseConfig = {
  type: 'custom:living-house-card',
  weather: 'weather.home',
  house: 'villa',
  country: 'se',
  power: 'sensor.power',
  minecraft: 'sensor.minecraft_players',
  birthdays: 'calendar.birthdays',
  calendar: 'calendar.family',
  indoor: { temperature: 'sensor.indoor_temperature', humidity: 'sensor.indoor_humidity' },
  people: [
    { name: 'Alex', entity: 'person.alex' },
    { name: 'Sam', entity: 'person.sam', porch_light: 'device_tracker.sam_phone' },
  ],
  rooms: [
    { window: 'front', name: 'Downstairs', light: 'light.downstairs' },
    { window: 'side_left', name: 'Living room', light: 'light.living_room', music: ['media_player.living_room'], tv: 'media_player.living_room' },
    { window: 'side_right', name: 'Bedroom', light: 'light.bedroom', tv: 'media_player.bedroom_tv' },
    { window: 'gable', name: 'Loft', light: 'light.loft' },
  ],
  washer: { entity: 'sensor.washer', running: 'running', laundry_left: 'input_boolean.laundry_left', window: 'side_right' },
  tap: { street_lamp: 'light.garden', mailbox: '/calendar' },
  helpers: {
    season: 'sensor.season', moon_phase: 'sensor.moon_phase', moon_position: 'sensor.moon_position', rain_now: 'sensor.rain_now',
    rain_soon: 'sensor.rain_soon', rained_recently: 'binary_sensor.rained_recently', snow_on_ground: 'binary_sensor.snow_on_ground',
    aurora_visible: 'binary_sensor.aurora_visible',
  },
};

interface Opts {
  elev?: number; az?: number; rising?: boolean; season?: string; snow?: boolean; w?: string; cov?: number; wind?: number; temp?: number;
  front?: string; living?: string; bedroom?: string; loft?: string; home?: string[]; moon?: string; moonEl?: number; moonAz?: number;
  mm?: number; power?: number; now?: Date; extra?: Record<string, string>;
}

/** A lamp from a short form: "warm_bright", "orange_bright", "warm_dim" or "off". */
function lamp(v: string): HassEntity {
  if (v === 'off') return { state: 'off', attributes: {} };
  const [c, n] = v.split('_');
  const brightness = n === 'dim' ? 60 : 230;
  const kelvin: Record<string, number> = { warm: 2700, neutral: 3500, cool: 5000 };
  const hue: Record<string, number> = { red: 5, orange: 28, yellow: 55, green: 120, blue: 220, purple: 270, pink: 320 };
  if (c in kelvin) return { state: 'on', attributes: { brightness, color_mode: 'color_temp', color_temp_kelvin: kelvin[c] } };
  return { state: 'on', attributes: { brightness, color_mode: 'hs', hs_color: [hue[c] ?? 30, 85] } };
}

/** Room wiring for each house model's windows (the test entities stay the same). */
export function houseConfig(house: string): Partial<LivingHouseConfig> {
  if (house === 'ranch') {
    return { house, rooms: [
      { window: 'front', name: 'Living room', light: 'light.downstairs' },
      { window: 'front_right', name: 'Kitchen', light: 'light.living_room', music: ['media_player.living_room'], tv: 'media_player.living_room' },
      { window: 'side', name: 'Bedroom', light: 'light.bedroom', tv: 'media_player.bedroom_tv' },
    ], washer: { ...TEST_CONFIG.washer!, window: 'side' } };
  }
  if (house === 'townhouse') {
    return { house, rooms: [
      { window: 'front', name: 'Kitchen', light: 'light.downstairs' },
      { window: 'upstairs', name: 'Living room', light: 'light.living_room', music: ['media_player.living_room'], tv: 'media_player.living_room' },
      { window: 'attic', name: 'Bedroom', light: 'light.bedroom', tv: 'media_player.bedroom_tv' },
    ], washer: { ...TEST_CONFIG.washer!, window: 'front' } };
  }
  return { house };
}

const on = (scene: TestScene, config: Partial<LivingHouseConfig>): TestScene => ({ ...scene, config });

/** A plain Wednesday in October; scenes that need a holiday or a time of night set their own clock. */
export const TEST_NOW = new Date(2026, 9, 14, 12, 0, 0);

export function make(o: Opts = {}): TestScene {
  const { elev = 30, az = 180, rising = true, season = 'autumn', snow = false, w = 'partlycloudy', cov = 40, wind = 4, temp = 11,
    front = 'off', living = 'off', bedroom = 'off', loft = 'off', home = ['alex'], moon = 'waxing_gibbous', moonEl = -10, moonAz = 180,
    mm = 0, power = 300, now = TEST_NOW, extra = {} } = o;
  const s = (state: string, attributes: Record<string, unknown> = {}): HassEntity => ({ state, attributes });
  const states: States = {
    'sun.sun': s(elev > 0 ? 'above_horizon' : 'below_horizon', { elevation: elev, azimuth: az, rising }),
    'weather.home': s(w, { cloud_coverage: cov, temperature: temp, temperature_unit: '°C', wind_speed: wind, wind_speed_unit: 'm/s', wind_bearing: 270 }),
    'sensor.season': s(season),
    'binary_sensor.snow_on_ground': s(snow ? 'on' : 'off'),
    'binary_sensor.rained_recently': s('off'),
    'binary_sensor.aurora_visible': s('off'),
    'sensor.indoor_temperature': s('21.8', { unit_of_measurement: '°C' }),
    'sensor.indoor_humidity': s('41', { unit_of_measurement: '%' }),
    'sensor.moon_phase': s(moon),
    'sensor.moon_position': s(String(moonEl), { azimuth: moonAz }),
    'sensor.rain_now': s(String(mm)),
    'sensor.rain_soon': s('no'),
    'sensor.power': s(String(power), { unit_of_measurement: 'W' }),
    'sensor.minecraft_players': s('0'),
    'light.downstairs': lamp(front),
    'light.living_room': lamp(living),
    'light.bedroom': lamp(bedroom),
    'light.loft': lamp(loft),
    'person.alex': s(home.includes('alex') ? 'home' : 'not_home'),
    'person.sam': s(home.includes('sam') ? 'home' : 'not_home'),
    'device_tracker.sam_phone': s(home.includes('sam') ? 'home' : 'not_home'),
    'calendar.family': s('off'),
    'calendar.birthdays': s('off'),
  };
  for (const [k, v] of Object.entries(extra)) states[k] = { state: v, attributes: states[k]?.attributes ?? {} };
  return { states, now };
}

const at = (m: number, d: number, h: number, min = 0): Date => new Date(2026, m - 1, d, h, min);

export const SCENES: Record<string, TestScene> = {
  // a clear autumn day, from night to dusk
  '01_autumn_clear_night': make({ elev: -30, w: 'clear-night', cov: 5, moonEl: 35, moonAz: 200, front: 'warm_bright', living: 'warm_bright' }),
  '02_autumn_blue_hour': make({ elev: -8, w: 'partlycloudy', cov: 30, front: 'warm_dim' }),
  '03_autumn_dawn': make({ elev: 0.5, az: 105, w: 'partlycloudy', cov: 30 }),
  '04_autumn_golden_morning': make({ elev: 6, az: 115, w: 'sunny', cov: 10 }),
  '05_autumn_day_partly_cloudy': make({ elev: 20, az: 160, w: 'partlycloudy', cov: 40 }),
  '06_autumn_golden_evening': make({ elev: 5, az: 245, rising: false, w: 'sunny', cov: 10 }),
  '07_autumn_dusk': make({ elev: -1, az: 255, rising: false, w: 'partlycloudy', cov: 30, front: 'warm_bright' }),
  // the same, overcast (the most common)
  '08_overcast_golden_morning': make({ elev: 6, az: 115, w: 'cloudy', cov: 100 }),
  '09_overcast_day': make({ elev: 20, az: 180, w: 'cloudy', cov: 100 }),
  '10_overcast_night': make({ elev: -30, w: 'cloudy', cov: 100, front: 'warm_bright' }),
  // seasons
  '11_spring_day': make({ season: 'spring', elev: 35, az: 170, w: 'partlycloudy', cov: 30, temp: 14 }),
  '12_summer_midday_hot': make({ season: 'summer', elev: 56, az: 180, w: 'sunny', cov: 5, temp: 27.5, home: ['alex', 'sam'] }),
  '13_summer_night': make({ season: 'summer', elev: -14, w: 'clear-night', cov: 0, temp: 16, moon: 'full_moon', moonEl: 15, moonAz: 150, living: 'warm_bright',
    extra: { 'media_player.living_room': 'playing' } }),
  '14_winter_bare_day': make({ season: 'winter', elev: 10, az: 190, w: 'partlycloudy', cov: 40, temp: 2 }),
  '15_winter_snow_day': make({ season: 'winter', snow: true, elev: 8, az: 180, w: 'snowy', cov: 100, temp: -2, home: ['alex', 'sam'] }),
  '16_winter_snow_night': make({ season: 'winter', snow: true, elev: -30, w: 'clear-night', cov: 0, temp: -6, moon: 'waxing_crescent', moonEl: 20, moonAz: 240, front: 'warm_bright' }),
  // weather
  '17_rain_day': make({ w: 'rainy', cov: 100, mm: 1.2, elev: 15, wind: 6, home: ['alex', 'sam'], extra: { 'binary_sensor.rained_recently': 'on' } }),
  '18_storm': make({ w: 'lightning-rainy', cov: 100, mm: 6, elev: 12, wind: 15, power: 2800 }),
  '19_fog': make({ w: 'fog', cov: 100, elev: 5, az: 120 }),
  '20_rainbow': make({ w: 'partlycloudy', cov: 40, elev: 15, az: 230, rising: false, extra: { 'binary_sensor.rained_recently': 'on' } }),
  // home/away and night
  '21_away_frozen': make({ home: [], elev: 20, w: 'partlycloudy', cov: 40 }),
  '22_night_3am_rain': make({ elev: -40, w: 'rainy', cov: 100, mm: 0.8, home: ['alex'], now: at(10, 14, 3) }),
  // holidays and specials
  '23_christmas_eve': make({ season: 'winter', elev: -20, w: 'cloudy', cov: 100, temp: 1, front: 'warm_bright', now: at(12, 24, 19) }),
  '24_midsummer': make({ season: 'summer', elev: 40, az: 200, w: 'sunny', cov: 10, temp: 21, home: ['alex', 'sam'], now: at(6, 20, 13) }),
  '25_halloween_night': make({ elev: -25, w: 'partlycloudy', cov: 30, temp: 8, front: 'orange_bright', moon: 'full_moon', moonEl: 30, moonAz: 170, now: at(10, 28, 21) }),
  '26_friday_rain_soon_minecraft': make({ elev: 4, az: 250, rising: false, w: 'partlycloudy', cov: 50, front: 'warm_bright', now: at(10, 16, 18),
    extra: { 'sensor.rain_soon': '40', 'sensor.minecraft_players': '3', 'calendar.family': 'on', 'sensor.washer': 'running', 'input_boolean.laundry_left': 'on' } }),
  '27_aurora_meteors': make({ season: 'winter', elev: -35, w: 'clear-night', cov: 0, temp: -3, now: at(8, 12, 22),
    extra: { 'binary_sensor.aurora_visible': 'on' } }),
  '28_night_silhouettes': make({ elev: -35, w: 'cloudy', cov: 100, front: 'warm_bright', home: ['alex', 'sam'], now: at(10, 14, 3) }),
  // the other house models
  '29_ranch_autumn_day': on(make({ elev: 20, az: 160, w: 'partlycloudy', cov: 40, extra: { 'calendar.family': 'on' } }), houseConfig('ranch')),
  '30_ranch_snow_night': on(make({ season: 'winter', snow: true, elev: -30, w: 'clear-night', cov: 0, temp: -6, moon: 'waxing_crescent', moonEl: 20, moonAz: 240,
    front: 'warm_bright', bedroom: 'blue_bright', power: 1800 }), houseConfig('ranch')),
  '31_ranch_rain_washer': on(make({ w: 'rainy', cov: 100, mm: 1.2, elev: 15, wind: 6, home: ['alex', 'sam'], living: 'warm_dim',
    extra: { 'sensor.washer': 'running', 'input_boolean.laundry_left': 'on' } }), houseConfig('ranch')),
  '32_townhouse_summer_day': on(make({ season: 'summer', elev: 56, az: 180, w: 'sunny', cov: 5, temp: 24, home: ['alex', 'sam'] }), houseConfig('townhouse')),
  '33_townhouse_evening_music': on(make({ elev: -8, w: 'partlycloudy', cov: 30, front: 'warm_bright', living: 'purple_bright', loft: 'warm_dim',
    extra: { 'media_player.living_room': 'playing' } }), houseConfig('townhouse')),
  '34_townhouse_night_silhouettes': on(make({ elev: -35, w: 'cloudy', cov: 100, living: 'warm_bright', home: ['alex', 'sam'], now: at(10, 14, 3) }), houseConfig('townhouse')),
  // US holidays
  '35_us_fourth_of_july_day': on(make({ season: 'summer', elev: 50, az: 200, w: 'sunny', cov: 10, temp: 29, home: ['alex', 'sam'], now: at(7, 4, 14) }), { ...houseConfig('ranch'), country: 'us' }),
  '36_us_fourth_of_july_night': on(make({ season: 'summer', elev: -14, w: 'clear-night', cov: 0, temp: 22, front: 'warm_bright', now: at(7, 4, 22) }), { ...houseConfig('ranch'), country: 'us' }),
  '37_us_thanksgiving': on(make({ elev: 15, az: 200, w: 'cloudy', cov: 80, temp: 6, home: ['alex', 'sam'], power: 1600, now: at(11, 26, 14) }), { ...houseConfig('ranch'), country: 'us' }),
  '38_us_christmas_morning': on(make({ season: 'winter', snow: true, elev: 8, az: 150, w: 'partlycloudy', cov: 30, temp: -4, home: ['alex', 'sam'], now: at(12, 25, 10) }), { ...houseConfig('ranch'), country: 'us' }),
  '39_us_st_patricks': on(make({ season: 'spring', elev: 30, az: 180, w: 'partlycloudy', cov: 40, temp: 9, now: at(3, 17, 12) }), { ...houseConfig('townhouse'), country: 'us' }),
  '40_us_halloween_townhouse': on(make({ elev: -25, w: 'partlycloudy', cov: 30, temp: 8, front: 'orange_bright', living: 'purple_bright', moon: 'full_moon', moonEl: 30, moonAz: 200, now: at(10, 31, 20) }),
    { ...houseConfig('townhouse'), country: 'us' }),
};
