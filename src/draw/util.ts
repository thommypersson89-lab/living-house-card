// Shared drawing helpers. Everything is drawn in an 800x420 scene. The house is drawn in its model's
// own coordinates and placed in the scene with the model's transform (see src/model).
import type { HouseModel, Point } from '../model/types';

export const W = 800;
export const H = 420;

/** One layer: defs (gradients, masks …) and content. Ids are made unique per layer when the card renders. */
export interface Layer {
  defs?: string;
  body: string;
  /** Sun and moon: drawn around (0,0) and moved with a CSS transform, so they glide across the sky. */
  move?: { x: number; y: number; masked: string; free?: string };
}

export const layer = (body: string, defs = ''): Layer => ({ body, defs });

/** Model coordinates -> scene coordinates. */
export function toScene(M: HouseModel, x: number, y: number): Point {
  const [cx, cy] = M.center;
  return [cx + (x - cx) * M.scale, cy + (y - cy) * M.scale];
}

/** Wrap content drawn in model coordinates. */
export const inHouse = (M: HouseModel, g: string): string => {
  const [cx, cy] = M.center;
  return `<g transform="translate(${cx},${cy}) scale(${M.scale}) translate(${-cx},${-cy})">${g}</g>`;
};

/** Number formats ({x:.0f} and friends in the original Python). */
export const f0 = (x: number): string => x.toFixed(0);
export const f1 = (x: number): string => x.toFixed(1);
export const f2 = (x: number): string => x.toFixed(2);

export function grad(id: string, c: string, a = 0.6, c2?: string): string {
  return (
    `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/>` +
    `<stop offset="1" stop-color="${c2 ?? c}" stop-opacity="0"/></radialGradient>`
  );
}

export function shade(hex: string, f: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const v = [0, 2, 4].map((i) => Math.min(255, Math.floor(parseInt(h.slice(i, i + 2), 16) * f)));
  return '#' + v.map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** Deterministic randomness (mulberry32), so the scene looks the same every time. */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  random(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }
  choice<T>(xs: readonly T[]): T {
    return xs[Math.floor(this.random() * xs.length)];
  }
}

export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// the landscape (the same for every house model)
export const GROUND = `M0,318 C180,296 300,300 400,302 C520,304 640,294 ${W},312 L${W},${H} L0,${H} Z`;
export const TREES: [number, number, number, number][] = [
  [150, 322, 92, 0],
  [210, 326, 64, 1],
  [680, 320, 100, 2],
  [742, 326, 62, 3],
  [92, 328, 52, 4],
];
export const CLOUD_POS: [number, number, number][] = [
  [170, 95, 1.0],
  [470, 74, 1.1],
  [330, 60, 0.8],
  [680, 120, 0.9],
  [80, 150, 0.85],
];

/** Foreground mask: sky layers are hidden behind the ground and the house. */
export const fgMask = (M: HouseModel): string =>
  '<mask id="fg"><rect width="800" height="420" fill="#fff"/><g fill="#000">' +
  `<path d="${GROUND}"/>${inHouse(M, M.outline)}</g></mask>`;
export const houseMask = (M: HouseModel): string =>
  `<mask id="hm"><rect width="800" height="420" fill="#fff"/><g fill="#000">${inHouse(M, M.outline)}</g></mask>`;
