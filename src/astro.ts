// Sun and moon. The sun is only calculated here for the time machine and the demo page (in Home Assistant
// the card uses sun.sun); the moon uses a simplified model accurate to about 1°.

const RAD = Math.PI / 180;
const J2000 = Date.UTC(2000, 0, 1, 12);
const days = (d: Date): number => (d.getTime() - J2000) / 86400000;
const norm = (x: number): number => ((x % 360) + 360) % 360;

export interface SkyPos {
  elevation: number;
  azimuth: number;
}

function horizontal(ra: number, dec: number, d: number, lat: number, lon: number): SkyPos {
  const lst = norm(280.46061837 + 360.98564736629 * d + lon);
  const ha = lst * RAD - ra;
  const phi = lat * RAD;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha));
  const az = norm(Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) / RAD + 180);
  return { elevation: alt / RAD, azimuth: az };
}

/** The sun's elevation and azimuth (degrees, azimuth clockwise from north). */
export function sunPosition(date: Date, lat: number, lon: number): SkyPos & { rising: boolean } {
  const d = days(date);
  const g = norm(357.529 + 0.98560028 * d) * RAD;
  const q = norm(280.459 + 0.98564736 * d);
  const L = norm(q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const pos = horizontal(ra, dec, d, lat, lon);
  // sun.sun: "rising" is true from the sun's lowest point to noon, i.e. while the azimuth is on the eastern side
  return { ...pos, rising: pos.azimuth < 180 };
}

/** The moon's elevation and azimuth. */
export function moonPosition(date: Date, lat: number, lon: number): SkyPos {
  const d = days(date);
  const L = 218.316 + 13.176396 * d, M = 134.963 + 13.064993 * d, F = 93.27 + 13.22935 * d;
  const lonE = norm(L + 6.289 * Math.sin(M * RAD));
  const latE = 5.128 * Math.sin(F * RAD);
  const e = 23.439 * RAD;
  const ra = Math.atan2(Math.sin(lonE * RAD) * Math.cos(e) - Math.tan(latE * RAD) * Math.sin(e), Math.cos(lonE * RAD));
  const dec = Math.asin(Math.sin(latE * RAD) * Math.cos(e) + Math.cos(latE * RAD) * Math.sin(e) * Math.sin(lonE * RAD));
  return horizontal(ra, dec, d, lat, lon);
}

export const SYNODIC = 29.530588;
const NEW_MOON_2000 = Date.UTC(2000, 0, 6, 18, 14);

/** The moon's age in days since new moon (0–29.5). */
export function moonAge(date: Date): number {
  const a = ((date.getTime() - NEW_MOON_2000) / 86400000) % SYNODIC;
  return a < 0 ? a + SYNODIC : a;
}

// Home Assistant's moon sensor has eight phases; the middle of each phase in days.
const PHASES = ['new_moon', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full_moon', 'waning_gibbous', 'last_quarter', 'waning_crescent'];
export const phaseToAge = (phase: string): number | undefined => {
  const i = PHASES.indexOf(phase);
  return i < 0 ? undefined : (i * SYNODIC) / 8;
};
export const ageToPhase = (age: number): string => PHASES[Math.round((age / SYNODIC) * 8) % 8];

/** Astronomical season like Home Assistant's season sensor (approximate dates are enough for the picture). */
export function seasonOf(date: Date, latitude = 55.6): 'spring' | 'summer' | 'autumn' | 'winter' {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const north = md >= 320 && md < 621 ? 'spring' : md >= 621 && md < 923 ? 'summer' : md >= 923 && md < 1221 ? 'autumn' : 'winter';
  if (latitude >= 0) return north;
  return ({ spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' } as const)[north];
}
