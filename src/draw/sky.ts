// The sky: the sun and its shadow, light phases, stars, moon, rainbow, northern lights, shooting stars and a rain front.
import type { HouseModel } from '../model/types';
import { cloud } from './scene';
import { H, Layer, Rng, W, f0, f1, fgMask, grad, houseMask, inHouse, layer, toScene } from './util';

/** Sky mapping: azimuth 60–300° -> x 40–760, elevation 0–60° -> y 300–50 (we look south: east is left). */
export function skyXY(az: number, el: number): [number, number] {
  const a = Math.min(Math.max(az, 60), 300);
  const e = Math.min(Math.max(el, 0), 60);
  return [40 + ((a - 60) / 240) * 720, 300 - (e / 60) * 250];
}

/** The sun (stepless) with the house's soft shadow on the ground, away from the sun and towards the viewer. */
export function sun(M: HouseModel, az: number, el: number): Layer {
  const [x, y] = skyXY(az, el);
  const e = Math.max(el, 0);
  const low = e <= 12;
  const core = e <= 6 ? '#ffb347' : low ? '#ffc94d' : '#ffd45e';
  const r = e <= 6 ? 30 : 28;
  const disc = `<circle cx="0" cy="0" r="${f0(r * 2.8)}" fill="url(#sg)"/>` +
    `<circle cx="0" cy="0" r="${r}" fill="${core}"/><circle cx="-8" cy="-8" r="${f0(r * 0.45)}" fill="#fff" opacity=".18"/>`;
  const sx = Math.max(-1, Math.min(1, (az - 180) / 90));
  const k = Math.max(0.35, Math.min(2.2, 1 / Math.tan((Math.max(e, 3) * Math.PI) / 180)));
  const dx = -sx * k * 70, dy = (1 - Math.abs(sx) * 0.7) * k * 14 + 4;
  const [fx1, fx2, fy] = M.footprint;
  const x1 = toScene(M, fx1, fy)[0], x2 = toScene(M, fx2, fy)[0], yb = toScene(M, 0, fy)[1];
  const shadow = `<g mask="url(#hm)"><polygon points="${f0(x1)},${f0(yb)} ${f0(x2)},${f0(yb - 28)} ${f0(x2 + dx)},${f0(yb - 28 + dy)} ${f0(x1 + dx)},${f0(yb + dy)}" ` +
    `fill="#0b1a10" opacity="${e > 8 ? 0.2 : 0.13}" filter="url(#sb)"/></g>`;
  return {
    body: shadow,
    defs: fgMask(M) + houseMask(M) + grad('sg', '#ffe28a', low ? 0.95 : 0.85, '#ffb347') +
      '<filter id="sb" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>',
    move: { x, y, masked: disc },
  };
}

function twilight(M: HouseModel, stops: [number, string, number][], houseTint: string): Layer {
  const g = stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
  return layer(`<rect width="${W}" height="330" fill="url(#t)" mask="url(#fg)"/><g fill="${houseTint}" opacity=".13">${inHouse(M, M.outline)}</g>`,
    `<linearGradient id="t" x1="0" y1="0" x2="0" y2="1">${g}</linearGradient>` + fgMask(M));
}

function skyWash(M: HouseModel, stops: [number, string, number][], extra = '', over?: [string, number], extraDefs = ''): Layer {
  const g = stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
  let body = `<rect width="${W}" height="330" fill="url(#lw)" mask="url(#fg)"/>` + extra;
  if (over) body += `<rect width="${W}" height="${H}" fill="${over[0]}" opacity="${over[1]}"/>`;
  return layer(body, `<linearGradient id="lw" x1="0" y1="0" x2="0" y2="1">${g}</linearGradient>` + fgMask(M) + extraDefs);
}

/** The light phase over the whole scene: blue hour, dawn/dusk, golden hour, midday, grey dawn/dusk. */
export function light(M: HouseModel, phase: string): Layer | null {
  switch (phase) {
    case 'dawn':
      return twilight(M, [[0, '#7a8cc8', 0.1], [0.45, '#f6b6c8', 0.22], [0.8, '#ffc38a', 0.5], [1, '#ffd9a0', 0.6]], '#ffc38a');
    case 'dusk':
      return twilight(M, [[0, '#3b2a6b', 0.3], [0.5, '#c0507a', 0.28], [0.82, '#ff7e4f', 0.5], [1, '#ffb347', 0.62]], '#ff8a50');
    case 'blue_hour_morning':
      return skyWash(M, [[0, '#16235c', 0.35], [0.7, '#4d6bc2', 0.3], [1, '#9fb5e8', 0.45]], '', ['#1d2a66', 0.16]);
    case 'blue_hour_evening':
      return skyWash(M, [[0, '#1a1550', 0.4], [0.65, '#4b4fae', 0.32], [1, '#a58fd8', 0.45]], '', ['#22195e', 0.18]);
    case 'golden_morning':
      return skyWash(M, [[0, '#ffd9a0', 0], [0.6, '#ffcf8a', 0.18], [1, '#ffb860', 0.42]],
        `<ellipse cx="60" cy="300" rx="320" ry="160" fill="url(#gm)" mask="url(#fg)"/><g fill="#ffcf7a" opacity=".16">${inHouse(M, M.roofOutline)}</g>`,
        ['#ffb347', 0.07], grad('gm', '#ffc46b', 0.45));
    case 'golden_evening':
      return skyWash(M, [[0, '#ffb38a', 0], [0.6, '#ffa86b', 0.2], [1, '#ff9248', 0.45]],
        `<ellipse cx="740" cy="300" rx="320" ry="160" fill="url(#gk)" mask="url(#fg)"/>` +
        `<g fill="#ffa24d" opacity=".32">${inHouse(M, M.sideOutline)}</g><g fill="#ffb366" opacity=".12">${inHouse(M, M.roofOutline)}</g>`,
        ['#ff9a3c', 0.08], grad('gk', '#ff9a4d', 0.45));
    case 'midday':
      return skyWash(M, [[0, '#ffffff', 0.1], [1, '#ffffff', 0]]);
    case 'grey_dawn':
    case 'grey_dusk':
      return skyWash(M, [[0, '#9aa4ad', 0], [0.7, '#b9c1c7', 0.12], [1, '#d4d9dc', 0.22]]);
    default:
      return null;
  }
}

export function stars(M: HouseModel): Layer {
  const R = new Rng(4242);
  const b: string[] = [];
  for (let i = 0; i < 34; i++) {
    const x = R.uniform(10, W - 10), y = R.uniform(8, 190);
    if (x > 600 && x < 730 && y < 150) continue;
    const r = R.uniform(0.9, 2.0), d = R.uniform(1.8, 4.5), bg = R.uniform(0, 4);
    b.push(`<circle cx="${f0(x)}" cy="${f0(y)}" r="${f1(r)}" fill="#fff">` +
      `<animate attributeName="opacity" values=".15;1;.15" dur="${f1(d)}s" begin="${f1(bg)}s" repeatCount="indefinite"/></circle>`);
  }
  for (const [x, y] of [[120, 40], [520, 30], [300, 110]]) {
    b.push(`<path d="M${x},${y - 6} L${x + 1.4},${y - 1.4} L${x + 6},${y} L${x + 1.4},${y + 1.4} L${x},${y + 6} L${x - 1.4},${y + 1.4} L${x - 6},${y} L${x - 1.4},${y - 1.4} Z" fill="#fff">` +
      `<animate attributeName="opacity" values=".3;1;.3" dur="${f1(R.uniform(2.5, 4))}s" repeatCount="indefinite"/></path>`);
  }
  b.push('<g opacity="0" data-s="0"><line x1="0" y1="0" x2="-46" y2="-17" stroke="url(#sf)" stroke-width="2.2" stroke-linecap="round"/>' +
    '<animateTransform attributeName="transform" type="translate" values="180 30;430 122;430 122" keyTimes="0;.05;1" dur="19s" repeatCount="indefinite"/>' +
    '<animate attributeName="opacity" values="0;1;0;0" keyTimes="0;.01;.05;1" dur="19s" repeatCount="indefinite"/></g>');
  return layer(`<g mask="url(#fg)">${b.join('')}</g>`,
    '<linearGradient id="sf" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' + fgMask(M));
}

const MR = 24;

/**
 * The moon (stepless): age = the moon's age in days (0 = new, ~14.8 = full). Northern hemisphere: waxing = lit on the right.
 * The terminator is an ellipse whose width follows the phase angle, so the phase changes smoothly day by day.
 */
export function moon(M: HouseModel, age: number, az: number, el: number): Layer {
  const [x, y] = skyXY(az, el);
  const SYN = 29.530588;
  const a = ((age % SYN) + SYN) % SYN;
  const theta = (a / SYN) * 2 * Math.PI; // 0 new, π full
  const frac = (1 - Math.cos(theta)) / 2; // lit fraction
  const litRight = a < SYN / 2;
  const top = `0,${-MR}`, bot = `0,${MR}`;
  const outer = `M${top} A${MR},${MR} 0 0 ${litRight ? 1 : 0} ${bot}`;
  const rx = Math.abs(Math.cos(theta)) * MR;
  const term = `A${f1(rx)},${MR} 0 0 ${frac > 0.5 === litRight ? 1 : 0} ${top}`;
  let lit = '';
  if (frac > 0.985) lit = `<circle cx="0" cy="0" r="${MR}"/>`;
  else if (frac > 0.015) lit = `<path d="${outer} ${term} Z"/>`;
  const glow = frac < 0.015 ? 0 : frac > 0.985 ? 0.45 : frac < 0.5 ? 0.22 : 0.32;
  const craters = [[-8, -7, 5], [7, 6, 4], [-3, 11, 3], [10, -10, 2.5], [-13, 5, 2.5]]
    .map(([dx, dy, r]) => `<circle cx="${dx}" cy="${dy}" r="${r}" fill="#cfc9ad" opacity=".55"/>`).join('');
  let disc = `<circle cx="0" cy="0" r="${MR}" fill="#33414f" opacity=".75" stroke="#8a97a3" stroke-opacity=".35"/>`;
  if (lit) disc += `<clipPath id="mc">${lit}</clipPath><g clip-path="url(#mc)"><circle cx="0" cy="0" r="${MR}" fill="#f4f1de"/>${craters}</g>`;
  return {
    body: '',
    defs: grad('mg', '#fff6c8', 1) + fgMask(M),
    move: { x, y: Math.max(y, 40), masked: disc, free: `<circle cx="0" cy="0" r="60" fill="url(#mg)" opacity="${(glow * 0.8).toFixed(2)}"/>` },
  };
}

/** A rainbow behind the house and the trees. */
export function rainbow(M: HouseModel): Layer {
  const rb = ['#ff4d4d', '#ff9a3c', '#ffe14d', '#5be37a', '#4dabff', '#5a5aff', '#a678ff']
    .map((c, i) => `<path d="M60,330 A340,300 0 0 1 740,330" stroke="${c}" stroke-width="7" fill="none" transform="translate(0,${i * 7}) scale(1,${(1 - i * 0.02).toFixed(2)})" opacity=".5"/>`).join('');
  return layer(`<g mask="url(#fg)"><g>${rb}<animate attributeName="opacity" values=".75;1;.75" dur="6s" repeatCount="indefinite"/></g></g>`, fgMask(M));
}

/** Northern lights: hundreds of thin rays along undulating bands that shimmer and wander. */
export function aurora(M: HouseModel): Layer {
  const rr = new Rng(77);
  const bands: string[] = [], defs: string[] = [];
  const spec: [number, number, number, number, string, number][] = [
    [40, 380, 165, 22, '#5dffb0', 16], [300, 620, 140, 28, '#47ffd8', 19],
    [520, 790, 160, 18, '#8dff7a', 14], [180, 520, 105, 16, '#c08cff', 22],
  ];
  spec.forEach(([x0, x1, yb, amp, col, dur], bi) => {
    defs.push(`<linearGradient id="au${bi}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${col}" stop-opacity="0"/>` +
      `<stop offset=".12" stop-color="${col}" stop-opacity=".95"/><stop offset=".55" stop-color="${col}" stop-opacity=".35"/>` +
      `<stop offset="1" stop-color="#b48cff" stop-opacity="0"/></linearGradient>`);
    const rays: string[] = [];
    for (let x = x0; x < x1; x += 5) {
      const t = (x - x0) / (x1 - x0);
      const y = yb + amp * Math.sin(t * 6.2 + bi) + 8 * Math.sin(t * 17);
      const h = (60 + 50 * Math.sin(t * 9 + bi * 2) ** 2) * Math.sin(Math.PI * t) ** 0.6;
      const op = 0.35 + 0.5 * rr.random();
      const d1 = rr.uniform(1.5, 4), bg = rr.uniform(0, 3);
      rays.push(`<rect x="${x}" y="${f0(y - h)}" width="${f1(rr.uniform(3, 6))}" height="${f0(h)}" fill="url(#au${bi})" opacity="${op.toFixed(2)}">` +
        `<animate attributeName="opacity" values="${op.toFixed(2)};${(op * 0.35).toFixed(2)};${op.toFixed(2)}" dur="${f1(d1)}s" begin="${f1(bg)}s" repeatCount="indefinite"/></rect>`);
    }
    bands.push(`<g>${rays.join('')}<animateTransform attributeName="transform" type="translate" values="0 0;${bi % 2 ? 18 : -18} 3;0 0" dur="${dur}s" repeatCount="indefinite"/></g>`);
  });
  return layer(`<g mask="url(#fg)" filter="url(#ab)">${bands.join('')}</g>`,
    defs.join('') + fgMask(M) + '<filter id="ab" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>');
}

/** Meteor-shower nights: many shooting stars. */
export function meteors(M: HouseModel): Layer {
  const spec: [number, number, number, number, number, number][] = [
    [140, 30, 220, 80, 9, 0], [420, 20, 160, 70, 7, 2.5], [600, 50, -180, 70, 11, 4.2],
    [260, 70, 200, 60, 8, 6], [520, 40, 180, 90, 10, 1.4], [90, 90, 160, 50, 12, 7.5],
  ];
  const b = spec.map(([x0, y0, dx, dy, dur, bg]) => {
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    return `<g opacity="0" data-s="0"><line x1="0" y1="0" x2="-50" y2="0" stroke="url(#sf2)" stroke-width="2.2" stroke-linecap="round" transform="rotate(${f0(ang)})"/>` +
      `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0 + dx} ${y0 + dy};${x0 + dx} ${y0 + dy}" keyTimes="0;.08;1" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0;1;0;0" keyTimes="0;.02;.08;1" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/></g>`;
  });
  return layer(`<g mask="url(#fg)">${b.join('')}</g>`,
    '<linearGradient id="sf2" x1="1" x2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' + fgMask(M));
}

/** Rain on the way: a dark cloud bank builds on the side the weather comes from (d = wind direction ±1). */
export function rainFront(M: HouseModel, d: number): Layer {
  const side = d < 0 ? 800 : 0; // the wind blows to the left -> the weather comes from the right
  const sgn = d < 0 ? -1 : 1;
  const cl = ([[20, 70, 1.3], [90, 110, 1.1], [10, 150, 1.2], [150, 60, 0.9]] as const)
    .map(([dx, y, sc]) => cloud(side + sgn * dx - 60, y, sc, '#4a5560', 0.92)).join('');
  const streaks = [[30, 170], [60, 180], [95, 165], [130, 185], [160, 172], [45, 200], [110, 205]]
    .map(([dx, y]) => `<line x1="${f0(side + sgn * dx)}" y1="${y}" x2="${f0(side + sgn * dx - 6)}" y2="${y + 40}" stroke="#7d8d9c" stroke-width="1.6" opacity=".55"/>`).join('');
  const body = `<g><g opacity=".95">${cl}${streaks}</g>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;${-sgn * 25} 0;0 0" dur="14s" repeatCount="indefinite"/></g>`;
  return layer(`<g mask="url(#fg)">${body}</g>`, fgMask(M));
}
