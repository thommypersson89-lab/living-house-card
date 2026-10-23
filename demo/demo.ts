// Demo page: a time machine (day, year and weather) and a gallery of every test scene.
// ?scene=<name> shows a single test scene (used by the Playwright tests).
import '../src/living-house-card';
import type { LivingHouseCard } from '../src/living-house-card';
import { sunPosition } from '../src/astro';
import { EXAMPLE, LivingHouseConfig } from '../src/config';
import type { Hass, HassEntity } from '../src/derive';
import { SCENES, TEST_CONFIG } from '../tests/scenes';

const LAT = 55.6, LON = 13.0; // southern Sweden
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const s = (state: string, attributes: Record<string, unknown> = {}): HassEntity => ({ state, attributes });

function card(config: LivingHouseConfig, states: Record<string, HassEntity>, now: Date): LivingHouseCard {
  const el = document.createElement('living-house-card') as LivingHouseCard;
  el.setConfig(config);
  el.clock = () => now;
  el.hass = { states, config: { latitude: LAT, longitude: LON } };
  return el;
}

const params = new URLSearchParams(location.search);
const only = params.get('scene');
if (only !== null) {
  document.body.classList.add('single');
  const scene = SCENES[only];
  const root = $('single');
  if (!scene) root.textContent = `Unknown scene: ${only}`;
  else {
    const el = card({ ...TEST_CONFIG, labels: params.get('labels') !== '0' }, scene.states, scene.now);
    root.append(el);
    el.updateComplete.then(() => requestAnimationFrame(() => document.body.setAttribute('data-ready', '1')));
  }
} else {
  timeMachine();
  gallery();
}

// ---- the time machine ----
function timeMachine(): void {
  const year = new Date().getFullYear();
  const day = $<HTMLInputElement>('day'), minute = $<HTMLInputElement>('minute');
  const weather = $<HTMLSelectElement>('weather'), cover = $<HTMLInputElement>('cover'), temp = $<HTMLInputElement>('temp');
  const wind = $<HTMLInputElement>('wind'), power = $<HTMLInputElement>('power');
  const lamp = $<HTMLSelectElement>('lamp'), aurora = $<HTMLInputElement>('aurora'), out = $('when');
  const check = (id: string): boolean => $<HTMLInputElement>(id).checked;
  const now = new Date();
  day.value = String(Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 864e5));
  minute.value = String(now.getHours() * 60 + now.getMinutes());

  const el = document.createElement('living-house-card') as LivingHouseCard;
  el.setConfig({ ...EXAMPLE, aurora: 'sensor.aurora_chance' });
  $('machine').append(el);

  const simDate = (): Date => new Date(year, 0, 1 + Number(day.value), 0, Number(minute.value));
  const lampState = (lit: boolean): HassEntity => {
    if (!lit) return s('off');
    const v = lamp.value;
    if (v.startsWith('k')) return s('on', { brightness: 230, color_mode: 'color_temp', color_temp_kelvin: Number(v.slice(1)) });
    return s('on', { brightness: 230, color_mode: 'hs', hs_color: [Number(v), 85] });
  };

  const update = (): void => {
    const t = simDate();
    const sun = sunPosition(t, LAT, LON);
    const up = sun.elevation > -0.833;
    let w = weather.value;
    if (w === 'sunny' && !up) w = 'clear-night';
    const states: Record<string, HassEntity> = {
      'sun.sun': s(up ? 'above_horizon' : 'below_horizon', { elevation: +sun.elevation.toFixed(2), azimuth: +sun.azimuth.toFixed(2), rising: sun.rising }),
      'weather.home': s(w, { cloud_coverage: Number(cover.value), temperature: Number(temp.value), temperature_unit: '°C', wind_speed: Number(wind.value), wind_speed_unit: 'm/s', wind_bearing: Number($<HTMLSelectElement>('bearing').value) }),
      'sensor.power': s(power.value, { unit_of_measurement: 'W' }),
      'sensor.indoor_temperature': s('21.8', { unit_of_measurement: '°C' }),
      'sensor.indoor_humidity': s('41', { unit_of_measurement: '%' }),
      'person.alex': s(check('alex') ? 'home' : 'not_home'),
      'person.sam': s(check('sam') ? 'home' : 'not_home'),
      'device_tracker.sam_phone': s(check('sam') ? 'home' : 'not_home'),
      'light.downstairs': lampState(check('l_front')),
      'light.living_room': lampState(check('l_living')),
      'light.bedroom': lampState(check('l_bedroom')),
      'light.loft': lampState(check('l_loft')),
      'media_player.living_room_tv': s(check('tv') ? 'playing' : 'off'),
      'media_player.porch': s(check('music') ? 'playing' : 'idle', { volume_level: 0.4 }),
      'sensor.washer': s(check('washer') ? 'running' : 'idle'),
      'input_boolean.laundry_left': s(check('washer') ? 'on' : 'off'),
      'calendar.birthdays': s(check('birthday') ? 'on' : 'off'),
      'calendar.family': s(check('calendar') ? 'on' : 'off'),
      'sensor.minecraft_players': s($<HTMLInputElement>('mc').value),
      'sensor.aurora_chance': s(aurora.value),
    };
    el.clock = () => t;
    el.setConfig({ ...EXAMPLE, aurora: 'sensor.aurora_chance', house: $<HTMLSelectElement>('house').value, motion: check('still') ? { when_home: [] , reduce: 'input_boolean.still' } : undefined });
    states['input_boolean.still'] = s(check('still') ? 'on' : 'off');
    el.hass = { states, config: { latitude: LAT, longitude: LON } } as Hass;
    out.textContent = `${t.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, ${t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` +
      ` · sun ${sun.elevation.toFixed(1)}° · ${w}`;
  };
  document.querySelectorAll('#controls input, #controls select').forEach((i) => i.addEventListener('input', update));

  // play: a day in 24 s or a year in 60 s
  let playing: number | undefined;
  const play = $<HTMLButtonElement>('play');
  play.addEventListener('click', () => {
    if (playing) {
      cancelAnimationFrame(playing);
      playing = undefined;
      play.textContent = '▶ Play';
      return;
    }
    play.textContent = '⏸ Pause';
    let last = performance.now();
    const step = (t: number): void => {
      const dt = (t - last) / 1000;
      last = t;
      if ($<HTMLSelectElement>('speed').value === 'day') {
        let m = Number(minute.value) + dt * 60;
        if (m >= 1440) { m -= 1440; day.value = String((Number(day.value) + 1) % 365); }
        minute.value = String(Math.floor(m));
      } else day.value = String((Number(day.value) + dt * 6) % 365 | 0);
      update();
      playing = requestAnimationFrame(step);
    };
    playing = requestAnimationFrame(step);
  });
  $<HTMLButtonElement>('random').addEventListener('click', () => {
    const opts = Array.from(weather.options).map((o) => o.value);
    weather.value = opts[Math.floor(Math.random() * opts.length)];
    cover.value = String(Math.round(Math.random() * 100));
    update();
  });
  update();
}

// ---- a gallery of every test scene ----
function gallery(): void {
  const g = $('gallery');
  for (const [name, scene] of Object.entries(SCENES)) {
    const fig = document.createElement('figure');
    const cap = document.createElement('figcaption');
    const a = document.createElement('a');
    a.href = `?scene=${name}`;
    a.textContent = name.replace(/_/g, ' ');
    cap.append(a);
    fig.append(card(TEST_CONFIG, scene.states, scene.now), cap);
    g.append(fig);
  }
}
