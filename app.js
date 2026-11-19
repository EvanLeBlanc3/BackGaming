/* BackGaming v1.0 — your video game backlog, saved like a memory card. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const KEY = 'backgaming.v1';
const DAY = 864e5;

const PLATFORMS = ['PS5','PS4','Xbox Series','Xbox One','Switch 2','Switch','PC','Steam Deck','Mac','iPhone / iPad','Android','VR','Retro','Other'];
const PCOL = {'PS5':'#4a8bff','PS4':'#3a6fe0','Xbox Series':'#3ddc5a','Xbox One':'#2fbf48','Switch 2':'#ff4d4d','Switch':'#ff3b3b','PC':'#ffb020','Steam Deck':'#a07cff','Mac':'#c9d2db','iPhone / iPad':'#aab6c2','Android':'#3ddc84','VR':'#ff6ad5','Retro':'#ff8a3d','Other':'#8f8ab8'};
const GENRES = ['Action','Adventure','RPG','JRPG','Shooter','Platformer','Puzzle','Racing','Sports','Fighting','Horror','Strategy','Simulation','Roguelike','Metroidvania','Indie','MMO','Party','Rhythm','Open World','Survival','Visual Novel'];
const HYPE = ['', 'Meh, maybe', 'Curious', 'Want it', 'Hyped!', 'MUST PLAY'];
const HYPE_C = ['', '#3dff8a', '#b6ff3d', '#ffd23f', '#ff9a3d', '#ff3e5e'];
const XP = { add: 10, start: 25, done: 100 };
const XP_PER_LV = 250;
const RANKS = ['Rookie','Button Masher','Side Quester','Combo Breaker','Speedrunner','Dungeon Crawler','Raid Boss','Final Boss','Legend','Backlog Slayer'];
const TAB_STATUS = { queue: 'backlog', playing: 'playing', cleared: 'done' };
const STATUS_TAB = { backlog: 'queue', playing: 'playing', done: 'cleared' };

/* ---------- pixel icons (drawn from text grids) ---------- */
const ICON = {
  queue:['............','.##.#######.','.##.#######.','............','.##.#######.','.##.#######.','............','.##.#######.','.##.#######.','............','.##.#######.','.##.#######.'],
  pad:['............','............','..########..','.##########.','##.#####.#.#','#...###.#.##','##.#####.#.#','############','####....####','###......###','.#........#.','............'],
  trophy:['............','.##########.','#.########.#','#.########.#','.#.######.#.','...######...','....####....','.....##.....','.....##.....','....####....','...######...','............'],
  invader:['..#.....#..','...#...#...','..#######..','.##.###.##.','###########','#.#######.#','#.#.....#.#','...##.##...'],
  plus:['....##....','....##....','....##....','....##....','##########','##########','....##....','....##....','....##....','....##....'],
  play:['#.......','###.....','#####...','#######.','########','#######.','#####...','###.....','#.......'],
  check:['..........#','.........##','........##.','#......##..','##....##...','.##..##....','..####.....','...##......'],
  sound:['...#........','..##.....#..','.###..#...#.','####...#..#.','####...#..#.','.###..#...#.','..##.....#..','...#........'],
  mute:['...#........','..##........','.###..#...#.','####...#.#..','####....#...','.###...#.#..','..##..#...#.','...#........'],
  dice:['##########','#........#','#.##..##.#','#.##..##.#','#........#','#........#','#.##..##.#','#.##..##.#','#........#','##########'],
  disk:['#########.','#.#####.##','#.#####..#','#.#####..#','#........#','#.######.#','#.#....#.#','#.#....#.#','#.######.#','##########'],
  skull:['..######..','.########.','##########','#..####..#','#..####..#','##########','.###..###.','..######..','..#.##.#..']
};
function pxsvg(rows){
  let r = '';
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`; }));
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${r}</svg>`;
}
const I = k => pxsvg(ICON[k]);

/* ---------- state ---------- */
const defaults = () => ({ games: [], xp: 0, sound: true, lastBackup: null, dirty: false });
let state = load();
const ui = { tab: 'queue', q: '', sort: 'hype', pf: 'All', newId: null };
let draft = null;

function load(){
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.games)) return Object.assign(defaults(), s, { games: s.games.map(norm).filter(Boolean) });
  } catch (e) {}
  return defaults();
}
function persist(){
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast('STORAGE FULL! Export a backup & remove some box art.', 'var(--red)'); }
}
function commit(){ state.dirty = true; persist(); }

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };
const initials = t => (t.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();

function norm(g){
  if (!g || typeof g.title !== 'string' || !g.title.trim()) return null;
  return {
    id: String(g.id || uid()), title: g.title.trim().slice(0, 80),
    platform: String(g.platform || 'Other').slice(0, 30), genre: String(g.genre || '').slice(0, 30),
    hype: clamp(Math.round(+g.hype) || 3, 1, 5),
    status: ['backlog','playing','done'].includes(g.status) ? g.status : 'backlog',
    notes: String(g.notes || '').slice(0, 1000),
    cover: typeof g.cover === 'string' && g.cover.startsWith('data:image') ? g.cover : null,
    rating: clamp(Math.round(+g.rating) || 0, 0, 5),
    added: +g.added || Date.now(), started: g.started ? +g.started : null, completed: g.completed ? +g.completed : null
  };
}
function level(xp){
  const lv = Math.floor(xp / XP_PER_LV) + 1;
  return { lv, pct: (xp % XP_PER_LV) / XP_PER_LV, into: xp % XP_PER_LV, rank: RANKS[Math.min(lv - 1, RANKS.length - 1)] };
}
const backupDue = () => state.games.length > 0 && state.dirty && (!state.lastBackup || Date.now() - state.lastBackup > 7 * DAY);

/* ---------- chiptune sound engine (no audio files needed) ---------- */
let ac = null;
function actx(){
  if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (A) ac = new A(); }
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}
['touchstart','pointerdown'].forEach(ev => document.addEventListener(ev, () => actx(), { passive: true }));
function tone(f, d, { type = 'square', vol = .07, at = 0, to = null } = {}){
  if (!state.sound) return; const c = actx(); if (!c) return;
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .03);
}
function noise(d, { vol = .12, at = 0 } = {}){
  if (!state.sound) return; const c = actx(); if (!c) return;
  const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), data = b.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const s = c.createBufferSource(), g = c.createGain(), t = c.currentTime + at;
  s.buffer = b; g.gain.setValueAtTime(vol, t); s.connect(g).connect(c.destination); s.start(t);
}
const sfx = {
  blip:  () => tone(880, .05, { vol: .05 }),
  tick:  () => tone(1200 + Math.random() * 400, .03, { vol: .04 }),
  tab:   () => { tone(523, .05, { vol: .05 }); tone(784, .06, { vol: .05, at: .05 }); },
  save:  () => { tone(988, .08, { vol: .09 }); tone(1319, .4, { vol: .09, at: .08 }); },
  start: () => { tone(220, .3, { to: 880, vol: .07 }); [523,659,784,1047].forEach((f,i) => tone(f, .09, { vol: .06, at: .3 + i * .07 })); },
  complete: () => {
    [523,659,784,1047,784,1047].forEach((f,i) => tone(f, .12, { vol: .08, at: i * .1 }));
    tone(1319, .6, { vol: .08, at: .62 }); tone(1047, .6, { vol: .05, at: .62, type: 'triangle' }); tone(523, .7, { vol: .07, at: .62, type: 'triangle' });
  },
  levelup: () => [392,523,659,784,1047,1319,1568].forEach((f,i) => tone(f, .08, { vol: .07, at: i * .055 })),
  del:   () => { noise(.45, { vol: .15 }); [440,349,262,196,131].forEach((f,i) => tone(f, .14, { type: 'sawtooth', vol: .05, at: i * .11 })); },
  err:   () => { tone(140, .12, { type: 'sawtooth', vol: .08 }); tone(110, .2, { type: 'sawtooth', vol: .08, at: .13 }); },
  load:  () => [262,330,392,523,659,784].forEach((f,i) => tone(f, .1, { vol: .07, at: i * .07, type: i % 2 ? 'square' : 'triangle' })),
  star:  n => tone(600 + n * 140, .12, { vol: .07 })
};

/* ---------- FX ---------- */
function toast(msg, color = 'var(--cyan)', ms = 2200){
  const t = document.createElement('div'); t.className = 'toast'; t.style.setProperty('--c', color); t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 320);
}
function banner({ title, sub, color = 'var(--yellow)', icon, ms = 1500, flash = false }){
  const fx = $('#fx');
  if (flash) { const f = document.createElement('div'); f.className = 'flash'; fx.appendChild(f); setTimeout(() => f.remove(), 400); }
  const b = document.createElement('div'); b.className = 'banner'; b.style.setProperty('--c', color);
  const letters = [...title].map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
  b.innerHTML = `${icon ? `<div class="bicon">${I(icon)}</div>` : ''}<div class="btitle">${letters}</div>${sub ? `<div class="bsub">${esc(sub)}</div>` : ''}`;
  fx.appendChild(b);
  setTimeout(() => b.classList.add('out'), ms); setTimeout(() => b.remove(), ms + 400);
}
function coins(n = 7){
  const fx = $('#fx'), r = $('#root'), w = r.clientWidth, h = r.clientHeight;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'coin';
    c.style.left = (w / 2 - 13 + (Math.random() * 60 - 30)) + 'px'; c.style.top = (h * .62) + 'px';
    c.style.setProperty('--dx', (Math.random() * 220 - 110) + 'px'); c.style.animationDelay = (i * 45) + 'ms';
    fx.appendChild(c); setTimeout(() => c.remove(), 1400);
  }
}
let parts = [], raf = null;
function confetti(n = 140){
  const cv = $('#confetti'), r = $('#root'), dpr = window.devicePixelRatio || 1;
  cv.width = r.clientWidth * dpr; cv.height = r.clientHeight * dpr;
  const cols = ['#ff3ea5','#22e4ff','#ffd23f','#3dff8a','#ff9a3d','#a07cff','#ffffff'];
  for (let i = 0; i < n; i++) parts.push({
    x: cv.width / 2 + (Math.random() - .5) * 60 * dpr, y: cv.height * .45,
    vx: (Math.random() - .5) * 16 * dpr, vy: (-Math.random() * 16 - 6) * dpr,
    s: (4 + Math.random() * 5) * dpr, c: cols[i % cols.length], life: 120 + Math.random() * 60
  });
  if (!raf) loop();
  function loop(){
    const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life > 0 && p.y < cv.height + 20);
    for (const p of parts) {
      p.vy += .45 * dpr; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.life--;
      ctx.globalAlpha = Math.min(1, p.life / 40); ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    raf = parts.length ? requestAnimationFrame(loop) : (ctx.clearRect(0, 0, cv.width, cv.height), null);
  }
}
function floatXP(n){
  const e = document.createElement('div'); e.className = 'xpfloat'; e.textContent = `+${n} XP`;
  $('#root').appendChild(e); setTimeout(() => e.remove(), 1400);
}
function addXP(n, delay = 1500){
  const before = level(state.xp).lv;
  state.xp += n; floatXP(n);
  const after = level(state.xp);
  if (after.lv > before) setTimeout(() => {
    sfx.levelup(); confetti(80);
    banner({ title: 'LEVEL UP!', sub: `LV ${after.lv} · ${after.rank}`, color: 'var(--green)', icon: 'invader', ms: 1700 });
  }, delay);
}
function shake(el){ el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

/* ---------- rendering ---------- */
function renderHUD(){
  const L = level(state.xp);
  $('#lvl').textContent = L.lv; $('#xpfill').style.width = (L.pct * 100) + '%';
  $('#soundBtn').innerHTML = I(state.sound ? 'sound' : 'mute');
  const labels = { queue: ['queue','QUEUE'], playing: ['pad','PLAYING'], cleared: ['trophy','CLEARED'], player: ['invader','PLAYER'] };
  document.querySelectorAll('#nav button').forEach(b => {
    const [ic, lb] = labels[b.dataset.tab];
    b.innerHTML = I(ic) + lb + (b.dataset.tab === 'player' ? `<span class="dot ${backupDue() ? 'show' : ''}"></span>` : '');
    b.classList.toggle('on', b.dataset.tab === ui.tab);
  });
  $('#fab').style.display = ui.tab === 'player' ? 'none' : '';
}

function coverHTML(g){
  if (g.cover) return `<img src="${g.cover}" alt="">`;
  return `<div class="gen" style="--h:${hue(g.title || '?')}"><b>${esc(initials(g.title || '?'))}</b></div>`;
}
function hypeHTML(n){ return `<span class="hype">${[1,2,3,4,5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`; }
function starsHTML(n){ return `<span class="stars-sm">${[1,2,3,4,5].map(i => `<span class="${i <= n ? '' : 'off'}">★</span>`).join('')}</span>`; }

function cardHTML(g){
  const pc = PCOL[g.platform] || '#8f8ab8';
  let sub = '', act = '', badge = '';
  if (g.status === 'backlog') {
    sub = `${hypeHTML(g.hype)}<span class="hypelbl" style="color:${HYPE_C[g.hype]}">${HYPE[g.hype]}</span>`;
    act = `<button class="act start" data-act="start" data-id="${g.id}" aria-label="Start playing">${I('play')}START</button>`;
  } else if (g.status === 'playing') {
    const d = Math.max(1, Math.ceil((Date.now() - (g.started || Date.now())) / DAY));
    sub = `<span>Day ${d} of the run</span>`;
    act = `<button class="act clear" data-act="complete" data-id="${g.id}" aria-label="Mark completed">${I('check')}CLEAR</button>`;
    badge = `<span class="badge-now">● NOW PLAYING</span>`;
  } else {
    sub = `${g.rating ? starsHTML(g.rating) : '<span>Unrated</span>'}<span>${g.completed ? fmtDate(g.completed) : ''}</span>`;
  }
  return `<div class="card ${g.status} ${ui.newId === g.id ? 'new' : ''}" data-id="${g.id}" style="--pc:${pc}">
    ${badge}<div class="cover">${coverHTML(g)}</div>
    <div class="info"><div class="title">${esc(g.title)}</div>
      <div class="meta"><span class="tag">${esc(g.platform)}</span>${g.genre ? `<span class="genre">${esc(g.genre)}</span>` : ''}</div>
      <div class="subline">${sub}</div></div>
    <div>${act}</div></div>`;
}

const EMPTY = {
  queue:   ['pad', 'NO QUESTS LOGGED', 'Your backlog is empty. Tap the big pink button to add a game you want to play someday.', 'INSERT COIN ▸'],
  playing: ['invader', 'PLAYER 1 IS IDLE', 'Nothing in progress. Hit START on a game in your queue to begin a run.', 'PRESS START'],
  cleared: ['trophy', 'TROPHY ROOM EMPTY', 'Finish a game and hit CLEAR to put it on the shelf of glory.', 'GO GET ONE'],
  search:  ['skull', 'NO MATCHES', 'Nothing matches that search or filter.', '']
};
function emptyHTML(k){
  const [ic, h, p, b] = EMPTY[k];
  return `<div class="empty"><div class="big">${I(ic)}</div><h3>${h}</h3><p>${p}</p>${b ? `<div class="blinky">${b}</div>` : ''}</div>`;
}

function listShell(){
  const st = TAB_STATUS[ui.tab], n = state.games.filter(g => g.status === st).length;
  const titles = { queue: 'QUEST LOG', playing: 'NOW PLAYING', cleared: 'TROPHY ROOM' };
  const sorts = ui.tab === 'queue'
    ? [['hype','Hype'],['new','Newest'],['old','Oldest'],['az','A–Z'],['plat','Platform']]
    : ui.tab === 'playing' ? [['new','Recent'],['az','A–Z'],['plat','Platform']]
    : [['new','Recent'],['rating','Rating'],['az','A–Z'],['plat','Platform']];
  if (!sorts.some(s => s[0] === ui.sort)) ui.sort = sorts[0][0];
  return `<div class="sec-title"><span>${titles[ui.tab]}</span><small>${n} ${ui.tab === 'cleared' ? 'cleared' : ui.tab === 'playing' ? 'active' : 'queued'}</small></div>
    ${n ? `<div class="tools"><input id="q" type="search" placeholder="Search games…" autocomplete="off" value="${esc(ui.q)}">
      <select id="sort">${sorts.map(([v, l]) => `<option value="${v}" ${v === ui.sort ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="chips" id="chips"></div>` : ''}
    ${ui.tab === 'queue' && n ? `<button class="btn roll" data-act="roll">${I('dice')} ROLL FOR MY NEXT GAME</button>` : ''}
    <div class="list" id="list"></div>`;
}
function renderList(){
  const list = $('#list'); if (!list) return;
  const st = TAB_STATUS[ui.tab];
  const all = state.games.filter(g => g.status === st);
  const chips = $('#chips');
  if (chips) {
    const plats = ['All', ...new Set(all.map(g => g.platform))];
    if (!plats.includes(ui.pf)) ui.pf = 'All';
    chips.innerHTML = plats.length > 2 ? plats.map(p => `<button class="chip ${p === ui.pf ? 'on' : ''}" data-pf="${esc(p)}">${esc(p)}</button>`).join('') : '';
    chips.style.display = plats.length > 2 ? '' : 'none';
  }
  const q = ui.q.trim().toLowerCase();
  let items = all.filter(g => (ui.pf === 'All' || g.platform === ui.pf) &&
    (!q || [g.title, g.genre, g.platform, g.notes].join(' ').toLowerCase().includes(q)));
  const when = g => ui.tab === 'cleared' ? (g.completed || 0) : ui.tab === 'playing' ? (g.started || 0) : g.added;
  const sorters = {
    hype: (a, b) => b.hype - a.hype || b.added - a.added,
    new: (a, b) => when(b) - when(a), old: (a, b) => when(a) - when(b),
    az: (a, b) => a.title.localeCompare(b.title),
    plat: (a, b) => a.platform.localeCompare(b.platform) || a.title.localeCompare(b.title),
    rating: (a, b) => b.rating - a.rating || when(b) - when(a)
  };
  items.sort(sorters[ui.sort] || sorters.new);
  list.innerHTML = !all.length ? emptyHTML(ui.tab) : !items.length ? emptyHTML('search') : items.map(cardHTML).join('');
  ui.newId = null;
}

function playerHTML(){
  const L = level(state.xp), gs = state.games;
  const c = s => gs.filter(g => g.status === s).length;
  const done = c('done'), total = gs.length;
  const pc = {}; gs.forEach(g => pc[g.platform] = (pc[g.platform] || 0) + 1);
  const fav = Object.entries(pc).sort((a, b) => b[1] - a[1])[0];
  const rated = gs.filter(g => g.status === 'done' && g.rating);
  const avg = rated.length ? (rated.reduce((s, g) => s + g.rating, 0) / rated.length).toFixed(1) : '—';
  const lb = state.lastBackup ? `last save ${fmtDate(state.lastBackup)}` : 'never saved';
  return `<div class="sec-title"><span>PLAYER 1</span></div>
  <div class="pcard"><div class="avatar">${I('invader')}</div>
    <div style="flex:1;min-width:0"><div class="ptitle">${L.rank}</div><div class="plv">LEVEL ${L.lv}</div>
    <div class="xpbar big"><i style="width:${L.pct * 100}%"></i></div>
    <div class="pxp">${L.into} / ${XP_PER_LV} XP · ${state.xp} total</div></div></div>
  <div class="stats">
    <div class="stat"><b style="color:var(--pink)">${c('backlog')}</b><span>QUEUED</span></div>
    <div class="stat"><b style="color:var(--cyan)">${c('playing')}</b><span>PLAYING</span></div>
    <div class="stat"><b style="color:var(--green)">${done}</b><span>CLEARED</span></div>
    <div class="stat"><b style="color:var(--yellow)">${total ? Math.round(done / total * 100) : 0}%</b><span>CLEAR RATE</span></div>
    <div class="stat"><b style="font-size:17px;line-height:1.55">${fav ? esc(fav[0]) : '—'}</b><span>TOP PLATFORM</span></div>
    <div class="stat"><b style="color:var(--yellow)">${avg}${avg !== '—' ? '<small style="font-size:16px">★</small>' : ''}</b><span>AVG RATING</span></div>
  </div>
  <div class="sec-title" style="margin-top:18px"><span>MEMORY CARD</span><small>${lb}</small></div>
  <div class="panel">
    <p class="hint">Your games are stored on this iPhone. Export a save file to Files or iCloud Drive so you can load everything back if the app ever resets.</p>
    ${backupDue() ? '<div class="warn">!! UNSAVED PROGRESS — BACK UP NOW !!</div>' : ''}
    <button class="btn primary wide" data-act="export">${I('disk')} EXPORT SAVE FILE</button>
    <button class="btn cyan wide" data-act="import">LOAD SAVE FILE</button>
    <div class="row2"><button class="btn sm" data-act="copycode">COPY BACKUP CODE</button><button class="btn sm" data-act="pastecode">PASTE BACKUP CODE</button></div>
  </div>
  <div class="sec-title"><span>OPTIONS</span></div>
  <div class="panel">
    <button class="toggle" data-act="sound"><span>Sound effects</span><b class="${state.sound ? '' : 'off'}">${state.sound ? 'ON' : 'OFF'}</b></button>
    <button class="btn danger wide" data-act="wipe">${I('skull')} ERASE ALL DATA</button>
  </div>
  <p class="foot">BACKGAMING v1.0 · WORKS OFFLINE · NO ACCOUNT NEEDED</p>`;
}

function render(){
  renderHUD();
  const v = $('#view');
  v.innerHTML = ui.tab === 'player' ? playerHTML() : listShell();
  renderList();
}
function goTab(t, sound = true){
  if (t !== ui.tab) { ui.tab = t; ui.q = ''; ui.pf = 'All'; ui.sort = ''; $('#view').scrollTop = 0; if (sound) sfx.tab(); }
  render();
}

/* ---------- game actions ---------- */
const find = id => state.games.find(g => g.id === id);
function startGame(id){
  const g = find(id); if (!g) return;
  g.status = 'playing'; g.started = Date.now(); commit();
  sfx.start(); banner({ title: 'PLAYER 1 READY!', sub: g.title, color: 'var(--cyan)', icon: 'pad', flash: true });
  addXP(XP.start); ui.newId = g.id; goTab('playing', false);
}
function completeGame(id, askRate = true){
  const g = find(id); if (!g) return;
  g.status = 'done'; g.completed = Date.now(); if (!g.started) g.started = g.completed; commit();
  sfx.complete(); confetti(); coins(9);
  banner({ title: 'LEVEL CLEAR!', sub: g.title, color: 'var(--yellow)', icon: 'trophy', ms: 1900, flash: true });
  addXP(XP.done, 2200); ui.newId = g.id; goTab('cleared', false);
  if (askRate) setTimeout(() => rateDialog(g.id), 2100);
}
async function deleteGame(id){
  const g = find(id); if (!g) return;
  const ok = await confirmBox({ title: 'GAME OVER?', msg: `Remove “${g.title}” from BackGaming? This can't be undone (unless you have a backup).`, yes: 'DELETE', danger: true });
  if (!ok) return;
  closeModal();
  const el = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  sfx.del();
  const finish = () => { state.games = state.games.filter(x => x.id !== id); commit(); render(); toast('GAME OVER — removed', 'var(--red)'); };
  if (el) { el.classList.add('dying'); setTimeout(finish, 560); } else finish();
}

/* ---------- add / edit sheet ---------- */
function openSheet(id){
  const g = id ? find(id) : null;
  draft = { id, cover: g ? g.cover : null, hype: g ? g.hype : 3, status: g ? g.status : (TAB_STATUS[ui.tab] || 'backlog'), rating: g ? g.rating : 0 };
  const plats = PLATFORMS.includes(g?.platform) || !g ? PLATFORMS : [...PLATFORMS, g.platform];
  const m = $('#modal');
  m.innerHTML = `<div class="scrim" data-close></div>
  <div class="sheet" role="dialog" aria-label="${g ? 'Edit game' : 'Add game'}">
    <div class="grab"></div>
    <div class="sheet-h"><b>${g ? 'EDIT GAME' : 'NEW QUEST'}</b><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="sheet-body">
      <div class="cover-pick"><div class="cover big" id="cvPrev"></div>
        <div><div class="btns"><button class="btn sm cyan" data-s="cover">BOX ART</button><button class="btn sm ghost" data-s="rmcover">REMOVE</button></div>
        <p class="hint">Optional — snap the box, or pick a screenshot.</p></div></div>
      <label>GAME TITLE<input id="fTitle" maxlength="80" placeholder="e.g. Hollow Knight: Silksong" autocomplete="off"></label>
      <div class="row2"><label>PLATFORM<select id="fPlat">${plats.map(p => `<option>${esc(p)}</option>`).join('')}</select></label>
        <label>GENRE<input id="fGenre" list="genres" maxlength="30" placeholder="RPG" autocomplete="off"></label></div>
      <div class="flabel">HYPE LEVEL <span id="hypeLbl"></span></div>
      <div class="hypepick" id="hypePick">${[1,2,3,4,5].map(i => `<button data-h="${i}" aria-label="Hype ${i}"></button>`).join('')}</div>
      <div class="flabel">STATUS</div>
      <div class="seg" id="seg"><button data-st="backlog">QUEUE</button><button data-st="playing">PLAYING</button><button data-st="done">CLEARED</button></div>
      <div id="rateWrap"><div class="flabel">YOUR RATING</div><div class="starpick" id="starPick">${[1,2,3,4,5].map(i => `<button data-r="${i}" aria-label="${i} stars">★</button>`).join('')}</div></div>
      <label>NOTES<textarea id="fNotes" rows="3" maxlength="1000" placeholder="Who recommended it, sale price to wait for, co-op buddy…"></textarea></label>
    </div>
    <div class="sheet-f">${g ? `<button class="btn danger" data-s="delete">${I('skull')}</button>` : ''}<button class="btn primary" data-s="save">${I('disk')} SAVE GAME</button></div>
  </div>`;
  $('#fTitle').value = g ? g.title : '';
  $('#fPlat').value = g ? g.platform : (localStorage.getItem('backgaming.lastPlat') || 'PS5');
  $('#fGenre').value = g ? g.genre : '';
  $('#fNotes').value = g ? g.notes : '';
  syncSheet();
  m.classList.remove('closing'); m.classList.add('show');
  sfx.blip();
}
function syncSheet(){
  $('#cvPrev').innerHTML = coverHTML({ cover: draft.cover, title: $('#fTitle').value || '?' });
  document.querySelectorAll('#hypePick button').forEach(b => b.classList.toggle('on', +b.dataset.h <= draft.hype));
  $('#hypeLbl').textContent = HYPE[draft.hype]; $('#hypeLbl').style.color = HYPE_C[draft.hype];
  document.querySelectorAll('#seg button').forEach(b => b.classList.toggle('on', b.dataset.st === draft.status));
  $('#rateWrap').style.display = draft.status === 'done' ? '' : 'none';
  document.querySelectorAll('#starPick button').forEach(b => b.classList.toggle('on', +b.dataset.r <= draft.rating));
}
function closeModal(){
  const m = $('#modal'); if (!m.classList.contains('show')) return;
  m.classList.add('closing');
  setTimeout(() => { m.classList.remove('show', 'closing'); m.innerHTML = ''; }, 250);
}
function popBtn(b){ b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 160); }

function saveSheet(){
  const title = $('#fTitle').value.trim();
  if (!title) { shake($('#fTitle')); sfx.err(); toast('Every quest needs a name!', 'var(--red)'); return; }
  const platform = $('#fPlat').value;
  localStorage.setItem('backgaming.lastPlat', platform);
  const data = { title, platform, genre: $('#fGenre').value.trim(), hype: draft.hype, notes: $('#fNotes').value.trim(), cover: draft.cover };
  const now = Date.now();
  if (!draft.id) {
    if (state.games.some(g => g.title.toLowerCase() === title.toLowerCase() && g.platform === platform)) {
      shake($('#fTitle')); sfx.err(); toast('Already in your log on that platform!', 'var(--orange)'); return;
    }
    const g = norm({ id: uid(), ...data, status: draft.status, rating: draft.status === 'done' ? draft.rating : 0, added: now,
      started: draft.status !== 'backlog' ? now : null, completed: draft.status === 'done' ? now : null });
    state.games.push(g); commit(); closeModal(); ui.newId = g.id;
    if (g.status === 'backlog') {
      sfx.save(); coins(); banner({ title: 'QUEST SAVED!', sub: g.title, color: 'var(--pink)', ms: 1200 });
      addXP(XP.add); goTab('queue', false);
    } else if (g.status === 'playing') {
      sfx.start(); banner({ title: 'PLAYER 1 READY!', sub: g.title, color: 'var(--cyan)', icon: 'pad', flash: true });
      addXP(XP.add + XP.start); goTab('playing', false);
    } else {
      sfx.complete(); confetti(); coins(9);
      banner({ title: 'LEVEL CLEAR!', sub: g.title, color: 'var(--yellow)', icon: 'trophy', ms: 1900, flash: true });
      addXP(XP.add + XP.done, 2200); goTab('cleared', false);
    }
    return;
  }
  const g = find(draft.id); if (!g) return closeModal();
  const prev = g.status, next = draft.status;
  Object.assign(g, data);
  if (next === 'done') g.rating = draft.rating;
  closeModal();
  if (next === prev) { commit(); sfx.save(); toast('GAME SAVED', 'var(--green)', 1400); render(); return; }
  if (next === 'done') { completeGame(g.id, false); return; }
  if (next === 'playing') { if (prev === 'backlog') return startGame(g.id); g.status = 'playing'; g.completed = null; commit(); sfx.start(); toast('BACK IN THE GAME!', 'var(--cyan)'); ui.newId = g.id; return goTab('playing', false); }
  g.status = 'backlog'; g.started = null; g.completed = null; commit(); sfx.save(); toast('MOVED BACK TO QUEUE', 'var(--pink)'); ui.newId = g.id; goTab('queue', false);
}

/* cover photo -> compressed thumbnail */
$('#coverInput').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => {
    const W = 240, H = 320, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s;
    cv.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    URL.revokeObjectURL(url);
    if (draft) { draft.cover = cv.toDataURL('image/jpeg', .78); syncSheet(); sfx.save(); }
  };
  img.onerror = () => { sfx.err(); toast("Couldn't read that image", 'var(--red)'); };
  img.src = url;
});

/* ---------- dialogs ---------- */
let dlgHandler = null;
function openDialog(html, handler, color){
  const d = $('#dialog');
  d.innerHTML = `<div class="scrim" data-d="__scrim"></div><div class="dlg" style="--c:${color || 'var(--cyan)'}">${html}</div>`;
  d.classList.add('show'); dlgHandler = handler;
}
function closeDialog(){ const d = $('#dialog'); d.classList.remove('show'); d.innerHTML = ''; dlgHandler = null; }
$('#dialog').addEventListener('click', e => {
  const b = e.target.closest('[data-d]'); if (!b || !dlgHandler) return;
  dlgHandler(b.dataset.d, b);
});
function confirmBox({ title, msg, yes = 'OK', no = 'CANCEL', danger = false }){
  return new Promise(res => {
    openDialog(`<div class="dlg-t">${esc(title)}</div><div class="dlg-m">${esc(msg)}</div>
      <div class="dlg-b"><button class="btn ${danger ? 'danger' : 'primary'}" data-d="y">${esc(yes)}</button><button class="btn ghost" data-d="n">${esc(no)}</button></div>`,
      k => { closeDialog(); res(k === 'y'); }, danger ? 'var(--red)' : 'var(--cyan)');
    danger ? sfx.err() : sfx.blip();
  });
}
function choiceBox({ title, msg, options, color }){
  return new Promise(res => {
    openDialog(`<div class="dlg-t">${esc(title)}</div><div class="dlg-m">${esc(msg)}</div>
      <div class="dlg-b">${options.map(([k, l, cls]) => `<button class="btn ${cls || ''}" data-d="${k}">${esc(l)}</button>`).join('')}</div>`,
      k => { closeDialog(); res(k === '__scrim' ? null : k); }, color);
    sfx.blip();
  });
}
function rateDialog(id){
  const g = find(id); if (!g) return;
  let r = g.rating || 0;
  const draw = () => document.querySelectorAll('#dialog .starpick button').forEach(b => b.classList.toggle('on', +b.dataset.d.slice(1) <= r));
  openDialog(`<div class="dlg-t">HOW WAS IT?</div><div class="dlg-m">${esc(g.title)}</div>
    <div class="starpick">${[1,2,3,4,5].map(i => `<button data-d="r${i}">★</button>`).join('')}</div>
    <div class="dlg-b"><button class="btn primary" data-d="ok">LOCK IT IN</button><button class="btn ghost" data-d="skip">SKIP</button></div>`,
    (k, b) => {
      if (k[0] === 'r') { r = +k.slice(1); sfx.star(r); popBtn(b); draw(); return; }
      if (k === 'ok' && r) { g.rating = r; commit(); render(); toast(`${'★'.repeat(r)} RATED`, 'var(--yellow)'); }
      closeDialog();
    }, 'var(--yellow)');
  draw();
}
function roll(){
  const pool = state.games.filter(g => g.status === 'backlog');
  if (!pool.length) { sfx.err(); toast('Queue is empty!', 'var(--red)'); return; }
  const pickW = () => { const tot = pool.reduce((s, g) => s + g.hype * g.hype, 0); let x = Math.random() * tot; return pool.find(g => (x -= g.hype * g.hype) < 0) || pool[0]; };
  let pick = null;
  const spin = () => {
    pick = pickW();
    const reel = $('#reel'), txt = $('#reelTxt'), sub = $('#reelSub'), btns = $('#rollBtns');
    reel.classList.remove('win'); btns.style.visibility = 'hidden';
    let i = 0, delay = 45; const steps = pool.length > 1 ? 22 : 8;
    const tick = () => {
      if (!$('#reel')) return;
      i++; const g = i >= steps ? pick : pool[Math.floor(Math.random() * pool.length)];
      txt.textContent = g.title; txt.style.animation = 'none'; void txt.offsetWidth; txt.style.animation = '';
      sub.textContent = `${g.platform}${g.genre ? ' · ' + g.genre : ''}`;
      if (i < steps) { sfx.tick(); delay *= 1.09; setTimeout(tick, delay); }
      else { reel.classList.add('win'); sfx.save(); setTimeout(sfx.levelup, 200); confetti(60); btns.style.visibility = 'visible'; }
    };
    tick();
  };
  openDialog(`<div class="dlg-t">NEXT QUEST SELECT</div><div class="reel" id="reel"><div class="reel-item" id="reelTxt">???</div></div>
    <div class="reel-sub" id="reelSub"></div>
    <div class="dlg-b" id="rollBtns" style="visibility:hidden"><button class="btn cyan" data-d="start">${I('play')} START IT</button>
    <button class="btn" data-d="again">${I('dice')} REROLL</button><button class="btn ghost" data-d="close">MAYBE LATER</button></div>`,
    k => {
      if (k === 'again') return spin();
      if (k === '__scrim' && $('#rollBtns').style.visibility === 'hidden') return;
      closeDialog(); if (k === 'start' && pick) startGame(pick.id);
    }, 'var(--pink)');
  spin();
}

/* ---------- backup / restore ---------- */
function backupData(){
  return JSON.stringify({ app: 'BackGaming', version: 1, exportedAt: new Date().toISOString(), xp: state.xp, games: state.games });
}
function markBackedUp(){ state.lastBackup = Date.now(); state.dirty = false; persist(); render(); }
async function exportBackup(){
  if (!state.games.length) { sfx.err(); toast('Nothing to save yet!', 'var(--orange)'); return; }
  const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const name = `BackGaming-save-${stamp}.json`;
  const file = new File([backupData()], name, { type: 'application/json' });
  const done = () => { sfx.save(); coins(); banner({ title: 'GAME SAVED!', sub: `${state.games.length} games on the memory card`, color: 'var(--green)', icon: 'disk', ms: 1300 }); markBackedUp(); };
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'BackGaming save file' }); done(); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  done();
}
async function importText(text){
  let data;
  try { data = JSON.parse(String(text).trim()); } catch (e) { sfx.err(); toast('CORRUPTED SAVE — not a valid backup', 'var(--red)', 2800); return; }
  const raw = Array.isArray(data) ? data : data && Array.isArray(data.games) ? data.games : null;
  const games = raw ? raw.map(norm).filter(Boolean) : [];
  if (!games.length) { sfx.err(); toast('No games found in that save', 'var(--red)'); return; }
  const mode = state.games.length ? await choiceBox({
    title: 'LOAD SAVE?', color: 'var(--cyan)',
    msg: `Found ${games.length} game${games.length > 1 ? 's' : ''} in this save. Merge with what's here, or replace everything?`,
    options: [['merge', 'MERGE', 'cyan'], ['replace', 'REPLACE ALL', 'danger'], ['cancel', 'CANCEL', 'ghost']]
  }) : 'replace';
  if (!mode || mode === 'cancel') return;
  const xp = Math.max(0, Math.round(+data.xp) || 0);
  let added = games.length;
  if (mode === 'merge') {
    const ids = new Set(state.games.map(g => g.id));
    const fresh = games.filter(g => !ids.has(g.id)); added = fresh.length;
    state.games.push(...fresh); state.xp = Math.max(state.xp, xp);
  } else { state.games = games; state.xp = xp; }
  state.dirty = false; state.lastBackup = state.lastBackup || Date.now(); persist();
  sfx.load(); confetti(90);
  banner({ title: 'SAVE LOADED!', sub: `${added} game${added === 1 ? '' : 's'} restored`, color: 'var(--cyan)', icon: 'disk', ms: 1600, flash: true });
  render();
}
$('#importInput').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const r = new FileReader(); r.onload = () => importText(r.result); r.onerror = () => { sfx.err(); toast("Couldn't read file", 'var(--red)'); };
  r.readAsText(f);
});
async function copyCode(){
  if (!state.games.length) { sfx.err(); toast('Nothing to copy yet!', 'var(--orange)'); return; }
  try { await navigator.clipboard.writeText(backupData()); sfx.save(); toast('BACKUP CODE COPIED — paste it in Notes', 'var(--green)', 2800); markBackedUp(); }
  catch (e) { sfx.err(); toast('Clipboard blocked — use Export instead', 'var(--red)'); }
}
function pasteCode(){
  openDialog(`<div class="dlg-t">PASTE BACKUP CODE</div><div class="dlg-m">Paste the code you copied earlier.</div>
    <textarea id="pasteBox" rows="6" placeholder='{"app":"BackGaming",...}'></textarea>
    <div class="dlg-b"><button class="btn cyan" data-d="load">LOAD</button><button class="btn ghost" data-d="x">CANCEL</button></div>`,
    k => { if (k === '__scrim') return; const t = $('#pasteBox')?.value; closeDialog(); if (k === 'load' && t) importText(t); });
  sfx.blip();
}
async function wipe(){
  const ok = await confirmBox({ title: 'ERASE ALL DATA?', msg: 'Every game, rating and XP will be deleted from this device. Export a save file first if you might want it back.', yes: 'ERASE EVERYTHING', danger: true });
  if (!ok) return;
  const ok2 = await confirmBox({ title: 'ARE YOU SURE?', msg: 'Last chance. This is a true GAME OVER.', yes: 'YES, ERASE', danger: true });
  if (!ok2) return;
  const sound = state.sound; state = defaults(); state.sound = sound; persist();
  sfx.del(); banner({ title: 'GAME OVER', sub: 'Memory wiped. Insert coin to continue.', color: 'var(--red)', icon: 'skull', ms: 1600 });
  goTab('queue', false);
}

/* ---------- events ---------- */
$('#nav').addEventListener('click', e => { const b = e.target.closest('button'); if (b) goTab(b.dataset.tab); });
$('#fab').innerHTML = I('plus') + '<small>INSERT COIN</small>';
$('#fab').addEventListener('click', () => openSheet(null));
$('#soundBtn').addEventListener('click', () => { state.sound = !state.sound; persist(); renderHUD(); if (state.sound) sfx.tab(); if (ui.tab === 'player') render(); });
$('#logo').addEventListener('click', () => { const l = $('#logo'); l.classList.remove('wiggle'); void l.offsetWidth; l.classList.add('wiggle'); sfx.levelup(); });

$('#view').addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (a) {
    const id = a.dataset.id;
    switch (a.dataset.act) {
      case 'start': return startGame(id);
      case 'complete': return completeGame(id);
      case 'roll': return roll();
      case 'export': return exportBackup();
      case 'import': return $('#importInput').click();
      case 'copycode': return copyCode();
      case 'pastecode': return pasteCode();
      case 'sound': state.sound = !state.sound; persist(); if (state.sound) sfx.tab(); return render();
      case 'wipe': return wipe();
    }
  }
  const chip = e.target.closest('[data-pf]');
  if (chip) { ui.pf = chip.dataset.pf; sfx.blip(); return renderList(); }
  const card = e.target.closest('.card');
  if (card) openSheet(card.dataset.id);
});
$('#view').addEventListener('input', e => { if (e.target.id === 'q') { ui.q = e.target.value; renderList(); } });
$('#view').addEventListener('change', e => { if (e.target.id === 'sort') { ui.sort = e.target.value; sfx.blip(); renderList(); } });

$('#modal').addEventListener('click', e => {
  if (e.target.closest('[data-close]')) { sfx.blip(); return closeModal(); }
  const h = e.target.closest('[data-h]'); if (h) { draft.hype = +h.dataset.h; tone(300 + draft.hype * 120, .07, { vol: .06 }); popBtn(h); return syncSheet(); }
  const st = e.target.closest('[data-st]'); if (st) { draft.status = st.dataset.st; sfx.blip(); return syncSheet(); }
  const r = e.target.closest('[data-r]'); if (r) { draft.rating = +r.dataset.r === draft.rating ? 0 : +r.dataset.r; sfx.star(draft.rating); popBtn(r); return syncSheet(); }
  const s = e.target.closest('[data-s]'); if (!s) return;
  if (s.dataset.s === 'save') saveSheet();
  else if (s.dataset.s === 'cover') $('#coverInput').click();
  else if (s.dataset.s === 'rmcover') { draft.cover = null; sfx.blip(); syncSheet(); }
  else if (s.dataset.s === 'delete') deleteGame(draft.id);
});
$('#modal').addEventListener('input', e => { if (e.target.id === 'fTitle' && !draft.cover) $('#cvPrev').innerHTML = coverHTML({ title: e.target.value || '?' }); });

$('#genres').innerHTML = GENRES.map(g => `<option value="${g}">`).join('');

/* ---------- rotation lock: always keep the portrait layout ---------- */
function lockPortrait(){
  const root = $('#root'), W = window.innerWidth, H = window.innerHeight;
  const phone = Math.min(screen.width, screen.height) < 600 && matchMedia('(pointer:coarse)').matches;
  document.documentElement.classList.remove('rot-l', 'rot-r');
  if (!phone || W <= H) { root.style.cssText = ''; return; }
  let ang = typeof window.orientation === 'number' ? window.orientation : (screen.orientation ? (screen.orientation.angle === 270 ? -90 : screen.orientation.angle) : 90);
  if (ang === 90) {           // phone turned counter-clockwise -> rotate app back clockwise-relative
    document.documentElement.classList.add('rot-l');
    root.style.cssText = `width:${H}px;height:${W}px;top:${H}px;left:0;transform:rotate(-90deg)`;
  } else {
    document.documentElement.classList.add('rot-r');
    root.style.cssText = `width:${H}px;height:${W}px;top:0;left:${W}px;transform:rotate(90deg)`;
  }
}
['resize','orientationchange'].forEach(ev => window.addEventListener(ev, () => setTimeout(lockPortrait, 60)));
try { screen.orientation && screen.orientation.lock && screen.orientation.lock('portrait').catch(() => {}); } catch (e) {}

/* ---------- boot ---------- */
lockPortrait();
render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost'))
  navigator.serviceWorker.register('sw.js').catch(() => {});
if (backupDue()) setTimeout(() => toast('!! Unsaved progress — back up in PLAYER', 'var(--yellow)', 3000), 900);
})();
