let selectedWorkout = null;
let selectedDur = null;

// ── CHAR SPRITE ANIMATION ──
const spriteSequences = {
  idle: [SPRITES.idle],
  walk: [SPRITES.walk1, SPRITES.walk2, SPRITES.walk3, SPRITES.walk2],
  selfie: [SPRITES.selfie1, SPRITES.selfie2, SPRITES.selfie3, SPRITES.selfie2],
  peace: [SPRITES.peace],
  sit: [SPRITES.sit],
  celebrate: [SPRITES.peace, SPRITES.selfie1, SPRITES.selfie2, SPRITES.selfie3],
};
let curSeq = 'idle', seqIdx = 0, animTimer = null;

function playSprite(seq, loop=true) {
  clearInterval(animTimer);
  curSeq = seq; seqIdx = 0;
  const frames = spriteSequences[seq] || spriteSequences.idle;
  const el = document.getElementById('charSprite');
  el.src = frames[0];
  if(frames.length===1) return;
  animTimer = setInterval(()=>{
    seqIdx = (seqIdx+1) % frames.length;
    el.src = frames[seqIdx];
    if(!loop && seqIdx===frames.length-1) { clearInterval(animTimer); setTimeout(()=>playSprite('idle'), 400); }
  }, 220);
}

function tapChar() {
  const msgs = ['Vamos lá! 💜','Você consegue! 🌸','Orgulho de mim! ✨','Força! 🔥','linda e forte! 💪'];
  const m = document.getElementById('charMsg');
  m.textContent = msgs[Math.floor(Math.random()*msgs.length)];
  m.classList.add('show');
  setTimeout(()=>m.classList.remove('show'), 2000);
  playSprite('celebrate', false);
}

// ── TOAST ──
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

// ── XP POP ──
function xpPop(el, amount) {
  const r = el.getBoundingClientRect();
  const p = document.createElement('div');
  p.className = 'xp-pop';
  p.textContent = `+${amount} XP`;
  p.style.left = (r.left + r.width/2 - 20) + 'px';
  p.style.top = (r.top - 10) + 'px';
  document.body.appendChild(p);
  setTimeout(()=>p.remove(), 1300);
}

// ── ADD XP ──
function addXP(amount, coinAmount, el) {
  const prevLv = getLevel(state.xp);
  state.xp += amount;
  state.coins += (coinAmount||0);
  if(el) xpPop(el, amount);
  const newLv = getLevel(state.xp);
  if(newLv > prevLv) {
    toast(`🎉 Subiu pro nível ${newLv+1}: ${LEVELS[newLv].name}!`);
    playSprite('celebrate', false);
  }
  save(state);
  updateCharUI();
}

// ── UPDATE CHAR UI ──
function updateCharUI() {
  const lv = getLevel(state.xp);
  const nextXp = getNextXp(state.xp);
  const prevXp = LEVELS[lv].xp;
  const pct = lv >= LEVELS.length-1 ? 100 : Math.round((state.xp - prevXp)/(nextXp - prevXp)*100);
  document.getElementById('charLevel').textContent = `Nível ${lv+1} — ${LEVELS[lv].name}`;
  document.getElementById('xpBar').style.width = pct + '%';
  document.getElementById('xpLabel').textContent = `${state.xp} / ${nextXp} XP`;
  document.getElementById('coinVal').textContent = state.coins;
}