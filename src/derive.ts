// From Home Assistant state to a scene: light phase, clouds, rain, smoke, clothes, holidays and so on.
import { ageToPhase, moonAge, moonPosition, phaseToAge, seasonOf } from './astro';
import { HelperKey, LivingHouseConfig } from './config';
import { Clothes, LOOKS, PersonLook } from './draw/home';
import { Country, holidaysAt } from './holidays';
import { Look } from './model/types';

export interface HassEntity {
  entity_id?: string;
  state: string;
  attributes: Record<string, any>;
}
export interface Hass {
  states: Record<string, HassEntity>;
  config?: { latitude?: number; longitude?: number; unit_system?: { temperature?: string; wind_speed?: string } };
  language?: string;
  callService?: (domain: string, service: string, data?: Record<string, unknown>) => unknown;
  formatEntityState?: (e: HassEntity) => string;
}

export interface Lamp {
  color: string; // a name in LAMP_COLORS (warm, red …)
  strong: boolean;
}

export interface PersonState {
  name: string;
  index: number;
  entity: string;
  x: number;
  home: boolean;
  look: PersonLook;
}

export interface Scene {
  now: Date;
  night: boolean;
  elev: number;
  az: number;
  rising: boolean;
  weather: string;
  cover: number;
  temp: number; // °C
  wind: number; // m/s
  wdir: 1 | -1; // where the wind blows in the picture: +1 right, -1 left
  anim: boolean; // false = power saving / reduced motion: everything stands still
  light: string; // light phase
  clouds: number; // 0–5
  darkClouds: boolean;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  look: Look;
  sway: 'calm' | 'moderate' | 'strong' | 'still';
  rain: string; // none, drizzle, light, moderate, heavy
  smoke: number; // 0–3
  clothes: Clothes;
  glint: 'none' | 'side' | 'front' | 'both';
  moon: { age: number; az: number; el: number } | null;
  windows: Record<string, Lamp>; // lit windows by window id
  tv: string[]; // window ids with a TV on
  music: string[]; // spots with audible music: door, roof, window ids
  washer: boolean;
  washerWindow: string;
  laundry: boolean;
  people: PersonState[];
  porchLight: boolean;
  nightDim: boolean;
  country: 'se' | 'us' | 'none';
  flagStyle: 'se' | 'us';
  holiday: string;
  advent: boolean;
  christmas: boolean;
  halloween: boolean;
  easter: boolean;
  midsummer: boolean;
  flagDay: boolean;
  newYear: boolean;
  birthday: boolean;
  calendarToday: boolean;
  aurora: boolean;
  meteors: boolean;
  fridayNight: boolean;
  rainedRecently: boolean;
  snowOnGround: boolean;
  rainSoon: string; // no, soon or minutes
  minecraft: number;
}

export const DARK = ['rainy', 'pouring', 'snowy-rainy', 'hail', 'lightning', 'lightning-rainy', 'exceptional'];
const OVERCAST = ['cloudy', 'fog', 'rainy', 'pouring', 'snowy', 'snowy-rainy', 'hail', 'lightning', 'lightning-rainy', 'exceptional'];
const RAIN_WEATHER = ['rainy', 'pouring', 'lightning-rainy', 'snowy-rainy', 'hail', 'exceptional'];
const RAIN_CLOTHES = ['rainy', 'pouring', 'lightning-rainy', 'snowy-rainy', 'hail'];
export const DARK_PHASES = ['night', 'blue_hour_morning', 'blue_hour_evening', 'dawn', 'dusk', 'grey_dawn', 'grey_dusk'];
const PLAYING = ['playing', 'buffering'];
const TV_ON = ['on', 'playing', 'paused'];
// weather states some integrations use without a cloud-cover attribute
const COVER_GUESS: Record<string, number> = { sunny: 5, 'clear-night': 5, partlycloudy: 40, windy: 30, 'windy-variant': 70, cloudy: 100, fog: 100 };

const num = (v: unknown, fb: number): number => {
  const f = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(f) ? f : fb;
};

/** A window's light: the lamp's colour if it is coloured, otherwise its white temperature; dim or bright by brightness. */
export function lampOf(e: HassEntity | undefined): Lamp | null {
  if (!e || e.state !== 'on') return null;
  const a = e.attributes ?? {};
  const strong = num(a.brightness, 255) >= 90;
  const hs = a.hs_color as number[] | undefined;
  let color: string;
  if (['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(a.color_mode) && hs && hs[1] > 35) {
    const h = hs[0];
    color = h < 15 || h >= 345 ? 'red' : h < 40 ? 'orange' : h < 70 ? 'yellow' : h < 165 ? 'green' : h < 255 ? 'blue' : h < 290 ? 'purple' : 'pink';
  } else {
    const k = num(a.color_temp_kelvin, 2700);
    color = k < 3000 ? 'warm' : k < 4000 ? 'neutral' : 'cool';
  }
  return { color, strong };
}

/** The light phase: coloured light (blue hour, golden hour, pink dawn) only when the sky is fairly clear. */
export function lightPhase(e: number, rising: boolean, overcast: boolean): string {
  const r = rising ? 'morning' : 'evening';
  if (e < -12) return 'night';
  if (e < -4) return overcast ? 'night' : `blue_hour_${r}`;
  if (e < 2) return (overcast ? 'grey_' : '') + (rising ? 'dawn' : 'dusk');
  if (e < 10) return overcast ? 'day' : `golden_${r}`;
  if (e < 35 || overcast) return 'day';
  return 'midday';
}

export interface DeriveOptions {
  now?: Date;
  reducedMotion?: boolean;
  /** the card's own memory of the last rain/snow, when there are no helper sensors */
  memory?: { lastRain?: number; lastSnow?: number };
}

const toCelsius = (v: number, unit?: string): number => (unit && /F/.test(unit) ? ((v - 32) * 5) / 9 : v);
function toMs(v: number, unit?: string): number {
  switch (unit) {
    case 'km/h': return v / 3.6;
    case 'mph': return v * 0.44704;
    case 'kn': return v * 0.514444;
    case 'ft/s': return v * 0.3048;
    default: return v;
  }
}

export function derive(hass: Hass, cfg: LivingHouseConfig, opt: DeriveOptions = {}): Scene {
  const S = hass.states;
  const now = opt.now ?? new Date();
  const helper = (k: HelperKey): HassEntity | undefined => {
    const id = cfg.helpers?.[k];
    return id ? S[id] : undefined;
  };
  const on = (id?: string): boolean => !!id && S[id]?.state === 'on';
  const helperOn = (k: HelperKey, fallback: boolean): boolean => {
    const h = helper(k);
    return h ? h.state === 'on' : fallback;
  };

  const sun = S['sun.sun'];
  const lat = hass.config?.latitude ?? 55.6, lon = hass.config?.longitude ?? 13.0;
  const elev = num(sun?.attributes.elevation, -90);
  const az = num(sun?.attributes.azimuth, 180);
  const rising = !!sun?.attributes.rising;
  const night = sun ? sun.state !== 'above_horizon' : elev <= 0;

  const wx = S[cfg.weather];
  let weather = wx?.state ?? 'cloudy';
  if (['unknown', 'unavailable'].includes(weather)) weather = 'cloudy';
  const wa = wx?.attributes ?? {};
  const cover = num(wa.cloud_coverage, COVER_GUESS[weather] ?? 50);
  const temp = toCelsius(num(wa.temperature, 10), wa.temperature_unit);
  const wind = toMs(num(wa.wind_speed, 0), wa.wind_speed_unit);
  const b = num(wa.wind_bearing, 270);
  const wdir: 1 | -1 = -Math.sin((((b + 180) % 360) * Math.PI) / 180) < 0 ? -1 : 1;

  // colours from the config are written straight into the SVG, so only hex colours are let through
  const hex = (c?: string): string | undefined => (typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : undefined);
  const people: PersonState[] = (cfg.people ?? []).map((p, index) => {
    const base = LOOKS[index % LOOKS.length];
    const l = p.look ?? {};
    const look: PersonLook = {
      ...base,
      jacket: hex(l.jacket) ?? base.jacket, hair: hex(l.hair) ?? base.hair, hat: hex(l.hat) ?? base.hat, umbrella: hex(l.umbrella) ?? base.umbrella,
      longHair: l.long_hair ?? base.longHair,
    };
    return { name: p.name, index, entity: p.entity, x: 0, home: S[p.entity]?.state === 'home', look };
  });
  // animate while one of the chosen people is home (default: the first person) and nobody asked for less motion
  const animWho = cfg.motion?.when_home ?? people.slice(0, 1).map((p) => p.entity);
  const someoneHome = animWho.length === 0 || animWho.some((id) => S[id]?.state === 'home');
  const anim = someoneHome && !on(cfg.motion?.reduce) && !opt.reducedMotion;

  const overcast = cover >= 60 || OVERCAST.includes(weather);
  const light = lightPhase(elev, rising, overcast);

  let clouds = Math.round(cover / 20);
  if (['cloudy', 'snowy', ...DARK].includes(weather)) clouds = Math.max(clouds, 4);
  if (weather === 'fog') clouds = Math.min(clouds, 1);

  const seasonState = helper('season')?.state;
  const season = (['spring', 'summer', 'autumn', 'winter'].includes(seasonState ?? '') ? seasonState : seasonOf(now, lat)) as Scene['season'];

  // weather memory: rained in the last two hours / snowed in the last day
  const mem = opt.memory ?? {};
  const t = now.getTime();
  if (RAIN_CLOTHES.includes(weather)) mem.lastRain = t;
  if (weather === 'snowy' || weather === 'snowy-rainy') mem.lastSnow = t;
  const rainedRecently = helperOn('rained_recently', mem.lastRain !== undefined && t - mem.lastRain < 2 * 3600e3);
  const snowOnGround = helperOn('snow_on_ground', mem.lastSnow !== undefined && t - mem.lastSnow < 24 * 3600e3);
  const look: Look = snowOnGround && temp < 3 ? 'winter' : season === 'winter' ? 'winterbar' : season;

  const sway = !anim ? 'still' : wind < 4 ? 'calm' : wind < 10 ? 'moderate' : 'strong';

  const mm = num(helper('rain_now')?.state, 0);
  const rw = RAIN_WEATHER.includes(weather);
  let rain: string;
  if (!rw && mm < 0.1) rain = 'none';
  else if (mm >= 5) rain = 'heavy';
  else if (mm >= 2) rain = 'moderate';
  else if (mm >= 0.5) rain = 'light';
  else if (mm >= 0.1) rain = rw ? 'light' : 'drizzle';
  else if (['pouring', 'lightning-rainy', 'exceptional'].includes(weather)) rain = 'heavy';
  else if (weather === 'hail') rain = 'moderate';
  else rain = 'light';

  const power = num(cfg.power ? S[cfg.power]?.state : undefined, 0) * (/kW/.test(S[cfg.power ?? '']?.attributes?.unit_of_measurement ?? '') ? 1000 : 1);
  let smoke = power > 2500 ? 3 : power > 1500 ? 2 : power > 800 ? 1 : 0;
  if (smoke === 0 && temp < 0) smoke = 1;

  const clothes: Clothes = RAIN_CLOTHES.includes(weather) ? 'rain' : temp < 5 ? 'cold' : temp > 22 && !night ? 'warm' : 'normal';

  let glint: Scene['glint'] = 'none';
  if (!night && ['sunny', 'partlycloudy', 'windy'].includes(weather)) glint = az >= 280 ? 'both' : az >= 200 ? 'side' : az <= 80 ? 'front' : 'none';

  // the moon: position calculated (or from a helper), phase from the date (a moon-phase sensor wins if it disagrees)
  let moon: Scene['moon'] = null;
  const mp = helper('moon_position');
  const pos = mp ? { elevation: num(mp.state, -90), azimuth: num(mp.attributes.azimuth, 180) } : moonPosition(now, lat, lon);
  const phaseState = helper('moon_phase')?.state;
  const sensorAge = phaseState ? phaseToAge(phaseState) : undefined;
  let age = moonAge(now);
  if (sensorAge !== undefined && ageToPhase(age) !== phaseState) age = sensorAge;
  if (pos.elevation >= -1) moon = { age, az: pos.azimuth, el: pos.elevation };

  // only show notes when the music can actually be heard: playing, not muted and volume above 0 %
  const audible = (id: string): boolean => {
    const e = S[id];
    if (!e || !PLAYING.includes(e.state)) return false;
    const a = e.attributes ?? {};
    if (a.is_volume_muted === true) return false;
    return typeof a.volume_level !== 'number' || a.volume_level > 0;
  };
  const everywhere = (cfg.music?.everywhere ?? []).some(audible);
  const windows: Record<string, Lamp> = {};
  const tv: string[] = [];
  const music: string[] = [];
  for (const r of cfg.rooms ?? []) {
    const l = lampOf(r.light ? S[r.light] : undefined);
    if (l && !windows[r.window]) windows[r.window] = l;
    if (r.tv && TV_ON.includes(S[r.tv]?.state)) tv.push(r.window);
    if ((everywhere || (r.music ?? []).some(audible)) && r.music?.length && !music.includes(r.window)) music.push(r.window);
  }
  for (const spot of ['door', 'roof'] as const) {
    const ids = cfg.music?.[spot] ?? [];
    if (ids.length && (everywhere || ids.some(audible))) music.push(spot);
  }

  const country: Country = cfg.country === 'us' || cfg.country === 'none' ? cfg.country : 'se';
  const hol = holidaysAt(now, !night, country, cfg.name_days ?? []);
  const nd = cfg.night_dim === false ? null : cfg.night_dim ?? { from: 23, to: 6 };
  const h = now.getHours();
  const nightDim = !!nd && (nd.from > nd.to ? h >= nd.from || h < nd.to : h >= nd.from && h < nd.to);
  const aurora = helperOn('aurora_visible', !!cfg.aurora && num(S[cfg.aurora]?.state, 0) >= 10 && night);

  const porchIds = (cfg.people ?? []).map((p) => p.porch_light ?? p.entity);
  return {
    now, night, elev, az, rising, weather, cover, temp, wind, wdir, anim, light, clouds, darkClouds: DARK.includes(weather),
    season, look, sway, rain, smoke, clothes, glint, moon, windows, tv, music,
    washer: !!cfg.washer?.entity && S[cfg.washer.entity]?.state === (cfg.washer.running ?? 'running'),
    washerWindow: cfg.washer?.window ?? '',
    laundry: on(cfg.washer?.laundry_left),
    people,
    porchLight: porchIds.some((id) => S[id]?.state === 'home') && DARK_PHASES.includes(light),
    nightDim,
    country,
    flagStyle: cfg.flag ?? (country === 'us' ? 'us' : 'se'),
    holiday: helper('holiday')?.state ?? hol.today,
    advent: hol.advent,
    christmas: hol.christmas,
    halloween: hol.halloween,
    easter: hol.easter,
    midsummer: hol.midsummer,
    flagDay: hol.flagDay,
    newYear: hol.newYear,
    birthday: on(cfg.birthdays),
    calendarToday: on(cfg.calendar),
    aurora,
    meteors: hol.meteors,
    fridayNight: hol.fridayNight,
    rainedRecently,
    snowOnGround,
    rainSoon: helper('rain_soon')?.state ?? 'no',
    minecraft: num(cfg.minecraft ? S[cfg.minecraft]?.state : undefined, 0),
  };
}
