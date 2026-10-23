// The Swedish villa: one and a half storeys, a steep gable roof with a small gable window,
// a side wall in perspective with two windows, solar panels and a chimney on the back slope.
import { Rng, f1, shade } from '../draw/util';
import { HouseColors, HouseModel, Look } from './types';

const FLOWERS: Record<Look, string[]> = {
  spring: ['#ff5a5f', '#ffd23f', '#ff8fb3'], summer: ['#ff6b6b', '#fff', '#b06bff', '#ffd23f'],
  autumn: ['#e8772e', '#b8452a', '#f2b84b'], winter: [], winterbar: [],
};

function body(night: boolean, look: Look, c: HouseColors, panes: string): string {
  let [wall, side] = [c.wall ?? '#eef2f5', c.side ?? '#c3ccd4'];
  const roof = c.roof ?? '#2b333b';
  const roof2 = c.roof ? shade(c.roof, 0.72) : '#1f262c';
  if (night) [wall, side] = [c.wall ? shade(c.wall, 0.7) : '#a3b0bb', c.side ? shade(c.side, 0.7) : '#7f8c98'];
  const s: string[] = [
    '<linearGradient id="wl" x1="0" y1="0" x2="0" y2="1">' +
      `<stop offset="0" stop-color="${wall}"/><stop offset="1" stop-color="${shade(wall, 0.9)}"/></linearGradient>`,
    '<linearGradient id="sd" x1="0" y1="0" x2="1" y2="0">' +
      `<stop offset="0" stop-color="${side}"/><stop offset="1" stop-color="${shade(side, 0.85)}"/></linearGradient>`,
    // side wall and front
    '<polygon points="460,244 552,222 552,308 460,322" fill="url(#sd)"/>',
    '<rect x="320" y="244" width="140" height="78" fill="url(#wl)"/>',
    // wood panelling
    Array.from({ length: Math.ceil((460 - 326) / 6) }, (_, i) => `<line x1="${326 + i * 6}" y1="248" x2="${326 + i * 6}" y2="320" stroke="#000" stroke-opacity=".035"/>`).join(''),
    // shadow under the eaves
    '<polygon points="460,244 552,222 552,229 460,252" fill="#000" opacity=".12"/>',
    '<rect x="320" y="244" width="140" height="5" fill="#000" opacity=".08"/>',
    // roof with tile rows
    `<polygon points="390,190 482,168 560,226 468,248" fill="${roof}"/>`,
    [1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
      const t = i / 9;
      return `<line x1="${f1(390 + t * 78)}" y1="${f1(190 + t * 58)}" x2="${f1(482 + t * 78)}" y2="${f1(168 + t * 58)}" stroke="#ffffff" stroke-opacity=".06"/>`;
    }).join(''),
    `<polygon points="310,248 390,188 470,248" fill="${roof2}"/>`,
    '<polygon points="324,246 390,196 456,246" fill="url(#wl)"/>',
    '<path d="M310,248 L390,188 L470,248" stroke="#3b444d" stroke-width="2.5" fill="none" stroke-linejoin="round"/>',
    // chimney rising out of the roof (flashing and a shadow on the roof)
    '<polygon points="520,203 532,206 532,210 520,207" fill="#000" opacity=".25"/>' +
      '<polygon points="506,206 520,202 520,177 506,181" fill="#4a535c"/><polygon points="513,204 520,202 520,177 513,179" fill="#3c444c"/>' +
      '<polygon points="504,207 522,202 522,205 504,210" fill="#5b636b"/>' +
      '<polygon points="504,181 522,176 522,172 504,177" fill="#2e353c"/>',
    // solar panels
    '<polygon points="425,196 470,185 500,207 455,218" fill="#1b2a3a" stroke="#3b5068" stroke-width="1.5"/>',
    '<path d="M440,192.5 L470,214.5 M455,189 L485,211 M432,201 L477,190 M440,207 L485,196" stroke="#3b5068" stroke-width=".8"/>',
    // plinth + contact shadow where the side wall meets the ground
    '<rect x="320" y="318" width="140" height="4" fill="#5b636b"/><polygon points="460,318 552,304 552,308 460,322" fill="#4d555d"/>' +
      '<polygon points="460,322 552,308 566,312 470,328" fill="#000" opacity=".22"/>',
    panes,
  ];
  // door with panels, handle and porch lamp
  const [dx, dy] = [377, 282];
  const door = c.door ? (night ? shade(c.door, 0.7) : c.door) : night ? '#3e4d59' : '#5a6f80';
  s.push(
    `<rect x="${dx}" y="${dy}" width="26" height="40" rx="2" fill="${door}"/>` +
      `<rect x="${dx + 4}" y="${dy + 5}" width="18" height="12" rx="1" fill="#000" opacity=".12"/>` +
      `<rect x="${dx + 4}" y="${dy + 21}" width="18" height="14" rx="1" fill="#000" opacity=".12"/>` +
      `<circle cx="${dx + 21}" cy="${dy + 22}" r="1.5" fill="#d9c27a"/>` +
      `<rect x="${dx - 3}" y="${dy - 3}" width="32" height="3" fill="#d7dde2"/>`,
  );
  const [px, py] = [409, 288];
  s.push(`<rect x="${px - 2}" y="${py - 4}" width="4" height="6" rx="1" fill="#3a434c"/><rect x="${px - 1.4}" y="${py - 2.6}" width="2.8" height="3.6" fill="#cfd6db"/>`);
  // steps
  s.push('<polygon points="376,322 404,322 412,330 368,330" fill="#8a939b"/><polygon points="368,330 412,330 416,337 364,337" fill="#737c84"/>');
  // flower bed along the foundation
  if (FLOWERS[look].length) {
    const rnd = new Rng(7);
    s.push('<rect x="322" y="322" width="44" height="4" rx="2" fill="#4a3a2a"/><rect x="416" y="322" width="44" height="4" rx="2" fill="#4a3a2a"/>');
    const xs: number[] = [];
    for (let x = 325; x < 364; x += 5) xs.push(x);
    for (let x = 419; x < 458; x += 5) xs.push(x);
    for (const x of xs) {
      const col = rnd.choice(FLOWERS[look]);
      s.push(`<path d="M${x},323 l0,-5" stroke="#3f8f3f" stroke-width="1"/><circle cx="${x}" cy="317.5" r="2" fill="${night ? shade(col, 0.55) : col}"/>`);
    }
  }
  return s.join('');
}

let snowRoof = '<path d="M308,249 L390,186 L472,249 L466,251 L390,193 L314,251 Z" fill="#f7fbfe"/>' +
  '<path d="M388,188 L482,165 L562,226 L556,229 L480,172 L392,193 Z" fill="#f7fbfe"/>' +
  '<polygon points="428,195 470,184 497,204 456,214" fill="#f7fbfe" opacity=".9"/>' +
  '<path d="M504,177 L522,172 L522,169 L504,174 Z" fill="#f7fbfe"/>';
for (let i = 0; i < 10; i++) snowRoof += `<path d="M${(472 + i * 9).toFixed(0)},${f1(247 - i * 2.2)} l1.6,0 l-.8,${4 + ((i * 7) % 5)} Z" fill="#e8f6ff"/>`;

export const VILLA: HouseModel = {
  id: 'villa',
  name: 'Swedish villa',
  center: [435, 322],
  scale: 1.3,
  outline: '<rect x="320" y="244" width="140" height="78"/><polygon points="310,248 390,188 470,248"/>' +
    '<polygon points="390,190 482,168 560,226 468,248"/><polygon points="460,244 552,222 552,308 460,322"/>' +
    '<polygon points="506,206 520,202 520,172 506,177"/>',
  sideOutline: '<polygon points="460,244 552,222 552,308 460,322"/>',
  roofOutline: '<polygon points="390,190 482,168 560,226 468,248"/><polygon points="310,248 390,188 470,248"/>',
  windows: {
    front: [{ kind: 'rect', x: 334, y: 262 }, { kind: 'rect', x: 422, y: 262 }],
    side_left: [{ kind: 'skew', x: 474, y: 262 }],
    side_right: [{ kind: 'skew', x: 512, y: 262 }],
    gable: [{ kind: 'small', x: 384, y: 216 }],
  },
  silhouettes: [['front', 1], ['front', 0]],
  footprint: [320, 552, 322],
  groundShadow: [445, 326, 200],
  pathStart: [390, 336],
  bushes: [262, 610],
  lamp: [250, 344],
  mailbox: [588, 352],
  door: [377, 282],
  porchLamp: [409, 288],
  chimney: [513, 170],
  spots: { door: [407, 286], side_left: [486, 258], side_right: [524, 258], gable: [390, 214], roof: [472, 196] },
  people: { x: 440, step: 15, base: 340 },
  eaves: [[[312, 247], [390, 188], [468, 247]], [[470, 247], [558, 226]]],
  glint: { front: [325, 455], side: [470, 545] },
  icicles: { x: 472, y: 247, dx: 9, dy: -2.2, n: 10 },
  deco: {
    cosy: ['front', 0],
    star: [347, 262],
    candles: [435, 283],
    pumpkins: [[352, 338, 0.8], [420, 339, 0.65]],
    twigs: [359, 336],
    lucia: [390, 337],
    santa: [356, 339],
    balloons: [402, 304],
    hearts: [[513, 168], [390, 300]],
    windowHeart: [347, 266],
    treat: [424, 338],
    lanterns: [556, 238],
  },
  body,
  snowRoof,
  frostRoof: '<g stroke="#f4fbff" stroke-linecap="round" fill="none" opacity=".85"><path d="M310,248 L390,188 L470,248" stroke-width="3"/>' +
    '<path d="M390,190 L482,168 L560,226" stroke-width="2.5"/><path d="M468,248 L560,226" stroke-width="2.5"/></g>',
};
