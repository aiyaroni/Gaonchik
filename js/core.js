/* ===== core.js — yaroni studio educational platform ===== */
/* Shared infrastructure for all subject apps               */
/* Usage: <script src="core.js"></script> before subject JS */

'use strict';

/* ========= DOM Utilities ========= */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, m => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
}

function shuffle(a) {
  const c = a.slice();
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function uuid() {
  return 'xxxxxxxyxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function focusTop(selector) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  const target = el || document.body;
  if (target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    try { target && target.focus({ preventScroll: true }); } catch {}
  });
}

function updateStatus(msg) {
  const el = $('#statusMsg');
  if (el) el.textContent = msg || '';
}

function showScreens(allIds, showId) {
  allIds.forEach(id => $('#' + id)?.classList.add('hidden'));
  $('#' + showId)?.classList.remove('hidden');
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function confettiBurst(container) {
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch {}
  const n = 28;
  for (let i = 0; i < n; i++) {
    const dot = document.createElement('span');
    dot.style.cssText = 'position:absolute;width:8px;height:8px;border-radius:50%;left:50%;top:10%';
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];
    dot.style.background = colors[i % colors.length];
    const angle = (i / n) * Math.PI * 2, dist = 80 + Math.random() * 50;
    const tx = Math.cos(angle) * dist, ty = Math.sin(angle) * dist;
    const anim = dot.animate(
      [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
       { transform: `translate(${tx - 50}%,${ty - 50}%) scale(.9)`, opacity: 0 }],
      { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
    anim.onfinish = () => dot.remove();
    (container || document.body).appendChild(dot);
  }
}

function trapDialog(modalSel, onClose) {
  const modal = $(modalSel);
  if (!modal) return;
  const getF = () => modal.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])');
  function onKey(e) {
    if (e.key === 'Escape') {
      modal.classList.add('hidden');
      modal.removeEventListener('keydown', onKey);
      if (onClose) onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const f = [...getF()]; if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first)      { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  modal.addEventListener('keydown', onKey);
  requestAnimationFrame(() => { const f = getF()[0]; f && f.focus(); });
}

function selectChoice(containerSel, itemSel, onChange) {
  const cont = $(containerSel);
  if (!cont) return;
  cont.addEventListener('click', e => {
    const btn = e.target.closest(itemSel);
    if (!btn || !cont.contains(btn)) return;
    $$(containerSel + ' ' + itemSel).forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('selected');
    btn.setAttribute('aria-pressed', 'true');
    if (onChange) onChange(btn);
  });
  cont.addEventListener('keydown', e => {
    const btn = e.target.closest(itemSel);
    if (!btn || !cont.contains(btn)) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
  });
}

/* ========= Audio Engine ========= */
let _isMuted = false, _audioCtx = null, _audioUnlocked = false, _muteKey = 'core_sound_muted';

function getAudioCtx() {
  if (_isMuted) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_audioCtx) _audioCtx = new AC();
  if (_audioCtx.state !== 'running' && _audioCtx.resume) { try { _audioCtx.resume(); } catch {} }
  return _audioCtx;
}

function unlockAudioOnce() {
  if (_audioUnlocked || _isMuted) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    gain.gain.value = 0.0001;
    src.buffer = buffer; src.connect(gain); gain.connect(ctx.destination);
    src.start(0);
    setTimeout(() => { try { src.disconnect(); gain.disconnect(); } catch {} _audioUnlocked = true; }, 0);
  } catch {}
}

function tone(freq, dur, t, type = 'sine', gain = 0.24) {
  if (_isMuted) return;
  const ctx = getAudioCtx(); if (!ctx) return;
  const start = typeof t === 'number' ? t : ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(g); g.connect(ctx.destination);
  try { o.start(start); o.stop(start + dur); } catch {}
}

function playSelectTick() {
  const ctx = getAudioCtx();
  if (!ctx) { unlockAudioOnce(); return; }
  tone(520, 0.10, ctx.currentTime, 'triangle', 0.24);
}

function playSuccessSound() {
  const ctx = getAudioCtx();
  if (!ctx) { unlockAudioOnce(); return; }
  const t = ctx.currentTime;
  tone(523.25, 0.12, t,       'sine', 0.22);
  tone(659.25, 0.12, t + 0.1, 'sine', 0.20);
  tone(783.99, 0.14, t + 0.2, 'sine', 0.18);
}

function playErrorSound() {
  const ctx = getAudioCtx();
  if (!ctx) { unlockAudioOnce(); return; }
  const t = ctx.currentTime;
  tone(220, 0.12, t,       'square', 0.20);
  tone(180, 0.12, t + 0.1, 'square', 0.18);
}

/**
 * initAudio(muteStorageKey)
 * Call once per subject app. muteStorageKey should be unique per app.
 */
function initAudio(muteStorageKey) {
  _muteKey = muteStorageKey || 'core_sound_muted';
  try { _isMuted = localStorage.getItem(_muteKey) === 'true'; } catch { _isMuted = false; }

  const btn = $('#audioToggle');
  if (!btn) return;

  // Update button state
  function syncBtn() {
    btn.setAttribute('aria-pressed', _isMuted ? 'true' : 'false');
    // Support both icon-span and text-content toggle styles
    const muted   = btn.querySelector('.muted');
    const unmuted = btn.querySelector('.unmuted');
    if (muted && unmuted) {
      muted.style.display   = _isMuted ? 'inline' : 'none';
      unmuted.style.display = _isMuted ? 'none'   : 'inline';
    } else {
      btn.textContent = _isMuted ? '🔇' : '🔊';
    }
  }
  syncBtn();

  btn.addEventListener('click', () => {
    _isMuted = !_isMuted;
    syncBtn();
    try { localStorage.setItem(_muteKey, String(_isMuted)); } catch {}
    if (!_isMuted) unlockAudioOnce();
  });

  // Global click → play tick + unlock audio
  document.addEventListener('click', e => {
    const el = e.target.closest('button,.op-btn,.choice-card,.chip,.link-cta,.answer-item');
    if (!el || el.id === 'audioToggle') return;
    const wasLocked = !_audioUnlocked;
    unlockAudioOnce();
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (wasLocked) setTimeout(playSelectTick, 0); else playSelectTick();
  });

  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') &&
        document.activeElement?.closest('button,.op-btn,.choice-card,.chip,.link-cta')) {
      playSelectTick();
    }
  });

  // Unlock on first touch/pointer
  window.addEventListener('touchstart',  unlockAudioOnce, { once: true, passive: true });
  window.addEventListener('touchend',    unlockAudioOnce, { once: true, passive: true });
  window.addEventListener('pointerdown', unlockAudioOnce, { once: true, capture: true });
  window.addEventListener('click',       unlockAudioOnce, { once: true, capture: true });
}

/* ========= Profile Store Factory ========= */
/**
 * CoreStore(storeKey, version)
 * Returns a namespaced profile store instance.
 *
 * Profile shape:
 * {
 *   version, installedAt, activeId,
 *   profiles: {
 *     [id]: { name, createdAt, lastSeen,
 *              totals: {sets,questions,correct,timeSec},
 *              breakdown: { [dimensionKey]: {sets,questions,correct,timeSec} },
 *              history: [...] }
 *   }
 * }
 *
 * Backward-compatible: if old profile has byOp or byTopic, those are migrated to breakdown.
 */
function CoreStore(storeKey, version) {
  let store = null;
  let memOnly = false;

  function save() {
    if (memOnly) return;
    try { localStorage.setItem(storeKey, JSON.stringify(store)); } catch { memOnly = true; }
  }

  function migrateLegacy(prof) {
    if (!prof.breakdown) {
      prof.breakdown = {};
      // migrate byOp (misparonchik) or byTopic (madaonchik)
      if (prof.byOp)    { prof.breakdown = prof.byOp;    }
      if (prof.byTopic) { prof.breakdown = prof.byTopic; }
    }
    return prof;
  }

  function init() {
    try { store = JSON.parse(localStorage.getItem(storeKey) || 'null'); } catch { store = null; memOnly = true; }
    if (!store) {
      store = { version, installedAt: Date.now(), activeId: null, profiles: {} };
      try { localStorage.setItem(storeKey, JSON.stringify(store)); } catch { memOnly = true; }
    }
    // Migrate any legacy profiles
    Object.values(store.profiles || {}).forEach(migrateLegacy);
  }

  function profilesArr() {
    return Object.entries(store.profiles).map(([id, p]) => ({ id, ...p }));
  }

  function getActive() {
    return store.activeId ? store.profiles[store.activeId] || null : null;
  }

  function setActive(id) {
    if (!store.profiles[id]) return;
    store.activeId = id;
    store.profiles[id].lastSeen = Date.now();
    save();
  }

  function ensureByName(name) {
    const norm = (name || '').trim();
    if (!norm) return null;
    const existing = profilesArr().find(p => p.name.trim() === norm);
    if (existing) { setActive(existing.id); return existing; }
    const id = uuid();
    store.profiles[id] = {
      name: norm, createdAt: Date.now(), lastSeen: Date.now(),
      totals: { sets: 0, questions: 0, correct: 0, timeSec: 0 },
      breakdown: {},
      history: []
    };
    setActive(id);
    return { id, ...store.profiles[id] };
  }

  /**
   * logSession(data)
   * data = { meta: {any fields for history entry},
   *          totals: {questions, correct, timeSec},
   *          breakdown: { [key]: {questions, correct, timeSec} } }
   */
  function logSession(data) {
    const prof = getActive();
    if (!prof) return;

    const entry = { id: uuid(), ts: Date.now(), ...data.meta };
    prof.history.unshift(entry);
    if (prof.history.length > 100) prof.history.pop();

    prof.totals.sets       += 1;
    prof.totals.questions  += data.totals.questions  || 0;
    prof.totals.correct    += data.totals.correct    || 0;
    prof.totals.timeSec    += data.totals.timeSec    || 0;

    if (data.breakdown) {
      Object.entries(data.breakdown).forEach(([key, vals]) => {
        if (!prof.breakdown[key]) prof.breakdown[key] = { sets: 0, questions: 0, correct: 0, timeSec: 0 };
        prof.breakdown[key].sets      += 1;
        prof.breakdown[key].questions += vals.questions || 0;
        prof.breakdown[key].correct   += vals.correct   || 0;
        prof.breakdown[key].timeSec   += vals.timeSec   || 0;
      });
    }
    save();
  }

  function resetActive() {
    store.activeId = null;
    save();
  }

  function setGenderForActive(g) {
    const prof = getActive();
    if (!prof) return;
    prof.gender = g === 'f' ? 'f' : (g === 'm' ? 'm' : null);
    save();
  }

  return { init, save, profilesArr, getActive, setActive, ensureByName, logSession, resetActive, setGenderForActive };
}

/* ========= Gender & String System ========= */
let _gender = null; // 'm' | 'f' | null

function setGender(g) { _gender = g === 'f' ? 'f' : (g === 'm' ? 'm' : null); }
function getGender() { return _gender; }

const STRINGS = {
  greeting:     { m: 'ברוך הבא',          f: 'ברוכה הבאה'          },
  wellDone:     { m: 'כל הכבוד',           f: 'כל הכבוד'            },
  tryAgain:     { m: 'נסה שוב',            f: 'נסי שוב'             },
  continue_:    { m: 'המשך',              f: 'המשיכי'             },
  correct:      { m: 'נכון! המשך',         f: 'נכון! המשיכי'        },
  almost:       { m: 'כמעט! ממשיכים',     f: 'כמעט! ממשיכים'      },
  chooseAnswer: { m: 'בחר תשובה ואז אשר', f: 'בחרי תשובה ואז אשרי' },
  letsGo:       { m: 'יצאנו לדרך! בחר/י תשובה ואז אשר/י.', f: 'יצאנו לדרך! בחרי תשובה ואז אשרי.' },
};

function t(key) {
  const entry = STRINGS[key];
  if (!entry) return key;
  if (_gender === 'f') return entry.f !== undefined ? entry.f : entry.m || key;
  return entry.m || key;
}

/* ========= Age Layer ========= */
let _ageLayer = null; // 'tiny' | 'junior' | 'mid' | 'senior' | null

function setAgeLayer(layer) {
  const valid = ['tiny', 'junior', 'mid', 'senior'];
  _ageLayer = valid.includes(layer) ? layer : null;
}
function getAgeLayer() { return _ageLayer; }

/* ========= Context Bar ========= */
/**
 * renderContextBar(apps, currentAppKey)
 * apps: [{ key, label, emoji, href }]
 * currentAppKey: string matching one of app.key, or null (hub / index.html)
 *
 * Injects #contextBar into document.body if not present.
 * Adds 'has-ctx-bar' to <body> for layout offset.
 */
function renderContextBar(apps, currentAppKey) {
  let bar = document.getElementById('contextBar');
  if (!bar) {
    bar = document.createElement('nav');
    bar.id = 'contextBar';
    bar.setAttribute('aria-label', 'ניווט ראשי');
    document.body.insertBefore(bar, document.body.firstChild);
  }
  document.body.classList.add('has-ctx-bar');

  bar.innerHTML = '';

  const homeA = document.createElement('a');
  homeA.href = 'index.html';
  homeA.className = 'ctx-btn' + (currentAppKey === null ? ' ctx-btn-active' : '');
  homeA.setAttribute('aria-label', 'דף הבית');
  homeA.textContent = '🏠';
  bar.appendChild(homeA);

  apps.forEach((app, i) => {
    const sep = document.createElement('span');
    sep.className = 'ctx-sep'; sep.setAttribute('aria-hidden', 'true'); sep.textContent = '|';
    bar.appendChild(sep);

    const a = document.createElement('a');
    a.href = app.href;
    a.className = 'ctx-btn' + (currentAppKey === app.key ? ' ctx-btn-active' : '');
    a.innerHTML = `<span aria-hidden="true">${escapeHtml(app.emoji)}</span> ${escapeHtml(app.label)}`;
    bar.appendChild(a);
  });
}

function showContextBar() {
  const b = document.getElementById('contextBar');
  if (b) b.classList.remove('ctx-hidden');
  document.body.classList.add('has-ctx-bar');
}

function hideContextBar() {
  const b = document.getElementById('contextBar');
  if (b) b.classList.add('ctx-hidden');
  document.body.classList.remove('has-ctx-bar');
}
