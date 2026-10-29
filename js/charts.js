// Petits graphiques SVG sans dépendance, avec infobulle au survol / toucher.
import { parseDate } from './program.js';

const W = 640, H = 220, PAD = { l: 40, r: 12, t: 12, b: 26 };
const MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

function niceRange(min, max, pad) {
  if (min === max) { min -= 1; max += 1; }
  const p = (max - min) * pad;
  return [min - p, max + p];
}
function ticks(min, max, n = 4) {
  const step = (max - min) / n;
  const mag = 10 ** Math.floor(Math.log10(step));
  const nice = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step);
  const out = [];
  for (let v = Math.ceil(min / nice) * nice; v <= max + 1e-9; v += nice) out.push(+v.toFixed(2));
  return out;
}
const fmtShort = s => { const d = parseDate(s); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };

// series: [{date, y}] ; smooth: [{date, y}] (ligne principale) ; target: valeur horizontale
export function lineChart({ points, line, target, unit = '', decimals = 1 }) {
  const all = [...points, ...(line || [])];
  if (!all.length) return '<p class="empty">Pas encore de données.</p>';
  const xs = all.map(p => parseDate(p.date).getTime());
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 86400000 * 3; x1 += 86400000 * 3; }
  const ys = all.map(p => p.y).concat(target != null ? [target] : []);
  const [y0, y1] = niceRange(Math.min(...ys), Math.max(...ys), 0.12);
  const X = d => PAD.l + ((parseDate(d).getTime() - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const Y = v => PAD.t + (1 - (v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);

  const grid = ticks(y0, y1).map(v =>
    `<line class="grid" x1="${PAD.l}" x2="${W - PAD.r}" y1="${Y(v)}" y2="${Y(v)}"/>` +
    `<text class="axis" x="${PAD.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const first = all.reduce((a, p) => (p.date < a ? p.date : a), all[0].date);
  const last = all.reduce((a, p) => (p.date > a ? p.date : a), all[0].date);
  const xl = `<text class="axis" x="${PAD.l}" y="${H - 6}">${fmtShort(first)}</text>` +
    `<text class="axis" x="${W - PAD.r}" y="${H - 6}" text-anchor="end">${fmtShort(last)}</text>`;
  const tgt = target != null
    ? `<line class="target" x1="${PAD.l}" x2="${W - PAD.r}" y1="${Y(target)}" y2="${Y(target)}"/>` +
      `<text class="axis" x="${W - PAD.r - 4}" y="${Y(target) - 5}" text-anchor="end">objectif ${target}${unit}</text>`
    : '';
  const dots = points.map(p => `<circle class="${line ? 'dot-muted' : 'dot'}" cx="${X(p.date)}" cy="${Y(p.y)}" r="${line ? 3 : 4}"/>`).join('');
  const main = line || points;
  const path = main.length > 1
    ? `<path class="line" d="${main.map((p, i) => `${i ? 'L' : 'M'}${X(p.date).toFixed(1)},${Y(p.y).toFixed(1)}`).join('')}"/>` : '';
  const ends = main.length ? `<circle class="dot" cx="${X(main.at(-1).date)}" cy="${Y(main.at(-1).y)}" r="4.5"/>` : '';

  const tipData = (line || points).map(p => {
    const raw = line ? points.find(q => q.date === p.date) : null;
    return { x: X(p.date), y: Y(p.y), t: `${fmtShort(p.date)} · ${p.y.toFixed(decimals)}${unit}` + (raw ? ` (pesée ${raw.y.toFixed(1)})` : '') };
  });
  return `<div class="chart" data-tips='${JSON.stringify(tipData).replace(/'/g, '&#39;')}'>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">${grid}${tgt}${xl}${dots}${path}${ends}
      <line class="cross" x1="0" x2="0" y1="${PAD.t}" y2="${H - PAD.b}" style="display:none"/></svg>
    <div class="tip" hidden></div></div>`;
}

// bars: [{label, y, title}]
export function barChart({ bars, unit = '' }) {
  if (!bars.some(b => b.y > 0)) return '<p class="empty">Pas encore de données.</p>';
  const max = Math.max(...bars.map(b => b.y)) * 1.15;
  const Y = v => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const bw = (W - PAD.l - PAD.r) / bars.length;
  const grid = ticks(0, max).map(v =>
    `<line class="grid" x1="${PAD.l}" x2="${W - PAD.r}" y1="${Y(v)}" y2="${Y(v)}"/>` +
    `<text class="axis" x="${PAD.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const rects = bars.map((b, i) => {
    const x = PAD.l + i * bw + 2, w = Math.max(2, bw - 4), h = Y(0) - Y(b.y);
    const r = Math.min(4, w / 2, h);
    const d = h > 0 ? `M${x},${Y(0)}V${Y(b.y) + r}Q${x},${Y(b.y)} ${x + r},${Y(b.y)}H${x + w - r}Q${x + w},${Y(b.y)} ${x + w},${Y(b.y) + r}V${Y(0)}Z` : '';
    return `<path class="bar" d="${d}"/><text class="axis" x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${b.label}</text>`;
  }).join('');
  const tipData = bars.map((b, i) => ({ x: PAD.l + i * bw + bw / 2, y: Y(b.y), t: `${b.title} · ${b.y}${unit}` }));
  return `<div class="chart" data-tips='${JSON.stringify(tipData).replace(/'/g, '&#39;')}'>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">${grid}${rects}
      <line class="cross" x1="0" x2="0" y1="${PAD.t}" y2="${H - PAD.b}" style="display:none"/></svg>
    <div class="tip" hidden></div></div>`;
}

export function bindTips(root) {
  root.querySelectorAll('.chart[data-tips]').forEach(el => {
    const tips = JSON.parse(el.dataset.tips);
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), cross = el.querySelector('.cross');
    const show = ev => {
      const rect = svg.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * W;
      let best = tips[0];
      for (const t of tips) if (Math.abs(t.x - px) < Math.abs(best.x - px)) best = t;
      cross.setAttribute('x1', best.x); cross.setAttribute('x2', best.x); cross.style.display = '';
      tip.hidden = false; tip.textContent = best.t;
      const left = (best.x / W) * rect.width, top = (best.y / H) * rect.height;
      tip.style.left = `${Math.min(Math.max(left, 60), rect.width - 60)}px`;
      tip.style.top = `${Math.max(top - 34, 0)}px`;
    };
    el.addEventListener('pointermove', show);
    el.addEventListener('pointerdown', show);
    el.addEventListener('pointerleave', () => { tip.hidden = true; cross.style.display = 'none'; });
  });
}
