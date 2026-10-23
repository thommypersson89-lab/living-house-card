// Holidays by date rules, per country. A `helpers.holiday` sensor can override today's holiday.

const day = (y: number, m: number, d: number): Date => new Date(y, m - 1, d);
const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const same = (a: Date, b: Date): boolean => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dateOnly = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const between = (t: Date, a: Date, b: Date): boolean => dateOnly(t) >= a && dateOnly(t) <= b;
export const mmdd = (d: Date): string => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Easter Sunday (Gregorian; Meeus/Jones/Butcher). */
export function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), dd = ((h + l - 7 * m + 114) % 31) + 1;
  return day(y, month, dd);
}

/** The first day from the date that falls on weekday wd (0 = Sunday). */
const firstWeekday = (from: Date, wd: number): Date => addDays(from, (wd - from.getDay() + 7) % 7);

// Swedish dates
export const midsummerEve = (y: number): Date => firstWeekday(day(y, 6, 19), 5);
export const allSaints = (y: number): Date => firstWeekday(day(y, 10, 31), 6);
export const mothersDaySE = (y: number): Date => firstWeekday(day(y, 5, 25), 0);
export const fathersDaySE = (y: number): Date => addDays(firstWeekday(day(y, 11, 1), 0), 7);

export type Country = 'se' | 'none';

export interface Holidays {
  today: string; // a holiday id (christmas_eve, lucia, …) or none
  advent: boolean;
  christmas: boolean; // the Christmas tree is up
  halloween: boolean;
  easter: boolean;
  midsummer: boolean;
  flagDay: boolean;
  newYear: boolean; // fireworks
  meteors: boolean; // a meteor-shower night
  fridayNight: boolean;
}

const FLAG_DAYS_SE = ['01-01', '01-28', '03-12', '04-30', '05-01', '06-06', '07-14', '08-08', '10-24', '11-06', '12-10', '12-23', '12-25'];

export function holidaysAt(n: Date, sunUp: boolean, country: Country = 'se', nameDays: string[] = []): Holidays {
  const y = n.getFullYear(), md = mmdd(n), h = n.getHours(), wd = n.getDay();
  const common = {
    newYear: (md === '12-31' && h >= 17) || (md === '01-01' && (h < 1 || (h === 1 && n.getMinutes() < 30))),
    meteors: (md >= '01-02' && md <= '01-04') || (md >= '04-21' && md <= '04-23') || (md >= '08-09' && md <= '08-14') || (md >= '12-12' && md <= '12-15'),
    fridayNight: wd === 5 && h >= 17,
  };
  const nameDay = nameDays.includes(md);
  if (country === 'none') {
    return { ...common, today: nameDay ? 'name_day' : 'none', advent: false, christmas: false, halloween: false, easter: false, midsummer: false, flagDay: false };
  }
  const eas = easter(y), mids = midsummerEve(y), allh = allSaints(y);
  let today = 'none';
  if (md === '12-24') today = 'christmas_eve';
  else if (md === '12-13') today = 'lucia';
  else if (md === '02-14') today = 'valentines';
  else if (same(n, addDays(eas, -47))) today = 'shrove_tuesday';
  else if (md === '03-25') today = 'waffle_day';
  else if (md === '04-30' && h >= 17) today = 'walpurgis';
  else if (same(n, mothersDaySE(y))) today = 'mothers_day';
  else if (md === '06-06') today = 'national_day';
  else if (n.getMonth() === 7 && (wd === 5 || wd === 6) && h >= 17) today = 'crayfish_party';
  else if (md === '10-04') today = 'cinnamon_bun_day';
  else if (md === '11-10' || md === '11-11') today = 'martinmas';
  else if (same(n, fathersDaySE(y))) today = 'fathers_day';
  else if (nameDay) today = 'name_day';
  const adventStart = firstWeekday(day(y, 11, 27), 0);
  const jan = n.getMonth() === 0 && n.getDate() <= 13;
  return {
    ...common,
    today,
    advent: dateOnly(n) >= adventStart || jan,
    christmas: (n.getMonth() === 11 && n.getDate() >= 18) || jan,
    halloween: between(n, day(y, 10, 24), allh),
    easter: between(n, addDays(eas, -14), addDays(eas, 1)),
    midsummer: between(n, mids, addDays(mids, 2)),
    flagDay: (FLAG_DAYS_SE.includes(md) || same(n, eas) || same(n, addDays(mids, 1))) && h >= 8 && sunUp,
  };
}
