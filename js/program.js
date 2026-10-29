// Programme Shape : 7 décembre 2026 → 21 mars 2027 (15 semaines)

export const START = '2026-12-07';
export const END = '2027-03-21';
export const WEEKS = 15;
export const TARGET_WEIGHT = 68;

export const PHASES = [
  { from: 1, to: 2, name: 'Reprise', bloc: 1,
    rir: 'RIR 3 : arrête chaque série 3 reps avant l\'échec. Les muscles reviennent vite, les tendons non.',
    desc: 'Volume modéré, tempo contrôlé. Objectif : retrouver les sensations sans courbatures monstrueuses.' },
  { from: 3, to: 4, name: 'Noël', bloc: 1,
    rir: 'RIR 2. Séances flexibles : si tu loupes un jour, décale.',
    desc: 'Souplesse pendant les fêtes : minimum 2 séances haut du corps + les 2 footings.' },
  { from: 5, to: 9, name: 'Volume', bloc: 2,
    rir: 'RIR 1-2 sur les séries normales, techniques d\'intensité sur les machines et poulies.',
    desc: 'Priorité congestion : supersets, dropsets, myo-reps. Ça doit brûler.' },
  { from: 10, to: 10, name: 'Deload', bloc: 2,
    rir: 'Moitié des séries, charges -10 %, aucune technique d\'intensité.',
    desc: 'Semaine de récupération. Tu reviens plus fort la semaine suivante.' },
  { from: 11, to: 14, name: 'Intensité', bloc: 3,
    rir: 'RIR 0-1 sur machines et isolation, RIR 2 sur presse et fentes (genoux).',
    desc: 'Charges plus lourdes en début de séance, finishers brûlants. Sèche finale.' },
  { from: 15, to: 15, name: 'Affûtage', bloc: 3,
    rir: 'Une série de moins partout, pump maximal, pas d\'échec.',
    desc: 'Séances courtes et intenses. Photos finales et test 10 km le dimanche 21 mars.' },
];

export const TECH = {
  superset: { label: 'SUPERSET', desc: 'Enchaîne les deux exercices du groupe sans repos, puis récupère. Plus de travail en moins de temps.' },
  dropset: { label: 'DROPSET', desc: 'Sur la dernière série : à l\'échec, baisse la charge de 20-30 % et repars immédiatement. 2 paliers. Ajoute-les avec « + palier ».' },
  dropset3: { label: 'DROPSET ×3', desc: 'Sur la dernière série : 3 baisses de charge successives (-20-30 % à chaque fois), sans repos.' },
  myo: { label: 'MYO-REPS', desc: 'Série d\'activation de 12-15 reps proche de l\'échec, puis mini-séries de 3-5 reps avec 5 respirations de repos, jusqu\'à ne plus réussir 3 reps. Note chaque mini-série en palier.' },
  restpause: { label: 'REST-PAUSE', desc: 'Sur la dernière série : à l\'échec, 15 s de pause, puis encore quelques reps. Deux fois. Note les reps bonus en palier.' },
  reps15: { label: 'REPS 1,5', desc: 'Chaque répétition = une rep complète + une demi-rep dans la partie basse. Brutal, charge plus légère.' },
  prefat: { label: 'PRÉ-FATIGUE', desc: 'Enchaîne l\'isolation juste avant le polyarticulaire : moins de charge pour la même stimulation, genoux ménagés.' },
  geante: { label: 'SÉRIE GÉANTE', desc: 'Enchaîne tous les exercices listés sans repos = 1 tour. 60-90 s de repos entre les tours.' },
  dropmeca: { label: 'DROPSET MÉCA', desc: 'Même charge, exercice plus facile : élévations bras tendus → bras fléchis → partielles, sans repos.' },
  r21: { label: '21', desc: '7 reps en bas (jusqu\'à mi-course), 7 reps en haut, 7 reps complètes. Sans repos.' },
  tempo: { label: 'TEMPO 3-1-1', desc: 'Descente en 3 s, 1 s de pause, montée explosive mais contrôlée.' },
  excentrique: { label: 'EXCENTRIQUE', desc: 'Descente lente en 4 s, étirement d\'une seconde en bas. Prévention du tendon d\'Achille : jamais de rebond, jamais d\'échec.' },
  mcgill: { label: 'McGILL', desc: 'Trio anti-mal de dos : curl-up (10 s × 5), gainage latéral (10 s × 5/côté), bird dog (10 s × 5/côté). Qualité > quantité.' },
};

// log: 'sets' (charge × reps) par défaut, 'check' pour circuits (un ✓ par tour)
const W = {
  // ---------- BLOC 1 : Reprise (S1-S4) ----------
  1: {
    HA: { name: 'Haut A — Dos & Pecs', items: [
      { id: 'tirage-vert-neutre', name: 'Tirage vertical prise neutre', sets: 4, reps: '8-10', rest: 120, tech: 'tempo' },
      { id: 'dev-incl-halteres', name: 'Développé incliné haltères', sets: 4, reps: '8-10', rest: 120, tech: 'tempo', cue: 'Prise neutre ou semi-neutre si les poignets tirent.' },
      { id: 'rowing-appuye', name: 'Rowing poitrine appuyée (machine)', sets: 3, reps: '10-12', rest: 90, group: 'A', tech: 'superset', cue: 'Poitrine collée au support : zéro charge sur les lombaires.' },
      { id: 'presse-convergente', name: 'Presse pectorale convergente', sets: 3, reps: '10-12', rest: 90, group: 'A' },
      { id: 'tirage-poulie-basse', name: 'Tirage poulie basse prise neutre', sets: 3, reps: '12', rest: 90 },
      { id: 'ecartes-poulie-bh', name: 'Écartés poulie bas → haut', sets: 3, reps: '15', rest: 60, cue: 'Haut des pecs : ramène les mains vers le menton.' },
      { id: 'elev-lat-halteres', name: 'Élévations latérales haltères', sets: 3, reps: '15-20', rest: 60 },
      { id: 'crunch-poulie', name: 'Crunch à la poulie', sets: 3, reps: '12-15', rest: 60 },
    ]},
    BA: { name: 'Bas A — Quadris (genoux friendly)', items: [
      { id: 'leg-ext', name: 'Leg extension (échauffement)', sets: 2, reps: '15', rest: 60, cue: 'Léger, pour huiler les genoux.' },
      { id: 'presse', name: 'Presse à cuisses', sets: 4, reps: '10-12', rest: 120, tech: 'tempo', cue: 'Lombaires plaquées, ne descends pas au point où le bassin décolle.' },
      { id: 'fentes-bulgares', name: 'Fentes bulgares haltères', sets: 3, reps: '10/jambe', rest: 90, cue: 'Genou dans l\'axe du pied, buste légèrement penché.' },
      { id: 'leg-curl-assis', name: 'Leg curl assis', sets: 3, reps: '12', rest: 75 },
      { id: 'mollets-debout', name: 'Mollets debout', sets: 4, reps: '12', rest: 60, tech: 'excentrique' },
      { id: 'releves-genoux', name: 'Relevés de genoux (chaise romaine)', sets: 3, reps: '12', rest: 60 },
      { id: 'mcgill', name: 'Trio McGill', sets: 2, reps: 'tours', rest: 30, tech: 'mcgill', log: 'check' },
    ]},
    HB: { name: 'Haut B — Épaules & Bras', items: [
      { id: 'dev-epaules-halt', name: 'Développé épaules haltères assis (dossier)', sets: 3, reps: '8-10', rest: 120 },
      { id: 'tirage-vert-large', name: 'Tirage vertical prise large', sets: 3, reps: '8-10', rest: 90, cue: 'Largeur du dos : tire les coudes vers les hanches.' },
      { id: 'elev-lat-poulie', name: 'Élévations latérales poulie unilatérale', sets: 4, reps: '12-15', rest: 60 },
      { id: 'face-pull', name: 'Face pull', sets: 3, reps: '15', rest: 60 },
      { id: 'curl-incline', name: 'Curl incliné haltères', sets: 3, reps: '10-12', rest: 75, group: 'A', tech: 'superset' },
      { id: 'triceps-corde', name: 'Extension triceps poulie corde', sets: 3, reps: '12', rest: 75, group: 'A' },
      { id: 'curl-marteau', name: 'Curl marteau', sets: 2, reps: '12', rest: 60 },
      { id: 'crunch-machine', name: 'Crunch machine', sets: 3, reps: '15', rest: 60 },
    ]},
    BB: { name: 'Bas B — Ischios & Fessiers', items: [
      { id: 'hip-thrust', name: 'Hip thrust', sets: 4, reps: '8-10', rest: 120, cue: 'Menton rentré, pause 1 s en haut, fessiers serrés.' },
      { id: 'leg-curl-allonge', name: 'Leg curl allongé', sets: 3, reps: '10-12', rest: 75 },
      { id: 'extension-45', name: 'Extension 45° orientée fessiers', sets: 3, reps: '12-15', rest: 75, cue: 'Dos légèrement arrondi, pousse avec les hanches. Renforce aussi les lombaires.' },
      { id: 'abducteurs', name: 'Abducteurs machine', sets: 3, reps: '20', rest: 60 },
      { id: 'mollets-assis', name: 'Mollets assis', sets: 3, reps: '15', rest: 60, tech: 'excentrique' },
      { id: 'pallof', name: 'Pallof press', sets: 3, reps: '12/côté', rest: 45 },
      { id: 'mcgill', name: 'Trio McGill', sets: 2, reps: 'tours', rest: 30, tech: 'mcgill', log: 'check' },
    ]},
  },
  // ---------- BLOC 2 : Volume (S5-S10) ----------
  2: {
    HA: { name: 'Haut A — Dos & Pecs (volume)', items: [
      { id: 'tirage-unilat', name: 'Tirage unilatéral poulie haute', sets: 4, reps: '10-12', rest: 90 },
      { id: 'presse-incl-conv', name: 'Presse inclinée convergente', sets: 4, reps: '10-12', rest: 90, tech: 'restpause' },
      { id: 'rowing-machine-neutre', name: 'Rowing machine prise neutre', sets: 3, reps: '12', rest: 90, group: 'A', tech: 'superset' },
      { id: 'dips-assistes', name: 'Dips (assistés si besoin)', sets: 3, reps: 'max', rest: 90, group: 'A' },
      { id: 'pullover-poulie', name: 'Pull-over poulie', sets: 3, reps: '15', rest: 60, tech: 'dropset' },
      { id: 'pec-deck', name: 'Écartés pec deck', sets: 3, reps: '15', rest: 60, tech: 'myo' },
      { id: 'elev-lat-halteres', name: 'Élévations latérales haltères', sets: 3, reps: '12 + méca', rest: 60, tech: 'dropmeca' },
      { id: 'geante-abdos', name: 'Abdos : crunch poulie 12 · relevés 12 · woodchopper 12/côté', sets: 3, reps: 'tours', rest: 75, tech: 'geante', log: 'check' },
    ]},
    BA: { name: 'Bas A — Quadris (volume)', items: [
      { id: 'leg-ext', name: 'Leg extension', sets: 3, reps: '15', rest: 0, group: 'A', tech: 'prefat' },
      { id: 'presse', name: 'Presse à cuisses', sets: 3, reps: '12', rest: 120, group: 'A', cue: 'Enchaîne directement après le leg extension.' },
      { id: 'fentes-arriere', name: 'Fentes arrière haltères', sets: 3, reps: '10/jambe', rest: 90, cue: 'Plus douces pour les genoux que les fentes avant.' },
      { id: 'leg-curl-assis', name: 'Leg curl assis', sets: 3, reps: '12', rest: 75, tech: 'dropset' },
      { id: 'leg-ext-finisher', name: 'Leg extension finisher', sets: 1, reps: '15 + mini-séries', rest: 0, tech: 'myo' },
      { id: 'mollets-debout', name: 'Mollets debout', sets: 4, reps: '12', rest: 60, tech: 'excentrique' },
      { id: 'mcgill', name: 'Trio McGill', sets: 2, reps: 'tours', rest: 30, tech: 'mcgill', log: 'check' },
    ]},
    HB: { name: 'Haut B — Épaules & Bras (volume)', items: [
      { id: 'dev-epaules-machine', name: 'Développé épaules machine', sets: 4, reps: '10', rest: 90 },
      { id: 'tirage-vert-serre', name: 'Tirage vertical prise serrée', sets: 3, reps: '10-12', rest: 90 },
      { id: 'elev-lat-poulie', name: 'Élévations latérales poulie', sets: 3, reps: '15 + mini-séries', rest: 60, tech: 'myo' },
      { id: 'oiseau-machine', name: 'Oiseau machine (reverse pec deck)', sets: 3, reps: '15', rest: 60, group: 'A', tech: 'superset' },
      { id: 'face-pull', name: 'Face pull', sets: 3, reps: '15', rest: 60, group: 'A' },
      { id: 'curl-poulie', name: 'Curl poulie basse', sets: 3, reps: '12', rest: 75, group: 'B', tech: 'superset' },
      { id: 'triceps-overhead', name: 'Extension triceps poulie au-dessus de la tête', sets: 3, reps: '12', rest: 75, group: 'B', tech: 'dropset' },
      { id: 'curl-21', name: 'Curl EZ en 21', sets: 2, reps: '21', rest: 75, tech: 'r21', cue: 'Barre EZ ou haltères si les poignets tirent.' },
      { id: 'crunch-machine', name: 'Crunch machine', sets: 3, reps: '15', rest: 60, tech: 'restpause' },
    ]},
    BB: { name: 'Bas B — Ischios & Fessiers (volume)', items: [
      { id: 'hip-thrust', name: 'Hip thrust', sets: 3, reps: '10', rest: 120, tech: 'reps15' },
      { id: 'leg-curl-allonge', name: 'Leg curl allongé', sets: 4, reps: '12', rest: 75, tech: 'dropset' },
      { id: 'extension-45', name: 'Extension 45° lestée', sets: 3, reps: '15', rest: 75 },
      { id: 'abducteurs', name: 'Abducteurs machine', sets: 3, reps: '20', rest: 60, tech: 'dropset' },
      { id: 'mollets-assis', name: 'Mollets assis', sets: 3, reps: '15', rest: 60, tech: 'excentrique' },
      { id: 'geante-obliques', name: 'Obliques : Pallof 10/côté · woodchopper 12/côté · gainage latéral 30 s/côté', sets: 3, reps: 'tours', rest: 75, tech: 'geante', log: 'check' },
      { id: 'mcgill', name: 'Trio McGill', sets: 2, reps: 'tours', rest: 30, tech: 'mcgill', log: 'check' },
    ]},
  },
  // ---------- BLOC 3 : Intensité (S11-S15) ----------
  3: {
    HA: { name: 'Haut A — Dos & Pecs (intensité)', items: [
      { id: 'tractions', name: 'Tractions (lestées si possible)', sets: 4, reps: '6-8', rest: 150, cue: 'Sinon tirage vertical lourd.' },
      { id: 'dev-incl-halteres', name: 'Développé incliné haltères lourd', sets: 4, reps: '6-8', rest: 150 },
      { id: 'rowing-appuye', name: 'Rowing poitrine appuyée lourd', sets: 4, reps: '8', rest: 120 },
      { id: 'dips-assistes', name: 'Dips', sets: 3, reps: '8-10', rest: 90 },
      { id: 'ecartes-poulie-bh', name: 'Écartés poulie bas → haut', sets: 3, reps: '12', rest: 60, group: 'A', tech: 'superset' },
      { id: 'pullover-poulie', name: 'Pull-over poulie', sets: 3, reps: '12', rest: 60, group: 'A' },
      { id: 'elev-lat-halteres', name: 'Élévations latérales haltères', sets: 3, reps: '12', rest: 60, tech: 'dropset3' },
      { id: 'geante-abdos', name: 'Abdos : crunch poulie 12 · relevés 12 · woodchopper 12/côté', sets: 3, reps: 'tours', rest: 75, tech: 'geante', log: 'check' },
    ]},
    BA: { name: 'Bas A — Quadris (intensité)', items: [
      { id: 'presse', name: 'Presse à cuisses lourde', sets: 4, reps: '8', rest: 150, cue: 'RIR 2 : jamais d\'échec ici, genoux d\'abord.' },
      { id: 'fentes-bulgares', name: 'Fentes bulgares haltères', sets: 3, reps: '8/jambe', rest: 90 },
      { id: 'leg-ext', name: 'Leg extension', sets: 3, reps: '12', rest: 75, tech: 'dropset' },
      { id: 'leg-curl-assis', name: 'Leg curl assis', sets: 3, reps: '10', rest: 75, tech: 'restpause' },
      { id: 'mollets-debout', name: 'Mollets debout lestés', sets: 4, reps: '10', rest: 60, tech: 'excentrique' },
      { id: 'releves-jambes', name: 'Relevés de jambes suspendu', sets: 3, reps: '12', rest: 60 },
      { id: 'mcgill', name: 'Trio McGill', sets: 2, reps: 'tours', rest: 30, tech: 'mcgill', log: 'check' },
    ]},
    HB: { name: 'Haut B — Épaules & Bras (intensité)', items: [
      { id: 'dev-epaules-halt', name: 'Développé épaules haltères assis', sets: 4, reps: '6-8', rest: 150 },
      { id: 'tirage-unilat', name: 'Tirage unilatéral poulie haute', sets: 3, reps: '8-10', rest: 90 },
      { id: 'elev-lat-poulie', name: 'Élévations latérales poulie', sets: 4, reps: '12', rest: 60, tech: 'restpause' },
      { id: 'face-pull', name: 'Face pull', sets: 3, reps: '15', rest: 60 },
      { id: 'curl-incline', name: 'Curl incliné haltères', sets: 3, reps: '8-10', rest: 75, group: 'A', tech: 'superset' },
      { id: 'triceps-corde', name: 'Extension triceps poulie corde', sets: 3, reps: '10', rest: 75, group: 'A', tech: 'dropset' },
      { id: 'curl-marteau', name: 'Curl marteau', sets: 2, reps: '10', rest: 60, tech: 'reps15' },
      { id: 'crunch-poulie', name: 'Crunch à la poulie lourd', sets: 3, reps: '10', rest: 60 },
    ]},
    BB: { name: 'Bas B — Ischios & Fessiers (intensité)', items: [
      { id: 'hip-thrust', name: 'Hip thrust lourd', sets: 4, reps: '6-8', rest: 150 },
      { id: 'leg-curl-allonge', name: 'Leg curl allongé', sets: 3, reps: '10', rest: 75, tech: 'restpause' },
      { id: 'extension-45', name: 'Extension 45° lestée', sets: 3, reps: '12', rest: 75 },
      { id: 'abducteurs', name: 'Abducteurs machine', sets: 3, reps: '20', rest: 60, tech: 'dropset' },
      { id: 'mollets-assis', name: 'Mollets assis', sets: 3, reps: '12', rest: 60, tech: 'excentrique' },
      { id: 'geante-obliques', name: 'Obliques : Pallof 10/côté · woodchopper 12/côté · gainage latéral 30 s/côté', sets: 3, reps: 'tours', rest: 75, tech: 'geante', log: 'check' },
      { id: 'mcgill', name: 'Trio McGill', sets: 2, reps: 'tours', rest: 30, tech: 'mcgill', log: 'check' },
    ]},
  },
};

// Plan course : minutes totales hors échauffement (5 min de marche rapide avant chaque sortie)
const RUNS = [
  { wed: [25, '5 × (3 min course / 2 min marche)'], sun: [30, '6 × (4 min course / 1 min marche)'] },
  { wed: [25, '5 × (4 min course / 1 min marche)'], sun: [35, '5 × (6 min course / 1 min marche)'] },
  { wed: [28, '4 × (6 min course / 1 min marche)'], sun: [33, '3 × (10 min course / 1 min marche)'] },
  { wed: [25, '25 min continu, très facile'], sun: [35, '2 × 17 min course / 1 min marche'] },
  { wed: [30, '30 min continu'], sun: [40, '40 min continu'] },
  { wed: [30, '30 min continu'], sun: [45, '45 min continu'] },
  { wed: [35, '35 min continu'], sun: [45, '45 min continu (consolidation)'] },
  { wed: [35, '35 min continu'], sun: [50, '50 min continu'] },
  { wed: [40, '40 min continu'], sun: [55, '55 min continu'] },
  { wed: [30, '30 min très facile (deload)'], sun: [40, '40 min facile (deload)'] },
  { wed: [40, '40 min continu'], sun: [60, '60 min continu — 1 h !'] },
  { wed: [40, '40 min dont 5 × 30 s un peu plus vite (optionnel)'], sun: [60, '60 min continu'] },
  { wed: [40, '40 min continu'], sun: [65, '65 min continu'] },
  { wed: [45, '45 min continu'], sun: [70, '70 min continu — plus longue sortie'] },
  { wed: [30, '30 min très facile'], sun: [60, 'TEST 10 KM à allure confortable 🏁'] },
];

export const SESSION_TYPES = {
  HA: 'Haut A', BA: 'Bas A', HB: 'Haut B', BB: 'Bas B',
  RUNW: 'Footing court', RUNS: 'Sortie longue', REST: 'Repos',
};

// ISO jour : 1 = lundi … 7 = dimanche
const DOW_PLAN = { 1: 'HA', 2: 'BA', 3: 'RUNW', 4: 'HB', 5: 'BB', 6: 'REST', 7: 'RUNS' };

export function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return fmtDate(d); }
export function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
export function isoDow(s) { const g = parseDate(s).getDay(); return g === 0 ? 7 : g; }

export function weekOf(date) {
  const diff = daysBetween(START, date);
  if (diff < 0 || diff >= WEEKS * 7) return null;
  return Math.floor(diff / 7) + 1;
}
export function phaseOf(week) { return PHASES.find(p => week >= p.from && week <= p.to); }

export function defaultSession(date) {
  return weekOf(date) ? DOW_PLAN[isoDow(date)] : null;
}

export function workoutFor(type, week) {
  const phase = phaseOf(week);
  const base = W[phase.bloc][type];
  const deload = week === 10;
  const trim = week <= 2 || week === 15;
  const items = base.items.map(it => {
    let sets = it.sets;
    if (deload) sets = Math.max(1, Math.ceil(sets / 2));
    else if (trim && it.log !== 'check') sets = Math.max(2, sets - 1);
    const tech = deload && it.tech && !['superset', 'excentrique', 'mcgill', 'geante', 'tempo'].includes(it.tech) ? null : it.tech;
    return { ...it, sets, tech };
  });
  return { name: base.name, items, phase };
}

export function runFor(type, week) {
  const r = RUNS[week - 1][type === 'RUNW' ? 'wed' : 'sun'];
  return { minutes: r[0], desc: r[1], name: type === 'RUNW' ? 'Footing court' : 'Sortie longue' };
}

export const NUTRITION = [
  { id: 'prot', label: 'Protéines à chaque repas' },
  { id: 'fecu', label: 'Féculents complets (autour de la séance)' },
  { id: 'leg', label: 'Légumes ×2' },
  { id: 'sucre', label: 'Zéro sucreries' },
  { id: 'eau', label: '2 L d\'eau' },
];

export const RULES = [
  ['Pesée', 'Chaque matin, après les toilettes, avant de manger. Seule la moyenne sur 7 jours compte.'],
  ['Mesures', 'Lundi matin : tour de taille au nombril, détendu. Photos toutes les 2 semaines (même lumière, même pose).'],
  ['Protéines', '≈ 140 g/jour : une paume de viande/poisson/œufs/skyr à chaque repas, + une collation protéinée.'],
  ['Écarts', 'Resto avec les potes = prévu, pas une faute. Coche « extra » et reprends normalement au repas suivant.'],
  ['Course', 'Allure conversation : tu dois pouvoir parler. Si tu ne peux pas, marche 1 min.'],
  ['Achille & genoux', 'Note la douleur de 0 à 3 après chaque sortie. À 2 ou plus : sortie suivante raccourcie de 30 %, et si ça persiste, vélo à la place.'],
  ['Échauffement', '5 min de marche rapide avant chaque footing ; 2 séries légères avant le 1er exercice de chaque séance.'],
  ['Progression', 'Quand tu atteins le haut de la fourchette de reps sur toutes les séries, augmente la charge la fois suivante.'],
];

// Muscle principal visé par exercice (badge affiché sur chaque carte)
export const MUSCLES = {
  'tirage-vert-neutre': 'Dos · largeur', 'tirage-vert-large': 'Dos · largeur', 'tirage-vert-serre': 'Dos · largeur',
  'tirage-unilat': 'Dos · largeur', 'tractions': 'Dos · largeur', 'pullover-poulie': 'Dos · grand dorsal',
  'rowing-appuye': 'Dos · épaisseur', 'tirage-poulie-basse': 'Dos · épaisseur', 'rowing-machine-neutre': 'Dos · épaisseur',
  'dev-incl-halteres': 'Pecs · haut', 'ecartes-poulie-bh': 'Pecs · haut', 'presse-incl-conv': 'Pecs · haut',
  'presse-convergente': 'Pecs', 'pec-deck': 'Pecs', 'dips-assistes': 'Pecs · triceps',
  'elev-lat-halteres': 'Épaules · latéral', 'elev-lat-poulie': 'Épaules · latéral',
  'dev-epaules-halt': 'Épaules · avant', 'dev-epaules-machine': 'Épaules · avant',
  'face-pull': 'Épaules · arrière', 'oiseau-machine': 'Épaules · arrière',
  'curl-incline': 'Biceps', 'curl-poulie': 'Biceps', 'curl-21': 'Biceps', 'curl-marteau': 'Biceps · avant-bras',
  'triceps-corde': 'Triceps', 'triceps-overhead': 'Triceps · chef long',
  'leg-ext': 'Quadriceps', 'leg-ext-finisher': 'Quadriceps', 'presse': 'Quadriceps · fessiers',
  'fentes-bulgares': 'Quadriceps · fessiers', 'fentes-arriere': 'Fessiers · quadriceps',
  'leg-curl-assis': 'Ischios', 'leg-curl-allonge': 'Ischios',
  'hip-thrust': 'Fessiers', 'abducteurs': 'Fessiers · moyen', 'extension-45': 'Fessiers · lombaires',
  'mollets-debout': 'Mollets', 'mollets-assis': 'Mollets · soléaire',
  'crunch-poulie': 'Abdos', 'crunch-machine': 'Abdos', 'releves-genoux': 'Abdos · bas', 'releves-jambes': 'Abdos · bas',
  'geante-abdos': 'Abdos · obliques', 'geante-obliques': 'Obliques', 'pallof': 'Obliques · gainage',
  'mcgill': 'Gainage · lombaires',
};

// Objectif de pas : 10 000 de base + les pas de la course prévue (≈ 160 pas/min, téléphone en poche)
export const STEPS_BASE = 10000;
export function stepsGoal(type, week) {
  if (!type?.startsWith('RUN') || !week) return { goal: STEPS_BASE, run: 0 };
  const run = Math.round((runFor(type, week).minutes * 160) / 500) * 500;
  return { goal: STEPS_BASE + run, run };
}
