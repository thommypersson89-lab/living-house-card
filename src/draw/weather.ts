// Weather and garden life: rain, snow, thunder, fog, puddles, heat haze, wind, a snowman,
// birds, butterflies, fireflies, falling leaves, bats and the animals.
import { H, Layer, Rng, W, f0, f1, layer } from './util';

function drops(R: Rng, n: number, L: number, w: number, op: number, col = '#b9d6ee'): string {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = R.uniform(-20, W + 20), y = R.uniform(0, H);
    for (const yy of [y, y - H]) out.push(`<line x1="${f0(x)}" y1="${f0(yy)}" x2="${f0(x - 3)}" y2="${f0(yy + L)}"/>`);
  }
  return `<g stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity="${op}">` + out.join('');
}

const RAIN: Record<string, [number, number, number, number, number]> = {
  drizzle: [30, 35, 0, 1.7, 0.55], // drizzle: few, short and slow drops
  light: [45, 60, 0, 1, 1],
  moderate: [80, 105, 0.06, 1, 1],
  heavy: [110, 150, 0.12, 1, 1],
};

/** Rain in four strengths: drizzle, light, moderate, heavy. */
export function rain(level: string): Layer | null {
  const spec = RAIN[level];
  if (!spec) return null;
  const [nFar, nNear, dark, slow, short] = spec;
  const R = new Rng(100 + nFar);
  const b: string[] = [];
  if (dark) b.push(`<rect width="${W}" height="320" fill="#1c2733" opacity="${dark}"/>`);
  b.push(drops(R, nFar, 10 * short, 1.4, 0.45) + `<animateTransform attributeName="transform" type="translate" from="0 0" to="0 ${H}" dur="${(1.1 * slow).toFixed(2)}s" repeatCount="indefinite"/></g>`);
  b.push(drops(R, nNear, 17 * short, 2.2 * Math.min(1, short + 0.3), 0.75) + `<animateTransform attributeName="transform" type="translate" from="0 0" to="0 ${H}" dur="${(0.7 * slow).toFixed(2)}s" repeatCount="indefinite"/></g>`);
  for (let i = 0; i < (nNear > 100 ? 14 : 8); i++) {
    const x = R.uniform(20, W - 20), y = R.uniform(334, 410), d = f1(R.uniform(0.8, 1.6));
    b.push(`<ellipse cx="${f0(x)}" cy="${f0(y)}" rx="1" ry=".4" fill="none" stroke="#b9d6ee" stroke-width="1.2" data-s="0">` +
      `<animate attributeName="rx" values="1;9" dur="${d}s" repeatCount="indefinite"/>` +
      `<animate attributeName="ry" values=".4;3" dur="${d}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values=".8;0" dur="${d}s" repeatCount="indefinite"/></ellipse>`);
  }
  return layer(`<g clip-path="url(#c)">${b.join('')}</g>`, `<clipPath id="c"><rect width="${W}" height="${H}"/></clipPath>`);
}

export function snow(): Layer {
  const R = new Rng(31);
  const layers = ([[60, 1, 1.8, 16, 0.6], [45, 1.8, 2.8, 11, 0.8], [25, 2.8, 4, 8, 0.95]] as const).map(([n, rmin, rmax, dur, op]) => {
    const fl: string[] = [];
    for (let i = 0; i < n; i++) {
      const x = R.uniform(-10, W + 10), y = R.uniform(0, H), r = R.uniform(rmin, rmax);
      for (const yy of [y, y - H]) fl.push(`<circle cx="${f0(x)}" cy="${f0(yy)}" r="${f1(r)}"/>`);
    }
    return `<g><g fill="#fff" opacity="${op}">${fl.join('')}` +
      `<animateTransform attributeName="transform" type="translate" from="0 0" to="0 ${H}" dur="${dur}s" repeatCount="indefinite"/></g>` +
      `<animateTransform attributeName="transform" type="translate" values="0 0;14 0;0 0;-14 0;0 0" dur="${f1(R.uniform(4, 7))}s" repeatCount="indefinite"/></g>`;
  });
  return layer(layers.join(''));
}

export function lightning(): Layer {
  return layer(
    `<rect width="${W}" height="320" fill="#eef4ff" opacity="0" data-s="0">` +
      '<animate attributeName="opacity" values="0;0;.5;0;.3;0;0" keyTimes="0;.6;.615;.635;.65;.67;1" dur="8s" repeatCount="indefinite"/></rect>' +
      '<polygon points="640,100 612,162 632,162 610,216 670,140 646,140 666,100" fill="#ffe873" opacity="0">' +
      '<animate attributeName="opacity" values="0;0;1;.2;1;0;0" keyTimes="0;.6;.615;.635;.65;.67;1" dur="8s" repeatCount="indefinite"/></polygon>' +
      '<polygon points="160,95 140,140 154,140 136,182 180,128 163,128 178,95" fill="#ffe873" opacity="0" data-s="0">' +
      '<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.2;.215;.24;1" dur="13s" repeatCount="indefinite"/></polygon>',
  );
}

/** Fog: a hazy sky that thickens towards the ground and soft drifting veils. */
export function fog(): Layer {
  const spec: [number, number, number, number, number, number][] = [
    [150, 300, 320, 46, 0.5, 70], [560, 290, 360, 50, 0.45, 85], [380, 335, 420, 42, 0.55, 60],
    [90, 250, 240, 30, 0.3, 95], [640, 240, 260, 32, 0.3, 75], [380, 380, 460, 40, 0.4, 65],
  ];
  const veils = spec.map(([cx, cy, rx, ry, op, dur], i) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#e6ebee" opacity="${op}">` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;${i % 2 ? 50 : -50} 0;0 0" dur="${dur}s" repeatCount="indefinite"/></ellipse>`).join('');
  return layer(`<g filter="url(#db)">${veils}</g><rect width="800" height="420" fill="url(#dg0)"/>`,
    '<filter id="db" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>' +
    '<linearGradient id="dg0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe5e8" stop-opacity=".12"/>' +
    '<stop offset=".6" stop-color="#dfe5e8" stop-opacity=".28"/><stop offset="1" stop-color="#e6ebee" stop-opacity=".45"/></linearGradient>');
}

export function puddles(): Layer {
  const R = new Rng(61);
  return layer([[330, 362, 26], [470, 372, 34], [610, 360, 22], [190, 378, 30], [720, 385, 24]].map(([x, y, rx]) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${f1(rx * 0.22)}" fill="#7d93a6" opacity=".55"/>` +
    `<ellipse cx="${f0(x - rx * 0.3)}" cy="${y - 1}" rx="${f0(rx * 0.35)}" ry="1.2" fill="#fff" opacity=".35">` +
    `<animate attributeName="opacity" values=".1;.5;.1" dur="${f1(R.uniform(2.5, 4))}s" repeatCount="indefinite"/></ellipse>`).join(''));
}

export function heat(): Layer {
  const out: string[] = [];
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 90;
    const d1 = `M${x},330 q6,-10 0,-20 q-6,-10 0,-20 q6,-10 0,-20`;
    const d2 = `M${x},330 q-6,-10 0,-20 q6,-10 0,-20 q-6,-10 0,-20`;
    out.push(`<path d="${d1}" stroke="#fff" stroke-width="2" fill="none" opacity=".18"><animate attributeName="d" values="${d1};${d2};${d1}" dur="${f1(1.6 + (i % 3) * 0.4)}s" repeatCount="indefinite"/>` +
      '<animateTransform attributeName="transform" type="translate" values="0 0;0 -14;0 0" dur="3s" repeatCount="indefinite"/></path>');
  }
  return layer('<rect width="800" height="330" fill="#ffb347" opacity=".07"/>' + out.join(''));
}

/** Gusts and whirling leaves, with the wind (d = ±1). */
export function wind(d: number): Layer {
  const gust = (y: number, delay: number, dur: number, length: number, op: number): string => {
    const [a, b] = d > 0 ? [-(length + 40), W + 40] : [W + 40, -(length + 40)];
    const path = d > 0 ? `M0,${y} c${length * 0.3},-10 ${length * 0.6},10 ${length},0` : `M${length},${y} c${-length * 0.3},-10 ${-length * 0.6},10 ${-length},0`;
    return `<path d="${path}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0">` +
      `<animateTransform attributeName="transform" type="translate" from="${a} 0" to="${b} 0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0;${op};${op};0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></path>`;
  };
  const leaf = (y: number, delay: number, dur: number, col: string): string => {
    const xs = d > 0 ? [-20, W * 0.35, W * 0.7, W + 20] : [W + 20, W * 0.65, W * 0.3, -20];
    return `<g opacity="0"><ellipse cx="0" cy="0" rx="7" ry="3.5" fill="${col}">` +
      `<animateTransform attributeName="transform" type="rotate" from="0" to="${720 * d}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></ellipse>` +
      `<animateTransform attributeName="transform" type="translate" values="${f0(xs[0])} ${y};${f0(xs[1])} ${y - 30};${f0(xs[2])} ${y + 10};${f0(xs[3])} ${y - 20}" ` +
      `dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0;1;1;0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></g>`;
  };
  return layer(gust(90, 0, 2.6, 220, 0.6) + gust(140, 0.9, 2.2, 160, 0.45) + gust(200, 1.7, 2.8, 260, 0.55) +
    gust(250, 0.4, 2.4, 180, 0.4) + gust(115, 2.1, 2.5, 200, 0.5) +
    leaf(300, 0.3, 3.4, '#c8742a') + leaf(260, 1.6, 3.0, '#a8a23a') + leaf(330, 2.4, 3.8, '#d99a3c'));
}

export function snowman(): Layer {
  return layer(
    '<ellipse cx="110" cy="358" rx="16" ry="4" fill="#000" opacity=".2"/><circle cx="110" cy="345" r="14" fill="#f7fbfe"/>' +
      '<circle cx="110" cy="324" r="10" fill="#f7fbfe"/><circle cx="110" cy="308" r="7" fill="#f7fbfe"/>' +
      '<path d="M110,309 l9,2 l-9,1 Z" fill="#ff8a1f"/><circle cx="107.5" cy="306" r="1" fill="#222"/><circle cx="112.5" cy="306" r="1" fill="#222"/>' +
      '<circle cx="110" cy="321" r="1.2" fill="#222"/><circle cx="110" cy="327" r="1.2" fill="#222"/>' +
      '<path d="M100,323 l-12,-8 M120,323 l12,-8" stroke="#6b4a2f" stroke-width="2"/><rect x="103" y="296" width="14" height="5" fill="#222"/><rect x="105" y="288" width="10" height="9" fill="#222"/>' +
      '<path d="M103,314 q7,4 14,0 l0,3 q-7,4 -14,0 Z" fill="#d6283f"/><path d="M114,316 l3,9 l3,-1 l-3,-8 Z" fill="#d6283f"/>',
  );
}

function bird(x0: number, y0: number, delay: number, dur: number, s = 1): string {
  const w1 = `M${-8 * s},0 Q${-4 * s},${-6 * s} 0,0 Q${4 * s},${-6 * s} ${8 * s},0`;
  const w2 = `M${-8 * s},0 Q${-4 * s},${4 * s} 0,0 Q${4 * s},${4 * s} ${8 * s},0`;
  return `<g opacity="0" data-s="0"><path d="${w1}" stroke="#2b333b" stroke-width="1.8" fill="none" stroke-linecap="round">` +
    `<animate attributeName="d" values="${w1};${w2};${w1}" dur=".45s" repeatCount="indefinite"/></path>` +
    `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0 + 900} ${y0 - 40}" keyTimes="0;1" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="1;1" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></g>`;
}

export function birds(): Layer {
  const flock = [0, 1, 2, 3, 4].map((i) => bird(-60 - i * 18, 110 + (i % 3) * 9 - i * 2, 0, 26, 1 - i * 0.08)).join('');
  return layer(`<g>${flock}</g>` + bird(-40, 70, 9, 22, 0.9));
}

function butterfly(cx: number, cy: number, col: string, dur: number): string {
  const wing = `<g><ellipse cx="-3" cy="0" rx="3.5" ry="2.6" fill="${col}"/><ellipse cx="3" cy="0" rx="3.5" ry="2.6" fill="${col}"/>` +
    '<animateTransform attributeName="transform" type="scale" values="1 1;.2 1;1 1" dur=".3s" repeatCount="indefinite"/></g>';
  const path = `${cx} ${cy};${cx + 30} ${cy - 22};${cx + 55} ${cy - 6};${cx + 20} ${cy + 8};${cx - 20} ${cy - 14};${cx} ${cy}`;
  return `<g>${wing}<rect x="-.5" y="-2.5" width="1" height="5" fill="#333"/>` +
    `<animateTransform attributeName="transform" type="translate" values="${path}" dur="${dur}s" repeatCount="indefinite"/></g>`;
}

export function butterflies(): Layer {
  return layer(butterfly(140, 345, '#ffd23f', 9) + butterfly(600, 350, '#ff8fb3', 11) + butterfly(470, 365, '#7fd3ff', 10));
}

export function fireflies(): Layer {
  const R = new Rng(22);
  const ff: string[] = [];
  for (let i = 0; i < 22; i++) {
    const x = R.uniform(30, W - 30), y = R.uniform(300, 400), d = R.uniform(3, 6);
    ff.push(`<circle cx="${f0(x)}" cy="${f0(y)}" r="2" fill="#e8ff7a"><animate attributeName="opacity" values="0;1;0" dur="${f1(d)}s" begin="${f1(R.uniform(0, 4))}s" repeatCount="indefinite"/>` +
      `<animateTransform attributeName="transform" type="translate" values="0 0;${f0(R.uniform(-20, 20))} ${f0(R.uniform(-15, 5))};0 0" dur="${f1(d * 1.7)}s" repeatCount="indefinite"/></circle>`);
  }
  return layer(`<g filter="url(#bl)">${ff.join('')}</g>`, '<filter id="bl"><feGaussianBlur stdDeviation=".8"/></filter>');
}

/** Autumn leaves falling from the trees, with the wind (d = ±1). */
export function fallingLeaves(d: number): Layer {
  const R = new Rng(44);
  const b: string[] = [];
  for (let i = 0; i < 12; i++) {
    const tx = R.choice([150, 210, 680, 742]);
    const x0 = tx + R.uniform(-25, 25), y0 = R.uniform(240, 290);
    const dur = R.uniform(6, 10), bg = R.uniform(0, 8);
    const col = R.choice(['#d9822b', '#c8692a', '#e8a33c', '#a8552a']);
    const dx = d * R.uniform(50, 140);
    b.push(`<g opacity="0"><ellipse cx="0" cy="0" rx="4.5" ry="2.2" fill="${col}">` +
      `<animateTransform attributeName="transform" type="rotate" values="0;${d * 200};${d * 360}" dur="${f1(dur / 2)}s" repeatCount="indefinite"/></ellipse>` +
      `<animateTransform attributeName="transform" type="translate" values="${f0(x0)} ${f0(y0)};${f0(x0 + dx * 0.4)} ${f0(y0 + 40)};${f0(x0 + dx * 0.7)} ${f0(y0 + 65)};${f0(x0 + dx)} ${f0(y0 + 95)}" dur="${f1(dur)}s" begin="${f1(bg)}s" repeatCount="indefinite"/>` +
      `<animate attributeName="opacity" values="0;1;1;0" dur="${f1(dur)}s" begin="${f1(bg)}s" repeatCount="indefinite"/></g>`);
  }
  return layer(b.join(''));
}

function bat(x0: number, y0: number, dur: number, delay: number): string {
  const w1 = 'M-9,0 L-5,-4 L-2,-1 L0,-3 L2,-1 L5,-4 L9,0 L4,1 L0,3 L-4,1 Z';
  const w2 = 'M-9,-4 L-5,1 L-2,0 L0,-3 L2,0 L5,1 L9,-4 L4,2 L0,3 L-4,2 Z';
  return `<g data-s="0"><path d="${w1}" fill="#14141c"><animate attributeName="d" values="${w1};${w2};${w1}" dur=".25s" repeatCount="indefinite"/></path>` +
    `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0 + 120} ${y0 - 40};${x0 + 260} ${y0 + 20};${x0 + 380} ${y0 - 30};${x0} ${y0}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></g>`;
}

export function bats(): Layer {
  return layer(bat(120, 120, 12, 0) + bat(300, 80, 14, 3) + bat(420, 150, 10, 6));
}

// Animals
export function deer(x = 44, b = 322): Layer {
  const body = '<ellipse cx="0" cy="-12" rx="11" ry="5.5" fill="#9a6b45"/><rect x="-8" y="-9" width="2" height="9" fill="#7d5536"/><rect x="-4" y="-9" width="2" height="9" fill="#7d5536"/>' +
    '<rect x="4" y="-9" width="2" height="9" fill="#7d5536"/><rect x="8" y="-9" width="2" height="9" fill="#7d5536"/><ellipse cx="-11" cy="-13" rx="2" ry="1.6" fill="#fff"/>';
  const head = '<g><path d="M8,-15 L13,-24" stroke="#9a6b45" stroke-width="4" stroke-linecap="round"/><ellipse cx="15" cy="-25" rx="4" ry="2.6" fill="#9a6b45"/>' +
    '<path d="M12,-27 l-1,-4 M14,-27 l1,-4" stroke="#6b4a2f" stroke-width="1"/><circle cx="16" cy="-26" r=".6" fill="#111"/>' +
    '<animateTransform attributeName="transform" type="rotate" values="0 8 -15;0 8 -15;55 8 -15;55 8 -15;0 8 -15" keyTimes="0;.3;.4;.85;1" dur="9s" repeatCount="indefinite"/></g>';
  return layer(`<g transform="translate(${x},${b}) scale(1.35)">${body}${head}</g>`);
}

export function hedgehog(): Layer {
  const spikes = [0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${f1(-9 + i * 2.6)},-4 l1.3,-${4 + (i % 2) * 1.5} l1.3,${4 + (i % 2) * 1.5}" fill="#4a3a2a"/>`).join('');
  const body = `<ellipse cx="0" cy="-4" rx="10" ry="5.5" fill="#6b5640"/>${spikes}<ellipse cx="9" cy="-2.5" rx="4" ry="2.6" fill="#c9a882"/>` +
    '<circle cx="13" cy="-2.5" r="1" fill="#111"/><circle cx="10" cy="-3.5" r=".6" fill="#111"/>' +
    '<rect x="-5" y="-.5" width="2" height="1.5" fill="#3a2a1a"/><rect x="4" y="-.5" width="2" height="1.5" fill="#3a2a1a"/>';
  return layer(`<g><g><g transform="scale(1.6)">${body}</g><animateTransform attributeName="transform" type="translate" values="0 0;0 -.8;0 0" dur=".5s" repeatCount="indefinite"/></g>` +
    '<animateTransform attributeName="transform" type="translate" values="520 380;600 384;600 384;680 378" keyTimes="0;.45;.6;1" dur="40s" repeatCount="indefinite"/></g>');
}

export function hare(): Layer {
  const body = ('<ellipse cx="0" cy="-6" rx="8" ry="5" fill="#ecebe6"/><circle cx="7" cy="-9" r="3.6" fill="#ecebe6"/>' +
    '<path d="M6,-12 Q4,-21 6,-22 Q8,-21 8,-12 Z" fill="#ecebe6"/><path d="M8,-12 Q9,-20 11,-20 Q11,-15 9.5,-11.5 Z" fill="#e2e0d8"/>' +
    '<path d="M6.6,-13 Q5.5,-19 6.4,-20" stroke="#d9a3a3" stroke-width=".8" fill="none"/>' +
    '<circle cx="8.5" cy="-9.5" r=".7" fill="#111"/><circle cx="-8" cy="-6" r="2" fill="#fff"/><ellipse cx="-3" cy="-1" rx="4" ry="1.4" fill="#d9d7cf"/>')
    .split('#ecebe6').join('#ddd6c8').split('#e2e0d8').join('#cfc6b4');
  const hops = '60 372;90 360;120 372;150 360;180 372;180 372;150 360;120 372;90 360;60 372;60 372';
  return layer(`<g><g><g transform="scale(1.5)">${body}</g><animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 1;1 1;1 1;-1 1;-1 1;-1 1;-1 1;-1 1;1 1" ` +
    'keyTimes="0;.1;.2;.3;.4;.5;.6;.7;.8;.9;1" calcMode="discrete" dur="16s" repeatCount="indefinite"/></g>' +
    `<animateTransform attributeName="transform" type="translate" values="${hops}" dur="16s" repeatCount="indefinite"/></g>`);
}

export function squirrel(x = 712, b = 334): Layer {
  const body = '<path d="M-6,-4 Q-16,-8 -13,-20 Q-9,-26 -5,-18 Q-8,-12 -4,-8 Z" fill="#b8572a"><animateTransform attributeName="transform" type="rotate" values="0 -5 -6;-8 -5 -6;0 -5 -6;6 -5 -6;0 -5 -6" dur="2.4s" repeatCount="indefinite"/></path>' +
    '<ellipse cx="0" cy="-6" rx="5" ry="6.5" fill="#c4632f"/><ellipse cx="1" cy="-4" rx="2.6" ry="4" fill="#f1d3b0"/>' +
    '<g><circle cx="2" cy="-14" r="3.6" fill="#c4632f"/><path d="M0,-17 l-.5,-3 l2,2.4 Z M3.4,-17 l.8,-3 l1.2,2.8 Z" fill="#c4632f"/>' +
    '<circle cx="3.2" cy="-14.6" r=".7" fill="#111"/><ellipse cx="4" cy="-8.5" rx="2" ry="2.4" fill="#8a5a2a"/>' +
    '<animateTransform attributeName="transform" type="translate" values="0 0;0 1;0 0;0 1;0 0;0 0" keyTimes="0;.1;.2;.3;.4;1" dur="3s" repeatCount="indefinite"/></g>' +
    '<rect x="-3" y="-1" width="2" height="1.5" fill="#8a4a20"/><rect x="2" y="-1" width="2" height="1.5" fill="#8a4a20"/>';
  return layer(`<g transform="translate(${x},${b}) scale(1.45)">${body}</g>`);
}

export function owl(x = 198, y = 266): Layer {
  const eyes = '<g><circle cx="-2.4" cy="-3" r="2.2" fill="#ffd23f"/><circle cx="2.4" cy="-3" r="2.2" fill="#ffd23f"/>' +
    '<circle cx="-2.4" cy="-3" r=".9" fill="#111"/><circle cx="2.4" cy="-3" r=".9" fill="#111"/>' +
    '<animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 .1;1 1;1 1" keyTimes="0;.9;.93;.96;1" dur="5s" repeatCount="indefinite"/></g>';
  const head = '<g><ellipse cx="0" cy="-3" rx="5.2" ry="4.4" fill="#7a5c40"/><path d="M-4.5,-6.5 l-1,-2.5 l2.5,1.5 Z M4.5,-6.5 l1,-2.5 l-2.5,1.5 Z" fill="#7a5c40"/>' +
    `${eyes}<path d="M-.8,-1.4 L.8,-1.4 L0,0 Z" fill="#d99a3c"/>` +
    '<animateTransform attributeName="transform" type="rotate" values="0;0;-25;-25;0;0;20;20;0" keyTimes="0;.3;.35;.5;.55;.7;.75;.9;1" dur="14s" repeatCount="indefinite"/></g>';
  const body = '<ellipse cx="0" cy="5" rx="5" ry="6.5" fill="#6b4f36"/><path d="M-3,3 q3,2 6,0 M-3,6 q3,2 6,0" stroke="#c9a882" stroke-width=".7" fill="none"/>';
  return layer(`<g transform="translate(${x},${y}) scale(1.55)"><path d="M-12,12 L14,10" stroke="#5b4632" stroke-width="2.4" stroke-linecap="round"/>${body}${head}</g>`);
}
