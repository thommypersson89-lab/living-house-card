// An American suburban ranch house: one storey, a low hip roof, lap siding, shutters,
// a covered porch with posts, an attached garage and a driveway.
import { Rng, f1, shade } from '../draw/util';
import { HouseColors, HouseModel, Look } from './types';

const FLOWERS: Record<Look, string[]> = {
  spring: ['#ff5a5f', '#ffd23f', '#ff8fb3'], summer: ['#ff6b6b', '#fff', '#b06bff', '#ffd23f'],
  autumn: ['#e8772e', '#b8452a', '#f2b84b'], winter: [], winterbar: [],
};

const RECT_PANES: [number, number][] = [[314, 284], [352, 284], [462, 284]];

function body(night: boolean, look: Look, c: HouseColors, panes: string): string {
  const n = (col: string, f = 0.7): string => (night ? shade(col, f) : col);
  const wall = n(c.wall ?? '#e3e8ea'), side = n(c.side ?? '#bcc7cd');
  const roof = c.roof ?? '#4a4e55';
  const door = n(c.door ?? '#a33a32');
  const trim = n('#f6f7f8', 0.62), shutter = n('#34584a', 0.6);
  const s: string[] = [
    '<linearGradient id="wl" x1="0" y1="0" x2="0" y2="1">' +
      `<stop offset="0" stop-color="${wall}"/><stop offset="1" stop-color="${shade(wall, 0.9)}"/></linearGradient>`,
    '<linearGradient id="rf" x1="0" y1="0" x2="0" y2="1">' +
      `<stop offset="0" stop-color="${shade(roof, 0.85)}"/><stop offset="1" stop-color="${roof}"/></linearGradient>`,
    // driveway to the garage
    `<polygon points="496,322 552,322 576,430 474,430" fill="${n('#b8bcbf', 0.45)}"/>`,
    `<path d="M524,322 L525,430" stroke="#000" stroke-opacity=".08" stroke-width="1.2"/>`,
    // side wall and front wall
    `<polygon points="556,272 584,263 584,313 556,322" fill="${side}"/>`,
    '<rect x="300" y="272" width="256" height="50" fill="url(#wl)"/>',
    // lap siding
    Array.from({ length: 9 }, (_, i) => `<line x1="300" y1="${277 + i * 5}" x2="556" y2="${277 + i * 5}" stroke="#000" stroke-opacity=".05"/>`).join(''),
    Array.from({ length: 9 }, (_, i) => `<line x1="556" y1="${f1(277 + i * 5)}" x2="584" y2="${f1(268 + i * 5)}" stroke="#000" stroke-opacity=".05"/>`).join(''),
    // shadow under the eaves
    '<rect x="300" y="272" width="256" height="5" fill="#000" opacity=".1"/><polygon points="556,272 584,263 584,267 556,277" fill="#000" opacity=".1"/>',
    // hip roof: the side triangle, the front slope with shingle rows, the ridge
    `<polygon points="568,274 596,264 522,232" fill="${shade(roof, 0.78)}"/>`,
    '<polygon points="288,274 568,274 522,232 330,232" fill="url(#rf)"/>',
    [1, 2, 3, 4, 5, 6].map((i) => {
      const t = i / 7, y = 232 + t * 42;
      return `<line x1="${f1(330 - t * 42)}" y1="${f1(y)}" x2="${f1(522 + t * 46)}" y2="${f1(y)}" stroke="#ffffff" stroke-opacity=".06"/>`;
    }).join(''),
    '<path d="M288,274 L330,232 L522,232 L568,274" stroke="#2e3237" stroke-width="2" fill="none" stroke-linejoin="round"/>',
    `<rect x="286" y="273" width="284" height="3" fill="${trim}"/>`,
    // brick chimney
    '<polygon points="336,242 352,242 352,212 336,212" fill="#8a4a3a"/><polygon points="346,242 352,242 352,212 346,212" fill="#733d30"/>' +
      '<rect x="334" y="208" width="20" height="5" fill="#5a5f66"/>' +
      Array.from({ length: 5 }, (_, i) => `<line x1="336" y1="${217 + i * 5}" x2="352" y2="${217 + i * 5}" stroke="#000" stroke-opacity=".12"/>`).join(''),
    // garage door with panels
    `<rect x="494" y="283" width="56" height="39" fill="${n('#eef1f3', 0.62)}"/>`,
    Array.from({ length: 4 }, (_, i) => `<line x1="494" y1="${292 + i * 8}" x2="550" y2="${292 + i * 8}" stroke="#000" stroke-opacity=".12"/>`).join('') +
      '<rect x="494" y="283" width="56" height="39" fill="none" stroke="#000" stroke-opacity=".15"/>' +
      `<rect x="492" y="280" width="60" height="3" fill="${trim}"/>`,
  ];
  // shutters beside the front windows
  for (const [x, y] of RECT_PANES) s.push(`<rect x="${x - 6}" y="${y - 1}" width="5" height="24" fill="${shutter}"/><rect x="${x + 27}" y="${y - 1}" width="5" height="24" fill="${shutter}"/>`);
  s.push(panes);
  // covered porch: posts, a small gable roof, the slab and steps
  s.push(
    `<rect x="380" y="322" width="78" height="6" fill="${n('#a7adb1', 0.55)}"/><rect x="392" y="328" width="54" height="7" fill="${n('#959ba0', 0.55)}"/>` +
      `<rect x="386" y="279" width="4" height="43" fill="${trim}"/><rect x="448" y="279" width="4" height="43" fill="${trim}"/>` +
      `<polygon points="380,281 419,257 458,281" fill="${shade(roof, 0.92)}"/><polygon points="386,280 419,261 452,280" fill="${n('#f2f4f5', 0.62)}"/>` +
      '<path d="M380,281 L419,257 L458,281" stroke="#2e3237" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
  );
  // front door with panels and a small window, and the porch lamp
  s.push(
    `<rect x="406" y="282" width="26" height="40" rx="1" fill="${door}"/>` +
      `<rect x="410" y="287" width="18" height="7" rx="1" fill="${night ? '#2a3846' : '#9ec9e6'}" opacity=".85"/>` +
      '<rect x="410" y="298" width="8" height="18" fill="#000" opacity=".1"/><rect x="420" y="298" width="8" height="18" fill="#000" opacity=".1"/>' +
      '<circle cx="428" cy="304" r="1.5" fill="#d9c27a"/>' +
      `<rect x="404" y="280" width="30" height="2.5" fill="${trim}"/>`,
    '<rect x="436" y="286" width="4" height="6" rx="1" fill="#3a434c"/><rect x="436.6" y="287.4" width="2.8" height="3.6" fill="#cfd6db"/>',
  );
  // flower beds along the front
  if (FLOWERS[look].length) {
    const rnd = new Rng(11);
    s.push('<rect x="302" y="322" width="76" height="4" rx="2" fill="#4a3a2a"/><rect x="458" y="322" width="34" height="4" rx="2" fill="#4a3a2a"/>');
    const xs: number[] = [];
    for (let x = 305; x < 377; x += 5) xs.push(x);
    for (let x = 461; x < 491; x += 5) xs.push(x);
    for (const x of xs) {
      const col = rnd.choice(FLOWERS[look]);
      s.push(`<path d="M${x},323 l0,-5" stroke="#3f8f3f" stroke-width="1"/><circle cx="${x}" cy="317.5" r="2" fill="${night ? shade(col, 0.55) : col}"/>`);
    }
  }
  return s.join('');
}

let snowRoof = '<polygon points="290,272 330,231 522,231 566,272 560,275 520,236 332,236 296,275" fill="#f7fbfe"/>' +
  '<polygon points="568,273 596,263 590,262 524,233" fill="#f7fbfe" opacity=".9"/>' +
  '<rect x="333" y="205" width="22" height="4" rx="1.5" fill="#f7fbfe"/>' +
  '<polygon points="379,281 419,256 459,281 454,283 419,261 384,283" fill="#f7fbfe"/>';
for (let i = 0; i < 26; i++) snowRoof += `<path d="M${300 + i * 10},275 l1.6,0 l-.8,${4 + ((i * 7) % 5)} Z" fill="#e8f6ff"/>`;

export const RANCH: HouseModel = {
  id: 'ranch',
  name: 'American ranch house',
  center: [435, 322],
  palette: { wall: '#e3e8ea', roof: '#4a4e55', door: '#a33a32' },
  scale: 1.3,
  outline: '<rect x="300" y="272" width="256" height="50"/><polygon points="556,272 584,263 584,313 556,322"/>' +
    '<polygon points="288,274 568,274 522,232 330,232"/><polygon points="568,274 596,264 522,232"/>' +
    '<polygon points="336,242 352,242 352,208 336,208"/><polygon points="380,281 419,257 458,281"/>',
  sideOutline: '<polygon points="556,272 584,263 584,313 556,322"/>',
  roofOutline: '<polygon points="288,274 568,274 522,232 330,232"/><polygon points="568,274 596,264 522,232"/>',
  windows: {
    front: [{ kind: 'rect', x: 314, y: 284 }, { kind: 'rect', x: 352, y: 284 }],
    front_right: [{ kind: 'rect', x: 462, y: 284 }],
    side: [{ kind: 'skew', x: 560, y: 286 }],
  },
  silhouettes: [['front', 1], ['front', 0]],
  footprint: [288, 596, 322],
  groundShadow: [445, 326, 215],
  pathStart: [419, 337],
  bushes: [238, 652],
  lamp: [222, 352],
  mailbox: [630, 358],
  door: [406, 282],
  porchLamp: [438, 290],
  chimney: [344, 206],
  spots: { door: [438, 286], roof: [470, 226], front: [327, 282], front_right: [475, 282], side: [572, 282] },
  people: { x: 455, step: 15, base: 340 },
  eaves: [[[288, 274], [568, 274]], [[380, 281], [419, 257], [458, 281]]],
  glint: { front: [300, 500], side: [552, 592] },
  icicles: { x: 300, y: 275, dx: 10, dy: 0, n: 26 },
  deco: {
    cosy: ['front', 0],
    star: [327, 284],
    candles: [475, 305],
    pumpkins: [[396, 338, 0.8], [372, 339, 0.65]],
    twigs: [366, 336],
    lucia: [419, 337],
    santa: [397, 339],
    balloons: [446, 304],
    hearts: [[344, 206], [419, 300]],
    windowHeart: [327, 288],
    treat: [444, 338],
    lanterns: [568, 274],
  },
  body,
  snowRoof,
  frostRoof: '<g stroke="#f4fbff" stroke-linecap="round" fill="none" opacity=".85"><path d="M288,274 L568,274" stroke-width="3"/>' +
    '<path d="M288,274 L330,232 L522,232 L568,274 L596,264" stroke-width="2.5"/><path d="M380,281 L419,257 L458,281" stroke-width="2"/></g>',
};
