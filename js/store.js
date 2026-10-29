// Stockage local + fusion. Chaque enregistrement porte `u` (horodatage de modif) ;
// la fusion garde, clé par clé, l'enregistrement le plus récent.

const KEY = 'shape:data';
export const COLLECTIONS = ['days', 'ex', 'runs', 'measures'];

function empty() { return { v: 1, days: {}, ex: {}, runs: {}, measures: {} }; }

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === 1) { for (const c of COLLECTIONS) d[c] ||= {}; return d; }
  } catch {}
  return empty();
}

let data = load();
const listeners = new Set();

export function onChange(fn) { listeners.add(fn); }

function persist(local) {
  localStorage.setItem(KEY, JSON.stringify(data));
  for (const fn of listeners) fn(local);
}

export function get(col, key) { const r = data[col][key]; return r && !r.del ? r : null; }
export function all(col) {
  return Object.entries(data[col]).filter(([, r]) => !r.del).sort(([a], [b]) => (a < b ? -1 : 1));
}

export function patch(col, key, fields) {
  const cur = data[col][key] && !data[col][key].del ? data[col][key] : {};
  data[col][key] = { ...cur, ...fields, u: Date.now() };
  persist(true);
  return data[col][key];
}

export function remove(col, key) {
  data[col][key] = { del: true, u: Date.now() };
  persist(true);
}

export function snapshot() { return data; }

// Fusionne `remote` dans les données locales. Renvoie true si le distant doit être mis à jour.
export function mergeRemote(remote) {
  let remoteStale = false, localChanged = false;
  const r = remote && remote.v === 1 ? remote : empty();
  for (const c of COLLECTIONS) {
    const L = data[c], R = r[c] || {};
    for (const k of new Set([...Object.keys(L), ...Object.keys(R)])) {
      const a = L[k], b = R[k];
      if (!b || (a && a.u > b.u)) remoteStale = true;
      else if (!a || b.u > a.u) { L[k] = b; localChanged = true; }
    }
  }
  if (localChanged) persist(false);
  return remoteStale;
}

export function replaceAll(d) {
  if (!d || d.v !== 1) throw new Error('Fichier invalide');
  data = d;
  for (const c of COLLECTIONS) data[c] ||= {};
  persist(true);
}

export function resetLocal() { data = empty(); persist(false); }
