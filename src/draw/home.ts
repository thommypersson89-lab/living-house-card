// The house and the people who live there: lit windows, TV, music notes, smoke, lamps, laundry,
// window glints, figures, silhouettes, frost and snow on the roof. Everything is placed from the
// house model's anchors.
import type { HouseModel, Pane } from '../model/types';
import { H, LAMP, Layer, Rng, W, f0, f1, f2, grad, houseMask, inHouse, layer, shade } from './util';

export const LAMP_COLORS: Record<string, string> = {
  warm: '#ffc46b', neutral: '#ffe3a6', cool: '#eaf3ff', red: '#ff5a4f', orange: '#ff9a3c',
  yellow: '#ffe14d', green: '#5be37a', blue: '#5aa8ff', purple: '#a678ff', pink: '#ff7fc8',
};

const skewPoints = (x0: number, y: number): string => `${x0},${y} ${x0 + 24},${y - 6} ${x0 + 24},${y + 14} ${x0},${y + 20}`;

function lit(p: Pane, col: string, strong: boolean): string {
  const op = strong ? 0.95 : 0.6;
  const { x, y } = p;
  if (p.kind === 'rect') {
    return `<circle cx="${x + 13}" cy="${y + 11}" r="34" fill="url(#wgl)"/>` +
      `<ellipse cx="${x + 13}" cy="${y + 70}" rx="24" ry="6" fill="${col}" opacity="${strong ? 0.18 : 0.1}"/>` +
      `<rect x="${x}" y="${y}" width="26" height="22" fill="${col}" opacity="${op}"/>` +
      `<rect x="${x}" y="${y}" width="4" height="22" fill="#000" opacity=".22"/><rect x="${x + 22}" y="${y}" width="4" height="22" fill="#000" opacity=".22"/>` +
      `<rect x="${x}" y="${y}" width="26" height="22" fill="none" stroke="#fff" stroke-width="2"/>` +
      `<path d="M${x + 13},${y} L${x + 13},${y + 22} M${x},${y + 11} L${x + 26},${y + 11}" stroke="#fff" stroke-width="1.4"/>`;
  }
  if (p.kind === 'skew') {
    const pts = skewPoints(x, y);
    return `<circle cx="${x + 12}" cy="${y + 7}" r="32" fill="url(#wgl)"/>` +
      `<ellipse cx="${x + 18}" cy="${y + 56}" rx="22" ry="5" fill="${col}" opacity="${strong ? 0.16 : 0.08}"/>` +
      `<polygon points="${pts}" fill="${col}" opacity="${op}"/><polygon points="${pts}" fill="none" stroke="#e6ebef" stroke-width="1.6"/>` +
      `<path d="M${x + 12},${y - 3} L${x + 12},${y + 17} M${x},${y + 10} L${x + 24},${y + 4}" stroke="#e6ebef" stroke-width="1.1"/>`;
  }
  return `<circle cx="${x + 6}" cy="${y + 8}" r="22" fill="url(#wgl)"/>` +
    `<rect x="${x}" y="${y}" width="12" height="16" fill="${col}" opacity="${op}" stroke="#fff" stroke-width="1.4"/>` +
    `<path d="M${x + 6},${y} L${x + 6},${y + 16}" stroke="#fff" stroke-width="1"/>`;
}

/** A lit window in the lamp's colour (a name from LAMP_COLORS or #hex) and brightness. */
export function windowLight(M: HouseModel, id: string, color: string, strong: boolean): Layer {
  const col = LAMP_COLORS[color] ?? color;
  return layer(inHouse(M, (M.windows[id] ?? []).map((p) => lit(p, col, strong)).join('')), grad('wgl', col, strong ? 0.55 : 0.3));
}

/** Blue TV flicker in a window. */
export function tv(M: HouseModel, id: string): Layer {
  const out = (M.windows[id] ?? []).map(({ kind, x, y }) => {
    const shape = kind === 'skew' ? `<polygon points="${skewPoints(x, y)}"` : `<rect x="${x}" y="${y}" width="${kind === 'rect' ? 26 : 12}" height="${kind === 'rect' ? 22 : 16}"`;
    const [cx, cy] = kind === 'skew' ? [x + 12, y + 7] : kind === 'rect' ? [x + 13, y + 11] : [x + 6, y + 8];
    const mull = kind === 'skew' ? `<path d="M${x + 12},${y - 3} L${x + 12},${y + 17} M${x},${y + 10} L${x + 24},${y + 4}" stroke="#e6ebef" stroke-width="1.1"/>` : '';
    return `<circle cx="${cx}" cy="${cy}" r="26" fill="url(#tg)"><animate attributeName="opacity" values=".5;.9;.4;.8;.55;1;.45" dur="2.9s" repeatCount="indefinite"/></circle>` +
      `${shape} fill="#7fb2ff"><animate attributeName="fill" values="#7fb2ff;#a7c9ff;#5f8fe0;#c9dcff;#6f9ff0;#7fb2ff" dur="3.3s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values=".7;.95;.6;.9;.75;1;.7" dur="2.9s" repeatCount="indefinite"/>${kind === 'skew' ? '</polygon>' : '</rect>'}${mull}`;
  });
  return layer(inHouse(M, out.join('')), grad('tg', '#8fb8ff', 0.6));
}

// Music notes as shapes (not font glyphs), so they look the same on every screen.
const NOTE1 = '<ellipse cx="0" cy="0" rx="3.2" ry="2.3" transform="rotate(-20)"/><rect x="2.3" y="-11" width="1.1" height="11"/><path d="M3.4,-11 q4,3 2.5,7 q.6,-3.5 -2.5,-4.6 Z"/>';
const NOTE2 = '<ellipse cx="0" cy="0" rx="3" ry="2.1" transform="rotate(-20)"/><ellipse cx="8" cy="-2" rx="3" ry="2.1" transform="rotate(-20 8 -2)"/>' +
  '<rect x="2.2" y="-11" width="1" height="11"/><rect x="10.2" y="-13" width="1" height="11"/><path d="M2.2,-11 L11.2,-13 L11.2,-10.6 L2.2,-8.6 Z"/>';
const NOTE_SEED: Record<string, number> = { door: 1, side_left: 2, gable: 3, roof: 4 };

/** Music notes rising from a spot: 'door', 'roof' or a window id. */
export function music(M: HouseModel, spot: string): Layer {
  const [x, y] = M.spots[spot] ?? M.spots.door;
  const rr = new Rng(NOTE_SEED[spot] ?? 5 + Object.keys(M.spots).indexOf(spot));
  const out = [NOTE1, NOTE2, NOTE1].map((g, i) => {
    const dx = rr.uniform(-8, 10);
    return `<g opacity="0"><g transform="translate(${f0(x + dx)},${y})"><g fill="#ffe08a" stroke="#7a5a10" stroke-width=".4">${g}</g>` +
      `<animateTransform attributeName="transform" type="translate" values="${f0(x + dx)} ${y};${f0(x + dx)} ${y - 55}" dur="3.6s" begin="${f1(i * 1.2)}s" repeatCount="indefinite"/></g>` +
      `<animate attributeName="opacity" values="0;1;1;0" dur="3.6s" begin="${f1(i * 1.2)}s" repeatCount="indefinite"/></g>`;
  });
  return layer(inHouse(M, out.join('')));
}

/** Chimney smoke: level 1 thin (cold outside / low power), 2 more, 3 a lot. d = wind direction ±1. */
export function smoke(M: HouseModel, lvl: number, d: number): Layer {
  const [cx, cy] = M.chimney;
  const spec: Record<number, [number, number, number, number, string]> = {
    1: [2, 9, 0.45, 5.5, '#e3e7ea'], 2: [4, 14, 0.7, 4, '#d9dee3'], 3: [6, 19, 0.85, 3.2, '#c5ccd2'],
  };
  const [n, rmax, op, dur, col] = spec[lvl] ?? spec[1];
  const b: string[] = [];
  for (let i = 0; i < n; i++) {
    const bg = f2((i * dur) / n);
    b.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="${col}" opacity="0">` +
      `<animate attributeName="cy" from="${cy}" to="${cy - 60 - lvl * 12}" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/>` +
      `<animate attributeName="r" from="3.5" to="${rmax}" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/>` +
      `<animate attributeName="cx" values="${cx};${cx + 6 * d};${cx + (18 + lvl * 6) * d}" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0;${op};${f2(op * 0.45)};0" dur="${dur}s" begin="${bg}s" repeatCount="indefinite"/></circle>`);
  }
  return layer(inHouse(M, b.join('')));
}

export function porchLamp(M: HouseModel): Layer {
  const [px, py] = M.porchLamp;
  return layer(inHouse(M, `<circle cx="${px}" cy="${py}" r="26" fill="url(#dg)"/><rect x="${px - 1.4}" y="${py - 2.6}" width="2.8" height="3.6" fill="#fff3c4"/>` +
    `<ellipse cx="${px - 12}" cy="${M.people.base - 3}" rx="22" ry="5" fill="#ffd27a" opacity=".2"/>`), grad('dg', '#ffd27a', 0.7));
}

export function streetLamp(): Layer {
  const [lx, lb] = LAMP;
  return layer(`<path d="M${lx - 4},${lb - 80} L${lx - 40},${lb + 6} L${lx + 40},${lb + 6} L${lx + 4},${lb - 80} Z" fill="url(#lc)"/>` +
    `<circle cx="${lx}" cy="${lb - 82}" r="22" fill="url(#lg2)"/><rect x="${lx - 4.5}" y="${lb - 86}" width="9" height="8" fill="#fff1c2"/>`,
  grad('lg2', '#ffe7a0', 0.8) + '<linearGradient id="lc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a0" stop-opacity=".35"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/></linearGradient>');
}

/** The washing machine is running: soap bubbles from a window. */
export function bubbles(M: HouseModel, id: string): Layer {
  const p = (M.windows[id] ?? Object.values(M.windows)[0])[0];
  const [px, py] = p.kind === 'skew' ? [p.x + 12, p.y + 4] : p.kind === 'rect' ? [p.x + 13, p.y + 4] : [p.x + 6, p.y + 2];
  const R = new Rng(55);
  const b: string[] = [];
  for (let i = 0; i < 10; i++) {
    const x0 = px + R.uniform(-6, 6);
    const dur = R.uniform(4, 7), bg = R.uniform(0, 5), r = R.uniform(2.5, 5);
    b.push(`<g opacity="0"><circle cx="0" cy="0" r="${f1(r)}" fill="#dff3ff" fill-opacity=".25" stroke="#fff" stroke-opacity=".8" stroke-width=".8"/>` +
      `<circle cx="${f1(-r * 0.35)}" cy="${f1(-r * 0.35)}" r="${f1(r * 0.25)}" fill="#fff" opacity=".8"/>` +
      `<animateTransform attributeName="transform" type="translate" values="${f0(x0)} ${py};${f0(x0 + R.uniform(10, 40))} ${py - 36};${f0(x0 + R.uniform(30, 80))} ${py - 86}" dur="${f1(dur)}s" begin="${f1(bg)}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0;1;1;0" dur="${f1(dur)}s" begin="${f1(bg)}s" repeatCount="indefinite"/></g>`);
  }
  return layer(inHouse(M, b.join('')));
}

/** Sun glint: a reflection sweeps across the glass (side = west, front = north; we look south). */
export function glint(M: HouseModel, side: 'side' | 'front'): Layer {
  const panes = Object.values(M.windows).flat().filter((p) => (side === 'side' ? p.kind === 'skew' : p.kind === 'rect'));
  const shapes = panes.map(({ kind, x, y }) => (kind === 'skew' ? `<polygon points="${skewPoints(x, y)}"/>` : `<rect x="${x}" y="${y}" width="26" height="22"/>`)).join('');
  const [x0, x1] = M.glint[side];
  const band = '<g clip-path="url(#gc)"><g><polygon points="0,250 10,250 -6,292 -16,292" fill="#fff" opacity=".8"/>' +
    '<polygon points="14,250 18,250 2,292 -2,292" fill="#fff" opacity=".6"/>' +
    `<animateTransform attributeName="transform" type="translate" values="${x0 - 20} 0;${x1 + 20} 0;${x1 + 20} 0" keyTimes="0;.25;1" dur="7s" repeatCount="indefinite"/></g></g>`;
  return layer(inHouse(M, `<clipPath id="gc">${shapes}</clipPath>${band}`));
}

/** Friday night in: a popcorn bowl and lit candles in the first front window. */
export function fridayCosy(M: HouseModel): Layer {
  const { x: fx, y: fy } = M.windows.front[0];
  const pop = [[0, 0], [2.5, -1.2], [5, 0], [1.2, -2.4], [3.8, -2.6], [6.5, -1]]
    .map(([dx, dy]) => `<circle cx="${fx + 6 + dx}" cy="${fy + 16 + dy}" r="1.6" fill="#fff6d8"/>`).join('');
  const cand = [17, 21].map((cx) => `<rect x="${fx + cx - 0.8}" y="${fy + 14}" width="1.6" height="6" fill="#f4efe0"/><ellipse cx="${fx + cx}" cy="${fy + 12.5}" rx="1" ry="1.8" fill="#ffd65a">` +
    `<animate attributeName="ry" values="1.8;1.3;2;1.6;1.8" dur="${f2(1 + cx * 0.03)}s" repeatCount="indefinite"/></ellipse>`).join('');
  return layer(inHouse(M, `<circle cx="${fx + 14}" cy="${fy + 14}" r="14" fill="url(#fm)"/>${pop}<path d="M${fx + 4},${fy + 16} Q${fx + 9.5},${fy + 22} ${fx + 15},${fy + 16} Z" fill="#d6283f"/>` +
    `<rect x="${fx + 4}" y="${fy + 16}" width="11" height="1" fill="#fff"/>${cand}`), grad('fm', '#ffd27a', 0.55));
}

/** Snow on the roof, with icicles. */
export const snowRoof = (M: HouseModel): Layer => layer(inHouse(M, M.snowRoof));

/** Hoarfrost and icicles below 0 °C. */
export function frost(M: HouseModel): Layer {
  const R = new Rng(13);
  const b = [M.frostRoof];
  const { x: ix, y: iy, dx, dy, n } = M.icicles;
  for (let i = 0; i < n; i++) {
    const x = ix + i * dx, y = iy + i * dy, L = 4 + ((i * 7) % 6);
    b.push(`<path d="M${f1(x - 1.6)},${f1(y)} L${f1(x + 1.6)},${f1(y)} L${f1(x)},${f1(y + L)} Z" fill="#e8f6ff" opacity=".9"/>`);
  }
  const panes = Object.values(M.windows).flat();
  for (const { x: wx, y: wy } of panes.filter((p) => p.kind === 'rect')) {
    b.push(`<path d="M${wx},${wy + 22} L${wx},${wy + 14} Q${wx + 3},${wy + 19} ${wx + 8},${wy + 22} Z M${wx + 26},${wy + 22} L${wx + 26},${wy + 15} Q${wx + 22},${wy + 19} ${wx + 18},${wy + 22} Z" fill="#eaf6ff" opacity=".7"/>`);
  }
  for (const { x: wx, y: wy } of panes.filter((p) => p.kind === 'skew')) b.push(`<path d="M${wx},${wy + 20} L${wx},${wy + 13} Q${wx + 3},${wy + 17} ${wx + 7},${wy + 19} Z" fill="#eaf6ff" opacity=".7"/>`);
  const g = [`<path d="M0,318 C180,296 300,300 400,302 C520,304 640,294 ${W},312 L${W},336 C640,318 520,326 400,324 C300,322 180,320 0,340 Z" fill="#dbe9f2" opacity=".28"/>`];
  for (let i = 0; i < 22; i++) {
    const x = R.uniform(5, W - 5);
    const y = 318 - 20 * (1 - ((x - 400) / 400) ** 2) * 0.3 + R.uniform(2, 9);
    g.push(`<path d="M${f1(x - 2)},${f1(y)} L${f1(x + 2)},${f1(y)} M${f1(x)},${f1(y - 2)} L${f1(x)},${f1(y + 2)}" stroke="#cfe8ff" stroke-width=".8" opacity=".35">` +
      `<animate attributeName="opacity" values=".2;.6;.2" dur="${f1(R.uniform(3, 5))}s" repeatCount="indefinite"/></path>`);
  }
  return layer(`<g mask="url(#hm)">${g.join('')}</g>` + inHouse(M, b.join('')), houseMask(M));
}

export type Clothes = 'normal' | 'cold' | 'rain' | 'warm';

export interface PersonLook {
  jacket: string;
  hair: string;
  hat: string;
  umbrella: string;
  longHair: boolean;
  summerTop: string;
  summerLegs: string;
  waveEvery: number;
}

/** Built-in looks; people without their own `look` take these in order. */
export const LOOKS: PersonLook[] = [
  { jacket: '#3d7ac7', hair: '#5a3d22', hat: '#2b3f5c', umbrella: '#2b6cb0', longHair: false, summerTop: '#f2f2f2', summerLegs: '#3a5f8a', waveEvery: 9 },
  { jacket: '#d9577a', hair: '#2c1d14', hat: '#b23a5a', umbrella: '#e05a8a', longHair: true, summerTop: '#ffd23f', summerLegs: '#2b3440', waveEvery: 11 },
  { jacket: '#4f9a5a', hair: '#8a5a2a', hat: '#2f5a37', umbrella: '#3f8f5a', longHair: false, summerTop: '#ffffff', summerLegs: '#2b3440', waveEvery: 10 },
  { jacket: '#9a6bd1', hair: '#d9a441', hat: '#5b3f8a', umbrella: '#8a5ad1', longHair: true, summerTop: '#7fd3ff', summerLegs: '#2b3440', waveEvery: 12 },
];

/** A figure by the door, dressed for the weather: normal, cold (beanie + scarf), rain (umbrella), warm (t-shirt + sunglasses). */
export function person(M: HouseModel, L: PersonLook, x: number, clothes: Clothes): Layer {
  const b = M.people.base;
  let top = clothes === 'warm' ? L.summerTop : L.jacket;
  if (clothes === 'cold') top = shade(L.jacket, 0.8);
  const hairSvg = L.longHair
    ? `<path d="M${x - 5},${b - 27} Q${x},${b - 35} ${x + 5},${b - 27} L${x + 5.5},${b - 19} L${x + 3},${b - 22} L${x - 3},${b - 22} L${x - 5.5},${b - 19} Z" fill="${L.hair}"/>`
    : `<path d="M${x - 4.6},${b - 27} Q${x},${b - 34} ${x + 4.6},${b - 27} Z" fill="${L.hair}"/>`;
  let face = `<circle cx="${x}" cy="${b - 25}" r="4.6" fill="#f1c9a5"/>${hairSvg}`;
  let extra = '';
  if (clothes === 'cold') { // beanie with a pompom and a scarf
    face += `<path d="M${x - 5},${b - 26} Q${x},${b - 35} ${x + 5},${b - 26} Z" fill="${L.hat}"/><rect x="${x - 5.2}" y="${b - 27}" width="10.4" height="2.2" rx="1" fill="${shade(L.hat, 1.4)}"/>` +
      `<circle cx="${x}" cy="${b - 32.5}" r="1.8" fill="#fff"/>`;
    extra = `<rect x="${x - 4.5}" y="${b - 21}" width="9" height="2.6" rx="1.2" fill="#d6283f"/>` +
      `<rect x="${x + 1.5}" y="${b - 19.5}" width="2.4" height="6" fill="#d6283f"/>`;
  }
  if (clothes === 'warm') { // sunglasses
    face += `<rect x="${x - 4}" y="${b - 26.2}" width="3.4" height="2" rx=".8" fill="#111"/><rect x="${x + 0.6}" y="${b - 26.2}" width="3.4" height="2" rx=".8" fill="#111"/><path d="M${x - 0.6},${b - 25.4} L${x + 0.6},${b - 25.4}" stroke="#111" stroke-width=".6"/>`;
  }
  const sleeve = clothes === 'warm' ? '#f1c9a5' : top;
  let arm: string;
  if (clothes === 'rain') { // holds an umbrella in the right hand, swaying slightly
    arm = `<g><path d="M${x + 4},${b - 19} L${x + 7},${b - 23}" stroke="${sleeve}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M${x + 7},${b - 23} L${x + 7},${b - 40}" stroke="#333" stroke-width="1"/>` +
      `<path d="M${x - 6},${b - 38} Q${x + 7},${b - 54} ${x + 20},${b - 38} Q${x + 16.75},${b - 41} ${x + 13.5},${b - 38} Q${x + 10.25},${b - 41} ${x + 7},${b - 38} Q${x + 3.75},${b - 41} ${x + 0.5},${b - 38} Q${x - 2.75},${b - 41} ${x - 6},${b - 38} Z" fill="${L.umbrella}"/>` +
      `<path d="M${x + 7},${b - 23} q0,3 -2,3" stroke="#333" stroke-width="1" fill="none"/>` +
      `<animateTransform attributeName="transform" type="rotate" values="-3 ${x + 7} ${b - 23};3 ${x + 7} ${b - 23};-3 ${x + 7} ${b - 23}" dur="3s" repeatCount="indefinite"/></g>`;
  } else { // waves now and then
    arm = `<g><path d="M${x + 4},${b - 19} L${x + 10},${b - 24}" stroke="${sleeve}" stroke-width="3" stroke-linecap="round"/>` +
      `<animateTransform attributeName="transform" type="rotate" values="0 ${x + 4} ${b - 19};0 ${x + 4} ${b - 19};-35 ${x + 4} ${b - 19};5 ${x + 4} ${b - 19};-35 ${x + 4} ${b - 19};0 ${x + 4} ${b - 19}" ` +
      `keyTimes="0;.7;.76;.82;.88;1" dur="${L.waveEvery}s" repeatCount="indefinite"/></g>`;
  }
  const legs = clothes === 'warm' ? L.summerLegs : '#2b3440';
  const body = `<ellipse cx="${x}" cy="${b}" rx="7" ry="2" fill="#000" opacity=".35"/>` +
    `<rect x="${x - 3.5}" y="${b - 9}" width="3" height="9" fill="${legs}"/><rect x="${x + 0.5}" y="${b - 9}" width="3" height="9" fill="${legs}"/>` +
    (clothes === 'cold' || clothes === 'rain' ? `<rect x="${x - 3.5}" y="${b - 2}" width="3" height="2" fill="#2a2a2a"/><rect x="${x + 0.5}" y="${b - 2}" width="3" height="2" fill="#2a2a2a"/>` : '') +
    `<path d="M${x - 5},${b - 8} L${x - 5},${b - 18} Q${x},${b - 22} ${x + 5},${b - 18} L${x + 5},${b - 8} Z" fill="${top}"/>` +
    `<path d="M${x - 4},${b - 18} L${x - 7},${b - 11}" stroke="${sleeve}" stroke-width="3" stroke-linecap="round"/>${arm}${face}${extra}`;
  return layer(inHouse(M, `<g transform="translate(${x},${b}) scale(1.15) translate(${-x},${-b})">${body}</g>`));
}

/** At night people are inside, seen as silhouettes in a lit front window. */
export function silhouette(M: HouseModel, pane: number, longHair: boolean): Layer {
  const { x: wx, y: wy } = M.windows.front[pane];
  const x = wx + 13, y = wy + 9;
  const hair = longHair ? `<path d="M${x - 4.8},${y - 3} Q${x},${y - 11} ${x + 4.8},${y - 3} L${x + 5.2},${y + 5} L${x - 5.2},${y + 5} Z"/>`
    : `<path d="M${x - 4.6},${y - 2} Q${x},${y - 10} ${x + 4.6},${y - 2} Z"/>`;
  const fig = `<g fill="#2b2118" opacity=".78"><circle cx="${x}" cy="${y}" r="4.4"/>${hair}` +
    `<path d="M${x - 7},${y + 16} Q${x - 7},${y + 6} ${x},${y + 5.5} Q${x + 7},${y + 6} ${x + 7},${y + 16} Z"/></g>`;
  return layer(inHouse(M, `<clipPath id="w${pane}"><rect x="${wx}" y="${wy}" width="26" height="22"/></clipPath><g clip-path="url(#w${pane})">${fig}</g>`));
}

/** Night mode: dims the whole card. */
export const nightDim = (): Layer => layer(`<rect width="${W}" height="${H}" fill="#000" opacity=".42"/>`);
