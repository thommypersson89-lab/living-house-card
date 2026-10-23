// Power saving / reduced motion: freeze every SMIL animation in an SVG fragment.
// Elements marked data-s="0" (shooting stars, birds, sparks …) are removed; the rest get a resting value.

const SVGNS = 'http://www.w3.org/2000/svg';
const ANIM = new Set(['animate', 'animateTransform', 'animateMotion', 'set']);
const cache = new Map<string, string>();

export function freeze(fragment: string): string {
  if (!fragment.includes('<animate') && !fragment.includes('data-s')) return fragment;
  const hit = cache.get(fragment);
  if (hit !== undefined) return hit;
  const doc = new DOMParser().parseFromString(`<svg xmlns="${SVGNS}">${fragment}</svg>`, 'image/svg+xml');
  const root = doc.documentElement;
  root.querySelectorAll('[data-s="0"]').forEach((el) => el.remove());
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (!ANIM.has(el.localName)) continue;
    const parent = el.parentElement;
    if (!parent) continue;
    const an = el.getAttribute('attributeName') ?? '';
    const vals = el.getAttribute('values');
    const seq = vals ? vals.split(';').map((v) => v.trim()) : [el.getAttribute('from'), el.getAttribute('to')].filter((v): v is string => !!v);
    if (el.localName === 'animate' && seq.length) {
      if (an === 'opacity') {
        const nums = seq.map(Number).filter((n) => Number.isFinite(n));
        if (nums.length) parent.setAttribute('opacity', String(Math.max(...nums)));
      } else parent.setAttribute(an, seq[0]);
    } else if (el.localName === 'animateTransform' && seq.length) {
      const typ = el.getAttribute('type') ?? 'translate';
      parent.setAttribute('transform', `${typ}(${typ === 'scale' ? seq[seq.length - 1] : seq[0]})`);
    }
    el.remove();
  }
  root.querySelectorAll('[data-s]').forEach((el) => el.removeAttribute('data-s'));
  const ser = new XMLSerializer();
  const res = Array.from(root.childNodes).map((n) => ser.serializeToString(n)).join('').replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
  if (cache.size > 300) cache.delete(cache.keys().next().value as string);
  cache.set(fragment, res);
  return res;
}

/** Make ids unique per layer (all layers share the card's shadow root). */
export function scopeIds(svg: string, prefix: string): string {
  return svg.replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
}
