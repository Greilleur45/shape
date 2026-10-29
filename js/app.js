import * as P from './program.js';
import * as store from './store.js';
import * as sync from './sync.js';
import { lineChart, barChart, bindTips } from './charts.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = v => (v === '' || v == null || isNaN(+v) ? null : +v);
const today = () => P.fmtDate(new Date());
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const DROP_TECH = ['dropset', 'dropset3', 'myo', 'restpause'];

const state = { tab: 'today', date: today(), planWeek: null, statEx: null, showMeas: false, showQR: false };

function longDate(s) { const d = P.parseDate(s); return `${DAYS[P.isoDow(s) - 1]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function shortDate(s) { const d = P.parseDate(s); return `${d.getDate()}/${d.getMonth() + 1}`; }
function clampWeek(date) { return P.weekOf(date) || (date < P.START ? 1 : P.WEEKS); }

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600);
}

// ---------- Historique des exercices ----------
function exHistory(id, before) {
  const out = [];
  for (const [k, r] of store.all('ex')) {
    const [d, eid] = k.split('|');
    if (eid === id && d < before && (r.sets?.some(s => s.w != null || s.r != null) || r.rounds?.some(Boolean))) out.push({ date: d, ...r });
  }
  return out;
}
const fmtSet = s => `${s.w ?? '–'}×${s.r ?? '–'}` + (s.drops?.length ? ` → ${s.drops.map(d => `${d.w ?? '–'}×${d.r ?? '–'}`).join(' → ')}` : '');

// ---------- Vue Aujourd'hui ----------
function sessionTypeFor(date) {
  const day = store.get('days', date);
  if (day?.plan) return day.plan === 'NONE' ? null : day.plan;
  return P.defaultSession(date);
}

function renderToday() {
  const date = state.date, week = P.weekOf(date), day = store.get('days', date) || {};
  const type = sessionTypeFor(date);
  const diffStart = P.daysBetween(today(), P.START);
  let sub;
  if (week) sub = `<span class="pill">S${week}/15 · ${P.phaseOf(week).name}</span> <span class="muted">Jour ${P.daysBetween(P.START, date) + 1}/105</span>`;
  else if (date < P.START) sub = `<span class="pill ghost">Hors programme</span> <span class="muted">${diffStart > 0 ? `Début dans ${diffStart} j` : ''}</span>`;
  else sub = `<span class="pill ghost">Programme terminé 🏁</span>`;

  const opts = [['', `Auto (${type ? P.SESSION_TYPES[P.defaultSession(date)] || '—' : '—'})`], ...Object.entries(P.SESSION_TYPES), ['NONE', 'Aucune']]
    .map(([v, l]) => `<option value="${v}" ${(day.plan || '') === v ? 'selected' : ''}>${l}</option>`).join('');

  let session = '';
  if (!type || type === 'REST') {
    session = `<p class="rest-msg">${type === 'REST' ? '😌 Repos : marche, étirements, révisions TOEIC.' : 'Pas de séance prévue.'}</p>`;
  } else if (type.startsWith('RUN')) session = renderRun(date, type, clampWeek(date));
  else session = renderWorkout(date, type, clampWeek(date), day);

  const showMeas = state.showMeas || P.isoDow(date) === 1 || store.get('measures', date);
  return `
  <div class="datebar">
    <button class="icon" data-act="prev" aria-label="Jour précédent">‹</button>
    <div class="dt"><strong>${longDate(date)}</strong><div>${sub}</div></div>
    <button class="icon" data-act="next" aria-label="Jour suivant">›</button>
  </div>
  ${date !== today() ? `<button class="link center" data-act="goto-today">↩ Revenir à aujourd'hui</button>` : ''}
  ${!week && date < P.START ? `<button class="link center" data-act="goto-start">Aperçu du jour 1 →</button>` : ''}

  <section class="card">
    <div class="card-h"><h2>Séance</h2><select data-day-select="plan" aria-label="Changer la séance">${opts}</select></div>
    ${session}
  </section>

  ${renderDaily(date, day)}

  ${showMeas ? renderMeasures(date) : `<button class="link center" data-act="show-meas">+ Ajouter des mensurations</button>`}`;
}

function renderWorkout(date, type, week, day) {
  const w = P.workoutFor(type, week);
  const groups = {};
  w.items.forEach(it => { if (it.group) (groups[it.group] ||= []).push(it.id); });
  const items = w.items.map(it => renderExercise(date, it, groups)).join('');
  return `
    <h3 class="wname">${esc(w.name)}</h3>
    <p class="note">🎯 ${esc(w.phase.rir)}</p>
    ${items}
    <button class="btn ${day.done ? 'done' : 'primary'} full" data-act="toggle-done">${day.done ? '✓ Séance terminée' : 'Terminer la séance'}</button>`;
}

function renderExercise(date, it, groups) {
  const key = `${date}|${it.id}`;
  const rec = store.get('ex', key) || {};
  const hist = exHistory(it.id, date);
  const last = hist.at(-1);
  const tech = it.tech ? P.TECH[it.tech] : null;
  const gi = it.group ? groups[it.group].indexOf(it.id) + 1 : 0;
  const head = `
    <div class="ex-h">
      ${gi ? `<span class="grp">${it.group}${gi}</span>` : ''}
      <span class="ex-n">${esc(it.name)}</span>
    </div>
    <div class="ex-m">${it.sets} × ${esc(it.reps)}${it.rest ? ` · repos ${it.rest >= 60 ? `${Math.floor(it.rest / 60)}'${it.rest % 60 ? String(it.rest % 60).padStart(2, '0') : ''}` : `${it.rest}"`}` : ''}
      ${tech ? `<button class="badge" data-act="tech" data-tech="${it.tech}">${tech.label}</button>` : ''}</div>
    <div class="tech-d" data-tech-d="${it.tech}" hidden>${tech ? esc(tech.desc) : ''}</div>
    ${it.cue ? `<div class="cue">💡 ${esc(it.cue)}</div>` : ''}`;

  if (it.log === 'check') {
    const rounds = rec.rounds || [];
    const boxes = Array.from({ length: Math.max(it.sets, rounds.length) }, (_, i) =>
      `<button class="round ${rounds[i] ? 'on' : ''}" data-act="round" data-ex="${it.id}" data-i="${i}">Tour ${i + 1}</button>`).join('');
    return `<div class="ex ${it.group ? 'in-grp' : ''}">${head}<div class="rounds">${boxes}</div></div>`;
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
        <button class="ok mini" data-act="rm-drop" data-ex="${it.id}" data-i="${i}" data-j="${j}" aria-label="Supprimer le palier">✕</button>
      </div>`).join('');
    return `
      <div class="set">
        <span class="sn">${i + 1}</span>
        <input class="w" inputmode="decimal" data-ex="${it.id}" data-i="${i}" data-f="w" value="${s.w ?? ''}" placeholder="${ls.w ?? 'kg'}">
        <span class="x">×</span>
        <input class="r" inputmode="numeric" data-ex="${it.id}" data-i="${i}" data-f="r" value="${s.r ?? ''}" placeholder="${ls.r ?? esc(it.reps.split(/[-\/ ]/)[0])}">
        <button class="ok ${s.ok ? 'on' : ''}" data-act="ok" data-ex="${it.id}" data-i="${i}" aria-label="Série faite">✓</button>
      </div>${drops}`;
  }).join('');

  return `<div class="ex ${it.group ? 'in-grp' : ''}">${head}
    ${last ? `<div class="last">Dernière fois (${shortDate(last.date)}) : ${last.sets.filter(s => s.w != null || s.r != null).map(fmtSet).join(' · ')}</div>` : ''}
    ${rows}
    <div class="ex-actions">
      <button class="link" data-act="add-set" data-ex="${it.id}">+ série</button>
      ${DROP_TECH.includes(it.tech) ? `<button class="link" data-act="add-drop" data-ex="${it.id}">+ palier</button>` : ''}
      <input class="ex-note" data-ex="${it.id}" data-f="note" value="${esc(rec.note || '')}" placeholder="Note (réglage machine…)">
    </div>
  </div>`;
}

function renderRun(date, type, week) {
  const plan = P.runFor(type, week);
  const r = store.get('runs', date) || {};
  const prev = store.all('runs').filter(([d]) => d < date).at(-1);
  const pain = prev && (prev[1].knee >= 2 || prev[1].achilles >= 2);
  const scale = (field, label) => `
    <div class="field"><label>${label}</label><div class="seg">${[0, 1, 2, 3].map(v =>
      `<button class="${r[field] === v ? 'on' : ''} ${v >= 2 ? 'warn' : ''}" data-act="run-scale" data-f="${field}" data-v="${v}">${v}</button>`).join('')}</div></div>`;
  return `
    <h3 class="wname">🏃 ${plan.name} · ${plan.minutes} min</h3>
    <p class="plan-run">${esc(plan.desc)}</p>
    <p class="note">Échauffement : 5 min de marche rapide. Allure conversation. Bords de Loire, Pont de l'Europe ↔ Pont George-V ≈ 4 km.</p>
    ${pain ? `<p class="alert">⚠️ Douleur ≥ 2 à la dernière sortie (${shortDate(prev[0])}) : raccourcis de 30 % aujourd'hui. Si ça persiste, vélo à la place.</p>` : ''}
    <div class="grid2">
      <div class="field"><label>Durée (min)</label><input inputmode="numeric" data-run="min" value="${r.min ?? ''}" placeholder="${plan.minutes}"></div>
      <div class="field"><label>Distance (km)</label><input inputmode="decimal" data-run="km" value="${r.km ?? ''}" placeholder="Strava"></div>
    </div>
    <div class="field"><label>Ressenti (1 = facile · 5 = très dur)</label><div class="seg">${[1, 2, 3, 4, 5].map(v =>
      `<button class="${r.rpe === v ? 'on' : ''}" data-act="run-scale" data-f="rpe" data-v="${v}">${v}</button>`).join('')}</div></div>
    <div class="grid2">${scale('knee', 'Douleur genoux (0-3)')}${scale('achilles', 'Douleur Achille (0-3)')}</div>
    <div class="field"><label>Note</label><input data-run="note" value="${esc(r.note || '')}" placeholder="Météo, sensations…"></div>
    <button class="btn ${r.done ? 'done' : 'primary'} full" data-act="run-done">${r.done ? '✓ Sortie faite' : 'Valider la sortie'}</button>`;
}

function renderDaily(date, d) {
  const checks = d.checks || {};
  return `
  <section class="card">
    <div class="card-h"><h2>Journal du jour</h2></div>
    <div class="grid3">
      <div class="field"><label>Poids (kg)</label><input inputmode="decimal" data-day="weight" value="${d.weight ?? ''}" placeholder="70.0"></div>
      <div class="field"><label>Pas</label><input inputmode="numeric" data-day="steps" value="${d.steps ?? ''}" placeholder="10000"></div>
      <div class="field"><label>Sommeil (h)</label><input inputmode="decimal" data-day="sleep" value="${d.sleep ?? ''}" placeholder="7.5"></div>
    </div>
    <div class="field"><label>Énergie</label><div class="seg">${[1, 2, 3, 4, 5].map(v =>
      `<button class="${d.energy === v ? 'on' : ''}" data-act="energy" data-v="${v}">${['😫', '😕', '😐', '🙂', '🔥'][v - 1]}</button>`).join('')}</div></div>
    <div class="checks">
      ${P.NUTRITION.map(n => `<button class="chk ${checks[n.id] ? 'on' : ''}" data-act="check" data-id="${n.id}"><span class="box"></span>${n.label}</button>`).join('')}
      <button class="chk extra ${d.extra ? 'on' : ''}" data-act="extra"><span class="box"></span>🍕 Extra / resto (prévu, pas une faute)</button>
    </div>
    <div class="field"><label>Note</label><input data-day="note" value="${esc(d.note || '')}" placeholder="Comment tu te sens ?"></div>
  </section>`;
}

function renderMeasures(date) {
  const m = store.get('measures', date) || {};
  const f = (k, l, ph) => `<div class="field"><label>${l}</label><input inputmode="decimal" data-meas="${k}" value="${m[k] ?? ''}" placeholder="${ph}"></div>`;
  return `
  <section class="card">
    <div class="card-h"><h2>Mensurations</h2><span class="muted">cm · lundi matin</span></div>
    <div class="grid2">${f('waist', 'Tour de taille (nombril)', 'cm')}${f('shoulders', 'Épaules', 'cm')}${f('arm', 'Bras contracté', 'cm')}${f('thigh', 'Cuisse', 'cm')}</div>
    <button class="chk ${m.photos ? 'on' : ''}" data-act="photos"><span class="box"></span>📸 Photos faites (face, profil, dos)</button>
  </section>`;
}

// ---------- Vue Programme ----------
function renderPlan() {
  const cur = P.weekOf(today());
  const wk = state.planWeek || cur || 1;
  const phase = P.phaseOf(wk);
  const monday = P.addDays(P.START, (wk - 1) * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = P.addDays(monday, i), t = P.defaultSession(d);
    let body = '';
    if (t.startsWith('RUN')) { const r = P.runFor(t, wk); body = `<div class="pd-b">🏃 ${r.minutes} min — ${esc(r.desc)}</div>`; }
    else if (t === 'REST') body = `<div class="pd-b muted">Repos / marche</div>`;
    else {
      const w = P.workoutFor(t, wk);
      body = `<details><summary>${esc(w.name)}</summary><ul>${w.items.map(it =>
        `<li>${it.group ? `<b>${it.group}</b> ` : ''}${esc(it.name)} — ${it.sets}×${esc(it.reps)}${it.tech ? ` <span class="badge sm">${P.TECH[it.tech].label}</span>` : ''}</li>`).join('')}</ul></details>`;
    }
    return `<div class="pd ${d === today() ? 'is-today' : ''}"><button class="pd-d" data-act="open-day" data-date="${d}">${DAYS[i].slice(0, 3)} ${shortDate(d)}</button>${body}</div>`;
  }).join('');

  const weeks = Array.from({ length: P.WEEKS }, (_, i) => i + 1).map(n =>
    `<button class="wk ${n === wk ? 'on' : ''} ${n === cur ? 'cur' : ''} ph${P.phaseOf(n).bloc}" data-act="week" data-w="${n}">S${n}</button>`).join('');

  return `
  <section class="card">
    <div class="card-h"><h2>15 semaines</h2><span class="muted">7 déc → 21 mars</span></div>
    <div class="weeks">${weeks}</div>
    <h3 class="wname">Semaine ${wk} · ${phase.name}</h3>
    <p class="note">${esc(phase.desc)}<br>🎯 ${esc(phase.rir)}</p>
    <div class="pdays">${days}</div>
  </section>
  <section class="card">
    <div class="card-h"><h2>Phases</h2></div>
    ${P.PHASES.map(p => `<div class="phase"><b>S${p.from}${p.to !== p.from ? `–S${p.to}` : ''} · ${p.name}</b><div class="muted">${esc(p.desc)}</div></div>`).join('')}
  </section>
  <section class="card">
    <div class="card-h"><h2>Techniques</h2></div>
    ${Object.values(P.TECH).map(t => `<div class="phase"><span class="badge">${t.label}</span><div class="muted">${esc(t.desc)}</div></div>`).join('')}
  </section>
  <section class="card">
    <div class="card-h"><h2>Règles du jeu</h2></div>
    ${P.RULES.map(([t, d]) => `<div class="phase"><b>${t}</b><div class="muted">${esc(d)}</div></div>`).join('')}
  </section>`;
}

// ---------- Vue Stats ----------
function rolling(points, n = 7) {
  return points.map(p => {
    const from = P.addDays(p.date, -(n - 1));
    const win = points.filter(q => q.date >= from && q.date <= p.date);
    return { date: p.date, y: win.reduce((a, q) => a + q.y, 0) / win.length };
  });
}

function renderStats() {
  const weights = store.all('days').filter(([, d]) => num(d.weight) != null).map(([date, d]) => ({ date, y: +d.weight }));
  const avg = rolling(weights);
  const waist = store.all('measures').filter(([, m]) => num(m.waist) != null).map(([date, m]) => ({ date, y: +m.waist }));
  const runs = store.all('runs').filter(([, r]) => r.done || num(r.min));
  const km = runs.reduce((a, [, r]) => a + (num(r.km) || 0), 0);
  const longest = runs.reduce((a, [, r]) => Math.max(a, num(r.min) || 0), 0);
  const workoutDays = new Set(store.all('ex').filter(([, r]) => r.sets?.some(s => s.ok) || r.rounds?.some(Boolean)).map(([k]) => k.split('|')[0]));
  store.all('days').forEach(([d, r]) => r.done && workoutDays.add(d));
  const plannedSoFar = (() => {
    let n = 0;
    for (let d = P.START; d <= today() && d <= P.END; d = P.addDays(d, 1)) if (['HA', 'BA', 'HB', 'BB'].includes(P.defaultSession(d))) n++;
    return n;
  })();
  const last14 = Array.from({ length: 14 }, (_, i) => P.addDays(today(), -13 + i));
  const nutri = last14.map(d => store.get('days', d)).filter(Boolean);
  const nutriPct = nutri.length ? Math.round(100 * nutri.reduce((a, d) => a + P.NUTRITION.filter(n => d.checks?.[n.id]).length, 0) / (nutri.length * P.NUTRITION.length)) : null;

  const delta = (arr, unit) => arr.length > 1 ? `${(arr.at(-1).y - arr[0].y > 0 ? '+' : '')}${(arr.at(-1).y - arr[0].y).toFixed(1)} ${unit} depuis le ${shortDate(arr[0].date)}` : 'Première mesure';
  const tile = (label, value, sub) => `<div class="tile"><div class="t-l">${label}</div><div class="t-v">${value}</div><div class="t-s">${sub}</div></div>`;

  // Volume de course par semaine
  const bars = Array.from({ length: P.WEEKS }, (_, i) => {
    const mon = P.addDays(P.START, i * 7), sun = P.addDays(mon, 6);
    const min = runs.filter(([d]) => d >= mon && d <= sun).reduce((a, [, r]) => a + (num(r.min) || 0), 0);
    return { label: `${i + 1}`, y: min, title: `S${i + 1}` };
  });

  // Progression par exercice : charge max de chaque séance
  const exMap = new Map();
  for (const [k, r] of store.all('ex')) {
    const [d, id] = k.split('|');
    const top = Math.max(...(r.sets || []).map(s => num(s.w) ?? -Infinity));
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

  return `
  <div class="tiles">
    ${tile('Poids (moy. 7 j)', avg.length ? `${avg.at(-1).y.toFixed(1)} kg` : '—', avg.length ? delta(avg, 'kg') : 'Pèse-toi le matin')}
    ${tile('Tour de taille', waist.length ? `${waist.at(-1).y} cm` : '—', waist.length ? delta(waist, 'cm') : 'Lundi matin')}
    ${tile('Séances muscu', `${[...workoutDays].filter(d => d >= P.START).length}`, plannedSoFar ? `sur ${plannedSoFar} prévues` : 'Début le 7 déc')}
    ${tile('Course', `${km.toFixed(1)} km`, longest ? `plus longue : ${longest} min` : 'Aucune sortie')}
    ${tile('Nutrition 14 j', nutriPct != null ? `${nutriPct} %` : '—', 'des cases cochées')}
  </div>
  <section class="card"><div class="card-h"><h2>Poids</h2><span class="muted">ligne = moyenne 7 j</span></div>
    ${lineChart({ points: weights, line: avg, target: P.TARGET_WEIGHT, unit: ' kg' })}</section>
  <section class="card"><div class="card-h"><h2>Tour de taille</h2></div>${lineChart({ points: waist, unit: ' cm' })}</section>
  <section class="card"><div class="card-h"><h2>Course</h2><span class="muted">minutes par semaine</span></div>${barChart({ bars, unit: ' min' })}</section>
  <section class="card"><div class="card-h"><h2>Progression</h2>
    ${exIds.length ? `<select data-act="stat-ex">${exIds.map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${esc(names[id] || id)}</option>`).join('')}</select>` : ''}</div>
    ${sel ? lineChart({ points: exMap.get(sel), unit: ' kg' }) : '<p class="empty">Remplis tes premières séances.</p>'}</section>
  <section class="card"><div class="card-h"><h2>3 dernières semaines</h2></div>
    ${hist ? `<table class="hist"><thead><tr><th>Jour</th><th>Poids</th><th>Sport</th><th>Nutri</th></tr></thead><tbody>${hist}</tbody></table>` : '<p class="empty">Rien pour l\'instant.</p>'}</section>`;
}

// ---------- Vue Réglages ----------
function renderSettings() {
  const cfg = sync.config();
  const st = sync.status;
  const stTxt = { off: 'Non configurée', syncing: 'Synchronisation…', ok: 'À jour', error: `Erreur : ${st.error}`, offline: 'Hors ligne (synchro au retour du réseau)' }[st.state];
  let qr = '';
  if (cfg && state.showQR && window.qrcode) {
    const q = window.qrcode(0, 'L'); q.addData(sync.pairLink(cfg)); q.make();
    qr = `<div class="qr">${q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })}</div>
      <p class="alert">🔒 Ce QR contient ton jeton : ne le montre à personne. Scanne-le avec l'appareil photo de ton autre appareil.</p>
      <button class="btn full" data-act="copy-link">Copier le lien d'appairage</button>`;
  }
  return `
  <section class="card">
    <div class="card-h"><h2>Synchronisation</h2><span class="sync-st ${st.state}">${esc(stTxt)}</span></div>
    ${st.last ? `<p class="muted">Dernière synchro : ${new Date(st.last).toLocaleString('fr-FR')}</p>` : ''}
    <div class="grid2">
      <div class="field"><label>Compte GitHub</label><input id="cfg-owner" value="${esc(cfg?.owner || 'Greilleur45')}" autocapitalize="off"></div>
      <div class="field"><label>Repo des données</label><input id="cfg-repo" value="${esc(cfg?.repo || 'shape-data')}" autocapitalize="off"></div>
    </div>
    <div class="field"><label>Jeton d'accès (fine-grained)</label><input id="cfg-token" type="password" value="${esc(cfg?.token || '')}" placeholder="github_pat_…" autocapitalize="off" autocomplete="off"></div>
    <div class="row">
      <button class="btn primary" data-act="cfg-save">Enregistrer & synchroniser</button>
      ${cfg ? '<button class="btn" data-act="sync-now">Synchroniser</button>' : ''}
    </div>
    ${cfg ? `<button class="btn full" data-act="toggle-qr">${state.showQR ? 'Masquer' : 'Appairer un autre appareil (QR code)'}</button>${qr}` : ''}
    <details class="help"><summary>Comment créer le jeton (une seule fois)</summary><ol>
      <li>Ouvre <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com → Fine-grained token</a>.</li>
      <li>Nom : <code>shape</code>, expiration : <b>Custom → 31/12/2027</b>.</li>
      <li>Repository access : <b>Only select repositories</b> → <code>shape-data</code>.</li>
      <li>Permissions → Repository → <b>Contents : Read and write</b>. Rien d'autre.</li>
      <li>Generate token, copie-le ici, puis « Enregistrer ».</li>
      <li>Sur l'autre appareil : bouton QR ci-dessus, scanne avec l'appareil photo.</li>
    </ol></details>
  </section>
  <section class="card">
    <div class="card-h"><h2>Sauvegarde</h2></div>
    <div class="row">
      <button class="btn" data-act="export">Exporter (JSON)</button>
      <label class="btn">Importer<input type="file" accept="application/json" id="import" hidden></label>
    </div>
    ${cfg ? '<button class="link danger" data-act="unpair">Déconnecter cet appareil</button>' : ''}
  </section>
  <p class="muted center">Shape · ${P.START.split('-').reverse().join('/')} → ${P.END.split('-').reverse().join('/')}</p>`;
}

// ---------- Rendu ----------
function render() {
  const view = $('#view');
  const y = window.scrollY;
  const active = document.activeElement;
  const focusKey = active?.dataset && Object.keys(active.dataset).length ? JSON.stringify(active.dataset) + active.className : null;
  view.innerHTML = { today: renderToday, plan: renderPlan, stats: renderStats, settings: renderSettings }[state.tab]();
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
  if (state.tab === 'stats') bindTips(view);
  window.scrollTo(0, y);
  if (focusKey) {
    const el = [...view.querySelectorAll('input')].find(e => JSON.stringify(e.dataset) + e.className === focusKey);
    el?.focus();
  }
}

function renderSyncDot() {
  const d = $('#syncdot');
  d.className = `dot ${sync.status.state}`;
  d.title = sync.status.state === 'error' ? sync.status.error : sync.status.state;
  if (state.tab === 'settings' && !document.activeElement?.id?.startsWith('cfg-')) render();
}

// ---------- Saisie ----------
function exRec(id) { const k = `${state.date}|${id}`; return { k, r: structuredClone(store.get('ex', k) || {}) }; }
function dayPatch(fields) { store.patch('days', state.date, fields); }

document.addEventListener('input', e => {
  const t = e.target, ds = t.dataset;
  if (ds.day) dayPatch({ [ds.day]: ds.day === 'note' ? t.value : num(t.value) });
  else if (ds.run) store.patch('runs', state.date, { [ds.run]: ds.run === 'note' ? t.value : num(t.value) });
  else if (ds.meas) store.patch('measures', state.date, { [ds.meas]: num(t.value) });
  else if (ds.ex && ds.f === 'note') { const { k, r } = exRec(ds.ex); r.note = t.value; store.patch('ex', k, r); }
  else if (ds.ex && ds.f) {
    const { k, r } = exRec(ds.ex);
    r.sets ||= [];
    const i = +ds.i;
    r.sets[i] ||= {};
    if (ds.j != null) { r.sets[i].drops ||= []; r.sets[i].drops[+ds.j][ds.f] = num(t.value); }
    else r.sets[i][ds.f] = num(t.value);
    for (let n = 0; n < r.sets.length; n++) r.sets[n] ||= {};
    store.patch('ex', k, r);
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.daySelect) { dayPatch({ plan: t.value || null }); render(); }
  else if (t.dataset.act === 'stat-ex') { state.statEx = t.value; render(); }
  else if (t.id === 'import' && t.files[0]) {
    t.files[0].text().then(txt => { store.replaceAll(JSON.parse(txt)); toast('Données importées'); render(); })
      .catch(err => toast(`Import impossible : ${err.message}`));
  }
});

function findItem(id) {
  const type = sessionTypeFor(state.date);
  const w = P.workoutFor(type, clampWeek(state.date));
  return { it: w.items.find(i => i.id === id), items: w.items };
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act], nav button');
  if (!b) return;
  if (b.dataset.tab) { state.tab = b.dataset.tab; window.scrollTo(0, 0); render(); return; }
  const a = b.dataset.act, ds = b.dataset;
  switch (a) {
    case 'prev': state.date = P.addDays(state.date, -1); state.showMeas = false; break;
    case 'next': state.date = P.addDays(state.date, 1); state.showMeas = false; break;
    case 'goto-today': state.date = today(); break;
    case 'goto-start': state.date = P.START; break;
    case 'open-day': state.date = ds.date; state.tab = 'today'; window.scrollTo(0, 0); break;
    case 'week': state.planWeek = +ds.w; break;
    case 'show-meas': state.showMeas = true; break;
    case 'tech': {
      const d = b.closest('.ex').querySelector('.tech-d'); d.hidden = !d.hidden; return;
    }
    case 'ok': {
      const { k, r } = exRec(ds.ex); r.sets ||= [];
      const i = +ds.i; const s = (r.sets[i] ||= {});
      for (let n = 0; n < r.sets.length; n++) r.sets[n] ||= {};
      const row = b.closest('.set');
      const w = row.querySelector('.w'), rp = row.querySelector('.r');
      if (s.w == null && num(w.placeholder) != null) s.w = num(w.placeholder);
      if (s.r == null && num(rp.placeholder) != null) s.r = num(rp.placeholder);
      s.ok = !s.ok;
      store.patch('ex', k, r);
      if (s.ok) {
        const { it, items } = findItem(ds.ex);
        if (it) {
          const grp = it.group ? items.filter(x => x.group === it.group) : null;
          const lastOfGroup = !grp || grp.at(-1).id === it.id;
          const rest = lastOfGroup ? (grp ? grp.at(-1).rest || it.rest : it.rest) : 0;
          if (rest) startTimer(rest); else if (grp) toast('Superset : enchaîne directement ⚡');
        }
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
    case 'round': { const { k, r } = exRec(ds.ex); r.rounds ||= []; r.rounds[+ds.i] = !r.rounds[+ds.i]; store.patch('ex', k, r);
      if (r.rounds[+ds.i]) { const { it } = findItem(ds.ex); if (it?.rest) startTimer(it.rest); } break; }
    case 'toggle-done': { const d = store.get('days', state.date); dayPatch({ done: !d?.done }); if (!d?.done) toast('Bien joué 💪'); break; }
    case 'energy': dayPatch({ energy: +ds.v }); break;
    case 'check': { const d = store.get('days', state.date); dayPatch({ checks: { ...(d?.checks || {}), [ds.id]: !d?.checks?.[ds.id] } }); break; }
    case 'extra': dayPatch({ extra: !store.get('days', state.date)?.extra }); break;
    case 'photos': store.patch('measures', state.date, { photos: !store.get('measures', state.date)?.photos }); break;
    case 'run-scale': store.patch('runs', state.date, { [ds.f]: +ds.v }); break;
    case 'run-done': { const r = store.get('runs', state.date); store.patch('runs', state.date, { done: !r?.done }); if (!r?.done) toast('Sortie validée 🏃'); break; }
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

// ---------- Minuteur de repos ----------
let timerEnd = 0, timerInt = null;
function startTimer(sec) {
  timerEnd = Date.now() + sec * 1000;
  $('#timer').hidden = false;
  clearInterval(timerInt);
  timerInt = setInterval(tick, 250);
  tick();
}
function tick() {
  const left = Math.ceil((timerEnd - Date.now()) / 1000);
  const el = $('#timer-t');
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
    [0, 0.25].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.2, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch {}
}
$('#timer').addEventListener('click', e => {
  const a = e.target.dataset.t;
  if (a === 'skip') { clearInterval(timerInt); $('#timer').hidden = true; }
  else if (a) { timerEnd += +a * 1000; tick(); }
});

// ---------- Démarrage ----------
if (sync.consumePairLink()) setTimeout(() => toast('Appareil appairé ✓ synchro en cours'), 300);
store.onChange(local => { if (!local) render(); });
sync.onStatus(renderSyncDot);
$('#syncdot').addEventListener('click', () => sync.config() ? sync.syncNow() : (state.tab = 'settings', render()));
sync.init();
render();
renderSyncDot();
setInterval(() => { if (state.date !== today() && state._lastToday && state._lastToday !== today() && state.date === state._lastToday) { state.date = today(); render(); } state._lastToday = today(); }, 60000);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
