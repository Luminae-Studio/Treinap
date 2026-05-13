// ── STATE ──
const KEY = 'ayelen_v1';
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

let state = load();
if (!state.xp) state.xp = 0;
if (!state.coins) state.coins = 0;
if (!state.water) state.water = {};
if (!state.habits) state.habits = {};
if (!state.weights) state.weights = [];
if (!state.workouts) state.workouts = [];
if (!state.streak) state.streak = 0;
if (!state.lastCheckin) state.lastCheckin = null;
if (!state.flowers) state.flowers = [];
if (!state.owned) state.owned = [];
if (!state.weekDays) state.weekDays = {};

// ── DATA LOCAL (corrige bug de timezone UTC) ──
function localDateStr(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
const TODAY = localDateStr();

// ── FORMATAR DATA: d/m/aa ──
function fmtDate(iso) {
  if(!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${parseInt(d)}/${parseInt(m)}/${y.slice(2)}`;
}

// ── LEVELS ──
const LEVELS = [
  {name:'Iniciante',xp:0},
  {name:'Determinada',xp:100},
  {name:'Consistente',xp:300},
  {name:'Dedicada',xp:600},
  {name:'Guerreira',xp:1000},
  {name:'Inspiração',xp:1500},
  {name:'Lendária',xp:2200},
];
function getLevel(xp) {
  let lv = 0;
  for(let i=0;i<LEVELS.length;i++) if(xp>=LEVELS[i].xp) lv=i;
  return lv;
}
function getNextXp(xp) {
  const lv = getLevel(xp);
  if(lv>=LEVELS.length-1) return LEVELS[LEVELS.length-1].xp;
  return LEVELS[lv+1].xp;
}