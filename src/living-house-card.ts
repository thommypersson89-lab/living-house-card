// custom:living-house-card – a living picture of your house as live SVG.
import { LitElement, PropertyValues, css, html, nothing, svg } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { buildCached, compose } from './compose';
import { EXAMPLE, LivingHouseConfig } from './config';
import { Hass, HassEntity, Scene, derive } from './derive';
import { H, W, toScene } from './draw/util';
import { freeze, scopeIds } from './freeze';
import { modelFor } from './model';
import type { HouseModel } from './model/types';
import './editor';

const FADE_MS = 1500;
let uid = 0;

interface Entry {
  id: number;
  slot: string;
  variant: string;
  defs: string;
  body: string;
  move?: { x: number; y: number; masked: string; free: string };
  state: 'in' | 'old' | 'out';
  since: number;
  rank: number; // position in the layer order when the layer was last current
}

interface Hit {
  title: string;
  entity?: string;
  tap: { action: 'toggle' | 'more-info' | 'navigate' | 'none'; path?: string };
  shape: ReturnType<typeof svg>;
}

const TEXT = {
  en: { out: 'Out', in: 'In', rainIn: (m: string) => `Rain in ${m} min`, rainSoon: 'Rain soon', window: (n: string) => `${n}: tap to turn the lights on or off`,
    chimney: 'Chimney: power use', lamp: 'Street lamp', mailbox: 'Mailbox: the calendar', home: (n: string) => `${n} is home`,
    sky: 'A living picture of our home. Tap the sky for the forecast.', help: 'What does it all mean?' },
  sv: { out: 'Ute', in: 'Inne', rainIn: (m: string) => `Regn om ${m} min`, rainSoon: 'Regn snart', window: (n: string) => `${n}: tryck för att tända eller släcka`,
    chimney: 'Skorstenen: elförbrukning', lamp: 'Gatlyktan', mailbox: 'Brevlådan: kalendern', home: (n: string) => `${n} är hemma`,
    sky: 'En levande bild av vårt hem. Tryck på himlen för prognosen.', help: 'Vad betyder allt?' },
};

/** An entity to toggle, or a path to open. */
const tapOf = (target: string | undefined, fallback: Hit['tap']): Hit['tap'] =>
  !target ? fallback : target.startsWith('/') ? { action: 'navigate', path: target } : { action: 'toggle' };

export class LivingHouseCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _tick: { state: true },
  };

  hass?: Hass;
  _config?: LivingHouseConfig;
  _tick = 0;
  /** A clock the time machine and the tests can replace. */
  clock: () => Date = () => new Date();

  private _entries: Entry[] = [];
  private _memory = {};
  private _timer?: number;
  private _prune?: number;
  private _media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  private _onMedia = (): void => this.requestUpdate();

  static getConfigElement(): HTMLElement {
    return document.createElement('living-house-card-editor');
  }

  static getStubConfig(hass?: Hass): LivingHouseConfig {
    const ids = Object.keys(hass?.states ?? {});
    const weather = ids.find((e) => e.startsWith('weather.'));
    const people = ids.filter((e) => e.startsWith('person.')).slice(0, 2)
      .map((entity) => ({ name: (hass?.states[entity]?.attributes.friendly_name as string) ?? entity.split('.')[1], entity }));
    return { type: 'custom:living-house-card', weather: weather ?? EXAMPLE.weather, people };
  }

  setConfig(config: LivingHouseConfig): void {
    if (!config?.weather) throw new Error('Set weather: to a weather entity, e.g. weather.home');
    this._config = config;
  }

  getCardSize(): number {
    return 6;
  }

  getGridOptions(): Record<string, unknown> {
    return { columns: 12, min_columns: 6, rows: 'auto' };
  }

  connectedCallback(): void {
    super.connectedCallback();
    // clock-driven things (holidays, night mode, the moon) update every minute even when no state changes
    this._timer = window.setInterval(() => this._tick++, 60_000);
    this._media?.addEventListener?.('change', this._onMedia);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.clearInterval(this._timer);
    window.clearTimeout(this._prune);
    this._media?.removeEventListener?.('change', this._onMedia);
  }

  protected shouldUpdate(_changed: PropertyValues): boolean {
    return !!this._config && !!this.hass;
  }

  get reducedMotion(): boolean {
    return !!this._media?.matches;
  }

  private get _model(): HouseModel {
    return modelFor(this._config?.house);
  }

  /** Take in the new list of layers: new variants fade in over the old ones, layers that went away fade out. */
  private _sync(scene: Scene): void {
    const now = performance.now();
    const specs = compose(scene, this._model, this._config?.colors);
    const wanted = new Set(specs.map((s) => s.slot));
    const instant = this.reducedMotion;
    const next: Entry[] = [];
    specs.forEach((spec, rank) => {
      const cur = this._entries.find((e) => e.slot === spec.slot && e.state === 'in');
      const L = buildCached(spec);
      const content = (s: string): string => (scene.anim ? s : freeze(s));
      const mk = (id: number): Entry => ({
        id, slot: spec.slot, variant: spec.variant, state: 'in', since: now, rank,
        defs: L.defs ?? '', body: content(L.body),
        move: L.move && { x: L.move.x, y: L.move.y, masked: content(L.move.masked), free: content(L.move.free ?? '') },
      });
      if (cur && (cur.variant === spec.variant || spec.fade === false)) {
        const keep = mk(cur.id);
        keep.since = cur.since;
        if (cur.variant === spec.variant && cur.body === keep.body) next.push(Object.assign(cur, { rank }));
        else next.push(keep);
      } else {
        if (cur && !instant) next.push({ ...cur, state: 'old', since: now, rank });
        next.push(mk(++uid));
      }
    });
    // layers that should no longer show fade out; old versions stay under the new ones until those have faded in
    for (const e of this._entries) {
      if (next.includes(e)) continue;
      if (instant) continue;
      if (e.state === 'in' && !wanted.has(e.slot)) next.push({ ...e, state: 'out', since: now });
      else if (e.state !== 'in' && now - e.since < FADE_MS + 100) next.push(e);
    }
    // a stable order: by layer order, old versions before (under) new ones
    next.sort((a, b) => a.rank - b.rank || (a.state === 'in' ? 1 : 0) - (b.state === 'in' ? 1 : 0));
    this._entries = next;
    if (next.some((e) => e.state !== 'in')) {
      window.clearTimeout(this._prune);
      this._prune = window.setTimeout(() => this.requestUpdate(), FADE_MS + 150);
    }
  }

  protected render(): unknown {
    if (!this._config || !this.hass) return nothing;
    const cfg = this._config;
    const scene = derive(this.hass, cfg, { now: this.clock(), reducedMotion: this.reducedMotion, memory: this._memory });
    this._sync(scene);
    const big = !!cfg.large_labels;
    const t = this._text;
    return html`
      <ha-card>
        <div class="scene" data-light=${scene.light}>
          ${repeat(this._entries, (e) => e.id, (e) => this._layer(e))}
          ${this._hits(scene)}
          ${cfg.labels === false ? nothing : this._labels(big, scene)}
          ${!cfg.help_path ? nothing : html`<button class="help ${big ? 'big' : ''}" title=${t.help} aria-label=${t.help}
              @click=${() => this._navigate(cfg.help_path!)}>
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M11,18H13V16H11V18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z"/></svg>
            </button>`}
        </div>
      </ha-card>`;
  }

  private get _text(): (typeof TEXT)['en'] {
    const lang = this._config?.language ?? (this.hass?.language?.startsWith('sv') ? 'sv' : 'en');
    return TEXT[lang] ?? TEXT.en;
  }

  private _layer(e: Entry): unknown {
    const p = `l${e.id}-`;
    const m = e.move;
    return html`<svg class="layer ${e.state}" data-slot=${e.slot} viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      ${unsafeSVG(scopeIds(`<defs>${e.defs}</defs>${e.body}`, p))}
      ${m ? svg`<g class="mover" style="transform: translate(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px)">${unsafeSVG(scopeIds(m.free, p))}</g>
        <g mask="url(#${p}fg)"><g class="mover" style="transform: translate(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px)">${unsafeSVG(scopeIds(m.masked, p))}</g></g>` : nothing}
    </svg>`;
  }

  // ---- tap areas ----
  private _hits(scene: Scene): unknown {
    const cfg = this._config!, M = this._model, t = this._text;
    const hits: Hit[] = [];
    const box = (cx: number, cy: number, w: number, house = true): ReturnType<typeof svg> => {
      const [x, y] = house ? toScene(M, cx, cy) : [cx, cy];
      return svg`<rect x=${x - w / 2} y=${y - w * 0.45} width=${w} height=${w * 0.9} rx="3"/>`;
    };
    for (const r of cfg.rooms ?? []) {
      if (!r.light) continue;
      for (const p of M.windows[r.window] ?? []) {
        const [cx, cy, w] = p.kind === 'rect' ? [p.x + 13, p.y + 11, 36] : p.kind === 'skew' ? [p.x + 12, p.y + 7, 32] : [p.x + 6, p.y + 8, 20.8];
        hits.push({ entity: r.light, title: t.window(r.name ?? r.window), tap: { action: 'toggle' }, shape: box(cx, cy, w) });
      }
    }
    if (cfg.power) hits.push({ entity: cfg.power, title: t.chimney, tap: tapOf(cfg.tap?.chimney, { action: 'more-info' }), shape: box(M.chimney[0], M.chimney[1] + 20, 32) });
    if (cfg.tap?.street_lamp) hits.push({ entity: cfg.tap.street_lamp, title: t.lamp, tap: tapOf(cfg.tap.street_lamp, { action: 'more-info' }), shape: box(250, 264, 24, false) });
    if (cfg.calendar) hits.push({ entity: cfg.calendar, title: t.mailbox, tap: tapOf(cfg.tap?.mailbox, { action: 'more-info' }), shape: box(588, 326, 28, false) });
    for (const p of scene.people) {
      if (p.home && !scene.nightDim) hits.push({ entity: p.entity, title: t.home(p.name), tap: { action: 'more-info' }, shape: box(M.people.x + p.index * M.people.step, M.people.base - 17, 24) });
    }
    const sky: Hit = { entity: cfg.weather, title: t.sky, tap: { action: 'more-info' }, shape: svg`<rect width=${W} height=${H}/>` };
    return html`<svg class="hits" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
      ${[sky, ...hits].map((h) => svg`<g class="hit" role="button" tabindex=${h === sky ? -1 : 0} aria-label=${h.title}
          @pointerdown=${(ev: PointerEvent) => this._down(ev, h)} @pointerup=${(ev: PointerEvent) => this._up(ev, h)}
          @pointerleave=${() => this._cancel()} @contextmenu=${(ev: Event) => ev.preventDefault()}
          @keydown=${(ev: KeyboardEvent) => ['Enter', ' '].includes(ev.key) && this._act(h, false)}><title>${h.title}</title>${h.shape}</g>`)}
    </svg>`;
  }

  private _holdTimer?: number;
  private _held = false;
  private _down(ev: PointerEvent, h: Hit): void {
    ev.stopPropagation();
    this._held = false;
    window.clearTimeout(this._holdTimer);
    this._holdTimer = window.setTimeout(() => {
      this._held = true;
      this._act(h, true);
    }, 500);
  }
  private _up(ev: PointerEvent, h: Hit): void {
    ev.stopPropagation();
    window.clearTimeout(this._holdTimer);
    if (!this._held) this._act(h, false);
  }
  private _cancel(): void {
    window.clearTimeout(this._holdTimer);
  }

  private _act(h: Hit, hold: boolean): void {
    const a = hold ? { action: 'more-info' as const } : h.tap;
    if (a.action === 'toggle' && h.entity) {
      this.hass?.callService?.('homeassistant', 'toggle', { entity_id: h.entity });
    } else if (a.action === 'more-info' && h.entity) {
      this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: h.entity }, bubbles: true, composed: true }));
    } else if (a.action === 'navigate' && a.path) {
      this._navigate(a.path);
    }
  }

  private _navigate(path: string): void {
    history.pushState(null, '', path);
    window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
  }

  // ---- labels ----
  private _fmt(e: HassEntity | undefined, attr?: string, unit?: string): string | undefined {
    if (!e || ['unknown', 'unavailable'].includes(e.state)) return undefined;
    if (attr) {
      const v = e.attributes[attr];
      return v === undefined || v === null ? undefined : `${v}${unit ? ` ${unit}` : ''}`;
    }
    if (this.hass?.formatEntityState) return this.hass.formatEntityState(e);
    const u = e.attributes.unit_of_measurement;
    return `${e.state}${u ? ` ${u}` : ''}`;
  }

  private _labels(big: boolean, scene: Scene): unknown {
    const cfg = this._config!, S = this.hass!.states, t = this._text;
    const wx = S[cfg.weather];
    const pills: [string, string | undefined, string][] = [
      [`🌡 ${t.out} `, this._fmt(wx, 'temperature', wx?.attributes.temperature_unit ?? '°C'), '13%'],
      [`🏠 ${t.in} `, this._fmt(cfg.indoor?.temperature ? S[cfg.indoor.temperature] : undefined), '38%'],
      ['💧 ', this._fmt(cfg.indoor?.humidity ? S[cfg.indoor.humidity] : undefined), '62%'],
      ['💨 ', this._fmt(wx, 'wind_speed', wx?.attributes.wind_speed_unit), '86%'],
    ];
    const rain = scene.rainSoon;
    const rainText = rain === 'soon' ? `☔ ${t.rainSoon}` : rain && !['no', 'nej', 'unknown', 'unavailable'].includes(rain) ? `☔ ${t.rainIn(rain)}` : undefined;
    return html`${pills.filter(([, v]) => v !== undefined).map(([pre, v, left]) => html`<div class="pill ${big ? 'big' : ''}" style="left:${left}">${pre}${v}</div>`)}
      ${rainText ? html`<div class="pill rain ${big ? 'big' : ''}">${rainText}</div>` : nothing}`;
  }

  static styles = css`
    :host { display: block; }
    ha-card { overflow: hidden; }
    .scene { position: relative; width: 100%; aspect-ratio: 800 / 420; overflow: hidden; background: #1d3a55; border-radius: inherit; }
    .layer, .hits { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    .layer { pointer-events: none; }
    .layer.in { animation: lh-in ${FADE_MS}ms ease both; }
    .layer.out { animation: lh-out ${FADE_MS}ms ease both; }
    .mover { transition: transform 1.2s ease-in-out; }
    @keyframes lh-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes lh-out { from { opacity: 1; } to { opacity: 0; } }
    .hits .hit { cursor: pointer; fill: transparent; outline: none; }
    .hits .hit:focus-visible rect { stroke: #fff; stroke-width: 2; }
    .pill {
      position: absolute; top: 93%; transform: translate(-50%, -50%); color: #fff; background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px); border-radius: 16px; padding: 3px 9px; font-size: 12.5px; font-weight: 600; white-space: nowrap;
      pointer-events: none; font-family: var(--paper-font-body1_-_font-family, system-ui, sans-serif);
    }
    .pill.big { top: 92%; padding: 4px 11px; font-size: 15px; }
    .pill.rain { top: 8%; left: 14%; background: rgba(30, 60, 110, 0.55); }
    .help {
      position: absolute; top: 8%; left: 95.5%; transform: translate(-50%, -50%); width: 26px; height: 26px; padding: 2px;
      border: 0; background: none; color: rgba(255, 255, 255, 0.85); cursor: pointer; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
    }
    .help.big { width: 30px; height: 30px; }
    .help svg { width: 100%; height: 100%; }
    @media (prefers-reduced-motion: reduce) {
      .layer.in, .layer.out { animation: none; }
      .mover { transition: none; }
    }
  `;
}

if (!customElements.get('living-house-card')) customElements.define('living-house-card', LivingHouseCard);

declare global {
  interface Window {
    customCards?: { type: string; name: string; description: string; preview?: boolean; documentationURL?: string }[];
  }
}
window.customCards = window.customCards ?? [];
if (!window.customCards.some((c) => c.type === 'living-house-card')) {
  window.customCards.push({
    type: 'living-house-card',
    name: 'Living House',
    description: 'A living picture of your house: sun and moon, weather, lights, people, holidays and wildlife.',
    preview: true,
    documentationURL: 'https://github.com/thommypersson89-lab/living-house-card',
  });
}
