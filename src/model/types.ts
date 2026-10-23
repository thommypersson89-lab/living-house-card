// A house model: the drawing of one house plus the anchor points everything else is placed from
// (lit windows, smoke, string lights, people, decorations). Coordinates are in the model's own
// space; `center` and `scale` place the house in the 800x420 scene.

export type Look = 'spring' | 'summer' | 'autumn' | 'winter' | 'winterbar';

/** Window pane shapes: a front window with curtains, a side window seen in perspective, a small gable window. */
export type PaneKind = 'rect' | 'skew' | 'small';
export interface Pane {
  kind: PaneKind;
  x: number;
  y: number;
}

export interface HouseColors {
  wall?: string;
  side?: string;
  roof?: string;
  door?: string;
  curtains?: string;
}

export type Point = [number, number];

export interface HouseModel {
  id: string;
  name: string;
  center: Point;
  scale: number;
  /** silhouette of the whole house (used for masks) */
  outline: string;
  /** side wall and roof silhouettes, tinted by the golden hour */
  sideOutline: string;
  roofOutline: string;
  /** window id -> panes; ids are what `rooms[].window` refers to */
  windows: Record<string, Pane[]>;
  /** windows people are seen in at night (pane index into `windows.front`) */
  silhouettes: number[];
  /** sun shadow on the ground: left x, right x, ground y (model coords) */
  footprint: [number, number, number];
  /** soft contact shadow under the house: cx, cy, rx (scene coords) */
  groundShadow: [number, number, number];
  /** first stone of the garden path (model coords) */
  pathStart: Point;
  /** bushes at the house corners (scene x) */
  bushes: number[];
  door: Point;
  porchLamp: Point;
  chimney: Point;
  /** where music notes rise: 'door', 'roof' and window ids */
  spots: Record<string, Point>;
  /** first person's spot by the door and the step between people */
  people: { x: number; step: number; base: number };
  /** roof edges for string lights and bunting */
  eaves: Point[][];
  /** glint sweep range over the front and side windows */
  glint: { front: [number, number]; side: [number, number] };
  /** icicles along the eave: start, step and count */
  icicles: { x: number; y: number; dx: number; dy: number; n: number };
  /** decorations */
  deco: {
    star: Point; // advent star hanging in a front window
    candles: Point; // advent candlestick in the other front window
    pumpkins: [number, number, number][]; // x, ground y, size
    twigs: Point; // easter twigs in a pot
    lucia: Point;
    santa: Point;
    balloons: Point; // where the balloon strings are tied
    hearts: Point[]; // where valentine hearts float up from
    windowHeart: Point;
    treat: Point; // plate on the porch
    lanterns: Point; // crayfish-party lanterns hang from this corner
  };
  body(night: boolean, look: Look, colors: HouseColors, panes: string): string;
  snowRoof: string;
  frostRoof: string;
}
