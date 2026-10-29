// Synchronisation avec un fichier data.json dans un repo GitHub privé (API Contents).
import * as store from './store.js';

const CFG_KEY = 'shape:sync';
const FILE = 'data.json';

export function config() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY)) || null; } catch { return null; }
}
export function setConfig(cfg) {
  if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); else localStorage.removeItem(CFG_KEY);
  emit();
}

export const status = { state: 'off', last: Number(localStorage.getItem('shape:lastSync')) || 0, error: '' };
const listeners = new Set();
export function onStatus(fn) { listeners.add(fn); }
function emit() { for (const fn of listeners) fn(status); }
function set(state, error = '') { status.state = state; status.error = error; emit(); }

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

async function api(cfg, method, body) {
  const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${FILE}`, {
    method,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function pull(cfg) {
  const res = await api(cfg, 'GET');
  if (res.status === 404) return { sha: null, data: null };
  if (res.status === 401) throw new Error('Jeton invalide ou expiré');
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const j = await res.json();
  return { sha: j.sha, data: j.content ? JSON.parse(b64decode(j.content)) : null };
}

let running = false, again = false, timer = null;

export async function syncNow() {
  const cfg = config();
  if (!cfg) { set('off'); return; }
  if (!navigator.onLine) { set('offline'); return; }
  if (running) { again = true; return; }
  running = true;
  set('syncing');
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const { sha, data } = await pull(cfg);
      const needPush = store.mergeRemote(data);
      if (!needPush) break;
      const res = await api(cfg, 'PUT', {
        message: `sync ${new Date().toISOString().slice(0, 16)}`,
        content: b64encode(JSON.stringify(store.snapshot())),
        ...(sha ? { sha } : {}),
      });
      if (res.ok) break;
      if (res.status === 409 || res.status === 422) continue; // modifié ailleurs entre-temps : on refusionne
      if (res.status === 401 || res.status === 403) throw new Error('Jeton sans droit d\'écriture sur le repo');
      throw new Error(`GitHub ${res.status}`);
    }
    status.last = Date.now();
    localStorage.setItem('shape:lastSync', String(status.last));
    localStorage.removeItem('shape:dirty');
    set('ok');
  } catch (e) {
    set(navigator.onLine ? 'error' : 'offline', e.message);
  } finally {
    running = false;
    if (again) { again = false; syncNow(); }
  }
}

export function schedule(delay = 4000) {
  localStorage.setItem('shape:dirty', '1');
  clearTimeout(timer);
  timer = setTimeout(syncNow, delay);
}

export function init() {
  store.onChange(local => { if (local && config()) schedule(); });
  window.addEventListener('online', () => syncNow());
  window.addEventListener('offline', () => set('offline'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
    else if (localStorage.getItem('shape:dirty')) syncNow();
  });
  setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 60000);
  syncNow();
}

// Lien d'appairage : le jeton est dans le fragment (#), jamais envoyé à un serveur.
export function pairLink(cfg) {
  const base = location.origin + location.pathname;
  return `${base}#pair=${b64encode(JSON.stringify({ o: cfg.owner, r: cfg.repo, t: cfg.token }))}`;
}
export function consumePairLink() {
  const m = location.hash.match(/^#pair=(.+)$/);
  if (!m) return false;
  history.replaceState(null, '', location.pathname);
  try {
    const p = JSON.parse(b64decode(decodeURIComponent(m[1])));
    setConfig({ owner: p.o, repo: p.r, token: p.t });
    return true;
  } catch { return false; }
}
