// Demo page: a time machine (day, year and weather), a configurator that writes the YAML, and a gallery of every test scene.
// ?scene=<name> shows a single test scene (used by the Playwright tests).
import '../src/living-house-card';
import type { LivingHouseCard } from '../src/living-house-card';
import { sunPosition } from '../src/astro';
import { EXAMPLE, LivingHouseConfig } from '../src/config';
import { LOOKS } from '../src/draw/home';
import { MODELS, modelFor } from '../src/model';
import type { Hass, HassEntity } from '../src/derive';
import { SCENES, TEST_CONFIG, houseConfig } from '../tests/scenes';

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

// ---- the time machine and the configurator ----
interface PersonRow { name: string; entity: string; jacket: string; hair: string; longHair: boolean; home: boolean }

const PLACES: Record<string, [number, number]> = { se: [55.6, 13.0], us: [40.7, -74.0], none: [51.5, -0.1] };

/** A tiny YAML writer for the generated card configuration. */
function toYaml(v: unknown, indent = ''): string {
  const scalar = (x: unknown): string => {
    if (typeof x === 'string') return /^[\w.\/:-]+$/.test(x) && !/: /.test(x) && !/^(yes|no|on|off|true|false|null)$/i.test(x) ? x : JSON.stringify(x);
    return String(x);
  };
  if (Array.isArray(v)) {
    return v.map((item) => {
      if (item && typeof item === 'object') {
        const body = toYaml(item, indent + '  ').replace(new RegExp(`^${indent}  `), '');
        return `${indent}- ${body}`;
      }
      return `${indent}- ${scalar(item)}`;
    }).join('\n');
  }
  if (v && typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined).map(([k, x]) => {
      if (Array.isArray(x) && x.every((y) => typeof y !== 'object')) return `${indent}${k}: [${x.map(scalar).join(', ')}]`;
      if (x && typeof x === 'object') return `${indent}${k}:\n${toYaml(x, indent + '  ')}`;
      return `${indent}${k}: ${scalar(x)}`;
    }).join('\n');
  }
  return indent + scalar(v);
}

function timeMachine(): void {
  const year = new Date().getFullYear();
  const day = $<HTMLInputElement>('day'), minute = $<HTMLInputElement>('minute');
  const weather = $<HTMLSelectElement>('weather'), cover = $<HTMLInputElement>('cover'), temp = $<HTMLInputElement>('temp');
  const wind = $<HTMLInputElement>('wind'), power = $<HTMLInputElement>('power');
  const lamp = $<HTMLSelectElement>('lamp'), aurora = $<HTMLInputElement>('aurora'), out = $('when');
  const house = $<HTMLSelectElement>('house'), country = $<HTMLSelectElement>('country'), language = $<HTMLSelectElement>('language');
  const cWall = $<HTMLInputElement>('c_wall'), cRoof = $<HTMLInputElement>('c_roof'), cDoor = $<HTMLInputElement>('c_door');
  const check = (id: string): boolean => $<HTMLInputElement>(id).checked;
  const now = new Date();
  day.value = String(Math.floor((now.getTime() - new Date(year, 0, 1).getTime()) / 864e5));
  minute.value = String(now.getHours() * 60 + now.getMinutes());
  for (const m of Object.values(MODELS)) house.append(new Option(m.name, m.id));

  const people: PersonRow[] = [
    { name: 'Alex', entity: 'person.alex', jacket: LOOKS[0].jacket, hair: LOOKS[0].hair, longHair: false, home: true },
    { name: 'Sam', entity: 'person.sam', jacket: LOOKS[1].jacket, hair: LOOKS[1].hair, longHair: true, home: true },
  ];
  const windowLights: Record<string, { entity: string; on: boolean }> = {};

  const el = document.createElement('living-house-card') as LivingHouseCard;
  $('machine').append(el);

  const setColors = (): void => {
    const p = modelFor(house.value).palette;
    cWall.value = p.wall; cRoof.value = p.roof; cDoor.value = p.door;
  };

  const renderPeople = (): void => {
    const box = $('people');
    box.replaceChildren(...people.map((p, i) => {
      const row = document.createElement('div');
      row.className = 'person';
      row.innerHTML = `<input type="text" aria-label="Name" value="${p.name}"><input type="text" aria-label="Entity" value="${p.entity}" spellcheck="false">` +
        `<input type="color" aria-label="Jacket" value="${p.jacket}"><input type="color" aria-label="Hair" value="${p.hair}">` +
        `<label class="row" title="Long hair"><input type="checkbox" ${p.longHair ? 'checked' : ''}> long</label>` +
        `<label class="row" title="Home"><input type="checkbox" ${p.home ? 'checked' : ''}> home</label>`;
      const [name, entity, jacket, hair] = Array.from(row.querySelectorAll('input'));
      const [long, home] = Array.from(row.querySelectorAll<HTMLInputElement>('input[type=checkbox]'));
      const sync = (): void => {
        Object.assign(people[i], { name: name.value, entity: entity.value, jacket: jacket.value, hair: hair.value, longHair: long.checked, home: home.checked });
        update();
      };
      row.querySelectorAll('input').forEach((x) => x.addEventListener('input', sync));
      return row;
    }));
    $<HTMLButtonElement>('add_person').disabled = people.length >= 4;
  };

  const renderWindows = (): void => {
    const M = modelFor(house.value);
    $('windows').replaceChildren(...Object.keys(M.windows).map((id) => {
      windowLights[id] ??= { entity: `light.${id}`, on: id === 'front' };
      const w = windowLights[id];
      const row = document.createElement('div');
      row.className = 'window';
      row.innerHTML = `<span>${id.replace(/_/g, ' ')}</span><input type="text" aria-label="Light for ${id}" value="${w.entity}" spellcheck="false">` +
        `<label class="row"><input type="checkbox" ${w.on ? 'checked' : ''}> on</label>`;
      const [text, box] = Array.from(row.querySelectorAll('input'));
      const sync = (): void => { w.entity = text.value; w.on = box.checked; update(); };
      text.addEventListener('input', sync);
      box.addEventListener('input', sync);
      return row;
    }));
  };

  /** The configuration the form describes (what the YAML shows). */
  const formConfig = (): LivingHouseConfig => {
    const M = modelFor(house.value);
    const colors: LivingHouseConfig['colors'] = {};
    if (cWall.value !== M.palette.wall) colors.wall = cWall.value;
    if (cRoof.value !== M.palette.roof) colors.roof = cRoof.value;
    if (cDoor.value !== M.palette.door) colors.door = cDoor.value;
    return {
      type: 'custom:living-house-card',
      weather: $<HTMLInputElement>('weather_entity').value || 'weather.home',
      house: house.value,
      country: country.value as LivingHouseConfig['country'],
      language: language.value as LivingHouseConfig['language'],
      colors: Object.keys(colors).length ? colors : undefined,
      people: people.map((p, i) => {
        const base = LOOKS[i % LOOKS.length];
        const look: NonNullable<LivingHouseConfig['people']>[number]['look'] = {};
        if (p.jacket !== base.jacket) look.jacket = p.jacket;
        if (p.hair !== base.hair) look.hair = p.hair;
        if (p.longHair !== base.longHair) look.long_hair = p.longHair;
        return { name: p.name, entity: p.entity, look: Object.keys(look).length ? look : undefined };
      }),
      rooms: Object.keys(M.windows).map((id) => ({ window: id, light: windowLights[id]?.entity ?? `light.${id}` })),
    };
  };

  const simDate = (): Date => new Date(year, 0, 1 + Number(day.value), 0, Number(minute.value));
  const lampState = (lit: boolean): HassEntity => {
    if (!lit) return s('off');
    const v = lamp.value;
    if (v.startsWith('k')) return s('on', { brightness: 230, color_mode: 'color_temp', color_temp_kelvin: Number(v.slice(1)) });
    return s('on', { brightness: 230, color_mode: 'hs', hs_color: [Number(v), 85] });
  };

  function update(): void {
    const t = simDate();
    const [lat, lon] = PLACES[country.value] ?? PLACES.se;
    const sun = sunPosition(t, lat, lon);
    const up = sun.elevation > -0.833;
    let w = weather.value;
    if (w === 'sunny' && !up) w = 'clear-night';
    const fc = formConfig();
    const firstWindow = Object.keys(modelFor(house.value).windows)[1] ?? 'front';
    const config: LivingHouseConfig = {
      ...EXAMPLE, ...fc, weather: 'weather.sim', aurora: 'sensor.aurora_chance',
      rooms: fc.rooms!.map((r) => ({ ...r, tv: r.window === firstWindow ? 'media_player.tv' : undefined })),
      washer: { ...EXAMPLE.washer!, window: firstWindow },
      motion: check('still') ? { when_home: [], reduce: 'input_boolean.still' } : undefined,
    };
    const states: Record<string, HassEntity> = {
      'sun.sun': s(up ? 'above_horizon' : 'below_horizon', { elevation: +sun.elevation.toFixed(2), azimuth: +sun.azimuth.toFixed(2), rising: sun.rising }),
      'weather.sim': s(w, { cloud_coverage: Number(cover.value), temperature: Number(temp.value), temperature_unit: '°C', wind_speed: Number(wind.value), wind_speed_unit: 'm/s', wind_bearing: Number($<HTMLSelectElement>('bearing').value) }),
      'sensor.power': s(power.value, { unit_of_measurement: 'W' }),
      'sensor.indoor_temperature': s('21.8', { unit_of_measurement: '°C' }),
      'sensor.indoor_humidity': s('41', { unit_of_measurement: '%' }),
      'media_player.tv': s(check('tv') ? 'playing' : 'off'),
      'media_player.porch': s(check('music') ? 'playing' : 'idle', { volume_level: 0.4 }),
      'sensor.washer': s(check('washer') ? 'running' : 'idle'),
      'input_boolean.laundry_left': s(check('washer') ? 'on' : 'off'),
      'calendar.birthdays': s(check('birthday') ? 'on' : 'off'),
      'calendar.family': s(check('calendar') ? 'on' : 'off'),
      'sensor.minecraft_players': s($<HTMLInputElement>('mc').value),
      'sensor.aurora_chance': s(aurora.value),
      'input_boolean.still': s(check('still') ? 'on' : 'off'),
    };
    for (const p of people) states[p.entity] = s(p.home ? 'home' : 'not_home');
    for (const r of fc.rooms ?? []) if (r.light) states[r.light] = lampState(!!windowLights[r.window]?.on);
    el.clock = () => t;
    el.setConfig(config);
    el.hass = { states, config: { latitude: lat, longitude: lon } } as Hass;
    out.textContent = `${t.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}, ${t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` +
      ` · sun ${sun.elevation.toFixed(1)}° · ${w}`;
    $('yaml').textContent = toYaml(fc);
  }

  document.querySelectorAll('#controls input, #controls select, #config > .fields input, #config > .fields select').forEach((i) => i.addEventListener('input', update));
  house.addEventListener('input', () => { setColors(); renderWindows(); update(); });
  $<HTMLButtonElement>('reset_colors').addEventListener('click', () => { setColors(); update(); });
  $<HTMLButtonElement>('add_person').addEventListener('click', () => {
    const i = people.length;
    people.push({ name: `Person ${i + 1}`, entity: `person.person_${i + 1}`, jacket: LOOKS[i].jacket, hair: LOOKS[i].hair, longHair: LOOKS[i].longHair, home: true });
    renderPeople();
    update();
  });
  $<HTMLButtonElement>('copy').addEventListener('click', () => {
    const text = $('yaml').textContent ?? '';
    const done = (msg: string): void => { $('copied').textContent = msg; window.setTimeout(() => ($('copied').textContent = ''), 2500); };
    navigator.clipboard?.writeText(text).then(() => done('Copied'), () => {
      const range = document.createRange();
      range.selectNodeContents($('yaml'));
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      done('Selected: press Ctrl+C');
    });
  });

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

  setColors();
  renderPeople();
  renderWindows();
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
    fig.append(card({ ...TEST_CONFIG, ...scene.config }, scene.states, scene.now), cap);
    g.append(fig);
  }
}

// ---- start ----
const params = new URLSearchParams(location.search);
const only = params.get('scene');
if (only !== null) {
  document.body.classList.add('single');
  const scene = SCENES[only];
  const root = $('single');
  if (!scene) root.textContent = `Unknown scene: ${only}`;
  else {
    const house = params.get('house');
    const el = card({ ...TEST_CONFIG, ...scene.config, ...(house ? houseConfig(house) : {}), labels: params.get('labels') !== '0' }, scene.states, scene.now);
    root.append(el);
    el.updateComplete.then(() => requestAnimationFrame(() => document.body.setAttribute('data-ready', '1')));
  }
} else {
  timeMachine();
  gallery();
}
