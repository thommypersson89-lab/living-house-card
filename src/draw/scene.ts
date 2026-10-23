// The fixed parts of the scene: sky, ground, the house, trees and clouds.
import type { HouseColors, HouseModel, Look } from '../model/types';
import { CLOUD_POS, GROUND, H, Layer, Rng, TREES, W, f0, f1, fgMask, inHouse, layer, seedOf, shade, toScene } from './util';


// weather state -> (clouds, dark clouds, rain, snow, fog, thunder, wind, sun/moon visible, overcast sky)
type Props = [number, boolean, number, number, boolean, boolean, boolean, boolean, boolean];
export const P: Record<string, Props> = {
  sunny: [0, false, 0, 0, false, false, false, true, false],
  'clear-night': [0, false, 0, 0, false, false, false, true, false],
  partlycloudy: [2, false, 0, 0, false, false, false, true, false],
  cloudy: [4, false, 0, 0, false, false, false, false, true],
  rainy: [4, true, 1, 0, false, false, false, false, true],
  pouring: [5, true, 2, 0, false, false, false, false, true],
  snowy: [4, false, 0, 1, false, false, false, false, true],
  'snowy-rainy': [4, true, 1, 1, false, false, false, false, true],
  hail: [4, true, 1, 1, false, false, false, false, true],
  fog: [1, false, 0, 0, true, false, false, false, true],
  lightning: [4, true, 0, 0, false, true, false, false, true],
  'lightning-rainy': [5, true, 2, 0, false, true, false, false, true],
  windy: [2, false, 0, 0, false, false, true, true, false],
  'windy-variant': [3, false, 0, 0, false, false, true, false, true],
  exceptional: [5, true, 2, 0, false, true, true, false, true],
};
export const WEATHERS = Object.keys(P);

const TREE_COLS = ['#d9822b', '#c8692a', '#e08a2e', '#c26a2a', '#b85f27'];
const SUMMER: Record<string, string> = { '#d9822b': '#3f9b4f', '#c8692a': '#2f8a46', '#e08a2e': '#4aa85a', '#c26a2a': '#33914a', '#b85f27': '#2c7f41' };
const SPRING: Record<string, string> = { '#3f9b4f': '#86c96b', '#2f8a46': '#79bf61', '#4aa85a': '#8fd072', '#33914a': '#7cc364', '#2c7f41': '#70b85a' };

const GROUND_COL: Record<Look, [string, string]> = {
  spring: ['#5f8f43', '#3d6a2c'],
  summer: ['#4a8a3a', '#2f6228'],
  autumn: ['#7a7038', '#4b4626'],
  winter: ['#eef3f7', '#c9d4dc'],
  winterbar: ['#7f8a68', '#55604a'], // a southern-Swedish winter: pale, frozen lawn
};

function ground(M: HouseModel, season: Look, night: boolean, overcast: boolean, rnd: Rng): string {
  let [top, bot] = GROUND_COL[season];
  const f = night ? 0.32 : overcast ? 0.8 : 1;
  if (season === 'winter' && night) [top, bot] = ['#8d9eae', '#5d6c7a'];
  else if (f !== 1) [top, bot] = [shade(top, f), shade(bot, f)];
  const s = [
    `<linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`,
    `<path d="${GROUND}" fill="url(#gr)"/>`,
    // a hill behind for depth
    '<path d="M0,318 C120,300 220,304 300,308 L300,320 L0,328 Z" fill="#000" opacity=".06"/>',
  ];
  if (season !== 'winter') {
    const tuft = shade(top, 0.8);
    for (let i = 0; i < 60; i++) {
      const x = f0(rnd.uniform(0, W)), y = f0(rnd.uniform(330, 415));
      s.push(`<path d="M${x},${y} l-2,-6 M${x},${y} l0,-7 M${x},${y} l2,-6" stroke="${tuft}" stroke-width="1.2" opacity=".7"/>`);
    }
  }
  if (season === 'summer') {
    for (let i = 0; i < 26; i++) {
      const x = rnd.uniform(10, W - 10), y = rnd.uniform(334, 410);
      const c = rnd.choice(['#fff', '#ffd23f', '#ff8fb3', '#b9a2ff']);
      s.push(`<circle cx="${f0(x)}" cy="${f0(y)}" r="1.8" fill="${c}" opacity="${night ? 0.5 : 0.95}"/>`);
    }
  }
  if (season === 'autumn') {
    for (const [cx, cy] of [[120, 352], [640, 360], [300, 372]]) { // leaf piles
      for (let i = 0; i < 14; i++) {
        const x = f0(cx + rnd.uniform(-18, 18)), y = f0(cy + rnd.uniform(-5, 5));
        const c = rnd.choice(['#d9822b', '#c8692a', '#e8a33c', '#a8552a']);
        s.push(`<ellipse cx="${x}" cy="${y}" rx="4" ry="2" fill="${night ? shade(c, 0.5) : c}" transform="rotate(${f0(rnd.uniform(0, 180))} ${x} ${y})"/>`);
      }
    }
  }
  if (season === 'spring') {
    for (let i = 0; i < 14; i++) {
      const x = f0(rnd.uniform(10, W - 10)), y = rnd.uniform(336, 410);
      s.push(`<path d="M${x},${f0(y)} q-1,-4 0,-7" stroke="#3f8f3f" stroke-width="1"/><ellipse cx="${x}" cy="${f0(y - 7)}" rx="1.6" ry="2.4" fill="#fff"/>`);
    }
  }
  // stone path from the steps
  const [sx, sy] = toScene(M, ...M.pathStart);
  for (let i = 0; i < 6; i++) {
    const y = sy + 8 + i * 12;
    const w = 9 + i * 2.2;
    s.push(`<ellipse cx="${f0(sx + (i % 2) * 6 - 3)}" cy="${f0(y)}" rx="${f0(w)}" ry="${f1(3 + i * 0.6)}" fill="${night ? '#4a5056' : '#8f969c'}" opacity=".9"/>`);
  }
  return s.join('');
}

/** Window glass, frames, mullions, sills and curtains for every pane of the model. */
export function glassPanes(M: HouseModel, night: boolean, c: HouseColors): string {
  const winc = night ? '#2a3846' : '#9ec9e6';
  const s = [`<linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${night ? winc : shade(winc, 1.15)}"/>` +
    `<stop offset=".5" stop-color="${winc}"/><stop offset="1" stop-color="${shade(winc, 0.8)}"/></linearGradient>`];
  const curtain = c.curtains ? (night ? shade(c.curtains, 0.55) : c.curtains) : night ? '#6b4740' : '#c97b6b';
  const panes = Object.values(M.windows).flat();
  for (const { kind, x, y } of panes.filter((p) => p.kind === 'rect')) {
    s.push(
      `<rect x="${x}" y="${y}" width="26" height="22" fill="url(#wg)"/>` +
        `<rect x="${x}" y="${y}" width="4" height="22" fill="${curtain}" opacity=".85"/><rect x="${x + 22}" y="${y}" width="4" height="22" fill="${curtain}" opacity=".85"/>` +
        `<rect x="${x}" y="${y}" width="26" height="22" fill="none" stroke="#fff" stroke-width="2"/>` +
        `<path d="M${x + 13},${y} L${x + 13},${y + 22} M${x},${y + 11} L${x + 26},${y + 11}" stroke="#fff" stroke-width="1.4"/>` +
        `<rect x="${x - 2}" y="${y + 22}" width="30" height="2.5" fill="#d7dde2"/>`,
    );
    void kind;
  }
  for (const { x: x0, y } of panes.filter((p) => p.kind === 'skew')) {
    s.push(
      `<polygon points="${x0},${y} ${x0 + 24},${y - 6} ${x0 + 24},${y + 14} ${x0},${y + 20}" fill="url(#wg)"/>` +
        `<polygon points="${x0},${y} ${x0 + 24},${y - 6} ${x0 + 24},${y + 14} ${x0},${y + 20}" fill="none" stroke="#e6ebef" stroke-width="1.6"/>` +
        `<path d="M${x0 + 12},${y - 3} L${x0 + 12},${y + 17} M${x0},${y + 10} L${x0 + 24},${y + 4}" stroke="#e6ebef" stroke-width="1.1"/>`,
    );
  }
  for (const { x: gx, y: gy } of panes.filter((p) => p.kind === 'small')) {
    s.push(`<rect x="${gx}" y="${gy}" width="12" height="16" fill="url(#wg)" stroke="#fff" stroke-width="1.4"/>` +
      `<path d="M${gx + 6},${gy} L${gx + 6},${gy + 16}" stroke="#fff" stroke-width="1"/>`);
  }
  return s.join('');
}

/** The static base: sky, ground, house, street lamp, bushes, mailbox. Clouds and trees are separate layers. */
export function base(M: HouseModel, season: Look, state: string, night: boolean, colors: HouseColors = {}): Layer {
  const [, dark, , snow, , , wind, , overcast] = P[state] ?? P.cloudy;
  const rnd = new Rng(seedOf(state + season));
  let sky: [string, string];
  if (night) sky = overcast ? ['#151e27', '#2a3640'] : ['#0b1d30', '#1d3a55'];
  else {
    sky = overcast ? ['#7f93a3', '#c3ccd3'] : ['#4f9fdc', '#c4e6f7'];
    if (dark) sky = ['#5d6c78', '#9aa6ae'];
  }
  const s = [
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>`,
  ];
  if (night && !overcast) {
    for (let i = 0; i < 45; i++) {
      const x = rnd.uniform(0, W), y = rnd.uniform(0, 200), r = rnd.uniform(0.6, 1.6);
      s.push(`<circle cx="${f0(x)}" cy="${f0(y)}" r="${f1(r)}" fill="#fff" opacity="${rnd.uniform(0.4, 0.9).toFixed(2)}"/>`);
    }
  }
  s.push(ground(M, season, night, overcast, rnd));
  s.push(`<ellipse cx="${M.groundShadow[0]}" cy="${M.groundShadow[1]}" rx="${M.groundShadow[2]}" ry="14" fill="#000" opacity=".22"/>`);
  // street lamp (switched off; the light is its own layer)
  const [lx, lb] = M.lamp;
  s.push(
    `<rect x="${lx - 2}" y="${lb - 78}" width="4" height="78" fill="#2f3438"/><rect x="${lx - 5}" y="${lb - 4}" width="10" height="4" fill="#2f3438"/>` +
      `<path d="M${lx - 7},${lb - 78} L${lx + 7},${lb - 78} L${lx + 4},${lb - 88} L${lx - 4},${lb - 88} Z" fill="#2f3438"/><rect x="${lx - 4.5}" y="${lb - 86}" width="9" height="8" fill="${night ? '#5a646c' : '#c9d2d8'}"/>`,
  );
  // bushes at the house corners
  for (const bx of M.bushes) {
    for (const [dx, r] of [[-8, 8], [0, 11], [9, 8]]) {
      const c = season === 'winter' || season === 'winterbar' ? '#4e6b55' : '#2f6a35';
      s.push(`<circle cx="${bx + dx}" cy="${f0(326 - r * 0.6)}" r="${r}" fill="${night ? shade(c, 0.55) : c}"/>`);
    }
  }
  // mailbox (flag down)
  const [mx, mb] = M.mailbox;
  s.push(
    `<rect x="${mx - 1.5}" y="${mb - 22}" width="3" height="22" fill="#3a3f44"/><rect x="${mx - 8}" y="${mb - 32}" width="16" height="11" rx="5" fill="#2b6cb0"/>` +
      `<rect x="${mx + 4}" y="${mb - 27}" width="7" height="2" fill="#e05a5a"/>`,
  );
  if (season === 'winter' || snow) {
    s.push(`<path d="M0,318 C180,296 300,300 400,302 C520,304 640,294 ${W},312 L${W},322 C640,306 520,314 400,312 C300,310 180,306 0,328 Z" fill="#f4f8fb" opacity=".9"/>`);
  }
  s.push(inHouse(M, M.body(night, season, colors, glassPanes(M, night, colors))));
  if (wind) {
    for (const y of [150, 190, 230]) {
      s.push(`<path d="M60,${y} C160,${y - 14} 220,${y + 14} 320,${y}" stroke="#ffffff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    }
  }
  return layer(s.join(''));
}

function tree(x: number, b: number, h: number, idx: number, season: Look, rnd: Rng, amp: number, night: boolean, speed = 1): string {
  let col = TREE_COLS[idx];
  const trunk = '#6b4a2f';
  let t: string;
  if (season === 'winter' || season === 'winterbar') {
    t = `<path d="M${x},${b} L${x},${b - h}" stroke="#5b4632" stroke-width="5" stroke-linecap="round"/>`;
    for (const [f, d, l] of [[0.45, -1, 0.32], [0.6, 1, 0.3], [0.75, -1, 0.24], [0.85, 1, 0.18]]) {
      const y = b - h * f;
      t += `<path d="M${x},${y} L${x + d * h * l * 0.7},${y - h * l * 0.6}" stroke="#5b4632" stroke-width="3" stroke-linecap="round"/>`;
      if (season === 'winter') t += `<circle cx="${f1(x + d * h * l * 0.6)}" cy="${f1(y - h * l * 0.55)}" r="3" fill="#f4f8fb"/>`;
    }
  } else {
    if (season === 'summer' || season === 'spring') {
      col = SUMMER[col];
      if (season === 'spring') col = SPRING[col];
    }
    if (night) col = shade(col, 0.55);
    const w = h * 0.42;
    t =
      `<rect x="${x - 3}" y="${b - h * 0.25}" width="6" height="${h * 0.27}" fill="${night ? shade(trunk, 0.6) : trunk}"/>` +
      `<path d="M${x},${b - h} C${x + w},${b - h * 0.62} ${x + w * 0.9},${b - h * 0.18} ${x},${b - h * 0.2} ` +
      `C${x - w * 0.9},${b - h * 0.18} ${x - w},${b - h * 0.62} ${x},${b - h} Z" fill="${col}"/>` +
      // a light side and a shadow side give volume
      `<path d="M${x},${b - h} C${x - w},${b - h * 0.62} ${x - w * 0.9},${b - h * 0.18} ${x},${b - h * 0.2} Z" fill="#fff" opacity=".08"/>` +
      `<path d="M${x},${b - h * 0.95} L${x},${b - h * 0.25}" stroke="#00000022" stroke-width="2"/>`;
    if (season === 'spring') {
      for (let i = 0; i < 7; i++) {
        t += `<circle cx="${f1(x + rnd.uniform(-w * 0.55, w * 0.55))}" cy="${f1(b - h * rnd.uniform(0.35, 0.85))}" r="3" fill="#f6b8d1"/>`;
      }
    }
  }
  if (amp) {
    const d = amp * (season === 'winter' || season === 'winterbar' ? 0.7 : 1);
    t = `<g>${t}<animateTransform attributeName="transform" type="rotate" ` +
      `values="${f1(-d * 0.6)} ${x} ${b};${f1(d)} ${x} ${b};${f1(-d * 0.6)} ${x} ${b}" dur="${f1((4.2 + idx * 0.6) * speed)}s" repeatCount="indefinite"/></g>`;
  }
  return t;
}

// Trees: season x day/night x wind strength (still = frozen)
export const SWAY: Record<string, [number, number]> = { calm: [0.7, 1.0], moderate: [2.0, 1.0], strong: [4.5, 0.55], still: [0, 1] };

export function trees(season: Look, night: boolean, strength: string): Layer {
  const [amp, speed] = SWAY[strength] ?? SWAY.calm;
  const rnd = new Rng(seedOf(season));
  return layer(TREES.map(([x, b, h, idx]) => tree(x, b, h, idx, season, rnd, amp, night, speed)).join(''));
}

export function cloud(x: number, y: number, s: number, fill: string, op: number): string {
  const c = [[0, 0, 30], [32, -14, 38], [70, 0, 30], [-28, 8, 22], [98, 10, 22]];
  let g = c.map(([dx, dy, r]) => `<circle cx="${f1(x + dx * s)}" cy="${f1(y + dy * s)}" r="${f1(r * s)}"/>`).join('');
  g += `<rect x="${f1(x - 48 * s)}" y="${f1(y)}" width="${f1(168 * s)}" height="${f1(32 * s)}" rx="${f1(16 * s)}"/>`;
  // soft shading along the bottom
  const g2 = `<rect x="${f1(x - 44 * s)}" y="${f1(y + 16 * s)}" width="${f1(160 * s)}" height="${f1(14 * s)}" rx="${f1(7 * s)}" fill="#000" opacity=".06"/>`;
  return `<g fill="${fill}" opacity="${op}">${g}${g2}</g>`;
}

/** Clouds that drift across the sky and come back on the other side (seamless). */
function drifting(svgCloud: string, x: number, idx: number, wind: number, anim: boolean): string {
  if (!anim) return svgCloud;
  const dur = 150 + idx * 23;
  const span = W + 420;
  const f = wind > 0 ? (x + 210) / span : (W + 210 - x) / span;
  const [a, b] = wind > 0 ? [-(x + 210), W + 210 - x] : [W + 210 - x, -(x + 210)];
  return `<g>${svgCloud}<animateTransform attributeName="transform" type="translate" ` +
    `values="${a} 0;${b} 0" dur="${dur}s" begin="-${f1(f * dur)}s" repeatCount="indefinite"/></g>`;
}

/** Overcast: a continuous cloud deck with lumpy, darker undersides and a few drifting puffs below. */
function overcast(night: boolean, dark: boolean, wdir: number, anim: boolean): string {
  const cols: Record<string, [string, string, string]> = {
    'false,false': ['#c6cdd3', '#b4bcc4', '#9ea8b1'], 'false,true': ['#78838d', '#6a7580', '#56616b'],
    'true,false': ['#3c4752', '#34404a', '#2b353e'], 'true,true': ['#2c353d', '#262e35', '#1f262c'],
  };
  const [top, mid, under] = cols[`${night},${dark}`];
  const rr = new Rng(5);
  let bumps = '';
  for (let x = -40; x < W + 60; x += 55) {
    bumps += `<ellipse cx="${x}" cy="${f0(150 + rr.uniform(-12, 10))}" rx="${f0(rr.uniform(48, 80))}" ry="${f0(rr.uniform(22, 34))}"/>`;
  }
  let shadeEl = '';
  for (let x = -20; x < W + 60; x += 70) {
    shadeEl += `<ellipse cx="${x}" cy="${f0(168 + rr.uniform(-6, 8))}" rx="${f0(rr.uniform(40, 70))}" ry="${f0(rr.uniform(10, 16))}"/>`;
  }
  const deck = `<rect x="-10" y="-10" width="${W + 20}" height="160" fill="url(#ov)"/><g fill="${mid}">${bumps}</g>` +
    `<g fill="${under}" opacity=".7">${shadeEl}</g>`;
  const puffs = ([[120, 205, 0.75], [520, 190, 0.85], [720, 225, 0.6]] as const)
    .map(([x, y, sc], i) => drifting(cloud(x, y, sc, under, 0.9), x, i + 2, wdir, anim)).join('');
  return `<linearGradient id="ov" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/>` +
    `<stop offset="1" stop-color="${mid}"/></linearGradient>${deck}${puffs}`;
}

/** Clouds: count 1–5 (5 = cloud deck), day/night, light/dark, drifting with the wind (wdir ±1) or still. */
export function clouds(M: HouseModel, count: number, night: boolean, dark: boolean, wdir: number, anim: boolean): Layer {
  const cf = night ? (dark ? '#58646e' : '#9fb0bd') : dark ? '#8d99a3' : '#ffffff';
  let body = CLOUD_POS.slice(0, count).map(([x, y, sc], i) => drifting(cloud(x, y, sc, cf, 0.95), x, i, wdir, anim)).join('');
  if (count >= 5) body = overcast(night, dark, wdir, anim);
  return layer(`<g mask="url(#fg)">${body}</g>`, fgMask(M));
}
