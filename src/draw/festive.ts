// Holidays and decorations, plus the mailbox flag, the clothesline and the Minecraft figures.
// Decorations on the house are drawn where they sit on the villa and moved to the model's anchors.
import type { HouseModel, Point } from '../model/types';
import { VILLA } from '../model/villa';
import { Layer, Rng, f0, f1, f2, grad, inHouse, layer, toScene } from './util';

/** Move something drawn at the villa's anchor to this model's anchor. */
function at(p: Point, ref: Point, g: string): string {
  const dx = p[0] - ref[0], dy = p[1] - ref[1];
  return dx || dy ? `<g transform="translate(${dx},${dy})">${g}</g>` : g;
}

function stringLights(pts: [number, number][], step = 13): string {
  const out: [number, number][] = [], wire: string[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
    const n = Math.max(1, Math.floor(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + 3]);
    }
    wire.push(`M${x1},${y1 + 1} Q${f0((x1 + x2) / 2)},${f0((y1 + y2) / 2 + 6)} ${x2},${y2 + 1}`);
  }
  const bulbs = out.map(([x, y], i) => `<g><circle cx="${f1(x)}" cy="${f1(y)}" r="6" fill="url(#lg)"/><circle cx="${f1(x)}" cy="${f1(y)}" r="2.4" fill="#fff1b8"/>` +
    `<animate attributeName="opacity" values="1;.55;1" dur="1.4s" begin="${i % 2 ? 0 : 0.7}s" repeatCount="indefinite"/></g>`);
  return `<path d="${wire.join(' ')}" stroke="#1a1a1a" stroke-width="1" fill="none"/>` + bulbs.join('');
}

/** Advent: string lights along the eaves, an Advent star and a candlestick in the windows. */
export function advent(M: HouseModel): Layer {
  const D = M.deco, V = VILLA.deco;
  const star = '<line x1="347" y1="262" x2="347" y2="266" stroke="#333" stroke-width=".8"/><circle cx="347" cy="273" r="14" fill="url(#lg)"/>' +
    '<path d="M347,266 L349,271 L354,271 L350,274 L351.5,279 L347,276 L342.5,279 L344,274 L340,271 L345,271 Z" fill="#ff6a3d" stroke="#ffd2a0" stroke-width=".6"/>';
  let candles = '<path d="M425,283 L445,283 L435,276 Z" fill="#2d2d2d"/>';
  [[427, 281], [430.5, 279], [432, 277.5], [435, 275.5], [438, 277.5], [439.5, 279], [443, 281]].forEach(([x, y], i) => {
    candles += `<rect x="${x - 0.8}" y="${y - 5}" width="1.6" height="5" fill="#f4efe0"/>` +
      `<ellipse cx="${x}" cy="${y - 6.4}" rx="1" ry="1.8" fill="#ffd65a"><animate attributeName="ry" values="1.8;1.4;2;1.6;1.8" dur="${f2(1.1 + i * 0.13)}s" repeatCount="indefinite"/></ellipse>`;
  });
  candles += '<circle cx="435" cy="276" r="13" fill="url(#lg)" opacity=".7"/>';
  return layer(inHouse(M, M.eaves.map((e) => stringLights(e)).join('') + at(D.star, V.star, star) + at(D.candles, V.candles, candles)), grad('lg', '#ffe7a0', 0.8));
}

function pumpkin(cx: number, base: number, s = 1): string {
  const w = 15 * s, h = 11 * s, cy = base - h;
  const flick = '<animate attributeName="opacity" values="1;.75;.95;.7;1;.85;1" dur="1.7s" repeatCount="indefinite"/>';
  return `<circle cx="${cx}" cy="${cy}" r="${f0(30 * s)}" fill="url(#pg)">${flick}</circle><ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}" fill="#e8772e"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${f1(w * 0.45)}" ry="${h}" fill="none" stroke="#c45e1f" stroke-width="1.5"/>` +
    `<path d="M${cx},${cy - h} q2,-6 6,-7" stroke="#4f7a2a" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<g fill="#ffd25a">${flick}<polygon points="${f1(cx - 8 * s)},${f1(cy - 2 * s)} ${f1(cx - 3 * s)},${f1(cy - 2 * s)} ${f1(cx - 5.5 * s)},${f1(cy - 7 * s)}"/>` +
    `<polygon points="${f1(cx + 3 * s)},${f1(cy - 2 * s)} ${f1(cx + 8 * s)},${f1(cy - 2 * s)} ${f1(cx + 5.5 * s)},${f1(cy - 7 * s)}"/>` +
    `<path d="M${f1(cx - 9 * s)},${f1(cy + 2 * s)} l3,3 l3,-2 l3,3 l3,-3 l3,2 l3,-3 l-2,5 l-14,0 Z"/></g>`;
}

export const pumpkins = (M: HouseModel): Layer => layer(inHouse(M, M.deco.pumpkins.map(([x, b, s]) => pumpkin(x, b, s)).join('')), grad('pg', '#ffb347', 0.55));

export function easterTwigs(M: HouseModel): Layer {
  let b = '<path d="M356,336 L352,322 L366,322 L362,336 Z" fill="#5b7fa8"/>';
  const cols = ['#ff5fa2', '#ffd23f', '#5ad1ff', '#7dff8a', '#ff8a3d', '#b06bff'];
  [-0.55, -0.3, -0.1, 0.1, 0.3, 0.5].forEach((a, i) => {
    const x2 = 359 + 34 * Math.sin(a), y2 = 322 - 34 * Math.cos(a);
    b += `<path d="M359,323 Q${f0(359 + 14 * Math.sin(a))},304 ${f1(x2)},${f1(y2)}" stroke="#6b4a2f" stroke-width="1.4" fill="none"/>`;
    for (const t of [0.55, 0.85]) {
      const fx = f1(359 + (x2 - 359) * t), fy = f1(322 + (y2 - 322) * t);
      b += `<ellipse cx="${fx}" cy="${fy}" rx="2" ry="4.5" fill="${cols[(i * 2 + Math.floor(t * 10)) % 6]}">` +
        `<animateTransform attributeName="transform" type="rotate" values="${f0(a * 57 + 10)} ${fx} ${fy};${f0(a * 57 + 30)} ${fx} ${fy};${f0(a * 57 + 10)} ${fx} ${fy}" dur="${f1(2.2 + i * 0.2)}s" repeatCount="indefinite"/></ellipse>`;
    }
  });
  return layer(inHouse(M, at(M.deco.twigs, VILLA.deco.twigs, b)));
}

export const easterEggs = (): Layer => layer(([[215, 352, '#ff5fa2', -15], [300, 366, '#ffd23f', 10], [520, 362, '#5ad1ff', -5], [565, 355, '#7dff8a', 20], [680, 368, '#b06bff', -20]] as const)
  .map(([x, y, c, rot]) => `<g transform="rotate(${rot} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="4.5" ry="6" fill="${c}"/><path d="M${x - 4.5},${y} Q${x - 2},${y - 2} ${x},${y} T${x + 4.5},${y}" stroke="#fff" stroke-width="1" fill="none"/></g>`).join(''));

export function maypole(x = 640, base = 352, top = 246): Layer {
  const leaf = '#3f8f3f';
  let b = `<rect x="${x - 2.5}" y="${top}" width="5" height="${base - top}" fill="${leaf}"/><rect x="${x - 24}" y="${top + 16}" width="48" height="5" rx="2" fill="${leaf}"/>`;
  for (const dx of [-21, 21]) {
    b += `<g><circle cx="${x + dx}" cy="${top + 34}" r="11" fill="none" stroke="${leaf}" stroke-width="5"/>` +
      `<circle cx="${x + dx}" cy="${top + 34}" r="11" fill="none" stroke="#ffd23f" stroke-width="1.5" stroke-dasharray="2 5"/>` +
      `<animateTransform attributeName="transform" type="rotate" values="-5 ${x + dx} ${top + 20};5 ${x + dx} ${top + 20};-5 ${x + dx} ${top + 20}" dur="3.2s" repeatCount="indefinite"/></g>`;
  }
  ['#2a6ebb', '#ffd23f'].forEach((c, i) => {
    const d1 = `M${x},${top + 4} q${10 + i * 4},20 ${4 + i * 6},44`, d2 = `M${x},${top + 4} q${16 + i * 4},18 ${12 + i * 6},42`;
    b += `<path d="${d1}" stroke="${c}" stroke-width="2" fill="none"><animate attributeName="d" values="${d1};${d2};${d1}" dur="${2.4 + i * 0.5}s" repeatCount="indefinite"/></path>`;
  });
  for (let dy = 8; dy < base - top - 6; dy += 9) {
    b += `<circle cx="${x + (dy % 2 ? 3 : -3)}" cy="${top + dy}" r="1.6" fill="${['#ffffff', '#ff7fb0', '#ffd23f'][dy % 3]}"/>`;
  }
  return layer(b);
}

/** A flag waving with the wind (d = ±1): Swedish or American. */
export type FlagStyle = 'se' | 'us';

export function flag(d: number, style: FlagStyle = 'se'): Layer {
  const [x, base, top, w, h] = [60, 318, 188, 44, 28];
  const s = d > 0 ? 1 : -1;
  const fp = (o: number): string =>
    `M${x + 2 * s},${top + 2} C${x + (2 + w * 0.35) * s},${top + 2 - o} ${x + (2 + w * 0.65) * s},${top + 2 + o} ${x + (2 + w) * s},${top + 2} ` +
    `L${x + (2 + w) * s},${top + 2 + h} C${x + (2 + w * 0.65) * s},${top + 2 + h + o} ${x + (2 + w * 0.35) * s},${top + 2 + h - o} ${x + 2 * s},${top + 2 + h} Z`;
  const anim = `<animate attributeName="d" values="${fp(4)};${fp(-4)};${fp(4)}" dur="2.2s" repeatCount="indefinite"/>`;
  const xl = s > 0 ? x : x - (w + 8);
  let cloth: string;
  if (style === 'us') {
    // thirteen stripes and a blue canton with stars at the hoist (next to the pole)
    const sh = h / 13;
    cloth = `<rect x="${xl}" y="${top - 6}" width="${w + 8}" height="${h + 14}" fill="#b22234"/>` +
      Array.from({ length: 6 }, (_, i) => `<rect x="${xl}" y="${f1(top + 2 + (2 * i + 1) * sh)}" width="${w + 8}" height="${f1(sh)}" fill="#ffffff"/>`).join('');
    const cw = w * 0.42, cx = s > 0 ? x : x - cw - 2;
    cloth += `<rect x="${f1(cx)}" y="${top - 6}" width="${f1(cw + 2)}" height="${f1(7 * sh + 8)}" fill="#3c3b6e"/>`;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      cloth += `<circle cx="${f1(cx + 3 + c * (cw - 3) / 5 + (r % 2) * 1.6)}" cy="${f1(top + 4 + r * 3.4)}" r=".8" fill="#fff"/>`;
    }
  } else {
    const crossV = `<rect x="${f1(x + (2 + w * 0.32) * s - (s > 0 ? 0 : w * 0.14))}" y="${top}" width="${f1(w * 0.14)}" height="${h + 6}" fill="#fecc02"/>`;
    const crossH = `<rect x="${xl}" y="${f1(top + 2 + h * 0.42)}" width="${w + 8}" height="${f1(h * 0.18)}" fill="#fecc02"/>`;
    cloth = `<rect x="${xl}" y="${top - 6}" width="${w + 8}" height="${h + 14}" fill="#006aa7"/>${crossV}${crossH}`;
  }
  return layer(`<rect x="${x - 1.5}" y="${top - 6}" width="3" height="${base - top + 6}" fill="#e8ecef"/><circle cx="${x}" cy="${top - 7}" r="3" fill="#e8c34a"/>` +
    `<clipPath id="fl"><path d="${fp(4)}">${anim}</path></clipPath>` +
    `<g clip-path="url(#fl)">${cloth}</g>`);
}

/** The clothesline: laundry left in the machine. */
export function clothesline(): Layer {
  const x0 = 150;
  let b = `<rect x="${x0}" y="296" width="3" height="50" fill="#8a7a66"/><rect x="${x0 + 56}" y="296" width="3" height="50" fill="#8a7a66"/>` +
    `<path d="M${x0 + 1},299 Q${x0 + 29},307 ${x0 + 57},299" stroke="#ddd" stroke-width="1" fill="none"/>`;
  const items: [number, number, string][] = [
    [x0 + 9, 301, '<path d="M-7,0 L7,0 L9,5 L5,6 L5,17 L-5,17 L-5,6 L-9,5 Z" fill="#3d7ac7"/>'],
    [x0 + 24, 303.5, '<rect x="-5" y="0" width="10" height="16" fill="#f2f2f2"/><rect x="-5" y="12" width="10" height="2" fill="#e05a5a"/>'],
    [x0 + 36, 303.8, '<path d="M-2,0 L2,0 L2,8 L5,11 L4,13 L-2,10 Z" fill="#ffd23f"/><path d="M3,0 L6,0 L6,7 L9,10 L8,12 L3,9 Z" fill="#7dc4a0"/>'],
    [x0 + 48, 301.5, '<path d="M-4,0 L4,0 L8,15 L-8,15 Z" fill="#d9577a"/>'],
  ];
  items.forEach(([x, y, shape], i) => {
    b += `<g transform="translate(${x},${y})"><g>${shape}` +
      `<animateTransform attributeName="transform" type="rotate" values="-5 0 0;5 0 0;-5 0 0" dur="${f2(2.4 + i * 0.35)}s" repeatCount="indefinite"/></g></g>` +
      `<rect x="${x - 1}" y="${y - 2}" width="2" height="3" fill="#c9a36b"/>`;
  });
  return layer(b);
}

const heart = (x: number, y: number, s: number, col: string): string =>
  `<path transform="translate(${x},${y}) scale(${s})" d="M0,4 C-6,-2 -12,4 0,12 C12,4 6,-2 0,4 Z" fill="${col}"/>`;

export function hearts(M: HouseModel): Layer {
  const [a, b] = M.deco.hearts;
  const hb = ([[...a, 30, 5, 0, '#ff4d6d'], [...a, -24, 6, 1.7, '#ff8fa3'], [...a, 12, 5.5, 3.3, '#ff4d6d'],
    [...b, -40, 6, 0.8, '#ff8fa3'], [...b, 36, 6.5, 2.6, '#ff4d6d']] as [number, number, number, number, number, string][]).map(([x0, y0, dx, dur, bg, col]) =>
    `<g opacity="0">${heart(0, 0, 1.1, col)}` +
    `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0 + dx * 0.5} ${y0 - 60};${x0 + dx} ${y0 - 130}" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0;1;0" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/></g>`);
  hb.push(`<g>${heart(M.deco.windowHeart[0], M.deco.windowHeart[1], 0.75, '#ff4d6d')}<animate attributeName="opacity" values=".6;1;.6" dur="1.2s" repeatCount="indefinite"/></g>`);
  return layer(inHouse(M, hb.join('')));
}

const plate = (x: number, b: number): string =>
  `<ellipse cx="${x}" cy="${b - 1}" rx="12" ry="3" fill="#f1f3f5"/><ellipse cx="${x}" cy="${b - 1.5}" rx="8" ry="1.8" fill="#d9dee3"/>`;

/** Treats and flowers on the porch: semla, waffle, cinnamon bun, flowers, cake. */
export function treat(M: HouseModel, name: string): Layer | null {
  const L = treatLayer(name);
  return L ? layer(inHouse(M, at(M.deco.treat, VILLA.deco.treat, L))) : null;
}

function treatLayer(name: string): string | null {
  const P = VILLA.deco.treat[0];
  switch (name) {
    case 'semla':
      return (plate(P, 338) + `<path d="M${P - 11},336 Q${P},329 ${P + 11},336 Z" fill="#c98a4b"/><ellipse cx="${P}" cy="331" rx="10" ry="4" fill="#fffaf0"/>` +
        `<circle cx="${P - 5}" cy="330" r="3.5" fill="#fffaf0"/><circle cx="${P + 5}" cy="330" r="3.5" fill="#fffaf0"/>` +
        `<path d="M${P - 9},329 Q${P},319 ${P + 9},329 Q${P},326 ${P - 9},329 Z" fill="#d49a5c"/><path d="M${P - 6},326 Q${P},322 ${P + 6},326" stroke="#fff" stroke-width="1.6" fill="none" stroke-dasharray="1 1.5"/>`);
    case 'waffle':
      return (plate(P, 338) + `<path d="M${P},336 C${P - 10},330 ${P - 11},322 ${P - 5},321 C${P - 2},320 ${P},323 ${P},324 C${P},323 ${P + 2},320 ${P + 5},321 C${P + 11},322 ${P + 10},330 ${P},336 Z" fill="#e2a64f" stroke="#c2853a" stroke-width=".8"/>` +
        `<path d="M${P - 7},326 L${P + 7},326 M${P - 6},329.5 L${P + 6},329.5 M${P - 2},322 L${P - 2},333 M${P + 2},322 L${P + 2},333" stroke="#c2853a" stroke-width=".7"/>` +
        `<circle cx="${P - 2}" cy="325" r="2.4" fill="#d6283f"/><circle cx="${P + 2.5}" cy="326" r="2.6" fill="#fffaf0"/>`);
    case 'bun':
      return (plate(P, 338) + `<ellipse cx="${P}" cy="332" rx="10" ry="5" fill="#c98a4b"/>` +
        `<path d="M${P},332 m-7,0 a7,3.5 0 1,0 14,0 a5,2.5 0 1,0 -10,0 a3,1.5 0 1,0 6,0" stroke="#8a5528" stroke-width="1.2" fill="none"/>` +
        '<g fill="#fff">' + [[-5, -1], [-1, -3], [3, -1], [6, 1], [-3, 2], [1, 1]].map(([dx, dy]) => `<circle cx="${P + dx}" cy="${330 + dy}" r=".9"/>`).join('') + '</g>');
    case 'flowers':
      return (`<path d="M${P - 6},338 L${P - 8},326 L${P + 8},326 L${P + 6},338 Z" fill="#7fb7d9"/>` +
        ([[-9, '#ff5fa2'], [-3, '#ff8a3d'], [3, '#ffd6e7'], [9, '#d6283f'], [0, '#b06bff']] as const).map(([dx, col]) =>
          `<path d="M${P},327 Q${P + dx * 0.4},316 ${P + dx},${305 + Math.abs(dx) * 0.3}" stroke="#3f8f3f" stroke-width="1.3" fill="none"/>` +
          `<g transform="translate(${P + dx},${305 + Math.abs(dx) * 0.3})">` +
          [0, 1.26, 2.51, 3.77, 5.03].map((a) => `<circle cx="${f1(3 * Math.cos(a))}" cy="${f1(3 * Math.sin(a))}" r="2.4" fill="${col}"/>`).join('') +
          '<circle r="1.6" fill="#ffd23f"/></g>').join(''));
    case 'pie':
      return (plate(P, 338) + `<path d="M${P - 12},336 L${P - 10},331 L${P + 10},331 L${P + 12},336 Z" fill="#c98a4b"/>` +
        `<ellipse cx="${P}" cy="331" rx="10" ry="3" fill="#d2722a"/><ellipse cx="${P}" cy="331" rx="10" ry="3" fill="none" stroke="#e0a660" stroke-width="1.6"/>` +
        `<path d="M${P - 3},329 q3,-5 6,0 Z" fill="#fffaf0"/>`);
    case 'shamrock':
      return (`<path d="M${P - 6},338 L${P - 8},328 L${P + 8},328 L${P + 6},338 Z" fill="#c98a4b"/>` +
        ([[-6, 318], [0, 314], [6, 319]] as const).map(([dx, y]) => `<path d="M${P},328 Q${P + dx * 0.5},${(328 + y) / 2} ${P + dx},${y + 3}" stroke="#2f8a46" stroke-width="1.2" fill="none"/>` +
          `<g transform="translate(${P + dx},${y})" fill="#3fae5a"><circle cx="-2" cy="-1" r="2.2"/><circle cx="2" cy="-1" r="2.2"/><circle cx="0" cy="-3.4" r="2.2"/></g>`).join(''));
    case 'cake':
      return (plate(P, 338) + `<path d="M${P - 13},336 L${P - 13},329 Q${P},312 ${P + 13},329 L${P + 13},336 Z" fill="#7cc48a"/><path d="M${P - 13},329 Q${P},312 ${P + 13},329" stroke="#9edba9" stroke-width="1.2" fill="none"/>` +
        `<circle cx="${P}" cy="319" r="3" fill="#ff8fb3"/><path d="M${P - 2},318 q2,-3 4,0" stroke="#e05a8a" fill="none"/><path d="M${P - 4},321 l-3,1 M${P + 4},321 l3,1" stroke="#3f8f3f" stroke-width="1.2"/>`);
    default:
      return null;
  }
}

/** A Walpurgis Night bonfire with sparks. */
export function bonfire(x = 175, base = 362): Layer {
  const R = new Rng(30);
  const b = [`<ellipse cx="${x}" cy="${base}" rx="70" ry="22" fill="url(#vg)"><animate attributeName="opacity" values=".8;1;.85;1;.8" dur="1.3s" repeatCount="indefinite"/></ellipse>`,
    `<path d="M${x - 20},${base} L${x + 16},${base - 10} M${x + 20},${base} L${x - 14},${base - 10} M${x - 6},${base + 1} L${x + 4},${base - 14}" stroke="#5b3a22" stroke-width="5" stroke-linecap="round"/>`];
  for (const [w, h, col, dur] of [[16, 46, '#ff7a1a', 0.9], [11, 36, '#ffb21a', 0.7], [6, 24, '#fff2a8', 0.55]] as const) {
    const fA = `M${x - w},${base - 6} C${x - w},${base - h * 0.5} ${x - 2},${base - h * 0.7} ${x},${base - h} C${x + 3},${base - h * 0.65} ${x + w},${base - h * 0.45} ${x + w},${base - 6} Z`;
    const fB = `M${x - w},${base - 6} C${x - w + 2},${base - h * 0.55} ${x + 3},${base - h * 0.8} ${x + 2},${base - h - 5} C${x + 5},${base - h * 0.6} ${x + w},${base - h * 0.5} ${x + w},${base - 6} Z`;
    b.push(`<path d="${fA}" fill="${col}"><animate attributeName="d" values="${fA};${fB};${fA}" dur="${dur}s" repeatCount="indefinite"/></path>`);
  }
  for (let i = 0; i < 9; i++) {
    const dx = R.uniform(-18, 18), dur = f1(R.uniform(1.4, 2.4)), bg = f1(R.uniform(0, 2));
    b.push(`<circle cx="${x}" cy="${base - 30}" r="1.3" fill="#ffd27a" opacity="0" data-s="0">` +
      `<animate attributeName="cy" values="${base - 30};${base - 110}" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/>` +
      `<animate attributeName="cx" values="${x};${f0(x + dx)}" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="1;0" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/></circle>`);
  }
  return layer(b.join(''), grad('vg', '#ff9a3c', 0.55));
}

function bunting(pts: [number, number][], colors: string[], size = 9): string {
  const out: string[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
    const n = Math.floor(Math.hypot(x2 - x1, y2 - y1) / (size * 1.4));
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n;
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t + 2;
      const col = colors[out.length % colors.length];
      out.push(`<polygon points="${f1(x - size / 2)},${f1(y)} ${f1(x + size / 2)},${f1(y)} ${f1(x)},${f1(y + size * 1.1)}" fill="${col}">` +
        `<animateTransform attributeName="transform" type="rotate" values="-6 ${f1(x)} ${f1(y)};6 ${f1(x)} ${f1(y)};-6 ${f1(x)} ${f1(y)}" dur="${f1(1.8 + (out.length % 3) * 0.3)}s" repeatCount="indefinite"/></polygon>`);
    }
  }
  const wire = pts.slice(0, -1).map(([x1, y1], k) => `M${x1},${y1 + 2} L${pts[k + 1][0]},${pts[k + 1][1] + 2}`).join(' ');
  return `<path d="${wire}" stroke="#eee" stroke-width=".8"/>` + out.join('');
}

export const BUNTING: Record<string, string[]> = {
  se: ['#006aa7', '#fecc02'], // Swedish national day
  us: ['#b22234', '#ffffff', '#3c3b6e'], // the Fourth of July
  irish: ['#169b62', '#ffffff', '#ff883e'], // St. Patrick's Day
};

/** Bunting along the eaves in the given colours. */
export const pennants = (M: HouseModel, colors: string[] = BUNTING.se): Layer => layer(inHouse(M, M.eaves.map((e) => bunting(e, colors)).join('')));

function lantern(x: number, y: number): string {
  return `<line x1="${x}" y1="${y - 12}" x2="${x}" y2="${y - 8}" stroke="#333" stroke-width=".8"/>` +
    `<circle cx="${x}" cy="${y}" r="20" fill="url(#kg)"><animate attributeName="opacity" values=".7;1;.8;1;.7" dur="2.1s" repeatCount="indefinite"/></circle>` +
    `<circle cx="${x}" cy="${y}" r="9" fill="#ffb347"/><path d="M${x - 9},${y} Q${x},${y - 4} ${x + 9},${y} M${x - 9},${y} Q${x},${y + 4} ${x + 9},${y}" stroke="#e0862a" stroke-width=".6" fill="none"/>` +
    `<circle cx="${x - 3}" cy="${y - 2}" r="1.1" fill="#7a3d0a"/><circle cx="${x + 3}" cy="${y - 2}" r="1.1" fill="#7a3d0a"/>` +
    `<path d="M${x - 4},${y + 2.5} Q${x},${y + 6} ${x + 4},${y + 2.5}" stroke="#7a3d0a" stroke-width="1" fill="none"/>`;
}

/** Crayfish party: moon lanterns strung from the corner of the house. */
export function crayfishParty(M: HouseModel): Layer {
  const [hx, hy] = toScene(M, ...M.deco.lanterns);
  return layer(`<path d="M${f0(hx)},${f0(hy)} Q${f0((hx + 668) / 2)},${f0(hy + 34)} 668,${f0(hy + 6)}" stroke="#333" stroke-width=".9" fill="none"/>` +
    lantern(Math.round(hx + 18), Math.round(hy + 26)) + lantern(Math.round(hx + 42), Math.round(hy + 34)) + lantern(Math.round(hx + 64), Math.round(hy + 26)),
  grad('kg', '#ffc36b', 0.7));
}

/** St. Martin's Day: a goose waddling back and forth. */
export function goose(): Layer {
  const body = '<ellipse cx="0" cy="0" rx="12" ry="7" fill="#f4f4f2"/><path d="M8,-3 Q12,-14 9,-20" stroke="#f4f4f2" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="9.5" cy="-20" r="3.4" fill="#f4f4f2"/><path d="M12,-20.5 L17,-19.5 L12,-18.5 Z" fill="#ff9a1f"/><circle cx="10.5" cy="-21" r=".7" fill="#222"/>' +
    '<path d="M-4,-2 Q-10,-6 -13,-1" stroke="#d6d6d0" stroke-width="1.5" fill="none"/><path d="M-2,6 L-2,11 L-5,12 M3,6 L3,11 L0,12" stroke="#ff9a1f" stroke-width="1.4" fill="none"/>';
  return layer(`<g><g><g>${body}<animateTransform attributeName="transform" type="rotate" values="-4;4;-4" dur=".6s" repeatCount="indefinite"/></g>` +
    '<animateTransform attributeName="transform" type="scale" values="1 1;1 1;-1 1;-1 1;1 1" keyTimes="0;.49;.5;.99;1" dur="16s" repeatCount="indefinite"/></g>' +
    '<animateTransform attributeName="transform" type="translate" values="610 370;750 370;610 370" dur="16s" repeatCount="indefinite"/></g>');
}

export function lucia(M: HouseModel, s = 1.15): Layer {
  const [x, base] = M.deco.lucia;
  const flames = [-4, -2, 0, 2, 4].map((dx) => `<rect x="${dx - 0.7}" y="-33" width="1.4" height="4" fill="#fff"/><ellipse cx="${dx}" cy="-34.5" rx=".9" ry="1.8" fill="#ffd65a">` +
    `<animate attributeName="ry" values="1.8;1.3;2;1.8" dur="${f2(0.9 + Math.abs(dx) * 0.08)}s" repeatCount="indefinite"/></ellipse>`).join('');
  const body = '<circle cx="0" cy="-26" r="22" fill="url(#lu)"/><path d="M-7,0 L-5,-19 Q0,-22 5,-19 L7,0 Z" fill="#fbfbfb"/><path d="M-5.5,-11 L5.5,-11" stroke="#d6283f" stroke-width="1.6"/>' +
    '<path d="M-4,-17 L-6,-8 M4,-17 L6,-8" stroke="#fbfbfb" stroke-width="2.4" stroke-linecap="round"/>' +
    '<rect x="-.6" y="-12" width="1.2" height="4" fill="#fff"/><ellipse cx="0" cy="-13" rx=".7" ry="1.3" fill="#ffd65a"/>' +
    '<path d="M-4.6,-25 Q0,-31 4.6,-25 L5,-18 L-5,-18 Z" fill="#e8c06a"/><circle cx="0" cy="-24" r="4.4" fill="#f1c9a5"/>' +
    '<path d="M-5,-28.5 Q0,-30.5 5,-28.5" stroke="#3f8f3f" stroke-width="1.8" fill="none"/>' + flames;
  return layer(inHouse(M, `<g transform="translate(${x},${base}) scale(${s})">${body}</g>`), grad('lu', '#ffe7a0', 0.6));
}

export function santa(M: HouseModel, s = 1.15): Layer {
  const [x, base] = M.deco.santa;
  const body = '<ellipse cx="0" cy="0" rx="9" ry="2" fill="#000" opacity=".3"/><path d="M8,0 Q16,-2 15,-10 Q13,-17 7,-14 Z" fill="#8a6a45"/>' +
    '<path d="M8,-13 Q10,-16 12,-14" stroke="#5b3a22" fill="none"/><rect x="-4" y="-7" width="3" height="7" fill="#222"/><rect x="1" y="-7" width="3" height="7" fill="#222"/>' +
    '<path d="M-6,-6 L-6,-17 Q0,-21 6,-17 L6,-6 Z" fill="#d6283f"/><rect x="-6" y="-9" width="12" height="2" fill="#222"/>' +
    '<circle cx="0" cy="-23" r="4.5" fill="#f1c9a5"/><path d="M-4.6,-22 Q0,-13 4.6,-22 Q0,-19 -4.6,-22 Z" fill="#fff"/>' +
    '<path d="M-5,-25 Q0,-34 7,-30 L5,-25 Z" fill="#d6283f"/><circle cx="7.5" cy="-30" r="1.8" fill="#fff"/><rect x="-5.5" y="-26" width="11" height="2.2" rx="1" fill="#fff"/>' +
    '<g><path d="M-5,-16 L-11,-21" stroke="#d6283f" stroke-width="3" stroke-linecap="round"/><circle cx="-11.5" cy="-21.5" r="1.5" fill="#fff"/>' +
    '<animateTransform attributeName="transform" type="rotate" values="0 -5 -16;-25 -5 -16;5 -5 -16;-25 -5 -16;0 -5 -16;0 -5 -16" keyTimes="0;.1;.2;.3;.4;1" dur="5s" repeatCount="indefinite"/></g>';
  return layer(inHouse(M, `<g transform="translate(${x},${base}) scale(${s})">${body}</g>`));
}

export function christmasTree(x = 640, base = 352): Layer {
  const b = [`<ellipse cx="${x}" cy="${base}" rx="26" ry="4" fill="#000" opacity=".25"/><rect x="${x - 3}" y="${base - 8}" width="6" height="8" fill="#6b4a2f"/>`];
  ([[32, base - 8, base - 36], [26, base - 28, base - 54], [19, base - 46, base - 72], [11, base - 63, base - 86]] as const).forEach(([w, y0, y1], i) => {
    b.push(`<polygon points="${x - w},${y0} ${x + w},${y0} ${x},${y1}" fill="${['#1f6f3a', '#237a40', '#2a8848', '#2f9450'][i]}"/>` +
      `<polygon points="${x - w},${y0} ${x},${y0} ${x},${y1}" fill="#000" opacity=".12"/>`);
  });
  const lights = [[x - 18, base - 14], [x + 6, base - 18], [x + 20, base - 12], [x - 9, base - 34], [x + 12, base - 36], [x - 3, base - 50],
    [x + 8, base - 56], [x - 8, base - 60], [x + 2, base - 72], [x - 24, base - 11], [x + 14, base - 26], [x - 14, base - 24]];
  lights.forEach(([lx, ly], i) => {
    b.push(`<circle cx="${lx}" cy="${ly}" r="2" fill="${['#fff1b8', '#ff6b6b', '#ffd23f', '#7fd3ff'][i % 4]}">` +
      `<animate attributeName="opacity" values="1;.35;1" dur="${f2(1.2 + (i % 4) * 0.35)}s" begin="${f1((i % 3) * 0.4)}s" repeatCount="indefinite"/></circle>`);
  });
  b.push(`<circle cx="${x}" cy="${base - 89}" r="13" fill="url(#jg)"/><path d="M${x},${base - 95} L${x + 2},${base - 90.5} L${x + 6.5},${base - 90} L${x + 3},${base - 87} L${x + 4},${base - 82.5} L${x},${base - 85} L${x - 4},${base - 82.5} L${x - 3},${base - 87} L${x - 6.5},${base - 90} L${x - 2},${base - 90.5} Z" fill="#ffd23f"/>`);
  return layer(b.join(''), grad('jg', '#fff1a8', 0.7));
}

export function balloons(M: HouseModel): Layer {
  const b = ([[412, 232, '#ff4d6d', 3.2], [428, 222, '#ffd23f', 3.8], [442, 238, '#4dabff', 3.5], [424, 246, '#7dff8a', 4.1]] as const).map(([bx, by, col, dur]) =>
    `<g><path d="M402,304 Q${f0((402 + bx) / 2 + 5)},${f0((304 + by) / 2)} ${bx},${by + 11}" stroke="#ddd" stroke-width=".7" fill="none"/>` +
    `<ellipse cx="${bx}" cy="${by}" rx="7.5" ry="9.5" fill="${col}"/><ellipse cx="${bx - 2.5}" cy="${by - 3.5}" rx="1.8" ry="2.8" fill="#fff" opacity=".45"/>` +
    `<path d="M${bx - 1.5},${by + 9.5} L${bx + 1.5},${by + 9.5} L${bx},${by + 11.5} Z" fill="${col}"/>` +
    `<animateTransform attributeName="transform" type="rotate" values="-3 402 304;3 402 304;-3 402 304" dur="${dur}s" repeatCount="indefinite"/></g>`);
  return layer(inHouse(M, at(M.deco.balloons, VILLA.deco.balloons, b.join(''))));
}

function burst(x: number, y: number, col: string, begin: number, cyc = 4.2): string {
  const rays = Array.from({ length: 16 }, (_, a) => `<line x1="0" y1="0" x2="${f1(30 * Math.cos(a * 0.3927))}" y2="${f1(30 * Math.sin(a * 0.3927))}"/>`).join('');
  const dots = Array.from({ length: 16 }, (_, a) => `<circle cx="${f1(34 * Math.cos(a * 0.3927 + 0.2))}" cy="${f1(34 * Math.sin(a * 0.3927 + 0.2))}" r="2"/>`).join('');
  const kt = '0;.28;.3;.75;1';
  return `<circle cx="${x}" cy="330" r="2" fill="#ffe9b0" opacity="0" data-s="0">` +
    `<animate attributeName="cy" values="330;${y};${y};${y};${y}" keyTimes="${kt}" dur="${cyc}s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="1;1;0;0;0" keyTimes="${kt}" dur="${cyc}s" begin="${begin}s" repeatCount="indefinite"/></circle>` +
    `<g transform="translate(${x},${y})"><g stroke="${col}" fill="${col}" stroke-width="2" stroke-linecap="round" opacity="0">${rays}${dots}` +
    `<animateTransform attributeName="transform" type="scale" values=".01;.01;.2;1;1.1" keyTimes="${kt}" dur="${cyc}s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0;0;1;.5;0" keyTimes="${kt}" dur="${cyc}s" begin="${begin}s" repeatCount="indefinite"/></g></g>`;
}

export const fireworks = (): Layer => layer(burst(140, 80, '#ff5a6e', 0) + burst(300, 50, '#ffd447', 1.3) + burst(560, 60, '#5ad1ff', 2.1) +
  burst(720, 120, '#b06bff', 0.7) + burst(440, 95, '#7dff8a', 3.0) + burst(220, 140, '#ffa04d', 2.6));

/** The mailbox flag is up (something in the calendar today). */
export function mailboxFlag(M: HouseModel): Layer {
  const [mx, mb] = M.mailbox;
  return layer(`<g><rect x="${mx + 6}" y="${mb - 42}" width="2" height="12" fill="#3a3f44"/><path d="M${mx + 8},${mb - 42} L${mx + 16},${mb - 39} L${mx + 8},${mb - 36} Z" fill="#e05a5a"/>` +
    `<animateTransform attributeName="transform" type="rotate" values="-3 ${mx + 7} ${mb - 30};3 ${mx + 7} ${mb - 30};-3 ${mx + 7} ${mb - 30}" dur="2.5s" repeatCount="indefinite"/></g>`);
}

/** Name day: a cake with candles and a little flag on the porch. */
export function nameDay(M: HouseModel): Layer {
  const P = VILLA.deco.treat[0];
  const nam = plate(P, 338) + `<rect x="${P - 11}" y="327" width="22" height="9" rx="2" fill="#fff4e6"/><rect x="${P - 11}" y="331" width="22" height="2" fill="#ff8fb3"/>` +
    ([[-6, '#5aa8ff'], [0, '#ffd23f'], [6, '#ff6b6b']] as const).map(([dx, c]) => `<rect x="${P + dx - 0.7}" y="321" width="1.4" height="6" fill="${c}"/><ellipse cx="${P + dx}" cy="319.6" rx=".9" ry="1.6" fill="#ffd65a"><animate attributeName="ry" values="1.6;1.2;1.8;1.6" dur="${f2(1 + dx * 0.05)}s" repeatCount="indefinite"/></ellipse>`).join('') +
    `<line x1="${P + 9}" y1="327" x2="${P + 9}" y2="316" stroke="#999" stroke-width=".6"/><rect x="${P + 9}" y="316" width="7" height="4.5" fill="#006aa7"/>` +
    `<rect x="${P + 11}" y="316" width="1.2" height="4.5" fill="#fecc02"/><rect x="${P + 9}" y="317.7" width="7" height="1.1" fill="#fecc02"/>`;
  return layer(inHouse(M, at(M.deco.treat, VILLA.deco.treat, nam)));
}

// Minecraft: one blocky figure per player on the server (Steve, Alex, a creeper)
const px = (x: number, y: number, w: number, h: number, c: string): string => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;

function steve(x: number, base: number, shirt: string, hair: string, pants = '#3a3aa0'): string {
  const b = px(-4, -32, 8, 8, '#c99a6b') + px(-4, -32, 8, 2.5, hair) + px(-3, -28.5, 2, 1.2, '#fff') + px(-2, -28.5, 1, 1.2, '#3b4fb3') +
    px(1, -28.5, 2, 1.2, '#fff') + px(2, -28.5, 1, 1.2, '#3b4fb3') + px(-1.5, -26, 3, 1, '#8a5a3a') +
    px(-4, -24, 8, 12, shirt) + px(-4, -12, 4, 12, pants) + px(0, -12, 4, 12, pants) + px(-4, -1.5, 8, 1.5, '#555');
  const arms = `<g>${px(-8, -24, 4, 12, shirt)}${px(-8, -14, 4, 2, '#c99a6b')}<animateTransform attributeName="transform" type="rotate" values="-12 -6 -23;12 -6 -23;-12 -6 -23" dur="1.6s" repeatCount="indefinite"/></g>` +
    `<g>${px(4, -24, 4, 12, shirt)}${px(4, -14, 4, 2, '#c99a6b')}<animateTransform attributeName="transform" type="rotate" values="12 6 -23;-12 6 -23;12 6 -23" dur="1.6s" repeatCount="indefinite"/></g>`;
  return `<g transform="translate(${x},${base}) scale(1.6)"><ellipse cx="0" cy="0" rx="7" ry="1.6" fill="#000" opacity=".3"/>${b}${arms}</g>`;
}

function creeper(x: number, base: number): string {
  const rr = new Rng(9);
  let tex = '';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) tex += px(-4 + i * 2, -34 + j * 2, 2, 2, rr.choice(['#4caf50', '#5cbf5c', '#3d9a41', '#6ccf6c']));
  const face = px(-3, -31, 2, 2, '#111') + px(1, -31, 2, 2, '#111') + px(-1, -29, 2, 3, '#111') + px(-2, -27, 1, 2, '#111') + px(1, -27, 1, 2, '#111');
  let body = '';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 10; j++) body += px(-3 + i * 2, -26 + j * 2, 2, 2, rr.choice(['#4caf50', '#5cbf5c', '#3d9a41']));
  const feet = px(-4, -6, 3, 6, '#3d9a41') + px(1, -6, 3, 6, '#3d9a41');
  const flash = '<rect x="-4" y="-34" width="8" height="34" fill="#fff" opacity="0" data-s="0">' +
    '<animate attributeName="opacity" values="0;0;.7;0;.7;0;0" keyTimes="0;.8;.83;.86;.89;.92;1" dur="12s" repeatCount="indefinite"/></rect>';
  return `<g transform="translate(${x},${base}) scale(1.6)"><ellipse cx="0" cy="0" rx="6" ry="1.5" fill="#000" opacity=".3"/>${body}${feet}${tex}${face}${flash}</g>`;
}

export function minecraft(i: number): Layer {
  if (i === 1) return layer(steve(698, 356, '#2fb5c9', '#4a2f1a'));
  if (i === 2) return layer(steve(726, 358, '#5fae3c', '#d9772e', '#6b4a2f'));
  return layer(creeper(754, 356));
}
