// A townhouse: a narrow two-storey brick house with a front gable, window boxes and a stoop,
// between two neighbouring houses.
import { Rng, f1, shade } from '../draw/util';
import { HouseColors, HouseModel, Look } from './types';

const FLOWERS: Record<Look, string[]> = {
  spring: ['#ff5a5f', '#ffd23f', '#ff8fb3'], summer: ['#ff6b6b', '#fff', '#b06bff', '#ffd23f'],
  autumn: ['#e8772e', '#b8452a', '#f2b84b'], winter: [], winterbar: [],
};

/** A neighbour's window: dark glass by day, some of them lit in the evening. */
function neighbourWindow(x: number, y: number, night: boolean, lit: boolean): string {
  const glass = night ? (lit ? '#ffcf7a' : '#2a3846') : '#9ec9e6';
  return `<rect x="${x}" y="${y}" width="22" height="20" fill="${glass}" opacity="${night && lit ? 0.75 : 1}"/>` +
    `<rect x="${x}" y="${y}" width="22" height="20" fill="none" stroke="#f2f2f2" stroke-width="1.6"/>` +
    `<path d="M${x + 11},${y} L${x + 11},${y + 20}" stroke="#f2f2f2" stroke-width="1.1"/>` +
    `<rect x="${x - 2}" y="${y + 20}" width="26" height="2" fill="#d7dde2"/>`;
}

function neighbour(x: number, wall: string, roof: string, night: boolean, litUp: boolean, litDown: boolean, doorLeft: boolean): string {
  const n = (c: string): string => (night ? shade(c, 0.62) : c);
  const dx = doorLeft ? x + 10 : x + 50;
  const wx = doorLeft ? x + 44 : x + 10;
  return `<rect x="${x}" y="214" width="82" height="108" fill="${n(wall)}"/>` +
    Array.from({ length: 21 }, (_, i) => `<line x1="${x}" y1="${218 + i * 5}" x2="${x + 82}" y2="${218 + i * 5}" stroke="#000" stroke-opacity=".05"/>`).join('') +
    `<polygon points="${x - 6},216 ${x + 41},178 ${x + 88},216" fill="${n(roof)}"/>` +
    `<path d="M${x - 6},216 L${x + 41},178 L${x + 88},216" stroke="#2e3237" stroke-width="2" fill="none" stroke-linejoin="round"/>` +
    neighbourWindow(x + 10, 236, night, litUp) + neighbourWindow(x + 50, 236, night, false) +
    neighbourWindow(wx, 288, night, litDown) +
    `<rect x="${dx}" y="284" width="22" height="38" fill="${n('#4b3b30')}"/><circle cx="${dx + 18}" cy="304" r="1.2" fill="#d9c27a"/>` +
    `<rect x="${dx - 3}" y="322" width="28" height="5" fill="${n('#9aa0a4')}"/>`;
}

function body(night: boolean, look: Look, c: HouseColors, panes: string): string {
  const n = (col: string, f = 0.7): string => (night ? shade(col, f) : col);
  const wall = n(c.wall ?? '#c98f6e'), roof = c.roof ?? '#3d4248';
  const door = n(c.door ?? '#2f5d50');
  const trim = n('#f4f1ea', 0.62);
  const s: string[] = [
    '<linearGradient id="wl" x1="0" y1="0" x2="0" y2="1">' +
      `<stop offset="0" stop-color="${wall}"/><stop offset="1" stop-color="${shade(wall, 0.88)}"/></linearGradient>`,
    // the neighbours, a little behind and in muted colours (their windows glow now and then in the evening)
    neighbour(296, c.side ?? '#b9c3c8', '#4a4f56', night, true, false, false),
    neighbour(492, '#d8cdb8', '#575049', night, false, true, true),
    // the chimney, behind the gable
    '<rect x="462" y="166" width="12" height="26" fill="#8a4a3a"/><rect x="460" y="163" width="16" height="4" fill="#5a5f66"/>',
    // our house: the brick front with its gable
    '<polygon points="378,208 435,164 492,208 492,322 378,322" fill="url(#wl)"/>',
    Array.from({ length: 28 }, (_, i) => {
      const y = 186 + i * 5;
      const half = y < 208 ? ((y - 164) / 44) * 57 : 57;
      return `<line x1="${f1(435 - half)}" y1="${y}" x2="${f1(435 + half)}" y2="${y}" stroke="#000" stroke-opacity=".07"/>`;
    }).join(''),
    // bargeboards along the gable, the eave shadow and a cornice between the floors
    `<path d="M372,211 L435,160 L498,211" stroke="${n(roof)}" stroke-width="6" fill="none" stroke-linejoin="round"/>`,
    `<path d="M372,211 L435,160 L498,211" stroke="${trim}" stroke-width="1.2" fill="none" stroke-linejoin="round" opacity=".7"/>`,
    `<rect x="378" y="262" width="114" height="4" fill="${trim}"/>`,
    '<rect x="378" y="318" width="114" height="4" fill="#5b636b"/>',
  ];
  // window boxes under the upstairs windows
  const bloom = FLOWERS[look];
  const rnd = new Rng(17);
  for (const x of [392, 452]) {
    s.push(`<rect x="${x - 2}" y="255" width="30" height="5" rx="1" fill="${n('#6b4a2f')}"/>`);
    if (bloom.length) {
      for (let i = 0; i < 6; i++) {
        const fx = x + 1 + i * 4.8, col = rnd.choice(bloom);
        s.push(`<path d="M${f1(fx)},256 l0,-4" stroke="#3f8f3f" stroke-width="1"/><circle cx="${f1(fx)}" cy="251.5" r="2" fill="${night ? shade(col, 0.55) : col}"/>`);
      }
    } else s.push(`<path d="M${x + 2},255 q12,-5 24,0" stroke="${n('#55604a')}" stroke-width="2" fill="none"/>`);
  }
  s.push(panes);
  // the front door with a fanlight, the stoop and the porch lamp
  s.push(
    `<rect x="389" y="277" width="32" height="45" fill="${trim}"/>` +
      `<path d="M392,284 A13,8 0 0 1 418,284 Z" fill="${night ? '#2a3846' : '#9ec9e6'}"/>` +
      `<rect x="392" y="284" width="26" height="38" fill="${door}"/>` +
      '<rect x="396" y="289" width="18" height="12" fill="#000" opacity=".12"/><rect x="396" y="305" width="18" height="13" fill="#000" opacity=".12"/>' +
      '<circle cx="414" cy="304" r="1.5" fill="#d9c27a"/>' +
      `<rect x="384" y="322" width="42" height="6" fill="${n('#9aa0a4', 0.55)}"/><rect x="388" y="328" width="34" height="7" fill="${n('#868c90', 0.55)}"/>`,
    '<rect x="424" y="286" width="4" height="6" rx="1" fill="#3a434c"/><rect x="424.6" y="287.4" width="2.8" height="3.6" fill="#cfd6db"/>',
  );
  return s.join('');
}

let snowRoof = '<polygon points="371,210 435,158 499,210 493,212 435,165 377,212" fill="#f7fbfe"/>' +
  '<polygon points="289,215 337,176 385,215 380,217 337,182 294,217" fill="#f7fbfe"/>' +
  '<polygon points="485,215 533,176 581,215 576,217 533,182 490,217" fill="#f7fbfe"/>' +
  '<rect x="459" y="160" width="18" height="4" rx="1.5" fill="#f7fbfe"/>' +
  '<rect x="390" y="253" width="30" height="3" rx="1.5" fill="#f7fbfe"/><rect x="450" y="253" width="30" height="3" rx="1.5" fill="#f7fbfe"/>';
for (let i = 0; i < 7; i++) snowRoof += `<path d="M${380 + i * 8},${f1(208 - i * 6.1)} l1.6,0 l-.8,${4 + ((i * 7) % 5)} Z" fill="#e8f6ff"/>`;

export const TOWNHOUSE: HouseModel = {
  id: 'townhouse',
  name: 'Townhouse',
  center: [435, 322],
  palette: { wall: '#c98f6e', roof: '#3d4248', door: '#2f5d50' },
  scale: 1.3,
  outline: '<rect x="296" y="214" width="278" height="108"/><polygon points="290,216 337,178 384,216"/><polygon points="486,216 533,178 580,216"/>' +
    '<polygon points="372,211 435,160 498,211 492,322 378,322"/><rect x="460" y="163" width="16" height="30"/>',
  sideOutline: '<rect x="492" y="214" width="82" height="108"/>',
  roofOutline: '<polygon points="290,216 337,178 384,216"/><polygon points="486,216 533,178 580,216"/><polygon points="372,211 435,160 498,211"/>',
  windows: {
    front: [{ kind: 'rect', x: 452, y: 286 }],
    upstairs: [{ kind: 'rect', x: 392, y: 230 }, { kind: 'rect', x: 452, y: 230 }],
    attic: [{ kind: 'small', x: 429, y: 182 }],
  },
  silhouettes: [['upstairs', 0], ['upstairs', 1]],
  footprint: [290, 580, 322],
  groundShadow: [445, 326, 240],
  pathStart: [405, 336],
  bushes: [234, 650],
  lamp: [222, 352],
  mailbox: [664, 360],
  door: [392, 284],
  porchLamp: [426, 290],
  chimney: [468, 162],
  spots: { door: [424, 286], roof: [468, 158], front: [465, 284], upstairs: [405, 228], attic: [435, 180] },
  people: { x: 442, step: 15, base: 340 },
  eaves: [[[372, 211], [435, 160], [498, 211]], [[378, 263], [492, 263]]],
  glint: { front: [380, 490], side: [0, 0] },
  icicles: { x: 380, y: 208, dx: 8, dy: -6.1, n: 7 },
  deco: {
    cosy: ['front', 0],
    star: [405, 230],
    candles: [465, 307],
    pumpkins: [[386, 338, 0.8], [372, 340, 0.65]],
    twigs: [366, 336],
    lucia: [405, 337],
    santa: [378, 339],
    balloons: [430, 304],
    hearts: [[468, 162], [405, 300]],
    windowHeart: [405, 234],
    treat: [432, 338],
    lanterns: [492, 263],
  },
  body,
  snowRoof,
  frostRoof: '<g stroke="#f4fbff" stroke-linecap="round" fill="none" opacity=".85"><path d="M372,211 L435,160 L498,211" stroke-width="3"/>' +
    '<path d="M290,216 L337,178 L384,216" stroke-width="2.5"/><path d="M486,216 L533,178 L580,216" stroke-width="2.5"/></g>',
};
