import * as P from './program.js';
import * as store from './store.js';
import * as sync from './sync.js';
import { lineChart, barChart, bindTips } from './charts.js';
import { GUIDE, imgUrls, ALL_IMAGES } from './guide.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = v => (v === '' || v == null || isNaN(+v) ? null : +v);
const today = () => P.fmtDate(new Date());
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DROP_TECH = ['dropset', 'dropset3', 'myo', 'restpause'];
const TABS = ['today', 'plan', 'stats', 'settings'];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const I = {
  left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

const QUOTES = [
  'La discipline bat la motivation. Tous les jours.',
  'Une série de plus que la dernière fois. C\'est tout.',
  'Le 21 mars, tu remercieras le toi d\'aujourd\'hui.',
  'Pas besoin d\'être parfait, juste régulier.',
  'Ça brûle ? C\'est que ça marche.',
  'Lent sur la descente, fier sur la montée.',
  'Les abdos se construisent à la salle et se révèlent dans l\'assiette.',
  'Chaque kilomètre au bord de Loire compte pour le semi.',
  'Tu n\'as pas besoin d\'envie. Tu as besoin d\'y aller.',
  'Le muscle se souvient. Rappelle-lui qui tu es.',
  'Petits progrès, gros résultats.',
  'Une séance ratée ne casse rien. Deux, c\'est une habitude.',
  'Concentre-toi sur la contraction, pas sur la charge.',
  'Hydrate, dors, répète.',
];

const state = { tab: 'today', date: today(), planWeek: null, statEx: null, showMeas: false, showQR: false, pop: null,
  planMode: 'week', calWeek: null, calMonth: null };
const meters = new Map();

function longDate(s) { const d = P.parseDate(s); return `${DAYS[P.isoDow(s) - 1]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function shortDate(s) { const d = P.parseDate(s); return `${d.getDate()}/${d.getMonth() + 1}`; }
function clampWeek(date) { return P.weekOf(date) || (date < P.START ? 1 : P.WEEKS); }

function toast(msg) {
  const t = $('#toast'); t.hidden = true; void t.offsetWidth;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600);
}
const buzz = (p = 12) => navigator.vibrate?.(p);

// ---------- Confettis ----------
const COLORS = ['#7c5cff', '#22d3ee', '#34d399', '#ffb547', '#ff4f6d', '#ffffff'];
let parts = [], confRaf = 0;
function confetti(x = innerWidth / 2, y = innerHeight / 3, n = 120, spread = 1) {
  if (REDUCED) return;
  const c = $('#confetti'), dpr = devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (4 + Math.random() * 8) * spread;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6 * spread, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
      w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, c: COLORS[i % COLORS.length], life: 1 });
  }
  if (!confRaf) confRaf = requestAnimationFrame(confStep);
}
function confStep() {
  const c = $('#confetti'), ctx = c.getContext('2d'), dpr = devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
  for (const p of parts) {
    p.vy += .28; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= .006;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
  }
  confRaf = parts.length ? requestAnimationFrame(confStep) : 0;
  if (!parts.length) ctx.clearRect(0, 0, innerWidth, innerHeight);
}
function burstAt(el, n = 40) {
  const r = el?.getBoundingClientRect();
  if (r) confetti(r.left + r.width / 2, r.top + r.height / 2, n, .6);
}

// ---------- Données dérivées ----------
function exHistory(id, before) {
  const out = [];
  for (const [k, r] of store.all('ex')) {
    const [d, eid] = k.split('|');
    if (eid === id && d < before && (r.sets?.some(s => s.w != null || s.r != null) || r.rounds?.some(Boolean))) out.push({ date: d, ...r });
  }
  return out;
}
const fmtSet = s => `${s.w ?? '–'}×${s.r ?? '–'}` + (s.drops?.length ? ` → ${s.drops.map(d => `${d.w ?? '–'}×${d.r ?? '–'}`).join(' → ')}` : '');

function sessionTypeFor(date) {
  const day = store.get('days', date);
  if (day?.plan) return day.plan === 'NONE' ? null : day.plan;
  return P.defaultSession(date);
}
const isWorkout = t => ['HA', 'BA', 'HB', 'BB'].includes(t);

function exProgress(date, it) {
  const rec = store.get('ex', `${date}|${it.id}`) || {};
  if (it.log === 'check') {
    const n = Math.max(it.sets, rec.rounds?.length || 0);
    return { done: (rec.rounds || []).filter(Boolean).length, total: n };
  }
  const n = Math.max(it.sets, rec.sets?.length || 0);
  return { done: (rec.sets || []).filter(s => s?.ok).length, total: n };
}
function sessionProgress(date, type) {
  if (!isWorkout(type)) return null;
  const w = P.workoutFor(type, clampWeek(date));
  return w.items.reduce((a, it) => { const p = exProgress(date, it); a.done += Math.min(p.done, p.total); a.total += p.total; return a; }, { done: 0, total: 0 });
}

function activeDates() {
  const s = new Set();
  for (const [d, r] of store.all('days')) if (r.weight != null || r.done || Object.values(r.checks || {}).some(Boolean)) s.add(d);
  for (const [k, r] of store.all('ex')) if (r.sets?.some(x => x?.ok) || r.rounds?.some(Boolean)) s.add(k.split('|')[0]);
  for (const [d, r] of store.all('runs')) if (r.done) s.add(d);
  return s;
}
function streak() {
  const s = activeDates();
  let d = s.has(today()) ? today() : P.addDays(today(), -1), n = 0;
  while (s.has(d)) { n++; d = P.addDays(d, -1); }
  return n;
}
function rolling(points, n = 7) {
  return points.map(p => {
    const from = P.addDays(p.date, -(n - 1));
    const win = points.filter(q => q.date >= from && q.date <= p.date);
    return { date: p.date, y: win.reduce((a, q) => a + q.y, 0) / win.length };
  });
}
function weightSeries() {
  const pts = store.all('days').filter(([, d]) => num(d.weight) != null).map(([date, d]) => ({ date, y: +d.weight }));
  return { pts, avg: rolling(pts) };
}

// ---------- Vue Aujourd'hui ----------
function renderHero(date, type) {
  const week = P.weekOf(date), dayN = P.daysBetween(P.START, date) + 1;
  const rel = P.daysBetween(today(), date);
  const eyebrow = rel === 0 ? 'Aujourd\'hui' : rel === -1 ? 'Hier' : rel === 1 ? 'Demain' : week ? `Semaine ${week}` : 'Aperçu';
  let p, big, lab;
  const sp = sessionProgress(date, type);
  if (!week && date < P.START) { p = 0; big = `J-${P.daysBetween(date, P.START)}`; lab = 'avant le départ'; }
  else if (!week) { p = 1; big = '🏁'; lab = 'terminé'; }
  else if (sp) { p = sp.total ? sp.done / sp.total : 0; big = `${Math.round(p * 100)}%`; lab = 'séance'; }
  else if (type?.startsWith('RUN')) { const r = store.get('runs', date); p = r?.done ? 1 : 0; big = r?.done ? '✓' : `${P.runFor(type, week).minutes}'`; lab = r?.done ? 'faite' : 'course'; }
  else { p = dayN / 105; big = `${dayN}`; lab = 'jour / 105'; }

  const { avg } = weightSeries();
  const st = streak();
  const prog = week ? `S${week}/15 · ${P.phaseOf(week).name}` : date < P.START ? `Départ ${shortDate(P.START)}` : 'Terminé';
  const quote = QUOTES[Math.abs(P.daysBetween(P.START, date)) % QUOTES.length];
  return `
  <section class="hero" data-swipe>
    <div class="hero-top">
      <button class="icon" data-act="prev" aria-label="Jour précédent">${I.left}</button>
      <div class="hero-date"><span class="eyebrow">${eyebrow}</span><h1>${longDate(date)}</h1></div>
      <button class="icon" data-act="next" aria-label="Jour suivant">${I.right}</button>
    </div>
    <div class="hero-body">
      <div class="ring-wrap">
        <svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="50"/>
          <circle class="ring-fg" cx="60" cy="60" r="50" pathLength="100" data-meter="ring" data-p="${p}"/></svg>
        <div class="ring-txt"><b>${big}</b><span>${lab}</span></div>
      </div>
      <div class="hero-stats">
        <div class="hs"><span>Programme</span><b>${prog}</b></div>
        <div class="hs"><span>Série en cours</span><b>🔥 ${st} j</b></div>
        <div class="hs"><span>Poids moy. 7 j</span><b>${avg.length ? `${avg.at(-1).y.toFixed(1)} kg` : '—'}</b></div>
      </div>
    </div>
    <p class="hero-quote">« ${esc(quote)} »</p>
  </section>
  ${date !== today() ? `<button class="link today-link" data-act="goto-today">↩ Revenir à aujourd'hui</button>` : ''}
  ${!week && date < P.START ? `<button class="link today-link" data-act="goto-start">Aperçu du jour 1 →</button>` : ''}`;
}

function renderToday() {
  const date = state.date, day = store.get('days', date) || {};
  const type = sessionTypeFor(date);
  const week = clampWeek(date);
  const opts = [['', `Auto · ${P.SESSION_TYPES[P.defaultSession(date)] || 'aucune'}`], ...Object.entries(P.SESSION_TYPES), ['NONE', 'Aucune']]
    .map(([v, l]) => `<option value="${v}" ${(day.plan || '') === v ? 'selected' : ''}>${l}</option>`).join('');
  const select = `<select class="chip-select" data-day-select="plan" aria-label="Changer la séance">${opts}</select>`;

  let head, body;
  if (isWorkout(type)) {
    const w = P.workoutFor(type, week), [title, sub] = w.name.split(' — ');
    head = { ico: '🏋️', cls: '', small: title, title: sub || title };
    body = renderWorkout(date, w, day);
  } else if (type?.startsWith('RUN')) {
    const r = P.runFor(type, week);
    head = { ico: '🏃', cls: 'run', small: 'Course', title: r.name };
    body = renderRun(date, type, week);
  } else {
    head = { ico: '🌿', cls: 'rest', small: 'Récupération', title: type === 'REST' ? 'Jour de repos' : 'Pas de séance' };
    body = `<div class="card rest-card"><div class="big">😌</div><p><b>${type === 'REST' ? 'Repos actif' : 'Journée libre'}</b></p>
      <p class="muted">Marche, étirements, révisions TOEIC. Les muscles grandissent pendant la récup.</p></div>`;
  }

  const showMeas = state.showMeas || P.isoDow(date) === 1 || store.get('measures', date);
  return `<div class="page page-today">
    <div class="a-hero">${renderHero(date, type)}</div>
    <section class="sess">
      <div class="sec-h"><div class="sec-ico ${head.cls}">${head.ico}</div>
        <div class="sec-t"><small>${esc(head.small)}</small><h2>${esc(head.title)}</h2></div>${select}</div>
      ${body}
    </section>
    <div class="a-daily">${renderDaily(date, day)}
      ${showMeas ? renderMeasures(date) : `<button class="link center" data-act="show-meas">+ Ajouter des mensurations</button>`}</div>
  </div>`;
}

function renderWorkout(date, w, day) {
  const groups = {};
  w.items.forEach(it => { if (it.group) (groups[it.group] ||= []).push(it.id); });
  const sp = w.items.reduce((a, it) => { const p = exProgress(date, it); a.done += Math.min(p.done, p.total); a.total += p.total; return a; }, { done: 0, total: 0 });
  let idx = 0;
  const items = w.items.map(it => {
    const gi = it.group ? groups[it.group].indexOf(it.id) + 1 : 0;
    const label = gi ? `${it.group}${gi}` : `${++idx}`;
    const link = gi > 1 ? `<div class="grp-link">ENCHAÎNE SANS REPOS</div>` : '';
    return link + renderExercise(date, it, label);
  }).join('');
  return `
    <div class="sess-prog"><span>${sp.done}/${sp.total} séries</span><div class="bar ${sp.done === sp.total && sp.total ? 'good' : ''}"><i data-meter="sess" data-p="${sp.total ? sp.done / sp.total : 0}"></i></div></div>
    <p class="note">🎯 ${esc(w.phase.rir)}</p>
    <div class="ex-list">${items}</div>
    <button class="btn ${day.done ? 'done' : 'primary'} full finish" data-act="toggle-done">${day.done ? `${I.check.replace('<svg', '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="3"')} Séance terminée` : 'Terminer la séance'}</button>`;
}

const MUSCLE_CAT = { Dos: 'dos', Pecs: 'pecs', 'Épaules': 'epaules', Biceps: 'bras', Triceps: 'bras',
  Quadriceps: 'jambes', Ischios: 'jambes', Fessiers: 'jambes', Mollets: 'jambes', Abdos: 'core', Obliques: 'core', Gainage: 'core' };
function muscleTag(id) {
  const m = P.MUSCLES[id];
  return m ? `<span class="mtag m-${MUSCLE_CAT[m.split(' ')[0]] || 'core'}">${esc(m)}</span>` : '';
}

function renderExercise(date, it, label) {
  const key = `${date}|${it.id}`;
  const rec = store.get('ex', key) || {};
  const last = exHistory(it.id, date).at(-1);
  const tech = it.tech ? P.TECH[it.tech] : null;
  const pr = exProgress(date, it);
  const complete = pr.total && pr.done >= pr.total;
  const rest = it.rest ? (it.rest >= 60 ? `${Math.floor(it.rest / 60)}'${it.rest % 60 ? String(it.rest % 60).padStart(2, '0') : ''}` : `${it.rest}"`) : null;
  const head = `
    <div class="ex-h">
      <span class="ex-i">${complete ? I.check.replace('<svg', '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"') : label}</span>
      <span class="ex-n">${esc(it.name)}</span>
      ${GUIDE[it.id] ? `<button class="guide-btn" data-act="guide" data-ex="${it.id}" aria-label="Voir le geste"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/></svg><span>Geste</span></button>` : ''}
    </div>
    <div class="ex-m">${muscleTag(it.id)}<span class="tag">${it.sets} × ${esc(it.reps)}</span>${rest ? `<span class="tag">⏱ ${rest}</span>` : ''}
      ${tech ? `<button class="badge" data-act="tech">${tech.label} ⓘ</button>` : ''}</div>
    <div class="tech-d" hidden>${tech ? esc(tech.desc) : ''}</div>
    ${it.cue ? `<div class="cue">💡 ${esc(it.cue)}</div>` : ''}`;
  const cls = `ex ${it.group ? 'in-grp' : ''} ${complete ? 'complete' : ''}`;

  if (it.log === 'check') {
    const rounds = rec.rounds || [];
    const boxes = Array.from({ length: Math.max(it.sets, rounds.length) }, (_, i) =>
      `<button class="round ${rounds[i] ? 'on' : ''}" data-act="round" data-ex="${it.id}" data-i="${i}" data-pop="r|${it.id}|${i}">${rounds[i] ? '✓ ' : ''}Tour ${i + 1}</button>`).join('');
    return `<div class="${cls}" data-exid="${it.id}">${head}<div class="rounds">${boxes}</div></div>`;
  }

  const sets = rec.sets || [];
  const n = Math.max(it.sets, sets.length);
  const lastSets = last?.sets || [];
  const rows = Array.from({ length: n }, (_, i) => {
    const s = sets[i] || {}, ls = lastSets[i] || lastSets.at(-1) || {};
    const drops = (s.drops || []).map((d, j) => `
      <div class="set drop">
        <span class="sn">↳</span>
        <input class="w" inputmode="decimal" data-ex="${it.id}" data-i="${i}" data-j="${j}" data-f="w" value="${d.w ?? ''}" placeholder="kg">
        <span class="x">×</span>
        <input class="r" inputmode="numeric" data-ex="${it.id}" data-i="${i}" data-j="${j}" data-f="r" value="${d.r ?? ''}" placeholder="reps">
        <button class="tick mini" data-act="rm-drop" data-ex="${it.id}" data-i="${i}" data-j="${j}" aria-label="Supprimer le palier">${I.x}</button>
      </div>`).join('');
    return `
      <div class="set ${s.ok ? 'is-ok' : ''}">
        <span class="sn">${i + 1}</span>
        <input class="w" inputmode="decimal" data-ex="${it.id}" data-i="${i}" data-f="w" value="${s.w ?? ''}" placeholder="${ls.w ?? 'kg'}">
        <span class="x">×</span>
        <input class="r" inputmode="numeric" data-ex="${it.id}" data-i="${i}" data-f="r" value="${s.r ?? ''}" placeholder="${ls.r ?? esc(it.reps.split(/[-\/ ]/)[0])}">
        <button class="tick ${s.ok ? 'on' : s.w != null && s.r != null ? '' : 'need'}" data-act="ok" data-ex="${it.id}" data-i="${i}" data-pop="s|${it.id}|${i}" aria-label="Série faite">${I.check}</button>
      </div>${drops}`;
  }).join('');

  return `<div class="${cls}" data-exid="${it.id}">${head}
    ${last ? `<div class="last">↺ ${shortDate(last.date)} · ${last.sets.filter(s => s.w != null || s.r != null).map(fmtSet).join(' · ')}</div>` : ''}
    ${rows}
    <div class="ex-actions">
      <button class="link" data-act="add-set" data-ex="${it.id}">+ série</button>
      ${DROP_TECH.includes(it.tech) ? `<button class="link" data-act="add-drop" data-ex="${it.id}">+ palier</button>` : ''}
      <input class="ex-note" data-ex="${it.id}" data-f="note" value="${esc(rec.note || '')}" placeholder="Note (réglage machine…)">
    </div>
  </div>`;
}

function runSegments(desc, minutes) {
  const segs = [{ t: 'warm', m: 5 }];
  let m = desc.match(/(\d+) × \((\d+) min course \/ (\d+) min marche\)/);
  if (m) { for (let i = 0; i < +m[1]; i++) segs.push({ t: 'run', m: +m[2] }, { t: 'walk', m: +m[3] }); return segs; }
  m = desc.match(/(\d+) × (\d+) min course \/ (\d+) min marche/);
  if (m) { for (let i = 0; i < +m[1]; i++) { segs.push({ t: 'run', m: +m[2] }); if (i < +m[1] - 1) segs.push({ t: 'walk', m: +m[3] }); } return segs; }
  segs.push({ t: 'run', m: minutes });
  return segs;
}

function renderRun(date, type, week) {
  const plan = P.runFor(type, week);
  const r = store.get('runs', date) || {};
  const prev = store.all('runs').filter(([d]) => d < date).at(-1);
  const pain = prev && (prev[1].knee >= 2 || prev[1].achilles >= 2);
  const segs = runSegments(plan.desc, plan.minutes);
  const scale = (field, label) => `
    <div class="field"><label>${label}</label><div class="seg">${[0, 1, 2, 3].map(v =>
      `<button class="${r[field] === v ? 'on' : ''} ${v >= 2 ? 'warn' : ''}" data-act="run-scale" data-f="${field}" data-v="${v}">${v}</button>`).join('')}</div></div>`;
  return `
    <div class="card">
      <div class="run-hero">
        <div class="run-min">${plan.minutes}<small> min</small></div>
        <p class="run-desc">${esc(plan.desc)}</p>
      </div>
      <div class="timeline">${segs.map((s, i) => `<div class="seg-t ${s.t}" style="flex:${s.m};animation-delay:${0.15 + i * 0.04}s" title="${s.m} min"></div>`).join('')}</div>
      <div class="legend"><span><i class="seg-t warm"></i>Échauffement marche</span><span><i class="seg-t run"></i>Course</span>${segs.some(s => s.t === 'walk') ? '<span><i class="seg-t walk"></i>Marche</span>' : ''}</div>
      <p class="note">Allure conversation : tu dois pouvoir parler. Bords de Loire, Pont de l'Europe ↔ Pont George-V ≈ 4 km.</p>
      ${pain ? `<p class="alert">⚠️ Douleur ≥ 2 à la dernière sortie (${shortDate(prev[0])}) : raccourcis de 30 % aujourd'hui. Si ça persiste, vélo à la place.</p>` : ''}
    </div>
    <div class="card">
      <div class="card-h"><h2>Ta sortie</h2></div>
      <div class="grid2">
        <div class="field"><label>Durée (min)</label><input inputmode="numeric" data-run="min" value="${r.min ?? ''}" placeholder="${plan.minutes}"></div>
        <div class="field"><label>Distance (km)</label><input inputmode="decimal" data-run="km" value="${r.km ?? ''}" placeholder="Strava"></div>
      </div>
      <div class="field"><label>Ressenti · 1 facile → 5 très dur</label><div class="seg">${[1, 2, 3, 4, 5].map(v =>
        `<button class="${r.rpe === v ? 'on' : ''}" data-act="run-scale" data-f="rpe" data-v="${v}">${v}</button>`).join('')}</div></div>
      <div class="grid2">${scale('knee', 'Douleur genoux')}${scale('achilles', 'Douleur Achille')}</div>
      <div class="field"><label>Note</label><input data-run="note" value="${esc(r.note || '')}" placeholder="Météo, sensations…"></div>
      <button class="btn ${r.done ? 'done' : 'primary'} full" data-act="run-done">${r.done ? '✓ Sortie validée' : 'Valider la sortie'}</button>
    </div>`;
}

function renderDaily(date, d) {
  const checks = d.checks || {};
  const sg = P.stepsGoal(sessionTypeFor(date), P.weekOf(date));
  const sp = Math.min(1, (num(d.steps) || 0) / sg.goal);
  const score = P.NUTRITION.filter(n => checks[n.id]).length;
  const box = `<span class="box">${I.check}</span>`;
  return `
  <section class="card">
    <div class="card-h"><h2>Journal du jour</h2><span class="nutri-score ${score === 5 ? 'full' : ''}">${score}/5</span></div>
    <div class="grid3">
      <div class="field"><label>Poids kg</label><input inputmode="decimal" data-day="weight" value="${d.weight ?? ''}" placeholder="70.0"></div>
      <div class="field"><label>Pas</label><input inputmode="numeric" data-day="steps" value="${d.steps ?? ''}" placeholder="${sg.goal}"></div>
      <div class="field"><label>Sommeil h</label><input inputmode="decimal" data-day="sleep" value="${d.sleep ?? ''}" placeholder="7.5"></div>
    </div>
    <div class="steps-goal">
      <div class="sg-h"><span>👟 Objectif du jour <b>${sg.goal.toLocaleString('fr-FR')} pas</b></span><span class="muted">${sg.run ? `10 000 + ${sg.run.toLocaleString('fr-FR')} de course` : 'marche'}</span></div>
      <div class="bar ${sp >= 1 ? 'good' : ''}"><i data-meter="steps" data-goal="${sg.goal}" data-p="${sp}"></i></div>
    </div>
    <div class="field"><label>Énergie</label><div class="seg">${[1, 2, 3, 4, 5].map(v =>
      `<button class="${d.energy === v ? 'on' : ''}" data-act="energy" data-v="${v}">${['😫', '😕', '😐', '🙂', '🔥'][v - 1]}</button>`).join('')}</div></div>
    <div class="checks">
      ${P.NUTRITION.map(n => `<button class="chk ${checks[n.id] ? 'on' : ''}" data-act="check" data-id="${n.id}" data-pop="c|${n.id}">${box}${n.label}</button>`).join('')}
      <button class="chk extra ${d.extra ? 'on' : ''}" data-act="extra">${box}🍕 Extra / resto (prévu, pas une faute)</button>
    </div>
    <div class="field"><label>Note</label><input data-day="note" value="${esc(d.note || '')}" placeholder="Comment tu te sens ?"></div>
  </section>`;
}

function renderMeasures(date) {
  const m = store.get('measures', date) || {};
  const f = (k, l) => `<div class="field"><label>${l}</label><input inputmode="decimal" data-meas="${k}" value="${m[k] ?? ''}" placeholder="cm"></div>`;
  return `
  <section class="card">
    <div class="card-h"><h2>Mensurations</h2><span class="muted">lundi matin</span></div>
    <div class="grid2">${f('waist', 'Taille (nombril)')}${f('shoulders', 'Épaules')}${f('arm', 'Bras contracté')}${f('thigh', 'Cuisse')}</div>
    <button class="chk ${m.photos ? 'on' : ''}" data-act="photos"><span class="box">${I.check}</span>📸 Photos faites (face, profil, dos)</button>
  </section>`;
}

// ---------- Fiche « geste » ----------
function openGuide(id) {
  const g = GUIDE[id];
  if (!g) return;
  const name = findName(id);
  const pics = imgUrls(id);
  const labels = id === 'geante-abdos' ? ['Crunch poulie', 'Relevés de jambes', 'Woodchopper'] : id === 'geante-obliques' ? ['Pallof press', 'Woodchopper', 'Gainage latéral'] : null;
  const sheet = $('#sheet');
  sheet.innerHTML = `
    <div class="sh-back" data-act="sheet-close"></div>
    <div class="sh-panel" role="dialog" aria-modal="true" aria-label="${esc(name)}">
      <div class="sh-grab"></div>
      <div class="sh-h"><div>${muscleTag(id)}<h2>${esc(name)}</h2></div>
        <button class="icon" data-act="sheet-close" aria-label="Fermer">${I.x}</button></div>
      ${pics.map(([a, b], i) => `
        <figure class="anim">
          <img src="${a}" alt="Position de départ" loading="lazy"><img class="b" src="${b}" alt="Position d'arrivée" loading="lazy">
          <figcaption><span class="ph-a">Départ</span><span class="ph-b">Arrivée</span>${labels ? `<b>${labels[i]}</b>` : ''}</figcaption>
        </figure>`).join('')}
      ${g.note ? `<p class="sh-note">ℹ️ ${esc(g.note)}</p>` : ''}
      <div class="sh-block"><h3>⚙️ Réglage</h3><p>${esc(g.setup)}</p></div>
      <div class="sh-block"><h3>🎯 Exécution</h3><ol>${g.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>
      ${g.tip ? `<div class="sh-tip">💡 ${esc(g.tip)}</div>` : ''}
      <p class="sh-credit">Photos : free-exercise-db (domaine public)</p>
    </div>`;
  sheet.hidden = false;
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => sheet.classList.add('open'));
}
function closeGuide() {
  const sheet = $('#sheet');
  if (sheet.hidden) return;
  sheet.classList.remove('open');
  document.body.classList.remove('noscroll');
  setTimeout(() => { sheet.hidden = true; sheet.innerHTML = ''; }, 320);
}
function findName(id) {
  for (const b of [1, 5, 11]) for (const t of ['HA', 'BA', 'HB', 'BB']) {
    const it = P.workoutFor(t, b).items.find(x => x.id === id);
    if (it) return it.name;
  }
  return id;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeGuide(); });

// ---------- Vue Programme ----------
const PH_COLORS = { 1: '#22d3ee', 2: '#7c5cff', 3: '#ff4f6d' };
function dayStatus(d) {
  const type = sessionTypeFor(d), past = d < today();
  if (isWorkout(type)) {
    const sp = sessionProgress(d, type), day = store.get('days', d);
    const pct = day?.done ? 1 : sp.total ? sp.done / sp.total : 0;
    return { type, ico: '🏋️', label: P.SESSION_TYPES[type], pct, state: pct >= 1 ? 'done' : pct > 0 ? 'partial' : past ? 'missed' : 'todo' };
  }
  if (type?.startsWith('RUN')) {
    const r = store.get('runs', d), plan = P.runFor(type, clampWeek(d));
    return { type, ico: '🏃', label: `${plan.name} ${plan.minutes}'`, planned: plan.minutes, run: r, pct: r?.done ? 1 : 0, state: r?.done ? 'done' : past ? 'missed' : 'todo' };
  }
  return { type, ico: '🌿', label: type === 'REST' ? 'Repos' : 'Libre', pct: 0, state: 'rest' };
}
const STATE_TXT = { done: 'Fait', partial: 'En cours', missed: 'Manqué', todo: 'À venir', rest: 'Repos' };
const mondayOf = d => P.addDays(d, 1 - P.isoDow(d));

function periodSummary(dates) {
  const st = dates.map(d => ({ d, s: dayStatus(d) }));
  const wk = st.filter(x => isWorkout(x.s.type)), runs = st.filter(x => x.s.type?.startsWith('RUN'));
  const days = dates.map(d => store.get('days', d)).filter(Boolean);
  const w = days.map(x => num(x.weight)).filter(v => v != null);
  const steps = dates.map(d => ({ d, v: num(store.get('days', d)?.steps) })).filter(x => x.v != null);
  const stepsHit = steps.filter(x => x.v >= P.stepsGoal(sessionTypeFor(x.d), P.weekOf(x.d)).goal).length;
  const nut = days.length ? Math.round(100 * days.reduce((a, x) => a + P.NUTRITION.filter(n => x.checks?.[n.id]).length, 0) / (days.length * 5)) : null;
  return {
    wDone: wk.filter(x => x.s.state === 'done').length, wTotal: wk.length,
    runMin: runs.reduce((a, x) => a + (num(x.s.run?.min) || (x.s.run?.done ? x.s.planned : 0)), 0), runPlanned: runs.reduce((a, x) => a + x.s.planned, 0),
    km: dates.reduce((a, d) => a + (num(store.get('runs', d)?.km) || 0), 0),
    wAvg: w.length ? w.reduce((a, v) => a + v, 0) / w.length : null,
    stepsAvg: steps.length ? Math.round(steps.reduce((a, x) => a + x.v, 0) / steps.length) : null, stepsHit, stepsN: steps.length, nut,
  };
}
function summaryTiles(s, prev) {
  const dw = s.wAvg != null && prev?.wAvg != null ? s.wAvg - prev.wAvg : null;
  const t = (ico, l, v, sub, cls = '') => `<div class="tile"><div class="t-ico">${ico}</div><div class="t-l">${l}</div><div class="t-v">${v}</div><div class="t-s ${cls}">${sub}</div></div>`;
  return `<div class="tiles sum">
    ${t('🏋️', 'Muscu', `${s.wDone}/${s.wTotal}`, 'séances faites')}
    ${t('🏃', 'Course', `${s.runMin}'`, `sur ${s.runPlanned}' prévues${s.km ? ` · ${s.km.toFixed(1)} km` : ''}`)}
    ${t('⚖️', 'Poids moyen', s.wAvg != null ? `${s.wAvg.toFixed(1)} kg` : '—', dw != null ? `${dw > 0 ? '▲ +' : '▼ '}${dw.toFixed(1)} kg vs période préc.` : s.wAvg != null ? 'moyenne des pesées' : 'aucune pesée', dw != null ? (dw > 0 ? 'up' : 'down') : '')}
    ${t('👟', 'Pas moyens', s.stepsAvg != null ? s.stepsAvg.toLocaleString('fr-FR') : '—', s.stepsN ? `objectif atteint ${s.stepsHit}/${s.stepsN} j` : 'aucun relevé')}
    ${t('🥗', 'Nutrition', s.nut != null ? `${s.nut} %` : '—', 'des cases cochées')}
  </div>`;
}
function modeSwitch() {
  return `<div class="modes">${[['week', 'Semaine'], ['month', 'Mois'], ['plan', '15 semaines']].map(([m, l]) =>
    `<button class="${state.planMode === m ? 'on' : ''}" data-act="plan-mode" data-m="${m}">${l}</button>`).join('')}</div>`;
}

function renderWeekView() {
  const mon = state.calWeek || mondayOf(today()), sun = P.addDays(mon, 6);
  const dates = Array.from({ length: 7 }, (_, i) => P.addDays(mon, i));
  const s = periodSummary(dates), prev = periodSummary(dates.map(d => P.addDays(d, -7)));
  const wk = P.weekOf(mon), ph = wk && P.phaseOf(wk);
  const cards = dates.map((d, i) => {
    const st = dayStatus(d), day = store.get('days', d) || {}, r = store.get('runs', d);
    const sg = P.stepsGoal(st.type, P.weekOf(d)), steps = num(day.steps);
    const score = P.NUTRITION.filter(n => day.checks?.[n.id]).length;
    return `<button class="wday st-${st.state} ${d === today() ? 'is-today' : ''}" data-act="open-day" data-date="${d}">
      <div class="wd-h"><span class="wd-d">${DAYS[i].slice(0, 3)} <b>${P.parseDate(d).getDate()}</b></span><span class="spill">${STATE_TXT[st.state]}</span></div>
      <div class="wd-s">${st.ico} ${esc(st.label)}</div>
      ${isWorkout(st.type) ? `<div class="bar mini ${st.pct >= 1 ? 'good' : ''}"><i style="width:${st.pct * 100}%"></i></div>` : ''}
      ${r && (r.min || r.km) ? `<div class="wd-l">⏱ ${r.min ?? '–'}' · ${r.km ?? '–'} km</div>` : ''}
      <div class="wd-l">⚖️ ${day.weight ?? '—'}</div>
      <div class="wd-l ${steps != null && steps >= sg.goal ? 'ok' : ''}">👟 ${steps != null ? `${(steps / 1000).toFixed(1)}k` : '—'} / ${sg.goal / 1000}k</div>
      <div class="dots">${P.NUTRITION.map((_, k) => `<i class="${k < score ? 'on' : ''}"></i>`).join('')}</div>
    </button>`;
  }).join('');
  const SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const f = d => `${P.parseDate(d).getDate()} ${SHORT[P.parseDate(d).getMonth()]}`;
  return `
    <div class="cal-nav">
      <button class="icon" data-act="cal-prev" aria-label="Semaine précédente">${I.left}</button>
      <div class="cal-t"><span class="eyebrow">${wk ? `S${wk}/15 · ${ph.name}` : 'Hors programme'}</span><h2 class="nocap">${f(mon)} → ${f(sun)}</h2></div>
      <button class="icon" data-act="cal-next" aria-label="Semaine suivante">${I.right}</button>
    </div>
    ${mon !== mondayOf(today()) ? '<button class="link today-link" data-act="cal-today">↩ Cette semaine</button>' : ''}
    ${summaryTiles(s, prev)}
    <div class="week-grid">${cards}</div>`;
}

function renderMonthView() {
  const ym = state.calMonth || today().slice(0, 7);
  const [y, m] = ym.split('-').map(Number);
  const first = `${ym}-01`, nDays = new Date(y, m, 0).getDate();
  const dates = Array.from({ length: nDays }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`);
  const pm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const pn = new Date(y, m - 1, 0).getDate();
  const s = periodSummary(dates), prev = periodSummary(Array.from({ length: pn }, (_, i) => `${pm}-${String(i + 1).padStart(2, '0')}`));
  const start = mondayOf(first);
  const cells = Array.from({ length: Math.ceil((P.daysBetween(start, first) + nDays) / 7) * 7 }, (_, i) => P.addDays(start, i)).map(d => {
    const inM = d.startsWith(ym), st = dayStatus(d), day = store.get('days', d) || {};
    const score = P.NUTRITION.filter(n => day.checks?.[n.id]).length;
    const inProg = !!P.weekOf(d);
    return `<button class="mc st-${inProg ? st.state : 'none'} ${inM ? '' : 'out'} ${d === today() ? 'is-today' : ''}" data-act="open-day" data-date="${d}">
      <span class="mc-n">${P.parseDate(d).getDate()}</span>
      <span class="mc-i">${inProg ? st.ico : ''}</span>
      ${inProg && score ? `<span class="mc-b"><i style="width:${score * 20}%"></i></span>` : ''}
    </button>`;
  }).join('');
  return `
    <div class="cal-nav">
      <button class="icon" data-act="cal-prev" aria-label="Mois précédent">${I.left}</button>
      <div class="cal-t"><span class="eyebrow">${y}</span><h2>${MONTHS[m - 1]}</h2></div>
      <button class="icon" data-act="cal-next" aria-label="Mois suivant">${I.right}</button>
    </div>
    ${summaryTiles(s, prev)}
    <section class="card">
      <div class="month">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span class="mh">${x}</span>`).join('')}${cells}</div>
      <div class="legend mleg"><span><i class="lg done"></i>Fait</span><span><i class="lg partial"></i>En cours</span><span><i class="lg missed"></i>Manqué</span><span><i class="lg todo"></i>À venir</span></div>
    </section>`;
}

function renderPlan() {
  if (state.planMode === 'week') return `<div class="page page-cal">${modeSwitch()}${renderWeekView()}</div>`;
  if (state.planMode === 'month') return `<div class="page page-cal">${modeSwitch()}${renderMonthView()}</div>`;
  return renderPlanFull();
}

function renderPlanFull() {
  const cur = P.weekOf(today());
  const wk = state.planWeek || cur || 1;
  const phase = P.phaseOf(wk);
  const monday = P.addDays(P.START, (wk - 1) * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = P.addDays(monday, i), t = P.defaultSession(d);
    let body;
    if (t.startsWith('RUN')) { const r = P.runFor(t, wk); body = `<div class="pd-b">🏃 <b>${r.minutes} min</b> — ${esc(r.desc)}</div>`; }
    else if (t === 'REST') body = `<div class="pd-b muted">🌿 Repos / marche</div>`;
    else {
      const w = P.workoutFor(t, wk);
      body = `<details><summary>🏋️ ${esc(w.name)}</summary><ul>${w.items.map(it =>
        `<li>${it.group ? `<b>${it.group}</b> ` : ''}${esc(it.name)} — ${it.sets}×${esc(it.reps)}${it.tech ? ` <span class="badge sm">${P.TECH[it.tech].label}</span>` : ''}</li>`).join('')}</ul></details>`;
    }
    return `<div class="pd ${d === today() ? 'is-today' : ''}"><button class="pd-d" data-act="open-day" data-date="${d}">${DAYS[i].slice(0, 3)} ${shortDate(d)}</button>${body}</div>`;
  }).join('');
  const weeks = Array.from({ length: P.WEEKS }, (_, i) => i + 1).map(n =>
    `<button class="wk ${n === wk ? 'on' : ''} ${n === cur ? 'cur' : ''} ph${P.phaseOf(n).bloc}" data-act="week" data-w="${n}">S${n}</button>`).join('');

  return `<div class="page page-plan">
  <div class="a-modes">${modeSwitch()}</div>
  <section class="card a-main">
    <div class="card-h"><h2>15 semaines</h2><span class="muted">7 déc → 21 mars</span></div>
    <div class="weeks">${weeks}</div>
    <h3 class="wname">Semaine ${wk} · ${phase.name}</h3>
    <p class="note">${esc(phase.desc)}<br>🎯 ${esc(phase.rir)}</p>
    <div class="pdays">${days}</div>
  </section>
  <section class="card">
    <div class="card-h"><h2>Phases</h2></div>
    ${P.PHASES.map(p => `<div class="phase"><b><span class="ph-dot" style="background:${PH_COLORS[p.bloc]}"></span>S${p.from}${p.to !== p.from ? `–S${p.to}` : ''} · ${p.name}</b><div class="muted">${esc(p.desc)}</div></div>`).join('')}
  </section>
  <section class="card">
    <div class="card-h"><h2>Techniques</h2></div>
    ${Object.values(P.TECH).map(t => `<div class="phase"><span class="badge sm">${t.label}</span><div class="muted">${esc(t.desc)}</div></div>`).join('')}
  </section>
  <section class="card">
    <div class="card-h"><h2>Règles du jeu</h2></div>
    ${P.RULES.map(([t, d]) => `<div class="phase"><b>${t}</b><div class="muted">${esc(d)}</div></div>`).join('')}
  </section></div>`;
}

// ---------- Vue Stats ----------
function renderStats() {
  const { pts: weights, avg } = weightSeries();
  const waist = store.all('measures').filter(([, m]) => num(m.waist) != null).map(([date, m]) => ({ date, y: +m.waist }));
  const runs = store.all('runs').filter(([, r]) => r.done || num(r.min));
  const km = runs.reduce((a, [, r]) => a + (num(r.km) || 0), 0);
  const longest = runs.reduce((a, [, r]) => Math.max(a, num(r.min) || 0), 0);
  const workoutDays = new Set(store.all('ex').filter(([, r]) => r.sets?.some(s => s?.ok) || r.rounds?.some(Boolean)).map(([k]) => k.split('|')[0]));
  store.all('days').forEach(([d, r]) => r.done && workoutDays.add(d));
  let planned = 0;
  for (let d = P.START; d <= today() && d <= P.END; d = P.addDays(d, 1)) if (isWorkout(P.defaultSession(d))) planned++;
  const last14 = Array.from({ length: 14 }, (_, i) => P.addDays(today(), -13 + i));
  const nutri = last14.map(d => store.get('days', d)).filter(Boolean);
  const nutriPct = nutri.length ? Math.round(100 * nutri.reduce((a, d) => a + P.NUTRITION.filter(n => d.checks?.[n.id]).length, 0) / (nutri.length * P.NUTRITION.length)) : null;

  const delta = (arr, unit) => {
    if (arr.length < 2) return { txt: 'Première mesure', cls: '' };
    const v = arr.at(-1).y - arr[0].y;
    return { txt: `${v > 0 ? '▲ +' : '▼ '}${v.toFixed(1)} ${unit} depuis le ${shortDate(arr[0].date)}`, cls: v > 0 ? 'up' : 'down' };
  };
  const tile = (ico, label, value, dec, suffix, sub, cls = '', wide = '') => `<div class="tile ${wide}"><div class="t-ico">${ico}</div><div class="t-l">${label}</div>
    <div class="t-v" ${value != null ? `data-count="${value}" data-dec="${dec}" data-suffix="${suffix}"` : ''}>${value != null ? `${(+value).toFixed(dec)}${suffix}` : '—'}</div><div class="t-s ${cls}">${sub}</div></div>`;
  const dw = delta(avg, 'kg'), dt = delta(waist, 'cm');

  const bars = Array.from({ length: P.WEEKS }, (_, i) => {
    const mon = P.addDays(P.START, i * 7), sun = P.addDays(mon, 6);
    return { label: `${i + 1}`, y: runs.filter(([d]) => d >= mon && d <= sun).reduce((a, [, r]) => a + (num(r.min) || 0), 0), title: `S${i + 1}` };
  });

  const exMap = new Map();
  for (const [k, r] of store.all('ex')) {
    const [d, id] = k.split('|');
    const top = Math.max(...(r.sets || []).map(s => num(s?.w) ?? -Infinity));
    if (isFinite(top)) (exMap.get(id) || exMap.set(id, []).get(id)).push({ date: d, y: top });
  }
  const names = {};
  for (const b of [1, 5, 11]) for (const t of ['HA', 'BA', 'HB', 'BB']) P.workoutFor(t, b).items.forEach(it => (names[it.id] ||= it.name));
  const exIds = [...exMap.keys()].sort((a, b) => (names[a] || a).localeCompare(names[b] || b));
  const sel = state.statEx && exMap.has(state.statEx) ? state.statEx : exIds[0];

  const hist = Array.from({ length: 21 }, (_, i) => P.addDays(today(), -i)).map(d => {
    const day = store.get('days', d), run = store.get('runs', d);
    if (!day && !run && !workoutDays.has(d)) return '';
    return `<tr><td><button class="link" data-act="open-day" data-date="${d}">${DAYS[P.isoDow(d) - 1].slice(0, 3)} ${shortDate(d)}</button></td>
      <td>${day?.weight ?? ''}</td><td>${workoutDays.has(d) ? '🏋️' : ''}${run && (run.done || run.min) ? `🏃${run.km ? ` ${run.km}k` : ''}` : ''}</td>
      <td>${day ? P.NUTRITION.filter(n => day.checks?.[n.id]).length + '/5' : ''}${day?.extra ? ' 🍕' : ''}</td></tr>`;
  }).join('');

  return `<div class="page page-stats">
  <div class="tiles">
    ${tile('⚖️', 'Poids moy. 7 j', avg.length ? avg.at(-1).y : null, 1, ' kg', avg.length ? dw.txt : 'Pèse-toi le matin', dw.cls, 'wide')}
    ${tile('📏', 'Tour de taille', waist.length ? waist.at(-1).y : null, 1, ' cm', waist.length ? dt.txt : 'Lundi matin', dt.cls)}
    ${tile('🏋️', 'Séances muscu', [...workoutDays].filter(d => d >= P.START).length, 0, '', planned ? `sur ${planned} prévues` : 'Début le 7 déc')}
    ${tile('🏃', 'Course', km, 1, ' km', longest ? `plus longue : ${longest} min` : 'Aucune sortie')}
    ${tile('🥗', 'Nutrition 14 j', nutriPct, 0, ' %', 'des cases cochées')}
    ${tile('🔥', 'Série en cours', streak(), 0, ' j', 'jours actifs d\'affilée')}
  </div>
  <div class="charts">
    <section class="card"><div class="card-h"><h2>Poids</h2><span class="muted">ligne = moyenne 7 j</span></div>
      ${lineChart({ points: weights, line: avg, target: P.TARGET_WEIGHT, unit: ' kg' })}</section>
    <section class="card"><div class="card-h"><h2>Tour de taille</h2></div>${lineChart({ points: waist, unit: ' cm' })}</section>
    <section class="card"><div class="card-h"><h2>Course</h2><span class="muted">minutes / semaine</span></div>${barChart({ bars, unit: ' min' })}</section>
    <section class="card"><div class="card-h"><h2>Progression</h2>
      ${exIds.length ? `<select class="chip-select" data-act="stat-ex">${exIds.map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${esc(names[id] || id)}</option>`).join('')}</select>` : ''}</div>
      ${sel ? lineChart({ points: exMap.get(sel), unit: ' kg' }) : '<p class="empty">Remplis tes premières séances.</p>'}</section>
  </div>
  <section class="card"><div class="card-h"><h2>3 dernières semaines</h2></div>
    ${hist ? `<table class="hist"><thead><tr><th>Jour</th><th>Poids</th><th>Sport</th><th>Nutri</th></tr></thead><tbody>${hist}</tbody></table>` : '<p class="empty">Rien pour l\'instant.</p>'}</section>
  </div>`;
}

// ---------- Vue Réglages ----------
function renderSettings() {
  const cfg = sync.config();
  const st = sync.status;
  const stTxt = { off: 'Non configurée', syncing: 'Synchronisation…', ok: 'À jour', error: `Erreur : ${st.error}`, offline: 'Hors ligne' }[st.state];
  let qr = '';
  if (cfg && state.showQR && window.qrcode) {
    const q = window.qrcode(0, 'L'); q.addData(sync.pairLink(cfg)); q.make();
    qr = `<div class="qr">${q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>
      <p class="alert">🔒 Ce QR contient ton jeton : ne le montre à personne. Scanne-le avec l'appareil photo de ton autre appareil.</p>
      <button class="btn full" data-act="copy-link">Copier le lien d'appairage</button>`;
  }
  return `<div class="page page-settings">
  <section class="card">
    <div class="card-h"><h2>Synchronisation</h2><span class="sync-st st-${st.state}">${esc(stTxt)}</span></div>
    ${st.last ? `<p class="muted">Dernière synchro : ${new Date(st.last).toLocaleString('fr-FR')}</p>` : ''}
    <div class="grid2">
      <div class="field"><label>Compte GitHub</label><input id="cfg-owner" value="${esc(cfg?.owner || 'Greilleur45')}" autocapitalize="off"></div>
      <div class="field"><label>Repo des données</label><input id="cfg-repo" value="${esc(cfg?.repo || 'shape-data')}" autocapitalize="off"></div>
    </div>
    <div class="field"><label>Jeton d'accès</label><input id="cfg-token" type="password" value="${esc(cfg?.token || '')}" placeholder="github_pat_…" autocapitalize="off" autocomplete="off"></div>
    <div class="row">
      <button class="btn primary" data-act="cfg-save">Enregistrer & synchroniser</button>
      ${cfg ? '<button class="btn" data-act="sync-now">Synchroniser</button>' : ''}
    </div>
    ${cfg ? `<button class="btn full" data-act="toggle-qr">${state.showQR ? 'Masquer le QR code' : 'Appairer un autre appareil (QR code)'}</button>${qr}` : ''}
    <details class="help"><summary>Comment créer le jeton</summary><ol>
      <li>Ouvre <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → Fine-grained token</a>.</li>
      <li>Repository access : <b>Only select repositories</b> → <code>shape-data</code>.</li>
      <li>Add permissions → <b>Contents</b> → <b>Read and write</b>.</li>
      <li>Generate token, colle-le ici, puis « Enregistrer ».</li>
    </ol></details>
  </section>
  <section class="card">
    <div class="card-h"><h2>Sauvegarde</h2></div>
    <div class="row">
      <button class="btn" data-act="export">Exporter (JSON)</button>
      <label class="btn">Importer<input type="file" accept="application/json" id="import" hidden></label>
    </div>
    ${cfg ? '<button class="link danger" data-act="unpair">Déconnecter cet appareil</button>' : ''}
    <p class="muted">Shape · ${P.START.split('-').reverse().join('/')} → ${P.END.split('-').reverse().join('/')}</p>
  </section></div>`;
}

// ---------- Rendu ----------
function applyMeter(el, p) {
  if (el.tagName === 'circle') { el.style.strokeDashoffset = String(100 - p * 100); el.style.opacity = p > 0 ? 1 : 0; }
  else el.style.width = `${p * 100}%`;
}
function countUp(el) {
  const to = +el.dataset.count, dec = +el.dataset.dec, suf = el.dataset.suffix, t0 = performance.now();
  const step = t => {
    const k = Math.min(1, (t - t0) / 900), e = 1 - (1 - k) ** 3;
    el.textContent = `${(to * e).toFixed(dec)}${suf}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function render(opts = {}) {
  const view = $('#view');
  const y = window.scrollY;
  const active = document.activeElement;
  const focusKey = active?.tagName === 'INPUT' && view.contains(active) ? JSON.stringify(active.dataset) + active.className : null;
  view.innerHTML = { today: renderToday, plan: renderPlan, stats: renderStats, settings: renderSettings }[state.tab]();

  view.classList.remove('enter', 'from-left', 'from-right');
  if (opts.anim && !REDUCED) { void view.offsetWidth; view.classList.add('enter'); if (opts.dir) view.classList.add(opts.dir); }

  const ti = TABS.indexOf(state.tab);
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
  document.documentElement.style.setProperty('--tab', ti);

  // Jauges : on part de la valeur précédente pour animer la transition
  view.querySelectorAll('[data-meter]').forEach(el => {
    const k = el.dataset.meter, to = +el.dataset.p;
    applyMeter(el, opts.anim ? 0 : (meters.get(k) ?? to));
    el.getBoundingClientRect();
    requestAnimationFrame(() => applyMeter(el, to));
    meters.set(k, to);
  });
  // Barre de progression de séance dans l'en-tête
  const type = sessionTypeFor(state.date);
  const sp = state.tab === 'today' ? sessionProgress(state.date, type) : null;
  $('#progress').hidden = !sp;
  if (sp) $('#progress i').style.width = `${sp.total ? (sp.done / sp.total) * 100 : 0}%`;

  if (state.tab === 'stats') { bindTips(view); if (opts.anim && !REDUCED) view.querySelectorAll('[data-count]').forEach(countUp); }
  if (state.pop) { view.querySelector(`[data-pop="${state.pop}"]`)?.classList.add('pop'); state.pop = null; }
  if (!opts.anim) window.scrollTo(0, y);
  if (focusKey) [...view.querySelectorAll('input')].find(e => JSON.stringify(e.dataset) + e.className === focusKey)?.focus();
}

function renderSync() {
  const s = sync.status.state, el = $('#sync');
  el.className = `sync s-${s}`;
  el.querySelector('span').textContent = { off: 'Hors synchro', syncing: 'Synchro…', ok: 'Synchronisé', error: 'Erreur', offline: 'Hors ligne' }[s];
  el.title = s === 'error' ? sync.status.error : '';
  if (state.tab === 'settings' && !document.activeElement?.id?.startsWith('cfg-')) render();
}

// ---------- Saisie ----------
function exRec(id) { const k = `${state.date}|${id}`; return { k, r: structuredClone(store.get('ex', k) || {}) }; }
function dayPatch(fields) { store.patch('days', state.date, fields); }

document.addEventListener('input', e => {
  const t = e.target, ds = t.dataset;
  if (ds.day) {
    dayPatch({ [ds.day]: ds.day === 'note' ? t.value : num(t.value) });
    if (ds.day === 'steps') {
      const bar = document.querySelector('[data-meter="steps"]'), g = +bar?.dataset.goal;
      if (bar) { const p = Math.min(1, (num(t.value) || 0) / g); bar.style.width = `${p * 100}%`; meters.set('steps', p); bar.parentElement.classList.toggle('good', p >= 1); }
    }
  }
  else if (ds.run) store.patch('runs', state.date, { [ds.run]: ds.run === 'note' ? t.value : num(t.value) });
  else if (ds.meas) store.patch('measures', state.date, { [ds.meas]: num(t.value) });
  else if (ds.ex && ds.f === 'note') { const { k, r } = exRec(ds.ex); r.note = t.value; store.patch('ex', k, r); }
  else if (ds.ex && ds.f) {
    const { k, r } = exRec(ds.ex);
    r.sets ||= [];
    const i = +ds.i;
    r.sets[i] ||= {};
    if (ds.j != null) { r.sets[i].drops ||= []; r.sets[i].drops[+ds.j][ds.f] = num(t.value); }
    else {
      r.sets[i][ds.f] = num(t.value);
      const row = t.closest('.set'), tick = row?.querySelector('.tick');
      if (tick && !tick.classList.contains('on')) tick.classList.toggle('need', !(num(row.querySelector('.w').value) != null && num(row.querySelector('.r').value) != null));
    }
    for (let n = 0; n < r.sets.length; n++) r.sets[n] ||= {};
    store.patch('ex', k, r);
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.daySelect) { dayPatch({ plan: t.value || null }); render({ anim: true }); }
  else if (t.dataset.act === 'stat-ex') { state.statEx = t.value; render(); }
  else if (t.id === 'import' && t.files[0]) {
    t.files[0].text().then(txt => { store.replaceAll(JSON.parse(txt)); toast('Données importées'); render(); })
      .catch(err => toast(`Import impossible : ${err.message}`));
  }
});

function findItem(id) {
  const w = P.workoutFor(sessionTypeFor(state.date), clampWeek(state.date));
  return { it: w.items.find(i => i.id === id), items: w.items };
}

// Célébrations quand un exercice ou la séance entière vient d'être bouclé
function celebrate(exId, before, btn) {
  const type = sessionTypeFor(state.date);
  const { it } = findItem(exId);
  if (!it) return;
  const p = exProgress(state.date, it), sp = sessionProgress(state.date, type);
  if (sp && sp.total && sp.done >= sp.total && before.sess < before.sessTotal) {
    setTimeout(() => { confetti(); buzz([30, 60, 30, 60, 80]); toast('Séance complète 🔥 Énorme !'); }, 150);
  } else if (p.done >= p.total && before.ex < p.total) {
    setTimeout(() => { burstAt(document.querySelector(`[data-exid="${exId}"] .ex-i`) || btn); buzz([20, 40, 20]); }, 120);
  }
}
function snapshotProgress(exId) {
  const { it } = findItem(exId);
  const p = it ? exProgress(state.date, it) : { done: 0 }, sp = sessionProgress(state.date, sessionTypeFor(state.date)) || { done: 0, total: 0 };
  return { ex: p.done, sess: sp.done, sessTotal: sp.total };
}

function go(dateFn, dir) { state.date = dateFn(); state.showMeas = false; render({ anim: true, dir }); window.scrollTo({ top: 0 }); }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act], nav button');
  if (!b) return;
  if (b.dataset.tab) {
    if (state.tab !== b.dataset.tab) { state.tab = b.dataset.tab; window.scrollTo(0, 0); render({ anim: true }); }
    return;
  }
  const a = b.dataset.act, ds = b.dataset;
  switch (a) {
    case 'prev': return go(() => P.addDays(state.date, -1), 'from-left');
    case 'next': return go(() => P.addDays(state.date, 1), 'from-right');
    case 'goto-today': return go(today, state.date < today() ? 'from-right' : 'from-left');
    case 'goto-start': return go(() => P.START, 'from-right');
    case 'open-day': state.date = ds.date; state.tab = 'today'; window.scrollTo(0, 0); return render({ anim: true });
    case 'week': state.planWeek = +ds.w; break;
    case 'plan-mode': state.planMode = ds.m; return render({ anim: true });
    case 'cal-prev': case 'cal-next': {
      const k = a === 'cal-next' ? 1 : -1;
      if (state.planMode === 'week') state.calWeek = P.addDays(state.calWeek || mondayOf(today()), 7 * k);
      else {
        const [y, m] = (state.calMonth || today().slice(0, 7)).split('-').map(Number), d = new Date(y, m - 1 + k, 1);
        state.calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      return render({ anim: true, dir: k > 0 ? 'from-right' : 'from-left' });
    }
    case 'cal-today': state.calWeek = null; return render({ anim: true });
    case 'show-meas': state.showMeas = true; break;
    case 'guide': openGuide(ds.ex); return;
    case 'sheet-close': closeGuide(); return;
    case 'tech': { const d = b.closest('.ex').querySelector('.tech-d'); d.hidden = !d.hidden; return; }
    case 'ok': {
      const before = snapshotProgress(ds.ex);
      const { k, r } = exRec(ds.ex); r.sets ||= [];
      const i = +ds.i; const s = (r.sets[i] ||= {});
      for (let n = 0; n < r.sets.length; n++) r.sets[n] ||= {};
      if (!s.ok && (s.w == null || s.r == null)) {
        const row = b.closest('.set');
        row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake');
        (s.w == null ? row.querySelector('.w') : row.querySelector('.r')).focus();
        buzz([40, 40, 40]); toast('Renseigne la charge et les reps avant de valider');
        return;
      }
      s.ok = !s.ok;
      store.patch('ex', k, r);
      if (s.ok) {
        state.pop = `s|${ds.ex}|${i}`; buzz();
        const { it, items } = findItem(ds.ex);
        if (it) {
          const grp = it.group ? items.filter(x => x.group === it.group) : null;
          const lastOfGroup = !grp || grp.at(-1).id === it.id;
          const rest = lastOfGroup ? (grp ? grp.at(-1).rest || it.rest : it.rest) : 0;
          if (rest) startTimer(rest); else if (grp) toast('Superset : enchaîne directement ⚡');
        }
        render(); celebrate(ds.ex, before, b); return;
      }
      break;
    }
    case 'add-set': { const { k, r } = exRec(ds.ex); const { it } = findItem(ds.ex); r.sets ||= []; while (r.sets.length < (it?.sets || 0)) r.sets.push({}); r.sets.push({}); store.patch('ex', k, r); break; }
    case 'add-drop': {
      const { k, r } = exRec(ds.ex); const { it } = findItem(ds.ex);
      r.sets ||= []; while (r.sets.length < (it?.sets || 1)) r.sets.push({});
      let i = r.sets.length - 1; for (let n = r.sets.length - 1; n >= 0; n--) if (r.sets[n].ok || r.sets[n].w != null) { i = n; break; }
      const prevW = r.sets[i].drops?.at(-1)?.w ?? r.sets[i].w;
      (r.sets[i].drops ||= []).push({ w: prevW != null ? Math.round(prevW * 0.75 * 2) / 2 : null, r: null });
      store.patch('ex', k, r); break;
    }
    case 'rm-drop': { const { k, r } = exRec(ds.ex); r.sets[+ds.i].drops.splice(+ds.j, 1); store.patch('ex', k, r); break; }
    case 'round': {
      const before = snapshotProgress(ds.ex);
      const { k, r } = exRec(ds.ex); r.rounds ||= []; r.rounds[+ds.i] = !r.rounds[+ds.i]; store.patch('ex', k, r);
      if (r.rounds[+ds.i]) {
        state.pop = `r|${ds.ex}|${ds.i}`; buzz();
        const { it } = findItem(ds.ex); if (it?.rest) startTimer(it.rest);
        render(); celebrate(ds.ex, before, b); return;
      }
      break;
    }
    case 'toggle-done': {
      const d = store.get('days', state.date); dayPatch({ done: !d?.done });
      if (!d?.done) { confetti(); buzz([30, 60, 80]); toast('Bien joué 💪 Séance enregistrée'); }
      break;
    }
    case 'energy': dayPatch({ energy: +ds.v }); buzz(8); break;
    case 'check': {
      const d = store.get('days', state.date);
      const checks = { ...(d?.checks || {}), [ds.id]: !d?.checks?.[ds.id] };
      dayPatch({ checks });
      if (checks[ds.id]) { state.pop = `c|${ds.id}`; buzz(8); }
      if (P.NUTRITION.every(n => checks[n.id]) && checks[ds.id]) { render(); burstAt(document.querySelector('.nutri-score'), 60); toast('Nutrition parfaite aujourd\'hui 🥗'); return; }
      break;
    }
    case 'extra': dayPatch({ extra: !store.get('days', state.date)?.extra }); break;
    case 'photos': store.patch('measures', state.date, { photos: !store.get('measures', state.date)?.photos }); break;
    case 'run-scale': store.patch('runs', state.date, { [ds.f]: +ds.v }); buzz(8); break;
    case 'run-done': {
      const r = store.get('runs', state.date); store.patch('runs', state.date, { done: !r?.done });
      if (!r?.done) { confetti(); buzz([30, 60, 80]); toast('Sortie validée 🏃 Le semi se rapproche'); }
      break;
    }
    case 'cfg-save': {
      const cfg = { owner: $('#cfg-owner').value.trim(), repo: $('#cfg-repo').value.trim(), token: $('#cfg-token').value.trim() };
      if (!cfg.owner || !cfg.repo || !cfg.token) { toast('Remplis les trois champs'); return; }
      document.activeElement?.blur();
      sync.setConfig(cfg); sync.syncNow(); toast('Configuration enregistrée'); break;
    }
    case 'sync-now': sync.syncNow(); break;
    case 'toggle-qr': state.showQR = !state.showQR; break;
    case 'copy-link': navigator.clipboard.writeText(sync.pairLink(sync.config())).then(() => toast('Lien copié')); return;
    case 'unpair': if (confirm('Déconnecter cet appareil ? Les données restent sur GitHub.')) { sync.setConfig(null); state.showQR = false; } break;
    case 'export': {
      const blob = new Blob([JSON.stringify(store.snapshot(), null, 1)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `shape-${today()}.json` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); return;
    }
    default: return;
  }
  render();
});

// Balayage gauche/droite sur le bandeau pour changer de jour
let touch = null;
document.addEventListener('touchstart', e => {
  if (e.target.closest('[data-swipe]')) touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 60 && Math.abs(dy) < 50) dx < 0 ? go(() => P.addDays(state.date, 1), 'from-right') : go(() => P.addDays(state.date, -1), 'from-left');
});

// ---------- Minuteur de repos ----------
let timerEnd = 0, timerTotal = 1, timerInt = null;
function startTimer(sec) {
  timerEnd = Date.now() + sec * 1000; timerTotal = sec;
  const t = $('#timer'); t.classList.remove('go'); t.hidden = true; void t.offsetWidth; t.hidden = false;
  clearInterval(timerInt);
  timerInt = setInterval(tick, 250);
  tick();
}
function tick() {
  const leftMs = timerEnd - Date.now(), left = Math.ceil(leftMs / 1000);
  const el = $('#timer-t');
  $('#timer .t-fg').style.strokeDashoffset = String(100 - Math.max(0, leftMs / (timerTotal * 1000)) * 100);
  if (left <= 0) {
    clearInterval(timerInt);
    el.textContent = 'GO !';
    $('#timer').classList.add('go');
    navigator.vibrate?.([200, 100, 200]);
    beep();
    setTimeout(() => { $('#timer').hidden = true; $('#timer').classList.remove('go'); }, 4000);
    return;
  }
  el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18, 0.36].forEach((t, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = i === 2 ? 1320 : 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.16);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.16);
    });
  } catch {}
}
$('#timer').addEventListener('click', e => {
  const a = e.target.closest('[data-t]')?.dataset.t;
  if (a === 'skip') { clearInterval(timerInt); $('#timer').hidden = true; }
  else if (a) { timerEnd += +a * 1000; timerTotal = Math.max(timerTotal, (timerEnd - Date.now()) / 1000); tick(); }
});

// ---------- Démarrage ----------
if (sync.consumePairLink()) setTimeout(() => toast('Appareil appairé ✓ synchro en cours'), 300);
store.onChange(local => { if (!local) render(); });
sync.onStatus(renderSync);
$('#sync').addEventListener('click', () => sync.config() ? sync.syncNow() : (state.tab = 'settings', render({ anim: true })));
sync.init();
render({ anim: true });
renderSync();
let lastToday = today();
setInterval(() => { const t = today(); if (t !== lastToday) { if (state.date === lastToday) { state.date = t; render(); } lastToday = t; } }, 60000);

// Mise à jour automatique : dès qu'une nouvelle version est publiée, l'appli se recharge toute seule
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    reg.update();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update(); });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
}
// Met en cache toutes les photos d'exercices pour qu'elles marchent hors ligne à la salle
if ('caches' in window && navigator.onLine) {
  setTimeout(() => caches.open('shape-img-v1').then(async c => {
    for (const u of ALL_IMAGES) if (!(await c.match(u))) await c.add(u).catch(() => {});
  }), 4000);
}
