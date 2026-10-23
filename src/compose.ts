// Scene -> layers, back to front. Each layer has a slot and a variant: when the variant changes,
// the new layer fades in over the old one.
import { DARK_PHASES, Scene } from './derive';
import * as F from './draw/festive';
import * as Hm from './draw/home';
import { base, clouds, trees } from './draw/scene';
import * as Sk from './draw/sky';
import { Layer } from './draw/util';
import * as Wx from './draw/weather';
import type { HouseColors, HouseModel } from './model/types';

export interface Spec {
  slot: string;
  variant: string;
  build: () => Layer;
  /** false = swap at once without a fade (the sun and the moon glide instead) */
  fade?: boolean;
}

const cache = new Map<string, Layer>();
/** Layers are pure functions of their variant; keep the latest so the same picture isn't drawn twice. */
export function buildCached(s: Spec): Layer {
  const k = `${s.slot}|${s.variant}`;
  let l = cache.get(k);
  if (!l) {
    l = s.build();
    if (cache.size > 400) cache.delete(cache.keys().next().value as string);
    cache.set(k, l);
  }
  return l;
}

const ORB = ['sunny', 'clear-night', 'partlycloudy', 'windy'];
const NIGHT_CLEAR = ['clear-night', 'sunny', 'partlycloudy', 'windy'];
const TREATS: Record<string, string> = { shrove_tuesday: 'semla', waffle_day: 'waffle', cinnamon_bun_day: 'bun', mothers_day: 'flowers', fathers_day: 'cake' };

export function compose(s: Scene, M: HouseModel, colors: HouseColors = {}): Spec[] {
  const out: Spec[] = [];
  const m = M.id;
  const add = (slot: string, variant: string, build: () => Layer | null, fade = true): void => {
    out.push({ slot, variant: `${m}|${variant}`, build: () => build() ?? { body: '' }, fade });
  };
  const when = (cond: boolean, slot: string, build: () => Layer | null, variant = slot): void => {
    if (cond) add(slot, variant, build);
  };
  const w = s.weather, day = !s.night, d = s.wdir;
  const dn = s.night ? 'night' : 'day';
  const wd = `${s.anim ? 'a' : 's'}${d}`;

  // 1. the base (sky, ground, house) per look, day/night and weather
  add('base', `${s.look}-${dn}-${w}-${JSON.stringify(colors)}`, () => base(M, s.look, w, s.night, colors));
  // 2. the sky
  if (Sk.light(M, s.light)) add('light', s.light, () => Sk.light(M, s.light));
  when(s.night && ['clear-night', 'sunny', 'partlycloudy'].includes(w), 'stars', () => Sk.stars(M));
  when(s.aurora && NIGHT_CLEAR.includes(w), 'aurora', () => Sk.aurora(M));
  when(s.meteors && s.night && NIGHT_CLEAR.includes(w), 'meteors', () => Sk.meteors(M));
  if (s.night && ORB.includes(w) && s.moon) {
    const mo = s.moon;
    add('moon', `${mo.age.toFixed(2)}-${mo.az.toFixed(1)}-${mo.el.toFixed(1)}`, () => Sk.moon(M, mo.age, mo.az, mo.el), false);
  }
  if (day && ORB.includes(w) && s.elev >= -1) add('sun', `${s.az.toFixed(1)}-${s.elev.toFixed(1)}`, () => Sk.sun(M, s.az, s.elev), false);
  when(s.rainedRecently && ['sunny', 'partlycloudy'].includes(w) && day, 'rainbow', () => Sk.rainbow(M));
  if (s.clouds > 0) add('clouds', `${Math.min(s.clouds, 5)}-${dn}-${s.darkClouds}-${wd}`, () => clouds(M, Math.min(s.clouds, 5), s.night, s.darkClouds, d, s.anim));
  if (!['no', 'nej', 'unknown', 'unavailable', ''].includes(s.rainSoon)) add('rain-front', `${d}`, () => Sk.rainFront(M, d));
  when(day && ['spring', 'summer'].includes(s.season) && ['sunny', 'partlycloudy', 'cloudy', 'windy'].includes(w), 'birds', Wx.birds);
  when(s.halloween && s.night, 'bats', Wx.bats);
  when(s.newYear, 'fireworks', F.fireworks);
  when(s.holiday === 'valentines', 'hearts', () => F.hearts(M));
  // 3. trees and animals
  add('trees', `${s.look}-${dn}-${s.sway}`, () => trees(s.look, s.night, s.sway));
  when(['blue_hour_morning', 'dawn', 'grey_dawn', 'golden_morning'].includes(s.light), 'deer', () => Wx.deer());
  when(['night', 'blue_hour_evening'].includes(s.light), 'owl', () => Wx.owl());
  when(s.season === 'autumn' && day, 'squirrel', () => Wx.squirrel());
  when(day && (s.season === 'winter' || s.snowOnGround), 'hare', Wx.hare);
  when(s.night && s.season !== 'winter' && s.temp > 5, 'hedgehog', Wx.hedgehog);
  // 4. weather
  when(w === 'fog', 'fog', Wx.fog);
  if (s.rain !== 'none') add('rain', s.rain, () => Wx.rain(s.rain));
  when(['snowy', 'snowy-rainy'].includes(w), 'snow', Wx.snow);
  when(['lightning', 'lightning-rainy', 'exceptional'].includes(w), 'lightning', Wx.lightning);
  when(s.rainedRecently && s.temp > 0, 'puddles', Wx.puddles);
  when(s.temp > 27 && day, 'heat', Wx.heat);
  when(s.snowOnGround && s.temp < 2, 'snow-roof', () => Hm.snowRoof(M));
  when(s.snowOnGround && s.temp < 2, 'snowman', Wx.snowman);
  when(s.temp < 0, 'frost', () => Hm.frost(M));
  when(s.season === 'summer' && day && ['sunny', 'partlycloudy'].includes(w), 'butterflies', Wx.butterflies);
  when(s.season === 'summer' && s.night && ['clear-night', 'partlycloudy', 'cloudy'].includes(w), 'fireflies', Wx.fireflies);
  if (s.season === 'autumn' && day) add('leaves', `${d}`, () => Wx.fallingLeaves(d));
  // 5. the house
  for (const id of Object.keys(M.windows)) {
    const l = s.windows[id];
    if (l) add(`window-${id}`, `${l.color}-${l.strong}`, () => Hm.windowLight(M, id, l.color, l.strong));
  }
  when(s.glint === 'side' || s.glint === 'both', 'glint-side', () => Hm.glint(M, 'side'));
  when(s.glint === 'front' || s.glint === 'both', 'glint-front', () => Hm.glint(M, 'front'));
  for (const id of s.tv) when(!!M.windows[id], `tv-${id}`, () => Hm.tv(M, id));
  when(s.fridayNight, 'friday-night', () => Hm.fridayCosy(M));
  when(s.washer, 'bubbles', () => Hm.bubbles(M, s.washerWindow || Object.keys(M.windows)[0]));
  if (s.smoke > 0) add('smoke', `${s.smoke}-${d}`, () => Hm.smoke(M, s.smoke, d));
  for (const spot of s.music) when(!!M.spots[spot], `notes-${spot}`, () => Hm.music(M, spot));
  when(s.porchLight, 'porch-light', () => Hm.porchLamp(M));
  when(DARK_PHASES.includes(s.light), 'street-lamp', Hm.streetLamp);
  when(s.advent, 'advent', () => F.advent(M));
  when(s.holiday === 'national_day', 'pennants', () => F.pennants(M));
  // 6. the garden and holidays
  when(s.calendarToday, 'mailbox', F.mailboxFlag);
  when(s.halloween, 'pumpkins', () => F.pumpkins(M));
  when(s.easter, 'easter-twigs', () => F.easterTwigs(M));
  when(s.easter, 'easter-eggs', F.easterEggs);
  when(s.holiday === 'walpurgis', 'bonfire', () => F.bonfire());
  when(s.christmas, 'christmas-tree', () => F.christmasTree());
  when(s.midsummer, 'maypole', () => F.maypole());
  if (s.flagDay || s.holiday === 'name_day' || (s.birthday && day)) add('flag', `${d}`, () => F.flag(d));
  when(s.holiday === 'crayfish_party', 'crayfish-party', () => F.crayfishParty(M));
  when(s.holiday === 'martinmas', 'goose', F.goose);
  if (TREATS[s.holiday]) add('treat', TREATS[s.holiday], () => F.treat(M, TREATS[s.holiday]));
  when(s.holiday === 'name_day', 'name-day', () => F.nameDay(M));
  when(s.holiday === 'christmas_eve', 'santa', () => F.santa(M));
  when(s.holiday === 'lucia', 'lucia', () => F.lucia(M));
  when(s.birthday, 'balloons', () => F.balloons(M));
  when(s.laundry, 'clothesline', F.clothesline);
  for (const i of [1, 2, 3]) when(s.minecraft > i - 1, `minecraft-${i}`, () => F.minecraft(i));
  // 7. people dressed for the weather; silhouettes in the windows at night; gusts in front of everything
  for (const p of s.people) {
    if (!p.home) continue;
    const x = M.people.x + p.index * M.people.step;
    const lookKey = JSON.stringify(p.look);
    if (!s.nightDim) add(`person-${p.index}`, `${s.clothes}-${x}-${lookKey}`, () => Hm.person(M, p.look, x, s.clothes));
    else if (s.windows.front && p.index < M.silhouettes.length) add(`silhouette-${p.index}`, `${lookKey}`, () => Hm.silhouette(M, M.silhouettes[p.index], p.look.longHair));
  }
  if (s.wind > 9.9) add('wind', `${d}`, () => Wx.wind(d));
  // night mode: dim everything
  when(s.nightDim, 'night-dim', Hm.nightDim);
  return out;
}
